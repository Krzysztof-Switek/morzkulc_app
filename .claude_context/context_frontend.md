# Frontend Context

Files indexed here: 31

## `public/404.html`

- kind: `frontend_other`
- lines: 34
- size_bytes: 1808

## `public/core/access_control.js`

- kind: `frontend_other`
- lines: 38
- size_bytes: 1542
- keywords:
  - setup
  - map
  - role
  - status
  - email
- exports:
  - canSeeModule
- symbols:
  - canSeeModule

## `public/core/api_client.js`

- kind: `frontend_other`
- lines: 53
- size_bytes: 1381
- keywords:
  - auth
  - status
  - sync
- exports:
  - apiGetJson
  - apiPostJson
  - setApiTokenGetter
- symbols:
  - apiGetJson
  - apiPostJson
  - resolveToken
  - setApiTokenGetter

## `public/core/app_shell.js`

- kind: `frontend_other`
- lines: 241
- size_bytes: 7459
- keywords:
  - auth
  - setup
  - storage
  - sync
  - index
- symbols:
  - hardResetUi
  - showAuthError
- route/api hints:
  - /api/register
  - /api/setup

## `public/core/firebase_client.js`

- kind: `frontend_other`
- lines: 188
- size_bytes: 5937
- keywords:
  - auth
  - gear
  - kayak
  - map
  - storage
  - sync
  - email
- exports:
  - authGetBasicUser
  - authGetIdToken
  - authHandleRedirectResult
  - authLoginPopup
  - authLogout
  - authOnChange
  - isDev
  - storageFetchHelmetFrontUrl
  - storageFetchHelmetUrl
  - storageFetchKayakCoverUrl
  - storageFetchKayakGalleryUrls
  - storageFetchLifejacketUrl
- symbols:
  - authGetBasicUser
  - authGetIdToken
  - authHandleRedirectResult
  - authLoginPopup
  - authLogout
  - authOnChange
  - getFirebaseConfig
  - kayakStorageNumber
  - needsRedirectAuth
  - storageFetchHelmetFrontUrl
  - storageFetchHelmetUrl
  - storageFetchKayakCoverUrl
  - storageFetchKayakGalleryUrls
  - storageFetchLifejacketUrl

## `public/core/module_stub.js`

- kind: `frontend_other`
- lines: 32
- size_bytes: 742
- keywords:
  - setup
  - role
  - sync
- exports:
  - createGenericModule
- symbols:
  - createGenericModule
  - escapeHtml

## `public/core/modules_registry.js`

- kind: `frontend_other`
- lines: 146
- size_bytes: 4724
- keywords:
  - admin
  - setup
  - gear
  - kayak
  - reservation
  - godzinki
  - basen
  - km
  - ranking
  - map
  - role
- exports:
  - buildModulesFromSetup
- symbols:
  - buildModulesFromSetup
  - resolveModuleType

## `public/core/render_shell.js`

- kind: `frontend_other`
- lines: 976
- size_bytes: 39218
- warnings:
  - large file: 976 lines
- keywords:
  - admin
  - setup
  - gear
  - kayak
  - reservation
  - godzinki
  - basen
  - events
  - km
  - member
  - role
  - sync
- exports:
  - renderNav
  - renderView
  - spinnerHtml
- symbols:
  - basenEnabledTile
  - basenModule
  - buildHomeBasenSection
  - buildHomeEventsSection
  - buildHomeHoursCell
  - buildHomeReservationsSection
  - buildKayakTitle
  - countReservationDays
  - escapeHtml
  - fieldErrorToPl
  - formatDatePL
  - formatDayMonth
  - getDashboardConfig
  - getGearRoute
  - getHelloName
  - getHoursValue
  - getMembershipPaidUntil
  - getModuleRouteByLabelOrId
  - getModuleRouteByType
  - getReservationKayakTitles
  - isIsoDateYYYYMMDD
  - isPhoneValid
  - loadAdminPendingBadge
  - normalizePhoneDigits
  - pluralizeDays
  - renderHomeDashboard
  - renderHomeProfile
  - renderNav
  - renderProfileForm
  - renderView
- route/api hints:
  - /api/admin/pending
  - /api/basen/sessions
  - /api/events
  - /api/gear/kayaks
  - /api/gear/my-reservations
  - /api/gear/reservations/cancel
  - /api/godzinki
  - /api/register

## `public/core/router.js`

- kind: `frontend_other`
- lines: 13
- size_bytes: 387
- exports:
  - parseHash
  - setHash
- symbols:
  - parseHash
  - setHash

## `public/core/theme.js`

