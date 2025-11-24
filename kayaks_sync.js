/**
 * MODUŁ 1 — SYNC ARKUSZA DO FIRESTORE
 * -----------------------------------
 * Ten plik jest odpowiedzialny za:
 * - pobranie kajaków z arkusza (getKayaksConfig z kayak_config.gs)
 * - przygotowanie obiektów danych
 * - wysłanie PATCH do Firestore
 *
 * ZAŁOŻENIA:
 * - PRIMARY KEY w arkuszu = kolumna ID (A)
 * - ID dokumentu w Firestore:
 *     - dla kajaków klubowych: numerKajaka (np. "60", "53")
 *     - dla prywatnych bez numeru: "P" + ID (np. "P101")
 * - Pola dynamiczne (dostepny, aktualnyUzytkownik, od, do)
 *   inicjalizujemy TYLKO przy pierwszym utworzeniu dokumentu.
 */


/** Pola dynamiczne w Firestore (nie pochodzą z arkusza) */
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

/**
 * Główna funkcja synchronizująca.
 * Możesz ją uruchomić ręcznie lub dodać trigger.
 */
function syncKayaks() {
  Logger.log('=== SYNC START ===');

  const kayaks = getKayaksConfig(); // już zawiera firestoreId
  Logger.log('Liczba kajaków do synchronizacji: ' + kayaks.length);

  kayaks.forEach(k => {

    // NOWOŚĆ → JEDNOZNACZNE ID DOKUMENTU
    const docId = encodeURIComponent(k.firestoreId);
    const docPath = KAYAKS_COLLECTION + '/' + docId;

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

    const updated = firestorePatchDocument(docPath, data, updateMask);

    Logger.log(
      'SYNC → ' + decodeURIComponent(docId) + ' (exists=' + exists + ') : ' +
      JSON.stringify(updated)
    );
  });

  Logger.log('=== SYNC END ===');
}

function testSyncKayaks() {
  Logger.log('TEST: start syncKayaks()');
  syncKayaks();
}