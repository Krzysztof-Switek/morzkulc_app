/**
 * SYNC RZUTEK → Firestore
 */

function syncThrowbags() {
  Logger.log("=== SYNC THROWBAGS START ===");

  const items = getThrowbagsConfig();
  const validDocIds = [];

  items.forEach((p, index) => {

    const docId = p.firestoreId;
    validDocIds.push(docId);

    const docPath = THROWBAGS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    const data = {
      id: p.id,
      numer: p.numer,
      producent: p.producent,
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

  firestoreCleanupOrphans(THROWBAGS_COLLECTION, validDocIds);
  Logger.log("=== SYNC THROWBAGS END ===");
}
