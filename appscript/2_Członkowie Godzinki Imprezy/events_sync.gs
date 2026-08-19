/**
 * File: events_sync.gs
 * Purpose: manual events sync trigger (menu arkusza → backend)
 * Environment: controlled by ACTIVE_ENV in env_config.gs
 *
 * Cała logika syncu imprez żyje w backendzie: task "events.syncFromSheet"
 * (functions/src/service/tasks/eventsSyncFromSheet.ts):
 *  - upsert imprez do Firestore po kolumnie ID (auto-ID dla wierszy dodanych
 *    ręcznie jest wpisywane z powrotem do arkusza),
 *  - "Zatwierdzona" = TAK publikuje imprezę w aplikacji i w Google Calendar,
 *  - backfill: imprezy zgłoszone w aplikacji, których nie ma w arkuszu,
 *    są dopisywane przy każdym syncu,
 *  - po udanym syncu wiersza wypełniana jest kolumna "Zsynchronizowano",
 *  - nagłówki kolumn dopasowywane tolerancyjnie (wielkość liter/spacje).
 *
 * Backend uruchamia ten sync automatycznie codziennie ok. 04:45
 * (scheduler eventsSyncSheetDaily); kalendarz: 05:00. Menu służy do
 * natychmiastowego odświeżenia. Panel zarządu w aplikacji ma przycisk
 * uruchamiający komplet synców (godzinki + imprezy + kalendarz).
 */
function syncEventsToFirestore() {
  runSync_("events.syncFromSheet");
}
