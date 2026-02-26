/********************************************************************
 * setup_config.gs — unified setup (sprzęt + członkowie)
 ********************************************************************/

/************************************************************
 * Cache
 ************************************************************/
function getSetup() {
  const CACHE_KEY = "setup_config_cache";
  const cache = CacheService.getScriptCache();

  const cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const setup = loadSetup();
  cache.put(CACHE_KEY, JSON.stringify(setup), 900);

  return setup;
}

/************************************************************
 * Normalizacja kluczy
 ************************************************************/
function normalizeKey_(key) {
  if (!key) return "";
  return String(key)
    .replace(/[\u00A0\u202F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC");
}

/************************************************************
 * Loader setupu z JEDNEGO arkusza
 ************************************************************/
function _loadSetupFromSheet_(spreadsheetId) {
  const result = {};
  if (!spreadsheetId) return result;

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("setup");
  if (!sheet) return result;

  const data = sheet.getDataRange().getValues();
  if (!data.length) return result;

  const headers = data.shift();
  const idxName  = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");
  if (idxName === -1 || idxValue === -1) return result;

  data.forEach(row => {
    const rawKey = row[idxName];
    if (!rawKey) return;

    const key = normalizeKey_(rawKey);
    if (!key) return;

    if (key.toLowerCase().startsWith("place_holder")) return;

    const rawVal = row[idxValue];

    if (rawVal instanceof Date) {
      const mm = String(rawVal.getMonth() + 1).padStart(2, '0');
      const dd = String(rawVal.getDate()).padStart(2, '0');
      result[key] = `${mm}-${dd}`;
      return;
    }

    if (typeof rawVal === "string" && rawVal.match(/^\d+$/)) {
      result[key] = Number(rawVal);
      return;
    }

    result[key] = rawVal;
  });

  return result;
}

/************************************************************
 * RAW loader (bez konwersji)
 ************************************************************/
function _loadSetupRawFromSheet_(spreadsheetId) {
  const result = {};
  if (!spreadsheetId) return result;

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("setup");
  if (!sheet) return result;

  const data = sheet.getDataRange().getValues();
  if (!data.length) return result;

  const headers = data.shift();
  const idxName  = headers.indexOf("Zmienna_nazwa");
  const idxValue = headers.indexOf("Wartość_zmiennej");
  if (idxName === -1 || idxValue === -1) return result;

  data.forEach(row => {
    const rawKey = row[idxName];
    if (!rawKey) return;

    const key = normalizeKey_(rawKey);
    if (!key) return;

    if (key.toLowerCase().startsWith("place_holder")) return;

    let v = row[idxValue];
    if (typeof v === "string") {
      v = v.replace(/[\u00A0\u202F\u3000]/g, " ").trim();
      if (v.match(/^\d+$/)) v = Number(v);
    }

    result[key] = v;
  });

  return result;
}

/************************************************************
 * Merge
 ************************************************************/
function _mergeSetupObjects_() {
  const merged = {};
  [...arguments].forEach(obj => {
    Object.keys(obj || {}).forEach(k => {
      merged[k] = obj[k];
    });
  });
  return merged;
}

/************************************************************
 * PUBLIC: loadSetup()
 ************************************************************/
function loadSetup() {
  const setupEquipment = _loadSetupFromSheet_(CONFIG.EQUIPMENT_SPREADSHEET_ID);
  const setupUsers     = _loadSetupFromSheet_(CONFIG.USERS_SPREADSHEET_ID);
  return _mergeSetupObjects_(setupEquipment, setupUsers);
}

/************************************************************
 * PUBLIC: loadSetupRaw()
 ************************************************************/
function loadSetupRaw() {
  const rawEquipment = _loadSetupRawFromSheet_(CONFIG.EQUIPMENT_SPREADSHEET_ID);
  const rawUsers     = _loadSetupRawFromSheet_(CONFIG.USERS_SPREADSHEET_ID);
  return _mergeSetupObjects_(rawEquipment, rawUsers);
}

/********************************************************************
 *  AUTO-FIX SETUP HEADERS
 *  Naprawia nagłówki arkuszy "setup" w obu spreadsheetach:
 *  - usuwa ukryte znaki (NBSP, NARROW NBSP, IDEOGRAPHIC SPACE)
 *  - normalizuje unicode
 *  - wymusza poprawne nazwy kolumn:
 *      "Zmienna_nazwa"
 *      "Wartość_zmiennej"
 *
 * Uruchamiasz ręcznie: fixSetupHeaders()
 ********************************************************************/
function fixSetupHeaders() {
  const sheetsToFix = [
    CONFIG.EQUIPMENT_SPREADSHEET_ID,
    CONFIG.USERS_SPREADSHEET_ID
  ];

  sheetsToFix.forEach(id => _fixHeadersInSheet_(id));

  Logger.log("AUTO-FIX zakończony ✔ Wszystkie nagłówki w setup zostały poprawione.");
}

function _fixHeadersInSheet_(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sh = ss.getSheetByName("setup");
  if (!sh) {
    Logger.log("Brak zakładki setup w: " + spreadsheetId);
    return;
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const cleaned = headers.map(h => _cleanHeaderValue_(h));

  // Wymuszenie poprawnych nazw pierwszych dwóch kolumn
  cleaned[0] = "Zmienna_nazwa";
  cleaned[1] = "Wartość_zmiennej";

  sh.getRange(1, 1, 1, cleaned.length).setValues([cleaned]);

  Logger.log(`Nagłówki poprawione w arkuszu: ${spreadsheetId} → setup`);
}

function _cleanHeaderValue_(value) {
  if (!value) return "";
  
  return String(value)
    .replace(/[\u00A0\u202F\u3000]/g, " ") // usuń specjalne spacje
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC");
}

