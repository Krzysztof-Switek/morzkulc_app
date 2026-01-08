/**
 * SYNC ZAKŁADKI "setup" → Firestore /setup/{variableName}
 *
 * loadSetupRaw() zwraca teraz połączone dane z DWÓCH arkuszy:
 *  - CONFIG.EQUIPMENT_SPREADSHEET_ID
 *  - CONFIG.MEMBERS_SPREADSHEET_ID
 */

const SETUP_COLLECTION = "setup";


/** Konwersja wartości do Firestore */
function convertSetupValue(rawValue) {
  if (rawValue instanceof Date) {
    const month = String(rawValue.getMonth() + 1).padStart(2, "0");
    const day   = String(rawValue.getDate()).padStart(2, "0");
    return month + "-" + day;
  }
  if (typeof rawValue === "number") return rawValue;
  return String(rawValue);
}


/** Główna funkcja synchronizacji */
function syncSetup() {
  const setup = loadSetupRaw(); // unified raw (sprzęt + członkowie)

  Object.keys(setup).forEach(key => {
    const value = setup[key];
    const docPath = SETUP_COLLECTION + "/" + encodeURIComponent(key);

    const data = { value: convertSetupValue(value) };
    const updateMask = ["value"];

    firestorePatchDocument(docPath, data, updateMask);
  });
}
