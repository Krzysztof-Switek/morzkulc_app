# Plan naprawy: Ranking / Kilometrówka / Godziny / Wywrotolotek / Mapa

**Wersja:** v1  
**Data:** 2026-04-25  
**Oparty na audycie:** `audyt_ranking_kilometrowka_mapa_v2.md`  
**Zasada:** Jeden krok = jeden PR = lint + build + test. Żadnych dużych refaktorów naraz.

---

## KROK 0 — Odblokuj km = 0 (playspot)

### Co istnieje
- Backend `kmAddLogHandler.ts:161`: `if (kmRaw <= 0 || kmRaw > 9999)` → 400
- Frontend `km_module.js:253`: `<input type="number" min="0.1" ...>` i walidacja `km <= 0`

### Co trzeba zmienić
- Backend: `kmRaw < 0` zamiast `kmRaw <= 0` (km = 0 dozwolone)
- Backend: poprawić komunikat błędu: "Kilometry nie mogą być ujemne"
- Frontend: `min="0"` zamiast `min="0.1"`, usunąć walidację `km <= 0 → setErr`
- Frontend: placeholder: "np. 18.5 (wpisz 0 dla playspot/treningu bez przebycia trasy)"

### Jakie pliki
- `functions/src/api/kmAddLogHandler.ts`
- `public/modules/km_module.js`

### Kryterium przejścia
- `npm --prefix functions run lint && npm --prefix functions run build` bez błędów
- Ręczny test: POST `/api/km/log/add` z `km: 0` → 200 OK
- Ręczny test: formularz z 0 km → zapisuje poprawnie
- POST z `km: -1` → 400

---

## KROK 1 — Uporządkowanie modelu aktywności (pola wymagane i visibility)

### Co istnieje
- km_logs ma pola: uid, date, waterType, placeName, km, capsizeRolls, pointsTotal, hoursOnWater (opcjonalne)
- Brak: visibility, deletedAt, deletedBy, setupHash

### Co trzeba dodać

#### Backend `kmAddLogHandler.ts`
- `hoursOnWater` zmienić z opcjonalnego na wymagane (może = 0): walidacja `body.hoursOnWater == null → 400`
- Dodać zapis `visibility: "visible"` przy każdym nowym wpisie

#### Backend `km_log_service.ts`
- Do `logDoc` dodać: `visibility: "visible"`
- Typ `KmLog` rozszerzyć o: `visibility: "visible" | "hidden"`, `deletedAt?: FirebaseFirestore.Timestamp`, `deletedBy?: string`

#### Rankingi i mapa (filtrowanie)
- `kmRankingsHandler.ts`: `km_user_stats` są już pre-computed — OK (filtrowanie odbywa się na etapie rebuild)
- `kmRebuildUserStats.ts`: przy akumulacji pominąć logi gdzie `log.visibility === "hidden"` lub `log.deletedAt != null`
- `kmRebuildMapData.ts`: przy agregacji pominąć logi gdzie `log.visibility === "hidden"` lub `log.deletedAt != null`

#### Frontend `km_module.js`
- Formularz: `hoursOnWater` oznaczyć jako wymagane `<span class="required">*</span>`, `required` attribute, domyślna wartość `0`
- Informacja: "Wpisz 0 jeśli nie mierzono czasu na wodzie"

### Jakie indeksy
- Żadne nowe — visibility i deletedAt nie wymagają indeksów dla obecnych zapytań (rebuild skanuje całość)

### Jakie testy
- Test: POST z `hoursOnWater` null → 400
- Test: POST z `hoursOnWater: 0` → 200, `log.hoursOnWater === 0`
- Test: nowy wpis ma `log.visibility === "visible"`

### Kryterium przejścia
- Lint + build bez błędów
- Nowe wpisy mają `visibility: "visible"` w Firestore
- `hoursOnWater: 0` akceptowane przez backend

---

## KROK 2 — Trzy niezależne rankingi + domyślnie bieżący rok

### Co istnieje
- Trzy typy: km, points, hours — ✅ działają
- Domyślny okres: `alltime` — ❌ spec wymaga bieżący rok

### Co trzeba zmienić

#### Frontend `km_module.js`
- Zmienić domyślny `activePeriod` z `"alltime"` na `"year"` (bieżący rok)
- Zmienić domyślnie aktywny przycisk: `<button class="kmRankBtn active" data-km-period="year">Bieżący rok</button>`

#### Backend `kmRankingsHandler.ts`
- Dodać parametr `year` dla `period=year` (opcjonalnie — domyślnie bieżący rok z serwera):  
  `const currentYear = new Date().getFullYear(); const yearFilter = period === "year" ? String(currentYear) : null;`
- Obecna logika `yearKm`/`yearHours`/`yearPoints` w `km_user_stats` już dotyczy bieżącego roku — OK

