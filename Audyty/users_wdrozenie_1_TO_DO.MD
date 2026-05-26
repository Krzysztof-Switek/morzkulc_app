# TO-DO po wdrożeniu `users_wdrozenie_1.md`

Data: 2026-05-14

## Kontekst

Wdrożenie z `users_wdrozenie_1.md` wniosło zmiany do kodu (Krok 1–4), które zostały zbudowane i wdrożone (`firebase deploy`). Pozostał **Krok 0** — jednorazowe ustawienie polityki postowania na grupie `lista@morzkulc.pl` (`whoCanPostMessage = ALL_MANAGERS_CAN_POST`) i dodanie grup uprzywilejowanych (`zarzad_skk@`, `kr@`, `czlonkowie@`) jako MANAGER.

Bez Kroku 0 cała reszta wdrożenia (sympatyk = MEMBER → tylko odczyt, kandydat/członek = MANAGER → wysyłanie) **nie ma efektu** na rzeczywiste prawa wysyłania na grupie.

## Dlaczego potrzebny osobny workflow

`adminRunServiceTask` (`functions/src/service/admin/adminRunTask.ts`) ma `invoker: "private"` i **nie ma rewrite** w `firebase.json` (jak np. `adminPutSetup`). Skutek: bezpośredni fetch z DevTools na `https://us-central1-<project>.cloudfunctions.net/adminRunServiceTask` jest blokowany przez IAM + CORS.

Wcześniejszy snippet z `firebase.auth().currentUser.getIdToken()` dodatkowo nie działa, bo aplikacja używa ES modułów — brak globalnego `firebase` w `window`.

**Rozwiązanie bez modyfikacji kodu i bez deploy:** użyć kolejki `service_jobs`, na której wisi trigger `onServiceJobCreated` — utworzyć dokument ręcznie w Firebase Console. Funkcjonalnie identyczne do `adminRunServiceTask`, ale nie wymaga uprawnień IAM ani CORS.

---

## Krok 0 — uruchomienie `lista.enforcePostingPolicy`

### A) DEV — projekt `sprzet-skk-morzkulc`

1. Firebase Console → projekt **`sprzet-skk-morzkulc`** → **Firestore Database**
2. Wybierz kolekcję **`service_jobs`** (lub utwórz, jeśli pusta)
3. **Add document**
4. **Document ID:** *Auto-ID* (lub np. `manual-lista-policy-dev-1`)
5. **Pola:**

   | Field | Type | Value |
   |---|---|---|
   | `taskId` | string | `lista.enforcePostingPolicy` |
   | `payload` | map | *(pusta — kliknij Add field, wybierz typ "map", zatwierdź bez sub-pól)* |
   | `status` | string | `queued` |
   | `attempts` | number | `0` |
   | `createdAt` | timestamp | *teraz* |
   | `updatedAt` | timestamp | *teraz* |

6. **Save**

### B) PROD — projekt `morzkulc-e9df7`

Identyczne kroki w Firebase Console → projekt **`morzkulc-e9df7`** → **Firestore Database** → `service_jobs` → **Add document** (sugerowany Document ID: `manual-lista-policy-prod-1`).

> Uwaga: dev i prod to dwie osobne bazy Firestore. Task musi się odpalić w obu projektach, żeby idempotentnie zaktualizować politykę grupy + dorzucić privileged groups. (Sama grupa `lista@morzkulc.pl` w Google Groups jest jedna, ale env vars są per-projekt — provider każdego projektu musi raz przepatchować ustawienia.)

---

## Jak to działa pod spodem

Po **Save**:

1. Trigger `onServiceJobCreated` (`functions/src/service/worker/onJobCreatedWorker.ts:4`) reaguje na `onDocumentWritten` na `service_jobs/{jobId}`.
2. `jobProcessor.ts:29-46` w transakcji sprawdza:
   - `status === "queued"` ✓
   - `nextRunAt` brak / w przeszłości ✓
   - `lockedUntil` brak / w przeszłości ✓
   - i ustawia `status: "running"` + `lockedUntil`.
