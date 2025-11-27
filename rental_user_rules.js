/************************************************************
 * Reguły użytkowników: limity, liczniki, horyzont
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
