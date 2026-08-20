# Wymagania wstępne do uruchomienia testów logowania i bezpieczeństwa

**Projekt:** SKK Morzkulc  
**Środowisko docelowe:** DEV (`sprzet-skk-morzkulc`)  
**Data:** 2026-04-10

---

## Lista kontrolna — przejdź po kolei, zaznacz każdy punkt

---

## BLOK A — Zależności Python (jednorazowe)

- [ ] **A1.** Zainstaluj zależności testów E2E:
  ```bash
  cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e
  pip install -r requirements.txt
  ```
  Wymagane pakiety: `requests`, `firebase-admin`, `gspread`, `google-auth`, `google-auth-oauthlib`, `python-dotenv`

- [ ] **A2.** Sprawdź że Python ≥ 3.11 (używana składnia `str | None`):
  ```bash
  python --version
  ```

---

## BLOK B — Autoryzacja Firebase / Firestore (jednorazowe)

- [ ] **B1.** Zaloguj się do gcloud z zakresem cloud-platform (potrzebne dla Firestore Admin SDK):
  ```bash
  gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform
  ```
  Konto Google musi mieć rolę `roles/firebase.admin` lub `roles/datastore.user` w projekcie `sprzet-skk-morzkulc`.

- [ ] **B2.** Sprawdź że projekt jest ustawiony poprawnie:
  ```bash
  gcloud config get-value project
  ```
  Powinno zwrócić `sprzet-skk-morzkulc`. Jeśli nie — ustaw: `gcloud config set project sprzet-skk-morzkulc`

---

## BLOK C — Autoryzacja Google Sheets (jednorazowe)

- [ ] **C1.** Pobierz plik OAuth Client ID dla Desktop App z GCP Console:
  - GCP Console → `sprzet-skk-morzkulc` → APIs & Services → Credentials
  - Create Credentials → OAuth client ID → Desktop application
  - Pobierz JSON → zapisz jako `tests/e2e/oauth_client.json`

- [ ] **C2.** Przy pierwszym uruchomieniu testów E2E otworzy się przeglądarka — zatwierdź dostęp do arkuszy.
  Token zostanie zapisany w `~/.config/morzkulc_e2e/sheets_token.json`

- [ ] **C3.** Upewnij się że konto Google (z C1) ma dostęp edytora do arkusza:
  - DEV: `https://docs.google.com/spreadsheets/d/1pw_hvxvtk_pX7BRcWatNChoAa4u6FmCZqKFMvJdhjFE`
  - Zakładka: `członkowie i sympatycy`

---

## BLOK D — Konta testowe w Firebase Auth DEV (jednorazowe)

Wszystkie konta tworzone w Firebase Console:  
`https://console.firebase.google.com/project/sprzet-skk-morzkulc/authentication/users`

> Kliknij "Add user" → Email Address + Password

### D1. Konto testowe (główne) — już powinno istnieć

- [ ] Konto `[DEV_TEST_USER_EMAIL]` istnieje w Firebase Auth DEV
- [ ] Ma dokumenty w `users_active` z wypełnionym profilem
- [ ] Ma wpis w arkuszu (`członkowie i sympatycy`)

### D2. Konto admina — już powinno istnieć

- [ ] Konto `[DEV_ADMIN_USER_EMAIL]` istnieje w Firebase Auth DEV
- [ ] Ma `role_key: "rola_zarzad"` lub `"rola_kr"` w `users_active`

### D3. Konto zawieszonego użytkownika — **NOWE, do utworzenia**

- [ ] **D3a.** Utwórz konto w Firebase Auth DEV:
  - Email: `test-zawieszony@morzkulc.pl` (lub dowolny, zapisz go w `.env.test`)
  - Hasło: ustaw silne hasło, zapisz w `.env.test`

- [ ] **D3b.** Utwórz dokument w Firestore `users_active` — pobierz UID z Firebase Auth Console:
  ```
  Kolekcja: users_active
  Document ID: <UID konta test-zawieszony>
  Pola:
    uid:        "<UID>"
    email:      "test-zawieszony@morzkulc.pl"
    role_key:   "rola_czlonek"
    status_key: "status_zawieszony"
    profile:    { firstName: "Test", lastName: "Zawieszony" }
    createdAt:  <timestamp>
    updatedAt:  <timestamp>
  ```

- [ ] **D3c.** Sprawdź w Firestore `setup/app` że `statusMappings.status_zawieszony.blocksAccess` = `true`:
  ```json
  {
    "statusMappings": {
      "status_zawieszony": {
        "label": "Zawieszony",
        "blocksAccess": true
      }
    }
  }
  ```
  ⚠️ Bez `blocksAccess: true` middleware NIE zablokuje użytkownika → test zawiedzie z 200 zamiast 403.

