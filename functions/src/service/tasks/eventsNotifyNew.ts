import {ServiceTask} from "../types";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: events.notifyNew
 *
 * Wysyła mail do użytkowników z profile.notifications.eventsNew===true,
 * gdy impreza staje się publicznie widoczna (approved: false->true).
 * Kolejkowany przez trigger onEventApproved (deterministyczny jobId —
 * jedna impreza = najwyżej jedno wywołanie tego taska w życiu joba).
 */

type Payload = {
  eventId: string;
};

const APP_URL = "https://morzkulc-e9df7.web.app/";

function dateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

export function buildNewEventEmail(ev: {name: string; startDate: string; endDate: string; location: string}): {subject: string; bodyText: string} {
  const subject = `SKK Morzkulc — nowa impreza: ${ev.name}`;

  const lines: string[] = [];
  lines.push(`Dodano nową imprezę: ${ev.name}`);
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

export const eventsNotifyNewTask: ServiceTask<Payload> = {
  id: "events.notifyNew",
  description: "Wysyła mail o nowej (zatwierdzonej) imprezie do użytkowników z włączonym powiadomieniem eventsNew.",

  validate: (payload) => {
    if (!payload?.eventId) throw new Error("Missing eventId");
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun;

    const eventSnap = await ctx.firestore.collection("events").doc(payload.eventId).get();
    if (!eventSnap.exists) {
      return {ok: true, message: "skip: event not found", details: {sent: 0}};
    }
    const eventData = eventSnap.data() as any;
    if (eventData?.rejected === true) {
      return {ok: true, message: "skip: event rejected", details: {sent: 0}};
    }

    const {subject, bodyText} = buildNewEventEmail({
      name: norm(eventData?.name),
      startDate: norm(eventData?.startDate),
      endDate: norm(eventData?.endDate),
      location: norm(eventData?.location),
    });

    const recipientsSnap = await ctx.firestore.collection("users_active")
      .where("profile.notifications.eventsNew", "==", true)
      .get();

    const emails = recipientsSnap.docs
      .map((d) => norm((d.data() as any)?.email).toLowerCase())
      .filter((e) => e.includes("@"));

    if (!emails.length) {
      ctx.logger.info("eventsNotifyNew: no recipients", {eventId: payload.eventId});
      return {ok: true, message: "no recipients", details: {sent: 0}};
    }

    if (dryRun) {
      ctx.logger.info("eventsNotifyNew: [DRY RUN] would send", {eventId: payload.eventId, subject, recipients: emails.length});
      return {
        ok: true,
        message: `[DRY RUN] would notify ${emails.length} recipients`,
        details: {sent: 0, dryRun: true, subject, body: bodyText, recipients: emails.length},
      };
    }

    let sent = 0;
    for (const email of emails) {
      try {
        await ctx.workspace.sendGenericEmail(email, subject, bodyText);
        sent++;
      } catch (e: any) {
        ctx.logger.error("eventsNotifyNew: send failed", {eventId: payload.eventId, email, message: e?.message});
      }
    }

    ctx.logger.info("eventsNotifyNew: done", {eventId: payload.eventId, sent, recipients: emails.length});

    return {
      ok: true,
      message: `sent to ${sent}`,
      details: {sent, recipients: emails.length, eventId: payload.eventId},
    };
  },
};
