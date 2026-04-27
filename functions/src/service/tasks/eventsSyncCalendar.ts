import {ServiceTask} from "../types";
import {GoogleCalendarProvider, CalendarEventData} from "../providers/googleCalendarProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: events.syncCalendar
 *
 * Czyta zatwierdzone imprezy z kolekcji Firestore `events` i synchronizuje je
 * z Google Calendar. Tworzy nowe zdarzenia lub aktualizuje istniejące
 * (na podstawie pola calendarEventId).
 *
 * Nie czyta arkusza — działa wyłącznie na danych już zsynchronizowanych do Firestore.
 */

type Payload = {
  dry?: boolean;
};

function norm(v: any): string {
  return String(v || "").trim();
}

export const eventsSyncCalendarTask: ServiceTask<Payload> = {
  id: "events.syncCalendar",
  description: "Sync: Firestore events (approved=true) -> Google Calendar (utwórz lub zaktualizuj zdarzenie).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const calendarId = cfg.calendar?.calendarId || "";

    if (!calendarId) {
      return {ok: false, message: "Missing SVC_CALENDAR_ID — calendar sync disabled"};
    }

    ctx.logger.info("eventsSyncCalendar: start", {calendarId, dryRun});

    const snap = await ctx.firestore
      .collection("events")
      .where("approved", "==", true)
      .get();

    ctx.logger.info("eventsSyncCalendar: approved events loaded", {count: snap.size});

    const calendar = new GoogleCalendarProvider(delegated);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of snap.docs) {
      const data = doc.data() as any;
      const sheetId = doc.id;
      const name = norm(data?.name);
      const startDate = norm(data?.startDate);
      const endDate = norm(data?.endDate);

      if (!name || !startDate || !endDate) {
        ctx.logger.warn("eventsSyncCalendar: skipping event with missing fields", {sheetId});
        skipped++;
        continue;
      }

      const descriptionParts: string[] = [];
      const description = norm(data?.description);
      const contact = norm(data?.contact);
      const link = norm(data?.link);
      if (description) descriptionParts.push(description);
      if (contact) descriptionParts.push(`Kontakt: ${contact}`);
      if (link) descriptionParts.push(`Link: ${link}`);

      const calData: CalendarEventData = {
        summary: name,
        description: descriptionParts.join("\n"),
        location: norm(data?.location),
        startDate,
        endDate,
      };

      const existingCalId = norm(data?.calendarEventId);

      if (dryRun) {
        const action = existingCalId ? "update" : "create";
        ctx.logger.info("eventsSyncCalendar: [DRY RUN] would " + action, {sheetId, existingCalId});
        existingCalId ? updated++ : created++;
        continue;
      }

      try {
        if (existingCalId) {
          await calendar.updateEvent(calendarId, existingCalId, calData);
          ctx.logger.info("eventsSyncCalendar: updated", {sheetId, gcalEventId: existingCalId});
          updated++;
        } else {
          const gcalEventId = await calendar.createEvent(calendarId, calData);
          await ctx.firestore.collection("events").doc(sheetId).update({calendarEventId: gcalEventId});
          ctx.logger.info("eventsSyncCalendar: created", {sheetId, gcalEventId});
          created++;
        }
      } catch (e: any) {
        ctx.logger.error("eventsSyncCalendar: error syncing event", {
          sheetId,
          message: e?.message,
          responseStatus: e?.response?.status,
          responseData: JSON.stringify(e?.response?.data || e?.errors || "").slice(0, 1000),
        });
        errors++;
      }
    }

    const message = `created=${created}, updated=${updated}, skipped=${skipped}, errors=${errors}`;
    ctx.logger.info("eventsSyncCalendar: done", {created, updated, skipped, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {created, updated, skipped, errors, dryRun},
    };
  },
};
