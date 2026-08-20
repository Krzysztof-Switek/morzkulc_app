import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {norm} from "../../modules/shared/text_utils";
import {todayIsoUTC, addDaysIso, parseIsoToUtcDate} from "../../modules/calendar/calendar_utils";
import {getEventsVars} from "../../modules/setup/events_vars";
import {getAppVars} from "../../modules/setup/app_vars";

/**
 * Task: events.notifyUpcoming
 *
 * Raz dziennie (scheduler po eventsSyncCalendarDaily) wysyła przypomnienie
 * o imprezach startujących w ciągu `reminderDays` dni (setup/vars_members.vars.powiadomienie_imprezy,
 * patrz events_vars.ts — parametr z arkusza, nie na sztywno w kodzie).
 *
 * Odbiorcy dla danej imprezy to UNIA dwóch grup (deduplikacja — jeden mail
 * na użytkownika, nawet jeśli spełnia oba warunki):
 *   - profile.notifications.eventsUpcoming === true (wszystkie zatwierdzone imprezy),
 *   - profile.notifications.eventsUpcomingInteresting === true I oznaczył
 *     tę konkretną imprezę jako interesującą (event_interests).
 *
 * Treść maila pokazuje FAKTYCZNĄ liczbę dni do startu (daysUntilIso, liczoną na
 * żywo z bieżącej daty i startDate imprezy), nie statyczny `reminderDays` z
 * arkusza — bo dogonienie spóźnionej wysyłki (patrz niżej) może wypaść innego
 * dnia niż dokładnie `reminderDays` dni przed startem.
 *
 * Idempotencja: `events/{id}.remindersSentToUids` — lista uid-ów, którzy już
 * dostali przypomnienie o TEJ imprezie. Zapytanie to zakres dni (<=), nie
 * dokładny jeden dzień — dzięki temu impreza jest sprawdzana KAŻDEGO dnia aż
 * do startu, więc: (a) jednorazowy brak crona danego dnia nie gubi przypomnienia
 * bezpowrotnie, (b) użytkownik, który włączy powiadomienia albo oznaczy
 * imprezę jako interesującą PO tym, jak inni już dostali mail, i tak dostanie
 * swój przy kolejnym uruchomieniu — bo dopasowanie liczone jest per-odbiorca,
 * nie per-impreza.
 */

type Payload = {
  dry?: boolean;
};

function dateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

// Liczba pełnych dni między dwiema datami ISO (toIso - fromIso). Liczona na żywo
// z faktycznych dat, NIE z parametru `reminderDays` z arkusza SETUP — cron może
// dogonić wysyłkę innego dnia niż dokładnie N dni przed startem (patrz komentarz
// idempotencji niżej), więc treść maila musi odzwierciedlać rzeczywisty odstęp.
export function daysUntilIso(fromIso: string, toIso: string): number {
  const a = parseIsoToUtcDate(fromIso).getTime();
  const b = parseIsoToUtcDate(toIso).getTime();
  return Math.round((b - a) / (24 * 3600 * 1000));
}

export function buildUpcomingEventEmail(
  ev: {name: string; startDate: string; endDate: string; location: string},
  daysUntilStart: number,
  appUrl: string
): {subject: string; bodyText: string} {
  const subject = `SKK Morzkulc — zbliża się impreza: ${ev.name}`;

  const dayLabel = daysUntilStart === 0 ? "Dziś" :
    daysUntilStart === 1 ? "Jutro" : `Za ${daysUntilStart} dni`;

  const lines: string[] = [];
  lines.push(`${dayLabel} odbywa się impreza: ${ev.name}`);
  lines.push(`Termin: ${dateRange(ev.startDate, ev.endDate)}`);
  if (ev.location) lines.push(`Miejsce: ${ev.location}`);
  lines.push("");
  lines.push("Szczegóły w aplikacji:");
  lines.push(appUrl);
  lines.push("");
  lines.push("Zarządzaj powiadomieniami w swoim profilu.");
  lines.push("— Automatyczne powiadomienie SKK Morzkulc");

  return {subject, bodyText: lines.join("\n")};
}

// Uid-y uprawnione do przypomnienia o danej imprezie, którzy jeszcze go nie dostali.
export function selectNewRecipientUids(eligibleUids: string[], alreadySentUids: string[]): string[] {
  const sent = new Set(alreadySentUids);
  return eligibleUids.filter((uid) => uid && !sent.has(uid));
}

