/** setup_sync.gs */

/**
 * Mapowanie ról na grupy Google Workspace.
 * Musi być zgodne z wartościami w setup_sync.gs skryptu członkowie sympatycy SKK.
 */
const ROLE_MAPPINGS = {
  rola_czlonek:  { label: "Członek",  groups: ["czlonkowie@morzkulc.pl"] },
  rola_zarzad:   { label: "Zarząd",   groups: ["zarzad_skk@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kr:       { label: "KR",       groups: ["kr@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kandydat: { label: "Kandydat", groups: ["kandydaci@morzkulc.pl"] },
  rola_sympatyk: { label: "Sympatyk", groups: ["sympatycy@morzkulc.pl"] },
  rola_kursant:  { label: "Kursant",  groups: [] },
};

const STATUS_MAPPINGS = {
  status_aktywny:    { label: "Aktywny",    blocksAccess: false },
  status_zawieszony: { label: "Zawieszony", blocksAccess: true  },
  status_pending:    { label: "Oczekujący", blocksAccess: false },
};

/**
 * Synchronizuje konfigurację setup do Firestore.
 * Czyta:
 *   - APP_SETUP (moduły aplikacji) — z arkusza członkowie sympatycy SKK
 *   - SETUP vars (zmienne członkowie) — z arkusza członkowie sympatycy SKK
 *   - SETUP vars (zmienne sprzęt) — z aktywnego arkusza sprzętu
 * Zapisuje:
 *   - setup/app, setup/vars_members, setup/vars_gear
 */
function syncSetupToFirestore() {
  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const appSetupModules = readAppSetupModules_();
  const membersVars = readSetupVars_(CONFIG.MEMBERS_SHEET_ID, TAB_SETUP);
  const gearVars = readSetupVars_(CONFIG.GEAR_SHEET_ID, TAB_SETUP);

  const nowIso = new Date().toISOString();

  const docApp = {
    modules: appSetupModules,
    roleMappings: ROLE_MAPPINGS,
    statusMappings: STATUS_MAPPINGS,
    updatedAt: nowIso,
    updatedBy: who,
  };

  const docMembersVars = {
    vars: membersVars,
    updatedAt: nowIso,
    updatedBy: who,
  };

  const docGearVars = {
    vars: gearVars,
    updatedAt: nowIso,
    updatedBy: who,
  };

  fsCommitDocuments_([
    { docPath: DOC_SETUP_APP, data: docApp },
    { docPath: DOC_VARS_MEMBERS, data: docMembersVars },
    { docPath: DOC_VARS_GEAR, data: docGearVars },
  ]);

  const durMs = new Date().getTime() - started.getTime();

  SpreadsheetApp.getUi().alert(
    "SETUP SYNC OK\n" +
    "env: " + CONFIG.ENV_NAME + "\n" +
    "user: " + who + "\n" +
    "modules (APP_SETUP): " + Object.keys(appSetupModules).length + "\n" +
    "vars_members: " + Object.keys(membersVars).length + "\n" +
    "vars_gear: " + Object.keys(gearVars).length + "\n" +
    "czas: " + durMs + " ms"
  );
}

/**
 * Czyta zakładkę APP_SETUP z arkusza członkowie sympatycy SKK.
 * Zwraca obiekt { moduleId: { label, enabled, access, ... } }.
 */
function readAppSetupModules_() {
  const ss = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_APP_SETUP);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_APP_SETUP + '" w arkuszu MEMBERS: ' + CONFIG.MEMBERS_SHEET_ID);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  const headerRow = values[0].map(function (h) { return normalizeHeader_(h); });
  const idx = function (name) { return headerRow.indexOf(name); };

  const required = [
    "typ_elementu",
    "id_elementu",
    "nazwa_wyswietlana",
    "aktywny",
    "ekran_domyslny",
    "kolejnosc",
    "dostep_zarzad_i_kr",
    "dostep_czlonek",
    "dostep_kandydat",
    "dostep_sympatyk",
    "dostep_kursant",
    "dostep_testowy_dla",
    "blokuj_dla",
    "opis",
  ];

  const missing = required.filter(function (h) { return idx(h) === -1; });
  if (missing.length) {
    throw new Error(
      "APP_SETUP — brak kolumn: " + JSON.stringify(missing) +
      " | znalezione: " + JSON.stringify(headerRow)
    );
  }

  const modules = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function (c) { return String(c || "").trim() === ""; })) continue;

    const typ = toStringOrEmpty_(row[idx("typ_elementu")]);
    if (String(typ || "").trim().toLowerCase() !== "moduł") continue;

    const id = toStringOrEmpty_(row[idx("id_elementu")]);
    if (!id) continue;

    const label = toStringOrEmpty_(row[idx("nazwa_wyswietlana")]);
    const defaultRoute = toStringOrEmpty_(row[idx("ekran_domyslny")]);
    const enabled = toBool_(row[idx("aktywny")]);
    const orderN = toNumberOrNull_(row[idx("kolejnosc")]);

    const accessRoles = rolesAllowedFromFlags_({
      zarzadKr: toBool_(row[idx("dostep_zarzad_i_kr")]),
      czlonek:  toBool_(row[idx("dostep_czlonek")]),
      kandydat: toBool_(row[idx("dostep_kandydat")]),
      sympatyk: toBool_(row[idx("dostep_sympatyk")]),
      kursant:  toBool_(row[idx("dostep_kursant")]),
    });

    const testUsersAllow = splitList_(toStringOrEmpty_(row[idx("dostep_testowy_dla")]));
    const usersBlock = splitList_(toStringOrEmpty_(row[idx("blokuj_dla")]));

    let mode = "off";
    if (enabled) mode = testUsersAllow.length ? "test" : "prod";

    const access = { mode: mode };
    if (accessRoles.length) access.rolesAllowed = accessRoles;
    if (testUsersAllow.length) access.testUsersAllow = testUsersAllow;
    if (usersBlock.length) access.usersBlock = usersBlock;

    const cfg = {
      label: label || id,
      enabled: enabled,
      access: access,
    };

    if (defaultRoute) cfg.defaultRoute = defaultRoute;
    if (orderN !== null) cfg.order = orderN;

    modules[id] = cfg;
  }

  return modules;
}

