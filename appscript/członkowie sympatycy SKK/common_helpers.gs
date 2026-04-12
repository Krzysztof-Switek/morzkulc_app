/* global AdminDirectory */
/**
 * File: common_helpers.gs
 * Purpose: shared helpers for access, parsing and Firestore REST
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

function splitList_(s) {
  const raw = String(s || "").trim();
  if (!raw) return [];

  const parts = raw
    .split(/[,;\n]/g)
    .map((x) => String(x || "").trim())
    .filter((x) => x);

  const seen = {};
  const out = [];

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i].toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(parts[i]);
  }

  return out;
}

function rolesAllowedFromFlags_(flags) {
  const out = [];

  if (flags && flags.zarzadKr) {
    out.push("rola_zarzad");
    out.push("rola_kr");
  }
  if (flags && flags.czlonek) out.push("rola_czlonek");
  if (flags && flags.kandydat) out.push("rola_kandydat");
  if (flags && flags.sympatyk) out.push("rola_sympatyk");
  if (flags && flags.kursant) out.push("rola_kursant");

  return out;
}

// ====== FIRESTORE REST ======
function firestoreGetDocument_(path) {
  const url = CONFIG.FIRESTORE_BASE_URL + "/" + path;

  const resp = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    muteHttpExceptions: true,
  });

  return resp.getResponseCode() === 200 ? JSON.parse(resp.getContentText()) : null;
}

function firestorePatchDocument_(path, data) {
  const url = CONFIG.FIRESTORE_BASE_URL + "/" + path;

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    contentType: "application/json",
    payload: JSON.stringify({
      fields: toFirestoreFields_(data),
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Firestore PATCH failed (" + code + "): " + text);
  }

  return text;
}

function firestoreCommitDocuments_(docs) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(CONFIG.PROJECT_ID) +
    "/databases/(default)/documents:commit";

  const writes = docs.map((d) => ({
    update: {
      name:
        "projects/" +
        CONFIG.PROJECT_ID +
        "/databases/(default)/documents/" +
        d.docPath,
      fields: toFirestoreFields_(d.data),
    },
  }));

  const payload = JSON.stringify({ writes: writes });

  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    muteHttpExceptions: true,
    payload: payload,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Firestore commit failed (" + code + "): " + text);
  }

  return text;
}

function toFirestoreFields_(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    out[k] = toFirestoreValue_(obj[k]);
  });
  return out;
}

function toFirestoreValue_(v) {
  if (v === null || v === undefined) {
    return { nullValue: null };
  }

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
    return {
      arrayValue: {
        values: v.map((x) => toFirestoreValue_(x)),
      },
    };
  }

  if (typeof v === "object") {
    const fields = {};
    Object.keys(v).forEach((k) => {
      fields[k] = toFirestoreValue_(v[k]);
    });
    return { mapValue: { fields: fields } };
  }

  return { stringValue: String(v) };
}

function isIsoTimestamp_(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(String(s));
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

  firestoreCommitDocuments_([
    { docPath: "service_jobs/" + jobId, data: doc },
  ]);
}