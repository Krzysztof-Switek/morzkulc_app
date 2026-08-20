# Audyt: Ranking / Kilometrówka / Godziny / Wywrotolotek / Mapa

**Wersja:** v2  
**Data:** 2026-04-25  
**Autor:** Lead Firebase / TypeScript / Frontend Engineer (audyt automatyczny)  
**Środowisko:** PROD (`morzkulc-e9df7`) i DEV (`sprzet-skk-morzkulc`)

---

## 1. Znalezione wcześniejsze audyty

| Plik | Data | Czego dotyczy | Aktualność |
|------|------|---------------|------------|
| `Audyty/ranking_wdrozenie_audyt.md` | 2026-04-12 | Pierwsze wdrożenie modułu Kilometrówka (backend, frontend, GAS) | ✅ Częściowo aktualna — opisuje stan po wdrożeniu, ale moduł rozbudowano od tamtej daty (kmMapData, kmEventStats, kmMergeHistoricalUser, kmRebuildMapData) |
| `Audyty/AUDIT_MAP.md` | 2026-04-20 | Mapa systemu godzinkowego i rezerwacji — NIE dotyczy km | ❌ Inny zakres |
| `Audyty/AUDIT_PLAN.md` | 2026-04-20 | Plan audytu godzinki/rezerwacje — NIE dotyczy km | ❌ Inny zakres |
| `Audyty/audyt_v2.md` | 2026-04-10 | Ogólny audyt systemu v2 | Historyczny |
| `Audyty/audyt_rejestracja.md` | 2026-04-09 | Rejestracja użytkowników | Inny zakres |

**Wniosek:** Jedynym audytem dedykowanym km jest `ranking_wdrozenie_audyt.md` z 2026-04-12. Niniejszy audyt (v2) go aktualizuje i uzupełnia o wszystkie znalezione braki i błędy.

---

## 2. Aktualna struktura plików

### Frontend (`public/`)

| Plik | Opis | Linie |
|------|------|-------|
| `public/modules/km_module.js` | Główny moduł Kilometrówka — 6 zakładek: Dodaj wpis, Ranking, Imprezy, Mapa, Moje statystyki, Moje wpisy | 1037 |
| `public/styles/km.css` | Style modułu | — |
| `public/map.html` | Osobna strona mapy otwierana w nowym oknie | ~120 |
| `public/core/modules_registry.js` | Rejestracja modułu `km` (label "ranking" → type "km") | — |

### Backend (`functions/src/`)

#### Handlery API (`api/`)

| Plik | Endpoint | Typ |
|------|----------|-----|
| `kmAddLogHandler.ts` | `POST /api/km/log/add` | UI (auth) |
| `kmMyLogsHandler.ts` | `GET /api/km/logs` | UI (auth) |
| `kmMyStatsHandler.ts` | `GET /api/km/stats` | UI (auth) |
| `kmRankingsHandler.ts` | `GET /api/km/rankings` | UI (auth) |
| `kmPlacesHandler.ts` | `GET /api/km/places` | UI (auth) |
| `kmEventStatsHandler.ts` | `GET /api/km/event-stats` | UI (auth) |
| `kmMapDataHandler.ts` | `GET /api/km/map-data` | ⚠️ Brak wymaganego tokenu — patrz sekcja 4 |

#### Moduły serwisowe (`modules/km/`)

| Plik | Opis |
|------|------|
| `km_vars.ts` | Czyta `setup/vars_members` → `kabina_punkty`, `eskimoska_punkty`, `dziubek_punkty` |
| `km_scoring.ts` | `computePoints()` — ON WRITE, tylko wywrotolotek |
| `km_log_service.ts` | `addKmLog`, `getUserKmLogs`, `getUserKmStats`, `updateUserStatsInTransaction` |
| `km_places_service.ts` | `searchKmPlaces`, `upsertKmPlace`, `tokenizeName` |

#### Service tasks (`service/tasks/`)

