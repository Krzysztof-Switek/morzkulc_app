/**
 * km_module.js
 *
 * Moduł Kilometrówka / Ranking.
 * Widoki: form (dodaj wpis), rankings (rankingi), my-stats (moje statystyki), my-logs (moje wpisy).
 *
 * Zasady:
 * - Punkty obliczane przez backend ON WRITE — frontend tylko wyświetla gotowe dane
 * - Formularz dynamiczny: skala trudności tylko dla gór (WW) i nizin (U)
 * - Autocomplete nazw akwenów z debounce 300ms, min 2 znaki
 * - Wywrotolotek: tylko kabina, rolka, dziubek
 */

import { apiGetJson, apiPostJson } from "/core/api_client.js";

const KM_ADD_LOG_URL = "/api/km/log/add";
const KM_MY_LOGS_URL = "/api/km/logs";
const KM_MY_STATS_URL = "/api/km/stats";
const KM_RANKINGS_URL = "/api/km/rankings";
const KM_PLACES_URL = "/api/km/places";
const KM_EVENT_STATS_URL = "/api/km/event-stats";
const KM_MAP_DATA_URL = "/api/km/map-data";
const EVENTS_URL = "/api/events";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const INFO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

function openMap() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) {
    window.location.href = "/map.html";
  } else {
    window.open("/map.html", "_blank", "noopener");
  }
}

const TABS = [
  { id: "form",            label: "Dodaj wpis" },
  { id: "rankings",        label: "Wywrotolotek" },
  { id: "events",          label: "Imprezy" },
  { id: "map",             label: "Gdzie pływamy" },
  { id: "my-stats",        label: "Moje statystyki" },
  { id: "my-logs",         label: "Moje wpisy" },
  { id: "kursant-ranking", label: "Wywrotolotek - wyniki" },
];

const WATER_TYPES = [
  { value: "mountains", label: "Góry" },
  { value: "lowlands",  label: "Niziny" },
  { value: "sea",       label: "Morze" },
  { value: "track",     label: "Tor" },
  { value: "pool",      label: "Basen / kajak-polo" },
  { value: "playspot",  label: "Playspot / freestyle" },
];

const DIFFICULTY_WW = ["WW1", "WW2", "WW3", "WW4", "WW5"];
const DIFFICULTY_U  = ["U1", "U2", "U3"];

