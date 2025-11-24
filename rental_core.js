/**
 * MAPA typ → kolekcja Firestore.
 * Na razie obsługujemy tylko "kayak".
 * W przyszłości dodamy: helmet, paddle, skirt, itd.
 */
var COLLECTION_BY_TYPE = {
  kayak: KAYAKS_COLLECTION,    // z config.gs
  // helmet: HELMETS_COLLECTION,
  // paddle: PADDLES_COLLECTION,
  // ...
};

/**
 * Pobiera listę elementów danego typu z Firestore
 * i mapuje dokumenty na obiekty JS.
 *
 * type: np. "kayak"
 */
function getItemsByType(type) {
  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) {
    throw new Error('Nieznany typ sprzętu: ' + type);
  }

  var raw = firestoreGetCollection(collection);
  var docs = raw.documents || [];

  // Na razie korzystamy z mapKayakDocument tylko dla typu "kayak"
  if (type === 'kayak') {
    return docs.map(function (doc) { return mapKayakDocument(doc); });
  }

  // TODO: gdy dodamy inne typy, dodamy ich mapowanie
  throw new Error('Brak mapowania dokumentów dla typu: ' + type);
}

/**
 * Wspólna logika wypożyczenia sprzętu.
 *
 * type  – np. "kayak"
 * id    – ID dokumentu w kolekcji Firestore (docId)
 * user  – nazwa/email wypożyczającego
 * start – string z czasem startu (opcjonalny, jeśli pusty → nowIso)
 * end   – string z czasem końca (opcjonalny)
 */
function rentItem(type, id, user, start, end) {
  if (!type || !id || !user) {
    return { error: 'Brak wymaganych parametrów: type, id lub user.' };
  }

  var items = getItemsByType(type);
  var item = items.find(function (i) { return i.id === id; });

  if (!item) {
    return { error: 'Nie znaleziono elementu typu ' + type + ' o ID: ' + id };
  }

  // Wspólne zasady:
  // 1. Prywatny + niedostępny do wypożyczeń → blokada
  if (item.prywatny && item.privateAvailable === false) {
    return { error: 'Sprzęt prywatny nie jest dostępny do wypożyczenia.' };
  }

  // 2. Już wypożyczony
  if (item.dostepny === false) {
    return { error: 'Sprzęt jest już wypożyczony.' };
  }

  // TODO: tu w przyszłości możemy dodać sprawdzenie "godzinek"
  // np. validateUserCredits(user, type, plannedDuration)

  var nowIso = new Date().toISOString();
  var startEffective = start && start.trim() !== '' ? start : nowIso;
  var endEffective = end && end.trim() !== '' ? end : null;

  var collection = COLLECTION_BY_TYPE[type];
  var docPath = collection + '/' + encodeURIComponent(id);

  var data = {
    dostepny: false,
    aktualnyUzytkownik: user,
    od: startEffective,
    do: endEffective,
  };

  var updated = firestorePatchDocument(
    docPath,
    data,
    ['dostepny', 'aktualnyUzytkownik', 'od', 'do']
  );

  return {
    ok: true,
    type: type,
    id: id,
    start: startEffective,
    end: endEffective,
    firestore: updated,
  };
}

/**
 * Wspólna logika zwrotu sprzętu.
 */
function returnItem(type, id) {
  if (!type || !id) {
    return { error: 'Brak parametrów type lub id.' };
  }

  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) {
    return { error: 'Nieznany typ sprzętu: ' + type };
  }

  var docPath = collection + '/' + encodeURIComponent(id);

  var data = {
    dostepny: true,
    aktualnyUzytkownik: '',
    od: null,
    do: null,
  };

  var updated = firestorePatchDocument(
    docPath,
    data,
    ['dostepny', 'aktualnyUzytkownik', 'od', 'do']
  );

  return {
    ok: true,
    type: type,
    id: id,
    firestore: updated,
  };
}
