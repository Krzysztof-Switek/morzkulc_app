import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";

/**
 * Task: godzinki.archiveSheetRows
 *
 * Porządkuje arkusz Google "Godzinki" (NIE Firestore — godzinki_ledger nietknięty):
 * usuwa całe wiersze, których kolumna "Data pracy" jest starsza niż
 * setup/vars_godzinki.okres_do_archiwizacji_godzinek_dni dni. Cel: arkusz ma zostać
 * mały i pokazywać tylko najświeższe zgłoszenia — starsze dane są dostępne w
 * raportach zarządu w aplikacji, nie muszą żyć w arkuszu.
 *
 * Wiersze "purchase" (wykup salda ujemnego) mają zawsze puste "Data pracy" (patrz
 * buildLedgerRowPatch w godzinkiSyncFromSheet.ts) — pomijane, to czyszczenie dotyczy
 * wyłącznie zgłoszonych godzinek z wypełnioną datą pracy.
 */

type Payload = {
  dry?: boolean;
};

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Wybiera numery wierszy do usunięcia: "Data pracy" wypełniona, w formacie ISO i
 * starsza niż cutoff. Puste "Data pracy" (wiersze "purchase") i nieparsowalne wartości
 * są pomijane. Czysta funkcja — eksportowana dla testów jednostkowych.
 */
export function selectRowsToArchive(rows: Record<string, string>[], cutoffIso: string): number[] {
  const rowsToDelete: number[] = [];
  for (const row of rows) {
    const dataPracy = String(row["Data pracy"] || "").trim();
    if (!dataPracy || !isIsoDate(dataPracy)) continue; // puste (purchase) lub nieparsowalne — pomiń
    if (dataPracy < cutoffIso) {
      const rowNumber = Number(row["_rowNumber"]);
      if (Number.isFinite(rowNumber)) rowsToDelete.push(rowNumber);
    }
  }
  return rowsToDelete;
}

export const godzinkiArchiveSheetRowsTask: ServiceTask<Payload> = {
  id: "godzinki.archiveSheetRows",
  description: "Usuwa z arkusza Google 'Godzinki' wiersze z 'Data pracy' starszą niż próg z setup/vars_godzinki (Firestore godzinki_ledger nietknięty).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const {logger} = ctx;
    const cfg = getServiceConfig();
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.godzinki?.spreadsheetId;
    const tabName = cfg.godzinki?.tabName || "Godzinki";

    if (!spreadsheetId) {
      return {ok: false, message: "Missing godzinki spreadsheetId in config"};
    }

    const vars = await getGodzinkiVars(ctx.firestore);
    const cutoffDate = new Date(ctx.now);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - vars.archiveAfterDays);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    logger.info("godzinkiArchiveSheetRows: start", {
      spreadsheetId, tabName, archiveAfterDays: vars.archiveAfterDays, cutoff, dryRun,
    });

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);
    const table = await sheets.readTableAsObjects({spreadsheetId, tabName});

    const rowsToDelete = selectRowsToArchive(table.rows, cutoff);

    if (dryRun) {
      logger.info("godzinkiArchiveSheetRows: [DRY RUN]", {toDelete: rowsToDelete.length});
      return {
        ok: true,
        message: `DRYRUN: ${rowsToDelete.length} wierszy starszych niż ${cutoff} do usunięcia`,
        details: {toDelete: rowsToDelete.length, cutoff},
      };
    }

    if (rowsToDelete.length > 0) {
      await sheets.deleteRows({spreadsheetId, tabName}, rowsToDelete);
    }

    logger.info("godzinkiArchiveSheetRows: done", {deleted: rowsToDelete.length});

    return {
      ok: true,
      message: `Usunięto ${rowsToDelete.length} wierszy starszych niż ${cutoff} z arkusza (Firestore nietknięty)`,
      details: {deleted: rowsToDelete.length, cutoff},
    };
  },
};
