# Audyt systemu rejestracji użytkowników, uprawnień i grup

**Data audytu**: 2026-04-09  
**Środowisko**: PROD (`morzkulc-e9df7`)  
**Status**: W TRAKCIE — IAM blocked, pipeline niedziałający

---

## 1. Mapa przepływu systemu

```
POST /api/register (app_shell: {hello:"world"})
  → registerUserHandler.ts: upsert users_active/{uid}
  → [NOWY USER] onUsersActiveCreated trigger (onUsersActiveCreated.ts)
      → service_jobs/welcome:{uid} (taskId: onUserRegistered.welcome)
      → onUserRegisteredWelcomeTask.run():
          B) addMemberToGroup(lista@morzkulc.pl, userEmail)
          C) addMemberToGroup(czlonkowie@morzkulc.pl) — jeśli rola w MEMBER_LEVEL_ROLES
          A) sendWelcomeEmail(admin@morzkulc.pl → userEmail)
          D) syncRoleMappingGroups z setup/app.roleMappings

POST /api/register (formularz profilu: {firstName, lastName, ...})
  → registerUserHandler.ts: profileComplete=True
  → await enqueueMemberSheetSync(uid)   ← WAŻNE: jest await (fix z 2026-04-06)
      → service_jobs/{random} (taskId: members.syncToSheet)
      → membersSyncToSheetTask.run():
          → ensureMemberId (Firestore counter → users_active.memberId)
          → GoogleSheetsProvider.upsertMemberRowById()
              → wpisuje wiersz do arkusza: ID, e-mail, imię, nazwisko, Rola, Status, ...

ADMIN: edycja arkusza → ręczny trigger users.syncRolesFromSheet
  → usersSyncRolesFromSheetTask.run():
      → czyta Rola/Status z arkusza (mapuje przez buildInvertedLabelMap)
      → update users_active/{uid}.role_key i status_key
      → syncWorkspaceGroupsForUser (jeśli setup/app.roleMappings skonfigurowane)

KAŻDA operacja Workspace/Sheets używa getDelegatedAuth():
  → IAM Credentials API: signJwt AS firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com
  → JWT z sub: admin@morzkulc.pl (domain-wide delegation)
  → exchange JWT → access token → API call
```

---

## 2. Krytyczne pliki systemu

| Plik | Rola |
|---|---|
| `functions/src/service/providers/googleAuth.ts` | **SERCE AUTH** — signJwt + JWT exchange, jedyne miejsce DWD |
| `functions/src/service/tasks/membersSyncToSheet.ts` | sync użytkownika do arkusza Sheets |
| `functions/src/service/tasks/onUserRegisteredWelcome.ts` | email powitalny + grupy Workspace po rejestracji |
| `functions/src/service/tasks/usersSyncRolesFromSheet.ts` | sync ról z arkusza do Firestore + grupy |
| `functions/src/service/providers/googleWorkspaceProvider.ts` | Directory API + Gmail API |
| `functions/src/service/providers/googleSheetsProvider.ts` | Sheets API + upsertMemberRowById |
| `functions/src/service/triggers/onUsersActiveCreated.ts` | trigger welcome job przy nowym users_active |
| `functions/src/service/worker/onJobCreatedWorker.ts` | trigger processJobDoc przy nowym service_job |
| `functions/src/service/worker/jobProcessor.ts` | claim + execute + retry logic |
| `functions/src/service/runner.ts` | rozwiązuje taskId → task.run() |
| `functions/src/service/registry.ts` | rejestr wszystkich tasków |
| `functions/.env.morzkulc-e9df7` | konfiguracja prod (SA email, sheet IDs) |
| `functions/src/index.ts` | eksporty funkcji, enqueueMemberSheetSync (~linia 645) |

---

## 3. Konfiguracja prod (`.env.morzkulc-e9df7`)

```
ENV_NAME=prod
SVC_WORKSPACE_DELEGATED_SUBJECT=admin@morzkulc.pl
SVC_MEMBERS_SHEET_ID=1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM
SVC_MEMBERS_SHEET_TAB=członkowie i sympatycy
SVC_WORKSPACE_SA_EMAIL=firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com
SVC_MEMBERS_GROUP_EMAIL=czlonkowie@morzkulc.pl
```

**UWAGA**: `firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com` to SA z projektu DEV (`sprzet-skk-morzkulc`), używany przez PROD (`morzkulc-e9df7`). To wymaga cross-project IAM.

---

## 4. Zidentyfikowane problemy

### PROBLEM 1 — KRYTYCZNY: IAM signJwt permission denied
**Status**: POTWIERDZONY z job doc w Firestore  
**Błąd**: `Permission 'iam.serviceAccounts.signJwt' denied on resource`  
**Przyczyna**: Cloud Run SA projektu `morzkulc-e9df7` nie ma uprawnień `iam.serviceAccounts.signJwt` na SA `firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com` (cross-project).  
**Blokuje**: WSZYSTKIE operacje Workspace i Sheets — cały pipeline nie działa.

### PROBLEM 2 — DO WERYFIKACJI: Domain-Wide Delegation
**Status**: NIEPOTWIERDZONY — wymaga ręcznej weryfikacji w Admin Console  
**Co sprawdzić**: Czy `firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com` ma skonfigurowane DWD w Google Workspace Admin Console z WSZYSTKIMI wymaganymi zakresami.

**Wymagane zakresy DWD**:
```
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/admin.directory.group.member
https://www.googleapis.com/auth/admin.directory.group
https://www.googleapis.com/auth/apps.groups.settings
https://www.googleapis.com/auth/gmail.send
```

