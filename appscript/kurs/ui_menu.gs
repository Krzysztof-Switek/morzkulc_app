/**
 * File: ui_menu.gs
 * Purpose: spreadsheet menu
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addItem("sync co po kursie", "syncPoKursieToFirestore")
    .addToUi();
}
