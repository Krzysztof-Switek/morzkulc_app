/**
 * File: opening_balance_import.gs
 * Purpose: jednorazowy/powtarzalny import bilansu otwarcia z arkusza do Firestore
 *          (kolekcja users_opening_balance_26) + zasilenie kolumn arkusza członków.
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Funkcje (uruchamiane z menu "Morzkulc"):
 *   - clearOpeningBalanceCollection()           — usuwa wszystkie dokumenty kolekcji (przed świeżym importem)
 *   - importOpeningBalanceToFirestore()         — import zakładki TAB_OPENING_BALANCE -> kolekcja (doc id = e-mail)
 *   - seedMemberSheetBalancesFromOpeningBalance() — wpisuje salda Godzinki/Składki do arkusza członków
 */

const OB_COLLECTION = "users_opening_balance_26";
// Kolumny bilansu przechowywane jako boolean (computeRoleKeyFromOpeningBalance wymaga === true).
const OB_BOOL_HEADERS = ["czlonek_stowarzyszenia", "zalozyciel_stowarzyszenia"];

/**
 * Znajduje zakładkę tolerancyjnie: najpierw dokładnie, potem po nazwie znormalizowanej
 * (małe litery, bez spacji/podkreśleń). Odporne na „bilans_otwarcia_26" vs „bilans otwarcia 26".
 */
function obGetSheetFlexible_(ss, wantedName) {
  const exact = ss.getSheetByName(wantedName);
  if (exact) return exact;
  const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[\s_]+/g, "");
  const want = norm(wantedName);
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (norm(sheets[i].getName()) === want) return sheets[i];
  }
  return null;
}

function obIsTruthy_(v) {
  if (v === true) return true;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "tak" || s === "true" || s === "1" || s === "✓" || s === "x";
}

function obFormatDate_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/** Konwertuje komórkę arkusza na wartość pola Firestore (zachowuje typy, daty -> ISO yyyy-MM-dd). */
function obCellToFieldValue_(header, value) {
  const normHeader = normalizeHeader_(header);
  if (OB_BOOL_HEADERS.indexOf(normHeader) !== -1) {
    return obIsTruthy_(value);
  }
  if (value instanceof Date) return obFormatDate_(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  return String(value == null ? "" : value).trim();
}

/**
 * Usuwa wszystkie dokumenty kolekcji users_opening_balance_26.
 * Uruchom PRZED świeżym importem (stary ręczny import miał inne id dokumentów → duplikaty).
 * Bezpieczne: kolekcja jest w pełni odtwarzalna z arkusza, nie dotyka users_active.openingBalance.
 */
function clearOpeningBalanceCollection() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    "Wyczyścić kolekcję " + OB_COLLECTION + "?",
    "Usunie WSZYSTKIE dokumenty bilansu otwarcia w środowisku " + ACTIVE_ENV + ".\nDane są odtwarzalne z arkusza. Kontynuować?",
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  let deleted = 0;
  let pageToken = "";
  do {
    let url = CONFIG.FIRESTORE_BASE_URL + "/" + OB_COLLECTION + "?pageSize=300";
    if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);
    const listResp = UrlFetchApp.fetch(url, {
      method: "GET",
      headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()},
      muteHttpExceptions: true,
    });
    if (listResp.getResponseCode() !== 200) {
      throw new Error("List failed (" + listResp.getResponseCode() + "): " + listResp.getContentText());
    }
    const body = JSON.parse(listResp.getContentText() || "{}");
    const docs = body.documents || [];
    for (let i = 0; i < docs.length; i++) {
      const delResp = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/" + docs[i].name, {
        method: "DELETE",
        headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()},
        muteHttpExceptions: true,
      });
      if (delResp.getResponseCode() >= 200 && delResp.getResponseCode() < 300) deleted++;
    }
    pageToken = body.nextPageToken || "";
  } while (pageToken);

  ui.alert("Usunięto dokumentów: " + deleted);
}

/**
 * Import zakładki bilansu otwarcia do kolekcji users_opening_balance_26.
 * Klucze pól = ORYGINALNE nagłówki arkusza (zgodność z findOpeningBalance/getObHours w backendzie).
 * doc id = znormalizowany e-mail. Idempotentny (nadpisuje po e-mailu).
 */
