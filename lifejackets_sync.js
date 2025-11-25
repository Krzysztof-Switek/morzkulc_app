function syncLifejackets() {
  Logger.log("=== SYNC LIFEJACKETS START ===");

  const items = getLifejacketsConfig();
  const validDocIds = [];

  items.forEach((p, index) => {

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = LIFEJACKETS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    // --- DANE STATYCZNE ---
    const data = {
      id: p.id,
      numer: p.numer,
      producent: p.producent,
      model: p.model,
      kolor: p.kolor,
      typ: p.typ,
      rozmiar: p.rozmiar,
      basen: p.basen,
      uwagi: p.uwagi,
    };

    // --- DANE DYNAMICZNE ---
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

  firestoreCleanupOrphans(LIFEJACKETS_COLLECTION, validDocIds);
  Logger.log("=== SYNC LIFEJACKETS END ===");
}
