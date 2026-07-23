/**
 * File: setup_sync.gs
 * Purpose: manual setup sync from Sheets to Firestore
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 */

// Mapowanie ról na grupy Google Workspace.
// Zmień tu gdy zmienia się struktura grup — potem uruchom syncSetupToFirestore() lub initRoleMappings().
// zarzad@morzkulc.pl: publiczna grupa mailowa „do zarządu". Trzymamy w niej OSOBY
// bezpośrednio (nie zagnieżdżamy kr@/zarzad_skk@), żeby poczta od nadawców z zewnątrz
// dochodziła do wszystkich (zagnieżdżone, zamknięte grupy odbijają zewnętrznych nadawców).
// Dzięki temu wpisowi rekonsyliator dodaje/usuwa osobę z zarzad@ przy zmianie roli w arkuszu.
const ROLE_MAPPINGS = {
  rola_czlonek:  { label: "Członek",  groups: ["czlonkowie@morzkulc.pl"] },
  rola_zarzad:   { label: "Zarząd",   groups: ["zarzad_skk@morzkulc.pl", "zarzad@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kr:       { label: "KR",       groups: ["kr@morzkulc.pl", "zarzad@morzkulc.pl", "czlonkowie@morzkulc.pl"] },
  rola_kandydat: { label: "Kandydat", groups: ["kandydaci@morzkulc.pl"] },
  rola_sympatyk: { label: "Sympatyk", groups: ["sympatycy@morzkulc.pl"] },
  rola_kursant:  { label: "Kursant",  groups: [] },
};

// Mapowanie statusów kont — blocksAccess: true blokuje dostęp (np. konto zawieszone).
// Zmień tu gdy zmienia się polityka blokowania — potem uruchom syncSetupToFirestore().
const STATUS_MAPPINGS = {
  status_aktywny:    { label: "Aktywny",    blocksAccess: false },
  status_zawieszony: { label: "Zawieszony", blocksAccess: true  },
  status_pending:    { label: "Oczekujący", blocksAccess: false },
};

// Sync wykonuje backend (task setup.syncFromSheet): czyta APP_SETUP + SETUP, zapisuje
// setup/app (modules + roleMappings + statusMappings) i vars, kolejkuje sync funkcyjnych ról.
// ROLE_MAPPINGS/STATUS_MAPPINGS są teraz utrzymywane w backendzie (setupSyncFromSheet.ts).
function syncSetupToFirestore() {
  runSync_("setup.syncFromSheet");
}

// Jednorazowa funkcja — wpisuje tylko roleMappings do setup/app bez ruszania reszty dokumentu.
// Uruchom raz po wdrożeniu. Potem syncSetupToFirestore() zawsze zapisuje roleMappings automatycznie.
function initRoleMappings() {
  assertBoardAccess_();

  const url =
    CONFIG.FIRESTORE_BASE_URL +
    "/" + DOC_SETUP_APP +
    "?updateMask.fieldPaths=roleMappings";

  const resp = UrlFetchApp.fetch(url, {
    method: "PATCH",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
    },
    payload: JSON.stringify({
      fields: toFirestoreFields_({ roleMappings: ROLE_MAPPINGS }),
    }),
    muteHttpExceptions: true,
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("initRoleMappings failed (" + code + "): " + text);
  }

  SpreadsheetApp.getUi().alert(
    "ROLE MAPPINGS OK ✅\n" +
    "env: " + ACTIVE_ENV + "\n" +
    "roles: " + Object.keys(ROLE_MAPPINGS).join(", ")
  );
}
