/************************************************************
 * WARSTWA KOMPATYBILNOŚCI Z PODZIELONYM RENTAL_CORE
 ************************************************************/

// rental_equipment_rules zapewnia:
if (typeof COLLECTION_BY_TYPE === 'undefined') {
  throw new Error("BŁĄD: Brak COLLECTION_BY_TYPE – upewnij się, że rental_equipment_rules.gs ładuje się PRZED testami.");
}

if (typeof getReservationPaddingDays_ === 'undefined') {
  throw new Error("BŁĄD: Brak getReservationPaddingDays_ – upewnij się, że rental_equipment_rules.gs ładuje się PRZED testami.");
}

if (typeof addDays_ === 'undefined') {
  throw new Error("BŁĄD: Brak addDays_ – upewnij się, że rental_equipment_rules.gs jest ładowany.");
}

if (typeof toIsoString_ === 'undefined') {
  throw new Error("BŁĄD: Brak toIsoString_ – upewnij się, że rental_equipment_rules.gs jest ładowany.");
}

// rental_user_rules zapewnia:
if (typeof validateReservationHorizon === 'undefined') {
  throw new Error("BŁĄD: Brak validateReservationHorizon – upewnij się, że rental_user_rules.gs jest ładowany.");
}

if (typeof countActiveRentalsForUser === 'undefined') {
  throw new Error("BŁĄD: Brak countActiveRentalsForUser – upewnij się, że rental_user_rules.gs jest ładowany.");
}

if (typeof countActiveReservationsAndRentalsForUser === 'undefined') {
  throw new Error("BŁĄD: countActiveReservationsAndRentalsForUser – rental_user_rules.gs musi być ładowany.");
}

// rental_core (orchestrator) powinien zapewniać:
if (typeof rentItem === 'undefined') {
  throw new Error("BŁĄD: rentItem nie jest dostępny – rental_core.gs musi być ładowany PRZED testami.");
}

if (typeof reserveItem === 'undefined') {
  throw new Error("BŁĄD: reserveItem nie jest dostępny – rental_core.gs musi być ładowany PRZED testami.");
}

if (typeof returnItem === 'undefined') {
  throw new Error("BŁĄD: returnItem nie jest dostępny – rental_core.gs musi być ładowany PRZED testami.");
}

if (typeof getItemsByType === 'undefined') {
  throw new Error("BŁĄD: getItemsByType nie jest dostępne – rental_core.gs musi być ładowany PRZED testami.");
}



/************************************************************
 * TESTY_4 – ZESTAW ROZSZERZONYCH TESTÓW BACKENDU (BEZ UI)
 ************************************************************/

var EXT2_RESULTS = [];

function _ext2Push(name, ok, msg) {
  EXT2_RESULTS.push({ name: name, ok: ok, msg: msg });
}

/************************************************************
 * 1. TEST RENT/RESERVE DLA WSZYSTKICH TYPÓW
 ************************************************************/
