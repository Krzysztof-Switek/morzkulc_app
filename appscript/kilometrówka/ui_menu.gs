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
    .addToUi();
}
