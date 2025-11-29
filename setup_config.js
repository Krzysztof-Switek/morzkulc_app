/********************************************************************
 * setup_config.gs
 * Poprawiona wersja — pełna normalizacja nazw kluczy
 * ---------------------------------------------------
 * - usuwa wszystkie rodzaje whitespace (NBSP, NNBSP, itp.)
 * - normalizuje Unicode (NFKC)
 * - trim() standardowy
 * - pełny plik gotowy do użycia
 ********************************************************************/

/************************************************************
 * TEST RĘCZNY
 ************************************************************/
function testSetupRead() {
  const setup = getSetup();
  Logger.log(JSON.stringify(setup, null, 2));
}

/************************************************************
 * Zwraca mapę zmiennych z arkusza "setup".
 * Używa cache (15 min).
 ************************************************************/
function getSetup() {
  const CACHE_KEY = "setup_config_cache";
  const cache = CacheService.getScriptCache();

  // 1) Cache
  const cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // 2) Brak → wczytujemy
  const setup = loadSetup();

  // 3) Zapisujemy cache
  cache.put(CACHE_KEY, JSON.stringify(setup), 900);

  return setup;
}

/************************************************************
 * Normalizacja kluczy — usuwa wszystkie dziwne spacje
 ************************************************************/
function normalizeKey_(key) {
  if (!key) return "";
  return String(key)
    .replace(/[\u00A0\u202F\u3000]/g, " ") // NBSP, NNBSP, IDEOGRAPHIC SPACE
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC");
}

/************************************************************
 * Czyta arkusz setup (normalna wersja, z konwersją dat)
 ************************************************************/
function loadSetup() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName("setup");

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const idxName  = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");

  const setup = {};

  data.forEach(row => {
    let rawKey = row[idxName];
    if (!rawKey) return;

    const key = normalizeKey_(rawKey);
    const rawVal = row[idxValue];

    let v = rawVal;

    // Daty → "MM-DD"
    if (rawVal instanceof Date) {
      const mm = String(rawVal.getMonth() + 1).padStart(2, '0');
      const dd = String(rawVal.getDate()).padStart(2, '0');
      setup[key] = `${mm}-${dd}`;
      return;
    }

    // Tekstowa liczba → number
    if (typeof rawVal === "string" && rawVal.match(/^\d+$/)) {
      v = Number(rawVal);
    }

    setup[key] = v;
  });

  return setup;
}

/************************************************************
 * loadSetupRaw() — 100% surowe dane, bez cache
 ************************************************************/
function loadSetupRaw() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName("setup");

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const idxName  = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");

  const result = {};

  data.forEach(row => {
    let rawKey = row[idxName];
    if (!rawKey) return;

    const key = normalizeKey_(rawKey);
    const rawVal = row[idxValue];
    let v = rawVal;

    if (typeof rawVal === "string") {
      v = rawVal
        .replace(/[\u00A0\u202F\u3000]/g, " ")
        .trim();
      if (v.match(/^\d+$/)) v = Number(v);
    }

    result[key] = v;
  });

  return result;
}
