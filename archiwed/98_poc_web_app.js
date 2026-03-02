/**
 * 98_poc_web_app.js
 * Minimalny test dymny (Proof of Concept) dla Web App w GAS.
 * Pozwala sprawdzić, czy komunikacja Front-end <-> GAS działa bez błędów CORS.
 */

function doPost(e) {
  const res = {
    ok: true,
    message: "GAS Web App otrzymał POST!",
    timestamp: new Date().toISOString(),
    method: "POST"
  };

  try {
    if (e && e.postData && e.postData.contents) {
      res.receivedBody = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    res.parseError = err.message;
  }

  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Rozszerzony test dymny (PoC) z weryfikacją tokenu Google ID.
 * Pozwala sprawdzić, czy konta prywatne (@gmail.com) mogą wywołać ten skrypt
 * i czy skrypt poprawnie rozpoznaje ich tożsamość.
 */
function doPostSecure(e) {
  const result = { ok: false, message: "Błąd ogólny" };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      result.message = "Brak danych w żądaniu (empty body)";
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = JSON.parse(e.postData.contents || "{}");
    const idToken = data.idToken;

    if (!idToken) {
      result.message = "Brak idToken w żądaniu POST";
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Weryfikacja tokenu (wymaga pliku 67_auth_core.js w tym samym projekcie GAS)
    const verification = auth_verifyGoogleIdToken(idToken);

    if (verification && verification.ok) {
      result.ok = true;
      result.message = "Token zweryfikowany pomyślnie!";
      result.email = verification.email;
      result.timestamp = new Date().toISOString();
    } else {
      result.message = "Nieprawidłowy token";
    }

  } catch (err) {
    result.message = "Błąd weryfikacji: " + err.message;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const res = {
    ok: true,
    message: "GAS Web App otrzymał GET!",
    timestamp: new Date().toISOString(),
    method: "GET"
  };

  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
