function testSetupRead() {
  const setup = getSetup();
  Logger.log(JSON.stringify(setup, null, 2));
}


/**
 * ZWRACA SŁOWNIK WSZYSTKICH ZMIENNYCH Z ZAKŁADKI "setup"
 * w formacie:
 * { zmienna_nazwa: wartość_liczbowa_lub_tekstowa }
 *
 * używa CacheService aby nie czytać arkusza przy każdym wywołaniu
 */
function getSetup() {
  const CACHE_KEY = "setup_config_cache";
  const cache = CacheService.getScriptCache();

  // 1. próbujemy cache
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. brak w cache → czytamy arkusz
  const setup = loadSetup();

  // 3. zapisujemy w cache na 15 minut
  cache.put(CACHE_KEY, JSON.stringify(setup), 900);

  return setup;
}


/**
 * CZYTA ARKUSZ "setup" I ZWRACA MAPĘ KLUCZ → WARTOŚĆ
 */
function loadSetup() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName("setup");

  const data = sheet.getDataRange().getValues(); // cała tabelka
  const headers = data.shift(); // A1:D1

  // indeksy kolumn
  const idxName = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");

  const setup = {};

  data.forEach(row => {
  const key = row[idxName];
  const rawValue = row[idxValue];

  if (!key || key === "") return;

  let v = rawValue;

  // >>> NOWOŚĆ: obsługa dat (np. 01.01 – Google Sheets zamienia na Date)
  if (rawValue instanceof Date) {
    const mm = String(rawValue.getMonth() + 1).padStart(2, '0');
    const dd = String(rawValue.getDate()).padStart(2, '0');
    setup[key] = `${mm}-${dd}`;
    return;
  }

  // automatyczna konwersja liczby zapisanej jako tekst
  if (typeof rawValue === "string" && rawValue.match(/^\d+$/)) {
    v = Number(rawValue);
  }

  setup[key] = v;
});


  return setup;
}

/**
 * SUROWE DANE Z ARKUSZA (bez cache!)
 * używane tylko do syncSetup()
 */
function loadSetupRaw() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("setup");

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const idxName = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");

  const result = {};

  data.forEach(row => {
    const key = row[idxName];
    const raw = row[idxValue];
    if (!key) return;

    let v = raw;

    // konwersja liczb
    if (typeof raw === "string" && raw.match(/^\d+$/)) {
      v = Number(raw);
    }

    result[key] = v;
  });

  return result;
}

