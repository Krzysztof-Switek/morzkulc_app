# Frontend Context

Files indexed here: 30

## `public/404.html`

- kind: `frontend_other`
- lines: 34
- size_bytes: 1808

## `public/core/access_control.js`

- kind: `frontend_other`
- lines: 33
- size_bytes: 1298
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
- lines: 234
- size_bytes: 7220
- keywords:
  - auth
  - setup
  - storage
  - role
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
- lines: 136
- size_bytes: 4201
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
- lines: 838
- size_bytes: 30883
- warnings:
  - large file: 838 lines
- keywords:
  - setup
  - gear
  - kayak
  - reservation
  - godzinki
  - basen
  - events
  - map
  - member
  - role
  - status
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
  - getGearRoute
  - getHelloName
  - getHoursValue
  - getMembershipPaidUntil
  - getModuleRouteByLabelOrId
  - getModuleRouteByType
  - getReservationKayakTitles
  - isIsoDateYYYYMMDD
  - isPhoneValid
  - normalizePhoneDigits
  - openGear
  - pluralizeDays
  - renderHomeDashboard
  - renderNav
  - renderProfileForm
  - renderView
  - roleKeyToLabel
  - setErr
- route/api hints:
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
- lines: 49
- size_bytes: 1712
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
- lines: 110
- size_bytes: 3834
- keywords:
  - events
  - km
  - map
  - status
  - sync
  - index
- symbols:
  - esc
  - fmtNum
  - usersHtml
- route/api hints:
  - /api/km/map-data

## `public/modules/admin_pending_module.js`

- kind: `frontend_module`
- lines: 164
- size_bytes: 6707
- keywords:
  - admin
  - gear
  - godzinki
  - events
  - map
  - sync
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
  - /api/admin/pending

## `public/modules/basen_module.js`

- kind: `frontend_module`
- lines: 624
- size_bytes: 24330
- warnings:
  - large file: 624 lines
- keywords:
  - admin
  - basen
  - map
  - role
  - status
- exports:
  - createBasenModule
- symbols:
  - bindAdminActions
  - bindSessionActions
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
- lines: 1984
- size_bytes: 82139
- warnings:
  - large file: 1984 lines
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
- lines: 373
- size_bytes: 13981
- keywords:
  - godzinki
  - map
  - sync
- exports:
  - createGodzinkiModule
- symbols:
  - createGodzinkiModule
  - esc
  - formatBalanceSign
  - formatDate
  - recordTypeClass
  - recordTypeLabel
  - renderBalanceView
  - renderGodzinkiView
  - renderHistoryView
  - renderSubmitView
  - renderTabsHtml
  - setErr
  - setOk
  - spinnerHtml
  - todayIso
- route/api hints:
  - /api/godzinki
  - /api/godzinki/submit

## `public/modules/impreza_module.js`

- kind: `frontend_module`
- lines: 287
- size_bytes: 10285
- keywords:
  - admin
  - events
  - map
  - role
  - sync
- exports:
  - createImprezaModule
- symbols:
  - activeTab
  - bindSubmitForm
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
- lines: 1038
- size_bytes: 39878
- warnings:
  - large file: 1038 lines
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
  - renderMyLogsView
  - renderMyStatsView
  - renderRankingsView
  - setErr
  - setOk
  - showSuggestions
  - spinnerHtml
  - todayIso
  - updateDifficultyField
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
- lines: 8
- size_bytes: 196
- keywords:
  - gear
  - basen
  - events
  - km

## `public/styles/base.css`

- kind: `frontend_other`
- lines: 422
- size_bytes: 9226
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
- lines: 1152
- size_bytes: 20743
- warnings:
  - large file: 1152 lines
- keywords:
  - gear
  - events

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
- lines: 176
- size_bytes: 2724

## `public/sw.js`

- kind: `frontend_other`
- lines: 146
- size_bytes: 4923
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

