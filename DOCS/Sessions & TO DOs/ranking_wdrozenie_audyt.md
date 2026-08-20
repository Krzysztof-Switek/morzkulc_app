# Audyt wdrożenia modułu Ranking (Kilometrówka)

**Data audytu:** 2026-04-12  
**Stan:** po pierwszym pełnym wdrożeniu na PROD  
**Projekt Firebase:** morzkulc-e9df7  

---

## 1. Podsumowanie stanu

| Obszar | Status | Uwagi |
|--------|--------|-------|
| Backend – API (5 endpointów) | ✅ Wdrożony | Działa |
| Backend – Service tasks (rebuild) | ✅ Wdrożony | Czeka na uruchomienie |
| Frontend – moduł Ranking | ✅ Wdrożony | Widoczny w aplikacji |
| GAS – import archiwum | ✅ Wdrożony | Import wykonany |
| GAS – ranking korekta | ✅ Wdrożony | Działa |
| **km_user_stats** – agregaty | ❌ Puste | **BLOKUJĄCE: ranking nie pokazuje danych** |
| Indeksy Firestore (km_user_stats) | ⚠️ Brak w pliku | Auto-indeksy mogą wystarczyć |
| Mapa aktywności (Leaflet) | 🔜 Nie wdrożona | Świadomie odłożona |

---

## 2. Co zostało wdrożone

### 2.1 Backend – Cloud Functions

**Pliki:** `functions/src/`

| Plik | Funkcja | Endpoint |
|------|---------|----------|
| `api/kmAddLogHandler.ts` | `kmAddLog` | `POST /api/km/log/add` |
| `api/kmMyLogsHandler.ts` | `kmMyLogs` | `GET /api/km/logs` |
| `api/kmMyStatsHandler.ts` | `kmMyStats` | `GET /api/km/stats` |
| `api/kmRankingsHandler.ts` | `kmRankings` | `GET /api/km/rankings` |
| `api/kmPlacesHandler.ts` | `kmPlaces` | `GET /api/km/places` |

**Moduły serwisowe:**

| Plik | Opis |
|------|------|
| `modules/km/km_vars.ts` | Czyta `setup/vars_members` → `kabina_punkty`, `eskimoska_punkty`, `dziubek_punkty` |
| `modules/km/km_scoring.ts` | `computePoints(capsizeRolls, vars)` – tylko wywrotolotek |
| `modules/km/km_log_service.ts` | `addKmLog`, `getUserKmLogs`, `getUserKmStats`, `updateUserStatsInTransaction` |
| `modules/km/km_places_service.ts` | `searchKmPlaces`, `upsertKmPlace` (z lat/lng) |

**Service tasks (zadania asynchroniczne):**

| Task ID | Plik | Opis |
|---------|------|------|
| `km.rebuildUserStats` | `service/tasks/kmRebuildUserStats.ts` | Przelicza `km_user_stats/{uid}` z `km_logs` dla jednego użytkownika |
| `km.rebuildRankings` | `service/tasks/kmRebuildRankings.ts` | Przebudowuje `km_user_stats` dla WSZYSTKICH użytkowników |

Oba taski są zarejestrowane w `service/registry.ts`.

### 2.2 Zmiany względem oryginalnej specyfikacji – scoring

Specyfikacja zakładała naliczanie punktów za:
- km (`pts_per_km`)
- godziny (`pts_per_hour`)
- trudność (`pts_ww1`–`pts_ww5`, `pts_u1`–`pts_u3`)
- wywrotolotek (`pts_kabina`, `pts_rolka`, `pts_dziubek`)

**Zmiana decyzji użytkownika:** punkty WYŁĄCZNIE za wywrotolotek. Kilometry i godziny to tylko liczniki — bez przeliczenia na punkty.

Implementacja po korekcie:
```
pointsTotal = kabina × kabina_punkty + rolka × eskimoska_punkty + dziubek × dziubek_punkty
```

