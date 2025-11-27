/**
 * Odczyt offsetu – liczby dni blokady przed i po rezerwacji.
 * Walidacja:
 *   - musi istnieć
 *   - musi być liczbą całkowitą
 *   - >= 0
 * W przeciwnym razie zwracamy błąd lub fallback.
 */
function getReservationPaddingDays_() {
  const doc = firestoreGetDocument("setup/offset_rezerwacji");

  // Brak dokumentu → twardy błąd (bo to konfiguracja systemowa)
  if (!doc || !doc.fields || !doc.fields.value) {
    throw new Error("Brak wartości offset_rezerwacji w setup.");
  }

  // Odczyt integerValue
  let raw = doc.fields.value.integerValue;

  // integerValue nie istnieje → błąd
  if (raw === undefined || raw === null) {
    throw new Error("offset_rezerwacji: wartość nie jest liczbą.");
  }

  let val = Number(raw);

  // NaN → błąd
  if (isNaN(val)) {
    throw new Error("offset_rezerwacji: wartość nie jest poprawną liczbą.");
  }

  // Liczba ujemna → błąd
  if (val < 0) {
    throw new Error("offset_rezerwacji: wartość nie może być ujemna.");
  }

  // OK
  return val;
}


/**
 * Pomocnicze funkcje do dat ISO
 */
function addDays_(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function toIsoString_(date) {
  return new Date(date).toISOString();
}

/**
 * MAPA typ → kolekcja Firestore.
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
 * MAPA typ → mapper Firestore → JS
 */
var MAPPER_BY_TYPE = {
  kayak:      mapKayakDocument,
  paddle:     mapPaddleDocument,
  lifejacket: mapLifejacketDocument,
  helmet:     mapHelmetDocument,
  throwbag:   mapThrowbagDocument,
  sprayskirt: mapSprayskirtDocument,
};

/**
 * Lista elementów danego typu
 */
function getItemsByType(type) {
  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) throw new Error("Nieznany typ sprzętu: " + type);

  var raw = firestoreGetCollection(collection);
  var docs = raw.documents || [];

  var mapper = MAPPER_BY_TYPE[type];
  return docs.map(doc => mapper(doc));
}

/**
 * Pobranie jednego dokumentu (raw + mapped)
 */
function getSingleItemWithRaw_(type, id) {
  var collection = COLLECTION_BY_TYPE[type];
  if (!collection) throw new Error("Nieznany typ: " + type);

  var mapper = MAPPER_BY_TYPE[type];
  var docPath = collection + "/" + encodeURIComponent(id);
  var raw = firestoreGetDocument(docPath);
  if (!raw) return null;

  return { raw: raw, item: mapper(raw), docPath: docPath };
}

/**
 * Odczyt pola version (pomocniczo)
 */
function getCurrentVersionFromDoc_(rawDoc) {
  var f = rawDoc.fields || {};
  if (!f.version || f.version.integerValue === undefined) return 0;
  return Number(f.version.integerValue);
}

/*********************************************************************
 * TRY RENT – z updateTime + padding blokujący
 *********************************************************************/
