/**
 * File: events_sync.gs
 * Purpose: manual events sync from Google Sheets to Firestore
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

function syncEventsToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const context = readEventsForSync_();
  const rows = context.rows;
  const sheet = context.sheet;

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let markedSyncedCount = 0;
  let generatedIdCount = 0;
  const changedSummaries = [];

  for (let i = 0; i < rows.length; i++) {
    const rowItem = rows[i];

    if (rowItem.needsId) {
      const newId = Utilities.getUuid();
      sheet.getRange(rowItem.sheetRowNumber, rowItem.idColNumber).setValue(newId);
      rowItem.docId = newId;
      rowItem.needsId = false;
      generatedIdCount++;
    }

    const existingRaw = firestoreGetDocument_(COLLECTION_EVENTS + "/" + rowItem.docId);

    if (!existingRaw || !existingRaw.fields) {
      const nowIso = new Date().toISOString();
      const createData = {
        id: rowItem.docId,
        name: rowItem.data.name,
        startDate: rowItem.data.startDate,
        endDate: rowItem.data.endDate,
        location: rowItem.data.location,
        description: rowItem.data.description,
        contact: rowItem.data.contact,
        link: rowItem.data.link,
        approved: rowItem.data.approved,
        ranking: rowItem.data.ranking,
        kursowa: rowItem.data.kursowa,
        source: "sheet",
        userUid: "",
        userEmail: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        sheetRowNumber: rowItem.sheetRowNumber,
        sheetSyncedAt: nowIso,
      };

      firestorePatchDocument_(COLLECTION_EVENTS + "/" + rowItem.docId, createData);
      markEventRowSynced_(sheet, rowItem.syncCol, rowItem.sheetRowNumber);

      createdCount++;
      markedSyncedCount++;
      changedSummaries.push("eventId=" + rowItem.docId + " → created");
      continue;
    }

    const existing = firestoreFieldsToJs_(existingRaw.fields || {});
    const diff = buildEventDiff_(rowItem.data, existing, rowItem.sheetRowNumber, who);
    const changedPaths = Object.keys(diff);

    if (!changedPaths.length) {
      unchangedCount++;
      if (!isTruthySheetSyncedFlag_(sheet, rowItem.syncCol, rowItem.sheetRowNumber)) {
        markEventRowSynced_(sheet, rowItem.syncCol, rowItem.sheetRowNumber);
        markedSyncedCount++;
      }
      continue;
    }

    patchFirestoreDocumentFieldsForEvents_(COLLECTION_EVENTS, rowItem.docId, diff);
    markEventRowSynced_(sheet, rowItem.syncCol, rowItem.sheetRowNumber);

    updatedCount++;
    markedSyncedCount++;
    changedSummaries.push(
      "eventId=" + rowItem.docId + " → " + changedPaths.join(", ")
    );
  }

  const durMs = new Date().getTime() - started.getTime();

  let msg =
    "EVENTS SYNC OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "rows read: " + rows.length + "\n" +
    "auto-generated IDs: " + generatedIdCount + "\n" +
    "created: " + createdCount + "\n" +
    "updated: " + updatedCount + "\n" +
    "unchanged: " + unchangedCount + "\n" +
    "sheet marked synced: " + markedSyncedCount + "\n" +
    "time: " + durMs + " ms";

  if (changedSummaries.length) {
    msg +=
      "\n\nZmienione rekordy:\n" +
      changedSummaries.slice(0, 20).join("\n");
    if (changedSummaries.length > 20) {
      msg += "\n... +" + (changedSummaries.length - 20) + " kolejnych";
    }
  }

  if (createdCount > 0 || updatedCount > 0) {
    try {
      enqueueServiceJob_("events.syncCalendar", {});
      msg += "\n\n📅 Kolejkuję synchronizację z Google Calendar...";
    } catch (e) {
      msg += "\n\n⚠️ Nie udało się zakolejkować syncu kalendarza: " + e.message;
    }
  }

  SpreadsheetApp.getUi().alert(msg);
}

function readEventsForSync_() {
  const ss = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_EVENTS);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_EVENTS + '"');
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
    "data_rozpoczecia",
    "data_zakonczenia",
    "nazwa_imprezy",
    "miejsce",
    "opis",
    "kontakt",
    "link_do_strony_zgloszen",
    "zatwierdzona",
    "zsynchronizowano",
    "ranking",
    "kursowa",
  ];

  const missing = required.filter(function(name) {
    return idx(name) === -1;
  });

  if (missing.length) {
    throw new Error(
      "Events sheet headers mismatch. Missing: " +
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

    out.push({
      docId: docId || null,
      needsId: !docId,
      idColNumber: idx("id") + 1,
      sheetRowNumber: r + 1,
      syncCol: idx("zsynchronizowano") + 1,
      data: {
        name: normalizeStringForEvents_(row[idx("nazwa_imprezy")]),
        startDate: normalizeSheetDateToYmd_(row[idx("data_rozpoczecia")]),
        endDate: normalizeSheetDateToYmd_(row[idx("data_zakonczenia")]),
        location: normalizeStringForEvents_(row[idx("miejsce")]),
        description: normalizeStringForEvents_(row[idx("opis")]),
        contact: normalizeStringForEvents_(row[idx("kontakt")]),
        link: normalizeStringForEvents_(row[idx("link_do_strony_zgloszen")]),
        approved: normalizeBoolish_(row[idx("zatwierdzona")]),
        ranking: normalizeBoolish_(row[idx("ranking")]),
        kursowa: normalizeBoolish_(row[idx("kursowa")]),
      },
    });
  }

  return { sheet: sh, rows: out };
}

function buildEventDiff_(sheetEvent, firestoreEvent, sheetRowNumber, who) {
  const diff = {};

  addChangedPathIfNeededForEvents_(diff, "name", sheetEvent.name, firestoreEvent.name);
  addChangedPathIfNeededForEvents_(diff, "startDate", sheetEvent.startDate, firestoreEvent.startDate);
  addChangedPathIfNeededForEvents_(diff, "endDate", sheetEvent.endDate, firestoreEvent.endDate);
  addChangedPathIfNeededForEvents_(diff, "location", sheetEvent.location, firestoreEvent.location);
  addChangedPathIfNeededForEvents_(diff, "description", sheetEvent.description, firestoreEvent.description);
  addChangedPathIfNeededForEvents_(diff, "contact", sheetEvent.contact, firestoreEvent.contact);
  addChangedPathIfNeededForEvents_(diff, "link", sheetEvent.link, firestoreEvent.link);
  addChangedPathIfNeededForEvents_(diff, "approved", sheetEvent.approved, firestoreEvent.approved);
  addChangedPathIfNeededForEvents_(diff, "ranking", sheetEvent.ranking, firestoreEvent.ranking);
  addChangedPathIfNeededForEvents_(diff, "kursowa", sheetEvent.kursowa, firestoreEvent.kursowa);
  addChangedPathIfNeededForEvents_(diff, "source", "sheet", firestoreEvent.source);
  addChangedPathIfNeededForEvents_(diff, "id", firestoreEvent.id || "", sheetEvent.id || firestoreEvent.id);

  if (normalizeComparableForEvents_(firestoreEvent.userUid) !== "") {
    diff.userUid = "";
  }

  if (normalizeComparableForEvents_(firestoreEvent.userEmail) !== "") {
    diff.userEmail = "";
  }

  addChangedPathIfNeededForEvents_(
    diff,
    "sheetRowNumber",
    sheetRowNumber,
    firestoreEvent.sheetRowNumber
  );

  diff.sheetSyncedAt = new Date().toISOString();
  diff.updatedAt = new Date().toISOString();
  diff.updatedBy = who;

  return diff;
}

function addChangedPathIfNeededForEvents_(diff, path, nextValue, currentValue) {
  if (!valuesEqualForEventsSync_(nextValue, currentValue)) {
    diff[path] = nextValue;
  }
}

function valuesEqualForEventsSync_(a, b) {
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b);
  }

  if (typeof a === "number" || typeof b === "number") {
    const aNum = Number(a);
    const bNum = Number(b);
    if (isFinite(aNum) && isFinite(bNum)) return aNum === bNum;
  }

  return normalizeComparableForEvents_(a) === normalizeComparableForEvents_(b);
}

function normalizeComparableForEvents_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function patchFirestoreDocumentFieldsForEvents_(collectionName, docId, changedMap) {
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

function markEventRowSynced_(sheet, colNumber, rowNumber) {
  sheet.getRange(rowNumber, colNumber).setValue("TAK");
}

function isTruthySheetSyncedFlag_(sheet, colNumber, rowNumber) {
  const value = sheet.getRange(rowNumber, colNumber).getValue();
  return normalizeBoolish_(value) || String(value || "").trim().toLowerCase() === "tak";
}

function normalizeSheetDateToYmd_(value) {
  if (value === null || value === undefined || value === "") return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return String(value).trim();
}

function normalizeStringForEvents_(value) {
  return String(value == null ? "" : value).trim();
}