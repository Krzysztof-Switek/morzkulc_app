/**
 * SYNC ZAKŁADKI "setup" → Firestore /setup/{variableName}
 * --------------------------------------------------------
 * 1 dokument w Firestore = 1 zmienna z arkusza
 * Używa loadSetupRaw() → bez cache, zawsze czyta arkusz.
 */

const SETUP_COLLECTION = "setup";

/**
 * Konwersja wartości z arkusza setup → Firestore-friendly
 * - Daty: Date → "MM-DD"
 * - Liczby: number
 * - Tekst: string
 */
function convertSetupValue(rawValue) {

  if (rawValue instanceof Date) {
    const month = String(rawValue.getMonth() + 1).padStart(2, "0");
    const day   = String(rawValue.getDate()).padStart(2, "0");
    return month + "-" + day;
  }

  if (typeof rawValue === "number") {
    return rawValue;
  }

  return String(rawValue);
}

/**
 * TEST — ręczne uruchomienie
 */
function testSyncSetup() {
  Logger.log("=== TEST SYNC SETUP ===");
  syncSetup();
}

/**
 * Główna funkcja synchronizująca
 */
function syncSetup() {
  const setup = loadSetupRaw(); 
  Logger.log("SYNC setup variables count: " + Object.keys(setup).length);
  Logger.log("SYNC SETUP RAW = " + JSON.stringify(setup, null, 2));

  Object.keys(setup).forEach(key => {
    const value = setup[key];
    const docPath = SETUP_COLLECTION + "/" + encodeURIComponent(key);

    const data = { value: convertSetupValue(value) };
    const updateMask = ["value"];

    const result = firestorePatchDocument(docPath, data, updateMask);
    Logger.log("SYNC → setup/" + key + " = " + JSON.stringify(result));
  });

  Logger.log("=== SETUP SYNC DONE ===");
}
