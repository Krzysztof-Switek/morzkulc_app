function getHelmetsConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(HELMETS_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + HELMETS_SHEET_NAME);

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  const helmets = rows
    .filter(r => Boolean(r[HELMETS_COLUMNS.ID - 1]))
    .map(rowToHelmetObject);

  Logger.log("Kaski z arkusza: " + helmets.length);
  return helmets;
}

function rowToHelmetObject(row) {

  const id = row[HELMETS_COLUMNS.ID - 1];

  return {
    id: id,
    firestoreId: String(id),

    numer:     row[HELMETS_COLUMNS.NUMER - 1] || "",
    producent: row[HELMETS_COLUMNS.PRODUCENT - 1] || "",
    model:     row[HELMETS_COLUMNS.MODEL - 1] || "",
    kolor:     row[HELMETS_COLUMNS.KOLOR - 1] || "",
    rozmiar:   row[HELMETS_COLUMNS.ROZMIAR - 1] || "",
    basen:     row[HELMETS_COLUMNS.BASEN - 1] === true,
    uwagi:     row[HELMETS_COLUMNS.UWAGI - 1] || "",
  };
}
