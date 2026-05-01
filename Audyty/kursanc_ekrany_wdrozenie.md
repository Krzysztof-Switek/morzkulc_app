# Plan: Ekran startowy i aplikacja dla roli `rola_kursant`

## Context

Kursanci to nowa grupa użytkowników SKK Morzkulc. Płacą za kurs (nie składki), uczestniczą w zajęciach kursowych, a nie wszystkich imprezach. Cel: pokazać im jak działa aplikacja (trial) i dostarczyć informacje specyficzne dla kursu.

Istniejący stan: rola `rola_kursant` jest znana systemowi, kursant widzi prosty komunikat powitalny na dashboardzie, może zgłaszać godzinki. Brakuje: dedykowanego modułu Kurs, danych z Google Sheets, dostosowanego dashboardu, oraz cyfrowej wersji skryptu szkoleniowego.

Skrypt szkoleniowy („Podstawy Kajakarstwa Górskiego") istnieje w formacie LaTeX (`skrypt_kurs/*.tex`, 8 rozdziałów + obrazki). Należy go przekonwertować do HTML i udostępnić kursantom jako osobny moduł w aplikacji z opcją pobrania PDF.

---

## Faza 0: Projekt Google Sheet (zrób ręcznie przed implementacją)

Utwórz nowy Google Spreadsheet i udostępnij go service account aplikacji (ten sam co dla pozostałych sheets). Arkusz ma dwie zakładki:

### Zakładka `Kurs` — metadane kursu

Format: tabela, jeden wiersz = jeden kurs (może być wiele jednoczesnych grup kursowych).

| Kolumna | Typ | Opis |
|---|---|---|
| `ID` | string | Unikalny identyfikator kursu (np. `kurs-2025-a`), Document ID w Firestore |
| `Nazwa kursu` | string | Wyświetlana nazwa (np. „Kurs kajakarski 2025 — Grupa A") |
| `Data rozpoczęcia` | string `YYYY-MM-DD` lub `DD.MM.YYYY` | Start kursu |
| `Data zakończenia` | string `YYYY-MM-DD` lub `DD.MM.YYYY` | Koniec kursu |
| `Opis` | string | Krótki opis widoczny w module kursanta |
| `Instruktor` | string | Imię i nazwisko instruktora |
| `Kontakt instruktora` | string | Email lub telefon |
| `Miejsce zajęć` | string | Nazwa/adres miejsca regularnych zajęć |
| `Link` | string | URL strony kursu lub formularza kontaktowego |
| `Aktywny?` | boolean | `TAK`/`NIE` — czy kurs jest aktualnie aktywny (filtruje odpowiedź API) |

### Zakładka `Imprezy kursowe` — identyczny format jak zakładka `imprezy`

Format: dokładnie taki jak istniejący arkusz imprez (reużywa `eventsSyncFromSheet.ts`).

| Kolumna | Typ | Opis |
|---|---|---|
| `ID` | string | Document ID w Firestore |
| `data rozpoczęcia` | string `YYYY-MM-DD` lub `DD.MM.YYYY` | |
| `data zakończenia` | string `YYYY-MM-DD` lub `DD.MM.YYYY` | |
| `nazwa imprezy` | string | Wyświetlana nazwa |
| `miejsce` | string | Opcjonalne |
| `opis` | string | Opcjonalne |
| `kontakt` | string | Opcjonalne |
| `link do strony / zgłoszeń` | string | Opcjonalne |
| `Zatwierdzona` | boolean | `TAK`/`NIE` — czy impreza jest widoczna |

Po utworzeniu: zapisz Sheet ID do env vars (patrz niżej).

---

## Faza 1: Backend

### 1.1 Env vars — `functions/src/service/service_config.ts`

Dodać po istniejących deklaracjach `SVC_EVENTS_*`:

```typescript
const kursSpreadsheetId = process.env.SVC_KURS_SHEET_ID || "";
const kursTabName = process.env.SVC_KURS_SHEET_TAB || "Kurs";
const kursImprezaTabName = process.env.SVC_KURS_IMPREZY_TAB || "Imprezy kursowe";
```

Dodać do zwracanego obiektu:
```typescript
kurs: { spreadsheetId: kursSpreadsheetId, tabName: kursTabName, imprezaTabName: kursImprezaTabName }
```

Dodać do plików env:
- `.env.sprzet-skk-morzkulc` — `SVC_KURS_SHEET_ID=<dev-sheet-id>`
- `.env.morzkulc-e9df7` — `SVC_KURS_SHEET_ID=<prod-sheet-id>`

### 1.2 Nowy task sync — `functions/src/service/tasks/kursSyncFromSheet.ts`

Wzorzec: `eventsSyncFromSheet.ts`.

**Część A — sync zakładki `Kurs` → kolekcja Firestore `kurs_info`:**

```typescript
// Mapowanie kolumn:
id                ← kolumna "ID"
name              ← kolumna "Nazwa kursu"
startDate         ← kolumna "Data rozpoczęcia"   (normDate)
endDate           ← kolumna "Data zakończenia"   (normDate)
description       ← kolumna "Opis"
instructor        ← kolumna "Instruktor"
instructorContact ← kolumna "Kontakt instruktora"
location          ← kolumna "Miejsce zajęć"
link              ← kolumna "Link"
isActive          ← kolumna "Aktywny?"            (parseBool)
source            ← "sheet"
updatedAt         ← Timestamp.now()
```

Walidacja: skip wiersza jeśli `id` jest puste.

**Część B — sync zakładki `Imprezy kursowe` → kolekcja Firestore `kurs_events`:**

Identyczne mapowanie jak `eventsSyncFromSheet.ts` (norm, normDate, isApproved). Kolekcja docelowa: `kurs_events` (nie `events`).

Task implementuje interface `ServiceTask`:
```typescript
export const kursSyncFromSheetTask: ServiceTask = {
  id: "kursSyncFromSheet",
  description: "Sync kurs info and events from Google Sheets to Firestore",
  validate: ...,
  run: ...,
}
```

### 1.3 Rejestracja — `functions/src/service/registry.ts`

Dodać `kursSyncFromSheetTask` do listy tasków.

### 1.4 Endpoint API — `functions/src/api/getKursInfoHandler.ts`

`GET /api/kurs/info` — dostępny dla `rola_kursant`, adminów i użytkowników w kursPreviewMode.

Zwraca:
```json
{
  "ok": true,
  "info": [{ "id", "name", "startDate", "endDate", "description", "instructor", "instructorContact", "location", "link" }],
  "events": [{ "id", "name", "startDate", "endDate", "location", "description", "contact", "link" }]
}
```

Logika:
- Czyta `kurs_info` gdzie `isActive == true` → `info[]`
- Czyta `kurs_events` gdzie `approved == true`, sortuje po `startDate` rosnąco → `events[]`
- Jeśli `config.kurs.spreadsheetId` jest pusty → zwraca `{ ok: true, info: [], events: [], unconfigured: true }`
- Autoryzacja: przepuszcza `rola_kursant`, `admin.pending` oraz użytkowników w `modul_kurs.access.testUsersAllow`

### 1.5 Rejestracja endpointu — `functions/src/index.ts`

- Import `getKursInfoHandler`
- Dodać route: `app.get("/api/kurs/info", ...middleware, getKursInfoHandler(deps))`
- W `filterSetupForUser`: obsługa `kursPreviewMode` (patrz Faza 2.5)
- `computeAllowedActions`: kursant już ma `godzinki.submit` — bez zmian (kursant NIE rezerwuje sprzętu)

---

## Faza 2: Frontend

### 2.1 Nowy moduł — `public/modules/kurs_module.js`

Wzorzec: `basen_module.js` lub `impreza_module.js`.

```javascript
export function createKursModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id, type, label, defaultRoute, order, enabled, access,
    async render({ viewEl, routeId, ctx }) {
      if (routeId === "info") renderKursInfo(viewEl, ctx);
    }
  };
}
```

Widok `info`:
- Wywołuje `GET /api/kurs/info`
- Jeśli `unconfigured: true` → komunikat "Dane kursu nie zostały jeszcze skonfigurowane"
- Wyświetla karty z informacjami o kursie (nazwa, instruktor, kontakt, miejsce, daty, link)
- Poniżej: lista nadchodzących imprez kursowych (karty z datą, nazwą, miejscem, linkiem)
- Styl spójny z `basen_module.js`: sekcje z nagłówkiem dashCard

### 2.2 Style — `public/styles/kurs.css`

Minimal — reużywa klas z `app.css`. Dodać tylko klasy specyficzne dla modułu kurs (np. `.kursInfoCard`, `.kursEventRow`). Wzorzec: `basen.css`.

### 2.3 Rejestracja modułu — `public/core/modules_registry.js`

```javascript
import { createKursModule } from "/modules/kurs_module.js";

// W KNOWN_MODULE_TYPES:
const KNOWN_MODULE_TYPES = new Set(["gear", "godzinki", "imprezy", "basen", "km", "admin_pending", "kurs"]);

// W buildModulesFromSetup():
if (moduleType === "kurs") {
  return createKursModule({
    ...base,
    defaultRoute: base.defaultRoute === "home" ? "info" : base.defaultRoute
  });
}
```

### 2.4 Dashboard — `public/core/render_shell.js`

W `renderHomeDashboard()` — wariant dla kursanta:

```javascript
// Przed renderem sprawdź:
const kursModuleRoute = getModuleRouteByType(ctx, "kurs");
const hasKursModule = kursModuleRoute.moduleId !== "home";
```

Kafelki w siatce:
- **Sprzęt** — zawsze widoczny (kursant przegląda, nie rezerwuje — brak `canReserveGear`)
- **Godzinki** — ukryty dla kursanta: `${!dash.isKursant ? `<button...>Godzinki</button>` : ""}`
- **Imprezy** — zawsze widoczny
- **Basen** — zawsze widoczny
- **Ranking** — widoczny jeśli `hasKmModule` (bez zmian)
- **Składki** — ukryty dla kursanta: `${!dash.isKursant ? `<button...>Składki</button>` : ""}`
- **Kurs** — widoczny tylko dla kursanta: `${dash.isKursant && hasKursModule ? `<button...>Kurs</button>` : ""}`

Sekcja powitalna (rozszerzona):
```html
${dash.isKursant ? `
<section class="dashCard startSection">
  <div class="dashCardHead"><h3>Witaj w SKK Morzkulc!</h3></div>
  <p class="muted">Jesteś kursantem — masz dostęp do modułu Kurs, imprez i basenu.
  Po ukończeniu kursu możesz zostać pełnym członkiem klubu.</p>
</section>
` : ""}
```

Sekcja imprezy kursowe (zamiast "Moje rezerwacje" dla kursanta):
```html
${dash.isKursant ? `
<section class="dashCard startSection">
  <div class="dashCardHead">
    <h3>Imprezy kursowe</h3>
    <button type="button" class="ghost" data-home-action="kurs">Zobacz wszystkie</button>
  </div>
  <div class="startList" id="homeKursEventsList">${spinnerHtml("Ładowanie...")}</div>
</section>
` : ""}
```

Async load `homeKursEventsList` przez `GET /api/kurs/info` → wyświetl imprezy kursowe (max 3).

### 2.5 Import CSS — `public/styles/app.css`

Dodać: `@import "kurs.css";`

---

## Faza 2.5: Tryb podglądu kursanta (`kursPreviewMode`)

Użytkownik z rolą `rola_czlonek`, `rola_zarzad` lub `rola_kr` wpisany do `modul_kurs.access.testUsersAllow` widzi aplikację **identycznie jak kursant** — jego normalne uprawnienia roli są zastąpione widokiem kursanta.

### Backend — `functions/src/index.ts` (`filterSetupForUser`)

```typescript
// Wykryj kursPreviewMode przed standardowym filtrowaniem
const kursModuleCfg = setup?.modules?.modul_kurs;
const kursTestUsers: string[] = kursModuleCfg?.access?.testUsersAllow ?? [];
const isKursPreview = kursTestUsers.includes(uid) || kursTestUsers.includes(email);

const effectiveRoleKey = isKursPreview ? "rola_kursant" : roleKey;
// użyj effectiveRoleKey do filtrowania modułów
```

Zwróć w odpowiedzi `/api/setup`: `kursPreviewMode: true` gdy `isKursPreview`.

### Frontend — `app_shell.js`

```javascript
ctx.kursPreviewMode = setup?.kursPreviewMode === true;
```

### Frontend — `render_shell.js` / `getDashboardConfig`

```javascript
function getDashboardConfig(ctx) {
  const isKursant = roleKey === "rola_kursant" || ctx.kursPreviewMode === true;
  return {
    isKursant,
    canReserveGear:    !isKursant && actions.includes("gear.reserve"),
    canSubmitGodzinki: !isKursant && actions.includes("godzinki.submit"),
    canSubmitEvents:   !isKursant && actions.includes("events.submit"),
    isAdmin:           !isKursant && actions.includes("admin.pending"),
    isSympatyk:        !isKursant && roleKey === "rola_sympatyk",
    isKandydat:        !isKursant && roleKey === "rola_kandydat",
  };
}
```

### Konfiguracja Firestore dla trybu podglądu

```json
{
  "modul_kurs": {
    "access": {
      "mode": "prod",
      "rolesAllowed": ["rola_kursant"],
      "testUsersAllow": ["uid-lub-email@morzkulc.pl"]
    }
  }
}
```

Ważne: `kursPreviewMode` zmienia tylko UI — nie zmienia rzeczywistych uprawnień endpointów API. Wyjście z trybu: usunąć uid/email z `testUsersAllow`.

---

## Faza 3: Konfiguracja Firestore (`setup/app`)

Dodać do `modules`:

```json
{
  "modul_kurs": {
    "label": "Kurs",
    "type": "kurs",
    "defaultRoute": "info",
    "order": 5,
    "enabled": true,
    "access": {
      "mode": "prod",
      "rolesAllowed": ["rola_kursant"]
    }
  }
}
```

Dla istniejących modułów — uzupełnić `rolesAllowed` o `rola_kursant`:
- `imprezy` → dodać `rola_kursant`
- `basen` → dodać `rola_kursant`
- `gear` → dodać `rola_kursant` (widzi, nie rezerwuje — logika w `allowed_actions`)
- `km` (ranking) → dodać `rola_kursant`
- `godzinki` → **NIE dodawać** `rola_kursant`

---

## Faza 4: Moduł Skrypt — cyfrowa wersja skryptu szkoleniowego

Skrypt „Podstawy Kajakarstwa Górskiego" (`skrypt_kurs/*.tex`) jest konwertowany ręcznie do HTML i udostępniany kursantom jako osobny moduł w aplikacji. PDF jest generowany z LaTeX i serwowany statycznie.

### 4.1 Struktura plików wynikowych

```
public/
  skrypt_kurs/
    skrypt.pdf                    ← skompilowany PDF z Overleaf (raz, ręcznie)
    images/                       ← skopiowane z skrypt_kurs/images/
      schemat_budowy_kajaka.jpg
      pozycja_w_kajaku.png
      ...wszystkie obrazki...
    chapters/
      ch01.html                   ← skonwertowany ch01_wstep.tex
      ch02.html                   ← skonwertowany ch02_sprzet.tex
      ch03.html                   ← skonwertowany ch03_locja.tex
      ch04.html                   ← skonwertowany ch04_pkp.tex
      ch05.html                   ← skonwertowany ch05_manewry.tex
      ch06.html                   ← skonwertowany ch06_bezpieczenstwo.tex
      ch07.html                   ← skonwertowany ch07_poszkoleniowkowe.tex
      ch08.html                   ← skonwertowany ch08_regulamin.tex
```

### 4.2 Konwersja LaTeX → HTML — mapa elementów

Każdy plik `.tex` konwertujemy ręcznie do pliku `.html` (fragment — bez `<html>`/`<body>`, same treści). Ścieżki obrazków: `/skrypt_kurs/images/xxx.jpg`.

| Element LaTeX | HTML |
|---|---|
| `\section{X}` | `<h2>X</h2>` |
| `\subsection{X}` / `\subsection*{X}` | `<h3>X</h3>` |
| `\subsubsection{X}` / `\subsubsection*{X}` | `<h4>X</h4>` |
| `\paragraph{X}` | `<h5>X</h5>` |
| `\textbf{X}` | `<strong>X</strong>` |
| `\emph{X}` | `<em>X</em>` |
| `\texttt{X}` | `<code>X</code>` |
| `\href{url}{tekst}` | `<a href="url" target="_blank">tekst</a>` |
| `\url{url}` | `<a href="url" target="_blank">url</a>` |
| `\begin{itemize}...\item X` | `<ul><li>X</li>...</ul>` |
| `\begin{enumerate}...\item X` | `<ol><li>X</li>...</ol>` |
| `\begin{description}...\item[term] text` | `<dl><dt>term</dt><dd>text</dd>...</dl>` |
| `\begin{tipbox}...\end{tipbox}` | `<div class="skryptTip"><span class="skryptTipIcon">💡</span><div>...</div></div>` |
| `\begin{warnbox}...\end{warnbox}` | `<div class="skryptWarn"><span class="skryptWarnIcon">⚠</span><div>...</div></div>` |
| `\begin{figure}...\includegraphics[width=Xpx]{images/Y}...\caption{C}` | `<figure><img src="/skrypt_kurs/images/Y" alt="C"><figcaption>C</figcaption></figure>` |
| Dwie kolumny `subfigure` 0.48 | `<div class="skryptFigGrid">...<figure>...</figure>...</div>` |
| Side-by-side `tcolorbox` (płytka / głęboka cyrkulacja) | `<div class="skryptCompare"><div class="skryptTip">...</div><div class="skryptWarn">...</div></div>` |
| `\begin{longtable}` / `\begin{tabular}` | `<div class="tableWrapper"><table class="skryptTable">...</table></div>` |
| `\toprule + nagłówki` | `<thead><tr><th>...</th></tr></thead>` |
| `\midrule` (po nagłówku) | koniec `<thead>`, start `<tbody>` |
| `\bottomrule` | koniec `<tbody>` |
| Wiersz tabeli `A & B & C \\` | `<tr><td>A</td><td>B</td><td>C</td></tr>` |
| `\newpage` | pominięte |
| `\vspace`, `\hfill`, `\noindent` | pominięte |

### 4.3 Rozdział po rozdziale — co uwzględnić

| Rozdział | Plik | Uwagi konwersji |
|---|---|---|
| 1. Wstęp | `ch01.html` | Prosty tekst — bez specjalnych elementów |
| 2. Sprzęt | `ch02.html` | itemize, description, tipbox, warnbox, figures, duża tabela ubioru |
| 3. Locja | `ch03.html` | longtable (skala WW), subsections, figures, side-by-side tcolorbox (płytka/głęboka cyrkulacja), warnbox |
| 4. PKP | `ch04.html` | description list, 1 figure |
| 5. Manewry | `ch05.html` | tipbox, enumerate, longtable (wiosłowanie), figures (cofka) |
| 6. Bezpieczeństwo | `ch06.html` | siatka subfigures 2×col (znaki wodne), enumerate, figures, warnbox, longtable (apteczka) |
| 7. Poszkoleniówkowe | `ch07.html` | description (kontakty), itemize, tipbox, linki zewnętrzne, tabela KRS |
| 8. Regulamin | `ch08.html` | §1–§10, itemize zagnieżdżone, tabela |

### 4.4 Nowy moduł — `public/modules/skrypt_module.js`

Wzorzec: `basen_module.js`. Jeden widok `routeId === "czytaj"`.

```javascript
export function createSkryptModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id, type, label, defaultRoute, order, enabled, access,
    async render({ viewEl, routeId, ctx }) {
      renderSkrypt(viewEl, ctx);
    }
  };
}
```

Widok `skrypt`:
- Nagłówek z tytułem „Skrypt szkoleniowy" + przycisk pobierania PDF (`<a href="/skrypt_kurs/skrypt.pdf" download>`)
- Spis treści (lista rozdziałów jako przyciski/linki — kliknięcie ładuje rozdział)
- Obszar treści `<div id="skryptContent">` — ładuje plik `chapters/chXX.html` przez `fetch`
- Domyślnie załadowany rozdział 1

```javascript
async function loadChapter(n, contentEl) {
  const res = await fetch(`/skrypt_kurs/chapters/ch0${n}.html`);
  contentEl.innerHTML = await res.text();
  contentEl.scrollIntoView({ behavior: "smooth" });
}
```

Nawigacja: przyciski „Poprzedni rozdział" / „Następny rozdział".

### 4.5 Style — `public/styles/skrypt.css`

```css
.skryptTip  { background: #D6EAF8; border-left: 4px solid #1A5276; padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
.skryptWarn { background: #FDEDEC; border-left: 4px solid #C0392B; padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
.skryptWarn strong, .skryptWarn dt { color: #C0392B; }
.skryptTipIcon  { margin-right: 6px; }
.skryptWarnIcon { margin-right: 6px; }
.skryptCompare { display: flex; gap: 12px; margin: 12px 0; }
.skryptCompare > * { flex: 1; }
.skryptFigGrid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 12px 0; }
.skryptFigGrid figure { flex: 1 1 260px; text-align: center; }
.skryptTable { width: 100%; border-collapse: collapse; font-size: 0.9em; }
.skryptTable th, .skryptTable td { border: 1px solid var(--border); padding: 6px 10px; vertical-align: top; }
.skryptTable thead { background: var(--surface2); font-weight: 600; }
.tableWrapper { overflow-x: auto; margin: 12px 0; }
figure { text-align: center; margin: 16px 0; }
figure img { max-width: 100%; height: auto; border-radius: 4px; }
figcaption { font-size: 0.85em; color: var(--muted); margin-top: 6px; }
dl dt { font-weight: 600; margin-top: 10px; }
dl dd { margin-left: 1.2em; }
```

### 4.6 Rejestracja — `modules_registry.js` i Firestore

`modules_registry.js`:
```javascript
import { createSkryptModule } from "/modules/skrypt_module.js";
// KNOWN_MODULE_TYPES: dodaj "skrypt"
// buildModulesFromSetup: if (moduleType === "skrypt") return createSkryptModule({...base, defaultRoute: "czytaj"})
```

Firestore `setup/app`:
```json
{
  "modul_skrypt": {
    "label": "Skrypt",
    "type": "skrypt",
    "defaultRoute": "czytaj",
    "order": 6,
    "enabled": true,
    "access": { "mode": "prod", "rolesAllowed": ["rola_kursant"] }
  }
}
```

### 4.7 Dashboard kursanta — kafelek Skrypt

W `render_shell.js` — w siatce kafelków dla kursanta dodać:

```javascript
const skryptModuleRoute = getModuleRouteByType(ctx, "skrypt");
const hasSkryptModule = skryptModuleRoute.moduleId !== "home";
// ...
${dash.isKursant && hasSkryptModule ? `
<button type="button" class="startTile2" data-home-action="skrypt">
  <svg ...><!-- ikona książki --></svg>
  <span class="startTile2Title">Skrypt</span>
</button>` : ""}
```

---

## Kolejność implementacji

1. Zarząd tworzy Google Sheet (Faza 0) → zapisz ID
2. **Konwersja skryptu** (Faza 4): `public/skrypt_kurs/images/` + `chapters/*.html` + `skrypt.pdf`
3. `service_config.ts` — env vars
4. `.env.*` — wartości Sheet ID
5. `kursSyncFromSheet.ts` — task sync
6. `registry.ts` — rejestracja tasku
7. `getKursInfoHandler.ts` — handler API
8. `index.ts` — route + kursPreviewMode w `filterSetupForUser`
9. `skrypt_module.js` + `skrypt.css` — frontend moduł skryptu
10. `kurs_module.js` + `kurs.css` — frontend moduł kurs
11. `modules_registry.js` — rejestracja obu modułów
12. `render_shell.js` — dashboard kursanta + kafelki Kurs i Skrypt + kursPreviewMode
13. `app_shell.js` — propagacja `ctx.kursPreviewMode`
14. `app.css` — import `kurs.css` i `skrypt.css`
15. Firestore `setup/app` — konfiguracja modułów

---

## Weryfikacja end-to-end

```bash
# 1. Build i emulator
npm --prefix functions run build
firebase use dev
firebase serve

# 2. W emulatorze Firestore:
#    - users_active/{uid}.role_key = "rola_kursant"
#    - setup/app.modules dodaj modul_kurs jak wyżej

# 3. Sprawdź kursant:
#    - Dashboard: kafelki Sprzęt / Basen / Kurs / Imprezy (bez Godzinki i Składki)
#    - Sekcja "Imprezy kursowe" ładuje się na dashboardzie
#    - Nawigacja: widoczny "Kurs", niewidoczne "Godzinki"
#    - Moduł Kurs: wyświetla dane kursu i imprezy kursowe

# 4. Sprawdź kursPreviewMode:
#    - Dodaj uid członka zarządu do setup/app.modules.modul_kurs.access.testUsersAllow
#    - Zaloguj się tym kontem → widok identyczny jak kursant
#    - Usuń uid → widok wraca do normalnego
```

---

## Pliki do modyfikacji (podsumowanie)

| Plik | Zmiana |
|---|---|
| `functions/src/service/service_config.ts` | Env vars: `SVC_KURS_SHEET_ID`, `SVC_KURS_SHEET_TAB`, `SVC_KURS_IMPREZY_TAB` |
| `functions/.env.sprzet-skk-morzkulc` | `SVC_KURS_SHEET_ID=<dev>` |
| `functions/.env.morzkulc-e9df7` | `SVC_KURS_SHEET_ID=<prod>` |
| `functions/src/service/registry.ts` | Rejestracja `kursSyncFromSheetTask` |
| `functions/src/index.ts` | Route `GET /api/kurs/info` + kursPreviewMode w `filterSetupForUser` |
| `public/core/app_shell.js` | Propagacja `ctx.kursPreviewMode` z setup |
| `public/core/modules_registry.js` | Import i rejestracja `createKursModule` i `createSkryptModule` |
| `public/core/render_shell.js` | Dashboard kursanta + kafelki Kurs i Skrypt + kursPreviewMode w `getDashboardConfig` |
| `public/styles/app.css` | `@import "kurs.css"` + `@import "skrypt.css"` |

## Pliki do stworzenia (nowe)

| Plik | Opis |
|---|---|
| `functions/src/service/tasks/kursSyncFromSheet.ts` | Sync `kurs_info` + `kurs_events` z Sheets |
| `functions/src/api/getKursInfoHandler.ts` | `GET /api/kurs/info` |
| `public/modules/kurs_module.js` | Moduł Kurs (dane z Google Sheets) |
| `public/modules/skrypt_module.js` | Moduł Skrypt (skrypt szkoleniowy w HTML) |
| `public/styles/kurs.css` | Style modułu Kurs |
| `public/styles/skrypt.css` | Style modułu Skrypt (tipBox, warnBox, tabele, grid) |
| `public/skrypt_kurs/skrypt.pdf` | Skompilowany PDF skryptu (z Overleaf, ręcznie) |
| `public/skrypt_kurs/images/*.{jpg,png}` | Skopiowane obrazki z `skrypt_kurs/images/` |
| `public/skrypt_kurs/chapters/ch01.html` | Rozdział 1: Wstęp |
| `public/skrypt_kurs/chapters/ch02.html` | Rozdział 2: Sprzęt |
| `public/skrypt_kurs/chapters/ch03.html` | Rozdział 3: Locja |
| `public/skrypt_kurs/chapters/ch04.html` | Rozdział 4: PKP |
| `public/skrypt_kurs/chapters/ch05.html` | Rozdział 5: Manewry |
| `public/skrypt_kurs/chapters/ch06.html` | Rozdział 6: Bezpieczeństwo |
| `public/skrypt_kurs/chapters/ch07.html` | Rozdział 7: Poszkoleniówkowe |
| `public/skrypt_kurs/chapters/ch08.html` | Rozdział 8: Regulamin |