function importOpeningBalanceToFirestore() {
  const ss = SpreadsheetApp.openById(CONFIG.USERS_ARCHIVE_SPREADSHEET_ID);
  const sheet = obGetSheetFlexible_(ss, TAB_OPENING_BALANCE);
  if (!sheet) throw new Error('Brak zakładki "' + TAB_OPENING_BALANCE + '" (sprawdzono też warianty nazwy)');

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) {
    SpreadsheetApp.getUi().alert("Brak danych w zakładce " + sheet.getName());
    return;
  }

  const headers = values[0].map((h) => String(h == null ? "" : h).trim());
  const normHeaders = headers.map((h) => normalizeHeader_(h));
  let emailIdx = normHeaders.indexOf("e_mail");
  if (emailIdx === -1) emailIdx = normHeaders.indexOf("email");
  if (emailIdx === -1) throw new Error('Brak kolumny "e-mail" w bilansie');

  const docs = [];
  const seen = {};
  let skippedNoEmail = 0;
  let duplicates = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const email = String(row[emailIdx] == null ? "" : row[emailIdx]).trim().toLowerCase();
    if (!email || email.indexOf("@") === -1) {
      skippedNoEmail++;
      continue;
    }
    if (seen[email]) {
      duplicates++;
      continue;
    }
    seen[email] = true;

    const data = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (!header) continue;
      data[header] = obCellToFieldValue_(header, row[c]);
    }

    docs.push({docPath: OB_COLLECTION + "/" + email, data: data});
  }

  // Zapis wsadowy (partie <= 400 writes)
  let written = 0;
  const BATCH = 400;
  for (let i = 0; i < docs.length; i += BATCH) {
    const chunk = docs.slice(i, i + BATCH);
    firestoreCommitDocuments_(chunk);
    written += chunk.length;
  }

  SpreadsheetApp.getUi().alert(
    "Import bilansu otwarcia zakończony.\n" +
    "Zapisano: " + written + "\n" +
    "Pominięto (brak e-mail): " + skippedNoEmail + "\n" +
    "Duplikaty e-mail (pominięte): " + duplicates
  );
}

/**
 * Jednorazowe zasilenie kolumn "Godzinki"/"Składki" w arkuszu członków danymi z bilansu otwarcia
 * (dopasowanie po e-mailu). Wpisuje tylko gdy komórka jest pusta — nie nadpisuje ręcznych korekt.
 * Arkusz pozostaje ręcznym źródłem korekt; nie tworzymy stałego Firestore -> arkusz.
 */
function seedMemberSheetBalancesFromOpeningBalance() {
  // 1) Zbierz salda z bilansu po e-mailu
  const obSs = SpreadsheetApp.openById(CONFIG.USERS_ARCHIVE_SPREADSHEET_ID);
  const obSheet = obGetSheetFlexible_(obSs, TAB_OPENING_BALANCE);
  if (!obSheet) throw new Error('Brak zakładki "' + TAB_OPENING_BALANCE + '" (sprawdzono też warianty nazwy)');
  const obValues = obSheet.getDataRange().getValues();
  const obHeaders = obValues[0].map((h) => normalizeHeader_(h));

  let obEmailIdx = obHeaders.indexOf("e_mail");
  if (obEmailIdx === -1) obEmailIdx = obHeaders.indexOf("email");
  const obHoursIdx = obHeaders.findIndex((h) => h.indexOf("godzinki") === 0);
  const obContribIdx = obHeaders.findIndex((h) => h.indexOf("skladki") === 0);

  const balByEmail = {};
  for (let r = 1; r < obValues.length; r++) {
    const email = String(obValues[r][obEmailIdx] || "").trim().toLowerCase();
    if (!email) continue;
    balByEmail[email] = {
      hours: obHoursIdx !== -1 ? obValues[r][obHoursIdx] : "",
      contributions: obContribIdx !== -1 ? obValues[r][obContribIdx] : "",
    };
  }

  // 2) Otwórz arkusz członków i znajdź kolumny
  const memSs = SpreadsheetApp.openById(CONFIG.USERS_SPREADSHEET_ID);
  const memSheet = memSs.getSheetByName(TAB_USERS);
  if (!memSheet) throw new Error('Brak zakładki "' + TAB_USERS + '"');
  const memValues = memSheet.getDataRange().getValues();
  const memHeaders = memValues[0].map((h) => normalizeHeader_(h));

  let memEmailIdx = memHeaders.indexOf("e_mail");
  if (memEmailIdx === -1) memEmailIdx = memHeaders.indexOf("email");
  const memHoursIdx = memHeaders.indexOf("godzinki");
  const memContribIdx = memHeaders.indexOf("skladki");
  if (memEmailIdx === -1) throw new Error('Brak kolumny "E-mail" w arkuszu członków');
  if (memHoursIdx === -1 && memContribIdx === -1) {
    throw new Error('Brak kolumn "Godzinki"/"Składki" w arkuszu członków');
  }

  let filledHours = 0;
  let filledContrib = 0;
  for (let r = 1; r < memValues.length; r++) {
    const email = String(memValues[r][memEmailIdx] || "").trim().toLowerCase();
    if (!email || !balByEmail[email]) continue;
    const bal = balByEmail[email];
    if (memHoursIdx !== -1 && String(memValues[r][memHoursIdx] || "").trim() === "" && bal.hours !== "") {
      memValues[r][memHoursIdx] = bal.hours;
      filledHours++;
    }
    if (memContribIdx !== -1 && String(memValues[r][memContribIdx] || "").trim() === "" && bal.contributions !== "") {
      memValues[r][memContribIdx] = bal.contributions;
      filledContrib++;
    }
  }

  // 3) Zapis z powrotem (cały zakres — prościej niż per-komórka)
  memSheet.getRange(1, 1, memValues.length, memValues[0].length).setValues(memValues);

  SpreadsheetApp.getUi().alert(
    "Zasilenie arkusza członków zakończone.\n" +
    "Wypełniono Godzinki: " + filledHours + "\n" +
    "Wypełniono Składki: " + filledContrib
  );
}
