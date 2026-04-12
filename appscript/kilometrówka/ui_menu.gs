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
