# Project Context Map

Generated at: `2026-06-10T11:09:56`
Project root: `C:\Users\kswitek\Documents\morzkulc_app`

Purpose: this file is a compact project map for Claude Code. It shows which files exist, what functions/classes they contain, and which internal files depend on which other files.

## Suggested Claude Code instruction

```text
First read _claude_context/PROJECT_CONTEXT_MAP.md.
Use it as a navigation map. Do not read the whole repository blindly.
Open only the files that are relevant to the task, based on functions, classes, dependencies and file descriptions from the map.
When changing code, work in small steps and explain which files need to be opened and why.
```

## Scan settings

Excluded directories:

- `.cache`
- `.git`
- `.idea`
- `.mypy_cache`
- `.pytest_cache`
- `.ruff_cache`
- `.venv`
- `.vscode`
- `__pycache__`
- `_claude_context`
- `build`
- `checkpoints`
- `coverage`
- `data`
- `datasets`
- `dist`
- `env`
- `htmlcov`
- `logs`
- `mlruns`
- `node_modules`
- `results`
- `runs`
- `venv`
- `wandb`

Excluded sensitive files:

- `.env`
- `.env.development`
- `.env.local`
- `.env.production`
- `credentials.json`
- `firebase-service-account.json`
- `secrets.json`
- `serviceAccountKey.json`

## Summary

- Total scanned files: `349`
- Python files: `37`
- Script files JS/TS/GS/etc.: `224`
- Config files: `19`
- Markdown files: `42`
- Internal dependency edges: `347`

## Project tree

```text
- .claude/
  - settings.local.json
- .claude_context/
  - README.md
  - context_backend.md
  - context_config.md
  - context_dependencies.json
  - context_files.json
  - context_frontend.md
  - context_keywords.md
  - context_routes.md
  - context_tests.md
- Audyty/
  - AUDIT_MAP.md
  - AUDIT_PLAN.md
  - GRUPY_UZYTKOWNICY_PLAN_AND_TO_DO.MD
  - RUN_TESTS.md
  - TEST_DATA_REQUIREMENTS.md
  - TEST_MATRIX.md
  - TO_DO_USERS.md
  - audyt_ekrany_użytkowników.md
  - audyt_ranking_kilometrowka_mapa_v2.md
  - audyt_rejestracja.md
  - audyt_testow_logowanie_uzytkownicy_v1.md
  - audyt_testow_ranking_kilometrowka_mapa.md
  - audyt_v2.md
  - ekran_kursant_podsumowanie_wdrozenia.md
  - kajaki_w_mojej_wadze_plan.md
  - konta testowe.md
  - kurs_wdrożenie_ekrany.md
  - kursanc_ekrany_wdrozenie.md
  - live_web_audyt_v1.md
  - plan_audyt_v2.md
  - plan_ranking_kilometrowka_mapa_v1.md
  - plan_testow_logowanie_uzytkownicy_v1.md
  - plan_testow_ranking_kilometrowka_mapa_v1.md
  - ranking_wdrozenie_audyt.md
  - test_logowania_wymagania_wstepne.md
  - users_wdrozenie_1.md
  - users_wdrozenie_1_TO_DO.MD
  - wdrożenia kalendarza.md
  - zasady_ekrany_uzytkownikow.md
- appscript/
  - członkowie sympatycy SKK/
    - api_router
    - common_helpers.gs
    - env_config.gs
    - events_sync.gs
    - hours_sync.gs
    - setup_sync.gs
    - ui_menu.gs
    - users_sync.gs
  - kilometrówka/
    - .clasp.json
    - appsscript.json
    - archiwum_sync.gs
    - common_helpers.gs
    - env_config.gs
    - ranking_sync.gs
    - ui_menu.gs
  - kurs/
    - appsscript.json
    - common_helpers.gs
    - env_config.gs
    - kurs_config_sync.gs
    - po_kursie_sync.gs
    - uczestnicy_sync.gs
    - ui_menu.gs
  - sprzęt/
    - config.gs
    - firestore_rest.gs
    - menu.gs
    - setup_sync.gs
    - sync_kayaks.gs
- functions/
  - lib/
    - api/
      - DELETE_getModulesHandler.js
      - adminEventsSyncCalendarHandler.js
      - basenAdminAddGodzinyHandler.js
      - basenAdminCorrectGodzinyHandler.js
      - basenAdminSearchUsersHandler.js
      - basenCancelEnrollmentHandler.js
      - basenCancelSessionHandler.js
      - basenCreateSessionHandler.js
      - basenEnrollHandler.js
      - basenGrantKarnetHandler.js
      - gearBundleReservationCreateHandler.js
      - gearFavoriteToggleHandler.js
      - gearKayaksListHandler.js
      - gearMyReservationsHandler.js
      - gearReservationCancelHandler.js
      - gearReservationCreateHandler.js
      - gearReservationUpdateHandler.js
      - getAdminPendingHandler.js
      - getBasenGodzinyHandler.js
      - getBasenKarnetyHandler.js
      - getBasenSessionsHandler.js
      - getEventsHandler.js
      - getGearFavoritesHandler.js
      - getGearItemAvailabilityHandler.js
      - getGearItemsHandler.js
      - getGearKayaksHandler.js
      - getGodzinkiHandler.js
      - getKayakReservationsHandler.js
      - getKursInfoHandler.js
      - getKursantStatsHandler.js
      - getModulesHandler.js
      - godzinkiPurchaseHandler.js
      - kmAddLogHandler.js
      - kmAdminMergePlacesHandler.js
      - kmEventStatsHandler.js
      - kmMapDataHandler.js
      - kmMyLogsHandler.js
      - kmMyStatsHandler.js
      - kmPlacesHandler.js
      - kmRankingsHandler.js
      - registerUserHandler.js
      - submitEventHandler.js
      - submitGodzinkiHandler.js
      - userWeightHandler.js
    - modules/
      - basen/
        - basen_godziny_service.js
        - basen_service.js
      - calendar/
        - calendar_utils.js
        - events_service.js
      - equipment/
        - bundle/
          - gear_bundle_service.js
        - kayaks/
          - gear_kayaks_service.js
        - shared/
          - gear_catalog_service.js
      - hours/
        - godzinki_service.js
        - godzinki_vars.js
        - hours_quote.js
      - km/
        - km_log_service.js
        - km_places_service.js
        - km_scoring.js
        - km_vars.js
      - setup/
        - setup_gear_vars.js
      - users/
        - userStatusCheck.js
    - service/
      - admin/
        - adminRunTask.js
      - providers/
        - googleAuth.js
        - googleCalendarProvider.js
        - googleSheetsProvider.js
        - googleWorkspaceProvider.js
      - tasks/
        - basenNotifySessionCancelled.js
        - eventsSyncCalendar.js
        - eventsSyncFromSheet.js
        - gearPrivateStorage.js
        - gearSyncKayaksFromSheet.js
        - godzinkiSyncFromSheet.js
        - kmMergeHistoricalUser.js
        - kmRebuildMapData.js
        - kmRebuildRankings.js
        - kmRebuildUserStats.js
        - kursSyncFromSheet.js
        - listaEnforcePostingPolicy.js
        - membersSyncToSheet.js
        - onUserRegisteredWelcome.js
        - usersSyncFunctionRolesFromSetup.js
        - usersSyncRolesFromSheet.js
      - triggers/
        - onUsersActiveCreated.js
      - worker/
        - fallbackDailyWorker.js
        - jobProcessor.js
        - onJobCreatedWorker.js
      - registry.js
      - runner.js
      - service_config.js
      - types.js
    - index.js
  - scripts/
    - enqueueListaPolicy.js
  - src/
    - api/
      - adminEventsSyncCalendarHandler.ts
      - basenAdminAddGodzinyHandler.ts
      - basenAdminCorrectGodzinyHandler.ts
      - basenAdminSearchUsersHandler.ts
      - basenCancelEnrollmentHandler.ts
      - basenCancelSessionHandler.ts
      - basenCreateSessionHandler.ts
      - basenEnrollHandler.ts
      - basenGrantKarnetHandler.ts
      - gearBundleReservationCreateHandler.ts
      - gearFavoriteToggleHandler.ts
      - gearKayaksListHandler.ts
      - gearMyReservationsHandler.ts
      - gearReservationCancelHandler.ts
      - gearReservationCreateHandler.ts
      - gearReservationUpdateHandler.ts
      - getAdminPendingHandler.ts
      - getBasenGodzinyHandler.ts
      - getBasenKarnetyHandler.ts
      - getBasenSessionsHandler.ts
      - getEventsHandler.ts
      - getGearFavoritesHandler.ts
      - getGearItemAvailabilityHandler.ts
      - getGearItemsHandler.ts
      - getGearKayaksHandler.ts
      - getGodzinkiHandler.ts
      - getKayakReservationsHandler.ts
      - getKursInfoHandler.ts
      - getKursantStatsHandler.ts
      - godzinkiPurchaseHandler.ts
      - kmAddLogHandler.ts
      - kmAdminMergePlacesHandler.ts
      - kmEventStatsHandler.ts
      - kmMapDataHandler.ts
      - kmMyLogsHandler.ts
      - kmMyStatsHandler.ts
      - kmPlacesHandler.ts
      - kmRankingsHandler.ts
      - registerUserHandler.ts
      - submitEventHandler.ts
      - submitGodzinkiHandler.ts
      - userWeightHandler.ts
    - modules/
      - basen/
        - basen_godziny_service.ts
        - basen_service.ts
      - calendar/
        - calendar_utils.ts
        - events_service.ts
      - equipment/
        - bundle/
          - gear_bundle_service.ts
        - kayaks/
          - gear_kayaks_service.ts
        - shared/
          - gear_catalog_service.ts
      - hours/
        - godzinki_service.ts
        - godzinki_vars.ts
        - hours_quote.ts
      - km/
        - km_log_service.ts
        - km_places_service.ts
        - km_scoring.ts
        - km_vars.ts
      - setup/
        - setup_gear_vars.ts
      - users/
        - userStatusCheck.ts
    - service/
      - admin/
        - adminRunTask.ts
      - providers/
        - googleAuth.ts
        - googleCalendarProvider.ts
        - googleSheetsProvider.ts
        - googleWorkspaceProvider.ts
      - tasks/
        - basenNotifySessionCancelled.ts
        - eventsSyncCalendar.ts
        - eventsSyncFromSheet.ts
        - gearPrivateStorage.ts
        - gearSyncKayaksFromSheet.ts
        - godzinkiSyncFromSheet.ts
        - kmMergeHistoricalUser.ts
        - kmRebuildMapData.ts
        - kmRebuildRankings.ts
        - kmRebuildUserStats.ts
        - kursSyncFromSheet.ts
        - listaEnforcePostingPolicy.ts
        - membersSyncToSheet.ts
        - onUserRegisteredWelcome.ts
        - usersSyncFunctionRolesFromSetup.ts
        - usersSyncRolesFromSheet.ts
      - triggers/
        - onUsersActiveCreated.ts
      - worker/
        - fallbackDailyWorker.ts
        - jobProcessor.ts
        - onJobCreatedWorker.ts
      - registry.ts
      - runner.ts
      - service_config.ts
      - types.ts
    - index.ts
  - .eslintrc.js
  - .gitignore
  - package-lock.json
  - package.json
  - tsconfig.dev.json
  - tsconfig.json
- instrukcje/
  - konta_funkcyjne_i_grupy.md
- public/
  - core/
    - access_control.js
    - api_client.js
    - app_shell.js
    - firebase_client.js
    - module_stub.js
    - modules_registry.js
    - render_shell.js
    - router.js
    - theme.js
    - user_error_messages.js
  - modules/
    - admin_pending_module.js
    - basen_module.js
    - gear_module.js
    - godzinki_module.js
    - impreza_module.js
    - km_module.js
    - kurs_godzinki_module.js
    - kurs_module.js
    - my_reservations_module.js
  - skrypt_kurs/
    - chapters/
      - ch01.html
      - ch02.html
      - ch03.html
      - ch04.html
      - ch05.html
      - ch06.html
  - styles/
    - app.css
    - base.css
    - basen.css
    - dashboard.css
    - events.css
    - gear.css
    - godzinki.css
    - km.css
    - kurs.css
    - start.css
  - 404.html
  - index.html
  - manifest.json
  - map.html
  - sw.js
- scripts/
  - bump-sw-cache.js
- tests/
  - e2e/
    - helpers/
      - __init__.py
      - api_helper.py
      - firebase_auth.py
      - firestore_helper.py
      - gear_discovery.py
      - playwright_helper.py
      - reporter.py
      - sheets_helper.py
    - phases/
      - __init__.py
      - phase_0_precheck.py
      - phase_1_registration.py
      - phase_2_role_change_via_sheet.py
      - phase_3_godzinki_grant.py
      - phase_4_first_reservation.py
      - phase_5_limit_errors.py
      - phase_6_cancel_reservation.py
      - phase_7_balance_drain.py
      - phase_8_sheet_sync_after_role.py
      - phase_9_cleanup.py
      - phase_A_suspended_user.py
      - phase_B_module_visibility.py
    - reports/
      - e2e_prod_20260409_100718.json
      - e2e_prod_20260409_100718.md
      - e2e_prod_20260409_120139.json
      - e2e_prod_20260409_120139.md
      - e2e_prod_20260409_120535.json
      - e2e_prod_20260409_120535.md
      - e2e_prod_20260409_144924.json
      - e2e_prod_20260409_144924.md
    - .gitignore
    - config.py
    - oauth_client.json
    - requirements.txt
    - run_e2e.py
    - seed_test_accounts.py
    - test_gear_private_storage.py
    - test_gear_reservations_api.py
    - test_godzinki_api.py
    - test_km_api.py
    - test_km_firestore.py
    - test_register_bo26.py
    - test_security_http.py
  - test_bundle_reservations.py
  - test_godzinki.py
  - test_pwa.py
- tools/
  - build_project_context.py
  - generate_pwa_icons.py
- .firebaserc
- .gitattributes
- .gitignore
- CLAUDE.md
- ai_full_audit_report.json
- ai_full_audit_report.txt
- firebase.json
- firestore.indexes.json
- project_context.py
```

## Internal dependency map

- `functions/lib/api/basenAdminAddGodzinyHandler.js` -> `functions/lib/modules/basen/basen_godziny_service.js`
- `functions/lib/api/basenAdminCorrectGodzinyHandler.js` -> `functions/lib/modules/basen/basen_godziny_service.js`
- `functions/lib/api/basenCancelEnrollmentHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/basenCancelSessionHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/basenCreateSessionHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/basenEnrollHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/basenEnrollHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/basenGrantKarnetHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/gearBundleReservationCreateHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/gearBundleReservationCreateHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/gearBundleReservationCreateHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/gearKayaksListHandler.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/api/gearMyReservationsHandler.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/api/gearReservationCancelHandler.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/api/gearReservationCreateHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/gearReservationCreateHandler.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/api/gearReservationCreateHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/gearReservationUpdateHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/gearReservationUpdateHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/getAdminPendingHandler.js` -> `functions/lib/service/service_config.js`
- `functions/lib/api/getBasenGodzinyHandler.js` -> `functions/lib/modules/basen/basen_godziny_service.js`
- `functions/lib/api/getBasenKarnetyHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/getBasenSessionsHandler.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/api/getEventsHandler.js` -> `functions/lib/modules/calendar/events_service.js`
- `functions/lib/api/getGearItemAvailabilityHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/getGearItemAvailabilityHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/getGearItemsHandler.js` -> `functions/lib/modules/equipment/shared/gear_catalog_service.js`
- `functions/lib/api/getGearKayaksHandler.js` -> `functions/lib/modules/equipment/shared/gear_catalog_service.js`
- `functions/lib/api/getGodzinkiHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/getGodzinkiHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/getKursInfoHandler.js` -> `functions/lib/service/service_config.js`
- `functions/lib/api/godzinkiPurchaseHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/godzinkiPurchaseHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_places_service.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_vars.js`
- `functions/lib/api/kmMyLogsHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmMyStatsHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmPlacesHandler.js` -> `functions/lib/modules/km/km_places_service.js`
- `functions/lib/api/registerUserHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/submitEventHandler.js` -> `functions/lib/modules/calendar/events_service.js`
- `functions/lib/api/submitEventHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/index.js` -> `functions/lib/api/adminEventsSyncCalendarHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminAddGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminCorrectGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminSearchUsersHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCancelEnrollmentHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCancelSessionHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCreateSessionHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenEnrollHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenGrantKarnetHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearBundleReservationCreateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearFavoriteToggleHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearMyReservationsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationCancelHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationCreateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationUpdateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminPendingHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenKarnetyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenSessionsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getEventsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearFavoritesHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearItemAvailabilityHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearItemsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearKayaksHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGodzinkiHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getKayakReservationsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getKursInfoHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getKursantStatsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/godzinkiPurchaseHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmAddLogHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmAdminMergePlacesHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmEventStatsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmMapDataHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmMyLogsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmMyStatsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmPlacesHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/kmRankingsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/registerUserHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/submitEventHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/submitGodzinkiHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/userWeightHandler.js`
- `functions/lib/index.js` -> `functions/lib/service/admin/adminRunTask.js`
- `functions/lib/index.js` -> `functions/lib/service/runner.js`
- `functions/lib/index.js` -> `functions/lib/service/service_config.js`
- `functions/lib/index.js` -> `functions/lib/service/triggers/onUsersActiveCreated.js`
- `functions/lib/index.js` -> `functions/lib/service/worker/fallbackDailyWorker.js`
- `functions/lib/index.js` -> `functions/lib/service/worker/onJobCreatedWorker.js`
- `functions/lib/modules/calendar/events_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/hours_quote.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/hours_quote.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/modules/hours/hours_quote.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/km/km_log_service.js` -> `functions/lib/modules/km/km_scoring.js`
- `functions/lib/service/admin/adminRunTask.js` -> `functions/lib/service/runner.js`
- `functions/lib/service/admin/adminRunTask.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/providers/googleCalendarProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/providers/googleSheetsProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/providers/googleWorkspaceProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/basenNotifySessionCancelled.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsSyncCalendar.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/gearPrivateStorage.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/gearSyncKayaksFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmMergeHistoricalUser.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildMapData.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildRankings.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildUserStats.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kursSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/listaEnforcePostingPolicy.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/membersSyncToSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/onUserRegisteredWelcome.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersSyncRolesFromSheet.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/providers/googleWorkspaceProvider.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/registry.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/basenNotifySessionCancelled.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/service/tasks/eventsSyncCalendar.js` -> `functions/lib/service/providers/googleCalendarProvider.js`
- `functions/lib/service/tasks/eventsSyncCalendar.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/providers/googleCalendarProvider.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/service/tasks/gearSyncKayaksFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/gearSyncKayaksFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/kmRebuildRankings.js` -> `functions/lib/service/tasks/kmRebuildUserStats.js`
- `functions/lib/service/tasks/kmRebuildUserStats.js` -> `functions/lib/modules/km/km_scoring.js`
- `functions/lib/service/tasks/kmRebuildUserStats.js` -> `functions/lib/modules/km/km_vars.js`
- `functions/lib/service/tasks/kursSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/kursSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/membersSyncToSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/membersSyncToSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/providers/googleWorkspaceProvider.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/triggers/onUsersActiveCreated.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/fallbackDailyWorker.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/fallbackDailyWorker.js` -> `functions/lib/service/worker/jobProcessor.js`
- `functions/lib/service/worker/jobProcessor.js` -> `functions/lib/service/runner.js`
- `functions/lib/service/worker/jobProcessor.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/onJobCreatedWorker.js` -> `functions/lib/service/worker/jobProcessor.js`
- `functions/src/api/basenAdminAddGodzinyHandler.ts` -> `functions/src/modules/basen/basen_godziny_service.ts`
- `functions/src/api/basenAdminCorrectGodzinyHandler.ts` -> `functions/src/modules/basen/basen_godziny_service.ts`
- `functions/src/api/basenCancelEnrollmentHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenCancelSessionHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenCreateSessionHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenEnrollHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenEnrollHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/basenGrantKarnetHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/gearKayaksListHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearMyReservationsHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearReservationCancelHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/gearReservationUpdateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearReservationUpdateHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/getAdminPendingHandler.ts` -> `functions/src/service/service_config.ts`
- `functions/src/api/getBasenGodzinyHandler.ts` -> `functions/src/modules/basen/basen_godziny_service.ts`
- `functions/src/api/getBasenKarnetyHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getBasenSessionsHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getEventsHandler.ts` -> `functions/src/modules/calendar/events_service.ts`
- `functions/src/api/getGearItemAvailabilityHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/getGearItemAvailabilityHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/getGearItemsHandler.ts` -> `functions/src/modules/equipment/shared/gear_catalog_service.ts`
- `functions/src/api/getGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/getGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/getKursInfoHandler.ts` -> `functions/src/service/service_config.ts`
- `functions/src/api/godzinkiPurchaseHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/godzinkiPurchaseHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_places_service.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_vars.ts`
- `functions/src/api/kmMyLogsHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmMyStatsHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmPlacesHandler.ts` -> `functions/src/modules/km/km_places_service.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/submitEventHandler.ts` -> `functions/src/modules/calendar/events_service.ts`
- `functions/src/api/submitEventHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/index.ts` -> `functions/src/api/adminEventsSyncCalendarHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenAdminAddGodzinyHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenAdminCorrectGodzinyHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenAdminSearchUsersHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCancelEnrollmentHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCancelSessionHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCreateSessionHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenEnrollHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenGrantKarnetHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearBundleReservationCreateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearFavoriteToggleHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearMyReservationsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationCancelHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationCreateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationUpdateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminPendingHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenGodzinyHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenKarnetyHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenSessionsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getEventsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearFavoritesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearItemAvailabilityHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearItemsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearKayaksHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGodzinkiHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getKayakReservationsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getKursInfoHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getKursantStatsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/godzinkiPurchaseHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmAddLogHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmAdminMergePlacesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmEventStatsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmMapDataHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmMyLogsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmMyStatsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmPlacesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/kmRankingsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/registerUserHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/submitEventHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/submitGodzinkiHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/userWeightHandler.ts`
- `functions/src/index.ts` -> `functions/src/service/admin/adminRunTask.ts`
- `functions/src/index.ts` -> `functions/src/service/runner.ts`
- `functions/src/index.ts` -> `functions/src/service/service_config.ts`
- `functions/src/index.ts` -> `functions/src/service/triggers/onUsersActiveCreated.ts`
- `functions/src/index.ts` -> `functions/src/service/worker/fallbackDailyWorker.ts`
- `functions/src/index.ts` -> `functions/src/service/worker/onJobCreatedWorker.ts`
- `functions/src/modules/calendar/events_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/hours_quote.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/hours_quote.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/modules/hours/godzinki_service.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/modules/hours/hours_quote.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/hours/hours_quote.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/modules/km/km_log_service.ts` -> `functions/src/modules/km/km_scoring.ts`
- `functions/src/modules/km/km_log_service.ts` -> `functions/src/modules/km/km_vars.ts`
- `functions/src/modules/km/km_scoring.ts` -> `functions/src/modules/km/km_vars.ts`
- `functions/src/service/admin/adminRunTask.ts` -> `functions/src/service/runner.ts`
- `functions/src/service/admin/adminRunTask.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/providers/googleCalendarProvider.ts` -> `functions/src/service/providers/googleAuth.ts`
- `functions/src/service/providers/googleSheetsProvider.ts` -> `functions/src/service/providers/googleAuth.ts`
- `functions/src/service/providers/googleWorkspaceProvider.ts` -> `functions/src/service/providers/googleAuth.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/basenNotifySessionCancelled.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsSyncCalendar.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/gearPrivateStorage.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/gearSyncKayaksFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmMergeHistoricalUser.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildMapData.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildRankings.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildUserStats.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kursSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/listaEnforcePostingPolicy.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/membersSyncToSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/onUserRegisteredWelcome.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersSyncRolesFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/types.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/registry.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/basenNotifySessionCancelled.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/service/tasks/basenNotifySessionCancelled.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/providers/googleCalendarProvider.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/providers/googleCalendarProvider.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/gearSyncKayaksFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/gearSyncKayaksFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/gearSyncKayaksFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/kmMergeHistoricalUser.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/kmRebuildMapData.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/kmRebuildRankings.ts` -> `functions/src/service/tasks/kmRebuildUserStats.ts`
- `functions/src/service/tasks/kmRebuildRankings.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/kmRebuildUserStats.ts` -> `functions/src/modules/km/km_scoring.ts`
- `functions/src/service/tasks/kmRebuildUserStats.ts` -> `functions/src/modules/km/km_vars.ts`
- `functions/src/service/tasks/kmRebuildUserStats.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/kursSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/kursSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/kursSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/listaEnforcePostingPolicy.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/membersSyncToSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/membersSyncToSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/membersSyncToSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/onUserRegisteredWelcome.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/triggers/onUsersActiveCreated.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/fallbackDailyWorker.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/fallbackDailyWorker.ts` -> `functions/src/service/worker/jobProcessor.ts`
- `functions/src/service/worker/jobProcessor.ts` -> `functions/src/service/runner.ts`
- `functions/src/service/worker/jobProcessor.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/onJobCreatedWorker.ts` -> `functions/src/service/worker/jobProcessor.ts`

## Python files

### `project_context.py`

- Lines: `1144`
- Size: `34173` bytes
- SHA1: `7510201f16`
- Module aliases: `project_context`
- Imports:
  - `from __future__ import annotations`
  - `import ast`
  - `import hashlib`
  - `import json`
  - `import os`
  - `import re`
  - `from dataclasses import asdict, dataclass, field`
  - `from datetime import datetime`
  - `from pathlib import Path`
  - `from typing import Any`
- Top-level symbols:
  - `BINARY_EXTENSIONS`
  - `EXCLUDED_DIRS`
  - `EXCLUDED_FILE_NAMES`
  - `IMPORT_FROM_RE`
  - `JS_CLASS_RE`
  - `JS_CONST_FUNCTION_RE`
  - `JS_FUNCTION_RE`
  - `MAX_MARKDOWN_FILES`
  - `MAX_READ_FILE_SIZE_BYTES`
  - `MAX_SYMBOLS_PER_FILE_IN_MD`
  - `MAX_TREE_LINES`
  - `MD_HEADING_RE`
  - `OUTPUT_DIR_NAME`
  - `OUTPUT_JSON_NAME`
  - `OUTPUT_MD_NAME`
  - `PYTHON_SOURCE_ROOTS`
  - `REQUIRE_RE`
  - `ROOT`
  - `TEXT_EXTENSIONS`
  - `TOML_SECTION_RE`
  - `YAML_TOP_KEY_RE`
- Classes:
  - class `FunctionInfo` lines 107-115
  - class `ClassInfo` lines 119-126
  - class `ImportInfo` lines 130-135
  - class `FileInfo` lines 139-158
- Functions:
  - `relative_path(path: Path)` (function lines 165-166) -> `str`
  - `safe_read_text(path: Path)` (function lines 169-184) -> `str | None`
  - `count_lines(text: str | None)` (function lines 187-190) -> `int | None`
  - `short_sha1(path: Path)` (function lines 193-201) -> `str | None`
  - `should_skip_file(path: Path)` (function lines 204-217) -> `bool`
  - `collect_project_files()` (function lines 220-239) -> `list[Path]`
  - `ast_unparse_safe(node: ast.AST | None)` (function lines 246-253) -> `str | None`
  - `get_doc_first_line(node: ast.AST)` (function lines 256-262) -> `str | None`
  - `format_function_signature(node: ast.FunctionDef | ast.AsyncFunctionDef)` (function lines 265-289) -> `str`
  - `parse_function(node: ast.FunctionDef | ast.AsyncFunctionDef)` (function lines 292-305) -> `FunctionInfo`
  - `parse_class(node: ast.ClassDef)` (function lines 308-329) -> `ClassInfo`
  - `parse_import(node: ast.AST)` (function lines 332-367) -> `list[ImportInfo]`
  - `extract_assignment_names(node: ast.AST)` (function lines 370-391) -> `list[str]`
  - `module_aliases_for_python_file(path: Path)` (function lines 394-414) -> `list[str]`
  - `analyze_python_file(path: Path, text: str | None)` (function lines 417-452) -> `FileInfo`
  - `analyze_script_like_file(path: Path, text: str | None)` (function lines 474-506) -> `FileInfo`
  - `analyze_markdown_file(path: Path, text: str | None)` (function lines 518-533) -> `FileInfo`
  - `analyze_config_file(path: Path, text: str | None)` (function lines 536-571) -> `FileInfo`
  - `analyze_generic_text_file(path: Path, text: str | None)` (function lines 574-583) -> `FileInfo`
  - `base_file_info(path: Path, text: str | None)` (function lines 590-599) -> `FileInfo`
  - `build_python_module_index(files: list[FileInfo])` (function lines 602-612) -> `dict[str, str]`
  - `current_package_for_file(file_info: FileInfo)` (function lines 615-626) -> `str`
  - `resolve_relative_python_import(file_info: FileInfo, import_info: ImportInfo)` (function lines 629-647) -> `str`
  - `find_module_match(module_name: str, module_index: dict[str, str])` (function lines 650-661) -> `str | None`
  - `resolve_python_dependencies(files: list[FileInfo])` (function lines 664-701) -> `None`
  - `resolve_relative_script_path(current_file: Path, import_value: str)` (function lines 704-725) -> `str | None`
  - `resolve_script_dependencies(files: list[FileInfo])` (function lines 728-746) -> `None`
  - `render_tree(paths: list[str])` (function lines 753-792) -> `list[str]`
  - `render_function(item: FunctionInfo)` (function lines 795-812) -> `str`
  - `render_class(item: ClassInfo)` (function lines 815-836) -> `list[str]`
  - `render_markdown_report(files: list[FileInfo])` (function lines 839-1048) -> `str`
  - `save_outputs(files: list[FileInfo])` (function lines 1051-1087) -> `None`
  - `analyze_file(path: Path)` (function lines 1094-1110) -> `FileInfo`
  - `main()` (function lines 1113-1140) -> `None`

### `tests/e2e/config.py`

- Lines: `210`
- Size: `10968` bytes
- SHA1: `e2fb30e83d`
- Module aliases: `tests.e2e.config`
- Imports:
  - `import os`
  - `from dataclasses import dataclass`
- Top-level symbols:
  - `ACTIVE`
  - `DEV`
  - `PROD`
  - `_ENV_NAME`
- Classes:
  - class `EnvConfig` lines 14-80
- Functions:
  - `validate_config(cfg: EnvConfig)` (function lines 193-210) -> `list[str]` — Return list of validation errors (empty = OK).

### `tests/e2e/helpers/__init__.py`

- Lines: `1`
- Size: `17` bytes
- SHA1: `6c895a3f25`
- Module aliases: `tests.e2e.helpers`

### `tests/e2e/helpers/api_helper.py`

- Lines: `383`
- Size: `16624` bytes
- SHA1: `89674d8420`
- Module aliases: `tests.e2e.helpers.api_helper`
- Imports:
  - `import logging`
  - `import requests`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Classes:
  - class `ApiHelper` lines 36-383
    - methods:
      - `__init__(self, cfg: EnvConfig)` (function lines 37-40)
      - `_headers(self, token: str)` (function lines 42-46) -> `dict`
      - `_check(self, resp: requests.Response, label: str)` (function lines 48-51) -> `dict`
      - `_soft(self, resp: requests.Response, label: str)` (function lines 53-59) -> `dict` — Like _check but does NOT raise on HTTP error. Returns raw JSON.
      - `register(self, token: str, profile: dict | None)` (function lines 65-78) -> `dict` — POST /api/register
      - `get_setup(self, token: str)` (function lines 80-86) -> `dict`
      - `get_kayaks(self, token: str)` (function lines 92-102) -> `dict` — GET /api/gear/kayaks
      - `get_my_reservations(self, token: str)` (function lines 104-111) -> `dict` — GET /api/gear/my-reservations
      - `reserve_kayaks(self, token: str, kayak_ids: list[str], start_date: str, end_date: str)` (function lines 113-125) -> `dict` — POST /api/gear/reservations/create
      - `reserve_kayaks_soft(self, token: str, kayak_ids: list[str], start_date: str, end_date: str)` (function lines 127-135) -> `dict` — Like reserve_kayaks but does NOT raise on error HTTP status.
      - `cancel_reservation(self, token: str, reservation_id: str)` (function lines 137-145) -> `dict` — POST /api/gear/reservations/cancel — body: {reservationId}
      - `cancel_reservation_soft(self, token: str, reservation_id: str)` (function lines 147-154) -> `dict`
      - `get_godzinki(self, token: str, view: str)` (function lines 160-172) -> `dict` — GET /api/godzinki
      - `submit_godzinki(self, token: str, amount: float, granted_at: str, reason: str)` (function lines 174-186) -> `dict` — POST /api/godzinki/submit
      - `submit_godzinki_soft(self, token: str, amount: float, granted_at: str, reason: str)` (function lines 188-196) -> `dict` — Like submit_godzinki but does NOT raise on HTTP error.
      - `reserve_bundle(self, token: str, items: list[dict], start_date: str, end_date: str, starter_category: str, starter_item_id: str)` (function lines 202-221) -> `dict` — POST /api/gear/reservations/create-bundle
      - `reserve_bundle_soft(self, token: str, items: list[dict], start_date: str, end_date: str, starter_category: str, starter_item_id: str)` (function lines 223-238) -> `dict` — Like reserve_bundle but does NOT raise on HTTP error.
      - `update_reservation(self, token: str, reservation_id: str, start_date: str, end_date: str)` (function lines 240-252) -> `dict` — POST /api/gear/reservations/update
      - `update_reservation_soft(self, token: str, reservation_id: str, start_date: str, end_date: str)` (function lines 254-262) -> `dict` — Like update_reservation but does NOT raise on HTTP error.
      - `km_add_log(self, token: str, body: dict)` (function lines 268-276) -> `dict` — POST /api/km/log/add — raises on HTTP error.
      - `km_add_log_soft(self, token: str, body: dict)` (function lines 278-286) -> `dict` — POST /api/km/log/add — does NOT raise on HTTP error.
      - `km_my_logs(self, token: str, limit: int, after_date: str)` (function lines 288-299) -> `dict` — GET /api/km/logs — returns {ok, logs, count}.
      - `km_my_stats(self, token: str)` (function lines 301-308) -> `dict` — GET /api/km/stats — returns {ok, stats}.
      - `km_rankings(self, token: str, type: str, period: str, limit: int, year: str)` (function lines 310-322) -> `dict` — GET /api/km/rankings — returns {ok, type, period, entries, count}.
      - `km_places(self, token: str, q: str, limit: int)` (function lines 324-332) -> `dict` — GET /api/km/places — returns {ok, places, count}.
      - `km_map_data(self, token: str)` (function lines 334-341) -> `dict` — GET /api/km/map-data — returns {ok, locations, locationCount, updatedAt}.
      - `km_event_stats(self, token: str, event_id: str)` (function lines 343-351) -> `dict` — GET /api/km/event-stats — raises on HTTP error.
      - `km_event_stats_soft(self, token: str, event_id: str)` (function lines 353-362) -> `dict` — GET /api/km/event-stats — does NOT raise on HTTP error.
      - `km_admin_merge_places(self, token: str, keep_place_id: str, merge_ids: list[str])` (function lines 364-372) -> `dict` — POST /api/admin/km/places/merge — raises on HTTP error.
      - `km_admin_merge_places_soft(self, token: str, keep_place_id: str, merge_ids: list | None)` (function lines 374-383) -> `dict` — POST /api/admin/km/places/merge — does NOT raise on HTTP error.

### `tests/e2e/helpers/firebase_auth.py`

- Lines: `77`
- Size: `2992` bytes
- SHA1: `02a4add239`
- Module aliases: `tests.e2e.helpers.firebase_auth`
- Imports:
  - `import time`
  - `import requests`
  - `from config import EnvConfig`
- Top-level symbols:
  - `REFRESH_URL`
  - `SIGN_IN_URL`
- Classes:
  - class `FirebaseAuthHelper` lines 13-77
    - methods:
      - `__init__(self, cfg: EnvConfig)` (function lines 14-16)
      - `sign_in(self, email: str, password: str)` (function lines 18-37) -> `str` — Sign in with email/password. Returns ID token.
      - `get_token(self, email: str, password: str)` (function lines 39-51) -> `str` — Return a valid (non-expired) ID token, refreshing if needed.
      - `_refresh(self, email: str, refresh_token: str)` (function lines 53-71) -> `str`
      - `test_user_token(self)` (function lines 73-74) -> `str`
      - `admin_user_token(self)` (function lines 76-77) -> `str`

