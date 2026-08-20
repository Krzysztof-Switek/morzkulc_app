# TEST_DATA_REQUIREMENTS — Wymagania i instrukcja konfiguracji danych testowych

Środowisko: PROD (`morzkulc-e9df7`)

---

## 1. Konta testowe — przegląd

Testy wymagają **7 kont email/password** w Firebase Auth. Konta NIE mogą być Google OAuth
— testy logują się przez REST API (`signInWithPassword`) i potrzebują hasła.

| Email | Zmienna ENV | `role_key` | `status_key` | Saldo godzinek | Cel |
|-------|-------------|-----------|-------------|----------------|-----|
| `test.czlonek@morzkulc.pl` | `PROD_TEST_MEMBER_*` | `rola_czlonek` | `status_aktywny` | 3 pule FIFO: 30h+30h+40h | Główne konto testowe |
| `test.kandydat@morzkulc.pl` | `PROD_TEST_CANDIDATE_*` | `rola_kandydat` | `status_aktywny` | 0h (granty przez fixture) | Testy limitów kandydata |
| `test.zarzad@morzkulc.pl` | `PROD_TEST_BOARD_*` | `rola_zarzad` | `status_aktywny` | 0h | Testy boardDoesNotPay |
| `test.kr@morzkulc.pl` | `PROD_TEST_KR_*` | `rola_kr` | `status_aktywny` | 0h | Testy kr nie płaci |
| `test.zawieszony@morzkulc.pl` | `PROD_SUSPENDED_USER_*` | `rola_czlonek` | `status_zawieszony` | 0h | Testy blokady statusu |
| `test.sympatyk@morzkulc.pl` | `PROD_TEST_SYMPATYK_*` | `rola_sympatyk` | `status_aktywny` | 0h | Testy blokady roli |
| `test.graniczny@morzkulc.pl` | `PROD_TEST_BOUNDARY_*` | `rola_czlonek` | `status_aktywny` | 0h (granty przez fixture) | Scenariusze graniczne |

> Salda dla `test.kandydat`, `test.graniczny` i innych są ustawiane automatycznie przez `FirestoreHelper.grant_godzinki()` w setUp testów i czyszczone w tearDown. Nie trzeba ich ręcznie tworzyć, za wyjątkiem `test.czlonek` (patrz krok 3).

---

## 2. Instrukcja krok po kroku — tworzenie kont

### Krok 1 — Wypełnij plik `.env.test`

Utwórz plik `tests/e2e/.env.test` (NIE commituj go do git — jest w `.gitignore`):

```
ENV=prod

# Główne konto testowe (czlonek)
PROD_TEST_MEMBER_EMAIL=test.czlonek@morzkulc.pl
PROD_TEST_MEMBER_PASSWORD=<haslo>

# Kandydat
PROD_TEST_CANDIDATE_EMAIL=test.kandydat@morzkulc.pl
PROD_TEST_CANDIDATE_PASSWORD=<haslo>

# Zarząd (dla testów boardDoesNotPay)
PROD_TEST_BOARD_EMAIL=test.zarzad@morzkulc.pl
PROD_TEST_BOARD_PASSWORD=<haslo>

# KR
PROD_TEST_KR_EMAIL=test.kr@morzkulc.pl
PROD_TEST_KR_PASSWORD=<haslo>

# Zawieszony
PROD_SUSPENDED_USER_EMAIL=test.zawieszony@morzkulc.pl
PROD_SUSPENDED_USER_PASSWORD=<haslo>

# Sympatyk
PROD_TEST_SYMPATYK_EMAIL=test.sympatyk@morzkulc.pl
PROD_TEST_SYMPATYK_PASSWORD=<haslo>

# Graniczny (dynamiczne saldo — zarządzane przez fixture)
PROD_TEST_BOUNDARY_EMAIL=test.graniczny@morzkulc.pl
PROD_TEST_BOUNDARY_PASSWORD=<haslo>

# Admin — istniejące konto zarządu (Twoje własne)
PROD_ADMIN_USER_EMAIL=<twoj_email>
PROD_ADMIN_USER_PASSWORD=<twoje_haslo>

# IDs sprzętu — OPCJONALNE
# Jeśli nie ustawione, testy auto-wykrywają sprzęt z API (GET /api/gear/kayaks, /items)
# Ustaw tylko jeśli chcesz wymusić konkretne egzemplarze
# PROD_TEST_KAYAK_ID_1=
# PROD_TEST_KAYAK_ID_2=
# PROD_TEST_KAYAK_ID_3=
# PROD_TEST_KAYAK_BASEN_ID=
# PROD_TEST_PADDLE_ID=
# PROD_TEST_LIFEJACKET_ID=
# PROD_TEST_HELMET_ID=
```