| Task ID | Plik | Opis |
|---------|------|------|
| `km.rebuildUserStats` | `kmRebuildUserStats.ts` | Przelicza `km_user_stats/{uid}` z `km_logs` dla jednego użytkownika |
| `km.rebuildRankings` | `kmRebuildRankings.ts` | Przebudowuje `km_user_stats` dla WSZYSTKICH uid |
| `km.mergeHistoricalUser` | `kmMergeHistoricalUser.ts` | Scala wpisy `hist_{email}` → prawdziwy uid po rejestracji |
| `km.rebuildMapData` | `kmRebuildMapData.ts` | Agreguje `km_logs` z lat/lng → `km_map_cache/v1` |

### Testy

| Plik | Co pokrywa |
|------|-----------|
| `tests/e2e/` | Brak plików dla km — testy e2e nie istnieją dla modułu |
| `tests/test_*.py` | Brak testów dla km w katalogu tests/ |

### GAS (`appscript/kilometrówka/`)

| Plik | Opis |
|------|------|
| `archiwum_sync.gs` | Import historyczny (7 027 wierszy) → `km_logs` |
| `ranking_sync.gs` | Pobieranie i korekty rankingów przez zarząd |
| `common_helpers.gs` | Helpery Firestore REST |
| `ui_menu.gs` | Menu GAS: Eksportuj archiwum, Ranking korekta, Ranking pobierz |
| `env_config.gs` | Konfiguracja projektu (PROD/DEV) |

### Firestore

- **Rules:** Brak pliku `firestore.rules` w repozytorium — reguły muszą być wdrożone bezpośrednio przez konsolę lub oddzielny plik.
- **Indexes:** `firestore.indexes.json` zawiera 3 indeksy dla `km_logs`.

---

## 3. Aktualne endpointy

### Km / Ranking

| Endpoint | Metoda | Auth | Opis |
|----------|--------|------|------|
| `/api/km/log/add` | POST | ✅ Firebase ID token | Dodaj wpis aktywności |
| `/api/km/logs` | GET | ✅ Firebase ID token | Moje wpisy (limit 50) |
| `/api/km/stats` | GET | ✅ Firebase ID token | Moje statystyki |
| `/api/km/rankings` | GET | ✅ Firebase ID token | Rankingi (km/points/hours, alltime/year/specificYear) |
| `/api/km/places` | GET | ✅ Firebase ID token | Autocomplete nazw akwenów |
| `/api/km/event-stats` | GET | ✅ Firebase ID token | Statystyki wywrotolotek imprezy |
| `/api/km/map-data` | GET | ⚠️ Brak tokenu (patrz sekcja 4) | Pre-computed cache mapy |

### Imprezy (użyte przez km)

| Endpoint | Metoda | Auth | Opis |
|----------|--------|------|------|
| `/api/events?mode=recent` | GET | ✅ Firebase ID token | Imprezy ostatnich 30 dni (dla formularza) |
| `/api/events?mode=all` | GET | ✅ Firebase ID token | Wszystkie zatwierdzone imprezy (dla zakładki Imprezy) |

### Brak endpointów (wymagane, a nie istnieją)

- `PUT /api/km/log/{logId}` — edycja własnego wpisu
- `DELETE /api/km/log/{logId}` — usunięcie (soft delete) własnego wpisu
- `POST /api/admin/km/log/{logId}/hide` — ukrycie wpisu przez zarząd
- Kursant-specific ranking filter
- Endpoint dla listy miejsc z merge/alias

---

## 4. Bezpieczeństwo endpointów

### Pozytywne

- Wszystkie Cloud Functions używają `invoker: "private"` (nie-publiczne wywołanie GCP)
- Host allowlist (`ALLOWED_HOSTS`) i CORS allowlist (`ALLOWED_ORIGINS`) wdrożone w `index.ts`
- Wszystkie endpointy km (oprócz map-data) wymagają Firebase ID token

### Problemy

