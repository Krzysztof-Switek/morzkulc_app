/**
 * SYNC KAMIZELEK → Firestore
 */

function syncLifejackets() {
  Logger.log("=== SYNC LIFEJACKETS START ===");

  const items = getLifejacketsConfig();
  const validDocIds = [];

  items.forEach((p, index) => {

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = LIFEJACKETS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

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

  firestoreCleanupOrphans(LIFEJACKETS_COLLECTION, validDocIds);
  Logger.log("=== SYNC LIFEJACKETS END ===");
}