### `tests/e2e/helpers/firestore_helper.py`

- Lines: `212`
- Size: `8748` bytes
- SHA1: `a7669a3ce6`
- Module aliases: `tests.e2e.helpers.firestore_helper`
- Imports:
  - `import time`
  - `import logging`
  - `from datetime import datetime, timezone, timedelta`
  - `from config import EnvConfig`
  - `import firebase_admin`
  - `from firebase_admin import credentials, firestore`
- Top-level symbols:
  - `log`
- Classes:
  - class `FirestoreHelper` lines 16-212
    - methods:
      - `__init__(self, cfg: EnvConfig, app_name: str | None)` (function lines 17-29)
      - `get_user(self, uid: str)` (function lines 35-37) -> `dict | None`
      - `get_user_by_email(self, email: str)` (function lines 39-49) -> `tuple[str, dict] | None`
      - `wait_for_user(self, email: str, timeout: int)` (function lines 51-58) -> `tuple[str, dict]`
      - `get_user_role_and_status(self, uid: str)` (function lines 60-64) -> `tuple[str, str]`
      - `enqueue_task(self, task_id: str, payload: dict)` (function lines 70-83) -> `str`
      - `poll_job(self, job_id: str, timeout: int | None, interval: int | None)` (function lines 85-98) -> `dict`
      - `run_task_and_wait(self, task_id: str, payload: dict, timeout: int | None)` (function lines 100-107) -> `dict`
      - `grant_godzinki(self, uid: str, hours: float, note: str)` (function lines 113-147) -> `str` — Write an approved 'earn' record directly to godzinki_ledger.
      - `get_godzinki_balance(self, uid: str)` (function lines 149-184) -> `float` — Compute balance from godzinki_ledger — mirrors computeBalance() in godzinki_service.ts:
      - `get_setup_vars_godzinki(self)` (function lines 190-192) -> `dict`
      - `get_setup_vars_gear(self)` (function lines 194-196) -> `dict`
      - `get_user_reservations(self, uid: str)` (function lines 202-208) -> `list[dict]`
      - `get_reservation(self, reservation_id: str)` (function lines 210-212) -> `dict | None`

### `tests/e2e/helpers/gear_discovery.py`

- Lines: `141`
- Size: `5143` bytes
- SHA1: `bd5edf75cb`
- Module aliases: `tests.e2e.helpers.gear_discovery`
- Imports:
  - `import logging`
  - `import requests`
  - `import unittest`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Classes:
  - class `GearDiscovery` lines 24-140 — Lazy-loaded cache sprzętu.
    - methods:
      - `load(cls, token: str, cfg: 'EnvConfig | None')` (function lines 35-70) — Ładuje katalog sprzętu — wywołanie jest idempotentne.
      - `_fetch_kayaks(cls, token: str, cfg)` (function lines 73-94) -> `list`
      - `_fetch_items(cls, token: str, category: str)` (function lines 97-112) -> `list`
      - `require_kayaks(cls, count: int)` (function lines 115-121) -> `list`
      - `require_kayak(cls)` (function lines 124-125) -> `str`
      - `require_accessory(cls, category: str)` (function lines 128-140) -> `str`

### `tests/e2e/helpers/playwright_helper.py`

- Lines: `186`
- Size: `7747` bytes
- SHA1: `4f0d136c31`
- Module aliases: `tests.e2e.helpers.playwright_helper`
- Imports:
  - `import logging`
  - `import json`
  - `from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Classes:
  - class `PlaywrightHelper` lines 14-186
    - methods:
      - `__init__(self, cfg: EnvConfig, headless: bool)` (function lines 15-21)
      - `start(self)` (function lines 23-31)
      - `stop(self)` (function lines 33-40)
      - `__enter__(self)` (function lines 42-44)
      - `__exit__(self, *args)` (function lines 46-47)
      - `inject_auth_token(self, id_token: str)` (function lines 53-111) — Navigate to the app and inject Firebase auth credentials.
      - `sign_in_via_browser(self, email: str, password: str)` (function lines 113-161) — Alternative: sign in via email/password directly in the browser
      - `navigate_to(self, hash_path: str)` (function lines 167-172) — Navigate to app URL with optional hash path.
      - `wait_for_module(self, module_id: str, timeout_ms: int)` (function lines 174-179) — Wait for a module section to appear in the app shell.
      - `get_current_url(self)` (function lines 181-182) -> `str`
      - `take_screenshot(self, path: str)` (function lines 184-186)

### `tests/e2e/helpers/reporter.py`

- Lines: `123`
- Size: `4607` bytes
- SHA1: `56d0f954cd`
- Module aliases: `tests.e2e.helpers.reporter`
- Imports:
  - `import json`
  - `import logging`
  - `import os`
  - `import time`
  - `from dataclasses import dataclass, field, asdict`
  - `from datetime import datetime, timezone`
  - `from typing import Optional`
- Top-level symbols:
  - `log`
- Classes:
  - class `PhaseResult` lines 16-23
  - class `TestReporter` lines 26-123
    - methods:
      - `__init__(self, env_name: str, output_dir: str)` (function lines 27-32)
      - `record(self, result: PhaseResult)` (function lines 34-41)
      - `save(self)` (function lines 43-74)
      - `print_summary(self)` (function lines 76-97)
      - `_render_markdown(summary: dict)` (function lines 100-123) -> `str`

### `tests/e2e/helpers/sheets_helper.py`

- Lines: `208`
- Size: `8493` bytes
- SHA1: `a9449f8b52`
- Module aliases: `tests.e2e.helpers.sheets_helper`
- Imports:
  - `import json`
  - `import logging`
  - `import os`
  - `import google.auth`
  - `import google.auth.transport.requests`
  - `import gspread`
  - `from google.oauth2.credentials import Credentials`
  - `from google_auth_oauthlib.flow import InstalledAppFlow`
  - `from config import EnvConfig`
- Top-level symbols:
  - `DEFAULT_OAUTH_CLIENT_PATH`
  - `DEFAULT_TOKEN_PATH`
  - `SCOPES`
  - `log`
- Classes:
  - class `SheetsHelper` lines 104-208
    - methods:
      - `__init__(self, cfg: EnvConfig, oauth_client_path: str, token_path: str)` (function lines 105-114)
      - `_get_worksheet(self, tab_name: str | None)` (function lines 116-118) -> `gspread.Worksheet`
      - `get_all_records(self, tab_name: str | None)` (function lines 124-126) -> `list[dict]`
      - `find_row_by_email(self, email: str, tab_name: str | None)` (function lines 128-135) -> `dict | None` — Find the first row where 'e-mail' column matches (case-insensitive).
      - `get_member_row(self, email: str)` (function lines 137-138) -> `dict | None`
      - `update_member_role_and_status(self, email: str, new_role_label: str, new_status_label: str, tab_name: str | None)` (function lines 144-178) -> `bool` — Update 'Rola' and 'Status' columns for the row matching email.
      - `_col_index(headers: list[str], name: str)` (function lines 181-186) -> `int | None`
      - `assert_member_in_sheet(self, email: str)` (function lines 192-199) -> `dict`
      - `assert_member_role(self, email: str, expected_role_label: str)` (function lines 201-208) -> `dict`
- Functions:
  - `_get_sheets_creds(oauth_client_path: str, token_path: str)` (function lines 47-95) -> `Credentials` — Zwraca credentials do Google Sheets przez user OAuth flow.
  - `_save_token(creds: Credentials, token_path: str)` (function lines 98-101)

### `tests/e2e/phases/__init__.py`

- Lines: `1`
- Size: `16` bytes
- SHA1: `8bf480fb02`
- Module aliases: `tests.e2e.phases`

### `tests/e2e/phases/phase_0_precheck.py`

- Lines: `65`
- Size: `2163` bytes
- SHA1: `c84361ef4f`
- Module aliases: `tests.e2e.phases.phase_0_precheck`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig, validate_config`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 16-65) -> `PhaseResult`

### `tests/e2e/phases/phase_1_registration.py`

- Lines: `153`
- Size: `6369` bytes
- SHA1: `a5a3cfa4de`
- Module aliases: `tests.e2e.phases.phase_1_registration`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 25-153) -> `PhaseResult`

### `tests/e2e/phases/phase_2_role_change_via_sheet.py`

- Lines: `113`
- Size: `4575` bytes
- SHA1: `cf830537c0`
- Module aliases: `tests.e2e.phases.phase_2_role_change_via_sheet`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `EXPECTED_ROLE_KEY`
  - `EXPECTED_STATUS_KEY`
  - `ROLE_CHANGE_SEQUENCE`
  - `TARGET_STATUS_LABEL`
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 28-113) -> `PhaseResult`

### `tests/e2e/phases/phase_3_godzinki_grant.py`

- Lines: `99`
- Size: `3788` bytes
- SHA1: `bb672cc820`
- Module aliases: `tests.e2e.phases.phase_3_godzinki_grant`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `GRANT_HOURS`
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 20-99) -> `PhaseResult`

### `tests/e2e/phases/phase_4_first_reservation.py`

- Lines: `175`
- Size: `7206` bytes
- SHA1: `63622e5480`
- Module aliases: `tests.e2e.phases.phase_4_first_reservation`
- Imports:
  - `import time`
  - `import logging`
  - `from datetime import date, timedelta`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `EXPECTED_COST_HOURS`
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 30-175) -> `PhaseResult`

### `tests/e2e/phases/phase_5_limit_errors.py`

- Lines: `192`
- Size: `8935` bytes
- SHA1: `122782882a`
- Module aliases: `tests.e2e.phases.phase_5_limit_errors`
- Imports:
  - `import time`
  - `import logging`
  - `from datetime import date, timedelta`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 22-192) -> `PhaseResult`

### `tests/e2e/phases/phase_6_cancel_reservation.py`

- Lines: `159`
- Size: `6958` bytes
- SHA1: `0d80ef22de`
- Module aliases: `tests.e2e.phases.phase_6_cancel_reservation`
- Imports:
  - `import time`
  - `import logging`
  - `from datetime import date, timedelta`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 24-159) -> `PhaseResult`

### `tests/e2e/phases/phase_7_balance_drain.py`

- Lines: `158`
- Size: `7000` bytes
- SHA1: `023e738c45`
- Module aliases: `tests.e2e.phases.phase_7_balance_drain`
- Imports:
  - `import time`
  - `import math`
  - `import logging`
  - `from datetime import date, timedelta`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 21-158) -> `PhaseResult`

### `tests/e2e/phases/phase_8_sheet_sync_after_role.py`

- Lines: `106`
- Size: `3740` bytes
- SHA1: `c82c9b286c`
- Module aliases: `tests.e2e.phases.phase_8_sheet_sync_after_role`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `EXPECTED_ROLE_LABEL`
  - `EXPECTED_STATUS_LABEL`
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 18-106) -> `PhaseResult`

### `tests/e2e/phases/phase_9_cleanup.py`

- Lines: `105`
- Size: `3855` bytes
- SHA1: `3802abc215`
- Module aliases: `tests.e2e.phases.phase_9_cleanup`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 13-105) -> `PhaseResult`

### `tests/e2e/phases/phase_A_suspended_user.py`

- Lines: `122`
- Size: `4532` bytes
- SHA1: `87e33fe0cd`
- Module aliases: `tests.e2e.phases.phase_A_suspended_user`
- Imports:
  - `import time`
  - `import logging`
  - `import requests`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `ENDPOINTS_TO_TEST`
  - `log`
- Functions:
  - `_check_user_blocked(base_url: str, token: str, label: str)` (function lines 30-59) -> `list[str]` — Sprawdza czy użytkownik z danym tokenem dostaje 403 na kluczowych endpointach.
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 62-122) -> `PhaseResult`

### `tests/e2e/phases/phase_B_module_visibility.py`

- Lines: `109`
- Size: `4406` bytes
- SHA1: `b80c86bd6a`
- Module aliases: `tests.e2e.phases.phase_B_module_visibility`
- Imports:
  - `import time`
  - `import logging`
  - `from helpers.reporter import PhaseResult`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Functions:
  - `run(cfg: EnvConfig, ctx: dict)` (function lines 23-109) -> `PhaseResult`

### `tests/e2e/run_e2e.py`

- Lines: `192`
- Size: `6535` bytes
- SHA1: `636973f46a`
- Module aliases: `tests.e2e.run_e2e`
- Imports:
  - `import sys`
  - `import os`
  - `import logging`
  - `import time`
  - `from config import ACTIVE, validate_config`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
  - `from helpers.sheets_helper import SheetsHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.reporter import TestReporter, PhaseResult`
  - `from phases import phase_0_precheck, phase_1_registration, phase_A_suspended_user, phase_B_module_visibility, phase_2_role_change_via_sheet, phase_3_godzinki_grant, phase_4_first_reservation, phase_5_limit_errors, phase_6_cancel_reservation, phase_7_balance_drain, phase_8_sheet_sync_after_role, phase_9_cleanup`
- Top-level symbols:
  - `PHASES`
  - `log`
- Functions:
  - `main()` (function lines 105-188)

### `tests/e2e/seed_test_accounts.py`

- Lines: `316`
- Size: `10620` bytes
- SHA1: `bc975e4250`
- Module aliases: `tests.e2e.seed_test_accounts`
- Imports:
  - `import os`
  - `import sys`
  - `from datetime import datetime, timezone`
  - `import firebase_admin`
  - `from firebase_admin import credentials, firestore, auth`
  - `from config import ACTIVE`
- Top-level symbols:
  - `ACCOUNTS`
  - `GODZINKI_POOLS`
  - `_APP_NAME`
  - `_HERE`
  - `_SEED_DATE`
  - `db`
- Functions:
  - `_get_password(account: dict)` (function lines 176-183) -> `str`
  - `_seed_auth(account: dict)` (function lines 186-202) -> `str` — Tworzy lub pobiera konto w Firebase Auth. Zwraca UID.
  - `_seed_firestore(account: dict, uid: str)` (function lines 205-241) — Tworzy lub aktualizuje dokument users_active/{uid}.
  - `_seed_godzinki(uid: str)` (function lines 244-284) — Tworzy lub resetuje 3 pule FIFO w godzinki_ledger dla test.czlonek.
  - `main()` (function lines 291-311)

### `tests/e2e/test_gear_private_storage.py`

- Lines: `525`
- Size: `23027` bytes
- SHA1: `2b1e969131`
- Module aliases: `tests.e2e.test_gear_private_storage`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import logging`
  - `from datetime import datetime, timezone`
  - `from google.cloud import firestore`
  - `from config import ACTIVE`
  - `from helpers.firestore_helper import FirestoreHelper`
  - `from firebase_admin import firestore`
- Top-level symbols:
  - `TEST_MONTH`
  - `_HERE`
  - `log`
- Classes:
  - class `TestGearPrivateStorage(unittest.TestCase)` lines 67-520 — Testy naliczania miesięcznych opłat za prywatne kajaki.
    - methods:
      - `setUp(self)` (function lines 79-98)
      - `tearDown(self)` (function lines 100-153)
      - `_create_kayak(self, label: str, owner_contact: str, private_since: str)` (function lines 159-175) -> `str` — Tworzy tymczasowy prywatny kajak. Zwraca docId.
      - `_block_real_kayaks(self, month: str)` (function lines 177-200) — Blokuje prawdziwe prywatne kajaki na podany miesiąc testowy, żeby task je pominął.
      - `_run_task(self, dry: bool)` (function lines 202-209) -> `dict`
      - `_get_charge(self, kayak_id: str)` (function lines 211-214) -> `dict | None`
      - `_find_spend_for_kayak(self, uid: str, kayak_number: str)` (function lines 216-229) -> `tuple | None` — Szuka spend rekordu w godzinki_ledger powiązanego z kajak_number i TEST_MONTH.
      - `_ensure_enough_balance(self, uid: str)` (function lines 231-262) -> `str | None` — Jeśli balance + neg_limit < costHours, dodaje tymczasowy grant buforowy ze starą datą
      - `test_PS01_empty_owner_contact_creates_failed_record(self)` (function lines 268-279) — Kajak bez ownerContact → gear_storage_charges status='failed'
      - `test_PS01b_invalid_email_no_at_creates_failed_record(self)` (function lines 281-291) — Kajak z emailem bez @ → gear_storage_charges status='failed'
      - `test_PS01c_second_run_same_month_does_not_overwrite_failed(self)` (function lines 293-312) — Idempotencja dla 'failed': drugi run w tym samym miesiącu → rekord nie jest nadpisywany
      - `test_PS02_board_exempt_creates_exempt_record_and_zero_spend(self)` (function lines 318-367) — Zarząd z boardDoesNotPay=true → status='exempt', hoursCharged=0, zero-spend w godzinki_ledger
      - `test_PS02b_board_exempt_idempotency(self)` (function lines 369-417) — Drugi run dla zarządu — kajak skipped (nie tworzy drugiego exempt rekordu)
      - `test_PS03_member_charge_creates_charged_record_and_deducts_balance(self)` (function lines 423-471) — Normalny członek → status='charged', spend w godzinki_ledger, bilans maleje o costHours
      - `test_PS03b_charged_record_idempotency(self)` (function lines 473-520) — Drugi run dla naładowanego kajaka → skipped, bilans nie zmienia się drugi raz
- Functions:
  - `_skip_if_missing(*attrs)` (function lines 60-64)

### `tests/e2e/test_gear_reservations_api.py`

- Lines: `884`
- Size: `41010` bytes
- SHA1: `4b9a98f26d`
- Module aliases: `tests.e2e.test_gear_reservations_api`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import logging`
  - `from datetime import datetime, timezone, timedelta`
  - `import requests`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
  - `from helpers.gear_discovery import GearDiscovery`
- Top-level symbols:
  - `BASE`
  - `_HERE`
  - `_api`
  - `_auth`
  - `log`
- Classes:
  - class `TestAuthorization(unittest.TestCase)` lines 133-221 — Testy autoryzacji — token, role, status.
    - methods:
      - `test_a01_no_token_returns_401(self)` (function lines 136-145) — A01: Brak tokena → 401.
      - `test_a02_invalid_token_returns_401(self)` (function lines 147-156) — A02: Nieprawidłowy token → 401.
      - `test_a03_sympatyk_cannot_reserve(self)` (function lines 158-168) — A03: Sympatyk próbuje zarezerwować kajak → 403 role not allowed.
      - `test_a04_suspended_user_cannot_reserve(self)` (function lines 170-183) — A04: Zawieszony użytkownik → 403 Access blocked.
      - `test_a05_cancel_other_user_reservation_forbidden(self)` (function lines 185-209) — A05: User nie może anulować rezerwacji innego usera → 403 Not yours.
      - `test_a06_admin_pending_requires_admin_role(self)` (function lines 211-221) — A06: GET /api/admin/pending przez zwykłego membera → 403.
  - class `TestSetupAsSourceOfTruth(unittest.TestCase)` lines 228-382 — Weryfikuje że koszt i limity wynikają z setup/vars_gear.
    - methods:
      - `setUpClass(cls)` (function lines 232-254) — Odczytaj setup z Firestore raz dla całej klasy.
      - `setUp(self)` (function lines 256-257)
      - `tearDown(self)` (function lines 259-261)
      - `test_b01_cost_matches_setup(self)` (function lines 263-280) — B01: Koszt rezerwacji = days × kajaki × godzinki_za_kajak z setup.
      - `test_b02_board_cost_zero_if_board_does_not_pay(self)` (function lines 282-298) — B02: Zarząd ma koszt=0 jeśli boardDoesNotPay=true w setup.
      - `test_b03_kr_cost_zero_if_board_does_not_pay(self)` (function lines 300-316) — B03: KR ma koszt=0 jeśli boardDoesNotPay=true (kr traktowany jak zarząd).
      - `test_b04_member_max_time_enforced(self)` (function lines 318-332) — B04: Rezerwacja powyżej max_time dla członka → 400.
      - `test_b05_candidate_max_items_enforced(self)` (function lines 334-346) — B05: Kandydat próbuje 2 kajaki → 400 max_items_exceeded.
      - `test_b06_member_max_items_enforced(self)` (function lines 348-368) — B06: Członek próbuje 4 kajaki → 400 max_items_exceeded.
      - `test_b07_candidate_max_time_enforced(self)` (function lines 370-382) — B07: Kandydat próbuje rezerwację na >1 tydzień → 400.
  - class `TestConflictAndOffset(unittest.TestCase)` lines 389-507 — Weryfikuje blokady konfliktowe i działanie offsetu.
    - methods:
      - `setUp(self)` (function lines 392-393)
      - `tearDown(self)` (function lines 395-397)
      - `test_c01_same_kayak_overlapping_dates_blocked(self)` (function lines 399-423) — C01: Dwie rezerwacje tego samego kajaka w nakładającym się terminie → konflikt.
      - `test_c02_offset_blocks_adjacent_day(self)` (function lines 425-452) — C02: Offset=1: rezerwacja A [+3,+5], B próbuje [+5,+7] → konflikt (blockEnd A = +6, blockStart B = +4).
      - `test_c03_after_offset_no_conflict(self)` (function lines 454-480) — C03: Rezerwacja A [+1, +3], B [+6, +6] → brak konfliktu (blockEnd A = +4, blockStart B = +5).
      - `test_c04_cost_does_not_include_offset_days(self)` (function lines 482-507) — C04: Koszt nie zawiera dni offsetu — liczymy tylko dni od start do end.
  - class `TestHoursBalanceFlow(unittest.TestCase)` lines 514-669 — Weryfikuje przepływ godzinek: dedukcja po rezerwacji, zwrot po anulacji.
    - methods:
      - `setUp(self)` (function lines 517-523)
      - `tearDown(self)` (function lines 525-527)
      - `_get_fs_balance(self, email: str)` (function lines 529-536) -> `float | None`
      - `test_d01_balance_decreases_after_reservation(self)` (function lines 538-564) — D01: Bilans spada po zarezerwowaniu kajaka (koszt > 0).
      - `test_d02_balance_restored_after_cancel(self)` (function lines 566-596) — D02: Bilans wraca do stanu sprzed rezerwacji po anulacji.
      - `test_d03_cancel_after_block_start_blocked(self)` (function lines 598-623) — D03: Nie można anulować gdy today >= blockStartIso.
      - `test_d04_api_balance_matches_firestore(self)` (function lines 625-642) — D04: Bilans z API = bilans obliczony z godzinki_ledger w Firestore.
      - `test_d05_board_balance_unchanged_after_reservation(self)` (function lines 644-669) — D05: Saldo zarządu NIE zmienia się jeśli boardDoesNotPay=true.
  - class `TestReservationStates(unittest.TestCase)` lines 676-759 — Testy anulacji i stanów rezerwacji.
    - methods:
      - `setUp(self)` (function lines 679-680)
      - `tearDown(self)` (function lines 682-684)
      - `test_e01_cancel_nonexistent_reservation(self)` (function lines 686-694) — E01: Anulacja nieistniejącej rezerwacji → not_found.
      - `test_e02_cancel_already_cancelled_reservation(self)` (function lines 696-718) — E02: Anulacja już anulowanej rezerwacji → invalid_state.
      - `test_e03_reservation_appears_in_my_reservations(self)` (function lines 720-738) — E03: Nowa rezerwacja pojawia się w my-reservations.
      - `test_e04_cancelled_reservation_status_in_my_reservations(self)` (function lines 740-759) — E04: Anulowana rezerwacja ma status=cancelled.
  - class `TestAccessoriesPricingGap(unittest.TestCase)` lines 766-836 — Dokumentuje lukę K1: akcesoria (wiosło, kask, fartuch) są bezpłatne.
    - methods:
      - `setUp(self)` (function lines 772-773)
      - `tearDown(self)` (function lines 775-777)
      - `test_f01_accessories_in_bundle_have_zero_cost(self)` (function lines 779-836) — F01 (LUKA K1): Bundle z kajakiem + wiosłem: koszt = tylko kajak × dni.
  - class `TestPastDateValidation(unittest.TestCase)` lines 843-879 — Dokumentuje lukę K5: brak walidacji startDate >= today.
    - methods:
      - `setUp(self)` (function lines 846-847)
      - `tearDown(self)` (function lines 849-851)
      - `test_g01_reservation_with_past_start_date(self)` (function lines 853-879) — G01 (LUKA K5): Rezerwacja z datą startową w przeszłości.
- Functions:
  - `_future_dates(days_from_now_start: int, duration_days: int)` (function lines 67-72) -> `tuple[str, str]` — Zwraca (startDate, endDate) w ISO format, daleko w przyszłości.
  - `_token(email: str, password: str)` (function lines 75-76) -> `str`
  - `_get_any_token()` (function lines 79-94) -> `str | None` — Zwraca token dowolnego skonfigurowanego konta (do ładowania katalogu sprzętu).
  - `_ensure_gear_loaded()` (function lines 97-101)
  - `_require_kayaks(count: int)` (function lines 104-107) -> `list[str]` — Zwraca listę count kajaków — z config lub auto-discovery.
  - `_require_kayak(attr: str)` (function lines 110-114) -> `str` — Zwraca jeden kajak. Przy jawnych IDs w .env.test zwraca właściwy wg pozycji.
  - `_try_cancel(token: str, reservation_id: str)` (function lines 121-126) — Próba anulacji rezerwacji — ignoruje błędy (cleanup).

### `tests/e2e/test_godzinki_api.py`

