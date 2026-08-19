/** sync_kayaks.gs */

// Sync wykonuje backend (task gear.syncAllFromSheet) — zapisy Firestore idą przez
// konto serwisowe backendu, nie przez ten skrypt.
function syncAllGearToFirestore() {
  runSync_("gear.syncAllFromSheet");
}
