# Plan: Ekran startowy + moduły dla kursantów (`rola_kursant`)

## Context

Kursanci to nowa grupa użytkowników w SKK Morzkulc. Płacą za kurs (nie składki), uczestniczą głównie w zajęciach kursowych, a nie wszystkich imprezach klubowych. Celem jest:
1. Pokazać im jak działa aplikacja (trial), żeby po kursie zostali pełnymi członkami.
2. Dać im informacje specyficzne dla kursu (harmonogram, kontakt, itp.) pobierane z osobnego Google Sheets zarządzanego przez zarząd.
3. Dostosować ekran startowy tak, żeby priorytetyzował treści kursowe.

---

## Architektura danych

### Nowy Google Sheet: Kursanci
- Zarząd tworzy arkusz z zakładkami:
  - `Kurs` — info o kursie: instruktorzy, kontakty, opis, daty
  - `Imprezy kursowe` — lista imprez specyficznie kursowych (jak obecny sheet imprez, ale filtrowany)
- Env vars do dodania: `SVC_KURS_SHEET_ID`, `SVC_KURS_SHEET_TAB`, `SVC_KURS_IMPREZY_TAB`
- Sync analogiczny do `eventsSyncFromSheet.ts` → nowy task `kursSyncFromSheet.ts`
- Nowa kolekcja Firestore: `kurs_info` (singleton lub per-kurs)

---

## Pliki do stworzenia (nowe)

### Backend

| Plik | Opis |
|---|---|
| `functions/src/service/tasks/kursSyncFromSheet.ts` | Task synca kurs_info z Google Sheets (wzorzec: `eventsSyncFromSheet.ts`) |
| `functions/src/api/getKursInfoHandler.ts` | `GET /api/kurs/info` — dane kursu dla kursanta |

### Frontend

| Plik | Opis |
|---|---|
| `public/modules/kurs_module.js` | Nowy moduł: info o kursie, kontakty, harmonogram zajęć kursowych — dane z `/api/kurs/info` |
| `public/styles/kurs.css` | Style dla modułu kursu (wzorzec: `basen.css`) |

---

## Pliki do modyfikacji (istniejące)

### Backend

| Plik | Zmiana |
|---|---|
| `functions/src/service/registry.ts` | Rejestracja nowego tasku `kursSyncFromSheet` |
| `functions/src/index.ts` | Dodanie endpointu `GET /api/kurs/info`, obsługa `rola_kursant` w middleware |
| `functions/src/service/service_config.ts` | Dodanie `SVC_KURS_SHEET_ID`, `SVC_KURS_SHEET_TAB`, `SVC_KURS_IMPREZY_TAB` |
| `.env.sprzet-skk-morzkulc` + `.env.morzkulc-e9df7` | Wartości nowych env vars |

### Frontend

| Plik | Zmiana |
|---|---|
| `public/core/modules_registry.js` | Import i rejestracja `createKursModule`; dodanie typu `"kurs"` do `KNOWN_MODULE_TYPES` |
| `public/core/render_shell.js` | Wariant `renderHomeDashboard` dla kursanta: inne kafelki, inne sekcje, priorytet imprez kursowych |
| `public/styles/app.css` | Import `kurs.css` |
| `public/index.html` | Preload / link dla `kurs.css` jeśli potrzebny |

### Konfiguracja Firestore (`setup/app`)

- Dodać wpis `modul_kurs: { label: "Kurs", type: "kurs", order: X, enabled: true, access: { mode: "prod", rolesAllowed: ["rola_kursant"] } }`
- Istniejące moduły (sprzęt, basen, imprezy, ranking) rozszerzyć `rolesAllowed` o `"rola_kursant"` gdzie stosowne

---

## Szczegóły zmian frontendowych

### `render_shell.js` — wariant dla kursanta

W `renderHomeDashboard()`, przed budową HTML:
```js
const isKursant = ctx.session?.role_key === "rola_kursant";
```

Kursant dostaje:
- **Statystyki**: Rola + Status (bez Godzinki i Składka — kursant nie płaci składek)
- **Kafelki (2×2)**: Sprzęt · Basen · Kurs · Imprezy
- **Sekcje poniżej**:
  1. Imprezy kursowe (endpoint `/api/kurs/info` lub filtrowane `/api/events?type=kursowe`)
  2. Zajęcia basenowe (istniejąca sekcja)
  3. Wszystkie imprezy (niżej w hierarchii)
  4. Brak: „Moje rezerwacje" (kursant nie rezerwuje sprzętu na start, ale ma dostęp do modułu)

### `modules_registry.js` — kurs module

```js
import { createKursModule } from "/modules/kurs_module.js";
// ...
const KNOWN_MODULE_TYPES = new Set(["gear", "godzinki", "imprezy", "basen", "km", "kurs"]);
// ...
if (moduleType === "kurs") {
  return createKursModule({ ...base, defaultRoute: base.defaultRoute === "home" ? "info" : base.defaultRoute });
}
```

Kursant NIE dostaje auto-injektowanego modułu `my_reservations` (bo gearModule może mieć `rolesAllowed` bez kursanta) — do sprawdzenia przy konfiguracji `access`.

---

## Tryb podglądu kursanta (`kursPreviewMode`)

