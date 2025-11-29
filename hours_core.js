/**
 * HOURS CORE – cienka warstwa orkiestracji systemu godzinek.
 * Tu są funkcje wywoływane z zewnątrz (UI, wypożyczanie, CRON).
 */

/**
 * Sprawdza, czy użytkownik MOŻE wypożyczyć sprzęt, zakładając koszt w godzinkach.
 * Nie modyfikuje Firestore.
 *
 * @param {string} email
 * @param {number} costHours
 * @return {Object} { ok, error?, saldoPrzed, saldoPo, debitLimit }
 */
function hoursCore_canUserRent(email, costHours) {
  return hoursRules_canAfford(email, costHours);
}

/**
 * Realne naliczenie kosztu wypożyczenia (wywołujemy, gdy wypożyczenie przeszło).
 * Zjada dodatnie godzinki + tworzy debet.
 *
 * @param {string} email
 * @param {number} costHours
 * @param {string} note
 */
function hoursCore_consumeForRental(email, costHours, note) {
  return hoursRules_applyRentalCost(email, costHours, note);
}

/**
 * Wykup debetu godzinkowego.
 */
function hoursCore_purchaseHours(email, hoursToBuy, note) {
  return hoursRules_purchaseHours(email, hoursToBuy, note);
}

/**
 * Bonus miesięczny dla zarządu – naliczany raz w miesiącu
 * (np. CRON / trigger czasowy).
 *
 * Korzysta z arkusza członków (MEMBERS_SPREADSHEET_ID, zakładka MEMBERS_SHEET_NAME).
 */
function hoursCore_applyMonthlyBonusForBoard() {
  const cfg = getHoursConfig_();
  const bonus = cfg.monthlyBonusBoard;

  const ss = SpreadsheetApp.openById(MEMBERS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMBERS_SHEET_NAME);
  if (!sheet) throw new Error('Brak zakładki członkowie_klubu.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  rows.forEach(r => {
    const email = String(r[5] || '').trim(); // kolumna F – email
    const rolaRaw = r[9];                    // kolumna J – grupa/rola
    const rola = normalizeRoleName(rolaRaw);

    if (!email) return;
    if (rola !== 'zarzad') return;

    hoursData_addEntry(
      email,
      bonus,
      new Date(),    // dateWork
      new Date(),    // acceptedAt
      'Miesięczny bonus za pracę w zarządzie',
      'bonus_zarzad'
    );
  });
}

/**
 * Funkcja pomocnicza – zwraca saldo użytkownika (do UI / maili).
 */
function hoursCore_getSaldo(email) {
  return hoursData_getBalance(email);
}
