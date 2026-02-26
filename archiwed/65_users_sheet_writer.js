/********************************************************************
 * 65_users_sheet_writer.js
 * Arkusz: "członkowie i sympatycy"
 *
 * Na czas stabilizacji: BRAK walidacji / dropdownów / checkboxów.
 * Zapis jest atomowy (setValues), żeby nie było połówek.
 ********************************************************************/

function usersSheet_getSheet_() {
  const ss = SpreadsheetApp.openById(USERS_SPREADSHEET_ID);
  const sh = ss.getSheetByName("członkowie i sympatycy");
  if (!sh) throw new Error('Brak zakładki: "członkowie i sympatycy"');
  return sh;
}

function usersSheet_roleDropdown_(rola) {
  const r = String(rola || "").trim();
  if (r === "Zarząd") return "Zarzad";
  if (r === "Członek") return "Czlonek";
  if (["Zarzad","KR","Czlonek","Kandydat","Sympatyk"].includes(r)) return r;
  return "Sympatyk";
}

function usersSheet_norm_(user) {
  user = user || {};
  const out = Object.assign({}, user);

  // kompatybilność: role -> rola
  if (!out.rola && out.role) out.rola = out.role;

  out.email = String(out.email || "").trim().toLowerCase();
  out.imie = String(out.imie || "").trim();
  out.nazwisko = String(out.nazwisko || "").trim();
  out.ksywa = String(out.ksywa || "").trim();
  out.telefon = String(out.telefon || "").trim();

  out.rola = usersSheet_roleDropdown_(out.rola);
  out.status = String(out.status || "").trim();

  return out;
}

function usersSheet_findRowByEmail_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, 6, lastRow - 1, 1).getValues(); // kol F: e-mail
  for (let i = 0; i < values.length; i++) {
    const v = String(values[i][0] || "").trim().toLowerCase();
    if (v === email) return i + 2;
  }
  return -1;
}

/**
 * UPSERT po email
 */
function usersSheet_upsertUser(user) {
  user = usersSheet_norm_(user);
  if (!user.email) throw new Error("usersSheet_upsertUser: brak email");

  const sheet = usersSheet_getSheet_();
  const rowIndex = usersSheet_findRowByEmail_(sheet, user.email);

  const lastRow = sheet.getLastRow();
  const id = (rowIndex !== -1) ? String(sheet.getRange(rowIndex, 1).getValue() || "") : String(lastRow);

  // układ kolumn A..R (18 kolumn)
  const row = [
    id,               // A: ID
    user.ksywa,       // B: ksywa
    user.imie,        // C: imię
    user.nazwisko,    // D: nazwisko
    user.telefon,     // E: telefon
    user.email,       // F: e-mail
    "",               // G: data urodzenia
    "",               // H: szkoleniówka / wpisowe
    "",               // I: Klucze do siedziby
    user.rola,        // J: Rola
    user.status,      // K: Status
    "",               // L: Blacha
    "",               // M: Uwagi
    true,             // N: Zgody RODO
    "",               // O: Pole dodatkowe
    "",               // P: składki
    0,                // Q: godzinki
    new Date()        // R: data rejestracji
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    return { ok: true, updated: true, rowIndex: rowIndex, id: id };
  }

  const newRowIndex = sheet.getLastRow() + 1;
  sheet.getRange(newRowIndex, 1, 1, row.length).setValues([row]);
  return { ok: true, created: true, rowIndex: newRowIndex, id: id };
}

/**
 * kompat: jeśli gdzieś wołasz addUser()
 */
function usersSheet_addUser(user) {
  return usersSheet_upsertUser(user);
}