---

### Krok 5 — Zweryfikuj konfigurację

```bash
# Z katalogu tests/e2e/
cd tests/e2e

# Test połączenia — nie wymaga kont (tylko token/host allowlist)
ENV=prod python -m pytest test_security_http.py -v

# Test autoryzacji — wymaga kont z .env.test
ENV=prod python -m pytest test_gear_reservations_api.py::TestAuthorization -v

# Pełne testy godzinek
ENV=prod python -m pytest test_godzinki_api.py -v
```

---

## 3. Sprzęt testowy w Firestore

**Testy używają istniejącego sprzętu z PROD — nie trzeba tworzyć dedykowanych rekordów.**

`GearDiscovery` (`helpers/gear_discovery.py`) automatycznie pobiera sprzęt z API przy starcie testów:
- `GET /api/gear/kayaks` → pierwsze 3 aktywne, operacyjne, nie-basenowe kajaki
- `GET /api/gear/items?category=paddles` → pierwsze aktywne wiosło
- `GET /api/gear/items?category=lifejackets` → pierwsza aktywna kamizelka
- `GET /api/gear/items?category=helmets` → pierwszy aktywny kask

### Minimalne wymagania co do katalogu

| Kategoria | Ile | Wymagane pola |
|-----------|-----|---------------|
| `gear_kayaks` | ≥ 3 | `isActive=true`, `isOperational=true`, `storage≠"basen"`, `isPrivate=false` |
| `gear_paddles` | ≥ 1 | `isActive=true` |
| `gear_lifejackets` | ≥ 1 | `isActive=true` |
| `gear_helmets` | ≥ 1 | `isActive=true` |

**Uwaga o bezpieczeństwie:** Testy rezerwują kajaki na daty **200+ dni w przyszłości** i anulują w tearDown. Nie blokują sprzętu dla prawdziwych użytkowników.

---

## 4. Setup (Firestore `setup/vars_gear` i `setup/vars_godzinki`)

Sprawdź przed uruchomieniem testów że wartości są ustawione:

**`setup/vars_gear`**
```json
{
  "vars": {
    "offset_rezerwacji":          { "value": 1 },
    "godzinki_za_kajak":          { "value": 10 },
    "zarzad_nie_płaci_za_sprzet": { "value": true },
    "zarząd_max_time":            { "value": 4 },
    "członek_max_time":           { "value": 2 },
    "kandydat_max_time":          { "value": 1 },
    "zarząd_max_items":           { "value": 100 },
    "członek_max_items":          { "value": 3 },
    "kandydat_max_items":         { "value": 1 }
  }
}
```

**`setup/vars_godzinki`**
```json
{
  "vars": {
    "limit_ujemnego_salda": { "value": 20 },
    "lata_waznosci":        { "value": 4 }
  }
}
```

---

## 5. Cleanup — jak testy dbają o porządek

| Konto | Czy test modyfikuje dane | Cleanup |
|-------|--------------------------|---------|
| `test.czlonek` | TAK — tworzy rezerwacje, granty godzinek | tearDown anuluje rezerwacje, usuwa granty |
| `test.kandydat` | TAK — tworzy rezerwacje | tearDown anuluje |
| `test.zarzad` | TAK — tworzy rezerwacje | tearDown anuluje |
| `test.kr` | TAK — tworzy rezerwacje | tearDown anuluje |
| `test.zawieszony` | NIE — tylko próby, które są blokowane | brak |
| `test.sympatyk` | NIE — tylko próby, które są blokowane | brak |
| `test.graniczny` | TAK — granty godzinek przez fixture | tearDown usuwa granty |

Testy używają dat **200+ dni w przyszłości** — nawet jeśli tearDown się nie wykona (Ctrl+C),
rezerwacje pozostają nieaktywne i można je anulować ręcznie przez aplikację lub Firestore Console.
