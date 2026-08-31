# Project Context Map

Generated at: `2026-08-31T08:19:46`
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

- Total scanned files: `523`
- Python files: `42`
- Script files JS/TS/GS/etc.: `339`
- Config files: `22`
- Markdown files: `91`
- Internal dependency edges: `565`

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
- DOCS/
  - Clode Design/
    - audyt-ux-skk-morzkulc.md
    - plan-naprawy-skk-morzkulc.md
  - Sessions & TO DOs/
    - 10.06_session_summary.md
    - 10.07_audyt_kursant_błąd.md
    - 11.08_blachy_i_brakujące_pola_TO_DO.md
    - 12.06_godzinki_audyt.md
    - 12.06_godzinki_podsumowanie.md
    - 12.06_godzinki_potencjalne_problemy.md
    - 12.06_imprezy_audyt.md
    - 12.06_imprezy_podsumowanie_wdrożenia.md
    - 12.06_panel_zarzadu_audyt.md
    - 12.06_panel_zarzadu_problemy_i_plan_wdrozenia.md
    - 12.06_podsumowanie_sesji_zarzad.md
    - 13.06_podsumowanie_wdrożenia_sesji_zarząd.md
    - 13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD
    - 15.06_audyt_invoker_funkcje.md
    - 15.06_zarząd_TO_DO.md
    - 16.06.bilans_otwarcia_plan.md
    - 16.06_bilans_otwarcia_TO_DO.md
    - 17.06_prywatny_sprzęt_TO_DO.md
    - 17.06_prywatny_sprzęt_audyt.md
    - 17.06_prywatny_sprzęt_podsumowanie.md
    - 17.08_audyt_kursant_wciaz_zablokowany.md
    - 17.08_konsolidacja_setup_i_dysk_PLAN_TO_DO.md
    - 17.08_kurs_wypożycza_PLAN_TO_DO.md
    - 17.08_setup_dane_do_wklejenia.md
    - 18.06_kandydat_audyt_TO_DO.md
    - 18.06_rejestracja_problemy_TO_DO.md
    - 18.06_rejestracja_problemy_podsumowaie.md
    - 18.06_rezerwacje_czas_audyt_TO_DO.md
    - 18.08_audyt_gotowosci_setup.md
    - 18.08_session_handoff.md
    - 20.08_naprawa_powiadomień.md
    - 20.08_opisy_imprez_TO_DO.md
    - 21.08_wyświetlnie_zdjęć_TO_DO.md
    - 24.07_klucze.md
    - 24.08_basen_plan.md
    - 26.06_o_klubie.md
    - 26.06_raporty_zarzadu_v1.md
    - 26.06_rapotry_sessoin_summary.md
    - 27.06_godzinki_poprawki.md
    - 27.06_session_summaty_raporty.md
    - 28.06_rola_kursant_TO_DO.md
    - 28.07_basen_stara_aplikacja.md
    - 29.07_basen_logika_biznesowa.md
    - 29.08_basen_wdrozenie_i_start_demo.md
    - 31.08_basen_deploy_prod_i_diagnostyka.md
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
    - basen_TO_DO.md
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
  - 1_App_SETUP/
    - appsscript.json
    - backend_sync.gs
    - config.gs
    - setup_sync.gs
    - ui_menu.gs
  - 2_Członkowie Godzinki Imprezy/
    - api_router
    - appsscript.json
    - common_helpers.gs
    - env_config.gs
    - events_sync.gs
    - hours_sync.gs
    - opening_balance_import.gs
    - ui_menu.gs
    - users_sync.gs
  - 3_Sprzęt/
    - appsscript.json
    - backend_sync.gs
    - config.gs
    - menu.gs
    - sync_kayaks.gs
  - 5_kilometrówka_archiwum 2025/
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
    - po_kursie_sync.gs
    - ui_menu.gs
- functions/
  - lib/
    - api/
      - DELETE_getModulesHandler.js
      - adminApprovalHandler.js
      - adminEventsSyncCalendarHandler.js
      - adminGearReservationCancelHandler.js
      - basenAdminAddGodzinyHandler.js
      - basenAdminCorrectGodzinyHandler.js
      - basenAdminSearchUsersHandler.js
      - basenCancelEnrollmentHandler.js
      - basenCancelSessionHandler.js
      - basenCreateSessionHandler.js
      - basenEnrollHandler.js
      - basenGrantKarnetHandler.js
      - checkNicknameAvailabilityHandler.js
      - eventInterestToggleHandler.js
      - gearBundleReservationCreateHandler.js
      - gearFavoriteToggleHandler.js
      - gearKayaksListHandler.js
      - gearMyReservationsHandler.js
      - gearReservationCancelHandler.js
      - gearReservationCreateHandler.js
      - gearReservationUpdateHandler.js
      - getAdminGearRentalsHandler.js
      - getAdminGearTopRentalsHandler.js
      - getAdminMemberActivityHandler.js
      - getAdminMemberDuesHandler.js
      - getAdminPendingHandler.js
      - getAdminUserActivityHandler.js
      - getBasenGodzinyHandler.js
      - getBasenKarnetyHandler.js
      - getBasenSessionsHandler.js
      - getEventInterestsHandler.js
      - getEventsHandler.js
      - getGearFavoritesHandler.js
      - getGearItemAvailabilityHandler.js
      - getGearItemsHandler.js
      - getGearKayaksHandler.js
      - getGodzinkiHandler.js
      - getKayakReservationsHandler.js
      - getKlubInfoHandler.js
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
      - notificationPrefsHandler.js
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
          - reservation_limits.js
      - hours/
        - godzinki_service.js
        - godzinki_vars.js
        - hours_quote.js
        - opening_balance_fields.js
      - km/
        - km_log_service.js
        - km_places_service.js
        - km_scoring.js
        - km_vars.js
      - setup/
        - app_vars.js
        - events_vars.js
        - setup_gear_vars.js
      - shared/
        - text_utils.js
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
        - adminApprovalWriteBack.js
        - adminNotifyPendingApprovals.js
        - basenNotifySessionCancelled.js
        - eventsNotifyNew.js
        - eventsNotifyUpcoming.js
        - eventsSyncCalendar.js
        - eventsSyncFromSheet.js
        - gearNotifyReservationCancelledByAdmin.js
        - gearPrivateStorage.js
        - gearSyncAllFromSheet.js
        - gearSyncKayaksFromSheet.js
        - godzinkiArchiveSheetRows.js
        - godzinkiImportTransitionFromSheet.js
        - godzinkiMergeHistoricalUser.js
        - godzinkiMonthlyBalanceReview.js
        - godzinkiSyncFromSheet.js
        - groupsDiagnose.js
        - kmMergeHistoricalUser.js
        - kmRebuildMapData.js
        - kmRebuildRankings.js
        - kmRebuildUserStats.js
        - kursSyncFromSheet.js
        - listaEnforcePostingPolicy.js
        - membersSyncToSheet.js
        - onUserRegisteredWelcome.js
        - reconcileOpeningBalance.js
        - reconcileWorkspaceGroups.js
        - setupSyncFromSheet.js
        - usersNotifyAkademikAccessChanged.js
        - usersSyncFieldsFromSheet.js
        - usersSyncFunctionRolesFromSetup.js
        - usersSyncRolesFromSheet.js
      - triggers/
        - onEventApproved.js
        - onUsersActiveCreated.js
      - worker/
        - fallbackDailyWorker.js
        - jobProcessor.js
        - onJobCreatedWorker.js
      - registry.js
      - runner.js
      - service_config.js
      - types.js
      - workspaceGroupSync.js
    - index.js
  - scripts/
    - auditInvoker.js
    - auditInvokerDebug.js
    - backfillEntryFeePaidAt.js
    - checkGearReport.js
    - checkKlubFinanceLeak.js
    - checkMemberActivity.js
    - checkUserGearReservations.js
    - checkUserGodzinkiHome.js
    - deleteGhostGodzinki.js
    - deleteStuckJob.js
    - enqueueEventsNotifyUpcoming.js
    - enqueueGodzinkiTransitionImport.js
    - enqueueGroupsDiagnose.js
    - enqueueListaPolicy.js
    - enqueueReconcileOpeningBalance.js
    - enqueueReconcileWorkspaceGroups.js
    - fixGhostApprovals.js
    - investigateEventNotif.js
    - previewOpeningBalanceReconcile.js
    - printFnUrls.js
    - readEvents.js
    - readGearCollections.js
    - readGroupsDiag.js
    - readPendingApprovals.js
    - readServiceJobs.js
    - readUsersActive.js
    - removeEventsFromApp.js
    - runReconcileOpeningBalance.js
    - verifyDeploy.js
    - waiveUserGearCharges.js
  - src/
    - api/
      - adminApprovalHandler.ts
      - adminEventsSyncCalendarHandler.ts
      - adminGearReservationCancelHandler.ts
      - basenCancelEnrollmentHandler.ts
      - basenCancelSessionHandler.ts
      - basenCreateSessionHandler.ts
      - basenEnrollHandler.ts
      - basenGrantKarnetHandler.ts
      - basenSetKayakHandler.ts
      - checkNicknameAvailabilityHandler.ts
      - eventInterestToggleHandler.ts
      - gearBundleReservationCreateHandler.ts
      - gearFavoriteToggleHandler.ts
      - gearKayaksListHandler.ts
      - gearMyReservationsHandler.ts
      - gearReservationCancelHandler.ts
      - gearReservationCreateHandler.ts
      - gearReservationUpdateHandler.ts
      - getAdminGearRentalsHandler.ts
      - getAdminGearTopRentalsHandler.ts
      - getAdminMemberActivityHandler.ts
      - getAdminMemberDuesHandler.ts
      - getAdminPendingHandler.ts
      - getAdminUserActivityHandler.ts
      - getBasenAttendeesHandler.ts
      - getBasenKarnetyHandler.ts
      - getBasenKayaksHandler.ts
      - getBasenSessionsHandler.ts
      - getEventInterestsHandler.ts
      - getEventsHandler.ts
      - getGearFavoritesHandler.ts
      - getGearItemAvailabilityHandler.ts
      - getGearItemsHandler.ts
      - getGearKayaksHandler.ts
      - getGodzinkiHandler.ts
      - getKayakReservationsHandler.ts
      - getKlubInfoHandler.ts
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
      - notificationPrefsHandler.ts
      - registerUserHandler.ts
      - submitEventHandler.ts
      - submitGodzinkiHandler.ts
      - userWeightHandler.ts
    - modules/
      - basen/
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
          - reservation_limits.ts
      - hours/
        - godzinki_service.ts
        - godzinki_vars.ts
        - hours_quote.ts
        - opening_balance_fields.ts
      - km/
        - km_log_service.ts
        - km_places_service.ts
        - km_scoring.ts
        - km_vars.ts
      - setup/
        - app_vars.ts
        - events_vars.ts
        - function_roles_service.ts
        - setup_gear_vars.ts
      - shared/
        - text_utils.ts
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
        - adminApprovalWriteBack.ts
        - adminNotifyPendingApprovals.ts
        - basenNotifySessionCancelled.ts
        - eventsNotifyNew.ts
        - eventsNotifyUpcoming.ts
        - eventsSyncCalendar.ts
        - eventsSyncFromSheet.ts
        - gearNotifyReservationCancelledByAdmin.ts
        - gearPrivateStorage.ts
        - gearSyncAllFromSheet.ts
        - godzinkiArchiveSheetRows.ts
        - godzinkiImportTransitionFromSheet.ts
        - godzinkiMergeHistoricalUser.ts
        - godzinkiMonthlyBalanceReview.ts
        - godzinkiSyncFromSheet.ts
        - groupsDiagnose.ts
        - kmMergeHistoricalUser.ts
        - kmRebuildMapData.ts
        - kmRebuildRankings.ts
        - kmRebuildUserStats.ts
        - kursSyncFromSheet.ts
        - listaEnforcePostingPolicy.ts
        - membersSyncToSheet.ts
        - onUserRegisteredWelcome.ts
        - reconcileOpeningBalance.ts
        - reconcileWorkspaceGroups.ts
        - setupSyncFromSheet.ts
        - usersNotifyAkademikAccessChanged.ts
        - usersSyncFieldsFromSheet.ts
        - usersSyncFunctionRolesFromSetup.ts
        - usersSyncRolesFromSheet.ts
      - triggers/
        - onEventApproved.ts
        - onUsersActiveCreated.ts
      - worker/
        - fallbackDailyWorker.ts
        - jobProcessor.ts
        - onJobCreatedWorker.ts
      - registry.ts
      - runner.ts
      - service_config.ts
      - types.ts
      - workspaceGroupSync.ts
    - index.ts
  - test/
    - events_core.test.ts
    - faza2_core.test.ts
    - gear_core.test.ts
    - godzinki_core.test.ts
    - setup_consolidation.test.ts
    - sync_core.test.ts
    - workspace_group_sync.test.ts
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
    - sw_update.js
    - text_format.js
    - theme.js
    - user_error_messages.js
  - modules/
    - raporty/
      - gear_rentals.js
      - member_activity.js
      - member_dues.js
      - registry.js
      - reports_panel.js
      - top_rentals.js
      - user_activity.js
    - admin_pending_module.js
    - basen_module.js
    - gear_module.js
    - godzinki_module.js
    - impreza_module.js
    - klub_module.js
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
      - events_e2e_run.txt
      - godzinki_e2e_run.txt
    - .gitignore
    - config.py
    - conftest.py
    - oauth_client.json
    - phase0_sheet_fixes.py
    - read_sheet_approvals.py
    - read_sheet_headers.py
    - requirements.txt
    - run_e2e.py
    - seed_test_accounts.py
    - test_events_api.py
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
- READ_ME.md
- ai_full_audit_report.json
- ai_full_audit_report.txt
- firebase.json
- firestore.indexes.json
- project_context.py
```

## Internal dependency map

- `functions/lib/api/adminApprovalHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/adminApprovalHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/adminGearReservationCancelHandler.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
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
- `functions/lib/api/gearReservationCreateHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/gearReservationCreateHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/gearReservationUpdateHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/gearReservationUpdateHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/getAdminGearTopRentalsHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/getAdminMemberDuesHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/getAdminPendingHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/getAdminPendingHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/getAdminPendingHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/getAdminPendingHandler.js` -> `functions/lib/service/service_config.js`
- `functions/lib/api/getAdminUserActivityHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
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
- `functions/lib/api/godzinkiPurchaseHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/godzinkiPurchaseHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_places_service.js`
- `functions/lib/api/kmAddLogHandler.js` -> `functions/lib/modules/km/km_vars.js`
- `functions/lib/api/kmMyLogsHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmMyStatsHandler.js` -> `functions/lib/modules/km/km_log_service.js`
- `functions/lib/api/kmPlacesHandler.js` -> `functions/lib/modules/km/km_places_service.js`
- `functions/lib/api/notificationPrefsHandler.js` -> `functions/lib/modules/setup/events_vars.js`
- `functions/lib/api/registerUserHandler.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/api/registerUserHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/registerUserHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/registerUserHandler.js` -> `functions/lib/modules/hours/opening_balance_fields.js`
- `functions/lib/api/submitEventHandler.js` -> `functions/lib/modules/calendar/events_service.js`
- `functions/lib/api/submitEventHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/api/submitGodzinkiHandler.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/index.js` -> `functions/lib/api/adminApprovalHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/adminEventsSyncCalendarHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/adminGearReservationCancelHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminAddGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminCorrectGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenAdminSearchUsersHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCancelEnrollmentHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCancelSessionHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenCreateSessionHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenEnrollHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/basenGrantKarnetHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/checkNicknameAvailabilityHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/eventInterestToggleHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearBundleReservationCreateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearFavoriteToggleHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearMyReservationsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationCancelHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationCreateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/gearReservationUpdateHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminGearRentalsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminGearTopRentalsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminMemberActivityHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminMemberDuesHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminPendingHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getAdminUserActivityHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenGodzinyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenKarnetyHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getBasenSessionsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getEventInterestsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getEventsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearFavoritesHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearItemAvailabilityHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearItemsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGearKayaksHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getGodzinkiHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getKayakReservationsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/getKlubInfoHandler.js`
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
- `functions/lib/index.js` -> `functions/lib/api/notificationPrefsHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/registerUserHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/submitEventHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/submitGodzinkiHandler.js`
- `functions/lib/index.js` -> `functions/lib/api/userWeightHandler.js`
- `functions/lib/index.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/index.js` -> `functions/lib/service/admin/adminRunTask.js`
- `functions/lib/index.js` -> `functions/lib/service/runner.js`
- `functions/lib/index.js` -> `functions/lib/service/service_config.js`
- `functions/lib/index.js` -> `functions/lib/service/triggers/onEventApproved.js`
- `functions/lib/index.js` -> `functions/lib/service/triggers/onUsersActiveCreated.js`
- `functions/lib/index.js` -> `functions/lib/service/worker/fallbackDailyWorker.js`
- `functions/lib/index.js` -> `functions/lib/service/worker/onJobCreatedWorker.js`
- `functions/lib/modules/calendar/events_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/equipment/shared/reservation_limits.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/hours/hours_quote.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/modules/equipment/bundle/gear_bundle_service.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/equipment/shared/reservation_limits.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/hours/hours_quote.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js` -> `functions/lib/modules/users/userStatusCheck.js`
- `functions/lib/modules/equipment/shared/reservation_limits.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/hours/hours_quote.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/modules/km/km_log_service.js` -> `functions/lib/modules/km/km_scoring.js`
- `functions/lib/service/admin/adminRunTask.js` -> `functions/lib/service/runner.js`
- `functions/lib/service/admin/adminRunTask.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/providers/googleCalendarProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/providers/googleSheetsProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/providers/googleWorkspaceProvider.js` -> `functions/lib/service/providers/googleAuth.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/adminApprovalWriteBack.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/adminNotifyPendingApprovals.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/basenNotifySessionCancelled.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsNotifyNew.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsNotifyUpcoming.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsSyncCalendar.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/eventsSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/gearNotifyReservationCancelledByAdmin.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/gearPrivateStorage.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/gearSyncAllFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiArchiveSheetRows.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiMergeHistoricalUser.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/godzinkiSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/groupsDiagnose.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmMergeHistoricalUser.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildMapData.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildRankings.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kmRebuildUserStats.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/kursSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/listaEnforcePostingPolicy.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/membersSyncToSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/onUserRegisteredWelcome.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/reconcileOpeningBalance.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/reconcileWorkspaceGroups.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/setupSyncFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersNotifyAkademikAccessChanged.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersSyncFieldsFromSheet.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`
- `functions/lib/service/registry.js` -> `functions/lib/service/tasks/usersSyncRolesFromSheet.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/providers/googleWorkspaceProvider.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/registry.js`
- `functions/lib/service/runner.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/adminApprovalWriteBack.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/adminApprovalWriteBack.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/adminNotifyPendingApprovals.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/adminNotifyPendingApprovals.js` -> `functions/lib/modules/setup/app_vars.js`
- `functions/lib/service/tasks/adminNotifyPendingApprovals.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/adminNotifyPendingApprovals.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/basenNotifySessionCancelled.js` -> `functions/lib/modules/basen/basen_service.js`
- `functions/lib/service/tasks/eventsNotifyNew.js` -> `functions/lib/modules/setup/app_vars.js`
- `functions/lib/service/tasks/eventsNotifyNew.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/eventsNotifyUpcoming.js` -> `functions/lib/modules/calendar/calendar_utils.js`
- `functions/lib/service/tasks/eventsNotifyUpcoming.js` -> `functions/lib/modules/setup/app_vars.js`
- `functions/lib/service/tasks/eventsNotifyUpcoming.js` -> `functions/lib/modules/setup/events_vars.js`
- `functions/lib/service/tasks/eventsNotifyUpcoming.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/eventsSyncCalendar.js` -> `functions/lib/service/providers/googleCalendarProvider.js`
- `functions/lib/service/tasks/eventsSyncCalendar.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/providers/googleCalendarProvider.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/eventsSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/gearNotifyReservationCancelledByAdmin.js` -> `functions/lib/modules/setup/app_vars.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/setup/setup_gear_vars.js`
- `functions/lib/service/tasks/gearPrivateStorage.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/gearSyncAllFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/gearSyncAllFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/gearSyncKayaksFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/gearSyncKayaksFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/godzinkiArchiveSheetRows.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/godzinkiArchiveSheetRows.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/godzinkiArchiveSheetRows.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js` -> `functions/lib/modules/setup/app_vars.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/modules/shared/text_utils.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/godzinkiSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/kmRebuildRankings.js` -> `functions/lib/service/tasks/kmRebuildUserStats.js`
- `functions/lib/service/tasks/kmRebuildUserStats.js` -> `functions/lib/modules/km/km_scoring.js`
- `functions/lib/service/tasks/kmRebuildUserStats.js` -> `functions/lib/modules/km/km_vars.js`
- `functions/lib/service/tasks/kursSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/kursSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/membersSyncToSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/membersSyncToSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/onUserRegisteredWelcome.js` -> `functions/lib/service/workspaceGroupSync.js`
- `functions/lib/service/tasks/reconcileOpeningBalance.js` -> `functions/lib/modules/hours/godzinki_service.js`
- `functions/lib/service/tasks/reconcileOpeningBalance.js` -> `functions/lib/modules/hours/godzinki_vars.js`
- `functions/lib/service/tasks/reconcileOpeningBalance.js` -> `functions/lib/modules/hours/opening_balance_fields.js`
- `functions/lib/service/tasks/reconcileWorkspaceGroups.js` -> `functions/lib/service/workspaceGroupSync.js`
- `functions/lib/service/tasks/setupSyncFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/setupSyncFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/usersSyncFieldsFromSheet.js` -> `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
- `functions/lib/service/tasks/usersSyncFieldsFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/usersSyncFieldsFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/providers/googleSheetsProvider.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/providers/googleWorkspaceProvider.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/tasks/usersSyncRolesFromSheet.js` -> `functions/lib/service/workspaceGroupSync.js`
- `functions/lib/service/triggers/onEventApproved.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/triggers/onUsersActiveCreated.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/fallbackDailyWorker.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/fallbackDailyWorker.js` -> `functions/lib/service/worker/jobProcessor.js`
- `functions/lib/service/worker/jobProcessor.js` -> `functions/lib/service/runner.js`
- `functions/lib/service/worker/jobProcessor.js` -> `functions/lib/service/service_config.js`
- `functions/lib/service/worker/onJobCreatedWorker.js` -> `functions/lib/service/worker/jobProcessor.js`
- `functions/scripts/checkGearReport.js` -> `functions/lib/api/getAdminGearRentalsHandler.js`
- `functions/scripts/checkKlubFinanceLeak.js` -> `functions/lib/api/getKlubInfoHandler.js`
- `functions/scripts/checkMemberActivity.js` -> `functions/lib/api/getAdminMemberActivityHandler.js`
- `functions/scripts/runReconcileOpeningBalance.js` -> `functions/lib/service/tasks/reconcileOpeningBalance.js`
- `functions/src/api/adminApprovalHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/adminApprovalHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/adminGearReservationCancelHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/basenCancelEnrollmentHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenCancelSessionHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenCreateSessionHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenEnrollHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenEnrollHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/basenGrantKarnetHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/basenSetKayakHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/gearBundleReservationCreateHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/gearKayaksListHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearMyReservationsHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearReservationCancelHandler.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/gearReservationCreateHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/gearReservationUpdateHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/gearReservationUpdateHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/getAdminGearTopRentalsHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/getAdminMemberDuesHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/getAdminPendingHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/getAdminPendingHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/getAdminPendingHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/getAdminPendingHandler.ts` -> `functions/src/service/service_config.ts`
- `functions/src/api/getAdminUserActivityHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/getBasenAttendeesHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getBasenKarnetyHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getBasenKayaksHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getBasenSessionsHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/getEventsHandler.ts` -> `functions/src/modules/calendar/events_service.ts`
- `functions/src/api/getGearItemAvailabilityHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/getGearItemAvailabilityHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/getGearItemsHandler.ts` -> `functions/src/modules/equipment/shared/gear_catalog_service.ts`
- `functions/src/api/getGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/getGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/getKursInfoHandler.ts` -> `functions/src/service/service_config.ts`
- `functions/src/api/godzinkiPurchaseHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/godzinkiPurchaseHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/godzinkiPurchaseHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_places_service.ts`
- `functions/src/api/kmAddLogHandler.ts` -> `functions/src/modules/km/km_vars.ts`
- `functions/src/api/kmMyLogsHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmMyStatsHandler.ts` -> `functions/src/modules/km/km_log_service.ts`
- `functions/src/api/kmPlacesHandler.ts` -> `functions/src/modules/km/km_places_service.ts`
- `functions/src/api/notificationPrefsHandler.ts` -> `functions/src/modules/setup/events_vars.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/registerUserHandler.ts` -> `functions/src/modules/hours/opening_balance_fields.ts`
- `functions/src/api/submitEventHandler.ts` -> `functions/src/modules/calendar/events_service.ts`
- `functions/src/api/submitEventHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/api/submitGodzinkiHandler.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/index.ts` -> `functions/src/api/adminApprovalHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/adminEventsSyncCalendarHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/adminGearReservationCancelHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCancelEnrollmentHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCancelSessionHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenCreateSessionHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenEnrollHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenGrantKarnetHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/basenSetKayakHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/checkNicknameAvailabilityHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/eventInterestToggleHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearBundleReservationCreateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearFavoriteToggleHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearMyReservationsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationCancelHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationCreateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/gearReservationUpdateHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminGearRentalsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminGearTopRentalsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminMemberActivityHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminMemberDuesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminPendingHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getAdminUserActivityHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenAttendeesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenKarnetyHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenKayaksHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getBasenSessionsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getEventInterestsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getEventsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearFavoritesHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearItemAvailabilityHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearItemsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGearKayaksHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getGodzinkiHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getKayakReservationsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/getKlubInfoHandler.ts`
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
- `functions/src/index.ts` -> `functions/src/api/notificationPrefsHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/registerUserHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/submitEventHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/submitGodzinkiHandler.ts`
- `functions/src/index.ts` -> `functions/src/api/userWeightHandler.ts`
- `functions/src/index.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/index.ts` -> `functions/src/service/admin/adminRunTask.ts`
- `functions/src/index.ts` -> `functions/src/service/runner.ts`
- `functions/src/index.ts` -> `functions/src/service/service_config.ts`
- `functions/src/index.ts` -> `functions/src/service/triggers/onEventApproved.ts`
- `functions/src/index.ts` -> `functions/src/service/triggers/onUsersActiveCreated.ts`
- `functions/src/index.ts` -> `functions/src/service/worker/fallbackDailyWorker.ts`
- `functions/src/index.ts` -> `functions/src/service/worker/onJobCreatedWorker.ts`
- `functions/src/modules/basen/basen_service.ts` -> `functions/src/modules/setup/function_roles_service.ts`
- `functions/src/modules/calendar/events_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/equipment/shared/reservation_limits.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/hours/hours_quote.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/modules/equipment/bundle/gear_bundle_service.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/equipment/shared/reservation_limits.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/hours/hours_quote.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts` -> `functions/src/modules/users/userStatusCheck.ts`
- `functions/src/modules/equipment/shared/reservation_limits.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
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
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/adminApprovalWriteBack.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/adminNotifyPendingApprovals.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/basenNotifySessionCancelled.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsNotifyNew.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsNotifyUpcoming.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsSyncCalendar.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/eventsSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/gearNotifyReservationCancelledByAdmin.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/gearPrivateStorage.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/gearSyncAllFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiArchiveSheetRows.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiMergeHistoricalUser.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/groupsDiagnose.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmMergeHistoricalUser.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildMapData.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildRankings.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kmRebuildUserStats.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/kursSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/listaEnforcePostingPolicy.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/membersSyncToSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/onUserRegisteredWelcome.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/reconcileOpeningBalance.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/reconcileWorkspaceGroups.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/setupSyncFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersNotifyAkademikAccessChanged.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersSyncFieldsFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/tasks/usersSyncRolesFromSheet.ts`
- `functions/src/service/registry.ts` -> `functions/src/service/types.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/registry.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/runner.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/adminApprovalWriteBack.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/adminApprovalWriteBack.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/adminApprovalWriteBack.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/adminNotifyPendingApprovals.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/adminNotifyPendingApprovals.ts` -> `functions/src/modules/setup/app_vars.ts`
- `functions/src/service/tasks/adminNotifyPendingApprovals.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/adminNotifyPendingApprovals.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/adminNotifyPendingApprovals.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/basenNotifySessionCancelled.ts` -> `functions/src/modules/basen/basen_service.ts`
- `functions/src/service/tasks/basenNotifySessionCancelled.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsNotifyNew.ts` -> `functions/src/modules/setup/app_vars.ts`
- `functions/src/service/tasks/eventsNotifyNew.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/eventsNotifyNew.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsNotifyUpcoming.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/src/service/tasks/eventsNotifyUpcoming.ts` -> `functions/src/modules/setup/app_vars.ts`
- `functions/src/service/tasks/eventsNotifyUpcoming.ts` -> `functions/src/modules/setup/events_vars.ts`
- `functions/src/service/tasks/eventsNotifyUpcoming.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/eventsNotifyUpcoming.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/providers/googleCalendarProvider.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/eventsSyncCalendar.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/providers/googleCalendarProvider.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/eventsSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/gearNotifyReservationCancelledByAdmin.ts` -> `functions/src/modules/setup/app_vars.ts`
- `functions/src/service/tasks/gearNotifyReservationCancelledByAdmin.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/gearPrivateStorage.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/gearSyncAllFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/gearSyncAllFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/gearSyncAllFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiArchiveSheetRows.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/godzinkiArchiveSheetRows.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/godzinkiArchiveSheetRows.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/godzinkiArchiveSheetRows.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiMergeHistoricalUser.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts` -> `functions/src/modules/setup/app_vars.ts`
- `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/modules/shared/text_utils.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/godzinkiSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/groupsDiagnose.ts` -> `functions/src/service/types.ts`
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
- `functions/src/service/tasks/onUserRegisteredWelcome.ts` -> `functions/src/service/workspaceGroupSync.ts`
- `functions/src/service/tasks/reconcileOpeningBalance.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/src/service/tasks/reconcileOpeningBalance.ts` -> `functions/src/modules/hours/godzinki_vars.ts`
- `functions/src/service/tasks/reconcileOpeningBalance.ts` -> `functions/src/modules/hours/opening_balance_fields.ts`
- `functions/src/service/tasks/reconcileOpeningBalance.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/reconcileWorkspaceGroups.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/src/service/tasks/reconcileWorkspaceGroups.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/reconcileWorkspaceGroups.ts` -> `functions/src/service/workspaceGroupSync.ts`
- `functions/src/service/tasks/setupSyncFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/setupSyncFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/setupSyncFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersNotifyAkademikAccessChanged.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncFieldsFromSheet.ts` -> `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
- `functions/src/service/tasks/usersSyncFieldsFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/usersSyncFieldsFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/usersSyncFieldsFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/types.ts`
- `functions/src/service/tasks/usersSyncRolesFromSheet.ts` -> `functions/src/service/workspaceGroupSync.ts`
- `functions/src/service/triggers/onEventApproved.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/triggers/onUsersActiveCreated.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/fallbackDailyWorker.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/fallbackDailyWorker.ts` -> `functions/src/service/worker/jobProcessor.ts`
- `functions/src/service/worker/jobProcessor.ts` -> `functions/src/service/runner.ts`
- `functions/src/service/worker/jobProcessor.ts` -> `functions/src/service/service_config.ts`
- `functions/src/service/worker/onJobCreatedWorker.ts` -> `functions/src/service/worker/jobProcessor.ts`
- `functions/src/service/workspaceGroupSync.ts` -> `functions/src/service/providers/googleWorkspaceProvider.ts`
- `functions/test/events_core.test.ts` -> `functions/src/service/providers/googleSheetsProvider.ts`
- `functions/test/events_core.test.ts` -> `functions/src/service/tasks/eventsNotifyUpcoming.ts`
- `functions/test/events_core.test.ts` -> `functions/src/service/tasks/eventsSyncFromSheet.ts`
- `functions/test/faza2_core.test.ts` -> `functions/src/service/tasks/adminNotifyPendingApprovals.ts`
- `functions/test/gear_core.test.ts` -> `functions/src/modules/calendar/calendar_utils.ts`
- `functions/test/gear_core.test.ts` -> `functions/src/modules/hours/hours_quote.ts`
- `functions/test/gear_core.test.ts` -> `functions/src/modules/setup/setup_gear_vars.ts`
- `functions/test/gear_core.test.ts` -> `functions/src/service/tasks/gearPrivateStorage.ts`
- `functions/test/gear_core.test.ts` -> `functions/src/service/tasks/gearSyncAllFromSheet.ts`
- `functions/test/godzinki_core.test.ts` -> `functions/src/modules/hours/godzinki_service.ts`
- `functions/test/setup_consolidation.test.ts` -> `functions/src/api/submitGodzinkiHandler.ts`
- `functions/test/setup_consolidation.test.ts` -> `functions/src/service/tasks/godzinkiArchiveSheetRows.ts`
- `functions/test/sync_core.test.ts` -> `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
- `functions/test/workspace_group_sync.test.ts` -> `functions/src/service/workspaceGroupSync.ts`
- `public/modules/raporty/registry.js` -> `public/modules/raporty/gear_rentals.js`
- `public/modules/raporty/registry.js` -> `public/modules/raporty/member_activity.js`
- `public/modules/raporty/registry.js` -> `public/modules/raporty/member_dues.js`
- `public/modules/raporty/registry.js` -> `public/modules/raporty/top_rentals.js`
- `public/modules/raporty/registry.js` -> `public/modules/raporty/user_activity.js`
- `public/modules/raporty/reports_panel.js` -> `public/modules/raporty/registry.js`

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

