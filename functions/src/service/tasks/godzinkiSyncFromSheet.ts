import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";
import {processApproval} from "../../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";

/**
 * Task: godzinki.syncFromSheet
 *
 * Czyta arkusz godzinek z Google Sheets i zatwierdza rekordy w Firestore,
 * w których kolumna "Zatwierdzone" = "TAK".
 *
 * Arkusz musi mieć kolumny:
 *   ID | UID | Imię | Nazwisko | Godzinki | Data pracy | Opis | Zatwierdzone | Data zatwierdzenia
 *
 * Kolumna "ID" to ID rekordu w Firestore (godzinki_ledger/{id}).
 *
 * Po zatwierdzeniu rekordu w Firestore, task aktualizuje w arkuszu kolumnę
 * "Zsynchronizowano" na datę syncu (jeśli ta kolumna istnieje).
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

export const godzinkiSyncFromSheetTask: ServiceTask<Payload> = {
  id: "godzinki.syncFromSheet",
  description: "Sync: Google Sheets (Godzinki) -> Firestore godzinki_ledger (zatwierdza rekordy z Zatwierdzone=TAK).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    const spreadsheetId = cfg.godzinki?.spreadsheetId;
    const tabName = cfg.godzinki?.tabName || "Godzinki";

    if (!spreadsheetId) {
      return {ok: false, message: "Missing godzinki spreadsheetId in config"};
    }

    ctx.logger.info("godzinkiSyncFromSheet: start", {spreadsheetId, tabName, dryRun});

    const sheets = new GoogleSheetsProvider(delegated);
    const godzinkiVars = await getGodzinkiVars(ctx.firestore);

    let table;
    try {
      table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    } catch (e: any) {
      ctx.logger.error("godzinkiSyncFromSheet: cannot read sheet", {message: e?.message});
      return {ok: false, message: "Cannot read sheet: " + e?.message};
    }

    ctx.logger.info("godzinkiSyncFromSheet: rows loaded", {count: table.rows.length});

    let approved = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of table.rows) {
      const recordId = norm(row["ID"]);
      if (!recordId) {
        skipped++;
        continue;
      }

      if (!isApproved(row["Zatwierdzone"])) {
        skipped++;
        continue;
      }

      if (dryRun) {
        ctx.logger.info("godzinkiSyncFromSheet: [DRY RUN] would approve", {recordId});
        approved++;
        continue;
      }

      try {
        const result = await processApproval(
          ctx.firestore,
          recordId,
          "sync",
          godzinkiVars.expiryYears
        );

        if (result.ok) {
          approved++;
          ctx.logger.info("godzinkiSyncFromSheet: approved", {recordId});

          // Oznacz w arkuszu datę syncu (jeśli kolumna "Zsynchronizowano" istnieje)
          if (table.headers.includes("Zsynchronizowano")) {
            const syncDate = ctx.now.toISOString().slice(0, 10);
            try {
              await sheets.upsertMemberRowById(
                {spreadsheetId, tabName},
                {"ID": recordId, "Zsynchronizowano": syncDate}
              );
            } catch (sheetErr: any) {
              ctx.logger.warn("godzinkiSyncFromSheet: cannot update Zsynchronizowano", {
                recordId,
                message: sheetErr?.message,
              });
            }
          }
        } else {
          ctx.logger.warn("godzinkiSyncFromSheet: processApproval skipped", {
            recordId,
            code: result.code,
            message: result.message,
          });
          skipped++;
        }
      } catch (e: any) {
        ctx.logger.error("godzinkiSyncFromSheet: error approving record", {
          recordId,
          message: e?.message,
        });
        errors++;
      }
    }

    const message = `approved=${approved}, skipped=${skipped}, errors=${errors}`;
    ctx.logger.info("godzinkiSyncFromSheet: done", {approved, skipped, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {approved, skipped, errors, dryRun},
    };
  },
};

/**
 * Task: godzinki.writeToSheet
 *
 * Zapisuje pojedynczy rekord zgłoszenia godzinek do Google Sheets.
 * Wywoływany jako zadanie serwisowe po każdym submitGodzinki.
 */
type WritePayload = {
  recordId: string;
  uid: string;
};

export const godzinkiWriteToSheetTask: ServiceTask<WritePayload> = {
  id: "godzinki.writeToSheet",
  description: "Zapisuje zgłoszenie godzinek (earn record) do zakładki Godzinki w Google Sheets.",

  validate: (payload) => {
    if (!payload?.recordId) throw new Error("Missing recordId");
    if (!payload?.uid) throw new Error("Missing uid");
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;

    const spreadsheetId = cfg.godzinki?.spreadsheetId;
    const tabName = cfg.godzinki?.tabName || "Godzinki";

    if (!spreadsheetId) {
      return {ok: false, message: "Missing godzinki spreadsheetId in config"};
    }

    const docRef = ctx.firestore.collection("godzinki_ledger").doc(payload.recordId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {ok: false, message: `Record ${payload.recordId} not found in godzinki_ledger`};
    }

    const data = snap.data() as any;

    // Pobierz dane użytkownika do wypełnienia arkusza
    const userSnap = await ctx.firestore.collection("users_active").doc(payload.uid).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const profile = userData?.profile || {};

    const firstName = String(profile?.firstName || "").trim();
    const lastName = String(profile?.lastName || "").trim();

    const grantedAt = data?.grantedAt?.toDate?.();
    const grantedAtStr = grantedAt ? grantedAt.toISOString().slice(0, 10) : "";
    const recordType = String(data?.type || "earn");

    // Wykup salda ujemnego zapisujemy z pustą datą pracy i etykietą w Opis
    const rowPatch: Record<string, any> = recordType === "purchase" ? {
      "ID": payload.recordId,
      "UID": payload.uid,
      "Imię": firstName,
      "Nazwisko": lastName,
      "Godzinki": String(data?.amount ?? ""),
      "Data pracy": "",
      "Opis": "WYKUP SALDA UJEMNEGO",
      "Zatwierdzone": "NIE",
    } : {
      "ID": payload.recordId,
      "UID": payload.uid,
      "Imię": firstName,
      "Nazwisko": lastName,
      "Godzinki": String(data?.amount ?? ""),
      "Data pracy": grantedAtStr,
      "Opis": String(data?.reason || ""),
      "Zatwierdzone": "NIE",
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
