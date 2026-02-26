/********************************************************************
 * 05_ui_router.js — DEPRECATED / WYŁĄCZONE (2026-01)
 *
 * Od teraz aplikacja działa WYŁĄCZNIE jako:
 * - Firebase Hosting (frontend)
 * - Apps Script WebApp jako API JSON: 70_api_router.js (doGet/doPost)
 *
 * Cel tego pliku:
 * - NIE mieć żadnego doGet()/doPost()
 * - NIE serwować HtmlService
 * - NIE routować widoków
 *
 * Dzięki temu nie ma konfliktu z 70_api_router.js.
 ********************************************************************/

function ui_router_DEPRECATED_() {
  throw new Error("UI Apps Script jest wyłączone. Użyj Firebase-hosted frontend + Apps Script API (70_api_router.js).");
}
