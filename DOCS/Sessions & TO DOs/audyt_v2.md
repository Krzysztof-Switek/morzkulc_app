# AUDYT — LOGOWANIE, REJESTRACJA, OBSŁUGA UŻYTKOWNIKA
**Data audytu:** 2026-04-10
**Zakres:** logowanie, rejestracja, obsługa użytkownika (flow end-to-end)
**Kod źródłowy:** `functions/src/**`, `public/**`, `firebase.json`, `firestore.indexes.json`
**Wykluczone:** katalog `tests`, mocki, pliki testowe

---

## 1. MAPA SYSTEMU

```
Wejście bez logowania
  → authOnChange(null) → hardResetUi() → ekran z loginBtn widoczny, appRoot ukryty

Klik "Zaloguj"
  → iOS/standalone: signInWithRedirect → getRedirectResult
  → desktop: signInWithPopup
  → authOnChange(user) z Firebase SDK

Po zalogowaniu (authOnChange z user != null)
  → getIdToken(forceRefresh=true)
  → POST /api/register (ciało: {hello: "world"} — bez profilu)
    → backend: verifyIdToken → getSetupApp() → sprawdź users_active/{uid}
      → jeśli brak: sprawdź BO26 po email → utwórz doc z role_key+status_key
      → jeśli istnieje: zwróć istniejące role_key, status_key, profileComplete
    → odpowiedź: { uid, role_key, status_key, profileComplete, screen, ... }
  → GET /api/setup
    → backend: verifyIdToken → filterSetupForUser() → filtrowanie modułów wg roli/statusu
  → buildModulesFromSetup(setup) → lista modułów w ctx
  → renderNav() → wyświetl dostępne moduły
  → location.hash = "#/home/home" (zawsze!)
  → renderView()

renderView()
  → if (!ctx.session?.profileComplete) → renderProfileForm() — BLOKUJE cały widok
  → if (profileComplete) → renderHomeDashboard() lub konkretny moduł

Submit formularza profilu
  → POST /api/register (z firstName, lastName, nickname, phone, dateOfBirth, consentRodo, consentStatute)
  → backend: walidacja → set/merge do users_active/{uid}.profile
  → if (profileComplete) → enqueueMemberSheetSync(uid) → job "members.syncToSheet"
  → odpowiedź → location.reload()

Nowy user → onUsersActiveCreated trigger
  → tworzy job "onUserRegistered.welcome" (idempotentny: doc ID = "welcome:{uid}")

Job "onUserRegistered.welcome"
  → addMemberToGroup(lista@) — idempotent przez marker addedToListaGroupAt
  → addMemberToGroup(czlonkowie@) jeśli MEMBER_LEVEL_ROLES — idempotent przez marker
  → sendWelcomeEmail — idempotent przez marker welcomeEmailSentAt
  → syncRoleMappingGroups z setup.roleMappings (D) — idempotent przez marker

Sync ról z arkusza
  → ręczne wywołanie adminRunServiceTask → task "users.syncRolesFromSheet"
  → odczyt arkusza → porównanie Rola/Status z Firestore → update role_key/status_key
  → przy zmianie roli: syncWorkspaceGroupsForUser()
  → efekt widoczny dla usera po przeładowaniu strony

Suspended user
  → status_key = "status_zawieszony" → setup.statusMappings[...].blocksAccess = true
  → filterSetupForUser() zwraca zero modułów → canSeeModule() = false dla wszystkich
```

---

## 2. TABELA ZGODNOŚCI

