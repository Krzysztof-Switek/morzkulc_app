/************************************************************
 * TESTY SYSTEMU GODZINEK – WERSJA DOPASOWANA DO KODU
 ************************************************************/

var HOURS_TEST_RESULTS = [];

/************************************************************
 * ZAPIS WYNIKÓW
 ************************************************************/
function _hoursTestPush(name, ok, msg) {
  HOURS_TEST_RESULTS.push({ name: name, ok: ok, msg: msg });
}

/************************************************************
 * CLEANER — czyści hours/*
 ************************************************************/
function hoursTests_clearHoursCollections() {
  Logger.log("=== CLEAN HOURS COLLECTIONS ===");

  var users = firestoreListDocumentIds("hours");
  if (!users || users.length === 0) {
    Logger.log("Brak kolekcji hours — nic do czyszczenia.");
    return;
  }

  users.forEach(function(userId) {
    var entriesPath = "hours/" + encodeURIComponent(userId) + "/entries";
    var entries = firestoreListDocumentIds(entriesPath);

    if (entries && entries.length > 0) {
      entries.forEach(function(eid) {
        var full = entriesPath + "/" + encodeURIComponent(eid);
        firestoreDeleteDocument(full);
      });
    }
  });

  Logger.log("Czyszczenie zakończone.");
}

/************************************************************
 * TEST 1 – wymagane pola w arkuszu setup
 * Sprawdzamy BEZPOŚREDNIO getSetup(), bo to jest odbicie arkusza.
 ************************************************************/
function test_hours_config_required() {
  const name = "test_hours_config_required";
  Logger.log("=== TEST: " + name + " ===");

  try {
    // To jest "goła" mapa z arkusza – klucze takie, jak w kolumnie Zmienna_nazwa
    var setup = getSetup();

    // WYMAGANE KLUCZE W ARKUSZU
    var requiredKeys = [
      "max_liczba_dni_na_zgloszenie_godzinek",
      "okres_do_archiwizacji_godzinek",
      "okres_wygasania_godzinek",
      "limit_debetu_godzinek",
      "cena_wykupu_godzinki",
      "bonus_miesieczny_zarzad"
    ];

    requiredKeys.forEach(function(key) {
      if (!(key in setup)) {
        throw new Error("Brak wymaganej zmiennej w setup (arkusz): " + key);
      }
      var v = setup[key];
      if (typeof v !== 'number' || isNaN(v)) {
        throw new Error("Zmienna setup." + key + " musi być LICZBĄ, jest: " + v);
      }
    });

    _hoursTestPush(name, true);

  } catch (e) {
    _hoursTestPush(name, false, e);
  }
}

/************************************************************
 * TEST 2 — FIFO (hours_data)
 ************************************************************/
function test_hours_fifo_basic() {
  const name = "test_hours_fifo_basic";
  Logger.log("=== TEST: " + name + " ===");

  try {
    const email = "fifo@test.pl";

    // 1) 3 wpisy z różnymi datami
    hours_data.addHoursEntry(email, 5, "2024-01-01", new Date(), "A");
    hours_data.addHoursEntry(email, 10, "2024-02-01", new Date(), "B");
    hours_data.addHoursEntry(email, 7, "2024-03-01", new Date(), "C");

    // 2) konsumujemy 8 h → powinno zejść 5 + 3 z kolejnego
    const consumed = hours_data.consumePositiveHours(email, 8);

    if (consumed.consumedTotal !== 8) {
      throw new Error("Powinno zużyć 8 h, jest: " + consumed.consumedTotal);
    }

    if (consumed.details.length !== 2) {
      throw new Error("FIFO powinno zejść z dwóch wpisów, entries=" + consumed.details.length);
    }

    // 3) saldo: 5 + 10 + 7 - 8 = 14
    const bal = hours_data.getBalance(email);
    if (bal !== 14) {
      throw new Error("Saldo powinno wynosić 14, jest: " + bal);
    }

    _hoursTestPush(name, true);

  } catch (e) {
    _hoursTestPush(name, false, e);
  }
}

