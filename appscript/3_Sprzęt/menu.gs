/** menu.gs */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addItem("sync sprzętu", "syncAllGearToFirestore")
    .addToUi();
}