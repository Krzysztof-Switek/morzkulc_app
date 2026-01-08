/********************************************************************
 * 64_users_registration_router.js
 * REJESTRACJA — PUBLICZNA (GOOGLE ID TOKEN)
 *
 * WYMAGANIA (aktualne):
 * - Jednorazowo (tylko przy pierwszej rejestracji/logowaniu) sprawdzamy BO26
 *   w kolekcji Firestore: users_opening_balance_26
 * - Dopasowanie: po email LUB po imię+nazwisko (użytkownik mógł zmienić email/nazwisko)
 * - Logika:
 *   1) znaleziony rekord + "członek stowarzyszenia" == true
 *        -> Rola="Członek", Status="Aktywny"
 *   2) znaleziony rekord + "członek stowarzyszenia" != true
 *        -> Rola="Członek", Status="Zawieszony"
 *   3) brak rekordu
 *        -> Rola="Sympatyk", Status="pending"
 * - "Tylko raz": zapisujemy flagę sprawdzenia w Firestore (users + users_active)
 *   oraz technicznie w arkuszu w kolumnie "Pole dodatkowe".
 ********************************************************************/

/********************************************************************
 * SHEETS — kompatybilność: jeśli nie ma upsert, użyj addUser
 ********************************************************************/
function usersSheet_upsertUser(user) {
  if (typeof usersSheet_addUser === "function") return usersSheet_addUser(user);
  throw new Error("Brak usersSheet_addUser w projekcie");
}

function registration_ui_submit(data) {
  const res = registration_core(data);
  if (!res || !res.ok) throw new Error("Rejestracja nieudana");

  // Po rejestracji od razu zwracamy HOME (bez parametrów URL / bez Session)
  const homeData = users_getHomeData(res.email);
  if (homeData && homeData.ok) {
    return render_home(homeData).getContent();
  }

  // Fallback
  return render_register({ ok: true, email: res.email }).getContent();
}

/**
 * CORE rejestracji:
 * - weryfikacja ID token
 * - jeśli użytkownik już istnieje w users_active -> traktujemy jako OK (bez ponownego checku BO)
 * - w przeciwnym razie:
 *    - wykonaj check BO26 (email OR imię+nazwisko)
 *    - ustaw rola/status wg reguł
 *    - zapisz do users (pełny profil) + users_active (marker/dostęp)
 *    - dopisz do arkusza "członkowie i sympatycy" (upsert)
 *    - oznacz w arkuszu "Pole dodatkowe" że check BO był wykonany
 */
function registration_core(data) {
  // 1) Token
  const idToken = String((data && data.idToken) || "").trim();
  if (!idToken) throw new Error("Brak idToken");

  const auth = auth_verifyGoogleIdToken(idToken);
  if (!auth || !auth.ok) throw new Error("Nieprawidłowy token");
  const email = String(auth.email || "").trim().toLowerCase();
  if (!email) throw new Error("Brak email w tokenie");

  // 2) Jeśli już jest w ACTIVE -> nie robimy nic (to jest już po 'tylko raz')
  const existing = user_getActive(email);
  if (existing && existing.fields) {
    return { ok: true, email: email, already: true };
  }

  // 3) Dane z formularza (do dopasowania po imię+nazwisko)
  const imie = String((data && data.imie) || "").trim();
  const nazwisko = String((data && data.nazwisko) || "").trim();
  const ksywa = String((data && data.ksywa) || "").trim();
  const telefon = String((data && data.telefon) || "").trim();

  if (!imie) throw new Error("Brak imienia");
  if (!nazwisko) throw new Error("Brak nazwiska");
  if (!telefon) throw new Error("Brak telefonu");

  // 4) Jednorazowy check BO26
  const ob = _openingBalance26_match_(email, imie, nazwisko);

  // 5) Ustal rola/status wg Twojej logiki
  const decision = _openingBalance26_decideRoleStatus_(ob);

  const user = {
    email: email,
    ksywa: ksywa,
    imie: imie,
    nazwisko: nazwisko,
    telefon: telefon,

    rola: decision.rola,
    status: decision.status,

    joinedAt: new Date().toISOString(),
    zgodyRodo: true,
    authProvider: "google",

    // techniczne "tylko raz"
    openingBalanceChecked: true,
    openingBalanceMatch: ob.matchType,      // "email" | "name" | "none"
    openingBalanceDocId: ob.docId || ""     // ID dokumentu z BO26 (jeśli znaleziony)
  };

  // 6) Zapis do Firestore + dopis/upsert do arkusza
  // - users (pełny profil)
  // - users_active (marker + dostęp)
  user_saveUser(user);
  user_saveActive(user);

  // Arkusz (upsert zamiast skip)
  usersSheet_upsertUser(user);
  SpreadsheetApp.flush();

  // 7) Zapis flagi "tylko raz" do arkusza (Pole dodatkowe)
  _usersSheet_markOpeningBalanceChecked_(email, ob.matchType, ob.docId || "");

  return { ok: true, email: email };
}

