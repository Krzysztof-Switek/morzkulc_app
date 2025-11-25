/**
 * MAPA typ → kolekcja Firestore.
 * Obsługujemy:
 *  - kayak
 *  - paddle (wiosła)
 *  - lifejacket
 *  - helmet
 *  - throwbag
 *  - sprayskirt
 */
var COLLECTION_BY_TYPE = {
  kayak: KAYAKS_COLLECTION,
  paddle: PADDLES_COLLECTION,
  lifejacket: LIFEJACKETS_COLLECTION,
  helmet: HELMETS_COLLECTION,
  throwbag: THROWBAGS_COLLECTION,
  sprayskirt: SPRAYSKIRTS_COLLECTION,
};

/**
 * Pobiera listę elementów danego typu z Firestore
 * i mapuje dokumenty na obiekty JS.
 */
function getItemsByType(type) {
  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) {
    throw new Error('Nieznany typ sprzętu: ' + type);
  }

  var raw = firestoreGetCollection(collection);
  var docs = raw.documents || [];

  if (type === 'kayak') {
    return docs.map(function (doc) { return mapKayakDocument(doc); });
  }

  if (type === 'paddle') {
    return docs.map(function (doc) { return mapPaddleDocument(doc); });
  }

  if (type === 'lifejacket') {
    return docs.map(function (doc) { return mapLifejacketDocument(doc); });
  }

  if (type === 'helmet') {
    return docs.map(function (doc) { return mapHelmetDocument(doc); });
  }

  if (type === 'throwbag') {
    return docs.map(function (doc) { return mapThrowbagDocument(doc); });
  }

  if (type === 'sprayskirt') {
    return docs.map(function (doc) { return mapSprayskirtDocument(doc); });
  }

  throw new Error('Brak mapowania dokumentów dla typu: ' + type);
}

/**
 * Wspólna logika wypożyczenia sprzętu.
 *
 * type  – np. "kayak", "paddle", ...
 * id    – ID dokumentu w Firestore
 * user  – identyfikator użytkownika (email); jeśli pusty, getUserContext() spróbuje użyć Session.getActiveUser()
 * start – ISO string daty startu (opcjonalnie)
 * end   – ISO string daty końca (opcjonalnie)
 */
function rentItem(type, id, user, start, end) {
  if (!type || !id) {
    return { error: 'Brak wymaganych parametrów: type, id.' };
  }

  // Kontekst użytkownika (email + rola + limity) – logika ról
  var userCtx = getUserContext(user);

  if (userCtx.role === 'no_access') {
    return { error: 'Brak dostępu. Skontaktuj się z zarządem SKK Morzkulc.' };
  }

  if (userCtx.role === 'gosc') {
    return { error: 'Tryb podglądu — zaloguj się jako członek klubu, aby wypożyczać sprzęt.' };
  }

  if (!userCtx.limits || userCtx.limits.maxItems <= 0) {
    return { error: 'Twoja rola nie pozwala na wypożyczanie sprzętu.' };
  }

  // Limity liczby aktywnych wypożyczeń
  // Uwaga: na razie liczymy "na sztuki", a nie "komplety".
  var activeRentals = countActiveRentalsForUser(userCtx.email);

  // Zarząd – brak limitu liczby sztuk (ale nadal mogą obowiązywać inne zasady)
  if (userCtx.role !== 'zarzad' && activeRentals >= userCtx.limits.maxItems) {
    return {
      error: 'Przekroczono limit aktywnych wypożyczeń (' +
        userCtx.limits.maxItems +
        ') dla Twojej roli.'
    };
  }

  var items = getItemsByType(type);
  var item = items.find(function (i) { return i.id === id; });

  if (!item) return { error: 'Nie znaleziono elementu o ID: ' + id };

  if (item.sprawny === false) {
    return { error: 'Sprzęt jest niesprawny i nie może być wypożyczony.' };
  }

  // sprzęt prywatny = blokujemy wypożyczenie, chyba że rola ma uprawnienia
  if (item.prywatny === true && !userCtx.limits.canRentPrivate) {
    return { error: 'Sprzęt prywatny nie jest dostępny do wypożyczenia dla Twojej roli.' };
  }

  if (item.dostepny === false) {
    return { error: 'Sprzęt jest już wypożyczony.' };
  }

  if (item.rezerwacjaAktywna && item.rezerwujacy !== userCtx.email) {
    return { error: 'Sprzęt jest zarezerwowany przez innego użytkownika.' };
  }

  var nowIso = new Date().toISOString();
  var startEffective = (start && String(start).trim() !== '') ? start : nowIso;
  var endEffective = (end && String(end).trim() !== '') ? end : null;

  var collection = COLLECTION_BY_TYPE[type];
  var docPath = collection + '/' + encodeURIComponent(id);

  var data = {
    dostepny: false,
    aktualnyUzytkownik: userCtx.email,
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
    id: id,
    start: startEffective,
    end: endEffective,
    userEmail: userCtx.email,
    role: userCtx.role,
    firestore: updated,
  };
}

/**
 * Rezerwacja sprzętu
 */
