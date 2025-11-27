/************************************************************
 * TESTY_3 – ZESTAW ROZSZERZONYCH TESTÓW SYSTEMU
 ************************************************************/

var EXT_RESULTS = [];

function _extPush(name, ok, msg) {
  EXT_RESULTS.push({ name: name, ok: ok, msg: msg });
}

/************************************************************
 * 1. TESTY UI – scenariusze użytkowe
 ************************************************************/
function test_ui_scenarios() {
  const name = "test_ui_scenarios";

  try {
    Logger.log("=== TEST UI SCENARIOS ===");

    const zItem = findFirstAvailableItem_("kayak");
    if (!zItem) throw new Error("Brak dostępnych kajaków.");

    const r1 = rentItem("kayak", zItem.id, TEST_EMAIL_ZARZAD, "", "");
    if (r1.error) throw new Error("Zarząd nie mógł wypożyczyć.");

    returnItem("kayak", zItem.id);

    const cItem = findFirstAvailableItem_("helmet");
    const r2 = rentItem("helmet", cItem.id, TEST_EMAIL_CZLONEK, "", "");
    if (r2.error) throw new Error("Członek nie mógł wypożyczyć.");
    returnItem("helmet", cItem.id);

    const kandItem = findFirstAvailableItem_("paddle");

    var now = new Date();
    var rez = reserveItem("paddle", kandItem.id, TEST_EMAIL_KANDYDAT,
      toIsoString_(addDays_(now, 1)),
      toIsoString_(addDays_(now, 2))
    );
    if (rez.error) throw new Error("Kandydat nie mógł zarezerwować.");

    var rent = rentItem("paddle", kandItem.id, TEST_EMAIL_KANDYDAT, "", "");
    if (rent.error) throw new Error("Kandydat nie mógł wypożyczyć.");

    returnItem("paddle", kandItem.id);

    _extPush(name, true);
  } catch (e) {
    _extPush(name, false, e);
  }
}

/************************************************************
 * 2. TESTY BLOKUJĄCE – sytuacje zakazane
 ************************************************************/
function test_blocking_rules() {
  const name = "test_blocking_rules";

  try {
    Logger.log("=== TEST BLOCKING RULES ===");

    const items = getItemsByType("kayak");

    const broken = items.find(i => i.sprawny === false);
    if (broken) {
      const r = rentItem("kayak", broken.id, TEST_EMAIL_CZLONEK, "", "");
      if (!r.error) throw new Error("Pozwolono wypożyczyć niesprawny!");
    }

    const privateItem = items.find(i => i.prywatny === true && i.privateAvailable === false);
    if (privateItem) {
      const r = rentItem("kayak", privateItem.id, TEST_EMAIL_CZLONEK, "", "");
      if (!r.error) throw new Error("Pozwolono wypożyczyć prywatny bez zgody!");
    }

    const pastStart = toIsoString_(addDays_(new Date(), -3));
    const pastEnd = toIsoString_(addDays_(new Date(), -2));
    const rPast = reserveItem("kayak", items[0].id, TEST_EMAIL_CZLONEK, pastStart, pastEnd);
    if (!rPast.error) throw new Error("Pozwolono na rezerwację w przeszłość!");

    _extPush(name, true);
  } catch (e) {
    _extPush(name, false, e);
  }
}

/************************************************************
 * 3. TEST RACE-CONDITION
 ************************************************************/
function test_race_condition() {
  const name = "test_race_condition";

  try {
    Logger.log("=== TEST RACE CONDITION ===");

    const item = findFirstAvailableItem_("lifejacket");
    if (!item) throw new Error("Brak lifejacket.");

    let okCount = 0;
    let failCount = 0;

    // Używamy JEDNEGO realnego użytkownika (zarząd),
    // który MA prawo wypożyczać i ma wysoki limit.
    for (let i = 0; i < 20; i++) {
      const r = rentItem("lifejacket", item.id, TEST_EMAIL_ZARZAD, "", "");
      if (r && r.ok) okCount++;
      else failCount++;
    }

    if (okCount !== 1) throw new Error("Race condition: OK != 1 (jest: " + okCount + ")");
    if (failCount !== 19) throw new Error("Race condition: FAIL != 19 (jest: " + failCount + ")");

    returnItem("lifejacket", item.id);

    _extPush(name, true);
  } catch (e) {
    _extPush(name, false, e);
  }
}


