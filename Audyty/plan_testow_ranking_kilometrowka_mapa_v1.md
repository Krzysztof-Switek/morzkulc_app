# Plan testów — Ranking / Kilometrówka / Mapa — v1
**Data:** 2026-04-25  
**Autor:** Claude Code (claude-sonnet-4-6)  
**Status:** PROJEKT — czeka na akceptację przed implementacją

---

## Zakres

Testy API HTTP + Firestore dla modułu km/ranking/mapa.  
Docelowe pliki:
- `tests/e2e/test_km_api.py` — testy HTTP endpointów (FA, RK, RW, PL, MP, EV, SEC)
- `tests/e2e/test_km_firestore.py` — testy integralności Firestore (FS: agregaty, scoring)

Testy UI/UX (RG, UX) i E2E Playwright — poza zakresem v1 (wymaga Playwright + nowe fazy).  
Testy ED (edit/delete) i KU (kursant filter) — poza zakresem v1 (brak implementacji).

---

## Konta testowe wymagane

| Rola | Zmienna w EnvConfig | Cel |
|---|---|---|
| `rola_czlonek` | `member_user_*` | główne konto testowe km |
| `rola_zarzad` | `board_user_*` | test admin-level access |
| `rola_sympatyk` | `sympatyk_user_*` | test braku dostępu do km (jeśli moduł zablokowany) |
| brak tokena | — | test 401 |

---

## Wymagania setUp / tearDown

1. **setUp:** utwórz token Firebase REST → zapisz w `cls.member_token`
2. **tearDown:** usuń przez ADC Firestore wszystkie `km_logs` z `uid == cls.uid AND note == "autotest"` i odpowiadające `km_user_stats` (merge=false nie pozwala na partial — wymagane pełne przeczytanie + ręczna korekta lub reset)
3. **Alternatywa teardown:** Dedykowane konto testowe czyszczone przez fixture — delete całego dokumentu `km_user_stats/{uid}` i wszystkich `km_logs` gdzie `uid == testUid`

---

## Tabela testów

