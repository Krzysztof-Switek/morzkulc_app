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
];

/**
 * Główna funkcja synchronizująca.
 * Możesz ją uruchomić ręcznie lub dodać trigger.
 */
function syncKayaks() {
  Logger.log('=== SYNC START ===');

  const kayaks = getKayaksConfig(); // z kayak_config.gs
  Logger.log('Liczba kajaków do synchronizacji: ' + kayaks.length);

  kayaks.forEach(k => {
    // ID dokumentu = numerKajaka (lub ID prywatnego jeśli brak numeru)
    const docId = encodeURIComponent(k.numerKajaka || ('P' + k.id));
    const docPath = KAYAKS_COLLECTION + '/' + docId;

    // Sprawdzamy, czy dokument już istnieje w Firestore
    const exists = firestoreDocumentExists(docPath);

    // Budujemy obiekt danych statycznych (z arkusza)
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

    // Zaczynamy od maski pól statycznych
    let updateMask = KAYAK_STATIC_FIELDS.slice();

    // Jeżeli dokument NIE istnieje → inicjalizujemy pola dynamiczne
    if (!exists) {
      data.dostepny = true;
      data.aktualnyUzytkownik = '';
      data.od = null;
      data.do = null;

      // przy pierwszym utworzeniu chcemy zapisać też pola dynamiczne
      updateMask = updateMask.concat(KAYAK_DYNAMIC_FIELDS);
    }

    // PATCH do Firestore
    const updated = firestorePatchDocument(
      docPath,
      data,
      updateMask
    );

    Logger.log(
      'SYNC → ' + decodeURIComponent(docId) + ' (exists=' + exists + ') : ' +
      JSON.stringify(updated)
    );
  });

  Logger.log('=== SYNC END ===');
}


/**
 * TEST → wykonuje tylko sync.
 * Uruchom ręcznie i sprawdź kolekcję "kayaks" w Firestore.
 */
function testSyncKayaks() {
  Logger.log('TEST: start syncKayaks()');
  syncKayaks();
}
