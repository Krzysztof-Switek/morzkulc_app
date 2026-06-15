import {ServiceTask} from "../types";
import {getServiceConfig} from "../service_config";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: admin.notifyPendingApprovals  (Z17a / Faza 2 panelu zarządu)
 *
 * Raz dziennie (scheduler 06:00 Europe/Warsaw, po wszystkich syncach 04:45–05:15)
 * wysyła na adres zarządu digest pozycji oczekujących na zatwierdzenie STARSZYCH
 * niż próg (SVC_ADMIN_NOTIFY_AGE_DAYS, domyślnie 3 dni). Mail tylko o tym, czego
 * poranne syncy nie rozwiązały.
 *
 * Wymaganie: gdy nie ma nic do zgłoszenia → BRAK maila (ok:true, "nothing to notify").
 *
 * Pozycje odrzucone (rejected==true) są pomijane. Sekcja "wymagają interwencji"
 * zbiera odmowy zatwierdzenia z syncu (approvalRejectedCode) — admin patrzył na
 * wieczny "oczekujący" wpis bez wyjaśnienia.
 */

type Payload = {
  /** Wymusza próg wieku 0 dni — do ręcznego testu maila (każde pending trafi do digestu). */
  forceAgeDays?: number;
};

export type DigestGodzinka = {
  displayName: string;
  type: "earn" | "purchase";
  amount: number;
  reason: string;
  ageDays: number;
};

export type DigestEvent = {
  name: string;
  startDate: string;
  userEmail: string;
  ageDays: number;
};

export type DigestRejected = {
  displayName: string;
  amount: number;
  message: string;
};

export type DigestInput = {
  godzinki: DigestGodzinka[];
  events: DigestEvent[];
  rejected: DigestRejected[];
  godzinkiSheetUrl: string | null;
  eventsSheetUrl: string | null;
  appUrl: string;
  ageDays: number;
};

/**
 * Buduje treść digestu. Zwraca null, gdy nie ma NIC do zgłoszenia
 * (brak pending starszych niż próg i brak odmów) — wtedy mail nie jest wysyłany.
 * Eksport dla testów jednostkowych (vitest).
 */
export function buildPendingDigest(input: DigestInput): {subject: string; bodyText: string} | null {
  const {godzinki, events, rejected} = input;
  if (!godzinki.length && !events.length && !rejected.length) return null;

  const total = godzinki.length + events.length;
  const subject = `SKK Morzkulc — zaległe zatwierdzenia: ${total} (próg ${input.ageDays} dni)`;

  const lines: string[] = [];
  lines.push("Zaległe pozycje oczekujące na zatwierdzenie w panelu zarządu.");
  lines.push(`Próg: starsze niż ${input.ageDays} dni. Mail wysyłany tylko gdy coś zalega.`);
  lines.push("");

  if (godzinki.length) {
    lines.push(`GODZINKI (${godzinki.length}):`);
    for (const g of godzinki) {
      const label = g.type === "purchase" ? "wykup salda ujemnego" : "godzinki";
      const reason = g.reason ? ` — „${g.reason}”` : "";
      lines.push(`• ${g.displayName}: ${g.amount} h (${label})${reason} — czeka ${g.ageDays} dni`);
    }
    lines.push("");
  }

  if (events.length) {
    lines.push(`IMPREZY (${events.length}):`);
    for (const e of events) {
      const who = e.userEmail ? ` — zgłosił: ${e.userEmail}` : "";
      const start = e.startDate ? ` — start ${e.startDate}` : "";
      lines.push(`• ${e.name}${start}${who} — czeka ${e.ageDays} dni`);
    }
    lines.push("");
  }

  if (rejected.length) {
    lines.push(`WYMAGAJĄ INTERWENCJI — odmowy zatwierdzenia (${rejected.length}):`);
    lines.push("Sync nie mógł zatwierdzić mimo TAK w arkuszu — popraw dane lub odrzuć w aplikacji.");
    for (const r of rejected) {
      lines.push(`• ${r.displayName}: ${r.amount} h — ${r.message}`);
    }
    lines.push("");
  }

  lines.push("Zatwierdź lub odrzuć w panelu zarządu:");
  lines.push(input.appUrl);
  if (input.godzinkiSheetUrl) lines.push(`Arkusz godzinek: ${input.godzinkiSheetUrl}`);
  if (input.eventsSheetUrl) lines.push(`Arkusz imprez: ${input.eventsSheetUrl}`);
  lines.push("");
  lines.push("— Automatyczne powiadomienie SKK Morzkulc");

  return {subject, bodyText: lines.join("\n")};
}

const APP_URL = "https://morzkulc-e9df7.web.app/";

