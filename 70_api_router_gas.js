/**
 * 70_api_router_gas.js
 * GŁÓWNY BACKEND SYSTEMU (wersja Google Apps Script)
 * Zastępuje Cloud Functions: /api/register
 */

const CONFIG = {
  PROJECT_ID: 'sprzet-skk-morzkulc',
  FIREBASE_API_KEY: "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo",
  FIRESTORE_BASE_URL: "https://firestore.googleapis.com/v1/projects/sprzet-skk-morzkulc/databases/(default)/documents",
  USERS_SPREADSHEET_ID: '1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM',
  USERS_ARCHIVE_SPREADSHEET_ID: '19Ay1DkcaTX94ph4N1PtitSke6kpeVXMpjcB6XDHLfko',
  MEMBERS_MAIN_SHEET_NAME: 'członkowie i sympatycy',
  HISTORY_BALANCE_SHEET_NAME: 'bilans_otwarcia_26',
  LISTA_GROUP_EMAIL: 'lista@morzkulc.pl',
  WELCOME_FROM_EMAIL: 'admin@morzkulc.pl'
};

/**
 * GŁÓWNA FUNKCJA ODBIERAJĄCA POST (z Front-endu)
 */
function doPost(e) {
  var result = { ok: false, message: "Start" };

  try {
    var rawBody = e.postData.contents;
    var data = JSON.parse(rawBody || "{}");
    var idToken = data.idToken;

    if (!idToken) throw new Error("Brak tokenu idToken");

    // 1. WERYFIKACJA TOKENU (Firebase Identity Toolkit)
    var userAuth = verifyFirebaseToken(idToken);
    var email = userAuth.email;
    var uid = userAuth.uid;

    // 2. SPRAWDZENIE CZY UŻYTKOWNIK ISTNIEJE W FIRESTORE
    var existing = firestoreGetDocument("users_active/" + uid);

    if (existing) {
      // Użytkownik już zarejestrowany - zwracamy dane
      result.ok = true;
      result.message = "Użytkownik już istnieje";
      result.user = {
        email: email,
        uid: uid,
        role_key: existing.fields.role_key?.stringValue || "rola_sympatyk",
        status_key: existing.fields.status_key?.stringValue || "status_aktywny"
      };
    } else {
      // NOWA REJESTRACJA
      result = handleNewRegistration(uid, email);
    }

  } catch (err) {
    result.ok = false;
    result.message = "Błąd krytyczny: " + err.message;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * LOGIKA NOWEJ REJESTRACJI
 */
function handleNewRegistration(uid, email) {
  var out = { ok: false, message: "" };

  // A. Szukamy w Bilansie Otwarcia (Arkusz ARCHIWUM)
  var ob = findOpeningBalanceByEmail(email);
  var role = ob.isMember ? "rola_czlonek" : "rola_sympatyk";
  var status = "status_aktywny";

  // B. Zapis do Firestore (REST API)
  var userDoc = {
    uid: uid,
    email: email,
    role_key: role,
    status_key: status,
    openingMatch: ob.found,
    createdAt: new Date().toISOString()
  };

  firestoreSaveDocument("users_active/" + uid, userDoc);

  // C. Zapis do Arkusza Google (SpreadsheetApp)
  appendUserToSheet(userDoc);

  // D. Dodanie do listy dyskusyjnej (AdminDirectory)
  try {
    addToGoogleGroup(email, CONFIG.LISTA_GROUP_EMAIL);
  } catch (e) {
    console.warn("Błąd grupy: " + e.message);
  }

  // E. E-mail powitalny (MailApp)
  sendWelcomeEmail(email, role);

  out.ok = true;
  out.message = "Rejestracja zakończona sukcesem";
  out.user = userDoc;
  return out;
}

/**
 * WERYFIKACJA TOKENU FIREBASE
 */
function verifyFirebaseToken(idToken) {
  var url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + CONFIG.FIREBASE_API_KEY;
  var resp = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });

  var data = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200 || !data.users) {
    throw new Error("Nieprawidłowy token Firebase");
  }
  return { uid: data.users[0].localId, email: data.users[0].email.toLowerCase() };
}

/**
 * FIRESTORE - POBIERANIE DOKUMENTU (REST)
 */
function firestoreGetDocument(path) {
  var url = CONFIG.FIRESTORE_BASE_URL + "/" + path;
  var resp = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  return resp.getResponseCode() === 200 ? JSON.parse(resp.getContentText()) : null;
}

/**
 * FIRESTORE - ZAPIS DOKUMENTU (REST)
 */
function firestoreSaveDocument(path, data) {
  var url = CONFIG.FIRESTORE_BASE_URL + "/" + path;
  var fields = {};
  for (var k in data) {
    fields[k] = { stringValue: String(data[k]) };
  }

  UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    contentType: "application/json",
    payload: JSON.stringify({ fields: fields })
  });
}

/**
 * SZUKANIE W BILANSIE OTWARCIA (Arkusze)
 */
function findOpeningBalanceByEmail(email) {
  var ss = SpreadsheetApp.openById(CONFIG.USERS_ARCHIVE_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.HISTORY_BALANCE_SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  // Zakładamy, że e-mail jest w kolumnie B (index 1) a status członka w kolumnie J (index 9)
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === email) {
      return { found: true, isMember: data[i][9] === true || String(data[i][9]).toLowerCase() === "tak" };
    }
  }
  return { found: false, isMember: false };
}

/**
 * DOPISANIE DO ARKUSZA GŁÓWNEGO
 */
function appendUserToSheet(user) {
  var ss = SpreadsheetApp.openById(CONFIG.USERS_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.MEMBERS_MAIN_SHEET_NAME);
  sheet.appendRow([
    new Date(),
    user.email,
    user.role_key === "rola_czlonek" ? "Członek" : "Sympatyk",
    "Aktywny"
  ]);
}

/**
 * DODANIE DO GRUPY GOOGLE (ADMIN SDK)
 */
function addToGoogleGroup(userEmail, groupEmail) {
  var member = { email: userEmail, role: 'MEMBER' };
  AdminDirectory.Members.insert(member, groupEmail);
}

/**
 * WYSYŁKA MAILA POWITALNEGO
 */
function sendWelcomeEmail(email, role) {
  var subject = "Witaj w SKK Morzkulc!";
  var body = "Dziękujemy za rejestrację w systemie. Twoja rola to: " + (role === "rola_czlonek" ? "Członek" : "Sympatyk");
  MailApp.sendEmail(email, subject, body);
}
