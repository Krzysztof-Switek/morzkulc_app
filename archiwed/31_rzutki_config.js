function getThrowbagsConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(THROWBAGS_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + THROWBAGS_SHEET_NAME);

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  const throwbags = rows
    .filter(r => Boolean(r[THROWBAGS_COLUMNS.ID - 1]))
    .map(rowToThrowbagObject);

  Logger.log("Rzutki z arkusza: " + throwbags.length);
  return throwbags;
}

function rowToThrowbagObject(row) {

  const id = row[THROWBAGS_COLUMNS.ID - 1];

  return {
    id: id,
    firestoreId: String(id),

    numer:     row[THROWBAGS_COLUMNS.NUMER - 1] || "",
    producent: row[THROWBAGS_COLUMNS.PRODUCENT - 1] || "",
    uwagi:     row[THROWBAGS_COLUMNS.UWAGI - 1] || "",
  };
}
