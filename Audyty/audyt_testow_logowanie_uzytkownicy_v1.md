# Audyt testów – logowanie, rejestracja, obsługa kont użytkowników, bezpieczeństwo

**Data audytu:** 2026-04-10  
**Wersja:** v1  
**Zakres:** Wyłącznie obszar logowania, rejestracji, zarządzania kontami użytkowników i bezpieczeństwa HTTP.  
**Projekty Firebase:** dev (`sprzet-skk-morzkulc`) / prod (`morzkulc-e9df7`)

---

## 1. Inwentaryzacja istniejących testów

### 1.1 Testy jednostkowe (Python / unittest)

| Plik | Liczba testów | Zakres | Relevancja dla tego audytu |
|------|--------------|--------|---------------------------|
| `tests/test_godzinki.py` | 68 | Logika biznesowa godzinek (FIFO, wygasanie, saldo ujemne, typy pakietów) | BRAK – poza zakresem |
| `tests/test_bundle_reservations.py` | 63 | Logika rezerwacji sprzętu (limity, konflikty, anulowanie) | BRAK – poza zakresem |
| `tests/test_pwa.py` | 42 | Infrastruktura PWA (manifest, service worker, ikony, cache headers) | MARGINALNY – SW cache dotyczy bezpieczeństwa aktualizacji |

**Łączna liczba testów jednostkowych w zakresie audytu: 0 z 173.**

### 1.2 Testy E2E (Python + Playwright + Firebase Admin SDK)

Lokalizacja: `tests/e2e/`  
Uruchamianie: `ENV=dev python run_e2e.py` lub `ENV=prod python run_e2e.py`

Infrastruktura pomocnicza (`tests/e2e/helpers/`):

| Moduł | Rola |
|-------|------|
| `firebase_auth.py` | Pobiera ID tokeny przez Firebase Auth REST API (email+hasło) |
| `firestore_helper.py` | Odczyt/zapis Firestore via Admin SDK, oczekiwanie na job queue |
| `api_helper.py` | Wywołania HTTP API (Bearer token) |
| `sheets_helper.py` | Odczyt/zapis Google Sheets (OAuth desktop) |
| `playwright_helper.py` | Pomocnicze operacje Playwright |
| `reporter.py` | Wyniki faz (`PhaseResult`) |

**Fazy E2E:**

| Faza | Nazwa | Co testuje | Relevancja |
|------|-------|-----------|-----------|
| P0 | Pre-flight checks | Konfiguracja środowiska, dostęp do Firebase Auth REST, Firestore, Sheets | TAK – weryfikacja środowiska |
| P1 | Registration + profile + Sheets sync | POST /api/register z pełnym profilem, weryfikacja Firestore + Sheets | TAK – rejestracja (happy path) |
| P2 | Role change via Sheet | Zmiana roli w arkuszu → sync → weryfikacja Firestore | TAK – obsługa kont |
| P3 | Godzinki grant | Grant godzinek przez admina | NIE – poza zakresem |
| P4 | First reservation | Rezerwacja kajaka | NIE – poza zakresem |
| P5 | Limit errors | Przekroczenie limitów | NIE – poza zakresem |
| P6 | Cancel reservation | Anulowanie rezerwacji | NIE – poza zakresem |
| P7 | Balance drain | Wyczerpanie salda | NIE – poza zakresem |
| P8 | Sheets ↔ Firestore sync | Weryfikacja spójności ID, etykiety Rola/Status po syncu | TAK – obsługa kont |
| P9 | Cleanup | Sprzątanie danych testowych | TAK – środowisko |

**Fazy w zakresie audytu: P0, P1, P2, P8** (4 z 10 faz E2E dotyczą badanego obszaru).

**Kluczowe ograniczenie E2E:** Testy E2E używają Firebase Auth **email+hasło** (REST API), a NIE logowania przez Google OAuth (popup/redirect). Oznacza to, że **cały flow logowania przez Google** jest poza zasięgiem automatycznych testów.

---

## 2. Macierz pokrycia – wymagane scenariusze vs. stan

### 2.1 Logowanie

| Scenariusz | Typ | Stan | Uwagi |
|-----------|-----|------|-------|
| Login Google Popup (`authLoginPopup`) | E2E / UI | **BRAK** | Wymaga prawdziwej przeglądarki + konta Google |
| Login Google Redirect (iOS – `signInWithRedirect`) | E2E / UI | **BRAK** | Wymaga urządzenia iOS lub emulatora |
| `authHandleRedirectResult` przed `onAuthStateChanged` | Jednostkowy | **BRAK** | Logika race condition w `app_shell.js:81-196` |
| Token wygasły → `getIdToken(true)` → retry | Jednostkowy | **BRAK** | `api_client.js` – auto-refresh tokenu |
| Sesja 24h → auto-wylogowanie | Jednostkowy | **BRAK** | `app_shell.js:101-106`, `sessionStorage` |
| SW_UPDATED → reload przed kliknięciem Login | E2E / UI | **BRAK** | `app_shell.js:56-62` |
| Błąd logowania → `showAuthError()` | E2E / UI | **BRAK** | `app_shell.js:198-208` |