### Jakie testy
- GET `/api/km/rankings?type=km&period=year` → entries posortowane po yearKm
- GET `/api/km/rankings?type=hours&period=alltime` → entries posortowane po allTimeHours
- GET `/api/km/rankings?type=points&period=specificYear&year=2024` → entries z years.2024.points
- Weryfikacja że brak mieszania: `type=km` nie zwraca `pointsTotal` jako value

### Kryterium przejścia
- Zakładka Rankings domyślnie otwiera się na bieżącym roku
- Trzy przyciski: Kilometry / Wywrotolotek / Godziny — każdy pokazuje inne dane

---

## KROK 3 — Formularz aktywności — kompletna walidacja backendowa

### Co istnieje
- Walidacja: date, waterType, placeName, km, lat/lng, difficulty
- Brakuje: hoursOnWater wymagane (po KROKU 1), capsizeRolls opcjonalne ale domyślnie 0 ✅

### Co trzeba sprawdzić i dopracować

#### Backend `kmAddLogHandler.ts`
- Upewnić się że `capsizeRolls` zawsze ma wartości >= 0 (nawet jeśli nie podano): ✅ `toSafeInt` zwraca 0
- Dodać logikę: `eventId` bez `eventName` → nie blokuje zapisu, eventName to snapshot
- Dodać walidację: `waterType === "playspot"` → `km` może być 0 (po KROKU 0 to już działa)

#### Frontend
- Sekcja wywrotolotek: domyślne wartości `0` — ✅ już jest
- Godziny: `value="0"` jako domyślne, `required`, oznaczenie `*`

### Kryterium przejścia
- Formularz wysyła wszystkie wymagane pola
- Backend odrzuca brakujące pola z jasnym komunikatem
- Playspot: km=0, hoursOnWater>0 → zapisany poprawnie
- Spływ: km>0, hoursOnWater>0 → zapisany poprawnie

---

## KROK 4 — Lista imprez w formularzu (max 5, bez przyszłych, status)

### Co istnieje
- `listRecentEvents`: imprezy ostatnich 30 dni, `approved: true`, brak limitu 5
- Brak pola `status` w modelu imprez — tylko `approved: boolean`

### Co trzeba zmienić

#### Backend `events_service.ts`
- `listRecentEvents` → dodać limit 5 do zwracanej listy (`.slice(0, 5)`)
- Imprezy posortowane startDate DESC — ✅ już jest
- Bez przyszłych (startDate > today) — ✅ już jest przez `filter(startDate <= today)`
- Decyzja: brak pola `status` → używamy `approved: boolean` jako jedynej kontroli widoczności

#### Frontend `km_module.js`
- Nie ładować więcej niż 5 imprez — backend to teraz wymusza
- Opcja `— brak / nie dotyczy —` pozostaje pierwsza

### Kryterium przejścia
- Lista imprez w formularzu pokazuje max 5 pozycji
- Pokazuje tylko imprezy które się zaczęły (nie przyszłe)
- Najnowsza na górze

---

## KROK 5 — Miejsca i podpowiadanie (composite index + historyczne)

### Co istnieje
- `km_places` z `searchTerms[]` i `array-contains` query
- Autocomplete z debounce 300ms, min 2 znaki, limit 10
- Brak composite index w `firestore.indexes.json`

### Co trzeba dodać

#### `firestore.indexes.json`
Dodać composite index:
```json
{
  "collectionGroup": "km_places",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "searchTerms", "arrayConfig": "CONTAINS" },
    { "fieldPath": "useCount", "order": "DESCENDING" }
  ]
}
```

#### Backend `kmPlacesHandler.ts`
- Sprawdzić czy endpoint działa poprawnie bez indeksu (catch w `searchKmPlaces` zwraca `[]`)
- Po dodaniu indeksu wyniki zaczną się pojawiać

#### GAS `archiwum_sync.gs`
- Dodać upsert do `km_places` przy imporcie — historyczne nazwy wejdą do autocomplete
- Używać `upsertKmPlace` przez REST API lub bezpośrednio Firestore batch

### Kryterium przejścia
- `firestore deploy --only firestore:indexes` bez błędów
- `GET /api/km/places?q=dun` → zwraca wyniki posortowane po useCount desc
- Historyczne nazwy dostępne po ponownym imporcie

---

## KROK 6 — Duplikaty miejsc i merge places

### Co istnieje
- `km_places` ma `aliases[]` ale brak endpointu merge
- Brak narzędzia zarządu do łączenia duplikatów

### Co trzeba zbudować

