/**
 * SYNC WIOSŁA (paddles) → Firestore
 * - pełna inicjalizacja przy pierwszym syncu
 * - logowanie progresu
 * - throttle (Utilities.sleep), żeby nie zabić Firestore
 */
function syncPaddles() {
  Logger.log("=== SYNC PADDLES START ===");

  const paddles = getPaddlesConfig();
  Logger.log("Wiosła (paddles) z arkusza: " + paddles.length);

  const validDocIds = [];

  paddles.forEach((p, index) => {

    if (!p.firestoreId || p.firestoreId.trim() === "") {
      Logger.log("ERROR: brak ID w wierszu dla wiosła ID=" + p.id);
      return;
    }

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = PADDLES_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    // --- DANE STATYCZNE ---
    const data = {
      id: p.id,
      numer: p.numer,
      producent: p.producent,
      model: p.model,
      kolor: p.kolor,          
      rodzaj: p.rodzaj,
      dlugosc: p.dlugosc,
      skladane: p.skladane,
      basen: p.basen,
      uwagi: p.uwagi
    };

    // --- DANE DYNAMICZNE (tylko jeśli dokument pierwszy raz tworzony) ---
    if (!exists) {
      data.sprawny = true;
      data.prywatny = false;

      data.dostepny = true;
      data.aktualnyUzytkownik = "";
      data.od = "";
      data.do = "";

      data.rezerwacjaAktywna = false;
      data.rezerwujacy = "";
      data.rezerwacjaOd = "";
      data.rezerwacjaDo = "";
    }

    const updateMask = Object.keys(data);

    // PATCH + minimalny log
    firestorePatchDocument(docPath, data, updateMask);
    Logger.log("PATCH " + (index + 1) + "/" + paddles.length + " → " + docId);

    // THROTTLE – unikamy limitów Firestore
    Utilities.sleep(100);
  });

  // Usuwamy sieroty
  firestoreCleanupOrphans(PADDLES_COLLECTION, validDocIds);

  Logger.log("=== SYNC PADDLES END ===");
}

function testSyncPaddles() {
  syncPaddles();
}
