/***************************************************
 * SETUP ROLES – obsługa ról, członków i limitów
 ***************************************************/

/**
 * Zakładka w arkuszu członków, z której pobieramy role.
 * Kolumny:
 * A - ID
 * B - ksywa
 * C - imię
 * D - nazwisko
 * E - telefon
 * F - email
 * G - data ur.
 * H - lista dyskusyjna
 * I - klucze
 * J - grupa (rola)
 */


/**
 * Normalizacja nazwy roli → wartości systemowe:
 * zarzad / czlonek / kandydat / gosc / no_access
 */
function normalizeRoleName(raw) {
  if (!raw) return "gosc";
  raw = String(raw).trim().toLowerCase();

  if (raw === "zarząd" || raw === "zarzad") return "zarzad";
  if (raw === "członek" || raw === "czlonek") return "czlonek";
  if (raw === "kandydat") return "kandydat";
  if (raw === "brak dostepu" || raw === "brak dostępu") return "no_access";

  return "gosc"; // fallback
}

/**
 * Pobiera rolę dla podanego emaila z arkusza członków.
 */
function getRoleForEmail(email) {
  if (!email) return "gosc";

  const ss = SpreadsheetApp.openById(MEMBERS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMBERS_SHEET_NAME);

  if (!sheet) {
    throw new Error("Brak zakładki członkowie_klubu w arkuszu członków");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "gosc";

  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  for (let r of rows) {
    const rowEmail = String(r[5] || "").trim().toLowerCase();
    if (rowEmail === email.trim().toLowerCase()) {
      const rola = normalizeRoleName(r[9]);
      return rola;
    }
  }

  return "gosc";
}

/**
 * Limity roli – pobierane z kolekcji Firestore "setup".
 * Klucze:
 *  - zarzad_max_items
 *  - zarzad_max_time
 *  - czlonek_max_items
 *  - czlonek_max_time
 *  - kandydat_max_items
 *  - kandydat_max_time
 */
function getRoleLimits(role) {
  role = normalizeRoleName(role);

  const limits = {
    zarzad:   { maxItems: 100, maxTimeWeeks: 4, canRentPrivate: true },
    czlonek:  { maxItems: 3,   maxTimeWeeks: 2, canRentPrivate: false },
    kandydat: { maxItems: 1,   maxTimeWeeks: 1, canRentPrivate: false },
    gosc:     { maxItems: 0,   maxTimeWeeks: 0, canRentPrivate: false },
    no_access:{ maxItems: 0,   maxTimeWeeks: 0, canRentPrivate: false },
  };

  return limits[role] || limits["gosc"];
}

/**
 * Zwraca pełny kontekst użytkownika:
 * {
 *    email: "...",
 *    role: "czlonek",
 *    limits: {maxItems:3, maxTimeWeeks:2, ...}
 * }
 */
function getUserContext(email) {
  if (!email) {
    email = Session.getActiveUser().getEmail() || "";
  }

  const role = getRoleForEmail(email);
  const limits = getRoleLimits(role);

  return {
    email: email,
    role: role,
    limits: limits
  };
}

/***************************************************
 * TEST
 ***************************************************/
function test_roles_basic() {
  const emails = [
    "zarzad@gmail.com",
    "czlonek@gmail.com",
    "kandydat@tlen.pl",
    "no_access@gmail.com",
    "nieistnieje@xxx.pl"
  ];

  emails.forEach(e => {
    const ctx = getUserContext(e);
    Logger.log(JSON.stringify(ctx, null, 2));
  });
}

