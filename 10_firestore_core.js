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

  return JSON.parse(response.getContentText());
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
  if (code !== 200 && code !== 204) {
    Logger.log("firestoreDeleteDocument: HTTP " + code + " path=" + docPath);
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
