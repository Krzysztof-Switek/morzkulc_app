/***************************************************
 * TESTY – część 2: role, limity, access, horyzonty,
 * full-flow oraz GLOBALNE PODSUMOWANIE
 ***************************************************/

/***************************************************
 * MAIL/E-MAIL testowy (jak w TESTY_1)
 ***************************************************/
var TEST_EMAIL_ZARZAD   = "zarzad@gmail.com";
var TEST_EMAIL_CZLONEK  = "czlonek@gmail.com";
var TEST_EMAIL_KANDYDAT = "kandydat@tlen.pl";
var TEST_EMAIL_NOACCESS = "no_access@gmail.com";
var TEST_EMAIL_GOSC     = "nieistniejacy_uzytkownik@przyklad.pl";

var TEST_TYPE_DEFAULT = "kayak";

/***************************************************
 * HELPERY
 ***************************************************/
function logJson_(label, obj) {
  Logger.log("=== " + label + " ===");
  Logger.log(JSON.stringify(obj, null, 2));
}

function toIsoString_(d) {
  return d.toISOString();
}

function addDays_(date, days) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/***************************************************
 * HELPERY — znajdowanie sprzętu
 ***************************************************/
function findFirstAvailableItem_(type) {
  var items = getItemsByType(type);
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var isSprawny   = (it.sprawny !== false);
    var isDostepny  = (it.dostepny !== false);
    var isPrywatny  = (it.prywatny === true);

    if (isSprawny && isDostepny && !isPrywatny) {
      return it;
    }
  }
  return null;
}

/***************************************************
 * TEST A – Basic role mapping
 ***************************************************/