/********************************************************************
 * BO26 — dopasowanie
 ********************************************************************/

/**
 * Normalizacja tekstu (dla dopasowania po imię+nazwisko)
 */
function _ob26_normText_(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")   // usuń diakrytyki
    .replace(/[^a-z0-9]+/g, " ")       // zostaw a-z0-9, reszta -> spacje
    .replace(/\s+/g, " ")
    .trim();
}

function _ob26_nameKey_(imie, nazwisko) {
  const i = _ob26_normText_(imie);
  const n = _ob26_normText_(nazwisko);
  return (i && n) ? (i + "|" + n) : "";
}

function _fs_getString_(docFields, key) {
  const f = docFields && docFields[key];
  if (!f) return "";
  if (typeof f.stringValue === "string") return f.stringValue;
  if (typeof f.integerValue === "string") return f.integerValue;
  if (typeof f.doubleValue === "number") return String(f.doubleValue);
  if (typeof f.booleanValue === "boolean") return f.booleanValue ? "true" : "false";
  return "";
}

function _fs_getBool_(docFields, key) {
  const f = docFields && docFields[key];
  if (!f) return false;
  if (typeof f.booleanValue === "boolean") return f.booleanValue;
  if (typeof f.stringValue === "string") {
    const s = f.stringValue.trim().toLowerCase();
    if (["tak", "t", "true", "1", "yes", "y"].includes(s)) return true;
    if (["nie", "n", "false", "0", "no"].includes(s)) return false;
  }
  return false;
}

function _fs_getFirstString_(docFields, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = _fs_getString_(docFields, keys[i]);
    if (v !== "") return v;
  }
  return "";
}

function _fs_getFirstBool_(docFields, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (_fs_getBool_(docFields, keys[i]) === true) return true;
  }
  return false;
}

/**
 * Zwraca:
 *  - found: boolean
 *  - matchType: "email" | "name" | "none"
 *  - docId: string (ID dokumentu z BO26, jeśli znaleziony)
 *  - isMember: boolean (pole "członek stowarzyszenia" == true)
 */
