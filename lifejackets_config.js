function getLifejacketsConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(LIFEJACKETS_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + LIFEJACKETS_SHEET_NAME);

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  const lifejackets = rows
    .filter(r => Boolean(r[LIFEJACKETS_COLUMNS.ID - 1]))
    .map(rowToLifejacketObject);

  Logger.log("Kamizelki z arkusza: " + lifejackets.length);
  return lifejackets;
}

function rowToLifejacketObject(row) {

  const id = row[LIFEJACKETS_COLUMNS.ID - 1];

  return {
    id: id,
    firestoreId: String(id),

    numer:     row[LIFEJACKETS_COLUMNS.NUMER - 1] || "",
    producent: row[LIFEJACKETS_COLUMNS.PRODUCENT - 1] || "",
    model:     row[LIFEJACKETS_COLUMNS.MODEL - 1] || "",
    kolor:     row[LIFEJACKETS_COLUMNS.KOLOR - 1] || "",
    typ:       row[LIFEJACKETS_COLUMNS.TYP - 1] || "",
    rozmiar:   row[LIFEJACKETS_COLUMNS.ROZMIAR - 1] || "",
    basen:     row[LIFEJACKETS_COLUMNS.BASEN - 1] === true,
    uwagi:     row[LIFEJACKETS_COLUMNS.UWAGI - 1] || "",
  };
}
