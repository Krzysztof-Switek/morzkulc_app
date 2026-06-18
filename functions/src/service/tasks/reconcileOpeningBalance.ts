import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {creditOpeningBalance} from "../../modules/hours/godzinki_service";
import {getObHours, buildOpeningBalanceAdminPatch, obValueExact, obEmailKey} from "../../modules/hours/opening_balance_fields";

/**
 * Task: opening.reconcile
 *
 * Uzgadnia już-zarejestrowanych użytkowników ze ŚWIEŻĄ kolekcją users_opening_balance_26.
 *
 * Dwa tryby:
 *   - HURTOWY (bez payload.email): iteruje wszystkich users_active. Uruchamiany RAZ
 *     po imporcie bilansu (skrypt node enqueueReconcileOpeningBalance.js).
 *   - PUNKTOWY (payload.email): przetwarza tylko jednego użytkownika o podanym mailu.
 *     Uruchamiany z menu arkusza „członkowie sympatycy SKK" (po mailu). Dodatkowo,
 *     gdy dopasowanie nastąpiło po imieniu+nazwisku, a mail w bilansie różni się od
 *     maila rejestracyjnego → AKTUALIZUJE mail w wierszu bilansu otwarcia (Problem 3).
 *
 * Dla każdego dopasowanego (po e-mailu, fallback imię+nazwisko):
 *   - ustawia pola admin.* z bilansu (jak rejestracja),
 *   - ustawia openingMatch/method/balance/matchedAt gdy brakuje,
 *   - poprawia pulę lump-sum w godzinki_ledger (approvedBy="opening_balance"):
 *       amount/remaining = bieżące getObHours, expiresAt = 30.06.2029;
 *       gdy puli brak a obHours>0 → tworzy przez creditOpeningBalance.
 *
 * NIE zmienia role_key (świadomie — uniknięcie nieoczekiwanych zmian uprawnień).
 * Idempotentny: ponowne uruchomienie nadpisuje te same wartości.
 */

const OB_HOURS_EXPIRES_AT = new Date(Date.UTC(2029, 5, 30)); // 30.06.2029

type Payload = {
  dry?: boolean;
  email?: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}
function lower(v: any): string {
  return norm(v).toLowerCase();
}

type ObEntry = {data: any; ref: FirebaseFirestore.DocumentReference};

