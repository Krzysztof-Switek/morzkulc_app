import * as admin from "firebase-admin";
import {ServiceTask, ServiceTaskContext} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";
import {processApproval} from "../../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: godzinki.syncFromSheet
 *
 * Synchronizuje arkusz godzinek (Google Sheets) z Firestore godzinki_ledger:
 *
 * 1. KOREKTY (tylko rekordy NIEZATWIERDZONE — approved !== true):
 *    Edycje kolumn "Godzinki", "Data pracy", "Opis" w arkuszu nadpisują rekord
 *    w Firestore. Po zatwierdzeniu kwota/data są ZAMROŻONE — edycje ignorowane
 *    (zatwierdzona pula ma już remaining/expiresAt; korekta wymagałaby przeliczeń).
 *
 * 2. ZATWIERDZENIA (kolumna "Zatwierdzone" = TAK):
 *    processApproval ustawia approved=true (earn: remaining/expiresAt; purchase:
 *    z rewalidacją salda). Po sukcesie task wypełnia w arkuszu kolumny
 *    "Zsynchronizowano" i "Data zatwierdzenia" (jeśli istnieją).
 *    Zatwierdzenie jest JEDNOKIERUNKOWE — zmiana TAK→NIE jest ignorowana
 *    (logowana jako warning, licznik unapproveIgnored).
 *
 * 3. BACKFILL (samonaprawa po martwych jobach writeToSheet):
 *    Rekordy ledgera z sheetSyncedAt == null (nigdy nie zapisane do arkusza)
 *    są dopisywane do arkusza.
 *
 * Wiersze z wypełnionym "Zsynchronizowano" są pomijane bez odczytu Firestore
 * (fast path — koszt syncu nie rośnie z całą historią arkusza).
 *
 * Arkusz musi mieć kolumny:
 *   ID | UID | Imię | Nazwisko | Godzinki | Data pracy | Opis | Zatwierdzone
 * Opcjonalne: Zsynchronizowano | Data zatwierdzenia
 *
 * Kolumna "ID" to ID rekordu w Firestore (godzinki_ledger/{id}).
 * Wiersze bez ID i duplikaty ID są pomijane (liczniki emptyId/duplicateId).
 */

type Payload = {
  dry?: boolean;
};

function isApproved(v: any): boolean {
  const s = norm(v).toLowerCase();
  return ["tak", "t", "yes", "true", "1", "✓"].includes(s);
}

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function tsToIsoDate(v: any): string {
  const d = typeof v?.toDate === "function" ? v.toDate() : null;
  return d ? d.toISOString().slice(0, 10) : "";
}

/**
 * Buduje patch wiersza arkusza dla rekordu ledgera (earn lub purchase).
 * Współdzielone przez task godzinki.writeToSheet i backfill w syncu.
 */
export function buildLedgerRowPatch(args: {
  recordId: string;
  uid: string;
  data: any;
  firstName: string;
  lastName: string;
}): Record<string, any> {
  const {recordId, uid, data, firstName, lastName} = args;
  const recordType = String(data?.type || "earn");
  const grantedAtStr = tsToIsoDate(data?.grantedAt);

  // Wykup salda ujemnego zapisujemy z pustą datą pracy i etykietą w Opis
  if (recordType === "purchase") {
    return {
      "ID": recordId,
      "UID": uid,
      "Imię": firstName,
      "Nazwisko": lastName,
      "Godzinki": String(data?.amount ?? ""),
      "Data pracy": "",
      "Opis": "WYKUP SALDA UJEMNEGO",
      "Zatwierdzone": "NIE",
    };
  }

  return {
    "ID": recordId,
    "UID": uid,
    "Imię": firstName,
    "Nazwisko": lastName,
    "Godzinki": String(data?.amount ?? ""),
    "Data pracy": grantedAtStr,
    "Opis": String(data?.reason || ""),
    "Zatwierdzone": "NIE",
  };
}

