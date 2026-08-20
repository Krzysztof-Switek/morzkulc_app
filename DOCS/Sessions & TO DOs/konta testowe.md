# KONTA TESTOWE — SKK Morzkulc
**Data:** 2026-04-10
**Cel:** Pełne testowanie aplikacji na żywej stronie https://morzkulc-e9df7.web.app

---

## Wymagania ogólne

Logowanie w aplikacji działa wyłącznie przez **Google Auth (Google Provider)**. Wszystkie konta testowe muszą być kontami Google (Gmail). Zalecane nazewnictwo: `testowy.[rola]@gmail.com` dla łatwej identyfikacji w logach Firebase i Firestore.

---

## Minimalna lista kont testowych

### 1. Nowy użytkownik — brak w systemie
**Cel:** testowanie pełnego flow rejestracji nowego użytkownika

- Konto Google niezarejestrowane wcześniej w aplikacji
- **Nie dodawać** do `users_opening_balance_26`
- **Nie tworzyć** dokumentu w `users_active`

**Oczekiwany efekt:**
- Rola `rola_sympatyk` nadana automatycznie (default)
- Status `status_aktywny`
- Formularz profilu jako pierwsza strona (blokuje dostęp do panelu)
- Po uzupełnieniu profilu: welcome email, dodanie do Google Groups, sync do Google Sheets

---

### 2. Nowy użytkownik — dopasowanie BO26 jako członek
**Cel:** testowanie bootstrappingu roli z `users_opening_balance_26`

- Konto Google niezarejestrowane wcześniej w aplikacji
- **Dodać** email do kolekcji `users_opening_balance_26` z polem `"członek stowarzyszenia": true` **przed pierwszym logowaniem**

**Oczekiwany efekt:**
- Rola `rola_czlonek` nadana automatycznie przy pierwszym logowaniu (dopasowanie po emailu)
- Formularz profilu jako pierwsza strona
- Po uzupełnieniu profilu: sync do Sheets z etykietą "Członek"

---

### 3. Istniejący użytkownik — `rola_zarzad`
**Cel:** testowanie panelu admina, widoczności modułów admina, routingu per rola

- Konto Google
- Dokument w `users_active/{uid}`:
  ```json
  {
    "role_key": "rola_zarzad",
    "status_key": "status_aktywny",
    "profile": {
      "firstName": "Test",
      "lastName": "Zarzad",
      "phone": "500000001",
      "dateOfBirth": "1990-01-01",
      "consentRodo": true,
      "consentStatute": true
    }
  }
  ```

**Oczekiwany efekt:**
- Brak formularza profilu — od razu panel
- Routing do `screen_board` (jeśli skonfigurowane w setup)
- Widoczne moduły admina / zarządu
- Dostęp do endpointów `/api/basen/admin/**`

---

### 4. Istniejący użytkownik — `rola_czlonek`
**Cel:** testowanie widoku zwykłego członka, rezerwacji sprzętu, basenu

- Konto Google
- Dokument w `users_active/{uid}`:
  ```json
  {
    "role_key": "rola_czlonek",
    "status_key": "status_aktywny",
    "profile": {
      "firstName": "Test",
      "lastName": "Czlonek",
      "phone": "500000002",
      "dateOfBirth": "1992-05-15",
      "consentRodo": true,
      "consentStatute": true
    }
  }
  ```

**Oczekiwany efekt:**
- Brak formularza profilu — od razu panel
- Routing do `screen_member` (jeśli skonfigurowane w setup)
- Widoczne moduły członkowskie (rezerwacje sprzętu, basen, itp.)
- Brak dostępu do modułów admina

---

### 5. Użytkownik zawieszony — `status_zawieszony`
**Cel:** testowanie blokady dostępu

- Konto Google
- Dokument w `users_active/{uid}`:
  ```json
  {
    "role_key": "rola_czlonek",
    "status_key": "status_zawieszony",
    "profile": {
      "firstName": "Test",
      "lastName": "Zawieszony",
      "phone": "500000003",
      "dateOfBirth": "1988-03-20",
      "consentRodo": true,
      "consentStatute": true
    }
  }
  ```

**Oczekiwany efekt:**
- Zalogowanie przebiega normalnie
- Zero modułów widocznych w nawigacji
- Aplikacja zablokowana — brak dostępu do żadnego widoku

---

## Opcjonalne konta (pełne pokrycie)

| Konto | `role_key` | `status_key` | Cel |
|-------|-----------|-------------|-----|
| testowy.kr@gmail.com | `rola_kr` | `status_aktywny` | Panel komisji rewizyjnej — weryfikacja widoczności modułów KR |
| testowy.kursant@gmail.com | `rola_kursant` | `status_aktywny` | Moduły dla kursantów — weryfikacja ograniczonego dostępu |
| testowy.kandydat@gmail.com | `rola_kandydat` | `status_aktywny` | Widok kandydata — pośredni poziom dostępu |
| testowy.niekompletny@gmail.com | `rola_czlonek` | `status_aktywny` | Profil z brakującym polem (np. brak telefonu) — test walidacji formularza i blokady panelu |

---

## Jak skonfigurować konta 3, 4, 5

**Opcja A — przez konsolę Firestore:**
1. Zaloguj konto testowe → zostanie utworzony dokument w `users_active/{uid}` z domyślnymi wartościami
2. W konsoli Firebase → Firestore → `users_active/{uid}` → edytuj `role_key` i `status_key`

**Opcja B — ręczne tworzenie dokumentu:**
1. Pobierz UID konta z Firebase Authentication
2. Utwórz dokument `users_active/{uid}` ręcznie w konsoli Firestore ze strukturą jak wyżej

**Konto 2** wymaga wpisu w `users_opening_balance_26` **przed** pierwszym logowaniem tego konta.

---

## Scenariusze testowe do wykonania

| # | Scenariusz | Konto | Co sprawdzić |
|---|-----------|-------|-------------|
| T1 | Rejestracja nowego użytkownika | Konto 1 | formularz profilu, walidacja pól, submit, reload do panelu |
| T2 | Bootstrap roli z BO26 | Konto 2 | rola czlonek po pierwszym logowaniu bez ręcznej zmiany |
| T3 | Routing per rola | Konta 3 i 4 | czy hash po logowaniu różni się dla zarządu i członka |
| T4 | Blokada zawieszonego | Konto 5 | zero modułów, brak nawigacji |
| T5 | Widoczność modułów admina | Konto 3 vs 4 | czy czlonek nie widzi modułów admina |
| T6 | Sync profilu do Sheets | Konto 1 po rejestracji | czy wpis pojawia się w arkuszu Google |
| T7 | Idempotencja rejestracji | Konto 3 lub 4 | wielokrotne przeładowanie nie duplikuje danych |
