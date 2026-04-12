/**
 * File: ranking_sync.gs
 * Purpose:
 *   syncRankingFromFirestore() — pulls new runtime km_logs entries → appends to ranking sheet
 *   pushRankingCorrections()   — rows marked KOREKTA in sheet → PATCH to Firestore km_logs
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Ranking sheet columns (created on first sync if empty):
 *   logId | uid | ksywa | email | data | rok | miejsce | lat | lng | km | godziny | typ_wody |
 *   skala | trudnosc | kabina | rolka | dziubek | punkty | uwagi | dataZapisu | status_korekty
 *
 * status_korekty: "" = ok, "KOREKTA" = admin chce przesłać zmiany do Firestore
 */

var RANKING_HEADERS = [
  "logId", "uid", "ksywa", "email", "data", "rok", "miejsce", "lat", "lng",
  "km", "godziny", "typ_wody", "skala", "trudnosc", "kabina", "rolka", "dziubek",
  "punkty", "uwagi", "dataZapisu", "status_korekty",
];

// Pola które admin może korygować (używane w pushRankingCorrections)
var CORRECTABLE_FIELDS = ["km", "godziny", "trudnosc", "kabina", "rolka", "dziubek", "uwagi"];

// Mapowanie nagłówka sheet → pole Firestore (dla korekty)
var HEADER_TO_FIRESTORE = {
  "km": "km",
  "godziny": "hoursOnWater",
  "trudnosc": "difficulty",
  "kabina": "capsizeRolls.kabina",
  "rolka": "capsizeRolls.rolka",
  "dziubek": "capsizeRolls.dziubek",
  "uwagi": "note",
};

// ====== SYNC: Firestore → Sheet ======

function syncRankingFromFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const ss = SpreadsheetApp.openById(CONFIG.KM_SHEET_ID);
  let sheet = ss.getSheetByName(TAB_RANKING);

  // Stwórz zakładkę z nagłówkami jeśli nie istnieje
  if (!sheet) {
    sheet = ss.insertSheet(TAB_RANKING);
    sheet.getRange(1, 1, 1, RANKING_HEADERS.length).setValues([RANKING_HEADERS]);
    sheet.setFrozenRows(1);
  }

  // Upewnij się że nagłówki są zawsze na pierwszym wierszu
  const firstRow = sheet.getRange(1, 1, 1, RANKING_HEADERS.length).getValues()[0];
  if (!firstRow[0] || normalizeHeader_(firstRow[0]) !== "logid") {
    sheet.getRange(1, 1, 1, RANKING_HEADERS.length).setValues([RANKING_HEADERS]);
    sheet.setFrozenRows(1);
  }

  const existingValues = sheet.getDataRange().getValues();

  // Zbierz już istniejące logId (kolumna A = logId)
  const existingLogIds = {};
  for (let r = 1; r < existingValues.length; r++) {
    const id = toStringOrEmpty_(existingValues[r][0]);
    if (id) existingLogIds[id] = true;
  }

  // Pobierz runtime wpisy z Firestore km_logs
  const results = firestoreRunQuery_({
    from: [{ collectionId: COLLECTION_KM_LOGS }],
    where: {
      fieldFilter: {
        field: { fieldPath: "sourceType" },
        op: "EQUAL",
        value: { stringValue: "runtime" },
      },
    },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit: 500,
  });

  const newRows = [];
  for (let i = 0; i < results.length; i++) {
    const data = firestoreFieldsToJs_(results[i].fields);
    const logId = toStringOrEmpty_(data.logId || results[i].docId);
    if (existingLogIds[logId]) continue;

    const capsizeRolls = data.capsizeRolls || {};
    const userSnapshot = data.userSnapshot || {};
    const rok = data.year || (data.date ? parseInt(String(data.date).slice(0, 4)) : "");

    newRows.push([
      logId,
      toStringOrEmpty_(data.uid),
      toStringOrEmpty_(userSnapshot.nickname),
      toStringOrEmpty_(userSnapshot.email),
      toStringOrEmpty_(data.date),
      rok,
      toStringOrEmpty_(data.placeName),
      data.lat != null ? data.lat : "",
      data.lng != null ? data.lng : "",
      data.km != null ? data.km : "",
      data.hoursOnWater != null ? data.hoursOnWater : "",
      toStringOrEmpty_(data.waterType),
      toStringOrEmpty_(data.difficultyScale),
      toStringOrEmpty_(data.difficulty),
      capsizeRolls.kabina != null ? capsizeRolls.kabina : 0,
      capsizeRolls.rolka != null ? capsizeRolls.rolka : 0,
      capsizeRolls.dziubek != null ? capsizeRolls.dziubek : 0,
      data.pointsTotal != null ? data.pointsTotal : "",
      toStringOrEmpty_(data.note),
      toStringOrEmpty_(data.createdAt),
      "", // status_korekty — puste
    ]);
  }

  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, RANKING_HEADERS.length).setValues(newRows);
  }

  const durMs = new Date().getTime() - started.getTime();

  SpreadsheetApp.getUi().alert(
    "RANKING SYNC OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "nowych wpisów dopisano: " + newRows.length + "\n" +
    "pominięto (już w arkuszu): " + (results.length - newRows.length) + "\n" +
    "czas: " + durMs + " ms"
  );
}

