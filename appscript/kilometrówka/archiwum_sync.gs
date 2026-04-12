/**
 * File: archiwum_sync.gs
 * Purpose: manual import of archiwum_kilometrówka sheet rows → Firestore km_logs
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Sheet columns (archiwum_kilometrówka):
 *   trip_id, rok, data_raw, miejsce, miejsce_raw, opis, lat, lng,
 *   typ_lokalizacji, kraj, ksywa, imię, nazwisko, email, km
 *   [+ firestore_id added by this script if not present]
 *
 * Rules:
 * - Only rows without firestore_id are imported (idempotent)
 * - sourceType = "historical", isPartial = true
 * - Scoring: pointsTotal = km only (no hours/difficulty/capsizeRolls in archive)
 * - uid matched by email in users_active; unmatched → "historical_unmatched"
 * - lat/lng copied from sheet columns (coordinates already in archive)
 * - Date approximated: "{rok}-01-01" (data_raw is a text description, not a real date)
 * - Commits in batches of 200 (well within Firestore 500 limit)
 */

var ARCHIWUM_REQUIRED_HEADERS = [
  "trip_id", "rok", "data_raw", "miejsce", "km", "lat", "lng",
  "typ_lokalizacji", "kraj", "ksywa", "email",
];

// Maps typ_lokalizacji (from sheet) → waterType (Firestore enum)
var WATER_TYPE_MAP = {
  "rzeka": "lowlands",
  "rzeki": "lowlands",
  "jezioro": "lowlands",
  "jeziora": "lowlands",
  "zbiornik": "lowlands",
  "morze": "sea",
  "morski": "sea",
  "zatoka": "sea",
  "gorska": "mountains",
  "górska": "mountains",
  "gory": "mountains",
  "góry": "mountains",
  "tatry": "mountains",
  "bieszczady": "mountains",
  "beskidy": "mountains",
  "basen": "pool",
  "tor": "track",
};

function syncArchivumToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const ss = SpreadsheetApp.openById(CONFIG.KM_SHEET_ID);
  const sheet = ss.getSheetByName(TAB_ARCHIWUM);
  if (!sheet) {
    throw new Error('Brak zakładki "' + TAB_ARCHIWUM + '"');
  }

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    SpreadsheetApp.getUi().alert("Arkusz archiwum jest pusty.");
    return;
  }

  const headers = values[0].map(function(h) { return normalizeHeader_(h); });

  // Upewnij się że kolumna firestore_id istnieje
  var firestoreIdCol = headers.indexOf("firestore_id");
  if (firestoreIdCol === -1) {
    const lastCol = headers.length + 1;
    sheet.getRange(1, lastCol).setValue("firestore_id");
    headers.push("firestore_id");
    firestoreIdCol = headers.length - 1;
  }

  const idx = function(name) { return headers.indexOf(name); };

  // Sprawdź wymagane kolumny
  const missing = ARCHIWUM_REQUIRED_HEADERS.filter(function(h) { return idx(h) === -1; });
  if (missing.length) {
    throw new Error(
      "Archiwum sheet headers mismatch. Missing: " +
      JSON.stringify(missing) +
      " Found: " + JSON.stringify(headers)
    );
  }

  SpreadsheetApp.getActiveSpreadsheet().toast("Ładowanie użytkowników z Firestore...", "Import archiwum", 30);

  // Buduj lookup uid po emailu (jednorazowy - ładuje wszystkich users_active z Firestore)
  const emailToUid = buildEmailToUidMap_();
  SpreadsheetApp.getActiveSpreadsheet().toast("Użytkownicy załadowani (" + Object.keys(emailToUid).length + "). Rozpoczynam import wierszy...", "Import archiwum", 30);

  // Historyczne wpisy mają 0 punktów — archiwum nie zawiera danych o wywrotkach

  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Przetwarzaj partiami po 200
  const BATCH_SIZE = 200;
  let batch = [];
  // Zapamiętaj komórki do uzupełnienia firestore_id: [{row, id}]
  const idUpdates = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function(c) { return String(c || "").trim() === ""; })) continue;

    // Pomiń już zaimportowane
    const existingId = toStringOrEmpty_(idx("firestore_id") !== -1 ? row[firestoreIdCol] : "");
    if (existingId) {
      skippedCount++;
      continue;
    }

    try {
      const tripId = toStringOrEmpty_(row[idx("trip_id")]);
      const rok = toNumberOrNull_(row[idx("rok")]);
      const dataRaw = toStringOrEmpty_(row[idx("data_raw")]);
      const miejsce = toStringOrEmpty_(row[idx("miejsce")]);
      const miejsceRaw = idx("miejsce_raw") !== -1 ? toStringOrEmpty_(row[idx("miejsce_raw")]) : miejsce;
      const opis = idx("opis") !== -1 ? toStringOrEmpty_(row[idx("opis")]) : "";
      const lat = toNumberOrNull_(row[idx("lat")]);
      const lng = toNumberOrNull_(row[idx("lng")]);
      const typLokalizacji = toStringOrEmpty_(row[idx("typ_lokalizacji")]).toLowerCase();
      const kraj = toStringOrEmpty_(row[idx("kraj")]);
      const ksywa = idx("ksywa") !== -1 ? toStringOrEmpty_(row[idx("ksywa")]) : "";
      const imie = idx("imie") !== -1 ? toStringOrEmpty_(row[idx("imie")]) : "";
      const nazwisko = idx("nazwisko") !== -1 ? toStringOrEmpty_(row[idx("nazwisko")]) : "";
      const email = toStringOrEmpty_(row[idx("email")]).toLowerCase();
      const km = toNumberOrNull_(row[idx("km")]);

      if (!km || km <= 0) continue; // pomiń wiersze bez km

      const year = rok ? Math.round(rok) : 0;
      const date = year > 0 ? (year + "-01-01") : "2000-01-01";

      // Mapuj waterType
      const waterType = resolveWaterType_(typLokalizacji);

      // Lookup uid — jeśli email nie pasuje do users_active, tworzymy wirtualny uid per osoba
      // Dzięki temu każdy historyczny uczestnik ma własny rekord w km_user_stats i widoczny w rankingu
      const uid = emailToUid[email] || (email ? "hist_" + email : "historical_unmatched");

      // Punkty: 0 — archiwum nie zawiera danych o wywrotkach
      const pointsTotal = 0;

      // Unikalne ID dokumentu oparte na trip_id
      const docId = "hist_" + (tripId || (r + "_" + Date.now()));

      const doc = {
        logId: docId,
        sourceType: "historical",
        schemaVersion: 1,
        isPartial: true,
        uid: uid,
        userSnapshot: {
          displayName: ((imie + " " + nazwisko).trim()) || ksywa || email,
          nickname: ksywa,
          email: email,
        },
        date: date,
        year: year,
        seasonKey: String(year),
        waterType: waterType,
        placeName: miejsce || miejsceRaw || "nieznane",
        placeNameRaw: miejsceRaw || miejsce || "nieznane",
        km: km,
        capsizeRolls: { kabina: 0, rolka: 0, dziubek: 0 },
        pointsTotal: pointsTotal,
        pointsBreakdown: { capsizeRolls: 0 },
        scoringVersion: "v1-historical",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawImported: {
          trip_id: tripId,
          data_raw: dataRaw,
          opis: opis,
          lat: lat,
          lng: lng,
          miejsce_raw: miejsceRaw,
          kraj: kraj,
          typ_lokalizacji: typLokalizacji,
        },
      };

      // Dodaj lat/lng na poziomie dokumentu (denormalizowane dla mapy)
      if (lat !== null && isFinite(lat)) doc.lat = lat;
      if (lng !== null && isFinite(lng)) doc.lng = lng;
      if (kraj) doc.country = kraj;

      batch.push({ docPath: COLLECTION_KM_LOGS + "/" + docId, data: doc });
      idUpdates.push({ row: r + 1, id: docId, col: firestoreIdCol + 1 });

      if (batch.length >= BATCH_SIZE) {
        firestoreCommitDocuments_(batch);
        writeIdsToCells_(sheet, idUpdates.slice(importedCount, importedCount + batch.length));
        importedCount += batch.length;
        batch = [];
        SpreadsheetApp.getActiveSpreadsheet().toast(
          "Zaimportowano " + importedCount + " wierszy, pominięto " + skippedCount + "...",
          "Import archiwum",
          15
        );
      }
    } catch (e) {
      errorCount++;
      errors.push("Wiersz " + (r + 1) + ": " + String(e.message || e));
    }
  }

  // Ostatnia partia
  if (batch.length > 0) {
    firestoreCommitDocuments_(batch);
    writeIdsToCells_(sheet, idUpdates.slice(importedCount));
    importedCount += batch.length;
  }

  const durMs = new Date().getTime() - started.getTime();

  // Zawsze enqueue rebuild rankingu — nawet jeśli importedCount === 0 (idempotentne)
  var rebuildQueued = false;
  try {
    enqueueServiceJob_("km.rebuildRankings", {});
    rebuildQueued = true;
  } catch (e) {
    // Nie blokuj komunikatu — zaloguj tylko błąd
    Logger.log("Błąd enqueue km.rebuildRankings: " + String(e.message || e));
  }

  let msg =
    "ARCHIWUM IMPORT " + (errorCount === 0 ? "OK ✅" : "Z BŁĘDAMI ⚠️") + "\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "zaimportowano: " + importedCount + "\n" +
    "pominięto (już w Firestore): " + skippedCount + "\n" +
    "błędy: " + errorCount + "\n" +
    "czas: " + durMs + " ms\n" +
    "przeliczenie rankingu: " + (rebuildQueued ? "zakolejkowane ✅" : "błąd kolejkowania ⚠️");

  if (errors.length) {
    msg += "\n\nBłędy:\n" + errors.slice(0, 10).join("\n");
    if (errors.length > 10) msg += "\n... +" + (errors.length - 10) + " kolejnych";
  }

  SpreadsheetApp.getUi().alert(msg);
}