// ─── helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function spinnerHtml(text = "Ładowanie…") {
  return `<div class="thinking">${esc(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return esc(iso);
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function fmtNum(n, decimals = 1) {
  const v = parseFloat(n) || 0;
  return v % 1 === 0 ? String(v) : parseFloat(v.toFixed(decimals)).toString();
}

function waterTypeLabel(wt) {
  return WATER_TYPES.find(x => x.value === wt)?.label || esc(wt);
}

function rankMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

function infoTip(text) {
  return `<button type="button" class="kmInfoBtn" data-km-tip="${esc(text)}" aria-label="Informacja">${INFO_SVG}</button>`;
}

// ─── popover tooltip ──────────────────────────────────────────────────────────

function attachInfoTips(container) {
  let activePopover = null;

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }

  container.querySelectorAll("[data-km-tip]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tip = btn.dataset.kmTip;
      if (activePopover && activePopover.dataset.srcBtn === btn) {
        closePopover();
        return;
      }
      closePopover();
      const pop = document.createElement("div");
      pop.className = "kmPopover";
      pop.dataset.srcBtn = btn;
      pop.textContent = tip;
      btn.parentNode.insertBefore(pop, btn.nextSibling);
      activePopover = pop;
    });
  });

  document.addEventListener("click", closePopover, { once: false, capture: true });
  // Usuń listenera przy wyjściu z modułu
  container.__closeKmPopover = closePopover;
}

// ─── dynamiczne ładowanie zasobów ────────────────────────────────────────────

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadCss(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.onload = resolve;
    document.head.appendChild(l);
  });
}

function injectKmLocStyles() {
  if (document.getElementById("kmLocStyles")) return;
  const s = document.createElement("style");
  s.id = "kmLocStyles";
  s.textContent = `
    .kmLocBtns{display:flex;gap:6px;margin-top:6px;}
    .kmLocBtn{font:12px system-ui,sans-serif;padding:4px 10px;border-radius:5px;border:1px solid #555;background:transparent;color:#ccc;cursor:pointer;display:inline-flex;align-items:center;gap:4px;}
    .kmLocBtn:hover{background:rgba(255,255,255,0.08);}
    .kmLocBtn:disabled{opacity:0.5;cursor:not-allowed;}
    .kmLocDisplay{display:flex;align-items:center;gap:8px;margin-top:6px;font:12px system-ui,sans-serif;color:#7ec8a4;}
    .kmLocClearBtn{background:none;border:none;color:#888;cursor:pointer;font-size:14px;padding:0 2px;line-height:1;}
    .kmLocClearBtn:hover{color:#ccc;}
    .kmMapModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;}
    .kmMapModalBox{background:#1a1a2e;border:1px solid #333;border-radius:10px;width:100%;max-width:600px;display:flex;flex-direction:column;overflow:hidden;}
    .kmMapModalHeader{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #333;font:13px system-ui,sans-serif;color:#ccc;}
    .kmMapModalClose{background:none;border:none;color:#888;font-size:18px;cursor:pointer;line-height:1;padding:0;}
    .kmMapModalClose:hover{color:#ccc;}
    #kmMapPickerDiv{height:320px;}
    .kmMapModalFooter{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid #333;gap:12px;}
    .kmMapPickedText{font:12px system-ui,sans-serif;color:#888;flex:1;}
  `;
  document.head.appendChild(s);
}

// ─── autocomplete nazwy akwenu ────────────────────────────────────────────────

function attachPlacesAutocomplete(input, hiddenPlaceId, ctx, hiddenLat, hiddenLng, onLocationSet, onLocationClear) {
  let debounceTimer = null;
  let suggestionsList = null;
  let selectedPlaceId = null;

  function closeSuggestions() {
    if (suggestionsList) {
      suggestionsList.remove();
      suggestionsList = null;
    }
  }

  function showSuggestions(places) {
    closeSuggestions();
    if (!places.length) return;

    suggestionsList = document.createElement("ul");
    suggestionsList.className = "kmPlacesSuggestions";

    places.forEach(p => {
      const li = document.createElement("li");
      li.className = "kmPlacesSuggestion";
      li.textContent = p.name + (p.waterType ? ` (${waterTypeLabel(p.waterType)})` : "");
      li.addEventListener("mousedown", (e) => {
        e.preventDefault(); // Zapobiega blur przed kliknięciem
        input.value = p.name;
        selectedPlaceId = p.placeId;
        hiddenPlaceId.value = p.placeId;
        if (hiddenLat) hiddenLat.value = p.lat != null ? p.lat : "";
        if (hiddenLng) hiddenLng.value = p.lng != null ? p.lng : "";
        if (p.lat != null && p.lng != null && onLocationSet) onLocationSet(p.lat, p.lng, "Akwen");
        else if (onLocationClear) onLocationClear();
        closeSuggestions();
      });
      suggestionsList.appendChild(li);
    });

    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(suggestionsList);
  }

  input.addEventListener("input", () => {
    selectedPlaceId = null;
    hiddenPlaceId.value = "";
    if (hiddenLat) hiddenLat.value = "";
    if (hiddenLng) hiddenLng.value = "";
    if (onLocationClear) onLocationClear();
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) { closeSuggestions(); return; }

    debounceTimer = setTimeout(async () => {
      try {
        const data = await apiGetJson({
          url: KM_PLACES_URL + "?q=" + encodeURIComponent(q) + "&limit=10",
          idToken: ctx.idToken,
        });
        showSuggestions(data?.places || []);
      } catch { /* Cichy błąd — autocomplete nie blokuje wpisu */ }
    }, 300);
  });

  input.addEventListener("blur", () => {
    setTimeout(closeSuggestions, 150);
  });
}

// ─── WIDOK: formularz kursanta ────────────────────────────────────────────────

function renderKursantFormView(inner, ctx) {
  inner.innerHTML = `
    <div class="kmFormSection">
      <form id="kmKursantForm" class="kmForm" novalidate>

        <div class="formRow">
          <label for="kmKursantEvent">Impreza kursowa <span class="required">*</span></label>
          <select id="kmKursantEvent" name="event" required>
            <option value="">Ładowanie…</option>
          </select>
        </div>

        <fieldset class="kmCapsizeFieldset">
          <legend>Wywrotolotek</legend>
          <div class="kmCapsizeGrid">
            <div class="kmCapsizeItem">
              <label for="kmKKabina">Kabina</label>
              <input type="number" id="kmKKabina" name="kabina" min="0" max="999" step="1" placeholder="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmKRolka">Rolka</label>
              <input type="number" id="kmKRolka" name="rolka" min="0" max="999" step="1" placeholder="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmKDziubek">Dziubek</label>
              <input type="number" id="kmKDziubek" name="dziubek" min="0" max="999" step="1" placeholder="0" />
            </div>
          </div>
        </fieldset>

        <div id="kmKursantFormError" class="errorMsg" hidden></div>
        <div id="kmKursantFormSuccess" class="successMsg" hidden></div>

        <div class="formActions">
          <button type="submit" id="kmKursantSubmitBtn" class="primary">Zapisz</button>
        </div>
      </form>
    </div>
  `;

  const eventSelect = inner.querySelector("#kmKursantEvent");
  const form = inner.querySelector("#kmKursantForm");
  const errEl = inner.querySelector("#kmKursantFormError");
  const okEl = inner.querySelector("#kmKursantFormSuccess");
  const btn = inner.querySelector("#kmKursantSubmitBtn");

  function setErr(msg) { errEl.textContent = msg; errEl.hidden = !msg; okEl.hidden = true; }
  function setOk(msg)  { okEl.textContent = msg; okEl.hidden = false; errEl.hidden = true; }

  // Załaduj imprezy kursowe asynchronicznie
  apiGetJson({ url: EVENTS_URL + "?mode=all", idToken: ctx.idToken })
    .then(data => {
      const events = (data?.events || []).filter(ev => ev.kursowa === true && ev.ranking === true);
      eventSelect.innerHTML = "";
      if (!events.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Brak aktywnych imprez kursowych";
        eventSelect.appendChild(opt);
        return;
      }
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "— wybierz imprezę —";
      eventSelect.appendChild(placeholder);
      events.forEach(ev => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.dataset.eventName = ev.name;
        const dateRange = ev.startDate === ev.endDate ?
          ev.startDate :
          `${ev.startDate} – ${ev.endDate}`;
        opt.textContent = `${ev.name} (${dateRange})`;
        eventSelect.appendChild(opt);
      });
    })
    .catch(() => {
      eventSelect.innerHTML = `<option value="">Nie udało się pobrać imprez</option>`;
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setErr("");

    const selectedOpt = eventSelect.options[eventSelect.selectedIndex];
    const eventId = selectedOpt?.value || "";
    const eventName = eventId ? (selectedOpt?.dataset?.eventName || "") : "";

    if (!eventId) { setErr("Wybierz imprezę kursową."); return; }

    const kabina = parseInt(inner.querySelector("#kmKKabina").value, 10) || 0;
    const rolka = parseInt(inner.querySelector("#kmKRolka").value, 10) || 0;
    const dziubek = parseInt(inner.querySelector("#kmKDziubek").value, 10) || 0;

    btn.disabled = true;
    btn.textContent = "Zapisywanie…";

    try {
      const resp = await apiPostJson({
        url: KM_ADD_LOG_URL,
        idToken: ctx.idToken,
        body: {
          date: todayIso(),
          waterType: "lowlands",
          placeName: eventName,
          placeNameRaw: eventName,
          eventId,
          eventName,
          km: 0,
          hoursOnWater: 0,
          capsizeRolls: { kabina, rolka, dziubek },
        },
      });

      if (resp?.ok) {
        setOk("Zapisano! Punkty dodane do rankingu kursantów.");
        form.reset();
        if (eventSelect.options.length > 0) eventSelect.selectedIndex = 0;
      } else {
        setErr(resp?.message || "Nie udało się zapisać.");
      }
    } catch (err) {
      setErr("Błąd: " + (err?.message || String(err)));
    } finally {
      btn.disabled = false;
      btn.textContent = "Zapisz";
    }
  });
}

// ─── WIDOK: formularz dodawania wpisu ────────────────────────────────────────

function renderFormView(inner, ctx, moduleId) {
  const today = todayIso();

  inner.innerHTML = `
    <div class="kmFormSection">
      <form id="kmAddForm" class="kmForm" novalidate>

        <div class="formRow">
          <label for="kmDate">Data aktywności <span class="required">*</span></label>
          <input type="date" id="kmDate" name="date" max="${esc(today)}" value="${esc(today)}" required />
        </div>

        <div class="formRow">
          <label for="kmWaterType">
            Typ akwenu <span class="required">*</span>
            ${infoTip("Góry → skala WW, Niziny → skala U, pozostałe → brak skali trudności.")}
          </label>
          <select id="kmWaterType" name="waterType" required>
            <option value="">— wybierz —</option>
            ${WATER_TYPES.map(wt => `<option value="${esc(wt.value)}">${esc(wt.label)}</option>`).join("")}
          </select>
        </div>

        <div class="formRow" id="kmDifficultyRow" hidden>
          <label for="kmDifficulty">
            Trudność
            ${infoTip("WW1–WW5 dla rzek górskich. U1–U3 dla rzek nizinnych. Nie trzeba podawać.")}
          </label>
          <select id="kmDifficulty" name="difficulty">
            <option value="">— brak —</option>
          </select>
        </div>

        <div class="formRow" style="position:relative">
          <label for="kmPlaceName">
            Rzeka / akwen <span class="required">*</span>
            ${infoTip("Wpisz nazwę rzeki lub akwenu. System podpowie znane nazwy po 2 znakach.")}
          </label>
          <input type="text" id="kmPlaceName" name="placeName" maxlength="200"
            placeholder="np. Radunia, Dunajec, Morze Bałtyckie" autocomplete="off" required />
          <input type="hidden" id="kmPlaceId" name="placeId" />
          <input type="hidden" id="kmLat" />
          <input type="hidden" id="kmLng" />
          <div class="kmLocBtns">
            <button type="button" id="kmGpsBtn" class="kmLocBtn" title="Pobierz bieżącą lokalizację z GPS telefonu">📍 GPS</button>
            <button type="button" id="kmMapBtn" class="kmLocBtn" title="Kliknij na mapie, aby wybrać lokalizację">🗺️ Wybierz na mapie</button>
          </div>
          <div id="kmLocDisplay" class="kmLocDisplay" hidden>
            <span id="kmLocText"></span>
            <button type="button" id="kmLocClear" class="kmLocClearBtn" title="Wyczyść lokalizację">✕</button>
          </div>
        </div>

        <div class="formRow">
          <label for="kmSection">Odcinek (opcjonalnie)</label>
          <input type="text" id="kmSection" name="sectionDescription" maxlength="500"
            placeholder="np. Olsztynek – Brodnica Dolna" />
        </div>

        <div class="formRow">
          <label for="kmKm">Kilometry <span class="required">*</span></label>
          <input type="number" id="kmKm" name="km" min="0" max="9999" step="0.1"
            placeholder="np. 18.5 (wpisz 0 dla playspot / treningu bez trasy)" required />
        </div>

        <div class="formRow">
          <label for="kmHours">
            Godziny na wodzie <span class="required">*</span>
            ${infoTip("Całkowity czas spędzony na wodzie (w godzinach). Wpisz 0 jeśli nie mierzono.")}
          </label>
          <input type="number" id="kmHours" name="hoursOnWater" min="0" max="99" step="0.5"
            placeholder="np. 4.5 (wpisz 0 jeśli nie mierzono)" required />
        </div>

        <div class="formRow">
          <label for="kmActivityType">Typ aktywności (opcjonalnie)</label>
          <select id="kmActivityType" name="activityType">
            <option value="">— dowolny —</option>
            <option value="spływ">Spływ</option>
            <option value="trening">Trening</option>
            <option value="obóz">Obóz / biwak</option>
            <option value="wyjazd">Wyjazd weekendowy</option>
            <option value="zawody">Zawody</option>
            <option value="inne">Inne</option>
          </select>
        </div>

        <div class="formRow" id="kmEventRow">
          <label for="kmEvent">Impreza (opcjonalnie)</label>
          <select id="kmEvent" name="event">
            <option value="">— brak / nie dotyczy —</option>
          </select>
          <input type="hidden" id="kmEventName" />
        </div>

        <fieldset class="kmCapsizeFieldset">
          <legend>
            Wywrotolotek
            ${infoTip("Liczba udanych wywrotolotek podczas aktywności. Każda pozycja punktowana osobno.")}
          </legend>
          <div class="kmCapsizeGrid">
            <div class="kmCapsizeItem">
              <label for="kmKabina">Kabina</label>
              <input type="number" id="kmKabina" name="kabina" min="0" max="999" step="1" placeholder="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmRolka">Rolka</label>
              <input type="number" id="kmRolka" name="rolka" min="0" max="999" step="1" placeholder="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmDziubek">Dziubek</label>
              <input type="number" id="kmDziubek" name="dziubek" min="0" max="999" step="1" placeholder="0" />
            </div>
          </div>
        </fieldset>

        <div class="formRow">
          <label for="kmNote">Notatka (opcjonalnie)</label>
          <textarea id="kmNote" name="note" rows="2" maxlength="1000"
            placeholder="Krótka notatka do wpisu…"></textarea>
        </div>

        <div id="kmFormError" class="errorMsg" hidden></div>
        <div id="kmFormSuccess" class="successMsg" hidden></div>

        <div class="formActions">
          <button type="submit" id="kmSubmitBtn" class="primary">Zapisz aktywność</button>
        </div>
      </form>
    </div>
  `;

  // Dynamika formularza — trudność
  const waterTypeSelect = inner.querySelector("#kmWaterType");
  const difficultyRow = inner.querySelector("#kmDifficultyRow");
  const difficultySelect = inner.querySelector("#kmDifficulty");

  function updateDifficultyField() {
    const wt = waterTypeSelect.value;
    if (wt === "mountains") {
      difficultyRow.hidden = false;
      difficultySelect.innerHTML = `<option value="">— brak —</option>` +
        DIFFICULTY_WW.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
    } else if (wt === "lowlands") {
      difficultyRow.hidden = false;
      difficultySelect.innerHTML = `<option value="">— brak —</option>` +
        DIFFICULTY_U.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
    } else {
      difficultyRow.hidden = true;
      difficultySelect.value = "";
    }
  }

  waterTypeSelect.addEventListener("change", updateDifficultyField);

  // Autocomplete nazwy akwenu
  const placeInput = inner.querySelector("#kmPlaceName");
  const placeIdHidden = inner.querySelector("#kmPlaceId");
  const latHidden = inner.querySelector("#kmLat");
  const lngHidden = inner.querySelector("#kmLng");

  // ── Lokalizacja: GPS + mapa ─────────────────────────────────────────────────
  injectKmLocStyles();

  const gpsBtn   = inner.querySelector("#kmGpsBtn");
  const mapBtn   = inner.querySelector("#kmMapBtn");
  const locDisp  = inner.querySelector("#kmLocDisplay");
  const locTxt   = inner.querySelector("#kmLocText");
  const locClear = inner.querySelector("#kmLocClear");

  function setLocationDisplay(lat, lng, source) {
    latHidden.value = String(lat);
    lngHidden.value = String(lng);
    locTxt.textContent = (source ? source + ": " : "") + parseFloat(lat).toFixed(5) + ", " + parseFloat(lng).toFixed(5);
    locDisp.hidden = false;
  }

  function clearLocationDisplay() {
    latHidden.value = "";
    lngHidden.value = "";
    locDisp.hidden = true;
    locTxt.textContent = "";
  }

  locClear.addEventListener("click", clearLocationDisplay);

  attachPlacesAutocomplete(placeInput, placeIdHidden, ctx, latHidden, lngHidden,
    (lat, lng, source) => setLocationDisplay(lat, lng, source),
    () => clearLocationDisplay()
  );

  // GPS
  gpsBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }
    gpsBtn.disabled = true;
    gpsBtn.textContent = "⏳ GPS…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationDisplay(pos.coords.latitude, pos.coords.longitude, "GPS");
        gpsBtn.disabled = false;
        gpsBtn.textContent = "📍 GPS";
      },
      err => {
        alert("Nie udało się pobrać lokalizacji: " + (err.message || "błąd GPS"));
        gpsBtn.disabled = false;
        gpsBtn.textContent = "📍 GPS";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // Mapa — picker
  let pickedLat = null;
  let pickedLng = null;

  mapBtn.addEventListener("click", async () => {
    if (!window.L) {
      mapBtn.disabled = true;
      mapBtn.textContent = "⏳ Ładowanie…";
      await Promise.all([
        loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"),
        loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"),
      ]).catch(() => {});
      mapBtn.disabled = false;
      mapBtn.textContent = "🗺️ Wybierz na mapie";
    }

    pickedLat = null;
    pickedLng = null;

    const overlay = document.createElement("div");
    overlay.className = "kmMapModalOverlay";
    overlay.innerHTML = `
      <div class="kmMapModalBox">
        <div class="kmMapModalHeader">
          <span>Kliknij na mapie, aby wybrać lokalizację</span>
          <button type="button" class="kmMapModalClose" id="kmMapClose">✕</button>
        </div>
        <div id="kmMapPickerDiv"></div>
        <div class="kmMapModalFooter">
          <span class="kmMapPickedText" id="kmMapPickedText">Kliknij w dowolne miejsce na mapie…</span>
          <button type="button" class="primary" id="kmMapConfirm" disabled>Zatwierdź</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn   = overlay.querySelector("#kmMapClose");
    const confirmBtn = overlay.querySelector("#kmMapConfirm");
    const pickedText = overlay.querySelector("#kmMapPickedText");

    let pickerMap    = null;
    let pickerMarker = null;

    function closeModal() {
      if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; }
      overlay.remove();
    }

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });

    confirmBtn.addEventListener("click", () => {
      if (pickedLat != null && pickedLng != null) setLocationDisplay(pickedLat, pickedLng, "Mapa");
      closeModal();
    });

    // Inicjalizacja mapy po wyrenderowaniu overlaya
    setTimeout(() => {
      const existLat = latHidden.value ? parseFloat(latHidden.value) : null;
      const existLng = lngHidden.value ? parseFloat(lngHidden.value) : null;
      const centerLat = existLat ?? 52.0;
      const centerLng = existLng ?? 19.5;
      const zoom = existLat != null ? 12 : 6;

      pickerMap = window.L.map("kmMapPickerDiv").setView([centerLat, centerLng], zoom);
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(pickerMap);

      if (existLat != null) {
        pickedLat = existLat;
        pickedLng = existLng;
        pickerMarker = window.L.marker([pickedLat, pickedLng]).addTo(pickerMap);
        pickedText.textContent = pickedLat.toFixed(5) + ", " + pickedLng.toFixed(5);
        confirmBtn.disabled = false;
      }

      pickerMap.on("click", e => {
        pickedLat = e.latlng.lat;
        pickedLng = e.latlng.lng;
        if (pickerMarker) pickerMap.removeLayer(pickerMarker);
        pickerMarker = window.L.marker([pickedLat, pickedLng]).addTo(pickerMap);
        pickedText.textContent = pickedLat.toFixed(5) + ", " + pickedLng.toFixed(5);
        confirmBtn.disabled = false;
      });
    }, 50);
  });

  // Załaduj listę aktualnych imprez asynchronicznie (mode=recent: od 30 dni wstecz do dziś)
  const eventSelect = inner.querySelector("#kmEvent");
  apiGetJson({ url: EVENTS_URL + "?mode=recent", idToken: ctx.idToken })
    .then(data => {
      const events = data?.events || [];
      events.forEach(ev => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.dataset.eventName = ev.name;
        const dateRange = ev.startDate === ev.endDate
          ? ev.startDate
          : `${ev.startDate} – ${ev.endDate}`;
        opt.textContent = `${ev.name} (${dateRange})`;
        eventSelect.appendChild(opt);
      });
    })
    .catch(() => {/* Cichy błąd — dropdown pozostaje z opcją brak */});

  // Submit
  const form = inner.querySelector("#kmAddForm");
  const errEl = inner.querySelector("#kmFormError");
  const okEl = inner.querySelector("#kmFormSuccess");
  const btn = inner.querySelector("#kmSubmitBtn");

  function setErr(msg) { errEl.textContent = msg; errEl.hidden = !msg; okEl.hidden = true; }
  function setOk(msg)  { okEl.textContent = msg; okEl.hidden = false; errEl.hidden = true; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setErr("");

    const date = String(form.date.value || "").trim();
    const waterType = String(form.waterType.value || "").trim();
    const placeName = String(form.placeName.value || "").trim();
    const km = parseFloat(form.km.value);
    const hoursOnWater = parseFloat(form.hoursOnWater.value) || 0;
    const difficulty = String(form.difficulty?.value || "").trim() || null;
    const difficultyScale = difficulty
      ? (difficulty.startsWith("WW") ? "WW" : "U")
      : null;
    const activityType = String(form.activityType.value || "").trim() || undefined;
    const sectionDescription = String(form.sectionDescription.value || "").trim() || undefined;
    const note = String(form.note.value || "").trim() || undefined;
    const placeId = String(form.placeId.value || "").trim() || undefined;
    const latRaw = inner.querySelector("#kmLat")?.value;
    const lngRaw = inner.querySelector("#kmLng")?.value;
    const lat = latRaw !== "" && latRaw != null ? parseFloat(latRaw) : undefined;
    const lng = lngRaw !== "" && lngRaw != null ? parseFloat(lngRaw) : undefined;

    const kabina = parseInt(form.kabina.value, 10) || 0;
    const rolka = parseInt(form.rolka.value, 10) || 0;
    const dziubek = parseInt(form.dziubek.value, 10) || 0;

    const selectedEventOpt = eventSelect.options[eventSelect.selectedIndex];
    const eventId = selectedEventOpt?.value || undefined;
    const eventName = eventId ? (selectedEventOpt?.dataset?.eventName || undefined) : undefined;

    // Lekka walidacja UX
    if (!date) { setErr("Podaj datę aktywności."); return; }
    if (!waterType) { setErr("Wybierz typ akwenu."); return; }
    if (!placeName) { setErr("Wpisz nazwę rzeki lub akwenu."); return; }
    if (isNaN(km) || km < 0) { setErr("Podaj prawidłową liczbę kilometrów (0 lub więcej)."); return; }
    if (isNaN(hoursOnWater) || hoursOnWater < 0 || hoursOnWater > 99) { setErr("Podaj prawidłową liczbę godzin na wodzie (0–99)."); return; }

    btn.disabled = true;
    btn.textContent = "Zapisywanie…";

    try {
      const resp = await apiPostJson({
        url: KM_ADD_LOG_URL,
        idToken: ctx.idToken,
        body: {
          date,
          waterType,
          placeName,
          placeNameRaw: placeName,
          placeId,
          lat,
          lng,
          km,
          hoursOnWater,
          activityType,
          difficultyScale,
          difficulty,
          capsizeRolls: { kabina, rolka, dziubek },
          sectionDescription,
          note,
          eventId,
          eventName,
        },
      });

      if (resp?.ok) {
        setOk("Aktywność zapisana! Punkty obliczone i dodane do Twojego rankingu.");
        form.reset();
        form.date.value = todayIso();
        difficultyRow.hidden = true;
      } else {
        setErr(resp?.message || "Nie udało się zapisać aktywności.");
      }
    } catch (err) {
      setErr("Błąd: " + (err?.message || String(err)));
    } finally {
      btn.disabled = false;
      btn.textContent = "Zapisz aktywność";
    }
  });
}

// ─── WIDOK: rankingi ──────────────────────────────────────────────────────────

async function renderRankingsView(inner, ctx) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 2010; y--) {
    yearOptions.push(`<option value="${y}"${y === currentYear - 1 ? " selected" : ""}>${y}</option>`);
  }

  inner.innerHTML = `
    <div class="kmRankingsSection">
      <div class="kmRankingsControls">
        <div class="kmControlGroup">
          <label>Typ rankingu:</label>
          <div class="kmBtnGroup" id="kmTypeGroup">
            <button class="kmRankBtn active" data-km-type="km">Kilometry</button>
            <button class="kmRankBtn" data-km-type="points">Wywrotolotek</button>
            <button class="kmRankBtn" data-km-type="hours">Godziny</button>
          </div>
        </div>
        <div class="kmControlGroup">
          <label>Okres:</label>
          <div class="kmBtnGroup" id="kmPeriodGroup">
            <button class="kmRankBtn" data-km-period="alltime">Wszech czasów</button>
            <button class="kmRankBtn active" data-km-period="year">Bieżący rok</button>
            <button class="kmRankBtn" data-km-period="specificYear">Wybrany rok</button>
          </div>
        </div>
        <div class="kmControlGroup" id="kmYearGroup" style="display:none">
          <label>Rok:</label>
          <select id="kmYearSelect" class="kmYearSelect">${yearOptions.join("")}</select>
        </div>
      </div>
      <div id="kmRankingsTable">${spinnerHtml("Pobieranie rankingu…")}</div>
    </div>
  `;

  let activeType = "km";
  let activePeriod = "year";

  const yearGroup = inner.querySelector("#kmYearGroup");
  const yearSelect = inner.querySelector("#kmYearSelect");

  async function loadRanking() {
    const tableEl = inner.querySelector("#kmRankingsTable");
    tableEl.innerHTML = spinnerHtml("Pobieranie rankingu…");
    try {
      let url = KM_RANKINGS_URL + `?type=${activeType}&period=${activePeriod}&limit=50`;
      if (activePeriod === "specificYear") {
        const yr = yearSelect?.value || String(currentYear - 1);
        url += `&year=${yr}`;
      }
      const data = await apiGetJson({ url, idToken: ctx.idToken });
      const entries = data?.entries || [];
      const typeLabel = { km: "km", points: "pkt", hours: "h" }[activeType] || "";

      if (!entries.length) {
        tableEl.innerHTML = `<p class="kmEmpty">Brak danych rankingowych.</p>`;
        return;
      }

      let infoText;
      if (activePeriod === "year") {
        infoText = `<p class="kmRankNote">Ranking dotyczy bieżącego roku. Dane historyczne wliczane do rankingu wszech czasów.</p>`;
      } else if (activePeriod === "specificYear") {
        infoText = `<p class="kmRankNote">Ranking za rok ${esc(data?.year || "")}.</p>`;
      } else {
        infoText = `<p class="kmRankNote">Ranking wszech czasów — uwzględnia dane historyczne i bieżące.</p>`;
      }

      tableEl.innerHTML = infoText + `
        <div class="kmRankingList">
          ${entries.map(e => {
            const isMe = e.uid === ctx.session?.uid;
            const name = e.nickname || e.displayName || "—";
            return `
              <div class="kmRankRow${isMe ? " kmRankRowMe" : ""}">
                <span class="kmRankMedal">${rankMedal(e.rank)}</span>
                <span class="kmRankName">${esc(name)}</span>
                <span class="kmRankValue">${fmtNum(e.value, 1)} ${esc(typeLabel)}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } catch (err) {
      tableEl.innerHTML = `<p class="errorMsg">Błąd: ${esc(err?.message || String(err))}</p>`;
    }
  }

  // Event handlers dla przycisków
  inner.querySelectorAll("[data-km-type]").forEach(btn => {
    btn.addEventListener("click", () => {
      inner.querySelectorAll("[data-km-type]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeType = btn.dataset.kmType;
      loadRanking();
    });
  });

  inner.querySelectorAll("[data-km-period]").forEach(btn => {
    btn.addEventListener("click", () => {
      inner.querySelectorAll("[data-km-period]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activePeriod = btn.dataset.kmPeriod;
      yearGroup.style.display = activePeriod === "specificYear" ? "" : "none";
      loadRanking();
    });
  });

  yearSelect?.addEventListener("change", () => {
    if (activePeriod === "specificYear") loadRanking();
  });

  await loadRanking();
}

// ─── WIDOK: moje statystyki ────────────────────────────────────────────────────

async function renderMyStatsView(inner, ctx) {
  inner.innerHTML = spinnerHtml("Pobieranie statystyk…");

  let data;
  try {
    data = await apiGetJson({ url: KM_MY_STATS_URL, idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<p class="errorMsg">Błąd: ${esc(e?.message || String(e))}</p>`;
    return;
  }

  const stats = data?.stats;

  if (!stats) {
    inner.innerHTML = `
      <div class="kmStatsEmpty">
        <p>Nie masz jeszcze żadnych wpisów aktywności.</p>
        <p>Dodaj pierwszy wpis w zakładce „Dodaj wpis".</p>
      </div>
    `;
    return;
  }

  const currentYear = new Date().getFullYear();

  inner.innerHTML = `
    <div class="kmStatsSection">
      <h3>Wszech czasów</h3>
      <div class="kmStatsGrid">
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.allTimeKm)}</span>
          <span class="kmStatLabel">km</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.allTimePoints)}</span>
          <span class="kmStatLabel">punktów</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.allTimeHours)}</span>
          <span class="kmStatLabel">godzin</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.allTimeDays || 0}</span>
          <span class="kmStatLabel">dni</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.allTimeLogs || 0}</span>
          <span class="kmStatLabel">wpisów</span>
        </div>
      </div>

      <h3>Wywrotolotek (łącznie)</h3>
      <div class="kmStatsGrid kmStatsGridSmall">
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.allTimeCapsizeKabina || 0}</span>
          <span class="kmStatLabel">kabina</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.allTimeCapsizeRolka || 0}</span>
          <span class="kmStatLabel">rolka</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.allTimeCapsizeDziubek || 0}</span>
          <span class="kmStatLabel">dziubek</span>
        </div>
      </div>

      <h3>Rok ${currentYear}</h3>
      <div class="kmStatsGrid">
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.yearKm || 0)}</span>
          <span class="kmStatLabel">km</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.yearPoints || 0)}</span>
          <span class="kmStatLabel">punktów</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${fmtNum(stats.yearHours || 0)}</span>
          <span class="kmStatLabel">godzin</span>
        </div>
        <div class="kmStatCard">
          <span class="kmStatValue">${stats.yearLogs || 0}</span>
          <span class="kmStatLabel">wpisów</span>
        </div>
      </div>
      ${(() => {
        const yearsData = stats.years || {};
        const sortedYears = Object.keys(yearsData).sort((a, b) => b.localeCompare(a));
        if (!sortedYears.length) return "";
        const rows = sortedYears.map(yr => {
          const y = yearsData[yr];
          return `<tr><td>${esc(yr)}</td><td>${fmtNum(y.km)}</td><td>${fmtNum(y.points)}</td><td>${fmtNum(y.hours)}</td><td>${y.days || 0}</td></tr>`;
        }).join("");
        return `
          <h3>Statystyki roczne</h3>
          <table class="kmYearsTable">
            <thead><tr><th>Rok</th><th>km</th><th>pkt</th><th>godz</th><th>dni</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      })()}
    </div>
  `;
}

// ─── WIDOK: moje wpisy ─────────────────────────────────────────────────────────

async function renderMyLogsView(inner, ctx) {
  inner.innerHTML = spinnerHtml("Pobieranie wpisów…");

  let data;
  try {
    data = await apiGetJson({ url: KM_MY_LOGS_URL + "?limit=50", idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<p class="errorMsg">Błąd: ${esc(e?.message || String(e))}</p>`;
    return;
  }

  const logs = data?.logs || [];

  if (!logs.length) {
    inner.innerHTML = `
      <div class="kmLogsEmpty">
        <p>Brak wpisów aktywności.</p>
        <p>Dodaj pierwszy wpis w zakładce „Dodaj wpis".</p>
      </div>
    `;
    return;
  }

  inner.innerHTML = `
    <div class="kmLogsSection">
      <p class="kmLogsCount">Ostatnie ${logs.length} wpisów (od najnowszego)</p>
      <div class="kmLogsList">
        ${logs.map(log => {
          const isHistorical = log.sourceType === "historical";
          const capsizeTotal = (log.capsizeRolls?.kabina || 0) + (log.capsizeRolls?.rolka || 0) + (log.capsizeRolls?.dziubek || 0);
          return `
            <div class="kmLogItem${isHistorical ? " kmLogHistorical" : ""}">
              <div class="kmLogHeader">
                <span class="kmLogDate">${esc(formatDate(log.date))}</span>
                ${isHistorical ? `<span class="kmLogBadge">historyczny</span>` : ""}
                ${log.eventName ? `<span class="kmLogBadge kmLogBadgeEvent">${esc(log.eventName)}</span>` : ""}
                <span class="kmLogPts">${fmtNum(log.pointsTotal, 2)} pkt</span>
              </div>
              <div class="kmLogBody">
                <span class="kmLogPlace">${esc(log.placeName || "—")}</span>
                ${!isHistorical ? `<span class="kmLogType">${esc(waterTypeLabel(log.waterType))}</span>` : ""}
              </div>
              <div class="kmLogMeta">
                ${log.km > 0 ? `<span>${fmtNum(log.km)} km</span>` : ""}
                ${log.hoursOnWater ? `<span>${fmtNum(log.hoursOnWater)} h</span>` : ""}
                ${log.difficulty ? `<span>${esc(log.difficulty)}</span>` : ""}
                ${capsizeTotal > 0 ? `<span>${[
                  (log.capsizeRolls?.kabina || 0) > 0 ? `${log.capsizeRolls.kabina}× kabina` : "",
                  (log.capsizeRolls?.rolka || 0) > 0 ? `${log.capsizeRolls.rolka}× rolka` : "",
                  (log.capsizeRolls?.dziubek || 0) > 0 ? `${log.capsizeRolls.dziubek}× dziubek` : "",
                ].filter(Boolean).join(", ")}</span>` : ""}
              </div>
              ${log.note ? `<div class="kmLogNote">${esc(log.note)}</div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ─── WIDOK: mapa aktywności ───────────────────────────────────────────────────

async function renderMapView(inner, ctx) {
  inner.innerHTML = `
    <div class="kmMapSection">
      <div id="kmMapYearBar" style="display:none;margin-bottom:10px;display:flex;align-items:center;gap:8px;">
        <label for="kmMapYearFilter" style="font-size:0.85rem;color:var(--text-muted,#888);">Rok:</label>
        <select id="kmMapYearFilter" style="background:var(--surface-2,#1e1e2e);color:var(--text-primary,#e0e0e0);border:1px solid var(--border,#333);border-radius:6px;padding:3px 8px;font-size:0.85rem;">
          <option value="">Wszystkie lata</option>
        </select>
      </div>
      <div id="kmMapContainer" style="height:420px;border-radius:12px;overflow:hidden;background:#1a1a2e;"></div>
      <div id="kmMapStatus" style="margin-top:8px;font-size:0.8rem;color:var(--text-muted,#888);text-align:right;"></div>
    </div>`;

  const mapEl    = inner.querySelector("#kmMapContainer");
  const statusEl = inner.querySelector("#kmMapStatus");
  const yearBar  = inner.querySelector("#kmMapYearBar");
  const yearSel  = inner.querySelector("#kmMapYearFilter");

  async function loadLeaflet() {
    if (window.L) return;
    await new Promise((resolve, reject) => {
      if (!document.querySelector("#leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function buildPopup(loc) {
    const logWord = loc.logCount === 1 ? "wpis" : (loc.logCount < 5 ? "wpisy" : "wpisów");
    const usersHtml = (loc.topUsers || []).length
      ? `<br><span style="color:#aaa;font-size:0.82em">${loc.topUsers.map(u => esc(u.name)).join(", ")}</span>`
      : "";
    return `<strong>${esc(loc.placeName)}</strong><br>${loc.logCount} ${logWord}${usersHtml}`;
  }

  function renderMarkers(leafletMap, locations) {
    leafletMap.eachLayer(l => { if (l instanceof window.L.CircleMarker) leafletMap.removeLayer(l); });
    const markers = [];
    for (const loc of locations) {
      const radius = 4 + Math.sqrt(loc.logCount) * 3;
      const marker = window.L.circleMarker([loc.lat, loc.lng], {
        radius,
        color: "#00bcd4",
        fillColor: "#00bcd4",
        fillOpacity: 0.65,
        weight: 1.5,
      });
      marker.bindPopup(buildPopup(loc));
      marker.addTo(leafletMap);
      markers.push(marker);
    }
    return markers;
  }

  try {
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:0.9rem;">Ładowanie mapy…</div>`;

    await loadLeaflet();

    const data = await apiGetJson({ url: KM_MAP_DATA_URL, idToken: ctx.idToken });

    const L = window.L;
    mapEl.innerHTML = "";

    const allLocations = data?.locations || [];
    const years = data?.years || [];

    if (allLocations.length === 0) {
      mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:0.9rem;padding:16px;text-align:center;">Brak danych lokalizacji.<br>Mapa aktualizuje się po uruchomieniu zadania z menu w arkuszu.</div>`;
      return;
    }

    // Wypełnij dropdown roków
    if (years.length > 0) {
      yearBar.style.display = "flex";
      for (const yr of years) {
        const opt = document.createElement("option");
        opt.value = String(yr);
        opt.textContent = String(yr);
        yearSel.appendChild(opt);
      }
    }

    const leafletMap = L.map(mapEl, { zoomControl: true, attributionControl: true });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors © <a href='https://carto.com/'>CARTO</a>",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(leafletMap);

    let currentMarkers = renderMarkers(leafletMap, allLocations);
    const group = L.featureGroup(currentMarkers);
    if (currentMarkers.length) leafletMap.fitBounds(group.getBounds().pad(0.15));

    yearSel.addEventListener("change", () => {
      const yr = parseInt(yearSel.value, 10);
      const filtered = isNaN(yr)
        ? allLocations
        : allLocations.filter(l => Array.isArray(l.yearsActive) && l.yearsActive.includes(yr));
      currentMarkers = renderMarkers(leafletMap, filtered);
      if (currentMarkers.length) {
        const fg = L.featureGroup(currentMarkers);
        leafletMap.fitBounds(fg.getBounds().pad(0.15));
      }
    });

    if (data.updatedAt) {
      const d = new Date(data.updatedAt);
      statusEl.textContent = `Ostatnia aktualizacja mapy: ${d.toLocaleDateString("pl-PL")} ${d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch (err) {
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f44;padding:16px;text-align:center;">Nie udało się załadować mapy.<br><small>${esc(err?.message || String(err))}</small></div>`;
  }
}

// ─── WIDOK: imprezy ────────────────────────────────────────────────────────────

async function renderEventStatsView(inner, ctx) {
  inner.innerHTML = spinnerHtml("Pobieranie imprez…");

  let eventsData;
  try {
    eventsData = await apiGetJson({ url: EVENTS_URL + "?mode=all", idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<p class="errorMsg">Błąd: ${esc(e?.message || String(e))}</p>`;
    return;
  }

  const events = eventsData?.events || [];

  if (!events.length) {
    inner.innerHTML = `<div class="kmStatsEmpty"><p>Brak zatwierdzonych imprez.</p></div>`;
    return;
  }

  inner.innerHTML = `
    <div class="kmEventsSection">
      <p class="kmRankNote">Kliknij imprezę aby zobaczyć statystyki wywrotolotek uczestników.</p>
      <div id="kmEventsList">
        ${events.map(ev => {
          const dateRange = ev.startDate === ev.endDate
            ? ev.startDate
            : `${ev.startDate} – ${ev.endDate}`;
          return `
            <div class="kmEventCard" data-event-id="${esc(ev.id)}" data-event-name="${esc(ev.name)}">
              <div class="kmEventCardHeader">
                <div class="kmEventCardInfo">
                  <span class="kmEventCardName">${esc(ev.name)}</span>
                  <span class="kmEventCardDate">${esc(dateRange)}</span>
                  ${ev.location ? `<span class="kmEventCardLoc">${esc(ev.location)}</span>` : ""}
                </div>
                <button class="kmEventStatsBtn" type="button">Statystyki</button>
              </div>
              <div class="kmEventStatsPanel" style="display:none"></div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  inner.querySelectorAll(".kmEventCard").forEach(card => {
    const btn = card.querySelector(".kmEventStatsBtn");
    const panel = card.querySelector(".kmEventStatsPanel");
    const eventId = card.dataset.eventId;
    let loaded = false;

    btn.addEventListener("click", async () => {
      const isOpen = panel.style.display !== "none";
      if (isOpen) {
        panel.style.display = "none";
        btn.textContent = "Statystyki";
        return;
      }
      panel.style.display = "";
      btn.textContent = "Ukryj";

      if (loaded) return;
      panel.innerHTML = spinnerHtml("Pobieranie…");

      try {
        const data = await apiGetJson({
          url: KM_EVENT_STATS_URL + "?eventId=" + encodeURIComponent(eventId),
          idToken: ctx.idToken,
        });

        if (!data?.participants?.length) {
          panel.innerHTML = `<p class="kmEmpty">Brak wpisów km dla tej imprezy.</p>`;
          loaded = true;
          return;
        }

        const totals = data.totals || {};
        const rows = data.participants.map(p => {
          const name = p.nickname || p.displayName || "—";
          return `<tr>
            <td>${esc(name)}</td>
            <td>${p.capsizeKabina}</td>
            <td>${p.capsizeRolka}</td>
            <td>${p.capsizeDziubek}</td>
            <td><strong>${fmtNum(p.pointsTotal, 2)}</strong></td>
          </tr>`;
        }).join("");

        panel.innerHTML = `
          <table class="kmEventTable">
            <thead>
              <tr><th>Uczestnik</th><th>kabina</th><th>rolka</th><th>dziubek</th><th>pkt</th></tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr class="kmEventTotals">
                <td>RAZEM</td>
                <td>${totals.capsizeKabina || 0}</td>
                <td>${totals.capsizeRolka || 0}</td>
                <td>${totals.capsizeDziubek || 0}</td>
                <td><strong>${fmtNum(totals.pointsTotal || 0, 2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        `;
        loaded = true;
      } catch (e) {
        panel.innerHTML = `<p class="errorMsg">Błąd: ${esc(e?.message || String(e))}</p>`;
      }
    });
  });
}

// ─── ranking kursantów ─────────────────────────────────────────────────────────

async function renderKursantRankingView(inner, ctx) {
  inner.innerHTML = spinnerHtml("Pobieranie rankingu…");

  let data;
  try {
    data = await apiGetJson({ url: "/api/km/kursant-stats", idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<p class="errorMsg">Błąd: ${esc(e?.message || String(e))}</p>`;
    return;
  }

  const leaderboard = data?.leaderboard || [];

  if (!leaderboard.length) {
    inner.innerHTML = `<div class="kmStatsEmpty"><p>Brak danych rankingowych. Dodaj pierwsze wywrotolotek!</p></div>`;
    return;
  }

  inner.innerHTML = `
    <div class="kmStatsSection">
      <table class="kmRankingTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Kursant</th>
            <th>Punkty</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map(row => `
            <tr class="${row.isMe ? "kmRankingRowMe" : ""}">
              <td>${row.rank}</td>
              <td>${esc(row.name)}${row.isMe ? " ★" : ""}</td>
              <td><strong>${row.total}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ─── główny render ─────────────────────────────────────────────────────────────

async function renderKmView(viewEl, routeId, ctx, moduleId) {
  const isKursant = ctx?.session?.role_key === "rola_kursant" || ctx?.kursPreviewMode === true;
  const activeTab = TABS.find(t => t.id === routeId)?.id || "form";
  const visibleTabs = isKursant
    ? TABS.filter(t => t.id !== "rankings" && t.id !== "events" && t.id !== "my-stats" && t.id !== "map")
    : TABS.filter(t => t.id !== "kursant-ranking");

  if (!ctx?.idToken) {
    viewEl.innerHTML = `<div class="card center"><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
    return;
  }

  viewEl.innerHTML = `
    <div class="card wide kmModule">
      <div class="moduleHeader">
        <h2>${isKursant ? "Wywrotolotek" : "Kilometrówka"}</h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>
      <div class="kmTabs">
        ${visibleTabs.map(t => `
          <button type="button" class="kmTab${t.id === activeTab ? " active" : ""}"
            data-km-tab="${esc(t.id)}">${esc(t.label)}</button>
        `).join("")}
      </div>
      <div id="kmInner" class="kmInner">${spinnerHtml()}</div>
    </div>
  `;

  const inner = viewEl.querySelector("#kmInner");

  // Nawigacja
  viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
    import("/core/router.js").then(({ setHash }) => setHash("home", "home"));
  });
  viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
    import("/core/router.js").then(({ setHash }) => {
      if (activeTab !== "form") {
        setHash(moduleId, "form");
      } else {
        setHash("home", "home");
      }
    });
  });

  // Przełączanie zakładek
  viewEl.querySelectorAll("[data-km-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.kmTab === "map") {
        openMap();
        return;
      }
      import("/core/router.js").then(({ setHash }) => {
        setHash(moduleId, btn.dataset.kmTab);
      });
    });
  });

  // Attach tooltips
  attachInfoTips(viewEl);

  // Renderuj aktywną zakładkę
  if (activeTab === "form") {
    if (isKursant) {
      renderKursantFormView(inner, ctx);
    } else {
      renderFormView(inner, ctx, moduleId);
    }
  } else if (activeTab === "rankings") {
    await renderRankingsView(inner, ctx);
  } else if (activeTab === "events") {
    await renderEventStatsView(inner, ctx);
  } else if (activeTab === "map") {
    await renderMapView(inner, ctx);
  } else if (activeTab === "my-stats") {
    await renderMyStatsView(inner, ctx);
  } else if (activeTab === "my-logs") {
    await renderMyLogsView(inner, ctx);
  } else if (activeTab === "kursant-ranking") {
    await renderKursantRankingView(inner, ctx);
  }
}

// ─── export ────────────────────────────────────────────────────────────────────

export function createKmModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute: defaultRoute === "home" ? "form" : (defaultRoute || "form"),
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      await renderKmView(viewEl, routeId || "form", ctx, id);
    },
  };
}