- kind: `frontend_other`
- lines: 46
- size_bytes: 1467
- keywords:
  - storage
- symbols:
  - applyTheme
  - getInitialTheme
  - initTheme
  - toggleTheme
  - updateToggleUi

## `public/core/user_error_messages.js`

- kind: `frontend_other`
- lines: 135
- size_bytes: 4035
- keywords:
  - km
  - map
  - index
- exports:
  - mapUserFacingApiError
  - parseApiErrorMessage
- symbols:
  - joinPrefix
  - mapUserFacingApiError
  - parseApiErrorMessage

## `public/index.html`

- kind: `frontend_other`
- lines: 52
- size_bytes: 2120
- keywords:
  - godzinki
  - status
  - index

## `public/manifest.json`

- kind: `frontend_other`
- lines: 26
- size_bytes: 552

## `public/map.html`

- kind: `frontend_other`
- lines: 217
- size_bytes: 7489
- keywords:
  - auth
  - events
  - map
  - storage
  - status
  - index
- symbols:
  - buildPopup
  - esc
  - getConfig
  - initMap
  - renderMarkers
  - usersHtml
- route/api hints:
  - /api/km/map-data

## `public/modules/admin_pending_module.js`

- kind: `frontend_module`
- lines: 284
- size_bytes: 13723
- keywords:
  - admin
  - kayak
  - godzinki
  - events
  - calendar
  - map
  - sync
  - job
  - email
- exports:
  - createAdminPendingModule
- symbols:
  - createAdminPendingModule
  - escapeHtml
  - formatDatePL
  - load
  - renderContent
  - setErr
- route/api hints:
  - /api/admin/events/sync-calendar
  - /api/admin/pending

## `public/modules/basen_module.js`

- kind: `frontend_module`
- lines: 620
- size_bytes: 24162
- warnings:
  - large file: 620 lines
- keywords:
  - admin
  - basen
  - map
  - status
- exports:
  - createBasenModule
- symbols:
  - bindAdminActions
  - bindSessionActions
  - canEnroll
  - createBasenModule
  - esc
  - formatDate
  - karnetStatusLabel
  - renderAdminView
  - renderKarnetView
  - renderSessionCard
  - renderSessionsView
  - renderTabsHtml
  - setCancelErr
  - setCancelOk
  - setCreateErr
  - setCreateOk
  - setGrantErr
  - setGrantOk
  - spinnerHtml
  - todayIso
- route/api hints:
  - /api/basen/cancel-enrollment
  - /api/basen/enroll
  - /api/basen/karnety
  - /api/basen/karnety/grant
  - /api/basen/sessions
  - /api/basen/sessions/cancel
  - /api/basen/sessions/create

## `public/modules/gear_module.js`

- kind: `frontend_module`
- lines: 2153
- size_bytes: 90416
- warnings:
  - large file: 2153 lines
- keywords:
  - gear
  - kayak
  - reservation
  - map
  - storage
  - role
  - sync
- exports:
  - createGearModule
- symbols:
  - applyFilter
  - buildGenericGearDetailsRows
  - buildGenericGearTitle
  - buildHelmetLine2
  - buildHelmetLine3
  - buildKayakDetailsRows
  - buildKayakTitle
  - buildLifejacketLine2
  - buildLifejacketLine3
  - checkBundleAvailability
  - clearBundleModal
  - clearReservationForm
  - clearReservationMessages
  - closeBundleModal
  - closeModal
  - closeReservationModal
  - createGearModule
  - dotsIconSvg
  - escapeAttr
  - escapeHtml
  - formatDatePLFromIso
  - gearTabIcon
  - heartSvg
  - isWorking
  - loadAndRenderReservations
  - loadFavorites
  - loadGear
  - lockIconSvg
  - normalizeSimpleValue
  - normalizeTypeValue
- route/api hints:
  - /api/gear/favorites
  - /api/gear/favorites/toggle
  - /api/gear/items/availability
  - /api/gear/kayak-reservations
  - /api/gear/kayaks
  - /api/gear/reservations/create
  - /api/gear/reservations/create-bundle

## `public/modules/godzinki_module.js`

- kind: `frontend_module`
- lines: 391
- size_bytes: 14112
- keywords:
  - reservation
  - godzinki
  - map
  - sync
- exports:
  - createGodzinkiModule
- symbols:
  - buildMeta
  - createGodzinkiModule
  - esc
  - formatBalanceSign
  - formatDate
  - infoBarHtml
  - recordTypeClass
  - recordTypeLabel
  - renderGodzinkiView
  - renderHistoryView
  - renderHomeView
  - renderPage
  - renderRecordTable
  - renderSubmitView
  - renderTabsHtml
  - setErr
  - setOk
  - shortenReason
  - spinnerHtml
  - todayIso
