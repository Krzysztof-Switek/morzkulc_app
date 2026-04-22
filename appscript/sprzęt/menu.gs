/** menu.gs */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Morzkulc")
    .addItem("Sync setup", "syncSetupToFirestore")
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu("Sync sprzęt")
        .addItem("Cały sprzęt (dry run)", "syncAllGearDryRun")
        .addItem("Cały sprzęt → Firestore (sync)", "syncAllGearToFirestore")
    )
    .addToUi();
}