# Audyt pokrycia testami — Ranking / Kilometrówka / Mapa
**Data audytu:** 2026-04-25  
**Autor:** Claude Code (claude-sonnet-4-6)  
**Środowisko testowe:** DEV (`sprzet-skk-morzkulc`) i PROD (`morzkulc-e9df7`)

---

## 1. Stan infrastruktury testowej

### 1.1 Istniejące pliki testów

| Plik | Obszar | Typ | Uwagi |
|---|---|---|---|
| `tests/test_pwa.py` | PWA manifest | jednostkowy | sprawdza manifest.json |
| `tests/test_godzinki.py` | Godzinki | jednostkowy | walidacja logiki bez HTTP |
| `tests/test_bundle_reservations.py` | Sprzęt | jednostkowy | logika bundli |
| `tests/e2e/test_godzinki_api.py` | Godzinki | API HTTP | pełne pokrycie happy-path + błędy |
| `tests/e2e/test_register_bo26.py` | Rejestracja | API HTTP | flow BO26 |
| `tests/e2e/test_security_http.py` | Bezpieczeństwo | API HTTP | CORS, tokeny, allowlist |
| `tests/e2e/test_gear_reservations_api.py` | Sprzęt | API HTTP | rezerwacje kajaków |
| `tests/e2e/test_gear_private_storage.py` | Sprzęt prywatny | API HTTP | sprzęt prywatny |
| `tests/e2e/phases/phase_*.py` | E2E full | E2E Playwright | pełny flow onboarding+sprzęt |

### 1.2 Frameworki i wzorce

| Element | Wartość |
|---|---|
| Framework testowy | `unittest` + `pytest` |
| Uruchamianie | `ENV=dev python -m pytest tests/e2e/test_X.py -v` |
| Autoryzacja | Firebase REST API (`/v1/accounts:signInWithPassword`) → Bearer token |
| Dostęp Firestore | ADC (Application Default Credentials) — `gcloud auth application-default login` |
| HTTP client | `requests.Session` przez `ApiHelper` |
| Pattern sukcesu | `_check()` — `raise_for_status()` + zwróć JSON |
| Pattern błędu | `_soft()` — nie rzuca, zwraca raw JSON z kodem |
| Konfiguracja | `EnvConfig` z `config.py`, zmienne środowiskowe `DEV_*` / `PROD_*` |
| Konta testowe | Różne role: member, candidate, board, kr, sympatyk, boundary, suspended |

---

## 2. Pokrycie testami — moduł km/ranking/mapa

### 2.1 Podsumowanie: BRAK JAKICHKOLWIEK TESTÓW

Na dzień audytu nie istnieje ani jeden plik testowy pokrywający km/ranking/mapę.

| Endpoint | Plik testowy | Pokrycie |
|---|---|---|
| `POST /kmAddLog` | ❌ brak | 0% |
| `GET /kmMyLogs` | ❌ brak | 0% |
| `GET /kmMyStats` | ❌ brak | 0% |
| `GET /kmRankings` | ❌ brak | 0% |
| `GET /kmPlaces` | ❌ brak | 0% |
| `GET /api/km/map-data` | ❌ brak | 0% |
| `GET /api/km/event-stats` | ❌ brak | 0% |
| `km_scoring.ts` (logika punktów) | ❌ brak | 0% |
| `events_service.ts` (listRecentEvents) | ❌ brak | 0% |

### 2.2 Analiza per kategoria

#### RK — Ranking podstawowy (`GET /kmRankings`)
- **Istniejące testy:** 0
- **Brakujące:** uwierzytelnianie (401), parametry type/period/limit, sortowanie, wartości zerowe, specyficzny rok (`specificYear`)
- **Ryzyko:** WYSOKIE — ranking to główna publiczna funkcja modułu

#### RG — Ranking wyświetlanie (frontend km_module.js)
- **Istniejące testy:** 0 (UI w ogóle nie jest testowane automatycznie)
- **Uwaga:** Brak testów Playwright dla modułu km. Faza E2E onboardingowa nie wchodzi w km_module.
- **Ryzyko:** ŚREDNIE — weryfikacja tylko wizualna