function reserveItem(type, id, user, start, end) {
  if (!type || !id) {
    return { error: 'Brak parametrów type lub id.' };
  }

  var userCtx = getUserContext(user);

  if (userCtx.role === 'no_access') {
    return { error: 'Brak dostępu. Skontaktuj się z zarządem SKK Morzkulc.' };
  }

  if (userCtx.role === 'gosc') {
    return { error: 'Tryb podglądu — nie możesz rezerwować sprzętu.' };
  }

  if (!userCtx.limits || userCtx.limits.maxItems <= 0) {
    return { error: 'Twoja rola nie pozwala na rezerwacje sprzętu.' };
  }

  var items = getItemsByType(type);
  var item = items.find(function (i) { return i.id === id; });

  if (!item) return { error: 'Nie znaleziono elementu o ID: ' + id };

  if (item.sprawny === false) {
    return { error: 'Sprzęt jest niesprawny — nie można go zarezerwować.' };
  }

  if (item.prywatny === true && !userCtx.limits.canRentPrivate) {
    return { error: 'Sprzęt prywatny nie może być rezerwowany dla Twojej roli.' };
  }

  if (!item.dostepny) {
    return { error: 'Sprzęt jest wypożyczony — nie można go zarezerwować.' };
  }

  if (item.rezerwacjaAktywna) {
    return { error: 'Sprzęt jest już zarezerwowany.' };
  }

  // LIMIT: ile łącznie (wypożyczenia + rezerwacje) może mieć użytkownik
  var activeTotal = countActiveReservationsAndRentalsForUser(userCtx.email);

  // Zarząd – brak limitu liczby sztuk
  if (userCtx.role !== 'zarzad' && activeTotal >= userCtx.limits.maxItems) {
    return {
      error: 'Przekroczono limit aktywnych rezerwacji/wypożyczeń (' +
        userCtx.limits.maxItems +
        ') dla Twojej roli.'
    };
  }

  // LIMIT: jak daleko w przód można rezerwować (tygodnie)
  var horizonError = validateReservationHorizon(start, end, userCtx.limits.maxTimeWeeks);
  if (horizonError) {
    return { error: horizonError };
  }

  var collection = COLLECTION_BY_TYPE[type];
  var docPath = collection + '/' + encodeURIComponent(id);

  var data = {
    rezerwacjaAktywna: true,
    rezerwujacy: userCtx.email,
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
    id: id,
    userEmail: userCtx.email,
    role: userCtx.role,
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
    type: type,
    id: id,
    firestore: updated,
  };
}

/**
 * Liczy, ile sztuk sprzętu jest aktualnie wypożyczonych przez danego usera.
 *
 * Uwaga: bazujemy na polach Firestore (raw documents), a nie na zmapowanych obiektach.
 */
function countActiveRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;

  Object.keys(COLLECTION_BY_TYPE).forEach(function (type) {
    var collection = COLLECTION_BY_TYPE[type];
    var raw = firestoreGetCollection(collection);
    var docs = raw.documents || [];

    docs.forEach(function (doc) {
      var f = doc.fields || {};
      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var userField = f.aktualnyUzytkownik
        ? (f.aktualnyUzytkownik.stringValue || '')
        : '';

      if (!dostepny && userField === email) {
        total += 1;
      }
    });
  });

  return total;
}

/**
 * Liczy łącznie rezerwacje + wypożyczenia dla danego usera.
 */
function countActiveReservationsAndRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;

  Object.keys(COLLECTION_BY_TYPE).forEach(function (type) {
    var collection = COLLECTION_BY_TYPE[type];
    var raw = firestoreGetCollection(collection);
    var docs = raw.documents || [];

    docs.forEach(function (doc) {
      var f = doc.fields || {};

      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var userField = f.aktualnyUzytkownik
        ? (f.aktualnyUzytkownik.stringValue || '')
        : '';

      var rezAktywna = f.rezerwacjaAktywna
        ? !!f.rezerwacjaAktywna.booleanValue
        : false;
      var rezerwujacy = f.rezerwujacy
        ? (f.rezerwujacy.stringValue || '')
        : '';

      if ((!dostepny && userField === email) ||
          (rezAktywna && rezerwujacy === email)) {
        total += 1;
      }
    });
  });

  return total;
}

/**
 * Sprawdza, czy rezerwacja mieści się w dopuszczalnym horyzoncie czasowym (tygodnie).
 */
function validateReservationHorizon(start, end, maxTimeWeeks) {
  if (!maxTimeWeeks || maxTimeWeeks <= 0) {
    // brak limitu – rola z nielimitowanym horyzontem (na razie nie używamy)
    return null;
  }

  var now = new Date();
  var startDate = start ? new Date(start) : now;
  var endDate = end ? new Date(end) : startDate;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Nieprawidłowa data rezerwacji.';
  }

  // jak daleko w przód od TERAZ jest początek rezerwacji
  var msFromNowToStart = startDate.getTime() - now.getTime();
  var daysFromNowToStart = msFromNowToStart / (1000 * 60 * 60 * 24);

  if (daysFromNowToStart > maxTimeWeeks * 7) {
    return 'Przekroczono maksymalny horyzont rezerwacji dla Twojej roli (' +
      maxTimeWeeks + ' tygodni).';
  }

  return null;
}

/**
 * PROSTY TEST — do szybkiej weryfikacji w logach.
 * Uwaga: email będzie pobierany z getUserContext() na podstawie aktualnie zalogowanego.
 */
function testRentItemBroken() {
  var result = rentItem('kayak', '2', '', '', '');
  Logger.log(JSON.stringify(result, null, 2));
}
