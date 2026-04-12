/* global AdminDirectory */
/**
 * File: common_helpers.gs
 * Purpose: shared helpers for access control, parsing and Firestore REST (Kilometrówka)
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

// ====== ACCESS CONTROL ======

function assertBoardAccess_() {
  const email = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  if (!email) {
    throw new Error(
      "Brak email użytkownika. Uruchom Apps Script w przeglądarce, zalogowanym kontem Workspace."
    );
  }

  if (email === ADMIN_EMAIL) return;

  const isMember = isUserInGroup_(email, BOARD_GROUP_EMAIL);
  if (!isMember) {
    throw new Error("Brak uprawnień: tylko grupa " + BOARD_GROUP_EMAIL);
  }
}

function isUserInGroup_(userEmail, groupEmail) {
  const r = AdminDirectory.Members.hasMember(groupEmail, userEmail);
  return Boolean(r && r.isMember);
}

// ====== PARSERS ======

function normalizeHeader_(h) {
  const s = String(h == null ? "" : h).trim().toLowerCase();
  return s
    .split(" ").join("_")
    .split("-").join("_")
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z")
    .replace(/[^a-z0-9_]/g, "");
}

function toStringOrEmpty_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNumberOrNull_(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

// ====== FIRESTORE REST ======

function firestoreGetDocument_(path) {
  const url = CONFIG.FIRESTORE_BASE_URL + "/" + path;
  const resp = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  return resp.getResponseCode() === 200 ? JSON.parse(resp.getContentText()) : null;
}

/**
 * Wykonuje Firestore runQuery (structured query).
 * Zwraca tablicę dokumentów: [{docId, fields}] lub [].
 */
function firestoreRunQuery_(structuredQuery) {
  const url = CONFIG.FIRESTORE_BASE_URL + ":runQuery";

  const resp = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ structuredQuery: structuredQuery }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Firestore runQuery failed (" + code + "): " + text);
  }

  const data = JSON.parse(text);
  if (!data || !Array.isArray(data)) return [];

  const out = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || !item.document || !item.document.name) continue;
    const parts = item.document.name.split("/");
    out.push({
      docId: parts[parts.length - 1],
      fields: item.document.fields || {},
    });
  }
  return out;
}

/**
 * PATCH dokumentu z updateMask — aktualizuje tylko wybrane pola.
 * changedMap: { "fieldPath": value, ... }
 */
function firestorePatchDocumentFields_(collectionPath, docId, changedMap) {
  const fieldPaths = Object.keys(changedMap);
  if (!fieldPaths.length) return;

  const nestedData = {};
  for (let i = 0; i < fieldPaths.length; i++) {
    setPathValue_(nestedData, fieldPaths[i], changedMap[fieldPaths[i]]);
  }

  const query = fieldPaths
    .map(function(p) { return "updateMask.fieldPaths=" + encodeURIComponent(p); })
    .join("&");

  const url =
    CONFIG.FIRESTORE_BASE_URL + "/" +
    collectionPath + "/" +
    encodeURIComponent(docId) + "?" + query;

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: toFirestoreFields_(nestedData) }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(
      "Firestore PATCH failed (" + code + ") for " + collectionPath + "/" + docId + ": " + text
    );
  }
}

/**
 * Batch commit dokumentów do Firestore.
 * docs: [{docPath: "collection/id", data: {field: value}}]
 * Max 500 per call.
 */
function firestoreCommitDocuments_(docs) {
  if (!docs || !docs.length) return;

  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(CONFIG.PROJECT_ID) +
    "/databases/(default)/documents:commit";

  const writes = docs.map(function(d) {
    return {
      update: {
        name:
          "projects/" + CONFIG.PROJECT_ID +
          "/databases/(default)/documents/" + d.docPath,
        fields: toFirestoreFields_(d.data),
      },
    };
  });

  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ writes: writes }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Firestore commit failed (" + code + "): " + text);
  }
}

// ====== FIRESTORE TYPE CONVERSIONS ======

function toFirestoreFields_(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(function(k) {
    out[k] = toFirestoreValue_(obj[k]);
  });
  return out;
}

function toFirestoreValue_(v) {
  if (v === null || v === undefined) return { nullValue: null };

  if (typeof v === "string") {
    if (isIsoTimestamp_(v)) return { timestampValue: v };
    return { stringValue: v };
  }

  if (typeof v === "boolean") return { booleanValue: v };

  if (typeof v === "number") {
    if (!isFinite(v)) return { stringValue: String(v) };
    if (Math.floor(v) === v) return { integerValue: String(v) };
    return { doubleValue: v };
  }

  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(function(x) { return toFirestoreValue_(x); }) } };
  }

  if (typeof v === "object") {
    const fields = {};
    Object.keys(v).forEach(function(k) { fields[k] = toFirestoreValue_(v[k]); });
    return { mapValue: { fields: fields } };
  }

  return { stringValue: String(v) };
}

function firestoreFieldsToJs_(fields) {
  const out = {};
  const keys = Object.keys(fields || {});
  for (let i = 0; i < keys.length; i++) {
    out[keys[i]] = firestoreValueToJs_(fields[keys[i]]);
  }
  return out;
}

function firestoreValueToJs_(node) {
  if (!node || typeof node !== "object") return null;

  if (Object.prototype.hasOwnProperty.call(node, "stringValue")) return node.stringValue;
  if (Object.prototype.hasOwnProperty.call(node, "integerValue")) {
    const n = Number(node.integerValue);
    return isFinite(n) ? n : node.integerValue;
  }
  if (Object.prototype.hasOwnProperty.call(node, "doubleValue")) return Number(node.doubleValue);
  if (Object.prototype.hasOwnProperty.call(node, "booleanValue")) return Boolean(node.booleanValue);
  if (Object.prototype.hasOwnProperty.call(node, "timestampValue")) return node.timestampValue;
  if (Object.prototype.hasOwnProperty.call(node, "nullValue")) return null;
  if (node.mapValue && node.mapValue.fields) return firestoreFieldsToJs_(node.mapValue.fields);
  if (node.arrayValue && Array.isArray(node.arrayValue.values)) {
    return node.arrayValue.values.map(function(x) { return firestoreValueToJs_(x); });
  }
  return null;
}

function isIsoTimestamp_(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(String(s));
}

// ====== OBJECT PATH HELPERS ======

function setPathValue_(obj, path, value) {
  const parts = String(path || "").split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) { current[key] = value; return; }
    if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
}

function getPathValue_(obj, path) {
  const parts = String(path || "").split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = current[parts[i]];
  }
  return current;
}

// ====== SERVICE JOBS ======

function enqueueServiceJob_(taskId, payload) {
  const jobId = taskId + ":" + new Date().getTime();
  const nowIso = new Date().toISOString();
  firestoreCommitDocuments_([{
    docPath: "service_jobs/" + jobId,
    data: {
      taskId: taskId,
      status: "queued",
      attempts: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      nextRunAt: nowIso,
      lockOwner: null,
      lockedUntil: null,
      payload: payload || {},
    },
  }]);
}