### D4. Konto skreślonego użytkownika — **NOWE, do utworzenia**

- [ ] **D4a.** Utwórz konto w Firebase Auth DEV:
  - Email: `test-skreslony@morzkulc.pl`
  - Hasło: zapisz w `.env.test`

- [ ] **D4b.** Utwórz dokument w Firestore `users_active`:
  ```
  Kolekcja: users_active
  Document ID: <UID konta test-skreslony>
  Pola:
    uid:        "<UID>"
    email:      "test-skreslony@morzkulc.pl"
    role_key:   "rola_czlonek"
    status_key: "status_skreslony"
    profile:    { firstName: "Test", lastName: "Skreslony" }
    createdAt:  <timestamp>
    updatedAt:  <timestamp>
  ```

- [ ] **D4c.** Sprawdź `setup/app.statusMappings.status_skreslony.blocksAccess` = `true` (analogicznie do D3c)

### D5. Konto nowego użytkownika spoza BO26 — **NOWE, do utworzenia**

- [ ] **D5a.** Utwórz konto w Firebase Auth DEV:
  - Email: `test-nowy@morzkulc.pl` (MUSI być emailem, który **nie istnieje** w kolekcji `users_opening_balance_26`)
  - Hasło: zapisz w `.env.test`

- [ ] **D5b.** Sprawdź w Firestore że email `test-nowy@morzkulc.pl` NIE jest w `users_opening_balance_26`:
  - Firestore Console → kolekcja `users_opening_balance_26`
  - Przeszukaj po polu `e-mail` = `test-nowy@morzkulc.pl` → powinno być 0 wyników

- [ ] **D5c.** NIE twórz dokumentu w `users_active` — zostanie stworzony przez `/api/register` w teście.
  Jeśli istnieje — usuń go przed uruchomieniem testów.

---

## BLOK E — Konfiguracja setup/app w Firestore DEV (sprawdzenie)

Otwórz Firestore Console → kolekcja `setup` → dokument `app`

- [ ] **E1.** Pole `statusMappings` zawiera wpisy dla `status_zawieszony` i `status_skreslony`
  z `blocksAccess: true` (punkt D3c i D4c)

- [ ] **E2.** Pole `roleMappings` zawiera etykiety dla ról testowanych w P2:
  ```json
  {
    "roleMappings": {
      "rola_kandydat": { "label": "Kandydat" },
      "rola_czlonek":  { "label": "Członek" }
    }
  }
  ```
  ⚠️ Bez etykiety `"Kandydat"` w `roleMappings` — faza P2 (zmiana roli) będzie failować na kroku "Kandydat".
  Jeśli nie masz tej etykiety, możesz pominąć krok pośredni — usuń linię `("Kandydat", "rola_kandydat")` z
  `tests/e2e/phases/phase_2_role_change_via_sheet.py` (stała `ROLE_CHANGE_SEQUENCE`).

- [ ] **E3.** Pole `modules` — przynajmniej jeden moduł skonfigurowany dla `rola_czlonek` i admina.
  Bez tego faza PB (widoczność modułów) zwróci fail.

---

## BLOK F — Plik .env.test

Utwórz plik `tests/e2e/.env.test` (kopiuj z `.env.test.template` jeśli istnieje):

```bash
# === Środowisko ===
ENV=dev

# === Konto testowe (główne — musi już istnieć i być zarejestrowane) ===
DEV_TEST_USER_EMAIL=<email konta testowego>
DEV_TEST_USER_PASSWORD=<hasło>
DEV_TEST_FIRST_NAME=<imię>
DEV_TEST_LAST_NAME=<nazwisko>
DEV_TEST_NICKNAME=<ksywa>
DEV_TEST_PHONE=<telefon, np. +48500100200>
DEV_TEST_DOB=<YYYY-MM-DD, np. 1990-06-15>

# === Konto admina ===
DEV_ADMIN_USER_EMAIL=<email admina>
DEV_ADMIN_USER_PASSWORD=<hasło>

# === Konto zawieszonego (nowe — krok D3) ===
DEV_SUSPENDED_USER_EMAIL=test-zawieszony@morzkulc.pl
DEV_SUSPENDED_USER_PASSWORD=<hasło z kroku D3a>

# === Konto skreślonego (nowe — krok D4) ===
DEV_DELETED_USER_EMAIL=test-skreslony@morzkulc.pl
DEV_DELETED_USER_PASSWORD=<hasło z kroku D4a>

# === Konto nowego użytkownika spoza BO26 (nowe — krok D5) ===
DEV_NEW_USER_EMAIL=test-nowy@morzkulc.pl
DEV_NEW_USER_PASSWORD=<hasło z kroku D5a>
DEV_NEW_USER_FIRST_NAME=Nowy
DEV_NEW_USER_LAST_NAME=Testowy
DEV_NEW_USER_PHONE=+48600900800
DEV_NEW_USER_DOB=1995-03-20
```

