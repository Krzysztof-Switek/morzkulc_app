# Ekran kursanta — podsumowanie wdrożenia

Data ostatniej aktualizacji: 2026-05-04  
Środowisko docelowe: prod (`morzkulc-e9df7`)

---

## Spis treści

1. [Rola i model autoryzacji](#1-rola-i-model-autoryzacji)
2. [Backend — Firebase Functions](#2-backend--firebase-functions)
3. [Firestore — kolekcje](#3-firestore--kolekcje)
4. [Frontend — core](#4-frontend--core)
5. [Frontend — moduły](#5-frontend--moduly)
6. [System wywrotolotek (km dla kursantów)](#6-system-wywrotolotek-km-dla-kursantów)
7. [Moduł sprzętu — kursant](#7-moduł-sprzętu--kursant)
8. [Konfiguracja modułów w Firestore](#8-konfiguracja-modułów-w-firestore)
9. [AppScript — synchronizacja danych kursanta z arkusza](#9-appscript--synchronizacja-danych-kursanta-z-arkusza)
10. [Ujednolicenie obsługi imprez kursowych](#10-ujednolicenie-obsługi-imprez-kursowych)
11. [kursPreviewMode — tryb podglądu dla innych ról](#11-kurspreviewmode--tryb-podglądu-dla-innych-ról)
12. [Znane ograniczenia](#12-znane-ograniczenia)
13. [Procedury operacyjne](#13-procedury-operacyjne)

---

## 1. Rola i model autoryzacji

Rola kursanta: `rola_kursant` (pole `role_key` w `users_active/{uid}`).

Kursant różni się od pozostałych ról tym, że:
- **nie zapisuje kilometrów ani godzin** — rejestruje wyłącznie wywrotolotek (kabina/rolka/dziubek)
- widzi inny dashboard i inny zestaw zakładek w module km
- nie widzi zakładek: Imprezy (główne), Składki, standardowy Godzinki
- widzi zamiast: Skrypt kursowy, Godzinki kursowe, Wywrotolotek (ranking + formularz)
- może przeglądać sprzęt, ale rezerwacje są sterowane flagą `kursWypozycza`

Sprawdzenie roli kursanta w kodzie frontendowym:
```javascript
// render_shell.js, km_module.js
const isKursant = roleKey === "rola_kursant" || ctx?.kursPreviewMode === true;
```

```javascript
// access_control.js
const roleKey = ctx?.kursPreviewMode
  ? "rola_kursant"
  : String(ctx?.session?.role_key || "rola_sympatyk");
```

---

## 2. Backend — Firebase Functions

### 2.1 Env vars

Plik `functions/.env.morzkulc-e9df7` (prod) i `.env.sprzet-skk-morzkulc` (dev):
```
SVC_KURS_SHEET_ID=19Nse1gWOqDaUZeoTAHyGl1IwicEjsnrSyGCfvCatP74
```

Zakładka arkusza domyślnie `"Kurs"` (z `service_config.ts`).

### 2.2 `service/service_config.ts` — blok kurs

```typescript
kurs: {
  spreadsheetId: string;
  tabName: string;
}
```

Domyślne wartości: `spreadsheetId: ""`, `tabName: "Kurs"`.  
Jeśli `spreadsheetId` jest pusty, `/api/kurs/info` zwraca `{ unconfigured: true }`.

### 2.3 `GET /api/kurs/info`

Plik: `functions/src/api/getKursInfoHandler.ts`  
Cloud Function: `getKursInfo` (eksport w `index.ts`)  
Rewrite w `firebase.json`: `/api/kurs/info` → `getKursInfo`

**Autoryzacja** (sprawdzane kolejno):
1. `rola_kursant` — dostęp zawsze
2. `adminRoleKeys` (`rola_zarzad`, `rola_kr`) — dostęp zawsze
3. `setup.modules.modul_kurs.access.testUsersAllow` — testowi użytkownicy (wyszukiwane **hardcoded pod kluczem `modul_kurs`**, nie dynamicznie — znane ograniczenie)

**Odpowiedź** (`200 OK`):
```json
{
  "ok": true,
  "info": [
    {
      "id": "...", "name": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD",
      "description": "...", "instructor": "...", "instructorContact": "...",
      "location": "...", "link": "..."
    }
  ],
  "events": [
    {
      "id": "...", "name": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD",
      "location": "...", "description": "...", "contact": "...", "link": "..."
    }
  ]
}
```
lub `{ "ok": true, "info": [], "events": [], "unconfigured": true }` gdy brak arkusza.

**Źródło danych Firestore**:
- `kurs_info` filtrowane po `isActive == true`
- `events` filtrowane po `kursowa == true` (tylko `approved == true` przechodzi przez filtr kodu, ale nie jest to osobny index — filtr Firestore jest tylko na `kursowa`)

**Uwaga implementacyjna** (linia 82 w handlerze):
```typescript
const [infoSnap, eventsSnap] = await Promise.all([
  db.collection("kurs_info").where("isActive", "==", true).get(),
  db.collection("events").where("kursowa", "==", true).get(),
]);
// `approved` sprawdzane w kodzie JS, nie jako where() Firestore
const events = eventsSnap.docs.filter(d => d.data().approved === true)...
```

### 2.4 `GET /api/km/kursant-stats`

Plik: `functions/src/api/getKursantStatsHandler.ts`  
Cloud Function: `getKursantStats`  
Rewrite w `firebase.json`: `/api/km/kursant-stats` → `getKursantStats`

**Autoryzacja**: `rola_kursant` lub `adminRoleKeys`.

**Logika** (kolejność operacji):
1. Pobiera dane użytkownika z `users_active/{uid}` — sprawdza `role_key`
2. Pobiera listę wszystkich kursantów: `users_active` gdzie `role_key == "rola_kursant"`
3. Buduje mapę `uid → displayName` z pól `profile.firstName + profile.lastName` (lub `profile.nickname` jako fallback, lub `"Kursant"`)
4. Pobiera `km_user_stats/{uid}` dla każdego kursanta (równoległe `Promise.all`)
5. Oblicza ranking — sortuje malejąco po `allTimePoints` (zaokrąglone do 2 miejsc: `Math.round(pts * 100) / 100`)
6. Pobiera dane personalne: `kurs_uczestnicy/{email}` i `setup/vars_kurs` równolegle
7. Zwraca odpowiedź

**Odpowiedź** (`200 OK`):
```json
{
  "ok": true,
  "myCapsizes": 1.5,
  "myRank": 1,
  "totalKursants": 3,
  "fee": 500,
  "weight": 75,
  "height": 180,
  "phone": "+48...",
  "pesel": "90010112345",
  "cena_kursu": 800,
  "leaderboard": [
    { "rank": 1, "name": "Jan Kowalski", "isMe": true, "total": 1.5 },
    { "rank": 2, "name": "Anna Nowak",   "isMe": false, "total": 1.0 }
  ]
}
```

**Kluczowe**: ranking czyta **wyłącznie z `km_user_stats`** (pre-computed cache), nie z `km_logs`. Zapewnia O(n) zamiast O(n×m) przy tysiącach logów. Patrz sekcja 6.

### 2.5 `GET /api/setup` — rozszerzenia dla kursanta

Plik: `functions/src/index.ts`, eksport `getSetup`.

Przy każdym wywołaniu `/api/setup` backend wykonuje **równolegle**:
```typescript
const [setup, userSnap, kursWypozyczaSnap] = await Promise.all([
  getSetupApp(),
  db.collection("users_active").doc(uid).get(),
  db.collection("var_members").doc("kurs_wypożycza").get(),
]);
```

**kursPreviewMode** — mechanizm testowego podglądu widoku kursanta:
```typescript
const kursModuleCfg = Object.values(setup.modules || {}).find(
  (m: any) => String(m?.type || "").toLowerCase() === "kurs" ||
              String(m?.label || "").toLowerCase() === "kurs"
) as any;
const kursTestUsers = flattenEmails(kursModuleCfg?.access?.testUsersAllow);
const isKursPreview = kursTestUsers.includes(uid) || kursTestUsers.includes(email);
const effectiveRoleKey = isKursPreview ? "rola_kursant" : roleKey;
```

Gdy `isKursPreview === true`, odpowiedź zawiera `kursPreviewMode: true` i moduły są filtrowane jakby użytkownik miał rolę `rola_kursant`.

**kursWypozycza** — czy kursant może rezerwować sprzęt:
```typescript
const kursWypozycza = kursWypozyczaSnap.exists && kursWypozyczaSnap.data()?.value === true;
// zwracane zawsze w odpowiedzi, false gdy brak dokumentu
```

**Odpowiedź** (fragmenty specyficzne dla kursanta):
```json
{
  "ok": true,
  "setup": { "...": "..." },
  "kursWypozycza": true,
  "kursPreviewMode": true
}
```
`kursPreviewMode` pojawia się w odpowiedzi tylko gdy jest `true`. `kursWypozycza` zawsze jest obecne.

### 2.6 Task: `kursSyncFromSheet`

Plik: `functions/src/service/tasks/kursSyncFromSheet.ts`  
ID taska: `kursSyncFromSheet`  
Zarejestrowany w: `service/registry.ts`

Synchronizuje zakładkę `"Kurs"` z Google Sheet (skonfigurowanego przez `SVC_KURS_SHEET_ID`) do kolekcji Firestore `kurs_info`.

**Kolumny zakładki "Kurs"** (normalizowane nagłówki):
`nazwa`, `data_start`, `data_end`, `opis`, `instruktor`, `kontakt_instruktora`, `miejsce`, `link`, `aktywny?`

Pola dokumentu `kurs_info/{id}`:
```
id, name, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD),
description, instructor, instructorContact, location, link, isActive (bool)
```

Pomocniki:
- `parseBool(v)` — akceptuje: `tak / t / yes / true / 1 / ✓`
- `normDate(v)` — konwertuje `DD.MM.YYYY` → `YYYY-MM-DD`

**Uruchomienie**: przez kolekcję `service_jobs`:
```json
{
  "taskId": "kursSyncFromSheet",
  "payload": {},
  "status": "queued",
  "createdAt": "<now>"
}
```

---

## 3. Firestore — kolekcje

| Kolekcja | Opis |
|---|---|
| `kurs_info/{id}` | Dane kursu (aktywne: `isActive: true`). Źródło: arkusz Google Sheet. |
| `kurs_uczestnicy/{email}` | Dane personalne uczestnika (opłata, PESEL, telefon, waga, wzrost). Klucz = email lowercase. Źródło: AppScript (patrz sekcja 9). |
| `events` | Wszystkie imprezy klubowe. Imprezy kursowe oznaczone `kursowa: true`. |
| `var_members/kurs_wypożycza` | Boolean: czy kursanci mogą rezerwować sprzęt. |
| `setup/vars_kurs` | Zmienne konfiguracyjne kursu (m.in. `cena_kursu`). Źródło: AppScript. |
| `km_logs/{logId}` | Source of truth — każdy wpis wywrotolotek / kilometrówki. |
| `km_user_stats/{uid}` | Pre-computed cache statystyk użytkownika (dla rankingów). |

**Struktura `var_members/kurs_wypożycza`**:
```
description: ""
group: "Kurs"
type: "boolean"
value: true | false
```

**Struktura `km_user_stats/{uid}`** (pola używane przez kursantów):
```
allTimePoints: number       (suma punktów za wywrotolotek)
allTimeCapsizeKabina: number
allTimeCapsizeRolka: number
allTimeCapsizeDziubek: number
allTimeKm: number           (nieistotne dla kursantów, zazwyczaj 0)
allTimeHours: number        (nieistotne dla kursantów, zazwyczaj 0)
yearPoints: { [year]: number }
years: { [year]: { ... } }
updatedAt: Timestamp
```

---

## 4. Frontend — core

### 4.1 `public/core/app_shell.js`

```javascript
ctx.kursPreviewMode = setupResp?.kursPreviewMode === true;
ctx.kursWypozycza   = setupResp?.kursWypozycza === true;
// w catch: oba false
```

### 4.2 `public/core/access_control.js`

```javascript
// canSeeModule() — rola efektywna uwzględnia tryb podglądu
const roleKey = ctx?.kursPreviewMode
  ? "rola_kursant"
  : String(ctx?.session?.role_key || "rola_sympatyk");
```

Logika widoczności modułów (musi być spójna z `filterSetupForUser` w `index.ts`):
- `usersBlock` — zawsze blokuje, nawet test user
- `!enabled && !isTestUser` — ukryte
- `mode === "off" && !isTestUser` — ukryte
- `mode === "test" && !isTestUser` — ukryte
- `mode === "prod" && rolesAllowed` — sprawdza `roleKey`
- `testUserGranted: true` w odpowiedzi setup — frontend pomija swoje własne blokady

### 4.3 `public/core/modules_registry.js`

```javascript
const KNOWN_MODULE_TYPES = [
  // ... inne typy ...
  "kurs",
  "kurs_godzinki",
];

// Fallback po etykiecie (label jest jedyną wartością w Firestore setup/app):
// "kurs"         → type: "kurs"
// "kurs_godzinki"→ type: "kurs_godzinki"

// case "kurs":
createKursModule({ ...base, defaultRoute: "skrypt" })

// case "kurs_godzinki":
createKursGodzinkiModule({ ...base, defaultRoute: "info" })
```

**Ważna uwaga**: w `setup/app` Firestore moduły mają tylko pole `label` — brak pola `type`. Cała rozdzielczość typów opiera się na etykietach (np. `"Kurs"` → lowercase `"kurs"` → type `"kurs"`).

### 4.4 `public/core/render_shell.js`

**renderNav — filtry nawigacji**:
```javascript
if (ctx.kursPreviewMode && m.type === "admin_pending") return false; // admin panel ukryty
if (m.type === "kurs_godzinki") return false;  // kurs_godzinki zawsze ukryty w nav (tylko kafelek)
```

**getDashboardConfig — konfiguracja dashboardu**:
```javascript
const isKursant = roleKey === "rola_kursant" || ctx?.kursPreviewMode === true;
```

**Kafelki dashboardu dla kursanta** (`startTileGrid`):

| Kafelek | Widoczny | Akcja |
|---|---|---|
| Sprzęt | zawsze | `reserve-gear` |
| Godzinki (standardowy) | NIE dla kursanta | — |
| Imprezy | NIE dla kursanta | — |
| Godzinki kursanta | TAK, jeśli `hasKursGodzinkiModule` | `kurs-godzinki` |
| Basen | zawsze | `basen` |
| Wywrotolotek / Ranking (km) | TAK, jeśli `hasKmModule` | `km` (label: "Wywrotolotek") |
| Składki | NIE dla kursanta | — |
| Skrypt | TAK, jeśli `hasKursModule` | `kurs` (styl: primary) |
| Gdzie pływamy | TAK dla kursanta | `mapa-kursant` |
| Zarząd | TAK, jeśli `isAdmin` | `admin-pending` |

**Statystyki inline na dashboardzie** (kursant vs reszta):

Kursant widzi:
- `#homeKursantCapsizesCell` — wypełniany async z `/api/km/kursant-stats` → `myCapsizes` punkty
- `#homeKursantRankCell` — wypełniany async z `/api/km/kursant-stats` → `myRank` miejsce

Reszta widzi: km, miejsce w rankingu, godzinki.

**Sekcja "Wydarzenia kursowe"** (pod kafelkami, tylko kursant):
```html
<section class="dashCard startSection">
  <h3>Wydarzenia kursowe</h3>
  <div id="homeKursEventsList">…</div>
</section>
```
Wypełniana async przez `buildHomeKursEventsSection(ctx)` → `GET /api/kurs/info`.

Sekcja standardowych imprez (`#homeEventsList`) jest **ukryta** dla kursanta.

**renderHomeProfile — profil kursanta**:

Zamiast standardowych statystyk (km, godzinki), kursant widzi:
```
Opłata: {fee} zł    Cena kursu: {cena_kursu} zł
Wzrost: {height} cm  Waga: {weight} kg  Telefon: {phone}  PESEL: {pesel}
```

Dane ładowane async z `GET /api/km/kursant-stats`. Tekst "Więcej opcji dostępnych wkrótce." jest wyświetlany **tylko dla ról innych niż kursant**.

---

## 5. Frontend — moduły

### 5.1 `public/modules/kurs_module.js`

Moduł skryptu kursowego. Dwa widoki:
1. **TOC** (spis treści) — route `skrypt`
2. **Rozdział** — route `ch01`…`ch06`

**CHAPTERS** (6 rozdziałów):
```javascript
const CHAPTERS = [
  { id: "ch01", num: 1, title: "Wstęp" },
  { id: "ch02", num: 2, title: "Sprzęt" },
  { id: "ch03", num: 3, title: "Locja" },
  { id: "ch04", num: 4, title: "PKP — Podstawy Kajakarstwa" },
  { id: "ch05", num: 5, title: "Manewry" },
  { id: "ch06", num: 6, title: "Bezpieczeństwo" },
];
```

Pliki HTML rozdziałów: `public/skrypt_kurs/chapters/{chId}.html` — serwowane statycznie przez Firebase Hosting. Każda zmiana treści wymaga deploy hostingu.

**Funkcja `renderChapter`** (linia 52):
```javascript
const res = await fetch(`/skrypt_kurs/chapters/${chId}.html`);
```

Nawigacja: hash-based (`#moduleId/ch01`…). Przycisk "← Spis treści" wraca do `#moduleId/skrypt`. Przyciski poprzedni/następny rozdział.

Ikona PDF (drukuj) wbudowana w header — wywołuje `window.print()`.

### 5.2 `public/modules/kurs_godzinki_module.js`

Statyczny moduł informacyjny o systemie godzinek dla kursantów.  
Zawiera: opis systemu, przykład salda, link do PDF regulaminu.

**Kluczowe**: moduł **nie pojawia się w nav** (filtrowany w `renderNav`). Dostępny wyłącznie przez kafelek "Godzinki" na dashboardzie kursanta.

---

## 6. System wywrotolotek (km dla kursantów)

### 6.1 Architektura danych

**Dwie kolekcje Firestore:**

| Kolekcja | Rola | Kiedy aktualizowana |
|---|---|---|
| `km_logs/{logId}` | Source of truth — każdy pojedynczy wpis | Przy każdym `addKmLog` |
| `km_user_stats/{uid}` | Pre-computed cache dla rankingów | Atomicznie razem z `km_logs` w transakcji |

**Transakcja `addKmLog`** (funkcja backend): atomicznie zapisuje do obu kolekcji jednocześnie. Gdy `km_user_stats/{uid}` nie istnieje, jest tworzony od zera.

**Gdy cache jest nieaktualny**: task `km.rebuildUserStats` przelicza `km_user_stats` z wszystkich `km_logs` dla danego UID (patrz sekcja 13).

### 6.2 Punkty wywrotolotek

Plik: `functions/src/modules/km/km_scoring.ts`, `computePoints(capsizeRolls, vars)`.

Domyślne wartości punktów (z `setup/vars_members` lub fallback):
- `kabina` = 1 pkt (`vars.ptsKabina`, Firestore key: `kabina_punkty`)
- `rolka` = 0.5 pkt (`vars.ptsEskimoska`, Firestore key: `eskimoska_punkty`)
- `dziubek` = 0.25 pkt (`vars.ptsDziubek`, Firestore key: `dziubek_punkty`)

Wzór: `pts = kabina × ptsKabina + rolka × ptsEskimoska + dziubek × ptsDziubek`

### 6.3 Zakładki modułu km dla kursanta

Plik: `public/modules/km_module.js`, `TABS` (linia 39):

```javascript
const TABS = [
  { id: "form",            label: "Dodaj wpis" },
  { id: "rankings",        label: "Wywrotolotek" },  // NIE dla kursanta
  { id: "events",          label: "Imprezy" },        // NIE dla kursanta
  { id: "map",             label: "Gdzie pływamy" },  // dla obu
  { id: "my-stats",        label: "Moje statystyki" },// NIE dla kursanta
  { id: "my-logs",         label: "Moje wpisy" },     // dla obu
  { id: "kursant-ranking", label: "Wywrotolotek" },   // TYLKO dla kursanta
];
```

Filtr (linia 1381):
```javascript
const visibleTabs = isKursant
  ? TABS.filter(t => t.id !== "rankings" && t.id !== "events" && t.id !== "my-stats")
  : TABS.filter(t => t.id !== "kursant-ranking");
```

Nagłówek modułu:
```javascript
<h2>${isKursant ? "Wywrotolotek" : "Kilometrówka"}</h2>
```

### 6.4 Formularz kursanta (`renderKursantFormView`)

Route: `form` (domyślna).

**Zawartość formularza**:
- Dropdown "Impreza kursowa" — ładowany z `/api/events?mode=all`, filtrowany: `ev.kursowa === true && ev.ranking === true`
- Fieldset "Wywrotolotek":
  - Kabina (input number, min 0, max 999, step 1)
  - Rolka (input number)
  - Dziubek (input number)
- Przycisk "Zapisz"

**Payload wysyłany** do `POST /api/km/log/add`:
```javascript
{
  date: todayIso(),        // data dzisiejsza (YYYY-MM-DD)
  waterType: "lowlands",   // hardcoded dla kursanta
  placeName: eventName,    // nazwa imprezy z dropdown
  placeNameRaw: eventName,
  eventId,
  eventName,
  km: 0,                   // kursant nie zapisuje km
  hoursOnWater: 0,         // kursant nie zapisuje godzin
  capsizeRolls: { kabina, rolka, dziubek },
}
```

### 6.5 Ranking kursantów (`renderKursantRankingView`)

Route: `kursant-ranking`.

Ładuje z `GET /api/km/kursant-stats`. Renderuje tabelę:

| # | Kursant | Punkty |
|---|---|---|
| 1 | Jan Kowalski ★ | **1.5** |
| 2 | Anna Nowak | **1.0** |

Wiersz zalogowanego użytkownika wyróżniony klasą `kmRankingRowMe` (kolor akcentu) + suffix `★` przy nazwisku.

### 6.6 Widok "Moje wpisy" — wyświetlanie logów kursanta

Kursant używa tego samego `renderMyLogsView` co inni użytkownicy, ale wpisy wyglądają inaczej z uwagi na logikę wyświetlania.

**Funkcja `fmtNum`** (linia 88):
```javascript
function fmtNum(n, decimals = 1) {
  const v = parseFloat(n) || 0;
  return v % 1 === 0 ? String(v) : parseFloat(v.toFixed(decimals)).toString();
}
// parseFloat().toString() usuwa trailing zeros:
// 0.25 → toFixed(2) = "0.25" → parseFloat = 0.25 → toString = "0.25" ✓
// 0.3  → toFixed(2) = "0.30" → parseFloat = 0.3  → toString = "0.3"  ✓
```

**Nagłówek logu** (linia 1066):
```javascript
<span class="kmLogPts">${fmtNum(log.pointsTotal, 2)} pkt</span>
// 2 miejsca dziesiętne — 0.25 wyświetla się jako "0.25", nie "0.3"
```

**Meta wiersz logu** (linie 1072-1081):
```javascript
<div class="kmLogMeta">
  ${log.km > 0 ? `<span>${fmtNum(log.km)} km</span>` : ""}  // km tylko gdy > 0
  ${log.hoursOnWater ? `<span>${fmtNum(log.hoursOnWater)} h</span>` : ""}
  ${log.difficulty ? `<span>${esc(log.difficulty)}</span>` : ""}
  ${capsizeTotal > 0 ? `<span>${[
    (log.capsizeRolls?.kabina || 0) > 0  ? `${log.capsizeRolls.kabina}× kabina`  : "",
    (log.capsizeRolls?.rolka || 0) > 0   ? `${log.capsizeRolls.rolka}× rolka`   : "",
    (log.capsizeRolls?.dziubek || 0) > 0 ? `${log.capsizeRolls.dziubek}× dziubek` : "",
  ].filter(Boolean).join(", ")}</span>` : ""}
</div>
// Przykład: "1× kabina, 1× dziubek" (zamiast "2 wywrotolotek")
```

---

## 7. Moduł sprzętu — kursant

Plik: `public/modules/gear_module.js`.

Kursant widzi listę sprzętu, ale możliwość rezerwacji zależy od `kursWypozycza`:
```javascript
const isKursant = ctx?.kursPreviewMode || ctx?.session?.role_key === "rola_kursant";
const canUserReserve = isKursant ? ctx?.kursWypozycza === true : true;
// renderKayakCard(k, isFav, canUserReserve)
```

W funkcji `renderKayakCard(k, isFav = false, canUserReserve = true)`:
```javascript
const canReserve = working && (!isPrivate || privateRent) && !isPool && canUserReserve;
```

Sterowanie wyłącznie przez Firestore (`var_members/kurs_wypożycza.value = true/false`), bez potrzeby deploy.

---

## 8. Konfiguracja modułów w Firestore

Moduły `setup/app` są tworzone i aktualizowane przez AppScript synchronizujący z Google Sheets (nie ręcznie przez Firebase Console).

Przykładowa konfiguracja modułów kursanta:

| Klucz w Firestore | label | type | rolesAllowed | mode |
|---|---|---|---|---|
| `modul_10` | `Kurs` | *(brak pola — fallback po label)* | `["rola_kursant"]` | `"test"` (lub `"prod"`) |
| `modul_11` | `Kurs_godzinki` | *(brak pola — fallback po label)* | `["rola_kursant"]` | `"test"` (lub `"prod"`) |
| `modul_2` | Sprzęt | `"gear"` | musi zawierać `"rola_kursant"` | — |

`kursPreviewMode` (testUsersAllow): lista emaili/UID w `setup/app → modul_10 → access.testUsersAllow` (lub inny klucz modułu typu "kurs" — wyszukiwane dynamicznie w `index.ts` po label, ale **hardcoded jako `modul_kurs`** w `getKursInfoHandler.ts`).

---

## 9. AppScript — synchronizacja danych kursanta z arkusza

Katalog: `appscript/kurs/`

### Pliki

| Plik | Funkcja | Co robi |
|---|---|---|
| `env_config.gs` | konfiguracja | PROJECT_ID, FIREBASE_API_KEY, KURS_SHEET_ID, nazwy zakładek, nazwy kolekcji |
| `common_helpers.gs` | helpery | identyczny z `członkowie sympatycy SKK/common_helpers.gs` — brak cross-project importów w GAS |
| `kurs_config_sync.gs` | `syncKursConfigToFirestore()` | zakładka "setup" → `setup/vars_kurs` |
| `uczestnicy_sync.gs` | `syncUczestnicyToFirestore()` | zakładka "uczestnicy" → `kurs_uczestnicy/{email}` |
| `po_kursie_sync.gs` | `syncPoKursieToFirestore()` | zakładka "co po kursie" → `setup/kurs_po_kursie` |
| `ui_menu.gs` | `onOpen()` | menu "Morzkulc" w arkuszu |
| `appsscript.json` | manifest | scopy OAuth — **wymagany** `datastore` scope dla Firestore |

### `appsscript.json` — wymagany manifest

Bez tego pliku Apps Script nie dostaje scope `datastore` i Firestore zwraca 403:
```json
{
  "timeZone": "Europe/Warsaw",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

### `kurs_config_sync.gs` — zakładka "setup" → `setup/vars_kurs`

Kolumny: `nazwa zmiennej`, `wartość`, `opis`  
Normalizowane nagłówki: `nazwa_zmiennej`, `wartosc`, `opis`

Struktura `setup/vars_kurs`:
```json
{
  "vars": {
    "cena_kursu": { "type": "number", "value": 800, "description": "Cena kursu w PLN" }
  },
  "updatedAt": "ISO",
  "updatedBy": "email"
}
```

### `uczestnicy_sync.gs` — zakładka "uczestnicy" → `kurs_uczestnicy/{email}`

Kolumny: `Imię`, `Nazwisko`, `e-mail`, `Opłata`, `PESEL`, `Telefon`, `waga`, `wzrost`

ID dokumentu = email lowercase (klucz unikalny per uczestnik).

Struktura dokumentu `kurs_uczestnicy/{email}`:
```json
{
  "firstName": "Jan", "lastName": "Kowalski", "email": "jan@example.com",
  "fee": 500, "pesel": "90010112345", "phone": "+48...",
  "weight": 75, "height": 180,
  "createdAt": "ISO", "updatedAt": "ISO", "sheetSyncedAt": "ISO"
}
```

### `po_kursie_sync.gs` — zakładka "co po kursie" → `setup/kurs_po_kursie`

Kolumny: `tytuł`, `treść`

Struktura `setup/kurs_po_kursie`:
```json
{
  "items": [
    { "title": "...", "content": "...", "order": 1 },
    { "title": "...", "content": "...", "order": 2 }
  ],
  "updatedAt": "ISO", "updatedBy": "email"
}
```

Podejście: pełny replace przy każdym syncu (tablica jest mała).

---

## 10. Ujednolicenie obsługi imprez kursowych

### Problem (rozwiązany 2026-05-02)

Imprezy kursowe były w osobnej kolekcji `kurs_events`. Tworzyło to dwa niezależne systemy imprez.

### Rozwiązanie

Dwie nowe kolumny w zakładce `"imprezy"` głównego arkusza (członkowie/sympatycy):
- `ranking?` — czy impreza kwalifikuje się do rankingu km (można zgłaszać punkty)
- `kursowa?` — czy impreza jest kursowa (wyświetlana na ekranie kursanta)

### Zmienione pliki

**`appscript/członkowie sympatycy SKK/events_sync.gs`**:
- `ranking` i `kursowa` odczytywane przez `normalizeBoolish_()`
- Zapisywane jako pola `ranking: bool` i `kursowa: bool` w każdym dokumencie `events`

**`functions/src/service/tasks/eventsSyncFromSheet.ts`**:
- Odczyt kolumn `ranking?` i `kursowa?` przez `isApproved()`
- Pola `ranking` i `kursowa` w dokumencie `events`
- Przy zapisie do arkusza z aplikacji: nowe pola domyślnie `"NIE"`

**`functions/src/api/getKursInfoHandler.ts`**:
```typescript
db.collection("events").where("kursowa", "==", true).get()
// approved sprawdzane w JS po stronie kodu
```

**`firestore.indexes.json`**:
```json
{ "collectionGroup": "events", "fields": [
  { "fieldPath": "kursowa", "order": "ASCENDING" },
  { "fieldPath": "approved", "order": "ASCENDING" },
  { "fieldPath": "startDate", "order": "ASCENDING" }
]}
```

### Schemat dokumentu `events`

```
id, name, startDate, endDate, location, description, contact, link,
approved: bool,
ranking: bool,   ← NOWE
kursowa: bool,   ← NOWE
source, createdAt, updatedAt, sheetRowNumber, sheetSyncedAt, calendarEventId?
```

### Kolekcja `kurs_events` — status

**Nieużywana** — można usunąć. Imprezy kursowe przeniesione do `events` z polem `kursowa: true`.

---

## 11. kursPreviewMode — tryb podglądu dla innych ról

Pozwala użytkownikowi z dowolną rolą (np. `rola_zarzad`) zobaczyć aplikację oczami kursanta.

**Jak włączyć**:
1. W Firestore `setup/app` → moduł Kurs → `access.testUsersAllow` → dodaj email lub UID użytkownika
2. Moduł Kurs musi mieć `enabled: true`
3. Po odświeżeniu strony (lub przelogowaniu), `/api/setup` zwróci `kursPreviewMode: true`

**Efekty**:
- `ctx.kursPreviewMode = true` w frontend
- `effectiveRoleKey = "rola_kursant"` używany do filtrowania modułów
- Użytkownik widzi dashboard kursanta, zakładki km jak kursant
- Menu nawigacyjne: ukryty admin panel
- Dostęp do `/api/kurs/info` (hardcoded `modul_kurs` — patrz sekcja 2.3 — ograniczenie)

**Jak wyłączyć**: usuń email/UID z `testUsersAllow` i odśwież.

---

## 12. Znane ograniczenia

1. **`getKursInfoHandler.ts` szuka testUsersAllow pod kluczem `modul_kurs` (hardcoded)**  
   W `index.ts` wyszukiwanie jest dynamiczne (po label/type). Handler `/api/kurs/info` używa klucza `modul_kurs` bezpośrednio. Jeśli moduł ma inny klucz w Firestore, test user nie dostanie dostępu do `/api/kurs/info`. Do naprawy w następnej iteracji.

2. **`kursWypozycza` nie jest real-time**  
   Zmiana wartości w Firestore jest widoczna po następnym załadowaniu aplikacji (pełny F5 lub re-login). Nie ma mechanizmu live-update.

3. **Rozdziały skryptu są statyczne**  
   `public/skrypt_kurs/chapters/ch01.html`…`ch06.html` — każda zmiana treści wymaga deploy hostingu.

4. **Ranking czyta z `km_user_stats` — wymaga aktualnego cache**  
   Jeśli `km_user_stats/{uid}` jest nieaktualny lub brakuje go (np. przy starych wpisach sprzed wdrożenia transakcji), ranking pokaże 0 lub złą wartość. Naprawa: uruchomienie `km.rebuildUserStats` dla danego UID (patrz sekcja 13).

5. **Brak komunikatu dla użytkownika przy `unconfigured: true`**  
   Zakładka Harmonogram wyświetla pusty widok gdy brak arkusza. Do dopracowania UX.

---

## 13. Procedury operacyjne

### Naprawa `km_user_stats` dla konkretnego kursanta

Gdy ranking pokazuje 0 mimo istniejących logów, lub gdy `km_user_stats` nie istnieje:

Utwórz dokument w `service_jobs`:
```json
{
  "taskId": "km.rebuildUserStats",
  "payload": { "uid": "<uid kursanta>" },
  "status": "queued",
  "createdAt": "<now>"
}
```

Trigger `onServiceJobCreated` wykona task automatycznie. Task przelicza `km_user_stats` ze wszystkich `km_logs` dla tego UID.

Plik taska: `functions/src/service/tasks/kmRebuildUserStats.ts`.

### Dodanie kursanta do systemu

1. Zalogowanie użytkownika → auto-rejestracja przez `/api/register`
2. Zmiana `role_key` na `rola_kursant` w `users_active/{uid}` w Firebase Console
3. Uruchomienie AppScript "sync uczestnicy" — uzupełni `kurs_uczestnicy/{email}`
4. Opcjonalnie: uruchomienie `km.rebuildUserStats` dla nowego UID

### Zmiana roli kursanta na członka

Po zmianie `role_key` w `users_active`:
1. Kursant traci dostęp do ekranów kursanta
2. Zyskuje dostęp do pełnej kilometrówki
3. Zalecane: uruchomienie `km.rebuildUserStats` aby przeliczyć statystyki (przelicza z km_logs uwzględniając też km i godziny jeśli były zapisywane)

### Włączenie/wyłączenie rezerwacji sprzętu dla kursantów

Zmień `var_members/kurs_wypożycza.value` na `true` lub `false` w Firestore Console. Zmiana aktywna przy następnym załadowaniu aplikacji przez kursanta.

### Synchronizacja danych z arkusza kursowego

Menu w arkuszu Google: `Morzkulc → sync konfiguracja kursu / sync uczestnicy / sync co po kursie`.

Wszystkie 3 funkcje chronione przez `assertBoardAccess_()` — tylko zarząd może uruchamiać.

### Deploy po zmianach kodu

```bash
# Tylko backend (functions)
firebase deploy --only functions

# Tylko frontend (hosting)
firebase deploy --only hosting

# Oba
firebase deploy
```

`firebase deploy` uruchamia automatycznie: `npm --prefix functions run lint` + `npm --prefix functions run build` + `node scripts/bump-sw-cache.js` (dla hostingu).