| # | Priorytet | Problem | Plik | Szczegóły |
|---|-----------|---------|------|-----------|
| B1 | ⚠️ BEZPIECZEŃSTWO | `GET /api/km/map-data` nie wymaga Firebase ID token | `kmMapDataHandler.ts` | `requireIdToken` jest OPCJONALNE w typie deps i nie jest wołane w handlerze. `map.html` wywołuje endpoint bez żadnego tokenu. Dane mapy są faktycznie publiczne dla każdego, kto zna URL. |
| B2 | ⚠️ BEZPIECZEŃSTWO | `map.html` wysyła request bez tokenu auth | `public/map.html:54` | `fetch("/api/km/map-data")` bez `Authorization` headera |
| B3 | INFO | Brak edycji/usuwania po stronie backendu | — | Nie istnieje żaden endpoint ani middleware do edycji/usunięcia km_logs. Nie ma możliwości nadużycia, ale też nie ma wymaganej funkcji |

---

## 5. Aktualne kolekcje Firestore

| Kolekcja | Status | Zawartość |
|----------|--------|-----------|
| `km_logs/{logId}` | ✅ Istnieje | Wpisy aktywności (runtime + historical) |
| `km_user_stats/{uid}` | ✅ Istnieje | Agregaty użytkownika (flat + years map) |
| `km_places/{placeId}` | ✅ Istnieje | Słownik miejsc z searchTerms/aliases/useCount |
| `km_map_cache/v1` | ✅ Istnieje | Pre-computed lista lokalizacji z logCount/totalKm/topUsers |
| `events` | ✅ Istnieje | Imprezy (approved, startDate, endDate, name, location) |
| `users_active/{uid}` | ✅ Istnieje | Profile użytkowników z role_key, status_key |
| `setup/vars_members` | ✅ Istnieje | Punktacja wywrotolotka: kabina_punkty, eskimoska_punkty, dziubek_punkty |
| Kolekcja `places` | ❌ Nie istnieje | Brak osobnej kolekcji `places` — miejsca są w `km_places` |

---

## 6. Aktualny model danych

### km_logs — pola obecne

| Pole | Typ | Status |
|------|-----|--------|
| `logId` | string | ✅ |
| `uid` | string | ✅ |
| `userSnapshot` | `{displayName, nickname, email}` | ✅ |
| `date` | string YYYY-MM-DD | ✅ |
| `year` | number | ✅ |
| `seasonKey` | string | ✅ |
| `waterType` | enum | ✅ |
| `placeName` | string | ✅ |
| `placeNameRaw` | string | ✅ |
| `placeId` | string (opcjonalne) | ✅ |
| `lat` | number (opcjonalne) | ✅ |
| `lng` | number (opcjonalne) | ✅ |
| `km` | number | ✅ |
| `hoursOnWater` | number (opcjonalne) | ⚠️ Opcjonalne — patrz sekcja 16 |
| `capsizeRolls` | `{kabina, rolka, dziubek}` | ✅ |
| `pointsTotal` | number | ✅ |
| `pointsBreakdown` | `{capsizeRolls}` | ✅ |
| `scoringVersion` | string | ✅ hardcoded "v1" |
| `sourceType` | "runtime" lub "historical" | ✅ |
| `isPartial` | boolean | ✅ |
| `createdAt` | Timestamp | ✅ |
| `updatedAt` | Timestamp | ✅ |
| `eventId` | string (opcjonalne) | ✅ |
| `eventName` | string (opcjonalne) | ✅ |
| `sectionDescription` | string (opcjonalne) | ✅ |
| `note` | string (opcjonalne) | ✅ |
| `activityType` | string (opcjonalne) | ✅ |
| `difficultyScale` | "WW" \| "U" \| null | ✅ |
| `difficulty` | string \| null | ✅ |
| **`visibility`** | — | ❌ Brak |
| **`deletedAt`** | — | ❌ Brak |
| **`deletedBy`** | — | ❌ Brak |
| **`setupHash`** | — | ❌ Brak |
| **`capsizeCabinCount`** | — | ⚠️ Używane nazewnictwo: `capsizeRolls.kabina` |
| **`rollCount`** | — | ⚠️ Używane nazewnictwo: `capsizeRolls.rolka` |
| **`bowCount`** | — | ⚠️ Używane nazewnictwo: `capsizeRolls.dziubek` |
| **`wywrotolotekPointsTotal`** | — | ⚠️ Używane: `pointsTotal` (jest tożsame, ale inne nazewnictwo) |