function tryRentOnce_(type, id, userCtx, start, end) {

  if (!type || !id) {
    return { error: "Brak wymaganych parametrów: type, id." };
  }

  var loaded = getSingleItemWithRaw_(type, id);
  if (!loaded) {
    return { error: "Nie znaleziono elementu o ID: " + id };
  }

  var raw = loaded.raw;
  var item = loaded.item;
  var docPath = loaded.docPath;
  var updateTime = raw.updateTime;
  var currentVersion = getCurrentVersionFromDoc_(raw);

  // Sprzęt niesprawny
  if (item.sprawny === false) {
    return { error: "Sprzęt jest niesprawny i nie może być wypożyczony." };
  }

  // Prywatny bez zgody
  if (item.prywatny === true && !userCtx.limits.canRentPrivate) {
    return { error: "Sprzęt prywatny nie jest dostępny dla Twojej roli." };
  }

  // Już wypożyczony
  if (!item.dostepny) {
    return { error: "Sprzęt jest już wypożyczony." };
  }

  // Rezerwacja aktywna innego użytkownika
  if (item.rezerwacjaAktywna && item.rezerwujacy && item.rezerwujacy !== userCtx.email) {
    return { error: "Sprzęt jest zarezerwowany przez innego użytkownika." };
  }

  // NOWOŚĆ – blokada w okresie blockFrom–blockTo
  if (item.blockFrom && item.blockTo) {
    const now = new Date();
    const bf = new Date(item.blockFrom);
    const bt = new Date(item.blockTo);
    if (now >= bf && now <= bt) {
      return { error: "Sprzęt jest zablokowany w ramach rezerwacji innego użytkownika." };
    }
  }

  // Limity wypożyczeń
  var activeRentals = countActiveRentalsForUser(userCtx.email);
  if (userCtx.role !== "zarzad" && activeRentals >= userCtx.limits.maxItems) {
    return { error: "Przekroczono limit aktywnych wypożyczeń (" + userCtx.limits.maxItems + ")." };
  }

  var nowIso = new Date().toISOString();
  var startEffective = start && String(start).trim() !== "" ? start : nowIso;
  var endEffective   = end   && String(end).trim()   !== "" ? end   : null;

  var data = {
    dostepny: false,
    aktualnyUzytkownik: userCtx.email,
    od: startEffective,
    do: endEffective,

    rezerwacjaAktywna: false,
    rezerwujacy: "",
    rezerwacjaOd: null,
    rezerwacjaDo: null,

    // Padding NIE tworzymy przy wypożyczeniu
    blockFrom: null,
    blockTo: null,

    version: currentVersion + 1,
  };

  var updateMask = [
    "dostepny", "aktualnyUzytkownik", "od", "do",
    "rezerwacjaAktywna", "rezerwujacy", "rezerwacjaOd", "rezerwacjaDo",
    "blockFrom", "blockTo", "version"
  ];

  var patchRes = firestorePatchDocumentWithUpdateTime(docPath, data, updateMask, updateTime);
  if (!patchRes.ok) {
    if (patchRes.status === "FAILED_PRECONDITION" || patchRes.status === "ABORTED") {
      return { conflict: true };
    }
    return { error: "Błąd Firestore: " + patchRes.status };
  }

  return {
    ok: true,
    id: id,
    start: startEffective,
    end: endEffective,
    firestore: patchRes.body
  };
}

/*********************************************************************
 * Rent API (retry)
 *********************************************************************/
function rentItem(type, id, user, start, end) {

  if (!type || !id) return { error: "Brak parametrów: type, id." };

  var userCtx = getUserContext(user);

  if (userCtx.role === "no_access") return { error: "Brak dostępu." };
  if (userCtx.role === "gosc") return { error: "Tryb podglądu — nie można wypożyczać." };
  if (!userCtx.limits || userCtx.limits.maxItems <= 0) {
    return { error: "Twoja rola nie pozwala na wypożyczanie sprzętu." };
  }

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryRentOnce_(type, id, userCtx, start, end);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika. Spróbuj ponownie." };
}

/*********************************************************************
 * Walidacja dat rezerwacji
 *********************************************************************/
function validateReservationDates(start, end) {

  if (!start || !String(start).trim() || !end || !String(end).trim()) {
    return "Daty rezerwacji są wymagane.";
  }

  var s = new Date(start);
  var e = new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Nieprawidłowa data rezerwacji.";
  if (e.getTime() <= s.getTime()) return "Data zakończenia musi być późniejsza niż rozpoczęcia.";

  var now = new Date();
  if (s.getTime() < now.getTime()) return "Nie można rezerwować w przeszłość.";

  return null;
}

