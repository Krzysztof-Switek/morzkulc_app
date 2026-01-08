/************************************************************
 * 11_firestore_utils.js
 * Funkcje pomocnicze Firestore + konwersje
 ************************************************************/

/**
 * Czy poprawna data JS
 */
function _isValidDate_(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Date (z Sheets) → Firestore Timestamp (UTC midnight)
 */
function _dateToFirestoreTimestampValue_(d) {
  const utcMidnight = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  );
  return utcMidnight.toISOString();
}

/**
 * Zamiana obiektu JS → Firestore fields{}
 *
 * ZASADY:
 * - Date            → timestampValue
 * - true/false      → booleanValue
 * - "" / null dla boolean → false   ✅ KLUCZOWE
 * - number          → integerValue / doubleValue
 * - reszta          → stringValue
 */
function convertToFirestoreFields(obj) {
  var fields = {};

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var value = obj[key];

    // null
    if (value === null) {
      fields[key] = { nullValue: null };
      continue;
    }

    // Date → Timestamp
    if (_isValidDate_(value)) {
      fields[key] = {
        timestampValue: _dateToFirestoreTimestampValue_(value)
      };
      continue;
    }

    // Boolean TRUE
    if (value === true) {
      fields[key] = { booleanValue: true };
      continue;
    }

    // Boolean FALSE albo pusty checkbox
    if (value === false || value === "") {
      fields[key] = { booleanValue: false };
      continue;
    }

    // Number
    if (typeof value === "number") {
      if (Number.isFinite(value) && Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else if (Number.isFinite(value)) {
        fields[key] = { doubleValue: value };
      } else {
        fields[key] = { stringValue: String(value) };
      }
      continue;
    }

    // String
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
      continue;
    }

    // Fallback
    fields[key] = { stringValue: String(value) };
  }

  return { fields: fields };
}

/**
 * Pobiera ID dokumentów w kolekcji
 */
function firestoreListDocumentIds(collectionPath) {
  var raw = firestoreGetCollection(collectionPath);
  var docs = raw.documents || [];
  return docs.map(doc => doc.name.split("/").pop());
}

/**
 * Usuwa dokumenty, które nie są w validIds
 */
function firestoreCleanupOrphans(collectionPath, validIds) {
  var validMap = {};
  validIds.forEach(id => {
    if (id !== null && id !== undefined && String(id).trim() !== "") {
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
    firestoreDeleteDocument(collectionPath + "/" + encodeURIComponent(id));
  });
}

/**
 * Timestamp → ISO (helper)
 */
function timestampToIso(field) {
  if (!field) return null;
  if (field.timestampValue) return field.timestampValue;
  return null;
}
