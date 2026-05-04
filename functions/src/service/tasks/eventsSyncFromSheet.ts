import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {GoogleCalendarProvider, CalendarEventData} from "../providers/googleCalendarProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: events.syncFromSheet
 *
 * Czyta zakładkę "imprezy" z arkusza Google i synchronizuje imprezy do Firestore (kolekcja `events`).
 * Kolumny arkusza:
 *   ID | data rozpoczęcia | data zakończenia | nazwa imprezy | miejsce | opis | kontakt | link do strony / zgłoszeń | Zatwierdzona | ranking? | kursowa?
 *
 * Pole "Zatwierdzona" = TAK ustawia approved=true w Firestore.
 * Pole "ID" to Firestore document ID (upsert).
 */

type Payload = {
  dry?: boolean;
};

function norm(v: any): string {
  return String(v || "").trim();
}

function isApproved(v: any): boolean {
  const s = norm(v).toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

function normDate(v: any): string {
  const s = norm(v);
  // Accept YYYY-MM-DD directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Accept DD.MM.YYYY
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

export const eventsSyncFromSheetTask: ServiceTask<Payload> = {
  id: "events.syncFromSheet",
  description: "Sync: Google Sheets (imprezy) -> Firestore events (upsert po ID, zatwierdza gdzie Zatwierdzona=TAK).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.events.spreadsheetId;
    const tabName = cfg.events.tabName;
    const calendarId = cfg.calendar?.calendarId || "";

    if (!spreadsheetId) {
      return {ok: false, message: "Missing events spreadsheetId in config"};
    }

    ctx.logger.info("eventsSyncFromSheet: start", {spreadsheetId, tabName, dryRun, calendarEnabled: Boolean(calendarId)});

    const sheets = new GoogleSheetsProvider(delegated);
    const calendarProvider = calendarId ? new GoogleCalendarProvider(delegated) : null;

    let table;
    try {
      table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    } catch (e: any) {
      ctx.logger.error("eventsSyncFromSheet: cannot read sheet", {message: e?.message});
      return {ok: false, message: "Cannot read sheet: " + e?.message};
    }

    ctx.logger.info("eventsSyncFromSheet: rows loaded", {count: table.rows.length});

    let upserted = 0;
    let skipped = 0;
    let errors = 0;
    let calendarSynced = 0;

    for (const row of table.rows) {
      let sheetId = norm(row["ID"]);
      const rowNumber = Number(row["_rowNumber"]);

      const startDate = normDate(row["data rozpoczęcia"]);
      const endDate = normDate(row["data zakończenia"]);
      const name = norm(row["nazwa imprezy"]);

      if (!sheetId) {
        if (!startDate || !endDate || !name) {
          skipped++;
          continue;
        }

        // Auto-generate Firestore document ID for rows added directly to sheet
        sheetId = ctx.firestore.collection("events").doc().id;

        if (!dryRun && rowNumber > 0) {
          try {
            await sheets.writeSingleCell({spreadsheetId, tabName}, rowNumber, "ID", sheetId);
            ctx.logger.info("eventsSyncFromSheet: wrote auto-generated ID to sheet", {sheetId, rowNumber});
          } catch (e: any) {
            ctx.logger.error("eventsSyncFromSheet: failed to write ID back to sheet", {sheetId, rowNumber, message: e?.message});
            errors++;
            continue;
          }
        } else {
          ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would auto-generate ID", {sheetId, rowNumber});
        }
      }

      if (!startDate || !endDate || !name) {
        ctx.logger.warn("eventsSyncFromSheet: skipping row with missing required fields", {sheetId});
        skipped++;
        continue;
      }

      const approved = isApproved(row["Zatwierdzona"]);
      const ranking = isApproved(row["ranking?"]);
      const kursowa = isApproved(row["kursowa?"]);
      const location = norm(row["miejsce"]);
      const description = norm(row["opis"]);
      const contact = norm(row["kontakt"]);
      const link = norm(row["link do strony / zgłoszeń"]);

      const doc = {
        id: sheetId,
        startDate,
        endDate,
        name,
        location,
        description,
        contact,
        link,
        approved,
        ranking,
        kursowa,
        source: "sheet",
        updatedAt: ctx.now,
        syncedAt: ctx.now,
      };

      if (dryRun) {
        ctx.logger.info("eventsSyncFromSheet: [DRY RUN] would upsert", {sheetId, approved});
        upserted++;
        continue;
      }

      try {
        await ctx.firestore
          .collection("events")
          .doc(sheetId)
          .set(doc, {merge: true});

        upserted++;
        ctx.logger.info("eventsSyncFromSheet: upserted", {sheetId, approved});
      } catch (e: any) {
        ctx.logger.error("eventsSyncFromSheet: error upserting", {sheetId, message: e?.message});
        errors++;
        continue;
      }

      // Sync to Google Calendar for approved events
      if (approved && calendarProvider && calendarId) {
        try {
          const existingSnap = await ctx.firestore.collection("events").doc(sheetId).get();
          const existingCalId = existingSnap.data()?.calendarEventId as string | undefined;

          const descriptionParts: string[] = [];
          if (description) descriptionParts.push(description);
          if (contact) descriptionParts.push(`Kontakt: ${contact}`);
          if (link) descriptionParts.push(`Link: ${link}`);

          const calData: CalendarEventData = {
            summary: name,
            description: descriptionParts.join("\n"),
            location,
            startDate,
            endDate,
          };

          if (existingCalId) {
            await calendarProvider.updateEvent(calendarId, existingCalId, calData);
            ctx.logger.info("eventsSyncFromSheet: calendar event updated", {sheetId, gcalEventId: existingCalId});
          } else {
            const gcalEventId = await calendarProvider.createEvent(calendarId, calData);
            await ctx.firestore.collection("events").doc(sheetId).update({calendarEventId: gcalEventId});
            ctx.logger.info("eventsSyncFromSheet: calendar event created", {sheetId, gcalEventId});
          }
          calendarSynced++;
        } catch (e: any) {
          ctx.logger.warn("eventsSyncFromSheet: calendar sync failed (non-fatal)", {sheetId, message: e?.message});
        }
      }
    }

    const message = `upserted=${upserted}, skipped=${skipped}, errors=${errors}, calendarSynced=${calendarSynced}`;
    ctx.logger.info("eventsSyncFromSheet: done", {upserted, skipped, errors, calendarSynced, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {upserted, skipped, errors, calendarSynced, dryRun},
    };
  },
};

/**
 * Task: events.writeToSheet
 *
 * Zapisuje pojedyncze zgłoszenie imprezy (z aplikacji) do zakładki "imprezy" w Google Sheets.
 * Wywoływany jako job serwisowy po każdym submitEvent.
 */
type WritePayload = {
  eventId: string;
  uid: string;
};

export const eventsWriteToSheetTask: ServiceTask<WritePayload> = {
  id: "events.writeToSheet",
  description: "Zapisuje zgłoszenie imprezy do zakładki imprezy w Google Sheets.",

  validate: (payload) => {
    if (!payload?.eventId) throw new Error("Missing eventId");
    if (!payload?.uid) throw new Error("Missing uid");
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;

    const spreadsheetId = cfg.events.spreadsheetId;
    const tabName = cfg.events.tabName;

    if (!spreadsheetId) {
      return {ok: false, message: "Missing events spreadsheetId in config"};
    }

    const docRef = ctx.firestore.collection("events").doc(payload.eventId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {ok: false, message: `Event ${payload.eventId} not found`};
    }

    const data = snap.data() as any;

    const rowPatch: Record<string, any> = {
      "ID": payload.eventId,
      "data rozpoczęcia": norm(data?.startDate),
      "data zakończenia": norm(data?.endDate),
      "nazwa imprezy": norm(data?.name),
      "miejsce": norm(data?.location),
      "opis": norm(data?.description),
      "kontakt": norm(data?.contact),
      "link do strony / zgłoszeń": norm(data?.link),
      "Zatwierdzona": "NIE",
      "ranking?": "NIE",
      "kursowa?": "NIE",
    };

    const sheets = new GoogleSheetsProvider(delegated);

    try {
      const result = await sheets.upsertMemberRowById({spreadsheetId, tabName}, rowPatch);

      await docRef.update({
        sheetRowNumber: result.rowNumber,
        sheetSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        message: `Row ${result.action} at row ${result.rowNumber}`,
        details: {rowNumber: result.rowNumber, action: result.action},
      };
    } catch (e: any) {
      return {ok: false, message: "Sheet write failed: " + e?.message};
    }
  },
};