#### RW — Ranking per rok (period=specificYear)
- **Istniejące testy:** 0
- **Brakujące:** in-memory sort dla `years[YYYY]`, limit, brak danych za rok
- **Ryzyko:** ŚREDNIE — mechanizm in-memory sort nieprzetestowany

#### FA — Formularz dodawania aktywności (`POST /kmAddLog`)
- **Istniejące testy:** 0
- **Brakujące:**
  - Happy path: wszystkie typy akwenu (6 typów)
  - Walidacja dat (brak, zły format, z przyszłości)
  - Walidacja km (0 dla playspot, ujemne, > 9999)
  - Walidacja hoursOnWater (null → 400, < 0, > 99, =0 OK)
  - Walidacja trudności (WW dla mountains, U dla lowlands, brak dla reszty)
  - Wywrotolotek (kabina/rolka/dziubek: zera, wartości, punkty)
  - Scoring: `computePoints()` — przeliczenie punktów z `km_vars`
  - eventId/eventName zapis
  - placeId upsert → `km_places`
  - Atomowość transakcji (log + user_stats w jednym TX)
  - Agregaty `km_user_stats` po zapisie (allTimeKm, yearKm, years map)
- **Ryzyko:** KRYTYCZNE — core feature, zero pokrycia

#### EV — Imprezy (`events` collection + `listRecentEvents`)
- **Istniejące testy:** 0
- **Brakujące:**
  - `listRecentEvents` — limit 5, filtr `startDate <= dziś`, `endDate >= 30 dni temu`
  - `listUpcomingEvents` — filtr `endDate >= dziś`
  - `listAllEvents` — brak filtra daty
  - Zapis eventId/eventName w km_log
  - Event-stats per eventId
- **Ryzyko:** ŚREDNIE

#### PL — Podpowiedzi akwenów (`GET /kmPlaces`)
- **Istniejące testy:** 0
- **Brakujące:** query < 2 znaki → pusta lista, query >= 2 → wyniki, limit, 401
- **Ryzyko:** ŚREDNIE — używane przez autocomplete w formularzu

#### PD — Szczegóły miejsca (`km_places` upsert)
- **Istniejące testy:** 0
- **Brakujące:** upsert przy nowym miejscu, merge przy istniejącym (searchTerms), lat/lng koordynaty
- **Ryzyko:** NISKIE-ŚREDNIE — błąd słownika nie blokuje zapisu logu (catch w handlerze)

#### MP — Mapa (`GET /api/km/map-data`)
- **Istniejące testy:** 0
- **Brakujące:** odpowiedź bez cache (locationCount=0), z cache, struktura locations[], 401
- **Ryzyko:** NISKIE — odczyt O(1) bez logiki

#### ED — Edycja/usunięcie logów (soft delete)
- **Istniejące testy:** 0
- **Uwaga:** Endpoint NIE ISTNIEJE — KROK 8 planu naprawczego
- **Ryzyko:** N/A (brak implementacji)

#### KU — Filtr kursantów w rankingu
- **Istniejące testy:** 0
- **Uwaga:** Funkcja NIE ISTNIEJE — KROK 9 planu naprawczego
- **Ryzyko:** N/A (brak implementacji)

#### SEC — Bezpieczeństwo endpointów km
- **Istniejące testy:** `test_security_http.py` — ale NIE pokrywa endpointów km
- **Brakujące:**
  - `POST /kmAddLog` bez tokena → 401
  - `GET /kmRankings` bez tokena → 401
  - `GET /kmMyLogs` cudzego uid → zawsze zwraca tylko własne logi (token = auth)
  - `GET /api/km/map-data` — brak `requireIdToken` w deps (potencjalny problem)
  - Walidacja `requireAllowedHost` dla km endpointów
- **Ryzyko:** WYSOKIE — map-data nie ma `requireIdToken` w interfejsie deps

#### FS — Integralność Firestore (km_user_stats)
- **Istniejące testy:** 0
- **Brakujące:**
  - Po `addKmLog`: sprawdzenie `km_user_stats/{uid}` — allTimeKm, yearKm, years map
  - Drugi wpis tego samego użytkownika — kumulacja agregatów
  - Wpis historyczny (inny rok) — nie nadpisuje bieżącego roku
  - Transakcja atomowa: log + stats razem
