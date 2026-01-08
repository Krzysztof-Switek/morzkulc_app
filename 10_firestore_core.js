/************************************************************
 * 10_firestore_core.gs
 * Podstawowe operacje HTTP na Firestore
 ************************************************************/

function getAuthHeaders() {
  return {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
  };
}

/**
 * GET kolekcji Firestore
 */
/********************************************************************
 * firestoreGetCollection – WERSJA Z PAGINACJĄ (100% stabilna)
 * Pobiera CAŁĄ kolekcję, niezależnie od rozmiaru.
 ********************************************************************/
function firestoreGetCollection(collectionPath) {
  const PAGE_SIZE = 100;
  let url = FIRESTORE_BASE_URL + "/" + collectionPath;
  let allDocs = [];
  let pageToken = null;

  do {
    let finalUrl = url + "?pageSize=" + PAGE_SIZE;
    if (pageToken) {
      finalUrl += "&pageToken=" + encodeURIComponent(pageToken);
    }

    const response = UrlFetchApp.fetch(finalUrl, {
      method: "get",
      headers: getAuthHeaders(),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const text = response.getContentText();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = null; }

    if (code !== 200) {
      throw new Error("Firestore ERROR " + code + ": " + text);
    }

    if (body && body.documents) {
      allDocs = allDocs.concat(body.documents);
    }

    pageToken = (body && body.nextPageToken) ? body.nextPageToken : null;

  } while (pageToken);

  return { documents: allDocs };
}


/**
 * GET pojedynczego dokumentu Firestore
 */
function firestoreGetDocument(docPath) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;
  var options = {
    method: 'get',
    headers: getAuthHeaders(),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code === 200) return JSON.parse(text);
  if (code === 404) return null;

  if (code === 400) {
    var parsed = null;
    try { parsed = JSON.parse(text); } catch(e){ parsed = null; }

    var status = parsed && parsed.error && parsed.error.status;
    if (status === 'INVALID_ARGUMENT') {
      Logger.log("firestoreGetDocument INVALID_ARGUMENT: " + docPath);
      return null;
    }
  }

  Logger.log(
    "firestoreGetDocument: HTTP=" + code + " PATH=" + docPath + " BODY=" + text
  );
  throw new Error("firestoreGetDocument HTTP " + code + " for " + docPath);
}

/**
 * PATCH bez precondition (do sync'ów)
 * WAŻNE: sprawdza HTTP code i rzuca błędem gdy zapis się nie udał
 */
function firestorePatchDocument(docPath, dataObj, updateMaskFields) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;

  if (updateMaskFields?.length > 0) {
    url += '?' + updateMaskFields
      .map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f))
      .join('&');
  }

  var body = convertToFirestoreFields(dataObj);
  var headers = getAuthHeaders();
  headers['Content-Type'] = 'application/json';

  var response = UrlFetchApp.fetch(url, {
    method: 'patch',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var text = response.getContentText();

  // Firestore zwraca 200 przy PATCH create/update
  if (code === 200) {
    return text ? JSON.parse(text) : null;
  }

  // Jeśli nie 200 — log i fail-fast
  Logger.log("firestorePatchDocument FAILED: HTTP=" + code + " PATH=" + docPath);
  Logger.log("firestorePatchDocument BODY: " + text);
  throw new Error("Firestore PATCH ERROR " + code + ": " + text);
}

/**
 * PATCH z warunkiem updateTime (optimistic concurrency)
 */
function firestorePatchDocumentWithUpdateTime(
  docPath, dataObj, updateMaskFields, expectedUpdateTime
) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;
  var params = [];

  if (updateMaskFields?.length > 0) {
    params.push(updateMaskFields
      .map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f))
      .join('&'));
  }

  if (expectedUpdateTime) {
    params.push('currentDocument.updateTime=' + encodeURIComponent(expectedUpdateTime));
  }

  if (params.length) url += '?' + params.join('&');

  var body = convertToFirestoreFields(dataObj);
  var headers = getAuthHeaders();
  headers['Content-Type'] = 'application/json';

  var response = UrlFetchApp.fetch(url, {
    method: 'patch',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  var parsed = text ? JSON.parse(text) : null;

  if (code === 200) return { ok: true, httpCode: code, body: parsed };

  var status = parsed && parsed.error && parsed.error.status;
  Logger.log("firestorePatchDocumentWithUpdateTime: HTTP " + code + " status " + status);

  return { ok: false, httpCode: code, status: status, body: parsed };
}

/**
 * DELETE dokumentu
 */
function firestoreDeleteDocument(docPath) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;
  var response = UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: getAuthHeaders(),
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code !== 200 && code !== 204) {
    Logger.log("firestoreDeleteDocument: HTTP " + code + " path=" + docPath);
    if (text) Logger.log("firestoreDeleteDocument BODY: " + text);
    throw new Error("Firestore DELETE ERROR " + code + ": " + text);
  }
}

/**
 * Sprawdza czy dokument istnieje
 */
function firestoreDocumentExists(docPath) {
  var url = FIRESTORE_BASE_URL + '/' + docPath;
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: getAuthHeaders(),
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  if (code === 200) return true;
  if (code === 404) return false;

  Logger.log("firestoreDocumentExists: unclear HTTP=" + code + " docPath=" + docPath);
  return false;
}
