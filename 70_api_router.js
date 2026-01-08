/***************************************************
 * 70_api_router.js
 * Public API for Firebase-hosted frontend (web.app)
 *
 * FIX:
 * - rola zawsze w 100% zgodna z listą z arkusza: Zarząd, KR, Członek, Kandydat, Sympatyk
 * - błąd walidacji Sheets nie blokuje całej rejestracji (żeby Firestore w hostingu się zapisał)
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
  return "";
}

function api_fs_getFirstString_(fields, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = api_fs_getString_(fields, keys[i]);
    if (v !== "") return v;
  }
  return "";
}

/**
 * BO26 lookup: email OR imię+nazwisko
 * return: { found, matchType, docId, isMember }
 */
function api_openingBalance26_match_(email, imie, nazwisko) {
  const normEmail = String(email || "").trim().toLowerCase();
  const nameKey = api_nameKey_(imie, nazwisko);

  const col = firestoreGetCollection("users_opening_balance_26");
  const docs = (col && col.documents) ? col.documents : [];

  let byEmail = null;
  let byName = null;

  docs.forEach(function (d) {
    if (!d || !d.fields) return;
    const f = d.fields;

    const boEmail = String(api_fs_getFirstString_(f, [
      "e-mail", "email", "e_mail", "mail", "adres e-mail", "adres email", "adres_email"
    ]) || "").trim().toLowerCase();

    const boImie = api_fs_getFirstString_(f, ["Imię", "Imie", "imię", "imie", "first_name", "firstname"]);
    const boNazw = api_fs_getFirstString_(f, ["Nazwisko", "nazwisko", "last_name", "lastname"]);
    const boNameKey = api_nameKey_(boImie, boNazw);

    if (!byEmail && normEmail && boEmail && boEmail === normEmail) byEmail = d;
    if (!byName && nameKey && boNameKey && boNameKey === nameKey) byName = d;
  });

  const hit = byEmail || byName;
  if (!hit || !hit.fields) return { found: false, matchType: "none", docId: "", isMember: false };

  const docId = String(hit.name || "").split("/").pop() || "";
  const isMember =
    api_fs_getBool_(hit.fields, "członek stowarzyszenia") ||
    api_fs_getBool_(hit.fields, "czlonek stowarzyszenia") ||
    api_fs_getBool_(hit.fields, "czlonek_stowarzyszenia");

  return {
    found: true,
    matchType: byEmail ? "email" : "name",
    docId: docId,
    isMember: isMember
  };
}

/**
 * Zwraca wartości DOKŁADNIE zgodne z dropdownem w arkuszu.
 */
function api_decideRoleStatus_(match) {
  if (match && match.found === true) {
    if (match.isMember === true) return { rola: "Członek", status: "Aktywny" };
    return { rola: "Członek", status: "Zawieszony" };
  }
  return { rola: "Sympatyk", status: "Aktywny" };
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

    rola: decision.rola,
    status: decision.status,

    createdAtIso,
    joinedAt: createdAtIso,

    openingBalanceChecked: true,
    openingBalanceMatch: ob.matchType,
    openingBalanceDocId: ob.docId || "",

    // kompatybilność dla frontu
    role: decision.rola
  };

  // Firestore (Apps Script)
  user_saveUser(userDoc);
  user_saveActive(userDoc);

  // Sheets – jeśli poleci walidacja, NIE blokujemy całej rejestracji
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
    openingBalance: { found: ob.found, matchType: ob.matchType, docId: ob.docId || "" },
    sheetWarning: sheetWarning
  });
}

function doPost(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";
    if (!action) return json_({ ok: false, error: "NO_ACTION" });

    if (action === "register_from_firebase") return api_register_from_firebase(e);

    return json_({ ok: false, error: "UNKNOWN_ACTION", action });
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : "")
    });
  }
}

function doGet(e) {
  return json_({ ok: true, service: "api_router", ts: new Date().toISOString() });
}
