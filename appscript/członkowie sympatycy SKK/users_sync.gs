/**
 * File: users_sync.gs
 * Purpose: manual users sync from Google Sheets to Firestore
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Rules:
 * - Sheet column "ID" is treated as memberId
 * - Firestore document is found by users_active where memberId == sheet ID
 * - Sync updates ONLY fields that changed
 * - Sync NEVER overwrites the whole Firestore document
 * - All other Firestore fields remain untouched
 */

function syncUsersToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const sheetUsers = readUsersForSync_();

  let foundCount = 0;
  let changedCount = 0;
  let unchangedCount = 0;
  let patchedCount = 0;
  let roleStatusChangedCount = 0;

  const missingUsers = [];
  const changedSummaries = [];

  for (let i = 0; i < sheetUsers.length; i++) {
    const sheetUser = sheetUsers[i];

    const firestoreRecord = findUserDocumentByMemberId_(sheetUser.memberId);
    if (!firestoreRecord || !firestoreRecord.docId) {
      missingUsers.push(String(sheetUser.memberId));
      continue;
    }

    foundCount++;

    // Sprawdź zmiany roli/statusu osobno — będą obsłużone przez Cloud Function
    const currentRoleKey = String(firestoreRecord.data.role_key || "");
    const currentStatusKey = String(firestoreRecord.data.status_key || "");
    const roleChanged = sheetUser.role_key && sheetUser.role_key !== currentRoleKey;
    const statusChanged = sheetUser.status_key && sheetUser.status_key !== currentStatusKey;
    if (roleChanged || statusChanged) roleStatusChangedCount++;

    // Patch tylko pól innych niż role_key/status_key — te obsługuje Cloud Function
    const diff = buildUserDiff_(sheetUser, firestoreRecord.data);
    const changedPaths = Object.keys(diff);

    if (!changedPaths.length && !roleChanged && !statusChanged) {
      unchangedCount++;
      continue;
    }

    if (changedPaths.length) {
      patchFirestoreUserFields_(firestoreRecord.docId, diff, who);
      patchedCount++;
    }

    changedCount++;

    const allChanges = [...changedPaths];
    if (roleChanged) allChanges.push("role_key (" + currentRoleKey + " → " + sheetUser.role_key + ")");
    if (statusChanged) allChanges.push("status_key (" + currentStatusKey + " → " + sheetUser.status_key + ")");

    changedSummaries.push(
      "memberId=" + sheetUser.memberId + " → " + allChanges.join(", ")
    );
  }

  // Jeśli wykryto zmiany roli/statusu — wyzwól Cloud Function przez service_jobs
  if (roleStatusChangedCount > 0) {
    enqueueServiceJob_("users.syncRolesFromSheet", {});
  }

  const durMs = new Date().getTime() - started.getTime();

  let msg =
    "USERS SYNC OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "rows read: " + sheetUsers.length + "\n" +
    "users found in Firestore: " + foundCount + "\n" +
    "changed rows: " + changedCount + "\n" +
    "unchanged rows: " + unchangedCount + "\n" +
    "rows patched: " + patchedCount + "\n" +
    (roleStatusChangedCount > 0 ? "role/status changes → job enqueued (" + roleStatusChangedCount + " users)\n" : "") +
    "time: " + durMs + " ms";

  if (missingUsers.length) {
    msg +=
      "\n\nNie znaleziono dokumentu users_active dla memberId:\n" +
      missingUsers.join(", ");
  }

  if (changedSummaries.length) {
    msg +=
      "\n\nZmienione pola:\n" +
      changedSummaries.slice(0, 20).join("\n");
    if (changedSummaries.length > 20) {
      msg += "\n... +" + (changedSummaries.length - 20) + " kolejnych";
    }
  }

  SpreadsheetApp.getUi().alert(msg);
}