- Lines: `627`
- Size: `25879` bytes
- SHA1: `4636f1aab0`
- Module aliases: `tests.e2e.test_godzinki_api`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import logging`
  - `from datetime import datetime, timezone, timedelta`
  - `import requests`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
  - `from helpers.gear_discovery import GearDiscovery`
- Top-level symbols:
  - `BASE`
  - `_FUTURE_DATE`
  - `_HERE`
  - `_PAST_DATE`
  - `_api`
  - `_auth`
  - `log`
- Classes:
  - class `TestGodzinkiAuthorization(unittest.TestCase)` lines 79-112 — G01 — brak tokena → 401
    - methods:
      - `test_G01_no_token_returns_401(self)` (function lines 85-87)
      - `test_G01b_submit_no_token_returns_401(self)` (function lines 89-95)
      - `test_G02_bad_token_returns_401(self)` (function lines 97-103)
      - `test_G02b_submit_bad_token_returns_401(self)` (function lines 105-112)
  - class `TestGodzinkiSuspendedUser(unittest.TestCase)` lines 119-154 — G03 — zawieszony użytkownik nie może zgłaszać godzinek (POST /submit → 403)
    - methods:
      - `setUp(self)` (function lines 125-129)
      - `test_G03_suspended_cannot_submit_godzinki(self)` (function lines 131-141) — POST /api/godzinki/submit z kontem zawieszonym → 403
      - `test_G03b_suspended_can_read_godzinki(self)` (function lines 143-154) — GET /api/godzinki NIE blokuje na status — zwraca bilans (403 nie oczekiwane)
  - class `TestGodzinkiBalance(unittest.TestCase)` lines 161-258 — G04 — GET /api/godzinki zwraca bilans zgodny z obliczeniem z godzinki_ledger
    - methods:
      - `setUp(self)` (function lines 167-177)
      - `tearDown(self)` (function lines 179-188)
      - `test_G04_api_balance_matches_firestore_balance(self)` (function lines 190-201) — GET /api/godzinki balance == computeBalance z godzinki_ledger
      - `test_G04b_full_view_returns_history(self)` (function lines 203-210) — GET /api/godzinki?view=full zwraca historię i negativeBalanceLimit
      - `test_G04c_home_view_returns_recent_earnings(self)` (function lines 212-218) — GET /api/godzinki?view=home zwraca recentEarnings (max 5)
      - `test_G05_submit_pending_does_not_change_balance(self)` (function lines 220-258) — POST /api/godzinki/submit tworzy rekord approved=false.
  - class `TestGodzinkiSubmitValidation(unittest.TestCase)` lines 265-348 — G06 — amount = 0 lub ujemny → 400 validation_failed
    - methods:
      - `setUp(self)` (function lines 274-278)
      - `_submit(self, body: dict)` (function lines 280-286) -> `requests.Response`
      - `test_G06_zero_amount_rejected(self)` (function lines 288-293)
      - `test_G06b_negative_amount_rejected(self)` (function lines 295-300)
      - `test_G07_missing_amount_rejected(self)` (function lines 302-304)
      - `test_G08_future_date_rejected(self)` (function lines 306-313)
      - `test_G09_missing_grantedAt_rejected(self)` (function lines 315-320)
      - `test_G09b_invalid_date_format_rejected(self)` (function lines 322-327)
      - `test_G10_missing_reason_rejected(self)` (function lines 329-334)
      - `test_G10b_empty_reason_rejected(self)` (function lines 336-341)
      - `test_G10c_very_long_reason_rejected(self)` (function lines 343-348)
  - class `TestGodzinkiApprovalFlow(unittest.TestCase)` lines 355-436 — G11 — Bilans wzrasta po zatwierdzeniu zgłoszenia godzinek.
    - methods:
      - `setUp(self)` (function lines 372-381)
      - `tearDown(self)` (function lines 383-389)
      - `test_G11_approved_earn_increases_balance(self)` (function lines 391-410) — Wstawienie approved=true earn podnosi bilans w GET /api/godzinki
      - `test_G11b_balance_restored_after_earn_removal(self)` (function lines 412-436) — Po usunięciu approved earn bilans wraca do wartości sprzed grantu.
  - class `TestGodzinkiBalanceAfterReservation(unittest.TestCase)` lines 443-531 — G12 — Bilans godzinkowy zmienia się po rezerwacji i wraca po anulowaniu.
    - methods:
      - `setUp(self)` (function lines 452-462)
      - `tearDown(self)` (function lines 464-474)
      - `test_G12_balance_decreases_after_reservation_then_restores_on_cancel(self)` (function lines 476-531) — 1. Zarejestruj bilans przed
  - class `TestGodzinkiBoardDoesNotPay(unittest.TestCase)` lines 538-593 — G13 — Zarząd z boardDoesNotPay=true: bilans nie zmienia się po rezerwacji.
    - methods:
      - `setUp(self)` (function lines 545-551)
      - `tearDown(self)` (function lines 553-558)
      - `test_G13_board_balance_unchanged_after_reservation(self)` (function lines 560-593) — Zarząd nie płaci → bilans godzinkowy nie zmienia się po rezerwacji kajaka
  - class `TestGodzinkiManualApprovalDocumented(unittest.TestCase)` lines 600-622 — Scenariusz wymagający ręcznej interwencji — udokumentowany, nie automatyczny.
    - methods:
      - `test_full_approval_flow_manual(self)` (function lines 621-622)
- Functions:
  - `_skip_if_missing(*attrs)` (function lines 67-72) — Return skip reason if any of the config fields are empty.

### `tests/e2e/test_km_api.py`

- Lines: `1210`
- Size: `52245` bytes
- SHA1: `c8a53e6ab1`
- Module aliases: `tests.e2e.test_km_api`
- Imports:
  - `import os`
  - `import sys`
  - `import uuid`
  - `import unittest`
  - `import logging`
  - `import requests`
  - `from datetime import datetime, timezone, timedelta`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
- Top-level symbols:
  - `BASE`
  - `_HERE`
  - `_TEST_TAG`
  - `_TODAY`
  - `_TOMORROW`
  - `_YEAR_2025`
  - `_YESTERDAY`
  - `_api`
  - `_auth`
  - `_fs`
  - `log`
- Classes:
  - class `TestKmSecurity(unittest.TestCase)` lines 120-167 — SEC-01..07 — endpointy km wymagają prawidłowego tokenu Bearer.
    - methods:
      - `_assert_401(self, resp: requests.Response, label: str)` (function lines 125-126)
      - `test_SEC01_add_log_no_token_401(self)` (function lines 128-130)
      - `test_SEC02_rankings_no_token_401(self)` (function lines 132-134)
      - `test_SEC03_my_logs_no_token_401(self)` (function lines 136-138)
      - `test_SEC04_my_stats_no_token_401(self)` (function lines 140-142)
      - `test_SEC05_places_no_token_401(self)` (function lines 144-146)
      - `test_SEC06_event_stats_no_token_401(self)` (function lines 148-150)
      - `test_SEC07_add_log_bad_token_401(self)` (function lines 152-159)
      - `test_SEC07b_rankings_bad_token_401(self)` (function lines 161-167)
  - class `TestKmAddLogHappyPath(unittest.TestCase)` lines 174-242 — FA-01..06 — każdy z 6 typów akwenu daje HTTP 200 z {ok: true, logId}.
    - methods:
      - `setUpClass(cls)` (function lines 180-193)
      - `tearDownClass(cls)` (function lines 196-198)
      - `_add_and_assert(self, body: dict, label: str)` (function lines 200-206) -> `str`
      - `test_FA01_mountains(self)` (function lines 208-213)
      - `test_FA02_lowlands(self)` (function lines 215-220)
      - `test_FA03_sea(self)` (function lines 222-224)
      - `test_FA04_track(self)` (function lines 226-228)
      - `test_FA05_pool(self)` (function lines 230-232)
      - `test_FA06_playspot_km_zero(self)` (function lines 234-237) — km=0 jest dozwolone dla playspot (KROK 0).
      - `test_FA14_km_zero_mountains(self)` (function lines 239-242) — km=0 jest dozwolone dla każdego typu akwenu (playspot to minimum sens, ale backend go akceptuje).
  - class `TestKmAddLogDateValidation(unittest.TestCase)` lines 249-279 — FA-07..09 — walidacja pola date.
    - methods:
      - `setUpClass(cls)` (function lines 253-257)
      - `_assert_validation_error(self, body: dict, label: str)` (function lines 259-262)
      - `test_FA07_missing_date(self)` (function lines 264-267)
      - `test_FA08_invalid_date_format(self)` (function lines 269-271)
      - `test_FA09_future_date(self)` (function lines 273-275)
      - `test_FA08b_non_date_string(self)` (function lines 277-279)
  - class `TestKmAddLogFieldValidation(unittest.TestCase)` lines 286-311 — FA-10..11, FA-28 — walidacja waterType i placeName.
    - methods:
      - `setUpClass(cls)` (function lines 290-294)
      - `_assert_validation_error(self, body: dict, label: str)` (function lines 296-299)
      - `test_FA10_invalid_water_type(self)` (function lines 301-303)
      - `test_FA11_empty_water_type(self)` (function lines 305-307)
      - `test_FA28_empty_place_name(self)` (function lines 309-311)
  - class `TestKmAddLogKmValidation(unittest.TestCase)` lines 318-339 — FA-12..13 — walidacja pola km.
    - methods:
      - `setUpClass(cls)` (function lines 322-326)
      - `_assert_validation_error(self, body: dict, label: str)` (function lines 328-331)
      - `test_FA12_negative_km(self)` (function lines 333-335)
      - `test_FA13_km_over_limit(self)` (function lines 337-339)
  - class `TestKmAddLogHoursValidation(unittest.TestCase)` lines 346-394 — FA-15..19 — hoursOnWater wymagane, zakres 0..99.
    - methods:
      - `setUpClass(cls)` (function lines 350-359)
      - `tearDownClass(cls)` (function lines 362-364)
      - `_assert_validation_error(self, body: dict, label: str)` (function lines 366-369)
      - `test_FA15_missing_hours(self)` (function lines 371-374)
      - `test_FA16_null_hours(self)` (function lines 376-378)
      - `test_FA17_negative_hours(self)` (function lines 380-382)
      - `test_FA18_hours_over_limit(self)` (function lines 384-386)
      - `test_FA19_zero_hours_ok(self)` (function lines 388-394) — hoursOnWater=0 jest dozwolone (KROK 1).
  - class `TestKmAddLogDifficultyValidation(unittest.TestCase)` lines 401-448 — FA-20..24 — walidacja difficultyScale / difficulty.
    - methods:
      - `setUpClass(cls)` (function lines 405-414)
      - `tearDownClass(cls)` (function lines 417-419)
      - `_assert_validation_error(self, body: dict, label: str)` (function lines 421-424)
      - `test_FA20_mountains_wrong_scale(self)` (function lines 426-428)
      - `test_FA21_lowlands_wrong_scale(self)` (function lines 430-432)
      - `test_FA22_unknown_ww_level(self)` (function lines 434-436)
      - `test_FA23_sea_with_difficulty(self)` (function lines 438-440)
      - `test_FA24_mountains_no_difficulty_ok(self)` (function lines 442-448) — Brak difficultyScale jest OK — trudność jest opcjonalna.
  - class `TestKmAddLogCapsizeRolls(unittest.TestCase)` lines 455-507 — FA-25..26 — capsizeRolls zapis w Firestore.
    - methods:
      - `setUpClass(cls)` (function lines 459-466)
      - `tearDownClass(cls)` (function lines 469-471)
      - `test_FA25_capsize_rolls_saved(self)` (function lines 473-491) — Wywrotolotek zapisany w Firestore z poprawnymi wartościami.
      - `test_FA26_missing_capsize_rolls_defaults_to_zero(self)` (function lines 493-507) — Brak capsizeRolls w body → backend zapisuje zera.
  - class `TestKmAddLogOptionalFields(unittest.TestCase)` lines 514-544 — FA-27 — eventId i eventName zapisane w Firestore.
    - methods:
      - `setUpClass(cls)` (function lines 518-525)
      - `tearDownClass(cls)` (function lines 528-530)
      - `test_FA27_event_id_saved(self)` (function lines 532-544) — eventId i eventName przekazane w body są zapisywane w logu.
  - class `TestKmMyLogs(unittest.TestCase)` lines 551-607 — ML-01..05 — GET /api/km/logs.
    - methods:
      - `setUpClass(cls)` (function lines 555-567)
      - `tearDownClass(cls)` (function lines 570-572)
      - `test_ML01_returns_logs_list(self)` (function lines 574-579)
      - `test_ML01b_logs_sorted_by_date_desc(self)` (function lines 581-587)
      - `test_ML03_limit_respected(self)` (function lines 589-592)
      - `test_ML04_limit_max_clamp(self)` (function lines 594-597)
      - `test_ML05_only_own_logs(self)` (function lines 599-607) — Logi zawierają tylko uid zalogowanego użytkownika.
  - class `TestKmMyStats(unittest.TestCase)` lines 614-644 — MS-01..02 — GET /api/km/stats.
    - methods:
      - `setUpClass(cls)` (function lines 618-622)
      - `test_MS01_returns_stats_structure(self)` (function lines 624-632)
      - `test_MS01b_numeric_fields_are_numbers(self)` (function lines 634-644)
  - class `TestKmRankings(unittest.TestCase)` lines 651-726 — RK-01..10 — GET /api/km/rankings.
    - methods:
      - `setUpClass(cls)` (function lines 655-659)
      - `test_RK01_default_response_structure(self)` (function lines 661-668)
      - `test_RK02_entries_sorted_desc(self)` (function lines 670-676)
      - `test_RK03_type_points(self)` (function lines 678-683)
      - `test_RK04_type_hours(self)` (function lines 685-688)
      - `test_RK05_period_year(self)` (function lines 690-695)
      - `test_RK06_limit_respected(self)` (function lines 697-700)
      - `test_RK07_limit_max_clamp(self)` (function lines 702-705)
      - `test_RK08_invalid_type_fallback(self)` (function lines 707-710)
      - `test_RK09_invalid_period_fallback(self)` (function lines 712-715)
      - `test_RK10_entry_structure(self)` (function lines 717-726)
  - class `TestKmRankingsSpecificYear(unittest.TestCase)` lines 733-761 — RW-01..03 — period=specificYear.
    - methods:
      - `setUpClass(cls)` (function lines 737-741)
      - `test_RW01_specific_year_response(self)` (function lines 743-749)
      - `test_RW02_specific_year_no_data(self)` (function lines 751-754)
      - `test_RW03_specific_year_without_year_param_fallback(self)` (function lines 756-761) — Brak parametru year przy period=specificYear → fallback do alltime.
  - class `TestKmPlaces(unittest.TestCase)` lines 768-803 — PL-01..05 — GET /api/km/places.
    - methods:
      - `setUpClass(cls)` (function lines 772-776)
      - `test_PL01_short_query_empty(self)` (function lines 778-783) — Query = 1 znak → pusta lista bez błędu.
      - `test_PL02_empty_query_empty(self)` (function lines 785-788)
      - `test_PL03_no_results_for_unknown_query(self)` (function lines 790-793)
      - `test_PL04_limit_respected(self)` (function lines 795-798)
      - `test_PL05_limit_max_clamp(self)` (function lines 800-803)
  - class `TestKmMapData(unittest.TestCase)` lines 810-829 — MP-01 — GET /api/km/map-data.
    - methods:
      - `setUpClass(cls)` (function lines 814-818)
      - `test_MP01_response_structure(self)` (function lines 820-829)
  - class `TestKmEventStats(unittest.TestCase)` lines 836-909 — EV-01..04 — GET /api/km/event-stats.
    - methods:
      - `setUpClass(cls)` (function lines 840-847)
      - `tearDownClass(cls)` (function lines 850-852)
      - `test_EV02_missing_event_id_400(self)` (function lines 854-858) — Brak eventId → HTTP 400.
      - `test_EV03_unknown_event_id_empty(self)` (function lines 860-865) — Nieznany eventId → pusta lista participants.
      - `test_EV05_event_id_visible_in_stats(self)` (function lines 867-885) — Wpis z eventId widoczny w event-stats.
      - `test_EV04_aggregation_multi_log(self)` (function lines 887-909) — Dwa wpisy tego samego uid z tym samym eventId — sumowane w stats.
  - class `TestKmAdminMergePlaces(unittest.TestCase)` lines 916-1201 — MG-01..11 — POST /api/admin/km/places/merge
    - methods:
      - `setUpClass(cls)` (function lines 929-944)
      - `tearDownClass(cls)` (function lines 947-956)
      - `_tokenize(name: str)` (function lines 963-973) -> `list[str]` — Tokenizacja inline — odpowiednik tokenizeName() z km_places_service.ts.
      - `_create_place(self, name: str, water_type: str, use_count: int)` (function lines 975-993) -> `str` — Tworzy dokument km_places bezpośrednio przez ADC i rejestruje do sprzątania.
      - `test_MG01_no_token_401(self)` (function lines 999-1006) — Brak tokena → 401.
      - `test_MG02_bad_token_401(self)` (function lines 1008-1016) — Zły token → 401.
      - `test_MG03_member_forbidden_403(self)` (function lines 1018-1033) — Rola bez uprawnień admin → 403.
      - `test_MG04_missing_keep_place_id_400(self)` (function lines 1039-1045) — Brak keepPlaceId → 400 validation_failed.
      - `test_MG05_empty_merge_ids_400(self)` (function lines 1047-1053) — Pusta tablica mergeIds → 400 validation_failed.
      - `test_MG06_keep_in_merge_ids_400(self)` (function lines 1055-1061) — keepPlaceId w mergeIds → 400 validation_failed.
      - `test_MG07_too_many_merge_ids_400(self)` (function lines 1063-1069) — Ponad 20 mergeIds → 400 validation_failed.
      - `test_MG08_unknown_keep_place_id_404(self)` (function lines 1071-1079) — keepPlaceId nie istnieje w km_places → 404 not_found.
      - `test_MG09_merge_returns_ok(self)` (function lines 1085-1101) — Poprawny merge → HTTP 200, {ok: true, keepPlaceId, mergeResults, rebuildJobId}.
      - `test_MG10_merged_place_deleted(self)` (function lines 1103-1116) — Po merge scalone miejsce nie istnieje w km_places.
      - `test_MG11_aliases_updated(self)` (function lines 1118-1131) — Nazwa scalanego miejsca trafia do keepPlace.aliases[].
      - `test_MG12_use_count_summed(self)` (function lines 1133-1144) — useCount keepPlace wzrasta o useCount scalanych miejsc.
      - `test_MG13_km_logs_placeId_updated(self)` (function lines 1146-1171) — km_logs z placeId = mergeId mają po merge placeId = keepId.
      - `test_MG14_nonexistent_merge_id_skipped(self)` (function lines 1173-1184) — mergeId które nie istnieje jest pomijane bez błędu — merge kontynuuje.
      - `test_MG15_rebuild_job_queued(self)` (function lines 1186-1201) — Po merge w service_jobs istnieje job km.rebuildMapData.
- Functions:
  - `_valid_log_body(**overrides)` (function lines 78-90) -> `dict` — Minimalne poprawne body dla POST /api/km/log/add.
  - `_skip_if_missing(*attrs)` (function lines 93-97)
  - `_cleanup_km_logs(uid: str)` (function lines 100-113) — Usuwa z Firestore km_logs stworzone przez testy (note == _TEST_TAG).

### `tests/e2e/test_km_firestore.py`

- Lines: `498`
- Size: `20221` bytes
- SHA1: `4121c734f0`
- Module aliases: `tests.e2e.test_km_firestore`
- Imports:
  - `import os`
  - `import sys`
  - `import uuid`
  - `import unittest`
  - `import logging`
  - `from datetime import datetime, timezone, timedelta`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
- Top-level symbols:
  - `_DATE_PAST_YEAR`
  - `_HERE`
  - `_TEST_TAG`
  - `_TODAY`
  - `_YEAR_CURRENT`
  - `_YEAR_PAST`
  - `_YESTERDAY`
  - `_api`
  - `_auth`
  - `_fs`
  - `log`
- Classes:
  - class `TestKmLogDocumentStructure(unittest.TestCase)` lines 116-189 — FS-06 — poprawny km_logs dokument zawiera wszystkie wymagane pola.
    - methods:
      - `setUpClass(cls)` (function lines 120-139)
      - `tearDownClass(cls)` (function lines 142-144)
      - `setUp(self)` (function lines 146-148)
      - `test_FS06_required_fields_present(self)` (function lines 150-160)
      - `test_FS06b_static_fields_correct(self)` (function lines 162-170)
      - `test_FS06c_logId_matches_document_key(self)` (function lines 172-174)
      - `test_FS06d_uid_correct(self)` (function lines 176-178)
      - `test_FS06e_year_derived_from_date(self)` (function lines 180-183)
      - `test_FS06f_km_and_hours_saved(self)` (function lines 185-189)
  - class `TestKmUserStatsAggregation(unittest.TestCase)` lines 198-342 — FS-01..03 — km_user_stats aktualizowane po każdym addKmLog.
    - methods:
      - `setUpClass(cls)` (function lines 208-215)
      - `tearDownClass(cls)` (function lines 218-220)
      - `_read_stats(self)` (function lines 222-224) -> `dict`
      - `test_FS01_stats_created_or_incremented_after_log(self)` (function lines 226-248) — Po dodaniu wpisu km_user_stats/{uid} istnieje i allTimeKm > 0.
      - `test_FS02_second_log_accumulates(self)` (function lines 250-273) — Drugi wpis kumuluje allTimeKm i allTimeLogs.
      - `test_FS03_years_map_updated(self)` (function lines 275-294) — Po dodaniu wpisu z bieżącym rokiem — years[YYYY].km wzrasta.
      - `test_FS03b_historical_log_updates_years_map_not_current_year(self)` (function lines 296-322) — Wpis z poprzedniego roku aktualizuje years[prev_year] ale nie yearKm bieżącego roku.
      - `test_FS01b_stats_structure(self)` (function lines 324-342) — km_user_stats/{uid} zawiera wszystkie oczekiwane pola po wpisie.
  - class `TestKmScoring(unittest.TestCase)` lines 349-428 — FS-04..05 — punkty obliczane ON WRITE przez computePoints(capsizeRolls, vars).
    - methods:
      - `setUpClass(cls)` (function lines 356-364)
      - `tearDownClass(cls)` (function lines 367-369)
      - `test_FS04_points_computed_from_vars(self)` (function lines 371-399) — pointsTotal == kabina*ptsKabina + rolka*ptsEskimoska + dziubek*ptsDziubek.
      - `test_FS05_zero_rolls_zero_points(self)` (function lines 401-415) — Brak wywrotolotek → pointsTotal = 0.
      - `test_FS04b_scoring_version_present(self)` (function lines 417-428) — scoringVersion jest zapisana w logu i odpowiada wartości z km_vars.
  - class `TestKmPlacesUpsert(unittest.TestCase)` lines 435-489 — FS-07 — po addKmLog z nową nazwą akwenu, km_places zawiera nowy dokument.
    - methods:
      - `setUpClass(cls)` (function lines 439-447)
      - `tearDownClass(cls)` (function lines 450-463)
      - `test_FS07_place_created_after_log(self)` (function lines 465-489) — Nowe miejsce pojawia się w km_places po zapisaniu wpisu.
- Functions:
  - `_valid_log_body(**overrides)` (function lines 61-72) -> `dict`
  - `_skip_if_missing(*attrs)` (function lines 75-79)
  - `_cleanup_km_logs(uid: str)` (function lines 82-96)
  - `_get_km_vars()` (function lines 99-109) -> `dict` — Pobiera km_vars z setup/vars_members.

### `tests/e2e/test_register_bo26.py`

- Lines: `232`
- Size: `9157` bytes
- SHA1: `2d1a5e9df3`
- Module aliases: `tests.e2e.test_register_bo26`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import requests`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
- Top-level symbols:
  - `BASE`
  - `REGISTER_URL`
  - `_HERE`
  - `_auth`
  - `_fs`
- Classes:
  - class `TestNewUserOutsideBO26(unittest.TestCase)` lines 71-137 — Wymaga konta DEV_NEW_USER_EMAIL, które NIE ma wpisu
    - methods:
      - `setUp(self)` (function lines 77-84)
      - `test_outside_bo26_gets_rola_sympatyk(self)` (function lines 86-106) — Użytkownik spoza BO26 powinien dostać rola_sympatyk.
      - `test_outside_bo26_profile_complete(self)` (function lines 108-117) — Pełny profil → profileComplete=True.
      - `test_outside_bo26_uid_and_email_in_response(self)` (function lines 119-125) — Odpowiedź zawiera uid i email.
      - `tearDown(self)` (function lines 127-137) — Usuń użytkownika new_user z users_active po każdym teście (best-effort).
  - class `TestRegistrationIdempotency(unittest.TestCase)` lines 144-191 — Wymaga DEV_TEST_USER_EMAIL — konto które już wcześniej przeszło przez rejestrację.
    - methods:
      - `setUp(self)` (function lines 149-151)
      - `test_reregistration_returns_existed_true(self)` (function lines 153-162) — Ponowna rejestracja istniejącego użytkownika → existed=True.
      - `test_reregistration_preserves_role(self)` (function lines 164-173) — Ponowna rejestracja nie zmienia istniejącej roli.
      - `test_empty_profile_returns_profile_complete_false(self)` (function lines 175-191) — Rejestracja bez profilu → profileComplete=False (jeśli profil niekompletny).
  - class `TestBO26MemberRole(unittest.TestCase)` lines 198-228 — Weryfikuje że użytkownik z users_opening_balance_26
    - methods:
      - `setUp(self)` (function lines 207-209)
      - `test_bo26_member_gets_rola_czlonek(self)` (function lines 211-228) — Użytkownik z BO26 (członek=True) → rola_czlonek.
- Functions:
  - `make_headers(token: str)` (function lines 47-51) -> `dict`
  - `_new_user_profile(cfg_)` (function lines 54-64) -> `dict` — Kompletny profil dla konta new_user.

### `tests/e2e/test_security_http.py`

- Lines: `305`
- Size: `12991` bytes
- SHA1: `edd77a92f1`
- Module aliases: `tests.e2e.test_security_http`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import requests`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
- Top-level symbols:
  - `ADMIN_SETUP_URL`
  - `BASE`
  - `REGISTER_URL`
  - `SETUP_URL`
  - `VALID_HOST`
  - `VALID_ORIGIN`
  - `_HERE`
  - `_auth`
- Classes:
  - class `TestAuthMiddleware(unittest.TestCase)` lines 80-143
    - methods:
      - `test_register_no_token_returns_401(self)` (function lines 82-88) — POST /api/register bez Authorization → 401.
      - `test_register_bad_token_returns_401(self)` (function lines 90-100) — POST /api/register z losowym śmieciowym tokenem → 401.
      - `test_register_malformed_bearer_returns_401(self)` (function lines 102-112) — POST /api/register z 'Bearer ' bez tokenu → 401.
      - `test_setup_no_token_returns_401(self)` (function lines 114-120) — GET /api/setup bez Authorization → 401.
      - `test_setup_bad_token_returns_401(self)` (function lines 122-132) — GET /api/setup z błędnym tokenem → 401.
      - `test_valid_token_register_not_401(self)` (function lines 134-143) — POST /api/register z poprawnym tokenem → NIE 401 (token akceptowany).
  - class `TestAdminEndpoint(unittest.TestCase)` lines 150-171
    - methods:
      - `test_admin_setup_without_token_returns_401(self)` (function lines 152-159) — POST /api/admin/setup bez tokenu → 401.
      - `test_admin_setup_non_admin_returns_403(self)` (function lines 161-171) — POST /api/admin/setup z tokenem zwykłego użytkownika → 403.
  - class `TestHostAllowlist(unittest.TestCase)` lines 178-242
    - methods:
      - `test_unknown_host_header_returns_403(self)` (function lines 180-202) — Żądanie z X-Forwarded-Host: evil.example.com → 403.
      - `test_preflight_known_origin_returns_204(self)` (function lines 204-215) — OPTIONS z poprawnym Origin i bez hosta → 204 lub 200 (preflight OK).
      - `test_preflight_unknown_origin_no_acao(self)` (function lines 217-228) — OPTIONS z nieznanym Origin — odpowiedź nie powinna zawierać ACAO z tym origin.
      - `test_valid_request_acao_header_correct(self)` (function lines 230-242) — POST z poprawnym tokenem i Origin → ACAO musi być równy wysłanemu Origin (lub brak).
  - class `TestBlockedUsers(unittest.TestCase)` lines 250-301
    - methods:
      - `setUpClass(cls)` (function lines 253-257)
      - `_skip_if_no_creds(self, email: str, password: str, label: str)` (function lines 259-261)
      - `test_suspended_user_register_returns_403(self)` (function lines 263-271) — POST /api/register jako zawieszony użytkownik → 403.
      - `test_suspended_user_setup_returns_403(self)` (function lines 273-281) — GET /api/setup jako zawieszony użytkownik → 403.
      - `test_deleted_user_register_returns_403(self)` (function lines 283-291) — POST /api/register jako skreślony użytkownik → 403.
      - `test_deleted_user_setup_returns_403(self)` (function lines 293-301) — GET /api/setup jako skreślony użytkownik → 403.
- Functions:
  - `valid_headers(token: str | None)` (function lines 56-61) -> `dict` — Nagłówki dla żądań przechodzących przez normalną ścieżkę (host ustawiany przez Firebase Hosting).
  - `evil_host_headers(token: str | None)` (function lines 64-73) -> `dict` — Nagłówki z nadpisanym X-Forwarded-Host — powinno wywoływać blokadę 403.

### `tests/test_bundle_reservations.py`

- Lines: `1617`
- Size: `63482` bytes
- SHA1: `cdce23f07c`
- Module aliases: `tests.test_bundle_reservations`
- Imports:
  - `import unittest`
- Top-level symbols:
  - `CATEGORY_COLLECTIONS`
  - `CATEGORY_PRIORITY`
- Classes:
  - class `BackendStub` lines 192-390 — Minimal in-memory stub of the bundle reservation backend.
    - methods:
      - `__init__(self, users: dict, catalog: dict)` (function lines 207-215) — users: {uid: {"role_key": ..., "status_key": ..., "email": ...}}
      - `_gen_id(self)` (function lines 217-220)
      - `create_bundle_reservation(self, uid: str, start_date: str, end_date: str, items: list, starter_category: str, starter_item_id: str)` (function lines 222-358) -> `dict` — items: [{"itemId": ..., "category": ...}]
      - `cancel_reservation(self, uid: str, reservation_id: str)` (function lines 360-367) -> `dict`
      - `get_items_with_availability(self, category: str, start_date: str, end_date: str)` (function lines 369-390) -> `list` — Returns catalog items with isAvailableForRange flag.
  - class `TestCompositeId(unittest.TestCase)` lines 397-411
    - methods:
      - `test_basic_kayak(self)` (function lines 399-400)
      - `test_basic_paddle(self)` (function lines 402-403)
      - `test_strips_whitespace(self)` (function lines 405-406)
      - `test_other_categories(self)` (function lines 408-411)
  - class `TestComputeReservationKind(unittest.TestCase)` lines 414-439
    - methods:
      - `test_single_kayak_is_kayak_bundle(self)` (function lines 416-418)
      - `test_kayak_plus_paddle_is_kayak_bundle(self)` (function lines 420-425)
      - `test_only_non_kayak_is_gear_only(self)` (function lines 427-432)
      - `test_empty_list_is_gear_only(self)` (function lines 434-435)
      - `test_category_case_insensitive(self)` (function lines 437-439)
  - class `TestComputePrimaryItemIdx(unittest.TestCase)` lines 442-482
    - methods:
      - `test_kayak_wins_over_paddle(self)` (function lines 444-449)
      - `test_first_kayak_is_primary_when_multiple(self)` (function lines 451-456)
      - `test_paddle_beats_helmet(self)` (function lines 458-463)
      - `test_single_item_is_primary(self)` (function lines 465-467)
      - `test_full_priority_order(self)` (function lines 469-479)
      - `test_empty_returns_zero(self)` (function lines 481-482)
  - class `TestOverlapsIso(unittest.TestCase)` lines 485-515
    - methods:
      - `test_exact_overlap(self)` (function lines 487-489)
      - `test_partial_overlap_start(self)` (function lines 491-493)
      - `test_partial_overlap_end(self)` (function lines 495-497)
      - `test_no_overlap_before(self)` (function lines 499-501)
      - `test_no_overlap_after(self)` (function lines 503-505)
      - `test_adjacent_no_overlap(self)` (function lines 507-510)
      - `test_adjacent_overlap_on_same_day(self)` (function lines 512-515)
  - class `TestFindBundleConflicts(unittest.TestCase)` lines 518-594
    - methods:
      - `_make_reservation(self, rid, start, end, item_ids, kayak_ids)` (function lines 520-528)
      - `test_no_conflict_no_reservations(self)` (function lines 530-534)
      - `test_conflict_with_new_format(self)` (function lines 536-542)
      - `test_conflict_with_legacy_kayak_ids(self)` (function lines 544-550)
      - `test_no_conflict_non_kayak_vs_legacy(self)` (function lines 552-559)
      - `test_no_conflict_different_dates(self)` (function lines 561-567)
      - `test_excluded_reservation_not_counted(self)` (function lines 569-576)
      - `test_cancelled_reservation_not_counted(self)` (function lines 578-585)
      - `test_multiple_conflicts_returned(self)` (function lines 587-594)
  - class `TestCountOverlappingItems(unittest.TestCase)` lines 597-681
    - methods:
      - `_make_reservation(self, rid, uid, start, end, items, kayak_ids)` (function lines 599-611)
      - `test_no_reservations(self)` (function lines 613-617)
      - `test_counts_new_bundle_items(self)` (function lines 619-627)
      - `test_counts_legacy_kayak_ids(self)` (function lines 629-637)
      - `test_ignores_other_users(self)` (function lines 639-647)
      - `test_ignores_non_overlapping(self)` (function lines 649-657)
      - `test_excludes_reservation_by_id(self)` (function lines 659-668)
      - `test_prefers_items_over_kayak_ids(self)` (function lines 670-681)
  - class `TestScenario01_SimplePaddleReservation(unittest.TestCase)` lines 706-742 — Scenario 01: Gear-only reservation of a single paddle.
    - methods:
      - `setUp(self)` (function lines 709-714)
      - `test_creates_gear_only_reservation(self)` (function lines 716-725)
      - `test_reservation_blocks_paddle(self)` (function lines 727-742)
  - class `TestScenario02_KayakBundleWithExtras(unittest.TestCase)` lines 745-815 — Scenario 02: Bundle with kayak + paddle + lifejacket = kayak_bundle.
    - methods:
      - `setUp(self)` (function lines 748-755)
      - `test_bundle_kind_is_kayak_bundle(self)` (function lines 757-769)
      - `test_cost_hours_only_for_kayak(self)` (function lines 771-784)
      - `test_all_items_blocked_after_reservation(self)` (function lines 786-815)
  - class `TestScenario03_LegacyKayakCompatibility(unittest.TestCase)` lines 818-858 — Scenario 03: New bundle conflicts with legacy kayak-only reservation.
    - methods:
      - `setUp(self)` (function lines 821-838)
      - `test_new_bundle_detects_conflict_with_legacy(self)` (function lines 840-849)
      - `test_non_conflicting_dates_pass(self)` (function lines 851-858)
  - class `TestScenario04_RolePermissions(unittest.TestCase)` lines 861-917 — Scenario 04: Role-based access control.
    - methods:
      - `setUp(self)` (function lines 864-874)
      - `test_sympatyk_cannot_reserve(self)` (function lines 876-884)
      - `test_kandydat_limited_to_1_item(self)` (function lines 886-897)
      - `test_czlonek_can_reserve_up_to_3(self)` (function lines 899-917)
  - class `TestScenario05_ItemValidation(unittest.TestCase)` lines 920-986 — Scenario 05: Item validation — inactive, non-operational, private.
    - methods:
      - `setUp(self)` (function lines 923-937)
      - `test_non_operational_kayak_rejected(self)` (function lines 939-947)
      - `test_private_non_rentable_kayak_rejected(self)` (function lines 949-957)
      - `test_private_rentable_kayak_allowed(self)` (function lines 959-966)
      - `test_inactive_item_rejected(self)` (function lines 968-976)
      - `test_unknown_item_rejected(self)` (function lines 978-986)
  - class `TestScenario06_AvailabilityCheck(unittest.TestCase)` lines 989-1030 — Scenario 06: getItemsWithAvailability correctly marks items.
    - methods:
      - `setUp(self)` (function lines 992-999)
      - `test_all_available_when_no_reservations(self)` (function lines 1001-1004)
      - `test_reserved_paddle_marked_unavailable(self)` (function lines 1006-1017)
      - `test_availability_after_reservation_ends(self)` (function lines 1019-1030)
  - class `TestScenario07_MultipleReservations(unittest.TestCase)` lines 1033-1078 — Scenario 07: Multiple users reserving different items in same period.
    - methods:
      - `setUp(self)` (function lines 1036-1046)
      - `test_different_items_no_conflict(self)` (function lines 1048-1062)
      - `test_same_item_conflict_across_users(self)` (function lines 1064-1078)
  - class `TestScenario08_CancelAndRebook(unittest.TestCase)` lines 1081-1120 — Scenario 08: Cancel a reservation then rebook the same item.
    - methods:
      - `setUp(self)` (function lines 1084-1089)
      - `test_cancel_and_rebook(self)` (function lines 1091-1120)
  - class `TestScenario09_DeduplicationOfItems(unittest.TestCase)` lines 1123-1161 — Scenario 09: Duplicate items in request are silently deduplicated.
    - methods:
      - `setUp(self)` (function lines 1126-1131)
      - `test_dedup_does_not_exceed_limit(self)` (function lines 1133-1146)
      - `test_dedup_stores_single_item(self)` (function lines 1148-1161)
  - class `TestScenario10_PrimaryItemSelection(unittest.TestCase)` lines 1164-1223 — Scenario 10: Primary item is the highest-priority category item.
    - methods:
      - `setUp(self)` (function lines 1167-1174)
      - `test_kayak_is_primary_when_included(self)` (function lines 1176-1191)
      - `test_paddle_is_primary_when_no_kayak(self)` (function lines 1193-1207)
      - `test_only_one_item_is_primary(self)` (function lines 1209-1223)
  - class `TestCrossFormatConflicts(unittest.TestCase)` lines 1230-1371 — Weryfikuje że findBundleConflicts() poprawnie wykrywa konflikty między
    - methods:
      - `_make_legacy_reservation(self, kayak_ids: list, block_start: str, block_end: str, status: str, uid: str)` (function lines 1237-1247) -> `dict` — Stara rezerwacja — tylko kayakIds[], bez itemIds[].
      - `_make_bundle_reservation(self, item_ids: list, block_start: str, block_end: str, status: str, uid: str)` (function lines 1249-1260) -> `dict` — Nowa rezerwacja bundle — itemIds[], kayakIds[] puste.
      - `test_bundle_conflicts_with_legacy_same_kayak(self)` (function lines 1262-1275) — Stara rezerwacja z kayakIds=["K01"].
      - `test_bundle_conflicts_with_legacy_different_kayak(self)` (function lines 1277-1288) — Stara rezerwacja z K01 — nowa próba z K02 → brak konfliktu.
      - `test_bundle_conflicts_with_new_format_same_item(self)` (function lines 1290-1302) — Nowa rezerwacja z itemIds=["kayaks/K01"].
      - `test_bundle_conflicts_with_new_format_accessory(self)` (function lines 1304-1316) — Nowa rezerwacja ma itemIds=["paddles/P01"].
      - `test_legacy_cancelled_not_conflicting(self)` (function lines 1318-1327) — Anulowana stara rezerwacja nie blokuje.
      - `test_legacy_non_overlapping_not_conflicting(self)` (function lines 1329-1338) — Stara rezerwacja nie nakłada się na nowe daty → brak konfliktu.
      - `test_multiple_items_partial_conflict(self)` (function lines 1340-1356) — Próba rezerwacji K01 + P01 + H01.
      - `test_exclude_id_skips_own_reservation(self)` (function lines 1358-1371) — Przy aktualizacji rezerwacji (exclude_id) własna rezerwacja nie blokuje samej siebie.
  - class `TestMaxItemsBundleEnforcement(unittest.TestCase)` lines 1378-1613 — Weryfikuje że limit max_items jest liczony łącznie dla wszystkich
    - methods:
      - `_make_backend(self, role: str)` (function lines 1399-1403) -> `BackendStub`
      - `test_member_kayak_paddle_lifejacket_equals_3_ok(self)` (function lines 1405-1420) — Czlonek: kajak + wiosło + kamizelka = 3 przedmioty = max_items → OK.
      - `test_member_kayak_paddle_helmet_lifejacket_equals_4_blocked(self)` (function lines 1422-1439) — Czlonek: kajak + wiosło + kask + kamizelka = 4 przedmioty > max_items=3 → blokada.
      - `test_candidate_1_kayak_ok(self)` (function lines 1441-1450) — Kandydat: 1 kajak = max_items=1 → OK.
      - `test_candidate_kayak_plus_paddle_equals_2_blocked(self)` (function lines 1452-1468) — Kandydat: kajak + wiosło = 2 przedmioty > max_items=1 → blokada.
      - `test_board_100_items_ok(self)` (function lines 1470-1484) — Zarząd: limit = 100, 2 kajaki + 2 akcesoria = 4 → OK.
      - `test_cumulative_count_across_overlapping_reservations(self)` (function lines 1486-1513) — Czlonek ma już 2 kajaki w nakładającej się rezerwacji.
      - `test_cumulative_over_limit_blocked(self)` (function lines 1515-1540) — Czlonek ma już 3 kajaki. Dodanie 1 akcesoria → 4 > 3 → blokada.
      - `test_gear_only_bundle_no_kayak_cost_zero(self)` (function lines 1542-1559) — Bundle bez kajaka → reservationKind=gear_only, costHours=0.
      - `test_kayak_bundle_cost_only_from_kayaks(self)` (function lines 1561-1580) — Bundle z kajakiem i akcesoriami: costHours = tylko dni × kajaki.
      - `test_accessories_price_gap_k1_documented(self)` (function lines 1582-1613) — LUKA K1: Akcesoria (wiosło, kask, fartuch) nie mają cennika.
- Functions:
  - `composite_id(category: str, item_id: str)` (function lines 36-38) -> `str` — "{category}/{itemId}" — e.g. "kayaks/K01", "paddles/P01".
  - `compute_reservation_kind(items: list)` (function lines 41-49) -> `str` — "kayak_bundle" if any item is in the "kayaks" category, "gear_only" otherwise.
  - `compute_primary_item_idx(items: list)` (function lines 52-61) -> `int` — Returns index of the primary item using CATEGORY_PRIORITY.
  - `overlaps_iso(a_start: str, a_end: str, b_start: str, b_end: str)` (function lines 64-69) -> `bool` — Lexicographic ISO date overlap check (same as overlapsIso in calendar_utils.ts).
  - `compute_block_iso(start_date: str, end_date: str, offset_days: int)` (function lines 72-82) -> `tuple` — blockStartIso = startDate - offset_days, blockEndIso = endDate + offset_days.
  - `find_bundle_conflicts(composite_ids: list, reservations: list, block_start: str, block_end: str, exclude_id: str)` (function lines 85-122) -> `list` — Finds conflicting composite IDs.
  - `count_overlapping_items(uid: str, reservations: list, block_start: str, block_end: str, exclude_id: str)` (function lines 125-155) -> `int` — Counts total items in all of a user's active, overlapping reservations.
  - `get_reserved_composite_ids_for_period(reservations: list, block_start: str, block_end: str)` (function lines 158-185) -> `set` — Returns a set of composite IDs that are reserved in the given block period.
  - `make_catalog(*entries)` (function lines 688-703) — Helper: build catalog from (category, item_id, ...) tuples.

### `tests/test_godzinki.py`

- Lines: `1392`
- Size: `56851` bytes
- SHA1: `976db96a69`
- Module aliases: `tests.test_godzinki`
- Imports:
  - `import unittest`
  - `from datetime import datetime, timezone, timedelta`
  - `from copy import deepcopy`
  - `import json`
- Top-level symbols:
  - `DEBUG_TEST_OUTPUT`
  - `EXPIRY_YEARS`
  - `NOW`
  - `VARS`
- Classes:
  - class `VerboseBusinessTestCase(unittest.TestCase)` lines 58-74 — Bazowa klasa testowa — dodaje komentarz do każdego testu.
    - methods:
      - `setUp(self)` (function lines 61-69)
      - `tearDown(self)` (function lines 71-74)
  - class `TestBilansApproval(VerboseBusinessTestCase)` lines 414-466 — Testy zatwierdzania godzinek (approved).
    - methods:
      - `test_niezatwierdzone_nie_licza_sie_do_bilansu(self)` (function lines 417-423) — OCZEKIWANE: Rekord earn z approved=False ma remaining=0 i nie wchodzi do bilansu.
      - `test_niezatwierdzone_nie_widoczne_nawet_po_dacie(self)` (function lines 425-430) — OCZEKIWANE: Stary rekord niezatwierdzony (z przeszłości) dalej nie liczy się do bilansu.
      - `test_zatwierdzone_wchodzi_do_bilansu(self)` (function lines 432-438) — OCZEKIWANE: Po zatwierdzeniu (approved=True) rekord earn wchodzi do bilansu.
      - `test_mix_zatwierdzonych_i_niezatwierdzonych(self)` (function lines 440-448) — OCZEKIWANE: Bilans uwzględnia tylko zatwierdzone. Niezatwierdzone 20h są niewidoczne.
      - `test_zatwierdzenie_po_syncu_zmienia_bilans(self)` (function lines 450-466) — OCZEKIWANE: Symulacja syncu — ustawienie approved=True i remaining=amount
  - class `TestWygasanie(VerboseBusinessTestCase)` lines 469-539 — Testy wygasania godzinek po 4 latach.
    - methods:
      - `test_wygasle_rekordy_nie_licza_sie(self)` (function lines 472-478) — OCZEKIWANE: Godzinki przyznane 5 lat temu (wygasłe 1 rok temu) mają wartość 0 w bilansie.
      - `test_nevygasle_rekordy_licza_sie(self)` (function lines 480-486) — OCZEKIWANE: Godzinki przyznane rok temu (wygasają za 3 lata) są liczone normalnie.
      - `test_wygasanie_dokladnie_dzisiaj_nie_liczy_sie(self)` (function lines 488-494) — OCZEKIWANE: Godzinki wygasające dziś (expiresAt == NOW) NIE są liczone — warunek strict >now.
      - `test_mix_wygasle_i_aktualne(self)` (function lines 496-504) — OCZEKIWANE: Bilans = tylko aktualne (niewygasłe). Wygasłe 10h + aktualne 15h = 15h salda.
      - `test_nastepna_data_wygasniecia(self)` (function lines 506-517) — OCZEKIWANE: Funkcja compute_next_expiry zwraca datę wygaśnięcia najstarszej puli z remaining > 0.
      - `test_brak_next_expiry_gdy_wszystko_wygasle(self)` (function lines 519-524) — OCZEKIWANE: Gdy wszystkie rekordy są wygasłe, next_expiry = None.
      - `test_brak_next_expiry_gdy_wszystko_niezatwierdzone(self)` (function lines 526-531) — OCZEKIWANE: Gdy wszystkie rekordy są niezatwierdzone, next_expiry = None.
      - `test_brak_next_expiry_gdy_remaining_zero(self)` (function lines 533-539) — OCZEKIWANE: Jeśli wszystkie earn.remaining = 0 (zużyte), next_expiry = None.
  - class `TestFIFO(VerboseBusinessTestCase)` lines 542-661 — Testy wydawania FIFO — najstarsze pule zużywane najpierw.
    - methods:
      - `test_fifo_jedna_pula_pelne_zuzycie(self)` (function lines 545-556) — OCZEKIWANE: Przy jednej puli 10h i wydaniu 10h — remaining=0, overdraft=0.
      - `test_fifo_jedna_pula_czesciowe_zuzycie(self)` (function lines 558-568) — OCZEKIWANE: Przy jednej puli 10h i wydaniu 6h — remaining=4, overdraft=0.
      - `test_fifo_dwie_pule_zuzycie_z_obu(self)` (function lines 570-593) — OCZEKIWANE: Pula A (starsza, 10h) + Pula B (nowsza, 10h). Wydanie 15h:
      - `test_fifo_trzy_pule_czesciowe_zuzycie(self)` (function lines 595-615) — OCZEKIWANE: 3 pule (A=5h, B=8h, C=12h). Wydanie 10h:
      - `test_bilans_po_czesciowym_zuzyciu_wielu_pul(self)` (function lines 617-633) — OCZEKIWANE: Po kilku operacjach wydania z wielu pul bilans jest poprawnie sumowany.
      - `test_fifo_pomija_niezatwierdzone(self)` (function lines 635-647) — OCZEKIWANE: FIFO nie tknrze niezatwierdzonych rekordów earn. Wydanie ze swobodnych pul tylko.
      - `test_fifo_pomija_wygasle(self)` (function lines 649-661) — OCZEKIWANE: FIFO nie używa wygasłych rekordów earn.
  - class `TestSaldoUjemne(VerboseBusinessTestCase)` lines 664-725 — Testy salda ujemnego — limit, blokada, dopuszczalne schodzenie na minus.
    - methods:
      - `test_schodzenie_na_minus_dozwolone_do_limitu(self)` (function lines 667-676) — OCZEKIWANE: Przy pustym saldzie i limicie -20, wydanie 15h jest dozwolone.
      - `test_schodzenie_na_minus_dokladnie_do_limitu(self)` (function lines 678-687) — OCZEKIWANE: Wydanie dokładnie do limitu (-20) jest dozwolone.
      - `test_przekroczenie_limitu_blokuje(self)` (function lines 689-698) — OCZEKIWANE: Próba wydania godzinek, które zejdą poniżej -20 (limitu), MUSI być zablokowana.
      - `test_przekroczenie_limitu_o_jeden(self)` (function lines 700-712) — OCZEKIWANE: Próba zejścia o 1 poniżej limitu (-20) jest zablokowana.
      - `test_rozne_limity_z_setup(self)` (function lines 714-725) — OCZEKIWANE: Limit ujemnego salda pochodzi z setup/vars_godzinki.
  - class `TestWykup(VerboseBusinessTestCase)` lines 728-815 — Testy wykupu salda ujemnego.
    - methods:
      - `test_wykup_przy_ujemnym_saldzie(self)` (function lines 731-740) — OCZEKIWANE: Przy saldzie -10h, wykup 5h podnosi saldo do -5h.
      - `test_wykup_do_zera(self)` (function lines 742-750) — OCZEKIWANE: Wykup dokładnie równy saldzie ujemnemu daje bilans = 0.
      - `test_wykup_gdy_saldo_dodatnie_jest_zabroniony(self)` (function lines 752-762) — OCZEKIWANE: Nie można wykupić godzinek gdy saldo jest dodatnie lub równe 0.
      - `test_wykup_gdy_saldo_zero_jest_zabroniony(self)` (function lines 764-770) — OCZEKIWANE: Nie można wykupić godzinek gdy saldo = 0.
      - `test_wykup_nie_moze_wyjsc_na_plus(self)` (function lines 772-783) — OCZEKIWANE: Wykup większy niż saldo ujemne MUSI być zablokowany.
      - `test_wykup_dokladnie_jeden_za_duzo(self)` (function lines 785-793) — OCZEKIWANE: Saldo = -5h. Wykup 6h (o 1 za dużo) MUSI być zablokowany.
      - `test_wykup_nie_dotyka_zatwierdzonych_earn(self)` (function lines 795-815) — OCZEKIWANE: Wykup działa niezależnie od puli earn.
  - class `TestWarunkiBrzegowe(VerboseBusinessTestCase)` lines 818-940 — Testy warunków brzegowych.
    - methods:
      - `test_brak_rekordow_bilans_zero(self)` (function lines 821-825) — OCZEKIWANE: Nowy użytkownik bez żadnych rekordów ma saldo = 0.
      - `test_brak_rekordow_brak_expiry(self)` (function lines 827-831) — OCZEKIWANE: Nowy użytkownik bez rekordów nie ma daty wygaśnięcia.
      - `test_tylko_wygasle_rekordy_bilans_zero(self)` (function lines 833-841) — OCZEKIWANE: Gdy wszystkie earn są wygasłe, bilans = 0 niezależnie od ich kwot.
      - `test_tylko_niezatwierdzone_bilans_zero(self)` (function lines 843-851) — OCZEKIWANE: Gdy wszystkie earn są niezatwierdzone, bilans = 0.
      - `test_saldo_dokladnie_zero_po_wydaniu(self)` (function lines 853-861) — OCZEKIWANE: Dokładne wydanie całego salda daje bilans = 0, nie ujemny.
      - `test_saldo_dokladnie_na_granicy_limitu_ujemnego(self)` (function lines 863-874) — OCZEKIWANE: Bilans = -20 (dokładnie na limicie). Stan jest poprawny — kolejne wydanie
      - `test_fifo_wygasniecie_nie_niszczy_salda(self)` (function lines 876-908) — OCZEKIWANE (kluczowy test FIFO): Wydanie z dwóch pul FIFO, potem wygaśnięcie starszej.
      - `test_pełna_ścieżka_submit_approve_spend_expiry(self)` (function lines 910-940) — OCZEKIWANE: Pełna ścieżka życia godzinek:
  - class `TestRefundowaneIWykupApproval(VerboseBusinessTestCase)` lines 943-1046 — Testy kompatybilności wstecznej i flag refunded/approved.
    - methods:
      - `test_zrefundowany_spend_nie_liczy_sie_do_bilansu(self)` (function lines 949-960) — SPRAWDZAM: spend.refunded=True nie wchodzi do bilansu.
      - `test_niezrefundowany_spend_liczy_sie(self)` (function lines 962-972) — SPRAWDZAM: spend.refunded=False (aktywny) wchodzi do bilansu normalnie.
      - `test_stary_spend_bez_pola_refunded_liczy_sie(self)` (function lines 974-981) — SPRAWDZAM: kompatybilność wsteczna — stary rekord bez pola 'refunded' (brak klucza)
      - `test_niezatwierdzony_purchase_nie_liczy_sie(self)` (function lines 983-994) — SPRAWDZAM: purchase.approved=False (pending) nie wchodzi do bilansu.
      - `test_zatwierdzony_purchase_redukuje_overdraft(self)` (function lines 996-1006) — SPRAWDZAM: purchase.approved=True zmniejsza saldo ujemne.
      - `test_stary_purchase_bez_pola_approved_liczy_sie(self)` (function lines 1008-1015) — SPRAWDZAM: kompatybilność wsteczna — stary rekord purchase bez pola 'approved'
      - `test_mix_refunded_i_aktywnych_spend(self)` (function lines 1017-1033) — SPRAWDZAM: Mix anulowanych i aktywnych spend — tylko aktywne obciążają bilans.
      - `test_mix_approved_i_pending_purchase(self)` (function lines 1035-1046) — SPRAWDZAM: Mix zatwierdzonych i oczekujących purchase.
  - class `TestKorekcjaRezerwacji(VerboseBusinessTestCase)` lines 1049-1209 — Testy logiki korekty i anulowania rezerwacji.
    - methods:
      - `_simulate_credit_adjustment(self, records, amount, granted_at, expiry_years)` (function lines 1055-1074) — Symuluje creditReservationAdjustment — tworzy earn z sourceType='adjustment'.
      - `_simulate_refund_with_adjustment_revocation(self, records, reservation_earn_deductions, overdraft)` (function lines 1076-1101) — Symuluje refundHoursForReservation z poprawką BUG #1:
      - `test_skrocenie_i_anulowanie_bilans_prawidlowy(self)` (function lines 1103-1135) — SPRAWDZAM: Scenariusz który był BUG #1 przed poprawką.
      - `test_skrocenie_bez_anulowania_bilans_prawidlowy(self)` (function lines 1137-1149) — SPRAWDZAM: Skrócenie rezerwacji BEZ anulowania działa poprawnie.
      - `test_wydluzenie_i_anulowanie_bilans_prawidlowy(self)` (function lines 1151-1182) — SPRAWDZAM: Wydłużenie rezerwacji (delta>0) + anulowanie zwraca pełny koszt.
      - `test_wielokrotne_skrocenia_i_anulowanie(self)` (function lines 1184-1209) — SPRAWDZAM: Dwa skrócenia + anulowanie — WSZYSTKIE adjustment earn zerowane.
  - class `TestWyswietlanieHistorii(VerboseBusinessTestCase)` lines 1212-1264 — Testy poprawności danych do wyświetlenia historii.
    - methods:
      - `test_historia_zawiera_wszystkie_typy_rekordow(self)` (function lines 1215-1233) — OCZEKIWANE: Historia użytkownika zawiera rekordy earn, spend i purchase.
      - `test_nastepne_wygasniecie_format_mm_rrrr(self)` (function lines 1235-1245) — OCZEKIWANE: Funkcja compute_next_expiry zwraca datę, którą UI formatuje jako MM-RRRR.
      - `test_bilans_i_ostatnie_rekordy_na_dashboard(self)` (function lines 1247-1264) — OCZEKIWANE: Dashboard pokazuje bieżące saldo + ostatnie godzinki.
  - class `TestStorageMiesieczna(VerboseBusinessTestCase)` lines 1267-1388 — Testy logiki naliczania miesięcznej opłaty za prywatne kajaki (gear.chargePrivateStorage).
    - methods:
      - `_first_chargeable_month(self, private_since_iso)` (function lines 1275-1292) — Mirrors firstChargeableMonth() — zwraca 'YYYY-MM' pierwszego naliczalnego miesiąca.
      - `_is_chargeable_this_month(self, private_since_iso, current_month)` (function lines 1294-1304) — Mirrors isChargeableThisMonth() — true jeśli current_month >= firstChargeableMonth.
      - `test_wejscie_drugiego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1306-1308) — Kajak wszedł 02.03 → marzec niepełny → pierwszy naliczany = kwiecień.
      - `test_wejscie_pierwszego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1310-1312) — Kajak wszedł 01.03 → marzec też niepełny (wchodzi w miesiąc, nie go wyprzedza) → kwiecień.
      - `test_wejscie_ostatniego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1314-1316) — Kajak wszedł 31.03 → marzec niepełny → kwiecień.
      - `test_wejscie_w_grudniu_pierwszy_miesiąc_styczeń_następnego_roku(self)` (function lines 1318-1320) — Grudzień → rollover roku → następny miesiąc = styczeń następnego roku.
      - `test_brak_daty_brak_naliczenia(self)` (function lines 1322-1326) — Brak daty wejścia → firstChargeableMonth zwraca None → nie naliczamy.
      - `test_scheduler_01_04_dla_kajaka_z_02_03_nalicza(self)` (function lines 1328-1330) — Scheduler działa 01.04 — kajak wszedł 02.03 — naliczamy (2025-04 >= 2025-04).
      - `test_scheduler_01_03_dla_kajaka_z_02_03_nie_nalicza(self)` (function lines 1332-1334) — Scheduler działa 01.03 — kajak wszedł 02.03 tego samego miesiąca — nie naliczamy.
      - `test_scheduler_przed_wejsciem_nie_nalicza(self)` (function lines 1336-1338) — Bieżący miesiąc jest PRZED miesiącem wejścia — nie naliczamy.
      - `test_scheduler_wiele_miesiecy_po_wejsciu_nalicza(self)` (function lines 1340-1342) — Wiele miesięcy po wejściu — naliczamy (lata później).
      - `test_pierwszy_naliczany_miesiac_dokladnie(self)` (function lines 1344-1348) — Bieżący miesiąc == firstChargeableMonth → granica — naliczamy.
      - `test_oplata_storage_odlicza_godzinki(self)` (function lines 1350-1361) — SPRAWDZAM: Naliczenie opłaty magazynowej odlicza godzinki z puli.
      - `test_oplata_storage_przy_niewystarczajacym_saldzie_schodzi_na_minus(self)` (function lines 1363-1374) — SPRAWDZAM: Gdy saldo < koszt, opłata nadal zostaje pobrana — tworzy overdraft.
      - `test_oplata_storage_blokada_przy_przekroczeniu_limitu(self)` (function lines 1376-1388) — SPRAWDZAM: Gdy limit overdraft przekroczony (overdraft >= max_overdraft), dedukcja nie przechodzi.
