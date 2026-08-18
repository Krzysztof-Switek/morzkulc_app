/**
 * File: setup_sync.gs
 * Purpose: jedyny "sync setup" w projekcie — synchronizuje WSZYSTKIE zakładki tego
 * arkusza (App_SETUP, Vars_CZLONKOWIE, Vars_SPRZET, Vars_BASEN, Vars_GODZINKI,
 * Vars_KURS) jednym kliknięciem, niezależnie od tego, którą edytowano.
 *
 * Sync wykonuje backend (task setup.syncFromSheet) — patrz
 * functions/src/service/tasks/setupSyncFromSheet.ts.
 */
function syncSetupToFirestore() {
  runSync_("setup.syncFromSheet");
}
