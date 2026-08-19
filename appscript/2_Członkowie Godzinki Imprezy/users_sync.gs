/**
 * File: users_sync.gs
 * Purpose: ręczny sync członków z arkusza do Firestore (menu „sync członkowie").
 *
 * Sync wykonuje backend (task users.syncFieldsFromSheet): znajduje users_active po
 * memberId (== kolumna ID), patchuje TYLKO zmienione pola (email, profile.*, admin.*),
 * a przy zmianie roli/statusu kolejkuje users.syncRolesFromSheet. Konta @gmail
 * zarządu/KR nie mają IAM do zapisu Firestore — stąd delegacja przez runSync_
 * (UrlFetchApp tokenem uruchamiającego, endpoint sam autoryzuje).
 */
function syncUsersToFirestore() {
  runSync_("users.syncFieldsFromSheet");
}
