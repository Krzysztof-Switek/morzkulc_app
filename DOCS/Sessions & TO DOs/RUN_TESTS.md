# RUN_TESTS — Instrukcja uruchamiania testów

Środowisko: PROD (`morzkulc-e9df7`)

---

## Wymagania wstępne

### Python

```bash
# Zainstaluj zależności
pip install pytest requests python-dotenv firebase-admin

# Playwright (tylko dla testów E2E przeglądarki)
pip install playwright
playwright install chromium
```

### Uwierzytelnienie Firestore (ADC)

Testy integracyjne i helper `FirestoreHelper` używają Application Default Credentials:

```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/cloud-platform

# Ustaw projekt domyślny (opcjonalnie)
gcloud config set project morzkulc-e9df7
```

Wymagana rola: `roles/datastore.user` na projekcie `morzkulc-e9df7`.

### Plik .env.test

Skopiuj szablon z `TEST_DATA_REQUIREMENTS.md` → sekcja 4. Plik umieść w:
```
tests/e2e/.env.test
```

Przykład (wypełnij hasłami):
```
ENV=prod

PROD_TEST_MEMBER_EMAIL=test.czlonek@morzkulc.pl
PROD_TEST_MEMBER_PASSWORD=<haslo>

PROD_TEST_CANDIDATE_EMAIL=test.kandydat@morzkulc.pl
PROD_TEST_CANDIDATE_PASSWORD=<haslo>

PROD_TEST_BOARD_EMAIL=test.zarzad@morzkulc.pl
PROD_TEST_BOARD_PASSWORD=<haslo>

PROD_TEST_KR_EMAIL=test.kr@morzkulc.pl
PROD_TEST_KR_PASSWORD=<haslo>

PROD_SUSPENDED_USER_EMAIL=test.zawieszony@morzkulc.pl
PROD_SUSPENDED_USER_PASSWORD=<haslo>

PROD_TEST_SYMPATYK_EMAIL=test.sympatyk@morzkulc.pl
PROD_TEST_SYMPATYK_PASSWORD=<haslo>

PROD_TEST_BOUNDARY_EMAIL=test.graniczny@morzkulc.pl
PROD_TEST_BOUNDARY_PASSWORD=<haslo>

PROD_ADMIN_USER_EMAIL=<admin_email>
PROD_ADMIN_USER_PASSWORD=<admin_haslo>

PROD_TEST_KAYAK_ID_1=<id_kajaka_1>
PROD_TEST_KAYAK_ID_2=<id_kajaka_2>
PROD_TEST_KAYAK_ID_3=<id_kajaka_3>
PROD_TEST_KAYAK_BASEN_ID=<id_kajaka_basenowego>
PROD_TEST_PADDLE_ID=<id_wiosla>
PROD_TEST_LIFEJACKET_ID=<id_kamizelki>
PROD_TEST_HELMET_ID=<id_kasku>
```

---

## Testy jednostkowe logiki (bez połączenia z Firebase)

Uruchom z katalogu głównego projektu:

```bash
# Wszystkie testy logiczne
python -m pytest tests/test_godzinki.py tests/test_bundle_reservations.py -v

# Tylko testy godzinek
python -m pytest tests/test_godzinki.py -v

# Tylko testy bundle
python -m pytest tests/test_bundle_reservations.py -v

# Z raportem pokrycia
python -m pytest tests/test_godzinki.py tests/test_bundle_reservations.py -v --tb=short
```

Oczekiwany wynik: wszystkie testy PASS. Brak zewnętrznych zależności.

---

## Testy integracyjne HTTP (wymagają PROD + .env.test + ADC)

Uruchom z katalogu `tests/e2e/`:

```bash
cd tests/e2e

# Wszystkie testy HTTP na PROD
ENV=prod python -m pytest test_gear_reservations_api.py test_godzinki_api.py test_security_http.py -v

# Tylko rezerwacje
ENV=prod python -m pytest test_gear_reservations_api.py -v

# Tylko godzinki
ENV=prod python -m pytest test_godzinki_api.py -v

# Tylko bezpieczeństwo (nie wymaga .env.test)
ENV=prod python -m pytest test_security_http.py -v

# Uruchom konkretny test
ENV=prod python -m pytest test_gear_reservations_api.py::TestAuthorization::test_A01_no_token_returns_401 -v

# Verbose + pokaż print/log
ENV=prod python -m pytest test_gear_reservations_api.py -v -s
```