### `tests/e2e/conftest.py`

- Lines: `25`
- Size: `1090` bytes
- SHA1: `e191cd9a7d`
- Module aliases: `tests.e2e.conftest`
- Imports:
  - `import os`
- Top-level symbols:
  - `_CA_BUNDLE`

### `tests/e2e/helpers/__init__.py`

- Lines: `1`
- Size: `17` bytes
- SHA1: `6c895a3f25`
- Module aliases: `tests.e2e.helpers`

### `tests/e2e/helpers/api_helper.py`

- Lines: `440`
- Size: `18787` bytes
- SHA1: `e945bb1a99`
- Module aliases: `tests.e2e.helpers.api_helper`
- Imports:
  - `import logging`
  - `import requests`
  - `from config import EnvConfig`
- Top-level symbols:
  - `log`
- Classes:
  - class `ApiHelper` lines 36-440
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
      - `get_events(self, token: str, mode: str)` (function lines 202-211) -> `dict` — GET /api/events[?mode=recent|all] — zatwierdzone imprezy.
      - `submit_event(self, token: str, body: dict)` (function lines 213-221) -> `dict` — POST /api/events/submit — body: {name, startDate, endDate, location, ...}.
      - `submit_event_soft(self, token: str, body: dict)` (function lines 223-230) -> `dict`
      - `get_admin_pending(self, token: str)` (function lines 232-239) -> `dict` — GET /api/admin/pending — wymaga roli zarzad/kr.
      - `purchase_godzinki_soft(self, token: str, amount: float)` (function lines 241-253) -> `dict` — POST /api/godzinki/purchase (soft — does NOT raise on HTTP error)
      - `reserve_bundle(self, token: str, items: list[dict], start_date: str, end_date: str, starter_category: str, starter_item_id: str)` (function lines 259-278) -> `dict` — POST /api/gear/reservations/create-bundle
      - `reserve_bundle_soft(self, token: str, items: list[dict], start_date: str, end_date: str, starter_category: str, starter_item_id: str)` (function lines 280-295) -> `dict` — Like reserve_bundle but does NOT raise on HTTP error.
      - `update_reservation(self, token: str, reservation_id: str, start_date: str, end_date: str)` (function lines 297-309) -> `dict` — POST /api/gear/reservations/update
      - `update_reservation_soft(self, token: str, reservation_id: str, start_date: str, end_date: str)` (function lines 311-319) -> `dict` — Like update_reservation but does NOT raise on HTTP error.
      - `km_add_log(self, token: str, body: dict)` (function lines 325-333) -> `dict` — POST /api/km/log/add — raises on HTTP error.
      - `km_add_log_soft(self, token: str, body: dict)` (function lines 335-343) -> `dict` — POST /api/km/log/add — does NOT raise on HTTP error.
      - `km_my_logs(self, token: str, limit: int, after_date: str)` (function lines 345-356) -> `dict` — GET /api/km/logs — returns {ok, logs, count}.
      - `km_my_stats(self, token: str)` (function lines 358-365) -> `dict` — GET /api/km/stats — returns {ok, stats}.
      - `km_rankings(self, token: str, type: str, period: str, limit: int, year: str)` (function lines 367-379) -> `dict` — GET /api/km/rankings — returns {ok, type, period, entries, count}.
      - `km_places(self, token: str, q: str, limit: int)` (function lines 381-389) -> `dict` — GET /api/km/places — returns {ok, places, count}.
      - `km_map_data(self, token: str)` (function lines 391-398) -> `dict` — GET /api/km/map-data — returns {ok, locations, locationCount, updatedAt}.
      - `km_event_stats(self, token: str, event_id: str)` (function lines 400-408) -> `dict` — GET /api/km/event-stats — raises on HTTP error.
      - `km_event_stats_soft(self, token: str, event_id: str)` (function lines 410-419) -> `dict` — GET /api/km/event-stats — does NOT raise on HTTP error.
      - `km_admin_merge_places(self, token: str, keep_place_id: str, merge_ids: list[str])` (function lines 421-429) -> `dict` — POST /api/admin/km/places/merge — raises on HTTP error.
      - `km_admin_merge_places_soft(self, token: str, keep_place_id: str, merge_ids: list | None)` (function lines 431-440) -> `dict` — POST /api/admin/km/places/merge — does NOT raise on HTTP error.

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

### `tests/e2e/phase0_sheet_fixes.py`

- Lines: `111`
- Size: `3801` bytes
- SHA1: `b19b12f783`
- Module aliases: `tests.e2e.phase0_sheet_fixes`
- Imports:
  - `import os`
  - `import sys`
  - `from config import ACTIVE`
  - `from helpers.sheets_helper import SheetsHelper`
- Top-level symbols:
  - `CHECKBOX_TOKENS`
  - `EXECUTE`
  - `GODZINKI_DUPLICATE_ID`
  - `GODZINKI_NEW_COLUMN`
  - `HEADER_RENAMES_IMPREZY`
  - `_HERE`
- Functions:
  - `fix_imprezy_headers(ws)` (function lines 46-53)
  - `add_godzinki_column(ws)` (function lines 56-64)
  - `delete_duplicate_godzinka(ws)` (function lines 67-80)
  - `clean_imprezy_artifact_rows(ws)` (function lines 83-96)

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

### `tests/e2e/read_sheet_approvals.py`

- Lines: `60`
- Size: `1925` bytes
- SHA1: `84d00c8b17`
- Module aliases: `tests.e2e.read_sheet_approvals`
- Imports:
  - `import os`
  - `import sys`
  - `from config import ACTIVE`
  - `from helpers.sheets_helper import SheetsHelper`
- Top-level symbols:
  - `PENDING_EVENT_IDS`
  - `PENDING_GODZINKI_IDS`
  - `_HERE`
- Functions:
  - `dump_tab(sheets, tab, id_set, approval_cols)` (function lines 36-51)

### `tests/e2e/read_sheet_headers.py`

- Lines: `33`
- Size: `852` bytes
- SHA1: `629c6d6864`
- Module aliases: `tests.e2e.read_sheet_headers`
- Imports:
  - `import os`
  - `import sys`
  - `from config import ACTIVE`
  - `from helpers.sheets_helper import SheetsHelper`
- Top-level symbols:
  - `_HERE`

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

### `tests/e2e/test_events_api.py`

- Lines: `318`
- Size: `13342` bytes
- SHA1: `9d597e2b03`
- Module aliases: `tests.e2e.test_events_api`
- Imports:
  - `import os`
  - `import sys`
  - `import unittest`
  - `import logging`
  - `from datetime import datetime, timezone, timedelta`
  - `from config import ACTIVE`
  - `from helpers.firebase_auth import FirebaseAuthHelper`
  - `from helpers.api_helper import ApiHelper`
  - `from helpers.firestore_helper import FirestoreHelper`
- Top-level symbols:
  - `EVENTS_TAB`
  - `_HERE`
  - `_api`
  - `_auth`
  - `log`
