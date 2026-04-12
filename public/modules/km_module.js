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

const KM_ADD_LOG_URL = "/kmAddLog";
const KM_MY_LOGS_URL = "/kmMyLogs";
const KM_MY_STATS_URL = "/kmMyStats";
const KM_RANKINGS_URL = "/kmRankings";
const KM_PLACES_URL = "/kmPlaces";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const INFO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

const TABS = [
  { id: "form",     label: "Dodaj wpis" },
  { id: "rankings", label: "Ranking" },
  { id: "my-stats", label: "Moje statystyki" },
  { id: "my-logs",  label: "Moje wpisy" },
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
  return v % 1 === 0 ? String(v) : v.toFixed(decimals);
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

// ─── autocomplete nazwy akwenu ────────────────────────────────────────────────

function attachPlacesAutocomplete(input, hiddenPlaceId, ctx) {
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
        </div>

        <div class="formRow">
          <label for="kmSection">Odcinek (opcjonalnie)</label>
          <input type="text" id="kmSection" name="sectionDescription" maxlength="500"
            placeholder="np. Olsztynek – Brodnica Dolna" />
        </div>

        <div class="formRow">
          <label for="kmKm">Kilometry <span class="required">*</span></label>
          <input type="number" id="kmKm" name="km" min="0.1" max="9999" step="0.1"
            placeholder="np. 18.5" required />
        </div>

        <div class="formRow">
          <label for="kmHours">
            Godziny na wodzie
            ${infoTip("Całkowity czas na wodzie (w godzinach). Wpływa na punktację.")}
          </label>
          <input type="number" id="kmHours" name="hoursOnWater" min="0" max="99" step="0.5"
            placeholder="np. 4.5" />
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

        <fieldset class="kmCapsizeFieldset">
          <legend>
            Wywrotolotek
            ${infoTip("Liczba udanych wywrotolotek podczas aktywności. Każda pozycja punktowana osobno.")}
          </legend>
          <div class="kmCapsizeGrid">
            <div class="kmCapsizeItem">
              <label for="kmKabina">Kabina</label>
              <input type="number" id="kmKabina" name="kabina" min="0" max="999" step="1" value="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmRolka">Rolka</label>
              <input type="number" id="kmRolka" name="rolka" min="0" max="999" step="1" value="0" />
            </div>
            <div class="kmCapsizeItem">
              <label for="kmDziubek">Dziubek</label>
              <input type="number" id="kmDziubek" name="dziubek" min="0" max="999" step="1" value="0" />
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
  attachPlacesAutocomplete(placeInput, placeIdHidden, ctx);

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
    const hoursOnWater = form.hoursOnWater.value !== "" ? parseFloat(form.hoursOnWater.value) : undefined;
    const difficulty = String(form.difficulty?.value || "").trim() || null;
    const difficultyScale = difficulty
      ? (difficulty.startsWith("WW") ? "WW" : "U")
      : null;
    const activityType = String(form.activityType.value || "").trim() || undefined;
    const sectionDescription = String(form.sectionDescription.value || "").trim() || undefined;
    const note = String(form.note.value || "").trim() || undefined;
    const placeId = String(form.placeId.value || "").trim() || undefined;

    const kabina = parseInt(form.kabina.value, 10) || 0;
    const rolka = parseInt(form.rolka.value, 10) || 0;
    const dziubek = parseInt(form.dziubek.value, 10) || 0;

    // Lekka walidacja UX
    if (!date) { setErr("Podaj datę aktywności."); return; }
    if (!waterType) { setErr("Wybierz typ akwenu."); return; }
    if (!placeName) { setErr("Wpisz nazwę rzeki lub akwenu."); return; }
    if (isNaN(km) || km <= 0) { setErr("Podaj prawidłową liczbę kilometrów (> 0)."); return; }

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
          km,
          hoursOnWater,
          activityType,
          difficultyScale,
          difficulty,
          capsizeRolls: { kabina, rolka, dziubek },
          sectionDescription,
          note,
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
  inner.innerHTML = `
    <div class="kmRankingsSection">
      <div class="kmRankingsControls">
        <div class="kmControlGroup">
          <label>Typ rankingu:</label>
          <div class="kmBtnGroup" id="kmTypeGroup">
            <button class="kmRankBtn active" data-km-type="km">Kilometry</button>
            <button class="kmRankBtn" data-km-type="points">Punkty</button>
            <button class="kmRankBtn" data-km-type="hours">Godziny</button>
          </div>
        </div>
        <div class="kmControlGroup">
          <label>Okres:</label>
          <div class="kmBtnGroup" id="kmPeriodGroup">
            <button class="kmRankBtn active" data-km-period="alltime">Wszech czasów</button>
            <button class="kmRankBtn" data-km-period="year">Bieżący rok</button>
          </div>
        </div>
      </div>
      <div id="kmRankingsTable">${spinnerHtml("Pobieranie rankingu…")}</div>
    </div>
  `;

  let activeType = "km";
  let activePeriod = "alltime";

  async function loadRanking() {
    const tableEl = inner.querySelector("#kmRankingsTable");
    tableEl.innerHTML = spinnerHtml("Pobieranie rankingu…");
    try {
      const data = await apiGetJson({
        url: KM_RANKINGS_URL + `?type=${activeType}&period=${activePeriod}&limit=50`,
        idToken: ctx.idToken,
      });
      const entries = data?.entries || [];
      const typeLabel = { km: "km", points: "pkt", hours: "h" }[activeType] || "";

      if (!entries.length) {
        tableEl.innerHTML = `<p class="kmEmpty">Brak danych rankingowych.</p>`;
        return;
      }

      const infoText = activePeriod === "year"
        ? `<p class="kmRankNote">Ranking dotyczy bieżącego roku. Dane historyczne wliczane do rankingu wszech czasów.</p>`
        : `<p class="kmRankNote">Ranking wszech czasów — uwzględnia dane historyczne i bieżące.</p>`;

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
      loadRanking();
    });
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
                <span class="kmLogPts">${fmtNum(log.pointsTotal, 1)} pkt</span>
              </div>
              <div class="kmLogBody">
                <span class="kmLogPlace">${esc(log.placeName || "—")}</span>
                <span class="kmLogType">${esc(waterTypeLabel(log.waterType))}</span>
              </div>
              <div class="kmLogMeta">
                <span>${fmtNum(log.km)} km</span>
                ${log.hoursOnWater ? `<span>${fmtNum(log.hoursOnWater)} h</span>` : ""}
                ${log.difficulty ? `<span>${esc(log.difficulty)}</span>` : ""}
                ${capsizeTotal > 0 ? `<span>${capsizeTotal} wywrotolotek</span>` : ""}
              </div>
              ${log.note ? `<div class="kmLogNote">${esc(log.note)}</div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ─── główny render ─────────────────────────────────────────────────────────────

async function renderKmView(viewEl, routeId, ctx, moduleId) {
  const activeTab = TABS.find(t => t.id === routeId)?.id || "form";

  if (!ctx?.idToken) {
    viewEl.innerHTML = `<div class="card center"><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
    return;
  }

  viewEl.innerHTML = `
    <div class="card wide kmModule">
      <div class="moduleHeader">
        <h2>Kilometrówka</h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>
      <div class="kmTabs">
        ${TABS.map(t => `
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
      import("/core/router.js").then(({ setHash }) => {
        setHash(moduleId, btn.dataset.kmTab);
      });
    });
  });

  // Attach tooltips
  attachInfoTips(viewEl);

  // Renderuj aktywną zakładkę
  if (activeTab === "form") {
    renderFormView(inner, ctx, moduleId);
  } else if (activeTab === "rankings") {
    await renderRankingsView(inner, ctx);
  } else if (activeTab === "my-stats") {
    await renderMyStatsView(inner, ctx);
  } else if (activeTab === "my-logs") {
    await renderMyLogsView(inner, ctx);
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