- Functions:
  - `_to_debug_value(value)` (function lines 29-37) — Konwertuje obiekty do formatu czytelnego w konsoli.
  - `_debug_dump(label, value)` (function lines 40-45) — Czytelny print JSON do konsoli.
  - `_debug_line(text)` (function lines 48-55)
  - `_dt(year, month, day, hour)` (function lines 84-86) — Tworzy świadomy datetime UTC.
  - `make_earn(amount, granted_at, approved, remaining, expiry_years)` (function lines 89-121) — Tworzy rekord typu 'earn'.
  - `make_spend(amount, from_earn, overdraft, refunded)` (function lines 124-154) — Tworzy rekord typu 'spend'.
  - `make_purchase(amount, approved)` (function lines 157-174) — Tworzy rekord typu 'purchase' (wykup salda ujemnego).
  - `compute_balance(records, now)` (function lines 177-216) — Oblicza aktualne saldo godzinek.
  - `compute_next_expiry(records, now)` (function lines 219-245) — Zwraca datę najbliższego wygaśnięcia godzinek (najstarsza pula z remaining > 0).
  - `deduct_hours(records, amount, vars_config, now)` (function lines 248-345) — Odlicza godzinki metodą FIFO. Modyfikuje earn.remaining w rekordach.
  - `purchase_negative_balance(records, amount, now)` (function lines 348-403) — Wykup salda ujemnego. Można wykupić tylko tyle, żeby saldo nie przekroczyło 0.

### `tests/test_pwa.py`

- Lines: `375`
- Size: `14697` bytes
- SHA1: `62a17d0ad6`
- Module aliases: `tests.test_pwa`
- Imports:
  - `import os`
  - `import json`
  - `import struct`
  - `import unittest`
- Top-level symbols:
  - `MANUAL_CHECKLIST`
  - `PROJECT`
  - `PUBLIC`
- Classes:
  - class `TestPWAFiles(unittest.TestCase)` lines 44-65 — Sprawdza obecność wymaganych plików PWA.
    - methods:
      - `test_manifest_exists(self)` (function lines 47-49) — manifest.json musi istnieć.
      - `test_sw_exists(self)` (function lines 51-53) — sw.js musi istnieć.
      - `test_icon_192_exists(self)` (function lines 55-57) — Ikona 192x192 musi istnieć.
      - `test_icon_512_exists(self)` (function lines 59-61) — Ikona 512x512 musi istnieć.
      - `test_icon_180_exists(self)` (function lines 63-65) — Ikona apple-touch-icon 180x180 musi istnieć.
  - class `TestPNGDimensions(unittest.TestCase)` lines 68-78 — Sprawdza rozmiary PNG icon.
    - methods:
      - `test_icon_192_size(self)` (function lines 71-72)
      - `test_icon_512_size(self)` (function lines 74-75)
      - `test_icon_180_size(self)` (function lines 77-78)
  - class `TestManifest(unittest.TestCase)` lines 81-120 — Sprawdza zawartość manifest.json.
    - methods:
      - `setUp(self)` (function lines 84-85)
      - `test_name(self)` (function lines 87-89)
      - `test_short_name(self)` (function lines 91-94)
      - `test_start_url(self)` (function lines 96-97)
      - `test_display_standalone(self)` (function lines 99-100)
      - `test_background_color(self)` (function lines 102-103)
      - `test_theme_color(self)` (function lines 105-106)
      - `test_icons_count(self)` (function lines 108-110)
      - `test_icons_have_192(self)` (function lines 112-115)
      - `test_icons_have_512(self)` (function lines 117-120)
  - class `TestIndexHtml(unittest.TestCase)` lines 123-149 — Sprawdza meta tagi PWA w index.html.
    - methods:
      - `setUp(self)` (function lines 126-127)
      - `test_manifest_link(self)` (function lines 129-131)
      - `test_theme_color(self)` (function lines 133-134)
      - `test_apple_touch_icon(self)` (function lines 136-137)
      - `test_apple_mobile_web_app_capable(self)` (function lines 139-140)
      - `test_apple_mobile_web_app_title(self)` (function lines 142-143)
      - `test_favicon_32(self)` (function lines 145-146)
      - `test_viewport(self)` (function lines 148-149)
  - class `TestAppShell(unittest.TestCase)` lines 152-177 — Sprawdza kod app_shell.js — rejestracja SW i poprawka buga spinnera.
    - methods:
      - `setUp(self)` (function lines 155-156)
      - `test_sw_registration_present(self)` (function lines 158-160) — app_shell.js musi rejestrować service worker.
      - `test_sw_path_correct(self)` (function lines 162-164) — Ścieżka SW musi być /sw.js.
      - `test_hang_bug_fixed(self)` (function lines 166-173) — Catch block musi czyścić spinner — viewEl.innerHTML w catch.
      - `test_retry_button_in_error(self)` (function lines 175-177) — Ekran błędu musi miec przycisk do odświeżenia strony.
  - class `TestServiceWorker(unittest.TestCase)` lines 180-217 — Sprawdza kluczowe właściwości sw.js.
    - methods:
      - `setUp(self)` (function lines 183-184)
      - `test_cache_version_defined(self)` (function lines 186-187)
      - `test_install_event(self)` (function lines 189-190)
      - `test_activate_event(self)` (function lines 192-193)
      - `test_fetch_event(self)` (function lines 195-196)
      - `test_api_never_cached(self)` (function lines 198-200) — /api/ musi byc wykluczone z cache.
      - `test_external_origins_bypass(self)` (function lines 202-204) — Zewnetrzne originy musza byc pomijane przez SW.
      - `test_precache_index_html(self)` (function lines 206-207)
      - `test_skip_waiting(self)` (function lines 209-210)
      - `test_clients_claim(self)` (function lines 212-213)
      - `test_old_cache_cleanup(self)` (function lines 215-217) — SW musi czyscic stare wersje cache w activate.
  - class `TestFirebaseJson(unittest.TestCase)` lines 220-251 — Sprawdza konfigurację Firebase Hosting dla PWA.
    - methods:
      - `setUp(self)` (function lines 223-227)
      - `test_sw_no_cache(self)` (function lines 229-233) — sw.js musi miec Cache-Control: no-cache.
      - `test_sw_allowed_header(self)` (function lines 235-239) — sw.js musi miec Service-Worker-Allowed: /.
      - `test_icons_long_cache(self)` (function lines 241-245) — Ikony moga byc cachowane dlugo.
      - `test_manifest_no_cache(self)` (function lines 247-251) — manifest.json musi byc serwowany bez cache (na wypadek zmiany ikon/nazwy).
- Functions:
  - `read(rel: str)` (function lines 21-23) -> `str`
  - `exists(rel: str)` (function lines 26-27) -> `bool`
  - `png_dimensions(rel: str)` (function lines 30-37) -> `tuple[int, int]`

### `tools/build_project_context.py`

- Lines: `673`
- Size: `18905` bytes
- SHA1: `9c11ab6623`
- Module aliases: `tools.build_project_context`
- Imports:
  - `from __future__ import annotations`
  - `from dataclasses import asdict, dataclass, field`
  - `from pathlib import Path`
  - `import json`
  - `import re`
  - `from typing import Iterable`
- Top-level symbols:
  - `EXCLUDE_DIRS`
  - `EXCLUDE_FILES`
  - `INCLUDE_EXT`
  - `LARGE_FILE_LINES`
  - `MAX_ITEMS`
  - `MAX_LINE_LEN`
  - `OUTPUT_DIR`
  - `README`
  - `ROOT`
- Classes:
  - class `FileInfo` lines 47-60
- Functions:
  - `trim(value: str, max_len: int)` (function lines 63-67) -> `str`
  - `rel_path(path: Path)` (function lines 70-71) -> `str`
  - `is_excluded(path: Path)` (function lines 74-87) -> `bool`
  - `read_text(path: Path)` (function lines 90-94) -> `str`
  - `unique_sorted(values: Iterable[str], limit: int | None)` (function lines 97-101) -> `list[str]`
  - `classify_file(path: Path)` (function lines 104-138) -> `str`
  - `extract_imports(text: str)` (function lines 141-157) -> `list[str]`
  - `is_local_import(import_path: str)` (function lines 160-161) -> `bool`
  - `extract_exports(text: str)` (function lines 164-177) -> `list[str]`
  - `extract_symbols(text: str)` (function lines 180-193) -> `list[str]`
  - `extract_routes(text: str)` (function lines 196-217) -> `list[str]`
  - `extract_firebase_functions(text: str)` (function lines 220-235) -> `list[str]`
  - `extract_keywords(path: Path, text: str)` (function lines 238-273) -> `list[str]`
  - `parse_firebase_rewrites()` (function lines 276-312) -> `list[str]`
  - `resolve_local_import(current_file: str, import_path: str, known_paths: set[str])` (function lines 315-339) -> `str | None`
  - `analyze_file(path: Path)` (function lines 342-366) -> `FileInfo`
  - `build_dependency_edges(files: list[FileInfo])` (function lines 369-379) -> `list[dict[str, str]]`
  - `append_list(lines: list[str], values: list[str], indent: str)` (function lines 382-384) -> `None`
  - `write_markdown(path: Path, lines: list[str])` (function lines 387-388) -> `None`
  - `group_by_kind(files: list[FileInfo])` (function lines 391-400) -> `dict[str, list[FileInfo]]`
  - `write_readme(files: list[FileInfo])` (function lines 403-479) -> `None`
  - `write_routes(files: list[FileInfo])` (function lines 482-522) -> `None`
  - `write_keywords(files: list[FileInfo])` (function lines 525-545) -> `None`
  - `append_file_details(lines: list[str], file: FileInfo)` (function lines 548-583) -> `None`
  - `write_group_file(filename: str, title: str, files: list[FileInfo], kinds: set[str])` (function lines 586-602) -> `None`
  - `write_json_files(files: list[FileInfo])` (function lines 605-616) -> `None`
  - `main()` (function lines 619-668) -> `None`

### `tools/generate_pwa_icons.py`

- Lines: `130`
- Size: `5580` bytes
- SHA1: `b960f50975`
- Module aliases: `tools.generate_pwa_icons`
- Imports:
  - `import struct`
  - `import zlib`
  - `import os`
  - `import math`
- Top-level symbols:
  - `BG`
  - `CARD`
  - `M_CLR`
- Functions:
  - `_chunk(tag: bytes, data: bytes)` (function lines 19-21) -> `bytes`
  - `write_png(filepath: str, size: int, pixels: list[tuple[int, int, int]])` (function lines 24-39) -> `None`
  - `_set(pixels: list, size: int, x: int, y: int, color: tuple)` (function lines 42-44) -> `None`
  - `_fill_rect(pixels, size, x0, y0, x1, y1, color)` (function lines 47-50)
  - `_fill_rounded_rect(pixels, size, x0, y0, x1, y1, r, color)` (function lines 53-69) — Filled rounded rectangle.
  - `_draw_thick_line(pixels, size, x0, y0, x1, y1, thickness, color)` (function lines 72-88) — Bresenham-like thick line (anti-aliasing-free).
  - `make_icon(size: int)` (function lines 91-118) -> `list[tuple[int, int, int]]`

## Script files

### `appscript/członkowie sympatycy SKK/common_helpers.gs`

- Lines: `289`
- Size: `7378` bytes
- Functions:
  - `assertBoardAccess_`
  - `enqueueServiceJob_`
  - `firestoreCommitDocuments_`
  - `firestoreGetDocument_`
  - `firestorePatchDocument_`
  - `formatTimeHHMM_`
  - `isDateObject_`
  - `isIsoTimestamp_`
  - `isUserInGroup_`
  - `normalizeHeader_`
  - `parseSetupValue_`
  - `rolesAllowedFromFlags_`
  - `splitList_`
  - `toBool_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/członkowie sympatycy SKK/env_config.gs`

- Lines: `61`
- Size: `2177` bytes

### `appscript/członkowie sympatycy SKK/events_sync.gs`

- Lines: `343`
- Size: `10791` bytes
- Functions:
  - `addChangedPathIfNeededForEvents_`
  - `buildEventDiff_`
  - `isTruthySheetSyncedFlag_`
  - `markEventRowSynced_`
  - `normalizeComparableForEvents_`
  - `normalizeSheetDateToYmd_`
  - `normalizeStringForEvents_`
  - `patchFirestoreDocumentFieldsForEvents_`
  - `readEventsForSync_`
  - `syncEventsToFirestore`
  - `valuesEqualForEventsSync_`

### `appscript/członkowie sympatycy SKK/hours_sync.gs`

- Lines: `270`
- Size: `7391` bytes
- Functions:
  - `addChangedPathIfNeededForHours_`
  - `buildHoursDiff_`
  - `isTruthyHoursSheetSyncedFlag_`
  - `markHoursRowSynced_`
  - `normalizeComparableForHours_`
  - `patchFirestoreDocumentFieldsForHours_`
  - `readHoursForSync_`
  - `syncHoursToFirestore`
  - `valuesEqualForHoursSync_`

### `appscript/członkowie sympatycy SKK/setup_sync.gs`

- Lines: `262`
- Size: `8284` bytes
- Functions:
  - `idx`
  - `initRoleMappings`
  - `readAppSetupModules_`
  - `readSetupVars_`
  - `syncSetupToFirestore`

### `appscript/członkowie sympatycy SKK/ui_menu.gs`

- Lines: `15`
- Size: `436` bytes
- Functions:
  - `onOpen`

### `appscript/członkowie sympatycy SKK/users_sync.gs`

- Lines: `528`
- Size: `16151` bytes
- Functions:
  - `addChangedPathIfNeeded_`
  - `buildUserDiff_`
  - `findUserDocumentByMemberId_`
  - `firestoreFieldsToJs_`
  - `firestoreValueToJs_`
  - `getPathValue_`
  - `idx`
  - `mapRoleDisplayToKey_`
  - `mapStatusDisplayToKey_`
  - `normalizeBoolish_`
  - `normalizeComparable_`
  - `normalizeDateString_`
  - `normalizeEmail_`
  - `normalizeString_`
  - `patchFirestoreUserFields_`
  - `readUsersForSync_`
  - `setPathValue_`
  - `syncUsersToFirestore`
  - `valuesEqualForSync_`

### `appscript/kilometrówka/archiwum_sync.gs`

- Lines: `296`
- Size: `10265` bytes
- Functions:
  - `buildEmailToUidMap_`
  - `resolveWaterType_`
  - `syncArchivumToFirestore`
  - `writeIdsToCells_`

### `appscript/kilometrówka/common_helpers.gs`

- Lines: `309`
- Size: `8980` bytes
- Functions:
  - `assertBoardAccess_`
  - `enqueueServiceJob_`
  - `firestoreCommitDocuments_`
  - `firestoreFieldsToJs_`
  - `firestoreGetDocument_`
  - `firestorePatchDocumentFields_`
  - `firestoreRunQuery_`
  - `firestoreValueToJs_`
  - `getPathValue_`
  - `isIsoTimestamp_`
  - `isUserInGroup_`
  - `normalizeHeader_`
  - `setPathValue_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/kilometrówka/env_config.gs`

- Lines: `41`
- Size: `1234` bytes

### `appscript/kilometrówka/ranking_sync.gs`

- Lines: `241`
- Size: `8202` bytes
- Functions:
  - `pushRankingCorrections`
  - `syncRankingFromFirestore`

### `appscript/kilometrówka/ui_menu.gs`

- Lines: `46`
- Size: `1645` bytes
- Functions:
  - `enqueueRebuildMapData`
  - `enqueueRebuildRankings`
  - `onOpen`

### `appscript/kurs/common_helpers.gs`

- Lines: `321`
- Size: `9945` bytes
- Functions:
  - `assertBoardAccess_`
  - `enqueueServiceJob_`
  - `firestoreCommitDocuments_`
  - `firestoreFieldsToJs_`
  - `firestoreGetDocument_`
  - `firestorePatchDocumentFields_`
  - `firestorePatchDocument_`
  - `firestoreValueToJs_`
  - `formatTimeHHMM_`
  - `getPathValue_`
  - `isDateObject_`
  - `isIsoTimestamp_`
  - `isUserInGroup_`
  - `normalizeBoolish_`
  - `normalizeDateString_`
  - `normalizeEmail_`
  - `normalizeHeader_`
  - `parseSetupValue_`
  - `setPathValue_`
  - `toBool_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/kurs/env_config.gs`

- Lines: `46`
- Size: `1355` bytes

### `appscript/kurs/kurs_config_sync.gs`

- Lines: `92`
- Size: `2448` bytes
- Functions:
  - `readKursSetupVars_`
  - `syncKursConfigToFirestore`

### `appscript/kurs/po_kursie_sync.gs`

- Lines: `94`
- Size: `2592` bytes
- Functions:
  - `readPoKursieFromSheet_`
  - `syncPoKursieToFirestore`

### `appscript/kurs/uczestnicy_sync.gs`

- Lines: `187`
- Size: `6090` bytes
- Functions:
  - `buildUczestnikDiff_`
  - `normalizeComparable_`
  - `readUczestnicyForSync_`
  - `syncUczestnicyToFirestore`

### `appscript/kurs/ui_menu.gs`

- Lines: `15`
- Size: `398` bytes
- Functions:
  - `onOpen`

### `appscript/sprzęt/config.gs`

- Lines: `161`
- Size: `4197` bytes
- Functions:
  - `buildGearCategoriesConfig_`

### `appscript/sprzęt/firestore_rest.gs`

- Lines: `217`
- Size: `5729` bytes
- Functions:
  - `fsCommitDocuments_`
  - `fsGetDoc_`
  - `fsListDocs_`
  - `fsPatchFields_`
  - `fsUpsertDoc_`
  - `isIsoTimestamp_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`

### `appscript/sprzęt/menu.gs`

- Lines: `15`
- Size: `425` bytes
- Functions:
  - `onOpen`

### `appscript/sprzęt/setup_sync.gs`

- Lines: `323`
- Size: `9906` bytes
- Functions:
  - `formatTimeHHMM_`
  - `isDateObject_`
  - `normalizeHeader_`
  - `parseSetupValue_`
  - `readAppSetupModules_`
  - `readSetupVars_`
  - `rolesAllowedFromFlags_`
  - `splitList_`
  - `syncSetupToFirestore`
  - `toBool_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/sprzęt/sync_kayaks.gs`

- Lines: `777`
- Size: `20072` bytes
- Functions:
  - `buildDocLogLabel_`
  - `buildFirestorePayload_`
  - `buildFloatationChamberDocFromRow_`
  - `buildGearDocFromRow_`
  - `buildHelmetDocFromRow_`
  - `buildKayakDocFromRow_`
  - `buildLifejacketDocFromRow_`
  - `buildMiscDocFromRow_`
  - `buildPaddleDocFromRow_`
  - `buildSprayskirtDocFromRow_`
  - `buildThrowbagDocFromRow_`
  - `buildWetsuitDocFromRow_`
  - `extractDocIdFromName_`
  - `getGearCategoryList_`
  - `isRealFloatationChamberRow_`
  - `isRealGearRow_`
  - `isRealHelmetRow_`
  - `isRealKayakRow_`
  - `isRealLifejacketRow_`
  - `isRealMiscRow_`
  - `isRealPaddleRow_`
  - `isRealSprayskirtRow_`
  - `isRealThrowbagRow_`
  - `isRealWetsuitRow_`
  - `markMissingGearAsScrapped_`
  - `normCell_`
  - `parseBool_`
  - `parseNumber_`
  - `parseSheetDate_`
  - `rowToObject_`
  - `summarizeAllGearResults_`
  - `syncAllGearCore_`
  - `syncAllGearDryRun`
  - `syncAllGearToFirestore`
  - `syncSingleGearCategory_`

### `functions/.eslintrc.js`

- Lines: `61`
- Size: `1450` bytes

### `functions/lib/api/adminEventsSyncCalendarHandler.js`

- Lines: `84`
- Size: `3724` bytes
- Imports:
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleAdminEventsSyncCalendar`

### `functions/lib/api/basenAdminAddGodzinyHandler.js`

- Lines: `69`
- Size: `2967` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_godziny_service.js`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
- Functions:
  - `handleBasenAdminAddGodziny`

### `functions/lib/api/basenAdminCorrectGodzinyHandler.js`

- Lines: `70`
- Size: `3114` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_godziny_service.js`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
- Functions:
  - `handleBasenAdminCorrectGodziny`

### `functions/lib/api/basenAdminSearchUsersHandler.js`

- Lines: `71`
- Size: `3339` bytes
- Functions:
  - `handleBasenAdminSearchUsers`

### `functions/lib/api/basenCancelEnrollmentHandler.js`

- Lines: `46`
- Size: `1935` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleBasenCancelEnrollment`

### `functions/lib/api/basenCancelSessionHandler.js`

- Lines: `55`
- Size: `2436` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleBasenCancelSession`

### `functions/lib/api/basenCreateSessionHandler.js`

- Lines: `69`
- Size: `3067` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleBasenCreateSession`

### `functions/lib/api/basenEnrollHandler.js`

- Lines: `89`
- Size: `4529` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require ../modules/users/userStatusCheck`
- Functions:
  - `handleBasenEnroll`

### `functions/lib/api/basenGrantKarnetHandler.js`

- Lines: `67`
- Size: `3390` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleBasenGrantKarnet`

### `functions/lib/api/DELETE_getModulesHandler.js`

- Lines: `224`
- Size: `8305` bytes
- Imports:
  - `import/require cors`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
  - `import/require firebase-functions/v2/https`
- Functions:
  - `deny`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedForRole`
  - `isAllowedHost`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`

### `functions/lib/api/gearBundleReservationCreateHandler.js`

- Lines: `93`
- Size: `4181` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/users/userStatusCheck`
- Functions:
  - `handleGearBundleReservationCreate`
  - `norm`
  - `parseItems`

### `functions/lib/api/gearFavoriteToggleHandler.js`

- Lines: `96`
- Size: `4032` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `handleGearFavoriteToggle`

### `functions/lib/api/gearKayaksListHandler.js`

- Lines: `27`
- Size: `1144` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
- Functions:
  - `handleGearKayaksList`

### `functions/lib/api/gearMyReservationsHandler.js`

- Lines: `28`
- Size: `1221` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
- Functions:
  - `handleGearMyReservations`

### `functions/lib/api/gearReservationCancelHandler.js`

- Lines: `36`
- Size: `1476` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
- Functions:
  - `handleGearReservationCancel`
  - `norm`

### `functions/lib/api/gearReservationCreateHandler.js`

- Lines: `79`
- Size: `3702` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require firebase-functions/v2`
- Functions:
  - `asStringArray`
  - `handleGearReservationCreate`
  - `norm`

### `functions/lib/api/gearReservationUpdateHandler.js`

- Lines: `52`
- Size: `2243` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
- Functions:
  - `handleGearReservationUpdate`
  - `norm`

### `functions/lib/api/getAdminPendingHandler.js`

- Lines: `232`
- Size: `12217` bytes
- Internal dependencies:
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../service/service_config`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetAdminPending`
  - `norm`
  - `tsToIso`

