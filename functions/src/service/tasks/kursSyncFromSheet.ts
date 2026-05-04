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
  description: "Sync kurs info from Google Sheets to Firestore (kurs_info).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.kurs.spreadsheetId;
    const tabName = cfg.kurs.tabName;

    if (!spreadsheetId) {
      return {ok: true, message: "kurs spreadsheetId not configured — skipping", details: {unconfigured: true}};
    }

    ctx.logger.info("kursSyncFromSheet: start", {spreadsheetId, tabName, dryRun});

    const sheets = new GoogleSheetsProvider(delegated);
    let infoUpserted = 0;
    let infoSkipped = 0;
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

    const message = `kurs_info: upserted=${infoUpserted}, skipped=${infoSkipped}; errors=${errors}`;
    ctx.logger.info("kursSyncFromSheet: done", {infoUpserted, infoSkipped, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {infoUpserted, infoSkipped, errors, dryRun},
    };
  },
};