| # | Obszar | Wymaganie | Status | Dowód w kodzie | Niezgodność / ryzyko |
|---|--------|-----------|--------|----------------|----------------------|
| 1 | Logowanie | Firebase Auth + Google Provider | **OK** | `firebase_client.js:64` — `GoogleAuthProvider`, popup + redirect dla iOS | — |
| 2 | Blokada bez logowania | Aplikacja działa tylko po zalogowaniu | **PARTIAL** | `app_shell.js:202-225` hardResetUi() ukrywa appRoot; brak `firestore.rules` w repo | Brak reguł Firestore w source control — nie wiadomo, jaki stan jest na produkcji |
| 3 | Brak usera → formularz | Brak doc → profil | **OK** | `registerUserHandler.ts:318` — `!existing.exists` → tworzy doc; `render_shell.js:43-44` — `!profileComplete` → renderProfileForm | — |
| 4 | Istniejący user → panel | Existing doc → panel | **OK** | `registerUserHandler.ts:318-422` — `existing.exists` → patch + return | — |
| 5 | Formularz rejestracji | Pola: imię, nazwisko, tel, data, RODO, statut | **OK** | `render_shell.js:516-640` | — |
| 6 | Submit rejestracji | POST /api/register | **OK** | `render_shell.js:611-626`, `app_shell.js:126-133` | — |
| 7 | Zapis usera do Firestore | `users_active/{uid}` | **OK** | `registerUserHandler.ts:477` — `userRef.set(docToCreate)` | — |
| 8 | Zapis do Google Sheets | Sync usera do arkusza przy rejestracji | **PARTIAL** | `registerUserHandler.ts:492-498` — `enqueueMemberSheetSync` wywołane tylko gdy `profileComplete === true` | Nowy user bez profilu przy 1. rejestracji nie trafia do arkusza od razu. Sync odbywa się po uzupełnieniu profilu (lub w ogóle nie, jeśli profil nigdy nie będzie kompletny). Brak deduplicacji jobów — każdy submit może dodać kolejny job |
| 9 | Nadawanie role_key i status_code | Z `setup/app.defaults`, nie hardcoded | **PARTIAL** | `registerUserHandler.ts:287-291` — fallbacki `"rola_sympatyk"`, `"status_aktywny"`, `"rola_czlonek"` są hardcoded; próbuje czytać z `getSetupApp()` | Jeśli setup brakuje (setupMissing=true), używa hardcoded wartości — to nie jest błąd, ale nie jest konfigurowalne bez setup |
| 10 | Jednorazowa weryfikacja BO26 | Email first → name fallback | **OK** | `registerUserHandler.ts:219-256` — `findOpeningBalance()` — email priorytet, potem imię+nazwisko | — |
| 11 | Mapowanie PL ↔ EN code | Etykiety z setup, nie hardcoded | **WRONG** | `render_shell.js:729-745` — `roleKeyToLabel()`, `statusKeyToLabel()` hardcoded; `membersSyncToSheet.ts:14-33` — `roleLabel()`, `statusLabel()` hardcoded | Dodanie nowej roli/statusu wymaga zmiany kodu frontendu i tasku sync |
| 12 | Brak hardcodowania ról/statusów | Wszystko z setup | **WRONG** | `index.ts:209-219` — `defaultScreenForRoleKey()` hardcoded; `onUserRegisteredWelcome.ts:18-22` — `MEMBER_LEVEL_ROLES` hardcoded; `service_config.ts:74-75` — `adminRoleKeys`, `memberRoleKeys` hardcoded defaults | — |
| 13 | Sync setup z Google Sheets do Firestore | Mechanizm syncu setup z arkusza | **MISSING** | Brak tasku `setup.syncFromSheet` w registry.ts. Jedyna droga: `POST /api/admin/setup` (ręcznie, email admin) | Zarząd nie może zmieniać konfiguracji modułów przez Google Sheets |
| 14 | Sync users z Google Sheets do Firestore | Task `usersSyncRolesFromSheet` | **PARTIAL** | `usersSyncRolesFromSheet.ts` — istnieje, działa. Ale brak automatycznego harmonogramu — tylko ręcznie przez adminRunServiceTask lub przy utknięciu jobu (fallback daily nie tworzy nowych jobów syncu) | Sync ról nie jest cykliczny — wymaga ręcznego wywołania |
| 15 | Zmiana roli/statusu z arkusza → widok | Po syncu Firestore → zmiana widoku | **PARTIAL** | `usersSyncRolesFromSheet.ts:264-268` — update `role_key`/`status_key`; `filterSetupForUser` używa nowych wartości przy kolejnym logowaniu | Zmiana działa dopiero po przeładowaniu strony przez usera. Brak real-time push |
| 16 | Zmiana roli — od kiedy obowiązuje | Od razu po syncu czy po ponownym logowaniu | **PARTIAL** | `app_shell.js:126-133` — `POST /api/register` wywoływany przy każdym `authOnChange` (czyli przy przeładowaniu). Ale mid-session nie — trzeba przeładować | — |
| 17 | Blokada suspended | status_key → blocksAccess | **OK** | `access_control.js:17-18` — `statusMappings[statusKey]?.blocksAccess === true`; `index.ts:248-253` — `filterSetupForUser` też sprawdza | Wymaga że `setup.statusMappings.status_zawieszony.blocksAccess = true` jest ustawione — nie ma fallbacku jeśli brakuje |
| 18 | Widoczność modułów przez backend | filterSetupForUser | **OK** | `index.ts:241-293` — backend stripuje niedostępne moduły; `access_control.js` — frontend też sprawdza | — |
| 19 | Różne strony startowe dla ról | `defaultScreenForRoleKey` → różny hash | **WRONG** | `index.ts:209-219` — backend zwraca `screen: defaultScreenForRoleKey(roleKey)`. Ale `app_shell.js:158` — `location.hash = "#/home/home"` zawsze, nigdy nie czyta `session.screen` | `session.screen` jest obliczane i zwracane, ale nigdy nie używane w routingu. Wszyscy trafiają na `#/home/home` |
| 20 | Bezpieczeństwo — ID token | verifyIdToken na każdym req | **OK** | `index.ts:195-201`, każdy handler wywołuje `requireIdToken(req)` | — |
| 21 | Bezpieczeństwo — host allowlist | ALLOWED_HOSTS | **OK** | `index.ts:49-56`, `requireAllowedHost()` blokuje inne hosty | — |
| 22 | Bezpieczeństwo — CORS | Per-origin allowlist | **WRONG** | `firebase.json:89-94` — `/api/**` ma `"Access-Control-Allow-Origin": "*"` ustawiony przez Hosting headers PRZED funkcją | Hosting nadpisuje CORS na wildcard — backend CORS allowlist jest martwy dla requestów przez Hosting |
| 23 | Funkcje private | invoker: "private" | **OK** | `firebase.json:7` — globalnie `"invoker": "private"`; każde `onRequest({invoker: "private"})` | — |
| 24 | Service jobs — welcome email | Po rejestracji, async | **OK** | `onUsersActiveCreated.ts` — trigger Firestore → enqueue job | — |
| 25 | Service jobs — Google Groups | lista@ + role groups | **OK** | `onUserRegisteredWelcome.ts:59-148` — krok B (lista@), C (members group z MEMBER_LEVEL_ROLES), D (roleMappings z setup) | Krok C korzysta z hardcoded `MEMBER_LEVEL_ROLES`, nie z setup |
| 26 | Service jobs — retry | Backoff + maxAttempts | **OK** | `service_config.ts:144-145` — backoff `[30, 60, 120, 300, 900]` s, maxAttempts=5 | — |
| 27 | Service jobs — idempotencja | Markery w Firestore | **PARTIAL** | `onUserRegisteredWelcome.ts` — markery: `welcomeEmailSentAt`, `addedToListaGroupAt`, `addedToRoleGroupAt`, `roleGroupsMappingsSyncedAt`. `membersSyncToSheet` — brak deduplicacji jobu (auto-ID), upsert arkusza jest idempotentny ale wiele jobów może się wykonać | — |
| 28 | Idempotencja rejestracji | POST /api/register wielokrotnie | **OK** | `registerUserHandler.ts:318` — `existing.exists` guard; merge zamiast overwrite | — |