### `functions/lib/api/getBasenGodzinyHandler.js`

- Lines: `50`
- Size: `2298` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_godziny_service.js`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
- Functions:
  - `handleGetBasenGodziny`

### `functions/lib/api/getBasenKarnetyHandler.js`

- Lines: `46`
- Size: `1832` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleGetBasenKarnety`

### `functions/lib/api/getBasenSessionsHandler.js`

- Lines: `65`
- Size: `3051` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../modules/basen/basen_service`
- Functions:
  - `handleGetBasenSessions`

### `functions/lib/api/getEventsHandler.js`

- Lines: `45`
- Size: `1922` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/events_service.js`
- Imports:
  - `import/require ../modules/calendar/events_service`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetEvents`

### `functions/lib/api/getGearFavoritesHandler.js`

- Lines: `47`
- Size: `2123` bytes
- Functions:
  - `handleGetGearFavorites`

### `functions/lib/api/getGearItemAvailabilityHandler.js`

- Lines: `63`
- Size: `2856` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
- Functions:
  - `getQueryString`
  - `handleGetGearItemAvailability`

### `functions/lib/api/getGearItemsHandler.js`

- Lines: `56`
- Size: `2377` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/shared/gear_catalog_service.js`
- Imports:
  - `import/require ../modules/equipment/shared/gear_catalog_service`
  - `import/require firebase-functions/v2`
- Functions:
  - `getCategoryFromRequest`
  - `handleGetGearItems`

### `functions/lib/api/getGearKayaksHandler.js`

- Lines: `130`
- Size: `6736` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/shared/gear_catalog_service.js`
- Imports:
  - `import/require ../modules/equipment/shared/gear_catalog_service`
  - `import/require firebase-functions/v2`
- Functions:
  - `getCategoryFromRequest`
  - `handleGetGearKayaks`
  - `loadReservedKayakIdsNow`
  - `pickKayak`
  - `toNumberSafe`
  - `todayIsoUTC`

### `functions/lib/api/getGodzinkiHandler.js`

- Lines: `125`
- Size: `6145` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
- Functions:
  - `handleGetGodzinki`
  - `serializeRecord`

### `functions/lib/api/getKayakReservationsHandler.js`

- Lines: `78`
- Size: `4306` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetKayakReservations`
  - `todayIsoUTC`

### `functions/lib/api/getKursantStatsHandler.js`

- Lines: `100`
- Size: `6050` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetKursantStats`

### `functions/lib/api/getKursInfoHandler.js`

- Lines: `99`
- Size: `4748` bytes
- Internal dependencies:
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../service/service_config`
  - `import/require firebase-functions/v2`
- Functions:
  - `flattenEmails`
  - `handleGetKursInfo`
  - `norm`

### `functions/lib/api/getModulesHandler.js`

- Lines: `224`
- Size: `8298` bytes
- Imports:
  - `import/require cors`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
  - `import/require firebase-functions/v2/https`
- Functions:
  - `deny`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedForRole`
  - `isAllowedHost`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`

### `functions/lib/api/godzinkiPurchaseHandler.js`

- Lines: `73`
- Size: `3300` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/users/userStatusCheck`
- Functions:
  - `handleGodzinkiPurchase`

### `functions/lib/api/kmAddLogHandler.js`

- Lines: `225`
- Size: `11216` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_log_service.js`
  - `functions/lib/modules/km/km_places_service.js`
  - `functions/lib/modules/km/km_vars.js`
- Imports:
  - `import/require ../modules/km/km_log_service`
  - `import/require ../modules/km/km_places_service`
  - `import/require ../modules/km/km_vars`
- Functions:
  - `handleKmAddLog`
  - `isIsoDate`
  - `norm`
  - `toSafeFloat`
  - `toSafeInt`

### `functions/lib/api/kmAdminMergePlacesHandler.js`

- Lines: `214`
- Size: `9076` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `batchUpdateLogs`
  - `handleKmAdminMergePlaces`
  - `norm`

### `functions/lib/api/kmEventStatsHandler.js`

- Lines: `99`
- Size: `4410` bytes
- Functions:
  - `handleKmEventStats`
  - `norm`

### `functions/lib/api/kmMapDataHandler.js`

- Lines: `59`
- Size: `2488` bytes
- Functions:
  - `handleKmMapData`

### `functions/lib/api/kmMyLogsHandler.js`

- Lines: `46`
- Size: `1839` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_log_service.js`
- Imports:
  - `import/require ../modules/km/km_log_service`
- Functions:
  - `handleKmMyLogs`

### `functions/lib/api/kmMyStatsHandler.js`

- Lines: `39`
- Size: `1406` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_log_service.js`
- Imports:
  - `import/require ../modules/km/km_log_service`
- Functions:
  - `handleKmMyStats`

### `functions/lib/api/kmPlacesHandler.js`

- Lines: `49`
- Size: `1862` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_places_service.js`
- Imports:
  - `import/require ../modules/km/km_places_service`
- Functions:
  - `handleKmPlaces`

### `functions/lib/api/kmRankingsHandler.js`

- Lines: `145`
- Size: `6045` bytes
- Functions:
  - `handleKmRankings`
  - `resolveOrderField`

### `functions/lib/api/registerUserHandler.js`

- Lines: `478`
- Size: `23307` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
- Functions:
  - `computeRoleKeyFromOpeningBalance`
  - `enqueueKmHistoricalMerge`
  - `findOpeningBalance`
  - `getObHours`
  - `handleRegisterUser`
  - `isDateNotInFuture`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `isProfileComplete`
  - `normalizeBool`
  - `normalizePhone`
  - `normalizePhoneDigits`
  - `normalizeStr`
  - `readProfileInput`
  - `validateIncomingProfile`

### `functions/lib/api/submitEventHandler.js`

- Lines: `77`
- Size: `3638` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/events_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/events_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleSubmitEvent`
  - `norm`

### `functions/lib/api/submitGodzinkiHandler.js`

- Lines: `98`
- Size: `4476` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/users/userStatusCheck`
- Functions:
  - `handleSubmitGodzinki`
  - `norm`

### `functions/lib/api/userWeightHandler.js`

- Lines: `67`
- Size: `3359` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `handleUserWeight`

### `functions/lib/index.js`

- Lines: `1098`
- Size: `42999` bytes
- Internal dependencies:
  - `functions/lib/api/adminEventsSyncCalendarHandler.js`
  - `functions/lib/api/basenAdminAddGodzinyHandler.js`
  - `functions/lib/api/basenAdminCorrectGodzinyHandler.js`
  - `functions/lib/api/basenAdminSearchUsersHandler.js`
  - `functions/lib/api/basenCancelEnrollmentHandler.js`
  - `functions/lib/api/basenCancelSessionHandler.js`
  - `functions/lib/api/basenCreateSessionHandler.js`
  - `functions/lib/api/basenEnrollHandler.js`
  - `functions/lib/api/basenGrantKarnetHandler.js`
  - `functions/lib/api/gearBundleReservationCreateHandler.js`
  - `functions/lib/api/gearFavoriteToggleHandler.js`
  - `functions/lib/api/gearMyReservationsHandler.js`
  - `functions/lib/api/gearReservationCancelHandler.js`
  - `functions/lib/api/gearReservationCreateHandler.js`
  - `functions/lib/api/gearReservationUpdateHandler.js`
  - `functions/lib/api/getAdminPendingHandler.js`
  - `functions/lib/api/getBasenGodzinyHandler.js`
  - `functions/lib/api/getBasenKarnetyHandler.js`
  - `functions/lib/api/getBasenSessionsHandler.js`
  - `functions/lib/api/getEventsHandler.js`
  - `functions/lib/api/getGearFavoritesHandler.js`
  - `functions/lib/api/getGearItemAvailabilityHandler.js`
  - `functions/lib/api/getGearItemsHandler.js`
  - `functions/lib/api/getGearKayaksHandler.js`
  - `functions/lib/api/getGodzinkiHandler.js`
  - `functions/lib/api/getKayakReservationsHandler.js`
  - `functions/lib/api/getKursInfoHandler.js`
  - `functions/lib/api/getKursantStatsHandler.js`
  - `functions/lib/api/godzinkiPurchaseHandler.js`
  - `functions/lib/api/kmAddLogHandler.js`
  - `functions/lib/api/kmAdminMergePlacesHandler.js`
  - `functions/lib/api/kmEventStatsHandler.js`
  - `functions/lib/api/kmMapDataHandler.js`
  - `functions/lib/api/kmMyLogsHandler.js`
  - `functions/lib/api/kmMyStatsHandler.js`
  - `functions/lib/api/kmPlacesHandler.js`
  - `functions/lib/api/kmRankingsHandler.js`
  - `functions/lib/api/registerUserHandler.js`
  - `functions/lib/api/submitEventHandler.js`
  - `functions/lib/api/submitGodzinkiHandler.js`
  - `functions/lib/api/userWeightHandler.js`
  - `functions/lib/service/admin/adminRunTask.js`
  - `functions/lib/service/runner.js`
  - `functions/lib/service/service_config.js`
  - `functions/lib/service/triggers/onUsersActiveCreated.js`
  - `functions/lib/service/worker/fallbackDailyWorker.js`
  - `functions/lib/service/worker/onJobCreatedWorker.js`
- Imports:
  - `import/require ./api/adminEventsSyncCalendarHandler`
  - `import/require ./api/basenAdminAddGodzinyHandler`
  - `import/require ./api/basenAdminCorrectGodzinyHandler`
  - `import/require ./api/basenAdminSearchUsersHandler`
  - `import/require ./api/basenCancelEnrollmentHandler`
  - `import/require ./api/basenCancelSessionHandler`
  - `import/require ./api/basenCreateSessionHandler`
  - `import/require ./api/basenEnrollHandler`
  - `import/require ./api/basenGrantKarnetHandler`
  - `import/require ./api/gearBundleReservationCreateHandler`
  - `import/require ./api/gearFavoriteToggleHandler`
  - `import/require ./api/gearMyReservationsHandler`
  - `import/require ./api/gearReservationCancelHandler`
  - `import/require ./api/gearReservationCreateHandler`
  - `import/require ./api/gearReservationUpdateHandler`
  - `import/require ./api/getAdminPendingHandler`
  - `import/require ./api/getBasenGodzinyHandler`
  - `import/require ./api/getBasenKarnetyHandler`
  - `import/require ./api/getBasenSessionsHandler`
  - `import/require ./api/getEventsHandler`
  - `import/require ./api/getGearFavoritesHandler`
  - `import/require ./api/getGearItemAvailabilityHandler`
  - `import/require ./api/getGearItemsHandler`
  - `import/require ./api/getGearKayaksHandler`
  - `import/require ./api/getGodzinkiHandler`
  - `import/require ./api/getKayakReservationsHandler`
  - `import/require ./api/getKursInfoHandler`
  - `import/require ./api/getKursantStatsHandler`
  - `import/require ./api/godzinkiPurchaseHandler`
  - `import/require ./api/kmAddLogHandler`
  - `import/require ./api/kmAdminMergePlacesHandler`
  - `import/require ./api/kmEventStatsHandler`
  - `import/require ./api/kmMapDataHandler`
  - `import/require ./api/kmMyLogsHandler`
  - `import/require ./api/kmMyStatsHandler`
  - `import/require ./api/kmPlacesHandler`
  - `import/require ./api/kmRankingsHandler`
  - `import/require ./api/registerUserHandler`
  - `import/require ./api/submitEventHandler`
  - `import/require ./api/submitGodzinkiHandler`
  - `import/require ./api/userWeightHandler`
  - `import/require ./service/admin/adminRunTask`
  - `import/require ./service/runner`
  - `import/require ./service/service_config`
  - `import/require ./service/triggers/onUsersActiveCreated`
  - `import/require ./service/worker/fallbackDailyWorker`
  - `import/require ./service/worker/onJobCreatedWorker`
  - `import/require cors`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
  - `import/require firebase-functions/v2/https`
  - `import/require firebase-functions/v2/scheduler`
- Functions:
  - `computeAllowedActions`
  - `defaultScreenForRoleKey`
  - `deny`
  - `enqueueBasenSessionCancelledNotify`
  - `enqueueEventSheetWrite`
  - `enqueueGodzinkiSheetWrite`
  - `enqueueMemberSheetSync`
  - `filterSetupForUser`
  - `flattenEmails`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedHost`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAdminEmail`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`

### `functions/lib/modules/basen/basen_godziny_service.js`

- Lines: `90`
- Size: `4003` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `adminAddBasenGodziny`
  - `adminCorrectBasenGodziny`
  - `computeBasenGodzinyBalance`
  - `getBasenGodzinyRecords`

### `functions/lib/modules/basen/basen_service.js`

- Lines: `337`
- Size: `14978` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `cancelEnrollment`
  - `cancelSession`
  - `createSession`
  - `enrollInSession`
  - `getActiveKarnet`
  - `getBasenVars`
  - `getUserEnrollments`
  - `getUserKarnety`
  - `grantKarnet`
  - `listUpcomingSessions`
  - `norm`
  - `parseVarValue`
  - `sessionDatetimeMs`
  - `todayIso`

### `functions/lib/modules/calendar/calendar_utils.js`

- Lines: `55`
- Size: `2112` bytes
- Functions:
  - `addDaysIso`
  - `computeBlockIso`
  - `daysOnWaterInclusive`
  - `isIsoDateYYYYMMDD`
  - `maxEndIsoByWeeks`
  - `overlapsIso`
  - `parseIsoToUtcDate`
  - `todayIsoUTC`

### `functions/lib/modules/calendar/events_service.js`

- Lines: `90`
- Size: `3318` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
- Imports:
  - `import/require ./calendar_utils`
- Functions:
  - `createEvent`
  - `listAllEvents`
  - `listRecentEvents`
  - `listUpcomingEvents`
  - `norm`

### `functions/lib/modules/equipment/bundle/gear_bundle_service.js`

- Lines: `686`
- Size: `34919` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/hours/hours_quote.js`
  - `functions/lib/modules/setup/setup_gear_vars.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../../calendar/calendar_utils`
  - `import/require ../../hours/godzinki_service`
  - `import/require ../../hours/godzinki_vars`
  - `import/require ../../hours/hours_quote`
  - `import/require ../../setup/setup_gear_vars`
  - `import/require ../../users/userStatusCheck`
  - `import/require ../kayaks/gear_kayaks_service`
- Functions:
  - `buildCostReason`
  - `buildNonKayakMeta`
  - `compositeId`
  - `computePrimaryItemIdx`
  - `computeReservationKind`
  - `countMyOverlappingBundleItems`
  - `createBundleReservation`
  - `fetchItemDetails`
  - `findBundleConflicts`
  - `getItemsWithAvailability`
  - `getReservedCompositeIdsForPeriod`
  - `getUserRole`
  - `isSupportedBundleCategory`
  - `listMyBundleReservations`
  - `norm`
  - `uniqBy`
  - `updateBundleReservationDates`
  - `updateGearReservationDates`

### `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`

- Lines: `334`
- Size: `16021` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/hours/hours_quote.js`
  - `functions/lib/modules/setup/setup_gear_vars.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../../calendar/calendar_utils`
  - `import/require ../../hours/godzinki_service`
  - `import/require ../../hours/godzinki_vars`
  - `import/require ../../hours/hours_quote`
  - `import/require ../../setup/setup_gear_vars`
  - `import/require ../../users/userStatusCheck`
- Functions:
  - `cancelReservation`
  - `countMyOverlappingItems`
  - `createReservation`
  - `findConflicts`
  - `getUserRole`
  - `listKayaks`
  - `listMyReservations`
  - `norm`
  - `uniq`
  - `updateReservationDates`

### `functions/lib/modules/equipment/shared/gear_catalog_service.js`

- Lines: `131`
- Size: `5686` bytes
- Functions:
  - `buildMeta`
  - `getCollectionConfig`
  - `isSupportedGearCategory`
  - `listGearItemsByCategory`
  - `norm`
  - `pickGearItem`
  - `toNumberSafe`

### `functions/lib/modules/hours/godzinki_service.js`

- Lines: `599`
- Size: `24787` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `computeBalance`
  - `computeNextExpiry`
  - `creditOpeningBalance`
  - `creditReservationAdjustment`
  - `deductHours`
  - `getAllRecords`
  - `getBalance`
  - `getHistory`
  - `getNextExpiry`
  - `getRecentEarnings`
  - `processApproval`
  - `refundHoursForReservation`
  - `submitEarning`
  - `submitPurchaseRequest`
  - `toDate`
  - `toTimestamp`

### `functions/lib/modules/hours/godzinki_vars.js`

- Lines: `20`
- Size: `816` bytes
- Functions:
  - `getGodzinkiVars`
  - `getVar`
  - `toNumber`

### `functions/lib/modules/hours/hours_quote.js`

- Lines: `16`
- Size: `703` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
- Imports:
  - `import/require ../calendar/calendar_utils`
- Functions:
  - `quoteKayaksCostHours`

### `functions/lib/modules/km/km_log_service.js`

- Lines: `253`
- Size: `10702` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_scoring.js`
- Imports:
  - `import/require ./km_scoring`
  - `import/require firebase-admin`
- Functions:
  - `addKmLog`
  - `getUserKmLogs`
  - `getUserKmStats`
  - `updateUserStatsWriteInTransaction`

### `functions/lib/modules/km/km_places_service.js`

- Lines: `178`
- Size: `6535` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `searchKmPlaces`
  - `tokenizeName`
  - `upsertKmPlace`

### `functions/lib/modules/km/km_scoring.js`

- Lines: `41`
- Size: `1422` bytes
- Functions:
  - `computePoints`
  - `getSeasonKeyFromDate`
  - `getYearFromDate`

### `functions/lib/modules/km/km_vars.js`

- Lines: `33`
- Size: `1252` bytes
- Functions:
  - `getKmVars`
  - `getVar`
  - `toNumber`

### `functions/lib/modules/setup/setup_gear_vars.js`

- Lines: `57`
- Size: `2271` bytes
- Functions:
  - `getGearVars`
  - `getVar`
  - `roleMaxItems`
  - `roleMaxWeeks`
  - `toBool`
  - `toNumber`

### `functions/lib/modules/users/userStatusCheck.js`

- Lines: `36`
- Size: `1576` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `isUserStatusBlocked`

### `functions/lib/service/admin/adminRunTask.js`

- Lines: `79`
- Size: `3375` bytes
- Internal dependencies:
  - `functions/lib/service/runner.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../runner`
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/https`
- Functions:
  - `verifyIdToken`

### `functions/lib/service/providers/googleAuth.js`

- Lines: `97`
- Size: `3818` bytes
- Imports:
  - `import/require googleapis`
- Functions:
  - `exchangeJwtForAccessToken`
  - `getDelegatedAuth`
  - `nowSeconds`
  - `signJwtWithIamCredentials`

### `functions/lib/service/providers/googleCalendarProvider.js`

- Lines: `58`
- Size: `2210` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleAuth.js`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleCalendarProvider`
- Functions:
  - `addOneDay`
  - `buildEventBody`

### `functions/lib/service/providers/googleSheetsProvider.js`

- Lines: `267`
- Size: `11986` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleAuth.js`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleSheetsProvider`
- Functions:
  - `assertNonEmpty`
  - `buildRowValues`
  - `columnToA1`
  - `normalizeStr`
  - `quoteTab`

### `functions/lib/service/providers/googleWorkspaceProvider.js`

- Lines: `387`
- Size: `17333` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleAuth.js`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleWorkspaceProvider`
- Functions:
  - `assertLooksLikeEmail`
  - `encodeMimeHeader`
  - `normalizeEmail`

### `functions/lib/service/registry.js`

- Lines: `49`
- Size: `2560` bytes
- Internal dependencies:
  - `functions/lib/service/tasks/basenNotifySessionCancelled.js`
  - `functions/lib/service/tasks/eventsSyncCalendar.js`
  - `functions/lib/service/tasks/eventsSyncFromSheet.js`
  - `functions/lib/service/tasks/gearPrivateStorage.js`
  - `functions/lib/service/tasks/gearSyncKayaksFromSheet.js`
  - `functions/lib/service/tasks/godzinkiSyncFromSheet.js`
  - `functions/lib/service/tasks/kmMergeHistoricalUser.js`
  - `functions/lib/service/tasks/kmRebuildMapData.js`
  - `functions/lib/service/tasks/kmRebuildRankings.js`
  - `functions/lib/service/tasks/kmRebuildUserStats.js`
  - `functions/lib/service/tasks/kursSyncFromSheet.js`
  - `functions/lib/service/tasks/listaEnforcePostingPolicy.js`
  - `functions/lib/service/tasks/membersSyncToSheet.js`
  - `functions/lib/service/tasks/onUserRegisteredWelcome.js`
  - `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`
  - `functions/lib/service/tasks/usersSyncRolesFromSheet.js`
- Imports:
  - `import/require ./tasks/basenNotifySessionCancelled`
  - `import/require ./tasks/eventsSyncCalendar`
  - `import/require ./tasks/eventsSyncFromSheet`
  - `import/require ./tasks/gearPrivateStorage`
  - `import/require ./tasks/gearSyncKayaksFromSheet`
  - `import/require ./tasks/godzinkiSyncFromSheet`
  - `import/require ./tasks/kmMergeHistoricalUser`
  - `import/require ./tasks/kmRebuildMapData`
  - `import/require ./tasks/kmRebuildRankings`
  - `import/require ./tasks/kmRebuildUserStats`
  - `import/require ./tasks/kursSyncFromSheet`
  - `import/require ./tasks/listaEnforcePostingPolicy`
  - `import/require ./tasks/membersSyncToSheet`
  - `import/require ./tasks/onUserRegisteredWelcome`
  - `import/require ./tasks/usersSyncFunctionRolesFromSetup`
  - `import/require ./tasks/usersSyncRolesFromSheet`
- Functions:
  - `getTaskRegistry`

### `functions/lib/service/runner.js`

- Lines: `105`
- Size: `4813` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleWorkspaceProvider.js`
  - `functions/lib/service/registry.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ./providers/googleWorkspaceProvider`
  - `import/require ./registry`
  - `import/require ./service_config`
  - `import/require firebase-admin`
- Functions:
  - `runTaskById`
  - `safeError`
  - `truncate`

### `functions/lib/service/service_config.js`

- Lines: `254`
- Size: `13065` bytes
- Imports:
  - `import/require firebase-functions`
- Functions:
  - `getServiceConfig`

### `functions/lib/service/tasks/basenNotifySessionCancelled.js`

- Lines: `86`
- Size: `3817` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../../modules/basen/basen_service`
- Functions:
  - `norm`

### `functions/lib/service/tasks/eventsSyncCalendar.js`

- Lines: `102`
- Size: `5176` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleCalendarProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../service_config`
- Functions:
  - `norm`

### `functions/lib/service/tasks/eventsSyncFromSheet.js`

- Lines: `265`
- Size: `12449` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleCalendarProvider.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `isApproved`
  - `norm`
  - `normDate`

### `functions/lib/service/tasks/gearPrivateStorage.js`

- Lines: `286`
- Size: `13681` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/setup/setup_gear_vars.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/setup_gear_vars`
  - `import/require firebase-admin`
- Functions:
  - `firstChargeableMonth`
  - `isChargeableThisMonth`
  - `norm`
  - `toYearMonth`

### `functions/lib/service/tasks/gearSyncKayaksFromSheet.js`

- Lines: `171`
- Size: `7685` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `norm`
  - `parseBool`
  - `parseNumber`

### `functions/lib/service/tasks/godzinkiSyncFromSheet.js`

- Lines: `212`
- Size: `10429` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `isApproved`
  - `norm`

### `functions/lib/service/tasks/kmMergeHistoricalUser.js`

- Lines: `151`
- Size: `6813` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/lib/service/tasks/kmRebuildMapData.js`

- Lines: `150`
- Size: `6277` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `resolveDisplayName`

### `functions/lib/service/tasks/kmRebuildRankings.js`

- Lines: `77`
- Size: `3211` bytes
- Internal dependencies:
  - `functions/lib/service/tasks/kmRebuildUserStats.js`
- Imports:
  - `import/require ./kmRebuildUserStats`

### `functions/lib/service/tasks/kmRebuildUserStats.js`

- Lines: `218`
- Size: `10433` bytes
- Internal dependencies:
  - `functions/lib/modules/km/km_scoring.js`
  - `functions/lib/modules/km/km_vars.js`
- Imports:
  - `import/require ../../modules/km/km_scoring`
  - `import/require ../../modules/km/km_vars`
  - `import/require firebase-admin`
- Functions:
  - `flushBatch`
  - `norm`

### `functions/lib/service/tasks/kursSyncFromSheet.js`

- Lines: `96`
- Size: `4094` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
- Functions:
  - `norm`
  - `normDate`
  - `parseBool`

### `functions/lib/service/tasks/listaEnforcePostingPolicy.js`

- Lines: `39`
- Size: `1495` bytes

### `functions/lib/service/tasks/membersSyncToSheet.js`

- Lines: `181`
- Size: `9070` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `ensureMemberId`
  - `formatDatePL`
  - `norm`
  - `roleLabel`
  - `statusLabel`
  - `toDateSafe`

### `functions/lib/service/tasks/onUserRegisteredWelcome.js`

- Lines: `255`
- Size: `13250` bytes
- Functions:
  - `asErr`
  - `assertString`
  - `listaRoleForUserRole`

### `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`

- Lines: `448`
- Size: `21670` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `buildAdminAlertBody`
  - `buildAdminOffboardingBody`
  - `buildAdminOnboardingBody`
  - `buildOperatorOffboardingBody`
  - `buildOperatorWaitBody`
  - `buildOperatorWelcomeTemplate`
  - `decideCase`
  - `operatorHandle`
  - `parseSingleEmail`

### `functions/lib/service/tasks/usersSyncRolesFromSheet.js`

- Lines: `390`
- Size: `19617` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/providers/googleWorkspaceProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../providers/googleWorkspaceProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `buildInvertedLabelMap`
  - `listaRoleForUserRole`
  - `norm`
  - `syncWorkspaceGroupsForUser`

### `functions/lib/service/triggers/onUsersActiveCreated.js`

- Lines: `79`
- Size: `3426` bytes
- Internal dependencies:
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/firestore`
- Functions:
  - `jobIdForWelcome`

### `functions/lib/service/types.js`

- Lines: `3`
- Size: `110` bytes

### `functions/lib/service/worker/fallbackDailyWorker.js`

- Lines: `65`
- Size: `2690` bytes
- Internal dependencies:
  - `functions/lib/service/service_config.js`
  - `functions/lib/service/worker/jobProcessor.js`
- Imports:
  - `import/require ../service_config`
  - `import/require ./jobProcessor`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/scheduler`

### `functions/lib/service/worker/jobProcessor.js`

- Lines: `140`
- Size: `5667` bytes
- Internal dependencies:
  - `functions/lib/service/runner.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../runner`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `addSeconds`
  - `errInfo`
  - `processJobDoc`

### `functions/lib/service/worker/onJobCreatedWorker.js`

- Lines: `19`
- Size: `891` bytes
- Internal dependencies:
  - `functions/lib/service/worker/jobProcessor.js`
- Imports:
  - `import/require ./jobProcessor`
  - `import/require firebase-functions/v2/firestore`

### `functions/scripts/enqueueListaPolicy.js`

- Lines: `37`
- Size: `1213` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/src/api/adminEventsSyncCalendarHandler.ts`

- Lines: `72`
- Size: `2320` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleAdminEventsSyncCalendar`

### `functions/src/api/basenAdminAddGodzinyHandler.ts`

- Lines: `85`
- Size: `2819` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_godziny_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
  - `import/require express`
- Functions:
  - `handleBasenAdminAddGodziny`

### `functions/src/api/basenAdminCorrectGodzinyHandler.ts`

- Lines: `86`
- Size: `2958` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_godziny_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
  - `import/require express`
- Functions:
  - `handleBasenAdminCorrectGodziny`

### `functions/src/api/basenAdminSearchUsersHandler.ts`

- Lines: `87`
- Size: `2900` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleBasenAdminSearchUsers`

### `functions/src/api/basenCancelEnrollmentHandler.ts`

- Lines: `59`
- Size: `1942` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCancelEnrollment`

### `functions/src/api/basenCancelSessionHandler.ts`

- Lines: `73`
- Size: `2452` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCancelSession`

### `functions/src/api/basenCreateSessionHandler.ts`

- Lines: `87`
- Size: `2899` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCreateSession`

### `functions/src/api/basenEnrollHandler.ts`

- Lines: `111`
- Size: `3945` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
- Functions:
  - `handleBasenEnroll`

### `functions/src/api/basenGrantKarnetHandler.ts`

- Lines: `85`
- Size: `2976` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenGrantKarnet`

### `functions/src/api/gearBundleReservationCreateHandler.ts`

- Lines: `117`
- Size: `3924` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
- Functions:
  - `handleGearBundleReservationCreate`
  - `norm`
  - `parseItems`

### `functions/src/api/gearFavoriteToggleHandler.ts`

- Lines: `83`
- Size: `2547` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `handleGearFavoriteToggle`

### `functions/src/api/gearKayaksListHandler.ts`

- Lines: `39`
- Size: `1307` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require express`
- Functions:
  - `handleGearKayaksList`

### `functions/src/api/gearMyReservationsHandler.ts`

- Lines: `41`
- Size: `1383` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require express`
- Functions:
  - `handleGearMyReservations`

### `functions/src/api/gearReservationCancelHandler.ts`

- Lines: `52`
- Size: `1621` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require express`
- Functions:
  - `handleGearReservationCancel`
  - `norm`

### `functions/src/api/gearReservationCreateHandler.ts`

- Lines: `98`
- Size: `3354` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `asStringArray`
  - `handleGearReservationCreate`
  - `norm`

### `functions/src/api/gearReservationUpdateHandler.ts`

- Lines: `69`
- Size: `2244` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require express`
- Functions:
  - `handleGearReservationUpdate`
  - `norm`

### `functions/src/api/getAdminPendingHandler.ts`

- Lines: `296`
- Size: `10001` bytes
- Internal dependencies:
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../service/service_config`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetAdminPending`
  - `norm`
  - `tsToIso`

### `functions/src/api/getBasenGodzinyHandler.ts`

- Lines: `62`
- Size: `2235` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_godziny_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_godziny_service`
  - `import/require express`
- Functions:
  - `handleGetBasenGodziny`

### `functions/src/api/getBasenKarnetyHandler.ts`

- Lines: `55`
- Size: `1813` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleGetBasenKarnety`

### `functions/src/api/getBasenSessionsHandler.ts`

- Lines: `75`
- Size: `2706` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleGetBasenSessions`

### `functions/src/api/getEventsHandler.ts`

- Lines: `59`
- Size: `1897` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/events_service.ts`
- Imports:
  - `import/require ../modules/calendar/events_service`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetEvents`

### `functions/src/api/getGearFavoritesHandler.ts`

- Lines: `67`
- Size: `2096` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleGetGearFavorites`

### `functions/src/api/getGearItemAvailabilityHandler.ts`

- Lines: `82`
- Size: `2743` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require express`
- Functions:
  - `getQueryString`
  - `handleGetGearItemAvailability`

### `functions/src/api/getGearItemsHandler.ts`

- Lines: `80`
- Size: `2302` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/shared/gear_catalog_service.ts`
- Imports:
  - `import/require ../modules/equipment/shared/gear_catalog_service`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `getCategoryFromRequest`
  - `handleGetGearItems`

### `functions/src/api/getGearKayaksHandler.ts`

- Lines: `166`
- Size: `5073` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `getCategoryFromRequest`
  - `handleGetGearKayaks`
  - `loadReservedKayakIdsNow`
  - `pickKayak`
  - `toNumberSafe`
  - `todayIsoUTC`

### `functions/src/api/getGodzinkiHandler.ts`

- Lines: `146`
- Size: `5191` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require express`
- Functions:
  - `handleGetGodzinki`
  - `serializeRecord`

### `functions/src/api/getKayakReservationsHandler.ts`

- Lines: `114`
- Size: `3520` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetKayakReservations`
  - `todayIsoUTC`

### `functions/src/api/getKursantStatsHandler.ts`

- Lines: `128`
- Size: `4598` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleGetKursantStats`

### `functions/src/api/getKursInfoHandler.ts`

- Lines: `124`
- Size: `4197` bytes
- Internal dependencies:
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../service/service_config`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `flattenEmails`
  - `handleGetKursInfo`
  - `norm`

### `functions/src/api/godzinkiPurchaseHandler.ts`

- Lines: `93`
- Size: `3225` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
- Functions:
  - `handleGodzinkiPurchase`

### `functions/src/api/kmAddLogHandler.ts`

- Lines: `260`
- Size: `9788` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_log_service.ts`
  - `functions/src/modules/km/km_places_service.ts`
  - `functions/src/modules/km/km_vars.ts`
- Imports:
  - `import/require ../modules/km/km_log_service`
  - `import/require ../modules/km/km_places_service`
  - `import/require ../modules/km/km_vars`
  - `import/require express`
- Functions:
  - `handleKmAddLog`
  - `isIsoDate`
  - `norm`
  - `toSafeFloat`
  - `toSafeInt`

### `functions/src/api/kmAdminMergePlacesHandler.ts`

- Lines: `219`
- Size: `7277` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `batchUpdateLogs`
  - `handleKmAdminMergePlaces`
  - `norm`

### `functions/src/api/kmEventStatsHandler.ts`

- Lines: `141`
- Size: `4444` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleKmEventStats`
  - `norm`

### `functions/src/api/kmMapDataHandler.ts`

- Lines: `73`
- Size: `2306` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleKmMapData`

### `functions/src/api/kmMyLogsHandler.ts`

- Lines: `65`
- Size: `2005` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_log_service.ts`
- Imports:
  - `import/require ../modules/km/km_log_service`
  - `import/require express`
- Functions:
  - `handleKmMyLogs`

### `functions/src/api/kmMyStatsHandler.ts`

- Lines: `57`
- Size: `1589` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_log_service.ts`
- Imports:
  - `import/require ../modules/km/km_log_service`
  - `import/require express`
- Functions:
  - `handleKmMyStats`

### `functions/src/api/kmPlacesHandler.ts`

- Lines: `69`
- Size: `2000` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_places_service.ts`
- Imports:
  - `import/require ../modules/km/km_places_service`
  - `import/require express`
- Functions:
  - `handleKmPlaces`

### `functions/src/api/kmRankingsHandler.ts`

- Lines: `163`
- Size: `5432` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleKmRankings`
  - `resolveOrderField`

### `functions/src/api/registerUserHandler.ts`

- Lines: `609`
- Size: `21924` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `computeRoleKeyFromOpeningBalance`
  - `enqueueKmHistoricalMerge`
  - `findOpeningBalance`
  - `getObHours`
  - `handleRegisterUser`
  - `isDateNotInFuture`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `isProfileComplete`
  - `normalizeBool`
  - `normalizePhone`
  - `normalizePhoneDigits`
  - `normalizeStr`
  - `readProfileInput`
  - `validateIncomingProfile`

### `functions/src/api/submitEventHandler.ts`

- Lines: `113`
- Size: `3431` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/events_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/events_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleSubmitEvent`
  - `norm`

### `functions/src/api/submitGodzinkiHandler.ts`

- Lines: `116`
- Size: `4229` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
- Functions:
  - `handleSubmitGodzinki`
  - `norm`

### `functions/src/api/userWeightHandler.ts`

