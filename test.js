function testFirestoreDocuments() {
  const projectId = 'sprzet-skk-morzkulc';
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    projectId +
    '/databases/(default)/documents/kayaks';

  // <<< TO JEST KLUCZOWE >>>
  const token = ScriptApp.getOAuthToken();

  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  Logger.log('CODE: ' + response.getResponseCode());
  Logger.log(response.getContentText());
}


function testAuth() {
  const token = ScriptApp.getOAuthToken();
  Logger.log(token);
}

function forceReauth() {
  UrlFetchApp.fetch("https://www.googleapis.com/auth/userinfo.email");
}
