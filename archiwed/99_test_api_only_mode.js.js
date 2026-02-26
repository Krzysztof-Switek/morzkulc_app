/********************************************************************
 * 99_test_api_only_mode.js
 *
 * TEST: API-only mode
 * - upewnia się, że WebApp serwuje wyłącznie API JSON (70_api_router.js)
 * - nie ma aktywnego UI routera (HtmlService)
 *
 * Uruchom: test_api_only_mode()
 ********************************************************************/

function test_api_only_mode() {
  Logger.log("=== TEST API ONLY MODE START ===");

  // 1) Bezpośrednio wołamy doGet() - to MUSI być z 70_api_router.js
  const out = doGet();
  if (!out) throw new Error("doGet() zwrócił null/undefined");

  // 2) Sprawdź mimeType i JSON
  const mime = out.getMimeType && out.getMimeType();
  const text = out.getContent && out.getContent();

  Logger.log("mimeType=" + mime);
  Logger.log("content=" + text);

  // Oczekujemy JSON (ContentService.MimeType.JSON)
  if (String(mime) !== String(ContentService.MimeType.JSON)) {
    throw new Error(
      "FAIL: doGet() nie zwrócił JSON. mimeType=" + mime +
      " (to sugeruje, że UI router nadal przejmuje doGet())"
    );
  }

  let obj = null;
  try {
    obj = JSON.parse(String(text || ""));
  } catch (e) {
    throw new Error("FAIL: doGet() zwrócił nie-JSON: " + text);
  }

  if (!obj || obj.ok !== true) {
    throw new Error("FAIL: API /doGet nie ma ok=true. Odpowiedź: " + text);
  }

  if (obj.service !== "api_router") {
    throw new Error("FAIL: API /doGet nie ma service=api_router. Odpowiedź: " + text);
  }

  Logger.log("PASS: doGet() = API JSON (service=api_router)");

  // 3) Dodatkowy check: UI funkcje powinny być wyłączone
  // (jeśli ktoś je wywoła, ma polecieć błąd)
  try {
    if (typeof resolve_view_from_token === "function") {
      resolve_view_from_token("dummy");
      throw new Error("FAIL: resolve_view_from_token() istnieje i nie rzuca błędu — UI nadal aktywne?");
    }
  } catch (e) {
    Logger.log("OK: UI router nieaktywny / rzuca błąd: " + e);
  }

  Logger.log("=== TEST API ONLY MODE END: PASS ===");
}