- Lines: `94`
- Size: `3089` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleUserWeight`

### `functions/src/index.ts`

- Lines: `1224`
- Size: `36031` bytes
- Internal dependencies:
  - `functions/src/api/adminEventsSyncCalendarHandler.ts`
  - `functions/src/api/basenAdminAddGodzinyHandler.ts`
  - `functions/src/api/basenAdminCorrectGodzinyHandler.ts`
  - `functions/src/api/basenAdminSearchUsersHandler.ts`
  - `functions/src/api/basenCancelEnrollmentHandler.ts`
  - `functions/src/api/basenCancelSessionHandler.ts`
  - `functions/src/api/basenCreateSessionHandler.ts`
  - `functions/src/api/basenEnrollHandler.ts`
  - `functions/src/api/basenGrantKarnetHandler.ts`
  - `functions/src/api/gearBundleReservationCreateHandler.ts`
  - `functions/src/api/gearFavoriteToggleHandler.ts`
  - `functions/src/api/gearMyReservationsHandler.ts`
  - `functions/src/api/gearReservationCancelHandler.ts`
  - `functions/src/api/gearReservationCreateHandler.ts`
  - `functions/src/api/gearReservationUpdateHandler.ts`
  - `functions/src/api/getAdminPendingHandler.ts`
  - `functions/src/api/getBasenGodzinyHandler.ts`
  - `functions/src/api/getBasenKarnetyHandler.ts`
  - `functions/src/api/getBasenSessionsHandler.ts`
  - `functions/src/api/getEventsHandler.ts`
  - `functions/src/api/getGearFavoritesHandler.ts`
  - `functions/src/api/getGearItemAvailabilityHandler.ts`
  - `functions/src/api/getGearItemsHandler.ts`
  - `functions/src/api/getGearKayaksHandler.ts`
  - `functions/src/api/getGodzinkiHandler.ts`
  - `functions/src/api/getKayakReservationsHandler.ts`
  - `functions/src/api/getKursInfoHandler.ts`
  - `functions/src/api/getKursantStatsHandler.ts`
  - `functions/src/api/godzinkiPurchaseHandler.ts`
  - `functions/src/api/kmAddLogHandler.ts`
  - `functions/src/api/kmAdminMergePlacesHandler.ts`
  - `functions/src/api/kmEventStatsHandler.ts`
  - `functions/src/api/kmMapDataHandler.ts`
  - `functions/src/api/kmMyLogsHandler.ts`
  - `functions/src/api/kmMyStatsHandler.ts`
  - `functions/src/api/kmPlacesHandler.ts`
  - `functions/src/api/kmRankingsHandler.ts`
  - `functions/src/api/registerUserHandler.ts`
  - `functions/src/api/submitEventHandler.ts`
  - `functions/src/api/submitGodzinkiHandler.ts`
  - `functions/src/api/userWeightHandler.ts`
  - `functions/src/service/admin/adminRunTask.ts`
  - `functions/src/service/runner.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/triggers/onUsersActiveCreated.ts`
  - `functions/src/service/worker/fallbackDailyWorker.ts`
  - `functions/src/service/worker/onJobCreatedWorker.ts`
- Imports:
  - `import/require ./api/adminEventsSyncCalendarHandler`
  - `import/require ./api/basenAdminAddGodzinyHandler`
  - `import/require ./api/basenAdminCorrectGodzinyHandler`
  - `import/require ./api/basenAdminSearchUsersHandler`
  - `import/require ./api/basenCancelEnrollmentHandler`
  - `import/require ./api/basenCancelSessionHandler`
  - `import/require ./api/basenCreateSessionHandler`
  - `import/require ./api/basenEnrollHandler`
  - `import/require ./api/basenGrantKarnetHandler`
  - `import/require ./api/gearBundleReservationCreateHandler`
  - `import/require ./api/gearFavoriteToggleHandler`
  - `import/require ./api/gearMyReservationsHandler`
  - `import/require ./api/gearReservationCancelHandler`
  - `import/require ./api/gearReservationCreateHandler`
  - `import/require ./api/gearReservationUpdateHandler`
  - `import/require ./api/getAdminPendingHandler`
  - `import/require ./api/getBasenGodzinyHandler`
  - `import/require ./api/getBasenKarnetyHandler`
  - `import/require ./api/getBasenSessionsHandler`
  - `import/require ./api/getEventsHandler`
  - `import/require ./api/getGearFavoritesHandler`
  - `import/require ./api/getGearItemAvailabilityHandler`
  - `import/require ./api/getGearItemsHandler`
  - `import/require ./api/getGearKayaksHandler`
  - `import/require ./api/getGodzinkiHandler`
  - `import/require ./api/getKayakReservationsHandler`
  - `import/require ./api/getKursInfoHandler`
  - `import/require ./api/getKursantStatsHandler`
  - `import/require ./api/godzinkiPurchaseHandler`
  - `import/require ./api/kmAddLogHandler`
  - `import/require ./api/kmAdminMergePlacesHandler`
  - `import/require ./api/kmEventStatsHandler`
  - `import/require ./api/kmMapDataHandler`
  - `import/require ./api/kmMyLogsHandler`
  - `import/require ./api/kmMyStatsHandler`
  - `import/require ./api/kmPlacesHandler`
  - `import/require ./api/kmRankingsHandler`
  - `import/require ./api/registerUserHandler`
  - `import/require ./api/submitEventHandler`
  - `import/require ./api/submitGodzinkiHandler`
  - `import/require ./api/userWeightHandler`
  - `import/require ./service/admin/adminRunTask`
  - `import/require ./service/runner`
  - `import/require ./service/service_config`
  - `import/require ./service/triggers/onUsersActiveCreated`
  - `import/require ./service/worker/fallbackDailyWorker`
  - `import/require ./service/worker/onJobCreatedWorker`
  - `import/require cors`
  - `import/require express`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
  - `import/require firebase-functions/v2/https`
  - `import/require firebase-functions/v2/scheduler`
- Functions:
  - `computeAllowedActions`
  - `defaultScreenForRoleKey`
  - `deny`
  - `enqueueBasenSessionCancelledNotify`
  - `enqueueEventSheetWrite`
  - `enqueueGodzinkiSheetWrite`
  - `enqueueMemberSheetSync`
  - `filterSetupForUser`
  - `flattenEmails`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedHost`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAdminEmail`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`

### `functions/src/modules/basen/basen_godziny_service.ts`

- Lines: `99`
- Size: `3320` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `adminAddBasenGodziny`
  - `adminCorrectBasenGodziny`
  - `computeBasenGodzinyBalance`
  - `getBasenGodzinyRecords`

### `functions/src/modules/basen/basen_service.ts`

- Lines: `454`
- Size: `14570` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `cancelEnrollment`
  - `cancelSession`
  - `createSession`
  - `enrollInSession`
  - `getActiveKarnet`
  - `getBasenVars`
  - `getUserEnrollments`
  - `getUserKarnety`
  - `grantKarnet`
  - `listUpcomingSessions`
  - `norm`
  - `parseVarValue`
  - `sessionDatetimeMs`
  - `todayIso`

### `functions/src/modules/calendar/calendar_utils.ts`

- Lines: `52`
- Size: `1826` bytes
- Functions:
  - `addDaysIso`
  - `computeBlockIso`
  - `daysOnWaterInclusive`
  - `isIsoDateYYYYMMDD`
  - `maxEndIsoByWeeks`
  - `overlapsIso`
  - `parseIsoToUtcDate`
  - `todayIsoUTC`

### `functions/src/modules/calendar/events_service.ts`

- Lines: `131`
- Size: `3705` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
- Imports:
  - `import/require ./calendar_utils`
- Functions:
  - `createEvent`
  - `listAllEvents`
  - `listRecentEvents`
  - `listUpcomingEvents`
  - `norm`

### `functions/src/modules/equipment/bundle/gear_bundle_service.ts`

- Lines: `851`
- Size: `31225` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/hours/hours_quote.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../../calendar/calendar_utils`
  - `import/require ../../hours/godzinki_service`
  - `import/require ../../hours/godzinki_vars`
  - `import/require ../../hours/hours_quote`
  - `import/require ../../setup/setup_gear_vars`
  - `import/require ../../users/userStatusCheck`
  - `import/require ../kayaks/gear_kayaks_service`
- Functions:
  - `buildCostReason`
  - `buildNonKayakMeta`
  - `compositeId`
  - `computePrimaryItemIdx`
  - `computeReservationKind`
  - `countMyOverlappingBundleItems`
  - `createBundleReservation`
  - `fetchItemDetails`
  - `findBundleConflicts`
  - `getItemsWithAvailability`
  - `getReservedCompositeIdsForPeriod`
  - `getUserRole`
  - `isSupportedBundleCategory`
  - `listMyBundleReservations`
  - `norm`
  - `updateBundleReservationDates`
  - `updateGearReservationDates`

### `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`

- Lines: `421`
- Size: `13912` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/hours/hours_quote.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../../calendar/calendar_utils`
  - `import/require ../../hours/godzinki_service`
  - `import/require ../../hours/godzinki_vars`
  - `import/require ../../hours/hours_quote`
  - `import/require ../../setup/setup_gear_vars`
  - `import/require ../../users/userStatusCheck`
- Functions:
  - `cancelReservation`
  - `countMyOverlappingItems`
  - `createReservation`
  - `findConflicts`
  - `getUserRole`
  - `listKayaks`
  - `listMyReservations`
  - `norm`
  - `uniq`
  - `updateReservationDates`

### `functions/src/modules/equipment/shared/gear_catalog_service.ts`

- Lines: `156`
- Size: `3737` bytes
- Functions:
  - `buildMeta`
  - `getCollectionConfig`
  - `isSupportedGearCategory`
  - `listGearItemsByCategory`
  - `norm`
  - `pickGearItem`
  - `toNumberSafe`

### `functions/src/modules/hours/godzinki_service.ts`

- Lines: `730`
- Size: `24391` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_vars.ts`
- Imports:
  - `import/require ./godzinki_vars`
  - `import/require firebase-admin`
- Functions:
  - `computeBalance`
  - `computeNextExpiry`
  - `creditOpeningBalance`
  - `creditReservationAdjustment`
  - `deductHours`
  - `getAllRecords`
  - `getBalance`
  - `getHistory`
  - `getNextExpiry`
  - `getRecentEarnings`
  - `processApproval`
  - `refundHoursForReservation`
  - `submitEarning`
  - `submitPurchaseRequest`
  - `toDate`
  - `toTimestamp`

### `functions/src/modules/hours/godzinki_vars.ts`

- Lines: `30`
- Size: `935` bytes
- Functions:
  - `getGodzinkiVars`
  - `getVar`
  - `toNumber`

### `functions/src/modules/hours/hours_quote.ts`

- Lines: `15`
- Size: `586` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
- Imports:
  - `import/require ../calendar/calendar_utils`
  - `import/require ../setup/setup_gear_vars`
- Functions:
  - `quoteKayaksCostHours`

### `functions/src/modules/km/km_log_service.ts`

- Lines: `298`
- Size: `10212` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_scoring.ts`
  - `functions/src/modules/km/km_vars.ts`
- Imports:
  - `import/require ./km_scoring`
  - `import/require ./km_vars`
  - `import/require firebase-admin`
- Functions:
  - `addKmLog`
  - `getUserKmLogs`
  - `getUserKmStats`
  - `updateUserStatsWriteInTransaction`

### `functions/src/modules/km/km_places_service.ts`

- Lines: `153`
- Size: `4825` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `searchKmPlaces`
  - `tokenizeName`
  - `upsertKmPlace`

### `functions/src/modules/km/km_scoring.ts`

- Lines: `62`
- Size: `1536` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_vars.ts`
- Imports:
  - `import/require ./km_vars`
- Functions:
  - `computePoints`
  - `getSeasonKeyFromDate`
  - `getYearFromDate`

### `functions/src/modules/km/km_vars.ts`

- Lines: `44`
- Size: `1245` bytes
- Functions:
  - `getKmVars`
  - `getVar`
  - `toNumber`

### `functions/src/modules/setup/setup_gear_vars.ts`

- Lines: `74`
- Size: `2437` bytes
- Functions:
  - `getGearVars`
  - `getVar`
  - `roleMaxItems`
  - `roleMaxWeeks`
  - `toBool`
  - `toNumber`

### `functions/src/modules/users/userStatusCheck.ts`

- Lines: `40`
- Size: `1214` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `isUserStatusBlocked`

### `functions/src/service/admin/adminRunTask.ts`

- Lines: `51`
- Size: `1694` bytes
- Internal dependencies:
  - `functions/src/service/runner.ts`
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../runner`
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/https`
- Functions:
  - `verifyIdToken`

### `functions/src/service/providers/googleAuth.ts`

- Lines: `136`
- Size: `3573` bytes
- Imports:
  - `import/require googleapis`
- Functions:
  - `exchangeJwtForAccessToken`
  - `getDelegatedAuth`
  - `nowSeconds`
  - `signJwtWithIamCredentials`

### `functions/src/service/providers/googleCalendarProvider.ts`

- Lines: `66`
- Size: `2153` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleAuth.ts`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleCalendarProvider`
- Functions:
  - `addOneDay`
  - `buildEventBody`

### `functions/src/service/providers/googleSheetsProvider.ts`

- Lines: `339`
- Size: `11048` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleAuth.ts`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleSheetsProvider`
- Functions:
  - `assertNonEmpty`
  - `columnToA1`
  - `normalizeStr`
  - `quoteTab`

### `functions/src/service/providers/googleWorkspaceProvider.ts`

- Lines: `455`
- Size: `15356` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleAuth.ts`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleWorkspaceProvider`
- Functions:
  - `assertLooksLikeEmail`
  - `encodeMimeHeader`
  - `normalizeEmail`

### `functions/src/service/registry.ts`

- Lines: `48`
- Size: `2087` bytes
- Internal dependencies:
  - `functions/src/service/tasks/basenNotifySessionCancelled.ts`
  - `functions/src/service/tasks/eventsSyncCalendar.ts`
  - `functions/src/service/tasks/eventsSyncFromSheet.ts`
  - `functions/src/service/tasks/gearPrivateStorage.ts`
  - `functions/src/service/tasks/gearSyncKayaksFromSheet.ts`
  - `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
  - `functions/src/service/tasks/kmMergeHistoricalUser.ts`
  - `functions/src/service/tasks/kmRebuildMapData.ts`
  - `functions/src/service/tasks/kmRebuildRankings.ts`
  - `functions/src/service/tasks/kmRebuildUserStats.ts`
  - `functions/src/service/tasks/kursSyncFromSheet.ts`
  - `functions/src/service/tasks/listaEnforcePostingPolicy.ts`
  - `functions/src/service/tasks/membersSyncToSheet.ts`
  - `functions/src/service/tasks/onUserRegisteredWelcome.ts`
  - `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`
  - `functions/src/service/tasks/usersSyncRolesFromSheet.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ./tasks/basenNotifySessionCancelled`
  - `import/require ./tasks/eventsSyncCalendar`
  - `import/require ./tasks/eventsSyncFromSheet`
  - `import/require ./tasks/gearPrivateStorage`
  - `import/require ./tasks/gearSyncKayaksFromSheet`
  - `import/require ./tasks/godzinkiSyncFromSheet`
  - `import/require ./tasks/kmMergeHistoricalUser`
  - `import/require ./tasks/kmRebuildMapData`
  - `import/require ./tasks/kmRebuildRankings`
  - `import/require ./tasks/kmRebuildUserStats`
  - `import/require ./tasks/kursSyncFromSheet`
  - `import/require ./tasks/listaEnforcePostingPolicy`
  - `import/require ./tasks/membersSyncToSheet`
  - `import/require ./tasks/onUserRegisteredWelcome`
  - `import/require ./tasks/usersSyncFunctionRolesFromSetup`
  - `import/require ./tasks/usersSyncRolesFromSheet`
  - `import/require ./types`
- Functions:
  - `getTaskRegistry`

### `functions/src/service/runner.ts`

- Lines: `80`
- Size: `2555` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleWorkspaceProvider.ts`
  - `functions/src/service/registry.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ./providers/googleWorkspaceProvider`
  - `import/require ./registry`
  - `import/require ./service_config`
  - `import/require ./types`
  - `import/require firebase-admin`
- Functions:
  - `runTaskById`
  - `safeError`
  - `truncate`

### `functions/src/service/service_config.ts`

- Lines: `345`
- Size: `12702` bytes
- Imports:
  - `import/require firebase-functions`
- Functions:
  - `getServiceConfig`

### `functions/src/service/tasks/basenNotifySessionCancelled.ts`

- Lines: `103`
- Size: `3023` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/basen/basen_service`
  - `import/require ../types`
- Functions:
  - `norm`

### `functions/src/service/tasks/eventsSyncCalendar.ts`

- Lines: `127`
- Size: `4149` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleCalendarProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../service_config`
  - `import/require ../types`
- Functions:
  - `norm`

### `functions/src/service/tasks/eventsSyncFromSheet.ts`

- Lines: `284`
- Size: `9453` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleCalendarProvider.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `isApproved`
  - `norm`
  - `normDate`

### `functions/src/service/tasks/gearPrivateStorage.ts`

- Lines: `316`
- Size: `11217` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/setup_gear_vars`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `firstChargeableMonth`
  - `isChargeableThisMonth`
  - `norm`
  - `toYearMonth`

### `functions/src/service/tasks/gearSyncKayaksFromSheet.ts`

- Lines: `162`
- Size: `5363` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `norm`
  - `parseBool`
  - `parseNumber`

### `functions/src/service/tasks/godzinkiSyncFromSheet.ts`

- Lines: `242`
- Size: `7619` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `isApproved`
  - `norm`

### `functions/src/service/tasks/kmMergeHistoricalUser.ts`

- Lines: `138`
- Size: `4588` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/src/service/tasks/kmRebuildMapData.ts`

- Lines: `161`
- Size: `4845` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `resolveDisplayName`

### `functions/src/service/tasks/kmRebuildRankings.ts`

- Lines: `86`
- Size: `2696` bytes
- Internal dependencies:
  - `functions/src/service/tasks/kmRebuildUserStats.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
  - `import/require ./kmRebuildUserStats`

### `functions/src/service/tasks/kmRebuildUserStats.ts`

- Lines: `212`
- Size: `7419` bytes
- Internal dependencies:
  - `functions/src/modules/km/km_scoring.ts`
  - `functions/src/modules/km/km_vars.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/km/km_scoring`
  - `import/require ../../modules/km/km_vars`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `flushBatch`
  - `norm`

### `functions/src/service/tasks/kursSyncFromSheet.ts`

- Lines: `112`
- Size: `3420` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
- Functions:
  - `norm`
  - `normDate`
  - `parseBool`

### `functions/src/service/tasks/listaEnforcePostingPolicy.ts`

- Lines: `50`
- Size: `1275` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`

### `functions/src/service/tasks/membersSyncToSheet.ts`

- Lines: `176`
- Size: `6461` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `ensureMemberId`
  - `formatDatePL`
  - `norm`
  - `roleLabel`
  - `statusLabel`
  - `toDateSafe`

### `functions/src/service/tasks/onUserRegisteredWelcome.ts`

- Lines: `279`
- Size: `10470` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
- Functions:
  - `asErr`
  - `assertString`
  - `listaRoleForUserRole`

### `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`

- Lines: `508`
- Size: `17710` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `buildAdminAlertBody`
  - `buildAdminOffboardingBody`
  - `buildAdminOnboardingBody`
  - `buildOperatorOffboardingBody`
  - `buildOperatorWaitBody`
  - `buildOperatorWelcomeTemplate`
  - `decideCase`
  - `operatorHandle`
  - `parseSingleEmail`

### `functions/src/service/tasks/usersSyncRolesFromSheet.ts`

- Lines: `425`
- Size: `15320` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/providers/googleWorkspaceProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../providers/googleWorkspaceProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `buildInvertedLabelMap`
  - `listaRoleForUserRole`
  - `norm`
  - `syncWorkspaceGroupsForUser`

### `functions/src/service/triggers/onUsersActiveCreated.ts`

- Lines: `51`
- Size: `1555` bytes
- Internal dependencies:
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/firestore`
- Functions:
  - `jobIdForWelcome`

### `functions/src/service/types.ts`

- Lines: `30`
- Size: `915` bytes

### `functions/src/service/worker/fallbackDailyWorker.ts`

- Lines: `38`
- Size: `1071` bytes
- Internal dependencies:
  - `functions/src/service/service_config.ts`
  - `functions/src/service/worker/jobProcessor.ts`
- Imports:
  - `import/require ../service_config`
  - `import/require ./jobProcessor`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/scheduler`

### `functions/src/service/worker/jobProcessor.ts`

- Lines: `127`
- Size: `3675` bytes
- Internal dependencies:
  - `functions/src/service/runner.ts`
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../runner`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `addSeconds`
  - `errInfo`
  - `processJobDoc`

### `functions/src/service/worker/onJobCreatedWorker.ts`

- Lines: `21`
- Size: `598` bytes
- Internal dependencies:
  - `functions/src/service/worker/jobProcessor.ts`
- Imports:
  - `import/require ./jobProcessor`
  - `import/require firebase-functions/v2/firestore`

### `public/core/access_control.js`

- Lines: `41`
- Size: `1624` bytes
- Functions:
  - `canSeeModule`

### `public/core/api_client.js`

- Lines: `53`
- Size: `1381` bytes
- Functions:
  - `apiGetJson`
  - `apiPostJson`
  - `resolveToken`
  - `setApiTokenGetter`

### `public/core/app_shell.js`

- Lines: `245`
- Size: `7653` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/modules_registry.js`
  - `import/require /core/render_shell.js`
- Functions:
  - `hardResetUi`
  - `showAuthError`

### `public/core/firebase_client.js`

- Lines: `188`
- Size: `5937` bytes
- Imports:
  - `import/require https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js`
- Functions:
  - `authGetBasicUser`
  - `authGetIdToken`
  - `authHandleRedirectResult`
  - `authLoginPopup`
  - `authLogout`
  - `authOnChange`
  - `getFirebaseConfig`
  - `kayakStorageNumber`
  - `needsRedirectAuth`
  - `storageFetchHelmetFrontUrl`
  - `storageFetchHelmetUrl`
  - `storageFetchKayakCoverUrl`
  - `storageFetchKayakGalleryUrls`
  - `storageFetchLifejacketUrl`

### `public/core/module_stub.js`

- Lines: `32`
- Size: `742` bytes
- Functions:
  - `createGenericModule`
  - `escapeHtml`

### `public/core/modules_registry.js`

- Lines: `165`
- Size: `5393` bytes
- Imports:
  - `import/require /core/module_stub.js`
  - `import/require /modules/admin_pending_module.js`
  - `import/require /modules/basen_module.js`
  - `import/require /modules/gear_module.js`
  - `import/require /modules/godzinki_module.js`
  - `import/require /modules/impreza_module.js`
  - `import/require /modules/km_module.js`
  - `import/require /modules/kurs_godzinki_module.js`
  - `import/require /modules/kurs_module.js`
  - `import/require /modules/my_reservations_module.js`
- Functions:
  - `buildModulesFromSetup`
  - `resolveModuleType`

### `public/core/render_shell.js`

- Lines: `1169`
- Size: `49444` bytes
- Imports:
  - `import/require /core/access_control.js`
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
- Functions:
  - `buildHomeBasenSection`
  - `buildHomeEventsSection`
  - `buildHomeHoursCell`
  - `buildHomeKursEventsSection`
  - `buildHomeReservationsSection`
  - `buildKayakTitle`
  - `countReservationDays`
  - `escapeHtml`
  - `fieldErrorToPl`
  - `formatDatePL`
  - `formatDayMonth`
  - `getDashboardConfig`
  - `getGearRoute`
  - `getHelloName`
  - `getHoursValue`
  - `getMembershipPaidUntil`
  - `getModuleRouteByLabelOrId`
  - `getModuleRouteByType`
  - `getReservationKayakTitles`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `loadAdminPendingBadge`
  - `normalizePhoneDigits`
  - `pluralizeDays`
  - `renderHomeDashboard`
  - `renderHomeProfile`
  - `renderNav`
  - `renderProfileForm`
  - `renderView`
  - `roleKeyToLabel`
  - `set`
  - `setErr`
  - `spinnerHtml`
  - `statusKeyToLabel`
  - `tryParseJsonFromHttpError`
  - `updateBadge`

### `public/core/router.js`

- Lines: `13`
- Size: `387` bytes
- Functions:
  - `parseHash`
  - `setHash`

### `public/core/theme.js`

- Lines: `46`
- Size: `1467` bytes
- Functions:
  - `applyTheme`
  - `getInitialTheme`
  - `initTheme`
  - `toggleTheme`
  - `updateToggleUi`

### `public/core/user_error_messages.js`

- Lines: `135`
- Size: `4035` bytes
- Functions:
  - `joinPrefix`
  - `mapUserFacingApiError`
  - `parseApiErrorMessage`

### `public/modules/admin_pending_module.js`

- Lines: `284`
- Size: `13723` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `createAdminPendingModule`
  - `escapeHtml`
  - `formatDatePL`
  - `load`
  - `renderContent`
  - `setErr`

### `public/modules/basen_module.js`

- Lines: `620`
- Size: `24162` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `bindAdminActions`
  - `bindSessionActions`
  - `createBasenModule`
  - `esc`
  - `formatDate`
  - `karnetStatusLabel`
  - `renderAdminView`
  - `renderKarnetView`
  - `renderSessionCard`
  - `renderSessionsView`
  - `renderTabsHtml`
  - `setCancelErr`
  - `setCancelOk`
  - `setCreateErr`
  - `setCreateOk`
  - `setGrantErr`
  - `setGrantOk`
  - `spinnerHtml`
  - `todayIso`

### `public/modules/gear_module.js`

- Lines: `2277`
- Size: `95814` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/firebase_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `applyFilter`
  - `buildGenericGearDetailsRows`
  - `buildGenericGearTitle`
  - `buildHelmetLine2`
  - `buildHelmetLine3`
  - `buildKayakDetailsRows`
  - `buildKayakTitle`
  - `buildLifejacketLine2`
  - `buildLifejacketLine3`
  - `checkBundleAvailability`
  - `clearBundleModal`
  - `clearReservationForm`
  - `clearReservationMessages`
  - `closeBundleModal`
  - `closeModal`
  - `closeReservationModal`
  - `closeWeightModal`
  - `createGearModule`
  - `dotsIconSvg`
  - `escapeAttr`
  - `escapeHtml`
  - `formatDatePLFromIso`
  - `gearTabIcon`
  - `heartSvg`
  - `isWorking`
  - `loadAndRenderReservations`
  - `loadFavorites`
  - `loadGear`
  - `lockIconSvg`
  - `normalizeSimpleValue`
  - `normalizeTypeValue`
  - `openBundleModal`
  - `openKayakPhotoModal`
  - `openModal`
  - `openReservationModal`
  - `openWeightModal`
  - `parseWeightRangeMax`
  - `populateSizeFilter`
  - `populateTypeFilter`
  - `refreshIconSvg`
  - `render`
  - `renderBundleCatButtons`
  - `renderBundleItemsList`
  - `renderGenericGearCard`
  - `renderHelmetCard`
  - `renderKayakCard`
  - `renderLifejacketCard`
  - `renderPaddleCard`
  - `renderReservationsContent`
  - `renderReservationsSimple`
  - `setErr`
  - `setReservationErr`
  - `setReservationOk`
  - `setWeightErr`
  - `showPhotoAtIdx`
  - `startBundleForItem`
  - `startCreateForKayak`
  - `submitBundleReservation`
  - `submitCreateReservation`
  - `syncReservationForm`
  - `toBool`
  - `toBoolOrNull`
  - `workingIconSvg`

### `public/modules/godzinki_module.js`

- Lines: `391`
- Size: `14112` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `buildMeta`
  - `createGodzinkiModule`
  - `esc`
  - `formatBalanceSign`
  - `formatDate`
  - `infoBarHtml`
  - `recordTypeClass`
  - `recordTypeLabel`
  - `renderGodzinkiView`
  - `renderHistoryView`
  - `renderHomeView`
  - `renderPage`
  - `renderRecordTable`
  - `renderSubmitView`
  - `renderTabsHtml`
  - `setErr`
  - `setOk`
  - `shortenReason`
  - `spinnerHtml`
  - `todayIso`

### `public/modules/impreza_module.js`

- Lines: `284`
- Size: `10132` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `bindSubmitForm`
  - `createImprezaModule`
  - `esc`
  - `formatDate`
  - `getVal`
  - `renderEventCard`
  - `renderListView`
  - `renderSubmitFormHtml`
  - `renderTabsHtml`
  - `setErr`
  - `setOk`
  - `spinnerHtml`
  - `todayIso`

### `public/modules/km_module.js`

- Lines: `1480`
- Size: `58027` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `attachInfoTips`
  - `attachPlacesAutocomplete`
  - `buildPopup`
  - `clearLocationDisplay`
  - `closeModal`
  - `closePopover`
  - `closeSuggestions`
  - `createKmModule`
  - `esc`
  - `fmtNum`
  - `formatDate`
  - `infoTip`
  - `injectKmLocStyles`
  - `loadCss`
  - `loadLeaflet`
  - `loadRanking`
  - `loadScript`
  - `openMap`
  - `rankMedal`
  - `renderEventStatsView`
  - `renderFormView`
  - `renderKmView`
  - `renderKursantFormView`
  - `renderKursantRankingView`
  - `renderMapView`
  - `renderMarkers`
  - `renderMyLogsView`
  - `renderMyStatsView`
  - `renderRankingsView`
  - `setErr`
  - `setLocationDisplay`
  - `setOk`
  - `showSuggestions`
  - `spinnerHtml`
  - `todayIso`
  - `updateDifficultyField`
  - `waterTypeLabel`

### `public/modules/kurs_godzinki_module.js`

- Lines: `61`
- Size: `2643` bytes
- Functions:
  - `createKursGodzinkiModule`
  - `renderKursGodzinki`

### `public/modules/kurs_module.js`

- Lines: `170`
- Size: `6598` bytes
- Functions:
  - `createKursModule`
  - `esc`
  - `renderChapter`
  - `renderToc`
  - `spinnerHtml`

### `public/modules/my_reservations_module.js`

- Lines: `603`
- Size: `23084` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `buildKayakTitle`
  - `closeEditModal`
  - `countReservationDays`
  - `createMyReservationsModule`
  - `escapeAttr`
  - `escapeHtml`
  - `formatDatePL`
  - `formatDayMonth`
  - `getReservationKayakTitles`
  - `loadKayakMap`
  - `loadReservations`
  - `openEditModal`
  - `pluralizeDays`
  - `renderDedicatedEditView`
  - `renderReservations`
  - `setCancelRsvErr`
  - `setEditErr`
  - `setEditOk`
  - `setErr`
  - `setOk`
  - `submitCancelReservation`
  - `submitUpdateReservation`

### `public/sw.js`

- Lines: `147`
- Size: `4997` bytes

### `scripts/bump-sw-cache.js`

- Lines: `26`
- Size: `799` bytes
- Imports:
  - `import/require fs`
  - `import/require path`

## Config files

### `.claude/settings.local.json`

- Lines: `8`
- Size: `68` bytes
- Detected top-level keys / sections:
  - `permissions`

### `.claude_context/context_dependencies.json`

- Lines: `None`
- Size: `2777526` bytes
- Notes:
  - File is larger than 1500000 bytes or cannot be read.

### `.claude_context/context_files.json`

- Lines: `None`
- Size: `10453789` bytes
- Notes:
  - File is larger than 1500000 bytes or cannot be read.

### `ai_full_audit_report.json`

- Lines: `18606`
- Size: `507412` bytes
- Detected top-level keys / sections:
  - `backend_hotspots_summary`
  - `browser_route_risk_summary`
  - `cloud_run_yaml_summary`
  - `critical_files`
  - `dependency_graph`
  - `dependency_summary`
  - `diagnostic_route_usage_summary`
  - `duplication_summary`
  - `env_summary`
  - `executive_summary`
  - `file_size_complexity_summary`
  - `firebase_json_summary`
  - `firebaserc_summary`
  - `firestore_index_check`
  - `firestore_summary`
  - `frontend_firebase_summary`
  - `frontend_hotspots_summary`
  - `full_read_bundles`
  - `git_summary`
  - `hardcode_findings`
  - `hardcode_summary`
  - `host_api_security_summary`
  - `large_functions_summary`
  - `manual_review_targets`
  - `possible_loop_await_risk_summary`
  - `priority_plan_for_ai_developer`
  - `project_summary`
  - `refactor_risk_summary`
  - `reverse_dependency_graph`
  - `rules`
  - `runtime_large_functions_summary`
  - `runtime_route_usage_summary`
  - `runtime_top_files_by_line_count`
  - `safe_medium_high_risk_zones`
  - `shared_data_contracts`
  - `shared_helper_candidates`
  - `stop_conditions`
  - `top_files_by_line_count`

### `appscript/kilometrówka/.clasp.json`

- Lines: `5`
- Size: `96` bytes
- Detected top-level keys / sections:
  - `rootDir`
  - `scriptId`

### `appscript/kilometrówka/appsscript.json`

- Lines: `22`
- Size: `599` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `appscript/kurs/appsscript.json`

- Lines: `22`
- Size: `599` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `firebase.json`

- Lines: `394`
- Size: `9792` bytes
- Detected top-level keys / sections:
  - `firestore`
  - `functions`
  - `hosting`

### `firestore.indexes.json`

- Lines: `120`
- Size: `3444` bytes
- Detected top-level keys / sections:
  - `fieldOverrides`
  - `indexes`

### `functions/package-lock.json`

- Lines: `9926`
- Size: `356135` bytes
- Detected top-level keys / sections:
  - `lockfileVersion`
  - `name`
  - `packages`
  - `requires`

### `functions/package.json`

- Lines: `34`
- Size: `932` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `devDependencies`
  - `engines`
  - `main`
  - `name`
  - `private`
  - `scripts`

### `functions/tsconfig.dev.json`

- Lines: `6`
- Size: `42` bytes
- Detected top-level keys / sections:
  - `include`

### `functions/tsconfig.json`

- Lines: `18`
- Size: `323` bytes
- Detected top-level keys / sections:
  - `compileOnSave`
  - `compilerOptions`
  - `include`

### `public/manifest.json`

- Lines: `26`
- Size: `552` bytes
- Detected top-level keys / sections:
  - `background_color`
  - `description`
  - `display`
  - `icons`
  - `lang`
  - `name`
  - `orientation`
  - `scope`
  - `short_name`
  - `start_url`
  - `theme_color`

### `tests/e2e/oauth_client.json`

- Lines: `1`
- Size: `403` bytes
- Detected top-level keys / sections:
  - `installed`

### `tests/e2e/reports/e2e_prod_20260409_100718.json`

- Lines: `101`
- Size: `3161` bytes
- Detected top-level keys / sections:
  - `duration_s`
  - `env`
  - `failed`
  - `passed`
  - `phases`
  - `skipped`
  - `timestamp`
  - `total`

### `tests/e2e/reports/e2e_prod_20260409_120139.json`

- Lines: `103`
- Size: `2921` bytes
- Detected top-level keys / sections:
  - `duration_s`
  - `env`
  - `failed`
  - `passed`
  - `phases`
  - `skipped`
  - `timestamp`
  - `total`

### `tests/e2e/reports/e2e_prod_20260409_120535.json`

- Lines: `117`
- Size: `3695` bytes
- Detected top-level keys / sections:
  - `duration_s`
  - `env`
  - `failed`
  - `passed`
  - `phases`
  - `skipped`
  - `timestamp`
  - `total`

### `tests/e2e/reports/e2e_prod_20260409_144924.json`

- Lines: `114`
- Size: `3563` bytes
- Detected top-level keys / sections:
  - `duration_s`
  - `env`
  - `failed`
  - `passed`
  - `phases`
  - `skipped`
  - `timestamp`
  - `total`

## Markdown files

### `.claude_context/context_backend.md`

- Lines: `2526`
- Size: `45019` bytes
- Headings:
  - `# Backend Context`
  - `## `archived/functions/node_modules/@grpc/grpc-js/build/src/load-balancer-child-handler.d.ts``
  - `## `archived/functions/node_modules/@grpc/grpc-js/build/src/load-balancer-child-handler.js``
  - `## `archived/functions/node_modules/@grpc/grpc-js/src/load-balancer-child-handler.ts``
  - `## `archived/functions/node_modules/firebase-admin/lib/installations/installations-request-handler.d.ts``
  - `## `archived/functions/node_modules/firebase-admin/lib/installations/installations-request-handler.js``
  - `## `archived/functions/node_modules/google-auth-library/build/src/auth/pluggable-auth-handler.d.ts``
  - `## `archived/functions/node_modules/google-auth-library/build/src/auth/pluggable-auth-handler.js``
  - `## `archived/functions/node_modules/undici-types/handlers.d.ts``
  - `## `archived/functions/node_modules/undici-types/retry-handler.d.ts``
  - `## `functions/node_modules/@grpc/grpc-js/build/src/load-balancer-child-handler.d.ts``
  - `## `functions/node_modules/@grpc/grpc-js/build/src/load-balancer-child-handler.js``
  - `## `functions/node_modules/@grpc/grpc-js/src/load-balancer-child-handler.ts``
  - `## `functions/node_modules/caniuse-lite/data/features/registerprotocolhandler.js``
  - `## `functions/node_modules/firebase-admin/lib/installations/installations-request-handler.d.ts``
  - `## `functions/node_modules/firebase-admin/lib/installations/installations-request-handler.js``
  - `## `functions/node_modules/google-auth-library/build/src/auth/pluggable-auth-handler.d.ts``
  - `## `functions/node_modules/google-auth-library/build/src/auth/pluggable-auth-handler.js``
  - `## `functions/node_modules/googleapis/build/src/apis/tasks/index.d.ts``
  - `## `functions/node_modules/googleapis/build/src/apis/tasks/index.js``
  - `## `functions/node_modules/googleapis/build/src/apis/tasks/v1.d.ts``
  - `## `functions/node_modules/googleapis/build/src/apis/tasks/v1.js``
  - `## `functions/node_modules/undici-types/handlers.d.ts``
  - `## `functions/node_modules/undici-types/retry-handler.d.ts``
  - `## `functions/src/api/adminEventsSyncCalendarHandler.ts``
  - `## `functions/src/api/basenAdminAddGodzinyHandler.ts``
  - `## `functions/src/api/basenAdminCorrectGodzinyHandler.ts``
  - `## `functions/src/api/basenAdminSearchUsersHandler.ts``
  - `## `functions/src/api/basenCancelEnrollmentHandler.ts``
  - `## `functions/src/api/basenCancelSessionHandler.ts``
  - `## `functions/src/api/basenCreateSessionHandler.ts``
  - `## `functions/src/api/basenEnrollHandler.ts``
  - `## `functions/src/api/basenGrantKarnetHandler.ts``
  - `## `functions/src/api/gearBundleReservationCreateHandler.ts``
  - `## `functions/src/api/gearFavoriteToggleHandler.ts``
  - `## `functions/src/api/gearKayaksListHandler.ts``
  - `## `functions/src/api/gearMyReservationsHandler.ts``
  - `## `functions/src/api/gearReservationCancelHandler.ts``
  - `## `functions/src/api/gearReservationCreateHandler.ts``
  - `## `functions/src/api/gearReservationUpdateHandler.ts``
  - `## `functions/src/api/getAdminPendingHandler.ts``
  - `## `functions/src/api/getBasenGodzinyHandler.ts``
  - `## `functions/src/api/getBasenKarnetyHandler.ts``
  - `## `functions/src/api/getBasenSessionsHandler.ts``
  - `## `functions/src/api/getEventsHandler.ts``
  - `## `functions/src/api/getGearFavoritesHandler.ts``
  - `## `functions/src/api/getGearItemAvailabilityHandler.ts``
  - `## `functions/src/api/getGearItemsHandler.ts``
  - `## `functions/src/api/getGearKayaksHandler.ts``
  - `## `functions/src/api/getGodzinkiHandler.ts``
  - `## `functions/src/api/getKayakReservationsHandler.ts``
  - `## `functions/src/api/getKursInfoHandler.ts``
  - `## `functions/src/api/getKursantStatsHandler.ts``
  - `## `functions/src/api/godzinkiPurchaseHandler.ts``
  - `## `functions/src/api/kmAddLogHandler.ts``
  - `## `functions/src/api/kmAdminMergePlacesHandler.ts``
  - `## `functions/src/api/kmEventStatsHandler.ts``
  - `## `functions/src/api/kmMapDataHandler.ts``
  - `## `functions/src/api/kmMyLogsHandler.ts``
  - `## `functions/src/api/kmMyStatsHandler.ts``
  - `## `functions/src/api/kmPlacesHandler.ts``
  - `## `functions/src/api/kmRankingsHandler.ts``
  - `## `functions/src/api/registerUserHandler.ts``
  - `## `functions/src/api/submitEventHandler.ts``
  - `## `functions/src/api/submitGodzinkiHandler.ts``
  - `## `functions/src/api/userWeightHandler.ts``
  - `## `functions/src/index.ts``
  - `## `functions/src/modules/basen/basen_godziny_service.ts``
  - `## `functions/src/modules/basen/basen_service.ts``
  - `## `functions/src/modules/calendar/calendar_utils.ts``
  - `## `functions/src/modules/calendar/events_service.ts``
  - `## `functions/src/modules/equipment/bundle/gear_bundle_service.ts``
  - `## `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts``
  - `## `functions/src/modules/equipment/shared/gear_catalog_service.ts``
  - `## `functions/src/modules/hours/godzinki_service.ts``
  - `## `functions/src/modules/hours/godzinki_vars.ts``
  - `## `functions/src/modules/hours/hours_quote.ts``
  - `## `functions/src/modules/km/km_log_service.ts``
  - `## `functions/src/modules/km/km_places_service.ts``
  - `## `functions/src/modules/km/km_scoring.ts``
  - `## `functions/src/modules/km/km_vars.ts``
  - `## `functions/src/modules/setup/setup_gear_vars.ts``
  - `## `functions/src/modules/users/userStatusCheck.ts``
  - `## `functions/src/service/admin/adminRunTask.ts``
  - `## `functions/src/service/providers/googleAuth.ts``
  - `## `functions/src/service/providers/googleCalendarProvider.ts``
  - `## `functions/src/service/providers/googleSheetsProvider.ts``
  - `## `functions/src/service/providers/googleWorkspaceProvider.ts``
  - `## `functions/src/service/registry.ts``
  - `## `functions/src/service/runner.ts``
  - `## `functions/src/service/service_config.ts``
  - `## `functions/src/service/tasks/basenNotifySessionCancelled.ts``
  - `## `functions/src/service/tasks/eventsSyncCalendar.ts``
  - `## `functions/src/service/tasks/eventsSyncFromSheet.ts``
  - `## `functions/src/service/tasks/gearSyncKayaksFromSheet.ts``
  - `## `functions/src/service/tasks/godzinkiSyncFromSheet.ts``
  - `## `functions/src/service/tasks/kmMergeHistoricalUser.ts``
  - `## `functions/src/service/tasks/kmRebuildMapData.ts``
  - `## `functions/src/service/tasks/kmRebuildRankings.ts``
  - `## `functions/src/service/tasks/kmRebuildUserStats.ts``

