/**
 * File: ui_menu.gs
 * Purpose: spreadsheet menu
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addItem("sync setup", "syncSetupToFirestore")
    .addToUi();
}