export const reconcileOpeningBalanceTask: ServiceTask<Payload> = {
  id: "opening.reconcile",
  description: "Uzgadnia zarejestrowanych użytkowników ze świeżą kolekcją users_opening_balance_26. Tryb hurtowy lub punktowy (payload.email).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const targetEmail = lower(payload?.email);
    ctx.logger.info("opening.reconcile: start", {dryRun, targetEmail: targetEmail || null});

    // 1) Wczytaj kolekcję bilansu i zbuduj indeksy (e-mail oraz imię+nazwisko), z referencjami dokumentów
    const obSnap = await ctx.firestore.collection("users_opening_balance_26").get();
    const byEmail = new Map<string, ObEntry>();
    const byName = new Map<string, ObEntry>();
    for (const doc of obSnap.docs) {
      const data = doc.data() as any;
      const email = lower(obValueExact(data, "e-mail", "email"));
      if (email && email.includes("@") && !byEmail.has(email)) byEmail.set(email, {data, ref: doc.ref});
      const first = lower(obValueExact(data, "imię", "imie"));
      const last = lower(obValueExact(data, "nazwisko"));
      if (first && last) {
        const key = `${first}|${last}`;
        if (!byName.has(key)) byName.set(key, {data, ref: doc.ref});
      }
    }
    ctx.logger.info("opening.reconcile: opening balance loaded", {docs: obSnap.size, emails: byEmail.size, names: byName.size});

    // 2) Wyznacz zbiór użytkowników do przetworzenia (jeden albo wszyscy)
    let userDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    if (targetEmail) {
      const q = await ctx.firestore.collection("users_active").where("email", "==", targetEmail).limit(1).get();
      userDocs = q.docs;
      if (userDocs.length === 0) {
        ctx.logger.warn("opening.reconcile: user not found by email", {targetEmail});
        return {
          ok: false,
          message: `Nie znaleziono użytkownika o adresie ${targetEmail} w users_active.`,
          details: {targetEmail, userFound: false, matched: 0, hoursCreated: 0, hoursFixed: 0, emailUpdated: 0, dryRun},
        };
      }
    } else {
      const usersSnap = await ctx.firestore.collection("users_active").get();
      userDocs = usersSnap.docs;
    }

    let matched = 0;
    let adminUpdated = 0;
    let hoursFixed = 0;
    let hoursCreated = 0;
    let partialConsumed = 0;
    let emailUpdated = 0;
    let emailUpdateSkipped = 0;
    let errors = 0;

    for (const userDoc of userDocs) {
      const uid = userDoc.id;
      const u = userDoc.data() as any;
      const email = lower(u.email);
      const first = lower(u.profile?.firstName);
      const last = lower(u.profile?.lastName);

      let entry: ObEntry | undefined;
      let method: "email" | "name" | null = null;
      if (email && byEmail.has(email)) {
        entry = byEmail.get(email);
        method = "email";
      } else if (first && last && byName.has(`${first}|${last}`)) {
        entry = byName.get(`${first}|${last}`);
        method = "name";
      }
      if (!entry) continue;
      const obData = entry.data;
      matched++;

      try {
        // 2a) Pola admin.* + openingBalance
        const adminPatch = buildOpeningBalanceAdminPatch(obData);
        const userPatch: Record<string, any> = {
          "openingBalance": obData,
          "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          "service.openingBalanceReconciledAt": admin.firestore.FieldValue.serverTimestamp(),
        };
        if (!u.openingMatch) {
          userPatch.openingMatch = true;
          userPatch.openingMatchMethod = method;
          userPatch.openingMatchedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        if (adminPatch) userPatch.admin = adminPatch;

        if (!dryRun) {
          await userDoc.ref.set(userPatch, {merge: true});
        }
        adminUpdated++;

        // 2b) Tryb punktowy: aktualizacja maila w wierszu bilansu, gdy dopasowano po nazwisku
        //     a mail w bilansie różni się od maila rejestracyjnego (Problem 3).
        if (targetEmail && method === "name" && email) {
          const obEmail = lower(obValueExact(obData, "e-mail", "email"));
          if (obEmail !== email) {
            // Kolizja: mail rejestracyjny już występuje w INNYM wierszu bilansu → nie nadpisujemy.
            const existing = byEmail.get(email);
            const collision = !!existing && existing.ref.path !== entry.ref.path;
            if (collision) {
              emailUpdateSkipped++;
              ctx.logger.warn("opening.reconcile: email collision in BO26 — skip email update", {uid, email, obEmail});
            } else {
              const emailKey = obEmailKey(obData);
              if (emailKey) {
                if (!dryRun) await entry.ref.update({[emailKey]: email});
                emailUpdated++;
                ctx.logger.info("opening.reconcile: updated BO26 email", {uid, from: obEmail, to: email});
              }
            }
          }
        }

        // 2c) Poprawa puli lump-sum w godzinki_ledger
        const obHours = getObHours(obData);
        // Filtr approvedBy w pamięci — unika wymogu indeksu kompozytowego (uid+approvedBy).
        const ledgerSnap = await ctx.firestore.collection("godzinki_ledger")
          .where("uid", "==", uid)
          .get();
        const obEarns = ledgerSnap.docs.filter((d) => (d.data() as any)?.approvedBy === "opening_balance");

        if (obEarns.length === 0) {
          if (obHours > 0) {
            if (!dryRun) {
              await creditOpeningBalance(ctx.firestore, uid, obHours, OB_HOURS_EXPIRES_AT);
              await userDoc.ref.set({"service.openingBalanceHoursCredited": true}, {merge: true});
            }
            hoursCreated++;
            ctx.logger.info("opening.reconcile: created lump-sum earn", {uid, obHours});
          }
        } else {
          // Zwykle dokładnie jedna pula; gdy więcej — koryguj pierwszą, resztę zostaw + zaloguj.
          if (obEarns.length > 1) {
            ctx.logger.warn("opening.reconcile: multiple opening_balance earns", {uid, count: obEarns.length});
          }
          const ref = obEarns[0].ref;
          const earn = obEarns[0].data() as any;
          const prevAmount = Number(earn.amount ?? 0);
          const prevRemaining = Number(earn.remaining ?? 0);
          const consumed = prevAmount - prevRemaining; // ile już zużyto z tej puli
          if (consumed > 0) partialConsumed++;
          const newRemaining = Math.max(0, obHours - consumed);

          if (!dryRun) {
            await ref.update({
              amount: obHours,
              remaining: newRemaining,
              expiresAt: admin.firestore.Timestamp.fromDate(OB_HOURS_EXPIRES_AT),
              reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          hoursFixed++;
          if (consumed > 0) {
            ctx.logger.warn("opening.reconcile: lump-sum partially consumed — review", {uid, prevAmount, prevRemaining, obHours, newRemaining});
          }
        }
      } catch (e: any) {
        errors++;
        ctx.logger.error("opening.reconcile: user failed", {uid, message: e?.message});
      }
    }

    const summary = {
      users: userDocs.length,
      targetEmail: targetEmail || null,
      userFound: targetEmail ? userDocs.length > 0 : undefined,
      matched, adminUpdated, hoursFixed, hoursCreated, partialConsumed,
      emailUpdated, emailUpdateSkipped, errors, dryRun,
    };
    ctx.logger.info("opening.reconcile: done", summary);

    return {
      ok: errors === 0,
      message: targetEmail ?
        `reconcile(${targetEmail}): matched=${matched}, hoursCreated=${hoursCreated}, hoursFixed=${hoursFixed}, emailUpdated=${emailUpdated}, errors=${errors}` :
        `reconcile: matched=${matched}, adminUpdated=${adminUpdated}, hoursFixed=${hoursFixed}, hoursCreated=${hoursCreated}, errors=${errors}`,
      details: summary,
    };
  },
};
