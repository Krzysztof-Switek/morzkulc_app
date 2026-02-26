/***************************************************
 * 70_api_router.js
 * Public API for Firebase-hosted frontend (web.app)
 *
 * Jedyna słuszna ścieżka rejestracji:
 * - Front robi POST do WebApp URL (Apps Script) z action=register_from_firebase
 * - Backend:
 *   1) weryfikuje Google ID Token
 *   2) jeśli users_active istnieje -> zwraca user (already=true)
 *   3) jeśli nie istnieje -> JEDNORAZOWO sprawdza BO26 (users_opening_balance_26)
 *   4) zapisuje users + users_active (Firestore)
 *   5) upsert do arkusza (nie blokuje rejestracji)
 *
 * WAŻNE:
 * - doGet() NIE jest rejestracją. Jeśli front wali GETem i oczekuje user,
 *   dostanie błąd "GET_NOT_SUPPORTED_FOR_ACTION".
 ***************************************************/

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function api_readJsonBody_(e) {
  const raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : "";
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) {
    throw new Error("INVALID_JSON_BODY: " + err.message);
  }
}

function api_trim_(v) { return String(v ?? "").trim(); }
function api_normPhone_(v) { return api_trim_(v).replace(/[^\d+]/g, ""); }

function api_normText_(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function api_nameKey_(imie, nazwisko) {
  const i = api_normText_(imie);
  const n = api_normText_(nazwisko);
  return (i && n) ? (i + "|" + n) : "";
}

function api_fs_getBool_(fields, key) {
  const f = fields && fields[key];
  if (!f) return false;
  if (typeof f.booleanValue === "boolean") return f.booleanValue;
  if (typeof f.stringValue === "string") {
    const s = f.stringValue.trim().toLowerCase();
    return ["tak", "t", "true", "1", "yes", "y"].includes(s);
  }
  return false;
}

function api_fs_getString_(fields, key) {
  const f = fields && fields[key];
  if (!f) return "";
  if (typeof f.stringValue === "string") return f.stringValue;
  if (typeof f.integerValue === "string") return f.integerValue;
  if (typeof f.doubleValue === "number") return String(f.doubleValue);
  if (typeof f.booleanValue === "boolean") return f.booleanValue ? "true" : "false";
  return "";
}

function api_fs_getFirstString_(fields, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = api_fs_getString_(fields, keys[i]);
    if (v !== "") return v;
  }
  return "";
}

function api_fs_getFirstBool_(fields, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (api_fs_getBool_(fields, keys[i]) === true) return true;
  }
  return false;
}

/**
 * Dropdown role — dokładnie jak w arkuszu (bez PL znaków)
 */
function api_roleDropdown_(rola) {
  const r = String(rola || "").trim();

  // normalizacja z wariantów "ładnych" / starych
  if (r === "Zarząd") return "Zarzad";
  if (r === "Członek") return "Czlonek";

  // akceptujemy już poprawne wartości
  if (["Zarzad", "KR", "Czlonek", "Kandydat", "Sympatyk"].includes(r)) return r;

  // fallback bez zgadywania roli: Sympatyk (najbezpieczniejsze)
  return "Sympatyk";
}

/**
 * BO26 — dopasowanie (EMAIL lub IMIĘ+NAZWISKO)
 * UWAGA: import jest 1:1 z nagłówków arkusza, więc nazwy pól mogą mieć różną wielkość liter.
 * Tu musimy obsłużyć realne warianty nagłówków z Sheets.
 */
function api_openingBalance26_match_(email, imie, nazwisko) {
  const normEmail = String(email || "").trim().toLowerCase();
  const keyName = api_nameKey_(imie, nazwisko);

  const EMAIL_KEYS = [
    "e-mail", "E-mail", "E-mail ", "e-mail ",
    "email", "Email", "EMAIL",
    "e_mail", "E_mail", "eMail", "mail", "Mail",
    "adres e-mail", "Adres e-mail", "adres email", "Adres email", "adres_email"
  ];

  const IMIE_KEYS = [
    "Imię", "imię", "Imie", "imie", "IMIĘ", "IMIE",
    "first_name", "firstname", "FirstName"
  ];

  const NAZWISKO_KEYS = [
    "Nazwisko", "nazwisko", "NAZWISKO",
    "last_name", "lastname", "LastName"
  ];

  const MEMBER_KEYS = [
    "członek stowarzyszenia", "Członek stowarzyszenia", "Członek stowarzyszenia ",
    "czlonek stowarzyszenia", "Czlonek stowarzyszenia",
    "czlonek_stowarzyszenia",
    "member_association"
  ];

  // 0) Szybki strzał: dokument o ID = email (czasem ktoś tak importuje)
  if (normEmail) {
    const direct = firestoreGetDocument(`${USERS_OPENING_BALANCE}/${encodeURIComponent(normEmail)}`);
    if (direct && direct.fields) {
      const docId0 = String(direct.name || "").split("/").pop() || normEmail;
      const isMember0 = api_fs_getFirstBool_(direct.fields, MEMBER_KEYS);
      return { found: true, matchType: "email_docid", docId: docId0, isMember: isMember0 };
    }
  }

  // 1) Skan kolekcji (tylko raz na usera)
  const col = firestoreGetCollection(USERS_OPENING_BALANCE);
  const docs = (col && col.documents) ? col.documents : [];

  let byEmail = null;
  let byName = null;

  docs.forEach(d => {
    if (!d || !d.fields) return;
    const f = d.fields;

    const boEmail = String(api_fs_getFirstString_(f, EMAIL_KEYS) || "").trim().toLowerCase();
    const boImie = api_fs_getFirstString_(f, IMIE_KEYS);
    const boNazwisko = api_fs_getFirstString_(f, NAZWISKO_KEYS);

    const boNameKey = api_nameKey_(boImie, boNazwisko);

    if (!byEmail && normEmail && boEmail && boEmail === normEmail) byEmail = d;
    if (!byName && keyName && boNameKey && boNameKey === keyName) byName = d;
  });

  const hit = byEmail || byName;
  if (!hit || !hit.fields) return { found: false, matchType: "none", docId: "", isMember: false };

  const docId = String(hit.name || "").split("/").pop() || "";
  const isMember = api_fs_getFirstBool_(hit.fields, MEMBER_KEYS);

  return {
    found: true,
    matchType: byEmail ? "email" : "name",
    docId: docId,
    isMember: isMember
  };
}