**Pokrycie: 0 / 7 scenariuszy**

### 2.2 Rejestracja

| Scenariusz | Typ | Stan | Uwagi |
|-----------|-----|------|-------|
| POST /api/register z poprawnym tokenem + pełnym profilem | E2E | **CZĘŚCIOWE** | P1 pokrywa happy path |
| POST /api/register z niekompletnym profilem | E2E | **BRAK** | Brak testu `profileComplete=false` |
| Brak nagłówka `Authorization` → 401 | Jednostkowy/HTTP | **BRAK** | Middleware `requireAuth` w `index.ts` |
| Błędny/wygasły token → 401 | Jednostkowy/HTTP | **BRAK** | Weryfikacja `verifyIdToken` |
| Nowy użytkownik w BO26 + `"członek stowarzyszenia"=true` → `rola_czlonek` | Jednostkowy | **BRAK** | `registerUserHandler.ts` logika bootstrappingu |
| Nowy użytkownik spoza BO26 → `rola_sympatyk` | Jednostkowy | **BRAK** | Fallback w `registerUserHandler.ts` |
| Rejestracja idempotentna (powtórne wywołanie → `existed=true`) | E2E | **BRAK** | Brak testu ponownego POST /api/register |
| `onUsersActiveCreated` trigger → enqueue welcome task | Jednostkowy | **BRAK** | Firestore trigger w `index.ts` |
| `onUserRegisteredWelcome` → dodanie do lista@ group | Integracyjny | **BRAK** | Nie testowany wprost |
| Sync do Google Sheets po rejestracji | E2E | **CZĘŚCIOWE** | P1 weryfikuje pojawienie się wiersza (timeout 90s) |

**Pokrycie: 2 / 10 scenariuszy (częściowe)**

### 2.3 Obsługa kont użytkowników

| Scenariusz | Typ | Stan | Uwagi |
|-----------|-----|------|-------|
| Zmiana roli w Sheets → sync → Firestore aktualizacja | E2E | **CZĘŚCIOWE** | P2 — tylko `rola_czlonek`, 1 rola |
| Zmiana statusu → `status_zawieszony` → blokada dostępu | E2E | **BRAK** | `checkUserSuspended()` w `index.ts` |
| Zmiana statusu → `status_skreslony` → blokada dostępu | E2E | **BRAK** | Analogicznie |
| Widoczność modułów zależy od roli (setup/app) | E2E / UI | **BRAK** | `access_control.js`, `modules_registry.js` |
| `usersSyncRolesFromSheet` scheduler (04:30) | Integracyjny | **BRAK** | Nowa funkcja z etapu 9 planu |
| Sync danych do Sheets (memberId, Rola, Status) | E2E | **CZĘŚCIOWE** | P8 weryfikuje spójność po ręcznym syncu |
| Idempotentność `enqueueMemberSheetSync` (dedup po job ID) | Jednostkowy | **BRAK** | Nowa logika z etapu 8 planu |
| `session.screen` → przekierowanie do właściwego modułu | Jednostkowy | **BRAK** | `app_shell.js:158-166` |

**Pokrycie: 3 / 8 scenariuszy (częściowe)**

### 2.4 Bezpieczeństwo

| Scenariusz | Typ | Stan | Uwagi |
|-----------|-----|------|-------|
| CORS: żądanie z dozwolonej domeny → 200 | HTTP | **BRAK** | `ALLOWED_ORIGINS` w `index.ts` |
| CORS: żądanie z niedozwolonej domeny → 403 | HTTP | **BRAK** | Brak testu negatywnego |
| Host allowlist: poprawny `X-Forwarded-Host` → OK | HTTP | **BRAK** | `ALLOWED_HOSTS` w `index.ts` |
| Host allowlist: nieznany host → 403 | HTTP | **BRAK** | Brak testu negatywnego |
| Brak nagłówka `Authorization` → 401 | HTTP | **BRAK** | Dotyczy wszystkich endpointów API |
| Błędny token → 401 | HTTP | **BRAK** | Weryfikacja `firebase-admin.verifyIdToken` |
| Endpoint admin `/api/admin/*` bez roli admin → 403 | HTTP | **BRAK** | `requireAdmin` middleware |
| `checkUserSuspended` → 403 dla zawieszonych | HTTP | **BRAK** | Middleware sprawdzający status |
| Firestore Security Rules — user czyta własny dok | Jednostkowy | **BRAK** | `firestore.rules` brak w repozytorium (etap 3) |
| Firestore Security Rules — user nie może czytać cudzych danych | Jednostkowy | **BRAK** | Analogicznie |
| Mechanizm odświeżania SW (`swUpdatePending`) | E2E / UI | **BRAK** | Dotyczy spójności wersji aplikacji |