- [ ] **F1.** Plik `.env.test` istnieje w `tests/e2e/`
- [ ] **F2.** Wszystkie wartości z BLOKU D są uzupełnione
- [ ] **F3.** Plik NIE jest wersjonowany w git (sprawdź `.gitignore`)

---

## BLOK G — Weryfikacja przed uruchomieniem

Uruchom każdy krok osobno i sprawdź że nie ma błędów:

### G1. Testy bezpieczeństwa HTTP (nie wymagają arkusza ani gcloud)

```bash
cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e
ENV=dev python -m pytest test_security_http.py -v
```

**Oczekiwany wynik:**
- `TestAuthMiddleware` — wszystkie 6 testów: PASS
- `TestAdminEndpoint` — 2 testy: PASS (lub SKIP jeśli endpoint 404)
- `TestHostAllowlist` — `test_unknown_host_header_returns_403` może być SKIP (Firebase Hosting nadpisuje nagłówek — to normalne)
- `TestBlockedUsers` — PASS jeśli D3/D4 wykonane; SKIP jeśli konta nie skonfigurowane

### G2. Testy logiki BO26 i rejestracji

```bash
cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e
ENV=dev python -m pytest test_register_bo26.py -v
```

**Oczekiwany wynik:**
- `TestNewUserOutsideBO26` — PASS (wymaga D5)
- `TestRegistrationIdempotency` — PASS (wymaga działającego DEV_TEST_USER)
- `TestBO26MemberRole` — PASS lub SKIP (jeśli test_user nie jest w BO26)

### G3. Pełne testy E2E

```bash
cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e
ENV=dev python run_e2e.py
```

**Oczekiwany wynik faz:**
| Faza | Status | Warunek |
|------|--------|---------|
| P0 Pre-flight | PASS | Wszystkie B, C spełnione |
| P1 Registration | PASS | DEV_TEST_USER skonfigurowany |
| PA Suspended | PASS / SKIP | D3 wykonane → PASS; brak → SKIP |
| PB Modules | PASS | E3 spełnione |
| P2 Role change | PASS | E2 (roleMappings) skonfigurowane |
| P3–P9 | bez zmian | jak przed wdrożeniem |

---

## BLOK H — Znane ograniczenia i pułapki

### H1. Test host allowlist (SKIP jest normalny)

`test_unknown_host_header_returns_403` może zostać oznaczony jako SKIP, jeśli Firebase Hosting
nadpisuje nagłówek `X-Forwarded-Host` przed przekazaniem do Cloud Function.
To jest poprawne zachowanie infrastruktury — nie oznacza błędu w aplikacji.

### H2. Faza PA wymaga `blocksAccess: true` w Firestore

Bez tego pola w `setup/app.statusMappings[status_key]` middleware (`checkUserSuspended` w `index.ts`)
NIE zablokuje użytkownika. Test zwróci kod 200 zamiast 403 i faza PA zakończy się FAIL.

### H3. Faza P2 — etykieta "Kandydat" w roleMappings

Jeśli `setup/app.roleMappings` nie zawiera etykiety `"Kandydat"` (mała/wielka litera musi się zgadzać
z tym co zwraca `usersSyncRolesFromSheet`), faza P2 zakończy się FAIL na kroku pośrednim.  
Rozwiązanie: dodaj `rola_kandydat: { label: "Kandydat" }` do `setup/app.roleMappings` LUB
usuń pierwszą parę z `ROLE_CHANGE_SEQUENCE` w `phase_2_role_change_via_sheet.py`.

### H4. Konto test-nowy musi być poza BO26

Jeśli email `test-nowy@morzkulc.pl` przypadkowo istnieje w `users_opening_balance_26`,
test `test_outside_bo26_gets_rola_sympatyk` zakończy się FAIL.
Przed uruchomieniem sprawdź (krok D5b).

### H5. tearDown w test_register_bo26.py usuwa dane

Testy w `TestNewUserOutsideBO26` automatycznie usuwają dokument z `users_active` po każdym
teście. Jeśli test jest uruchamiany kilkukrotnie — to normalne zachowanie.

---

## Szybki start (po wypełnieniu wszystkich bloków A-F)

```bash
cd C:\Users\kswitek\Documents\morzkulc_app\tests\e2e

# Testy bezpieczeństwa (szybkie, ~30s, nie wymagają Sheets)
ENV=dev python -m pytest test_security_http.py test_register_bo26.py -v

# Pełne E2E (wolne, ~10-15 min)
ENV=dev python run_e2e.py
```