---

## 3. NIEZGODNOŚCI KRYTYCZNE

### 3.1 CORS wildcard w firebase.json — BEZPIECZEŃSTWO
**Plik:** `firebase.json:89-94`
```json
{ "source": "/api/**", "headers": [
    { "key": "Access-Control-Allow-Origin", "value": "*" }
]}
```
Firebase Hosting wstawia ten nagłówek do każdej odpowiedzi przez `functions` rewrite, nadpisując to co robi backend. Efekt: każda domena może robić CORS fetch do `/api/**`. Backend ma starannie skonfigurowany `ALLOWED_ORIGINS` z listą domen — jest martwy dla zapytań przechodzących przez Hosting.

### 3.2 session.screen nigdy nieużywany — WRONG business logic
**Backend** (`index.ts:209-219`): oblicza `screen: "screen_board"` / `"screen_member"` itd.
**Frontend** (`app_shell.js:158`): `location.hash = "#/home/home"` — zawsze, bez warunku, bez odczytu `session.screen`.
Wymaganie "różne strony domowe dla różnych ról" nie działa.

### 3.3 Brak Firestore Rules w repo — BEZPIECZEŃSTWO
`firestore.rules` nie istnieje. `firebase.json` nie ma pola `"rules"` w sekcji `firestore`. Reguły nie są zarządzane przez source control. Nie wiadomo jaki stan jest na produkcji (mogą być domyślnie otwarte lub zamknięte — bez weryfikacji z kodu niemożliwe do potwierdzenia).

