/**
 * File: ui_menu.gs
 * Purpose: spreadsheet menu for Kilometrówka
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addItem("Eksportuj archiwum do Firestore", "syncArchivumToFirestore")
    .addItem("Ranking korekta do Firestore", "pushRankingCorrections")
    .addItem("Ranking pobierz wszystko", "syncRankingFromFirestore")
    .addItem("Przelicz ranking (po zmianie punktacji)", "enqueueRebuildRankings")
    .addItem("Odśwież mapę aktywności", "enqueueRebuildMapData")
    .addToUi();
}

/**
 * Kolejkuje task km.rebuildRankings — przelicza km_user_stats dla wszystkich użytkowników.
 * Uruchamiać po każdej zmianie wartości punktacji w zakładce SETUP arkusza Członkowie.
 */
function enqueueRebuildRankings() {
  assertBoardAccess_();
  try {
    enqueueServiceJob_("km.rebuildRankings", {});
    SpreadsheetApp.getUi().alert("Przeliczanie rankingu zakolejkowane ✅\nWyniki pojawią się w aplikacji po chwili.");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Błąd kolejkowania: " + String(e.message || e));
  }
}

/**
 * Kolejkuje task km.rebuildMapData — przebudowuje cache mapy aktywności.
 * Uruchamiać po imporcie nowych danych lub zmianie lokalizacji.
 */
function enqueueRebuildMapData() {
  assertBoardAccess_();
  try {
    enqueueServiceJob_("km.rebuildMapData", {});
    SpreadsheetApp.getUi().alert("Przebudowa mapy zakolejkowana ✅\nMapa zaktualizuje się za chwilę.");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Błąd kolejkowania: " + String(e.message || e));
  }
}
