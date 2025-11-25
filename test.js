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

/**
 * TEST KOMPLETNEJ OBSŁUGI KAMIZELEK
 * Jedno kliknięcie sprawdza:
 * - odczyt arkusza
 * - mapowanie rowToLifejacketObject
 * - sync → Firestore
 * - mapLifejacketDocument
 * - rental_core (list/rent/return)
 */
function testLifejacketsFull() {
  Logger.log("=== TEST LIFEJACKETS START ===");

  // 1. ODCZYT ARKUSZA
  Logger.log("1) Pobieram dane z arkusza...");
  const cfg = getLifejacketsConfig();
  if (!cfg || cfg.length === 0) {
    throw new Error("Brak danych w zakładce 'kamizelki'.");
  }
  Logger.log("OK – " + cfg.length + " rekordów z arkusza.");

  // test kilku pól
  const first = cfg[0];
  ["id", "numer", "producent", "model", "kolor", "typ", "rozmiar", "basen", "uwagi"].forEach(k => {
    if (first[k] === undefined) throw new Error("Brak pola " + k + " w obiekcie z arkusza.");
  });
  Logger.log("OK – pola z arkusza poprawne.");

  // 2. SYNC DO FIRESTORE
  Logger.log("2) Sync do Firestore...");
  syncLifejackets();

  // sprawdzenie czy dokument istnieje
  const firstId = first.firestoreId;
  const docPath = LIFEJACKETS_COLLECTION + "/" + encodeURIComponent(firstId);

  if (!firestoreDocumentExists(docPath)) {
    throw new Error("Dokument kamizelki " + firstId + " nie powstał w Firestore.");
  }
  Logger.log("OK – dokument istnieje w Firestore.");

  // 3. POBRANIE Z FIRESTORE → MAPOWANIE
  Logger.log("3) Pobieram kolekcję lifejackets z Firestore...");
  const raw = firestoreGetCollection(LIFEJACKETS_COLLECTION);
  const docs = raw.documents || [];

  if (docs.length === 0) throw new Error("Brak dokumentów w Firestore po syncu!");

  const mapped = docs.map(d => mapLifejacketDocument(d));

  const m0 = mapped.find(m => m.id === String(firstId));
  if (!m0) throw new Error("mapLifejacketDocument nie zwrócił oczekiwanego ID.");

  ["numer", "producent", "model", "kolor", "typ", "rozmiar", "basen", "uwagi"].forEach(k => {
    if (m0[k] === undefined) throw new Error("Brak pola " + k + " w mapLifejacketDocument.");
  });

  Logger.log("OK – mapowanie Firestore → JS poprawne.");

  // 4. GET ITEMS BY TYPE
  Logger.log("4) Sprawdzam getItemsByType('lifejacket')...");
  const items = getItemsByType("lifejacket");
  if (!items || items.length === 0) throw new Error("getItemsByType(lifejacket) zwrócił pustą listę.");

  const it0 = items[0];
  if (it0.id === undefined || it0.kolor === undefined) throw new Error("Brak pól w obiekcie z getItemsByType().");

  Logger.log("OK – getItemsByType działa.");

  // 5. RENT → RETURN (pełny test wypożyczenia)
  Logger.log("5) Test wypożyczenia / zwrotu...");
  const testUser = "TestUser";

  const rent = rentItem("lifejacket", it0.id, testUser, "", "");
  if (rent.error) throw new Error("rentItem zwrócił błąd: " + rent.error);
  Logger.log("OK – wypożyczenie działa.");

  const afterRent = getItemsByType("lifejacket").find(i => i.id === it0.id);
  if (afterRent.dostepny !== false || afterRent.aktualnyUzytkownik !== testUser) {
    throw new Error("Stan po wypożyczeniu nie został zaktualizowany w Firestore.");
  }

  const ret = returnItem("lifejacket", it0.id);
  if (ret.error) throw new Error("returnItem zwrócił błąd: " + ret.error);
  Logger.log("OK – zwrot działa.");

  const afterReturn = getItemsByType("lifejacket").find(i => i.id === it0.id);
  if (afterReturn.dostepny !== true || afterReturn.aktualnyUzytkownik !== "") {
    throw new Error("Stan po zwrocie nie został zaktualizowany.");
  }

  Logger.log("=== TEST LIFEJACKETS – WSZYSTKO OK ✔ ===");
}


/**
 * TEST KOMPLETNEJ OBSŁUGI KASKÓW (HELMETS)
 * Sprawdza jednym kliknięciem:
 * 1) odczyt arkusza
 * 2) rowToHelmetObject
 * 3) sync → Firestore
 * 4) mapHelmetDocument
 * 5) getItemsByType("helmet")
 * 6) rentItem / returnItem
 */
