# Routes and Firebase Functions

Use this file first for endpoint/API/function tasks.

## Firebase hosting rewrites

- /api/admin/setup -> function:{'functionId': 'adminPutSetup', 'region': 'us-central1'}
- /api/basen/admin/godziny/add -> function:{'functionId': 'basenAdminAddGodziny', 'region': 'us-central1'}
- /api/basen/admin/godziny/correct -> function:{'functionId': 'basenAdminCorrectGodziny', 'region': 'us-central1'}
- /api/basen/admin/users -> function:{'functionId': 'basenAdminSearchUsers', 'region': 'us-central1'}
- /api/basen/cancel-enrollment -> function:{'functionId': 'basenCancelEnrollment', 'region': 'us-central1'}
- /api/basen/enroll -> function:{'functionId': 'basenEnroll', 'region': 'us-central1'}
- /api/basen/godziny -> function:{'functionId': 'getBasenGodziny', 'region': 'us-central1'}
- /api/basen/karnety -> function:{'functionId': 'getBasenKarnety', 'region': 'us-central1'}
- /api/basen/karnety/grant -> function:{'functionId': 'basenGrantKarnet', 'region': 'us-central1'}
- /api/basen/sessions -> function:{'functionId': 'getBasenSessions', 'region': 'us-central1'}
- /api/basen/sessions/cancel -> function:{'functionId': 'basenCancelSession', 'region': 'us-central1'}
- /api/basen/sessions/create -> function:{'functionId': 'basenCreateSession', 'region': 'us-central1'}
- /api/events -> function:{'functionId': 'getEvents', 'region': 'us-central1'}
- /api/events/submit -> function:{'functionId': 'submitEvent', 'region': 'us-central1'}
- /api/gear/favorites -> function:{'functionId': 'getGearFavorites', 'region': 'us-central1'}
- /api/gear/favorites/toggle -> function:{'functionId': 'gearFavoriteToggle', 'region': 'us-central1'}
- /api/gear/items -> function:{'functionId': 'getGearItems', 'region': 'us-central1'}
- /api/gear/items/availability -> function:{'functionId': 'getGearItemAvailability', 'region': 'us-central1'}
- /api/gear/kayak-reservations -> function:{'functionId': 'getKayakReservations', 'region': 'us-central1'}
- /api/gear/kayaks -> function:{'functionId': 'getGearKayaks', 'region': 'us-central1'}
- /api/gear/my-reservations -> function:{'functionId': 'getGearMyReservations', 'region': 'us-central1'}
- /api/gear/reservations/cancel -> function:{'functionId': 'cancelGearReservation', 'region': 'us-central1'}
- /api/gear/reservations/create -> function:{'functionId': 'createGearReservation', 'region': 'us-central1'}
- /api/gear/reservations/create-bundle -> function:{'functionId': 'createBundleGearReservation', 'region': 'us-central1'}
- /api/gear/reservations/update -> function:{'functionId': 'updateGearReservation', 'region': 'us-central1'}
- /api/godzinki -> function:{'functionId': 'getGodzinki', 'region': 'us-central1'}
- /api/godzinki/purchase -> function:{'functionId': 'purchaseGodzinki', 'region': 'us-central1'}
- /api/godzinki/submit -> function:{'functionId': 'submitGodzinki', 'region': 'us-central1'}
- /api/km/event-stats -> function:{'functionId': 'kmEventStats', 'region': 'us-central1'}
- /api/km/log/add -> function:{'functionId': 'kmAddLog', 'region': 'us-central1'}
- /api/km/logs -> function:{'functionId': 'kmMyLogs', 'region': 'us-central1'}
- /api/km/map-data -> function:{'functionId': 'kmMapData', 'region': 'us-central1'}
- /api/km/places -> function:{'functionId': 'kmPlaces', 'region': 'us-central1'}
- /api/km/rankings -> function:{'functionId': 'kmRankings', 'region': 'us-central1'}
- /api/km/stats -> function:{'functionId': 'kmMyStats', 'region': 'us-central1'}
- /api/register -> function:{'functionId': 'registerUser', 'region': 'us-central1'}
- /api/setup -> function:{'functionId': 'getSetup', 'region': 'us-central1'}

## Files with route/function hints