export const eventsNotifyUpcomingTask: ServiceTask<Payload> = {
  id: "events.notifyUpcoming",
  description: "Wysyła przypomnienie e-mail o imprezach startujących w ciągu N dni (N z arkusza SETUP) do subskrybentów (ogólne + interesujące mnie), doganiając nowych odbiorców przy kolejnych uruchomieniach.",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const {reminderDays} = await getEventsVars(ctx.firestore);
    const {appUrl} = await getAppVars(ctx.firestore);
    const todayIso = todayIsoUTC();
    const targetDate = addDaysIso(todayIso, reminderDays);

    const eventsSnap = await ctx.firestore.collection("events")
      .where("approved", "==", true)
      .where("startDate", ">=", todayIso)
      .where("startDate", "<=", targetDate)
      .get();

    const candidates = eventsSnap.docs.filter((d) => (d.data() as any)?.rejected !== true);

    if (!candidates.length) {
      ctx.logger.info("eventsNotifyUpcoming: no events in window", {todayIso, targetDate, reminderDays});
      return {ok: true, message: "no events in window", details: {todayIso, targetDate, reminderDays, eventsChecked: 0, eventsSent: 0, sent: 0}};
    }

    const generalSnap = await ctx.firestore.collection("users_active")
      .where("profile.notifications.eventsUpcoming", "==", true)
      .get();

    const generalUidToEmail = new Map<string, string>();
    for (const d of generalSnap.docs) {
      const email = norm((d.data() as any)?.email).toLowerCase();
      if (email.includes("@")) generalUidToEmail.set(d.id, email);
    }

    let eventsChecked = 0;
    let eventsSent = 0;
    let totalSent = 0;

    for (const doc of candidates) {
      eventsChecked++;
      const eventData = doc.data() as any;
      const alreadySentUids: string[] = Array.isArray(eventData?.remindersSentToUids) ? eventData.remindersSentToUids : [];

      const eligible = new Map<string, string>(generalUidToEmail);

      const interestSnap = await ctx.firestore.collection("event_interests")
        .where("eventId", "==", doc.id)
        .get();
      const interestUids = interestSnap.docs
        .map((d) => norm((d.data() as any)?.uid))
        .filter((uid) => uid && !eligible.has(uid));

      for (const uid of interestUids) {
        const userSnap = await ctx.firestore.collection("users_active").doc(uid).get();
        if (!userSnap.exists) continue;
        const userData = userSnap.data() as any;
        if (userData?.profile?.notifications?.eventsUpcomingInteresting !== true) continue;
        const email = norm(userData?.email).toLowerCase();
        if (email.includes("@")) eligible.set(uid, email);
      }

      const newUids = selectNewRecipientUids(Array.from(eligible.keys()), alreadySentUids);
      if (!newUids.length) continue;

      const daysUntilStart = daysUntilIso(todayIso, norm(eventData?.startDate));

      const {subject, bodyText} = buildUpcomingEventEmail({
        name: norm(eventData?.name),
        startDate: norm(eventData?.startDate),
        endDate: norm(eventData?.endDate),
        location: norm(eventData?.location),
      }, daysUntilStart, appUrl);

      if (dryRun) {
        ctx.logger.info("eventsNotifyUpcoming: [DRY RUN] would send", {eventId: doc.id, subject, recipients: newUids.length});
        eventsSent++;
        totalSent += newUids.length;
        continue;
      }

      const sentUids: string[] = [];
      for (const uid of newUids) {
        const email = eligible.get(uid) as string;
        try {
          await ctx.workspace.sendGenericEmail(email, subject, bodyText);
          sentUids.push(uid);
        } catch (e: any) {
          ctx.logger.error("eventsNotifyUpcoming: send failed", {eventId: doc.id, email, message: e?.message});
        }
      }

      if (sentUids.length) {
        await doc.ref.update({
          remindersSentToUids: admin.firestore.FieldValue.arrayUnion(...sentUids),
          reminderLastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      eventsSent++;
      totalSent += sentUids.length;
      ctx.logger.info("eventsNotifyUpcoming: event notified", {eventId: doc.id, sent: sentUids.length, eligible: eligible.size});
    }

    return {
      ok: true,
      message: `checked=${eventsChecked}, sent=${totalSent}`,
      details: {todayIso, targetDate, reminderDays, eventsChecked, eventsSent, sent: totalSent, dryRun},
    };
  },
};