### Ostrzeżenie

Testy HTTP tworzą i anulują rezerwacje na PROD. Każdy test ma setUp/tearDown z cleanup.
W razie przerwania testu (Ctrl+C) mogą pozostać aktywne rezerwacje w przyszłości
— należy je anulować ręcznie z poziomu Firebase Console lub aplikacji.

---

## Testy bezpieczeństwa HTTP (bez kont testowych)

```bash
cd tests/e2e
ENV=prod python -m pytest test_security_http.py -v
```

Testy weryfikują tylko token/host allowlist — nie tworzą danych w PROD.

---

## Testy E2E Playwright (planowane)

Playwright testy przeglądarki wymagają:
- Zainstalowanego Playwright: `pip install playwright && playwright install chromium`
- Wszystkich kont testowych z `.env.test`
- Konfiguracji timeout w `config.py` (`playwright_timeout_ms`)

```bash
cd tests/e2e
ENV=prod python -m pytest playwright/ -v --headed  # z oknem przeglądarki
ENV=prod python -m pytest playwright/ -v           # headless
```

---

## Pełny zestaw (wszystkie testy)

```bash
# Z katalogu głównego projektu
ENV=prod python -m pytest \
  tests/test_godzinki.py \
  tests/test_bundle_reservations.py \
  tests/e2e/test_security_http.py \
  tests/e2e/test_gear_reservations_api.py \
  tests/e2e/test_godzinki_api.py \
  -v --tb=short 2>&1 | tee test_results.txt
```

---

## Konfiguracja logowania

Ustaw `LOG_LEVEL=DEBUG` dla szczegółowych logów HTTP:

```bash
LOG_LEVEL=DEBUG ENV=prod python -m pytest test_gear_reservations_api.py -v -s
```

---

## Konfiguracja timeoutów

W `config.py`:
- `job_poll_timeout_seconds` — maksymalny czas oczekiwania na job serwisowy (domyślnie: 60s)
- `job_poll_interval_seconds` — częstotliwość odpytywania (domyślnie: 2s)
- `playwright_timeout_ms` — timeout Playwright (domyślnie: 15000ms)

---

## Znane ograniczenia

| Ograniczenie | Przyczyna | Obejście |
|-------------|----------|----------|
| Testy E2E wymagają kont testowych w PROD | Firebase Auth email/password | Utwórz konta wg `TEST_DATA_REQUIREMENTS.md` |
| Submit godzinek zostawia pending-earn w PROD | Brak auto-cleanup API dla pending | Testy czyszczą przez Firestore helper; pending bez approve'a nie wpływa na bilans |
| Race condition test (F07-F08) niestabilny | Sieć wprowadza opóźnienia | Uruchom kilka razy; test jest niedeterministyczny |
| Zatwierdzenie godzinek (pełny flow) | Wymaga ręcznego kroku w arkuszu | Test G11 używa bezpośredniego grantu Firestore zamiast pełnego flow |

---

## CI/CD (GitHub Actions — opcjonalne)

Aby uruchomić testy HTTP w CI:

```yaml
- name: Run integration tests
  env:
    ENV: prod
    PROD_TEST_MEMBER_EMAIL: ${{ secrets.PROD_TEST_MEMBER_EMAIL }}
    PROD_TEST_MEMBER_PASSWORD: ${{ secrets.PROD_TEST_MEMBER_PASSWORD }}
    # ... pozostałe secrets
    GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/gcp-key.json
  run: |
    echo '${{ secrets.GCP_SA_KEY }}' > ${{ runner.temp }}/gcp-key.json
    cd tests/e2e
    python -m pytest test_gear_reservations_api.py test_godzinki_api.py -v --tb=short
```