- Classes:
  - class `_EventsTestBase(unittest.TestCase)` lines 94-128
    - methods:
      - `setUp(self)` (function lines 97-103)
      - `tearDown(self)` (function lines 105-111)
      - `_get_event_doc(self, event_id: str)` (function lines 115-117) -> `dict | None`
      - `_delete_sheet_row(self, sheets, event_id: str)` (function lines 119-128) — Usuwa wiersz testowej imprezy z zakładki imprezy (cleanup EV03/EV04).
  - class `TestEventSubmit(_EventsTestBase)` lines 135-170
    - methods:
      - `test_EV01_submit_creates_pending_not_listed_visible_in_panel(self)` (function lines 136-164)
      - `test_EV01b_validation_rejects_bad_dates(self)` (function lines 166-170)
  - class `TestEventApprovalVisibility(_EventsTestBase)` lines 177-190
    - methods:
      - `test_EV02_approved_event_appears_on_list(self)` (function lines 178-190)
  - class `TestEventSheetFlow(_EventsTestBase)` lines 197-313
    - methods:
      - `setUp(self)` (function lines 198-202)
      - `tearDown(self)` (function lines 204-208)
      - `_find_sheet_row(self, event_id: str)` (function lines 210-215) -> `dict | None`
      - `_set_sheet_cell(self, event_id: str, column_header: str, value: str)` (function lines 217-222)
      - `test_EV03_write_retry_and_sync(self)` (function lines 224-274) — 1. submit → run events.writeToSheet → wiersz w arkuszu (Zatwierdzona=NIE)
      - `test_EV04_backfill_writes_missing_row(self)` (function lines 276-313) — Impreza z sheetSyncedAt=null bez wiersza w arkuszu (symulacja martwego joba
- Functions:
  - `_skip_if_missing(*attrs)` (function lines 58-62)
  - `_future(days: int)` (function lines 65-66) -> `str`
  - `_test_event_body(suffix: str)` (function lines 69-78) -> `dict`
  - `_sheets_helper_or_none()` (function lines 81-91) — SheetsHelper wymaga oauth_client.json — bez niego testy arkuszowe są pomijane.

### `tests/e2e/test_gear_private_storage.py`

- Lines: `580`
- Size: `25714` bytes
- SHA1: `e11dc765fa`
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
  - class `TestGearPrivateStorage(unittest.TestCase)` lines 70-575 — Testy naliczania miesięcznych opłat za prywatne kajaki.
    - methods:
      - `setUp(self)` (function lines 82-101)
      - `tearDown(self)` (function lines 103-156)
      - `_create_kayak(self, label: str, owner_contact: str, private_since: str)` (function lines 162-178) -> `str` — Tworzy tymczasowy prywatny kajak. Zwraca docId.
      - `_block_real_kayaks(self, month: str)` (function lines 180-203) — Blokuje prawdziwe prywatne kajaki na podany miesiąc testowy, żeby task je pominął.
      - `_run_task(self, dry: bool)` (function lines 205-212) -> `dict`
      - `_get_charge(self, kayak_id: str)` (function lines 214-217) -> `dict | None`
      - `_find_spend_for_kayak(self, uid: str, kayak_number: str)` (function lines 219-232) -> `tuple | None` — Szuka spend rekordu w godzinki_ledger powiązanego z kajak_number i TEST_MONTH.
      - `_ensure_enough_balance(self, uid: str)` (function lines 234-265) -> `str | None` — Jeśli balance + neg_limit < costHours, dodaje tymczasowy grant buforowy ze starą datą
      - `test_PS01_empty_owner_contact_creates_failed_record(self)` (function lines 271-282) — Kajak bez ownerContact → gear_storage_charges status='failed'
      - `test_PS01b_invalid_email_no_at_creates_failed_record(self)` (function lines 284-294) — Kajak z emailem bez @ → gear_storage_charges status='failed'
      - `test_PS01c_second_run_retries_failed_and_keeps_failed_status(self)` (function lines 296-316) — Poprawka L7: rekord 'failed' jest PONAWIANY przy kolejnym runie
      - `test_PS01d_failed_then_fixed_email_retries_to_charged(self)` (function lines 318-367) — Poprawka L7: po naprawieniu przyczyny (uzupełniony ownerContact)
      - `test_PS02_board_exempt_creates_exempt_record_and_zero_spend(self)` (function lines 373-422) — Zarząd z boardDoesNotPay=true → status='exempt', hoursCharged=0, zero-spend w godzinki_ledger
      - `test_PS02b_board_exempt_idempotency(self)` (function lines 424-472) — Drugi run dla zarządu — kajak skipped (nie tworzy drugiego exempt rekordu)
      - `test_PS03_member_charge_creates_charged_record_and_deducts_balance(self)` (function lines 478-526) — Normalny członek → status='charged', spend w godzinki_ledger, bilans maleje o costHours
      - `test_PS03b_charged_record_idempotency(self)` (function lines 528-575) — Drugi run dla naładowanego kajaka → skipped, bilans nie zmienia się drugi raz
- Functions:
  - `_skip_if_missing(*attrs)` (function lines 63-67)

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

- Lines: `874`
- Size: `36943` bytes
- SHA1: `9972e0cabf`
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
  - class `TestGodzinkiCancelWithOverdraft(unittest.TestCase)` lines 600-715 — G14 — Anulowanie rezerwacji pokrytej (częściowo) z salda ujemnego musi
    - methods:
      - `setUp(self)` (function lines 618-628)
      - `tearDown(self)` (function lines 630-640)
      - `_zero_balance_with_synthetic_spend(self)` (function lines 642-663) -> `float` — Jeśli saldo > 0, dodaje syntetyczny spend (overdraft=saldo) → saldo ≈ 0. Zwraca saldo po.
      - `test_G14_cancel_overdraft_reservation_restores_exact_balance(self)` (function lines 665-715) — 1. Wyzeruj saldo syntetycznym spendem (overdraft)
  - class `TestGodzinkiPurchasePendingGuard(unittest.TestCase)` lines 722-812 — G15 — Suma oczekujących (pending) wykupów nie może przekroczyć długu.
    - methods:
      - `setUp(self)` (function lines 738-748)
      - `tearDown(self)` (function lines 750-760)
      - `_force_debt(self, debt: float)` (function lines 762-785) -> `float` — Syntetyczny spend doprowadza saldo do ok. -debt. Zwraca saldo po.
      - `test_G15_second_pending_purchase_above_debt_rejected(self)` (function lines 787-812) — 1. Doprowadź saldo do ok. -3h
  - class `TestGodzinkiIntegerAmounts(unittest.TestCase)` lines 819-840 — G16 — Ułamkowe kwoty godzinek odrzucane (ochrona przed dryfem float w FIFO).
    - methods:
      - `setUp(self)` (function lines 822-826)
      - `test_G16_fractional_submit_rejected(self)` (function lines 828-833) — POST /api/godzinki/submit z amount=2.5 → 400 validation_failed (must_be_integer)
      - `test_G16b_fractional_purchase_rejected(self)` (function lines 835-840) — POST /api/godzinki/purchase z amount=0.5 → 400 validation_failed (must_be_integer)
  - class `TestGodzinkiManualApprovalDocumented(unittest.TestCase)` lines 847-869 — Scenariusz wymagający ręcznej interwencji — udokumentowany, nie automatyczny.
    - methods:
      - `test_full_approval_flow_manual(self)` (function lines 868-869)
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

- Lines: `1915`
- Size: `76894` bytes
- SHA1: `1f60b545f9`
- Module aliases: `tests.test_bundle_reservations`
- Imports:
  - `import unittest`
- Top-level symbols:
  - `CATEGORY_COLLECTIONS`
  - `CATEGORY_PRIORITY`
- Classes:
  - class `BackendStub` lines 243-461 — Minimal in-memory stub of the bundle reservation backend.
    - methods:
      - `__init__(self, users: dict, catalog: dict, kurs_wypozycza: bool, today: str)` (function lines 258-270) — users: {uid: {"role_key": ..., "status_key": ..., "email": ..., "school_year": ...}}
      - `_gen_id(self)` (function lines 272-275)
      - `create_bundle_reservation(self, uid: str, start_date: str, end_date: str, items: list, starter_category: str, starter_item_id: str)` (function lines 277-429) -> `dict` — items: [{"itemId": ..., "category": ...}]
      - `cancel_reservation(self, uid: str, reservation_id: str)` (function lines 431-438) -> `dict`
      - `get_items_with_availability(self, category: str, start_date: str, end_date: str)` (function lines 440-461) -> `list` — Returns catalog items with isAvailableForRange flag.
  - class `TestCompositeId(unittest.TestCase)` lines 468-482
    - methods:
      - `test_basic_kayak(self)` (function lines 470-471)
      - `test_basic_paddle(self)` (function lines 473-474)
      - `test_strips_whitespace(self)` (function lines 476-477)
      - `test_other_categories(self)` (function lines 479-482)
  - class `TestComputeReservationKind(unittest.TestCase)` lines 485-510
    - methods:
      - `test_single_kayak_is_kayak_bundle(self)` (function lines 487-489)
      - `test_kayak_plus_paddle_is_kayak_bundle(self)` (function lines 491-496)
      - `test_only_non_kayak_is_gear_only(self)` (function lines 498-503)
      - `test_empty_list_is_gear_only(self)` (function lines 505-506)
      - `test_category_case_insensitive(self)` (function lines 508-510)
  - class `TestComputePrimaryItemIdx(unittest.TestCase)` lines 513-553
    - methods:
      - `test_kayak_wins_over_paddle(self)` (function lines 515-520)
      - `test_first_kayak_is_primary_when_multiple(self)` (function lines 522-527)
      - `test_paddle_beats_helmet(self)` (function lines 529-534)
      - `test_single_item_is_primary(self)` (function lines 536-538)
      - `test_full_priority_order(self)` (function lines 540-550)
      - `test_empty_returns_zero(self)` (function lines 552-553)
  - class `TestOverlapsIso(unittest.TestCase)` lines 556-586
    - methods:
      - `test_exact_overlap(self)` (function lines 558-560)
      - `test_partial_overlap_start(self)` (function lines 562-564)
      - `test_partial_overlap_end(self)` (function lines 566-568)
      - `test_no_overlap_before(self)` (function lines 570-572)
      - `test_no_overlap_after(self)` (function lines 574-576)
      - `test_adjacent_no_overlap(self)` (function lines 578-581)
      - `test_adjacent_overlap_on_same_day(self)` (function lines 583-586)
  - class `TestFindBundleConflicts(unittest.TestCase)` lines 589-665
    - methods:
      - `_make_reservation(self, rid, start, end, item_ids, kayak_ids)` (function lines 591-599)
      - `test_no_conflict_no_reservations(self)` (function lines 601-605)
      - `test_conflict_with_new_format(self)` (function lines 607-613)
      - `test_conflict_with_legacy_kayak_ids(self)` (function lines 615-621)
      - `test_no_conflict_non_kayak_vs_legacy(self)` (function lines 623-630)
      - `test_no_conflict_different_dates(self)` (function lines 632-638)
      - `test_excluded_reservation_not_counted(self)` (function lines 640-647)
      - `test_cancelled_reservation_not_counted(self)` (function lines 649-656)
      - `test_multiple_conflicts_returned(self)` (function lines 658-665)
  - class `TestCountOverlappingItems(unittest.TestCase)` lines 668-765
    - methods:
      - `_make_reservation(self, rid, uid, start, end, items, kayak_ids)` (function lines 670-682)
      - `test_no_reservations(self)` (function lines 684-688)
      - `test_counts_new_bundle_items_by_category(self)` (function lines 690-699)
      - `test_counts_legacy_kayak_ids_as_kayaks(self)` (function lines 701-709)
      - `test_missing_category_defaults_to_kayaks(self)` (function lines 711-719)
      - `test_ignores_other_users(self)` (function lines 721-729)
      - `test_ignores_non_overlapping(self)` (function lines 731-739)
      - `test_excludes_reservation_by_id(self)` (function lines 741-750)
      - `test_prefers_items_over_kayak_ids(self)` (function lines 752-765)
  - class `TestScenario01_SimplePaddleReservation(unittest.TestCase)` lines 790-826 — Scenario 01: Gear-only reservation of a single paddle.
    - methods:
      - `setUp(self)` (function lines 793-798)
      - `test_creates_gear_only_reservation(self)` (function lines 800-809)
      - `test_reservation_blocks_paddle(self)` (function lines 811-826)
  - class `TestScenario02_KayakBundleWithExtras(unittest.TestCase)` lines 829-899 — Scenario 02: Bundle with kayak + paddle + lifejacket = kayak_bundle.
    - methods:
      - `setUp(self)` (function lines 832-839)
      - `test_bundle_kind_is_kayak_bundle(self)` (function lines 841-853)
      - `test_cost_hours_only_for_kayak(self)` (function lines 855-868)
      - `test_all_items_blocked_after_reservation(self)` (function lines 870-899)
  - class `TestScenario03_LegacyKayakCompatibility(unittest.TestCase)` lines 902-942 — Scenario 03: New bundle conflicts with legacy kayak-only reservation.
    - methods:
      - `setUp(self)` (function lines 905-922)
      - `test_new_bundle_detects_conflict_with_legacy(self)` (function lines 924-933)
      - `test_non_conflicting_dates_pass(self)` (function lines 935-942)
  - class `TestScenario04_RolePermissions(unittest.TestCase)` lines 945-1001 — Scenario 04: Role-based access control.
    - methods:
      - `setUp(self)` (function lines 948-958)
      - `test_sympatyk_cannot_reserve(self)` (function lines 960-968)
      - `test_kandydat_limited_to_1_item(self)` (function lines 970-981)
      - `test_czlonek_can_reserve_up_to_3(self)` (function lines 983-1001)
  - class `TestScenario05_ItemValidation(unittest.TestCase)` lines 1004-1070 — Scenario 05: Item validation — inactive, non-operational, private.
    - methods:
      - `setUp(self)` (function lines 1007-1021)
      - `test_non_operational_kayak_rejected(self)` (function lines 1023-1031)
      - `test_private_non_rentable_kayak_rejected(self)` (function lines 1033-1041)
      - `test_private_rentable_kayak_allowed(self)` (function lines 1043-1050)
      - `test_inactive_item_rejected(self)` (function lines 1052-1060)
      - `test_unknown_item_rejected(self)` (function lines 1062-1070)
  - class `TestScenario06_AvailabilityCheck(unittest.TestCase)` lines 1073-1114 — Scenario 06: getItemsWithAvailability correctly marks items.
    - methods:
      - `setUp(self)` (function lines 1076-1083)
      - `test_all_available_when_no_reservations(self)` (function lines 1085-1088)
      - `test_reserved_paddle_marked_unavailable(self)` (function lines 1090-1101)
      - `test_availability_after_reservation_ends(self)` (function lines 1103-1114)
  - class `TestScenario07_MultipleReservations(unittest.TestCase)` lines 1117-1162 — Scenario 07: Multiple users reserving different items in same period.
    - methods:
      - `setUp(self)` (function lines 1120-1130)
      - `test_different_items_no_conflict(self)` (function lines 1132-1146)
      - `test_same_item_conflict_across_users(self)` (function lines 1148-1162)
  - class `TestScenario08_CancelAndRebook(unittest.TestCase)` lines 1165-1204 — Scenario 08: Cancel a reservation then rebook the same item.
    - methods:
      - `setUp(self)` (function lines 1168-1173)
      - `test_cancel_and_rebook(self)` (function lines 1175-1204)
  - class `TestScenario09_DeduplicationOfItems(unittest.TestCase)` lines 1207-1245 — Scenario 09: Duplicate items in request are silently deduplicated.
    - methods:
      - `setUp(self)` (function lines 1210-1215)
      - `test_dedup_does_not_exceed_limit(self)` (function lines 1217-1230)
      - `test_dedup_stores_single_item(self)` (function lines 1232-1245)
  - class `TestScenario10_PrimaryItemSelection(unittest.TestCase)` lines 1248-1307 — Scenario 10: Primary item is the highest-priority category item.
    - methods:
      - `setUp(self)` (function lines 1251-1258)
      - `test_kayak_is_primary_when_included(self)` (function lines 1260-1275)
      - `test_paddle_is_primary_when_no_kayak(self)` (function lines 1277-1291)
      - `test_only_one_item_is_primary(self)` (function lines 1293-1307)
  - class `TestCrossFormatConflicts(unittest.TestCase)` lines 1314-1455 — Weryfikuje że findBundleConflicts() poprawnie wykrywa konflikty między
    - methods:
      - `_make_legacy_reservation(self, kayak_ids: list, block_start: str, block_end: str, status: str, uid: str)` (function lines 1321-1331) -> `dict` — Stara rezerwacja — tylko kayakIds[], bez itemIds[].
      - `_make_bundle_reservation(self, item_ids: list, block_start: str, block_end: str, status: str, uid: str)` (function lines 1333-1344) -> `dict` — Nowa rezerwacja bundle — itemIds[], kayakIds[] puste.
      - `test_bundle_conflicts_with_legacy_same_kayak(self)` (function lines 1346-1359) — Stara rezerwacja z kayakIds=["K01"].
      - `test_bundle_conflicts_with_legacy_different_kayak(self)` (function lines 1361-1372) — Stara rezerwacja z K01 — nowa próba z K02 → brak konfliktu.
      - `test_bundle_conflicts_with_new_format_same_item(self)` (function lines 1374-1386) — Nowa rezerwacja z itemIds=["kayaks/K01"].
      - `test_bundle_conflicts_with_new_format_accessory(self)` (function lines 1388-1400) — Nowa rezerwacja ma itemIds=["paddles/P01"].
      - `test_legacy_cancelled_not_conflicting(self)` (function lines 1402-1411) — Anulowana stara rezerwacja nie blokuje.
      - `test_legacy_non_overlapping_not_conflicting(self)` (function lines 1413-1422) — Stara rezerwacja nie nakłada się na nowe daty → brak konfliktu.
      - `test_multiple_items_partial_conflict(self)` (function lines 1424-1440) — Próba rezerwacji K01 + P01 + H01.
      - `test_exclude_id_skips_own_reservation(self)` (function lines 1442-1455) — Przy aktualizacji rezerwacji (exclude_id) własna rezerwacja nie blokuje samej siebie.
  - class `TestMaxItemsBundleEnforcement(unittest.TestCase)` lines 1462-1791 — Weryfikuje, że limit max_items jest liczony OSOBNO DLA KAŻDEJ KATEGORII (S2):
    - methods:
      - `_make_backend(self, role: str)` (function lines 1489-1493) -> `BackendStub`
      - `test_member_kayak_paddle_lifejacket_one_each_ok(self)` (function lines 1495-1508) — Czlonek: kajak + wiosło + kamizelka = po 1 z każdej kategorii ≤ 3 → OK.
      - `test_member_four_categories_one_each_ok(self)` (function lines 1510-1527) — Czlonek: kajak + wiosło + kask + kamizelka = po 1 z 4 kategorii.
      - `test_member_four_paddles_blocked(self)` (function lines 1529-1545) — Czlonek: 4 wiosła w jednej rezerwacji > limit 3 dla kategorii → blokada.
      - `test_candidate_1_kayak_ok(self)` (function lines 1547-1556) — Kandydat: 1 kajak = max_items=1 → OK.
      - `test_candidate_kayak_plus_paddle_one_each_ok(self)` (function lines 1558-1573) — Kandydat: kajak + wiosło w jednym koszyku = po 1 z każdej kategorii ≤ 1 → OK.
      - `test_candidate_kayak_then_paddle_separate_reservations_ok(self)` (function lines 1575-1595) — GŁÓWNY scenariusz zgłoszenia: kandydat rezerwuje kajak osobno, a wiosło
      - `test_candidate_second_kayak_blocked(self)` (function lines 1597-1616) — Kandydat: drugi kajak w nakładającym się terminie > 1 → blokada.
      - `test_candidate_second_paddle_blocked(self)` (function lines 1618-1637) — Kandydat: drugie wiosło w nakładającym się terminie > 1 → blokada.
      - `test_board_many_items_ok(self)` (function lines 1639-1653) — Zarząd: limit = 100, 2 kajaki + 2 akcesoria → OK.
      - `test_cumulative_kayaks_across_overlapping_reservations_ok(self)` (function lines 1655-1679) — Czlonek ma już 2 kajaki w nakładającej się rezerwacji.
      - `test_cumulative_kayaks_over_limit_blocked(self)` (function lines 1681-1718) — Czlonek ma już 3 kajaki. 4. kajak w nakładającej się rezerwacji → 4 > 3 → blokada.
      - `test_gear_only_bundle_no_kayak_cost_zero(self)` (function lines 1720-1737) — Bundle bez kajaka → reservationKind=gear_only, costHours=0.
      - `test_kayak_bundle_cost_only_from_kayaks(self)` (function lines 1739-1758) — Bundle z kajakiem i akcesoriami: costHours = tylko dni × kajaki.
      - `test_accessories_price_gap_k1_documented(self)` (function lines 1760-1791) — LUKA K1: Akcesoria (wiosło, kask, fartuch) nie mają cennika.
  - class `TestKursantExemptAndGate(unittest.TestCase)` lines 1798-1830 — Pure-function: zwolnienie z opłaty + bramka rezerwacji kursanta.
    - methods:
      - `test_exempt_current_year_before_sep30(self)` (function lines 1801-1802)
      - `test_exempt_on_sep30_inclusive(self)` (function lines 1804-1805)
      - `test_not_exempt_after_sep30(self)` (function lines 1807-1808)
      - `test_not_exempt_wrong_year(self)` (function lines 1810-1811)
      - `test_not_exempt_no_year(self)` (function lines 1813-1814)
      - `test_gate_flag_off_forbidden(self)` (function lines 1816-1819)
      - `test_gate_in_window_allowed(self)` (function lines 1821-1822)
      - `test_gate_window_closed(self)` (function lines 1824-1826)
      - `test_gate_no_year(self)` (function lines 1828-1830)
  - class `TestScenarioKursant(unittest.TestCase)` lines 1833-1911 — Kursant == kandydat W OKNIE (flaga ON, do 30.09 roku kursu); po oknie lub przy
    - methods:
      - `_catalog(self)` (function lines 1843-1849)
      - `_backend(self, flag, today, school_year)` (function lines 1851-1853)
      - `test_in_window_can_reserve_kayak(self)` (function lines 1855-1861)
      - `test_in_window_can_reserve_non_kayak_categories(self)` (function lines 1863-1870)
      - `test_in_window_limit_one_per_category_like_candidate(self)` (function lines 1872-1884)
      - `test_flag_off_forbidden(self)` (function lines 1886-1893)
      - `test_after_window_blocked(self)` (function lines 1895-1902)
      - `test_no_school_year_blocked(self)` (function lines 1904-1911)
- Functions:
  - `composite_id(category: str, item_id: str)` (function lines 36-38) -> `str` — "{category}/{itemId}" — e.g. "kayaks/K01", "paddles/P01".
  - `compute_reservation_kind(items: list)` (function lines 41-49) -> `str` — "kayak_bundle" if any item is in the "kayaks" category, "gear_only" otherwise.
  - `compute_primary_item_idx(items: list)` (function lines 52-61) -> `int` — Returns index of the primary item using CATEGORY_PRIORITY.
  - `overlaps_iso(a_start: str, a_end: str, b_start: str, b_end: str)` (function lines 64-69) -> `bool` — Lexicographic ISO date overlap check (same as overlapsIso in calendar_utils.ts).
  - `compute_block_iso(start_date: str, end_date: str, offset_days: int)` (function lines 72-82) -> `tuple` — blockStartIso = startDate - offset_days, blockEndIso = endDate + offset_days.
  - `find_bundle_conflicts(composite_ids: list, reservations: list, block_start: str, block_end: str, exclude_id: str)` (function lines 85-122) -> `list` — Finds conflicting composite IDs.
  - `count_overlapping_items_by_category(uid: str, reservations: list, block_start: str, block_end: str, exclude_id: str)` (function lines 125-157) -> `dict` — Counts items PER CATEGORY in a user's active, overlapping reservations.
  - `count_items_by_category(items: list)` (function lines 160-168) -> `dict` — Tally requested items per category. Mirrors countItemsByCategory().
  - `find_category_over_limit(already: dict, requested: dict, max_items: int)` (function lines 171-180) — First requested category exceeding max_items, or None.
  - `get_reserved_composite_ids_for_period(reservations: list, block_start: str, block_end: str)` (function lines 183-210) -> `set` — Returns a set of composite IDs that are reserved in the given block period.
  - `is_free_rental_exempt(school_year, today_iso: str)` (function lines 213-222) -> `bool` — Zwolnienie z opłaty: tegoroczna szkoleniówka i rezerwacja składana do 30.09.
  - `assert_kursant_rental_allowed(flag_on: bool, exempt: bool, school_year)` (function lines 225-236) — Bramka rezerwacji kursanta. Zwraca dict błędu albo None gdy dozwolone.
  - `make_catalog(*entries)` (function lines 772-787) — Helper: build catalog from (category, item_id, ...) tuples.

### `tests/test_godzinki.py`

- Lines: `1878`
- Size: `80272` bytes
- SHA1: `d33c4bbed8`
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
  - class `TestBilansApproval(VerboseBusinessTestCase)` lines 592-644 — Testy zatwierdzania godzinek (approved).
    - methods:
      - `test_niezatwierdzone_nie_licza_sie_do_bilansu(self)` (function lines 595-601) — OCZEKIWANE: Rekord earn z approved=False ma remaining=0 i nie wchodzi do bilansu.
      - `test_niezatwierdzone_nie_widoczne_nawet_po_dacie(self)` (function lines 603-608) — OCZEKIWANE: Stary rekord niezatwierdzony (z przeszłości) dalej nie liczy się do bilansu.
      - `test_zatwierdzone_wchodzi_do_bilansu(self)` (function lines 610-616) — OCZEKIWANE: Po zatwierdzeniu (approved=True) rekord earn wchodzi do bilansu.
      - `test_mix_zatwierdzonych_i_niezatwierdzonych(self)` (function lines 618-626) — OCZEKIWANE: Bilans uwzględnia tylko zatwierdzone. Niezatwierdzone 20h są niewidoczne.
      - `test_zatwierdzenie_po_syncu_zmienia_bilans(self)` (function lines 628-644) — OCZEKIWANE: Symulacja syncu — ustawienie approved=True i remaining=amount
  - class `TestWygasanie(VerboseBusinessTestCase)` lines 647-717 — Testy wygasania godzinek po 4 latach.
    - methods:
      - `test_wygasle_rekordy_nie_licza_sie(self)` (function lines 650-656) — OCZEKIWANE: Godzinki przyznane 5 lat temu (wygasłe 1 rok temu) mają wartość 0 w bilansie.
      - `test_nevygasle_rekordy_licza_sie(self)` (function lines 658-664) — OCZEKIWANE: Godzinki przyznane rok temu (wygasają za 3 lata) są liczone normalnie.
      - `test_wygasanie_dokladnie_dzisiaj_nie_liczy_sie(self)` (function lines 666-672) — OCZEKIWANE: Godzinki wygasające dziś (expiresAt == NOW) NIE są liczone — warunek strict >now.
      - `test_mix_wygasle_i_aktualne(self)` (function lines 674-682) — OCZEKIWANE: Bilans = tylko aktualne (niewygasłe). Wygasłe 10h + aktualne 15h = 15h salda.
      - `test_nastepna_data_wygasniecia(self)` (function lines 684-695) — OCZEKIWANE: Funkcja compute_next_expiry zwraca datę wygaśnięcia najstarszej puli z remaining > 0.
      - `test_brak_next_expiry_gdy_wszystko_wygasle(self)` (function lines 697-702) — OCZEKIWANE: Gdy wszystkie rekordy są wygasłe, next_expiry = None.
      - `test_brak_next_expiry_gdy_wszystko_niezatwierdzone(self)` (function lines 704-709) — OCZEKIWANE: Gdy wszystkie rekordy są niezatwierdzone, next_expiry = None.
      - `test_brak_next_expiry_gdy_remaining_zero(self)` (function lines 711-717) — OCZEKIWANE: Jeśli wszystkie earn.remaining = 0 (zużyte), next_expiry = None.
  - class `TestFIFO(VerboseBusinessTestCase)` lines 720-839 — Testy wydawania FIFO — najstarsze pule zużywane najpierw.
    - methods:
      - `test_fifo_jedna_pula_pelne_zuzycie(self)` (function lines 723-734) — OCZEKIWANE: Przy jednej puli 10h i wydaniu 10h — remaining=0, overdraft=0.
      - `test_fifo_jedna_pula_czesciowe_zuzycie(self)` (function lines 736-746) — OCZEKIWANE: Przy jednej puli 10h i wydaniu 6h — remaining=4, overdraft=0.
      - `test_fifo_dwie_pule_zuzycie_z_obu(self)` (function lines 748-771) — OCZEKIWANE: Pula A (starsza, 10h) + Pula B (nowsza, 10h). Wydanie 15h:
      - `test_fifo_trzy_pule_czesciowe_zuzycie(self)` (function lines 773-793) — OCZEKIWANE: 3 pule (A=5h, B=8h, C=12h). Wydanie 10h:
      - `test_bilans_po_czesciowym_zuzyciu_wielu_pul(self)` (function lines 795-811) — OCZEKIWANE: Po kilku operacjach wydania z wielu pul bilans jest poprawnie sumowany.
      - `test_fifo_pomija_niezatwierdzone(self)` (function lines 813-825) — OCZEKIWANE: FIFO nie tknrze niezatwierdzonych rekordów earn. Wydanie ze swobodnych pul tylko.
      - `test_fifo_pomija_wygasle(self)` (function lines 827-839) — OCZEKIWANE: FIFO nie używa wygasłych rekordów earn.
  - class `TestSaldoUjemne(VerboseBusinessTestCase)` lines 842-903 — Testy salda ujemnego — limit, blokada, dopuszczalne schodzenie na minus.
    - methods:
      - `test_schodzenie_na_minus_dozwolone_do_limitu(self)` (function lines 845-854) — OCZEKIWANE: Przy pustym saldzie i limicie -20, wydanie 15h jest dozwolone.
      - `test_schodzenie_na_minus_dokladnie_do_limitu(self)` (function lines 856-865) — OCZEKIWANE: Wydanie dokładnie do limitu (-20) jest dozwolone.
      - `test_przekroczenie_limitu_blokuje(self)` (function lines 867-876) — OCZEKIWANE: Próba wydania godzinek, które zejdą poniżej -20 (limitu), MUSI być zablokowana.
      - `test_przekroczenie_limitu_o_jeden(self)` (function lines 878-890) — OCZEKIWANE: Próba zejścia o 1 poniżej limitu (-20) jest zablokowana.
      - `test_rozne_limity_z_setup(self)` (function lines 892-903) — OCZEKIWANE: Limit ujemnego salda pochodzi z setup/vars_godzinki.
  - class `TestWykup(VerboseBusinessTestCase)` lines 906-1003 — Testy wykupu salda ujemnego.
    - methods:
      - `test_wykup_przy_ujemnym_saldzie(self)` (function lines 909-923) — OCZEKIWANE: Przy saldzie -10h, wykup 5h jest pending (saldo bez zmian),
      - `test_wykup_do_zera(self)` (function lines 925-935) — OCZEKIWANE: Wykup dokładnie równy saldzie ujemnemu po zatwierdzeniu daje bilans = 0.
      - `test_wykup_gdy_saldo_dodatnie_jest_zabroniony(self)` (function lines 937-947) — OCZEKIWANE: Nie można wykupić godzinek gdy saldo jest dodatnie lub równe 0.
      - `test_wykup_gdy_saldo_zero_jest_zabroniony(self)` (function lines 949-955) — OCZEKIWANE: Nie można wykupić godzinek gdy saldo = 0.
      - `test_wykup_nie_moze_wyjsc_na_plus(self)` (function lines 957-968) — OCZEKIWANE: Wykup większy niż saldo ujemne MUSI być zablokowany.
      - `test_wykup_dokladnie_jeden_za_duzo(self)` (function lines 970-978) — OCZEKIWANE: Saldo = -5h. Wykup 6h (o 1 za dużo) MUSI być zablokowany.
      - `test_wykup_nie_dotyka_zatwierdzonych_earn(self)` (function lines 980-1003) — OCZEKIWANE: Wykup działa niezależnie od puli earn.
  - class `TestWarunkiBrzegowe(VerboseBusinessTestCase)` lines 1006-1128 — Testy warunków brzegowych.
    - methods:
      - `test_brak_rekordow_bilans_zero(self)` (function lines 1009-1013) — OCZEKIWANE: Nowy użytkownik bez żadnych rekordów ma saldo = 0.
      - `test_brak_rekordow_brak_expiry(self)` (function lines 1015-1019) — OCZEKIWANE: Nowy użytkownik bez rekordów nie ma daty wygaśnięcia.
      - `test_tylko_wygasle_rekordy_bilans_zero(self)` (function lines 1021-1029) — OCZEKIWANE: Gdy wszystkie earn są wygasłe, bilans = 0 niezależnie od ich kwot.
      - `test_tylko_niezatwierdzone_bilans_zero(self)` (function lines 1031-1039) — OCZEKIWANE: Gdy wszystkie earn są niezatwierdzone, bilans = 0.
      - `test_saldo_dokladnie_zero_po_wydaniu(self)` (function lines 1041-1049) — OCZEKIWANE: Dokładne wydanie całego salda daje bilans = 0, nie ujemny.
      - `test_saldo_dokladnie_na_granicy_limitu_ujemnego(self)` (function lines 1051-1062) — OCZEKIWANE: Bilans = -20 (dokładnie na limicie). Stan jest poprawny — kolejne wydanie
      - `test_fifo_wygasniecie_nie_niszczy_salda(self)` (function lines 1064-1096) — OCZEKIWANE (kluczowy test FIFO): Wydanie z dwóch pul FIFO, potem wygaśnięcie starszej.
      - `test_pełna_ścieżka_submit_approve_spend_expiry(self)` (function lines 1098-1128) — OCZEKIWANE: Pełna ścieżka życia godzinek:
  - class `TestRefundowaneIWykupApproval(VerboseBusinessTestCase)` lines 1131-1234 — Testy kompatybilności wstecznej i flag refunded/approved.
    - methods:
      - `test_zrefundowany_spend_nie_liczy_sie_do_bilansu(self)` (function lines 1137-1148) — SPRAWDZAM: spend.refunded=True nie wchodzi do bilansu.
      - `test_niezrefundowany_spend_liczy_sie(self)` (function lines 1150-1160) — SPRAWDZAM: spend.refunded=False (aktywny) wchodzi do bilansu normalnie.
      - `test_stary_spend_bez_pola_refunded_liczy_sie(self)` (function lines 1162-1169) — SPRAWDZAM: kompatybilność wsteczna — stary rekord bez pola 'refunded' (brak klucza)
      - `test_niezatwierdzony_purchase_nie_liczy_sie(self)` (function lines 1171-1182) — SPRAWDZAM: purchase.approved=False (pending) nie wchodzi do bilansu.
      - `test_zatwierdzony_purchase_redukuje_overdraft(self)` (function lines 1184-1194) — SPRAWDZAM: purchase.approved=True zmniejsza saldo ujemne.
      - `test_stary_purchase_bez_pola_approved_liczy_sie(self)` (function lines 1196-1203) — SPRAWDZAM: kompatybilność wsteczna — stary rekord purchase bez pola 'approved'
      - `test_mix_refunded_i_aktywnych_spend(self)` (function lines 1205-1221) — SPRAWDZAM: Mix anulowanych i aktywnych spend — tylko aktywne obciążają bilans.
      - `test_mix_approved_i_pending_purchase(self)` (function lines 1223-1234) — SPRAWDZAM: Mix zatwierdzonych i oczekujących purchase.
  - class `TestKorekcjaRezerwacji(VerboseBusinessTestCase)` lines 1237-1382 — Testy logiki korekty i anulowania rezerwacji.
    - methods:
      - `_simulate_credit_adjustment(self, records, amount, granted_at, expiry_years)` (function lines 1243-1262) — Symuluje creditReservationAdjustment — tworzy earn z sourceType='adjustment'.
      - `_simulate_refund_with_adjustment_revocation(self, records, reservation_earn_deductions, overdraft)` (function lines 1264-1274) — Deleguje do refund_hours_for_reservation (mirror refundHoursForReservationInTx
      - `test_skrocenie_i_anulowanie_bilans_prawidlowy(self)` (function lines 1276-1308) — SPRAWDZAM: Scenariusz który był BUG #1 przed poprawką.
      - `test_skrocenie_bez_anulowania_bilans_prawidlowy(self)` (function lines 1310-1322) — SPRAWDZAM: Skrócenie rezerwacji BEZ anulowania działa poprawnie.
      - `test_wydluzenie_i_anulowanie_bilans_prawidlowy(self)` (function lines 1324-1355) — SPRAWDZAM: Wydłużenie rezerwacji (delta>0) + anulowanie zwraca pełny koszt.
      - `test_wielokrotne_skrocenia_i_anulowanie(self)` (function lines 1357-1382) — SPRAWDZAM: Dwa skrócenia + anulowanie — WSZYSTKIE adjustment earn zerowane.
  - class `TestWyswietlanieHistorii(VerboseBusinessTestCase)` lines 1385-1437 — Testy poprawności danych do wyświetlenia historii.
    - methods:
      - `test_historia_zawiera_wszystkie_typy_rekordow(self)` (function lines 1388-1406) — OCZEKIWANE: Historia użytkownika zawiera rekordy earn, spend i purchase.
      - `test_nastepne_wygasniecie_format_mm_rrrr(self)` (function lines 1408-1418) — OCZEKIWANE: Funkcja compute_next_expiry zwraca datę, którą UI formatuje jako MM-RRRR.
      - `test_bilans_i_ostatnie_rekordy_na_dashboard(self)` (function lines 1420-1437) — OCZEKIWANE: Dashboard pokazuje bieżące saldo + ostatnie godzinki.
  - class `TestStorageMiesieczna(VerboseBusinessTestCase)` lines 1440-1575 — Testy logiki naliczania miesięcznej opłaty za prywatne kajaki (gear.chargePrivateStorage).
    - methods:
      - `_first_chargeable_month(self, private_since_iso)` (function lines 1448-1465) — Mirrors firstChargeableMonth() — zwraca 'YYYY-MM' pierwszego naliczalnego miesiąca.
      - `_is_chargeable_this_month(self, private_since_iso, current_month)` (function lines 1467-1477) — Mirrors isChargeableThisMonth() — true jeśli current_month >= firstChargeableMonth.
      - `test_wejscie_drugiego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1479-1481) — Kajak wszedł 02.03 → marzec niepełny → pierwszy naliczany = kwiecień.
      - `test_wejscie_pierwszego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1483-1485) — Kajak wszedł 01.03 → marzec też niepełny (wchodzi w miesiąc, nie go wyprzedza) → kwiecień.
      - `test_wejscie_ostatniego_marca_pierwszy_miesiąc_kwiecień(self)` (function lines 1487-1489) — Kajak wszedł 31.03 → marzec niepełny → kwiecień.
      - `test_wejscie_w_grudniu_pierwszy_miesiąc_styczeń_następnego_roku(self)` (function lines 1491-1493) — Grudzień → rollover roku → następny miesiąc = styczeń następnego roku.
      - `test_brak_daty_brak_naliczenia(self)` (function lines 1495-1499) — Brak daty wejścia → firstChargeableMonth zwraca None → nie naliczamy.
      - `test_scheduler_01_04_dla_kajaka_z_02_03_nalicza(self)` (function lines 1501-1503) — Scheduler działa 01.04 — kajak wszedł 02.03 — naliczamy (2025-04 >= 2025-04).
      - `test_scheduler_01_03_dla_kajaka_z_02_03_nie_nalicza(self)` (function lines 1505-1507) — Scheduler działa 01.03 — kajak wszedł 02.03 tego samego miesiąca — nie naliczamy.
      - `test_scheduler_przed_wejsciem_nie_nalicza(self)` (function lines 1509-1511) — Bieżący miesiąc jest PRZED miesiącem wejścia — nie naliczamy.
      - `test_scheduler_wiele_miesiecy_po_wejsciu_nalicza(self)` (function lines 1513-1515) — Wiele miesięcy po wejściu — naliczamy (lata później).
      - `test_pierwszy_naliczany_miesiac_dokladnie(self)` (function lines 1517-1521) — Bieżący miesiąc == firstChargeableMonth → granica — naliczamy.
      - `test_oplata_storage_odlicza_godzinki(self)` (function lines 1523-1534) — SPRAWDZAM: Naliczenie opłaty magazynowej odlicza godzinki z puli.
      - `test_oplata_storage_przy_niewystarczajacym_saldzie_schodzi_na_minus(self)` (function lines 1536-1547) — SPRAWDZAM: Gdy saldo < koszt, opłata nadal zostaje pobrana — tworzy overdraft.
      - `test_zwykla_dedukcja_blokowana_przy_przekroczeniu_limitu(self)` (function lines 1549-1560) — SPRAWDZAM: Zwykła dedukcja (wypożyczenie, force=False) przy przekroczonym
      - `test_oplata_storage_force_pomija_limit_ujemnego_salda(self)` (function lines 1562-1575) — SPRAWDZAM (poprawka L7): Opłata magazynowa (force=True) NIE podlega limitowi
  - class `TestRefundOverdraftuL1(VerboseBusinessTestCase)` lines 1578-1660 — Testy regresyjne poprawki L1: anulowanie rezerwacji z overdraftem zwracało
    - methods:
      - `test_anulowanie_z_czesciowym_overdraftem_wraca_do_stanu_wyjsciowego(self)` (function lines 1586-1605) — SCENARIUSZ (przykład z audytu):
      - `test_anulowanie_rezerwacji_w_calosci_na_kredyt_nie_tworzy_godzinek(self)` (function lines 1607-1622) — EXPLOIT z audytu: saldo 0 → rezerwacja w całości na kredyt (5h) → anulowanie.
      - `test_brak_nowej_puli_earn_po_refundzie_z_overdraftem(self)` (function lines 1624-1635) — Po refundzie nie może powstać żadna nowa pula earn (stary kod tworzył pulę za overdraft).
      - `test_refund_oznacza_spend_jako_refunded(self)` (function lines 1637-1648) — Spend rezerwacji po refundzie musi mieć refunded=True (przestaje obciążać bilans).
      - `test_refund_z_wygasla_pula_blokuje(self)` (function lines 1650-1660) — Pula wygasła między rezerwacją a anulowaniem → pool_expired (anulowanie zablokowane).
  - class `TestWykupRewalidacjaL2(VerboseBusinessTestCase)` lines 1663-1749 — Testy regresyjne poprawki L2: wykup salda ujemnego.
    - methods:
      - `test_drugi_pending_wykup_ponad_dlug_odrzucony(self)` (function lines 1670-1683) — SCENARIUSZ z audytu: dług -5h → wykup 5h (pending) → drugi wykup 5h
      - `test_pending_rezerwuje_czesc_dlugu(self)` (function lines 1685-1696) — Dług -5h, pending 3h → kolejny wykup max 2h (3h odrzucone, 2h przechodzi).
      - `test_zatwierdzenie_po_splacie_dlugu_odrzucone(self)` (function lines 1698-1716) — SCENARIUSZ z audytu: dług -5h → pending wykup 5h → saldo wraca do 0
      - `test_zatwierdzenie_gdy_dlug_zmalal_odrzucone(self)` (function lines 1718-1731) — Dług zmalał z -5h do -3h → zatwierdzenie wykupu 5h odrzucone (wyniosłoby saldo na +2h).
      - `test_zatwierdzenie_przy_aktualnym_dlugu_przechodzi(self)` (function lines 1733-1742) — Ścieżka pozytywna: dług -5h, pending 5h, nic się nie zmieniło → zatwierdzenie OK, saldo 0.
      - `test_zatwierdzenie_idempotentne(self)` (function lines 1744-1749) — Ponowne zatwierdzenie już zatwierdzonego wykupu → ok, bez zmian salda.
  - class `TestReverseDeductL3(VerboseBusinessTestCase)` lines 1752-1874 — Testy regresyjne poprawki L3: skrócenie rezerwacji cofa dedukcję do
    - methods:
      - `test_skrocenie_przywraca_oryginalna_pule_bez_odswiezania_waznosci(self)` (function lines 1760-1783) — SCENARIUSZ "prania" z audytu: pula wygasa za ~2 miesiące → rezerwacja 10h
      - `test_skrocenie_pomniejsza_spend_i_refund_zwraca_reszte(self)` (function lines 1785-1804) — Spójność skrócenie+anulowanie: spend pomniejszony, pełny refund zwraca dokładnie resztę.
      - `test_skrocenie_cofa_najpierw_overdraft(self)` (function lines 1806-1819) — Rezerwacja częściowo na kredyt: skrócenie najpierw redukuje overdraft.
      - `test_skrocenie_cofa_od_najnowszego_spend(self)` (function lines 1821-1836) — Rezerwacja z dwoma spend (wydłużenie): reverse cofa najpierw nowszy spend.
      - `test_skrocenie_z_wygasla_pula_zrodlowa_blokuje(self)` (function lines 1838-1848) — Pula źródłowa wygasła po rezerwacji → reverse zwraca pool_expired (korekta zablokowana).
      - `test_legacy_spend_bez_sladu_fallback_adjustment(self)` (function lines 1850-1867) — Stary spend bez śladu earn_deductions (sprzed refund-flow): nieodtwarzalna
      - `test_brak_spend_dla_rezerwacji_blokuje(self)` (function lines 1869-1874) — Brak zapisu godzinkowego rezerwacji → spend_not_found (integralność danych).
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
  - `deduct_hours(records, amount, vars_config, now, force, reservation_id)` (function lines 248-357) — Odlicza godzinki metodą FIFO. Modyfikuje earn.remaining w rekordach.
  - `refund_hours_for_reservation(records, earn_restores, now)` (function lines 360-400) — Mirror refundHoursForReservationInTx z godzinki_service.ts (PO poprawce L1):
  - `reverse_deduct_hours(records, reservation_id, amount, expiry_years, now)` (function lines 403-480) — Mirror reverseDeductHoursInTx z godzinki_service.ts (poprawka L3 — skrócenie rezerwacji):
  - `approve_purchase(records, idx, now)` (function lines 483-516) — Mirror processApproval (gałąź purchase) z godzinki_service.ts (PO poprawce L2):
  - `purchase_negative_balance(records, amount, now)` (function lines 519-581) — Wykup salda ujemnego. Można wykupić tylko tyle, żeby saldo nie przekroczyło 0.

### `tests/test_pwa.py`

- Lines: `375`
- Size: `14718` bytes
- SHA1: `3312ed5a9b`
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

### `appscript/1_App_SETUP/backend_sync.gs`

- Lines: `47`
- Size: `1556` bytes
- Functions:
  - `callBackendSync_`
  - `runSync_`

### `appscript/1_App_SETUP/config.gs`

- Lines: `13`
- Size: `414` bytes

### `appscript/1_App_SETUP/setup_sync.gs`

- Lines: `13`
- Size: `464` bytes
- Functions:
  - `syncSetupToFirestore`

### `appscript/1_App_SETUP/ui_menu.gs`

- Lines: `12`
- Size: `200` bytes
- Functions:
  - `onOpen`

### `appscript/2_Członkowie Godzinki Imprezy/common_helpers.gs`

- Lines: `286`
- Size: `7625` bytes
- Functions:
  - `assertBoardAccess_`
  - `callBackendSync_`
  - `enqueueServiceJob_`
  - `firestoreCommitDocuments_`
  - `firestoreGetDocument_`
  - `firestorePatchDocument_`
  - `isIsoTimestamp_`
  - `normalizeHeader_`
  - `rolesAllowedFromFlags_`
  - `runSync_`
  - `splitList_`
  - `toBool_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/2_Członkowie Godzinki Imprezy/env_config.gs`

- Lines: `67`
- Size: `2542` bytes

### `appscript/2_Członkowie Godzinki Imprezy/events_sync.gs`

- Lines: `24`
- Size: `1127` bytes
- Functions:
  - `syncEventsToFirestore`

### `appscript/2_Członkowie Godzinki Imprezy/hours_sync.gs`

- Lines: `74`
- Size: `3238` bytes
- Functions:
  - `importGodzinkiKorektyToFirestore`
  - `reconcileOpeningBalanceByEmailPrompt`
  - `syncHoursToFirestore`

### `appscript/2_Członkowie Godzinki Imprezy/opening_balance_import.gs`

- Lines: `234`
- Size: `9535` bytes
- Functions:
  - `clearOpeningBalanceCollection`
  - `importOpeningBalanceToFirestore`
  - `norm`
  - `obCellToFieldValue_`
  - `obFormatDate_`
  - `obGetSheetFlexible_`
  - `obIsTruthy_`
  - `seedMemberSheetBalancesFromOpeningBalance`

### `appscript/2_Członkowie Godzinki Imprezy/ui_menu.gs`

- Lines: `23`
- Size: `926` bytes
- Functions:
  - `onOpen`

### `appscript/2_Członkowie Godzinki Imprezy/users_sync.gs`

- Lines: `14`
- Size: `603` bytes
- Functions:
  - `syncUsersToFirestore`

### `appscript/3_Sprzęt/backend_sync.gs`

- Lines: `47`
- Size: `1619` bytes
- Functions:
  - `callBackendSync_`
  - `runSync_`

### `appscript/3_Sprzęt/config.gs`

- Lines: `30`
- Size: `870` bytes

### `appscript/3_Sprzęt/menu.gs`

- Lines: `8`
- Size: `169` bytes
- Functions:
  - `onOpen`

### `appscript/3_Sprzęt/sync_kayaks.gs`

- Lines: `8`
- Size: `235` bytes
- Functions:
  - `syncAllGearToFirestore`

### `appscript/5_kilometrówka_archiwum 2025/archiwum_sync.gs`

- Lines: `296`
- Size: `10265` bytes
- Functions:
  - `buildEmailToUidMap_`
  - `resolveWaterType_`
  - `syncArchivumToFirestore`
  - `writeIdsToCells_`

### `appscript/5_kilometrówka_archiwum 2025/common_helpers.gs`

- Lines: `319`
- Size: `9296` bytes
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
  - `normalizeHeader_`
  - `setPathValue_`
  - `toFirestoreFields_`
  - `toFirestoreValue_`
  - `toNumberOrNull_`
  - `toStringOrEmpty_`

### `appscript/5_kilometrówka_archiwum 2025/env_config.gs`

- Lines: `41`
- Size: `1234` bytes

### `appscript/5_kilometrówka_archiwum 2025/ranking_sync.gs`

- Lines: `241`
- Size: `8202` bytes
- Functions:
  - `pushRankingCorrections`
  - `syncRankingFromFirestore`

### `appscript/5_kilometrówka_archiwum 2025/ui_menu.gs`

- Lines: `46`
- Size: `1645` bytes
- Functions:
  - `enqueueRebuildMapData`
  - `enqueueRebuildRankings`
  - `onOpen`

### `appscript/kurs/common_helpers.gs`

- Lines: `343`
- Size: `10699` bytes
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

- Lines: `42`
- Size: `1196` bytes

### `appscript/kurs/po_kursie_sync.gs`

- Lines: `94`
- Size: `2592` bytes
- Functions:
  - `readPoKursieFromSheet_`
  - `syncPoKursieToFirestore`

### `appscript/kurs/ui_menu.gs`

- Lines: `13`
- Size: `268` bytes
- Functions:
  - `onOpen`

### `functions/.eslintrc.js`

- Lines: `65`
- Size: `1722` bytes

### `functions/lib/api/adminApprovalHandler.js`

- Lines: `232`
- Size: `10802` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `authorizeAdmin`
  - `enqueueJob`
  - `handleAdminApprove`
  - `handleAdminReject`
  - `norm`
  - `parseKindId`

### `functions/lib/api/adminEventsSyncCalendarHandler.js`

- Lines: `94`
- Size: `4474` bytes
- Imports:
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `enqueue`
  - `handleAdminEventsSyncCalendar`

### `functions/lib/api/adminGearReservationCancelHandler.js`

- Lines: `101`
- Size: `4241` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require firebase-admin`
- Functions:
  - `enqueueJob`
  - `handleAdminGearReservationCancel`
  - `norm`

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

- Lines: `90`
- Size: `4634` bytes
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

### `functions/lib/api/checkNicknameAvailabilityHandler.js`

- Lines: `55`
- Size: `2507` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `handleCheckNicknameAvailability`
  - `normalizeNicknameKey`

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

### `functions/lib/api/eventInterestToggleHandler.js`

- Lines: `87`
- Size: `3596` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `handleEventInterestToggle`

### `functions/lib/api/gearBundleReservationCreateHandler.js`

- Lines: `96`
- Size: `4487` bytes
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

- Lines: `88`
- Size: `4513` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
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

### `functions/lib/api/getAdminGearRentalsHandler.js`

- Lines: `202`
- Size: `8728` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminGearRentals`
  - `isIsoDate`
  - `isoToDateUTC`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/lib/api/getAdminGearTopRentalsHandler.js`

- Lines: `231`
- Size: `10635` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminGearTopRentals`
  - `isIsoDate`
  - `isoToDateUTC`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/lib/api/getAdminMemberActivityHandler.js`

- Lines: `173`
- Size: `7631` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminMemberActivity`
  - `isIsoDate`
  - `isRegistered`
  - `isoToDateUTC`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/lib/api/getAdminMemberDuesHandler.js`

- Lines: `130`
- Size: `6304` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require firebase-functions/v2`
- Functions:
  - `fullName`
  - `handleGetAdminMemberDues`
  - `isRegistered`
  - `nickname`
  - `norm`
  - `parseContrib`
  - `todayWarsawIso`

### `functions/lib/api/getAdminPendingHandler.js`

- Lines: `395`
- Size: `24932` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../service/service_config`
  - `import/require firebase-functions/v2`
- Functions:
  - `docsOf`
  - `errorOf`
  - `handleGetAdminPending`
  - `norm`
  - `snapOf`
  - `tsToIso`

### `functions/lib/api/getAdminUserActivityHandler.js`

- Lines: `192`
- Size: `9052` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminUserActivity`
  - `isIsoDate`
  - `isoToDateUTC`
  - `matchesQuery`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `serialize`
  - `todayWarsawIso`
  - `tsIso`

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

### `functions/lib/api/getEventInterestsHandler.js`

- Lines: `36`
- Size: `1576` bytes
- Functions:
  - `handleGetEventInterests`

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

- Lines: `126`
- Size: `6421` bytes
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

- Lines: `145`
- Size: `7631` bytes
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

### `functions/lib/api/getKlubInfoHandler.js`

- Lines: `176`
- Size: `10909` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `financeAmount`
  - `fullNameFromUser`
  - `handleGetKlubInfo`
  - `singleEmail`

### `functions/lib/api/getKursantStatsHandler.js`

- Lines: `95`
- Size: `5840` bytes
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

- Lines: `82`
- Size: `3944` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
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

### `functions/lib/api/notificationPrefsHandler.js`

- Lines: `65`
- Size: `3085` bytes
- Internal dependencies:
  - `functions/lib/modules/setup/events_vars.js`
- Imports:
  - `import/require ../modules/setup/events_vars`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleNotificationPrefs`

### `functions/lib/api/registerUserHandler.js`

- Lines: `717`
- Size: `38760` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/hours/opening_balance_fields.js`
- Imports:
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../modules/hours/opening_balance_fields`
- Functions:
  - `computeRoleKeyFromOpeningBalance`
  - `emailExistsInOtherObRow`
  - `enqueueGodzinkiHistMerge`
  - `enqueueKmHistoricalMerge`
  - `findNicknameOwnerUid`
  - `findOpeningBalance`
  - `handleRegisterUser`
  - `isDateNotInFuture`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `isProfileComplete`
  - `normalizeBool`
  - `normalizeNicknameKey`
  - `normalizePhone`
  - `normalizePhoneDigits`
  - `normalizeStr`
  - `readProfileInput`
  - `resolveKursantEligibility`
  - `resolveSzkoleniowiec`
  - `updateObEmail`
  - `validateIncomingProfile`

### `functions/lib/api/submitEventHandler.js`

- Lines: `97`
- Size: `4961` bytes
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

- Lines: `145`
- Size: `7707` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
  - `functions/lib/modules/users/userStatusCheck.js`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../modules/shared/text_utils`
  - `import/require ../modules/users/userStatusCheck`
- Functions:
  - `handleSubmitGodzinki`
  - `isTooOldGrantedAt`

### `functions/lib/api/userWeightHandler.js`

- Lines: `65`
- Size: `3159` bytes
- Imports:
  - `import/require firebase-functions/v2`
- Functions:
  - `handleUserWeight`

### `functions/lib/index.js`

- Lines: `1615`
- Size: `70391` bytes
- Internal dependencies:
  - `functions/lib/api/adminApprovalHandler.js`
  - `functions/lib/api/adminEventsSyncCalendarHandler.js`
  - `functions/lib/api/adminGearReservationCancelHandler.js`
  - `functions/lib/api/basenAdminAddGodzinyHandler.js`
  - `functions/lib/api/basenAdminCorrectGodzinyHandler.js`
  - `functions/lib/api/basenAdminSearchUsersHandler.js`
  - `functions/lib/api/basenCancelEnrollmentHandler.js`
  - `functions/lib/api/basenCancelSessionHandler.js`
  - `functions/lib/api/basenCreateSessionHandler.js`
  - `functions/lib/api/basenEnrollHandler.js`
  - `functions/lib/api/basenGrantKarnetHandler.js`
  - `functions/lib/api/checkNicknameAvailabilityHandler.js`
  - `functions/lib/api/eventInterestToggleHandler.js`
  - `functions/lib/api/gearBundleReservationCreateHandler.js`
  - `functions/lib/api/gearFavoriteToggleHandler.js`
  - `functions/lib/api/gearMyReservationsHandler.js`
  - `functions/lib/api/gearReservationCancelHandler.js`
  - `functions/lib/api/gearReservationCreateHandler.js`
  - `functions/lib/api/gearReservationUpdateHandler.js`
  - `functions/lib/api/getAdminGearRentalsHandler.js`
  - `functions/lib/api/getAdminGearTopRentalsHandler.js`
  - `functions/lib/api/getAdminMemberActivityHandler.js`
  - `functions/lib/api/getAdminMemberDuesHandler.js`
  - `functions/lib/api/getAdminPendingHandler.js`
  - `functions/lib/api/getAdminUserActivityHandler.js`
  - `functions/lib/api/getBasenGodzinyHandler.js`
  - `functions/lib/api/getBasenKarnetyHandler.js`
  - `functions/lib/api/getBasenSessionsHandler.js`
  - `functions/lib/api/getEventInterestsHandler.js`
  - `functions/lib/api/getEventsHandler.js`
  - `functions/lib/api/getGearFavoritesHandler.js`
  - `functions/lib/api/getGearItemAvailabilityHandler.js`
  - `functions/lib/api/getGearItemsHandler.js`
  - `functions/lib/api/getGearKayaksHandler.js`
  - `functions/lib/api/getGodzinkiHandler.js`
  - `functions/lib/api/getKayakReservationsHandler.js`
  - `functions/lib/api/getKlubInfoHandler.js`
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
  - `functions/lib/api/notificationPrefsHandler.js`
  - `functions/lib/api/registerUserHandler.js`
  - `functions/lib/api/submitEventHandler.js`
  - `functions/lib/api/submitGodzinkiHandler.js`
  - `functions/lib/api/userWeightHandler.js`
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/service/admin/adminRunTask.js`
  - `functions/lib/service/runner.js`
  - `functions/lib/service/service_config.js`
  - `functions/lib/service/triggers/onEventApproved.js`
  - `functions/lib/service/triggers/onUsersActiveCreated.js`
  - `functions/lib/service/worker/fallbackDailyWorker.js`
  - `functions/lib/service/worker/onJobCreatedWorker.js`
- Imports:
  - `import/require ./api/adminApprovalHandler`
  - `import/require ./api/adminEventsSyncCalendarHandler`
  - `import/require ./api/adminGearReservationCancelHandler`
  - `import/require ./api/basenAdminAddGodzinyHandler`
  - `import/require ./api/basenAdminCorrectGodzinyHandler`
  - `import/require ./api/basenAdminSearchUsersHandler`
  - `import/require ./api/basenCancelEnrollmentHandler`
  - `import/require ./api/basenCancelSessionHandler`
  - `import/require ./api/basenCreateSessionHandler`
  - `import/require ./api/basenEnrollHandler`
  - `import/require ./api/basenGrantKarnetHandler`
  - `import/require ./api/checkNicknameAvailabilityHandler`
  - `import/require ./api/eventInterestToggleHandler`
  - `import/require ./api/gearBundleReservationCreateHandler`
  - `import/require ./api/gearFavoriteToggleHandler`
  - `import/require ./api/gearMyReservationsHandler`
  - `import/require ./api/gearReservationCancelHandler`
  - `import/require ./api/gearReservationCreateHandler`
  - `import/require ./api/gearReservationUpdateHandler`
  - `import/require ./api/getAdminGearRentalsHandler`
  - `import/require ./api/getAdminGearTopRentalsHandler`
  - `import/require ./api/getAdminMemberActivityHandler`
  - `import/require ./api/getAdminMemberDuesHandler`
  - `import/require ./api/getAdminPendingHandler`
  - `import/require ./api/getAdminUserActivityHandler`
  - `import/require ./api/getBasenGodzinyHandler`
  - `import/require ./api/getBasenKarnetyHandler`
  - `import/require ./api/getBasenSessionsHandler`
  - `import/require ./api/getEventInterestsHandler`
  - `import/require ./api/getEventsHandler`
  - `import/require ./api/getGearFavoritesHandler`
  - `import/require ./api/getGearItemAvailabilityHandler`
  - `import/require ./api/getGearItemsHandler`
  - `import/require ./api/getGearKayaksHandler`
  - `import/require ./api/getGodzinkiHandler`
  - `import/require ./api/getKayakReservationsHandler`
  - `import/require ./api/getKlubInfoHandler`
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
  - `import/require ./api/notificationPrefsHandler`
  - `import/require ./api/registerUserHandler`
  - `import/require ./api/submitEventHandler`
  - `import/require ./api/submitGodzinkiHandler`
  - `import/require ./api/userWeightHandler`
  - `import/require ./modules/equipment/bundle/gear_bundle_service`
  - `import/require ./service/admin/adminRunTask`
  - `import/require ./service/runner`
  - `import/require ./service/service_config`
  - `import/require ./service/triggers/onEventApproved`
  - `import/require ./service/triggers/onUsersActiveCreated`
  - `import/require ./service/worker/fallbackDailyWorker`
  - `import/require ./service/worker/onJobCreatedWorker`
  - `import/require cors`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
  - `import/require firebase-functions/v2/https`
  - `import/require firebase-functions/v2/scheduler`
- Functions:
  - `buildAppsScriptSyncSummary`
  - `computeAllowedActions`
  - `defaultScreenForRoleKey`
  - `deny`
  - `enqueueBasenSessionCancelledNotify`
  - `enqueueEventSheetWrite`
  - `enqueueGodzinkiSheetWrite`
  - `enqueueMemberSheetSync`
  - `enqueueWorkspaceGroupsRoleSync`
  - `filterSetupForUser`
  - `flattenEmails`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedHost`
  - `n`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAdminEmail`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`
  - `verifyGoogleAccessToken`

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

- Lines: `339`
- Size: `15197` bytes
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

- Lines: `57`
- Size: `2305` bytes
- Functions:
  - `addDaysIso`
  - `computeBlockIso`
  - `daysOnWaterInclusive`
  - `isIsoDateYYYYMMDD`
  - `maxStartIsoByWeeks`
  - `overlapsIso`
  - `parseIsoToUtcDate`
  - `todayIsoUTC`

### `functions/lib/modules/calendar/events_service.js`

- Lines: `97`
- Size: `3751` bytes
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

- Lines: `936`
- Size: `49292` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`
  - `functions/lib/modules/equipment/shared/reservation_limits.js`
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
  - `import/require ../shared/reservation_limits`
- Functions:
  - `assertKursantRentalAllowed`
  - `buildCostReason`
  - `buildNonKayakMeta`
  - `compositeId`
  - `computePrimaryItemIdx`
  - `computeReservationKind`
  - `createBundleReservation`
  - `fetchItemDetails`
  - `findBundleConflicts`
  - `formatShortRange`
  - `getItemsWithAvailability`
  - `getKursWindowEndDay`
  - `getKursWindowEndSuffix`
  - `getKursWypozyczaFlag`
  - `getReservedCompositeIdsForPeriod`
  - `getUserRole`
  - `isFreeRentalExempt`
  - `isSupportedBundleCategory`
  - `listMyBundleReservations`
  - `norm`
  - `parseSchoolYear`
  - `resolveSchoolYear`
  - `uniqBy`
  - `updateBundleReservationDates`
  - `updateGearReservationDates`

### `functions/lib/modules/equipment/kayaks/gear_kayaks_service.js`

- Lines: `284`
- Size: `15399` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/equipment/shared/reservation_limits.js`
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
  - `import/require ../shared/reservation_limits`
- Functions:
  - `adminCancelReservation`
  - `cancelReservation`
  - `findConflicts`
  - `getUserRole`
  - `listKayaks`
  - `listMyReservations`
  - `norm`
  - `updateReservationDates`

### `functions/lib/modules/equipment/shared/gear_catalog_service.js`

- Lines: `129`
- Size: `5420` bytes
- Functions:
  - `buildMeta`
  - `getCollectionConfig`
  - `isSupportedGearCategory`
  - `listGearItemsByCategory`
  - `norm`
  - `pickGearItem`
  - `toNumberSafe`

### `functions/lib/modules/equipment/shared/reservation_limits.js`

- Lines: `88`
- Size: `4172` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
- Imports:
  - `import/require ../../calendar/calendar_utils`
- Functions:
  - `countItemsByCategory`
  - `countMyOverlappingItemsByCategory`
  - `findCategoryOverLimit`
  - `norm`

### `functions/lib/modules/hours/godzinki_service.js`

- Lines: `936`
- Size: `42904` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `computeBalance`
  - `computeEarnedTotal`
  - `computeNegativeBalances`
  - `computeNextExpiry`
  - `creditApprovedEarn`
  - `creditOpeningBalance`
  - `creditReservationAdjustment`
  - `deductHours`
  - `deductHoursInTx`
  - `getAllRecords`
  - `getBalance`
  - `getHistory`
  - `getNextExpiry`
  - `markApprovalRejected`
  - `processApproval`
  - `refundHoursForReservation`
  - `refundHoursForReservationInTx`
  - `reverseDeductHoursInTx`
  - `submitEarning`
  - `submitPurchaseRequest`
  - `toDate`
  - `toTimestamp`
  - `writeWaivedSpendInTx`

### `functions/lib/modules/hours/godzinki_vars.js`

- Lines: `32`
- Size: `1637` bytes
- Functions:
  - `getGodzinkiVars`
  - `getVar`
  - `toDateUtc`
  - `toNumber`

### `functions/lib/modules/hours/hours_quote.js`

- Lines: `20`
- Size: `1068` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
- Imports:
  - `import/require ../calendar/calendar_utils`
- Functions:
  - `quoteKayaksCostHours`

### `functions/lib/modules/hours/opening_balance_fields.js`

- Lines: `97`
- Size: `4329` bytes
- Functions:
  - `buildOpeningBalanceAdminPatch`
  - `getObHours`
  - `normObKey`
  - `obBool`
  - `obEmailKey`
  - `obValueByPrefix`
  - `obValueExact`

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
- Size: `1206` bytes
- Functions:
  - `getKmVars`
  - `getVar`
  - `toNumber`

### `functions/lib/modules/setup/app_vars.js`

- Lines: `26`
- Size: `1126` bytes
- Functions:
  - `getAppVars`
  - `getVar`
  - `toNumber`
  - `toStr`

### `functions/lib/modules/setup/events_vars.js`

- Lines: `18`
- Size: `750` bytes
- Functions:
  - `getEventsVars`
  - `getVar`
  - `toNumber`

### `functions/lib/modules/setup/setup_gear_vars.js`

- Lines: `66`
- Size: `2821` bytes
- Functions:
  - `getGearVars`
  - `getVar`
  - `roleMaxItems`
  - `roleMaxWeeks`
  - `toBool`
  - `toNumber`

### `functions/lib/modules/shared/text_utils.js`

- Lines: `11`
- Size: `350` bytes
- Functions:
  - `norm`

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

- Lines: `76`
- Size: `3080` bytes
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

- Lines: `469`
- Size: `21764` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleAuth.js`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleSheetsProvider`
- Functions:
  - `assertNonEmpty`
  - `buildLooseRowGetter`
  - `buildRowValues`
  - `buildRowValuesForUpsert`
  - `canonicalHeader`
  - `columnToA1`
  - `findFirstEmptySlotIndex`
  - `normalizeStr`
  - `quoteTab`

### `functions/lib/service/providers/googleWorkspaceProvider.js`

- Lines: `459`
- Size: `20675` bytes
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

- Lines: `79`
- Size: `4695` bytes
- Internal dependencies:
  - `functions/lib/service/tasks/adminApprovalWriteBack.js`
  - `functions/lib/service/tasks/adminNotifyPendingApprovals.js`
  - `functions/lib/service/tasks/basenNotifySessionCancelled.js`
  - `functions/lib/service/tasks/eventsNotifyNew.js`
  - `functions/lib/service/tasks/eventsNotifyUpcoming.js`
  - `functions/lib/service/tasks/eventsSyncCalendar.js`
  - `functions/lib/service/tasks/eventsSyncFromSheet.js`
  - `functions/lib/service/tasks/gearNotifyReservationCancelledByAdmin.js`
  - `functions/lib/service/tasks/gearPrivateStorage.js`
  - `functions/lib/service/tasks/gearSyncAllFromSheet.js`
  - `functions/lib/service/tasks/godzinkiArchiveSheetRows.js`
  - `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js`
  - `functions/lib/service/tasks/godzinkiMergeHistoricalUser.js`
  - `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js`
  - `functions/lib/service/tasks/godzinkiSyncFromSheet.js`
  - `functions/lib/service/tasks/groupsDiagnose.js`
  - `functions/lib/service/tasks/kmMergeHistoricalUser.js`
  - `functions/lib/service/tasks/kmRebuildMapData.js`
  - `functions/lib/service/tasks/kmRebuildRankings.js`
  - `functions/lib/service/tasks/kmRebuildUserStats.js`
  - `functions/lib/service/tasks/kursSyncFromSheet.js`
  - `functions/lib/service/tasks/listaEnforcePostingPolicy.js`
  - `functions/lib/service/tasks/membersSyncToSheet.js`
  - `functions/lib/service/tasks/onUserRegisteredWelcome.js`
  - `functions/lib/service/tasks/reconcileOpeningBalance.js`
  - `functions/lib/service/tasks/reconcileWorkspaceGroups.js`
  - `functions/lib/service/tasks/setupSyncFromSheet.js`
  - `functions/lib/service/tasks/usersNotifyAkademikAccessChanged.js`
  - `functions/lib/service/tasks/usersSyncFieldsFromSheet.js`
  - `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`
  - `functions/lib/service/tasks/usersSyncRolesFromSheet.js`
- Imports:
  - `import/require ./tasks/adminApprovalWriteBack`
  - `import/require ./tasks/adminNotifyPendingApprovals`
  - `import/require ./tasks/basenNotifySessionCancelled`
  - `import/require ./tasks/eventsNotifyNew`
  - `import/require ./tasks/eventsNotifyUpcoming`
  - `import/require ./tasks/eventsSyncCalendar`
  - `import/require ./tasks/eventsSyncFromSheet`
  - `import/require ./tasks/gearNotifyReservationCancelledByAdmin`
  - `import/require ./tasks/gearPrivateStorage`
  - `import/require ./tasks/gearSyncAllFromSheet`
  - `import/require ./tasks/godzinkiArchiveSheetRows`
  - `import/require ./tasks/godzinkiImportTransitionFromSheet`
  - `import/require ./tasks/godzinkiMergeHistoricalUser`
  - `import/require ./tasks/godzinkiMonthlyBalanceReview`
  - `import/require ./tasks/godzinkiSyncFromSheet`
  - `import/require ./tasks/groupsDiagnose`
  - `import/require ./tasks/kmMergeHistoricalUser`
  - `import/require ./tasks/kmRebuildMapData`
  - `import/require ./tasks/kmRebuildRankings`
  - `import/require ./tasks/kmRebuildUserStats`
  - `import/require ./tasks/kursSyncFromSheet`
  - `import/require ./tasks/listaEnforcePostingPolicy`
  - `import/require ./tasks/membersSyncToSheet`
  - `import/require ./tasks/onUserRegisteredWelcome`
  - `import/require ./tasks/reconcileOpeningBalance`
  - `import/require ./tasks/reconcileWorkspaceGroups`
  - `import/require ./tasks/setupSyncFromSheet`
  - `import/require ./tasks/usersNotifyAkademikAccessChanged`
  - `import/require ./tasks/usersSyncFieldsFromSheet`
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

- Lines: `261`
- Size: `13500` bytes
- Imports:
  - `import/require firebase-functions`
- Functions:
  - `getServiceConfig`

### `functions/lib/service/tasks/adminApprovalWriteBack.js`

- Lines: `61`
- Size: `3579` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`

### `functions/lib/service/tasks/adminNotifyPendingApprovals.js`

- Lines: `192`
- Size: `10248` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/setup/app_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../service_config`
- Functions:
  - `ageDaysFrom`
  - `buildPendingDigest`
  - `resolveDisplayName`

### `functions/lib/service/tasks/basenNotifySessionCancelled.js`

- Lines: `86`
- Size: `3817` bytes
- Internal dependencies:
  - `functions/lib/modules/basen/basen_service.js`
- Imports:
  - `import/require ../../modules/basen/basen_service`
- Functions:
  - `norm`

### `functions/lib/service/tasks/eventsNotifyNew.js`

- Lines: `85`
- Size: `4298` bytes
- Internal dependencies:
  - `functions/lib/modules/setup/app_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
- Imports:
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/shared/text_utils`
- Functions:
  - `buildNewEventEmail`
  - `dateRange`

### `functions/lib/service/tasks/eventsNotifyUpcoming.js`

- Lines: `180`
- Size: `9781` bytes
- Internal dependencies:
  - `functions/lib/modules/calendar/calendar_utils.js`
  - `functions/lib/modules/setup/app_vars.js`
  - `functions/lib/modules/setup/events_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
- Imports:
  - `import/require ../../modules/calendar/calendar_utils`
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/setup/events_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require firebase-admin`
- Functions:
  - `buildUpcomingEventEmail`
  - `dateRange`
  - `daysUntilIso`
  - `selectNewRecipientUids`

### `functions/lib/service/tasks/eventsSyncCalendar.js`

- Lines: `176`
- Size: `8660` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleCalendarProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/lib/service/tasks/eventsSyncFromSheet.js`

- Lines: `479`
- Size: `25575` bytes
- Internal dependencies:
  - `functions/lib/modules/shared/text_utils.js`
  - `functions/lib/service/providers/googleCalendarProvider.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `buildEventRowPatch`
  - `findHeaderCaseInsensitive`
  - `isApproved`
  - `normDate`
  - `shouldScrapAbsentEvent`

### `functions/lib/service/tasks/gearNotifyReservationCancelledByAdmin.js`

- Lines: `152`
- Size: `7171` bytes
- Internal dependencies:
  - `functions/lib/modules/setup/app_vars.js`
- Imports:
  - `import/require ../../modules/setup/app_vars`
- Functions:
  - `describeItems`
  - `displayNameOf`
  - `formatDatePL`
  - `norm`

### `functions/lib/service/tasks/gearPrivateStorage.js`

- Lines: `345`
- Size: `16102` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/setup/setup_gear_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/setup_gear_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require firebase-admin`
- Functions:
  - `firstChargeableMonth`
  - `isChargeableThisMonth`
  - `processKayakChargeForMonth`
  - `readPrivateSinceIso`
  - `readStorage`
  - `toYearMonth`
  - `tsToIsoYmd`

### `functions/lib/service/tasks/gearSyncAllFromSheet.js`

- Lines: `428`
- Size: `22493` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `buildDoc`
  - `classifyGearRows`
  - `cleanCell`
  - `flush`
  - `isRealRow`
  - `norm`
  - `parseBool`
  - `parseNumber`
  - `parseSheetDate`
  - `rowNumberLabel`
  - `sflush`
  - `syncCategory`

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

### `functions/lib/service/tasks/godzinkiArchiveSheetRows.js`

- Lines: `75`
- Size: `3699` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
- Functions:
  - `isIsoDate`
  - `selectRowsToArchive`

### `functions/lib/service/tasks/godzinkiImportTransitionFromSheet.js`

- Lines: `169`
- Size: `8915` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
- Functions:
  - `isApproved`
  - `isIsoDate`
  - `parseHours`

### `functions/lib/service/tasks/godzinkiMergeHistoricalUser.js`

- Lines: `131`
- Size: `6137` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/lib/service/tasks/godzinkiMonthlyBalanceReview.js`

- Lines: `167`
- Size: `8560` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/setup/app_vars.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/app_vars`
  - `import/require firebase-admin`
- Functions:
  - `creditBoardMonthlyBonus`
  - `fmtBalance`
  - `monthKeyOf`

### `functions/lib/service/tasks/godzinkiSyncFromSheet.js`

- Lines: `440`
- Size: `21384` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/shared/text_utils.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `buildLedgerRowPatch`
  - `buildPendingCorrection`
  - `isApproved`
  - `isIsoDate`
  - `readUserName`
  - `tsToIsoDate`

### `functions/lib/service/tasks/groupsDiagnose.js`

- Lines: `99`
- Size: `4853` bytes

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

- Lines: `249`
- Size: `13122` bytes
- Internal dependencies:
  - `functions/lib/service/workspaceGroupSync.js`
- Imports:
  - `import/require ../workspaceGroupSync`
- Functions:
  - `asErr`
  - `assertString`

### `functions/lib/service/tasks/reconcileOpeningBalance.js`

- Lines: `233`
- Size: `12275` bytes
- Internal dependencies:
  - `functions/lib/modules/hours/godzinki_service.js`
  - `functions/lib/modules/hours/godzinki_vars.js`
  - `functions/lib/modules/hours/opening_balance_fields.js`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/hours/opening_balance_fields`
  - `import/require firebase-admin`
- Functions:
  - `lower`
  - `norm`

### `functions/lib/service/tasks/reconcileWorkspaceGroups.js`

- Lines: `191`
- Size: `9453` bytes
- Internal dependencies:
  - `functions/lib/service/workspaceGroupSync.js`
- Imports:
  - `import/require ../workspaceGroupSync`
- Functions:
  - `enforceTargetStateForUser`
  - `norm`
  - `targetListaRoleFor`
  - `targetManagedGroupsFor`

### `functions/lib/service/tasks/setupSyncFromSheet.js`

- Lines: `362`
- Size: `16570` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `g`
  - `headerMap`
  - `norm`
  - `normalizeHeader`
  - `parseSetupValue`
  - `readAppSetupModules`
  - `readAppSetupRoles`
  - `readSetupVars`
  - `rolesAllowedFromFlags`
  - `splitList`
  - `toBool`
  - `toNumberOrNull`

### `functions/lib/service/tasks/usersNotifyAkademikAccessChanged.js`

- Lines: `54`
- Size: `3176` bytes
- Functions:
  - `norm`

### `functions/lib/service/tasks/usersSyncFieldsFromSheet.js`

- Lines: `519`
- Size: `26106` bytes
- Internal dependencies:
  - `functions/lib/modules/equipment/bundle/gear_bundle_service.js`
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require firebase-admin`
- Functions:
  - `g`
  - `getPath`
  - `headerMap`
  - `mapRoleDisplayToKey`
  - `mapStatusDisplayToKey`
  - `norm`
  - `normalizeBoolish`
  - `normalizeDateString`
  - `normalizeHeader`
  - `toNumberOrNull`
  - `valuesEqual`

### `functions/lib/service/tasks/usersSyncFunctionRolesFromSetup.js`

- Lines: `472`
- Size: `23320` bytes
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

- Lines: `290`
- Size: `15403` bytes
- Internal dependencies:
  - `functions/lib/service/providers/googleSheetsProvider.js`
  - `functions/lib/service/providers/googleWorkspaceProvider.js`
  - `functions/lib/service/service_config.js`
  - `functions/lib/service/workspaceGroupSync.js`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../providers/googleWorkspaceProvider`
  - `import/require ../service_config`
  - `import/require ../workspaceGroupSync`
  - `import/require firebase-admin`
- Functions:
  - `buildInvertedLabelMap`
  - `norm`

### `functions/lib/service/triggers/onEventApproved.js`

- Lines: `86`
- Size: `3973` bytes
- Internal dependencies:
  - `functions/lib/service/service_config.js`
- Imports:
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/firestore`
- Functions:
  - `jobIdForNotifyNew`

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

### `functions/lib/service/workspaceGroupSync.js`

- Lines: `132`
- Size: `5721` bytes
- Functions:
  - `listaRoleForUserRole`
  - `norm`
  - `syncAllWorkspaceGroupsForRoleChange`
  - `syncListaGroupForUser`
  - `syncWorkspaceGroupsForUser`

### `functions/scripts/auditInvoker.js`

- Lines: `57`
- Size: `2727` bytes
- Imports:
  - `import/require google-auth-library`
- Functions:
  - `pad`

### `functions/scripts/auditInvokerDebug.js`

- Lines: `41`
- Size: `2090` bytes
- Imports:
  - `import/require google-auth-library`

### `functions/scripts/backfillEntryFeePaidAt.js`

- Lines: `66`
- Size: `2301` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/scripts/checkGearReport.js`

- Lines: `119`
- Size: `5325` bytes
- Internal dependencies:
  - `functions/lib/api/getAdminGearRentalsHandler.js`
- Imports:
  - `import/require ../lib/api/getAdminGearRentalsHandler`
  - `import/require firebase-admin`
- Functions:
  - `call`

### `functions/scripts/checkKlubFinanceLeak.js`

- Lines: `132`
- Size: `5411` bytes
- Internal dependencies:
  - `functions/lib/api/getKlubInfoHandler.js`
- Imports:
  - `import/require ../lib/api/getKlubInfoHandler`
  - `import/require firebase-admin`
- Functions:
  - `callKlub`
  - `hasFinanceFields`

### `functions/scripts/checkMemberActivity.js`

- Lines: `125`
- Size: `5593` bytes
- Internal dependencies:
  - `functions/lib/api/getAdminMemberActivityHandler.js`
- Imports:
  - `import/require ../lib/api/getAdminMemberActivityHandler`
  - `import/require firebase-admin`
- Functions:
  - `call`

### `functions/scripts/checkUserGearReservations.js`

- Lines: `71`
- Size: `2396` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `tsToIso`

### `functions/scripts/checkUserGodzinkiHome.js`

- Lines: `88`
- Size: `3538` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `computeBalance`
  - `tsToIso`

### `functions/scripts/deleteGhostGodzinki.js`

- Lines: `104`
- Size: `3676` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `hasSheetRow`
  - `parseIds`

### `functions/scripts/deleteStuckJob.js`

- Lines: `26`
- Size: `799` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/enqueueEventsNotifyUpcoming.js`

- Lines: `45`
- Size: `1580` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/enqueueGodzinkiTransitionImport.js`

- Lines: `65`
- Size: `2544` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `getOpt`

### `functions/scripts/enqueueGroupsDiagnose.js`

- Lines: `58`
- Size: `1992` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/enqueueListaPolicy.js`

- Lines: `37`
- Size: `1213` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/enqueueReconcileOpeningBalance.js`

- Lines: `54`
- Size: `2109` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `projArg`

### `functions/scripts/enqueueReconcileWorkspaceGroups.js`

- Lines: `172`
- Size: `7652` bytes
- Imports:
  - `import/require firebase-admin`
  - `import/require googleapis`
- Functions:
  - `emailArg`
  - `exchangeJwtForAccessToken`
  - `projArg`
  - `sendNotifyEmails`
  - `signJwtWithIamCredentials`

### `functions/scripts/fixGhostApprovals.js`

- Lines: `71`
- Size: `2836` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/investigateEventNotif.js`

- Lines: `109`
- Size: `3586` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `addDays`
  - `tsToIso`

### `functions/scripts/previewOpeningBalanceReconcile.js`

- Lines: `74`
- Size: `4206` bytes
- Imports:
  - `import/require firebase-admin`
  - `import/require path`
- Functions:
  - `getObHours`
  - `lower`
  - `norm`
  - `normObKey`
  - `obValEx`

### `functions/scripts/printFnUrls.js`

- Lines: `19`
- Size: `1017` bytes
- Imports:
  - `import/require google-auth-library`

### `functions/scripts/readEvents.js`

- Lines: `44`
- Size: `1324` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `tsToIso`

### `functions/scripts/readGearCollections.js`

- Lines: `51`
- Size: `1369` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `tsToIso`

### `functions/scripts/readGroupsDiag.js`

- Lines: `39`
- Size: `1256` bytes
- Imports:
  - `import/require firebase-admin`

### `functions/scripts/readPendingApprovals.js`

- Lines: `68`
- Size: `2476` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `ageDays`
  - `tsToIso`

### `functions/scripts/readServiceJobs.js`

- Lines: `41`
- Size: `1128` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `tsToIso`

### `functions/scripts/readUsersActive.js`

- Lines: `76`
- Size: `2448` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `isProfileComplete`
  - `norm`
  - `tsToIso`

### `functions/scripts/removeEventsFromApp.js`

- Lines: `92`
- Size: `3396` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `parseIds`

### `functions/scripts/runReconcileOpeningBalance.js`

- Lines: `38`
- Size: `1731` bytes
- Internal dependencies:
  - `functions/lib/service/tasks/reconcileOpeningBalance.js`
- Imports:
  - `import/require ../lib/service/tasks/reconcileOpeningBalance`
  - `import/require firebase-admin`

### `functions/scripts/verifyDeploy.js`

- Lines: `40`
- Size: `1898` bytes
- Imports:
  - `import/require google-auth-library`

### `functions/scripts/waiveUserGearCharges.js`

- Lines: `138`
- Size: `5592` bytes
- Imports:
  - `import/require firebase-admin`
- Functions:
  - `EMAIL`
  - `computeBalance`
  - `toDate`

### `functions/src/api/adminApprovalHandler.ts`

- Lines: `222`
- Size: `8700` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require express`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `authorizeAdmin`
  - `enqueueJob`
  - `handleAdminApprove`
  - `handleAdminReject`
  - `norm`
  - `parseKindId`

### `functions/src/api/adminEventsSyncCalendarHandler.ts`

- Lines: `83`
- Size: `2997` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2`
- Functions:
  - `enqueue`
  - `handleAdminEventsSyncCalendar`

### `functions/src/api/adminGearReservationCancelHandler.ts`

- Lines: `89`
- Size: `2909` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
- Imports:
  - `import/require ../modules/equipment/kayaks/gear_kayaks_service`
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `enqueueJob`
  - `handleAdminGearReservationCancel`
  - `norm`

### `functions/src/api/basenCancelEnrollmentHandler.ts`

- Lines: `63`
- Size: `2117` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCancelEnrollment`

### `functions/src/api/basenCancelSessionHandler.ts`

- Lines: `82`
- Size: `2999` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCancelSession`

### `functions/src/api/basenCreateSessionHandler.ts`

- Lines: `105`
- Size: `3824` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenCreateSession`
  - `readTimeBlock`

### `functions/src/api/basenEnrollHandler.ts`

- Lines: `157`
- Size: `5908` bytes
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

- Lines: `87`
- Size: `3171` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenGrantKarnet`

### `functions/src/api/basenSetKayakHandler.ts`

- Lines: `58`
- Size: `2096` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleBasenSetKayak`

### `functions/src/api/checkNicknameAvailabilityHandler.ts`

- Lines: `84`
- Size: `2482` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleCheckNicknameAvailability`
  - `normalizeNicknameKey`

### `functions/src/api/eventInterestToggleHandler.ts`

- Lines: `73`
- Size: `2202` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `handleEventInterestToggle`

### `functions/src/api/gearBundleReservationCreateHandler.ts`

- Lines: `120`
- Size: `4212` bytes
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

- Lines: `107`
- Size: `4111` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
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

### `functions/src/api/getAdminGearRentalsHandler.ts`

- Lines: `245`
- Size: `8309` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminGearRentals`
  - `isIsoDate`
  - `isoToDateUTC`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/src/api/getAdminGearTopRentalsHandler.ts`

- Lines: `277`
- Size: `9694` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminGearTopRentals`
  - `isIsoDate`
  - `isoToDateUTC`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/src/api/getAdminMemberActivityHandler.ts`

- Lines: `194`
- Size: `7074` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminMemberActivity`
  - `isIsoDate`
  - `isRegistered`
  - `isoToDateUTC`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `todayWarsawIso`

### `functions/src/api/getAdminMemberDuesHandler.ts`

- Lines: `160`
- Size: `5857` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `fullName`
  - `handleGetAdminMemberDues`
  - `isRegistered`
  - `nickname`
  - `norm`
  - `parseContrib`
  - `todayWarsawIso`

### `functions/src/api/getAdminPendingHandler.ts`

- Lines: `493`
- Size: `20140` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../service/service_config`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `docsOf`
  - `handleGetAdminPending`
  - `norm`
  - `tsToIso`

### `functions/src/api/getAdminUserActivityHandler.ts`

- Lines: `209`
- Size: `8279` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `dateUTCToIso`
  - `fullName`
  - `handleGetAdminUserActivity`
  - `isIsoDate`
  - `isoToDateUTC`
  - `matchesQuery`
  - `minusDays`
  - `minusMonths`
  - `nickname`
  - `norm`
  - `resolveRange`
  - `serialize`
  - `todayWarsawIso`
  - `tsIso`

### `functions/src/api/getBasenAttendeesHandler.ts`

- Lines: `45`
- Size: `1638` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleGetBasenAttendees`

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

### `functions/src/api/getBasenKayaksHandler.ts`

- Lines: `45`
- Size: `1640` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleGetBasenKayaks`

### `functions/src/api/getBasenSessionsHandler.ts`

- Lines: `83`
- Size: `2950` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require express`
- Functions:
  - `handleGetBasenSessions`

### `functions/src/api/getEventInterestsHandler.ts`

- Lines: `55`
- Size: `1660` bytes
- Imports:
  - `import/require express`
- Functions:
  - `handleGetEventInterests`

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

- Lines: `162`
- Size: `4964` bytes
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

- Lines: `166`
- Size: `6216` bytes
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

### `functions/src/api/getKlubInfoHandler.ts`

- Lines: `207`
- Size: `9344` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `financeAmount`
  - `fullNameFromUser`
  - `handleGetKlubInfo`
  - `singleEmail`

### `functions/src/api/getKursantStatsHandler.ts`

- Lines: `123`
- Size: `4311` bytes
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

- Lines: `103`
- Size: `3790` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
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

### `functions/src/api/notificationPrefsHandler.ts`

- Lines: `92`
- Size: `2979` bytes
- Internal dependencies:
  - `functions/src/modules/setup/events_vars.ts`
- Imports:
  - `import/require ../modules/setup/events_vars`
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleNotificationPrefs`

### `functions/src/api/registerUserHandler.ts`

- Lines: `916`
- Size: `36045` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/hours/opening_balance_fields.ts`
- Imports:
  - `import/require ../modules/basen/basen_service`
  - `import/require ../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../modules/hours/opening_balance_fields`
  - `import/require express`
  - `import/require firebase-admin`
- Functions:
  - `computeRoleKeyFromOpeningBalance`
  - `emailExistsInOtherObRow`
  - `enqueueGodzinkiHistMerge`
  - `enqueueKmHistoricalMerge`
  - `findNicknameOwnerUid`
  - `findOpeningBalance`
  - `handleRegisterUser`
  - `isDateNotInFuture`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `isProfileComplete`
  - `normalizeBool`
  - `normalizeNicknameKey`
  - `normalizePhone`
  - `normalizePhoneDigits`
  - `normalizeStr`
  - `readProfileInput`
  - `resolveKursantEligibility`
  - `resolveSzkoleniowiec`
  - `updateObEmail`
  - `validateIncomingProfile`

### `functions/src/api/submitEventHandler.ts`

- Lines: `132`
- Size: `4422` bytes
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

- Lines: `157`
- Size: `6613` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/modules/users/userStatusCheck.ts`
- Imports:
  - `import/require ../modules/calendar/calendar_utils`
  - `import/require ../modules/hours/godzinki_service`
  - `import/require ../modules/hours/godzinki_vars`
  - `import/require ../modules/shared/text_utils`
  - `import/require ../modules/users/userStatusCheck`
  - `import/require express`
- Functions:
  - `handleSubmitGodzinki`
  - `isTooOldGrantedAt`

### `functions/src/api/userWeightHandler.ts`

- Lines: `91`
- Size: `2844` bytes
- Imports:
  - `import/require express`
  - `import/require firebase-functions/v2`
- Functions:
  - `handleUserWeight`

### `functions/src/index.ts`

- Lines: `1762`
- Size: `59337` bytes
- Internal dependencies:
  - `functions/src/api/adminApprovalHandler.ts`
  - `functions/src/api/adminEventsSyncCalendarHandler.ts`
  - `functions/src/api/adminGearReservationCancelHandler.ts`
  - `functions/src/api/basenCancelEnrollmentHandler.ts`
  - `functions/src/api/basenCancelSessionHandler.ts`
  - `functions/src/api/basenCreateSessionHandler.ts`
  - `functions/src/api/basenEnrollHandler.ts`
  - `functions/src/api/basenGrantKarnetHandler.ts`
  - `functions/src/api/basenSetKayakHandler.ts`
  - `functions/src/api/checkNicknameAvailabilityHandler.ts`
  - `functions/src/api/eventInterestToggleHandler.ts`
  - `functions/src/api/gearBundleReservationCreateHandler.ts`
  - `functions/src/api/gearFavoriteToggleHandler.ts`
  - `functions/src/api/gearMyReservationsHandler.ts`
  - `functions/src/api/gearReservationCancelHandler.ts`
  - `functions/src/api/gearReservationCreateHandler.ts`
  - `functions/src/api/gearReservationUpdateHandler.ts`
  - `functions/src/api/getAdminGearRentalsHandler.ts`
  - `functions/src/api/getAdminGearTopRentalsHandler.ts`
  - `functions/src/api/getAdminMemberActivityHandler.ts`
  - `functions/src/api/getAdminMemberDuesHandler.ts`
  - `functions/src/api/getAdminPendingHandler.ts`
  - `functions/src/api/getAdminUserActivityHandler.ts`
  - `functions/src/api/getBasenAttendeesHandler.ts`
  - `functions/src/api/getBasenKarnetyHandler.ts`
  - `functions/src/api/getBasenKayaksHandler.ts`
  - `functions/src/api/getBasenSessionsHandler.ts`
  - `functions/src/api/getEventInterestsHandler.ts`
  - `functions/src/api/getEventsHandler.ts`
  - `functions/src/api/getGearFavoritesHandler.ts`
  - `functions/src/api/getGearItemAvailabilityHandler.ts`
  - `functions/src/api/getGearItemsHandler.ts`
  - `functions/src/api/getGearKayaksHandler.ts`
  - `functions/src/api/getGodzinkiHandler.ts`
  - `functions/src/api/getKayakReservationsHandler.ts`
  - `functions/src/api/getKlubInfoHandler.ts`
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
  - `functions/src/api/notificationPrefsHandler.ts`
  - `functions/src/api/registerUserHandler.ts`
  - `functions/src/api/submitEventHandler.ts`
  - `functions/src/api/submitGodzinkiHandler.ts`
  - `functions/src/api/userWeightHandler.ts`
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/service/admin/adminRunTask.ts`
  - `functions/src/service/runner.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/triggers/onEventApproved.ts`
  - `functions/src/service/triggers/onUsersActiveCreated.ts`
  - `functions/src/service/worker/fallbackDailyWorker.ts`
  - `functions/src/service/worker/onJobCreatedWorker.ts`
- Imports:
  - `import/require ./api/adminApprovalHandler`
  - `import/require ./api/adminEventsSyncCalendarHandler`
  - `import/require ./api/adminGearReservationCancelHandler`
  - `import/require ./api/basenCancelEnrollmentHandler`
  - `import/require ./api/basenCancelSessionHandler`
  - `import/require ./api/basenCreateSessionHandler`
  - `import/require ./api/basenEnrollHandler`
  - `import/require ./api/basenGrantKarnetHandler`
  - `import/require ./api/basenSetKayakHandler`
  - `import/require ./api/checkNicknameAvailabilityHandler`
  - `import/require ./api/eventInterestToggleHandler`
  - `import/require ./api/gearBundleReservationCreateHandler`
  - `import/require ./api/gearFavoriteToggleHandler`
  - `import/require ./api/gearMyReservationsHandler`
  - `import/require ./api/gearReservationCancelHandler`
  - `import/require ./api/gearReservationCreateHandler`
  - `import/require ./api/gearReservationUpdateHandler`
  - `import/require ./api/getAdminGearRentalsHandler`
  - `import/require ./api/getAdminGearTopRentalsHandler`
  - `import/require ./api/getAdminMemberActivityHandler`
  - `import/require ./api/getAdminMemberDuesHandler`
  - `import/require ./api/getAdminPendingHandler`
  - `import/require ./api/getAdminUserActivityHandler`
  - `import/require ./api/getBasenAttendeesHandler`
  - `import/require ./api/getBasenKarnetyHandler`
  - `import/require ./api/getBasenKayaksHandler`
  - `import/require ./api/getBasenSessionsHandler`
  - `import/require ./api/getEventInterestsHandler`
  - `import/require ./api/getEventsHandler`
  - `import/require ./api/getGearFavoritesHandler`
  - `import/require ./api/getGearItemAvailabilityHandler`
  - `import/require ./api/getGearItemsHandler`
  - `import/require ./api/getGearKayaksHandler`
  - `import/require ./api/getGodzinkiHandler`
  - `import/require ./api/getKayakReservationsHandler`
  - `import/require ./api/getKlubInfoHandler`
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
  - `import/require ./api/notificationPrefsHandler`
  - `import/require ./api/registerUserHandler`
  - `import/require ./api/submitEventHandler`
  - `import/require ./api/submitGodzinkiHandler`
  - `import/require ./api/userWeightHandler`
  - `import/require ./modules/equipment/bundle/gear_bundle_service`
  - `import/require ./service/admin/adminRunTask`
  - `import/require ./service/runner`
  - `import/require ./service/service_config`
  - `import/require ./service/triggers/onEventApproved`
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
  - `buildAppsScriptSyncSummary`
  - `computeAllowedActions`
  - `defaultScreenForRoleKey`
  - `deny`
  - `enqueueBasenSessionCancelledNotify`
  - `enqueueEventSheetWrite`
  - `enqueueGodzinkiSheetWrite`
  - `enqueueMemberSheetSync`
  - `enqueueWorkspaceGroupsRoleSync`
  - `filterSetupForUser`
  - `flattenEmails`
  - `getRequestHost`
  - `getRequestOrigin`
  - `getSetupApp`
  - `isAllowedHost`
  - `n`
  - `normalizeHost`
  - `normalizeOrigin`
  - `requireAdminEmail`
  - `requireAllowedHost`
  - `requireIdToken`
  - `sendPreflight`
  - `setCorsHeaders`
  - `verifyGoogleAccessToken`

### `functions/src/modules/basen/basen_service.ts`

- Lines: `758`
- Size: `29165` bytes
- Internal dependencies:
  - `functions/src/modules/setup/function_roles_service.ts`
- Imports:
  - `import/require ../setup/function_roles_service`
  - `import/require firebase-admin`
- Functions:
  - `cancelEnrollment`
  - `cancelSession`
  - `createSession`
  - `enrollInSlot`
  - `enrollmentId`
  - `getActiveKarnet`
  - `getBasenVars`
  - `getUserEnrollments`
  - `getUserKarnety`
  - `grantKarnet`
  - `kayakAllocationId`
  - `listAvailableBasenKayaks`
  - `listSlotAttendees`
  - `listUpcomingSessions`
  - `norm`
  - `parseVarValue`
  - `resolveBasenAdminGrant`
  - `sessionSlotDatetimeMs`
  - `setEnrollmentKayak`
  - `splitEmails`
  - `todayIso`

### `functions/src/modules/calendar/calendar_utils.ts`

- Lines: `54`
- Size: `2015` bytes
- Functions:
  - `addDaysIso`
  - `computeBlockIso`
  - `daysOnWaterInclusive`
  - `isIsoDateYYYYMMDD`
  - `maxStartIsoByWeeks`
  - `overlapsIso`
  - `parseIsoToUtcDate`
  - `todayIsoUTC`

### `functions/src/modules/calendar/events_service.ts`

- Lines: `139`
- Size: `4139` bytes
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

- Lines: `1129`
- Size: `45149` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`
  - `functions/src/modules/equipment/shared/reservation_limits.ts`
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
  - `import/require ../shared/reservation_limits`
- Functions:
  - `assertKursantRentalAllowed`
  - `buildCostReason`
  - `buildNonKayakMeta`
  - `compositeId`
  - `computePrimaryItemIdx`
  - `computeReservationKind`
  - `createBundleReservation`
  - `fetchItemDetails`
  - `findBundleConflicts`
  - `formatShortRange`
  - `getItemsWithAvailability`
  - `getKursWindowEndDay`
  - `getKursWindowEndSuffix`
  - `getKursWypozyczaFlag`
  - `getReservedCompositeIdsForPeriod`
  - `getUserRole`
  - `isFreeRentalExempt`
  - `isSupportedBundleCategory`
  - `listMyBundleReservations`
  - `norm`
  - `parseSchoolYear`
  - `resolveSchoolYear`
  - `updateBundleReservationDates`
  - `updateGearReservationDates`

### `functions/src/modules/equipment/kayaks/gear_kayaks_service.ts`

- Lines: `347`
- Size: `13430` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/equipment/shared/reservation_limits.ts`
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
  - `import/require ../shared/reservation_limits`
- Functions:
  - `adminCancelReservation`
  - `cancelReservation`
  - `findConflicts`
  - `getUserRole`
  - `listKayaks`
  - `listMyReservations`
  - `norm`
  - `updateReservationDates`

### `functions/src/modules/equipment/shared/gear_catalog_service.ts`

- Lines: `154`
- Size: `3665` bytes
- Functions:
  - `buildMeta`
  - `getCollectionConfig`
  - `isSupportedGearCategory`
  - `listGearItemsByCategory`
  - `norm`
  - `pickGearItem`
  - `toNumberSafe`

### `functions/src/modules/equipment/shared/reservation_limits.ts`

- Lines: `96`
- Size: `3588` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
- Imports:
  - `import/require ../../calendar/calendar_utils`
- Functions:
  - `countItemsByCategory`
  - `countMyOverlappingItemsByCategory`
  - `findCategoryOverLimit`
  - `norm`

### `functions/src/modules/hours/godzinki_service.ts`

- Lines: `1154`
- Size: `42647` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_vars.ts`
- Imports:
  - `import/require ./godzinki_vars`
  - `import/require firebase-admin`
- Functions:
  - `computeBalance`
  - `computeEarnedTotal`
  - `computeNegativeBalances`
  - `computeNextExpiry`
  - `creditApprovedEarn`
  - `creditOpeningBalance`
  - `creditReservationAdjustment`
  - `deductHours`
  - `deductHoursInTx`
  - `getAllRecords`
  - `getBalance`
  - `getHistory`
  - `getNextExpiry`
  - `markApprovalRejected`
  - `processApproval`
  - `refundHoursForReservation`
  - `refundHoursForReservationInTx`
  - `reverseDeductHoursInTx`
  - `submitEarning`
  - `submitPurchaseRequest`
  - `toDate`
  - `toTimestamp`
  - `writeWaivedSpendInTx`

### `functions/src/modules/hours/godzinki_vars.ts`

- Lines: `52`
- Size: `2317` bytes
- Functions:
  - `getGodzinkiVars`
  - `getVar`
  - `toDateUtc`
  - `toNumber`

### `functions/src/modules/hours/hours_quote.ts`

- Lines: `19`
- Size: `948` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
- Imports:
  - `import/require ../calendar/calendar_utils`
  - `import/require ../setup/setup_gear_vars`
- Functions:
  - `quoteKayaksCostHours`

### `functions/src/modules/hours/opening_balance_fields.ts`

- Lines: `90`
- Size: `3911` bytes
- Functions:
  - `buildOpeningBalanceAdminPatch`
  - `getObHours`
  - `normObKey`
  - `obBool`
  - `obEmailKey`
  - `obValueByPrefix`
  - `obValueExact`

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
- Size: `1199` bytes
- Functions:
  - `getKmVars`
  - `getVar`
  - `toNumber`

### `functions/src/modules/setup/app_vars.ts`

- Lines: `41`
- Size: `1501` bytes
- Functions:
  - `getAppVars`
  - `getVar`
  - `toNumber`
  - `toStr`

### `functions/src/modules/setup/events_vars.ts`

- Lines: `28`
- Size: `860` bytes
- Functions:
  - `getEventsVars`
  - `getVar`
  - `toNumber`

### `functions/src/modules/setup/function_roles_service.ts`

- Lines: `34`
- Size: `1335` bytes
- Functions:
  - `resolveFunctionRoleEmail`
  - `singleEmail`

### `functions/src/modules/setup/setup_gear_vars.ts`

- Lines: `88`
- Size: `3165` bytes
- Functions:
  - `getGearVars`
  - `getVar`
  - `roleMaxItems`
  - `roleMaxWeeks`
  - `toBool`
  - `toNumber`

### `functions/src/modules/shared/text_utils.ts`

- Lines: `9`
- Size: `233` bytes
- Functions:
  - `norm`

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

- Lines: `82`
- Size: `2803` bytes
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

- Lines: `568`
- Size: `20376` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleAuth.ts`
- Imports:
  - `import/require ./googleAuth`
  - `import/require googleapis`
- Classes:
  - `GoogleSheetsProvider`
- Functions:
  - `assertNonEmpty`
  - `buildLooseRowGetter`
  - `buildRowValuesForUpsert`
  - `canonicalHeader`
  - `columnToA1`
  - `findFirstEmptySlotIndex`
  - `normalizeStr`
  - `quoteTab`

### `functions/src/service/providers/googleWorkspaceProvider.ts`

- Lines: `531`
- Size: `18186` bytes
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

- Lines: `78`
- Size: `3797` bytes
- Internal dependencies:
  - `functions/src/service/tasks/adminApprovalWriteBack.ts`
  - `functions/src/service/tasks/adminNotifyPendingApprovals.ts`
  - `functions/src/service/tasks/basenNotifySessionCancelled.ts`
  - `functions/src/service/tasks/eventsNotifyNew.ts`
  - `functions/src/service/tasks/eventsNotifyUpcoming.ts`
  - `functions/src/service/tasks/eventsSyncCalendar.ts`
  - `functions/src/service/tasks/eventsSyncFromSheet.ts`
  - `functions/src/service/tasks/gearNotifyReservationCancelledByAdmin.ts`
  - `functions/src/service/tasks/gearPrivateStorage.ts`
  - `functions/src/service/tasks/gearSyncAllFromSheet.ts`
  - `functions/src/service/tasks/godzinkiArchiveSheetRows.ts`
  - `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts`
  - `functions/src/service/tasks/godzinkiMergeHistoricalUser.ts`
  - `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts`
  - `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
  - `functions/src/service/tasks/groupsDiagnose.ts`
  - `functions/src/service/tasks/kmMergeHistoricalUser.ts`
  - `functions/src/service/tasks/kmRebuildMapData.ts`
  - `functions/src/service/tasks/kmRebuildRankings.ts`
  - `functions/src/service/tasks/kmRebuildUserStats.ts`
  - `functions/src/service/tasks/kursSyncFromSheet.ts`
  - `functions/src/service/tasks/listaEnforcePostingPolicy.ts`
  - `functions/src/service/tasks/membersSyncToSheet.ts`
  - `functions/src/service/tasks/onUserRegisteredWelcome.ts`
  - `functions/src/service/tasks/reconcileOpeningBalance.ts`
  - `functions/src/service/tasks/reconcileWorkspaceGroups.ts`
  - `functions/src/service/tasks/setupSyncFromSheet.ts`
  - `functions/src/service/tasks/usersNotifyAkademikAccessChanged.ts`
  - `functions/src/service/tasks/usersSyncFieldsFromSheet.ts`
  - `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`
  - `functions/src/service/tasks/usersSyncRolesFromSheet.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ./tasks/adminApprovalWriteBack`
  - `import/require ./tasks/adminNotifyPendingApprovals`
  - `import/require ./tasks/basenNotifySessionCancelled`
  - `import/require ./tasks/eventsNotifyNew`
  - `import/require ./tasks/eventsNotifyUpcoming`
  - `import/require ./tasks/eventsSyncCalendar`
  - `import/require ./tasks/eventsSyncFromSheet`
  - `import/require ./tasks/gearNotifyReservationCancelledByAdmin`
  - `import/require ./tasks/gearPrivateStorage`
  - `import/require ./tasks/gearSyncAllFromSheet`
  - `import/require ./tasks/godzinkiArchiveSheetRows`
  - `import/require ./tasks/godzinkiImportTransitionFromSheet`
  - `import/require ./tasks/godzinkiMergeHistoricalUser`
  - `import/require ./tasks/godzinkiMonthlyBalanceReview`
  - `import/require ./tasks/godzinkiSyncFromSheet`
  - `import/require ./tasks/groupsDiagnose`
  - `import/require ./tasks/kmMergeHistoricalUser`
  - `import/require ./tasks/kmRebuildMapData`
  - `import/require ./tasks/kmRebuildRankings`
  - `import/require ./tasks/kmRebuildUserStats`
  - `import/require ./tasks/kursSyncFromSheet`
  - `import/require ./tasks/listaEnforcePostingPolicy`
  - `import/require ./tasks/membersSyncToSheet`
  - `import/require ./tasks/onUserRegisteredWelcome`
  - `import/require ./tasks/reconcileOpeningBalance`
  - `import/require ./tasks/reconcileWorkspaceGroups`
  - `import/require ./tasks/setupSyncFromSheet`
  - `import/require ./tasks/usersNotifyAkademikAccessChanged`
  - `import/require ./tasks/usersSyncFieldsFromSheet`
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

- Lines: `356`
- Size: `13322` bytes
- Imports:
  - `import/require firebase-functions`
- Functions:
  - `getServiceConfig`

### `functions/src/service/tasks/adminApprovalWriteBack.ts`

- Lines: `90`
- Size: `3677` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`

### `functions/src/service/tasks/adminNotifyPendingApprovals.ts`

- Lines: `259`
- Size: `9592` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/setup/app_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../service_config`
  - `import/require ../types`
- Functions:
  - `ageDaysFrom`
  - `buildPendingDigest`
  - `resolveDisplayName`

### `functions/src/service/tasks/basenNotifySessionCancelled.ts`

- Lines: `97`
- Size: `3267` bytes
- Internal dependencies:
  - `functions/src/modules/basen/basen_service.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/basen/basen_service`
  - `import/require ../types`
- Functions:
  - `norm`

### `functions/src/service/tasks/eventsNotifyNew.ts`

- Lines: `111`
- Size: `3819` bytes
- Internal dependencies:
  - `functions/src/modules/setup/app_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../types`
- Functions:
  - `buildNewEventEmail`
  - `dateRange`

### `functions/src/service/tasks/eventsNotifyUpcoming.ts`

- Lines: `198`
- Size: `8343` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/setup/app_vars.ts`
  - `functions/src/modules/setup/events_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/calendar/calendar_utils`
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../../modules/setup/events_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `buildUpcomingEventEmail`
  - `dateRange`
  - `daysUntilIso`
  - `selectNewRecipientUids`

### `functions/src/service/tasks/eventsSyncCalendar.ts`

- Lines: `169`
- Size: `5824` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleCalendarProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/src/service/tasks/eventsSyncFromSheet.ts`

- Lines: `514`
- Size: `20668` bytes
- Internal dependencies:
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/providers/googleCalendarProvider.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleCalendarProvider`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `buildEventRowPatch`
  - `findHeaderCaseInsensitive`
  - `isApproved`
  - `normDate`
  - `shouldScrapAbsentEvent`

### `functions/src/service/tasks/gearNotifyReservationCancelledByAdmin.ts`

- Lines: `182`
- Size: `6260` bytes
- Internal dependencies:
  - `functions/src/modules/setup/app_vars.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../types`
- Functions:
  - `describeItems`
  - `displayNameOf`
  - `formatDatePL`
  - `norm`

### `functions/src/service/tasks/gearPrivateStorage.ts`

- Lines: `400`
- Size: `14668` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/setup_gear_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `firstChargeableMonth`
  - `isChargeableThisMonth`
  - `processKayakChargeForMonth`
  - `readPrivateSinceIso`
  - `readStorage`
  - `toYearMonth`
  - `tsToIsoYmd`

### `functions/src/service/tasks/gearSyncAllFromSheet.ts`

- Lines: `581`
- Size: `20883` bytes
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
  - `buildDoc`
  - `classifyGearRows`
  - `cleanCell`
  - `flush`
  - `isRealRow`
  - `norm`
  - `parseBool`
  - `parseNumber`
  - `parseSheetDate`
  - `rowNumberLabel`
  - `sflush`
  - `syncCategory`

### `functions/src/service/tasks/godzinkiArchiveSheetRows.ts`

- Lines: `102`
- Size: `3844` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
- Functions:
  - `isIsoDate`
  - `selectRowsToArchive`

### `functions/src/service/tasks/godzinkiImportTransitionFromSheet.ts`

- Lines: `228`
- Size: `8723` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
- Functions:
  - `isApproved`
  - `isIsoDate`
  - `parseHours`

### `functions/src/service/tasks/godzinkiMergeHistoricalUser.ts`

- Lines: `119`
- Size: `4138` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `norm`

### `functions/src/service/tasks/godzinkiMonthlyBalanceReview.ts`

- Lines: `179`
- Size: `7223` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/setup/app_vars.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/setup/app_vars`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `creditBoardMonthlyBonus`
  - `fmtBalance`
  - `monthKeyOf`

### `functions/src/service/tasks/godzinkiSyncFromSheet.ts`

- Lines: `510`
- Size: `17886` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/shared/text_utils.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/shared/text_utils`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `buildLedgerRowPatch`
  - `buildPendingCorrection`
  - `isApproved`
  - `isIsoDate`
  - `readUserName`
  - `tsToIsoDate`

### `functions/src/service/tasks/groupsDiagnose.ts`

- Lines: `115`
- Size: `4256` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`

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

- Lines: `274`
- Size: `10299` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
  - `functions/src/service/workspaceGroupSync.ts`
- Imports:
  - `import/require ../types`
  - `import/require ../workspaceGroupSync`
- Functions:
  - `asErr`
  - `assertString`

### `functions/src/service/tasks/reconcileOpeningBalance.ts`

- Lines: `234`
- Size: `10186` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
  - `functions/src/modules/hours/godzinki_vars.ts`
  - `functions/src/modules/hours/opening_balance_fields.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/hours/godzinki_service`
  - `import/require ../../modules/hours/godzinki_vars`
  - `import/require ../../modules/hours/opening_balance_fields`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `lower`
  - `norm`

### `functions/src/service/tasks/reconcileWorkspaceGroups.ts`

- Lines: `247`
- Size: `9192` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleWorkspaceProvider.ts`
  - `functions/src/service/types.ts`
  - `functions/src/service/workspaceGroupSync.ts`
- Imports:
  - `import/require ../providers/googleWorkspaceProvider`
  - `import/require ../types`
  - `import/require ../workspaceGroupSync`
- Functions:
  - `enforceTargetStateForUser`
  - `norm`
  - `targetListaRoleFor`
  - `targetManagedGroupsFor`

### `functions/src/service/tasks/setupSyncFromSheet.ts`

- Lines: `374`
- Size: `14542` bytes
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
  - `headerMap`
  - `norm`
  - `normalizeHeader`
  - `parseSetupValue`
  - `readAppSetupModules`
  - `readAppSetupRoles`
  - `readSetupVars`
  - `rolesAllowedFromFlags`
  - `splitList`
  - `toBool`
  - `toNumberOrNull`

### `functions/src/service/tasks/usersNotifyAkademikAccessChanged.ts`

- Lines: `71`
- Size: `2857` bytes
- Internal dependencies:
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../types`
- Functions:
  - `norm`

### `functions/src/service/tasks/usersSyncFieldsFromSheet.ts`

- Lines: `538`
- Size: `22815` bytes
- Internal dependencies:
  - `functions/src/modules/equipment/bundle/gear_bundle_service.ts`
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
- Imports:
  - `import/require ../../modules/equipment/bundle/gear_bundle_service`
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require firebase-admin`
- Functions:
  - `getPath`
  - `headerMap`
  - `mapRoleDisplayToKey`
  - `mapStatusDisplayToKey`
  - `norm`
  - `normalizeBoolish`
  - `normalizeDateString`
  - `normalizeHeader`
  - `toNumberOrNull`
  - `valuesEqual`

### `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts`

- Lines: `531`
- Size: `18882` bytes
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

- Lines: `317`
- Size: `11721` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/providers/googleWorkspaceProvider.ts`
  - `functions/src/service/service_config.ts`
  - `functions/src/service/types.ts`
  - `functions/src/service/workspaceGroupSync.ts`
- Imports:
  - `import/require ../providers/googleSheetsProvider`
  - `import/require ../providers/googleWorkspaceProvider`
  - `import/require ../service_config`
  - `import/require ../types`
  - `import/require ../workspaceGroupSync`
  - `import/require firebase-admin`
- Functions:
  - `buildInvertedLabelMap`
  - `norm`

### `functions/src/service/triggers/onEventApproved.ts`

- Lines: `58`
- Size: `2036` bytes
- Internal dependencies:
  - `functions/src/service/service_config.ts`
- Imports:
  - `import/require ../service_config`
  - `import/require firebase-admin`
  - `import/require firebase-functions/v2/firestore`
- Functions:
  - `jobIdForNotifyNew`

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

### `functions/src/service/workspaceGroupSync.ts`

- Lines: `172`
- Size: `5607` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleWorkspaceProvider.ts`
- Imports:
  - `import/require ./providers/googleWorkspaceProvider`
- Functions:
  - `listaRoleForUserRole`
  - `norm`
  - `syncAllWorkspaceGroupsForRoleChange`
  - `syncListaGroupForUser`
  - `syncWorkspaceGroupsForUser`

### `functions/test/events_core.test.ts`

- Lines: `338`
- Size: `14843` bytes
- Internal dependencies:
  - `functions/src/service/providers/googleSheetsProvider.ts`
  - `functions/src/service/tasks/eventsNotifyUpcoming.ts`
  - `functions/src/service/tasks/eventsSyncFromSheet.ts`
- Imports:
  - `import/require ../src/service/providers/googleSheetsProvider`
  - `import/require ../src/service/tasks/eventsNotifyUpcoming`
  - `import/require ../src/service/tasks/eventsSyncFromSheet`
  - `import/require vitest`

### `functions/test/faza2_core.test.ts`

- Lines: `95`
- Size: `3618` bytes
- Internal dependencies:
  - `functions/src/service/tasks/adminNotifyPendingApprovals.ts`
- Imports:
  - `import/require ../src/service/tasks/adminNotifyPendingApprovals`
  - `import/require vitest`
- Functions:
  - `baseInput`
  - `mustDigest`

### `functions/test/gear_core.test.ts`

- Lines: `157`
- Size: `6388` bytes
- Internal dependencies:
  - `functions/src/modules/calendar/calendar_utils.ts`
  - `functions/src/modules/hours/hours_quote.ts`
  - `functions/src/modules/setup/setup_gear_vars.ts`
  - `functions/src/service/tasks/gearPrivateStorage.ts`
  - `functions/src/service/tasks/gearSyncAllFromSheet.ts`
- Imports:
  - `import/require ../src/modules/calendar/calendar_utils`
  - `import/require ../src/modules/hours/hours_quote`
  - `import/require ../src/modules/setup/setup_gear_vars`
  - `import/require ../src/service/tasks/gearPrivateStorage`
  - `import/require ../src/service/tasks/gearSyncAllFromSheet`
  - `import/require vitest`
- Functions:
  - `mkRow`
  - `vars`
  - `ymd`

### `functions/test/godzinki_core.test.ts`

- Lines: `150`
- Size: `5505` bytes
- Internal dependencies:
  - `functions/src/modules/hours/godzinki_service.ts`
- Imports:
  - `import/require ../src/modules/hours/godzinki_service`
  - `import/require vitest`
- Functions:
  - `makeEarn`
  - `makePurchase`
  - `makeSpend`
  - `ts`

### `functions/test/setup_consolidation.test.ts`

- Lines: `65`
- Size: `2451` bytes
- Internal dependencies:
  - `functions/src/api/submitGodzinkiHandler.ts`
  - `functions/src/service/tasks/godzinkiArchiveSheetRows.ts`
- Imports:
  - `import/require ../src/api/submitGodzinkiHandler`
  - `import/require ../src/service/tasks/godzinkiArchiveSheetRows`
  - `import/require vitest`

### `functions/test/sync_core.test.ts`

- Lines: `126`
- Size: `4528` bytes
- Internal dependencies:
  - `functions/src/service/tasks/godzinkiSyncFromSheet.ts`
- Imports:
  - `import/require ../src/service/tasks/godzinkiSyncFromSheet`
  - `import/require vitest`
- Functions:
  - `earnData`
  - `ts`

### `functions/test/workspace_group_sync.test.ts`

- Lines: `40`
- Size: `1382` bytes
- Internal dependencies:
  - `functions/src/service/workspaceGroupSync.ts`
- Imports:
  - `import/require ../src/service/workspaceGroupSync`
  - `import/require vitest`

### `public/core/access_control.js`

- Lines: `41`
- Size: `1624` bytes
- Functions:
  - `canSeeModule`

### `public/core/api_client.js`

- Lines: `78`
- Size: `2410` bytes
- Functions:
  - `apiGetJson`
  - `apiPostJson`
  - `friendlyErrorMessage`
  - `resolveToken`
  - `setApiTokenGetter`

### `public/core/app_shell.js`

- Lines: `276`
- Size: `9108` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/modules_registry.js`
  - `import/require /core/render_shell.js`
  - `import/require /core/router.js`
  - `import/require /core/sw_update.js`
- Functions:
  - `hardResetUi`
  - `showAuthError`

### `public/core/firebase_client.js`

- Lines: `195`
- Size: `6888` bytes
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

- Lines: `176`
- Size: `5802` bytes
- Imports:
  - `import/require /core/module_stub.js`
  - `import/require /modules/admin_pending_module.js`
  - `import/require /modules/basen_module.js`
  - `import/require /modules/gear_module.js`
  - `import/require /modules/godzinki_module.js`
  - `import/require /modules/impreza_module.js`
  - `import/require /modules/klub_module.js`
  - `import/require /modules/km_module.js`
  - `import/require /modules/kurs_godzinki_module.js`
  - `import/require /modules/kurs_module.js`
  - `import/require /modules/my_reservations_module.js`
- Functions:
  - `buildModulesFromSetup`
  - `resolveModuleType`

### `public/core/render_shell.js`

- Lines: `1761`
- Size: `78248` bytes
- Imports:
  - `import/require /core/access_control.js`
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
  - `import/require /core/sw_update.js`
  - `import/require /core/text_format.js`
- Functions:
  - `bindHomeEventInterestButtons`
  - `buildHomeBasenSection`
  - `buildHomeEventsSection`
  - `buildHomeHoursCell`
  - `buildHomeKursEventsSection`
  - `buildHomeReservationsSection`
  - `buildKayakTitle`
  - `buildKlubBoxHtml`
  - `countReservationDays`
  - `escapeAttr`
  - `escapeHtml`
  - `fieldErrorToPl`
  - `fmtKmValue`
  - `formatContribDate`
  - `formatDatePL`
  - `formatEntryFeeValidUntil`
  - `formatNrb`
  - `formatShortDate`
  - `getDashboardConfig`
  - `getGearRoute`
  - `getHelloName`
  - `getHoursValue`
  - `getModuleRouteByLabelOrId`
  - `getModuleRouteByType`
  - `getReservationKayakTitles`
  - `goToGodzinki`
  - `heartSvg`
  - `isIsoDateYYYYMMDD`
  - `isPhoneValid`
  - `loadAdminPendingBadge`
  - `normalizePhoneDigits`
  - `pluralizeDays`
  - `render`
  - `renderHomeDashboard`
  - `renderHomeProfile`
  - `renderNav`
  - `renderOpeningEmailConfirm`
  - `renderProfileForm`
  - `renderView`
  - `resetBtns`
  - `roleKeyToLabel`
  - `safeUrl`
  - `set`
  - `setErr`
  - `setNicknameStatus`
  - `spinnerHtml`
  - `statusKeyToLabel`
  - `submitRegistration`
  - `tryParseJsonFromHttpError`
  - `updateBadge`
  - `wireHomeReservations`
  - `wireKlubBox`
  - `wireNotificationPrefs`

### `public/core/router.js`

- Lines: `13`
- Size: `387` bytes
- Functions:
  - `parseHash`
  - `setHash`

### `public/core/sw_update.js`

- Lines: `37`
- Size: `1307` bytes
- Functions:
  - `hardReloadApp`
  - `isSwUpdatePending`
  - `setSwUpdatePending`

### `public/core/text_format.js`

- Lines: `53`
- Size: `2029` bytes
- Functions:
  - `escapeHtml`
  - `formatFreeText`
  - `normalizeBlankLines`
  - `stripTrailingPunct`

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

- Lines: `162`
- Size: `5088` bytes
- Functions:
  - `joinPrefix`
  - `mapUserFacingApiError`
  - `parseApiErrorMessage`

### `public/modules/admin_pending_module.js`

- Lines: `517`
- Size: `28492` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
  - `import/require /core/user_error_messages.js`
  - `import/require /modules/raporty/reports_panel.js`
- Functions:
  - `createAdminPendingModule`
  - `escapeHtml`
  - `formatDatePL`
  - `load`
  - `renderContent`
  - `setErr`

### `public/modules/basen_module.js`

- Lines: `902`
- Size: `36796` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `bindAdminActions`
  - `bindAttendeesDetails`
  - `bindSessionActions`
  - `createBasenModule`
  - `esc`
  - `formatDate`
  - `karnetStatusLabel`
  - `kayakLabel`
  - `refreshSessionsView`
  - `renderAdminView`
  - `renderAttendeesBody`
  - `renderKarnetView`
  - `renderSessionCard`
  - `renderSessionsView`
  - `renderSlotCard`
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

- Lines: `2335`
- Size: `99156` bytes
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
  - `loadPhotoWithOverlay`
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

- Lines: `443`
- Size: `17812` bytes
- Imports:
  - `import/require /core/api_client.js`
- Functions:
  - `createGodzinkiModule`
  - `esc`
  - `formatBalanceSign`
  - `formatDate`
  - `infoBarHtml`
  - `purchaseSectionHtml`
  - `recordTypeClass`
  - `renderGodzinkiView`
  - `renderHistoryView`
  - `renderPage`
  - `renderRecordTable`
  - `renderSubmitView`
  - `setErr`
  - `setOk`
  - `shortenReason`
  - `spinnerHtml`
  - `todayIso`
  - `wirePurchaseForm`

### `public/modules/impreza_module.js`

- Lines: `336`
- Size: `12660` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/text_format.js`
- Functions:
  - `bindInterestButtons`
  - `bindSubmitForm`
  - `createImprezaModule`
  - `esc`
  - `formatDate`
  - `getVal`
  - `heartSvg`
  - `renderEventCard`
  - `renderListView`
  - `renderSubmitFormHtml`
  - `renderTabsHtml`
  - `setErr`
  - `setOk`
  - `spinnerHtml`
  - `todayIso`

### `public/modules/klub_module.js`

- Lines: `77`
- Size: `3365` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/router.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `createKlubModule`
  - `escapeHtml`
  - `renderKluczeTable`
  - `renderKluczeView`

### `public/modules/km_module.js`

- Lines: `1502`
- Size: `59427` bytes
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

- Lines: `607`
- Size: `23380` bytes
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
  - `formatShortDate`
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

### `public/modules/raporty/gear_rentals.js`

- Lines: `281`
- Size: `12608` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `escapeAttr`
  - `escapeHtml`
  - `formatDatePL`
  - `loadReport`
  - `rebuildUserList`
  - `renderReport`
  - `selectedCats`
  - `setActionMsg`
  - `userMatches`

### `public/modules/raporty/member_activity.js`

- Lines: `90`
- Size: `3908` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `escapeHtml`
  - `load`
  - `renderRows`

### `public/modules/raporty/member_dues.js`

- Lines: `102`
- Size: `4288` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `escapeHtml`
  - `formatContribDate`
  - `load`
  - `passesView`
  - `renderTable`

### `public/modules/raporty/registry.js`

- Lines: `16`
- Size: `539` bytes
- Internal dependencies:
  - `public/modules/raporty/gear_rentals.js`
  - `public/modules/raporty/member_activity.js`
  - `public/modules/raporty/member_dues.js`
  - `public/modules/raporty/top_rentals.js`
  - `public/modules/raporty/user_activity.js`
- Imports:
  - `import/require ./gear_rentals.js`
  - `import/require ./member_activity.js`
  - `import/require ./member_dues.js`
  - `import/require ./top_rentals.js`
  - `import/require ./user_activity.js`

### `public/modules/raporty/reports_panel.js`

- Lines: `117`
- Size: `5052` bytes
- Internal dependencies:
  - `public/modules/raporty/registry.js`
- Imports:
  - `import/require ./registry.js`
- Functions:
  - `applySearch`
  - `catOrder`
  - `cleanup`
  - `escapeAttr`
  - `escapeHtml`
  - `openReport`
  - `renderLauncher`
  - `renderReportsPanel`

### `public/modules/raporty/top_rentals.js`

- Lines: `138`
- Size: `6294` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `escapeHtml`
  - `load`
  - `renderRows`
  - `selectedCats`

### `public/modules/raporty/user_activity.js`

- Lines: `136`
- Size: `7852` bytes
- Imports:
  - `import/require /core/api_client.js`
  - `import/require /core/user_error_messages.js`
- Functions:
  - `esc`
  - `formatBalanceSign`
  - `formatDate`
  - `infoBarHtml`
  - `load`
  - `recordTypeClass`
  - `render`
  - `renderRecordTable`
  - `shortenReason`

### `public/sw.js`

- Lines: `157`
- Size: `5447` bytes

### `scripts/bump-sw-cache.js`

- Lines: `26`
- Size: `799` bytes
- Imports:
  - `import/require fs`
  - `import/require path`

## Config files

### `.claude/settings.local.json`

- Lines: `75`
- Size: `14522` bytes
- Detected top-level keys / sections:
  - `permissions`

### `.claude_context/context_dependencies.json`

- Lines: `None`
- Size: `1751019` bytes
- Notes:
  - File is larger than 1500000 bytes or cannot be read.

### `.claude_context/context_files.json`

- Lines: `None`
- Size: `7708118` bytes
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

### `appscript/1_App_SETUP/appsscript.json`

- Lines: `13`
- Size: `370` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `appscript/2_Członkowie Godzinki Imprezy/appsscript.json`

- Lines: `14`
- Size: `432` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `appscript/3_Sprzęt/appsscript.json`

- Lines: `13`
- Size: `382` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `appscript/5_kilometrówka_archiwum 2025/.clasp.json`

- Lines: `5`
- Size: `96` bytes
- Detected top-level keys / sections:
  - `rootDir`
  - `scriptId`

### `appscript/5_kilometrówka_archiwum 2025/appsscript.json`

- Lines: `12`
- Size: `359` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `appscript/kurs/appsscript.json`

- Lines: `12`
- Size: `359` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `exceptionLogging`
  - `oauthScopes`
  - `runtimeVersion`
  - `timeZone`

### `firebase.json`

- Lines: `492`
- Size: `12250` bytes
- Detected top-level keys / sections:
  - `emulators`
  - `firestore`
  - `functions`
  - `hosting`

### `firestore.indexes.json`

- Lines: `153`
- Size: `4417` bytes
- Detected top-level keys / sections:
  - `fieldOverrides`
  - `indexes`

### `functions/package-lock.json`

- Lines: `11556`
- Size: `412121` bytes
- Detected top-level keys / sections:
  - `lockfileVersion`
  - `name`
  - `packages`
  - `requires`

### `functions/package.json`

- Lines: `36`
- Size: `982` bytes
- Detected top-level keys / sections:
  - `dependencies`
  - `devDependencies`
  - `engines`
  - `main`
  - `name`
  - `private`
  - `scripts`

### `functions/tsconfig.dev.json`

- Lines: `7`
- Size: `54` bytes
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
- Size: `558` bytes
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

- Lines: `2442`
- Size: `40740` bytes
- Headings:
  - `# Backend Context`
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
  - `## `functions/src/service/tasks/kursSyncFromSheet.ts``
  - `## `functions/src/service/tasks/listaEnforcePostingPolicy.ts``
  - `## `functions/src/service/tasks/membersSyncToSheet.ts``
  - `## `functions/src/service/tasks/onUserRegisteredWelcome.ts``
  - `## `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts``
  - `## `functions/src/service/tasks/usersSyncRolesFromSheet.ts``
  - `## `functions/src/service/triggers/onUsersActiveCreated.ts``
  - `## `functions/src/service/types.ts``
  - `## `functions/src/service/worker/fallbackDailyWorker.ts``

### `.claude_context/context_config.md`

- Lines: `None`
- Size: `3326716` bytes
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

- Lines: `17709`
- Size: `1200081` bytes
- Headings:
  - `# Keyword Index`
  - `## admin`
  - `## auth`
  - `## basen`
  - `## batch`
  - `## calendar`
  - `## cors`
  - `## discord`
  - `## email`
  - `## events`
  - `## firestore`
  - `## gear`
  - `## godzinki`
  - `## groups`
  - `## index`
  - `## job`
  - `## kayak`
  - `## km`
  - `## map`
  - `## member`
  - `## ranking`
  - `## reservation`
  - `## role`
  - `## setup`
  - `## status`
  - `## storage`
  - `## sync`
  - `## task`
  - `## transaction`

### `.claude_context/context_routes.md`

- Lines: `413`
- Size: `12440` bytes
- Headings:
  - `# Routes and Firebase Functions`
  - `## Firebase hosting rewrites`
  - `## Files with route/function hints`
  - `### `ai_full_audit_report.json``
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

- Lines: `7021`
- Size: `128232` bytes
- Headings:
  - `# Tests Context`
  - `## `functions/node_modules/@babel/helpers/lib/helpers/classCheckPrivateStaticAccess.js``
  - `## `functions/node_modules/@babel/helpers/lib/helpers/classCheckPrivateStaticFieldDescriptor.js``
  - `## `functions/node_modules/@bcoe/v8-coverage/src/test/merge.spec.ts``
  - `## `functions/node_modules/@eslint/eslintrc/lib/config-array/override-tester.js``
  - `## `functions/node_modules/@firebase/component/dist/esm/test/setup.d.ts``
  - `## `functions/node_modules/@firebase/component/dist/esm/test/util.d.ts``
  - `## `functions/node_modules/@firebase/component/dist/test/setup.d.ts``
  - `## `functions/node_modules/@firebase/component/dist/test/util.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/browser/crawler_support.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/database.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/datasnapshot.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/helpers/events.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/helpers/util.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/info.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/order.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/order_by.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/promise.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/query.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/servervalues.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/database-compat/test/transaction.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/browser/crawler_support.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/database.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/datasnapshot.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/helpers/events.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/helpers/util.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/info.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/order.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/order_by.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/promise.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/query.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/servervalues.test.d.ts``
  - `## `functions/node_modules/@firebase/database-compat/dist/node-esm/database-compat/test/transaction.test.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/node-esm/src/api/test_access.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/node-esm/test/helpers/EventAccumulator.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/node-esm/test/helpers/syncpoint-util.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/node-esm/test/helpers/util.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/src/api/test_access.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/test/helpers/EventAccumulator.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/test/helpers/syncpoint-util.d.ts``
  - `## `functions/node_modules/@firebase/database/dist/test/helpers/util.d.ts``
  - `## `functions/node_modules/@firebase/logger/dist/esm/test/custom-logger.test.d.ts``
  - `## `functions/node_modules/@firebase/logger/dist/esm/test/logger.test.d.ts``
  - `## `functions/node_modules/@firebase/logger/dist/test/custom-logger.test.d.ts``
  - `## `functions/node_modules/@firebase/logger/dist/test/logger.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/base64.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/compat.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/deepCopy.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/defaults.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/emulator.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/environments.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/errors.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/exponential_backoff.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/object.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/node-esm/test/subscribe.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/base64.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/compat.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/deepCopy.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/defaults.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/emulator.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/environments.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/errors.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/exponential_backoff.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/object.test.d.ts``
  - `## `functions/node_modules/@firebase/util/dist/test/subscribe.test.d.ts``
  - `## `functions/node_modules/@jest/pattern/src/TestPathPatterns.ts``
  - `## `functions/node_modules/@jest/pattern/src/__tests__/TestPathPatterns.test.ts``
  - `## `functions/node_modules/@jest/snapshot-utils/src/__tests__/utils.test.ts``
  - `## `functions/node_modules/@jest/test-result/build/index.d.ts``
  - `## `functions/node_modules/@jest/test-result/build/index.js``
  - `## `functions/node_modules/@jest/test-result/package.json``
  - `## `functions/node_modules/@jest/test-sequencer/build/index.d.ts``
  - `## `functions/node_modules/@jest/test-sequencer/build/index.js``
  - `## `functions/node_modules/@jest/test-sequencer/package.json``
  - `## `functions/node_modules/@protobufjs/aspromise/tests/index.js``
  - `## `functions/node_modules/@protobufjs/base64/tests/index.js``
  - `## `functions/node_modules/@protobufjs/codegen/tests/index.js``
  - `## `functions/node_modules/@protobufjs/eventemitter/tests/index.js``
  - `## `functions/node_modules/@protobufjs/fetch/tests/index.js``
  - `## `functions/node_modules/@protobufjs/float/tests/index.js``
  - `## `functions/node_modules/@protobufjs/inquire/tests/data/array.js``
  - `## `functions/node_modules/@protobufjs/inquire/tests/data/emptyArray.js``
  - `## `functions/node_modules/@protobufjs/inquire/tests/data/emptyObject.js``
  - `## `functions/node_modules/@protobufjs/inquire/tests/data/object.js``
  - `## `functions/node_modules/@protobufjs/inquire/tests/index.js``
  - `## `functions/node_modules/@protobufjs/path/tests/index.js``
  - `## `functions/node_modules/@protobufjs/pool/tests/index.js``
  - `## `functions/node_modules/@protobufjs/utf8/tests/index.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/called-in-order.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/class-name.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/deprecated.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/every.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/function-name.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/global.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/index.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/order-by-first-call.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/prototypes/copy-prototype-methods.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/prototypes/index.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/type-of.test.js``
  - `## `functions/node_modules/@sinonjs/commons/lib/value-to-string.test.js``

### `.claude_context/README.md`

- Lines: `1372`
- Size: `112917` bytes
- Headings:
  - `# Claude Code Context`
  - `## Mandatory operating rules`
  - `## Context files`
  - `## Recommended route`
  - `## Project summary`
  - `## Large files warning`

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

### `DOCS/Clode Design/audyt-ux-skk-morzkulc.md`

- Lines: `199`
- Size: `16485` bytes
- Headings:
  - `# Analiza produktu i UX — SKK Morzkulc`
  - `## 01 — Czym jest produkt`
  - `## 02 — Inwentarz ekranów`
  - `### A. Wejście i konto`
  - `### B. Start (dashboard)`
  - `### C. Sprzęt + rezerwacje`
  - `### D. Godzinki, imprezy, basen, ranking, kurs, klub`
  - `### E. Panel Zarządu`
  - `## 03 — Rekonstrukcja nawigacji`
  - `### Trzy równoległe warstwy wejścia`
  - `### Co decyduje o widoczności`
  - `## 04 — Główne user flows`
  - `## 05 — Ergonomia mobile`
  - `### Działa dobrze`
  - `### Boli w kciuku`
  - `## 06 — Problemy UX i ich waga`
  - `### P0`
  - `### P1`
  - `### P2`
  - `## 07 — Czego nie mogłem ocenić z kodu`

### `DOCS/Clode Design/plan-naprawy-skk-morzkulc.md`

- Lines: `294`
- Size: `17583` bytes
- Headings:
  - `# Plan naprawy — SKK Morzkulc`
  - `## A — Zaufanie do danych i sync z arkuszami`
  - `## B — Rezerwacja sprzętu: koszt i pewność`
  - `## C — Wejście: logowanie, rejestracja, nadanie roli`
  - `## D — Nawigacja i orientacja`
  - `## E — Ergonomia mobile`
  - `## F — Komunikaty, błędy, stany ładowania`
  - `## G — Profil i godzinki`
  - `## H — Szukanie i filtrowanie sprzętu`
  - `## I — Akcje destrukcyjne i odwracalność`
  - `## J — Panel Zarządu i raporty`
  - `## K — Stany puste, wyłączone i rolowe`
  - `## L — Język i spójność`
  - `## M — Sesja, PWA, aktualizacje`
  - `## Do rozstrzygnięcia przez Was, zanim cokolwiek ruszy`

### `DOCS/Sessions & TO DOs/10.06_session_summary.md`

- Lines: `142`
- Size: `9348` bytes
- Headings:
  - `# Podsumowanie sesji — 10.06.2026`
  - `## 1. Problem zgłoszony`
  - `## 2. Diagnoza — przyczyna (potwierdzona danymi)`
  - `## 3. Jak działa rekonsyliator członkostwa grup (ważne dla decyzji)`
  - `## 4. Plan docelowy (automatyczny — sterowany rolą z arkusza)`
  - `## 5. Wykonane kroki`
  - `### Krok A (ZROBIONE ręcznie w Admin Console) ✅`
  - `### Krok B (ZROBIONE) ✅`
  - `## 6. Zmiany w kodzie (NIEzacommitowane)`
  - `## 7. Uruchamianie skryptów diagnostycznych (Windows — gotchas)`
  - `## 8. Drugie zagadnienie: niezgodność `users_active` (23) vs arkusz (19)`
  - `## 9. Otwarte / następne kroki`

### `DOCS/Sessions & TO DOs/10.07_audyt_kursant_błąd.md`

- Lines: `142`
- Size: `8898` bytes
- Headings:
  - `# Kursant nie może zarezerwować sprzętu — audyt błędu (10.07.2026)`
  - `## 1. Najważniejsze ustalenie: fix kursanta z 28.06 JEST wdrożony na prod`
  - `## 2. Jak działa bramka rezerwacji kursanta (kod wdrożony = lokalny)`
  - `### 2.1 Frontend`
  - `### 2.2 `GET /api/setup` (`functions/src/index.ts:407-426`)`
  - `### 2.3 Backend rezerwacji`
  - `## 3. ZNALEZIONY BUG: niespójne parsowanie `rokSzkoleniowki``
  - `## 4. Kandydaci na przyczynę (do rozstrzygnięcia danymi z prod)`
  - `## 5. Blokada diagnostyki: wygasłe ADC`
  - `## 6. Proponowana naprawa (zależnie od wyniku diagnozy)`
  - `### A — format roku (bug §3; warto naprawić NIEZALEŻNIE od wyniku)`
  - `### B — flaga`
  - `### C — dane uczestniczki`
  - `### D — rola/status`
  - `### E — stary backend`
  - `## 7. Weryfikacja po naprawie`
  - `## 8. Pliki potencjalnie do zmiany`

### `DOCS/Sessions & TO DOs/11.08_blachy_i_brakujące_pola_TO_DO.md`

- Lines: `95`
- Size: `7073` bytes
- Headings:
  - `# Audyt: pola z bilansu otwarcia gubione między Firestore a arkuszem „aktywni użytkownicy"`
  - `## Context`
  - `## Ustalenie 1 — blacha: potwierdzone, i to jest gorsze niż „nieprzeniesione" (realne kasowanie danych)`
  - `## Ustalenie 2 — inne pola z bilansu otwarcia: ten sam problem, dwa warianty`
  - `## Ustalenie 3 — aplikacja (profil użytkownika): zero wystąpień`
  - `## Pliki kluczowe (do przyszłej naprawy)`
  - `## Otwarte pytania (do decyzji przed naprawą)`

### `DOCS/Sessions & TO DOs/12.06_godzinki_audyt.md`

- Lines: `241`
- Size: `18997` bytes
- Headings:
  - `# Audyt systemu godzinek i opłat za sprzęt — stan wdrożenia`
  - `## 1. Architektura — przegląd`
  - `## 2. Model danych — `godzinki_ledger``
  - `## 3. Przepływ: zgłoszenie → arkusz → zatwierdzenie`
  - `### 3.1 Zgłoszenie (użytkownik, aplikacja)`
  - `### 3.2 Zapis do arkusza (automatyczny)`
  - `### 3.3 Zatwierdzenie (admin, arkusz)`
  - `### 3.4 Wykup salda ujemnego`
  - `### 3.5 Odczyt (frontend)`
  - `## 4. Opłaty za wypożyczanie sprzętu (godzinki)`
  - `### 4.1 Wycena (`hours_quote.ts`)`
  - `### 4.2 Pobranie przy rezerwacji`
  - `### 4.3 Zmiana dat rezerwacji`
  - `### 4.4 Anulowanie i zwrot`
  - `## 5. Opłata za prywatny kajak w klubie`
  - `## 6. Pokrycie testami (stan obecny)`
  - `## 7. Zidentyfikowane luki i ryzyka`
  - `## 8. Konfiguracja — defaulty z kodu vs. do weryfikacji na prod`
  - `## 9. Pytania otwarte (decyzje biznesowe)`
  - `## 10. Rekomendowane następne kroki`

### `DOCS/Sessions & TO DOs/12.06_godzinki_podsumowanie.md`

- Lines: `194`
- Size: `19067` bytes
- Headings:
  - `# Podsumowanie sesji 12.06.2026 — audyt i naprawa systemu godzinek`
  - `## CZĘŚĆ 1 — Audyt (faza analityczna)`
  - `## CZĘŚĆ 2 — Naprawy L1–L7 (saldo, transakcje, opłaty)`
  - `### L1 — Podwójny zwrot overdraftu przy anulowaniu (KRYTYCZNY)`
  - `### L2 — Wykup salda ujemnego bez rewalidacji`
  - `### L3 — "Pranie" wygasających godzinek przez skrócenie rezerwacji`
  - `### L4 + L5 — Double-booking i okna awarii (naprawione razem, bo to jeden mechanizm)`
  - `### L6 — Kwoty ułamkowe`
  - `### L7 — Opłata magazynowa: przepadające naliczenia i paradoks limitu`
  - `## CZĘŚĆ 3 — Naprawy P1–P4 (przepływ arkuszowy)`
  - `### P1 — Arkusz jako realne narzędzie admina`
  - `### P2 — Samonaprawa po martwych jobach zapisu do arkusza`
  - `### P3 — Automatyczny sync zatwierdzeń`
  - `### P4 — Duplikaty i braki ID`
  - `## CZĘŚĆ 4 — Naprawy D1–D4 (duplikacje)`
  - `### D1 — Testy wykonujące kod produkcyjny zamiast luster`
  - `### D2 — Jedna implementacja tworzenia rezerwacji`
  - `### D3 — Martwy kod w AppScript`
  - `### D4 — Drobne duplikacje`
  - `## CZĘŚĆ 5 — Naprawy L8–L11`
  - `### L8 — UI wykupu salda ujemnego`
  - `### L9 — Anulowanie przez zawieszonych: decyzja utrwalona`
  - `### L10 — Martwe pule po zatwierdzeniu starych zgłoszeń`
  - `### L11 — Granica dnia w strefie klubu`
  - `## CZĘŚĆ 6 — Testy (stan końcowy)`
  - `## CZĘŚĆ 7 — Zmiany zachowania wymagające akceptacji biznesowej`
  - `## CZĘŚĆ 8 — Czynności przy wdrożeniu`

### `DOCS/Sessions & TO DOs/12.06_godzinki_potencjalne_problemy.md`

- Lines: `264`
- Size: `23751` bytes
- Headings:
  - `# Godzinki i opłaty za sprzęt — braki logiczne, źródła problemów, powielenia kodu`
  - `## A. Błędy i braki logiczne`
  - `### L1. KRYTYCZNY — Podwójny zwrot overdraftu przy anulowaniu rezerwacji`
  - `### L2. WYSOKI — Wykup salda ujemnego: brak rewalidacji przy zatwierdzeniu i brak blokady wielu pending`
  - `### L3. WYSOKI — Odświeżanie ważności godzinek przy skróceniu rezerwacji ("pranie" wygasających pul)`
  - `### L4. WYSOKI — Race condition przy równoległych rezerwacjach (double-booking)`
  - `### L5. ŚREDNI — Nieatomowość rezerwacja ↔ dedukcja godzinek (okna awarii)`
  - `### L6. ŚREDNI — Brak walidacji całkowitości kwoty godzinek (ułamki i dryf zmiennoprzecinkowy)`
  - `### L7. WYSOKI — Opłata magazynowa: nieudane naliczenie przepada bez śladu dla admina`
  - `### L8. ŚREDNI — Sympatyk/kursant jako właściciel prywatnego kajaka: dług strukturalnie niespłacalny`
  - `### L9. ŚREDNI — Niespójność uprawnień: anulowanie rezerwacji nie sprawdza zawieszenia konta`
  - `### L10. NISKI — Zatwierdzenie starego zgłoszenia tworzy "martwą" pulę bez ostrzeżenia`
  - `### L11. NISKI — Granica dnia w UTC (zgłoszenia po północy czasu polskiego)`
  - `## B. Powielenia kodu (ryzyko rozjazdu logiki)`
  - `### D1. KRYTYCZNY w skutkach — Formuła bilansu zaimplementowana niezależnie 4 razy`
  - `### D2. WYSOKI — Zdublowany pełny przepływ rezerwacji: kajaki (legacy) vs bundle`
  - `### D3. ŚREDNI — Martwy duplikat syncu w AppScript o INNEJ semantyce`
  - `### D4. NISKI — Drobne duplikacje`
  - `## C. Źródła problemów w przepływie danych (arkusz ↔ Firestore)`
  - `### P1. WYSOKI — Arkusz wygląda na narzędzie korekt, ale nim nie jest`
  - `### P2. ŚREDNI — Zgłoszenie może nigdy nie dotrzeć do arkusza (fire-and-forget bez monitoringu)`
  - `### P3. ŚREDNI — Brak automatycznego syncu zatwierdzeń + koszt ręcznego`
  - `### P4. NISKI — Identyfikacja wierszy wyłącznie po kolumnie `ID``
  - `## D. Luki w pokryciu testowym (zweryfikowane)`
  - `## E. Podsumowanie priorytetów`
  - `## F. Status naprawy (12.06.2026)`

### `DOCS/Sessions & TO DOs/12.06_imprezy_audyt.md`

- Lines: `153`
- Size: `19775` bytes
- Headings:
  - `# Audyt mechanizmu dodawania i zatwierdzania imprez — stan wdrożenia`
  - `## 1. Mapa przepływu — komponenty`
  - `## 2. Przepływ etapami — oczekiwany vs faktyczny`
  - `### E1. Użytkownik dodaje imprezę w aplikacji — ✅ DZIAŁA`
  - `### E2. Impreza pojawia się w arkuszu do zatwierdzenia — ⚠️ KRUCHE`
  - `### E3. Informacja o oczekujących w panelu zarządu — ⚠️ CZĘŚCIOWO`
  - `### E4. Zarząd modyfikuje wpisy w arkuszu przed zatwierdzeniem — ✅ logika działa, ❌ dociera tylko przy ręcznym syncu`
  - `### E5. Sync do bazy — ❌ NAJWIĘKSZA DZIURA: BRAK AUTOMATYZACJI`
  - `### E6. Wyświetlanie w aplikacji — ✅ działa, pod warunkiem indeksów`
  - `### E7 (bonus). Google Calendar — ⚠️ jednokierunkowy, bez sprzątania`
  - `## 3. Tabela ryzyk`
  - `## 4. Pokrycie testowe`
  - `## 5. Do weryfikacji na żywym środowisku (read-only)`
  - `## 5a. Status naprawy (12.06.2026) — I1–I3 + zgłoszony bug`
  - `## 6. Rekomendacje napraw (wsad pod plan naprawczy)`

### `DOCS/Sessions & TO DOs/12.06_imprezy_podsumowanie_wdrożenia.md`

- Lines: `128`
- Size: `11250` bytes
- Headings:
  - `# Podsumowanie wdrożenia — mechanizm imprez (audyt + naprawy)`
  - `## 1. Audyt — co ustalono (skrót)`
  - `## 2. Zgłoszony bug: "dodanie imprezy w aplikacji nie dodaje jej do arkusza"`
  - `## 3. Naprawy (wszystkie wdrożone na prod 12.06)`
  - `### 3.1. Bug "wiersze poniżej tabeli" — `findFirstEmptySlotIndex``
  - `### 3.2. I1 — automatyczny sync arkusz→Firestore`
  - `### 3.3. I2 — indeksy Firestore w repozytorium`
  - `### 3.4. I3 — retry nie cofa decyzji admina`
  - `### 3.5. I4 — backfill (samonaprawa brakujących wierszy)`
  - `### 3.6. I5 — imprezy dodane ręcznie w arkuszu widoczne w panelu`
  - `### 3.7. I7 — potwierdzenie syncu w arkuszu (zgłoszone przez użytkownika po pierwszej turze)`
  - `## 4. Testy`
  - `## 5. Po wdrożeniu — weryfikacja na prod (checklist)`
  - `## 6. Pozycje audytu imprez nadal otwarte`

### `DOCS/Sessions & TO DOs/12.06_panel_zarzadu_audyt.md`

- Lines: `106`
- Size: `9630` bytes
- Headings:
  - `# Audyt panelu zarządu — powiadomienia o oczekujących zatwierdzeniach`
  - `## 1. Pipeline powiadomień panelu (stan obecny)`
  - `## 2. Dlaczego powiadomienia NIE znikają — dowody z prod (stan 12.06)`
  - `### 2a. Rekordy-widma godzinek (2 szt.) — NIE DA SIĘ ich zatwierdzić`
  - `### 2b. Imprezy-widma (3 szt.) — wiersze ZNIKNĘŁY z arkusza`
  - `### 2c. Pozostałe 3 godzinki — panel działa POPRAWNIE`
  - `### 2d. Znalezisko krytyczne przy okazji: nagłówki zakładki `imprezy` ≠ kod`
  - `## 3. Wykonalność: e-mail na zarzad@morzkulc.pl przy zaległościach >3 dni — TAK, niski koszt`
  - `## 4. Wykonalność: zatwierdzanie z aplikacji + odzwierciedlenie w arkuszu — TAK, średni koszt`
  - `## 5. Rekomendowane działania natychmiastowe (porządkowe, przed implementacją 3/4)`
  - `## 6. Diagnostyka użyta w audycie (do ponownego użycia)`

### `DOCS/Sessions & TO DOs/12.06_panel_zarzadu_problemy_i_plan_wdrozenia.md`

- Lines: `134`
- Size: `16423` bytes
- Headings:
  - `# Panel zarządu + spójność kod↔arkusze — pełny rejestr problemów i plan wdrożenia`
  - `## CZĘŚĆ A — Rejestr problemów i nieścisłości (Z1–Z17)`
  - `### A1. Rozjazdy kod ↔ arkusz (zakładka `imprezy`)`
  - `### A2. Rozjazdy kod ↔ arkusz (zakładka `godzinki`)`
  - `### A3. Dane-widma (powód "powiadomienia nie znikają")`
  - `### A4. Logika panelu i syncu`
  - `### A5. Brakujące funkcje (zamówione)`
  - `## CZĘŚĆ B — Plan wdrożenia`
  - `### FAZA 0 — Porządki arkusza i danych (operacyjne, z udziałem zarządu; bez deployu)`
  - `### FAZA 1 — Hardening syncu i panelu (kod)`
  - `### FAZA 2 — Nowe funkcje (Z17)`
  - `### FAZA 3 — Testy i wdrożenie`
  - `### Decyzje wymagane od zarządu/użytkownika przed startem`
  - `### Status wykonania (12.06 wieczorem)`
  - `### Szacunek zakresu`

### `DOCS/Sessions & TO DOs/12.06_podsumowanie_sesji_zarzad.md`

- Lines: `99`
- Size: `9473` bytes
- Headings:
  - `## 1. Audyt — co ustalono (z dowodami z danych produkcyjnych)`
  - `### 1a. Pipeline powiadomień`
  - `### 1b. Dlaczego "po zatwierdzeniu powiadomienia nie znikają" — 3 realne przyczyny`
  - `### 1c. Rozjazdy kod↔arkusz (inwentaryzacja nagłówków WSZYSTKICH zakładek)`
  - `### 1d. Wykonalność funkcji zamówionych (projekty w audycie, realizacja = faza 2)`
  - `## 2. FAZA 0 — porządki danych i arkusza (WYKONANA NA PROD)`
  - `## 3. FAZA 1 — hardening kodu (WYKONANA, CZEKA NA `firebase deploy`)`
  - `## 4. Następne kroki`
  - `## 5. Pozycje rejestru Z1–Z17 — stan po sesji`

### `DOCS/Sessions & TO DOs/13.06_podsumowanie_wdrożenia_sesji_zarząd.md`

- Lines: `118`
- Size: `8833` bytes
- Headings:
  - `# Podsumowanie wdrożenia — sesja zarządu (Faza 1 + Faza 2)`
  - `## 1. Stan ogólny`
  - `## 2. Co zostało wdrożone (Faza 2 — pliki)`
  - `## 3. Weryfikacja po wdrożeniu (probing przez prod Hosting)`
  - `## 4. 🔴 BLOKER — invoker dla nowych funkcji (do naprawy)`
  - `## 5. Pozostało do zrobienia`
  - `### 5a. Po naprawie IAM — checklist weryfikacji (FAZA 3.3)`
  - `### 5b. Decyzje operacyjne zarządu`
  - `### 5c. FAZA 3 — testy i raport (uruchamia użytkownik)`
  - `## 6. Stan rejestru Z1–Z17 po wdrożeniu`
  - `## 7. Środowisko sesji (na przyszłość)`

### `DOCS/Sessions & TO DOs/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD`

- Lines: `183`
- Size: `20232` bytes
- Headings:
  - `# Naprawa: rozjazd ról w lista@morzkulc.pl (i innych grupach Workspace) + zapobieganie na przyszłość`
  - `## 0. Wynik wdrożenia (13.08.2026)`
  - `## Context`
  - `## 1. Diagnoza (w pełni potwierdzona)`
  - `### 1.1 Mechanizm — trzy niezależne miejsca zmieniają `role_key`, tylko dwa synchronizują grupy, i to niepełnie`
  - `### 1.2 Żywe dowody (Directory API + Firestore, sprawdzone bezpośrednio)`
  - `### 1.3 sprzetowiec@morzkulc.pl — osobny wątek, w większości rozstrzygnięty`
  - `## 2. Naprawa`
  - `### 2.1 Wspólny moduł synchronizacji grup`
  - `### 2.2 `registerUserHandler.ts` — natychmiastowa reakcja na zmianę roli`
  - `### 2.3 Ścieżka (a) — refaktor bez zmiany zachowania`
  - `### 2.4 Nowy task `users.reconcileWorkspaceGroups` — rekoncyliacja okresowa (główny mechanizm zamykający lukę na stałe)`
  - `### 2.5 Skrypt jednorazowy do uruchomienia naprawy produkcyjnej`
  - `## 3. Zestawienie plików`
  - `## 4. Weryfikacja end-to-end`
  - `## 5. Powiadomienie e-mail dla osób, które ODZYSKAŁY możliwość pisania na listę`
  - `## 6. Pamięć projektu`
  - `## 7. Wdrożenie na produkcję`

### `DOCS/Sessions & TO DOs/15.06_audyt_invoker_funkcje.md`

- Lines: `64`
- Size: `5025` bytes
- Headings:
  - `# Audyt IAM invoker funkcji (public vs require-auth) — wyjaśnienie i klasyfikacja`
  - `## ⭐ DWIE RÓŻNE „AUTORYZACJE" — sedno`
  - `## Dlaczego „Require authentication" psuje funkcje w aplikacji`
  - `## Stan rzeczywisty = konsola Cloud Run (mix), NIE „wszystko prywatne"`
  - `## Klasyfikacja docelowa (co z czym)`
  - `## Rekomendacje`
  - `## Sprostowanie do narzędzi`

### `DOCS/Sessions & TO DOs/15.06_zarząd_TO_DO.md`

- Lines: `56`
- Size: `4565` bytes
- Headings:
  - `# Panel zarządu — TO DO (stan na 15.06.2026)`
  - `## Stan potwierdzony (15.06) — co JUŻ jest live na prod`
  - `## TO DO`
  - `### 1. Higiena repo — ✅ ZROBIONE (15.06)`
  - `### 2. FAZA 3 — weryfikacja manualna (checklist z 13.06-doc §5a)`
  - `### 3. FAZA 3 — testy automatyczne (uruchamia użytkownik)`
  - `### 4. Decyzje operacyjne zarządu`
  - `### 5. Raport końcowy`
  - `## Notatki techniczne (środowisko, na przyszłość)`

### `DOCS/Sessions & TO DOs/16.06.bilans_otwarcia_plan.md`

- Lines: `177`
- Size: `20178` bytes
- Headings:
  - `# Bilans otwarcia + import danych przejściowych do Firestore`
  - `## Stan implementacji (16.06) — KOD GOTOWY, NIE WDROŻONY`
  - `## Context`
  - `## Nagłówki zakładki `bilans_otwarcia_26` (POTWIERDZONE)`
  - `## Zakładka tegorocznych godzinek (POTWIERDZONE)`
  - `## Workstream A — Apps Script: import bilansu → `users_opening_balance_26``
  - `## Workstream B — Functions: wzbogacenie rejestracji (bilans → users_active) + data wygaśnięcia`
  - `## Workstream C — Functions: import przejściowy godzinek (`hist_{email}` w godzinki_ledger + scalenie km-style)`
  - `### C1 — Task importu `godzinki.importTransitionFromSheet` (nowy, w Functions)`
  - `### C2 — Bieżące korekty (okres przejściowy do końca IX 2026) — ZREALIZOWANE w tasku importu`
  - `### C3 — Scalenie przy rejestracji: task `godzinki.mergeHistoricalUser` (nowy, klon `kmMergeHistoricalUser.ts`)`
  - `### C4 — Drobne rozszerzenie `godzinki_service.ts``
  - `## Workstream D — Apps Script: jednorazowe zasilenie kolumn arkusza członków`
  - `## Workstream E — Functions: reconciliation już-zarejestrowanych (jednorazowy task)`
  - `## Kolejność wdrożenia (ważne metodycznie)`
  - `## Critical files`
  - `## Weryfikacja`

### `DOCS/Sessions & TO DOs/16.06_bilans_otwarcia_TO_DO.md`

- Lines: `164`
- Size: `11470` bytes
- Headings:
  - `# Bilans otwarcia — TO DO (kroki do wykonania)`
  - `## 0. Wymagania wstępne (raz)`
  - `## 1. Przygotowanie arkuszy (zanim cokolwiek odpalisz)`
  - `### 1a. Zakładka bilansu `bilans_otwarcia_26` (arkusz USERS_ARCHIVE)`
  - `### 1b. Zakładka przejściowa „Godzinki 2026 i korekty" (arkusz „DECODER KSYWEK I SKŁADKI")`
  - `### 1c. Arkusz członków „członkowie i sympatycy" (USERS_SPREADSHEET)`
  - `## 2. Konfiguracja env (DEV i PROD)`
  - `## 3. DEV — wdrożenie kodu`
  - `## 4. DEV — import bilansu otwarcia (Workstream A)`
  - `## 5. DEV — reconciliation już-zarejestrowanych (Workstream E)`
  - `## 6. DEV — zasilenie kolumn arkusza członków (Workstream D)`
  - `## 7. DEV — import tegorocznych godzinek (Workstream C)`
  - `## 8. DEV — test end-to-end rejestracji`
  - `## 9. PROD — powtórz po pomyślnym DEV`
  - `## 10. Otwarcie rejestracji`
  - `## Uwagi`
  - `## Wariant bez DEV (gdy nie ma środowiska testowego)`
  - `## Decyzje`
  - `## Otwarte (do Twojej decyzji — nie blokuje wdrożenia)`

### `DOCS/Sessions & TO DOs/17.06_prywatny_sprzęt_audyt.md`

- Lines: `86`
- Size: `6397` bytes
- Headings:
  - `# Audyt: opłaty za przechowywanie prywatnego sprzętu w klubie`
  - `## Cel`
  - `## Gdzie to żyje (kod)`
  - `## Na jakiej podstawie naliczane (warunki — wszystkie muszą być spełnione)`
  - `## Kiedy`
  - `## Wysokość`
  - `## Zwolnienia`
  - `## Idempotencja / retry`
  - `## Czy KOMUŚ jest teraz naliczane? (dane PROD, odczyt arkusza sprzętu 17.06)`
  - `## Co gdy właściciel NIE jest zarejestrowany (a trzyma prywatny kajak)`
  - `## Zidentyfikowane luki / ryzyka`
  - `## Weryfikacja (jak potwierdzić stan danych)`
  - `## (Opcjonalna) remediacja — do decyzji użytkownika`

### `DOCS/Sessions & TO DOs/17.06_prywatny_sprzęt_podsumowanie.md`

- Lines: `112`
- Size: `6996` bytes
- Headings:
  - `# Podsumowanie wdrożenia: opłaty za prywatny sprzęt + raportowanie ujemnego salda (17.06)`
  - `## 1. Znalezione błędy`
  - `### BŁĄD KRYTYCZNY — rozjazd nazw pól (mechanizm był martwy)`
  - `### Błąd 2 — cicha bezczynność przy brakującej dacie`
  - `### Błąd 3 — brak naliczenia dla niezarejestrowanego właściciela bez odzysku`
  - `### Stan danych PROD (potwierdzony 17.06 z arkusza sprzętu)`
  - `## 2. Co zostało zrobione (wg workstreamów)`
  - `### WS0 (prerekwizyt) — naprawa odczytu pól`
  - `### WS1 — walidacja przy syncu (wymóg 1)`
  - `### WS2 — `hist_{email}` dla niezarejestrowanych (wymóg 2)`
  - `### WS3 — widoczność zwolnienia Zarząd/KR (wymóg 3)`
  - `### WS4 + WS5 — miesięczny przegląd sald (wymogi 4 i 5)`
  - `## 3. Pliki`
  - `## 4. Weryfikacja`
  - `## 5. Do zrobienia przed/po wdrożeniu`

### `DOCS/Sessions & TO DOs/17.06_prywatny_sprzęt_TO_DO.md`

- Lines: `89`
- Size: `7130` bytes
- Headings:
  - `# Remediacja: opłaty za prywatny sprzęt + raportowanie ujemnego salda`
  - `## Context`
  - `## Stan istniejący (potwierdzony w kodzie)`
  - `## Workstreamy`
  - `### WS1 — Walidacja przy syncu (wymóg 1)`
  - `### WS2 — `hist_{email}` dla niezarejestrowanych (wymóg 2)`
  - `### WS3 — Widoczność zwolnienia Zarząd/KR (wymóg 3)`
  - `### WS4 + WS5 — Miesięczny przegląd sald (wymogi 4 i 5) — DECYZJA: raz w miesiącu, przy naliczaniu opłat`
  - `## Pliki kluczowe`
  - `## Weryfikacja`
  - `## Decyzje (zatwierdzone)`

### `DOCS/Sessions & TO DOs/17.08_audyt_kursant_wciaz_zablokowany.md`

- Lines: `148`
- Size: `8606` bytes
- Headings:
  - `# Kursant nadal nie może rezerwować sprzętu — audyt (17.08.2026)`
  - `## 1. Defekt A (krytyczny, główna przyczyna): zła ścieżka Firestore dla flagi `kurs_wypożycza``
  - `## 2. Defekt B (niezależny, blokuje po naprawie Defektu A): brak kolumny „rok szkoleniówki" w arkuszu „Szkoleniówka"`
  - `## 3. Co NIE jest przyczyną (odrzucone po weryfikacji)`
  - `## 4. Naprawa`
  - `### Defekt A — zmiana ścieżki odczytu flagi`
  - `### Defekt B — kolumna „rok szkoleniówki"`
  - `### Przy okazji`
  - `## 5. Weryfikacja po naprawie`
  - `## 6. Pliki`

### `DOCS/Sessions & TO DOs/17.08_konsolidacja_setup_i_dysk_PLAN_TO_DO.md`

- Lines: `238`
- Size: `16482` bytes
- Headings:
  - `# Konsolidacja: jeden arkusz Setup + jeden folder na Dysku + wiadomości systemowe z arkusza — plan (17.08.2026)`
  - `## Kontekst`
  - `## Zweryfikowany stan obecny (fakty z kodu i z żywych danych Firestore, nie domysły)`
  - `## Decyzje użytkownika (potwierdzone w tej sesji)`
  - `## Docelowa struktura`
  - `### Arkusz „App_SETUP" (w folderze „1_ZARZAD" > „APLIKACJA ARKUSZE"), zakładki:`
  - `### Arkusz członków — 2 nowe zakładki:`
  - `### Wspólny folder Dysku „1_ZARZAD" > „APLIKACJA ARKUSZE" — pliki do przeniesienia:`
  - `## Fazy wdrożenia`
  - `### Faza 0 — Dysk i nowy arkusz (RĘCZNE, użytkownik; Claude przygotowuje dane)`
  - `### Faza 1 — Kod: jedno źródło zmiennych setup`
  - `### Faza 2 — Kod: silnik szablonów wiadomości`
  - `### Faza 3 — Kod: „Kurs" + „Co po kursie" do arkusza członków, naprawa triggera`
  - `### Faza 4 — Przełączenie (kolejność krytyczna dla bezpieczeństwa)`
  - `## Kolejność i ryzyko`
  - `## Weryfikacja`
  - `## Zakres pracy — realistyczna skala`
  - `## Status realizacji`

### `DOCS/Sessions & TO DOs/17.08_kurs_wypożycza_PLAN_TO_DO.md`

- Lines: `109`
- Size: `6510` bytes
- Headings:
  - `# Naprawa bramki rezerwacji dla roli kursant — plan (17.08.2026)`
  - `## Kontekst`
  - `## Zmiany w kodzie`
  - `### 1. `functions/src/modules/equipment/bundle/gear_bundle_service.ts``
  - `### 2. `functions/src/index.ts``
  - `### 3. `appscript/kurs/uczestnicy_sync.gs``
  - `## Poza zakresem zmian w repo (działanie zarządu w arkuszu)`
  - `## Weryfikacja`
  - `## Po zakończeniu i zweryfikowaniu: e-mail do kursantów (ODROCZONE)`

### `DOCS/Sessions & TO DOs/17.08_setup_dane_do_wklejenia.md`

- Lines: `348`
- Size: `11931` bytes
- Headings:
  - `## 1. Zakładka `APP` i `VARS_CZLONKOWIE``
  - `## 2. Zakładka `VARS_SPRZET``
  - `## 3. Zakładka `VARS_BASEN` (NOWA — dziś ten dokument w Firestore w ogóle nie istnieje)`
  - `## 4. Zakładka `VARS_GODZINKI` (NOWA — dziś ten dokument w Firestore w ogóle nie istnieje)`
  - `## 5. Zakładka `MESSAGES` (NOWA)`
  - `### `welcome_none` — mail powitalny, bez dostępu do listy dyskusyjnej`
  - `### `welcome_readonly` — mail powitalny, dostęp tylko do odczytu listy`
  - `### `welcome_full` — mail powitalny, pełny dostęp do listy`
  - `### `role_changed` — zmiana roli użytkownika`
  - `### `event_new` — nowa impreza`
  - `### `event_upcoming` — zbliżająca się impreza`
  - `### `admin_digest` — zaległe zatwierdzenia dla zarządu`
  - `### `akademik_granted` / `akademik_revoked` — dostęp do akademika`
  - `### `gear_cancelled_user` / `gear_cancelled_board` — anulowanie rezerwacji sprzętu przez zarząd`
  - `### `basen_cancelled` — anulowanie zajęć basenowych`
  - `### `godzinki_limit_user` — przekroczony limit ujemnego salda (użytkownik)`
  - `### `godzinki_limit_board` — przekroczony limit ujemnego salda (zbiorczy do zarządu)`
  - `## 6. Zakładki „Kurs" i „Co po kursie" w arkuszu członków`

### `DOCS/Sessions & TO DOs/18.06_kandydat_audyt_TO_DO.md`

- Lines: `126`
- Size: `10476` bytes
- Headings:
  - `# 18.06 — Audyt roli „kandydat" + plan działania (TO-DO)`
  - `## CZĘŚĆ 1 — WYNIKI AUDYTU (stan zastany)`
  - `### 1.1 Jak powstaje kandydat`
  - `### 1.2 Co kandydat MOŻE faktycznie (backend)`
  - `### 1.3 Co kandydat WIDZI (frontend)`
  - `### 1.4 Czy kandydat ma własne ekrany?`
  - `### 1.5 🔴 GŁÓWNA NIESPÓJNOŚĆ (do naprawy)`
  - `### 1.6 Stan trzech wymagań docelowych vs. kod`
  - `### 1.7 „Szkoleniowiec" — ustalenie modelu`
  - `### 1.8 Mechanika sesji (istotne dla implementacji)`
  - `## CZĘŚĆ 2 — DECYZJE PRODUKTOWE (potwierdzone przez użytkownika)`
  - `## CZĘŚĆ 3 — PLAN DZIAŁANIA (TO-DO)`
  - `### A. Backend — sync pól z arkusza (`functions/src/service/tasks/usersSyncFieldsFromSheet.ts`)`
  - `### B. Backend — odpowiedź rejestracji (`functions/src/api/registerUserHandler.ts`)`
  - `### C. Frontend — `public/core/render_shell.js``
  - `### D. Prerekwizyty operacyjne (poza kodem — użytkownik)`
  - `## CZĘŚĆ 4 — PLIKI DO ZMIANY`
  - `## CZĘŚĆ 5 — WERYFIKACJA`
  - `## CZĘŚĆ 6 — POZA ZAKRESEM`

### `DOCS/Sessions & TO DOs/18.06_rejestracja_problemy_podsumowaie.md`

- Lines: `108`
- Size: `7535` bytes
- Headings:
  - `# 18.06 — Rejestracja + bilans otwarcia: podsumowanie wdrożenia (kod)`
  - `## Zakres`
  - `## CZĘŚĆ B — wybiórczy reconcile po mailu (Problem 2 i 3)`
  - `### B1. Task `opening.reconcile` — tryb pojedynczy`
  - `### B2. Endpoint `appsScriptSync``
  - `### B3. Menu Apps Script`
  - `## CZĘŚĆ A — potwierdzenie maila przy dopasowaniu po nazwisku (Problem 1)`
  - `### A0. Wspólny helper`
  - `### A1. Backend rejestracji`
  - `### A2. Frontend rejestracji`
  - `## Fakt techniczny utrwalony w kodzie/decyzjach`
  - `## Pliki zmienione`
  - `## Stan jakości`
  - `## TO-DO wdrożenia (NIE wykonane)`

### `DOCS/Sessions & TO DOs/18.06_rejestracja_problemy_TO_DO.md`

- Lines: `165`
- Size: `14250` bytes
- Headings:
  - `# 18.06 — Rejestracja + bilans otwarcia: problemy i plan (TO-DO)`
  - `## Fakt fundamentalny (tłumaczy problemy #2 i #3)`
  - `## PROBLEM 1 — rejestracja innym mailem, dane są pod imieniem i nazwiskiem → brak pytania do użytkownika i brak aktualizacji maila w bilansie`
  - `### Wymaganie (cel)`
  - `### Stan zastany (kod)`
  - `### Proponowane rozwiązanie`
  - `### Pliki do zmiany`
  - `## PROBLEM 2 — konto KR: w arkuszu 300h, w aplikacji 0h. Czy sync arkusza to naprawi?`
  - `### Diagnoza`
  - `### Czy „sync arkusza członków" to naprawi? → **NIE**`
  - `### Rozwiązanie → task `opening.reconcile``
  - `## PROBLEM 3 — user zarejestrowany innym mailem potraktowany jako nieistniejący. Czy zmiana maila w BO26 + sync do Firestore naprawi?`
  - `### Diagnoza`
  - `### Rozwiązanie → ponownie `opening.reconcile``
  - `### Podsumowanie kroków naprawy pojedynczego konta (Problem 3)`
  - `## Mapa: który mechanizm co robi (ściągawka)`
  - `## DECYZJE (18.06) — zatwierdzone przez zarząd`
  - `### Problem 1 (flow potwierdzenia maila) — WDRAŻAMY`
  - `### Problem 2 (konto KR 300h) — WDRAŻAMY mechanizm wybiórczy`
  - `### Problem 3 (konto z błędnym mailem) — WDRAŻAMY w ramach Problemu 1 + reconcile po mailu`
  - `## PLAN WDROŻENIA`
  - `### Część A — Problem 1: flow potwierdzenia przy dopasowaniu po nazwisku`
  - `### Część B — Problem 2 i 3: wybiórczy reconcile po mailu z menu arkusza`
  - `### Weryfikacja`
  - `### Poza zakresem`

### `DOCS/Sessions & TO DOs/18.06_rezerwacje_czas_audyt_TO_DO.md`

- Lines: `119`
- Size: `8661` bytes
- Headings:
  - `# 18.06 — Rezerwacje sprzętu: czas/horyzont — audyt + plan (TO-DO)`
  - `## CZĘŚĆ 1 — WYNIKI AUDYTU`
  - `### 1.1 Przyczyna źródłowa`
  - `### 1.2 Co naprawdę znaczą zmienne (ważna różnica)`
  - `### 1.3 Skąd biorą się limity (i sprawa „brakującej zmiennej w arkuszu")`
  - `### 1.4 Gdzie występuje błąd (cały proces rezerwacji)`
  - `### 1.5 Offset a długość`
  - `## CZĘŚĆ 2 — DECYZJE (zatwierdzone)`
  - `## CZĘŚĆ 3 — PLAN WDROŻENIA`
  - `### 3.1 `functions/src/modules/calendar/calendar_utils.ts``
  - `### 3.2 `functions/src/modules/setup/setup_gear_vars.ts``
  - `### 3.3 Trzy miejsca walidacji — wzorzec zamiany`
  - `### 3.4 `public/core/user_error_messages.js``
  - `### 3.5 Operacyjnie (arkusz gear, zakładka SETUP)`
  - `## CZĘŚĆ 4 — PLIKI DO ZMIANY`
  - `## CZĘŚĆ 5 — WERYFIKACJA`
  - `## CZĘŚĆ 6 — POZA ZAKRESEM`

### `DOCS/Sessions & TO DOs/18.08_audyt_gotowosci_setup.md`

- Lines: `177`
- Size: `11258` bytes
- Headings:
  - `# Audyt gotowości arkusza „App_SETUP" do Fazy 1 (kod) — 18.08.2026`
  - `## Werdykt`
  - `## A. Struktura zakładek odbiega od zatwierdzonego planu`
  - `## B. Niezgodności nazw zmiennych z kodem (dziś ciche, po syncu realne)`
  - `### B.1 `Vars_GODZINKI` — KRYTYCZNE, żadna z 6 zmiennych nie pasuje do kodu`
  - `### B.2 `Vars_BASEN` — 2 z 10 kluczy nie pasują do kodu`
  - `### B.3 `Vars_CZLONKOWIE` — literówka formatu klucza (kosmetyczna, dziś nieszkodliwa)`
  - `### B.4 `Vars_SPRZET` — pełna zgodność ✅`
  - `## C. Które zmienne mają dziś realny kod (a które to zadatek na przyszłość)`
  - `## D. `Vars_MESSAGES` — 13 wierszy`
  - `### D.1 Błąd danych — wiersz `akademik_granted / akademik_revoked` (KRYTYCZNE dla Fazy 2)`
  - `### D.2 Pozostałe 12 wierszy — treść zgodna z kodem (spot-check)`
  - `### D.3 Niuanse do zapamiętania przy pisaniu Fazy 2 (nie błędy, tylko pułapki)`
  - `## E. Znalezisko przy okazji (nie blokuje migracji, do sprzątnięcia)`
  - `## Rekomendowana kolejność przed Fazą 1`

### `DOCS/Sessions & TO DOs/18.08_session_handoff.md`

- Lines: `160`
- Size: `11428` bytes
- Headings:
  - `# Session Handoff — Pełne przełączenie na arkusz App_SETUP (18.08.2026)`
  - `## Where it started`
  - `## Decisions locked + what shipped`
  - `## Key files for next session`
  - `## Running state`
  - `## Verification — how to confirm things still work`
  - `## Deferred + open questions`
  - `## 19.08.2026 — dodatkowe prace tej samej nitki sesji`
  - `## Pick up here`

### `DOCS/Sessions & TO DOs/20.08_naprawa_powiadomień.md`

- Lines: `150`
- Size: `8830` bytes
- Headings:
  - `# Naprawa: powiadomienia o zbliżających się imprezach nie działały`
  - `## Przyczyna`
  - `## Potwierdzenie na danych produkcyjnych`
  - `## Naprawa`
  - `## Wdrożenie`
  - `## Weryfikacja`
  - `## Poprawki po pierwszej wysyłce (feedback usera po otrzymaniu maila)`
  - `### 1. Treść maila pokazywała skonfigurowany próg, nie rzeczywistą liczbę dni`
  - `### 2. Link w mailu pokazywał domyślny adres Cloud Run zamiast przyjaznej domeny`
  - `### Wdrożenie i weryfikacja poprawek`

### `DOCS/Sessions & TO DOs/20.08_opisy_imprez_TO_DO.md`

- Lines: `217`
- Size: `11416` bytes
- Headings:
  - `# Czytelne wyświetlanie opisów imprez (pełna lista + widget na stronie głównej)`
  - `## Kontekst`
  - `## Architektura naprawy`
  - `### `formatFreeText(raw)` — algorytm`
  - `## Zmiany plik po pliku`
  - `## Weryfikacja`
  - `## Poprawka po pierwszym wdrożeniu — plan nie objął pól `location`/`contact``
  - `## Poprawka #2 — reguła zbyt łagodna na REALNYCH danych (impreza „Igraszki Morskie")`

### `DOCS/Sessions & TO DOs/21.08_wyświetlnie_zdjęć_TO_DO.md`

- Lines: `126`
- Size: `7496` bytes
- Headings:
  - `# Wskaźnik ładowania przy przełączaniu zdjęć kajaka`
  - `## Kontekst`
  - `## Rozwiązanie`
  - `## Weryfikacja`

### `DOCS/Sessions & TO DOs/24.07_klucze.md`

- Lines: `176`
- Size: `11719` bytes
- Headings:
  - `# Moduł „Klub" — klucze do siedziby: plan wdrożenia`
  - `## 1. Kluczowe odkrycie — połowa danych już istnieje`
  - `## 2. Stan modułu „Klub" w APP_SETUP — już częściowo przygotowany`
  - `## 3. Nowa kolumna w arkuszu — „Dostęp akademik"`
  - `## 4. Zmiany w kodzie — backend`
  - `### 4.1 `functions/src/service/tasks/usersSyncFieldsFromSheet.ts``
  - `### 4.2 `functions/src/api/getKlubInfoHandler.ts``
  - `### 4.3 `index.ts` / `firebase.json``
  - `## 5. Zmiany w kodzie — frontend`
  - `### 5.1 `public/core/modules_registry.js``
  - `### 5.2 Nowy plik `public/modules/klub_module.js``
  - `### 5.3 `public/core/render_shell.js` — kafelek na stronie głównej`
  - `## 6. Kolejność wdrożenia (żeby nic po drodze się nie wysypało)`
  - `## 7. Model danych — podsumowanie`
  - `## 8. Decyzje — POTWIERDZONE (2026-07-24)`
  - `## 9a. Dodatek: powiadomienie e-mail o zmianie „Dostęp akademik" (2026-07-24)`
  - `## 9. Poza zakresem dziś (na później, gdy dojdziemy do tego etapu)`

### `DOCS/Sessions & TO DOs/24.08_basen_plan.md`

- Lines: `266`
- Size: `18828` bytes
- Headings:
  - `# Moduł Basen — plan wdrożenia (przebudowa H1/H2/sauna + integracja Sprzęt + instruktorzy)`
  - `## Kontekst`
  - `## Decyzje projektowe tego planu (żeby zminimalizować niepotrzebne zmiany)`
  - `## Faza A — Backend: nowy model danych (`functions/src/modules/basen/basen_service.ts`)`
  - `## Faza B — Backend: endpointy (`functions/src/api/basen*.ts`, `index.ts`, `firebase.json`)`
  - `## Faza C — Uprawnienia (rola kursant, instruktor, opiekun basenowy)`
  - `## Faza D — Integracja z modułem Sprzęt (blokada 4 kategorii drobnego sprzętu)`
  - `## Faza E — Frontend (`public/modules/basen_module.js`, `basen.css`, `render_shell.js`)`
  - `## Faza F — Sprzątanie martwego kodu`
  - `## Indeksy Firestore (`firestore.indexes.json`)`
  - `## Weryfikacja`

### `DOCS/Sessions & TO DOs/26.06_o_klubie.md`

- Lines: `209`
- Size: `9809` bytes
- Headings:
  - `# 26.06 — Box „Klub" w panelu użytkownika (analiza + plan)`
  - `## Cel`
  - `## Co znalazłem (analiza kodu)`
  - `### 1. Panel profilu — gdzie się renderuje`
  - `### 2. Routing API`
  - `### 3. Model danych klubowych (już istnieje)`
  - `### 4. Gotowy wzorzec do reużycia (email → nazwa)`
  - `### 5. Role / KR`
  - `## Decyzje (uzgodnione z użytkownikiem)`
  - `## Plan implementacji`
  - `### Architektura`
  - `### Backend`
  - `### Frontend`
  - `### Helper`
  - `### Pliki do zmiany / utworzenia`
  - `### Reużycie`
  - `## Weryfikacja`
  - `## Rozszerzalność (statut / regulamin / klucze)`

### `DOCS/Sessions & TO DOs/26.06_raporty_zarzadu_v1.md`

- Lines: `215`
- Size: `11437` bytes
- Headings:
  - `# 26.06 — Zakładki w panelu Zarząd + raport wypożyczonego sprzętu (analiza + plan)`
  - `## Cel`
  - `## Decyzje (uzgodnione z użytkownikiem)`
  - `## Co znalazłem (analiza kodu)`
  - `### 1. Panel Zarząd = `public/modules/admin_pending_module.js``
  - `### 2. Model danych rezerwacji — kolekcja `gear_reservations``
  - `### 3. Kategorie sprzętu + etykiety PL`
  - `### 4. Autoryzacja admina (do skopiowania)`
  - `### 5. Routing API`
  - `### 6. Wzorzec zakładek/tabel`
  - `## Plan implementacji`
  - `### Backend — `GET /api/admin/reports/gear-rentals``
  - `### Frontend — `public/modules/admin_pending_module.js``
  - `### Style — `public/styles/base.css``
  - `### Pliki`
  - `### Reużycie`
  - `## Weryfikacja`
  - `## STATUS v1 — ZROBIONE (26.06.2026, NIE wdrożone)`
  - `# v2 — Launcher kafelkowy (~20 raportów) + poprawki raportu sprzętu`
  - `## Cel`
  - `## Architektura — rejestr raportów`
  - `## Poprawki raportu sprzętu (gear_rentals)`
  - `## Pliki (v2)`
  - `## Weryfikacja (v2)`

### `DOCS/Sessions & TO DOs/26.06_rapotry_sessoin_summary.md`

- Lines: `147`
- Size: `8184` bytes
- Headings:
  - `# 26.06 — Podsumowanie sesji (Box „Klub" + Raporty Zarządu)`
  - `## A. Box „Klub" w profilu użytkownika`
  - `## B. Panel Zarząd — zakładki + raporty`
  - `### Launcher (kafelki + szukajka → szczegół)`
  - `### Raport 1 — „Wypożyczenia sprzętu" (`gear_rentals.js`)`
  - `### Raport 2 — „Najbardziej aktywni" (`member_activity.js`)`
  - `### Raport 3 — „Składki" (`member_dues.js`)`
  - `### Reguły biznesowe raportów członkowskich (WAŻNE)`
  - `### Eksport PDF (wszystkie raporty)`
  - `### Inne`
  - `## C. Testy regresyjne (read-only, realny handler na prod)`
  - `## D. Stan wdrożenia + checklista`
  - `## E. Otwarte / do decyzji`

### `DOCS/Sessions & TO DOs/27.06_godzinki_poprawki.md`

- Lines: `79`
- Size: `4685` bytes
- Headings:
  - `# 27.06 — Remediacja bilansu otwarcia godzinek (uzgodnienie ledgera z kolekcją BO)`
  - `## Po co to robimy (problem + diagnoza)`
  - `### Model godzinek (potwierdzony)`
  - `### Przyczyna błędu`
  - `### Skala (diagnostyka prod, 22 zarejestrowanych pełnych członków)`
  - `## Rozwiązanie — istniejący task `opening.reconcile` (BEZ zmiany kodu)`
  - `## Plan wykonania (z obowiązkowym podglądem i akceptacją)`
  - `## Pliki`
  - `## Reuse`
  - `## Ryzyka / uwagi`

### `DOCS/Sessions & TO DOs/27.06_session_summaty_raporty.md`

- Lines: `141`
- Size: `7369` bytes
- Headings:
  - `# 27.06 — Podsumowanie: Raporty Zarządu + remediacja godzinek (stan końcowy)`
  - `## A. Panel Zarząd — zakładki + launcher kafelkowy`
  - `## B. Cztery raporty`
  - `### 1. Wypożyczenia sprzętu (`gear_rentals.js`) — kat. Sprzęt`
  - `### 2. Najbardziej aktywni (`member_activity.js`) — kat. Członkowie`
  - `### 3. Składki i uprawnieni do głosowania (`member_dues.js`) — kat. Członkowie`
  - `### 4. Aktywność użytkownika (`user_activity.js`) — kat. Członkowie`
  - `## C. Reguły biznesowe godzinek (ostateczne)`
  - `## D. Remediacja bilansu otwarcia (WYKONANA na prod 27.06)`
  - `## E. Eksport PDF (wszystkie raporty)`
  - `## F. Skrypty / testy (functions/scripts/)`
  - `## G. Stan wdrożenia + checklista`
  - `## H. Pliki (najważniejsze)`

### `DOCS/Sessions & TO DOs/28.06_rola_kursant_TO_DO.md`

- Lines: `230`
- Size: `18105` bytes
- Headings:
  - `# Rola kursanta — audyt i plan naprawy (TO-DO)`
  - `## 1. Kontekst — po co to robimy`
  - `### Dlaczego NIE automatyczna zmiana roli (odrzucony wariant)`
  - `## 2. Jak to działa dziś (stan obecny) — z dowodami w kodzie`
  - `### 2.1 Role i uprawnienia (backend)`
  - `### 2.2 Limity sprzętu (OK)`
  - `### 2.3 Tworzenie rezerwacji (backend) — wspólne dla WSZYSTKICH kategorii`
  - `### 2.4 `GET /api/setup` (backend) — flaga i okno`
  - `### 2.5 Frontend — dashboard`
  - `### 2.6 Frontend — moduł sprzętu (źródło różnic między kategoriami)`
  - `### 2.7 Synchronizacja roli z arkusza (źródło prawdy)`
  - `### 2.8 Dane kursanta`
  - `## 3. Zidentyfikowane problemy (podsumowanie przyczyn)`
  - `## 4. Co wdrażamy (zakres docelowy)`
  - `### A. Backend (`functions/src`)`
  - `### B. Frontend (`public`)`
  - `### C. Arkusz członków — formatowanie warunkowe (bez kodu)`
  - `## 5. Przypadki brzegowe i ryzyka`
  - `## 6. Weryfikacja (jak testujemy)`
  - `## 7. Wdrożenie (po akceptacji — NIE teraz)`
  - `## 8. Pliki do zmiany (skrót)`

### `DOCS/Sessions & TO DOs/28.07_basen_stara_aplikacja.md`

- Lines: `401`
- Size: `24559` bytes
- Headings:
  - `# Prompt dla nowej sesji Claude — moduł „Zapisy na basen (Morzkulc)”`
  - `## 1. Domena i cel`
  - `## 2. Model danych (kolekcje)`
  - `### 2.1 `users/{uid}``
  - `### 2.2 `pools/{poolId}` — terminy (dni basenowe)`
  - `### 2.3 `bookings/{bookingId}``
  - `### 2.4 `kayaks/{kayakId}``
  - `### 2.5 `allocations/{allocId}` — przydział kajaka na godzinę`
  - `## 3. Uwierzytelnianie i uprawnienia`
  - `### 3.1 Logowanie`
  - `### 3.2 Statusy konta`
  - `### 3.3 Role i etykieta publiczna`
  - `### 3.4 Reguły bezpieczeństwa (odzwierciedlenie logiki serwerowej)`
  - `## 4. Nawigacja i widoki`
  - `## 5. Widok `/terminy` — logika użytkownika`
  - `### 5.1 Lista terminów`
  - `### 5.2 Zapis (`book`) — algorytm dokładny`
  - `### 5.3 Zapis z instruktorem (`training`)`
  - `### 5.4 „Dodaj się jako instruktor” — tylko `roles.instructor``
  - `### 5.5 „Odbierz +1 za szkolenie” (instruktor)`
  - `### 5.6 Wypisanie się (`cancel`)`
  - `### 5.7 Kajaki — wybór i zmiana`
  - `### 5.8 Lista zapisanych (`AttendeesList`) — publiczna sekcja per godzina`
  - `## 6. Widok `/admin/terminy``
  - `### 6.1 Lista i sortowanie`
  - `### 6.2 Formularz dodania terminu`
  - `### 6.3 Usuwanie terminu`
  - `## 7. Widok `/admin/uzytkownicy``
  - `### 7.1 Zakładki`
  - `### 7.2 Wyszukiwarka (lokalna, po pobraniu)`
  - `### 7.3 Akcje per użytkownik`
  - `### 7.4 UI info per użytkownik`
  - `## 8. Widok `/admin/kajaki``
  - `## 9. Elementy istniejące w kodzie, lecz **niewpięte** (do rozważenia)`
  - `### 9.1 `Moje` — „Moje zapisy”`
  - `### 9.2 `Kup` — informacje o pakietach (płatność przelewem)`
  - `### 9.3 Cloud Functions (`functions/src/index.ts`)`
  - `## 10. Reguły biznesowe — podsumowanie do wdrożenia`
  - `## 11. UX — konwencje komunikatów`
  - `## 12. Stos technologiczny (obecny; do zaadaptowania w nowym projekcie)`
  - `## 13. Czego NIE ma w obecnym kodzie (świadomie pomijaj lub uzupełnij od zera)`

### `DOCS/Sessions & TO DOs/29.07_basen_logika_biznesowa.md`

- Lines: `195`
- Size: `16503` bytes
- Headings:
  - `# Moduł Basen — docelowa logika biznesowa (draft do iteracji)`
  - `## 0. Jak czytać ten dokument`
  - `## 1. Domena i kontekst`
  - `## 2. Model terminu i slotów`
  - `## 3. Kajaki — integracja z modułem Sprzęt`
  - `### Co już działa (zweryfikowane w kodzie, audyt z 23.07 tego nie wychwycił)`
  - `### Czego brakuje`
  - `### Operacyjnie (koniec sezonu)`
  - `## 4. Sprzęt drobny na basenie (kaski, wiosła, kamizelki, fartuchy)`
  - `## 5. Płatność i kredyty`
  - `## 6. Instruktorzy`
  - `### Kto może być instruktorem`
  - `### Mechanika zgłaszania i parowania (jak stara apka, §5.3–5.4)`
  - `### Nagroda za prowadzenie — uproszczenie względem starej apki`
  - `## 7. Uprawnienia administracyjne modułu`
  - `### Sprostowanie względem wcześniejszego założenia`
  - `## 8. Anulowanie zapisu`
  - `## 9. Rekomendacje porządkowe (do potwierdzenia, nie blokują tego dokumentu)`
  - `## 10. Otwarte pytania do potwierdzenia`
  - `## 11. Decyzje — POTWIERDZONE (2026-08-24)`

### `DOCS/Sessions & TO DOs/29.08_basen_wdrozenie_i_start_demo.md`

- Lines: `355`
- Size: `22412` bytes
- Headings:
  - `# Moduł Basen — podsumowanie wdrożenia + jak uruchomić tryb demo`
  - `## 1. Co zostało zrobione w kodzie`
  - `### Backend — nowy model danych i endpointy`
  - `### Uprawnienia`
  - `### Integracja ze Sprzętem`
  - `### Frontend`
  - `## 2. Jak to przetestowano`
  - `### 2a. Pierwszy przebieg (bez emulatora — patrz 2b, potem odpalony naprawdę)`
  - `### 2b. Drugi przebieg — poprosiłeś o Javę 21 i prawdziwy emulator, więc to zrobiłem`
  - `### 2c. Trzeci przebieg — poprosiłeś o naprawę firebase-functions, więc spróbowałem`
  - `### 2d. Kajaki prywatne na liście wyboru — dodane po Twojej weryfikacji arkusza`
  - `### 2e. `basen_admin_mail` vs `basen_opiekunowie` — uproszczone po rozmowie`
  - `### 2f. Prawdziwy emulator znalazł realnego buga — naprawiony i zweryfikowany`
  - `## 3. Co musisz zrobić Ty, krok po kroku, żeby uruchomić tryb demo`
  - `### Krok 1 — Arkusz sprzętowy: dodaj demo-kajaki`
  - `### Krok 2 — Arkusz App_SETUP: dodaj testerów do `modul_6``
  - `### Krok 3 — Deploy`
  - `### Krok 4 — Testuj`
  - `### Krok 5 — Cutover na pełną produkcję (dopiero po udanym demo)`
  - `## 4. Stan środowiska lokalnego po tej sesji`
  - `## 5. Pliki zmienione w tej sesji`

### `DOCS/Sessions & TO DOs/31.08_basen_deploy_prod_i_diagnostyka.md`

- Lines: `180`
- Size: `9050` bytes
- Headings:
  - `# Moduł Basen — wdrożenie na produkcję, naprawa deployu, pierwsza diagnostyka demo`
  - `## 1. Deploy na produkcję — trzy nieudane próby, czwarta udana`
  - `### 1a. Nieprawidłowy indeks Firestore`
  - `### 1b. Martwe funkcje blokujące deploy`
  - `### 1c. Zepsuty lockfile — `npm ci` w Cloud Build`
  - `## 2. Cloud Run invoker — 3 nowe funkcje wymagały ręcznego przełączenia`
  - `## 3. Sync arkuszy Google — wykonany, ale bez niezależnej weryfikacji`
  - `## 4. Pierwsze zgłoszenia z testów demo`
  - `### 4a. Admin/opiekun basenowy nie widział modułu wcale`
  - `### 4b. Nazewnictwo w interfejsie — poprawione`
  - `## 5. Ograniczenie środowiska: brak weryfikacji Firestore z tej maszyny`
  - `## 6. Git — problem z push rozwiązany`
  - `## 7. Co zostało do zrobienia`

### `DOCS/Sessions & TO DOs/AUDIT_MAP.md`

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

### `DOCS/Sessions & TO DOs/AUDIT_PLAN.md`

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

### `DOCS/Sessions & TO DOs/audyt_ekrany_użytkowników.md`

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

### `DOCS/Sessions & TO DOs/audyt_ranking_kilometrowka_mapa_v2.md`

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

### `DOCS/Sessions & TO DOs/audyt_rejestracja.md`

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

### `DOCS/Sessions & TO DOs/audyt_testow_logowanie_uzytkownicy_v1.md`

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

### `DOCS/Sessions & TO DOs/audyt_testow_ranking_kilometrowka_mapa.md`

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

### `DOCS/Sessions & TO DOs/audyt_v2.md`

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

### `DOCS/Sessions & TO DOs/basen_TO_DO.md`

- Lines: `190`
- Size: `18576` bytes
- Headings:
  - `# Moduł Basen — pełny audyt stanu obecnego (punkt zero)`
  - `## 0. Executive summary — najważniejsze ustalenia`
  - `## 1. Gdzie leży kod`
  - `## 2. Model danych — dokładne pola`
  - `### `BasenSession` (`basen_sessions/{id}`)`
  - `### `BasenEnrollment` (`basen_enrollments/{id}`)`
  - `### `BasenKarnet` (`basen_karnety/{id}`)`
  - `### `BasenGodzinyRecord` (`basen_godziny_ledger/{id}`) — **martwy kod, patrz sekcja 5**`
  - `## 3. Przepływ użytkownika (frontend `basen_module.js`)`
  - `## 4. Model uprawnień`
  - `## 5. System „godzin basenowych" — w pełni zbudowany, zero integracji`
  - `## 6. Płatności — co naprawdę się dzieje`
  - `## 7. Powiadomienia`
  - `## 8. Znane luki i pytania otwarte do decyzji (surowa lista, do priorytetyzacji)`
  - `## 9. Co już działa poprawnie i solidnie (żeby nie zgubić w krytyce)`

### `DOCS/Sessions & TO DOs/ekran_kursant_podsumowanie_wdrozenia.md`

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

### `DOCS/Sessions & TO DOs/GRUPY_UZYTKOWNICY_PLAN_AND_TO_DO.MD`

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

### `DOCS/Sessions & TO DOs/kajaki_w_mojej_wadze_plan.md`

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

### `DOCS/Sessions & TO DOs/konta testowe.md`

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

### `DOCS/Sessions & TO DOs/kurs_wdrożenie_ekrany.md`

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

### `DOCS/Sessions & TO DOs/kursanc_ekrany_wdrozenie.md`

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

### `DOCS/Sessions & TO DOs/live_web_audyt_v1.md`

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

### `DOCS/Sessions & TO DOs/plan_audyt_v2.md`

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

### `DOCS/Sessions & TO DOs/plan_ranking_kilometrowka_mapa_v1.md`

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

### `DOCS/Sessions & TO DOs/plan_testow_logowanie_uzytkownicy_v1.md`

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

### `DOCS/Sessions & TO DOs/plan_testow_ranking_kilometrowka_mapa_v1.md`

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

### `DOCS/Sessions & TO DOs/ranking_wdrozenie_audyt.md`

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

### `DOCS/Sessions & TO DOs/RUN_TESTS.md`

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

### `DOCS/Sessions & TO DOs/TEST_DATA_REQUIREMENTS.md`

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

### `DOCS/Sessions & TO DOs/test_logowania_wymagania_wstepne.md`

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

### `DOCS/Sessions & TO DOs/TEST_MATRIX.md`

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

### `DOCS/Sessions & TO DOs/TO_DO_USERS.md`

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

### `DOCS/Sessions & TO DOs/users_wdrozenie_1.md`

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

### `DOCS/Sessions & TO DOs/users_wdrozenie_1_TO_DO.MD`

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

### `DOCS/Sessions & TO DOs/wdrożenia kalendarza.md`

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

### `DOCS/Sessions & TO DOs/zasady_ekrany_uzytkownikow.md`

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

### `READ_ME.md`

- Lines: `212`
- Size: `9692` bytes
- Headings:
  - `# SKK Morzkulc — przewodnik dla Zarządu`
  - `## 1. Słowniczek`
  - `## 2. Role i statusy`
  - `## 3. Ścieżka użytkownika`
  - `## 4. Moduły`
  - `## 5. Jak działa synchronizacja`
  - `## 6. Panel Zarządu (moduł „Zarząd" w aplikacji)`
  - `## 7. Mapa arkuszy`
  - `## 8. App_SETUP — 6 zakładek`
  - `### 8.1 `APP` — moduły`
  - `### 8.2 `VARS_CZLONKOWIE` — parametry klubu`
  - `### 8.3 `VARS_SPRZET` — zasady rezerwacji`
  - `### 8.4 `VARS_BASEN``
  - `### 8.5 `VARS_GODZINKI``
  - `### 8.6 `MESSAGES` — treść maili`
  - `## 9. Zadania krok po kroku`
  - `## 10. Konta funkcyjne`
  - `## 11. Diagnostyka`
  - `## 12. Kontakt techniczny`

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
- `.gitignore` — 72 lines, 1187 bytes
- `ai_full_audit_report.txt` — 1918 lines, 88991 bytes
- `appscript/2_Członkowie Godzinki Imprezy/api_router` — 280 lines, 7928 bytes
- `functions/.gitignore` — 10 lines, 153 bytes
- `public/404.html` — 34 lines, 1808 bytes
- `public/index.html` — 52 lines, 2129 bytes
- `public/map.html` — 323 lines, 9987 bytes
- `public/skrypt_kurs/chapters/ch01.html` — 6 lines, 547 bytes
- `public/skrypt_kurs/chapters/ch02.html` — 201 lines, 11069 bytes
- `public/skrypt_kurs/chapters/ch03.html` — 169 lines, 9113 bytes
- `public/skrypt_kurs/chapters/ch04.html` — 21 lines, 1160 bytes
- `public/skrypt_kurs/chapters/ch05.html` — 132 lines, 7205 bytes
- `public/skrypt_kurs/chapters/ch06.html` — 265 lines, 13264 bytes
- `public/styles/app.css` — 10 lines, 254 bytes
- `public/styles/base.css` — 556 lines, 16935 bytes
- `public/styles/basen.css` — 367 lines, 6398 bytes
- `public/styles/dashboard.css` — 162 lines, 2708 bytes
- `public/styles/events.css` — 206 lines, 3427 bytes
- `public/styles/gear.css` — 1206 lines, 21669 bytes
- `public/styles/godzinki.css` — 184 lines, 3538 bytes
- `public/styles/km.css` — 496 lines, 10234 bytes
- `public/styles/kurs.css` — 430 lines, 7128 bytes
- `public/styles/start.css` — 312 lines, 11613 bytes
- `tests/e2e/.gitignore` — 11 lines, 142 bytes
- `tests/e2e/reports/events_e2e_run.txt` — 110 lines, 8703 bytes
- `tests/e2e/reports/godzinki_e2e_run.txt` — 57 lines, 5149 bytes
- `tests/e2e/requirements.txt` — 7 lines, 141 bytes