- **Ryzyko:** KRYTYCZNE — agregaty rankingowe zależą od poprawności tego kodu

#### UX — UX/interfejs km_module.js
- **Istniejące testy:** 0
- **Uwaga:** Brak automatycznych testów UI dla modułu km. Playwright fazy nie wchodzą w km.
- **Ryzyko:** NISKIE (ręczna weryfikacja)

#### E2E — Pełny przepływ
- **Istniejące testy:** 0
- **Brakujące:** pełny flow: login → dodaj log → sprawdź ranking → sprawdź my-stats
- **Ryzyko:** WYSOKIE — brak smoke testu całego modułu

---

## 3. Porównanie z istniejącymi testami (wzorce)

| Moduł | Testy API | Testy bezpieczeństwa | Testy Firestore | Testy E2E |
|---|---|---|---|---|
| Godzinki | ✅ pełne | ✅ (w security_http) | ✅ (bilans vs Firestore) | ✅ (faza 3) |
| Sprzęt / rezerwacje | ✅ pełne | ✅ | ✅ | ✅ (fazy 4-7) |
| Rejestracja / BO26 | ✅ | ✅ | ✅ | ✅ (faza 1) |
| **KM / Ranking / Mapa** | ❌ | ❌ | ❌ | ❌ |

---

## 4. Luki krytyczne (blokerzy)

| # | Luka | Ryzyko | Priorytet |
|---|---|---|---|
| L1 | Brak testów `POST /kmAddLog` — walidacja i zapis | Regresjaa po każdej zmianie walidacji | P0 |
| L2 | Brak testów `km_user_stats` — agregaty po zapisie | Błędne dane w rankingu | P0 |
| L3 | Brak testów security km endpointów | Nieznane luki auth | P0 |
| L4 | Brak testów `GET /kmRankings` — sortowanie, parametry | Ranking może pokazywać złe dane | P1 |
| L5 | Brak testów scoring (`computePoints`) | Błędne punkty = błędny ranking wywrotolotek | P1 |
| L6 | Brak testów `listRecentEvents` — limit 5 (KROK 4) | Regresja naprawki KROK 4 | P1 |
| L7 | `GET /api/km/map-data` nie ma `requireIdToken` w interfejsie | Potencjalnie publiczny endpoint | P1 |
| L8 | Brak testów `GET /kmPlaces` — autocomplete | Podpowiedzi mogą nie działać | P2 |
| L9 | Brak testów `GET /api/km/event-stats` | Ranking imprezy nieweryfikowany | P2 |

---

## 5. Zależności infrastrukturalne

Aby uruchomić testy km, potrzeba:

1. **Konta testowe z rolą umożliwiającą dostęp do modułu km** — moduł km dostępny dla `rola_czlonek`, `rola_zarzad`, `rola_kr` (weryfikacja via `setup/app`). Istniejące konta `member_user_*` i `board_user_*` powinny wystarczyć.
2. **`km_vars` w Firestore** — `setup/vars_members` z polami `ptsKabina`, `ptsEskimoska`, `ptsDziubek`, `scoringVersion`. Bez tego `getKmVars()` rzuca błąd.
3. **Czyszczenie po testach** — wpisy `km_logs` i `km_user_stats` tworzone przez testy muszą być usuwane (fixture cleanup przez ADC Firestore).
4. **Istniejące miejsce w `km_places`** — do testów autocomplete (`GET /kmPlaces`).
5. **Istniejące wydarzenie w `events`** — do testów `event-stats`.

---

## 6. Wnioski

- **Moduł km/ranking/mapa nie ma żadnego pokrycia testami automatycznymi.**
- Framework testowy jest dojrzały i dobrze udokumentowany — dodanie testów km nie wymaga zmian infrastruktury.
- Priorytety implementacji testów: `POST /kmAddLog` + `km_user_stats` → security → `GET /kmRankings` → pozostałe.
- Dwa bloki `ED` (edit/delete) i `KU` (kursant filter) nie mogą być testowane do czasu implementacji KROK 8 i KROK 9.
