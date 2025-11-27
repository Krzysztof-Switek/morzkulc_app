/**
 * SYNC WIOSŁA → Firestore
 */

function syncPaddles() {
  Logger.log("=== SYNC PADDLES START ===");

  const paddles = getPaddlesConfig();
  Logger.log("Wiosła z arkusza: " + paddles.length);

  const validDocIds = [];

  paddles.forEach((p, index) => {

    if (!p.firestoreId || p.firestoreId.trim() === "") {
      Logger.log("ERROR: brak firestoreId w wierszu ID=" + p.id);
      return;
    }

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = PADDLES_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

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
      uwagi: p.uwagi,
    };

    let updateMask = Object.keys(data);

    if (!exists) {
      data.version = 1;
      updateMask.push("version");

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

      updateMask = Object.keys(data);
    }

    firestorePatchDocument(docPath, data, updateMask);

    Utilities.sleep(100);
  });

  firestoreCleanupOrphans(PADDLES_COLLECTION, validDocIds);
  Logger.log("=== SYNC PADDLES END ===");
}
