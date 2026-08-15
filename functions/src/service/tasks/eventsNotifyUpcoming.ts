import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {norm} from "../../modules/shared/text_utils";
import {todayIsoUTC, addDaysIso} from "../../modules/calendar/calendar_utils";
import {getEventsVars} from "../../modules/setup/events_vars";

/**
 * Task: events.notifyUpcoming
 *
 * Raz dziennie (scheduler po eventsSyncCalendarDaily) wysyła przypomnienie
 * o imprezach startujących za `reminderDays` dni (setup/vars_members.vars.powiadomienie_imprezy,
 * patrz events_vars.ts — parametr z arkusza, nie na sztywno w kodzie).
 *
 * Odbiorcy dla danej imprezy to UNIA dwóch grup (deduplikacja — jeden mail
 * na użytkownika, nawet jeśli spełnia oba warunki):
 *   - profile.notifications.eventsUpcoming === true (wszystkie zatwierdzone imprezy),
 *   - profile.notifications.eventsUpcomingInteresting === true I oznaczył
 *     tę konkretną imprezę jako interesującą (event_interests).
 *
 * Idempotencja: `reminderSentAt` na dokumencie imprezy — ustawiane po wysyłce,
 * chroni przed powtórną wysyłką przy ewentualnym ponownym uruchomieniu tego
 * samego dnia.
 */

type Payload = Record<string, never>;

const APP_URL = "https://morzkulc-e9df7.web.app/";

function dateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

export function buildUpcomingEventEmail(ev: {name: string; startDate: string; endDate: string; location: string}, reminderDays: number): {subject: string; bodyText: string} {
  const subject = `SKK Morzkulc — zbliża się impreza: ${ev.name}`;

  const lines: string[] = [];
  lines.push(`Za ${reminderDays} dni odbywa się impreza: ${ev.name}`);
  lines.push(`Termin: ${dateRange(ev.startDate, ev.endDate)}`);
  if (ev.location) lines.push(`Miejsce: ${ev.location}`);
  lines.push("");
  lines.push("Szczegóły w aplikacji:");
  lines.push(APP_URL);
  lines.push("");
  lines.push("Zarządzaj powiadomieniami w swoim profilu.");
  lines.push("— Automatyczne powiadomienie SKK Morzkulc");

  return {subject, bodyText: lines.join("\n")};
}

export const eventsNotifyUpcomingTask: ServiceTask<Payload> = {
  id: "events.notifyUpcoming",
  description: "Wysyła przypomnienie e-mail o imprezach startujących za N dni (N z arkusza SETUP) do subskrybentów (ogólne + interesujące mnie).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (_payload, ctx) => {
    const dryRun = ctx.dryRun;
    const {reminderDays} = await getEventsVars(ctx.firestore);
    const targetDate = addDaysIso(todayIsoUTC(), reminderDays);

    const eventsSnap = await ctx.firestore.collection("events")
      .where("approved", "==", true)
      .where("startDate", "==", targetDate)
      .get();

    const candidates = eventsSnap.docs.filter((d) => {
      const data = d.data() as any;
      return data?.rejected !== true && !data?.reminderSentAt;
    });

    if (!candidates.length) {
      ctx.logger.info("eventsNotifyUpcoming: no events to notify", {targetDate, reminderDays});
      return {ok: true, message: "no events to notify", details: {targetDate, reminderDays, events: 0, sent: 0}};
    }

    const generalSnap = await ctx.firestore.collection("users_active")
      .where("profile.notifications.eventsUpcoming", "==", true)
      .get();

    const generalUidSet = new Set(generalSnap.docs.map((d) => d.id));
    const generalEmails = generalSnap.docs
      .map((d) => norm((d.data() as any)?.email).toLowerCase())
      .filter((e) => e.includes("@"));

    let eventsNotified = 0;
    let totalSent = 0;

    for (const doc of candidates) {
      const eventData = doc.data() as any;
      const recipients = new Set<string>(generalEmails);

      const interestSnap = await ctx.firestore.collection("event_interests")
        .where("eventId", "==", doc.id)
        .get();
      const extraUids = interestSnap.docs
        .map((d) => norm((d.data() as any)?.uid))
        .filter((uid) => uid && !generalUidSet.has(uid));

      for (const uid of extraUids) {
        const userSnap = await ctx.firestore.collection("users_active").doc(uid).get();
        if (!userSnap.exists) continue;
        const userData = userSnap.data() as any;
        if (userData?.profile?.notifications?.eventsUpcomingInteresting !== true) continue;
        const email = norm(userData?.email).toLowerCase();
        if (email.includes("@")) recipients.add(email);
      }

      const {subject, bodyText} = buildUpcomingEventEmail({
        name: norm(eventData?.name),
        startDate: norm(eventData?.startDate),
        endDate: norm(eventData?.endDate),
        location: norm(eventData?.location),
      }, reminderDays);

      if (dryRun) {
        ctx.logger.info("eventsNotifyUpcoming: [DRY RUN] would send", {eventId: doc.id, subject, recipients: recipients.size});
        eventsNotified++;
        totalSent += recipients.size;
        continue;
      }

      let sentForEvent = 0;
      for (const email of recipients) {
        try {
          await ctx.workspace.sendGenericEmail(email, subject, bodyText);
          sentForEvent++;
        } catch (e: any) {
          ctx.logger.error("eventsNotifyUpcoming: send failed", {eventId: doc.id, email, message: e?.message});
        }
      }

      await doc.ref.update({reminderSentAt: admin.firestore.FieldValue.serverTimestamp()});

      eventsNotified++;
      totalSent += sentForEvent;
      ctx.logger.info("eventsNotifyUpcoming: event notified", {eventId: doc.id, sent: sentForEvent, recipients: recipients.size});
    }

    return {
      ok: true,
      message: `events=${eventsNotified}, sent=${totalSent}`,
      details: {targetDate, reminderDays, events: eventsNotified, sent: totalSent, dryRun},
    };
  },
};