// ====== PUSH CORRECTIONS: Sheet → Firestore ======

function pushRankingCorrections() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const ss = SpreadsheetApp.openById(CONFIG.KM_SHEET_ID);
  const sheet = ss.getSheetByName(TAB_RANKING);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Brak zakładki ranking. Najpierw uruchom: Pobierz nowe wpisy.");
    return;
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    SpreadsheetApp.getUi().alert("Brak wierszy do korekty.");
    return;
  }

  const headers = values[0].map(function(h) { return normalizeHeader_(h); });
  const idx = function(name) { return headers.indexOf(name); };

  const logIdCol = idx("logid");
  const uidCol = idx("uid");
  const statusCol = idx("status_korekty");

  if (logIdCol === -1 || statusCol === -1) {
    throw new Error("Ranking sheet ma nieprawidłowe nagłówki. Wymagane: logId, status_korekty");
  }

  let patchedCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const statusRaw = toStringOrEmpty_(row[statusCol]).toUpperCase();
    if (statusRaw !== "KOREKTA") continue;

    const logId = toStringOrEmpty_(row[logIdCol]);
    if (!logId) continue;

    try {
      // Zbuduj mapę zmian tylko dla pól korygowanych
      const changedMap = {};

      for (let i = 0; i < CORRECTABLE_FIELDS.length; i++) {
        const header = CORRECTABLE_FIELDS[i];
        const colIdx = idx(header);
        if (colIdx === -1) continue;

        const firestorePath = HEADER_TO_FIRESTORE[header];
        if (!firestorePath) continue;

        const cellVal = row[colIdx];

        // Dla pól liczbowych
        if (header === "km" || header === "godziny" || header === "kabina" ||
            header === "rolka" || header === "dziubek") {
          const num = toNumberOrNull_(cellVal);
          if (num !== null) changedMap[firestorePath] = num;
        } else {
          changedMap[firestorePath] = toStringOrEmpty_(cellVal);
        }
      }

      changedMap["updatedAt"] = new Date().toISOString();
      changedMap["sheetCorrectedAt"] = new Date().toISOString();
      changedMap["sheetCorrectedBy"] = who;

      firestorePatchDocumentFields_(COLLECTION_KM_LOGS, logId, changedMap);

      // Wyczyść status_korekty i zapisz datę korekty
      sheet.getRange(r + 1, statusCol + 1).setValue("POPRAWIONO " + new Date().toLocaleDateString("pl-PL"));

      // Enqueue rebuild stats dla uid
      const uid = uidCol !== -1 ? toStringOrEmpty_(row[uidCol]) : "";
      if (uid && uid !== "historical_unmatched") {
        enqueueServiceJob_("km.rebuildUserStats", { uid: uid });
      }

      patchedCount++;
    } catch (e) {
      errorCount++;
      errors.push("logId=" + logId + " (wiersz " + (r + 1) + "): " + String(e.message || e));
    }
  }

  const durMs = new Date().getTime() - started.getTime();

  let msg =
    "KOREKTY WYSŁANE " + (errorCount === 0 ? "OK ✅" : "Z BŁĘDAMI ⚠️") + "\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "zaktualizowanych wpisów: " + patchedCount + "\n" +
    "błędy: " + errorCount + "\n" +
    "czas: " + durMs + " ms";

  if (errors.length) {
    msg += "\n\nBłędy:\n" + errors.slice(0, 10).join("\n");
  }

  SpreadsheetApp.getUi().alert(msg);
}
