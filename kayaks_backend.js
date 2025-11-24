/**
 * BACKEND LOGIC — KAJAKI
 * ======================
 * Ten plik NIE MA żadnych routerów HTTP.
 * Cała logika WebApp jest w api_router.gs.
 *
 * Tutaj mamy tylko cienką warstwę wywołań na rental_core.
 */


/* ============================================================
   LISTA KAJAKÓW
   ============================================================ */

/**
 * Zwraca listę kajaków jako plain JS.
 * Korzysta z getItemsByType('kayak') z rental_core.gs.
 */
function listKayaks() {
  return getItemsByType('kayak');   // rental_core
}


/* ============================================================
   OPERACJE RENT / RETURN
   ============================================================ */

/**
 * Wypożyczenie kajaka.
 */
function rentKayak(id, user, start, end) {
  return rentItem('kayak', id, user, start, end);   // rental_core
}

/**
 * Zwrot kajaka.
 */
function returnKayak(id) {
  return returnItem('kayak', id);   // rental_core
}


/* ============================================================
   TESTY RĘCZNE (RUN w Apps Script)
   ============================================================ */

function testListKayaks() {
  var list = listKayaks();

  Logger.log("=== TEST LISTY KAJAKÓW ===");
  Logger.log("Liczba kajaków: " + list.length);

  list.forEach(function (k, index) {
    Logger.log(
      (index + 1) + ". " +
      "ID=" + k.id +
      " | nr=" + (k.numerKajaka || "BRAK") +
      " | prod=" + (k.producent || "") +
      " | model=" + (k.model || "") +
      " | sprawny=" + k.sprawny +
      " | dostepny=" + k.dostepny
    );
  });

  Logger.log("=== KONIEC TESTU ===");
}

function testRentKayak() {
  var result = rentKayak('18', 'TestUser', '', '');
  Logger.log(JSON.stringify(result, null, 2));
}

function testReturnKayak() {
  var result = returnKayak('18');
  Logger.log(JSON.stringify(result, null, 2));
}