### 3.4 Brak rewrite'ów dla 5 funkcji
Funkcje zdefiniowane w `index.ts`, lecz brak entries w `firebase.json` rewrites:
- `purchaseGodzinki` → `/api/godzinki/purchase`
- `getBasenGodziny` → `/api/basen/godziny`
- `basenAdminAddGodziny` → `/api/basen/admin/godziny/add`
- `basenAdminCorrectGodziny` → `/api/basen/admin/godziny/correct`
- `basenAdminSearchUsers` → `/api/basen/admin/users`

Te endpointy są niedostępne przez domenę Hosting. Mogą być wywoływane tylko bezpośrednio przez URL Cloud Functions (poza allowlistą hostów — zablokowane przez `requireAllowedHost`).

---

## 4. BRAKI

| Brakuje | Opis |
|---------|------|
| `firestore.rules` | Brak w repo i brak w `firebase.json` |
| Sync setup z Google Sheets → Firestore | Nie istnieje. Setup zmienia tylko admin przez `/api/admin/setup` |
| Automatyczny cykliczny sync ról z arkusza | `usersSyncRolesFromSheet` nie ma schedulera — tylko ręczne wywołanie |
| Strony startowe per rola | `session.screen` obliczane, ale nigdy nie użyte w routingu |
| Deduplicacja jobów membersSyncToSheet | Każdy POST /api/register z kompletnym profilem dodaje nowy job |

---

## 5. MIEJSCA RYZYKA

| Miejsce | Opis |
|---------|------|
| `render_shell.js:729-745` | `roleKeyToLabel()`, `statusKeyToLabel()` — hardcoded. Jeśli zarząd doda nową rolę/status w setup, frontend wyświetli surowy klucz |
| `membersSyncToSheet.ts:14-33` | `roleLabel()`, `statusLabel()` — hardcoded. Nowa rola zapisana do arkusza jako surowy klucz `rola_X` zamiast PL etykiety |
| `onUserRegisteredWelcome.ts:18-22` | `MEMBER_LEVEL_ROLES` hardcoded — dodanie nowej roli wymagającej dostępu do shared drive wymaga zmiany kodu |
| `index.ts:209-219` | `defaultScreenForRoleKey()` hardcoded i nieużywany — martwy kod |
| `service_config.ts:74-75` | `adminRoleKeys`, `memberRoleKeys` mają hardcoded defaults i są odczytywane z env — ale nie z `setup`. Rozbieżność między tym co jest w setup a tym czego używa backend do sprawdzania uprawnień (np. `basenEnroll` sprawdza `memberRoleKeys` z config, nie z setup) |
| `firebase_client.js:18-34` | Klucze API obu projektów (dev + prod) w kodzie frontendu. Standard Firebase, ale oba są publiczne — poziom ryzyka niski |
| `app_shell.js:101-106` | Sesja 24h sprawdzana tylko po stronie klienta przez sessionStorage. Brak egzekucji server-side |