| ID | Typ | Obszar | Warunek wejściowy | Akcja | Oczekiwany wynik | Priorytet |
|---|---|---|---|---|---|---|
| **SEC-01** | API | Bezpieczeństwo | Brak nagłówka Authorization | `POST /kmAddLog` z poprawnym body | HTTP 401, body `{error: ...}` | P0 |
| **SEC-02** | API | Bezpieczeństwo | Brak nagłówka Authorization | `GET /kmRankings` | HTTP 401 | P0 |
| **SEC-03** | API | Bezpieczeństwo | Brak nagłówka Authorization | `GET /kmMyLogs` | HTTP 401 | P0 |
| **SEC-04** | API | Bezpieczeństwo | Brak nagłówka Authorization | `GET /kmMyStats` | HTTP 401 | P0 |
| **SEC-05** | API | Bezpieczeństwo | Brak nagłówka Authorization | `GET /kmPlaces?q=test` | HTTP 401 | P0 |
| **SEC-06** | API | Bezpieczeństwo | Brak nagłówka Authorization | `GET /api/km/event-stats?eventId=x` | HTTP 401 | P0 |
| **SEC-07** | API | Bezpieczeństwo | Nieprawidłowy Bearer token (losowy string) | `POST /kmAddLog` | HTTP 401 | P0 |
| **SEC-08** | API | Bezpieczeństwo | Wygasły token (jeśli możliwe do uzyskania) | `POST /kmAddLog` | HTTP 401 | P1 |
| **SEC-09** | API | Bezpieczeństwo | Prawidłowy token `member_user` | `GET /kmMyLogs` innego uid przez query param (nie ma takiego parametru — uid z tokena) | HTTP 200, tylko własne logi | P0 |
| **FA-01** | API | Dodawanie logu | Poprawny token, prawidłowe body: waterType=mountains, km=15.5, hoursOnWater=3, difficultyScale=WW, difficulty=WW3 | `POST /kmAddLog` | HTTP 200, `{ok: true, logId: "..."}` | P0 |
| **FA-02** | API | Dodawanie logu | waterType=lowlands, km=8, hoursOnWater=2.5, difficultyScale=U, difficulty=U2 | `POST /kmAddLog` | HTTP 200, `{ok: true, logId}` | P0 |
| **FA-03** | API | Dodawanie logu | waterType=sea, km=20, hoursOnWater=4 (brak difficulty) | `POST /kmAddLog` | HTTP 200, `{ok: true, logId}` | P0 |
| **FA-04** | API | Dodawanie logu | waterType=track, km=10, hoursOnWater=1 | `POST /kmAddLog` | HTTP 200, `{ok: true, logId}` | P0 |
| **FA-05** | API | Dodawanie logu | waterType=pool, km=3, hoursOnWater=1.5 | `POST /kmAddLog` | HTTP 200, `{ok: true, logId}` | P0 |
| **FA-06** | API | Dodawanie logu | waterType=playspot, km=0, hoursOnWater=2 (km=0 dozwolone po KROK 0) | `POST /kmAddLog` | HTTP 200, `{ok: true, logId}` | P0 |
| **FA-07** | API | Walidacja — data | date brak w body | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-08** | API | Walidacja — data | date="2026-13-01" (zły miesiąc) | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-09** | API | Walidacja — data | date="jutrzejsza data YYYY-MM-DD" | `POST /kmAddLog` | HTTP 400, code=validation_failed, "z przyszłości" | P0 |
| **FA-10** | API | Walidacja — waterType | waterType="river" (nieznany) | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-11** | API | Walidacja — waterType | waterType="" (pusty) | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-12** | API | Walidacja — km | km=-1 | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-13** | API | Walidacja — km | km=10000 (> 9999) | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-14** | API | Walidacja — km | km=0, waterType=mountains (0 dozwolone) | `POST /kmAddLog` | HTTP 200, `{ok: true}` | P1 |
| **FA-15** | API | Walidacja — hoursOnWater | brak pola hoursOnWater | `POST /kmAddLog` | HTTP 400, code=validation_failed, "wymagane" | P0 |
| **FA-16** | API | Walidacja — hoursOnWater | hoursOnWater=null | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-17** | API | Walidacja — hoursOnWater | hoursOnWater=-0.5 | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-18** | API | Walidacja — hoursOnWater | hoursOnWater=100 (> 99) | `POST /kmAddLog` | HTTP 400, code=validation_failed | P0 |
| **FA-19** | API | Walidacja — hoursOnWater | hoursOnWater=0 (zero OK — po KROK 1) | `POST /kmAddLog` z pozostałymi poprawnymi polami | HTTP 200, `{ok: true}` | P0 |
| **FA-20** | API | Walidacja — trudność | waterType=mountains, difficultyScale=U (zła skala) | `POST /kmAddLog` | HTTP 400, "skala WW" | P1 |
| **FA-21** | API | Walidacja — trudność | waterType=lowlands, difficultyScale=WW | `POST /kmAddLog` | HTTP 400, "skala U" | P1 |
| **FA-22** | API | Walidacja — trudność | waterType=mountains, difficultyScale=WW, difficulty=WW9 (nieznana) | `POST /kmAddLog` | HTTP 400, "WW1–WW5" | P1 |
| **FA-23** | API | Walidacja — trudność | waterType=sea, difficulty="WW3" (skala dla nie-góry) | `POST /kmAddLog` | HTTP 400, "nie dotyczy" | P1 |
| **FA-24** | API | Walidacja — trudność | waterType=mountains, brak difficultyScale (opcjonalne) | `POST /kmAddLog` | HTTP 200, `{ok: true}` — trudność jest opcjonalna | P1 |
| **FA-25** | API | Wywrotolotek | capsizeRolls: {kabina:2, rolka:1, dziubek:0}, waterType=mountains | `POST /kmAddLog` | HTTP 200, log zapisany; Firestore: capsizeRolls.kabina==2 | P0 |
| **FA-26** | API | Wywrotolotek | capsizeRolls pominięty w body | `POST /kmAddLog` | HTTP 200, capsizeRolls={kabina:0,rolka:0,dziubek:0} | P1 |
| **FA-27** | API | Zapis eventu | body zawiera eventId="ev123", eventName="Spływ Dunajcem" | `POST /kmAddLog` | HTTP 200; Firestore log ma eventId i eventName | P1 |
| **FA-28** | API | Walidacja — placeName | placeName="" (pusty) | `POST /kmAddLog` | HTTP 400, "wymagana" | P0 |
| **FS-01** | Firestore | Agregaty — nowy użytkownik | uid bez istniejącego `km_user_stats` | `POST /kmAddLog` z km=10, hoursOnWater=2 | `km_user_stats/{uid}`: allTimeKm=10, allTimeHours=2, allTimeDays=1, allTimeLogs=1; yearKm=10 | P0 |
| **FS-02** | Firestore | Agregaty — kumulacja | uid z istniejącym `km_user_stats` (allTimeKm=10) | drugi `POST /kmAddLog` z km=5 | allTimeKm=15, allTimeDays=2, allTimeLogs=2 | P0 |
| **FS-03** | Firestore | Agregaty — years map | uid, date="2025-06-15" (poprzedni rok) | `POST /kmAddLog` z km=8 | `km_user_stats.years["2025"].km==8`; yearKm bieżącego roku nie zmieniony | P0 |
| **FS-04** | Firestore | Scoring — punkty | capsizeRolls: {kabina:1, rolka:0, dziubek:0}, vars.ptsKabina=znana wartość z Firestore | `POST /kmAddLog` | `km_logs/{logId}.pointsTotal == 1 * ptsKabina` | P0 |
| **FS-05** | Firestore | Scoring — zero | capsizeRolls: {kabina:0, rolka:0, dziubek:0} | `POST /kmAddLog` | `pointsTotal==0`, `pointsBreakdown.capsizeRolls==0` | P0 |
| **FS-06** | Firestore | Integralność logu | poprawne body | `POST /kmAddLog` | Log w Firestore zawiera: logId, uid, sourceType="runtime", schemaVersion=1, visibility="visible", isPartial=false, createdAt, updatedAt | P0 |
| **FS-07** | Firestore | Upsert km_places | nowe place (placeName="Dunajec Testowy", waterType=mountains) | `POST /kmAddLog` | `km_places` zawiera dokument z name="Dunajec Testowy"; searchTerms[] niepusta | P1 |
| **RK-01** | API | Ranking — podstawowy | poprawny token | `GET /kmRankings` (bez parametrów) | HTTP 200, `{ok: true, type:"km", period:"alltime", entries: [...], count: N}` | P0 |
| **RK-02** | API | Ranking — sortowanie | po dodaniu logu km=100 dla testowego użytkownika | `GET /kmRankings?type=km&period=alltime` | entries[0].value >= 100; entries posortowane malejąco | P0 |
| **RK-03** | API | Ranking — type=points | poprawny token | `GET /kmRankings?type=points&period=alltime` | orderField="allTimePoints", entries posortowane wg allTimePoints | P1 |
| **RK-04** | API | Ranking — type=hours | poprawny token | `GET /kmRankings?type=hours&period=alltime` | orderField="allTimeHours" | P1 |
| **RK-05** | API | Ranking — period=year | poprawny token | `GET /kmRankings?type=km&period=year` | orderField="yearKm", period="year" | P0 |
| **RK-06** | API | Ranking — limit | poprawny token | `GET /kmRankings?limit=3` | `count <= 3` | P1 |
| **RK-07** | API | Ranking — limit max | poprawny token | `GET /kmRankings?limit=200` | `count <= 100` (max clamp) | P1 |
| **RK-08** | API | Ranking — nieprawidłowy type | poprawny token | `GET /kmRankings?type=invalid` | HTTP 200, type="km" (fallback default) | P2 |
| **RK-09** | API | Ranking — nieprawidłowy period | poprawny token | `GET /kmRankings?period=weekly` | HTTP 200, period="alltime" (fallback) | P2 |
| **RK-10** | API | Ranking — struktura entry | poprawny token | `GET /kmRankings?limit=1` | entries[0] zawiera: rank, uid, displayName, nickname, value, allTimeKm, yearKm, allTimeLogs | P0 |
| **RW-01** | API | Ranking rok konkretny | poprawny token, wpis z 2025 istnieje | `GET /kmRankings?period=specificYear&year=2025` | HTTP 200, period="specificYear", year="2025"; entries posortowane wg years.2025.km | P1 |
| **RW-02** | API | Ranking rok konkretny — brak danych | poprawny token | `GET /kmRankings?period=specificYear&year=1999` | HTTP 200, entries=[] (nikt nie ma danych za 1999) | P2 |
| **RW-03** | API | Ranking rok konkretny — brak year param | poprawny token | `GET /kmRankings?period=specificYear` (brak year=) | HTTP 200, period="alltime" (isSpecificYear=false, fallback) | P2 |
| **ML-01** | API | Moje logi | poprawny token, użytkownik ma >= 1 log | `GET /kmMyLogs` | HTTP 200, `{ok: true, logs: [...], count: N}`, logs posortowane date desc | P0 |
| **ML-02** | API | Moje logi — brak logów | poprawny token, nowy użytkownik | `GET /kmMyLogs` | HTTP 200, logs=[] | P1 |
| **ML-03** | API | Moje logi — limit | poprawny token | `GET /kmMyLogs?limit=2` | count <= 2 | P1 |
| **ML-04** | API | Moje logi — limit max | poprawny token | `GET /kmMyLogs?limit=200` | count <= 100 (max clamp) | P2 |
| **ML-05** | API | Moje logi — tylko własne | member_user i board_user obaj mają logi | `GET /kmMyLogs` z tokenem member_user | zwraca tylko logi member_user (uid filtrowany tokenem) | P0 |
| **MS-01** | API | Moje statystyki | poprawny token, użytkownik ma logi | `GET /kmMyStats` | HTTP 200, `{ok: true, stats: {allTimeKm, allTimeHours, yearKm, ...}}` | P0 |
| **MS-02** | API | Moje statystyki — brak wpisów | nowy/czysty użytkownik | `GET /kmMyStats` | HTTP 200, `{ok: true, stats: null}` | P1 |
| **PL-01** | API | Podpowiedzi — za krótki query | poprawny token | `GET /kmPlaces?q=a` (1 znak) | HTTP 200, `{places: [], count: 0}` | P1 |
| **PL-02** | API | Podpowiedzi — prawidłowy query | poprawny token, "Dunajec" istnieje w km_places | `GET /kmPlaces?q=Du` | HTTP 200, places zawiera wynik z name zawierającym "Du" | P1 |
| **PL-03** | API | Podpowiedzi — brak wyników | poprawny token | `GET /kmPlaces?q=zzzxxx` (nieznana fraza) | HTTP 200, places=[] | P1 |
| **PL-04** | API | Podpowiedzi — limit | poprawny token | `GET /kmPlaces?q=an&limit=3` | count <= 3 | P2 |
| **PL-05** | API | Podpowiedzi — limit max | poprawny token | `GET /kmPlaces?q=an&limit=50` | count <= 20 (max clamp) | P2 |
| **MP-01** | API | Dane mapy | poprawny token | `GET /api/km/map-data` | HTTP 200, `{ok: true, locations: [...], locationCount: N, updatedAt: ...}` | P1 |
| **MP-02** | API | Dane mapy — pusty cache | brak dokumentu km_map_cache/v1 (DEV fresh) | `GET /api/km/map-data` | HTTP 200, locations=[], locationCount=0, updatedAt=null | P2 |
| **EV-01** | API | Event stats | poprawny token, eventId z km_logs istnieje | `GET /api/km/event-stats?eventId={id}` | HTTP 200, `{ok: true, participants: [...], totals: {...}}` | P1 |
| **EV-02** | API | Event stats — brak eventId | poprawny token | `GET /api/km/event-stats` (brak eventId) | HTTP 400, code=missing_eventId | P1 |
| **EV-03** | API | Event stats — nieznany eventId | poprawny token | `GET /api/km/event-stats?eventId=nieistniejace` | HTTP 200, participants=[], count=0 | P1 |
| **EV-04** | API | Event stats — agregacja multi-log | ten sam uid, ten sam eventId, 2 wpisy z capsizeRolls | `GET /api/km/event-stats?eventId={id}` | participants[0].capsizeKabina == suma obu wpisów | P1 |
| **EV-05** | API | Zapis eventId | body z eventId i eventName | `POST /kmAddLog` → `GET /api/km/event-stats?eventId=...` | event-stats pokazuje nowo dodany log | P1 |
| **EV-06** | Firestore | listRecentEvents — limit 5 | 6+ zatwierdzonych eventów startDate <= dziś, endDate >= 30 dni temu | (przez Firestore ADC lub przez widok backendu) | zwrócone maksymalnie 5 eventów, posortowane startDate DESC | P1 |