Użytkownik z rolą `rola_czlonek`, `rola_zarzad` lub `rola_kr` może zostać dopisany do `modul_kurs.access.testUsersAllow` w `setup/app`. Od tej chwili widzi aplikację **dokładnie tak jak kursant** — jego normalne uprawnienia roli są zastąpione widokiem kursanta.

### Mechanizm

**Backend — `filterSetupForUser()` w `index.ts`:**
1. Sprawdza, czy `uid` lub `email` użytkownika jest w `setup.modules.modul_kurs.access.testUsersAllow`
2. Jeśli tak: używa `effectiveRoleKey = "rola_kursant"` do filtrowania modułów (zamiast rzeczywistego `role_key`)
3. Zwraca `kursPreviewMode: true` w odpowiedzi `/api/setup`

Endpoint `/api/kurs/info` przepuszcza użytkownika jeśli jego uid/email jest w `testUsersAllow` (niezależnie od roli).

**Frontend — `app_shell.js`:**
- Po odebraniu setup: jeśli `setup.kursPreviewMode === true` → zapisuje `ctx.kursPreviewMode = true`

**Frontend — `render_shell.js` / `getDashboardConfig`:**
- Gdy `ctx.kursPreviewMode === true`: zwraca config identyczny jak dla `rola_kursant`:
  - `isKursant: true`
  - `canReserveGear: false`
  - `canSubmitGodzinki: false`
  - `canSubmitEvents: false`
  - `isAdmin: false`
- Kafelki i sekcje dashboardu renderują się identycznie jak dla kursanta (Sprzęt · Basen · Kurs · Imprezy, bez Godzinki i Składki)

### Ważne zastrzeżenia

- `kursPreviewMode` zmienia wyłącznie warstwę UI — nie zmienia `allowed_actions` w sesji ani rzeczywistych uprawnień endpointów API. Jeśli testujący user ma `gear.reserve`, nadal może rezerwować przez bezpośrednie API — jest to akceptowalne dla trybu podglądu.
- Wyjście z trybu: wystarczy usunąć uid/email z `testUsersAllow` w setup/app → przy następnym zalogowaniu user wraca do normalnego widoku.
- Nie ma żadnego UI przełącznika — zmiana jest wyłącznie po stronie konfiguracji Firestore.

### Konfiguracja Firestore

```json
{
  "modul_kurs": {
    "access": {
      "mode": "prod",
      "rolesAllowed": ["rola_kursant"],
      "testUsersAllow": ["uid-or-email@morzkulc.pl"]
    }
  }
}
```

### Pliki wymagające zmian (dodatkowe względem bazowego planu)

| Plik | Zmiana |
|---|---|
| `functions/src/index.ts` | `filterSetupForUser`: wykryj kursPreviewMode, użyj `effectiveRoleKey = "rola_kursant"`, zwróć `kursPreviewMode: true` |
| `functions/src/api/getKursInfoHandler.ts` | Autoryzacja: przepuść jeśli uid/email w `testUsersAllow` |
| `public/core/app_shell.js` | Po odebraniu setup: propaguj `ctx.kursPreviewMode` |
| `public/core/render_shell.js` | `getDashboardConfig`: jeśli `ctx.kursPreviewMode` — zwróć config jak dla kursanta |

---

## Kontrola dostępu

Moduły widziane przez kursanta (przez `access.rolesAllowed` w Firestore `setup/app`):
- `gear` ✓ (widzi, może rezerwować jeśli zarząd zdecyduje)
- `basen` ✓
- `imprezy` ✓ (widzi wszystkie, ale kursowe na górze w starcie)
- `km` / ranking ✓ (widzi, nie uczestniczy — `canSeeModule` przepuszcza jeśli jest w `rolesAllowed`)
- `kurs` ✓ (tylko kursant)
- `godzinki` ✗ (kursant nie loguje godzin)
- `admin_pending` ✗ (tylko `rola_zarzad`, `rola_kr` — `modules_registry.js:117`)

---

## Kolejność implementacji

1. **Zarząd przygotowuje Google Sheet** dla kursu (dane wejściowe dla nas)
2. **Backend**: `service_config.ts` → `kursSyncFromSheet.ts` → `registry.ts` → `getKursInfoHandler.ts` → `index.ts`
3. **Frontend**: `kurs_module.js` + `kurs.css` → `modules_registry.js` → `render_shell.js`
4. **Firestore** `setup/app`: dodać `modul_kurs`, zaktualizować `rolesAllowed` istniejących modułów
5. **Test** na dev (`firebase use dev`, `firebase serve`): zalogować się kontem z rolą `rola_kursant`

---

## Weryfikacja end-to-end

```bash
# 1. Zbuduj i uruchom emulatora
npm --prefix functions run build
firebase use dev
firebase serve

# 2. W emulatorze Firestore: nadaj testowemu kontu role_key="rola_kursant"
# 3. Wejdź na http://localhost:5000 — sprawdź:
#    - Start pokazuje kafelki Sprzęt / Basen / Kurs / Imprezy
#    - Nawigacja: widoczny "Kurs", niewidoczne "Godzinki"
#    - /api/kurs/info zwraca dane z arkusza
```