function readUsersForSync_() {
  const ss = SpreadsheetApp.openById(CONFIG.USERS_SPREADSHEET_ID);
  const sh = ss.getSheetByName(TAB_USERS);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_USERS + '" w arkuszu users');
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map((h) => normalizeHeader_(h));
  const idx = (name) => headers.indexOf(name);

  const required = [
    "id",
    "ksywa",
    "imie",
    "nazwisko",
    "telefon",
    "e_mail",
    "data_urodzenia",
    "rok_szkoleniowki",
    "wpisowe_rok",
    "klucze_do_siedziby",
    "rola",
    "status",
    "blacha",
    "uwagi",
    "zgody_rodo",
    "skladki",
    "godzinki"
  ];

  const missing = required.filter((h) => idx(h) === -1);
  if (missing.length) {
    throw new Error(
      "Users sheet headers mismatch. Missing: " +
        JSON.stringify(missing) +
        " Found: " +
        JSON.stringify(headers)
    );
  }

  const out = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every((c) => String(c || "").trim() === "")) continue;

    const memberIdRaw = toStringOrEmpty_(row[idx("id")]);
    if (!memberIdRaw) continue;

    const memberId = Number(memberIdRaw);
    if (!isFinite(memberId)) {
      throw new Error(
        'Nieprawidłowe ID/memberId w wierszu ' +
          (r + 1) +
          ': "' +
          memberIdRaw +
          '"'
      );
    }

    const roleDisplay = toStringOrEmpty_(row[idx("rola")]);
    const statusDisplay = toStringOrEmpty_(row[idx("status")]);

    const roleKey = mapRoleDisplayToKey_(roleDisplay);
    const statusKey = mapStatusDisplayToKey_(statusDisplay);

    if (!roleKey) {
      throw new Error(
        'Nieznana rola w wierszu ' + (r + 1) + ': "' + roleDisplay + '"'
      );
    }

    if (!statusKey) {
      throw new Error(
        'Nieznany status w wierszu ' + (r + 1) + ': "' + statusDisplay + '"'
      );
    }

    out.push({
      memberId: memberId,

      // managed fields from sheet
      email: normalizeEmail_(row[idx("e_mail")]),

      profile: {
        nickname: normalizeString_(row[idx("ksywa")]),
        firstName: normalizeString_(row[idx("imie")]),
        lastName: normalizeString_(row[idx("nazwisko")]),
        phone: normalizeString_(row[idx("telefon")]),
        dateOfBirth: normalizeDateString_(row[idx("data_urodzenia")]),
        consentRodo: normalizeBoolish_(row[idx("zgody_rodo")]),
      },

      admin: {
        schoolYear: normalizeString_(row[idx("rok_szkoleniowki")]),
        entryFeeYear: normalizeString_(row[idx("wpisowe_rok")]),
        hasClubKeys: normalizeBoolish_(row[idx("klucze_do_siedziby")]),
        badge: normalizeString_(row[idx("blacha")]),
        notes: normalizeString_(row[idx("uwagi")]),
        contributions: normalizeString_(row[idx("skladki")]),
        hours: normalizeString_(row[idx("godzinki")]),
      },

      role_key: roleKey,
      status_key: statusKey,
    });
  }

  return out;
}

function findUserDocumentByMemberId_(memberId) {
  const url = CONFIG.FIRESTORE_BASE_URL + ":runQuery";

  const payload = {
    structuredQuery: {
      from: [{ collectionId: "users_active" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "memberId" },
          op: "EQUAL",
          value: { integerValue: String(memberId) },
        },
      },
      limit: 1,
    },
  };

  const resp = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(
      "Firestore runQuery failed (" +
        code +
        ") for memberId=" +
        memberId +
        ": " +
        text
    );
  }

  const data = JSON.parse(text);
  if (!data || !data.length) return null;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || !item.document || !item.document.name) continue;

    const fullName = item.document.name;
    const parts = fullName.split("/");
    const docId = parts[parts.length - 1];
    const fields = item.document.fields || {};

    return {
      docId: docId,
      data: firestoreFieldsToJs_(fields),
    };
  }

  return null;
}

function buildUserDiff_(sheetUser, firestoreUser) {
  const diff = {};

  // root fields (role_key i status_key są obsługiwane przez Cloud Function — nie patchujemy tu)
  addChangedPathIfNeeded_(diff, "email", sheetUser.email, getPathValue_(firestoreUser, "email"));

  // profile fields
  addChangedPathIfNeeded_(diff, "profile.nickname", sheetUser.profile.nickname, getPathValue_(firestoreUser, "profile.nickname"));
  addChangedPathIfNeeded_(diff, "profile.firstName", sheetUser.profile.firstName, getPathValue_(firestoreUser, "profile.firstName"));
  addChangedPathIfNeeded_(diff, "profile.lastName", sheetUser.profile.lastName, getPathValue_(firestoreUser, "profile.lastName"));
  addChangedPathIfNeeded_(diff, "profile.phone", sheetUser.profile.phone, getPathValue_(firestoreUser, "profile.phone"));
  addChangedPathIfNeeded_(diff, "profile.dateOfBirth", sheetUser.profile.dateOfBirth, getPathValue_(firestoreUser, "profile.dateOfBirth"));
  addChangedPathIfNeeded_(diff, "profile.consentRodo", sheetUser.profile.consentRodo, getPathValue_(firestoreUser, "profile.consentRodo"));

  // admin fields
  addChangedPathIfNeeded_(diff, "admin.schoolYear", sheetUser.admin.schoolYear, getPathValue_(firestoreUser, "admin.schoolYear"));
  addChangedPathIfNeeded_(diff, "admin.entryFeeYear", sheetUser.admin.entryFeeYear, getPathValue_(firestoreUser, "admin.entryFeeYear"));
  addChangedPathIfNeeded_(diff, "admin.hasClubKeys", sheetUser.admin.hasClubKeys, getPathValue_(firestoreUser, "admin.hasClubKeys"));
  addChangedPathIfNeeded_(diff, "admin.badge", sheetUser.admin.badge, getPathValue_(firestoreUser, "admin.badge"));
  addChangedPathIfNeeded_(diff, "admin.notes", sheetUser.admin.notes, getPathValue_(firestoreUser, "admin.notes"));
  addChangedPathIfNeeded_(diff, "admin.contributions", sheetUser.admin.contributions, getPathValue_(firestoreUser, "admin.contributions"));
  addChangedPathIfNeeded_(diff, "admin.hours", sheetUser.admin.hours, getPathValue_(firestoreUser, "admin.hours"));

  return diff;
}

