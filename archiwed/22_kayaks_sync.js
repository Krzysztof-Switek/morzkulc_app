/**
 * SYNC KAJAKI → Firestore
 */

const KAYAK_DYNAMIC_FIELDS = [
  'dostepny',
  'aktualnyUzytkownik',
  'od',
  'do',
  'rezerwacjaAktywna',
  'rezerwujacy',
  'rezerwacjaOd',
  'rezerwacjaDo',
];

function syncKayaks() {
  Logger.log('=== SYNC KAYAKS START ===');

  const kayaks = getKayaksConfig();
  Logger.log('Kajaki z arkusza: ' + kayaks.length);

  const validDocIds = [];

  kayaks.forEach(k => {

    if (!k.firestoreId || String(k.firestoreId).trim() === '') {
      Logger.log(
        'BŁĄD SYNC: brak firestoreId dla wiersza ID=' + k.id
      );
      return;
    }

    const docId = String(k.firestoreId);
    validDocIds.push(docId);

    const docPath = KAYAKS_COLLECTION + '/' + encodeURIComponent(docId);
    const exists = firestoreDocumentExists(docPath);

    const data = {
      id: k.id,
      numerKajaka: k.numerKajaka || '',
      producent: k.producent,
      model: k.model,
      zdjecieUrl: k.zdjecieUrl,
      kolor: k.kolor,
      typ: k.typ,
      litrow: k.litrow,
      zakresWag: k.zakresWag,
      kokpit: k.kokpit,
      sprawny: k.sprawny,
      basen: k.basen,
      prywatny: k.prywatny,
      privateAvailable: k.privateAvailable,
      privateOwnerEmail: k.privateOwnerEmail,
      uwagi: k.uwagi,
    };

    let updateMask = KAYAK_STATIC_FIELDS.slice();

    if (!exists) {
      data.version = 1;
      updateMask.push("version");

      data.dostepny = true;
      data.aktualnyUzytkownik = '';
      data.od = null;
      data.do = null;

      data.rezerwacjaAktywna = false;
      data.rezerwujacy = '';
      data.rezerwacjaOd = null;
      data.rezerwacjaDo = null;

      updateMask = updateMask.concat(KAYAK_DYNAMIC_FIELDS);
    }

    firestorePatchDocument(docPath, data, updateMask);
  });

  firestoreCleanupOrphans(KAYAKS_COLLECTION, validDocIds);

  Logger.log('=== SYNC KAYAKS END ===');
}