---

## Kolejność implementacji

### Faza 1 — Core (P0, `test_km_api.py`)
1. setUp/tearDown z cleanup Firestore
2. SEC-01..07 (auth)
3. FA-01..06 (happy path, 6 waterTypes)
4. FA-07..19 (walidacja dat, km, hoursOnWater)
5. FA-28 (placeName)
6. ML-01, ML-05 (moje logi — podstawowe)
7. MS-01 (moje statystyki)
8. RK-01, RK-02, RK-05, RK-10 (ranking podstawowy)

### Faza 2 — Integralność Firestore (`test_km_firestore.py`)
1. FS-01..07 (agregaty user_stats, scoring, km_places)

### Faza 3 — Pozostałe endpointy (P1)
1. FA-20..27 (trudność, wywrotolotek, event)
2. RK-03..09, RW-01..03 (ranking typy, rok)
3. ML-02..04 (paginacja logów)
4. MS-02 (stats null)
5. PL-01..05 (places autocomplete)
6. MP-01..02 (map-data)
7. EV-01..06 (event-stats)

### Faza 4 — P2 i edge cases
1. FA-23, FA-24 (edge cases trudność)
2. RK-08, RK-09 (fallback parametrów)
3. RW-02, RW-03 (rok bez danych)
4. ML-04, PL-04, PL-05 (limity)
5. MP-02 (pusty cache)

