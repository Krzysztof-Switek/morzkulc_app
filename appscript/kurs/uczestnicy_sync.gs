/**
 * File: uczestnicy_sync.gs
 * Purpose: sync zakładki "uczestnicy" → Firestore kurs_uczestnicy/{email}
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Zakładka "uczestnicy" — wymagane kolumny:
 *   Imię | Nazwisko | e-mail | Opłata | PESEL | Telefon | waga | wzrost
 *
 * ID dokumentu Firestore = znormalizowany email (unikalny per uczestnik).
 * Sync tworzy nowe dokumenty lub patchuje tylko zmienione pola.
 */

function syncUczestnicyToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const rows = readUczestnicyForSync_();

  let createdCount   = 0;
  let updatedCount   = 0;
  let unchangedCount = 0;
  const changedSummaries = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const uczestnik = rows[i];
    const docId = uczestnik.docId;

    try {
      const existingRaw = firestoreGetDocument_(COLLECTION_KURS_UCZESTNICY + "/" + docId);

      if (!existingRaw || !existingRaw.fields) {
        const nowIso = new Date().toISOString();
        firestorePatchDocument_(
          COLLECTION_KURS_UCZESTNICY + "/" + docId,
          Object.assign({}, uczestnik.data, {
            createdAt:     nowIso,
            updatedAt:     nowIso,
            sheetSyncedAt: nowIso,
          })
        );
        createdCount++;
        changedSummaries.push("email=" + docId + " → created");
        continue;
      }

      const existing = firestoreFieldsToJs_(existingRaw.fields || {});
      const diff = buildUczestnikDiff_(uczestnik.data, existing);
      const changedPaths = Object.keys(diff);

      if (!changedPaths.length) {
        unchangedCount++;
        continue;
      }

      diff.updatedAt     = new Date().toISOString();
      diff.sheetSyncedAt = new Date().toISOString();
      diff.updatedBy     = who;

      firestorePatchDocumentFields_(COLLECTION_KURS_UCZESTNICY, docId, diff);
      updatedCount++;
      changedSummaries.push("email=" + docId + " → " + changedPaths.join(", "));

    } catch (e) {
      errors.push("email=" + docId + ": " + String(e.message || e));
    }
  }

  const durMs = new Date().getTime() - started.getTime();

  let msg =
    "UCZESTNICY SYNC " + (errors.length === 0 ? "OK" : "Z BŁĘDAMI") + "\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "wierszy wczytano: " + rows.length + "\n" +
    "nowych: " + createdCount + "\n" +
    "zaktualizowanych: " + updatedCount + "\n" +
    "bez zmian: " + unchangedCount + "\n" +
    "błędy: " + errors.length + "\n" +
    "czas: " + durMs + " ms";

  if (changedSummaries.length) {
    msg += "\n\nZmienione rekordy:\n" + changedSummaries.slice(0, 20).join("\n");
    if (changedSummaries.length > 20) {
      msg += "\n... +" + (changedSummaries.length - 20) + " kolejnych";
    }
  }

  if (errors.length) {
    msg += "\n\nBłędy:\n" + errors.slice(0, 10).join("\n");
  }

  SpreadsheetApp.getUi().alert(msg);
}

function readUczestnicyForSync_() {
  const ss = SpreadsheetApp.openById(CONFIG.KURS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_UCZESTNICY);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_UCZESTNICY + '" w arkuszu: ' + CONFIG.KURS_SHEET_ID);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function(h) { return normalizeHeader_(h); });
  const idx = function(name) { return headers.indexOf(name); };

  // Znormalizowane nagłówki: imie, nazwisko, e_mail, oplata, pesel, telefon, waga, wzrost
  const required = ["imie", "nazwisko", "e_mail"];
  const missing = required.filter(function(h) { return idx(h) === -1; });
  if (missing.length) {
    throw new Error(
      'Zakładka "' + TAB_UCZESTNICY + '" — brak kolumn: ' + JSON.stringify(missing) +
      ". Znalezione: " + JSON.stringify(headers)
    );
  }

  const out = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function(c) { return String(c || "").trim() === ""; })) continue;

    const email = normalizeEmail_(idx("e_mail") !== -1 ? row[idx("e_mail")] : "");
    if (!email) {
      throw new Error(
        "Brak e-mail w wierszu " + (r + 1) + ". Kolumna e-mail jest wymagana jako identyfikator."
      );
    }

    const feeRaw    = idx("oplata")  !== -1 ? row[idx("oplata")]  : null;
    const weightRaw = idx("waga")    !== -1 ? row[idx("waga")]    : null;
    const heightRaw = idx("wzrost")  !== -1 ? row[idx("wzrost")]  : null;

    out.push({
      docId: email,
      data: {
        firstName: toStringOrEmpty_(idx("imie")     !== -1 ? row[idx("imie")]     : ""),
        lastName:  toStringOrEmpty_(idx("nazwisko") !== -1 ? row[idx("nazwisko")] : ""),
        email:     email,
        fee:       toNumberOrNull_(feeRaw),
        pesel:     toStringOrEmpty_(idx("pesel")    !== -1 ? row[idx("pesel")]    : ""),
        phone:     toStringOrEmpty_(idx("telefon")  !== -1 ? row[idx("telefon")]  : ""),
        weight:    toNumberOrNull_(weightRaw),
        height:    toNumberOrNull_(heightRaw),
      },
    });
  }

  return out;
}

function buildUczestnikDiff_(sheetData, firestoreData) {
  const diff = {};

  const fields = ["firstName", "lastName", "email", "pesel", "phone"];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (normalizeComparable_(sheetData[f]) !== normalizeComparable_(firestoreData[f])) {
      diff[f] = sheetData[f];
    }
  }

  const numFields = ["fee", "weight", "height"];
  for (let i = 0; i < numFields.length; i++) {
    const f = numFields[i];
    const sheetVal = sheetData[f];
    const fsVal    = firestoreData[f];
    const sheetNum = sheetVal !== null && sheetVal !== undefined ? Number(sheetVal) : null;
    const fsNum    = fsVal    !== null && fsVal    !== undefined ? Number(fsVal)    : null;
    if (sheetNum !== fsNum) {
      diff[f] = sheetVal;
    }
  }

  return diff;
}

function normalizeComparable_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
