# Plan: Filtr kajaków wg wagi użytkownika

## Context

Moduł sprzętu (gear_module.js) wyświetla listę kajaków z zestawem filtrów checkbox. Kursanci mają zapisaną wagę w Firestore (`kurs_uczestnicy/{email}.weight`), inni użytkownicy nie. Chcemy dodać filtr „Moja waga", który pokazuje tylko kajaki bezpieczne dla danej masy użytkownika (z marginesem 5 kg od górnego zakresu wag kajaka). Jeśli użytkownik nie ma zapisanej wagi i kliknie filtr, pojawia się popup do wpisania masy, która zostaje zapisana w Firestore.

## Dane i logika

**weightRange** w kayaku to string np. `"50-90 kg"` lub `"50-90"` — brak osobnych pól numerycznych.

**Parsowanie**: wyciągamy dwie liczby z stringa, bierzemy wyższą jako `maxWeight`.
- `"50-90 kg"` → max = 90
- Brak danych lub tylko jedna liczba → brak zakresu → kajak **wyklucza się** przy aktywnym filtrze

**Reguła filtrowania**: kajak przechodzi, gdy `maxWeight - userWeight >= 5`.
- Użytkownik 75 kg, kajak max 90 → 90−75=15 ✓ wyświetl
- Użytkownik 75 kg, kajak max 75 → 75−75=0 < 5 ✗ ukryj
- Użytkownik 75 kg, kajak max 79 → 79−75=4 < 5 ✗ ukryj

**Waga użytkownika**:
- Kursanci: z `kurs_uczestnicy/{email}.weight` (canonical), fallback do `users_active/{uid}.weight`
- Inni: z `users_active/{uid}.weight`
- Popup zapisuje do `users_active/{uid}.weight` dla wszystkich

## Pliki do zmodyfikowania

| Plik | Zmiana |
|---|---|
| `functions/src/api/userWeightHandler.ts` | **NOWY** – handler GET+POST dla wagi użytkownika |
| `functions/src/index.ts` | Import + export nowej funkcji `userWeight` |
| `firebase.json` | Dodanie rewrite `/api/user/weight` → `userWeight` |
| `public/modules/gear_module.js` | Checkbox filtra, popup, logika filtrowania |

---

## Krok 1 – `functions/src/api/userWeightHandler.ts` (nowy)

```typescript
// GET /api/user/weight
//   → dla kursanta: kurs_uczestnicy/{email}.weight ?? users_active/{uid}.weight
//   → dla innych: users_active/{uid}.weight
//   Zwraca: { ok: true, weight: number|null }
//
// POST /api/user/weight
//   Body: { weight: number }  (30–250, integer)
//   Zapisuje do users_active/{uid}.weight
//   Zwraca: { ok: true }
```

Walidacja POST: `Number.isFinite(w) && w >= 30 && w <= 250`.

## Krok 2 – `functions/src/index.ts`

```typescript
import { handleUserWeight } from "./api/userWeightHandler";

export const userWeight = onRequest({ invoker: "private" }, async (req, res) => {
  return handleUserWeight(req, res, {
    db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken,
  });
});
```

## Krok 3 – `firebase.json`

Dodać do `hosting.rewrites` (przed catch-all `**`):
```json
{
  "source": "/api/user/weight",
  "function": { "functionId": "userWeight", "region": "us-central1" }
}
```

## Krok 4 – `public/modules/gear_module.js`

### 4a. Stała URL
```javascript
const USER_WEIGHT_URL = "/api/user/weight";
```

### 4b. Stan
```javascript
let userWeight = null; // number kg lub null — cache na czas sesji
```

### 4c. HTML filtrów – dodać pill (w bloku isKayaksView, po "Prywatny")
```html
<label class="gearCheckPill" for="filterMyWeightOnly">
  <input id="filterMyWeightOnly" type="checkbox" />
  <span>Moja waga</span>
</label>
```

