/** firestore_rest.gs */

/**
 * Pobiera jeden dokument z Firestore.
 * Zwraca { ok: true, doc } lub { ok: false, notFound: true } lub rzuca Error.
 */
function fsGetDoc_(collection, id) {
  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + encodeURIComponent(collection) +
    "/" + encodeURIComponent(id);

  const resp = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  if (code === 404) return { ok: false, notFound: true, doc: null };

  const text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Firestore GET failed (" + code + "): " + text);
  }

  return { ok: true, notFound: false, doc: JSON.parse(text) };
}

/**
 * Listuje dokumenty z kolekcji (z paginacją).
 * Zwraca { docs: [], nextPageToken: string|null }.
 */
function fsListDocs_(collection, pageSize, pageToken) {
  let url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + encodeURIComponent(collection) +
    "?pageSize=" + (pageSize || 200);

  if (pageToken) url += "&pageToken=" + encodeURIComponent(pageToken);

  const resp = UrlFetchApp.fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Firestore LIST failed (" + code + "): " + text);
  }

  const body = JSON.parse(text);
  return {
    docs: body.documents || [],
    nextPageToken: body.nextPageToken || null,
  };
}

/**
 * Patchuje wskazane pola dokumentu (updateMask — nie nadpisuje reszty).
 */
function fsPatchFields_(collection, id, patch) {
  const fieldPaths = Object.keys(patch);
  const maskParams = fieldPaths
    .map((f) => "updateMask.fieldPaths=" + encodeURIComponent(f))
    .join("&");

  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + encodeURIComponent(collection) +
    "/" + encodeURIComponent(id) +
    "?" + maskParams;

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    contentType: "application/json",
    payload: JSON.stringify({ fields: toFirestoreFields_(patch) }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Firestore PATCH fields failed (" + code + "): " + text);
  }

  return text;
}

/**
 * Upsertuje dokument (PATCH bez maski = nadpisuje cały dokument, tworzy jeśli brak).
 */
function fsUpsertDoc_(collection, id, payload) {
  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + encodeURIComponent(collection) +
    "/" + encodeURIComponent(id);

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    contentType: "application/json",
    payload: JSON.stringify({ fields: toFirestoreFields_(payload) }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Firestore UPSERT failed (" + code + "): " + text);
  }

  return text;
}

/**
 * Batch commit wielu dokumentów naraz.
 * docs: [{ docPath: "collection/id", data: {...} }, ...]
 */
function fsCommitDocuments_(docs) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(CONFIG.PROJECT_ID) +
    "/databases/(default)/documents:commit";

  const writes = docs.map(function (d) {
    return {
      update: {
        name:
          "projects/" +
          CONFIG.PROJECT_ID +
          "/databases/(default)/documents/" +
          d.docPath,
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
  Object.keys(obj || {}).forEach(function (k) {
    out[k] = toFirestoreValue_(obj[k]);
  });
  return out;
}

function toFirestoreValue_(v) {
  if (v === null || v === undefined) {
    return { nullValue: null };
  }

  // Date object → timestampValue
  if (Object.prototype.toString.call(v) === "[object Date]") {
    if (!isNaN(v.getTime())) return { timestampValue: v.toISOString() };
    return { nullValue: null };
  }

  if (typeof v === "boolean") return { booleanValue: v };

  if (typeof v === "number") {
    if (!isFinite(v)) return { stringValue: String(v) };
    if (Math.floor(v) === v) return { integerValue: String(v) };
    return { doubleValue: v };
  }

  if (typeof v === "string") {
    if (isIsoTimestamp_(v)) return { timestampValue: v };
    return { stringValue: v };
  }

  if (Array.isArray(v)) {
    return {
      arrayValue: { values: v.map(function (x) { return toFirestoreValue_(x); }) },
    };
  }

  if (typeof v === "object") {
    const fields = {};
    Object.keys(v).forEach(function (k) {
      fields[k] = toFirestoreValue_(v[k]);
    });
    return { mapValue: { fields: fields } };
  }

  return { stringValue: String(v) };
}

function isIsoTimestamp_(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(String(s));
}
