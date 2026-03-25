# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SKK Morzkulc — a member management and gear reservation app for a kayak club. Firebase-hosted SPA with Cloud Functions backend, Google Workspace integration (Gmail, Groups, Sheets).

Two Firebase projects:
- `sprzet-skk-morzkulc` — dev/default
- `morzkulc-e9df7` — prod

## Commands

All function commands must be run from the `functions/` directory or with the `--prefix functions` flag.

```bash
# Build TypeScript (required before deploy)
npm --prefix functions run build

# Lint
npm --prefix functions run lint

# Watch mode (during development)
npm --prefix functions run build:watch

# Local emulator (builds first, then starts Firebase emulators)
npm --prefix functions run serve

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Switch active Firebase project
firebase use dev    # targets sprzet-skk-morzkulc
firebase use prod   # targets morzkulc-e9df7
```

`firebase deploy` runs lint + build automatically via `predeploy` hooks in `firebase.json`.

## Architecture

### Frontend (`public/`)

No build step — pure ES modules served directly by Firebase Hosting. No bundler, no npm for the frontend.

- Entry point: `public/index.html` → loads `public/core/app_shell.js`
- **Core layer** (`public/core/`): auth, API client, routing, shell rendering, module registry, theme
- **Modules layer** (`public/modules/`): feature modules loaded dynamically based on Firestore config

On login, `app_shell.js`:
1. Calls `POST /api/register` to upsert the user in Firestore
2. Calls `GET /api/setup` to fetch module configuration from `setup/app` Firestore doc
3. Builds module list via `buildModulesFromSetup()` in `modules_registry.js`
4. Renders nav and routes to the initial view via hash-based routing (`#/moduleId/route`)

Module `modul_2` is hardcoded as the gear/kayak rental module. When present, a `my_reservations` module is auto-injected.

### Backend (`functions/src/`)

TypeScript, compiled to `functions/lib/`. Firebase Functions v2, Node 24.

- **`index.ts`**: Declares all exported Cloud Functions, contains CORS/host allowlist middleware
- **`api/`**: HTTP handler functions (one file per endpoint), injected with deps from `index.ts`
- **`service/`**: Async job infrastructure + triggers

### Security model

All API functions use `invoker: "private"`. Every request verifies a Firebase ID token from the `Authorization: Bearer <token>` header. Additionally, requests are validated against `ALLOWED_HOSTS` and `ALLOWED_ORIGINS` allowlists defined in `index.ts`.

Admin operations (e.g. `POST /api/admin/setup`) additionally require `admin@morzkulc.pl`.

### Async job system (`functions/src/service/`)

A lightweight job queue backed by Firestore collection `service_jobs`:

- **Trigger**: `onServiceJobCreated` fires on any write to `service_jobs/{jobId}` and processes the job immediately
- **Fallback**: `serviceFallbackDaily` runs daily at 03:30 Warsaw time to retry any jobs stuck in `queued` status
- **Processing**: `jobProcessor.ts` claims a job via Firestore transaction, runs it, handles retries with backoff (`[30, 60, 120, 300, 900]` seconds), marks as `dead` after `maxAttempts`
- **Tasks**: registered in `service/registry.ts`, implemented under `service/tasks/`, each implements `ServiceTask` interface (`id`, `description`, `validate`, `run`)
- **Runner**: `service/runner.ts` resolves a task by ID and executes it with a `ServiceTaskContext` (Firestore, config, Google Workspace provider)

To add a new task: implement `ServiceTask`, add it to `registry.ts`.

### Firestore collections

| Collection | Purpose |
|---|---|
| `users_active/{uid}` | Registered users with role, status, profile |
| `users_opening_balance_26` | Pre-migration member data for role bootstrapping |
| `setup/app` | Module configuration (enabled modules, access rules) |
| `service_jobs/{jobId}` | Async job queue |
| `counters/members` | Auto-increment member ID counter |
| `gear_kayaks` | Kayak inventory (synced from Google Sheet) |
| `gear_reservations` | Gear reservations |

### User roles and statuses

Roles: `rola_sympatyk`, `rola_kandydat`, `rola_czlonek`, `rola_kr`, `rola_zarzad`, `rola_kursant`
Statuses: `status_aktywny`, `status_zawieszony`, `status_pending`
Admin roles (can trigger service tasks): `rola_zarzad`, `rola_kr`

New users are bootstrapped from `users_opening_balance_26` — if the user's email matches, they get `rola_czlonek` if `"członek stowarzyszenia" === true`, otherwise `rola_sympatyk`.

### Google Workspace integration

Uses domain-wide delegation: the service account impersonates `admin@morzkulc.pl` (configured via `SVC_WORKSPACE_DELEGATED_SUBJECT` env var). Used for:
- Sending welcome emails via Gmail API
- Adding new members to Google Groups (mailing list)
- Syncing member data to Google Sheets (members spreadsheet)
- Reading kayak inventory from Google Sheets

### Environment configuration

Functions read config from `process.env` via `service/service_config.ts`. Per-project env files in `functions/`:
- `.env.sprzet-skk-morzkulc` — dev overrides
- `.env.morzkulc-e9df7` — prod overrides

Key env vars: `ENV_NAME`, `SVC_WORKSPACE_DELEGATED_SUBJECT`, `SVC_MEMBERS_SHEET_ID`, `SVC_MEMBERS_SHEET_TAB`, `SVC_GEAR_KAYAKS_SHEET_ID`, `SVC_GEAR_KAYAKS_TAB`, `SVC_LISTA_GROUP_EMAIL`, `SVC_WELCOME_FROM_EMAIL`.

### API handler pattern

Each handler in `api/` receives a `deps` object injected from `index.ts` containing Firestore, admin SDK, and shared middleware functions. This makes handlers unit-testable without importing `index.ts`.

### ESLint

`functions/.eslintrc.js` uses Google style + TypeScript plugin. Notable rules:
- Double quotes required
- 2-space indent
- `max-len` disabled
- `@typescript-eslint/no-explicit-any` disabled
- In `service/**`: `camelcase` off (googleapis uses snake_case), linebreak-style off (Windows CRLF)