### 4d. HTML popup modal – dodać na końcu listy modali
```html
<div id="gearWeightModal" class="gearModal hidden" aria-hidden="true">
  <div class="gearModalBackdrop" data-gear-weight-close="1"></div>
  <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Twoja waga">
    <div class="gearModalTop">
      <div class="gearModalTitle">Podaj swoją wagę</div>
      <button class="gearModalClose" type="button" data-gear-weight-close="1">✕</button>
    </div>
    <div class="gearModalBody">
      <p class="hint">Potrzebujemy Twojej wagi, żeby pokazać kajaki w odpowiednim zakresie.</p>
      <div id="gearWeightErr" class="err hidden"></div>
      <div class="row" style="margin-top:10px;">
        <label for="gearWeightInput">Waga (kg)</label>
        <input id="gearWeightInput" type="number" min="30" max="250" placeholder="np. 75" />
      </div>
    </div>
    <div class="gearModalActions">
      <button id="gearWeightSaveBtn" type="button" class="primary">Zapisz</button>
      <button type="button" class="ghost" data-gear-weight-close="1">Anuluj</button>
    </div>
  </div>
</div>
```

### 4e. Funkcja parseWeightRangeMax (na poziomie modułu)
```javascript
function parseWeightRangeMax(weightRange) {
  const nums = String(weightRange || "").match(/\d+/g);
  if (!nums || nums.length < 2) return null;
  return parseInt(nums[nums.length - 1], 10);
}
```

### 4f. applyFilter – dodać warunek (w sekcji isKayaksView)
```javascript
const myWeightOnly = filterMyWeightOnlyEl?.checked === true;
if (myWeightOnly) {
  if (userWeight === null) return false;
  const maxW = parseWeightRangeMax(item?.weightRange);
  if (maxW === null) return false;   // brak zakresu → wyklucz
  if (maxW - userWeight < 5) return false; // za mały margines → wyklucz
}
```

### 4g. Logika checkbox „Moja waga"
```javascript
filterMyWeightOnlyEl?.addEventListener("change", async () => {
  if (!filterMyWeightOnlyEl.checked) { applyFilter(); return; }
  if (userWeight !== null) { applyFilter(); return; }

  filterMyWeightOnlyEl.disabled = true;
  try {
    const resp = await apiGetJson({ url: USER_WEIGHT_URL, idToken: ctx.idToken });
    const w = resp?.weight;
    if (typeof w === "number" && Number.isFinite(w)) {
      userWeight = w;
      applyFilter();
    } else {
      filterMyWeightOnlyEl.checked = false;
      openWeightModal();
    }
  } catch {
    filterMyWeightOnlyEl.checked = false;
    setErr("Nie udało się pobrać danych o wadze.");
  } finally {
    filterMyWeightOnlyEl.disabled = false;
  }
});
```

### 4h. Popup weight modal – logika otwierania/zamykania/zapisu
```javascript
const openWeightModal = () => {
  weightModalEl.classList.remove("hidden");
  weightModalEl.setAttribute("aria-hidden", "false");
  weightInputEl.value = "";
  setWeightErr("");
};

const closeWeightModal = () => {
  weightModalEl.classList.add("hidden");
  weightModalEl.setAttribute("aria-hidden", "true");
};

weightSaveBtnEl?.addEventListener("click", async () => {
  const val = parseInt(weightInputEl.value, 10);
  if (!Number.isFinite(val) || val < 30 || val > 250) {
    setWeightErr("Podaj wagę od 30 do 250 kg.");
    return;
  }
  weightSaveBtnEl.disabled = true;
  try {
    await apiPostJson({ url: USER_WEIGHT_URL, idToken: ctx.idToken, body: { weight: val } });
    userWeight = val;
    closeWeightModal();
    filterMyWeightOnlyEl.checked = true;
    applyFilter();
  } catch {
    setWeightErr("Nie udało się zapisać wagi. Spróbuj ponownie.");
  } finally {
    weightSaveBtnEl.disabled = false;
  }
});

// Zamknij na klik tła lub przycisku Anuluj
viewEl.addEventListener("click", (e) => {
  if (e.target?.closest("[data-gear-weight-close]")) closeWeightModal();
});
```

---

## Weryfikacja

1. `npm --prefix functions run build` — brak błędów TS
2. Emulator: `npm --prefix functions run serve`
3. Otworzyć moduł sprzętu → kajaki
4. Kliknąć „Moja waga" bez zapisanej wagi → pojawia się popup → wpisać wagę → Zapisz → filtr się włącza
5. Sprawdzić, że kajaki z `maxWeight − userWeight < 5` znikają z listy
6. Odhaczyć i ponownie zaznaczyć „Moja waga" → popup nie pojawia się (waga cache'owana w sesji)
7. Odświeżyć stronę → GET z backendu zwraca zapisaną wagę → filtr działa bez popupu
8. Kursant z wagą w `kurs_uczestnicy` → GET zwraca wagę od razu, popup nie pojawia się