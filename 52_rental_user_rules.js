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
 *********************************************************************/

function rentalUserRules_validateUserCanRent(email, type, item, roleLimits, costHours, userCtx) {

  // limit wypożyczeń
  var activeCount = countActiveRentalsForUser(email);
  if (activeCount >= roleLimits.maxItems) {
    return {
      ok: false,
      error: "Przekroczono limit jednoczesnych wypożyczeń dla twojej roli."
    };
  }

  // ==== PATCH 3: zarząd nie płaci → koszt = 0 ====
  if (userCtx.role === "zarzad" && userCtx.zarzadNoPay === true) {
    costHours = 0;
  }

  // koszty godzinowe
  if (costHours > 0) {
    var check = hoursCore_canUserRent(email, costHours);
    if (!check.ok) {
      return {
        ok: false,
        error:
          "Brak wystarczających godzinek. Saldo po wypożyczeniu byłoby: " +
          check.saldoPo +
          ". Limit debetu: " +
          (-check.debitLimit) +
          "."
      };
    }
  }

  return { ok: true };
}

function rentalUserRules_applyHoursForRental(email, type, itemId, costHours, userCtx) {

  // ==== PATCH 6: zarząd nie płaci → nic nie księgujemy ====
  if (userCtx.role === "zarzad" && userCtx.zarzadNoPay === true) {
    return { ok: true };
  }

  if (!costHours || costHours <= 0) return { ok: true };

  return hoursCore_consumeForRental(
    email,
    costHours,
    "Wypożyczenie " + type + " / " + itemId
  );
}
