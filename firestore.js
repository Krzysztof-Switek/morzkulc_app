/** Nagłówki autoryzacyjne do Firestore (OAuth z Apps Script) */
function getAuthHeaders() {
  return {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
  };
}

/**
 * Pobiera całą kolekcję Firestore (prosty GET).
 * Zwraca obiekt JSON z Firestore.
 */
function firestoreGetCollection(collectionPath) {
  var url = FIRESTORE_BASE_URL + '/' + collectionPath;

  var options = {
    method: 'get',
    headers: getAuthHeaders(),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

/**
 * Aktualizuje dokument Firestore metodą PATCH.
 * docPath np. "kayaks/ABC123"
 * dataObj – zwykły JS { pole: wartosc }
 * updateMaskFields – tablica nazw pól do updateMask
 */
function firestorePatchDocument(docPath, dataObj, updateMaskFields) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;

  if (updateMaskFields && updateMaskFields.length > 0) {
    var mask = updateMaskFields
      .map(function (f) { return 'updateMask.fieldPaths=' + encodeURIComponent(f); })
      .join('&');
    url += '?' + mask;
  }

  var body = convertToFirestoreFields(dataObj);

  var headers = getAuthHeaders();
  headers['Content-Type'] = 'application/json';

  var options = {
    method: 'patch',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

/**
 * Zamienia zwykły obiekt JS na strukturę Firestore { fields: ... }
 * Obsługuje: string, number (int), boolean, null.
 */
function convertToFirestoreFields(obj) {
  var fields = {};

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var value = obj[key];

    if (value === null) {
      fields[key] = { nullValue: null };

    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };

    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };

    } else if (typeof value === 'number' && Number.isInteger(value)) {
      fields[key] = { integerValue: value.toString() };

    } else {
      // fallback – wszystko inne konwertujemy na string
      fields[key] = { stringValue: String(value) };
    }
  }

  return { fields: fields };
}

/**
 * Konwersja dokumentu Firestore → prosty obiekt JS dla frontendu.
 * Statyczne pola z arkusza + dynamiczne pola wypożyczeń.
 */
function mapKayakDocument(doc) {
  var f = doc.fields || {};
  var id = doc.name.split('/').pop();

  function str(fieldName) {
    return f[fieldName] ? f[fieldName].stringValue || '' : '';
  }
  function bool(fieldName, def) {
    if (!f[fieldName]) return def;
    if (typeof f[fieldName].booleanValue === 'boolean') {
      return f[fieldName].booleanValue;
    }
    return def;
  }

  return {
    id:           id,

    // statyczne pola z arkusza
    numerKajaka:  str('numerKajaka'),
    producent:    str('producent'),
    model:        str('model'),
    zdjecieUrl:   str('zdjecieUrl'),
    kolor:        str('kolor'),
    typ:          str('typ'),
    litrow:       str('litrow'),
    zakresWag:    str('zakresWag'),
    kokpit:       str('kokpit'),
    sprawny:      bool('sprawny', false),
    basen:        bool('basen',   false),
    prywatny:     bool('prywatny', false),
    uwagi:        str('uwagi'),

    // dynamiczne pola wypożyczeń
    dostepny:           bool('dostepny', true),
    aktualnyUzytkownik: str('aktualnyUzytkownik'),
    od:                 str('od'),
    do:                 str('do'),
  };
}

/**
 * Sprawdza, czy dokument Firestore istnieje.
 * Zwraca true / false na podstawie kodu HTTP:
 *  - 200 → istnieje
 *  - 404 → nie istnieje
 *  - inne → logujemy, zwracamy false (żeby nie rozwalić synca)
 */
function firestoreDocumentExists(docPath) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;

  var options = {
    method: 'get',
    headers: getAuthHeaders(),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();

  if (code === 200) {
    return true;
  }
  if (code === 404) {
    return false;
  }

  Logger.log(
    'firestoreDocumentExists: nieoczekiwany kod HTTP ' +
    code +
    ' dla ' + docPath +
    ', body=' + response.getContentText()
  );

  // W razie wątpliwości traktujemy jako "nie istnieje",
  // żeby nie blokować tworzenia nowego dokumentu.
  return false;
}

/**
 * Mapa dokumentu setup → JS
 * { value: ... }
 */
function mapSetupDocument(doc) {
  const f = doc.fields || {};
  const id = doc.name.split("/").pop();

  let value = null;

  if (f.value) {
    if (f.value.stringValue !== undefined) value = f.value.stringValue;
    if (f.value.integerValue !== undefined) value = Number(f.value.integerValue);
    if (f.value.booleanValue !== undefined) value = f.value.booleanValue;
    if (f.value.nullValue !== undefined) value = null;
  }

  return { name: id, value: value };
}