Zmienne punktacji w `setup/vars_members` (istniejący dokument, synchronizowany przez GAS z arkusza Członkowie):
- `kabina_punkty` → domyślnie 1
- `eskimoska_punkty` → domyślnie 0.5
- `dziubek_punkty` → domyślnie 0.25

**Nie ma osobnego dokumentu `setup/vars_km`.** Jest to intencjonalna decyzja — unika duplikacji konfiguracji.

### 2.3 Frontend

**Plik:** `public/modules/km_module.js`

Cztery zakładki:
- **Dodaj wpis** – formularz z dynamiczną sekcją trudności (tylko góry/WW i niziny/U) i autocomplete nazw akwenów
- **Ranking** – tabela z przełącznikiem typ (km/punkty/godziny) × okres (wszech czasów/bieżący rok)
- **Moje statystyki** – karty z all-time i bieżący rok
- **Moje wpisy** – lista ostatnich 50 wpisów z oznaczeniem historycznych

Detekcja modułu w `modules_registry.js`: label `"ranking"` (lowercase) → typ `"km"`. ID modułu to `modul_5` zgodnie z konwencją numeryczną arkusza APP_SETUP.

### 2.4 Google Apps Script – katalog `appscript/kilometrówka/`

| Plik | Opis |
|------|------|
| `env_config.gs` | `KM_SHEET_ID`, `ACTIVE_ENV=PROD`, PROJECT IDs |
| `common_helpers.gs` | Firestore REST: `firestoreRunQuery_`, `firestoreCommitDocuments_`, `firestorePatchDocumentFields_`, `firestoreFieldsToJs_`, `toFirestoreFields_`, `assertBoardAccess_`, `enqueueServiceJob_` |
| `ui_menu.gs` | Menu „Morzkulc": Eksportuj archiwum, Ranking korekta, Ranking pobierz |
| `archiwum_sync.gs` | Import zakładki `archiwum_kilometrówka` → `km_logs` (7 027 wierszy, 2010–2025) |
| `ranking_sync.gs` | Pobieranie runtime wpisów + push korekt admina |
| `.clasp.json` | scriptId: `1cIhVMsbKXTw4cTH-g9S6RYOGeRlR9eIbwQDruiIpVwshvuDM4zB3xZbl` |
| `appsscript.json` | Zakresy OAuth: spreadsheets, datastore, script.external_request, userinfo.email, admin.directory.group.member.readonly |

**Import historyczny:**
- Zakładka `archiwum_kilometrówka` (7 027 wierszy) → kolekcja `km_logs`
- `sourceType: "historical"`, `isPartial: true`, `pointsTotal: 0` (brak danych o wywrotkach w archiwum)
- Idempotentny: kolumna `firestore_id` w arkuszu zapobiega podwójnemu importowi
- Matching uid po emailu z `users_active`; nie znaleziono → `uid: "historical_unmatched"`
- Data przybliżona: `{rok}-01-01` (archiwum ma opisy słowne, nie daty)

### 2.5 Firestore – nowe kolekcje

| Kolekcja | Opis |
|----------|------|
| `km_logs/{logId}` | Wpisy aktywności (runtime + historical) |
| `km_user_stats/{uid}` | Agregaty użytkownika (flat pola dla rankingów) – **AKTUALNIE PUSTE** |
| `km_places/{placeId}` | Słownik nazw akwenów z autocomplete |

### 2.6 Indeksy Firestore (dodane do `firestore.indexes.json`)

```json
{ "km_logs": uid ASC + date DESC }
{ "km_logs": uid ASC + year ASC + km DESC }
{ "km_logs": year ASC + pointsTotal DESC }
```

Kolekcja `km_user_stats` używa zapytań `orderBy + where` na tym samym polu (np. `.where("allTimeKm", ">", 0).orderBy("allTimeKm", "desc")`) – dla tego wzorca Firestore korzysta z auto-generowanych indeksów jednopolowych, composite index nie jest wymagany.

---

## 3. Problem blokujący: brak danych w rankingu

### Przyczyna