/************************************************************
 * TEST 3 — logika debetu (HOURS_ECONOMY_RULES)
 ************************************************************/
function test_hours_debit_limit() {
  const name = "test_hours_debit_limit";
  Logger.log("=== TEST: " + name + " ===");

  try {
    const email = "debet@test.pl";

    // Używamy KANONICZNEGO CONFIGU, który masz w CONFIG:
    // { maxDaysToReport, archiveAfterDays, expiryMonths, debitLimit, hourPrice, monthlyBonusBoard }
    const cfg = HOURS_CONFIG.load();
    const limit = cfg.debitLimit;

    // koszt = limit → OK, saldo powinno spaść do -limit
    hoursRules_applyRentalCost(email, limit, "test-limit");
    let bal = hours_data.getBalance(email);
    if (bal !== -limit) {
      throw new Error("Saldo po zejściu do limitu powinno wynosić -" + limit + ", jest: " + bal);
    }

    // koszt ponad limit → powinno zostać odrzucone
    const result = hoursRules_applyRentalCost(email, 1, "test-ponad-limit");
    if (result.ok) {
      throw new Error("System pozwolił zejść poniżej limitu debetu!");
    }

    // wykup — tylko do zera
    hoursRules_purchaseHours(email, limit, "wykup-test");
    bal = hours_data.getBalance(email);
    if (bal !== 0) {
      throw new Error("Po wykupie saldo powinno wynosić 0, jest: " + bal);
    }

    _hoursTestPush(name, true);

  } catch (e) {
    _hoursTestPush(name, false, e);
  }
}

/************************************************************
 * TEST 4 — wygasanie godzinek (expiryMonths)
 ************************************************************/
function test_hours_expiry() {
  const name = "test_hours_expiry";
  Logger.log("=== TEST: " + name + " ===");

  try {
    const email = "expiry@test.pl";
    const cfg = HOURS_CONFIG.load();
    const months = cfg.expiryMonths;   // ← dopasowane do getHoursConfig_()

    // wpis sprzed (months + 1) miesięcy → powinien wygasnąć
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - (months + 1));
    const isoOld = oldDate.toISOString().substring(0, 10);  // 'YYYY-MM-DD'

    hours_data.addHoursEntry(email, 5, isoOld, new Date(), "old-expired");
    // świeży wpis — zostaje
    hours_data.addHoursEntry(email, 7, "2024-05-05", new Date(), "fresh");

    // Czyścimy wygasłe
    hours_data.cleanupExpiredHours(email);

    const bal = hours_data.getBalance(email);
    if (bal !== 7) {
      throw new Error("Po wygaszeniu saldo powinno wynosić 7, jest: " + bal);
    }

    _hoursTestPush(name, true);

  } catch (e) {
    _hoursTestPush(name, false, e);
  }
}

/************************************************************
 * RUNNER
 ************************************************************/
function runHoursTests() {
  Logger.log("=== KONIECZNY SYNC SETUP ===");
  syncSetup();   // używa loadSetupRaw + Firestore

  Logger.log("=== START TESTÓW GODZINEK ===");

  hoursTests_clearHoursCollections();
  HOURS_TEST_RESULTS = [];

  [
    test_hours_config_required,
    test_hours_fifo_basic,
    test_hours_debit_limit,
    test_hours_expiry
  ].forEach(function(fn) {
    try {
      fn();
    } catch (e) {
      _hoursTestPush(fn.name, false, e);
    }
  });

  Logger.log("=== WYNIKI TESTÓW ===");
  HOURS_TEST_RESULTS.forEach(function(r) {
    if (r.ok) Logger.log(r.name + " – OK");
    else      Logger.log(r.name + " – FAIL: " + r.msg);
  });

  Logger.log("=== KONIEC TESTÓW GODZINEK ===");
}
