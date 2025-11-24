/**
 * SYNC ZAKŁADKI "setup" → Firestore /setup/{variableName}
 * --------------------------------------------------------
 * 1 dokument w Firestore = 1 zmienna z arkusza
 * Używa getSetupRaw() → bez cache, zawsze czyta arkusz.
 */

const SETUP_COLLECTION = "setup";

/**
 * Konwersja wartości z arkusza setup → Firestore-friendly
 * - Daty: zamieniamy Date → "MM-DD"
 * - Liczby: zostają liczbami
 * - Tekst: String
 */
function convertSetupValue(rawValue) {

  // DATY (np. semestr_1_start)
  if (rawValue instanceof Date) {
    const month = String(rawValue.getMonth() + 1).padStart(2, "0");
    const day   = String(rawValue.getDate()).padStart(2, "0");
    return month + "-" + day;     // format "MM-DD"
  }

  // LICZBY
  if (typeof rawValue === "number") {
    return rawValue;
  }

  // STRING / reszta
  return String(rawValue);
}


/**
 * TEST — ręczne uruchomienie synchronizacji
 */
function testSyncSetup() {
  Logger.log("=== TEST SYNC SETUP ===");
  syncSetup();
}

/**
 * Główna funkcja synchronizująca wszystkie zmienne setup
 */
function syncSetup() {
  const setup = loadSetupRaw(); 
  Logger.log("SYNC setup variables count: " + Object.keys(setup).length);

  Object.keys(setup).forEach(key => {
    const value = setup[key];
    const docPath = SETUP_COLLECTION + "/" + encodeURIComponent(key);

    const data = { value: convertSetupValue(value) };  // ← TU JEST ZMIANA
    const updateMask = ["value"];

    const result = firestorePatchDocument(docPath, data, updateMask);

    Logger.log("SYNC → setup/" + key + " = " + JSON.stringify(result));
  });

  Logger.log("=== SETUP SYNC DONE ===");
}