/*********************************************************************
 * TRY RESERVE – z paddingiem
 *********************************************************************/
function tryReserveOnce_(type, id, userCtx, start, end) {

  if (!type || !id) {
    return { error: "Brak parametrów." };
  }

  // 1) Walidacja dat wejściowych
  var err = validateReservationDates(start, end);
  if (err) return { error: err };

  // ISO daty
  var startIso = new Date(start).toISOString();
  var endIso   = new Date(end).toISOString();

  var loaded = getSingleItemWithRaw_(type, id);
  if (!loaded) return { error: "Nie znaleziono elementu." };

  var raw = loaded.raw;
  var item = loaded.item;
  var docPath = loaded.docPath;
  var updateTime = raw.updateTime;
  var currentVersion = getCurrentVersionFromDoc_(raw);

  // Stan sprzętu
  if (!item.dostepny) return { error: "Sprzęt jest wypożyczony." };
  if (item.rezerwacjaAktywna) return { error: "Sprzęt ma już aktywną rezerwację." };
  if (item.sprawny === false) return { error: "Sprzęt niesprawny." };

  if (item.prywatny && !userCtx.limits.canRentPrivate) {
    return { error: "Sprzęt prywatny niedostępny dla Twojej roli." };
  }

  // NOWOŚĆ – sprawdzamy czy planowana rezerwacja nie wchodzi w padding innej
  if (item.blockFrom && item.blockTo) {
    const bf = new Date(item.blockFrom);
    const bt = new Date(item.blockTo);
    const s  = new Date(startIso);
    const e  = new Date(endIso);
    if (s <= bt && e >= bf) {
      return { error: "Rezerwacja nachodzi na blok sprzętu w ramach innej rezerwacji." };
    }
  }

  // Limit łączny
  var total = countActiveReservationsAndRentalsForUser(userCtx.email);
  if (userCtx.role !== "zarzad" && total >= userCtx.limits.maxItems) {
    return { error: "Przekroczono limit aktywnych rezerwacji/wypożyczeń." };
  }

  // Horyzont
  var horizon = validateReservationHorizon(startIso, endIso, userCtx.limits.maxTimeWeeks);
  if (horizon) return { error: horizon };

  // NOWOŚĆ – padding
  const pad = getReservationPaddingDays_();
  var blockFrom = toIsoString_(addDays_(startIso, -pad));
  var blockTo   = toIsoString_(addDays_(endIso,   pad));

  var data = {
    rezerwacjaAktywna: true,
    rezerwujacy: userCtx.email,
    rezerwacjaOd: startIso,
    rezerwacjaDo: endIso,

    blockFrom: blockFrom,
    blockTo: blockTo,

    version: currentVersion + 1,
  };

  var updateMask = [
    "rezerwacjaAktywna", "rezerwujacy",
    "rezerwacjaOd", "rezerwacjaDo",
    "blockFrom", "blockTo",
    "version",
  ];

  var patchRes = firestorePatchDocumentWithUpdateTime(docPath, data, updateMask, updateTime);
  if (!patchRes.ok) {
    if (patchRes.status === "FAILED_PRECONDITION" || patchRes.status === "ABORTED") {
      return { conflict: true };
    }
    return { error: "Błąd Firestore: " + patchRes.status };
  }

  return { ok: true, firestore: patchRes.body };
}

/*********************************************************************
 * Reserve API (retry)
 *********************************************************************/
function reserveItem(type, id, user, start, end) {

  if (!type || !id) return { error: "Brak parametrów." };
  var userCtx = getUserContext(user);

  if (userCtx.role === "no_access") return { error: "Brak dostępu." };
  if (userCtx.role === "gosc") return { error: "Tryb podglądu." };
  if (!userCtx.limits || userCtx.limits.maxItems <= 0) return { error: "Rola nie pozwala na rezerwacje." };

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryReserveOnce_(type, id, userCtx, start, end);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika. Spróbuj ponownie." };
}