#### Backend — nowy endpoint admin
`POST /api/admin/km/places/merge`
- Auth: Firebase ID token + role `rola_zarzad` lub `rola_kr`
- Body: `{ keepPlaceId: string, mergeIds: string[] }`
- Logika:
  1. Pobierz `keepPlace` — to będzie canonical
  2. Dla każdego `mergeId`: dodaj jego `name` do `keepPlace.aliases[]`, zaktualizuj `km_logs` które mają `placeId === mergeId` → `placeId = keepPlaceId`
  3. Usuń dokumenty `km_places/{mergeId}`
  4. Przebuduj mapę: enqueue `km.rebuildMapData`

#### Frontend — panel zarządu
- Osobna zakładka (poza km_module, w panelu admina lub osobny widok)
- Lista duplikatów (np. miejsca o podobnych searchTerms)
- UI do wyboru canonical i merge

### Kryterium przejścia
- POST merge zmienia `placeId` w `km_logs`
- Usuwa zduplikowane `km_places`
- Canonical `km_places` ma aliases
- Mapa po rebuild pokazuje jeden marker zamiast kilku

---

## KROK 7 — Mapa (naprawy i funkcje)

### Co istnieje
- Leaflet.js + CARTO dark — ✅ bezpieczne kosztowo
- Pre-computed cache w `km_map_cache/v1`
- Brak filtru po roku, topUsers sortowane po km, mapa pokazuje totalKm w popupie

### Co trzeba naprawić

#### Backend `kmRebuildMapData.ts`
- Usunąć `totalKm` z modelu `LocationEntry` (spec zabrania km na mapie)
- Zmienić `topUsers` z "top km" na "3 ostatnie aktywności" — zbierać per lokalizację listę `{name, date}`, sortować po date DESC, brać pierwsze 3
- Dodać per-rok agregaty: zamiast jednego `locations[]`, trzymać `locations[]` per rok + `allYears`
  - `km_map_cache/v1.years.{YYYY}.locations[]` — lub osobny dokument per rok
  - Alternatywa lekka: `locations[]` z polem `latestYear` i filtr frontend in-memory (dla klubu < 200 osób OK)

#### Backend `kmMapDataHandler.ts`
- Dodać query param `?year=` → filtruj `locations` po roku (jeśli cache ma per-rok dane)
- Dodać `requireIdToken` — zabezpieczyć endpoint

#### Frontend `map.html`
- Dodać Firebase Auth JS SDK → wymagaj zalogowania przed fetchwm mapy
- Dodać filtr roku (select: Wszystkie lata / 2026 / 2025 / ...)
- Popup: pokazać `logCount`, `3 ostatnie osoby (displayName/nickname)`, **bez km**

#### Frontend `km_module.js` (zakładka Mapa)
- Opcja A: renderMapView inline (nie otwierać nowego okna) — lepsza UX mobile
- Opcja B: zachować nowe okno ale zasilić je tokenem (przekazać przez URL/localStorage/postMessage)

### Kryterium przejścia
- Mapa nie pokazuje km w popupie
- Popup pokazuje liczbę wizyt + 3 ostatnie osoby (sortowanie activityDate desc)
- Filtr roku działa
- map.html wymaga zalogowania

---

## KROK 8 — Edycja i soft delete wpisów

### Co istnieje
- Brak endpointów edycji/usuwania
- Brak pól `visibility`, `deletedAt`, `deletedBy` w modelu (dodane w KROKU 1)

### Co trzeba zbudować

#### Backend — nowe endpointy
`PUT /api/km/log/{logId}` — edycja własnego wpisu
- Auth: Firebase ID token
- Sprawdź `log.uid === uid` → 403 jeśli nie
- Sprawdź `log.deletedAt == null` → 400 jeśli usunięty
- Akceptuj pola: date, waterType, placeName, placeId, km, hoursOnWater, capsizeRolls, note, sectionDescription
- Przelicz `pointsTotal` i `scoringVersion` na nowo
- Zaktualizuj `updatedAt`
- Po edycji: enqueue `km.rebuildUserStats` dla uid

`DELETE /api/km/log/{logId}` — soft delete własnego wpisu
- Auth: Firebase ID token
- Sprawdź `log.uid === uid` LUB `userRole` in admin roles
- Soft delete: `{ deletedAt: now, deletedBy: uid, visibility: "hidden" }`
- Po usunięciu: enqueue `km.rebuildUserStats` dla uid

`POST /api/admin/km/log/{logId}/hide` — ukrycie przez zarząd
- Auth: Firebase ID token + role `rola_zarzad`/`rola_kr`
- Ustawia `visibility: "hidden"` (bez deletedAt — nie jest kasowane)

#### Frontend `km_module.js` (zakładka Moje wpisy)
- Dodać przycisk "Edytuj" dla każdego wpisu (własnego)
- Dodać przycisk "Usuń" dla każdego wpisu (własnego)
- Potwierdzenie przed usunięciem
- Po edycji/usunięciu: odśwież listę i statystyki