### `ai_full_audit_report.json`
- kind: `config`
- lines: 18606
- routes/api strings:
  - /api/**
  - /api/**\
  - /api/admin/setup
  - /api/admin/setup\
  - /api/gear/items
  - /api/gear/items\
  - /api/gear/kayaks
  - /api/gear/kayaks\
  - /api/gear/my-reservations
  - /api/gear/my-reservations\
  - /api/gear/reservations/cancel
  - /api/gear/reservations/cancel\
  - /api/gear/reservations/create
  - /api/gear/reservations/create\
  - /api/gear/reservations/update
  - /api/gear/reservations/update\
  - /api/register
  - /api/register\
  - /api/setup
  - /api/setup\
- firebase function hints:
  - adminPutSetup
  - adminRunServiceTask
  - getSetup
  - onRequest

### `firebase.json`
- kind: `firebase_config`
- lines: 351
- routes/api strings:
  - /api/admin/setup
  - /api/basen/admin/godziny/add
  - /api/basen/admin/godziny/correct
  - /api/basen/admin/users
  - /api/basen/cancel-enrollment
  - /api/basen/enroll
  - /api/basen/godziny
  - /api/basen/karnety
  - /api/basen/karnety/grant
  - /api/basen/sessions
  - /api/basen/sessions/cancel
  - /api/basen/sessions/create
  - /api/events
  - /api/events/submit
  - /api/gear/favorites
  - /api/gear/favorites/toggle
  - /api/gear/items
  - /api/gear/items/availability
  - /api/gear/kayak-reservations
  - /api/gear/kayaks
  - /api/gear/my-reservations
  - /api/gear/reservations/cancel
  - /api/gear/reservations/create
  - /api/gear/reservations/create-bundle
  - /api/gear/reservations/update
  - /api/godzinki
  - /api/godzinki/purchase
  - /api/godzinki/submit
  - /api/km/event-stats
  - /api/km/log/add

### `functions/node_modules/@google-cloud/firestore/build/src/v1/firestore_admin_client.js`
- kind: `other`
- lines: 1833
- firebase function hints:
  - onRequest

### `functions/node_modules/@google-cloud/secret-manager/build/protos/protos.js`
- kind: `other`
- lines: 44311
- firebase function hints:
  - onRequest

### `functions/node_modules/@protobufjs/fetch/tests/index.js`
- kind: `test`
- lines: 17
- routes/api strings:
  - NOTFOUND

### `functions/node_modules/@types/express-serve-static-core/index.d.ts`
- kind: `other`
- lines: 1282
- routes/api strings:
  - GET /user/:uid/photos/:file
  - GET foo

### `functions/node_modules/@types/node/test.d.ts`
- kind: `test`
- lines: 2164
- routes/api strings:
  - some/uri

### `functions/node_modules/express/lib/request.js`
- kind: `other`
- lines: 526
- routes/api strings:
  - GET subdomain offset
  - GET trust proxy fn

### `functions/node_modules/express/lib/response.js`
- kind: `other`
- lines: 1180
- routes/api strings:
  - GET /user/:uid/photos/:file
  - GET etag fn
  - GET json escape
  - GET json replacer
  - GET json spaces
  - GET jsonp callback name

### `functions/node_modules/firebase-functions/lib/bin/firebase-functions.js`
- kind: `other`
- lines: 94
- routes/api strings:
  - GET /__/functions.yaml
  - GET /__/quitquitquit
  - POST /__/quitquitquit

### `functions/node_modules/firebase-functions/lib/v1/providers/https.d.ts`
- kind: `other`
- lines: 17
- firebase function hints:
  - onRequest

### `functions/node_modules/firebase-functions/lib/v1/providers/https.js`
- kind: `other`
- lines: 92
- firebase function hints:
  - onRequest

### `functions/node_modules/firebase-functions/lib/v2/providers/https.d.ts`
- kind: `other`
- lines: 241
- firebase function hints:
  - onRequest

### `functions/node_modules/firebase-functions/lib/v2/providers/https.js`
- kind: `other`
- lines: 222
- firebase function hints:
  - onRequest

### `functions/node_modules/google-gax/build/src/longRunningCalls/longrunning.js`
- kind: `other`
- lines: 280
- firebase function hints:
  - onRequest

### `functions/node_modules/googleapis/build/src/apis/cloudtasks/v2beta2.js`
- kind: `other`
- lines: 922
- routes/api strings:
  - /api/queue/update

### `functions/node_modules/node-forge/dist/forge.all.min.js`
- kind: `other`
- lines: 2
- firebase function hints:
  - onRequest

### `functions/node_modules/node-forge/dist/forge.min.js`
- kind: `other`
- lines: 2
- firebase function hints:
  - onRequest

### `functions/node_modules/node-forge/lib/x509.js`
- kind: `other`
- lines: 3243
- firebase function hints:
  - onRequest

### `functions/node_modules/path-scurry/node_modules/lru-cache/dist/commonjs/index.d.ts`
- kind: `other`
- lines: 1277
- routes/api strings:
  - https://example.com/
  - key

### `functions/node_modules/path-scurry/node_modules/lru-cache/dist/esm/index.d.ts`
- kind: `other`
- lines: 1277
- routes/api strings:
  - https://example.com/
  - key

### `functions/node_modules/undici-types/fetch.d.ts`
- kind: `other`
- lines: 210
- routes/api strings:
  - ...

### `functions/src/index.ts`
- kind: `backend_other`
- lines: 1065
- firebase function hints:
  - adminPutSetup
  - basenAdminAddGodziny
  - basenAdminCorrectGodziny
  - basenAdminSearchUsers
  - basenCancelEnrollment
  - basenCancelSession
  - basenCreateSession
  - basenEnroll
  - basenGrantKarnet
  - cancelGearReservation
  - createBundleGearReservation
  - createGearReservation
  - gearFavoriteToggle
  - getAdminPending
  - getBasenGodziny
  - getBasenKarnety
  - getBasenSessions
  - getEvents
  - getGearFavorites
  - getGearItemAvailability
  - getGearItems
  - getGearKayaks
  - getGearMyReservations
  - getGodzinki
  - getKayakReservations
  - getSetup
  - kmAddLog
  - kmEventStats
  - kmMapData
  - kmMyLogs

### `functions/src/service/admin/adminRunTask.ts`
- kind: `service_task`
- lines: 51
- firebase function hints:
  - adminRunServiceTask
  - onRequest

### `functions/src/service/providers/googleAuth.ts`
- kind: `service_task`
- lines: 136
- routes/api strings:
  - https://oauth2.googleapis.com/token

### `project_optimization_snapshot.py`
- kind: `other`
- lines: 2383
- routes/api strings:
  - /api/gear/items
  - /api/gear/kayaks
  - /api/register
  - /api/setup
- firebase function hints:
  - onRequest

### `project_snapshot.py`
- kind: `other`
- lines: 1497
- routes/api strings:
  - /api/gear/items
  - /api/gear/kayaks
  - /api/register
  - /api/setup
- firebase function hints:
  - onRequest

### `public/core/app_shell.js`
- kind: `frontend_other`
- lines: 234
- routes/api strings:
  - /api/register
  - /api/setup

### `public/core/render_shell.js`
- kind: `frontend_other`
- lines: 838
- routes/api strings:
  - /api/basen/sessions
  - /api/events
  - /api/gear/kayaks
  - /api/gear/my-reservations
  - /api/gear/reservations/cancel
  - /api/godzinki
  - /api/register

### `public/map.html`
- kind: `frontend_other`
- lines: 110
- routes/api strings:
  - /api/km/map-data

### `public/modules/admin_pending_module.js`
- kind: `frontend_module`
- lines: 164
- routes/api strings:
  - /api/admin/pending

### `public/modules/basen_module.js`
- kind: `frontend_module`
- lines: 624
- routes/api strings:
  - /api/basen/cancel-enrollment
  - /api/basen/enroll
  - /api/basen/karnety
  - /api/basen/karnety/grant
  - /api/basen/sessions
  - /api/basen/sessions/cancel
  - /api/basen/sessions/create

### `public/modules/gear_module.js`
- kind: `frontend_module`
- lines: 1984
- routes/api strings:
  - /api/gear/favorites
  - /api/gear/favorites/toggle
  - /api/gear/items/availability
  - /api/gear/kayak-reservations
  - /api/gear/kayaks
  - /api/gear/reservations/create
  - /api/gear/reservations/create-bundle

### `public/modules/godzinki_module.js`
- kind: `frontend_module`
- lines: 373
- routes/api strings:
  - /api/godzinki
  - /api/godzinki/submit

### `public/modules/impreza_module.js`
- kind: `frontend_module`
- lines: 287
- routes/api strings:
  - /api/events
  - /api/events/submit

### `public/modules/km_module.js`
- kind: `frontend_module`
- lines: 1038
- routes/api strings:
  - /api/events
  - /api/km/event-stats
  - /api/km/log/add
  - /api/km/logs
  - /api/km/map-data
  - /api/km/places
  - /api/km/rankings
  - /api/km/stats

### `public/modules/my_reservations_module.js`
- kind: `frontend_module`
- lines: 603
- routes/api strings:
  - /api/gear/kayaks
  - /api/gear/my-reservations
  - /api/gear/reservations/cancel
  - /api/gear/reservations/update

### `tests/e2e/phases/phase_A_suspended_user.py`
- kind: `test`
- lines: 122
- routes/api strings:
  - /api/register
  - /api/setup

### `tests/test_pwa.py`
- kind: `test`
- lines: 375
- routes/api strings:
  - /api/ musi byc wykluczone z cache.

### `tools/build_project_context.py`
- kind: `tooling`
- lines: 673
- firebase function hints:
  - onRequest

