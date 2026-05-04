/**
 * File: common_helpers.gs
 * Purpose: shared helpers for access control, parsing and Firestore REST
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

function toBool_(v) {
  if (typeof v === "boolean") return v;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "true" || s === "tak" || s === "1" || s === "yes";
}

function toNumberOrNull_(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function parseSetupValue_(cell) {
  if (isDateObject_(cell)) {
    return { type: "string", value: formatTimeHHMM_(cell) };
  }
  if (typeof cell === "boolean") return { type: "boolean", value: cell };
  if (typeof cell === "number" && isFinite(cell)) {
    return { type: "number", value: cell };
  }
  const s = String(cell == null ? "" : cell).trim();
  if (!s) return { type: "string", value: "" };
  const sLower = s.toLowerCase();
  if (sLower === "true" || sLower === "false") {
    return { type: "boolean", value: sLower === "true" };
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return { type: "number", value: Number(s) };
  }
  return { type: "string", value: s };
}

function isDateObject_(v) {
  return Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime());
}

function formatTimeHHMM_(dateObj) {
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "HH:mm");
}

function normalizeBoolish_(value) {
  if (typeof value === "boolean") return value;
  const s = String(value == null ? "" : value).trim().toLowerCase();
  if (!s) return false;
  if (s === "true" || s === "tak" || s === "yes" || s === "1") return true;
  if (s === "false" || s === "nie" || s === "no" || s === "0") return false;
  return false;
}

function normalizeDateString_(value) {
  if (value === null || value === undefined || value === "") return "";
  if (isDateObject_(value)) {
    const y = value.getFullYear();
    const m = ("0" + (value.getMonth() + 1)).slice(-2);
    const d = ("0" + value.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  return String(value).trim();
}

function normalizeEmail_(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
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

function setPathValue_(obj, path, value) {
  const parts = String(path || "").split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      current[key] = value;
      return;
    }
    if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
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

function firestorePatchDocument_(path, data) {
  const url = CONFIG.FIRESTORE_BASE_URL + "/" + path;
  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    contentType: "application/json",
    payload: JSON.stringify({ fields: toFirestoreFields_(data) }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  const text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Firestore PATCH failed (" + code + "): " + text);
  }
  return text;
}

function firestorePatchDocumentFields_(collection, docId, changedMap) {
  const fieldPaths = Object.keys(changedMap);
  const nestedData = {};
  for (let i = 0; i < fieldPaths.length; i++) {
    setPathValue_(nestedData, fieldPaths[i], changedMap[fieldPaths[i]]);
  }
  const query = fieldPaths
    .map(function(p) { return "updateMask.fieldPaths=" + encodeURIComponent(p); })
    .join("&");
  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + collection +
    "/" + encodeURIComponent(docId) +
    "?" + query;
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
      "Firestore partial PATCH failed (" + code + ") for " +
      collection + "/" + docId + ": " + text
    );
  }
  return text;
}

function firestoreCommitDocuments_(docs) {
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
    method: "POST",
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
  return text;
}

// ====== VALUE CONVERSION ======

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

function isIsoTimestamp_(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(String(s));
}

function firestoreFieldsToJs_(fields) {
  const out = {};
  Object.keys(fields || {}).forEach(function(k) {
    out[k] = firestoreValueToJs_(fields[k]);
  });
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

// ====== SERVICE JOBS ======

function enqueueServiceJob_(taskId, payload) {
  const jobId = taskId + ":" + new Date().getTime();
  const nowIso = new Date().toISOString();
  const doc = {
    taskId: taskId,
    status: "queued",
    attempts: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    nextRunAt: nowIso,
    lockOwner: null,
    lockedUntil: null,
    payload: payload || {},
  };
  firestoreCommitDocuments_([{ docPath: "service_jobs/" + jobId, data: doc }]);
}
