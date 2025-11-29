/**
 * REGUŁY ekonomiczne systemu godzinek.
 * - debet
 * - sprawdzanie limitów
 * - integracja z wypożyczeniem
 */

/**
 * Zwraca aktualne saldo godzinek użytkownika (po uwzględnieniu wygasania).
 */
function hoursRules_getSaldo(email) {
  return hoursData_getBalance(email);
}

/**
 * Sprawdza, czy po odjęciu costHours saldo nie spadnie poniżej -limit_debetu_godzinek.
 * NIE zmienia danych w Firestore.
 *
 * @return {Object} { ok, saldoPrzed, saldoPo, debitLimit }
 */
function hoursRules_canAfford(email, costHours) {
  const cfg = getHoursConfig_();
  const saldoPrzed = hoursData_getBalance(email);
  const saldoPo = saldoPrzed - costHours;

  return {
    ok: (saldoPo >= -cfg.debitLimit),
    saldoPrzed: saldoPrzed,
    saldoPo: saldoPo,
    debitLimit: cfg.debitLimit
  };
}

/**
 * Właściwe naliczenie kosztu wypożyczenia:
 * 1) "zjada" dodatnie godzinki użytkownika FIFO (hoursData_consumePositiveHours)
 * 2) jeżeli nadal brakuje – tworzy wpis DEBETU (source='debet'),
 *    o ile nie przekraczamy limitu debetu.
 *
 * @param {string} email
 * @param {number} costHours
 * @param {string} note
 * @return {Object} { ok, error?, saldoPrzed, saldoPo }
 */
function hoursRules_applyRentalCost(email, costHours, note) {
  if (costHours <= 0) {
    return { ok: true, saldoPrzed: hoursData_getBalance(email), saldoPo: hoursData_getBalance(email) };
  }

  const check = hoursRules_canAfford(email, costHours);
  if (!check.ok) {
    return {
      ok: false,
      error: 'Przekroczony limit debetu godzinek. Saldo po operacji byłoby: ' +
        check.saldoPo + ', limit: ' + (-check.debitLimit)
    };
  }

  const saldoPrzed = check.saldoPrzed;

  // Krok 1 – zjadamy dodatnie godzinki
  const maxPositiveToConsume = Math.max(0, saldoPrzed);
  const toConsumePositive = Math.min(costHours, maxPositiveToConsume);

  if (toConsumePositive > 0) {
    hoursData_consumePositiveHours(email, toConsumePositive);
  }

  // Krok 2 – jeżeli nadal brakuje, tworzymy debet
  const remaining = costHours - toConsumePositive;
  if (remaining > 0) {
    hoursData_addDebitEntry(email, remaining, note || 'Debet za wypożyczenie');
  }

  const saldoPo = hoursData_getBalance(email);
  return { ok: true, saldoPrzed: saldoPrzed, saldoPo: saldoPo };
}

/**
 * Wykup godzinek (spłata debetu):
 *  - można kupić tylko wtedy, gdy saldo < 0
 *  - można kupić max tyle, aby saldo == 0
 *  - tworzy dodatni wpis (source='debit_repayment')
 *
 * Realny przelew pieniędzy jest poza systemem – tu tylko księgujemy godzinki.
 */
function hoursRules_purchaseHours(email, hoursToBuy, note) {
  const cfg = getHoursConfig_();
  if (hoursToBuy <= 0) {
    throw new Error('hoursRules_purchaseHours: liczba godzin musi być dodatnia.');
  }

  const saldoPrzed = hoursData_getBalance(email);
  if (saldoPrzed >= 0) {
    throw new Error('Nie można wykupić godzinek przy saldzie >= 0. Saldo: ' + saldoPrzed);
  }

  const maxToBuy = -saldoPrzed;
  if (hoursToBuy > maxToBuy) {
    throw new Error('Można wykupić maksymalnie ' + maxToBuy + ' godzinek (aby wyzerować saldo).');
  }

  // Tu nie naliczamy pieniędzy – zarząd pilnuje przelewów
  hoursData_addEntry(
    email,
    hoursToBuy,
    new Date(),         // dateWork = dziś
    new Date(),         // acceptedAt = teraz
    note || 'Wykup godzinek',
    'debit_repayment'
  );

  const saldoPo = hoursData_getBalance(email);
  return { ok: true, saldoPrzed: saldoPrzed, saldoPo: saldoPo, cenaZaGodzine: cfg.hourPrice };
}
