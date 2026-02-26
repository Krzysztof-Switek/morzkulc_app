/********************************************************************
 * ODCZYT ARKUSZA – normalizacja pól
 ********************************************************************/
function usersSheet_readAll_() {
  const sheet = getUsersSheet_();
  const range = sheet.getDataRange().getValues();

  const rawHeaders = range[0];

  // NORMALIZACJA NAGŁÓWKÓW
  const headers = rawHeaders.map(h =>
    String(h || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
  );

  const out = [];

  for (let i = 1; i < range.length; i++) {
    const row = range[i];
    const obj = {};

    for (let j = 0; j < headers.length; j++) {
      let key = headers[j];   // ← JEDYNA POPRAWKA
      let val = row[j];

      // SPECJALNE MAPOWANIA
      if (key === "e-mail") key = "email";
      if (key === "imię") key = "imie";
      if (key === "zgody rodo") key = "zgodyRodo";
      if (key === "data rejestracji") key = "joinedAt";

      obj[key] = val;
    }

    // identyfikacja ID
    if (obj.id) {
      obj.id = String(obj.id);
      out.push(obj);
    }
  }

  return out;
}