- route/api hints:
  - /api/godzinki
  - /api/godzinki/submit

## `public/modules/impreza_module.js`

- kind: `frontend_module`
- lines: 284
- size_bytes: 10132
- keywords:
  - events
  - map
  - sync
- exports:
  - createImprezaModule
- symbols:
  - activeTab
  - bindSubmitForm
  - canSubmit
  - createImprezaModule
  - esc
  - formatDate
  - getVal
  - renderEventCard
  - renderListView
  - renderSubmitFormHtml
  - renderTabsHtml
  - setErr
  - setOk
  - spinnerHtml
  - todayIso
- route/api hints:
  - /api/events
  - /api/events/submit

## `public/modules/km_module.js`

- kind: `frontend_module`
- lines: 1082
- size_bytes: 42047
- warnings:
  - large file: 1082 lines
- keywords:
  - basen
  - events
  - km
  - ranking
  - map
- exports:
  - createKmModule
- symbols:
  - attachInfoTips
  - attachPlacesAutocomplete
  - buildPopup
  - capsizeTotal
  - closePopover
  - closeSuggestions
  - createKmModule
  - esc
  - fmtNum
  - formatDate
  - infoTip
  - loadLeaflet
  - loadRanking
  - rankMedal
  - renderEventStatsView
  - renderFormView
  - renderKmView
  - renderMapView
  - renderMarkers
  - renderMyLogsView
  - renderMyStatsView
  - renderRankingsView
  - setErr
  - setOk
  - showSuggestions
  - spinnerHtml
  - todayIso
  - updateDifficultyField
  - usersHtml
  - waterTypeLabel
- route/api hints:
  - /api/events
  - /api/km/event-stats
  - /api/km/log/add
  - /api/km/logs
  - /api/km/map-data
  - /api/km/places
  - /api/km/rankings
  - /api/km/stats

## `public/modules/my_reservations_module.js`

- kind: `frontend_module`
- lines: 603
- size_bytes: 23084
- warnings:
  - large file: 603 lines
- keywords:
  - gear
  - kayak
  - reservation
  - map
  - role
  - sync
- exports:
  - createMyReservationsModule
- symbols:
  - buildKayakTitle
  - closeEditModal
  - countReservationDays
  - createMyReservationsModule
  - escapeAttr
  - escapeHtml
  - formatDatePL
  - formatDayMonth
  - getReservationKayakTitles
  - loadKayakMap
  - loadReservations
  - openEditModal
  - pluralizeDays
  - renderDedicatedEditView
  - renderReservations
  - setCancelRsvErr
  - setEditErr
  - setEditOk
  - setErr
  - setOk
  - submitCancelReservation
  - submitUpdateReservation
- route/api hints:
  - /api/gear/kayaks
  - /api/gear/my-reservations
  - /api/gear/reservations/cancel
  - /api/gear/reservations/update

## `public/styles/app.css`

- kind: `frontend_other`
- lines: 9
- size_bytes: 227
- keywords:
  - gear
  - godzinki
  - basen
  - events
  - km

## `public/styles/base.css`

- kind: `frontend_other`
- lines: 440
- size_bytes: 9623
- keywords:
  - index

## `public/styles/basen.css`

- kind: `frontend_other`
- lines: 266
- size_bytes: 4666
- keywords:
  - admin
  - basen

## `public/styles/dashboard.css`

- kind: `frontend_other`
- lines: 162
- size_bytes: 2708
- keywords:
  - events

## `public/styles/events.css`

- kind: `frontend_other`
- lines: 143
- size_bytes: 2366
- keywords:
  - events

## `public/styles/gear.css`

- kind: `frontend_other`
- lines: 1169
- size_bytes: 20867
- warnings:
  - large file: 1169 lines
- keywords:
  - gear
  - events

## `public/styles/godzinki.css`

- kind: `frontend_other`
- lines: 120
- size_bytes: 1997
- keywords:
  - godzinki

## `public/styles/km.css`

- kind: `frontend_other`
- lines: 456
- size_bytes: 9374
- warnings:
  - large file: 456 lines
- keywords:
  - km
  - ranking
  - index

## `public/styles/start.css`

- kind: `frontend_other`
- lines: 206
- size_bytes: 5071
- keywords:
  - events

## `public/sw.js`

- kind: `frontend_other`
- lines: 147
- size_bytes: 4997
- keywords:
  - auth
  - admin
  - gear
  - reservation
  - godzinki
  - basen
  - events
  - km
  - map
  - firestore
  - storage
  - index