/**
 * LOGIKA DECYZYJNA (Twoja)
 */
function api_decideRoleStatus_(match) {
  if (match && match.found === true) {
    if (match.isMember === true) return { rola: "Czlonek", status: "Aktywny" };
    return { rola: "Czlonek", status: "Zawieszony" };
  }
  return { rola: "Sympatyk", status: "pending" };
}

function api_register_from_firebase(e) {
  const data = api_readJsonBody_(e);

  const idToken = api_trim_(data.idToken);
  if (!idToken) throw new Error("VALIDATION: idToken is required");

  // weryfikacja tokena (funkcja z 67_auth_core.js)
  const tok = auth_verifyGoogleIdToken(idToken);
  if (!tok || tok.ok !== true) throw new Error("AUTH: invalid token");

  const email = api_trim_(data.email).toLowerCase();
  const imie = api_trim_(data.imie);
  const nazwisko = api_trim_(data.nazwisko);
  const ksywa = api_trim_(data.ksywa);
  const telefon = api_normPhone_(data.telefon);

  if (!email) throw new Error("VALIDATION: email is required");
  if (!imie) throw new Error("VALIDATION: imie is required");
  if (!nazwisko) throw new Error("VALIDATION: nazwisko is required");
  if (!telefon) throw new Error("VALIDATION: telefon is required");

  if (tok.email && String(tok.email).toLowerCase() !== email) {
    throw new Error("AUTH: token email mismatch");
  }

  // TYLKO RAZ: jeśli już jest users_active -> oddaj istniejące dane
  const existing = user_getActive(email);
  if (existing && existing.fields) {
    const f = existing.fields;
    const userExisting = {
      email: f.email?.stringValue || email,
      imie: f.imie?.stringValue || "",
      nazwisko: f.nazwisko?.stringValue || "",
      ksywa: f.ksywa?.stringValue || "",
      telefon: f.telefon?.stringValue || "",
      rola: f.rola?.stringValue || "",
      status: f.status?.stringValue || "",
      joinedAt: f.joinedAt?.stringValue || ""
    };

    userExisting.rola = api_roleDropdown_(userExisting.rola);
    userExisting.role = userExisting.rola;

    return json_({ ok: true, action: "register_from_firebase", already: true, user: userExisting });
  }

  const ob = api_openingBalance26_match_(email, imie, nazwisko);
  const decision = api_decideRoleStatus_(ob);

  const createdAtIso = api_trim_(data.createdAtIso) || new Date().toISOString();

  const userDoc = {
    email,
    imie,
    nazwisko,
    ksywa,
    telefon,

    rola: api_roleDropdown_(decision.rola),
    status: String(decision.status || "").trim(),

    createdAtIso,
    joinedAt: createdAtIso,

    openingBalanceChecked: true,
    openingBalanceMatch: ob.matchType,
    openingBalanceDocId: ob.docId || "",

    // kompatybilność dla frontu
    role: api_roleDropdown_(decision.rola)
  };

  // Firestore — musi się wykonać niezależnie od Sheets
  user_saveUser(userDoc);
  user_saveActive(userDoc);

  // Sheets — nie blokujemy rejestracji
  let sheetWarning = "";
  try {
    if (typeof usersSheet_upsertUser === "function") usersSheet_upsertUser(userDoc);
    else usersSheet_addUser(userDoc);
    SpreadsheetApp.flush();
  } catch (err) {
    sheetWarning = String(err && err.message ? err.message : err);
  }

  return json_({
    ok: true,
    action: "register_from_firebase",
    user: userDoc,
    openingBalance: { found: ob.found, matchType: ob.matchType, docId: ob.docId || "", isMember: ob.isMember === true },
    sheetWarning: sheetWarning
  });
}

function doPost(e) {
  try {
    // prefer: action w querystring
    let action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";

    // fallback: jeśli front nie dokleja ?action=..., a robi POST z JSONem
    // (wtedy rozpoznajemy po tym, że w body jest idToken)
    if (!action) {
      const body = api_readJsonBody_(e);
      if (body && body.idToken) action = "register_from_firebase";
    }

    if (!action) return json_({ ok: false, error: "NO_ACTION" });

    if (action === "register_from_firebase") return api_register_from_firebase(e);

    return json_({ ok: false, error: "UNKNOWN_ACTION", action: action });
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : "")
    });
  }
}

function doGet(e) {
  e = e || {};
  const p = e.parameter || {};
  const action = (p.action ? String(p.action) : "").trim();

  // healthcheck / ping
  if (!action) return json_({ ok: true, service: "api_router", ts: new Date().toISOString() });

  // jeśli ktoś próbuje robić GET jako "rejestrację" – zwracamy twardy błąd (żeby front nie widział {ok:true})
  return json_({
    ok: false,
    error: "GET_NOT_SUPPORTED_FOR_ACTION",
    action: action,
    hint: "Use POST with JSON body and action=register_from_firebase (or include idToken in body)."
  });
}
