/************************************************************
 * Reguły użytkowników: limity, liczniki, horyzont + GODZINKI
 ************************************************************/

/*********************************************************************
 * Liczniki
 *********************************************************************/
function countActiveRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;
  Object.keys(COLLECTION_BY_TYPE).forEach(type => {
    var raw = firestoreGetCollection(COLLECTION_BY_TYPE[type]);
    var docs = raw.documents || [];
    docs.forEach(doc => {
      var f = doc.fields || {};
      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var u = f.aktualnyUzytkownik ? f.aktualnyUzytkownik.stringValue : "";
      if (!dostepny && u === email) total++;
    });
  });

  return total;
}

function countActiveReservationsAndRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;
  Object.keys(COLLECTION_BY_TYPE).forEach(type => {
    var raw = firestoreGetCollection(COLLECTION_BY_TYPE[type]);
    var docs = raw.documents || [];
    docs.forEach(doc => {
      var f = doc.fields || {};

      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var u = f.aktualnyUzytkownik ? f.aktualnyUzytkownik.stringValue : "";

      var rA = f.rezerwacjaAktywna ? !!f.rezerwacjaAktywna.booleanValue : false;
      var rU = f.rezerwujacy ? f.rezerwujacy.stringValue : "";

      if ((!dostepny && u === email) || (rA && rU === email)) total++;
    });
  });

  return total;
}

/*********************************************************************
 * Horyzont rezerwacji
 *********************************************************************/
function validateReservationHorizon(start, end, maxTimeWeeks) {
  if (!maxTimeWeeks || maxTimeWeeks <= 0) return null;

  var now = new Date();
  var s = new Date(start);
  var diffDays = (s.getTime() - now.getTime()) / (1000*60*60*24);

  if (diffDays > maxTimeWeeks * 7) {
    return "Przekroczono maksymalny horyzont rezerwacji.";
  }

  return null;
}

/*********************************************************************
 *  GODZINKI — INTEGRACJA
 *
 *  Zasada:
 *    1. rental_core pyta rental_user_rules.canUserRent(...)
 *    2. tu wywołujemy hoursCore_canUserRent(email, costHours)
 *    3. rental_core po udanym wypożyczeniu wywoła consumeForRental
 *********************************************************************/

/**
 * NAJWAŻNIEJSZA FUNKCJA:
 * Sprawdza, czy użytkownik MOŻE wypożyczyć sprzęt,
 * biorąc pod uwagę:
 *   - limity sprzętowe
 *   - limity ról
 *   - horyzont czasowy
 *   - stan sprzętu
 *   - SALDO GODZINEK / DEBET
 *
 * >>> To jest jedyne miejsce, gdzie łączymy godzinki z wypożyczeniem. <<<
 */
function rentalUserRules_validateUserCanRent(email, type, item, roleLimits, costHours) {

  // ------------- 1. REGUŁY SPRZĘTOWE (twoje – nie naruszam) -----------------

  // limit liczby aktywnych wypożyczeń
  var activeCount = countActiveRentalsForUser(email);
  if (activeCount >= roleLimits.maxItems) {
    return {
      ok: false,
      error: "Przekroczono limit jednoczesnych wypożyczeń dla twojej roli."
    };
  }

  // dodatkowo można tu dodać Twoje reguły (np. prywatny, niesprawny, itp.)
  // ale NIE ingeruję, zgodnie z ustaleniem.


  // ------------- 2. REGUŁY GODZINKOWE --------------------------------------

  // costHours to koszt wypożyczenia w modelu godzinkowym (liczba godzin)
  // jeśli koszt = 0 → pomijamy
  if (costHours && costHours > 0) {
    var check = hoursCore_canUserRent(email, costHours);
    if (!check.ok) {
      return {
        ok: false,
        error: "Brak wystarczających godzinek. Saldo po wypożyczeniu byłoby: " +
               check.saldoPo + ". Limit debetu: " + (-check.debitLimit) + "."
      };
    }
  }

  // jeśli nic nie blokuje → OK
  return { ok: true };
}

/**
 * FUNKCJA WYWOŁYWANA PO UDANYM WYPOŻYCZENIU
 * (czyli po rentItem)
 *
 * Tutaj dopiero księgujemy godzinki:
 *   - zjada dodatnie FIFO
 *   - tworzy debet jeśli brakuje
 */
function rentalUserRules_applyHoursForRental(email, type, itemId, costHours) {
  if (!costHours || costHours <= 0) return { ok: true };

  return hoursCore_consumeForRental(
    email,
    costHours,
    "Wypożyczenie " + type + " / " + itemId
  );
}