/**
 * Czyta zakładkę SETUP z dowolnego arkusza.
 * Zwraca obiekt { nazwa_zmiennej: { type, value, group, description } }.
 */
function readSetupVars_(sheetId, tabName) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sh = ss.getSheetByName(tabName);

  if (!sh) {
    throw new Error('Brak zakładki "' + tabName + '" w arkuszu: ' + sheetId);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  const h = values[0].map(function (x) { return normalizeHeader_(x); });
  const idxName  = h.indexOf("zmienna_nazwa");
  const idxVal   = h.indexOf("wartosc_zmiennej");
  const idxGroup = h.indexOf("grupa_zmiennych");
  const idxDesc  = h.indexOf("opis");

  if (idxName === -1 || idxVal === -1 || idxGroup === -1 || idxDesc === -1) {
    throw new Error(
      "SETUP — brak kolumn w arkuszu " + sheetId + " zakładka " + tabName +
      ". Znalezione: " + JSON.stringify(h)
    );
  }

  const out = {};
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function (c) { return String(c || "").trim() === ""; })) continue;

    const nameRaw = toStringOrEmpty_(row[idxName]);
    if (!nameRaw) continue;

    const valueCell  = row[idxVal];
    const groupRaw   = toStringOrEmpty_(row[idxGroup]);
    const descRaw    = toStringOrEmpty_(row[idxDesc]);
    const parsed     = parseSetupValue_(valueCell);

    out[nameRaw] = {
      type:        parsed.type,
      value:       parsed.value,
      group:       groupRaw || "",
      description: descRaw || "",
    };
  }

  return out;
}

// ====== HELPERS (używane przez setup_sync) ======

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
    .map(function (x) { return String(x || "").trim(); })
    .filter(function (x) { return x; });
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
  if (flags && flags.czlonek)  out.push("rola_czlonek");
  if (flags && flags.kandydat) out.push("rola_kandydat");
  if (flags && flags.sympatyk) out.push("rola_sympatyk");
  if (flags && flags.kursant)  out.push("rola_kursant");
  return out;
}
