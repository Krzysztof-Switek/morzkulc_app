/** menu.gs */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu("Sync")
        .addItem("Cały sprzęt (dry run)", "syncAllGearDryRun")
        .addItem("Cały sprzęt → Firestore (sync)", "syncAllGearToFirestore")
    )
    .addToUi();
}