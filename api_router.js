function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  if (!e || !e.parameter || !e.parameter.action) {
    var t = HtmlService.createTemplateFromFile('index');
    return t.evaluate()
      .setTitle('Wypożyczalnia sprzętu SKK Morzkulc')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}