### km_user_stats — pola obecne

Flat pola: `allTimeKm`, `allTimeHours`, `allTimePoints`, `allTimeLogs`, `allTimeCapsizeKabina/Rolka/Dziubek`, `yearKm`, `yearHours`, `yearPoints`, `yearLogs`, `yearKey`, `seasonKm`, `seasonHours`, `seasonPoints`, `seasonLogs`, `seasonKey`.

Per-rok mapa: `years.{YYYY}.{km, hours, days, points, logs}`.

### km_places — model

Pola: `name`, `aliases[]`, `searchTerms[]` (tokeny lowercase do array-contains), `waterType`, `country`, `lat`, `lng`, `useCount`, `createdAt`, `updatedAt`.

**Brak:** `riverName`, `sectionName`, `aliasOf` (pole merge).

### events — model

Pola: `name`, `startDate`, `endDate`, `location`, `description`, `contact`, `link`, `approved` (boolean), `source`, `userUid`, `userEmail`, `createdAt`, `updatedAt`.

**Brak:** pola `status` z wartościami cancelled/draft/inactive. Jedyna kontrola: `approved: boolean`.

---

## 7. Aktualna logika rankingów

| Pytanie | Stan |
|---------|------|
| Czy są 3 niezależne rankingi? | ✅ km, points (wywrotolotek), hours — osobne pola i osobny widok |
| Czy kilometry są oddzielone od punktów? | ✅ Tak — `km` i `pointsTotal` to osobne pola |
| Czy godziny są osobno? | ✅ Tak — `hoursOnWater` to osobne pole |
| Czy wywrotolotek jest osobno? | ✅ Tak |
| Domyślnie bieżący rok? | ❌ NIE — domyślnie `alltime`, nie bieżący rok |
| Rok liczony po activityDate? | ✅ Tak — `year` pochodzi z `date.slice(0,4)` |
| Specyficzny rok ranking? | ✅ Istnieje (in-memory sort z `years` map) |
| Brak mieszania km z punktami? | ✅ Potwierdzone |

**Problem:** Domyślny period w UI to `alltime`, a spec wymaga `bieżący rok`.

---

## 8. Aktualna logika mapy

| Pytanie | Stan |
|---------|------|
| Czy mapa istnieje? | ✅ Tak — `map.html` + zakładka Mapa (otwiera nowe okno) |
| Biblioteka | Leaflet.js 1.9.4 (ładowany dynamicznie z `unpkg.com`) |
| Źródło kafelków | CARTO dark_all — **bezpieczne kosztowo**, bezpłatne dla NGO |
| Mobile? | ⚠️ Częściowo — Leaflet działa na mobile, ale zakładka otwiera nowe okno (`window.open`) co jest nieoptymalne na iOS |
| Czy pokazuje miejsca? | ✅ Tak — markery po lokalizacjach z `km_map_cache/v1` |
| Czy nie miesza punktów/km/godzin? | ⚠️ NIE — popup pokazuje `logCount` i `totalKm`. Spec mówi że mapa NIE pokazuje km. |
| Liczba wizyt | ✅ `logCount` (jedna aktywność = jedna wizyta) |
| Filtr po roku | ❌ Brak — mapa zawsze pokazuje wszystkie dane z całego archiwum |
| 3 ostatnie osoby (activityDate desc) | ❌ Nie — `topUsers` posortowane po **całkowitym km**, nie po `activityDate desc` |
| Ryzyko kosztowe | ✅ Brak — CARTO/OSM jest darmowe, dane pre-computed (O(1) read) |
| Czy odpytuje backend przy każdym markerze? | ✅ Nie — jeden request do `/api/km/map-data` (pre-computed cache) |