function writeIdsToCells_(sheet, updates) {
  for (let i = 0; i < updates.length; i++) {
    sheet.getRange(updates[i].row, updates[i].col).setValue(updates[i].id);
  }
}

/**
 * Ładuje mapę email → uid z kolekcji users_active.
 * Używa runQuery bez filtra (pobiera wszystkich).
 * Dla dużych baz (>1000 users) może wymagać paginacji — SKK ma <200 members, ok.
 */
function buildEmailToUidMap_() {
  const results = firestoreRunQuery_({
    from: [{ collectionId: "users_active" }],
    select: {
      fields: [
        { fieldPath: "email" },
      ],
    },
    limit: 1000,
  });

  const map = {};
  for (let i = 0; i < results.length; i++) {
    const data = firestoreFieldsToJs_(results[i].fields);
    const email = String(data.email || "").toLowerCase();
    if (email) map[email] = results[i].docId;
  }
  return map;
}

/**
 * Mapuje typ_lokalizacji z arkusza (lowercase) → waterType (Firestore enum).
 * Sprawdza każde słowo klucz w tekście lokalizacji.
 */
function resolveWaterType_(typLokalizacji) {
  if (!typLokalizacji) return "lowlands";

  const keys = Object.keys(WATER_TYPE_MAP);
  for (let i = 0; i < keys.length; i++) {
    if (typLokalizacji.indexOf(keys[i]) !== -1) {
      return WATER_TYPE_MAP[keys[i]];
    }
  }

  return "lowlands"; // domyślnie
}
