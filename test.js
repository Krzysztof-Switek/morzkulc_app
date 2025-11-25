function testFirestoreDocuments() {
  const projectId = 'sprzet-skk-morzkulc';
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    projectId +
    '/databases/(default)/documents/kayaks';

  // <<< TO JEST KLUCZOWE >>>
  const token = ScriptApp.getOAuthToken();

  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  Logger.log('CODE: ' + response.getResponseCode());
  Logger.log(response.getContentText());
}


function testAuth() {
  const token = ScriptApp.getOAuthToken();
  Logger.log(token);
}

function forceReauth() {
  UrlFetchApp.fetch("https://www.googleapis.com/auth/userinfo.email");
}

/**
 * Odczyt wszystkich kajaków z arkusza → tablica obiektów JS.
 * PRIMARY KEY = ID z kolumny A.
 */
function getKayaksConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(KAYAKS_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + KAYAKS_SHEET_NAME);

  const lastRow = sheet.getLastRow();

  // 16 kolumn (A–P)
  const rows = sheet.getRange(2, 1, lastRow - 1, 16).getValues();

  const kayaks = rows
    .filter(isValidKayakRow)
    .map(rowToKayakObject)
    .filter(k => k !== null);

  Logger.log("Liczba kajaków odczytana z arkusza: " + kayaks.length);
  return kayaks;
}

/**
 * Wiersz jest kajakiem jeśli:
 * - Ma ID
 * - MA numer kajaka LUB jest prywatny (checkbox)
 */
function isValidKayakRow(row) {
  const id = row[KAYAKS_COLUMNS.ID - 1];
  const numerKajaka = row[KAYAKS_COLUMNS.NUMER_KAJAKA - 1];
  const prywatny = row[KAYAKS_COLUMNS.PRYWATNY - 1];

  if (!id) return false;

  if (numerKajaka && numerKajaka.toString().trim() !== "") return true;

  if (prywatny === true) return true;

  return false;
}

/**
 * Mapowanie pojedynczego wiersza arkusza na obiekt kajaka.
 * + DODANO firestoreId
 */
function rowToKayakObject(row) {
  const id          = row[KAYAKS_COLUMNS.ID - 1];
  const numerKajaka = row[KAYAKS_COLUMNS.NUMER_KAJAKA - 1];

  const sprawnyRaw  = row[KAYAKS_COLUMNS.SPRAWNY - 1];
  const basenRaw    = row[KAYAKS_COLUMNS.BASEN - 1];
  const prywatnyRaw = row[KAYAKS_COLUMNS.PRYWATNY - 1];

  const privateAvailableRaw = row[KAYAKS_COLUMNS.PRYWATNY_DO_WYPOZ - 1];
  const privateOwnerEmail   = row[KAYAKS_COLUMNS.KONTAKT_WLASCICIEL - 1];

  /** NOWOŚĆ — deterministyczny Firestore docID */
  let firestoreId = null;

  if (numerKajaka && String(numerKajaka).trim() !== "") {
    firestoreId = String(numerKajaka).trim();
  } else if (prywatnyRaw === true) {
    firestoreId = "P" + id;
  } else {
    firestoreId = "ID" + id;
  }

  return {
    id: id || null,
    numerKajaka: numerKajaka ? String(numerKajaka) : null,
    firestoreId: firestoreId,

    producent: row[KAYAKS_COLUMNS.PRODUCENT - 1] || "",
    model: row[KAYAKS_COLUMNS.MODEL - 1] || "",
    zdjecieUrl: row[KAYAKS_COLUMNS.ZDJECIE - 1] || "",
    kolor: row[KAYAKS_COLUMNS.KOLOR - 1] || "",
    typ: row[KAYAKS_COLUMNS.TYP - 1] || "",
    litrow: row[KAYAKS_COLUMNS.LITROW - 1] || "",
    zakresWag: row[KAYAKS_COLUMNS.ZAKRES_WAG - 1] || "",
    kokpit: row[KAYAKS_COLUMNS.KOKPIT - 1] || "",

    sprawny: sprawnyRaw === 'TAK' || sprawnyRaw === true,
    basen: basenRaw === true,
    prywatny: prywatnyRaw === true,

    privateAvailable: privateAvailableRaw === 'TAK' || privateAvailableRaw === true,
    privateOwnerEmail: privateOwnerEmail || "",

    uwagi: row[KAYAKS_COLUMNS.UWAGI - 1] || "",
  };
}

function debugListFirestoreKayaks() {
  // używamy gotowej funkcji, która ma prawidłowe nagłówki OAuth
  const json = firestoreGetCollection(KAYAKS_COLLECTION);

  // Firestore zwraca tablicę dokumentów w json.documents
  const docs = json.documents || [];

  Logger.log("FIRESTORE KAJAK COUNT = " + docs.length);

  docs.forEach(doc => {
    Logger.log(doc.name);
  });
}

