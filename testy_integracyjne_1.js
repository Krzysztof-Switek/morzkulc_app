/************************************************************
 * TEST INTEGRACYJNY — 3 użytkowników, różne role i scenariusze
 ************************************************************/

var INTEGRATION_LOG = [];

function logEvent(user, action, resultObj) {
  INTEGRATION_LOG.push({
    time: new Date().toISOString(),
    user: user,
    action: action,
    result: resultObj,
    saldo: hours_data.getBalance(user)
  });
}

/************************************************************
 * KONFIGURACJA RÓL — uproszczona (tylko maxItems)
 ************************************************************/
const ROLE_LIMITS = {
  zarzad:  { maxItems: 100, maxTime: 4 },
  czlonek: { maxItems: 3,   maxTime: 2 },
  kandydat:{ maxItems: 1,   maxTime: 1 }
};

/************************************************************
 * Symulacja wypożyczenia — korzysta z rules + godzinek
 ************************************************************/
function simulateRent(user, role, itemId, costHours) {

  const check = rentalUserRules_validateUserCanRent(
    user,
    "kayak",
    itemId,
    ROLE_LIMITS[role],
    costHours
  );

  if (!check.ok) {
    logEvent(user, `RENT_DENIED item=${itemId}`, {error: check.error});
    return { ok: false };
  }

  // W normalnym systemie tutaj byłoby "oznacz w Firestore sprzęt jako wypożyczony"
  // W teście pomijamy – sprawdzamy tylko logikę.
  logEvent(user, `RENT_ALLOWED item=${itemId}`, {ok: true});

  // Księgujemy godzinki
  const hrs = hoursCore_consumeForRental(
    user,
    costHours,
    "Symulacja wypożyczenia: " + itemId
  );

  logEvent(user, `HOUR_CONSUME item=${itemId}`, hrs);

  return hrs;
}

/************************************************************
 * Symulacja zwrotu (bez godzin)
 ************************************************************/
function simulateReturn(user, itemId) {
  // Bez logiki godzin – tylko zapis zdarzenia.
  logEvent(user, `RETURN item=${itemId}`, {ok: true});
}

/************************************************************
 * Reset testowy
 ************************************************************/
function clearHoursAll() {
  var users = firestoreListDocumentIds("hours");
  if (!users) return;
  users.forEach(u => {
    var entries = firestoreListDocumentIds("hours/" + encodeURIComponent(u) + "/entries");
    entries.forEach(eid => {
      firestoreDeleteDocument("hours/" + encodeURIComponent(u) + "/entries/" + encodeURIComponent(eid));
    });
  });
}

/************************************************************
 * PEŁNA SCENARIUSZOWA SYMULACJA
 ************************************************************/
function runIntegrationHoursTest() {

  INTEGRATION_LOG = [];
  clearHoursAll();
  syncSetup();

  const u1 = "zarzad@test.pl";
  const u2 = "czlonek@test.pl";
  const u3 = "kandydat@test.pl";

  /***********************
   * SCENARIUSZ 1 — ZARZĄD
   ***********************/
  // Zarząd dostaje bonus 10h na starcie (upraszczamy)
  hours_data.addHoursEntry(u1, 10, "2025-01-01", new Date(), "bonus", "bonus_miesieczny");
  logEvent(u1, "INITIAL_BONUS", {ok:true});

  // Zarząd wypożycza kajak za 3h
  simulateRent(u1, "zarzad", "K1", 3);

  // Oddaje po chwili
  simulateReturn(u1, "K1");


  /***********************
   * SCENARIUSZ 2 — CZŁONEK
   ***********************/
  // CZŁONEK nie ma godzin — próba wypożyczenia za 4h → odmowa
  simulateRent(u2, "czlonek", "K2", 4);

  // Kupuje 4h → saldo wraca do zera (bo zaczyna od -4?) – NIE. Ujemne saldo powstaje dopiero po wypożyczeniu.
  // Czyli: musi najpierw dostać godziny dodatnie
  hours_data.addHoursEntry(u2, 5, "2025-01-02", new Date(), "praca społeczna", "work");
  logEvent(u2, "ADD_HOURS_5", {ok:true});

  // Ponowna próba → powinna być OK
  simulateRent(u2, "czlonek", "K2", 4);

  // Zużył 4h, zostaje 1 → część oddaje
  simulateReturn(u2, "K2");

  // Ponowny wypożyczenie za 2h → nie wystarczy, system powinien zejść do debetu do -1
  simulateRent(u2, "czlonek", "K3", 2);

  // Teraz saldo = -1, limit np. -20 → OK

  // Członek wykupuje 1h i wraca do zera
  hoursRules_purchaseHours(u2, 1, "wykup test");
  logEvent(u2, "PURCHASE_1H", {ok:true});


  /*************************
   * SCENARIUSZ 3 — KANDYDAT
   *************************/
  // Kandydat ma prawo tylko do 1 wypożyczenia naraz
  // Próbuje wypożyczyć kajak za 3h → odmowa (brak godzin)
  simulateRent(u3, "kandydat", "K4", 3);

  // Kandydat robi pracę społeczną i dostaje 2h
  hours_data.addHoursEntry(u3, 2, "2025-01-03", new Date(), "praca", "work");
  logEvent(u3, "ADD_HOURS_2", {ok:true});

  // Próbuje wypożyczyć za 3h → powinno zejść do debetu -1
  simulateRent(u3, "kandydat", "K4", 3);

  // Próbuje wypożyczyć drugi kajak — powinno odmówić limit 1 item
  simulateRent(u3, "kandydat", "K5", 1);

  // Oddaje
  simulateReturn(u3, "K4");

  // Teraz może wypożyczyć drugi
  simulateRent(u3, "kandydat", "K5", 1);



  /***********************
   * WYNIK
   ***********************/
  Logger.log("=== HISTORIA ZDARZEŃ (INTEGRATION TEST) ===");
  INTEGRATION_LOG.forEach(e => Logger.log(JSON.stringify(e, null, 2)));

  Logger.log("=== KONIEC TESTU ===");

  return INTEGRATION_LOG;
}
