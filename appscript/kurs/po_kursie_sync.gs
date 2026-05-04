/**
 * File: po_kursie_sync.gs
 * Purpose: sync zakładki "co po kursie" → Firestore setup/kurs_po_kursie
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Zakładka "co po kursie" — wymagane kolumny:
 *   tytuł | treść
 *
 * Cała lista jest zapisywana jako tablica w jednym dokumencie Firestore.
 * Każdy sync nadpisuje poprzednią zawartość (pełny replace).
 */

function syncPoKursieToFirestore() {
  assertBoardAccess_();

  const started = new Date();
  const who = String(Session.getActiveUser().getEmail() || "").toLowerCase();

  const items = readPoKursieFromSheet_();
  const nowIso = new Date().toISOString();

  firestoreCommitDocuments_([
    {
      docPath: DOC_KURS_PO_KURSIE,
      data: {
        items:     items,
        updatedAt: nowIso,
        updatedBy: who,
      },
    },
  ]);

  const durMs = new Date().getTime() - started.getTime();

  SpreadsheetApp.getUi().alert(
    "CO PO KURSIE SYNC OK\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "user: " + who + "\n" +
    "elementów: " + items.length + "\n" +
    "czas: " + durMs + " ms"
  );
}

/**
 * Czyta zakładkę "co po kursie".
 * Kolumny: "tytuł" | "treść"
 * Znormalizowane nagłówki: tytul | tresc
 * Zwraca [{ title, content, order }]
 */
function readPoKursieFromSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.KURS_SHEET_ID);
  const sh = ss.getSheetByName(TAB_PO_KURSIE);

  if (!sh) {
    throw new Error('Brak zakładki "' + TAB_PO_KURSIE + '" w arkuszu: ' + CONFIG.KURS_SHEET_ID);
  }

  const values = sh.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function(h) { return normalizeHeader_(h); });
  const idx = function(name) { return headers.indexOf(name); };

  // Znormalizowane nagłówki: tytul (z "tytuł"), tresc (z "treść")
  const required = ["tytul", "tresc"];
  const missing = required.filter(function(h) { return idx(h) === -1; });
  if (missing.length) {
    throw new Error(
      'Zakładka "' + TAB_PO_KURSIE + '" — brak kolumn: ' + JSON.stringify(missing) +
      ". Znalezione: " + JSON.stringify(headers)
    );
  }

  const out = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!row || row.every(function(c) { return String(c || "").trim() === ""; })) continue;

    const title   = toStringOrEmpty_(row[idx("tytul")]);
    const content = toStringOrEmpty_(row[idx("tresc")]);

    if (!title && !content) continue;

    out.push({
      title:   title,
      content: content,
      order:   out.length + 1,
    });
  }

  return out;
}
