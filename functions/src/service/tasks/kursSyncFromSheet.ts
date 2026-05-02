import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

type Payload = {
  dry?: boolean;
};

function norm(v: any): string {
  return String(v || "").trim();
}

function normDate(v: any): string {
  const s = norm(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function parseBool(v: any): boolean {
  const s = norm(v).toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

export const kursSyncFromSheetTask: ServiceTask<Payload> = {
  id: "kursSyncFromSheet",
  description: "Sync kurs info and events from Google Sheets to Firestore (kurs_info + kurs_events).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.kurs.spreadsheetId;
    const tabName = cfg.kurs.tabName;
    const imprezaTabName = cfg.kurs.imprezaTabName;

    if (!spreadsheetId) {
      return {ok: true, message: "kurs spreadsheetId not configured — skipping", details: {unconfigured: true}};
    }

    ctx.logger.info("kursSyncFromSheet: start", {spreadsheetId, tabName, imprezaTabName, dryRun});

    const sheets = new GoogleSheetsProvider(delegated);
    let infoUpserted = 0;
    let infoSkipped = 0;
    let eventsUpserted = 0;
    let eventsSkipped = 0;
    let errors = 0;

    // Part A: sync zakładki "Kurs" → kolekcja kurs_info
    let infoTable;
    try {
      infoTable = await sheets.readTableAsObjects({spreadsheetId, tabName});
    } catch (e: any) {
      ctx.logger.error("kursSyncFromSheet: cannot read Kurs tab", {message: e?.message});
      return {ok: false, message: "Cannot read Kurs tab: " + e?.message};
    }

    ctx.logger.info("kursSyncFromSheet: kurs rows loaded", {count: infoTable.rows.length});

    for (const row of infoTable.rows) {
      const id = norm(row["ID"]);
      if (!id) {
        infoSkipped++;
        continue;
      }

      const doc = {
        id,
        name: norm(row["Nazwa kursu"]),
        startDate: normDate(row["Data rozpoczęcia"]),
        endDate: normDate(row["Data zakończenia"]),
        description: norm(row["Opis"]),
        instructor: norm(row["Instruktor"]),
        instructorContact: norm(row["Kontakt instruktora"]),
        location: norm(row["Miejsce zajęć"]),
        link: norm(row["Link"]),
        isActive: parseBool(row["Aktywny?"]),
        source: "sheet",
        updatedAt: ctx.now,
      };

      if (dryRun) {
        ctx.logger.info("kursSyncFromSheet: [DRY RUN] would upsert kurs_info", {id});
        infoUpserted++;
        continue;
      }

      try {
        await ctx.firestore.collection("kurs_info").doc(id).set(doc, {merge: true});
        infoUpserted++;
        ctx.logger.info("kursSyncFromSheet: upserted kurs_info", {id});
      } catch (e: any) {
        ctx.logger.error("kursSyncFromSheet: error upserting kurs_info", {id, message: e?.message});
        errors++;
      }
    }

    // Part B: sync zakładki "Imprezy kursowe" → kolekcja kurs_events
    let eventsTable;
    try {
      eventsTable = await sheets.readTableAsObjects({spreadsheetId, tabName: imprezaTabName});
    } catch (e: any) {
      ctx.logger.error("kursSyncFromSheet: cannot read Imprezy kursowe tab", {message: e?.message});
      return {ok: false, message: "Cannot read Imprezy kursowe tab: " + e?.message};
    }

    ctx.logger.info("kursSyncFromSheet: imprezy kursowe rows loaded", {count: eventsTable.rows.length});

    for (const row of eventsTable.rows) {
      let sheetId = norm(row["ID"]);
      const rowNumber = Number(row["_rowNumber"]);

      const startDate = normDate(row["data rozpoczęcia"]);
      const endDate = normDate(row["data zakończenia"]);
      const name = norm(row["nazwa imprezy"]);

      if (!sheetId) {
        if (!startDate || !endDate || !name) {
          eventsSkipped++;
          continue;
        }

        sheetId = ctx.firestore.collection("kurs_events").doc().id;

        if (!dryRun && rowNumber > 0) {
          try {
            await sheets.writeSingleCell({spreadsheetId, tabName: imprezaTabName}, rowNumber, "ID", sheetId);
            ctx.logger.info("kursSyncFromSheet: wrote auto-generated ID to sheet", {sheetId, rowNumber});
          } catch (e: any) {
            ctx.logger.error("kursSyncFromSheet: failed to write ID back to sheet", {sheetId, rowNumber, message: e?.message});
            errors++;
            continue;
          }
        } else {
          ctx.logger.info("kursSyncFromSheet: [DRY RUN] would auto-generate ID", {sheetId, rowNumber});
        }
      }

      if (!startDate || !endDate || !name) {
        ctx.logger.warn("kursSyncFromSheet: skipping impreza row with missing required fields", {sheetId});
        eventsSkipped++;
        continue;
      }

      const doc = {
        id: sheetId,
        startDate,
        endDate,
        name,
        location: norm(row["miejsce"]),
        description: norm(row["opis"]),
        contact: norm(row["kontakt"]),
        link: norm(row["link do strony / zgłoszeń"]),
        approved: parseBool(row["Zatwierdzona"]),
        source: "sheet",
        updatedAt: ctx.now,
        syncedAt: ctx.now,
      };

      if (dryRun) {
        ctx.logger.info("kursSyncFromSheet: [DRY RUN] would upsert kurs_events", {sheetId});
        eventsUpserted++;
        continue;
      }

      try {
        await ctx.firestore.collection("kurs_events").doc(sheetId).set(doc, {merge: true});
        eventsUpserted++;
        ctx.logger.info("kursSyncFromSheet: upserted kurs_events", {sheetId});
      } catch (e: any) {
        ctx.logger.error("kursSyncFromSheet: error upserting kurs_events", {sheetId, message: e?.message});
        errors++;
      }
    }

    const message = `kurs_info: upserted=${infoUpserted}, skipped=${infoSkipped}; kurs_events: upserted=${eventsUpserted}, skipped=${eventsSkipped}; errors=${errors}`;
    ctx.logger.info("kursSyncFromSheet: done", {infoUpserted, infoSkipped, eventsUpserted, eventsSkipped, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {infoUpserted, infoSkipped, eventsUpserted, eventsSkipped, errors, dryRun},
    };
  },
};
