function syncSprayskirts() {
  Logger.log("=== SYNC SPRAYSKIRTS START ===");

  const items = getSprayskirtsConfig();
  const validDocIds = [];

  items.forEach((p, index) => {

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = SPRAYSKIRTS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    // --- dane statyczne ---
    const data = {
      id: p.id,
      numer: p.numer,
      producent: p.producent,
      material: p.material,
      rozmiar: p.rozmiar,
      rozmiarKomina: p.rozmiarKomina,
      basen: p.basen,
      niziny: p.niziny,
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

  firestoreCleanupOrphans(SPRAYSKIRTS_COLLECTION, validDocIds);
  Logger.log("=== SYNC SPRAYSKIRTS END ===");
}