**Problemy mapy:**
1. `map.html` wywołuje `/api/km/map-data` bez tokenu (B1 w sekcji 4)
2. Popup pokazuje totalKm — spec zabrania km na mapie
3. `topUsers` sortowane po km zamiast activityDate
4. Brak filtru po roku
5. Zakładka otwiera nowe okno — na mobile UX utrudniony

---

## 9. Aktualna logika miejsc

| Pytanie | Stan |
|---------|------|
| Czy jest kolekcja miejsca? | ✅ `km_places` (nie `places`) |
| placeId? | ✅ Istnieje |
| lat/lng? | ✅ Istnieje w km_places |
| Duplikaty? | ⚠️ Możliwe — mechanizm upsert sprawdza tylko canonical name (case-insensitive), nie ma merge/alias |
| Podpowiadanie? | ✅ Autocomplete z debounce 300ms, min 2 znaki, limit 10 |
| Mechanizm merge/alias? | ❌ Brak — km_places ma `aliases[]` w modelu ale brak endpointu do merge |
| Indeks Firestore dla searchTerms? | ❌ Brak composite index (searchTerms array-contains + useCount desc) w `firestore.indexes.json` — ryzyko błędu na prod |
| Historyczne miejsca w słowniku? | ❌ Archiwum_sync.gs nie upsertuje `km_places` — historyczne nazwy nie są w autocomplete |

---

## 10. Aktualna logika formularza

| Pytanie | Stan |
|---------|------|
| Jakie pola ma formularz? | date, waterType, difficulty (warunkowe), placeName, sectionDescription (opt), km, hoursOnWater (opt), activityType (opt), event (opt), kabina/rolka/dziubek, note (opt) |
| km wymagane i > 0? | ✅ Frontend `min="0.1"`, Backend rejects `km <= 0` |
| km = 0 możliwe? | ❌ NIE — **BLOCKER** dla playspot (distanceKm = 0 jest wymagane przez spec) |
| hoursOnWater wymagane (może = 0)? | ❌ NIE — hoursOnWater jest opcjonalne w formularzu (brak pola required) i na backendzie (`hoursOnWater?: number`) |
| capsizeRolls wymagane (może = 0)? | ✅ Tak — wartości 0 są domyślne i akceptowane |
| placeName wymagane? | ✅ Tak |
| Impreza opcjonalna? | ✅ Tak |
| Lista imprez — limit 5? | ❌ Brak limitu — wszystkie imprezy z ostatnich 30 dni |
| Lista imprez — bez przyszłych? | ✅ `listRecentEvents` filtruje startDate <= dziś |
| Lista imprez — najnowsza na górze? | ✅ Sortowanie startDate DESC |
| Lista imprez — bez cancelled/draft? | ⚠️ Brak pola status — filtr jest po `approved: true`, nie po statusie |
| Walidacja backendowa km? | ✅ `km <= 0` → 400 |
| Walidacja backendowa placeName? | ✅ puste → 400 |
| Walidacja backendowa daty? | ✅ przyszłość → 400 |

---

## 11. Aktualna logika edycji/usuwania

| Pytanie | Stan |
|---------|------|
| Użytkownik może edytować własne wpisy? | ❌ Brak endpointu |
| Użytkownik może usuwać własne wpisy? | ❌ Brak endpointu |
| Zarząd może edytować dowolne wpisy? | ❌ Brak endpointu |
| Zarząd może ukrywać dowolne wpisy? | ❌ Brak endpointu |
| Backend wymusza uprawnienia? | N/A (brak endpointów) |
| Soft delete (deletedAt/deletedBy/visibility)? | ❌ Brak pól w modelu |

---

## 12. Aktualna logika kursantów

| Pytanie | Stan |
|---------|------|
| Czy istnieje rola kursanta? | ✅ `rola_kursant` istnieje w systemie |
| Czy rola pochodzi z setup? | ✅ Tak — z arkusza synchronizowanego do Firestore |
| Czy kursanci są w users_active? | ✅ Tak |
| Czy mają Firebase UID? | ✅ Tak |
| Osobny moduł kursów? | ❌ Brak |
| Ranking kursantów po roku? | ❌ Brak dedykowanego filtra roli w `kmRankingsHandler` |
| Czy ranking km_user_stats filtruje po roli? | ❌ Brak — ranking nie filtruje po `role_key` |

