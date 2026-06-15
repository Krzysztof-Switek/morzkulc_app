/**
 * File: hours_sync.gs
 * Purpose: manual hours sync trigger (menu arkusza → backend)
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Cała logika syncu godzinek (zatwierdzenia, korekty pending, backfill wierszy)
 * żyje w backendzie: task "godzinki.syncFromSheet"
 * (functions/src/service/tasks/godzinkiSyncFromSheet.ts).
 *
 * Backend dodatkowo uruchamia ten sync automatycznie codziennie o 05:15
 * (scheduler godzinkiSyncDaily) — menu służy do natychmiastowego odświeżenia.
 *
 * Zasady (egzekwowane przez backend):
 *  - korekty kolumn Godzinki / Data pracy / Opis działają TYLKO dla wierszy
 *    jeszcze niezatwierdzonych; po zatwierdzeniu wartości są zamrożone,
 *  - zatwierdzenie (Zatwierdzone=TAK) jest jednokierunkowe — TAK→NIE jest
 *    ignorowane,
 *  - po zatwierdzeniu backend wypełnia kolumny "Zsynchronizowano"
 *    i "Data zatwierdzenia"; wiersz zatwierdzony BEZ daty w "Zsynchronizowano"
 *    oznacza odmowę (np. przeterminowana data pracy, nieaktualny wykup) —
 *    szczegóły w logach backendu.
 */
function syncHoursToFirestore() {
  runSync_("godzinki.syncFromSheet");
}