### `.claude_context/context_config.md`

- Lines: `None`
- Size: `4638819` bytes
- Notes:
  - File is larger than 1500000 bytes or cannot be read.

### `.claude_context/context_frontend.md`

- Lines: `769`
- Size: `13247` bytes
- Headings:
  - `# Frontend Context`
  - `## `public/404.html``
  - `## `public/core/access_control.js``
  - `## `public/core/api_client.js``
  - `## `public/core/app_shell.js``
  - `## `public/core/firebase_client.js``
  - `## `public/core/module_stub.js``
  - `## `public/core/modules_registry.js``
  - `## `public/core/render_shell.js``
  - `## `public/core/router.js``
  - `## `public/core/theme.js``
  - `## `public/core/user_error_messages.js``
  - `## `public/index.html``
  - `## `public/manifest.json``
  - `## `public/map.html``
  - `## `public/modules/admin_pending_module.js``
  - `## `public/modules/basen_module.js``
  - `## `public/modules/gear_module.js``
  - `## `public/modules/godzinki_module.js``
  - `## `public/modules/impreza_module.js``
  - `## `public/modules/km_module.js``
  - `## `public/modules/kurs_godzinki_module.js``
  - `## `public/modules/kurs_module.js``
  - `## `public/modules/my_reservations_module.js``
  - `## `public/skrypt_kurs/chapters/ch01.html``
  - `## `public/skrypt_kurs/chapters/ch02.html``
  - `## `public/skrypt_kurs/chapters/ch03.html``
  - `## `public/skrypt_kurs/chapters/ch04.html``
  - `## `public/skrypt_kurs/chapters/ch05.html``
  - `## `public/skrypt_kurs/chapters/ch06.html``
  - `## `public/styles/app.css``
  - `## `public/styles/base.css``
  - `## `public/styles/basen.css``
  - `## `public/styles/dashboard.css``
  - `## `public/styles/events.css``
  - `## `public/styles/gear.css``
  - `## `public/styles/godzinki.css``
  - `## `public/styles/km.css``
  - `## `public/styles/kurs.css``
  - `## `public/styles/start.css``
  - `## `public/sw.js``

### `.claude_context/context_keywords.md`

- Lines: `None`
- Size: `1656634` bytes
- Notes:
  - File is larger than 1500000 bytes or cannot be read.

### `.claude_context/context_routes.md`

- Lines: `518`
- Size: `15511` bytes
- Headings:
  - `# Routes and Firebase Functions`
  - `## Firebase hosting rewrites`
  - `## Files with route/function hints`
  - `### `ai_full_audit_report.json``
  - `### `archived/functions/node_modules/@google-cloud/firestore/build/src/v1/firestore_admin_client.js``
  - `### `archived/functions/node_modules/@protobufjs/fetch/tests/index.js``
  - `### `archived/functions/node_modules/@types/express-serve-static-core/index.d.ts``
  - `### `archived/functions/node_modules/@types/node/test.d.ts``
  - `### `archived/functions/node_modules/express/lib/request.js``
  - `### `archived/functions/node_modules/express/lib/response.js``
  - `### `archived/functions/node_modules/firebase-functions/lib/bin/firebase-functions.js``
  - `### `archived/functions/node_modules/firebase-functions/lib/v1/providers/https.d.ts``
  - `### `archived/functions/node_modules/firebase-functions/lib/v1/providers/https.js``
  - `### `archived/functions/node_modules/firebase-functions/lib/v2/providers/https.d.ts``
  - `### `archived/functions/node_modules/firebase-functions/lib/v2/providers/https.js``
  - `### `archived/functions/node_modules/google-gax/build/src/longRunningCalls/longrunning.js``
  - `### `archived/functions/node_modules/node-forge/dist/forge.all.min.js``
  - `### `archived/functions/node_modules/node-forge/dist/forge.min.js``
  - `### `archived/functions/node_modules/node-forge/lib/x509.js``
  - `### `archived/functions/node_modules/undici-types/fetch.d.ts``
  - `### `firebase.json``
  - `### `functions/node_modules/@google-cloud/firestore/build/src/v1/firestore_admin_client.js``
  - `### `functions/node_modules/@google-cloud/secret-manager/build/protos/protos.js``
  - `### `functions/node_modules/@protobufjs/fetch/tests/index.js``
  - `### `functions/node_modules/@types/express-serve-static-core/index.d.ts``
  - `### `functions/node_modules/@types/node/test.d.ts``
  - `### `functions/node_modules/express/lib/request.js``
  - `### `functions/node_modules/express/lib/response.js``
  - `### `functions/node_modules/firebase-functions/lib/bin/firebase-functions.js``
  - `### `functions/node_modules/firebase-functions/lib/v1/providers/https.d.ts``
  - `### `functions/node_modules/firebase-functions/lib/v1/providers/https.js``
  - `### `functions/node_modules/firebase-functions/lib/v2/providers/https.d.ts``
  - `### `functions/node_modules/firebase-functions/lib/v2/providers/https.js``
  - `### `functions/node_modules/google-gax/build/src/longRunningCalls/longrunning.js``
  - `### `functions/node_modules/googleapis/build/src/apis/cloudtasks/v2beta2.js``
  - `### `functions/node_modules/node-forge/dist/forge.all.min.js``
  - `### `functions/node_modules/node-forge/dist/forge.min.js``
  - `### `functions/node_modules/node-forge/lib/x509.js``
  - `### `functions/node_modules/path-scurry/node_modules/lru-cache/dist/commonjs/index.d.ts``
  - `### `functions/node_modules/path-scurry/node_modules/lru-cache/dist/esm/index.d.ts``
  - `### `functions/node_modules/undici-types/fetch.d.ts``
  - `### `functions/src/index.ts``
  - `### `functions/src/service/admin/adminRunTask.ts``
  - `### `functions/src/service/providers/googleAuth.ts``
  - `### `public/core/app_shell.js``
  - `### `public/core/render_shell.js``
  - `### `public/map.html``
  - `### `public/modules/admin_pending_module.js``
  - `### `public/modules/basen_module.js``
  - `### `public/modules/gear_module.js``
  - `### `public/modules/godzinki_module.js``
  - `### `public/modules/impreza_module.js``
  - `### `public/modules/km_module.js``
  - `### `public/modules/my_reservations_module.js``
  - `### `tests/e2e/phases/phase_A_suspended_user.py``
  - `### `tests/test_pwa.py``
  - `### `tools/build_project_context.py``

### `.claude_context/context_tests.md`

- Lines: `8435`
- Size: `163549` bytes
- Headings:
  - `# Tests Context`
  - `## `archived/functions/node_modules/@firebase/component/dist/esm/test/setup.d.ts``
  - `## `archived/functions/node_modules/@firebase/component/dist/esm/test/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/component/dist/test/setup.d.ts``
  - `## `archived/functions/node_modules/@firebase/component/dist/test/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/browser/crawler_support.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/database.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/datasnapshot.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/helpers/events.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/helpers/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/info.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/order.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/order_by.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/promise.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/query.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/servervalues.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/database-compat/test/transaction.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/browser/crawler_support.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/database.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/datasnapshot.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/helpers/events.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/helpers/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/info.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/order.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/order_by.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/promise.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/query.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/servervalues.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/transaction.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/node-esm/src/api/test_access.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/node-esm/test/helpers/EventAccumulator.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/node-esm/test/helpers/syncpoint-util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/node-esm/test/helpers/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/src/api/test_access.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/test/helpers/EventAccumulator.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/test/helpers/syncpoint-util.d.ts``
  - `## `archived/functions/node_modules/@firebase/database/dist/test/helpers/util.d.ts``
  - `## `archived/functions/node_modules/@firebase/logger/dist/esm/test/custom-logger.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/logger/dist/esm/test/logger.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/logger/dist/test/custom-logger.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/logger/dist/test/logger.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/base64.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/compat.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/deepCopy.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/defaults.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/emulator.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/environments.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/errors.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/exponential_backoff.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/object.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/node-esm/test/subscribe.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/base64.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/compat.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/deepCopy.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/defaults.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/emulator.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/environments.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/errors.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/exponential_backoff.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/object.test.d.ts``
  - `## `archived/functions/node_modules/@firebase/util/dist/test/subscribe.test.d.ts``
  - `## `archived/functions/node_modules/@protobufjs/aspromise/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/base64/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/codegen/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/eventemitter/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/fetch/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/float/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/inquire/tests/data/array.js``
  - `## `archived/functions/node_modules/@protobufjs/inquire/tests/data/emptyArray.js``
  - `## `archived/functions/node_modules/@protobufjs/inquire/tests/data/emptyObject.js``
  - `## `archived/functions/node_modules/@protobufjs/inquire/tests/data/object.js``
  - `## `archived/functions/node_modules/@protobufjs/inquire/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/path/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/pool/tests/index.js``
  - `## `archived/functions/node_modules/@protobufjs/utf8/tests/index.js``
  - `## `archived/functions/node_modules/@types/node/test.d.ts``
  - `## `archived/functions/node_modules/buffer-equal-constant-time/test.js``
  - `## `archived/functions/node_modules/call-bind-apply-helpers/test/index.js``
  - `## `archived/functions/node_modules/call-bound/test/index.js``
  - `## `archived/functions/node_modules/dunder-proto/test/get.js``
  - `## `archived/functions/node_modules/dunder-proto/test/index.js``
  - `## `archived/functions/node_modules/dunder-proto/test/set.js``
  - `## `archived/functions/node_modules/duplexify/test.js``
  - `## `archived/functions/node_modules/es-define-property/test/index.js``
  - `## `archived/functions/node_modules/es-errors/test/index.js``
  - `## `archived/functions/node_modules/es-object-atoms/test/index.js``
  - `## `archived/functions/node_modules/es-set-tostringtag/test/index.js``
  - `## `archived/functions/node_modules/firebase-functions/lib/v1/providers/testLab.d.ts``
  - `## `archived/functions/node_modules/firebase-functions/lib/v1/providers/testLab.js``
  - `## `archived/functions/node_modules/firebase-functions/lib/v2/providers/testLab.d.ts``
  - `## `archived/functions/node_modules/firebase-functions/lib/v2/providers/testLab.js``
  - `## `archived/functions/node_modules/function-bind/test/index.js``
  - `## `archived/functions/node_modules/functional-red-black-tree/bench/test.js``
  - `## `archived/functions/node_modules/functional-red-black-tree/test/test.js``
  - `## `archived/functions/node_modules/get-intrinsic/test/GetIntrinsic.js``
  - `## `archived/functions/node_modules/get-proto/test/index.js``
  - `## `archived/functions/node_modules/gopd/test/index.js``
  - `## `archived/functions/node_modules/has-symbols/test/index.js``
  - `## `archived/functions/node_modules/has-symbols/test/shams/core-js.js``
  - `## `archived/functions/node_modules/has-symbols/test/shams/get-own-property-symbols.js``

### `.claude_context/README.md`

- Lines: `1613`
- Size: `135750` bytes
- Headings:
  - `# Claude Code Context`
  - `## Mandatory operating rules`
  - `## Context files`
  - `## Recommended route`
  - `## Project summary`
  - `## Large files warning`

### `Audyty/AUDIT_MAP.md`

- Lines: `216`
- Size: `11997` bytes
- Headings:
  - `# AUDIT_MAP — Mapa systemu godzinkowego i rezerwacji`
  - `## 1. Moduły frontendowe`
  - `## 2. Backend — pliki i odpowiedzialności`
  - `### Handlery API (`functions/src/api/`)`
  - `### Serwisy (`functions/src/modules/`)`
  - `## 3. Kolekcje Firestore (źródła prawdy)`
  - `## 4. Przepływ: tworzenie rezerwacji kajaka (legacy)`
  - `## 5. Przepływ: tworzenie rezerwacji bundle`
  - `## 6. Przepływ: anulowanie rezerwacji`
  - `## 7. Przepływ: FIFO dedukcja godzinek`
  - `## 8. Konfiguracja setup`
  - `### setup/vars_gear`
  - `### setup/vars_godzinki`
  - `## 9. Role — mapa dostępu do rezerwacji`
  - `## 10. Zidentyfikowane ryzyka (podsumowanie)`

### `Audyty/AUDIT_PLAN.md`

- Lines: `116`
- Size: `4803` bytes
- Headings:
  - `# AUDIT_PLAN — Plan audytu systemu godzinkowego i rezerwacji`
  - `## Zakres audytu`
  - `### Obszary objęte audytem`
  - `### Obszary WYŁĄCZONE z audytu`
  - `## Kolejność wykonania`
  - `### Etap 0 — Analiza kodu (zakończony)`
  - `### Etap 1 — Dokumentacja (zakończony)`
  - `### Etap 2 — Testy jednostkowe logiki (zakończony)`
  - `### Etap 3 — Testy integracyjne HTTP (zakończony)`
  - `### Etap 4 — Testy E2E Playwright (planowane)`
  - `### Etap 5 — Raport końcowy`
  - `## Znalezione ryzyka — podsumowanie priorytetów`
  - `### KRYTYCZNE (muszą być naprawione przed oddaniem systemu użytkownikom)`
  - `### ŚREDNIE (ważne, ale nie blokują oddania)`
  - `### NISKIE`
  - `## Pytania otwarte dla zarządu (PO decisions)`

### `Audyty/audyt_ekrany_użytkowników.md`

- Lines: `272`
- Size: `14425` bytes
- Headings:
  - `# Audyt: Role-specific Home Screens — Morzkulc App`
  - `## 1. STAN AKTUALNY`
  - `## 2. AUDYT LUK`
  - `### Tabela luk`
  - `### L1 — szczegół krytyczny`
  - `### L4 — szczegół krytyczny`
  - `## 3. MACIERZ ROLA → EKRAN → MODUŁY → AKCJE`
  - `### Co powinno pochodzić z setup (obecnie nie pochodzi)`
  - `### Minimalny stabilny model rozszerzenia `RoleMapping``
  - `## 4. PLAN WDROŻENIA`
  - `### Krok 0: Naprawienie L4 — backend gating gear reservation (priorytet)`
  - `### Krok 1: Naprawienie L1 — routing startowy`
  - `### Krok 2: Rozszerzenie `RoleMapping` w setup`
  - `### Krok 3: Różnicowanie `renderHomeDashboard` per rola`
  - `### Krok 4: Usunięcie hardcoded role sets z frontendu (L3)`
  - `### Krok 5: Naprawienie L5 — godzinki backend gating`
  - `## 5. PLAN TESTÓW`
  - `### Logowanie i routing`
  - `### Widoczność modułów`
  - `### Blokady akcji`
  - `### Dashboard per rola`
  - `### Bezpieczeństwo`
  - `### Odporność`
  - `## Podsumowanie końcowe`

### `Audyty/audyt_ranking_kilometrowka_mapa_v2.md`

- Lines: `440`
- Size: `21490` bytes
- Headings:
  - `# Audyt: Ranking / Kilometrówka / Godziny / Wywrotolotek / Mapa`
  - `## 1. Znalezione wcześniejsze audyty`
  - `## 2. Aktualna struktura plików`
  - `### Frontend (`public/`)`
  - `### Backend (`functions/src/`)`
  - `#### Handlery API (`api/`)`
  - `#### Moduły serwisowe (`modules/km/`)`
  - `#### Service tasks (`service/tasks/`)`
  - `### Testy`
  - `### GAS (`appscript/kilometrówka/`)`
  - `### Firestore`
  - `## 3. Aktualne endpointy`
  - `### Km / Ranking`
  - `### Imprezy (użyte przez km)`
  - `### Brak endpointów (wymagane, a nie istnieją)`
  - `## 4. Bezpieczeństwo endpointów`
  - `### Pozytywne`
  - `### Problemy`
  - `## 5. Aktualne kolekcje Firestore`
  - `## 6. Aktualny model danych`
  - `### km_logs — pola obecne`
  - `### km_user_stats — pola obecne`
  - `### km_places — model`
  - `### events — model`
  - `## 7. Aktualna logika rankingów`
  - `## 8. Aktualna logika mapy`
  - `## 9. Aktualna logika miejsc`
  - `## 10. Aktualna logika formularza`
  - `## 11. Aktualna logika edycji/usuwania`
  - `## 12. Aktualna logika kursantów`
  - `## 13. Aktualna punktacja wywrotolotka`
  - `## 14. Aktualne testy`
  - `### Istniejące testy (NIE dla km)`
  - `### Testy dla km — BRAK`
  - `## 15. Braki testowe`
  - `## 16. Błędy i ryzyka`
  - `### KRYTYCZNE`
  - `### ŚREDNIE`
  - `### NISKIE`
  - `## 17. Blockery (realne, uniemożliwiające poprawne wdrożenie)`
  - `## 18. Najbliższy bezpieczny krok`

### `Audyty/audyt_rejestracja.md`

- Lines: `222`
- Size: `9086` bytes
- Headings:
  - `# Audyt systemu rejestracji użytkowników, uprawnień i grup`
  - `## 1. Mapa przepływu systemu`
  - `## 2. Krytyczne pliki systemu`
  - `## 3. Konfiguracja prod (`.env.morzkulc-e9df7`)`
  - `## 4. Zidentyfikowane problemy`
  - `### PROBLEM 1 — KRYTYCZNY: IAM signJwt permission denied`
  - `### PROBLEM 2 — DO WERYFIKACJI: Domain-Wide Delegation`
  - `### PROBLEM 3 — DO WERYFIKACJI: iamcredentials API włączone?`
  - `### PROBLEM 4 — ZNANY: MEMBER_LEVEL_ROLES hardcoded`
  - `### PROBLEM 5 — ZNANY: Brak SVC_GEAR_KAYAKS_SHEET_ID w prod env`
  - `### PROBLEM 6 — ZNANY: Timeout job poll w testach za krótki`
  - `## 5. Plan naprawy (kolejność)`
  - `### Krok 1 — Znajdź Cloud Run SA projektu prod`
  - `### Krok 2 — Włącz iamcredentials API w prod`
  - `# Jeśli brak:`
  - `### Krok 3 — Sprawdź obecne IAM bindingi na firebase-sync@ SA`
  - `### Krok 4 — Nadaj uprawnienie signJwt (cross-project)`
  - `### Krok 5 — Zweryfikuj DWD w Google Workspace Admin Console`
  - `### Krok 6 — Test pojedynczego joba (weryfikacja bez E2E)`
  - `### Krok 7 — Pełny E2E test`
  - `## 6. Wymagana struktura arkusza Sheets`
  - `## 7. Wyniki testu E2E z 2026-04-09`
  - `## 8. Następne kroki po naprawie IAM`

### `Audyty/audyt_testow_logowanie_uzytkownicy_v1.md`

- Lines: `254`
- Size: `14872` bytes
- Headings:
  - `# Audyt testów – logowanie, rejestracja, obsługa kont użytkowników, bezpieczeństwo`
  - `## 1. Inwentaryzacja istniejących testów`
  - `### 1.1 Testy jednostkowe (Python / unittest)`
  - `### 1.2 Testy E2E (Python + Playwright + Firebase Admin SDK)`
  - `## 2. Macierz pokrycia – wymagane scenariusze vs. stan`
  - `### 2.1 Logowanie`
  - `### 2.2 Rejestracja`
  - `### 2.3 Obsługa kont użytkowników`
  - `### 2.4 Bezpieczeństwo`
  - `## 3. Wymagane konta testowe`
  - `### 3.1 Istniejące konta (zdefiniowane w `tests/e2e/config.py`)`
  - `### 3.2 Brakujące konta (wymagane do pełnego pokrycia)`
  - `## 4. Analiza luk – priorytetyzacja`
  - `### KRYTYCZNE (brak testów dla mechanizmów bezpieczeństwa)`
  - `### WYSOKIE (luki funkcjonalne w kluczowych ścieżkach)`
  - `### ŚREDNIE (pokrycie E2E ograniczone do "happy path")`
  - `## 5. Rekomendacje implementacyjne`
  - `### R1 – Dodać testy bezpieczeństwa HTTP (pytest + requests)`
  - `### R2 – Dodać testy statusu użytkownika`
  - `### R3 – Przywrócić `firestore.rules` do repozytorium (Etap 3)`
  - `### R4 – Dodać testy jednostkowe `registerUserHandler``
  - `### R5 – Rozbudować E2E o scenariusze negatywne`
  - `### R6 – Dodać brakujące konta testowe`
  - `## 6. Podsumowanie`

### `Audyty/audyt_testow_ranking_kilometrowka_mapa.md`

- Lines: `202`
- Size: `9588` bytes
- Headings:
  - `# Audyt pokrycia testami — Ranking / Kilometrówka / Mapa`
  - `## 1. Stan infrastruktury testowej`
  - `### 1.1 Istniejące pliki testów`
  - `### 1.2 Frameworki i wzorce`
  - `## 2. Pokrycie testami — moduł km/ranking/mapa`
  - `### 2.1 Podsumowanie: BRAK JAKICHKOLWIEK TESTÓW`
  - `### 2.2 Analiza per kategoria`
  - `#### RK — Ranking podstawowy (`GET /kmRankings`)`
  - `#### RG — Ranking wyświetlanie (frontend km_module.js)`
  - `#### RW — Ranking per rok (period=specificYear)`
  - `#### FA — Formularz dodawania aktywności (`POST /kmAddLog`)`
  - `#### EV — Imprezy (`events` collection + `listRecentEvents`)`
  - `#### PL — Podpowiedzi akwenów (`GET /kmPlaces`)`
  - `#### PD — Szczegóły miejsca (`km_places` upsert)`
  - `#### MP — Mapa (`GET /api/km/map-data`)`
  - `#### ED — Edycja/usunięcie logów (soft delete)`
  - `#### KU — Filtr kursantów w rankingu`
  - `#### SEC — Bezpieczeństwo endpointów km`
  - `#### FS — Integralność Firestore (km_user_stats)`
  - `#### UX — UX/interfejs km_module.js`
  - `#### E2E — Pełny przepływ`
  - `## 3. Porównanie z istniejącymi testami (wzorce)`
  - `## 4. Luki krytyczne (blokerzy)`
  - `## 5. Zależności infrastrukturalne`
  - `## 6. Wnioski`

### `Audyty/audyt_v2.md`

- Lines: `208`
- Size: `16871` bytes
- Headings:
  - `# AUDYT — LOGOWANIE, REJESTRACJA, OBSŁUGA UŻYTKOWNIKA`
  - `## 1. MAPA SYSTEMU`
  - `## 2. TABELA ZGODNOŚCI`
  - `## 3. NIEZGODNOŚCI KRYTYCZNE`
  - `### 3.1 CORS wildcard w firebase.json — BEZPIECZEŃSTWO`
  - `### 3.2 session.screen nigdy nieużywany — WRONG business logic`
  - `### 3.3 Brak Firestore Rules w repo — BEZPIECZEŃSTWO`
  - `### 3.4 Brak rewrite'ów dla 5 funkcji`
  - `## 4. BRAKI`
  - `## 5. MIEJSCA RYZYKA`
  - `## 6. PLIKI DO PÓŹNIEJSZEJ POPRAWY`
  - `## 7. WERDYKT KOŃCOWY`

### `Audyty/ekran_kursant_podsumowanie_wdrozenia.md`

- Lines: `822`
- Size: `29472` bytes
- Headings:
  - `# Ekran kursanta — podsumowanie wdrożenia`
  - `## Spis treści`
  - `## 1. Rola i model autoryzacji`
  - `## 2. Backend — Firebase Functions`
  - `### 2.1 Env vars`
  - `### 2.2 `service/service_config.ts` — blok kurs`
  - `### 2.3 `GET /api/kurs/info``
  - `### 2.4 `GET /api/km/kursant-stats``
  - `### 2.5 `GET /api/setup` — rozszerzenia dla kursanta`
  - `### 2.6 Task: `kursSyncFromSheet``
  - `## 3. Firestore — kolekcje`
  - `## 4. Frontend — core`
  - `### 4.1 `public/core/app_shell.js``
  - `### 4.2 `public/core/access_control.js``
  - `### 4.3 `public/core/modules_registry.js``
  - `### 4.4 `public/core/render_shell.js``
  - `## 5. Frontend — moduły`
  - `### 5.1 `public/modules/kurs_module.js``
  - `### 5.2 `public/modules/kurs_godzinki_module.js``
  - `## 6. System wywrotolotek (km dla kursantów)`
  - `### 6.1 Architektura danych`
  - `### 6.2 Punkty wywrotolotek`
  - `### 6.3 Zakładki modułu km dla kursanta`
  - `### 6.4 Formularz kursanta (`renderKursantFormView`)`
  - `### 6.5 Ranking kursantów (`renderKursantRankingView`)`
  - `### 6.6 Widok "Moje wpisy" — wyświetlanie logów kursanta`
  - `## 7. Moduł sprzętu — kursant`
  - `## 8. Konfiguracja modułów w Firestore`
  - `## 9. AppScript — synchronizacja danych kursanta z arkusza`
  - `### Pliki`
  - `### `appsscript.json` — wymagany manifest`
  - `### `kurs_config_sync.gs` — zakładka "setup" → `setup/vars_kurs``
  - `### `uczestnicy_sync.gs` — zakładka "uczestnicy" → `kurs_uczestnicy/{email}``
  - `### `po_kursie_sync.gs` — zakładka "co po kursie" → `setup/kurs_po_kursie``
  - `## 10. Ujednolicenie obsługi imprez kursowych`
  - `### Problem (rozwiązany 2026-05-02)`
  - `### Rozwiązanie`
  - `### Zmienione pliki`
  - `### Schemat dokumentu `events``
  - `### Kolekcja `kurs_events` — status`
  - `## 11. kursPreviewMode — tryb podglądu dla innych ról`
  - `## 12. Znane ograniczenia`
  - `## 13. Procedury operacyjne`
  - `### Naprawa `km_user_stats` dla konkretnego kursanta`
  - `### Dodanie kursanta do systemu`
  - `### Zmiana roli kursanta na członka`
  - `### Włączenie/wyłączenie rezerwacji sprzętu dla kursantów`
  - `### Synchronizacja danych z arkusza kursowego`
  - `### Deploy po zmianach kodu`
  - `# Tylko backend (functions)`
  - `# Tylko frontend (hosting)`
  - `# Oba`

### `Audyty/GRUPY_UZYTKOWNICY_PLAN_AND_TO_DO.MD`

- Lines: `692`
- Size: `30792` bytes
- Headings:
  - `# Plan i TO-DO: Grupy Workspace + Konta funkcyjne SKK Morzkulc`
  - `## Spis treści`
  - `## 1. Cel i kontekst`
  - `## 2. Wynik pilota SMTP`
  - `## 3. Decyzje architektoniczne`
  - `## 4. Audyt grup Workspace`
  - `### 4.1 `sprzetowiec@morzkulc.pl` (do skasowania)`
  - `### 4.2 `szkoleniowiec@morzkulc.pl` (do skasowania)`
  - `### 4.3 `zarzad@morzkulc.pl` (zostaje grupą)`
  - `### 4.4 `zarzad_skk@morzkulc.pl` (zostaje grupą)`
  - `## 5. Konwencja etykiet grup`
  - `### Etykiety per grupa SKK`
  - `## 6. Mapa kont funkcyjnych i adresów`
  - `### Stan obecny (przed wdrożeniem)`
  - `### Stan docelowy (po wdrożeniu)`
  - `### Zmienne setup (4 funkcyjne)`
  - `## 7. Mechanizm działania (flow)`
  - `### 7.1 Onboarding operatora (CASE onboard)`
  - `### 7.2 Offboarding operatora (CASE offboard)`
  - `### 7.3 Zmiana operatora (CASE switch)`
  - `### 7.4 Brak zmian (CASE no-op)`
  - `## 8. Stan kodu`
  - `### 8.1 Zmiany już wykonane (workdir, niezacommitowane)`
  - `### 8.2 Zmiany jeszcze do wykonania w kodzie`
  - `### 8.3 Bez zmian (potwierdzone)`
  - `## 9. Treści maili (szablony)`
  - `### MAIL 1 — ADMIN ONBOARDING (auto z taska)`
  - `### MAIL 2 — OPERATOR WELCOME (admin wysyła ręcznie z szablonu)`
  - `### MAIL 3 — OPERATOR „CZEKAJ NA HASŁO" (auto z taska)`
  - `### MAIL 4 — ADMIN OFFBOARDING (auto z taska)`
  - `### MAIL 5 — OPERATOR OFFBOARDING (auto z taska)`
  - `### MAIL 6 — ADMIN ALERT WALIDACJI (auto z taska)`
  - `## 10. TO-DO admin console`
  - `### 10.1 Sprzątanie po pilocie`
  - `### 10.2 Aktualizacja etykiet grup (decyzja D11)`
  - `### 10.3 Skasowanie grup `sprzetowiec@` i `szkoleniowiec@``
  - `### 10.4 Utworzenie 4 kont funkcyjnych`
  - `### 10.5 Per konto: pierwsze logowanie + 2FA + backup codes`
  - `### 10.6 Domain-wide delegation — nowe scopes`
  - `### 10.7 Arkusz setup — dopisanie nowych zmiennych`
  - `## 11. TO-DO kod i deploy`
  - `### 11.1 Drobne korekty kodu (wg sekcji 8.2)`
  - `### 11.2 Build + lint + commit`
  - `### 11.3 Deploy`
  - `### 11.4 Lista posting policy refresh`
  - `## 12. Weryfikacja end-to-end`
  - `### 12.1 Dry-run sync (opcjonalny, ale polecam)`
  - `### 12.2 Realny sync`
  - `### 12.3 Skutki na Workspace`
  - `### 12.4 Maile`
  - `### 12.5 Akcje admin (×4)`
  - `### 12.6 Konfiguracja Gmail przez operatorów (×4)`
  - `### 12.7 Test wysyłki`
  - `### 12.8 Test reply`
  - `## 13. Ryzyka i mitigacje`
  - `## 14. Otwarte pytania`
  - `## Historia dokumentu`

### `Audyty/kajaki_w_mojej_wadze_plan.md`

