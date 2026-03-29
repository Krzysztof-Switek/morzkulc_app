import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: events.syncFromSheet
 *
 * Czyta zakładkę "imprezy" z arkusza Google i synchronizuje imprezy do Firestore (kolekcja `events`).
 * Kolumny arkusza:
 *   ID | data rozpoczęcia | data zakończenia | nazwa imprezy | miejsce | opis | kontakt | link do strony / zgłoszeń | Zatwierdzona
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

    if (!spreadsheetId) {
      return {ok: false, message: "Missing events spreadsheetId in config"};
    }

    ctx.logger.info("eventsSyncFromSheet: start", {spreadsheetId, tabName, dryRun});

    const sheets = new GoogleSheetsProvider(delegated);

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

    for (const row of table.rows) {
      const sheetId = norm(row["ID"]);
      if (!sheetId) {
        skipped++;
        continue;
      }

      const startDate = normDate(row["data rozpoczęcia"]);
      const endDate = normDate(row["data zakończenia"]);
      const name = norm(row["nazwa imprezy"]);

      if (!startDate || !endDate || !name) {
        ctx.logger.warn("eventsSyncFromSheet: skipping row with missing required fields", {sheetId});
        skipped++;
        continue;
      }

      const approved = isApproved(row["Zatwierdzona"]);

      const doc = {
        id: sheetId,
        startDate,
        endDate,
        name,
        location: norm(row["miejsce"]),
        description: norm(row["opis"]),
        contact: norm(row["kontakt"]),
        link: norm(row["link do strony / zgłoszeń"]),
        approved,
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
      }
    }

    const message = `upserted=${upserted}, skipped=${skipped}, errors=${errors}`;
    ctx.logger.info("eventsSyncFromSheet: done", {upserted, skipped, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {upserted, skipped, errors, dryRun},
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
