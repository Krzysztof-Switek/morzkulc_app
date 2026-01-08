/********************************************************************
 * users_active_sync.gs
 * Synchronizacja aktywnych członków i sympatyków → Firestore
 * (kolekcja users_active)
 *
 * Źródło danych:
 *  - arkusz CONFIG.USERS_SPREADSHEET_ID
 *  - zakładka CONFIG.MEMBERS_MAIN_SHEET_NAME ("członkowie i sympatycy")
 *
 * Klucz dokumentu = email (lowercase)
 ********************************************************************/

/************************************************************
 * Normalizacja nagłówków
 ************************************************************/
function _users_normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")   // usuń diakrytyki
    .replace(/[^a-z0-9]/g, "");        // zostaw tylko a-z0-9
}

/************************************************************
 * Loader tabeli członków i sympatyków
 ************************************************************/
function loadMembersSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.USERS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.MEMBERS_MAIN_SHEET_NAME);
  if (!sheet) {
    Logger.log("❌ loadMembersSheet: brak zakładki '" + CONFIG.MEMBERS_MAIN_SHEET_NAME + "'");
    return { headers: [], rows: [] };
  }

  const last = sheet.getLastRow();
  if (last < 2) {
    return { headers: [], rows: [] };
  }

  const range = sheet.getRange(1, 1, last, sheet.getLastColumn());
  const values = range.getValues();

  const rawHeaders = values[0];
  const rows = values.slice(1);

  const headers = rawHeaders.map(_users_normHeader);

  return { headers, rows };
}

/************************************************************
 * Główny SYNC → Firestore (users_active)
 ************************************************************/
function syncUsersActive() {
  Logger.log("=== SYNC USERS_ACTIVE START ===");

  const data = loadMembersSheet();
  const headers = data.headers;
  const rows = data.rows;

  if (!headers.length) {
    Logger.log("Brak danych w arkuszu 'członkowie i sympatycy'");
    Logger.log("=== SYNC USERS_ACTIVE END (EMPTY) ===");
    return;
  }

  // Szukamy kluczowych kolumn
  const idxEmail   = headers.indexOf("email");
  const idxImie    = headers.indexOf("imie");
  const idxNazw    = headers.indexOf("nazwisko");
  const idxKsywa   = headers.indexOf("ksywa");
  const idxRola    = headers.indexOf("rola");
  const idxStatus  = headers.indexOf("status");

  if (idxEmail === -1) {
    Logger.log("❌ Brak kolumny 'email' w arkuszu.");
    Logger.log("=== SYNC USERS_ACTIVE END (ERROR) ===");
    return;
  }

  let processed = 0;

  rows.forEach(row => {
    const emailRaw = row[idxEmail];
    const email = String(emailRaw || "").trim().toLowerCase();
    if (!email) {
      return; // pomijamy wiersze bez emaila
    }

    const docPath = `${USERS_ACTIVE}/${encodeURIComponent(email)}`;

    const payload = {};

    payload.email = email;

    if (idxImie   !== -1) payload.imie     = row[idxImie]    || "";
    if (idxNazw   !== -1) payload.nazwisko = row[idxNazw]    || "";
    if (idxKsywa  !== -1) payload.ksywa    = row[idxKsywa]   || "";
    if (idxRola   !== -1) payload.rola     = row[idxRola]    || "";
    if (idxStatus !== -1) payload.status   = row[idxStatus]  || "";

    firestorePatchDocument(docPath, payload, Object.keys(payload));
    processed++;
  });

  Logger.log("✔ SYNC zakończony, rekordów: " + processed);
  Logger.log("=== SYNC USERS_ACTIVE END ===");
}