- Lines: `216`
- Size: `7641` bytes
- Headings:
  - `# Plan: Filtr kajaków wg wagi użytkownika`
  - `## Context`
  - `## Dane i logika`
  - `## Pliki do zmodyfikowania`
  - `## Krok 1 – `functions/src/api/userWeightHandler.ts` (nowy)`
  - `## Krok 2 – `functions/src/index.ts``
  - `## Krok 3 – `firebase.json``
  - `## Krok 4 – `public/modules/gear_module.js``
  - `### 4a. Stała URL`
  - `### 4b. Stan`
  - `### 4c. HTML filtrów – dodać pill (w bloku isKayaksView, po "Prywatny")`
  - `### 4d. HTML popup modal – dodać na końcu listy modali`
  - `### 4e. Funkcja parseWeightRangeMax (na poziomie modułu)`
  - `### 4f. applyFilter – dodać warunek (w sekcji isKayaksView)`
  - `### 4g. Logika checkbox „Moja waga"`
  - `### 4h. Popup weight modal – logika otwierania/zamykania/zapisu`
  - `## Weryfikacja`

### `Audyty/konta testowe.md`

- Lines: `162`
- Size: `5572` bytes
- Headings:
  - `# KONTA TESTOWE — SKK Morzkulc`
  - `## Wymagania ogólne`
  - `## Minimalna lista kont testowych`
  - `### 1. Nowy użytkownik — brak w systemie`
  - `### 2. Nowy użytkownik — dopasowanie BO26 jako członek`
  - `### 3. Istniejący użytkownik — `rola_zarzad``
  - `### 4. Istniejący użytkownik — `rola_czlonek``
  - `### 5. Użytkownik zawieszony — `status_zawieszony``
  - `## Opcjonalne konta (pełne pokrycie)`
  - `## Jak skonfigurować konta 3, 4, 5`
  - `## Scenariusze testowe do wykonania`

### `Audyty/kurs_wdrożenie_ekrany.md`

- Lines: `196`
- Size: `8219` bytes
- Headings:
  - `# Plan: Ekran startowy + moduły dla kursantów (`rola_kursant`)`
  - `## Context`
  - `## Architektura danych`
  - `### Nowy Google Sheet: Kursanci`
  - `## Pliki do stworzenia (nowe)`
  - `### Backend`
  - `### Frontend`
  - `## Pliki do modyfikacji (istniejące)`
  - `### Backend`
  - `### Frontend`
  - `### Konfiguracja Firestore (`setup/app`)`
  - `## Szczegóły zmian frontendowych`
  - `### `render_shell.js` — wariant dla kursanta`
  - `### `modules_registry.js` — kurs module`
  - `## Tryb podglądu kursanta (`kursPreviewMode`)`
  - `### Mechanizm`
  - `### Ważne zastrzeżenia`
  - `### Konfiguracja Firestore`
  - `### Pliki wymagające zmian (dodatkowe względem bazowego planu)`
  - `## Kontrola dostępu`
  - `## Kolejność implementacji`
  - `## Weryfikacja end-to-end`
  - `# 1. Zbuduj i uruchom emulatora`
  - `# 2. W emulatorze Firestore: nadaj testowemu kontu role_key="rola_kursant"`
  - `# 3. Wejdź na http://localhost:5000 — sprawdź:`
  - `# - Start pokazuje kafelki Sprzęt / Basen / Kurs / Imprezy`
  - `# - Nawigacja: widoczny "Kurs", niewidoczne "Godzinki"`
  - `# - /api/kurs/info zwraca dane z arkusza`

### `Audyty/kursanc_ekrany_wdrozenie.md`

- Lines: `571`
- Size: `23042` bytes
- Headings:
  - `# Plan: Ekran startowy i aplikacja dla roli `rola_kursant``
  - `## Context`
  - `## Faza 0: Projekt Google Sheet (zrób ręcznie przed implementacją)`
  - `### Zakładka `Kurs` — metadane kursu`
  - `### Zakładka `Imprezy kursowe` — identyczny format jak zakładka `imprezy``
  - `## Faza 1: Backend`
  - `### 1.1 Env vars — `functions/src/service/service_config.ts``
  - `### 1.2 Nowy task sync — `functions/src/service/tasks/kursSyncFromSheet.ts``
  - `### 1.3 Rejestracja — `functions/src/service/registry.ts``
  - `### 1.4 Endpoint API — `functions/src/api/getKursInfoHandler.ts``
  - `### 1.5 Rejestracja endpointu — `functions/src/index.ts``
  - `## Faza 2: Frontend`
  - `### 2.1 Nowy moduł — `public/modules/kurs_module.js``
  - `### 2.2 Style — `public/styles/kurs.css``
  - `### 2.3 Rejestracja modułu — `public/core/modules_registry.js``
  - `### 2.4 Dashboard — `public/core/render_shell.js``
  - `### 2.5 Import CSS — `public/styles/app.css``
  - `## Faza 2.5: Tryb podglądu kursanta (`kursPreviewMode`)`
  - `### Backend — `functions/src/index.ts` (`filterSetupForUser`)`
  - `### Frontend — `app_shell.js``
  - `### Frontend — `render_shell.js` / `getDashboardConfig``
  - `### Konfiguracja Firestore dla trybu podglądu`
  - `## Faza 3: Konfiguracja Firestore (`setup/app`)`
  - `## Faza 4: Moduł Skrypt — cyfrowa wersja skryptu szkoleniowego`
  - `### 4.1 Struktura plików wynikowych`
  - `### 4.2 Konwersja LaTeX → HTML — mapa elementów`
  - `### 4.3 Rozdział po rozdziale — co uwzględnić`
  - `### 4.4 Nowy moduł — `public/modules/skrypt_module.js``
  - `### 4.5 Style — `public/styles/skrypt.css``
  - `### 4.6 Rejestracja — `modules_registry.js` i Firestore`
  - `### 4.7 Dashboard kursanta — kafelek Skrypt`
  - `## Kolejność implementacji`
  - `## Weryfikacja end-to-end`
  - `# 1. Build i emulator`
  - `# 2. W emulatorze Firestore:`
  - `# - users_active/{uid}.role_key = "rola_kursant"`
  - `# - setup/app.modules dodaj modul_kurs jak wyżej`
  - `# 3. Sprawdź kursant:`
  - `# - Dashboard: kafelki Sprzęt / Basen / Kurs / Imprezy (bez Godzinki i Składki)`
  - `# - Sekcja "Imprezy kursowe" ładuje się na dashboardzie`
  - `# - Nawigacja: widoczny "Kurs", niewidoczne "Godzinki"`
  - `# - Moduł Kurs: wyświetla dane kursu i imprezy kursowe`
  - `# 4. Sprawdź kursPreviewMode:`
  - `# - Dodaj uid członka zarządu do setup/app.modules.modul_kurs.access.testUsersAllow`
  - `# - Zaloguj się tym kontem → widok identyczny jak kursant`
  - `# - Usuń uid → widok wraca do normalnego`
  - `## Pliki do modyfikacji (podsumowanie)`
  - `## Pliki do stworzenia (nowe)`

### `Audyty/live_web_audyt_v1.md`

- Lines: `200`
- Size: `8371` bytes
- Headings:
  - `# RAPORT WERYFIKACJI AUDYTU — SKK Morzkulc`
  - `## 1. CO ZOSTAŁO SPRAWDZONE`
  - `## 2. WYNIKI WERYFIKACJI PER NIEZGODNOŚĆ`
  - `### ✅ NAPRAWIONE: 3.1 — CORS wildcard`
  - `### ✅ NAPRAWIONE: 3.2 — `session.screen` ignorowany w routingu`
  - `### ✅ NAPRAWIONE: 3.4 — Brak 5 rewrite'ów`
  - `### ✅ NAPRAWIONE: #11 — Hardcoded etykiety ról/statusów`
  - `### ✅ NAPRAWIONE: #12 — `MEMBER_LEVEL_ROLES` hardcoded`
  - `### ✅ NAPRAWIONE: #27 — Brak deduplicacji jobów membersSyncToSheet`
  - `### ❌ NIE NAPRAWIONE: 3.3 — Brak `firestore.rules``
  - `## 3. ŻYWA STRONA — OBSERWACJE`
  - `## 4. PODSUMOWANIE`
  - `## 5. REKOMENDACJA — POZOSTAŁE DO ZROBIENIA`
  - `### Priorytet 1 — Firestore Rules (bezpieczeństwo)`
  - `### Priorytet 2 — Weryfikacja routingu per rola`

### `Audyty/plan_audyt_v2.md`

- Lines: `270`
- Size: `28332` bytes
- Headings:
  - `# PLAN POPRAWY PO AUDYCIE V2`
  - `## 1. Cel planu`
  - `## 2. Zasady pracy`
  - `## 3. Kolejność napraw`
  - `## 4. Plan krok po kroku`
  - `### Etap 1 — Usunięcie wildcard CORS z `firebase.json``
  - `### Etap 2 — Dodanie brakujących 5 rewrite'ów do `firebase.json``
  - `### Etap 3 — Przywrócenie Firestore Rules do repo`
  - `### Etap 4 — Naprawa routingu startowego — użycie `session.screen``
  - `### Etap 5 — Usunięcie hardcoded etykiet ról/statusów w `render_shell.js``
  - `### Etap 6 — Usunięcie hardcoded etykiet w `membersSyncToSheet.ts``
  - `### Etap 7 — Usunięcie hardcoded `MEMBER_LEVEL_ROLES` w `onUserRegisteredWelcome.ts``
  - `### Etap 8 — Deduplicacja jobów `members.syncToSheet``
  - `### Etap 9 — Automatyczny scheduler dla `usersSyncRolesFromSheet``
  - `### Etap 10 — Mechanizm syncu `setup` z Google Sheets do Firestore`
  - `## 5. Lista etapów obowiązkowych`
  - `## 6. Macierz zależności`
  - `## 7. Minimalny plan wdrożeniowy`
  - `## 8. Zakres poza planem`

### `Audyty/plan_ranking_kilometrowka_mapa_v1.md`

- Lines: `394`
- Size: `15248` bytes
- Headings:
  - `# Plan naprawy: Ranking / Kilometrówka / Godziny / Wywrotolotek / Mapa`
  - `## KROK 0 — Odblokuj km = 0 (playspot)`
  - `### Co istnieje`
  - `### Co trzeba zmienić`
  - `### Jakie pliki`
  - `### Kryterium przejścia`
  - `## KROK 1 — Uporządkowanie modelu aktywności (pola wymagane i visibility)`
  - `### Co istnieje`
  - `### Co trzeba dodać`
  - `#### Backend `kmAddLogHandler.ts``
  - `#### Backend `km_log_service.ts``
  - `#### Rankingi i mapa (filtrowanie)`
  - `#### Frontend `km_module.js``
  - `### Jakie indeksy`
  - `### Jakie testy`
  - `### Kryterium przejścia`
  - `## KROK 2 — Trzy niezależne rankingi + domyślnie bieżący rok`
  - `### Co istnieje`
  - `### Co trzeba zmienić`
  - `#### Frontend `km_module.js``
  - `#### Backend `kmRankingsHandler.ts``
  - `### Jakie testy`
  - `### Kryterium przejścia`
  - `## KROK 3 — Formularz aktywności — kompletna walidacja backendowa`
  - `### Co istnieje`
  - `### Co trzeba sprawdzić i dopracować`
  - `#### Backend `kmAddLogHandler.ts``
  - `#### Frontend`
  - `### Kryterium przejścia`
  - `## KROK 4 — Lista imprez w formularzu (max 5, bez przyszłych, status)`
  - `### Co istnieje`
  - `### Co trzeba zmienić`
  - `#### Backend `events_service.ts``
  - `#### Frontend `km_module.js``
  - `### Kryterium przejścia`
  - `## KROK 5 — Miejsca i podpowiadanie (composite index + historyczne)`
  - `### Co istnieje`
  - `### Co trzeba dodać`
  - `#### `firestore.indexes.json``
  - `#### Backend `kmPlacesHandler.ts``
  - `#### GAS `archiwum_sync.gs``
  - `### Kryterium przejścia`
  - `## KROK 6 — Duplikaty miejsc i merge places`
  - `### Co istnieje`
  - `### Co trzeba zbudować`
  - `#### Backend — nowy endpoint admin`
  - `#### Frontend — panel zarządu`
  - `### Kryterium przejścia`
  - `## KROK 7 — Mapa (naprawy i funkcje)`
  - `### Co istnieje`
  - `### Co trzeba naprawić`
  - `#### Backend `kmRebuildMapData.ts``
  - `#### Backend `kmMapDataHandler.ts``
  - `#### Frontend `map.html``
  - `#### Frontend `km_module.js` (zakładka Mapa)`
  - `### Kryterium przejścia`
  - `## KROK 8 — Edycja i soft delete wpisów`
  - `### Co istnieje`
  - `### Co trzeba zbudować`
  - `#### Backend — nowe endpointy`
  - `#### Frontend `km_module.js` (zakładka Moje wpisy)`
  - `### Kryterium przejścia`
  - `## KROK 9 — Kursanci: ranking po roku i roli`
  - `### Co istnieje`
  - `### Co trzeba zbudować`
  - `#### Backend `kmRebuildUserStats.ts``
  - `#### Backend `kmRankingsHandler.ts``
  - `#### Frontend `km_module.js``
  - `### Kryterium przejścia`
  - `## KROK 10 — Testy E2E i smoke testy`
  - `### Co zbudować`
  - `#### `tests/test_km_logic.py` — testy jednostkowe logiki`
  - `#### `tests/e2e/test_km_api.py` — testy HTTP`
  - `#### `tests/e2e/test_km_mobile.py` (opcjonalne, Playwright)`
  - `### Kryterium przejścia`
  - `## Kolejność wykonania`
  - `## Pliki do zmiany w pierwszych krokach (priorytet)`

### `Audyty/plan_testow_logowanie_uzytkownicy_v1.md`

- Lines: `852`
- Size: `31744` bytes
- Headings:
  - `# Plan wdrożenia testów – logowanie, rejestracja, obsługa kont, bezpieczeństwo`
  - `## Przegląd zmian`
  - `## Krok 0 — Konfiguracja kont testowych (infrastruktura)`
  - `### 0.1 Utwórz konta w Firebase Auth (DEV: `sprzet-skk-morzkulc`)`
  - `### 0.2 Utwórz dokumenty w Firestore `users_active` (DEV)`
  - `### 0.3 Sprawdź `setup/app` — `statusMappings``
  - `### 0.4 Dodaj zmienne środowiskowe`
  - `## Krok 1 — `tests/test_security_http.py` (nowy plik)`
  - `### Wzorzec importów i setup`
  - `# tests/test_security_http.py`
  - `### Testy klasy `TestAuthMiddleware``
  - `### Testy klasy `TestHostAllowlist``
  - `### Testy klasy `TestSuspendedUser``
  - `## Krok 2 — `tests/e2e/config.py` (rozszerzenie)`
  - `# Dodaj do dataclass EnvConfig:`
  - `# Dodaj do bloku DEV = EnvConfig(...):`
  - `## Krok 3 — Rozszerzenie `phase_1_registration.py``
  - `### 3.1 Idempotentność rejestracji (L9)`
  - `# Po sukcesie P1 (user już zarejestrowany) — wywołaj register ponownie`
  - `### 3.2 Rejestracja z niekompletnym profilem (L7)`
  - `# Test z pustym profilem — profileComplete powinno być False`
  - `# To nie jest błąd krytyczny (user może już mieć profil z poprzedniego kroku),`
  - `# więc tylko logujemy ostrzeżenie.`
  - `## Krok 4 — `tests/test_register_bo26.py` (nowy plik)`
  - `# tests/test_register_bo26.py`
  - `## Krok 5 — `tests/e2e/phases/phase_A_suspended_user.py` (nowy plik)`
  - `## Krok 6 — `tests/e2e/phases/phase_B_module_visibility.py` (nowy plik)`
  - `## Krok 7 — Rozszerzenie `phase_2_role_change_via_sheet.py``
  - `# Sekwencja zmian ról do przetestowania: [(label_w_arkuszu, oczekiwany_role_key)]`
  - `## Krok 8 — Aktualizacja `tests/e2e/run_e2e.py``
  - `# Import nowych faz`
  - `# W liście faz (po phase_1_registration, przed phase_2_role_change):`
  - `## Krok 9 — Weryfikacja end-to-end`
  - `### 9.1 Testy bezpieczeństwa HTTP (bez Firebase emulatorów)`
  - `### 9.2 Testy logiki BO26`
  - `### 9.3 Pełne E2E z nowymi fazami`
  - `### 9.4 Sprawdzenie pokrycia po wdrożeniu`
  - `## Zależności i kolejność wykonania`

### `Audyty/plan_testow_ranking_kilometrowka_mapa_v1.md`

- Lines: `199`
- Size: `16483` bytes
- Headings:
  - `# Plan testów — Ranking / Kilometrówka / Mapa — v1`
  - `## Zakres`
  - `## Konta testowe wymagane`
  - `## Wymagania setUp / tearDown`
  - `## Tabela testów`
  - `## Kolejność implementacji`
  - `### Faza 1 — Core (P0, `test_km_api.py`)`
  - `### Faza 2 — Integralność Firestore (`test_km_firestore.py`)`
  - `### Faza 3 — Pozostałe endpointy (P1)`
  - `### Faza 4 — P2 i edge cases`
  - `## Zmiany wymagane poza plikami testowymi`
  - `### `tests/e2e/helpers/api_helper.py` — nowe metody`
  - `# POST /kmAddLog`
  - `# GET /kmMyLogs`
  - `# GET /kmMyStats`
  - `# GET /kmRankings`
  - `# GET /kmPlaces`
  - `# GET /api/km/map-data`
  - `# GET /api/km/event-stats`
  - `### `tests/e2e/config.py` — brak zmian`
  - `## Noty implementacyjne`

### `Audyty/ranking_wdrozenie_audyt.md`

- Lines: `275`
- Size: `12217` bytes
- Headings:
  - `# Audyt wdrożenia modułu Ranking (Kilometrówka)`
  - `## 1. Podsumowanie stanu`
  - `## 2. Co zostało wdrożone`
  - `### 2.1 Backend – Cloud Functions`
  - `### 2.2 Zmiany względem oryginalnej specyfikacji – scoring`
  - `### 2.3 Frontend`
  - `### 2.4 Google Apps Script – katalog `appscript/kilometrówka/``
  - `### 2.5 Firestore – nowe kolekcje`
  - `### 2.6 Indeksy Firestore (dodane do `firestore.indexes.json`)`
  - `## 3. Problem blokujący: brak danych w rankingu`
  - `### Przyczyna`
  - `### Rozwiązanie – wymagana akcja admina`
  - `## 4. Co NIE zostało wdrożone (świadome decyzje / future scope)`
  - `### 4.1 Mapa aktywności (Leaflet.js)`
  - `### 4.2 Automatyczny trigger rebuild po imporcie`
  - `### 4.3 Scoring version bump`
  - `### 4.4 Moduł Statystyki (modul_7)`
  - `### 4.5 Widok mapy (km_module, zakładka „Mapa")`
  - `### 4.6 Paginacja rankingu`
  - `### 4.7 km_places nie są zapełniane przy imporcie historycznym`
  - `## 5. Znane ograniczenia`
  - `## 6. Konfiguracja punktacji w arkuszu (istniejąca)`
  - `## 7. Lista akcji do wykonania`
  - `### Wymagane natychmiast`
  - `### Opcjonalne / przyszłe`
  - `## 8. Pliki wdrożone / zmodyfikowane (lista pełna)`
  - `### Nowe pliki (backend)`
  - `### Zmodyfikowane pliki (backend)`
  - `### Nowe pliki (frontend)`
  - `### Zmodyfikowane pliki (frontend)`
  - `### Nowe pliki (GAS)`

### `Audyty/RUN_TESTS.md`

- Lines: `224`
- Size: `6081` bytes
- Headings:
  - `# RUN_TESTS — Instrukcja uruchamiania testów`
  - `## Wymagania wstępne`
  - `### Python`
  - `# Zainstaluj zależności`
  - `# Playwright (tylko dla testów E2E przeglądarki)`
  - `### Uwierzytelnienie Firestore (ADC)`
  - `# Ustaw projekt domyślny (opcjonalnie)`
  - `### Plik .env.test`
  - `## Testy jednostkowe logiki (bez połączenia z Firebase)`
  - `# Wszystkie testy logiczne`
  - `# Tylko testy godzinek`
  - `# Tylko testy bundle`
  - `# Z raportem pokrycia`
  - `## Testy integracyjne HTTP (wymagają PROD + .env.test + ADC)`
  - `# Wszystkie testy HTTP na PROD`
  - `# Tylko rezerwacje`
  - `# Tylko godzinki`
  - `# Tylko bezpieczeństwo (nie wymaga .env.test)`
  - `# Uruchom konkretny test`
  - `# Verbose + pokaż print/log`
  - `### Ostrzeżenie`
  - `## Testy bezpieczeństwa HTTP (bez kont testowych)`
  - `## Testy E2E Playwright (planowane)`
  - `## Pełny zestaw (wszystkie testy)`
  - `# Z katalogu głównego projektu`
  - `## Konfiguracja logowania`
  - `## Konfiguracja timeoutów`
  - `## Znane ograniczenia`
  - `## CI/CD (GitHub Actions — opcjonalne)`

### `Audyty/TEST_DATA_REQUIREMENTS.md`

- Lines: `169`
- Size: `6261` bytes
- Headings:
  - `# TEST_DATA_REQUIREMENTS — Wymagania i instrukcja konfiguracji danych testowych`
  - `## 1. Konta testowe — przegląd`
  - `## 2. Instrukcja krok po kroku — tworzenie kont`
  - `### Krok 1 — Wypełnij plik `.env.test``
  - `# Główne konto testowe (czlonek)`
  - `# Kandydat`
  - `# Zarząd (dla testów boardDoesNotPay)`
  - `# KR`
  - `# Zawieszony`
  - `# Sympatyk`
  - `# Graniczny (dynamiczne saldo — zarządzane przez fixture)`
  - `# Admin — istniejące konto zarządu (Twoje własne)`
  - `# IDs sprzętu — OPCJONALNE`
  - `# Jeśli nie ustawione, testy auto-wykrywają sprzęt z API (GET /api/gear/kayaks, /items)`
  - `# Ustaw tylko jeśli chcesz wymusić konkretne egzemplarze`
  - `# PROD_TEST_KAYAK_ID_1=`
  - `# PROD_TEST_KAYAK_ID_2=`
  - `# PROD_TEST_KAYAK_ID_3=`
  - `# PROD_TEST_KAYAK_BASEN_ID=`
  - `# PROD_TEST_PADDLE_ID=`
  - `# PROD_TEST_LIFEJACKET_ID=`
  - `# PROD_TEST_HELMET_ID=`
  - `### Krok 5 — Zweryfikuj konfigurację`
  - `# Z katalogu tests/e2e/`
  - `# Test połączenia — nie wymaga kont (tylko token/host allowlist)`
  - `# Test autoryzacji — wymaga kont z .env.test`
  - `# Pełne testy godzinek`
  - `## 3. Sprzęt testowy w Firestore`
  - `### Minimalne wymagania co do katalogu`
  - `## 4. Setup (Firestore `setup/vars_gear` i `setup/vars_godzinki`)`
  - `## 5. Cleanup — jak testy dbają o porządek`

### `Audyty/test_logowania_wymagania_wstepne.md`

- Lines: `309`
- Size: `10957` bytes
- Headings:
  - `# Wymagania wstępne do uruchomienia testów logowania i bezpieczeństwa`
  - `## Lista kontrolna — przejdź po kolei, zaznacz każdy punkt`
  - `## BLOK A — Zależności Python (jednorazowe)`
  - `## BLOK B — Autoryzacja Firebase / Firestore (jednorazowe)`
  - `## BLOK C — Autoryzacja Google Sheets (jednorazowe)`
  - `## BLOK D — Konta testowe w Firebase Auth DEV (jednorazowe)`
  - `### D1. Konto testowe (główne) — już powinno istnieć`
  - `### D2. Konto admina — już powinno istnieć`
  - `### D3. Konto zawieszonego użytkownika — **NOWE, do utworzenia**`
  - `### D4. Konto skreślonego użytkownika — **NOWE, do utworzenia**`
  - `### D5. Konto nowego użytkownika spoza BO26 — **NOWE, do utworzenia**`
  - `## BLOK E — Konfiguracja setup/app w Firestore DEV (sprawdzenie)`
  - `## BLOK F — Plik .env.test`
  - `# === Środowisko ===`
  - `# === Konto testowe (główne — musi już istnieć i być zarejestrowane) ===`
  - `# === Konto admina ===`
  - `# === Konto zawieszonego (nowe — krok D3) ===`
  - `# === Konto skreślonego (nowe — krok D4) ===`
  - `# === Konto nowego użytkownika spoza BO26 (nowe — krok D5) ===`
  - `## BLOK G — Weryfikacja przed uruchomieniem`
  - `### G1. Testy bezpieczeństwa HTTP (nie wymagają arkusza ani gcloud)`
  - `### G2. Testy logiki BO26 i rejestracji`
  - `### G3. Pełne testy E2E`
  - `## BLOK H — Znane ograniczenia i pułapki`
  - `### H1. Test host allowlist (SKIP jest normalny)`
  - `### H2. Faza PA wymaga `blocksAccess: true` w Firestore`
  - `### H3. Faza P2 — etykieta "Kandydat" w roleMappings`
  - `### H4. Konto test-nowy musi być poza BO26`
  - `### H5. tearDown w test_register_bo26.py usuwa dane`
  - `## Szybki start (po wypełnieniu wszystkich bloków A-F)`
  - `# Testy bezpieczeństwa (szybkie, ~30s, nie wymagają Sheets)`
  - `# Pełne E2E (wolne, ~10-15 min)`

### `Audyty/TEST_MATRIX.md`

- Lines: `141`
- Size: `10480` bytes
- Headings:
  - `# TEST_MATRIX — Matryca testów audytowych`
  - `## A. AUTORYZACJA I DOSTĘP`
  - `## B. SETUP JAKO ŹRÓDŁO PRAWDY`
  - `## C. GODZINKI — SALDO I FIFO`
  - `## D. REZERWACJE — TWORZENIE`
  - `## E. REZERWACJE — EDYCJA I ANULOWANIE`
  - `## F. TESTY GRANICZNE`
  - `## G. BEZPIECZEŃSTWO`
  - `## H. REGRESJA`

### `Audyty/TO_DO_USERS.md`

- Lines: `117`
- Size: `6276` bytes
- Headings:
  - `# TO-DO: Test sprzętowca + dokończenie wdrożenia kont funkcyjnych`
  - `## Punkt wejścia na powrót`
  - `## Działa (zweryfikowane)`
  - `## Bloker do rozwiązania ręcznie: utworzenie joba `lista.enforcePostingPolicy``
  - `### Instrukcja (do wykonania samodzielnie)`
  - `### Co próbowane (dla referencji technicznej)`
  - `### Co trzeba zrobić żeby ścieżki B/C (automatyczne) zadziałały w przyszłości`
  - `## Do zrobienia w testowym flow (sprzętowiec)`
  - `## Po pomyślnym teście (pozostałe 3 funkcje)`
  - `## Otwarte porządki (osobno, nie blokujące)`

### `Audyty/users_wdrozenie_1.md`

- Lines: `394`
- Size: `13729` bytes
- Headings:
  - `# Wdrożenie: Obsługa kursantów — lista dyskusyjna i maile`
  - `## Kontekst i cel`
  - `## Prawa do lista@ według roli`
  - `## Infrastruktura już dostępna (nie trzeba zmieniać)`
  - `## Pliki do modyfikacji`
  - `## Krok 0 — jednorazowe zastosowanie ustawień grupy (przed lub zaraz po wdrożeniu)`
  - `## Krok 1 — `service_config.ts`: parametryczny mail powitalny`
  - `### Zmiana interfejsu (linia 14)`
  - `### Zmiana implementacji w `getServiceConfig()` (linia 119)`
  - `## Krok 2 — `onUserRegisteredWelcome.ts`: rola → dostęp do listy`
  - `### Pomocnicza funkcja (dodać po `MEMBER_LEVEL_ROLES`, ~linia 22)`
  - `### Step B (linia 58) — zastąp cały blok `if (!addedToListaGroupAt)``
  - `### Step A (linia 171) — email zależny od roli`
  - `## Krok 3 — `usersSyncRolesFromSheet.ts`: aktualizacja lista@ przy każdej zmianie roli`
  - `### Pomocnicza funkcja (dodać przed `syncWorkspaceGroupsForUser`)`
  - `### Treść maila o zmianie roli — rozszerz o sekcję lista@ (po `boardInstructions`, ~linia 293)`
  - `### Aktualizacja lista@ po wysłaniu maila (~linia 337)`
  - `## Kwestia istniejących kursantów w lista@`
  - `## Kolejność implementacji (jedna zmiana na raz, po każdej — build)`
  - `## Plan testów`
  - `### Test 1 — rejestracja kursanta`
  - `### Test 2 — rejestracja sympatyka`
  - `### Test 3 — rejestracja kandydata/członka`
  - `### Test 4 — zmiana roli kursant → kandydat (syncRolesFromSheet)`
  - `### Test 5 — zmiana roli kandydat → sympatyk (downgrade)`
  - `### Test 6 — zmiana roli kandydat → kursant (edge case)`
  - `### Test 7 — task `lista.enforcePostingPolicy``
  - `## Uwagi do implementacji`

### `Audyty/users_wdrozenie_1_TO_DO.MD`

- Lines: `139`
- Size: `6781` bytes
- Headings:
  - `# TO-DO po wdrożeniu `users_wdrozenie_1.md``
  - `## Kontekst`
  - `## Dlaczego potrzebny osobny workflow`
  - `## Krok 0 — uruchomienie `lista.enforcePostingPolicy``
  - `### A) DEV — projekt `sprzet-skk-morzkulc``
  - `### B) PROD — projekt `morzkulc-e9df7``
  - `## Jak to działa pod spodem`
  - `## Weryfikacja`
  - `### 1) Firestore — stan dokumentu`
  - `### 2) Logi Cloud Functions`
  - `### 3) Google Groups (efekt rzeczywisty)`
  - `## Pliki referencyjne (read-only)`
  - `## Po wykonaniu`
  - `## Tech debt (poza scope)`

### `Audyty/wdrożenia kalendarza.md`

- Lines: `176`
- Size: `6988` bytes
- Headings:
  - `# Plan: Własny Date Range Picker`
  - `## Context`
  - `## Podejście`
  - `## Nowe pliki`
  - `### `public/core/date_range_picker.js``
  - `### `public/styles/date_range_picker.css``
  - `## Modyfikacje istniejących plików`
  - `### `public/styles/app.css``
  - `### `public/sw.js``
  - `### `public/modules/gear_module.js``
  - `### `public/modules/impreza_module.js``
  - `### `public/modules/my_reservations_module.js``
  - `## Weryfikacja`

### `Audyty/zasady_ekrany_uzytkownikow.md`

- Lines: `95`
- Size: `2932` bytes
- Headings:
  - `# Zasady pracy z ekranami domowymi użytkowników`
  - `## Gdzie jest kod`
  - `## Skąd wiesz co pokazać`
  - `## Schemat pracy`
  - `### Dodanie sekcji tylko dla konkretnej roli`
  - `### Zmiana tekstu / CTA zależnie od uprawnień`
  - `### Dodanie nowej flagi per rola`
  - `### Dodanie nowej dozwolonej akcji`
  - `## Jedna zasada`
  - `## Jak to działa end-to-end`
  - `## Testowanie`

### `CLAUDE.md`

- Lines: `137`
- Size: `6051` bytes
- Headings:
  - `# CLAUDE.md`
  - `## Project Overview`
  - `## Commands`
  - `# Build TypeScript (required before deploy)`
  - `# Lint`
  - `# Watch mode (during development)`
  - `# Local emulator (builds first, then starts Firebase emulators)`
  - `# Deploy everything`
  - `# Deploy only functions`
  - `# Deploy only hosting`
  - `# Switch active Firebase project`
  - `## Architecture`
  - `### Frontend (`public/`)`
  - `### Backend (`functions/src/`)`
  - `### Security model`
  - `### Async job system (`functions/src/service/`)`
  - `### Firestore collections`
  - `### User roles and statuses`
  - `### Google Workspace integration`
  - `### Environment configuration`
  - `### API handler pattern`
  - `### ESLint`

### `instrukcje/konta_funkcyjne_i_grupy.md`

- Lines: `212`
- Size: `9961` bytes
- Headings:
  - `# Konta funkcyjne i grupy zarządu SKK Morzkulc`
  - `## TL;DR`
  - `## 1. Adresy `@morzkulc.pl` — szybka mapa`
  - `## 2. Konto vs grupa — różnica`
  - `## 3. `zarzad@` vs `zarzad_skk@` — najczęstsza pomyłka`
  - `### `zarzad@morzkulc.pl` — umbrella (kierownictwo klubu)`
  - `### `zarzad_skk@morzkulc.pl` — tylko aktualny zarząd`
  - `## 4. Konta funkcyjne — jak działają`
  - `### Model „Wyślij jako"`
  - `### Reply (odpowiedzi)`
  - `### Reguły sztywne`
  - `## 5. Setup w arkuszu — kto pełni jaką funkcję`
  - `### Zmiana operatora`
  - `### Walidacja (ZANIM cokolwiek się stanie)`
  - `## 6. Workflow — co się dzieje po zmianie w setup`
  - `### A. Nowy operator (onboarding)`
  - `### B. Zmiana operatora (switch)`
  - `### C. Usunięcie operatora (offboarding)`
  - `## 7. Kto może co zrobić`
  - `## 8. Ściąga — z jakiego adresu pisać`
  - `## 9. Bezpieczeństwo`
  - `## 10. Co zrobić, gdy coś nie działa`

### `tests/e2e/reports/e2e_prod_20260409_100718.md`

- Lines: `34`
- Size: `1758` bytes
- Headings:
  - `# E2E Test Report — PROD`
  - `## Phases`

### `tests/e2e/reports/e2e_prod_20260409_120139.md`

- Lines: `21`
- Size: `1500` bytes
- Headings:
  - `# E2E Test Report — PROD`
  - `## Phases`

### `tests/e2e/reports/e2e_prod_20260409_120535.md`

- Lines: `21`
- Size: `1750` bytes
- Headings:
  - `# E2E Test Report — PROD`
  - `## Phases`

### `tests/e2e/reports/e2e_prod_20260409_144924.md`

- Lines: `21`
- Size: `1716` bytes
- Headings:
  - `# E2E Test Report — PROD`
  - `## Phases`

## Other text files

- `.firebaserc` — 10 lines, 157 bytes
- `.gitattributes` — 4 lines, 71 bytes
- `.gitignore` — 65 lines, 1057 bytes
- `ai_full_audit_report.txt` — 1918 lines, 88991 bytes
- `appscript/członkowie sympatycy SKK/api_router` — 280 lines, 7928 bytes
- `functions/.gitignore` — 10 lines, 153 bytes
- `public/404.html` — 34 lines, 1808 bytes
- `public/index.html` — 52 lines, 2120 bytes
- `public/map.html` — 323 lines, 9987 bytes
- `public/skrypt_kurs/chapters/ch01.html` — 6 lines, 547 bytes
- `public/skrypt_kurs/chapters/ch02.html` — 201 lines, 11069 bytes
- `public/skrypt_kurs/chapters/ch03.html` — 169 lines, 9113 bytes
- `public/skrypt_kurs/chapters/ch04.html` — 21 lines, 1160 bytes
- `public/skrypt_kurs/chapters/ch05.html` — 132 lines, 7205 bytes
- `public/skrypt_kurs/chapters/ch06.html` — 265 lines, 13264 bytes
- `public/styles/app.css` — 10 lines, 254 bytes
- `public/styles/base.css` — 440 lines, 9623 bytes
- `public/styles/basen.css` — 266 lines, 4666 bytes
- `public/styles/dashboard.css` — 162 lines, 2708 bytes
- `public/styles/events.css` — 143 lines, 2366 bytes
- `public/styles/gear.css` — 1169 lines, 20867 bytes
- `public/styles/godzinki.css` — 120 lines, 1997 bytes
- `public/styles/km.css` — 496 lines, 10234 bytes
- `public/styles/kurs.css` — 430 lines, 7128 bytes
- `public/styles/start.css` — 206 lines, 5071 bytes
- `tests/e2e/.gitignore` — 8 lines, 101 bytes
- `tests/e2e/requirements.txt` — 7 lines, 141 bytes