---

## Zmiany wymagane poza plikami testowymi

### `tests/e2e/helpers/api_helper.py` — nowe metody

```python
# POST /kmAddLog
def km_add_log(self, token: str, body: dict) -> dict:       # _check
def km_add_log_soft(self, token: str, body: dict) -> dict:  # _soft

# GET /kmMyLogs
def km_my_logs(self, token: str, limit: int = 50, after_date: str = "") -> dict:

# GET /kmMyStats
def km_my_stats(self, token: str) -> dict:

# GET /kmRankings
def km_rankings(self, token: str, type: str = "km", period: str = "alltime",
                limit: int = 50, year: str = "") -> dict:

# GET /kmPlaces
def km_places(self, token: str, q: str, limit: int = 10) -> dict:

# GET /api/km/map-data
def km_map_data(self, token: str) -> dict:

# GET /api/km/event-stats
def km_event_stats(self, token: str, event_id: str) -> dict:
def km_event_stats_soft(self, token: str, event_id: str) -> dict:
```

### `tests/e2e/config.py` — brak zmian

Istniejące konta `member_user_*` i `board_user_*` wystarczą.  
Należy upewnić się że konta mają dostęp do modułu km w `setup/app` na DEV.

---

## Noty implementacyjne

- **Cleanup:** Każdy test tworzący log musi mieć fixture cleanup. Rekomendacja: `note="autotest-{uuid}"` w każdym logu testowym → cleanup po `where("note", "==", ...)` przez ADC.
- **km_vars:** Test `FS-04` (scoring) wymaga odczytu `ptsKabina` z Firestore przed asercją. Użyć `FirestoreHelper` do odczytu `setup/vars_members`.
- **Izolacja:** Testy nie mogą zależeć od kolejności wykonania. Każdy test powinien tworzyć własne dane lub korzystać z istniejących read-only.
- **Plik testowy:** Wzorować na `test_godzinki_api.py` — nagłówek docstring, `logging.basicConfig`, `_auth`, `_api`, `BASE` na poziomie modułu, klasy `TestXxx(unittest.TestCase)`.