async function readUserName(
  firestore: FirebaseFirestore.Firestore,
  uid: string,
  cache: Map<string, {firstName: string; lastName: string}>
): Promise<{firstName: string; lastName: string}> {
  const cached = cache.get(uid);
  if (cached) return cached;
  const snap = await firestore.collection("users_active").doc(uid).get();
  const profile = snap.exists ? ((snap.data() as any)?.profile || {}) : {};
  const out = {
    firstName: norm(profile?.firstName),
    lastName: norm(profile?.lastName),
  };
  cache.set(uid, out);
  return out;
}

/**
 * Korekta rekordu pending na podstawie wiersza arkusza.
 * Zwraca patch do Firestore (pusty = brak zmian) + listę odrzuconych pól.
 * Eksportowane dla testów jednostkowych (functions/test/sync_core.test.ts).
 */
export function buildPendingCorrection(row: Record<string, string>, data: any): {
  patch: Record<string, any>;
  rejected: string[];
} {
  const patch: Record<string, any> = {};
  const rejected: string[] = [];
  const recordType = String(data?.type || "earn");

  // Godzinki (kwota) — earn i purchase
  const rawAmount = norm(row["Godzinki"]);
  if (rawAmount) {
    const amount = Number(rawAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999 || !Number.isInteger(amount)) {
      rejected.push(`Godzinki="${rawAmount}"`);
    } else if (amount !== Number(data?.amount ?? 0)) {
      patch.amount = amount;
    }
  }

  if (recordType === "earn") {
    // Data pracy — wpływa na expiresAt przy zatwierdzeniu
    const rawDate = norm(row["Data pracy"]);
    if (rawDate) {
      if (!isIsoDate(rawDate)) {
        rejected.push(`Data pracy="${rawDate}" (wymagany format YYYY-MM-DD)`);
      } else if (rawDate !== tsToIsoDate(data?.grantedAt)) {
        patch.grantedAt = admin.firestore.Timestamp.fromDate(new Date(rawDate + "T00:00:00Z"));
      }
    }

    // Opis
    const rawReason = norm(row["Opis"]);
    if (rawReason && rawReason.length <= 500 && rawReason !== norm(data?.reason)) {
      patch.reason = rawReason;
    }
  }

  return {patch, rejected};
}

