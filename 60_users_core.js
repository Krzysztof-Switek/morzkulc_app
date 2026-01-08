/********************************************************************
 * 60_users_core.js — centralny lookup użytkowników (FINAL + CLEAN STATE)
 *
 * POPRAWKA KLUCZOWA:
 * - ARCHIVED ma priorytet (bezpiecznie), ALE:
 *   - przy zapisie ACTIVE usuwamy rekord z ARCHIVED (reaktywacja)
 *   - przy zapisie ARCHIVED usuwamy rekord z ACTIVE
 *
 * FIX (BO26):
 * - Pole członkostwa w BO26 pochodzi z importu 1:1 i może nazywać się:
 *   "członek stowarzyszenia" / "czlonek stowarzyszenia" / "czlonek_stowarzyszenia"
 ********************************************************************/

const USERS_ACTIVE          = "users_active";
const USERS_OPENING_BALANCE = "users_opening_balance_26";
const USERS_ARCHIVED        = "users_archived";
const USERS                 = "users";

/************************************************************
 * FIRESTORE DELETE (bez zgadywania nazw funkcji w core)
 ************************************************************/
function _firestoreDeleteDoc_(docPath) {
  if (typeof firestoreDeleteDocument === "function") {
    return firestoreDeleteDocument(docPath);
  }
  if (typeof firestoreDelete === "function") {
    return firestoreDelete(docPath);
  }

  if (!CONFIG || !CONFIG.FIRESTORE_BASE_URL) {
    throw new Error("Brak CONFIG.FIRESTORE_BASE_URL — nie mogę wykonać DELETE");
  }

  const url = CONFIG.FIRESTORE_BASE_URL + "/" + docPath;

  const res = UrlFetchApp.fetch(url, {
    method: "delete",
    muteHttpExceptions: true,
    headers: { "Accept": "application/json" }
  });

  const code = res.getResponseCode();
  if (code === 200 || code === 204 || code === 404) return true;

  throw new Error("Firestore DELETE failed HTTP=" + code + " url=" + url + " body=" + res.getContentText());
}

/************************************************************
 * USERS (master collection)
 ************************************************************/
function user_saveUser(user) {
  const email = String(user && user.email || "").trim().toLowerCase();
  if (!email) throw new Error("user_saveUser: brak email");

  const path = `${USERS}/${encodeURIComponent(email)}`;
  firestorePatchDocument(path, { ...user, email }, Object.keys({ ...user, email }));
}

function user_getUser(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return null;

  const doc = firestoreGetDocument(`${USERS}/${encodeURIComponent(norm)}`);
  if (!doc) return null;
  return doc;
}

/************************************************************
 * ACTIVE
 ************************************************************/
function user_saveActive(user) {
  const email = String(user && user.email || "").trim().toLowerCase();
  if (!email) throw new Error("user_saveActive: brak email");

  const activePath = `${USERS_ACTIVE}/${encodeURIComponent(email)}`;
  firestorePatchDocument(activePath, { ...user, email }, Object.keys({ ...user, email }));

  const archivedPath = `${USERS_ARCHIVED}/${encodeURIComponent(email)}`;
  _firestoreDeleteDoc_(archivedPath);
}

function user_getActive(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return null;

  const doc = firestoreGetDocument(`${USERS_ACTIVE}/${encodeURIComponent(norm)}`);
  if (!doc) return null;
  return doc;
}

/************************************************************
 * ARCHIVED
 ************************************************************/
function user_saveArchived(user) {
  const email = String(user && user.email || "").trim().toLowerCase();
  if (!email) throw new Error("user_saveArchived: brak email");

  const archivedPath = `${USERS_ARCHIVED}/${encodeURIComponent(email)}`;
  firestorePatchDocument(archivedPath, { ...user, email }, Object.keys({ ...user, email }));

  const activePath = `${USERS_ACTIVE}/${encodeURIComponent(email)}`;
  _firestoreDeleteDoc_(activePath);
}

function user_getArchived(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return null;

  const doc = firestoreGetDocument(`${USERS_ARCHIVED}/${encodeURIComponent(norm)}`);
  if (!doc) return null;
  return doc;
}

/************************************************************
 * BO26
 ************************************************************/
function user_getOpeningBalance(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return null;

  const doc = firestoreGetDocument(`${USERS_OPENING_BALANCE}/${encodeURIComponent(norm)}`);
  if (!doc || !doc.fields) return null;
  return doc;
}

/************************************************************
 * BO26: odczyt boolean z różnych nazw pola
 ************************************************************/
function _bo26_isMember_(fields) {
  if (!fields) return false;

  // import 1:1 z nagłówków
  const a = fields["członek stowarzyszenia"];
  const b = fields["czlonek stowarzyszenia"];
  const c = fields["czlonek_stowarzyszenia"];

  const v = a || b || c;
  if (!v) return false;

  if (typeof v.booleanValue === "boolean") return v.booleanValue === true;
  if (typeof v.stringValue === "string") {
    const s = v.stringValue.trim().toLowerCase();
    return ["tak", "t", "true", "1", "yes", "y"].includes(s);
  }
  return false;
}

/************************************************************
 * user_findByEmail — PRIORYTET: ARCHIVED → ACTIVE → BO → NEW
 ************************************************************/
function user_findByEmail(emailRaw) {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return { type: "new", doc: null };

  const archived = user_getArchived(email);
  if (archived) return { type: "archived", doc: archived };

  const active = user_getActive(email);
  if (active) return { type: "active", doc: active };

  const bo = user_getOpeningBalance(email);
  if (bo && bo.fields) {
    const isMember = _bo26_isMember_(bo.fields);
    return { type: isMember ? "bo_member" : "bo_suspended", doc: bo };
  }

  return { type: "new", doc: null };
}