**Uwaga:** Filtrowanie po roku `specificYear` jest możliwe (in-memory z `years` map). Filtr po roli wymaga doczytania profilu każdego użytkownika lub denormalizacji `role_key` do `km_user_stats`.

---

## 13. Aktualna punktacja wywrotolotka

| Pytanie | Stan |
|---------|------|
| Skąd wartości punktowe? | ✅ `setup/vars_members` → `kabina_punkty`, `eskimoska_punkty`, `dziubek_punkty` |
| Czy są w setup? | ✅ Tak |
| Czy są hardcodowane? | ⚠️ Częściowo — `scoringVersion: "v1"` jest hardcoded w `km_vars.ts:42` |
| Punkty ON WRITE czy ON READ? | ✅ ON WRITE — `computePoints()` wołane przy zapisie w `km_log_service.ts` i rebuild task |
| setupHash w logu? | ❌ Brak |
| Osobne pole `wywrotolotekPointsTotal`? | ⚠️ Używane jest `pointsTotal` — funkcjonalnie równoważne ale inne nazewnictwo |

---

## 14. Aktualne testy

### Istniejące testy (NIE dla km)

| Plik | Co pokrywa |
|------|-----------|
| `tests/test_godzinki.py` | Logika FIFO godzinek |
| `tests/test_bundle_reservations.py` | Rezerwacje bundle |
| `tests/e2e/test_gear_reservations_api.py` | HTTP API rezerwacji |
| `tests/e2e/test_godzinki_api.py` | HTTP API godzinek |
| `tests/e2e/test_security_http.py` | Token, host allowlist |
| `tests/e2e/test_register_bo26.py` | Rejestracja użytkowników |

### Testy dla km — BRAK

Nie istnieje żaden plik testowy dla:
- Logiki km (km_scoring, km_log_service, km_places_service)
- Endpointów km (HTTP API)
- Taskow serwisowych km (rebuildUserStats, rebuildRankings, mergeHistoricalUser, rebuildMapData)
- Formularza km (E2E)
- Rankingów (E2E)
- Mapy (E2E)

---

## 15. Braki testowe

1. Brak testów jednostkowych `computePoints()` z różnymi wartościami punktacji
2. Brak testu że km = 0 jest poprawnie walidowane (blokowane)
3. Brak testu że hoursOnWater = 0 jest akceptowane
4. Brak testu endpointu `/api/km/log/add` (auth, walidacja, zapis)
5. Brak testu endpointu `/api/km/rankings` (typ, okres, rok)
6. Brak testu że punkty są obliczane ON WRITE a nie ON READ
7. Brak testu soft delete i visibility
8. Brak testu że zarząd może edytować/ukrywać wpisy (nie istnieje endpoint)
9. Brak testu autocomplete miejsc (km_places z debounce)
10. Brak testu że mapa nie wymaga tokenu (bezpieczeństwo B1)
11. Brak testów E2E dla całego flow: formularz → ranking → moja aktywność

---

## 16. Błędy i ryzyka

### KRYTYCZNE

| # | Typ | Opis | Plik:linia |
|---|-----|------|------------|
| K1 | LOGIKA | `km > 0` jest wymagane, ale spec pozwala `km = 0` (playspot). Nie można dodać aktywności bez kilometrów. | `kmAddLogHandler.ts:161`, `km_module.js:253` |
| K2 | LOGIKA | Ranking domyślnie pokazuje `alltime`, spec wymaga `bieżący rok kalendarzowy` | `km_module.js:500` |
| K3 | BEZPIECZEŃSTWO | `/api/km/map-data` nie wymaga tokenu — dane mapy są publicznie dostępne | `kmMapDataHandler.ts:23` |
| K4 | LOGIKA | Mapa w popupie pokazuje `totalKm` — spec zabrania km na mapie | `kmRebuildMapData.ts:28,108`, `map.html:77` |
| K5 | LOGIKA | `topUsers` na mapie sortowane po km, nie po `activityDate desc` | `kmRebuildMapData.ts:126` |
| K6 | BRAK FUNKCJI | Brak edycji własnych wpisów (endpoint, UI, backend) | Brak pliku |
| K7 | BRAK FUNKCJI | Brak soft delete (visibility, deletedAt, deletedBy) | Brak pól w modelu |

