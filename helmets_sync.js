function syncHelmets() {
  Logger.log("=== SYNC HELMETS START ===");

  const items = getHelmetsConfig();
  const validDocIds = [];

  items.forEach((p, index) => {

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = HELMETS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    // --- dane statyczne ---
    const data = {
      id: p.id,
      numer: p.numer,
      producent: p.producent,
      model: p.model,
      kolor: p.kolor,
      rozmiar: p.rozmiar,
      basen: p.basen,
      uwagi: p.uwagi,
    };

    // --- dane dynamiczne ---
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
    firestorePatchDocument(docPath, data, updateMask);

    Logger.log("PATCH " + (index + 1) + "/" + items.length + " → " + docId);
    Utilities.sleep(100);
  });

  firestoreCleanupOrphans(HELMETS_COLLECTION, validDocIds);
  Logger.log("=== SYNC HELMETS END ===");
}