/************************************************************
 * 4. TEST SPÓJNOŚCI FIRESTORE
 ************************************************************/
function test_firestore_consistency() {
  const name = "test_firestore_consistency";

  try {
    Logger.log("=== TEST FIRESTORE CONSISTENCY ===");

    const sets = [
      { cfg: getKayaksConfig(), col: KAYAKS_COLLECTION },
      { cfg: getPaddlesConfig(), col: PADDLES_COLLECTION },
      { cfg: getLifejacketsConfig(), col: LIFEJACKETS_COLLECTION },
      { cfg: getThrowbagsConfig(), col: THROWBAGS_COLLECTION },
      { cfg: getSprayskirtsConfig(), col: SPRAYSKIRTS_COLLECTION }
    ];

    sets.forEach(s => {
      const cfgIds = s.cfg.map(x => String(x.firestoreId || x.id));
      const fsIds = firestoreListDocumentIds(s.col);

      const missing = cfgIds.filter(id => !fsIds.includes(id));
      if (missing.length)
        throw new Error("Brak dokumentów w Firestore: " + missing.join(", "));
    });

    _extPush(name, true);
  } catch (e) {
    _extPush(name, false, e);
  }
}

/************************************************************
 * 5. TEST INPUT VALIDATION
 ************************************************************/
function test_input_validation() {
  const name = "test_input_validation";

  try {
    Logger.log("=== TEST INPUT VALIDATION ===");

    const r1 = rentItem("kayak", null, TEST_EMAIL_CZLONEK, "", "");
    if (!r1.error) throw new Error("Brak błędu dla ID=null");

    const r2 = rentItem("kayak", "id_which_does_not_exist_999999", TEST_EMAIL_CZLONEK, "", "");

    if (!r2.error) throw new Error("Brak błędu dla ID nieistniejącego");

    const r3 = reserveItem("kayak", "1", TEST_EMAIL_CZLONEK, "", "");
    if (!r3.error) throw new Error("Brak błędu dla pustych dat");

    _extPush(name, true);
  } catch (e) {
    _extPush(name, false, e);
  }
}

/************************************************************
 * RUNNER – pełny zestaw
 ************************************************************/
function runAllExtendedTests() {

  Logger.log("=== ROZSZERZONE TESTY START ===");

  // 0️⃣ SYNC ZAKŁADKI SETUP → FIRESTORE
  //    (żeby offset_rezerwacji był dostępny w /setup/offset_rezerwacji)
  syncSetup();

  // 1️⃣ GLOBALNY SYNC SPRZĘTU → FIRESTORE – TYLKO RAZ!
  syncKayaks();
  syncPaddles();
  syncLifejackets();
  syncHelmets();
  syncThrowbags();
  syncSprayskirts();

  EXT_RESULTS = [];

  [
    test_ui_scenarios,
    test_blocking_rules,
    test_race_condition,
    test_firestore_consistency,
    test_input_validation,
    test_offset_rezerwacji
  ].forEach(fn => {
    try {
      fn();
    } catch (e) {
      EXT_RESULTS.push({ name: fn.name, ok: false, msg: e });
    }
  });

  Logger.log("=== PODSUMOWANIE ROZSZERZONYCH TESTÓW ===");
  EXT_RESULTS.forEach(r => {
    if (r.ok)
      Logger.log(r.name + " – OK");
    else
      Logger.log(r.name + " – FAIL: " + r.msg);
  });

  Logger.log("=== ROZSZERZONE TESTY END ===");
}


/************************************************************
 * 6. TEST OFFSETU REZERWACJI (setup/offset_rezerwacji)
 ************************************************************/
function test_offset_rezerwacji() {
  const name = "test_offset_rezerwacji";

  try {
    Logger.log("=== TEST OFFSET_REZERWACJI ===");

    // Próba pobrania wartości
    let val = getReservationPaddingDays_();
    Logger.log("OFFSET_REZERWACJI = " + val);

    // Warunek podstawowy
    if (typeof val !== "number" || isNaN(val)) {
      throw new Error("offset_rezerwacji nie jest liczbą.");
    }

    if (val < 0) {
      throw new Error("offset_rezerwacji jest ujemny!");
    }

    // Jeśli przeszło: test OK
    _extPush(name, true);

  } catch (e) {
    _extPush(name, false, e);
  }
}