function test_rent_and_reserve_all_types() {
  const name = "test_rent_and_reserve_all_types";

  try {
    Logger.log("=== TEST RENT/RESERVE ALL TYPES ===");

    const types = ["kayak", "paddle", "lifejacket", "helmet", "throwbag", "sprayskirt"];

    types.forEach(type => {
      const item = findFirstAvailableItem_(type);
      if (!item) return;   // Bezpieczny skip – brak danych nie jest błędem backendu

      // Wypożyczenie — poprawnie: null/null
      const rent = rentItem(type, item.id, TEST_EMAIL_CZLONEK, null, null);
      if (rent.error) throw new Error("Nie można wypożyczyć typu " + type + ": " + rent.error);

      // Zwrot
      returnItem(type, item.id);

      // Rezerwacja: jutro → pojutrze
      const now = new Date();
      const start = toIsoString_(addDays_(now, 1));
      const end   = toIsoString_(addDays_(now, 2));

      const res = reserveItem(type, item.id, TEST_EMAIL_CZLONEK, start, end);
      if (res.error) throw new Error("Nie można zarezerwować typu " + type + ": " + res.error);

      // Wypożyczenie po rezerwacji
      const rentAfter = rentItem(type, item.id, TEST_EMAIL_CZLONEK, null, null);
      if (rentAfter.error) throw new Error("Nie można wypożyczyć po rezerwacji: " + type);

      returnItem(type, item.id);
    });

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * 2. TEST PADDINGU DLA WARTOŚCI EKSTREMALNYCH
 ************************************************************/
function test_padding_extremes() {
  const name = "test_padding_extremes";

  try {
    Logger.log("=== TEST PADDING EXTREMES ===");

    // Zapis offset=0
    firestorePatchDocument("setup/offset_rezerwacji", { value: 0 }, ["value"]);
    let p0 = getReservationPaddingDays_();
    if (p0 !== 0) throw new Error("offset=0 nie jest poprawny");

    // Zapis offset=10
    firestorePatchDocument("setup/offset_rezerwacji", { value: 10 }, ["value"]);
    let p10 = getReservationPaddingDays_();
    if (p10 !== 10) throw new Error("offset=10 nie jest poprawny");

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * 3. TEST VERSION++
 ************************************************************/
function test_version_increment() {
  const name = "test_version_increment";

  try {
    Logger.log("=== TEST VERSION INCREMENT ===");

    const item = findFirstAvailableItem_("kayak");
    if (!item) return; // brak danych = skip

    const path = KAYAKS_COLLECTION + "/" + encodeURIComponent(item.id);

    const before = firestoreGetDocument(path);
    const vBefore = before.fields.version ? Number(before.fields.version.integerValue) : 0;

    // Wypożyczenie — null/null
    rentItem("kayak", item.id, TEST_EMAIL_CZLONEK, null, null);

    const after = firestoreGetDocument(path);
    const vAfter = after.fields.version ? Number(after.fields.version.integerValue) : 0;

    if (vAfter !== vBefore + 1) {
      throw new Error("Version++ nie działa: było " + vBefore + ", jest " + vAfter);
    }

    returnItem("kayak", item.id);

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * 4. TEST LIMITÓW RÓL
 ************************************************************/
function test_limits_roles() {
  const name = "test_limits_roles";

  try {
    Logger.log("=== TEST LIMITÓW RÓL ===");

    const kand = findFirstAvailableItem_("paddle");
    if (!kand) return; // skip

    const r1 = rentItem("paddle", kand.id, TEST_EMAIL_KANDYDAT, null, null);
    if (r1.error) throw new Error("Kandydat nie mógł wypożyczyć 1 sztuki.");

    // Nie robimy dodatkowych GET — pobieramy raz
    const r2item = findFirstAvailableItem_("helmet");
    if (!r2item) {
      returnItem("paddle", kand.id);
      return;
    }

    const r2 = rentItem("helmet", r2item.id, TEST_EMAIL_KANDYDAT, null, null);
    if (!r2.error) throw new Error("Kandydat mógł wypożyczyć 2 sztuki (limit=1)!");

    returnItem("paddle", kand.id);

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * 5. TEST PRYWATNEGO SPRZĘTU
 ************************************************************/
function test_private_items_behavior() {
  const name = "test_private_items_behavior";

  try {
    Logger.log("=== TEST PRIVATE ITEMS ===");

    const items = getItemsByType("kayak") || [];
    const priv = items.find(i => i.prywatny && i.privateAvailable === false);

    if (priv) {
      const r = rentItem("kayak", priv.id, TEST_EMAIL_CZLONEK, null, null);
      if (!r.error) throw new Error("Pozwolono wypożyczyć sprzęt prywatny bez zgody!");
    }

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * 6. TEST HORYZONTU CZASOWEGO
 ************************************************************/
function test_horizon_rules() {
  const name = "test_horizon_rules";

  try {
    Logger.log("=== TEST HORIZON RULES ===");

    const item = findFirstAvailableItem_("kayak");
    if (!item) return; // skip

    const now = new Date();
    const start = toIsoString_(addDays_(now, 14));
    const end   = toIsoString_(addDays_(now, 15));

    const r = reserveItem("kayak", item.id, TEST_EMAIL_KANDYDAT, start, end);
    if (!r.error) throw new Error("Pozwolono na rezerwację poza horyzontem!");

    _ext2Push(name, true);

  } catch (e) {
    _ext2Push(name, false, e);
  }
}

/************************************************************
 * RUNNER – pełny zestaw TESTÓW_4
 ************************************************************/
function runAllExtendedTests2() {

  Logger.log("=== ROZSZERZONE TESTY 2 START ===");

  // świeży sync
  syncSetup();
  syncKayaks();
  syncPaddles();
  syncLifejackets();
  syncHelmets();
  syncThrowbags();
  syncSprayskirts();

  EXT2_RESULTS = [];

  [
    test_rent_and_reserve_all_types,
    test_padding_extremes,
    test_version_increment,
    test_limits_roles,
    test_private_items_behavior,
    test_horizon_rules
  ].forEach(fn => {
    try {
      fn();
    } catch (e) {
      EXT2_RESULTS.push({ name: fn.name, ok: false, msg: e });
    }
  });

  Logger.log("=== PODSUMOWANIE ROZSZERZONYCH TESTÓW 2 ===");
  EXT2_RESULTS.forEach(r => {
    if (r.ok)
      Logger.log(r.name + " – OK");
    else
      Logger.log(r.name + " – FAIL: " + r.msg);
  });

  Logger.log("=== ROZSZERZONE TESTY 2 END ===");
}