function test_roles_basic_mapping() {
  try {
    var emails = [
      { label: "ZARZAD",   email: TEST_EMAIL_ZARZAD },
      { label: "CZLONEK",  email: TEST_EMAIL_CZLONEK },
      { label: "KANDYDAT", email: TEST_EMAIL_KANDYDAT },
      { label: "NOACCESS", email: TEST_EMAIL_NOACCESS },
      { label: "GOSC",     email: TEST_EMAIL_GOSC },
    ];

    emails.forEach(function (t) {
      var ctx = getUserContext(t.email);
      Logger.log(t.label + " → role=" + ctx.role);
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * TEST B – rent dla każdej roli
 ***************************************************/
function test_rent_one_item_all_roles() {
  try {
    var item = findFirstAvailableItem_(TEST_TYPE_DEFAULT);
    if (!item) throw "Brak dostępnego sprzętu";

    var rolesToTest = [
      { label: "ZARZAD",   email: TEST_EMAIL_ZARZAD },
      { label: "CZLONEK",  email: TEST_EMAIL_CZLONEK },
      { label: "KANDYDAT", email: TEST_EMAIL_KANDYDAT },
      { label: "NOACCESS", email: TEST_EMAIL_NOACCESS },
      { label: "GOSC",     email: TEST_EMAIL_GOSC },
    ];

    rolesToTest.forEach(function (t) {
      var res = rentItem(TEST_TYPE_DEFAULT, item.id, t.email, "", "");
      Logger.log("ROLE " + t.label + ": " + JSON.stringify(res));
      if (res && res.ok) {
        returnItem(TEST_TYPE_DEFAULT, item.id);
      }
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * TEST C – Limit wypożyczeń (członek)
 ***************************************************/
function test_rent_limit_for_member() {
  try {
    var email = TEST_EMAIL_CZLONEK;
    var ctx = getUserContext(email);

    if (!ctx.limits || ctx.limits.maxItems <= 0)
      return { ok: true, note: "Brak limitu – pomijam test" };

    var allKayaks = getItemsByType(TEST_TYPE_DEFAULT);
    var avail = allKayaks.filter(k =>
      (k.sprawny !== false) &&
      (k.dostepny !== false) &&
      (!k.prywatny)
    );

    if (avail.length < ctx.limits.maxItems + 1)
      return { ok: true, note: "Za mało sprzętu → pomijam test" };

    var rented = [];

    for (var i = 0; i < ctx.limits.maxItems + 1; i++) {
      var id = avail[i].id;
      var res = rentItem(TEST_TYPE_DEFAULT, id, email, "", "");
      Logger.log("TRY #" + (i + 1) + ": " + JSON.stringify(res));

      if (res.ok) rented.push(id);
      else break;
    }

    rented.forEach(id => returnItem(TEST_TYPE_DEFAULT, id));

    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * TEST D – Horyzont rezerwacji
 ***************************************************/
function test_reservation_horizon_for_member() {
  try {
    var email = TEST_EMAIL_CZLONEK;
    var ctx = getUserContext(email);

    var maxWeeks = ctx.limits && ctx.limits.maxTimeWeeks;
    if (!maxWeeks) return { ok: true, note: "brak horyzontu" };

    var now = new Date();
    var nearStart = addDays_(now, 1);
    var nearEnd = addDays_(now, 2);

    var farStart = addDays_(now, maxWeeks * 7 + 5);
    var farEnd = addDays_(farStart, 2);

    validateReservationHorizon(
      toIsoString_(nearStart),
      toIsoString_(nearEnd),
      maxWeeks
    );

    validateReservationHorizon(
      toIsoString_(farStart),
      toIsoString_(farEnd),
      maxWeeks
    );

    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * TEST E – full flow (kandydat: rezerwacja → wypożyczenie)
 ***************************************************/
function test_full_flow_candidate_reserve_then_rent() {
  try {
    var email = TEST_EMAIL_KANDYDAT;
    var ctx = getUserContext(email);

    var item = findFirstAvailableItem_(TEST_TYPE_DEFAULT);
    if (!item) throw "Brak dostępnego sprzętu";

    var now = new Date();
    var start = addDays_(now, 1);
    var end = addDays_(now, 2);

    var rez = reserveItem(
      TEST_TYPE_DEFAULT,
      item.id,
      email,
      toIsoString_(start),
      toIsoString_(end)
    );
    Logger.log("Rez: " + JSON.stringify(rez));

    var rent = rentItem(TEST_TYPE_DEFAULT, item.id, email, "", "");
    Logger.log("Rent: " + JSON.stringify(rent));

    returnItem(TEST_TYPE_DEFAULT, item.id);

    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * RUNNER – uruchamia testy z TESTY_1 i TESTY_2
 ***************************************************/
function runAllBackendTests() {

  Logger.log("=== ALL BACKEND TESTS START ===");

  var tests = [
    // TESTY 1 (sprzęt)
    { name: "testPaddlesAll",                          fn: testPaddlesAll },
    { name: "testLifejacketsFull",                     fn: testLifejacketsFull },
    { name: "testHelmetsFull",                         fn: testHelmetsFull },
    { name: "testThrowbagsFull",                       fn: testThrowbagsFull },
    { name: "testSprayskirtsFull",                     fn: testSprayskirtsFull },

    // TESTY 2 (role / limity)
    { name: "test_roles_basic_mapping",                fn: test_roles_basic_mapping },
    { name: "test_rent_one_item_all_roles",            fn: test_rent_one_item_all_roles },
    { name: "test_rent_limit_for_member",              fn: test_rent_limit_for_member },
    { name: "test_reservation_horizon_for_member",     fn: test_reservation_horizon_for_member },
    { name: "test_full_flow_candidate_reserve_then_rent", fn: test_full_flow_candidate_reserve_then_rent }
  ];

  var summary = [];

  tests.forEach(t => {
    try {
      var res = t.fn();
      if (res && res.ok) summary.push(t.name + " – OK");
      else summary.push(t.name + " – FAIL: " + (res && res.error));
    } catch (e) {
      summary.push(t.name + " – FAIL: " + e);
    }
  });

  Logger.log("=== ALL BACKEND TESTS END ===");

  Logger.log("=== PODSUMOWANIE TESTÓW ===");
  summary.forEach(s => Logger.log(s));
}

/***************************************************
 * KONIEC PLIKU TESTY_2
 ***************************************************/
