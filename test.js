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
