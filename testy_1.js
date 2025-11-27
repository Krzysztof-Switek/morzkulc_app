/***************************************************
 * TESTY – część 1: sprzęt + helpery sprzętowe
 ***************************************************/

/***************************************************
 * FIRESTORE – DEBUG (pozostawione bez zmian)
 ***************************************************/
function testFirestoreDocuments() {
  const projectId = 'sprzet-skk-morzkulc';
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    projectId +
    '/databases/(default)/documents/kayaks';

  const token = ScriptApp.getOAuthToken();

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  Logger.log('CODE: ' + response.getResponseCode());
  Logger.log(response.getContentText());
}

function testAuth() {
  Logger.log(ScriptApp.getOAuthToken());
}

function forceReauth() {
  UrlFetchApp.fetch("https://www.googleapis.com/auth/userinfo.email");
}

/***************************************************
 * HELPER – ładne logi
 ***************************************************/
function logJson_(label, obj) {
  Logger.log("=== " + label + " ===");
  Logger.log(JSON.stringify(obj, null, 2));
}

/***************************************************
 * HELPER – znajdź pierwszy dostępny sprzęt
 ***************************************************/
function findFirstAvailableItem_(type) {
  var items = getItemsByType(type);
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if ((it.sprawny !== false) &&
        (it.dostepny !== false) &&
        (it.prywatny !== true)) {
      return it;
    }
  }
  return null;
}

/***************************************************
 * TESTY SPRZĘTU — WIOSŁA
 ***************************************************/
function testPaddlesAll() {
  Logger.log("=== TEST WIOSEŁ START ===");

  try {
    const items = getItemsByType('paddle');
    Logger.log("TEST 1: Pobieranie → OK, liczba: " + items.length);

    const rent = rentItem('paddle', '1', TEST_EMAIL_CZLONEK, '', '');
    Logger.log("TEST 2: Wypożyczenie (członek) → " + JSON.stringify(rent));

    const rent2 = rentItem('paddle', '1', TEST_EMAIL_KANDYDAT, '', '');
    Logger.log("TEST 3: Blokada wypożyczenia → " + JSON.stringify(rent2));

    const ret = returnItem('paddle', '1');
    Logger.log("TEST 4: Zwrot → " + JSON.stringify(ret));

    const res = reserveItem(
      'paddle','2',TEST_EMAIL_CZLONEK,'2025-01-01','2025-01-02'
    );
    Logger.log("TEST 5: Rezerwacja → " + JSON.stringify(res));

    rentItem('paddle','3',TEST_EMAIL_CZLONEK,'','');
    const res2 = reserveItem('paddle','3',TEST_EMAIL_KANDYDAT,'','');
    Logger.log("TEST 6: Blokada rezerwacji wypożyczonego → " + JSON.stringify(res2));

    returnItem('paddle','3');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * LIFEJACKETS — pełny test
 ***************************************************/
function testLifejacketsFull() {
  Logger.log("=== TEST LIFEJACKETS START ===");
  try {
    const cfg = getLifejacketsConfig();
    if (!cfg.length) throw "Brak danych w arkuszu";

    const first = cfg[0];

    const docPath = LIFEJACKETS_COLLECTION + "/" + first.firestoreId;
    if (!firestoreDocumentExists(docPath))
      throw "Dokument kamizelki nie istnieje w FS";

    const raw = firestoreGetCollection(LIFEJACKETS_COLLECTION);
    const mapped = raw.documents.map(d => mapLifejacketDocument(d));
    const m0 = mapped.find(m => m.id === first.firestoreId);
    if (!m0) throw "mapLifejacketDocument nie zwrócił dokumentu";

    const items = getItemsByType("lifejacket");
    const it0 = items[0];

    const rent = rentItem("lifejacket", it0.id, TEST_EMAIL_CZLONEK, "", "");
    if (rent.error) throw rent.error;

    returnItem("lifejacket", it0.id);
    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * HELMETS — pełny test
 ***************************************************/
function testHelmetsFull() {
  Logger.log("=== TEST HELMETS START ===");
  try {
    const cfg = getHelmetsConfig();
    if (!cfg.length) throw "Brak danych";

    const docPath = HELMETS_COLLECTION + "/" + cfg[0].id;
    if (!firestoreDocumentExists(docPath))
      throw "Dokument nie istnieje w FS";

    const items = getItemsByType("helmet");
    const it0 = items[0];

    const rent = rentItem("helmet", it0.id, TEST_EMAIL_CZLONEK, "", "");
    if (rent.error) throw rent.error;

    returnItem("helmet", it0.id);

    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * THROWBAGS — pełny test
 ***************************************************/
function testThrowbagsFull() {
  Logger.log("=== TEST THROWBAGS START ===");
  try {
    const cfg = getThrowbagsConfig();
    if (!cfg.length) throw "Brak danych";

    const docPath = THROWBAGS_COLLECTION + "/" + cfg[0].id;
    if (!firestoreDocumentExists(docPath))
      throw "Dokument nie istnieje";

    const items = getItemsByType("throwbag");
    const it0 = items[0];

    const rent = rentItem("throwbag", it0.id, TEST_EMAIL_CZLONEK, "", "");
    if (rent.error) throw rent.error;

    returnItem("throwbag", it0.id);

    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * SPRAYSKIRTS — pełny test
 ***************************************************/
function testSprayskirtsFull() {
  Logger.log("=== TEST SPRAYSKIRTS START ===");
  try {
    const cfg = getSprayskirtsConfig();
    if (!cfg.length) throw "Brak danych";

    const items = getItemsByType("sprayskirt");
    const it0 = items[0];

    const rent = rentItem("sprayskirt", it0.id, TEST_EMAIL_CZLONEK, "", "");
    if (rent.error) throw rent.error;

    returnItem("sprayskirt", it0.id);
    return { ok: true };

  } catch (e) {
    return { ok: false, error: e };
  }
}

/***************************************************
 * KONIEC PLIKU TESTY_1
 ***************************************************/