export const godzinkiSyncFromSheetTask: ServiceTask<Payload> = {
  id: "godzinki.syncFromSheet",
  description: "Sync: Google Sheets (Godzinki) <-> Firestore godzinki_ledger (korekty pending, zatwierdzenia, backfill).",

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

    const hasZsync = table.headers.includes("Zsynchronizowano");
    const hasApprovalDate = table.headers.includes("Data zatwierdzenia");
    const syncDate = ctx.now.toISOString().slice(0, 10);

    let approved = 0;
    let corrected = 0;
    let skipped = 0;
    let errors = 0;
    let emptyId = 0;
    let duplicateId = 0;
    let notFound = 0;
    let alreadySynced = 0;
    let unapproveIgnored = 0;
    let approvalRejected = 0;

    const seenIds = new Set<string>();

    for (const row of table.rows) {
      const recordId = norm(row["ID"]);
      if (!recordId) {
        emptyId++;
        continue;
      }

      if (seenIds.has(recordId)) {
        duplicateId++;
        ctx.logger.warn("godzinkiSyncFromSheet: duplicate ID in sheet — row skipped", {
          recordId, rowNumber: row["_rowNumber"],
        });
        continue;
      }
      seenIds.add(recordId);

      // Fast path: wiersz już potwierdzony (Zsynchronizowano wypełnione) —
      // zatwierdzenie jest jednokierunkowe i zamrożone, nie czytamy Firestore.
      if (hasZsync && norm(row["Zsynchronizowano"])) {
        alreadySynced++;
        continue;
      }

      const rowApproved = isApproved(row["Zatwierdzone"]);

      let docSnap;
      try {
        docSnap = await ctx.firestore.collection("godzinki_ledger").doc(recordId).get();
      } catch (e: any) {
        ctx.logger.error("godzinkiSyncFromSheet: cannot read record", {recordId, message: e?.message});
        errors++;
        continue;
      }

      if (!docSnap.exists) {
        ctx.logger.warn("godzinkiSyncFromSheet: record not found in ledger", {
          recordId, rowNumber: row["_rowNumber"],
        });
        notFound++;
        continue;
      }

      const data = docSnap.data() as any;

      // Zatwierdzony w Firestore, a w arkuszu NIE → cofnięcie ignorowane (jednokierunkowe)
      if (data.approved === true && !rowApproved) {
        unapproveIgnored++;
        ctx.logger.warn("godzinkiSyncFromSheet: TAK→NIE ignored (approval is one-way)", {recordId});
        continue;
      }

      // Korekty pending (przed ewentualnym zatwierdzeniem w tym samym przebiegu)
      if (data.approved !== true) {
        const {patch, rejected} = buildPendingCorrection(row, data);

        if (rejected.length) {
          ctx.logger.warn("godzinkiSyncFromSheet: invalid correction values — ignored", {
            recordId, rejected,
          });
        }

        if (Object.keys(patch).length > 0) {
          if (dryRun) {
            ctx.logger.info("godzinkiSyncFromSheet: [DRY RUN] would correct", {recordId, patch});
          } else {
            try {
              await docSnap.ref.update({
                ...patch,
                correctedFromSheetAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              ctx.logger.info("godzinkiSyncFromSheet: pending record corrected", {
                recordId, fields: Object.keys(patch),
              });
            } catch (e: any) {
              ctx.logger.error("godzinkiSyncFromSheet: correction failed", {recordId, message: e?.message});
              errors++;
              continue;
            }
          }
          corrected++;
        }
      }

      if (!rowApproved) {
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

          // Potwierdzenie w arkuszu: data syncu + data zatwierdzenia
          const confirmPatch: Record<string, any> = {"ID": recordId};
          if (hasZsync) confirmPatch["Zsynchronizowano"] = syncDate;
          if (hasApprovalDate) confirmPatch["Data zatwierdzenia"] = syncDate;

          if (Object.keys(confirmPatch).length > 1) {
            try {
              await sheets.upsertMemberRowById({spreadsheetId, tabName}, confirmPatch, {looseHeaders: true});
            } catch (sheetErr: any) {
              ctx.logger.warn("godzinkiSyncFromSheet: cannot confirm row in sheet", {
                recordId,
                message: sheetErr?.message,
              });
            }
          }
        } else if (result.code === "already_expired" || result.code === "purchase_no_longer_valid") {
          // Odmowa merytoryczna — wiersz zostaje bez Zsynchronizowano (sygnał dla admina)
          approvalRejected++;
          ctx.logger.warn("godzinkiSyncFromSheet: approval rejected", {
            recordId,
            code: result.code,
            message: result.message,
          });
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

    // ── BACKFILL: rekordy ledgera, które nigdy nie trafiły do arkusza ─────────
    // (sheetSyncedAt == null — np. job writeToSheet umarł po wyczerpaniu prób)
    let backfilled = 0;
    try {
      const missingSnap = await ctx.firestore
        .collection("godzinki_ledger")
        .where("sheetSyncedAt", "==", null)
        .limit(25)
        .get();

      const nameCache = new Map<string, {firstName: string; lastName: string}>();

      for (const doc of missingSnap.docs) {
        const data = doc.data() as any;
        const recordType = String(data?.type || "");
        if (recordType !== "earn" && recordType !== "purchase") continue;
        // Rekordy systemowe (zwroty, bilans otwarcia, korekty) nie trafiają do arkusza
        if (String(data?.submittedBy || "") === "system") continue;

        const uid = String(data?.uid || "");
        if (!uid) continue;

        if (dryRun) {
          ctx.logger.info("godzinkiSyncFromSheet: [DRY RUN] would backfill", {recordId: doc.id});
          backfilled++;
          continue;
        }

        try {
          const {firstName, lastName} = await readUserName(ctx.firestore, uid, nameCache);
          const rowPatch = buildLedgerRowPatch({recordId: doc.id, uid, data, firstName, lastName});
          // "Zatwierdzone" tylko przy tworzeniu wiersza — backfill na istniejący
          // wiersz nie może cofnąć TAK wpisanego przez admina.
          const result = await sheets.upsertMemberRowById({spreadsheetId, tabName}, rowPatch, {createOnlyColumns: ["Zatwierdzone"], looseHeaders: true});
          await doc.ref.update({
            sheetRowNumber: result.rowNumber,
            sheetSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          backfilled++;
          ctx.logger.info("godzinkiSyncFromSheet: backfilled missing sheet row", {
            recordId: doc.id, rowNumber: result.rowNumber,
          });
        } catch (e: any) {
          ctx.logger.error("godzinkiSyncFromSheet: backfill failed", {recordId: doc.id, message: e?.message});
          errors++;
        }
      }
    } catch (e: any) {
      // Query może wymagać czasu na indeks — nie blokuje głównego syncu
      ctx.logger.warn("godzinkiSyncFromSheet: backfill query failed", {message: e?.message});
    }

    const message =
      `approved=${approved}, corrected=${corrected}, backfilled=${backfilled}, ` +
      `approvalRejected=${approvalRejected}, skipped=${skipped}, alreadySynced=${alreadySynced}, ` +
      `notFound=${notFound}, emptyId=${emptyId}, duplicateId=${duplicateId}, ` +
      `unapproveIgnored=${unapproveIgnored}, errors=${errors}`;
    ctx.logger.info("godzinkiSyncFromSheet: done", {
      approved, corrected, backfilled, approvalRejected, skipped, alreadySynced,
      notFound, emptyId, duplicateId, unapproveIgnored, errors, dryRun,
    });

    return {
      ok: errors === 0,
      message,
      details: {
        approved, corrected, backfilled, approvalRejected, skipped, alreadySynced,
        notFound, emptyId, duplicateId, unapproveIgnored, errors, dryRun,
      },
    };
  },
};

/**
 * Task: godzinki.writeToSheet
 *
 * Zapisuje pojedynczy rekord zgłoszenia godzinek do Google Sheets.
 * Wywoływany jako zadanie serwisowe po każdym submitGodzinki / purchase.
 */
type WritePayload = {
  recordId: string;
  uid: string;
};

export const godzinkiWriteToSheetTask: ServiceTask<WritePayload> = {
  id: "godzinki.writeToSheet",
  description: "Zapisuje zgłoszenie godzinek (earn/purchase) do zakładki Godzinki w Google Sheets.",

  validate: (payload) => {
    if (!payload?.recordId) throw new Error("Missing recordId");
    if (!payload?.uid) throw new Error("Missing uid");
  },

  run: async (payload, ctx: ServiceTaskContext) => {
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
    const nameCache = new Map<string, {firstName: string; lastName: string}>();
    const {firstName, lastName} = await readUserName(ctx.firestore, payload.uid, nameCache);

    const rowPatch = buildLedgerRowPatch({
      recordId: payload.recordId,
      uid: payload.uid,
      data,
      firstName,
      lastName,
    });

    const sheets = new GoogleSheetsProvider(delegated);

    try {
      // "Zatwierdzone" tylko przy tworzeniu wiersza — retry joba po częściowej
      // awarii nie może cofnąć TAK wpisanego w międzyczasie przez admina.
      const result = await sheets.upsertMemberRowById({spreadsheetId, tabName}, rowPatch, {createOnlyColumns: ["Zatwierdzone"], looseHeaders: true});

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
