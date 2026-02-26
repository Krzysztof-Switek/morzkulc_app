/********************************************************************
 * 68_users_OB_manual_sync.js
 * OPENING BALANCE 26 — PROSTY IMPORT 1:1 (MANUAL)
 *
 * ZASADY:
 * 1) ZAWSZE czyścimy kolekcję przed importem
 * 2) Kolumny z Google Sheets → pola w Firestore 1:1 (bez dodatków)
 * 3) Nazwa kolumny = nazwa pola w Firestore (bez mapowania/normowania)
 * 4) PATCH bez updateMask (Firestore nie akceptuje updateMask dla nazw typu "Szkoleniówka")
 * 5) docId = wartość z kolumny "ID" (bez prefiksów)
 *
 * Uruchamiasz:
 *  - openingBalance26_run()
 ********************************************************************/

function _ob26_headerExact_(h) {
  return String(h || "").trim();
}

function _ob26_docIdFromRow_(obj, rowIndex1based) {
  const idRaw = obj["ID"];
  const id = String(idRaw === null || idRaw === undefined ? "" : idRaw).trim();
  if (id) return id;
  return "row_" + rowIndex1based;
}

function _ob26_loadRows_() {
  const ss = SpreadsheetApp.openById(USERS_ARCHIVE_SPREADSHEET_ID);
  const sh = ss.getSheetByName(HISTORY_BALANCE_SHEET_NAME);
  if (!sh) throw new Error("Brak zakładki: " + HISTORY_BALANCE_SHEET_NAME);

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const rawHeaders = values[0];
  const headers = rawHeaders.map(_ob26_headerExact_);

  const out = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      obj[key] = row[j];
    }

    const docId = _ob26_docIdFromRow_(obj, i);
    out.push({ docId: docId, data: obj });
  }

  return out;
}

function _ob26_wipeCollection_() {
  const colPath = USERS_OPENING_BALANCE_COLLECTION;

  Logger.log("Pobieram dokumenty do usunięcia z kolekcji: " + colPath);
  const col = firestoreGetCollection(colPath);
  const docs = (col && col.documents) ? col.documents : [];

  Logger.log("Dokumentów do usunięcia: " + docs.length);

  docs.forEach(d => {
    const name = d.name || "";
    const docId = name.split("/").pop();
    if (!docId) return;
    firestoreDeleteDocument(colPath + "/" + docId);
  });

  Logger.log("Kolekcja wyczyszczona: " + colPath);
}

function _ob26_importAll_() {
  const rows = _ob26_loadRows_();
  Logger.log("Wiersze do importu: " + rows.length);

  let ok = 0;

  rows.forEach((r) => {
    const docId = r.docId;
    const obj = r.data;

    const docPath =
      `${USERS_OPENING_BALANCE_COLLECTION}/${encodeURIComponent(docId)}`;

    firestorePatchDocument(docPath, obj, null);
    ok++;
  });

  Logger.log("Zaimportowano rekordów: " + ok);
}

function openingBalance26_run() {
  Logger.log("=== OPENING BALANCE 26 RUN START (WIPE + SIMPLE 1:1) ===");

  _ob26_wipeCollection_();
  _ob26_importAll_();

  Logger.log("=== OPENING BALANCE 26 RUN END (WIPE + SIMPLE 1:1) ===");
}

function openingBalance26_listSheets() {
  const ss = SpreadsheetApp.openById(USERS_ARCHIVE_SPREADSHEET_ID);
  const names = ss.getSheets().map(s => s.getName());
  Logger.log("Sheets in USERS_ARCHIVE_SPREADSHEET_ID:");
  names.forEach(n => Logger.log(" - [" + n + "]"));
}