function _openingBalance26_match_(email, imie, nazwisko) {
  const normEmail = String(email || "").trim().toLowerCase();
  const nameKey = _ob26_nameKey_(imie, nazwisko);

  // 0) Najpierw szybki strzał: dokument o ID = email (częsty pattern przy imporcie)
  if (normEmail) {
    const direct = firestoreGetDocument(`${USERS_OPENING_BALANCE}/${encodeURIComponent(normEmail)}`);
    if (direct && direct.fields) {
      const docId0 = String(direct.name || "").split("/").pop() || normEmail;
      const isMember0 = _fs_getFirstBool_(direct.fields, [
        "członek stowarzyszenia",
        "czlonek stowarzyszenia",
        "czlonek_stowarzyszenia",
        "czlonkestowarzyszenia",
        "czlonekstowarzyszenia",
        "member_association",
      ]);

      return { found: true, matchType: "email", docId: docId0, isMember: isMember0 };
    }
  }

  // 1) Skan kolekcji (OK, bo tylko raz)
  const col = firestoreGetCollection(USERS_OPENING_BALANCE);
  const docs = (col && col.documents) ? col.documents : [];

  let byEmail = null;
  let byName = null;

  docs.forEach(d => {
    if (!d || !d.fields) return;
    const f = d.fields;

    // EMAIL — wspieramy różne nazwy pól z importu
    const boEmail = String(_fs_getFirstString_(f, [
      "e-mail",
      "email",
      "e_mail",
      "mail",
      "adres e-mail",
      "adres email",
      "adres_email",
    ]) || "").trim().toLowerCase();

    // IMIĘ/NAZWISKO — wspieramy różne nazwy pól z importu
    const boImie = _fs_getFirstString_(f, ["Imię", "Imie", "imię", "imie", "first_name", "firstname"]);
    const boNazwisko = _fs_getFirstString_(f, ["Nazwisko", "nazwisko", "last_name", "lastname"]);
    const boNameKey = _ob26_nameKey_(boImie, boNazwisko);

    if (!byEmail && normEmail && boEmail && boEmail === normEmail) byEmail = d;
    if (!byName && nameKey && boNameKey && boNameKey === nameKey) byName = d;
  });

  const hit = byEmail || byName;
  if (!hit || !hit.fields) return { found: false, matchType: "none", docId: "", isMember: false };

  const docId = String(hit.name || "").split("/").pop() || "";
  const isMember = _fs_getFirstBool_(hit.fields, [
    "członek stowarzyszenia",
    "czlonek stowarzyszenia",
    "czlonek_stowarzyszenia",
    "czlonkestowarzyszenia",
    "czlonekstowarzyszenia",
    "member_association",
  ]);

  return {
    found: true,
    matchType: byEmail ? "email" : "name",
    docId: docId,
    isMember: isMember
  };
}

/**
 * Decyzja rola/status wg Twoich zasad
 */
function _openingBalance26_decideRoleStatus_(match) {
  const found = match && match.found === true;

  if (found) {
    if (match.isMember === true) {
      return { rola: USER_ROLES.CZLONEK, status: USER_STATUSES.AKTYWNY };
    }
    return { rola: USER_ROLES.CZLONEK, status: USER_STATUSES.ZAWIESZONY };
  }

  // brak rekordu
  return { rola: USER_ROLES.SYMPATYK, status: "pending" };
}

/********************************************************************
 * Arkusz — zapis flagi "tylko raz" (Pole dodatkowe)
 ********************************************************************/

/**
 * Znajdź wiersz po email (kolumna F) i ustaw "Pole dodatkowe" (kolumna O).
 * Bez zmian w strukturze arkusza.
 */
function _usersSheet_markOpeningBalanceChecked_(email, matchType, boDocId) {
  try {
    const normEmail = String(email || "").trim().toLowerCase();
    if (!normEmail) return;

    const ss = SpreadsheetApp.openById(USERS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName("członkowie i sympatycy");
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // kolumny:
    // F = e-mail (6)
    // O = Pole dodatkowe (15)
    const emailRange = sheet.getRange(2, 6, lastRow - 1, 1).getValues();

    let rowIndex = -1;
    for (let i = 0; i < emailRange.length; i++) {
      const v = String(emailRange[i][0] || "").trim().toLowerCase();
      if (v && v === normEmail) {
        rowIndex = i + 2;
        break;
      }
    }
    if (rowIndex === -1) return;

    const value =
      "opening_balance_checked=TAK"
      + ";match=" + String(matchType || "none")
      + ";bo_doc_id=" + String(boDocId || "");

    sheet.getRange(rowIndex, 15).setValue(value);
  } catch (e) {
    // Nie blokujemy rejestracji, jeśli techniczna flaga nie weszła.
    Logger.log("_usersSheet_markOpeningBalanceChecked_ WARN: " + e);
  }
}
