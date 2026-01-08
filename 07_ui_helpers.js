/********************************************************************
 * 00_ui_helpers.js
 *
 * Wspólne funkcje pomocnicze dla modułów UI.
 ********************************************************************/

/**
 * Normalizuje email.
 */
function ui_normEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/**
 * Bezpieczne pobranie parametru z eventu `e`.
 */
function ui_getParam(e, key) {
  if (!e || !e.parameter) return "";
  return e.parameter[key] || "";
}

/**
 * Tworzy HTMLOutput z cache-control = no-cache
 */
function ui_html(htmlString) {
  return HtmlService
    .createHtmlOutput(htmlString)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setTitle("SKK Morzkulc");
}