3. Wywołuje `runTaskById("lista.enforcePostingPolicy", {}, { dryRun: false })`.
4. Task (`functions/src/service/tasks/listaEnforcePostingPolicy.ts`) wywołuje `workspace.enforceListaPostingPolicy(cfg.listaGroupEmail, cfg.privilegedPosterGroups)`.
5. Po sukcesie worker ustawia `status: "done"`. Po błędzie — `attempts++`, `status: "queued"` z `nextRunAt` (backoff), do `maxAttempts = 5`, potem `dead`.

Wymagane minimum w dokumencie: `taskId`, `payload`, `status: "queued"`. Reszta pól (`attempts`, `createdAt`, `updatedAt`) ma sensowne defaulty, ale dodajemy je dla spójności ze standardowym wzorcem (`functions/src/index.ts:636-647` — `enqueueGodzinkiSheetWrite`).

---

## Weryfikacja

### 1) Firestore — stan dokumentu

W ciągu kilku sekund po Save dokument w `service_jobs` przejdzie:

```
status: "queued"  →  "running"  →  "done"
```

Jeśli zostanie na `"queued"` z `attempts > 0` i `lastError` — patrz logi.

### 2) Logi Cloud Functions

Firebase Console → **Functions** → **Logs** → filtr po nazwach:

- `onServiceJobCreated` — wpis `service job written -> process { jobId: ... }`
- `listaEnforcePostingPolicy: done` z polami `lista` i `privilegedGroups`

### 3) Google Groups (efekt rzeczywisty)

`admin.google.com` → **Groups** → `lista@morzkulc.pl` → **Access settings**:

- **Who can post messages** = `Group managers` (`ALL_MANAGERS_CAN_POST`)
- **Who can view group** / **Who can view conversations** = `Group members` (`ALL_MEMBERS_CAN_VIEW`)
- **Who can view members** = `Group members` (`ALL_MEMBERS_CAN_VIEW`)

W **Members** tab grupy `lista@morzkulc.pl` powinny być widoczne z rolą **Manager**:

- `zarzad_skk@morzkulc.pl`
- `kr@morzkulc.pl`
- `czlonkowie@morzkulc.pl`

> Jeśli `SVC_PRIV_POSTER_GROUPS` w `.env` jest inny, sprawdź tę listę.

---

## Pliki referencyjne (read-only)

| Plik | Cel |
|---|---|
| `functions/src/service/tasks/listaEnforcePostingPolicy.ts` | Definicja taska — co konkretnie się wykona |
| `functions/src/service/registry.ts:34` | `listaEnforcePostingPolicyTask` zarejestrowany |
| `functions/src/service/worker/onJobCreatedWorker.ts:4` | Trigger na `service_jobs/{jobId}` |
| `functions/src/service/worker/jobProcessor.ts:29-46` | Logika claim/run — wymagania na pola dokumentu |
| `functions/src/service/providers/googleWorkspaceProvider.ts:136` | `enforceListaPostingPolicy()` — implementacja po stronie Google Workspace |
| `functions/src/index.ts:636-647` | Wzorzec dokumentu — `enqueueGodzinkiSheetWrite` |

---

## Po wykonaniu

Krok 0 z `users_wdrozenie_1.md` jest zaliczony. Można przejść do **planu testów (testy 1–7)** z dokumentu `users_wdrozenie_1.md`:

1. Rejestracja kursanta → brak w `lista@`, mail bez wzmianki o liście
2. Rejestracja sympatyka → MEMBER w `lista@`, mail "tylko odczyt"
3. Rejestracja kandydata/członka → MANAGER w `lista@`, pełne instrukcje
4. Zmiana roli kursant → kandydat (przez `users.syncRolesFromSheet`) → MANAGER + mail
5. Zmiana kandydat → sympatyk (downgrade) → MEMBER + mail
6. Zmiana kandydat → kursant → usunięty + mail
7. Weryfikacja `whoCanPostMessage` na grupie

---

## Tech debt (poza scope)

Kursanci, którzy zarejestrowali się **przed wdrożeniem** mogli zostać dodani do `lista@` przez stary (buggy) kod `onUserRegisteredWelcome.ts` step B. Wymagają jednorazowego czyszczenia:

- ręcznie w `admin.google.com` (przefiltrować członków grupy, znaleźć tych z `role_key = "rola_kursant"` w Firestore), **albo**
- dorobić mały task `lista.cleanupKursanci`, który iteruje `users_active` z `role_key === "rola_kursant"` i usuwa ich z `lista@`.

Nie jest częścią tego TO-DO.