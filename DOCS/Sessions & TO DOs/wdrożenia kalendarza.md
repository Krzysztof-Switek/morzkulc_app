# Plan: Własny Date Range Picker

## Context

Pola `input[type=date]` do wyboru zakresu dat (od/do) są nieintuicyjne — wymagają ręcznego wpisywania. Użytkownik chce popup-kalendarza z zaznaczaniem zakresu kliknięciami (start → koniec) i wizualnym podświetleniem okresu na zielono. Musi działać na mobile i desktop.

Zakres: tylko pary od/do (nie pojedyncze daty jak godzinki, km, basen).

## Podejście

**Własna implementacja** (pure JS/CSS, bez zewnętrznych bibliotek) — spójna z filozofią projektu (brak npm/bundlera dla frontendu). Popup jest `position:absolute` wewnątrz relatywnego wrappera — działa poprawnie wewnątrz modali.

Istniejące `<input type="date">` zostają w DOM jako `type="hidden"` — cały kod JS czytający `.value` nie wymaga zmiany.

## Nowe pliki

### `public/core/date_range_picker.js`

Eksportuje jedną funkcję:
```js
export function initDateRangePicker({ startInput, endInput, mountEl, min, label })
```

**Parametry:**
- `startInput` / `endInput` — istniejące hidden inputy (wartości YYYY-MM-DD)
- `mountEl` — div gdzie renderuje się trigger + popup
- `min` — opcjonalne min date ISO (np. dzisiejsza data)
- `label` — opcjonalny nagłówek nad triggerem (np. "Termin rezerwacji")

**Zachowanie:**
1. Renderuje przycisk-trigger z ikoną kalendarza i tekstem zakresu lub "Wybierz termin"
2. Klik → otwiera popup z siatką miesiąca (Pn–Nd, polskie nazwy)
3. Pierwszy klik w dzień → ustawia start (niebieskawa podpowiedź hover)
4. Drugi klik ≥ start → ustawia end, zamyka popup, ustawia `.value` obu inputów, dispatchuje `change` event
5. Hover po wyborze start → podgląd zakresu w locie (zielonkawe tło)
6. Przycisk "‹" / "›" — nawigacja po miesiącach
7. Przycisk "Wyczyść" — resetuje oba inputy
8. Klik poza popupem (lub Escape) — zamknięcie
9. Dni przed `min` są disabled (wyszarzone, nie klikalne)

**Polskie stałe:**
```js
const MONTHS = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec",
                "Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
const DAYS = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];
```

**Inicjalizacja z istniejącymi wartościami:** jeśli `startInput.value` i `endInput.value` mają daty przy mount, picker wyświetla je od razu w triggerze.

### `public/styles/date_range_picker.css`

Klasy:
- `.gdrpWrap` — relatywny kontener (trigger + popup w środku)
- `.gdrpTrigger` — przycisk triggerujący (styl jak ghost button, pełna szerokość)
- `.gdrpPopup` — absolutnie pozycjonowany popup; `z-index: 200`; shadow; border-radius
- `.gdrpPopup.hidden` — `display:none`
- `.gdrpHeader` — wiersz nawigacji miesiąca (prev / tytuł / next)
- `.gdrpGrid` — CSS Grid 7 kolumn dla dni tygodnia
- `.gdrpDay` — każda komórka dnia; cursor:pointer
- `.gdrpDay.today` — obramowanie
- `.gdrpDay.start`, `.gdrpDay.end` — pełne zielone tło (jak `.badge.ok`)
- `.gdrpDay.inRange` — jasne zielone tło (połowkryjące)
- `.gdrpDay.hoverRange` — podgląd zakresu przy hover
- `.gdrpDay.disabled` — wyszarzone, pointer-events:none
- `.gdrpDay.otherMonth` — szarawe (dni z poprzedniego/następnego miesiąca)
- Kolory via CSS vars: `--ok` (zielony) i `--ok-2` (jasny zielony) już zdefiniowane w base.css

## Modyfikacje istniejących plików

### `public/styles/app.css`
Dodaj import:
```css
@import url("/styles/date_range_picker.css");
```