/*********************************************************************
 * Zwrot sprzętu – czyści padding
 *********************************************************************/
function tryReturnOnce_(type, id) {

  var collection = COLLECTION_BY_TYPE[type];
  var docPath = collection + "/" + encodeURIComponent(id);

  var raw = firestoreGetDocument(docPath);
  if (!raw) return { error: "Nie znaleziono elementu." };

  var updateTime = raw.updateTime;
  var currentVersion = getCurrentVersionFromDoc_(raw);

  var data = {
    dostepny: true,
    aktualnyUzytkownik: "",
    od: null,
    do: null,

    // NOWOŚĆ — usuwamy padding
    blockFrom: null,
    blockTo: null,

    version: currentVersion + 1,
  };

  var updateMask = [
    "dostepny", "aktualnyUzytkownik", "od", "do",
    "blockFrom", "blockTo",
    "version",
  ];

  var patchRes = firestorePatchDocumentWithUpdateTime(docPath, data, updateMask, updateTime);
  if (!patchRes.ok) {
    if (patchRes.status === "FAILED_PRECONDITION" || patchRes.status === "ABORTED") {
      return { conflict: true };
    }
    return { error: "Błąd Firestore: " + patchRes.status };
  }

  return { ok: true };
}

/*********************************************************************
 * Return API (retry)
 *********************************************************************/
function returnItem(type, id) {

  const MAX_RETRIES = 3;
  for (var i = 0; i < MAX_RETRIES; i++) {
    var res = tryReturnOnce_(type, id);
    if (res && res.conflict) {
      Utilities.sleep(50);
      continue;
    }
    return res;
  }

  return { error: "Sprzęt zmieniony przez innego użytkownika." };
}

/*********************************************************************
 * Liczniki
 *********************************************************************/
function countActiveRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;
  Object.keys(COLLECTION_BY_TYPE).forEach(type => {
    var raw = firestoreGetCollection(COLLECTION_BY_TYPE[type]);
    var docs = raw.documents || [];
    docs.forEach(doc => {
      var f = doc.fields || {};
      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var u = f.aktualnyUzytkownik ? f.aktualnyUzytkownik.stringValue : "";
      if (!dostepny && u === email) total++;
    });
  });

  return total;
}

function countActiveReservationsAndRentalsForUser(email) {
  if (!email) return 0;

  var total = 0;
  Object.keys(COLLECTION_BY_TYPE).forEach(type => {
    var raw = firestoreGetCollection(COLLECTION_BY_TYPE[type]);
    var docs = raw.documents || [];
    docs.forEach(doc => {
      var f = doc.fields || {};

      var dostepny = f.dostepny ? !!f.dostepny.booleanValue : true;
      var u = f.aktualnyUzytkownik ? f.aktualnyUzytkownik.stringValue : "";

      var rA = f.rezerwacjaAktywna ? !!f.rezerwacjaAktywna.booleanValue : false;
      var rU = f.rezerwujacy ? f.rezerwujacy.stringValue : "";

      if ((!dostepny && u === email) || (rA && rU === email)) total++;
    });
  });

  return total;
}

/*********************************************************************
 * Horyzont rezerwacji
 *********************************************************************/
function validateReservationHorizon(start, end, maxTimeWeeks) {
  if (!maxTimeWeeks || maxTimeWeeks <= 0) return null;

  var now = new Date();
  var s = new Date(start);
  var diffDays = (s.getTime() - now.getTime()) / (1000*60*60*24);

  if (diffDays > maxTimeWeeks * 7) {
    return "Przekroczono maksymalny horyzont rezerwacji.";
  }

  return null;
}

/*********************************************************************
 * TEST
 *********************************************************************/
function testRentItemBroken() {
  var r = rentItem("kayak", "2", "", "", "");
  Logger.log(JSON.stringify(r, null, 2));
}