**Pokrycie: 0 / 11 scenariuszy**

---

## 3. Wymagane konta testowe

### 3.1 Istniejące konta (zdefiniowane w `tests/e2e/config.py`)

| Środowisko | Zmienna środowiskowa | Przeznaczenie | Typ konta Firebase |
|-----------|---------------------|--------------|-------------------|
| DEV | `DEV_TEST_USER_EMAIL` + `DEV_TEST_USER_PASSWORD` | Główne konto testowe (rejestracja, profil, rezerwacje) | Email+hasło |
| DEV | `DEV_ADMIN_USER_EMAIL` + `DEV_ADMIN_USER_PASSWORD` | Operacje admina (grant godzinek, sync ról) | Email+hasło, rola `rola_zarzad` lub `rola_kr` |
| PROD | `PROD_TEST_USER_EMAIL` + `PROD_TEST_USER_PASSWORD` | Odpowiednik DEV na produkcji | Email+hasło |
| PROD | `PROD_ADMIN_USER_EMAIL` + `PROD_ADMIN_USER_PASSWORD` | Odpowiednik DEV na produkcji | Email+hasło, rola admin |

**Uwaga:** Konta używają Firebase Email+Password Auth — **nie** Google OAuth. Są dedykowane wyłącznie do testów automatycznych. Hasła przechowywane w zmiennych środowiskowych (nie w kodzie).

### 3.2 Brakujące konta (wymagane do pełnego pokrycia)

| Brakujące konto | Cel | Priorytet |
|----------------|-----|----------|
| Konto z `status_zawieszony` (DEV + PROD) | Test blokady dostępu dla zawieszonych użytkowników | KRYTYCZNY |
| Konto z `status_skreslony` (DEV + PROD) | Test blokady dostępu dla skreślonych użytkowników | KRYTYCZNY |
| Konto **spoza BO26** (email nieobecny w `users_opening_balance_26`) | Weryfikacja przyznania roli `rola_sympatyk` zamiast `rola_czlonek` | WYSOKI |
| Konto Google OAuth (do testów UI) | Testowanie rzeczywistego flow logowania przez Google Popup/Redirect | WYSOKI |
| Konto z `rola_sympatyk` (aktywne) | Test widoczności modułów dla niższej roli | ŚREDNI |
| Konto z `rola_kandydat` (aktywne) | Test widoczności modułów dla kandydata | ŚREDNI |

---

## 4. Analiza luk – priorytetyzacja

### KRYTYCZNE (brak testów dla mechanizmów bezpieczeństwa)

**L1 – Brak testów HTTP bezpieczeństwa (CORS, auth middleware)**  
- Dotyczy: wszystkich endpointów `/api/*`  
- Ryzyko: błędy konfiguracji CORS lub middleware mogą ujawnić dane lub zablokować aplikację  
- Brak choćby jednego testu sprawdzającego odpowiedź 401 bez tokenu

**L2 – Brak testów statusu użytkownika (zawieszony, skreślony)**  
- Dotyczy: `checkUserSuspended()` w `index.ts`, wywołanego w każdym handlerze  
- Ryzyko: regresja może przywrócić dostęp zawieszonym użytkownikom bez alarmu  
- Brak kont testowych do tego scenariusza

**L3 – Brak Firestore Security Rules w repozytorium**  
- Reguły nie są wersjonowane (etap 3 z planu wdrożenia — zablokowany)  
- Bez pliku `firestore.rules` nie można pisać ani uruchamiać testów reguł  
- Ryzyko: zmiana reguł w konsoli Firebase jest niezauważalna i nie podlega review

### WYSOKIE (luki funkcjonalne w kluczowych ścieżkach)

**L4 – Brak testów logiki bootstrappingu roli (BO26)**  
- `registerUserHandler.ts` — decyzja `rola_czlonek` vs. `rola_sympatyk` na podstawie `users_opening_balance_26`  
- Brak jednostkowego testu tej logiki; błąd może prowadzić do nieprawidłowego nadania roli

**L5 – Brak testów widoczności modułów per rola**  
- `access_control.js` + `modules_registry.js` + `setup/app` (Firestore)  
- Brak testu: zalogowany jako `rola_sympatyk` → nie widzi modułów zarezerwowanych dla `rola_czlonek`