### `public/sw.js`
Dodaj do `PRECACHE_URLS`:
```js
"/core/date_range_picker.js",
"/styles/date_range_picker.css",
```

### `public/modules/gear_module.js`

**Import** na górze pliku:
```js
import { initDateRangePicker } from "/core/date_range_picker.js";
```

**HTML: rezerwacja kajaka** (linia ~235–247) — zamień dwa `.row` z date inputami:
```html
<input id="reservationStartDate" type="hidden" />
<input id="reservationEndDate" type="hidden" />
<div id="reservationDatePicker"></div>
```

**HTML: rezerwacja bundle** (linia ~281–292) — analogicznie:
```html
<input id="bundleStartDate" type="hidden" />
<input id="bundleEndDate" type="hidden" />
<div id="bundleDatePicker"></div>
```

**JS: po ustawieniu querySelector** (ok. linia ~356) dodaj inicjalizację:
```js
initDateRangePicker({
  startInput: reservationStartDateEl,
  endInput: reservationEndDateEl,
  mountEl: viewEl.querySelector("#reservationDatePicker"),
  label: "Termin rezerwacji",
});

initDateRangePicker({
  startInput: bundleStartDateEl,
  endInput: bundleEndDateEl,
  mountEl: viewEl.querySelector("#bundleDatePicker"),
  label: "Termin rezerwacji",
});
```

**JS: `reservationClearBtn` listener** — po wyczyszczeniu dat dodaj re-inicjalizację lub zresetuj picker przez dispatch `change` na inputach (picker nasłuchuje `change`).

### `public/modules/impreza_module.js`

**Import** na górze.

**HTML** (linia ~105–115) — zamień `imprezaDateRow` na:
```html
<input id="evStartDate" type="hidden" />
<input id="evEndDate" type="hidden" />
<div id="evDatePicker"></div>
```

**JS** — po wyrenderowaniu widoku (po `viewEl.innerHTML = ...`):
```js
initDateRangePicker({
  startInput: viewEl.querySelector("#evStartDate"),
  endInput: viewEl.querySelector("#evEndDate"),
  mountEl: viewEl.querySelector("#evDatePicker"),
  min: today,          // min=dziś — impreza nie może być w przeszłości
  label: "Termin imprezy",
});
```

Walidacja `startDate > endDate` pozostaje bez zmian (czyta `.value` hidden inputów).

### `public/modules/my_reservations_module.js`

**Import** na górze.

**HTML modal edit** (linia ~82–92) — zamień dwa `.row` z date inputami:
```html
<input id="reservationEditStartDate" type="hidden" />
<input id="reservationEditEndDate" type="hidden" />
<div id="reservationEditDatePicker"></div>
```

**HTML detailed edit view** (linia ~436–446) — analogicznie:
```html
<input id="dedEditStartDate" type="hidden" />
<input id="dedEditEndDate" type="hidden" />
<div id="dedEditDatePicker"></div>
```

**JS** — po querySelector inicjalizacja obu pickerów. Przy otwieraniu modalu edycji (gdzie wartości są ustawiane przez `editStartDateEl.value = ...`) picker musi odczytać te wartości i zaktualizować trigger — picker nasłuchuje `change` event na inputach lub udostępnia metodę `refresh()`.

## Weryfikacja

1. Otwórz rezerwację kajaka → dwa hidden inputy są niewidoczne, pojawia się trigger "Wybierz termin"
2. Kliknij trigger → otwiera się popup z siatką miesiąca
3. Kliknij dzień start → podświetlony, hover na inne dni pokazuje podgląd zakresu w zieleni
4. Kliknij dzień end → zakres zaznaczony zielono, popup zamknięty, trigger pokazuje "10 kwi – 15 kwi 2026"
5. Klik "Zapisz rezerwację" → backend dostaje poprawne daty YYYY-MM-DD (wartości hidden inputów)
6. Sprawdź w `impreza_module` że dni sprzed dzisiaj są wyszarzone/niedostępne
7. Sprawdź otwieranie modalu edycji rezerwacji — trigger od razu pokazuje istniejące daty
8. Sprawdź na mobile (DevTools) — popup nie wychodzi poza viewport