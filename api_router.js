/***************************************************
 *  include() – ładowanie fragmentów HTML
 ***************************************************/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/***************************************************
 *  Pobieranie emaila aktualnie zalogowanego użytkownika
 ***************************************************/
function getCurrentUserEmail_() {
  try {
    var email = Session.getActiveUser().getEmail();
    return email || "";
  } catch (err) {
    return "";
  }
}

/***************************************************
 *  DOGET – UI + userEmail + userRole
 ***************************************************/
function doGet(e) {
  // Brak parametrów → serwujemy UI
  if (!e || !e.parameter || !e.parameter.action) {

    var email = getCurrentUserEmail_();
    var role = getRoleForEmail(email);       // z setup_roles.gs

    var t = HtmlService.createTemplateFromFile('index');
    t.userEmail = email;
    t.userRole  = role;

    return t.evaluate()
      .setTitle('Wypożyczalnia sprzętu SKK Morzkulc')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // API JSON
  return handleRequest(e);
}

/***************************************************
 *  DOPOST
 ***************************************************/
function doPost(e) {
  return handleRequest(e);
}

/***************************************************
 *  UNIVERSAL API ROUTER
 *  W tym miejscu dodamy walidację ról użytkownika.
 ***************************************************/
function handleRequest(e) {
  try {
    var action = e.parameter.action;
    var email  = getCurrentUserEmail_();
    var role   = getRoleForEmail(email);

    // Bez emaila → blokada
    if (!email) {
      return sendJson_({ error: "Brak zalogowanego użytkownika." });
    }

    // Blokada dla NO_ACCESS
    if (role === "NO_ACCESS") {
      return sendJson_({ error: "Brak dostępu – skontaktuj się z zarządem." });
    }

    /***************************************************
     *  LOGIKA API
     ***************************************************/
    if (action === "getList") {
      var type = e.parameter.type;
      var items = getItemsByType(type);
      return sendJson_({ ok: true, items: items, role: role });
    }

    if (action === "rent") {
      var type = e.parameter.type;
      var id   = e.parameter.id;

      var result = rentItem(type, id, email, "", "");
      return sendJson_(result);
    }

    if (action === "reserve") {
      var type  = e.parameter.type;
      var id    = e.parameter.id;
      var start = e.parameter.start;
      var end   = e.parameter.end;

      var result = reserveItem(type, id, email, start, end);
      return sendJson_(result);
    }

    if (action === "return") {
      var type = e.parameter.type;
      var id   = e.parameter.id;

      var result = returnItem(type, id);
      return sendJson_(result);
    }

    return sendJson_({ error: "Nieznana akcja: " + action });

  } catch (err) {
    return sendJson_({ error: err.toString() });
  }
}

/***************************************************
 *  Helper – JSON Response
 ***************************************************/
function sendJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