function testHelmetsFull() {
  Logger.log("=== TEST HELMETS START ===");

  // 1. ODCZYT ARKUSZA
  Logger.log("1) Pobieram dane z arkusza 'kaski'...");
  const cfg = getHelmetsConfig();
  if (!cfg || cfg.length === 0) {
    throw new Error("Brak danych w zakładce 'kaski'.");
  }
  Logger.log("OK – " + cfg.length + " rekordów z arkusza.");

  const first = cfg[0];

  ["id", "numer", "producent", "model", "kolor", "rozmiar", "basen", "uwagi"].forEach(k => {
    if (first[k] === undefined) {
      throw new Error("Brak pola " + k + " w obiekcie z arkusza (rowToHelmetObject).");
    }
  });
  Logger.log("OK – rowToHelmetObject poprawne.");

  // 2. SYNC DO FIRESTORE
  Logger.log("2) Sync do Firestore...");
  syncHelmets();

  const firstId = first.id;
  const docPath = HELMETS_COLLECTION + "/" + encodeURIComponent(firstId);

  if (!firestoreDocumentExists(docPath)) {
    throw new Error("Dokument kasku " + firstId + " nie powstał w Firestore.");
  }

  Logger.log("OK – dokument istnieje w Firestore.");

  // 3. POBRANIE Z FIRESTORE → MAPOWANIE
  Logger.log("3) Pobieram kolekcję helmets z Firestore...");
  const raw = firestoreGetCollection(HELMETS_COLLECTION);
  const docs = raw.documents || [];

  if (docs.length === 0) {
    throw new Error("Brak dokumentów w Firestore po syncu!");
  }

  const mapped = docs.map(d => mapHelmetDocument(d));

  const m0 = mapped.find(m => m.id === String(firstId));
  if (!m0) throw new Error("mapHelmetDocument nie zwrócił dokumentu o ID " + firstId);

  ["numer", "producent", "model", "kolor", "rozmiar", "basen", "uwagi"].forEach(k => {
    if (m0[k] === undefined) {
      throw new Error("Brak pola " + k + " w mapHelmetDocument.");
    }
  });

  Logger.log("OK – mapowanie Firestore → JS poprawne.");

  // 4. GET ITEMS BY TYPE ("helmet")
  Logger.log("4) Test getItemsByType('helmet')...");
  const items = getItemsByType("helmet");
  if (!items || items.length === 0) {
    throw new Error("getItemsByType('helmet') zwrócił pustą listę.");
  }

  const it0 = items[0];

  if (it0.id === undefined || it0.kolor === undefined) {
    throw new Error("Brak wymaganych pól w obiekcie getItemsByType('helmet').");
  }

  Logger.log("OK – getItemsByType działa.");

  // 5. RENT → VERIFY → RETURN → VERIFY
  Logger.log("5) Test wypożyczenie / zwrot...");
  const testUser = "TestUser";

  // RENT
  const rent = rentItem("helmet", it0.id, testUser, "", "");
  if (rent.error) {
    throw new Error("rentItem zwrócił błąd: " + rent.error);
  }

  const afterRent = getItemsByType("helmet").find(i => i.id === it0.id);
  if (afterRent.dostepny !== false || afterRent.aktualnyUzytkownik !== testUser) {
    throw new Error("Po wypożyczeniu stan dokumentu jest niepoprawny.");
  }

  Logger.log("OK – wypożyczenie działa.");

  // RETURN
  const ret = returnItem("helmet", it0.id);
  if (ret.error) {
    throw new Error("returnItem zwrócił błąd: " + ret.error);
  }

  const afterReturn = getItemsByType("helmet").find(i => i.id === it0.id);
  if (afterReturn.dostepny !== true || afterReturn.aktualnyUzytkownik !== "") {
    throw new Error("Po zwrocie stan dokumentu jest niepoprawny.");
  }

  Logger.log("OK – zwrot działa.");

  Logger.log("=== TEST HELMETS – WSZYSTKO OK ✔ ===");
}