function addChangedPathIfNeeded_(diff, path, nextValue, currentValue) {
  if (!valuesEqualForSync_(nextValue, currentValue)) {
    diff[path] = nextValue;
  }
}

function valuesEqualForSync_(a, b) {
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b);
  }
  return normalizeComparable_(a) === normalizeComparable_(b);
}

function normalizeComparable_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
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

function patchFirestoreUserFields_(docId, changedMap, who) {
  const changedWithAudit = {};
  const keys = Object.keys(changedMap);

  for (let i = 0; i < keys.length; i++) {
    changedWithAudit[keys[i]] = changedMap[keys[i]];
  }

  changedWithAudit["updatedAt"] = new Date().toISOString();
  changedWithAudit["updatedBy"] = who;

  const nestedData = {};
  const fieldPaths = Object.keys(changedWithAudit);

  for (let i = 0; i < fieldPaths.length; i++) {
    setPathValue_(nestedData, fieldPaths[i], changedWithAudit[fieldPaths[i]]);
  }

  const query = fieldPaths
    .map((path) => "updateMask.fieldPaths=" + encodeURIComponent(path))
    .join("&");

  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/users_active/" +
    encodeURIComponent(docId) +
    "?" +
    query;

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: JSON.stringify({
      fields: toFirestoreFields_(nestedData),
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(
      "Firestore partial PATCH failed (" +
        code +
        ") for docId=" +
        docId +
        ": " +
        text
    );
  }

  return text;
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

  if (Object.prototype.hasOwnProperty.call(node, "stringValue")) {
    return node.stringValue;
  }

  if (Object.prototype.hasOwnProperty.call(node, "integerValue")) {
    const raw = node.integerValue;
    const n = Number(raw);
    return isFinite(n) ? n : raw;
  }

  if (Object.prototype.hasOwnProperty.call(node, "doubleValue")) {
    return Number(node.doubleValue);
  }

  if (Object.prototype.hasOwnProperty.call(node, "booleanValue")) {
    return Boolean(node.booleanValue);
  }

  if (Object.prototype.hasOwnProperty.call(node, "timestampValue")) {
    return node.timestampValue;
  }

  if (Object.prototype.hasOwnProperty.call(node, "nullValue")) {
    return null;
  }

  if (node.mapValue && node.mapValue.fields) {
    return firestoreFieldsToJs_(node.mapValue.fields);
  }

  if (node.arrayValue && Array.isArray(node.arrayValue.values)) {
    return node.arrayValue.values.map((x) => firestoreValueToJs_(x));
  }

  return null;
}

function mapRoleDisplayToKey_(label) {
  const s = String(label || "").trim().toLowerCase();

  if (s === "zarząd" || s === "zarzad") return "rola_zarzad";
  if (s === "kr") return "rola_kr";
  if (s === "członek" || s === "czlonek") return "rola_czlonek";
  if (s === "kandydat") return "rola_kandydat";
  if (s === "sympatyk") return "rola_sympatyk";
  if (s === "kursant") return "rola_kursant";

  return "";
}

function mapStatusDisplayToKey_(label) {
  const s = String(label || "").trim().toLowerCase();

  if (s === "aktywny") return "status_aktywny";
  if (s === "zawieszony") return "status_zawieszony";
  if (s === "skreślony" || s === "skreslony") return "status_skreslony";

  return "";
}

function normalizeString_(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeEmail_(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function normalizeDateString_(value) {
  if (value === null || value === undefined || value === "") return "";

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = ("0" + (value.getMonth() + 1)).slice(-2);
    const d = ("0" + value.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }

  return String(value).trim();
}

function normalizeBoolish_(value) {
  if (typeof value === "boolean") return value;

  const s = String(value == null ? "" : value).trim().toLowerCase();

  if (!s) return false;
  if (s === "true" || s === "tak" || s === "yes" || s === "1") return true;
  if (s === "false" || s === "nie" || s === "no" || s === "0") return false;

  return false;
}