/**
 * Porównuje ID kajaków z Google Sheets i Firestore
 * i wypisuje różnice.
 */
function debugCompareSheetVsFirestore() {
  Logger.log("=== START PORÓWNANIA ===");

  // --- 1. Pobieramy ID z arkusza ---
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(KAYAKS_SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  const header = rows.shift();
  const idxId = header.indexOf("ID");

  const sheetIds = rows
    .map(r => String(r[idxId]).trim())
    .filter(id => id !== "");

  Logger.log("Sheet IDs (" + sheetIds.length + "): " + JSON.stringify(sheetIds));


  // --- 2. Pobieramy ID z Firestore ---
  const fs = firestoreGetCollection(KAYAKS_COLLECTION);
  const docs = fs.documents || [];

  const fsIds = docs.map(d => d.name.split("/").pop());
  Logger.log("Firestore IDs (" + fsIds.length + "): " + JSON.stringify(fsIds));


  // --- 3. Szukamy nadmiarowych dokumentów ---
  const extra = fsIds.filter(id => !sheetIds.includes(id));

  // --- 4. Szukamy brakujących dokumentów ---
  const missing = sheetIds.filter(id => !fsIds.includes(id));

  Logger.log("=== WYNIK ===");
  Logger.log("Nadmiarowe dokumenty w Firestore (nie występują w arkuszu): " + JSON.stringify(extra));
  Logger.log("Brakujące dokumenty w Firestore (są w arkuszu, brak w Firestore): " + JSON.stringify(missing));
}


/**
 * TESTY WIOSEŁ — URUCHAMIA WSZYSTKIE TESTY JEDNYM KLIKNIĘCIEM
 * ---------------------------------------------------------
 * Testy obejmują:
 * 1. Pobieranie listy
 * 2. Wypożyczenie
 * 3. Blokadę wypożyczenia
 * 4. Zwrot
 * 5. Rezerwację
 * 6. Blokadę rezerwacji wypożyczonego sprzętu
 */

function testPaddlesAll() {
  Logger.log("=== TEST WIOSEŁ START ===");

  // ---------------------------------------------------------
  // 1. Pobieranie listy wioseł
  // ---------------------------------------------------------
  try {
    const items = getItemsByType('paddle');
    Logger.log("TEST 1: Pobieranie → OK, liczba: " + items.length);
  } catch (e) {
    Logger.log("TEST 1: ERROR → " + e);
  }

  // ---------------------------------------------------------
  // 2. Test wypożyczenia wiosła (ID = 1)
  // ---------------------------------------------------------
  try {
    const rent = rentItem('paddle', '1', 'TestUserA', '', '');
    Logger.log("TEST 2: Wypożyczenie → " + JSON.stringify(rent));
  } catch (e) {
    Logger.log("TEST 2: ERROR → " + e);
  }

  // ---------------------------------------------------------
  // 3. Próba wypożyczenia zajętego wiosła
  // ---------------------------------------------------------
  try {
    const rent2 = rentItem('paddle', '1', 'TestUserB', '', '');
    Logger.log("TEST 3: Oczekiwany błąd wypożyczenia → " + JSON.stringify(rent2));
  } catch (e) {
    Logger.log("TEST 3: ERROR → " + e);
  }

  // ---------------------------------------------------------
  // 4. Zwrot wiosła
  // ---------------------------------------------------------
  try {
    const ret = returnItem('paddle', '1');
    Logger.log("TEST 4: Zwrot → " + JSON.stringify(ret));
  } catch (e) {
    Logger.log("TEST 4: ERROR → " + e);
  }

  // ---------------------------------------------------------
  // 5. Rezerwacja wiosła (ID = 2)
  // ---------------------------------------------------------
  try {
    const res = reserveItem('paddle', '2', 'UserReserveA', '2025-01-01', '2025-01-02');
    Logger.log("TEST 5: Rezerwacja → " + JSON.stringify(res));
  } catch (e) {
    Logger.log("TEST 5: ERROR → " + e);
  }

  // ---------------------------------------------------------
  // 6. Blokada rezerwacji wypożyczonego wiosła (ID = 3)
  // ---------------------------------------------------------
  try {
    rentItem('paddle', '3', 'UserX', '', '');
    const res2 = reserveItem('paddle', '3', 'UserY', '', '');
    Logger.log("TEST 6: Oczekiwany błąd rezerwacji → " + JSON.stringify(res2));
  } catch (e) {
    Logger.log("TEST 6: ERROR → " + e);
  }

  // ---------------------------------------------------------
  Logger.log("=== TEST WIOSEŁ END ===");
}



