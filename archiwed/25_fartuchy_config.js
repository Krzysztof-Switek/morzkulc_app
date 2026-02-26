function getSprayskirtsConfig() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SPRAYSKIRTS_SHEET_NAME);
  if (!sheet) throw new Error('Nie znaleziono zakładki: ' + SPRAYSKIRTS_SHEET_NAME);

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  const items = rows
    .filter(r => Boolean(r[SPRAYSKIRTS_COLUMNS.ID - 1]))
    .map(rowToSprayskirtObject);

  Logger.log("Fartuchy z arkusza: " + items.length);
  return items;
}

function rowToSprayskirtObject(row) {

  const id = row[SPRAYSKIRTS_COLUMNS.ID - 1];

  return {
    id: id,
    firestoreId: String(id),

    numer:         row[SPRAYSKIRTS_COLUMNS.NUMER - 1] || "",
    producent:     row[SPRAYSKIRTS_COLUMNS.PRODUCENT - 1] || "",
    material:      row[SPRAYSKIRTS_COLUMNS.MATERIAL - 1] || "",
    rozmiar:       row[SPRAYSKIRTS_COLUMNS.ROZMIAR - 1] || "",
    rozmiarKomina: row[SPRAYSKIRTS_COLUMNS.ROZMIAR_KOMINA - 1] || "",
    basen:         row[SPRAYSKIRTS_COLUMNS.BASEN - 1] === true,
    niziny:        row[SPRAYSKIRTS_COLUMNS.NIZINY - 1] === true,
    uwagi:         row[SPRAYSKIRTS_COLUMNS.UWAGI - 1] || "",
  };
}
