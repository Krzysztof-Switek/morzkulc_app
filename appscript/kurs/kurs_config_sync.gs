/**
 * File: kurs_config_sync.gs
 * Purpose: sync zakładki "setup" → Firestore setup/vars_kurs
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Zakładka "setup" — wymagane kolumny:
 *   nazwa zmiennej | wartość | opis
 */

function syncKursConfigToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const vars = readKursSetupVars_();
  const nowIso = new Date().toISOString();

  firestoreCommitDocuments_([
    {
      docPath: DOC_VARS_KURS,
      data: {
        vars: vars,
        updatedAt: nowIso,
        updatedBy: who,
      },
    },
  ]);

  const durMs = new Date().getTime() - started.getTime();

  SpreadsheetApp.getUi().alert(
    "KURS CONFIG SYNC OK\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "zmiennych: " + Object.keys(vars).length + "\n" +
    "czas: " + durMs + " ms"
  );
}

/**
 * Czyta zakładkę "setup".
 * Kolumny: "nazwa zmiennej" | "wartość" | "opis"
 * Znormalizowane nagłówki: nazwa_zmiennej | wartosc | opis
 * Zwraca { varName: { type, value, description } }
 */
function readKursSetupVars_() {
  const ss = SpreadsheetApp.openById(CONFIG.KURS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_SETUP);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_SETUP + '" w arkuszu: ' + CONFIG.KURS_SHEET_ID);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  const h = values[0].map(function(x) { return normalizeHeader_(x); });
  const idxName = h.indexOf("nazwa_zmiennej");
  const idxVal  = h.indexOf("wartosc");
  const idxDesc = h.indexOf("opis");

  if (idxName === -1 || idxVal === -1 || idxDesc === -1) {
    throw new Error(
      'Zakładka "' + TAB_SETUP + '" — brak kolumn.' +
      ' Wymagane: "nazwa zmiennej", "wartość", "opis".' +
      " Znalezione: " + JSON.stringify(h)
    );
  }

  const out = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function(c) { return String(c || "").trim() === ""; })) continue;

    const nameRaw = toStringOrEmpty_(row[idxName]);
    if (!nameRaw) continue;

    const parsed = parseSetupValue_(row[idxVal]);
    const desc   = toStringOrEmpty_(row[idxDesc]);

    out[nameRaw] = {
      type:        parsed.type,
      value:       parsed.value,
      description: desc,
    };
  }

  return out;
}