---

## 6. PLIKI DO PÓŹNIEJSZEJ POPRAWY

| Plik | Do czego służy | Problem | Typ |
|------|---------------|---------|-----|
| `firebase.json` | Config deploymentu | Wildcard CORS `/api/**`; brak 5 rewrite'ów; brak `"rules"` w sekcji firestore | security / config |
| `public/core/render_shell.js` | Renderowanie UI, formularz rejestracji | `roleKeyToLabel()`, `statusKeyToLabel()` hardcoded; `session.screen` ignorowany przy routingu | business logic / UX flow |
| `functions/src/index.ts` | Deklaracje wszystkich funkcji HTTP | `defaultScreenForRoleKey()` hardcoded i nieużywana; brak rejestracji rewrites dla nowych endpointów basen/admin | business logic / config |
| `functions/src/service/tasks/membersSyncToSheet.ts` | Sync usera do Google Sheets | `roleLabel()`, `statusLabel()` hardcoded; brak deduplicacji jobów | sync / business logic |
| `functions/src/service/tasks/onUserRegisteredWelcome.ts` | Welcome email + Groups | `MEMBER_LEVEL_ROLES` hardcoded — nie czyta z setup.roleMappings | business logic / sync |
| `functions/src/service/service_config.ts` | Konfiguracja serwisu | `adminRoleKeys`, `memberRoleKeys` z env/defaults, nie z setup — rozbieżność z logiką filtrowania modułów | config / business logic |
| `public/core/app_shell.js` | Główna pętla auth + startup | `location.hash = "#/home/home"` — ignoruje `session.screen` | routing / UX flow |

---

## 7. WERDYKT KOŃCOWY

**Co działa:**
- Logowanie Google (popup + redirect iOS) — poprawne
- Blokada UI bez logowania — poprawne
- Rejestracja nowego usera do Firestore — poprawne
- Walidacja profilu (backend + frontend) — poprawne
- Weryfikacja BO26 (email → name) — poprawne
- ID token verification na każdym endpoincie — poprawne
- filterSetupForUser na backendzie — poprawne
- Blokada suspended (jeśli `statusMappings` ustawione w setup) — poprawne
- Welcome email + Google Groups z retry i idempotencją — poprawne
- Sync ról z arkusza (`usersSyncRolesFromSheet`) — poprawne, gdy wywołany

**Co nie działa / jest niezgodne:**
- CORS wildcard w `firebase.json` anuluje allowlist backendową
- 5 funkcji (basen admin, godzinki purchase) niedostępnych przez Hosting
- Różne strony startowe per rola — `session.screen` obliczany, nigdy nie używany — wszyscy trafiają na `#/home/home`
- Etykiety ról/statusów w UI i sync arkuszy hardcoded — nie z setup
- Brak `firestore.rules` w repo
- Brak automatycznego schedulera dla `usersSyncRolesFromSheet`
- Brak mechanizmu syncu `setup` z Google Sheets (zarząd nie może zmieniać konfiguracji przez arkusz)

**Najbardziej ryzykowne:**
1. CORS wildcard — najpoważniejszy problem bezpieczeństwa w aktualnym kodzie
2. Brak Firestore Rules w repo — nie wiadomo jaki stan jest na prod
3. Brak rewrite'ów dla 5 endpointów — funkcjonalność basen-admin i godzinki/purchase faktycznie nie działa przez Hosting

**Czy zapis do Google Sheets działa:**
- TAK — dla usera z kompletnym profilem po rejestracji/aktualizacji (job `members.syncToSheet`)
- NIE — automatycznie, natychmiast przy pierwszym logowaniu nowego usera (wymaga kompletnego profilu)

**Czy role mają różne strony domowe:**
- NIE — backend to oblicza, frontend to ignoruje

**Czy zmiana roli w arkuszu realnie zmienia widok:**
- TAK, ale z opóźnieniem — wymaga: ręczne uruchomienie syncu przez admina → przeładowanie strony przez usera. Nie działa automatycznie ani real-time.