**L6 – Brak testów sesji (24h timeout)**  
- Logika w `app_shell.js:101-106` korzysta z `sessionStorage`  
- Nie jest testowana automatycznie; błąd pozwoli na nieskończoną sesję

**L7 – Brak testów negatywnych rejestracji**  
- POST /api/register bez tokenu, z wygasłym tokenem, z niekompletnym profilem  
- E2E P1 pokrywa tylko happy path

### ŚREDNIE (pokrycie E2E ograniczone do "happy path")

**L8 – E2E pokrywa tylko 1 rolę przy zmianie przez Sheets**  
- P2 testuje wyłącznie `rola_czlonek`; nie testuje `rola_zarzad`, `rola_kr`, `rola_kandydat`, `rola_sympatyk`

**L9 – Brak testu idempotentności rejestracji**  
- Powtórne wywołanie POST /api/register powinno zwrócić `existed=true` bez duplikowania danych  
- Brak testu; zmiana implementacji może to zepsuć

**L10 – Brak testu `usersSyncRolesDaily` (nowy scheduler)**  
- Dodany w etapie 9 planu wdrożenia; brak jakiegokolwiek testu integracyjnego

---

## 5. Rekomendacje implementacyjne

### R1 – Dodać testy bezpieczeństwa HTTP (pytest + requests)
**Nowy plik:** `tests/test_security_http.py`  
Podejście: `requests.post(url, headers={})` bez tokenu → assert 401; z błędnym tokenem → assert 401; z niedozwoloną domeną w Origin → assert 403.  
Nie wymaga Playwright ani kont Google OAuth.

### R2 – Dodać testy statusu użytkownika
Wymagane: konta `zawieszony@morzkulc.pl` i `skreslony@morzkulc.pl` w Firebase Auth (DEV).  
Test: ustawić status w Firestore via Admin SDK → wywołać API → oczekiwać 403.

### R3 – Przywrócić `firestore.rules` do repozytorium (Etap 3)
Pobrać aktualne reguły: `firebase firestore:get-rules > firestore.rules` (po `firebase login --reauth`).  
Dodać testy reguł używając `@firebase/rules-unit-testing` lub `firebase emulators:exec`.

### R4 – Dodać testy jednostkowe `registerUserHandler`
**Nowy plik:** `tests/test_register_logic.py` (Python) lub testy TypeScript z Firebase Emulator Suite.  
Scenariusze: email w BO26 z `"członek stowarzyszenia"=true` → `rola_czlonek`; email poza BO26 → `rola_sympatyk`; powtórna rejestracja → `existed=true`.

### R5 – Rozbudować E2E o scenariusze negatywne
W ramach istniejącej struktury faz:  
- Faza P0: dodać test wywołania API bez tokenu (401)  
- Nowa faza P1b: POST /api/register z niekompletnym profilem → `profileComplete=false`  
- Nowa faza: zalogowanie jako `zawieszony` → 403

### R6 – Dodać brakujące konta testowe
Utworzyć w Firebase Auth (DEV) metodą Email+Password:  
- `test-zawieszony@morzkulc.pl` + ustawić `status_key: "status_zawieszony"` w Firestore  
- `test-skreslony@morzkulc.pl` + ustawić `status_key: "status_skreslony"`  
- `test-nowy@morzkulc.pl` (email nieobecny w BO26) → weryfikacja `rola_sympatyk`

---

## 6. Podsumowanie

| Obszar | Scenariuszy wymaganych | Pokrytych (pełne) | Pokrytych (częściowe) | Brak |
|--------|----------------------|-------------------|----------------------|------|
| Logowanie | 7 | 0 | 0 | 7 |
| Rejestracja | 10 | 0 | 2 | 8 |
| Obsługa kont | 8 | 0 | 3 | 5 |
| Bezpieczeństwo | 11 | 0 | 0 | 11 |
| **RAZEM** | **36** | **0** | **5** | **31** |

**Całkowite pokrycie obszaru: ~14% (5/36, z czego żadne nie jest w pełni pokryte).**

Główna przyczyna niskiego pokrycia: wszystkie istniejące testy dotyczą logiki biznesowej (godzinki, rezerwacje) lub infrastruktury PWA — nie ma dedykowanych testów dla rejestracji, logowania, bezpieczeństwa HTTP ani zarządzania kontami.

---

*Audyt wykonany na podstawie analizy plików: `tests/`, `tests/e2e/`, `functions/src/api/registerUserHandler.ts`, `functions/src/index.ts`, `public/core/app_shell.js`, `public/core/access_control.js`, `public/core/modules_registry.js`, `functions/src/service/tasks/onUserRegisteredWelcome.ts`, `functions/src/service/tasks/membersSyncToSheet.ts`.*
