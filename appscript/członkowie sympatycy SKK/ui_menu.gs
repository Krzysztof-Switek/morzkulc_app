/**
 * File: ui_menu.gs
 * Purpose: spreadsheet menu
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Morzkulc")
    .addItem("sync setup", "syncSetupToFirestore")
    .addItem("sync członkowie", "syncUsersToFirestore")
    .addItem("sync imprezy", "syncEventsToFirestore")
    .addItem("sync godzinki", "syncHoursToFirestore")
    .addSeparator()
    .addSubMenu(
      ui.createMenu("Bilans otwarcia")
        .addItem("1. Wyczyść kolekcję bilansu", "clearOpeningBalanceCollection")
        .addItem("2. Import bilansu → Firestore", "importOpeningBalanceToFirestore")
        .addItem("3. Zasil kolumny arkusza członków", "seedMemberSheetBalancesFromOpeningBalance")
        .addItem("4. Import korekt godzinek 2026", "importGodzinkiKorektyToFirestore")
        .addItem("5. Uzupełnij godzinki bilansu (po mailu)", "reconcileOpeningBalanceByEmailPrompt")
    )
    .addToUi();
}