Ranking (`GET /api/km/rankings`) czyta wyłącznie z kolekcji `km_user_stats`. Ta kolekcja jest zapełniana przez:
1. Transakcję przy każdym nowym wpisie runtime (`addKmLog` → `updateUserStatsInTransaction`)
2. Task `km.rebuildRankings` (przebudowuje agregaty dla wszystkich uid z `km_logs`)

Import historyczny przez GAS (`archiwum_sync.gs`) zapisał ~7 027 wpisów do `km_logs`, ale **nie wywołał agregacji** – `km_user_stats` jest pusta.

### Rozwiązanie – wymagana akcja admina

Uruchomić task `km.rebuildRankings` przez panel admina lub Firebase Console.

**Opcja A – przez aplikację:**  
Panel admin → Zadania serwisowe → `km.rebuildRankings` → Uruchom

**Opcja B – przez Firebase Console → Cloud Functions → adminRunServiceTask:**  
```json
{
  "taskId": "km.rebuildRankings",
  "payload": {}
}
```

Po wykonaniu: task iteruje wszystkie unikalne uid z `km_logs`, dla każdego wywołuje `km.rebuildUserStats`, zapisuje agregaty do `km_user_stats`. Ranking powinien pokazać dane.

**Uwaga:** wpisy z `uid: "historical_unmatched"` (email nie znaleziony w `users_active`) nie trafią do rankingu osobistego – będą miały własny „worek" w `km_user_stats` pod kluczem `historical_unmatched`.

---

## 4. Co NIE zostało wdrożone (świadome decyzje / future scope)

### 4.1 Mapa aktywności (Leaflet.js)

Infrastruktura gotowa (lat/lng zapisywane do `km_logs` i `km_places`), ale widok mapy nie jest wdrożony. Backend parsuje i waliduje lat/lng w `kmAddLogHandler`. GAS importuje historyczne koordynaty z arkusza. **Frontend nie przekazuje lat/lng przy zapisie** – formularz nie ma pól lat/lng i nie pobiera ich z autocomplete.

Do wdrożenia w przyszłości:
- Hidden fields `lat`/`lng` w formularzu
- Wypełnianie lat/lng z odpowiedzi autocomplete (pole `p.lat`, `p.lng` jest już zwracane przez `/api/km/places`)
- Widget Leaflet do ręcznego pinowania dla nowych miejsc
- Nowy widok zakładki „Mapa" w km_module.js

### 4.2 Automatyczny trigger rebuild po imporcie

`archiwum_sync.gs` nie wywołuje `km.rebuildRankings` po imporcie – wymaga ręcznej akcji admina. Można dodać wywołanie `enqueueServiceJob_("km.rebuildRankings", {})` na końcu `syncArchivumToFirestore()`.

### 4.3 Scoring version bump

`scoringVersion` jest hardcodowany jako `"v1"` w `km_vars.ts`. Brak mechanizmu zmiany przez UI – do zrobienia ręcznie w Firestore jeśli zmieni się wzór punktacji.

### 4.4 Moduł Statystyki (modul_7)

W arkuszu APP_SETUP jako `aktywny: FALSE`. Nie wdrożony.

### 4.5 Widok mapy (km_module, zakładka „Mapa")

Nie wdrożony. Patrz 4.1.

### 4.6 Paginacja rankingu

Ranking pobiera max 50 (domyślnie) lub 100 (max) wyników. Brak infinite scroll / load more. Dla SKK (< 200 członków) wystarczające.

### 4.7 km_places nie są zapełniane przy imporcie historycznym

GAS `archiwum_sync.gs` zapisuje wpisy do `km_logs` z `rawImported.miejsce_raw`, ale NIE upsertuje do `km_places`. Słownik miejsc zapełnia się wyłącznie przez runtime wpisy. Historyczne nazwy akwenów nie są dostępne w autocomplete.

---

## 5. Znane ograniczenia

