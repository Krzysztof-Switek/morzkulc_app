/**
 * File: hours_sync.gs
 * Purpose: manual hours sync from Google Sheets to Firestore
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

function syncHoursToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const context = readHoursForSync_();
  const rows = context.rows;
  const sheet = context.sheet;

  let foundCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let markedSyncedCount = 0;
  const missingDocs = [];
  const changedSummaries = [];

  for (let i = 0; i < rows.length; i++) {
    const rowItem = rows[i];
    const existingRaw = firestoreGetDocument_(COLLECTION_HOURS_LEDGER + "/" + rowItem.docId);

    if (!existingRaw || !existingRaw.fields) {
      missingDocs.push(rowItem.docId);
      continue;
    }

    foundCount++;

    const existing = firestoreFieldsToJs_(existingRaw.fields || {});
    const diff = buildHoursDiff_(rowItem.data, existing, rowItem.sheetRowNumber, who);
    const changedPaths = Object.keys(diff);

    if (!changedPaths.length) {
      unchangedCount++;
      if (!isTruthyHoursSheetSyncedFlag_(sheet, rowItem.syncCol, rowItem.sheetRowNumber)) {
        markHoursRowSynced_(sheet, rowItem.syncCol, rowItem.sheetRowNumber);
        markedSyncedCount++;
      }
      continue;
    }

    patchFirestoreDocumentFieldsForHours_(COLLECTION_HOURS_LEDGER, rowItem.docId, diff);
    markHoursRowSynced_(sheet, rowItem.syncCol, rowItem.sheetRowNumber);

    updatedCount++;
    markedSyncedCount++;
    changedSummaries.push(
      "ledgerId=" + rowItem.docId + " → " + changedPaths.join(", ")
    );
  }

  const durMs = new Date().getTime() - started.getTime();

  let msg =
    "HOURS SYNC OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "rows read: " + rows.length + "\n" +
    "docs found: " + foundCount + "\n" +
    "updated: " + updatedCount + "\n" +
    "unchanged: " + unchangedCount + "\n" +
    "sheet marked synced: " + markedSyncedCount + "\n" +
    "time: " + durMs + " ms";

  if (missingDocs.length) {
    msg +=
      "\n\nNie znaleziono dokumentów w " +
      COLLECTION_HOURS_LEDGER +
      ":\n" +
      missingDocs.join(", ");
  }

  if (changedSummaries.length) {
    msg +=
      "\n\nZmienione rekordy:\n" +
      changedSummaries.slice(0, 20).join("\n");
    if (changedSummaries.length > 20) {
      msg += "\n... +" + (changedSummaries.length - 20) + " kolejnych";
    }
  }

  SpreadsheetApp.getUi().alert(msg);
}

function readHoursForSync_() {
  const ss = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_HOURS);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_HOURS + '"');
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) {
    return { sheet: sh, rows: [] };
  }

  const headers = values[0].map((h) => normalizeHeader_(h));
  const idx = function(name) {
    return headers.indexOf(name);
  };

  const required = [
    "id",
    "godzinki",
    "zatwierdzone",
    "zsynchronizowano",
  ];

  const missing = required.filter(function(name) {
    return idx(name) === -1;
  });

  if (missing.length) {
    throw new Error(
      "Hours sheet headers mismatch. Missing: " +
        JSON.stringify(missing) +
        " Found: " +
        JSON.stringify(headers)
    );
  }

  const out = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every((c) => String(c || "").trim() === "")) continue;

    const docId = toStringOrEmpty_(row[idx("id")]);
    if (!docId) continue;

    const amount = toNumberOrNull_(row[idx("godzinki")]);
    if (amount === null) {
      throw new Error(
        'Nieprawidłowa wartość "Godzinki" w wierszu ' +
          (r + 1) +
          ': "' +
          row[idx("godzinki")] +
          '"'
      );
    }

    out.push({
      docId: docId,
      sheetRowNumber: r + 1,
      syncCol: idx("zsynchronizowano") + 1,
      data: {
        amount: amount,
        approved: normalizeBoolish_(row[idx("zatwierdzone")]),
      },
    });
  }

  return { sheet: sh, rows: out };
}

function buildHoursDiff_(sheetHours, firestoreHours, sheetRowNumber, who) {
  const diff = {};

  addChangedPathIfNeededForHours_(diff, "amount", sheetHours.amount, firestoreHours.amount);
  addChangedPathIfNeededForHours_(diff, "sheetRowNumber", sheetRowNumber, firestoreHours.sheetRowNumber);

  // Zatwierdzenie jest jednokierunkowe — można zatwierdzić (false→true), ale nie cofnąć.
  if (!firestoreHours.approved) {
    addChangedPathIfNeededForHours_(diff, "approved", sheetHours.approved, firestoreHours.approved);
    if (sheetHours.approved) {
      diff.approvedAt = new Date().toISOString();
      diff.approvedBy = who;
    }
  }

  diff.sheetSyncedAt = new Date().toISOString();
  diff.updatedAt = new Date().toISOString();

  return diff;
}

function addChangedPathIfNeededForHours_(diff, path, nextValue, currentValue) {
  if (!valuesEqualForHoursSync_(nextValue, currentValue)) {
    diff[path] = nextValue;
  }
}

function valuesEqualForHoursSync_(a, b) {
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b);
  }

  const aNum = Number(a);
  const bNum = Number(b);
  if (isFinite(aNum) && isFinite(bNum)) {
    return aNum === bNum;
  }

  return normalizeComparableForHours_(a) === normalizeComparableForHours_(b);
}

function normalizeComparableForHours_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function patchFirestoreDocumentFieldsForHours_(collectionName, docId, changedMap) {
  const nestedData = {};
  const fieldPaths = Object.keys(changedMap);

  for (let i = 0; i < fieldPaths.length; i++) {
    setPathValue_(nestedData, fieldPaths[i], changedMap[fieldPaths[i]]);
  }

  const query = fieldPaths
    .map(function(path) {
      return "updateMask.fieldPaths=" + encodeURIComponent(path);
    })
    .join("&");

  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" +
    collectionName +
    "/" +
    encodeURIComponent(docId) +
    "?" +
    query;

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: JSON.stringify({
      fields: toFirestoreFields_(nestedData),
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(
      "Firestore partial PATCH failed (" +
        code +
        ") for " +
        collectionName +
        "/" +
        docId +
        ": " +
        text
    );
  }

  return text;
}

function markHoursRowSynced_(sheet, colNumber, rowNumber) {
  sheet.getRange(rowNumber, colNumber).setValue("TAK");
}

function isTruthyHoursSheetSyncedFlag_(sheet, colNumber, rowNumber) {
  const value = sheet.getRange(rowNumber, colNumber).getValue();
  return normalizeBoolish_(value) || String(value || "").trim().toLowerCase() === "tak";
}