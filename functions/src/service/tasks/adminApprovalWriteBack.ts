import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: admin.approvalWriteBack  (Z17b / Faza 2 panelu zarządu)
 *
 * Po zatwierdzeniu/odrzuceniu pozycji W APLIKACJI zapisuje decyzję z powrotem do
 * arkusza (anty-rozjazd). Firestore jest źródłem prawdy dla `approved`; write-back
 * przez service job z retry gwarantuje, że arkusz dogoni stan nawet przy chwilowej
 * awarii Sheets.
 *
 * Patch jest MINIMALNY (ID + kolumna zatwierdzenia + daty) i celowo BEZ
 * createOnlyColumns — nadpisuje kolumnę zatwierdzenia:
 *   - approved → "TAK",
 *   - rejected → "ODRZUCONA" (sync traktuje jak NIE — isApproved=false — zero zmian protokołu).
 * Pozostałe kolumny istniejącego wiersza są zachowane (upsert preserve).
 *
 * Wypełnienie "Zsynchronizowano" sprawia, że godzinkiSyncFromSheet pomija ten
 * wiersz fast-pathem (zatwierdzenie jednokierunkowe i zamrożone) — sync nie
 * próbuje już niczego z nim robić.
 */

type Decision = "approved" | "rejected";

type Payload = {
  kind: "godzinki" | "event";
  id: string;
  decision: Decision;
};

export const adminApprovalWriteBackTask: ServiceTask<Payload> = {
  id: "admin.approvalWriteBack",
  description: "Zapisuje decyzję zatwierdzenia/odrzucenia z aplikacji do arkusza (TAK/ODRZUCONA + daty).",

  validate: (payload) => {
    if (payload?.kind !== "godzinki" && payload?.kind !== "event") throw new Error("Invalid kind");
    if (!payload?.id) throw new Error("Missing id");
    if (payload?.decision !== "approved" && payload?.decision !== "rejected") throw new Error("Invalid decision");
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const isGodzinki = payload.kind === "godzinki";

    const spreadsheetId = isGodzinki ? cfg.godzinki?.spreadsheetId : cfg.events?.spreadsheetId;
    const tabName = isGodzinki ? (cfg.godzinki?.tabName || "Godzinki") : (cfg.events?.tabName || "imprezy");

    if (!spreadsheetId) {
      return {ok: false, message: `Missing ${payload.kind} spreadsheetId in config`};
    }

    const approvalColumn = isGodzinki ? "Zatwierdzone" : "Zatwierdzona";
    const value = payload.decision === "approved" ? "TAK" : "ODRZUCONA";
    const today = ctx.now.toISOString().slice(0, 10);

    const rowPatch: Record<string, any> = {
      "ID": payload.id,
      [approvalColumn]: value,
      "Zsynchronizowano": today,
    };
    // Godzinki mają opcjonalną kolumnę daty zatwierdzenia (Faza 0 ją dodała).
    if (isGodzinki) rowPatch["Data zatwierdzenia"] = today;

    const sheets = new GoogleSheetsProvider(delegated);

    if (ctx.dryRun) {
      ctx.logger.info("adminApprovalWriteBack: [DRY RUN] would write", {payload, rowPatch});
      return {ok: true, message: "[DRY RUN]", details: {dryRun: true, rowPatch}};
    }

    try {
      // BEZ createOnlyColumns — kolumna zatwierdzenia MA zostać nadpisana.
      const result = await sheets.upsertMemberRowById({spreadsheetId, tabName}, rowPatch, {looseHeaders: true});
      ctx.logger.info("adminApprovalWriteBack: done", {
        kind: payload.kind, id: payload.id, decision: payload.decision,
        action: result.action, rowNumber: result.rowNumber,
      });
      return {
        ok: true,
        message: `Row ${result.action} at row ${result.rowNumber} (${value})`,
        details: {rowNumber: result.rowNumber, action: result.action, value},
      };
    } catch (e: any) {
      return {ok: false, message: `Sheet write-back failed (tab "${tabName}"): ` + e?.message};
    }
  },
};