function testThrowbagsFull() {
  Logger.log("=== TEST THROWBAGS START ===");

  // 1. ODCZYT ARKUSZA
  Logger.log("1) Pobieram dane z arkusza 'rzutki'...");
  const cfg = getThrowbagsConfig();
  if (!cfg || cfg.length === 0) {
    throw new Error("Brak danych w zakładce 'rzutki'.");
  }
  Logger.log("OK – " + cfg.length + " rekordów z arkusza.");

  const first = cfg[0];

  ["id", "numer", "producent", "uwagi"].forEach(k => {
    if (first[k] === undefined) {
      throw new Error("Brak pola " + k + " w obiekcie z arkusza (rowToThrowbagObject).");
    }
  });
  Logger.log("OK – rowToThrowbagObject poprawne.");

  // 2. SYNC DO FIRESTORE
  Logger.log("2) Sync do Firestore...");
  syncThrowbags();

  const firstId = first.id;
  const docPath = THROWBAGS_COLLECTION + "/" + encodeURIComponent(firstId);

  if (!firestoreDocumentExists(docPath)) {
    throw new Error("Dokument rzutki " + firstId + " nie powstał w Firestore.");
  }

  Logger.log("OK – dokument istnieje w Firestore.");

  // 3. POBRANIE Z FIRESTORE → MAPOWANIE
  Logger.log("3) Pobieram kolekcję throwbags z Firestore...");
  const raw = firestoreGetCollection(THROWBAGS_COLLECTION);
  const docs = raw.documents || [];

  if (docs.length === 0) {
    throw new Error("Brak dokumentów w Firestore po syncu!");
  }

  const mapped = docs.map(d => mapThrowbagDocument(d));

  const m0 = mapped.find(m => m.id === String(firstId));
  if (!m0) throw new Error("mapThrowbagDocument nie zwrócił dokumentu o ID " + firstId);

  ["numer", "producent", "uwagi"].forEach(k => {
    if (m0[k] === undefined) {
      throw new Error("Brak pola " + k + " w mapThrowbagDocument.");
    }
  });

  Logger.log("OK – mapowanie Firestore → JS poprawne.");

  // 4. GET ITEMS BY TYPE ("throwbag")
  Logger.log("4) Test getItemsByType('throwbag')...");
  const items = getItemsByType("throwbag");
  if (!items || items.length === 0) {
    throw new Error("getItemsByType('throwbag') zwrócił pustą listę.");
  }

  const it0 = items[0];

  if (it0.id === undefined || it0.numer === undefined) {
    throw new Error("Brak wymaganych pól w obiekcie z getItemsByType('throwbag').");
  }

  Logger.log("OK – getItemsByType działa.");

  // 5. RENT → VERIFY → RETURN → VERIFY
  Logger.log("5) Test wypożyczenie / zwrot...");
  const testUser = "TestUser";

  // RENT
  const rent = rentItem("throwbag", it0.id, testUser, "", "");
  if (rent.error) {
    throw new Error("rentItem zwrócił błąd: " + rent.error);
  }

  const afterRent = getItemsByType("throwbag").find(i => i.id === it0.id);
  if (afterRent.dostepny !== false || afterRent.aktualnyUzytkownik !== testUser) {
    throw new Error("Po wypożyczeniu stan dokumentu jest niepoprawny.");
  }

  Logger.log("OK – wypożyczenie działa.");

  // RETURN
  const ret = returnItem("throwbag", it0.id);
  if (ret.error) {
    throw new Error("returnItem zwrócił błąd: " + ret.error);
  }

  const afterReturn = getItemsByType("throwbag").find(i => i.id === it0.id);
  if (afterReturn.dostepny !== true || afterReturn.aktualnyUzytkownik !== "") {
    throw new Error("Po zwrocie stan dokumentu jest niepoprawny.");
  }

  Logger.log("OK – zwrot działa.");

  Logger.log("=== TEST THROWBAGS – WSZYSTKO OK ✔ ===");
}

function testSprayskirtsFull() {
  Logger.log("=== TEST SPRAYSKIRTS START ===");

  // 1. arkusz
  const cfg = getSprayskirtsConfig();
  if (!cfg || cfg.length === 0) throw new Error("Brak danych w zakładce fartuchy.");

  const first = cfg[0];
  ["id","numer","producent","material","rozmiar","rozmiarKomina","basen","niziny","uwagi"].forEach(k=>{
    if (first[k] === undefined) throw new Error("Brak pola "+k+" w rowToSprayskirtObject.");
  });

  Logger.log("OK – odczyt arkusza.");

  // 2. sync
  syncSprayskirts();

  const firstId = first.id;
  const docPath = SPRAYSKIRTS_COLLECTION + "/" + encodeURIComponent(firstId);

  if (!firestoreDocumentExists(docPath)) throw new Error("Dokument fartucha nie powstał");
  Logger.log("OK – Firestore zapisany.");

  // 3. mapping
  const raw = firestoreGetCollection(SPRAYSKIRTS_COLLECTION);
  const mapped = raw.documents.map(d=>mapSprayskirtDocument(d));
  const m0 = mapped.find(m=>m.id===String(firstId));
  if (!m0) throw new Error("mapSprayskirtDocument nie zwrócił itemu.");

  Logger.log("OK – mapping Firestore → JS działa.");

  // 4. getItemsByType
  const items = getItemsByType("sprayskirt");
  if (!items.length) throw new Error("getItemsByType('sprayskirt') pusty.");

  Logger.log("OK – getItemsByType działa.");

  // 5. rental
  const it0 = items[0];
  const user = "TestUser";

  const rent = rentItem("sprayskirt", it0.id, user, "", "");
  if (rent.error) throw new Error("rentItem: "+rent.error);

  const afterRent = getItemsByType("sprayskirt").find(i=>i.id===it0.id);
  if (afterRent.dostepny !== false) throw new Error("Po wypożyczeniu dostepny ≠ false");

  const ret = returnItem("sprayskirt", it0.id);
  if (ret.error) throw new Error("returnItem: "+ret.error);

  const afterReturn = getItemsByType("sprayskirt").find(i=>i.id===it0.id);
  if (afterReturn.dostepny !== true) throw new Error("Po zwrocie dostepny ≠ true");

  Logger.log("=== TEST SPRAYSKIRTS – OK ✔ ===");
}




