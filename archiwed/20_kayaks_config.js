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

  if (numerKajaka && numerKajaka.toString().trim() !== "") {
    return true;
  }

  if (prywatny === true) {
    return true;
  }

  return false;
}

/**
 * Mapowanie pojedynczego wiersza arkusza na obiekt kajaka.
 */
function rowToKayakObject(row) {
  const id          = row[KAYAKS_COLUMNS.ID - 1];
  const numerKajaka = row[KAYAKS_COLUMNS.NUMER_KAJAKA - 1];

  const sprawnyRaw  = row[KAYAKS_COLUMNS.SPRAWNY - 1];
  const basenRaw    = row[KAYAKS_COLUMNS.BASEN - 1];
  const prywatnyRaw = row[KAYAKS_COLUMNS.PRYWATNY - 1];

  const privateAvailableRaw = row[KAYAKS_COLUMNS.PRYWATNY_DO_WYPOZ - 1];
  const privateOwnerEmail   = row[KAYAKS_COLUMNS.KONTAKT_WLASCICIEL - 1];

  return {
    id: id || null,
    firestoreId: String(id),        // ← DODANE – WYMAGANE DO FIRESTORE

    numerKajaka: numerKajaka ? String(numerKajaka) : null,

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

/**
 * TEST: odczyt z arkusza
 */
function testGetKayaksConfig() {
  const kayaks = getKayaksConfig();
  Logger.log(JSON.stringify(kayaks, null, 2));
}

/**
 * TEST: minimalny log
 */
function testMinimalKayakRead() {
  const kayaks = getKayaksConfig();

  Logger.log("Liczba odczytanych kajaków: " + kayaks.length);

  kayaks.forEach(k => {
    Logger.log(
      "ID=" + k.id +
      " | firestoreId=" + k.firestoreId +
      " | numerKajaka=" + (k.numerKajaka ?? "BRAK") +
      " | producent=" + k.producent
    );
  });
}

/**
 * TEST: prywatne kajaki
 */
function testPrivateKayaks() {
  const kayaks = getKayaksConfig();

  Logger.log("=== TEST PRYWATNE KAJAKI ===");

  const privateKayaks = kayaks.filter(k => k.prywatny === true);

  if (privateKayaks.length === 0) {
    Logger.log("Brak prywatnych kajaków w arkuszu.");
    return;
  }

  privateKayaks.forEach(k => {
    Logger.log(
      "\n--- PRYWATNY KAJAK ---" +
      "\nID (kol A): " + k.id +
      "\nfirestoreId: " + k.firestoreId +
      "\nnumerKajaka: " + (k.numerKajaka || "BRAK") +
      "\nwypożyczalny = " + k.privateAvailable +
      "\nwłaściciel = " + k.privateOwnerEmail +
      "\nproducent: " + k.producent +
      "\nmodel: " + k.model
    );
  });

  Logger.log("\n=== KONIEC TESTU ===");
}