function ageDaysFrom(createdAt: any, now: Date): number {
  const d = typeof createdAt?.toDate === "function" ? createdAt.toDate() : null;
  if (!d) return Number.MAX_SAFE_INTEGER; // brak createdAt → traktuj jako "stare"
  const ms = now.getTime() - d.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

async function resolveDisplayName(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  cache: Map<string, string>
): Promise<string> {
  const cached = cache.get(uid);
  if (cached) return cached;
  let name = uid;
  try {
    const snap = await firestore.collection("users_active").doc(uid).get();
    const d = snap.data() as any;
    name = norm(d?.profile?.nickname) || norm(d?.profile?.firstName) || norm(d?.email) || uid;
  } catch {
    // brak danych — zostaw uid
  }
  cache.set(uid, name);
  return name;
}

export const adminNotifyPendingApprovalsTask: ServiceTask<Payload> = {
  id: "admin.notifyPendingApprovals",
  description: "Wysyła zarządowi digest zaległych zatwierdzeń (godzinki + imprezy starsze niż próg). Brak zaległości → brak maila.",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const ageDays = Number.isFinite(payload?.forceAgeDays as number) ?
      Number(payload?.forceAgeDays) :
      cfg.adminNotify.ageDays;
    const dryRun = ctx.dryRun;

    const [godzinkiEarnSnap, godzinkiPurchaseSnap, eventsSnap] = await Promise.all([
      ctx.firestore.collection("godzinki_ledger")
        .where("approved", "==", false).where("type", "==", "earn").limit(200).get(),
      ctx.firestore.collection("godzinki_ledger")
        .where("approved", "==", false).where("type", "==", "purchase").limit(200).get(),
      ctx.firestore.collection("events")
        .where("approved", "==", false).limit(200).get(),
    ]);

    const nameCache = new Map<string, string>();

    const godzinki: DigestGodzinka[] = [];
    const rejected: DigestRejected[] = [];

    for (const doc of [...godzinkiEarnSnap.docs, ...godzinkiPurchaseSnap.docs]) {
      const data = doc.data() as any;
      if (data?.rejected === true) continue; // odrzucone — pomijamy
      const age = ageDaysFrom(data?.createdAt, ctx.now);
      const displayName = await resolveDisplayName(ctx.firestore, norm(data?.uid), nameCache);
      const amount = Number(data?.amount ?? 0);

      // Odmowy zatwierdzenia (osobna sekcja, niezależnie od progu wieku)
      if (norm(data?.approvalRejectedCode)) {
        rejected.push({
          displayName,
          amount,
          message: norm(data?.approvalRejectedMessage) || norm(data?.approvalRejectedCode),
        });
      }

      if (age < ageDays) continue;
      godzinki.push({
        displayName,
        type: String(data?.type) === "purchase" ? "purchase" : "earn",
        amount,
        reason: norm(data?.reason),
        ageDays: age === Number.MAX_SAFE_INTEGER ? -1 : age,
      });
    }

    const events: DigestEvent[] = [];
    for (const doc of eventsSnap.docs) {
      const data = doc.data() as any;
      if (data?.rejected === true) continue;
      const age = ageDaysFrom(data?.createdAt, ctx.now);
      if (age < ageDays) continue;
      events.push({
        name: norm(data?.name),
        startDate: norm(data?.startDate),
        userEmail: norm(data?.userEmail),
        ageDays: age === Number.MAX_SAFE_INTEGER ? -1 : age,
      });
    }

    const digest = buildPendingDigest({
      godzinki,
      events,
      rejected,
      godzinkiSheetUrl: cfg.godzinki?.spreadsheetId ?
        `https://docs.google.com/spreadsheets/d/${cfg.godzinki.spreadsheetId}` : null,
      eventsSheetUrl: cfg.events?.spreadsheetId ?
        `https://docs.google.com/spreadsheets/d/${cfg.events.spreadsheetId}` : null,
      appUrl: APP_URL,
      ageDays,
    });

    if (!digest) {
      ctx.logger.info("adminNotifyPendingApprovals: nothing to notify");
      return {ok: true, message: "nothing to notify", details: {sent: false, ageDays}};
    }

    if (dryRun) {
      ctx.logger.info("adminNotifyPendingApprovals: [DRY RUN] would send", {
        to: cfg.adminNotify.email, subject: digest.subject,
        godzinki: godzinki.length, events: events.length, rejected: rejected.length,
      });
      return {
        ok: true,
        message: `[DRY RUN] would notify ${cfg.adminNotify.email}`,
        details: {sent: false, dryRun: true, subject: digest.subject, body: digest.bodyText,
          godzinki: godzinki.length, events: events.length, rejected: rejected.length, ageDays},
      };
    }

    await ctx.workspace.sendGenericEmail(cfg.adminNotify.email, digest.subject, digest.bodyText);
    ctx.logger.info("adminNotifyPendingApprovals: sent", {
      to: cfg.adminNotify.email, godzinki: godzinki.length, events: events.length, rejected: rejected.length,
    });

    return {
      ok: true,
      message: `sent to ${cfg.adminNotify.email}`,
      details: {sent: true, to: cfg.adminNotify.email,
        godzinki: godzinki.length, events: events.length, rejected: rejected.length, ageDays},
    };
  },
};
