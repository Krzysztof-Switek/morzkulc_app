/**
 * File: setup_sync.gs
 * Purpose: manual setup sync from Sheets to Firestore
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

// Mapowanie ról na grupy Google Workspace.
// Zmień tu gdy zmienia się struktura grup — potem uruchom syncSetupToFirestore() lub initRoleMappings().
const ROLE_MAPPINGS = {
  rola_czlonek:  { label: "Członek",  groups: ["czlonkowie@morzkulc.pl"] },
  rola_zarzad:   { label: "Zarząd",   groups: ["zarzad_skk@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kr:       { label: "KR",       groups: ["kr@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kandydat: { label: "Kandydat", groups: ["kandydaci@morzkulc.pl"] },
  rola_sympatyk: { label: "Sympatyk", groups: ["sympatycy@morzkulc.pl"] },
  rola_kursant:  { label: "Kursant",  groups: [] },
};

// Mapowanie statusów kont — blocksAccess: true blokuje dostęp (np. konto zawieszone).
// Zmień tu gdy zmienia się polityka blokowania — potem uruchom syncSetupToFirestore().
const STATUS_MAPPINGS = {
  status_aktywny:    { label: "Aktywny",    blocksAccess: false },
  status_zawieszony: { label: "Zawieszony", blocksAccess: true  },
  status_pending:    { label: "Oczekujący", blocksAccess: false },
};

function syncSetupToFirestore() {
  assertBoardAccess_();

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

  firestoreCommitDocuments_([
    { docPath: DOC_SETUP_APP, data: docApp },
    { docPath: DOC_VARS_MEMBERS, data: docMembersVars },
    { docPath: DOC_VARS_GEAR, data: docGearVars },
  ]);

  const durMs = new Date().getTime() - started.getTime();

  SpreadsheetApp.getUi().alert(
    "SETUP SYNC OK ✅\n" +
      "env: " + ACTIVE_ENV + "\n" +
      "user: " + who + "\n" +
      "modules(APP_SETUP): " + Object.keys(appSetupModules).length + "\n" +
      "vars_members: " + Object.keys(membersVars).length + "\n" +
      "vars_gear: " + Object.keys(gearVars).length + "\n" +
      "time: " + durMs + " ms"
  );
}

function readAppSetupModules_() {
  const ss = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_APP_SETUP);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_APP_SETUP + '" w MEMBERS sheet');
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  const headerRow = values[0].map((h) => normalizeHeader_(h));
  const idx = (name) => headerRow.indexOf(name);

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

  const missing = required.filter((h) => idx(h) === -1);
  if (missing.length) {
    throw new Error(
      "APP_SETUP headers mismatch. Missing: " +
        JSON.stringify(missing) +
        " Found: " +
        JSON.stringify(headerRow)
    );
  }

  const modules = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every((c) => String(c || "").trim() === "")) continue;

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
      czlonek: toBool_(row[idx("dostep_czlonek")]),
      kandydat: toBool_(row[idx("dostep_kandydat")]),
      sympatyk: toBool_(row[idx("dostep_sympatyk")]),
      kursant: toBool_(row[idx("dostep_kursant")]),
    });

    const testUsersAllow = splitList_(
      toStringOrEmpty_(row[idx("dostep_testowy_dla")])
    );
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

// Jednorazowa funkcja — wpisuje tylko roleMappings do setup/app bez ruszania reszty dokumentu.
// Uruchom raz po wdrożeniu. Potem syncSetupToFirestore() zawsze zapisuje roleMappings automatycznie.
function initRoleMappings() {
  assertBoardAccess_();

  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + DOC_SETUP_APP +
    "?updateMask.fieldPaths=roleMappings";

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: JSON.stringify({
      fields: toFirestoreFields_({ roleMappings: ROLE_MAPPINGS }),
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("initRoleMappings failed (" + code + "): " + text);
  }

  SpreadsheetApp.getUi().alert(
    "ROLE MAPPINGS OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "roles: " + Object.keys(ROLE_MAPPINGS).join(", ")
  );
}

function readSetupVars_(sheetId, tabName) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sh = ss.getSheetByName(tabName);

  if (!sh) {
    throw new Error('Brak zakładki "' + tabName + '" w sheet: ' + sheetId);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  const h = values[0].map((x) => normalizeHeader_(x));
  const idxName = h.indexOf("zmienna_nazwa");
  const idxVal = h.indexOf("wartosc_zmiennej");
  const idxGroup = h.indexOf("grupa_zmiennych");
  const idxDesc = h.indexOf("opis");

  if (idxName === -1 || idxVal === -1 || idxGroup === -1 || idxDesc === -1) {
    throw new Error(
      "SETUP headers mismatch in sheet " +
        sheetId +
        " tab " +
        tabName +
        ". Found: " +
        JSON.stringify(h)
    );
  }

  const out = {};
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every((c) => String(c || "").trim() === "")) continue;

    const nameRaw = toStringOrEmpty_(row[idxName]);
    if (!nameRaw) continue;

    const valueCell = row[idxVal];
    const groupRaw = toStringOrEmpty_(row[idxGroup]);
    const descRaw = toStringOrEmpty_(row[idxDesc]);

    const parsed = parseSetupValue_(valueCell);

    out[nameRaw] = {
      type: parsed.type,
      value: parsed.value,
      group: groupRaw || "",
      description: descRaw || "",
    };
  }

  return out;
}