### Kryterium przejścia
- Użytkownik edytuje własny wpis → pointsTotal przeliczone na nowo
- Użytkownik usuwa własny wpis → log znika z listy i rankingu
- Próba edycji cudzego wpisu → 403
- `km_user_stats` przeliczone po edycji

---

## KROK 9 — Kursanci: ranking po roku i roli

### Co istnieje
- `rola_kursant` istnieje w systemie
- `km_user_stats` nie zawiera `role_key`
- Ranking nie filtruje po roli
- `specificYear` ranking istnieje (in-memory sort z `years` map)

### Co trzeba zbudować

#### Backend `kmRebuildUserStats.ts`
- Dodać denormalizację: przy budowie `km_user_stats/{uid}` czytać `users_active/{uid}.role_key` i zapisywać go do `km_user_stats/{uid}.role_key`

#### Backend `kmRankingsHandler.ts`
- Dodać opcjonalny query param `role` → filtruj `km_user_stats` po `role_key`
- Dla `period=specificYear&role=rola_kursant`: in-memory filter po `role_key` + year aggregates

#### Frontend `km_module.js`
- Dodać przełącznik "Pokaż: Wszyscy / Kursanci" w sekcji rankingów
- Kursanci — domyślnie `specificYear` z bieżącym rokiem kursu

### Kryterium przejścia
- `GET /api/km/rankings?role=rola_kursant&period=specificYear&year=2026` → tylko kursanci z 2026
- Po zmianie roli z kursant → kandydat: wpisy pozostają przy tym samym uid ✅ (nie tracimy historii)

---

## KROK 10 — Testy E2E i smoke testy

### Co zbudować

#### `tests/test_km_logic.py` — testy jednostkowe logiki
- `computePoints({kabina:1, rolka:0, dziubek:0}, vars={ptsKabina:1, ptsEskimoska:0.5, ptsDziubek:0.25})` → `pointsTotal = 1`
- km = 0 → valid
- km = -1 → invalid
- hoursOnWater = 0 → valid
- hoursOnWater = null → invalid (po KROKU 1)
- Soft delete: wpis z `deletedAt != null` nie wchodzi do rebuild

#### `tests/e2e/test_km_api.py` — testy HTTP
- POST `/api/km/log/add` bez tokenu → 401
- POST z tokenem, km=0 → 200
- POST z tokenem, km=-1 → 400
- GET `/api/km/rankings` → 200, ma `entries`
- GET `/api/km/map-data` bez tokenu → ??? (aktualnie 200 — po KROKU 7 powinno być 401)
- PUT `/api/km/log/{cudzLogId}` → 403

#### `tests/e2e/test_km_mobile.py` (opcjonalne, Playwright)
- Otwarcie formularza na viewport 375x812 (iPhone)
- Dodanie wpisu z km=0, hoursOnWater=2
- Sprawdzenie że wpis pojawia się w "Moje wpisy"
- Sprawdzenie że ranking zmienił się

### Kryterium przejścia
- `pytest tests/test_km_logic.py` → wszystkie testy przechodzą
- `pytest tests/e2e/test_km_api.py` → wszystkie testy przechodzą
- Brak regresji w istniejących testach godzinek i rezerwacji

---

## Kolejność wykonania

```
KROK 0  → KROK 1 → KROK 2 → KROK 3 → KROK 4
  ↓
KROK 5 (indeks Firestore - deploy)
  ↓
KROK 6 (merge place - nowy endpoint)
  ↓
KROK 7 (mapa - naprawy)
  ↓
KROK 8 (edycja/soft delete - nowe endpointy)
  ↓
KROK 9 (kursanci - denormalizacja)
  ↓
KROK 10 (testy)
```

**Maksymalny czas między krokami: bez akceptacji użytkownika nie przechodzimy do kolejnego.**

---

## Pliki do zmiany w pierwszych krokach (priorytet)

| Krok | Plik | Zmiana |
|------|------|--------|
| 0 | `functions/src/api/kmAddLogHandler.ts` | km >= 0 (nie > 0) |
| 0 | `public/modules/km_module.js` | min="0", walidacja |
| 1 | `functions/src/api/kmAddLogHandler.ts` | hoursOnWater required, visibility |
| 1 | `functions/src/modules/km/km_log_service.ts` | visibility: "visible" w logDoc |
| 2 | `public/modules/km_module.js` | domyślny period = "year" |
| 4 | `functions/src/modules/calendar/events_service.ts` | .slice(0, 5) |
| 5 | `firestore.indexes.json` | composite index km_places |
| 7 | `functions/src/service/tasks/kmRebuildMapData.ts` | usuń totalKm, napraw topUsers |
| 7 | `public/map.html` | dodaj auth token |