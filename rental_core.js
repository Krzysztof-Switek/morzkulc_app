/**
 * MAPA typ → kolekcja Firestore.
 * Obsługujemy:
 *  - kayak
 *  - paddle (wiosła)
 */
var COLLECTION_BY_TYPE = {
  kayak: KAYAKS_COLLECTION,   // z config.gs
  paddle: PADDLES_COLLECTION, // NOWOŚĆ
};

/**
 * Pobiera listę elementów danego typu z Firestore
 * i mapuje dokumenty na obiekty JS.
 *
 * type: "kayak", "paddle"
 */
function getItemsByType(type) {
  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) {
    throw new Error('Nieznany typ sprzętu: ' + type);
  }

  var raw = firestoreGetCollection(collection);
  var docs = raw.documents || [];

  if (type === 'kayak') {
    return docs.map(doc => mapKayakDocument(doc));
  }

  if (type === 'paddle') {
    return docs.map(doc => mapPaddleDocument(doc));
  }

  throw new Error('Brak mapowania dokumentów dla typu: ' + type);
}

/**
 * Wspólna logika wypożyczenia sprzętu.
 */
function rentItem(type, id, user, start, end) {
  if (!type || !id || !user) {
    return { error: 'Brak wymaganych parametrów: type, id lub user.' };
  }

  var items = getItemsByType(type);
  var item = items.find(i => i.id === id);

  if (!item) return { error: 'Nie znaleziono elementu o ID: ' + id };

  if (item.sprawny === false) {
    return { error: 'Sprzęt jest niesprawny i nie może być wypożyczony.' };
  }

  // sprzęt prywatny = blokujemy wypożyczenie
  if (item.prywatny === true) {
    return { error: 'Sprzęt prywatny nie jest dostępny do wypożyczenia.' };
  }

  if (item.dostepny === false) {
    return { error: 'Sprzęt jest już wypożyczony.' };
  }

  if (item.rezerwacjaAktywna && item.rezerwujacy !== user) {
    return { error: 'Sprzęt jest zarezerwowany przez innego użytkownika.' };
  }

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

    rezerwacjaAktywna: false,
    rezerwujacy: '',
    rezerwacjaOd: null,
    rezerwacjaDo: null,
  };

  var updated = firestorePatchDocument(docPath, data, [
    'dostepny',
    'aktualnyUzytkownik',
    'od',
    'do',
    'rezerwacjaAktywna',
    'rezerwujacy',
    'rezerwacjaOd',
    'rezerwacjaDo',
  ]);

  return {
    ok: true,
    id,
    start: startEffective,
    end: endEffective,
    firestore: updated,
  };
}

/**
 * Rezerwacja sprzętu
 */
function reserveItem(type, id, user, start, end) {
  if (!type || !id || !user) {
    return { error: 'Brak parametrów type, id, user.' };
  }

  var items = getItemsByType(type);
  var item = items.find(i => i.id === id);

  if (!item) return { error: 'Nie znaleziono elementu o ID: ' + id };

  if (item.sprawny === false) {
    return { error: 'Sprzęt jest niesprawny — nie można go zarezerwować.' };
  }

  if (item.prywatny === true) {
    return { error: 'Sprzęt prywatny nie może być rezerwowany.' };
  }

  if (!item.dostepny) {
    return { error: 'Sprzęt jest wypożyczony — nie można go zarezerwować.' };
  }

  if (item.rezerwacjaAktywna) {
    return { error: 'Sprzęt jest już zarezerwowany.' };
  }

  var collection = COLLECTION_BY_TYPE[type];
  var docPath = collection + '/' + encodeURIComponent(id);

  var data = {
    rezerwacjaAktywna: true,
    rezerwujacy: user,
    rezerwacjaOd: start,
    rezerwacjaDo: end,
  };

  var updated = firestorePatchDocument(docPath, data, [
    'rezerwacjaAktywna',
    'rezerwujacy',
    'rezerwacjaOd',
    'rezerwacjaDo',
  ]);

  return {
    ok: true,
    id,
    firestore: updated,
  };
}

/**
 * Zwrot sprzętu
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

  var updated = firestorePatchDocument(docPath, data, [
    'dostepny',
    'aktualnyUzytkownik',
    'od',
    'do',
  ]);

  return {
    ok: true,
    type,
    id,
    firestore: updated,
  };
}

function testRentItemBroken() {
  const result = rentItem('kayak', '2', 'TestUser', '', '');
  Logger.log(JSON.stringify(result, null, 2));
}
