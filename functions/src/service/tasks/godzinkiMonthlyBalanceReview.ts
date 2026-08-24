import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {computeNegativeBalances, creditApprovedEarn} from "../../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";
import {getAppVars} from "../../modules/setup/app_vars";

/**
 * Task: godzinki.monthlyBalanceReview
 *
 * Uruchamiany RAZ W MIESIĄCU (po gear.chargePrivateStorage) przez ten sam scheduler.
 *
 * 0. Kredytuje automatyczny bonus miesięczny (setup/vars_godzinki.bonus_miesieczny_zarzad)
 *    dla ról zarząd/KR — PRZED liczeniem sald, żeby bonus tego miesiąca wliczał się do
 *    przeglądu poniżej. Idempotentnie: pomija uid, jeśli w bieżącym miesiącu (wg grantedAt)
 *    już istnieje wpis z tym samym powodem (ponowne/ręczne odpalenie taska nie dubluje bonusu).
 * 1-3. Liczy saldo każdego użytkownika NA ŻYWO (computeNegativeBalances — ta sama
 *    funkcja, której panel Zarządu używa przy każdym wejściu w Administrację, więc
 *    obie liczby są zawsze spójne).
 * 4. WS4: nadal zapisuje snapshot service_reports/negativeBalances — nieużywany
 *    już przez panel Zarządu (ten liczy na żywo), zostaje jako log/audyt historyczny.
 * 5. WS5: dla sald < -limit wysyła mail do użytkownika oraz zbiorczy mail do zarządu.
 */

type Payload = {
  dry?: boolean;
};

const BOARD_ROLE_KEYS = ["rola_zarzad", "rola_kr"];
const BOARD_BONUS_REASON = "Bonus miesięczny za pełnioną funkcję";

function fmtBalance(b: number): string {
  return (b > 0 ? "+" : "") + b;
}

function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Kredytuje bonus miesięczny zarządowi/KR (idempotentnie per uid/miesiąc).
 * Eksportowane dla testów jednostkowych (vitest).
 */
export async function creditBoardMonthlyBonus(
  db: FirebaseFirestore.Firestore,
  now: Date,
  bonusHours: number,
  expiryMonths: number,
  dryRun: boolean
): Promise<number> {
  if (bonusHours <= 0) return 0;

  const boardSnap = await db.collection("users_active").where("role_key", "in", BOARD_ROLE_KEYS).get();
  const monthKey = monthKeyOf(now);
  let credited = 0;

  for (const doc of boardSnap.docs) {
    const uid = doc.id;
    const existing = await db.collection("godzinki_ledger")
      .where("uid", "==", uid)
      .where("reason", "==", BOARD_BONUS_REASON)
      .get();

    const alreadyThisMonth = existing.docs.some((d) => {
      const grantedAt = (d.data() as any)?.grantedAt;
      const date = typeof grantedAt?.toDate === "function" ? grantedAt.toDate() : null;
      return date ? monthKeyOf(date) === monthKey : false;
    });
    if (alreadyThisMonth) continue;

    if (!dryRun) {
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);
      await creditApprovedEarn(db, uid, bonusHours, now, expiresAt, {
        reason: BOARD_BONUS_REASON,
        approvedBy: "system",
        submittedBy: "system",
      });
    }
    credited++;
  }

  return credited;
}

export const godzinkiMonthlyBalanceReviewTask: ServiceTask<Payload> = {
  id: "godzinki.monthlyBalanceReview",
  description: "Miesięczny przegląd sald: snapshot ujemnych do panelu zarządu + mail przy przekroczeniu limitu.",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const appVars = await getAppVars(ctx.firestore);
    const vars = await getGodzinkiVars(ctx.firestore);
    const limit = vars.negativeBalanceLimit;
    const now = ctx.now;

    ctx.logger.info("godzinki.monthlyBalanceReview: start", {dryRun, limit});

    // 0. Bonus miesięczny zarząd/KR (patrz creditBoardMonthlyBonus) — przed liczeniem sald.
    const bonusCredited = await creditBoardMonthlyBonus(
      ctx.firestore, now, vars.boardMonthlyBonusHours, vars.expiryMonths, dryRun
    );
    ctx.logger.info("godzinki.monthlyBalanceReview: board bonus", {bonusCredited, dryRun});

    // 1-3. Salda < 0 na żywo (skan godzinki_ledger + nazwy/email) — ta sama funkcja,
    // której panel Zarządu używa do liczenia na żywo przy każdym wejściu w panel.
    const items = await computeNegativeBalances(ctx.firestore, now, limit);
    const overLimit = items.filter((i) => i.belowLimit);

    // 4. Snapshot dla panelu zarządu (WS4)
    if (!dryRun) {
      try {
        await ctx.firestore.collection("service_reports").doc("negativeBalances").set({
          ranAt: admin.firestore.FieldValue.serverTimestamp(),
          count: items.length,
          overLimitCount: overLimit.length,
          limit,
          items: items.map((i) => ({uid: i.uid, displayName: i.displayName, balance: i.balance, belowLimit: i.belowLimit})),
        });
      } catch (e: any) {
        ctx.logger.error("godzinki.monthlyBalanceReview: snapshot save failed", {message: e?.message});
      }
    }

    // 5. Maile przy przekroczeniu limitu (WS5)
    let userMails = 0;
    if (overLimit.length > 0) {
      if (!dryRun) {
        // a) do każdego użytkownika
        for (const i of overLimit) {
          if (!i.email || !i.email.includes("@")) continue;
          try {
            await ctx.workspace.sendGenericEmail(
              i.email,
              "SKK Morzkulc — przekroczony limit ujemnego salda godzinek",
              [
                `Cześć ${i.displayName}!`,
                "",
                `Twoje saldo godzinek wynosi ${fmtBalance(i.balance)} h i przekracza dopuszczalny limit ujemny (-${limit} h).`,
                "Prosimy o uregulowanie godzinek (np. zgłoszenie przepracowanych godzin lub wykup salda w aplikacji).",
                "",
                "SKK Morzkulc",
              ].join("\n")
            );
            userMails++;
          } catch (e: any) {
            ctx.logger.warn("godzinki.monthlyBalanceReview: user mail failed", {uid: i.uid, message: e?.message});
          }
        }
        // b) zbiorczy do zarządu
        try {
          const lines = overLimit.map((i) => `- ${i.displayName} (${i.email || "brak e-mail"}): ${fmtBalance(i.balance)} h`);
          await ctx.workspace.sendGenericEmail(
            appVars.adminNotifyEmail,
            `SKK Morzkulc — ${overLimit.length} os. z przekroczonym limitem ujemnego salda`,
            [
              `Limit ujemnego salda: -${limit} h.`,
              "Użytkownicy poniżej limitu:",
              "",
              ...lines,
              "",
              "SKK Morzkulc (automatyczny przegląd miesięczny)",
            ].join("\n")
          );
        } catch (e: any) {
          ctx.logger.error("godzinki.monthlyBalanceReview: board digest mail failed", {message: e?.message});
        }
      }
    }

    const message = `bonusCredited=${bonusCredited}, negatives=${items.length}, overLimit=${overLimit.length}, userMails=${dryRun ? 0 : userMails}, dryRun=${dryRun}`;
    ctx.logger.info("godzinki.monthlyBalanceReview: done", {bonusCredited, negatives: items.length, overLimit: overLimit.length, userMails, dryRun});
    return {ok: true, message, details: {bonusCredited, negatives: items.length, overLimit: overLimit.length, dryRun}};
  },
};