### PROBLEM 3 — DO WERYFIKACJI: iamcredentials API włączone?
**Status**: NIEPOTWIERDZONY  
**Co sprawdzić**: Czy `iamcredentials.googleapis.com` jest włączone w projekcie `morzkulc-e9df7`.

### PROBLEM 4 — ZNANY: MEMBER_LEVEL_ROLES hardcoded
**Status**: ZNANY, niekrytyczny  
**Plik**: `onUserRegisteredWelcome.ts` ~linia 18-22  
**Problem**: `new Set(["rola_czlonek", "rola_zarzad", "rola_kr"])` — hardcoded, nie czyta z setup/app.

### PROBLEM 5 — ZNANY: Brak SVC_GEAR_KAYAKS_SHEET_ID w prod env
**Status**: ZNANY, niekrytyczny  
**Problem**: Kod używa DEV sheet ID z hardcoded default w `service_config.ts:83`.

### PROBLEM 6 — ZNANY: Timeout job poll w testach za krótki
**Status**: ZNANY  
**Problem**: E2E poll_job timeout = 60s. Cold start Cloud Run może trwać dłużej.  
**Fix**: zmienić na 120s w `config.py`.

---

## 5. Plan naprawy (kolejność)

### Krok 1 — Znajdź Cloud Run SA projektu prod
```bash
gcloud functions describe onServiceJobCreated \
  --region=us-central1 --project=morzkulc-e9df7 --gen2 \
  --format="value(serviceConfig.serviceAccountEmail)"
```
Zapisz wynik jako `PROD_RUN_SA`.

### Krok 2 — Włącz iamcredentials API w prod
```bash
gcloud services list --project=morzkulc-e9df7 --enabled \
  --filter="name:iamcredentials.googleapis.com"
# Jeśli brak:
gcloud services enable iamcredentials.googleapis.com --project=morzkulc-e9df7
```

### Krok 3 — Sprawdź obecne IAM bindingi na firebase-sync@ SA
```bash
gcloud iam service-accounts get-iam-policy \
  firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com \
  --project=sprzet-skk-morzkulc
```

### Krok 4 — Nadaj uprawnienie signJwt (cross-project)
```bash
gcloud iam service-accounts add-iam-policy-binding \
  firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com \
  --project=sprzet-skk-morzkulc \
  --member="serviceAccount:<PROD_RUN_SA>" \
  --role="roles/iam.serviceAccountTokenCreator"
```

### Krok 5 — Zweryfikuj DWD w Google Workspace Admin Console
Ścieżka: Admin Console → Security → API Controls → Domain-wide Delegation  
Sprawdź: czy `firebase-sync@sprzet-skk-morzkulc.iam.gserviceaccount.com` (Client ID numeryczny) ma wszystkie 5 zakresów z Problemu 2.  
Jeśli brak — dodaj wpis z wszystkimi zakresami w jednej linii (przecinek-lista).

### Krok 6 — Test pojedynczego joba (weryfikacja bez E2E)
Po krokach 1-5, wpisz ręcznie do Firestore Console (`service_jobs/{nowy_doc}`):
```json
{
  "taskId": "members.syncToSheet",
  "payload": { "uid": "<uid_użytkownika_z_kompletnym_profilem>" },
  "status": "queued",
  "attempts": 0,
  "createdAt": "<now>",
  "updatedAt": "<now>",
  "nextRunAt": "<now>",
  "lockedUntil": null,
  "lockOwner": null
}
```
Obserwuj status — powinien przejść na "done" w ciągu ~30s.

### Krok 7 — Pełny E2E test
```bash
cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e
ENV=prod python run_e2e.py
```

---

## 6. Wymagana struktura arkusza Sheets

Zakładka `członkowie i sympatycy` — wiersz 1 musi zawierać (case-sensitive):

```
ID | e-mail | imię | nazwisko | ksywa | telefon | data urodzenia | Rola | Status | Zgody RODO | data rejestracji
```

`upsertMemberRowById` używa kolumny `ID` jako klucza głównego.  
Kolumny nieznane w `rowPatch` są ignorowane (zachowane bez zmian).

---

## 7. Wyniki testu E2E z 2026-04-09

| Faza | Status | Przyczyna |
|---|---|---|
| P0 Pre-flight | PASS | — |
| P1 Rejestracja + Sheets | ERROR | Job timeout 60s — IAM blocked |
| P2 Zmiana roli | ERROR | Kaskada z P1 |
| P3 Grant godzinki | PASS | Direct Firestore write — niezależne |
| P4 Rezerwacja | ERROR | Użytkownik ma rola_sympatyk (P2 nie zadziałał) → 400 |
| P5-P7 Limity/Cancel/Drain | SKIP | Kaskada z P4 |
| P8 Sheets sync | ERROR | Job timeout 60s — IAM blocked |
| P9 Cleanup | PASS | — |

**Root cause wszystkich błędów**: Problem 1 (IAM signJwt).

---

## 8. Następne kroki po naprawie IAM

- [ ] Krok 1-4: IAM fix (gcloud)
- [ ] Krok 5: DWD weryfikacja (Admin Console)
- [ ] Krok 6: Test pojedynczego joba
- [ ] Krok 7: Pełny E2E run
- [ ] Opcjonalnie: zwiększyć timeout job poll z 60s na 120s w `tests/e2e/config.py`
- [ ] Opcjonalnie: dodać SVC_GEAR_KAYAKS_SHEET_ID do `.env.morzkulc-e9df7`