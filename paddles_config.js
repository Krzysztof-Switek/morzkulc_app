/**
 * Pobiera wiosła z arkusza → tablica obiektów JS
 * PRIMARY KEY = kolumna A (ID)
 */
function getPaddlesConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(PADDLES_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + PADDLES_SHEET_NAME);

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  const paddles = rows
    .filter(r => Boolean(r[PADDLES_COLUMNS.ID - 1]))
    .map(rowToPaddleObject);

  Logger.log("Wiosła (paddles) z arkusza: " + paddles.length);
  return paddles;
}

/** Mapowanie wiersza arkusza → obiekt paddle */
function rowToPaddleObject(row) {

  const id = row[PADDLES_COLUMNS.ID - 1];

  return {
    id: id,
    firestoreId: String(id), // stałe, deterministyczne docID

    numer:     row[PADDLES_COLUMNS.NUMER - 1] || "",
    producent: row[PADDLES_COLUMNS.PRODUCENT - 1] || "",
    model:     row[PADDLES_COLUMNS.MODEL - 1] || "",
    rodzaj:    row[PADDLES_COLUMNS.RODZAJ - 1] || "",
    dlugosc:   row[PADDLES_COLUMNS.DLUGOSC - 1] || "",
    skladane:  row[PADDLES_COLUMNS.SKLADANE - 1] === true,
    basen:     row[PADDLES_COLUMNS.BASEN - 1] === true,
    uwagi:     row[PADDLES_COLUMNS.UWAGI - 1] || "",
  };
}
