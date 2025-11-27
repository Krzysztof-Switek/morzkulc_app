/************************************************************
 * 20_firestore_utils.gs
 * Funkcje pomocnicze Firestore + konwersje
 ************************************************************/

/**
 * Zamiana obiektu JS → Firestore fields{}
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
      fields[key] = { stringValue: String(value) };
    }
  }

  return { fields: fields };
}

/**
 * Pobiera ID dokumentów w kolekcji
 */
function firestoreListDocumentIds(collectionPath) {
  var raw = firestoreGetCollection(collectionPath);
  var docs = raw.documents || [];
  return docs.map(doc => doc.name.split('/').pop());
}

/**
 * Usuwa dokumenty, które nie są w validIds
 */
function firestoreCleanupOrphans(collectionPath, validIds) {
  var validMap = {};
  validIds.forEach(id => {
    if (id !== null && id !== undefined && String(id).trim() !== '') {
      validMap[String(id)] = true;
    }
  });

  var fsIds = firestoreListDocumentIds(collectionPath);

  var orphans = fsIds.filter(id => !validMap[id]);

  Logger.log(
    "firestoreCleanupOrphans: orphan docs in " +
    collectionPath + " = " + JSON.stringify(orphans)
  );

  orphans.forEach(id => {
    firestoreDeleteDocument(collectionPath + '/' + encodeURIComponent(id));
  });
}

/**
 * Konwersja timestamp → ISO string
 */
function timestampToIso(field) {
  if (!field) return null;

  if (field.timestampValue) return field.timestampValue;
  if (field.stringValue && /^\d{4}-/.test(field.stringValue)) return field.stringValue;

  return null;
}