| Ograniczenie | Wpływ | Obejście |
|---|---|---|
| `uid: "historical_unmatched"` dla niematching emaili | Wpisy bez dopasowanego uid wchodzą do wspólnego „wora" w rankingu | Ręczne przypisanie uid przez korektę w GAS (zmiana uid w dokumencie km_logs + rebuild) |
| Data historyczna `{rok}-01-01` | W widoku „Moje wpisy" daty historyczne pokazują 01.01.RRRR | Zaakceptowane – archiwum ma opisy słowne, nie daty |
| `pointsTotal: 0` dla historycznych | Wpisy historyczne nie mają punktów (brak danych o wywrotkach w archiwum) | Zaakceptowane zgodnie ze specyfikacją |
| Scoring version `"v1"` hardcoded | Zmiana wzoru punktacji wymaga kodu, nie konfiguracji | Zmień wartość w `km_vars.ts` i bump deploy |

---

## 6. Konfiguracja punktacji w arkuszu (istniejąca)

Zakładka `SETUP` w arkuszu Członkowie SKK (synchronizowana do `setup/vars_members`):

| Zmienna | Wartość | Opis |
|---------|---------|------|
| `kabina_punkty` | 1 | Punkty za kabinę |
| `eskimoska_punkty` | 0.5 | Punkty za rolkę (eskimoskę) |
| `dziubek_punkty` | 0.25 | Punkty za dziubka |

**Nie wymagają żadnych zmian.** Sync do Firestore odbywa się przez istniejący mechanizm w GAS.

---

## 7. Lista akcji do wykonania

### Wymagane natychmiast

- [ ] **Uruchomić `km.rebuildRankings`** – bez tego ranking i „Moje statystyki" pokazują puste dane

### Opcjonalne / przyszłe

- [ ] Dodać wywołanie `enqueueServiceJob_("km.rebuildRankings", {})` na końcu `syncArchivumToFirestore()` – automatyzacja po imporcie
- [ ] Wdrożyć przekazywanie lat/lng z autocomplete do formularza
- [ ] Wdrożyć widok mapy (Leaflet.js)
- [ ] Wdrożyć upsert `km_places` przy imporcie historycznym (żeby nazwy rzek były dostępne w autocomplete)
- [ ] Rozważyć ręczne przypisanie uid dla `historical_unmatched` po weryfikacji emaili z archiwum

---

## 8. Pliki wdrożone / zmodyfikowane (lista pełna)

### Nowe pliki (backend)
- `functions/src/modules/km/km_vars.ts`
- `functions/src/modules/km/km_scoring.ts`
- `functions/src/modules/km/km_log_service.ts`
- `functions/src/modules/km/km_places_service.ts`
- `functions/src/api/kmAddLogHandler.ts`
- `functions/src/api/kmMyLogsHandler.ts`
- `functions/src/api/kmMyStatsHandler.ts`
- `functions/src/api/kmRankingsHandler.ts`
- `functions/src/api/kmPlacesHandler.ts`
- `functions/src/service/tasks/kmRebuildUserStats.ts`
- `functions/src/service/tasks/kmRebuildRankings.ts`

### Zmodyfikowane pliki (backend)
- `functions/src/index.ts` – 5 nowych eksportów funkcji
- `functions/src/service/registry.ts` – 2 nowe taski
- `firestore.indexes.json` – 3 nowe indeksy dla `km_logs`
- `firebase.json` – 5 nowych wpisów `rewrites`

### Nowe pliki (frontend)
- `public/modules/km_module.js`
- `public/styles/km.css`

### Zmodyfikowane pliki (frontend)
- `public/core/modules_registry.js` – import i detekcja modułu `km` (label "ranking")

### Nowe pliki (GAS)
- `appscript/kilometrówka/env_config.gs`
- `appscript/kilometrówka/common_helpers.gs`
- `appscript/kilometrówka/ui_menu.gs`
- `appscript/kilometrówka/archiwum_sync.gs`
- `appscript/kilometrówka/ranking_sync.gs`
- `appscript/kilometrówka/appsscript.json`
- `appscript/kilometrówka/.clasp.json`