### ŚREDNIE

| # | Typ | Opis | Plik:linia |
|---|-----|------|------------|
| S1 | LOGIKA | `hoursOnWater` jest opcjonalne — spec wymaga że jest obowiązkowe (może być 0) | `kmAddLogHandler.ts:17,119` |
| S2 | WYDAJNOŚĆ | Brak composite index dla km_places: `searchTerms array-contains + useCount desc` | `firestore.indexes.json` |
| S3 | LOGIKA | Mapa nie ma filtru po roku | `kmRebuildMapData.ts`, `map.html` |
| S4 | LOGIKA | Lista imprez w formularzu: brak limitu 5, brak filtra po statusie (tylko `approved`) | `events_service.ts`, `km_module.js:356` |
| S5 | UX | Zakładka Mapa otwiera nowe okno — na mobile Safari nieoptymalne | `km_module.js:993` |
| S6 | LOGIKA | `scoringVersion` hardcoded jako `"v1"` — zmiana punktacji wymaga deploya | `km_vars.ts:42` |
| S7 | LOGIKA | Brak rankingu kursantów z filtrem po roli | `kmRankingsHandler.ts` |
| S8 | BRAK FUNKCJI | Brak mechanizmu merge/alias miejsc dla zarządu | `km_places_service.ts` |
| S9 | LOGIKA | Historyczne miejsca nie są w `km_places` — brak podpowiedzi autocomplete dla historycznych nazw | `archiwum_sync.gs` |

### NISKIE

| # | Typ | Opis |
|---|-----|------|
| N1 | BRAK FUNKCJI | `setupHash` nie zapisywany w `km_logs` |
| N2 | BRAK FUNKCJI | Brak widoku statystyk dla kursantów |
| N3 | UX | Formularz nie ma pól `waterHours = 0` wyraźnie oznaczonych jako "wpisz 0 jeśli nie mierzono" |
| N4 | LOGIKA | Zakładka mapy w km_module renderuje `renderMapView` ale jest dead code (tab klikając otwiera nowe okno, nie wchodzi w ten kod) |

---

## 17. Blockery (realne, uniemożliwiające poprawne wdrożenie)

| # | Blocker | Dlaczego blokuje |
|---|---------|-----------------|
| B1 | **`km > 0` wymagane** | Użytkownicy którzy jadą na playspot (distanceKm = 0) nie mogą dodać wpisu. Jeden z trzech głównych typów aktywności jest zablokowany. |
| B2 | **Brak soft delete i edycji** | Użytkownik nie może poprawić błędnego wpisu. Zarząd nie może ukryć spamowego wpisu. Nie da się wyczyścić testowych danych. |
| B3 | **Brak composite index dla km_places** | `searchKmPlaces` może zwracać błąd na prod gdy Firestore auto-index nie wystarczy dla `array-contains + orderBy`. Autocomplete może być niedziałające. |

---

## 18. Najbliższy bezpieczny krok

**KROK 0: Zmień walidację km — zezwól na km = 0**

Zmiana w dwóch miejscach:
1. `kmAddLogHandler.ts`: zmień `kmRaw <= 0` na `kmRaw < 0` (km >= 0, ale max 9999)
2. `km_module.js`: zmień `min="0.1"` na `min="0"` i walidację `km <= 0` na `km < 0`

To jest jeden mały krok, nie wymaga nowych endpointów ani pól, odblokuje playspot.

Po tym kroku: lint → build → deploy → ręczny test dodania wpisu z km = 0.
