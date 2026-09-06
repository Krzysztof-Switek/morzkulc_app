import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { storageFetchKayakCoverUrl, storageFetchKayakGalleryUrls, storageFetchLifejacketUrl, storageFetchHelmetUrl, storageFetchHelmetFrontUrl } from "/core/firebase_client.js";
import { createReservationCalendar } from "/core/date_range_calendar.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const GEAR_URL = "/api/gear/kayaks";
const CREATE_BUNDLE_RESERVATION_URL = "/api/gear/reservations/create-bundle";
const UPDATE_BUNDLE_RESERVATION_ITEMS_URL = "/api/gear/reservations/update-items";
const CANCEL_RESERVATION_URL = "/api/gear/reservations/cancel";
const MY_RESERVATIONS_URL = "/api/gear/my-reservations";
const GEAR_ITEM_AVAILABILITY_URL = "/api/gear/items/availability";
const GEAR_FAVORITES_URL = "/api/gear/favorites";
const GEAR_FAVORITES_TOGGLE_URL = "/api/gear/favorites/toggle";
const KAYAK_RESERVATIONS_URL = "/api/gear/kayak-reservations";
const USER_WEIGHT_URL = "/api/user/weight";

// Lokalny placeholder dostępny zawsze z aplikacji
const PLACEHOLDER_SVG = "/assets/kayak-placeholder.png";

// Ustawia nowe zdjęcie z overlayem ładowania (kropki nad starym, wciąż widocznym
// zdjęciem — natywne zachowanie <img> samo zachowuje poprzednią klatkę, dopóki
// nowa się nie wczyta). Licznik generacji chroni przed sytuacją, w której stare
// onload/onerror odpali się już PO kolejnym swipe'ie (np. przy szybkim
// wielokrotnym przewijaniu) i błędnie schowa overlay dla aktualnie ładowanego
// zdjęcia.
function loadPhotoWithOverlay({ imgEl, overlayEl, url, bumpGen, currentGen, onError }) {
  const myGen = bumpGen();
  if (overlayEl) overlayEl.classList.remove("hidden");
  imgEl.onload = () => {
    if (currentGen() !== myGen) return;
    if (overlayEl) overlayEl.classList.add("hidden");
  };
  imgEl.onerror = () => {
    if (currentGen() !== myGen) return;
    if (overlayEl) overlayEl.classList.add("hidden");
    if (imgEl.getAttribute("src") !== PLACEHOLDER_SVG) imgEl.setAttribute("src", PLACEHOLDER_SVG);
    if (typeof onError === "function") onError();
  };
  imgEl.src = url;
}

const GEAR_TABS_PRIMARY = [
  { id: "kayaks", label: "Kajaki" },
  { id: "paddles", label: "Wiosła" },
  { id: "lifejackets", label: "Kamizelki" },
  { id: "helmets", label: "Kaski" },
  { id: "sprayskirts", label: "Fartuchy" },
];
const GEAR_TABS_SECONDARY = [
  { id: "throwbags", label: "Rzutki" },
];
const GEAR_TABS = [...GEAR_TABS_PRIMARY, ...GEAR_TABS_SECONDARY];

const GEAR_CATEGORY_SINGULAR = {
  kayaks: "Kajak",
  paddles: "Wiosło",
  lifejackets: "Kamizelka",
  helmets: "Kask",
  sprayskirts: "Fartuch",
  throwbags: "Rzutka",
};

export function createGearModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      const requestedRoute = String(routeId || "").trim() || "kayaks";

      if (requestedRoute === "club-event") {
        await renderClubEventBulkView({ viewEl, ctx, label });
        return;
      }

      const activeTab = GEAR_TABS.find((t) => t.id === requestedRoute)?.id || "kayaks";
      const activeTabLabel = GEAR_TABS.find((t) => t.id === activeTab)?.label || "Kajaki";
      const isKayaksView = activeTab === "kayaks";
      const isPaddlesView = activeTab === "paddles";
      const isLifejacketsView = activeTab === "lifejackets";
      const isHelmetsView = activeTab === "helmets";

      if (!ctx?.idToken) {
        viewEl.innerHTML = `
          <div class="card center">
            <h2>${escapeHtml(label)}</h2>
            <p>Brak tokenu sesji. Odśwież stronę.</p>
          </div>
        `;
        return;
      }

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader">
            <h2>${escapeHtml(label)} – ${escapeHtml(activeTabLabel)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>

          <div class="gearTabs" role="tablist" aria-label="Kategorie sprzętu">
            ${GEAR_TABS_PRIMARY.map((tab) => `
              <button
                type="button"
                class="gearTab ${tab.id === activeTab ? "active" : ""}"
                data-gear-tab="${escapeAttr(tab.id)}"
                aria-pressed="${tab.id === activeTab ? "true" : "false"}"
                title="${escapeAttr(tab.label)}"
              >
                <span class="gearTabIcon">${gearTabIcon(tab.id)}</span>
                <span class="gearTabLabel">${escapeHtml(tab.label)}</span>
              </button>
            `).join("")}
          </div>
          <div class="gearTabs gearTabsSecondary" role="tablist" aria-label="Kategorie sprzętu dodatkowe">
            ${GEAR_TABS_SECONDARY.map((tab) => `
              <button
                type="button"
                class="gearTab ${tab.id === activeTab ? "active" : ""}"
                data-gear-tab="${escapeAttr(tab.id)}"
                aria-pressed="${tab.id === activeTab ? "true" : "false"}"
                title="${escapeAttr(tab.label)}"
              >
                <span class="gearTabIcon">${gearTabIcon(tab.id)}</span>
                <span class="gearTabLabel">${escapeHtml(tab.label)}</span>
              </button>
            `).join("")}
          </div>

          <div class="gearToolbar">
            <div class="gearSearchSection">
              <div class="gearSearchLabel">
                <label for="gearSearch">Szukaj</label>
                <span id="gearMeta" class="hint gearMetaInline"></span>
              </div>
              <div class="gearSearchRow">
                <input
                  id="gearSearch"
                  placeholder="${escapeAttr(
                    isKayaksView ?
                      "np. Diesel, Wave sport, niebieski, creek..." :
                      isPaddlesView ?
                        "np. TNP, symetryczne, żółty, 195..." :
                        "np. Werner, L, czerwony, pool..."
                  )}"
                />
                <button id="gearReloadBtn" type="button" class="gearReloadBtn ghost" title="Odśwież" aria-label="Odśwież">${refreshIconSvg()}</button>
              </div>
            </div>

            ${
              isKayaksView ? `
                <div class="gearFiltersBar">
                  <label class="gearCheckPill" for="filterWorkingOnly">
                    <input id="filterWorkingOnly" type="checkbox" />
                    <span>Sprawny</span>
                  </label>

                  <label class="gearCheckPill" for="filterMyWeightOnly">
                    <input id="filterMyWeightOnly" type="checkbox" />
                    <span>W mojej wadze</span>
                  </label>

                  <label class="gearCheckPill" for="filterFavoritesOnly">
                    <input id="filterFavoritesOnly" type="checkbox" />
                    <span>Ulubione</span>
                  </label>

                  <label class="gearCheckPill" for="filterAvailableNowOnly">
                    <input id="filterAvailableNowOnly" type="checkbox" />
                    <span>Dostępny</span>
                  </label>

                  <label class="gearCheckPill" for="filterPoolOnly">
                    <input id="filterPoolOnly" type="checkbox" />
                    <span>Basen</span>
                  </label>

                  <label class="gearCheckPill" for="filterPrivateOnly">
                    <input id="filterPrivateOnly" type="checkbox" />
                    <span>Prywatny</span>
                  </label>

                  <label class="gearCheckPill" for="filterBrokenOnly">
                    <input id="filterBrokenOnly" type="checkbox" />
                    <span>Uszkodzony</span>
                  </label>

                  <div class="gearTypeFilter">
                    <label for="filterTypeSelect">Typ</label>
                    <select id="filterTypeSelect">
                      <option value="">Wszystkie typy</option>
                    </select>
                  </div>
                </div>
              ` : isPaddlesView ? `
                <div class="gearFiltersBar">
                  <label class="gearCheckPill" for="filterFavoritesOnly">
                    <input id="filterFavoritesOnly" type="checkbox" />
                    <span>Ulubione</span>
                  </label>

                  <div class="gearTypeFilter">
                    <label for="filterTypeSelect">Typ</label>
                    <select id="filterTypeSelect">
                      <option value="">Wszystkie typy</option>
                    </select>
                  </div>

                  <div class="gearTypeFilter">
                    <label for="filterPaddlePoolSelect">Basen</label>
                    <select id="filterPaddlePoolSelect">
                      <option value="">Wszystkie</option>
                      <option value="pool">Tylko basenowe</option>
                      <option value="nopool">Bez basenowych</option>
                    </select>
                  </div>
                </div>
              ` : `
                <div class="gearFiltersBar">
                  <label class="gearCheckPill" for="filterFavoritesOnly">
                    <input id="filterFavoritesOnly" type="checkbox" />
                    <span>Ulubione</span>
                  </label>

                  <div class="gearTypeFilter">
                    <label for="filterTypeSelect">Typ</label>
                    <select id="filterTypeSelect">
                      <option value="">Wszystkie typy</option>
                    </select>
                  </div>

                  <div class="gearTypeFilter">
                    <label for="filterSizeSelect">Rozmiar</label>
                    <select id="filterSizeSelect">
                      <option value="">Wszystkie rozmiary</option>
                    </select>
                  </div>
                </div>
              `
            }

            <div id="gearErr" class="err hidden"></div>
            <div id="gearList"></div>
          </div>
        </div>

        <div id="gearImgModal" class="gearModal hidden" aria-hidden="true">
          <div class="gearModalBackdrop" data-gear-modal-close="1"></div>
          <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Zdjęcie sprzętu">
            <div class="gearModalTop">
              <div class="gearModalTitle" id="gearModalTitle">Zdjęcie</div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span id="gearModalCounter" class="hint" style="font-size:13px;"></span>
                <button class="gearModalClose" type="button" data-gear-modal-close="1" aria-label="Zamknij">✕</button>
              </div>
            </div>
            <div class="gearModalBody">
              <div class="gearImgViewer">
                <button id="gearModalPrevBtn" type="button" class="gearImgNavBtn gearImgNavPrev hidden" aria-label="Poprzednie zdjęcie">&#8249;</button>
                <img id="gearModalImg" alt="Zdjęcie sprzętu" />
                <button id="gearModalNextBtn" type="button" class="gearImgNavBtn gearImgNavNext hidden" aria-label="Następne zdjęcie">&#8250;</button>
                <div id="gearModalLoading" class="gearPhotoLoading hidden" aria-hidden="true"><div class="spinner"></div></div>
              </div>
              <span class="hint" id="gearModalHint" style="text-align:center; display:block; margin-top:6px; min-height:16px;"></span>
            </div>
          </div>
        </div>

        <div id="gearBundleModal" class="gearModal hidden" aria-hidden="true">
          <div class="gearModalBackdrop" data-gear-bundle-close="1"></div>
          <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Rezerwacja sprzętu">
            <div class="gearModalTop">
              <div class="gearModalTitle" id="gearBundleTitle">Rezerwacja sprzętu</div>
              <button class="gearModalClose" type="button" data-gear-bundle-close="1" aria-label="Zamknij">✕</button>
            </div>

            <div class="gearModalBody">
              <div style="width:100%; max-width:520px;">
                <div id="bundleInfo" class="hint" style="margin-bottom:10px;">
                  Wybierz termin i zarezerwuj sprzęt.
                </div>

                <div id="bundleOk" class="ok hidden" style="margin-bottom:10px;"></div>
                <div id="bundleErr" class="err hidden" style="margin-bottom:10px;"></div>

                <div id="bundleClubEventRow" class="hidden" style="margin-bottom:10px;">
                  <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input type="checkbox" id="bundleClubEventToggle" /> Rezerwuję na imprezę klubową
                  </label>
                  <select id="bundleClubEventSelect" class="hidden" style="margin-top:6px; width:100%;"></select>
                  <div class="hint" id="bundleClubEventHint" style="margin-top:4px;"></div>
                </div>

                <div id="bundleDateCalendar"></div>
                <input id="bundleStartDate" type="date" class="hidden" />
                <input id="bundleEndDate" type="date" class="hidden" />

                <div id="bundleItemsSection" style="margin-top:14px;">
                  <div style="font-weight:600; margin-bottom:6px;">Zarezerwowany sprzęt:</div>
                  <div id="bundleItemsList" style="display:flex; flex-direction:column; gap:4px;"></div>
                </div>

                <div id="bundleAddSection" style="margin-top:14px;">
                  <div style="font-weight:600; margin-bottom:6px;">Dodaj sprzęt z kategorii:</div>
                  <div id="bundleAddCatBtns" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;"></div>
                </div>

                <div id="bundleAvailabilitySection" class="hidden" style="margin-top:14px;">
                  <div style="font-weight:600; margin-bottom:6px;" id="bundleAvailabilityTitle">Dostępność w wybranym terminie:</div>
                  <div id="bundleAvailabilityList" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
                </div>
              </div>
            </div>

            <div class="gearModalActions">
              <button id="bundleCreateBtn" type="button" class="primary">Zapisz rezerwację</button>
              <button type="button" class="ghost ghostCancel" data-gear-bundle-close="1">Anuluj</button>
            </div>
          </div>
        </div>

        <div id="gearWeightModal" class="gearModal hidden" aria-hidden="true">
          <div class="gearModalBackdrop" data-gear-weight-close="1"></div>
          <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Twoja waga">
            <div class="gearModalTop">
              <div class="gearModalTitle">Podaj swoją wagę</div>
              <button class="gearModalClose" type="button" data-gear-weight-close="1" aria-label="Zamknij">✕</button>
            </div>
            <div class="gearModalBody">
              <div style="width:100%; max-width:400px;">
                <p class="hint" style="margin-bottom:12px;">Potrzebujemy Twojej wagi, żeby pokazać kajaki w odpowiednim zakresie. Dane są zapisywane na Twoim koncie.</p>
                <div id="gearWeightErr" class="err hidden" style="margin-bottom:10px;"></div>
                <div class="row" style="margin:0;">
                  <label for="gearWeightInput">Waga (kg)</label>
                  <input id="gearWeightInput" type="number" min="30" max="250" placeholder="np. 75" />
                </div>
              </div>
            </div>
            <div class="gearModalActions">
              <button id="gearWeightSaveBtn" type="button" class="primary">Zapisz</button>
              <button type="button" class="ghost ghostCancel" data-gear-weight-close="1">Anuluj</button>
            </div>
          </div>
        </div>
      `;

      const tabButtons = viewEl.querySelectorAll("[data-gear-tab]");
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const tabId = String(btn.getAttribute("data-gear-tab") || "").trim();
          if (!tabId || tabId === activeTab) return;
          window.location.hash = `#${id}/${tabId}`;
        });
      });

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
        window.location.hash = "#home/home";
      });
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
        window.location.hash = "#home/home";
      });

      const errEl = viewEl.querySelector("#gearErr");
      const listEl = viewEl.querySelector("#gearList");
      const metaEl = viewEl.querySelector("#gearMeta");
      const reloadBtn = viewEl.querySelector("#gearReloadBtn");
      const searchEl = viewEl.querySelector("#gearSearch");
      const filterTypeSelectEl = viewEl.querySelector("#filterTypeSelect");

      const filterWorkingOnlyEl = viewEl.querySelector("#filterWorkingOnly");
      const filterAvailableNowOnlyEl = viewEl.querySelector("#filterAvailableNowOnly");
      const filterFavoritesOnlyEl = viewEl.querySelector("#filterFavoritesOnly");
      const filterPoolOnlyEl = viewEl.querySelector("#filterPoolOnly");
      const filterPrivateOnlyEl = viewEl.querySelector("#filterPrivateOnly");
      const filterMyWeightOnlyEl = viewEl.querySelector("#filterMyWeightOnly");
      const filterBrokenOnlyEl = viewEl.querySelector("#filterBrokenOnly");

      const weightModalEl = viewEl.querySelector("#gearWeightModal");
      const weightInputEl = viewEl.querySelector("#gearWeightInput");
      const weightSaveBtnEl = viewEl.querySelector("#gearWeightSaveBtn");
      const weightErrEl = viewEl.querySelector("#gearWeightErr");
      const filterSizeSelectEl = viewEl.querySelector("#filterSizeSelect");
      const filterPaddlePoolSelectEl = viewEl.querySelector("#filterPaddlePoolSelect");

      const bundleModalEl = viewEl.querySelector("#gearBundleModal");
      const bundleTitleEl = viewEl.querySelector("#gearBundleTitle");
      const bundleInfoEl = viewEl.querySelector("#bundleInfo");
      const bundleOkEl = viewEl.querySelector("#bundleOk");
      const bundleErrEl = viewEl.querySelector("#bundleErr");
      const bundleStartDateEl = viewEl.querySelector("#bundleStartDate");
      const bundleEndDateEl = viewEl.querySelector("#bundleEndDate");
      const bundleDateCalendarEl = viewEl.querySelector("#bundleDateCalendar");
      const bundleClubEventRowEl = viewEl.querySelector("#bundleClubEventRow");
      const bundleClubEventToggleEl = viewEl.querySelector("#bundleClubEventToggle");
      const bundleClubEventSelectEl = viewEl.querySelector("#bundleClubEventSelect");
      const bundleClubEventHintEl = viewEl.querySelector("#bundleClubEventHint");
      const bundleItemsListEl = viewEl.querySelector("#bundleItemsList");
      const bundleAddCatBtnsEl = viewEl.querySelector("#bundleAddCatBtns");
      const bundleAvailabilitySectionEl = viewEl.querySelector("#bundleAvailabilitySection");
      const bundleAvailabilityTitleEl = viewEl.querySelector("#bundleAvailabilityTitle");
      const bundleAvailabilityListEl = viewEl.querySelector("#bundleAvailabilityList");
      const bundleCreateBtn = viewEl.querySelector("#bundleCreateBtn");

      // Bundle state: starter item + accumulated items to reserve
      let bundleStarterCategory = "";
      let bundleStarterItemId = "";
      // Category currently shown in the availability panel
      let bundleAvailabilityCategory = "";
      // Each entry: { itemId, category, label }
      let bundleItems = [];
      // Uchwyt do bieżącej instancji kalendarza wyboru terminu (jedna na otwarcie modala)
      let bundleCalendar = null;

      // Imprezy klubowe, których uid jest AKTUALNIE kierownikiem — może być
      // więcej niż jedna naraz (patrz registerUserHandler.ts::resolveKierownikSummary).
      // Select widoczny tylko gdy >1, żeby zachowanie przy jednej imprezie
      // było identyczne jak wcześniej (bez dodatkowego wyboru).
      const getActiveKierownikEvents = () => Array.isArray(ctx?.session?.activeKierownikEvents) ? ctx.session.activeKierownikEvents : [];
      const getSelectedClubEvent = () => {
        const events = getActiveKierownikEvents();
        if (!events.length) return null;
        if (events.length === 1) return events[0];
        const selectedId = bundleClubEventSelectEl?.value || "";
        return events.find((e) => e.id === selectedId) || events[0];
      };

      const modalEl = viewEl.querySelector("#gearImgModal");
      const modalImgEl = viewEl.querySelector("#gearModalImg");
      const modalTitleEl = viewEl.querySelector("#gearModalTitle");
      const modalHintEl = viewEl.querySelector("#gearModalHint");
      const modalCounterEl = viewEl.querySelector("#gearModalCounter");
      const modalPrevBtn = viewEl.querySelector("#gearModalPrevBtn");
      const modalNextBtn = viewEl.querySelector("#gearModalNextBtn");
      const modalLoadingEl = viewEl.querySelector("#gearModalLoading");

      let all = [];
      let favSet = new Set();
      let userWeight = null;
      // Per-card photo state for in-list swipe: Map<kayakNumber, { urls: string[], idx: number, loaded: boolean }>
      const photoState = new Map();

      const setErr = (msg) => {
        errEl.textContent = String(msg || "");
        errEl.classList.toggle("hidden", !errEl.textContent);
      };

      const setWeightErr = (msg) => {
        if (!weightErrEl) return;
        weightErrEl.textContent = String(msg || "");
        weightErrEl.classList.toggle("hidden", !weightErrEl.textContent);
      };

      const openWeightModal = () => {
        if (!weightModalEl) return;
        weightModalEl.classList.remove("hidden");
        weightModalEl.setAttribute("aria-hidden", "false");
        if (weightInputEl) weightInputEl.value = "";
        setWeightErr("");
      };

      const closeWeightModal = () => {
        if (!weightModalEl) return;
        weightModalEl.classList.add("hidden");
        weightModalEl.setAttribute("aria-hidden", "true");
      };

      const loadAndRenderReservations = async (kayakId, containerEl, category = "kayaks") => {
        containerEl.innerHTML = `<div class="gearReservNoData">Ładuję...</div>`;
        try {
          const resp = await apiGetJson({
            url: `${KAYAK_RESERVATIONS_URL}?kayakId=${encodeURIComponent(kayakId)}&category=${encodeURIComponent(category)}`,
            idToken: ctx.idToken,
          });
          const reservations = Array.isArray(resp?.reservations) ? resp.reservations : [];
          containerEl.innerHTML = renderReservationsSimple(reservations);
        } catch {
          containerEl.innerHTML = `<div class="gearReservNoData">Nie udało się załadować.</div>`;
        }
      };

      // Zajęte zakresy dla kalendarza wyboru terminu w modalu bundlowym — jeden fetch
      // per otwarcie modala (starter item), niezależny od loadAndRenderReservations
      // powyżej (ta zwraca gotowy HTML, tu potrzebne są surowe zakresy dla kalendarza).
      const loadOccupiedRanges = async (category, itemId) => {
        try {
          const resp = await apiGetJson({
            url: `${KAYAK_RESERVATIONS_URL}?category=${encodeURIComponent(category)}&itemId=${encodeURIComponent(itemId)}`,
            idToken: ctx.idToken,
          });
          const reservations = Array.isArray(resp?.reservations) ? resp.reservations : [];
          return reservations.map((r) => ({
            startIso: String(r.blockStartIso || r.startDate || ""),
            endIso: String(r.blockEndIso || r.endDate || ""),
            label: r.isClubEvent ?
              (r.eventName ? `Rezerwacja „${r.eventName}”` : "Rezerwacja (impreza klubowa)") :
              String(r.userDisplayName || ""),
          })).filter((r) => r.startIso && r.endIso);
        } catch {
          return [];
        }
      };

      // ── Bundle modal helpers ────────────────────────────────────────────────

      function renderBundleCatButtons() {
        if (!bundleAddCatBtnsEl) return;
        bundleAddCatBtnsEl.innerHTML = GEAR_TABS.map((tab) => `
          <button
            type="button"
            class="gearTab${tab.id === bundleAvailabilityCategory ? " active" : ""}"
            data-bundle-cat-btn="${escapeAttr(tab.id)}"
            style="font-size:0.8em; padding:4px 10px;"
          >${escapeHtml(tab.label)}</button>
        `).join("");
      }

      function renderBundleItemsList() {
        if (!bundleItemsListEl) return;
        bundleItemsListEl.innerHTML = bundleItems.map((bi) => {
          const catLabel = GEAR_CATEGORY_SINGULAR[bi.category] || bi.category;
          return `
          <div class="bundleItemRow">
            <span class="bundleItemRowText"><strong>${escapeHtml(catLabel)}:</strong> ${escapeHtml(bi.label)}</span>
            <button
              type="button"
              class="bundleItemRemoveBtn"
              data-bundle-remove-id="${escapeAttr(bi.itemId)}"
              data-bundle-remove-cat="${escapeAttr(bi.category)}"
              aria-label="Usuń ${escapeAttr(bi.label)}"
            >✕</button>
          </div>
        `;
        }).join("") || `<span class="hint">Brak pozycji.</span>`;
      }

      const clearBundleModal = () => {
        bundleStarterCategory = "";
        bundleStarterItemId = "";
        bundleAvailabilityCategory = "";
        bundleItems = [];
        if (bundleStartDateEl) bundleStartDateEl.value = "";
        if (bundleEndDateEl) bundleEndDateEl.value = "";
        if (bundleDateCalendarEl) { bundleDateCalendarEl.innerHTML = ""; bundleDateCalendarEl.classList.remove("hidden"); }
        bundleCalendar = null;
        if (bundleClubEventToggleEl) bundleClubEventToggleEl.checked = false;
        if (bundleClubEventSelectEl) { bundleClubEventSelectEl.classList.add("hidden"); bundleClubEventSelectEl.innerHTML = ""; }
        if (bundleClubEventHintEl) bundleClubEventHintEl.textContent = "";
        if (bundleCreateBtn) bundleCreateBtn.disabled = true;
        if (bundleOkEl) { bundleOkEl.textContent = ""; bundleOkEl.classList.add("hidden"); }
        if (bundleErrEl) { bundleErrEl.textContent = ""; bundleErrEl.classList.add("hidden"); }
        if (bundleAvailabilitySectionEl) bundleAvailabilitySectionEl.classList.add("hidden");
        if (bundleAvailabilityListEl) bundleAvailabilityListEl.innerHTML = "";
        renderBundleItemsList();
        renderBundleCatButtons();
      };

      const openBundleModal = () => {
        if (!bundleModalEl) return;
        bundleModalEl.classList.remove("hidden");
        bundleModalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      };

      const closeBundleModal = () => {
        if (!bundleModalEl) return;
        bundleModalEl.classList.add("hidden");
        bundleModalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        clearBundleModal();
      };

      const startBundleForItem = (itemId, category, label) => {
        clearBundleModal();
        bundleStarterCategory = String(category || "");
        bundleStarterItemId = String(itemId || "");
        bundleAvailabilityCategory = String(category || "");
        bundleItems = [{ itemId: String(itemId || ""), category: String(category || ""), label: String(label || itemId || "?") }];
        if (bundleTitleEl) bundleTitleEl.textContent = `Rezerwacja – ${label}`;
        if (bundleInfoEl) {
          bundleInfoEl.textContent = isSympatyk
            ? "Podgląd: możesz sprawdzić dostępność i zobaczyć jak działa kalendarz (bufory, konflikty terminów). Zapisywanie rezerwacji jest dostępne dla członków klubu."
            : "Wybierz termin w kalendarzu i zapisz rezerwację.";
        }
        renderBundleItemsList();
        renderBundleCatButtons();
        openBundleModal();

        const kierownikEvents = getActiveKierownikEvents();
        const canReserveAsClubEvent = Boolean(!isSympatyk && ctx?.session?.isActiveKierownik && kierownikEvents.length);
        if (bundleClubEventRowEl) bundleClubEventRowEl.classList.toggle("hidden", !canReserveAsClubEvent);
        if (bundleClubEventSelectEl) {
          const showSelect = canReserveAsClubEvent && kierownikEvents.length > 1;
          bundleClubEventSelectEl.classList.toggle("hidden", !showSelect);
          if (showSelect) {
            bundleClubEventSelectEl.innerHTML = kierownikEvents.map((e) => `<option value="${escapeAttr(e.id)}">${escapeHtml(e.name)} (${escapeHtml(formatDatePLFromIso(e.startDate))} – ${escapeHtml(formatDatePLFromIso(e.endDate))})</option>`).join("");
          }
        }
        if (bundleClubEventHintEl && canReserveAsClubEvent) {
          const ev = getSelectedClubEvent();
          bundleClubEventHintEl.textContent = `Termin: ${formatDatePLFromIso(ev.startDate)} – ${formatDatePLFromIso(ev.endDate)} (daty imprezy, bezpłatnie, bez limitu ilości).`;
        }

        if (bundleDateCalendarEl) {
          bundleCalendar = createReservationCalendar({
            containerEl: bundleDateCalendarEl,
            onRangeChange: (startIso, endIso) => {
              if (bundleStartDateEl) bundleStartDateEl.value = startIso || "";
              if (bundleEndDateEl) bundleEndDateEl.value = endIso || "";
              if (bundleCreateBtn) bundleCreateBtn.disabled = isSympatyk ? true : !(startIso && endIso);
            },
          });
          loadOccupiedRanges(bundleStarterCategory, bundleStarterItemId).then((ranges) => {
            bundleCalendar?.setOccupiedRanges(ranges);
          });
        }
      };

      const checkBundleAvailability = async () => {
        const startDate = String(bundleStartDateEl?.value || "").trim();
        const endDate = String(bundleEndDateEl?.value || "").trim();
        if (!startDate || !endDate) {
          if (bundleErrEl) { bundleErrEl.textContent = "Wybierz datę od i do."; bundleErrEl.classList.remove("hidden"); }
          return;
        }
        if (!bundleAvailabilityCategory) {
          if (bundleErrEl) { bundleErrEl.textContent = "Wybierz kategorię sprzętu."; bundleErrEl.classList.remove("hidden"); }
          return;
        }
        if (bundleErrEl) { bundleErrEl.textContent = ""; bundleErrEl.classList.add("hidden"); }
        if (bundleAvailabilitySectionEl) bundleAvailabilitySectionEl.classList.remove("hidden");
        const catLabel = GEAR_TABS.find((t) => t.id === bundleAvailabilityCategory)?.label || bundleAvailabilityCategory;
        if (bundleAvailabilityTitleEl) bundleAvailabilityTitleEl.textContent = `Sprawdzam dostępność (${catLabel})...`;
        if (bundleAvailabilityListEl) bundleAvailabilityListEl.innerHTML = "";

        try {
          const url = `${GEAR_ITEM_AVAILABILITY_URL}?category=${encodeURIComponent(bundleAvailabilityCategory)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
          const resp = await apiGetJson({ url, idToken: ctx.idToken });
          const items = Array.isArray(resp?.items) ? resp.items : [];
          if (bundleAvailabilityTitleEl) bundleAvailabilityTitleEl.textContent = `Dostępność – ${escapeHtml(catLabel)} (${items.length} szt.):`;
          if (bundleAvailabilityListEl) bundleAvailabilityListEl.innerHTML = items.map((it) => {
            const available = it?.isAvailableForRange !== false;
            const alreadySelected = bundleItems.some((bi) => bi.itemId === String(it?.id || "") && bi.category === bundleAvailabilityCategory);
            const chipClass = available ? "bundleAvailChip bundleAvailChipOk" : "bundleAvailChip bundleAvailChipTaken";
            const label = (bundleAvailabilityCategory === "kayaks" ? buildKayakTitle(it) : buildGenericGearTitle(it)) || String(it?.number || it?.id || "?");
            if (!available) {
              return `<div class="${chipClass}">${escapeHtml(label)} – zajęty</div>`;
            }
            if (alreadySelected) {
              return `<div class="${chipClass} bundleAvailChipSelected">${escapeHtml(label)} – dodany</div>`;
            }
            return `<button
              type="button"
              class="${chipClass}"
              data-bundle-avail-add-id="${escapeAttr(String(it?.id || ""))}"
              data-bundle-avail-add-cat="${escapeAttr(bundleAvailabilityCategory)}"
              data-bundle-avail-add-label="${escapeAttr(label)}"
            >${escapeHtml(label)} – dostępny ✓</button>`;
          }).join("") || `<span class="hint">Brak wyników.</span>`;
        } catch (e) {
          if (bundleAvailabilityTitleEl) bundleAvailabilityTitleEl.textContent = "Błąd sprawdzania dostępności.";
          if (bundleAvailabilityListEl) bundleAvailabilityListEl.innerHTML = `<span class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się sprawdzić dostępności."))}</span>`;
        }
      };

      const submitBundleReservation = async () => {
        if (bundleOkEl) { bundleOkEl.textContent = ""; bundleOkEl.classList.add("hidden"); }
        if (bundleErrEl) { bundleErrEl.textContent = ""; bundleErrEl.classList.add("hidden"); }

        const startDate = String(bundleStartDateEl?.value || "").trim();
        const endDate = String(bundleEndDateEl?.value || "").trim();

        if (!startDate || !endDate) {
          if (bundleErrEl) { bundleErrEl.textContent = "Wybierz datę od i do."; bundleErrEl.classList.remove("hidden"); }
          return;
        }

        if (!bundleItems.length) {
          if (bundleErrEl) { bundleErrEl.textContent = "Brak pozycji do zarezerwowania."; bundleErrEl.classList.remove("hidden"); }
          return;
        }

        if (bundleCreateBtn) bundleCreateBtn.disabled = true;

        try {
          const resp = await apiPostJson({
            url: CREATE_BUNDLE_RESERVATION_URL,
            idToken: ctx.idToken,
            body: {
              startDate,
              endDate,
              items: bundleItems.map(({ itemId, category }) => ({ itemId, category })),
              starterCategory: bundleStarterCategory,
              starterItemId: bundleStarterItemId,
              asClubEvent: !!bundleClubEventToggleEl?.checked,
              eventId: bundleClubEventToggleEl?.checked ? (getSelectedClubEvent()?.id || undefined) : undefined,
            }
          });

          if (bundleOkEl) {
            bundleOkEl.textContent = resp?.eventId
              ? "Rezerwacja zapisana. Zarezerwowano na imprezę klubową (bezpłatnie)."
              : resp?.waived
                ? "Rezerwacja zapisana. Wypożyczenie bezpłatne (szkoleniówka)."
                : `Rezerwacja zapisana.${resp?.costHours ? ` Godzinki: ${resp.costHours}` : ""}`;
            bundleOkEl.classList.remove("hidden");
          }

          // Refresh the current tab
          await loadGear(activeTab);

          window.setTimeout(() => closeBundleModal(), 800);
        } catch (e) {
          if (bundleErrEl) {
            bundleErrEl.textContent = mapUserFacingApiError(e, "Nie udało się zapisać rezerwacji.");
            bundleErrEl.classList.remove("hidden");
          }
        } finally {
          if (bundleCreateBtn) bundleCreateBtn.disabled = false;
        }
      };

      bundleModalEl?.addEventListener("click", async (ev) => {
        const t = ev.target;
        if (!t) return;

        if (t.getAttribute && t.getAttribute("data-gear-bundle-close") === "1") {
          closeBundleModal();
          return;
        }

        const removeBtn = t.closest && t.closest("[data-bundle-remove-id]");
        if (removeBtn) {
          const removeId = String(removeBtn.getAttribute("data-bundle-remove-id") || "");
          const removeCat = String(removeBtn.getAttribute("data-bundle-remove-cat") || "");
          bundleItems = bundleItems.filter((bi) => !(bi.itemId === removeId && bi.category === removeCat));
          renderBundleItemsList();
          return;
        }

        const catBtn = t.closest && t.closest("[data-bundle-cat-btn]");
        if (catBtn) {
          const newCat = String(catBtn.getAttribute("data-bundle-cat-btn") || "");
          if (newCat && newCat !== bundleAvailabilityCategory) {
            bundleAvailabilityCategory = newCat;
            renderBundleCatButtons();
          }
          const startDate = String(bundleStartDateEl?.value || "").trim();
          const endDate = String(bundleEndDateEl?.value || "").trim();
          if (startDate && endDate) {
            await checkBundleAvailability();
          } else {
            if (bundleAvailabilitySectionEl) bundleAvailabilitySectionEl.classList.add("hidden");
            if (bundleAvailabilityListEl) bundleAvailabilityListEl.innerHTML = "";
          }
          return;
        }

        const addBtn = t.closest && t.closest("[data-bundle-avail-add-id]");
        if (addBtn) {
          const addId = String(addBtn.getAttribute("data-bundle-avail-add-id") || "");
          const addCat = String(addBtn.getAttribute("data-bundle-avail-add-cat") || "");
          const addLabel = String(addBtn.getAttribute("data-bundle-avail-add-label") || addId);
          if (!bundleItems.some((bi) => bi.itemId === addId && bi.category === addCat)) {
            bundleItems.push({ itemId: addId, category: addCat, label: addLabel });
            renderBundleItemsList();
            // Re-render availability to mark this item as added
            if (bundleAvailabilityListEl) {
              bundleAvailabilityListEl.querySelectorAll(`[data-bundle-avail-add-id="${CSS.escape(addId)}"]`).forEach((btn) => {
                btn.className = "bundleAvailChip bundleAvailChipOk bundleAvailChipSelected";
                btn.textContent = `${addLabel} – dodany`;
                btn.removeAttribute("data-bundle-avail-add-id");
              });
            }
          }
          return;
        }
      });

      bundleCreateBtn?.addEventListener("click", async () => {
        await submitBundleReservation();
      });

      const applyClubEventDates = () => {
        const ev = getSelectedClubEvent();
        if (!ev) return;
        bundleCalendar?.reset();
        if (bundleDateCalendarEl) bundleDateCalendarEl.classList.add("hidden");
        if (bundleStartDateEl) bundleStartDateEl.value = ev.startDate || "";
        if (bundleEndDateEl) bundleEndDateEl.value = ev.endDate || "";
        if (bundleClubEventHintEl) {
          bundleClubEventHintEl.textContent = `Termin: ${formatDatePLFromIso(ev.startDate)} – ${formatDatePLFromIso(ev.endDate)} (daty imprezy, bezpłatnie, bez limitu ilości).`;
        }
        if (bundleCreateBtn) bundleCreateBtn.disabled = bundleItems.length === 0;
      };

      bundleClubEventToggleEl?.addEventListener("change", () => {
        const checked = bundleClubEventToggleEl.checked;
        if (checked && getSelectedClubEvent()) {
          // Termin ustalony przez serwer (daty imprezy) — kalendarz wyboru nie ma
          // tu zastosowania, chowamy go i wypełniamy ukryte pola bezpośrednio.
          applyClubEventDates();
        } else {
          if (bundleDateCalendarEl) bundleDateCalendarEl.classList.remove("hidden");
          bundleCalendar?.reset();
        }
      });

      bundleClubEventSelectEl?.addEventListener("change", () => {
        if (bundleClubEventToggleEl?.checked) applyClubEventDates();
      });

      const populateTypeFilter = (items) => {
        if (!filterTypeSelectEl) return;

        const currentValue = String(filterTypeSelectEl.value || "");
        const types = Array.from(
          new Set(
            items
              .map((item) => normalizeTypeValue(item?.type))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "pl"));

        filterTypeSelectEl.innerHTML = `
          <option value="">Wszystkie typy</option>
          ${types.map((type) => `<option value="${escapeAttr(type)}">${escapeHtml(type)}</option>`).join("")}
        `;

        if (types.includes(currentValue)) {
          filterTypeSelectEl.value = currentValue;
        }
      };

      const populateSizeFilter = (items) => {
        if (!filterSizeSelectEl) return;

        const currentValue = String(filterSizeSelectEl.value || "");
        const sizes = Array.from(
          new Set(
            items
              .map((item) => normalizeSimpleValue(item?.size))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, "pl"));

        filterSizeSelectEl.innerHTML = `
          <option value="">Wszystkie rozmiary</option>
          ${sizes.map((size) => `<option value="${escapeAttr(size)}">${escapeHtml(size)}</option>`).join("")}
        `;

        if (sizes.includes(currentValue)) {
          filterSizeSelectEl.value = currentValue;
        }
      };

      const isKursant = ctx?.kursPreviewMode || ctx?.session?.role_key === "rola_kursant";
      const isSympatyk = ctx?.session?.role_key === "rola_sympatyk";
      // Sympatyk może otworzyć kalendarz i zobaczyć całą funkcjonalność (dostępność,
      // bufory, konflikty) — zapisanie rezerwacji zostaje zablokowane dopiero w modalu
      // (patrz startBundleForItem), nie na poziomie samego przycisku "Rezerwuj".
      // Kursant nadal tylko w oknie szkoleniówki.
      const canUserReserve = isKursant ? ctx?.kursWypozycza === true : true;

      const render = (items) => {
        if (!items.length) {
          listEl.innerHTML = `<div class="hint">Brak wyników.</div>`;
          metaEl.textContent = `Widoczne: 0 / ${all.length}`;
          return;
        }

        const cards = isKayaksView
          ? items.map((k) => renderKayakCard(k, favSet.has(String(k?.id || "")), canUserReserve)).join("")
          : isPaddlesView
            ? items.map((item) => renderPaddleCard(item, favSet.has(String(item?.id || "")), canUserReserve)).join("")
            : isLifejacketsView
              ? items.map((item) => renderLifejacketCard(item, favSet.has(String(item?.id || "")), canUserReserve)).join("")
              : isHelmetsView
                ? items.map((item) => renderHelmetCard(item, favSet.has(String(item?.id || "")), canUserReserve)).join("")
                : items.map((item) => renderGenericGearCard(item, favSet.has(String(item?.id || "")), canUserReserve)).join("");

        listEl.innerHTML = `
          <div class="gearGrid">
            ${cards}
          </div>
        `;

        metaEl.textContent = `Widoczne: ${items.length} / ${all.length}`;

        if (isKayaksView) {
          listEl.querySelectorAll("img[data-cover-number]").forEach((imgEl) => {
            const num = String(imgEl.getAttribute("data-cover-number") || "");
            if (!num) return;
            storageFetchKayakCoverUrl(num)
              .then((url) => {
                if (!url) return;
                // Track photo state for in-list swipe
                if (!photoState.has(num)) {
                  photoState.set(num, { urls: [url], idx: 0, loaded: false, gen: 0 });
                } else {
                  const s = photoState.get(num);
                  if (!s.urls.includes(url)) s.urls[0] = url;
                }
                // Restore last-viewed photo index if list was re-rendered mid-swipe
                const s = photoState.get(num);
                const displayUrl = s.urls[s.idx] || url;
                imgEl.src = displayUrl;
                imgEl.classList.add("gearCoverLoaded");
                const btn = imgEl.closest("[data-gear-kayak-cover]");
                if (btn) btn.setAttribute("data-loaded-cover-url", url);
                // Show counter if already has multiple photos
                const counter = btn && btn.querySelector(".gearImgCounter");
                if (counter && s.urls.length > 1) {
                  counter.textContent = `${s.idx + 1}/${s.urls.length}`;
                  counter.hidden = false;
                }
              })
              .catch((err) => console.error("[Storage] cover load failed for", num, err));
          });
        }

        if (isLifejacketsView) {
          listEl.querySelectorAll("img[data-lifejacket-number]").forEach((imgEl) => {
            const num = String(imgEl.getAttribute("data-lifejacket-number") || "");
            if (!num) return;
            storageFetchLifejacketUrl(num)
              .then((url) => {
                if (!url) return;
                imgEl.src = url;
                imgEl.classList.add("gearCoverLoaded");
                const btn = imgEl.closest("[data-gear-lifejacket-cover]");
                if (btn) btn.setAttribute("data-loaded-cover-url", url);
              })
              .catch(() => {});
          });
        }

        if (isHelmetsView) {
          listEl.querySelectorAll("img[data-helmet-number]").forEach((imgEl) => {
            const num = String(imgEl.getAttribute("data-helmet-number") || "");
            if (!num) return;
            Promise.all([
              storageFetchHelmetUrl(num),
              storageFetchHelmetFrontUrl(num),
            ]).then(([bokUrl, frontUrl]) => {
              if (!bokUrl) return;
              imgEl.src = bokUrl;
              imgEl.classList.add("gearCoverLoaded");
              const btn = imgEl.closest("[data-gear-helmet-cover]");
              if (btn) {
                btn.setAttribute("data-loaded-cover-url", bokUrl);
                if (frontUrl) btn.setAttribute("data-loaded-front-url", frontUrl);
              }
            }).catch(() => {});
          });
        }
      };

      const applyFilter = () => {
        const q = String(searchEl.value || "").trim().toLowerCase();
        const selectedType = normalizeTypeValue(filterTypeSelectEl?.value || "");
        const favoritesOnly = filterFavoritesOnlyEl?.checked === true;

        const filtered = all.filter((item) => {
          if (favoritesOnly && !favSet.has(String(item?.id || ""))) return false;

          if (selectedType) {
            const itemType = normalizeTypeValue(item?.type);
            if (itemType !== selectedType) return false;
          }

          if (isKayaksView) {
            const workingOnly = filterWorkingOnlyEl?.checked === true;
            const availableNowOnly = filterAvailableNowOnlyEl?.checked === true;
            const poolOnly = filterPoolOnlyEl?.checked === true;
            const privateOnly = filterPrivateOnlyEl?.checked === true;
            const myWeightOnly = filterMyWeightOnlyEl?.checked === true;
            const brokenOnly = filterBrokenOnlyEl?.checked === true;

            if (workingOnly && !isWorking(item)) return false;
            if (availableNowOnly && item?.isReservedNow === true) return false;
            if (brokenOnly && isWorking(item)) return false;
            if (poolOnly) {
              const storageVal = String(item?.storage || item?.storedAt || "").trim().toLowerCase();
              if (storageVal !== "basen") return false;
            }
            if (privateOnly && !toBool(item?.isPrivate)) return false;
            if (myWeightOnly) {
              if (userWeight === null) return false;
              const maxW = parseWeightRangeMax(item?.weightRange);
              if (maxW === null) return false;
              if (maxW - userWeight < 5) return false;
            }
          } else if (isPaddlesView) {
            const poolFilter = filterPaddlePoolSelectEl?.value || "";
            if (poolFilter) {
              const isPool = toBool(item?.isPoolAllowed);
              if (poolFilter === "pool" && !isPool) return false;
              if (poolFilter === "nopool" && isPool) return false;
            }
          } else {
            const selectedSize = normalizeSimpleValue(filterSizeSelectEl?.value || "");
            if (selectedSize) {
              const itemSize = normalizeSimpleValue(item?.size);
              if (itemSize !== selectedSize) return false;
            }
          }

          if (!q) return true;

          const hay = isKayaksView
            ? [
              item?.number,
              item?.brand,
              item?.model,
              item?.type,
              item?.color,
              item?.status,
              item?.reservedNowLabel,
              item?.liters,
              item?.weightRange,
              item?.storage,
              item?.notes,
              item?.owner,
              item?.deck,
              item?.cockpit,
              item?.material
            ]
            : isPaddlesView
              ? [
                item?.number,
                item?.brand,
                item?.model,
                item?.type,
                item?.color,
                item?.status,
                item?.notes,
                item?.lengthCm,
                item?.featherAngle,
              ]
              : [
                item?.number,
                item?.brand,
                item?.model,
                item?.type,
                item?.color,
                item?.size,
                item?.status,
                item?.notes,
                item?.gearCategory,
                item?.gearCategoryDisplay,
                item?.meta?.lengthCm,
                item?.meta?.featherAngle,
                item?.meta?.buoyancy,
                item?.meta?.material,
                item?.meta?.tunnelSize
              ];

          const haystack = hay
            .map((x) => String(x || "").toLowerCase())
            .join(" ");

          return haystack.includes(q);
        });

        render(filtered);
      };

      const loadFavorites = async (category) => {
        try {
          const resp = await apiGetJson({
            url: `${GEAR_FAVORITES_URL}?category=${encodeURIComponent(category)}`,
            idToken: ctx.idToken,
          });
          favSet = new Set(Array.isArray(resp?.favoriteIds) ? resp.favoriteIds : []);
        } catch {
          favSet = new Set();
        }
      };

      const loadGear = async (category) => {
        setErr("");
        listEl.innerHTML = `<div class="hint">Ładuję...</div>`;
        metaEl.textContent = "";

        try {
          const url = `${GEAR_URL}?category=${encodeURIComponent(category)}`;
          const [resp] = await Promise.all([
            apiGetJson({ url, idToken: ctx.idToken }),
            loadFavorites(category),
          ]);

          if (category === "kayaks") {
            all = Array.isArray(resp?.kayaks) ? resp.kayaks : [];
          } else {
            all = Array.isArray(resp?.items) ? resp.items : [];
          }

          populateTypeFilter(all);
          populateSizeFilter(all);
          applyFilter();
        } catch (e) {
          setErr(
            mapUserFacingApiError(
              e,
              category === "kayaks" ? "Nie udało się pobrać kajaków." : "Nie udało się pobrać sprzętu."
            )
          );
          listEl.innerHTML = "";
          metaEl.textContent = "";
        }
      };

      let allPhotoUrls = [];
      let currentPhotoIdx = 0;
      let currentTitle = "";
      let modalPhotoGen = 0;

      function showPhotoAtIdx(idx) {
        if (!allPhotoUrls.length) return;
        currentPhotoIdx = Math.max(0, Math.min(idx, allPhotoUrls.length - 1));
        loadPhotoWithOverlay({
          imgEl: modalImgEl,
          overlayEl: modalLoadingEl,
          url: allPhotoUrls[currentPhotoIdx],
          bumpGen: () => ++modalPhotoGen,
          currentGen: () => modalPhotoGen,
          onError: () => { modalHintEl.textContent = "Brak zdjęcia."; },
        });
        modalHintEl.textContent = "";
        if (allPhotoUrls.length > 1) {
          modalCounterEl.textContent = `${currentPhotoIdx + 1} / ${allPhotoUrls.length}`;
          modalPrevBtn.disabled = currentPhotoIdx === 0;
          modalNextBtn.disabled = currentPhotoIdx === allPhotoUrls.length - 1;
          modalPrevBtn.classList.remove("hidden");
          modalNextBtn.classList.remove("hidden");
        } else {
          modalCounterEl.textContent = "";
          modalPrevBtn.classList.add("hidden");
          modalNextBtn.classList.add("hidden");
        }
      }

      modalImgEl.onerror = () => {
        const currentSrc = String(modalImgEl.getAttribute("src") || "");
        if (currentSrc !== PLACEHOLDER_SVG) {
          modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
        }
        modalHintEl.textContent = "Brak zdjęcia.";
      };

      function openModal({ title, topUrl, sideUrl, prefer }) {
        currentTitle = String(title || "Zdjęcie");
        allPhotoUrls = [topUrl, sideUrl].filter(Boolean);
        currentPhotoIdx = 0;

        modalTitleEl.textContent = currentTitle;
        modalHintEl.textContent = "";
        modalCounterEl.textContent = "";

        if (!allPhotoUrls.length) {
          modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
          modalHintEl.textContent = "Brak zdjęcia.";
          modalPrevBtn.classList.add("hidden");
          modalNextBtn.classList.add("hidden");
        } else {
          let startIdx = 0;
          if (prefer === "side" && sideUrl) {
            const idx = allPhotoUrls.indexOf(sideUrl);
            if (idx >= 0) startIdx = idx;
          }
          showPhotoAtIdx(startIdx);
        }

        modalEl.classList.remove("hidden");
        modalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }

      async function openKayakPhotoModal({ number, title, preloadedUrl }) {
        const kayakNumber = String(number || "");
        currentTitle = String(title || "Zdjęcia");
        allPhotoUrls = preloadedUrl ? [preloadedUrl] : [];
        currentPhotoIdx = 0;

        modalTitleEl.textContent = currentTitle;
        modalHintEl.textContent = preloadedUrl ? "" : "Ładuję...";
        modalCounterEl.textContent = "";
        modalPrevBtn.classList.add("hidden");
        modalNextBtn.classList.add("hidden");

        if (preloadedUrl) {
          modalImgEl.setAttribute("src", preloadedUrl);
        } else {
          modalImgEl.removeAttribute("src");
        }

        modalEl.classList.remove("hidden");
        modalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        // Ładuj cover + galerię równocześnie
        try {
          const [coverUrl, galleryUrls] = await Promise.all([
            preloadedUrl ? Promise.resolve(preloadedUrl) : storageFetchKayakCoverUrl(kayakNumber),
            storageFetchKayakGalleryUrls(kayakNumber),
          ]);

          const seen = new Set();
          const urls = [];
          if (coverUrl) { urls.push(coverUrl); seen.add(coverUrl); }
          for (const u of galleryUrls) {
            if (!seen.has(u)) { urls.push(u); seen.add(u); }
          }

          if (!urls.length) {
            modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
            modalHintEl.textContent = "Brak zdjęć.";
            return;
          }

          allPhotoUrls = urls;
          showPhotoAtIdx(0);
        } catch (err) {
          console.error("[Storage] błąd ładowania zdjęć dla kajaka nr", kayakNumber, err);
          if (!preloadedUrl) {
            modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
            modalHintEl.textContent = "Nie udało się załadować zdjęć.";
          }
        }
      }

      function closeModal() {
        modalEl.classList.add("hidden");
        modalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        modalImgEl.removeAttribute("src");
        allPhotoUrls = [];
        currentPhotoIdx = 0;
        currentTitle = "";
        modalHintEl.textContent = "";
        modalCounterEl.textContent = "";
        modalPrevBtn.classList.add("hidden");
        modalNextBtn.classList.add("hidden");
      }

      modalEl.addEventListener("click", (ev) => {
        const t = ev.target;
        if (t && t.getAttribute && t.getAttribute("data-gear-modal-close") === "1") {
          closeModal();
        }
      });

      // AbortController: listener jest automatycznie usuwany gdy viewEl dostaje nową treść
      // (MutationObserver na firstChild) — zapobiega akumulacji listenerów przy nawigacji
      const keyAbort = new AbortController();
      new MutationObserver(() => keyAbort.abort()).observe(viewEl, { childList: true });
      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
        if (ev.key === "Escape" && bundleModalEl && !bundleModalEl.classList.contains("hidden")) closeBundleModal();
        if (!modalEl.classList.contains("hidden")) {
          if (ev.key === "ArrowLeft") { showPhotoAtIdx(currentPhotoIdx - 1); ev.preventDefault(); }
          if (ev.key === "ArrowRight") { showPhotoAtIdx(currentPhotoIdx + 1); ev.preventDefault(); }
        }
      }, { signal: keyAbort.signal });

      modalPrevBtn.addEventListener("click", () => showPhotoAtIdx(currentPhotoIdx - 1));
      modalNextBtn.addEventListener("click", () => showPhotoAtIdx(currentPhotoIdx + 1));

      let _touchStartX = 0;
      modalEl.addEventListener("touchstart", (ev) => {
        _touchStartX = ev.touches[0].clientX;
      }, { passive: true });
      modalEl.addEventListener("touchend", (ev) => {
        const dx = ev.changedTouches[0].clientX - _touchStartX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) showPhotoAtIdx(currentPhotoIdx + 1);
          else showPhotoAtIdx(currentPhotoIdx - 1);
        }
      }, { passive: true });

      // ── In-list photo swipe (horizontal swipe on card photo = cycle photos) ───
      let _listSwipeStartX = 0;
      let _listSwipeStartY = 0;
      let _listSwipeBtn = null;

      listEl.addEventListener("touchstart", (ev) => {
        if (ev.touches.length !== 1) return;
        _listSwipeStartX = ev.touches[0].clientX;
        _listSwipeStartY = ev.touches[0].clientY;
        _listSwipeBtn = ev.target.closest ? ev.target.closest("[data-gear-kayak-cover]") : null;
      }, { passive: true });

      listEl.addEventListener("touchend", async (ev) => {
        const btn = _listSwipeBtn;
        _listSwipeBtn = null;
        if (!btn) return;

        const dx = ev.changedTouches[0].clientX - _listSwipeStartX;
        const dy = ev.changedTouches[0].clientY - _listSwipeStartY;
        const isHorizontal = Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5;
        if (!isHorizontal) return; // treat as tap → click handler opens modal

        ev.preventDefault(); // prevent the click that would open the modal

        const number = String(btn.getAttribute("data-gear-kayak-cover") || "");
        if (!number) return;

        let state = photoState.get(number);
        if (!state) return;

        // Lazy-load gallery on first swipe
        if (!state.loaded) {
          state.loaded = true;
          try {
            const galleryUrls = await storageFetchKayakGalleryUrls(number);
            const seen = new Set(state.urls);
            for (const u of galleryUrls) {
              if (!seen.has(u)) { state.urls.push(u); seen.add(u); }
            }
          } catch { /* ignore — use cover only */ }
        }

        if (state.urls.length <= 1) return; // only one photo, nothing to cycle

        state.idx = ((state.idx + (dx < 0 ? 1 : -1)) + state.urls.length) % state.urls.length;
        btn.setAttribute("data-loaded-cover-url", state.urls[state.idx]);

        const imgEl = btn.querySelector("img");
        if (imgEl) {
          imgEl.classList.add("gearCoverLoaded");
          loadPhotoWithOverlay({
            imgEl,
            overlayEl: btn.querySelector(".gearPhotoLoading"),
            url: state.urls[state.idx],
            bumpGen: () => ++state.gen,
            currentGen: () => state.gen,
          });
        }
        const counter = btn.querySelector(".gearImgCounter");
        if (counter) {
          counter.textContent = `${state.idx + 1}/${state.urls.length}`;
          counter.hidden = false;
        }
      }, { passive: false });

      listEl.addEventListener("click", async (ev) => {
        const el = ev.target;
        if (!el || !el.closest) return;

        const favBtn = el.closest("[data-gear-fav]");
        if (favBtn) {
          const itemId = String(favBtn.getAttribute("data-gear-fav") || "");
          if (!itemId) return;

          // Optimistic toggle
          const wasActive = favBtn.classList.contains("active");
          const nowFav = !wasActive;
          favBtn.classList.toggle("active", nowFav);
          favBtn.innerHTML = heartSvg(nowFav);
          favBtn.setAttribute("aria-label", nowFav ? "Usuń z ulubionych" : "Dodaj do ulubionych");
          if (nowFav) { favSet.add(itemId); } else { favSet.delete(itemId); }
          if (filterFavoritesOnlyEl?.checked) applyFilter();

          // Persist to Firestore via API
          apiPostJson({
            url: GEAR_FAVORITES_TOGGLE_URL,
            idToken: ctx.idToken,
            body: { itemId, category: activeTab },
          }).then((resp) => {
            // Sync with server response in case of discrepancy
            const serverFav = resp?.isFav === true;
            if (serverFav !== nowFav) {
              favBtn.classList.toggle("active", serverFav);
              favBtn.innerHTML = heartSvg(serverFav);
              favBtn.setAttribute("aria-label", serverFav ? "Usuń z ulubionych" : "Dodaj do ulubionych");
              if (serverFav) { favSet.add(itemId); } else { favSet.delete(itemId); }
              if (filterFavoritesOnlyEl?.checked) applyFilter();
            }
          }).catch(() => {
            // Revert on error
            favBtn.classList.toggle("active", wasActive);
            favBtn.innerHTML = heartSvg(wasActive);
            favBtn.setAttribute("aria-label", wasActive ? "Usuń z ulubionych" : "Dodaj do ulubionych");
            if (wasActive) { favSet.add(itemId); } else { favSet.delete(itemId); }
            if (filterFavoritesOnlyEl?.checked) applyFilter();
          });
          return;
        }

        const bundleReserveBtn = el.closest("[data-gear-bundle-reserve]");
        if (bundleReserveBtn) {
          const itemId = String(bundleReserveBtn.getAttribute("data-gear-bundle-reserve") || "");
          const category = String(bundleReserveBtn.getAttribute("data-gear-bundle-category") || "");
          const found = all.find((it) => String(it?.id || "") === itemId);
          const label = found
            ? (category === "kayaks" ? buildKayakTitle(found) : buildGenericGearTitle(found))
            : itemId;
          startBundleForItem(itemId, category, label);
          return;
        }

        const coverBtn = el.closest("[data-gear-kayak-cover]");
        if (coverBtn) {
          const number = String(coverBtn.getAttribute("data-gear-kayak-cover") || "");
          const title = String(coverBtn.getAttribute("data-gear-title") || "Zdjęcia");
          const preloadedUrl = coverBtn.getAttribute("data-loaded-cover-url") || null;
          await openKayakPhotoModal({ number, title, preloadedUrl });
          return;
        }

        const lifejacketCoverBtn = el.closest("[data-gear-lifejacket-cover]");
        if (lifejacketCoverBtn) {
          const title = String(lifejacketCoverBtn.getAttribute("data-gear-title") || "Zdjęcie");
          const preloadedUrl = lifejacketCoverBtn.getAttribute("data-loaded-cover-url") || "";
          openModal({ title, topUrl: preloadedUrl, sideUrl: "", prefer: "top" });
          return;
        }

        const helmetCoverBtn = el.closest("[data-gear-helmet-cover]");
        if (helmetCoverBtn) {
          const title = String(helmetCoverBtn.getAttribute("data-gear-title") || "Zdjęcie");
          const bokUrl = helmetCoverBtn.getAttribute("data-loaded-cover-url") || "";
          const frontUrl = helmetCoverBtn.getAttribute("data-loaded-front-url") || "";
          openModal({ title, topUrl: bokUrl, sideUrl: frontUrl, prefer: "top" });
          return;
        }

        const imgBtn = el.closest("[data-gear-img]");
        if (imgBtn) {
          const prefer = String(imgBtn.getAttribute("data-gear-img") || "top");
          const topUrl = String(imgBtn.getAttribute("data-gear-top") || "");
          const sideUrl = String(imgBtn.getAttribute("data-gear-side") || "");
          const title = String(imgBtn.getAttribute("data-gear-title") || "Zdjęcie");

          openModal({ title, topUrl, sideUrl, prefer });
          return;
        }

        const moreBtn = el.closest(".gearMoreBtn");
        if (moreBtn) {
          const card = moreBtn.closest(".gearCard");
          const detailsEl = card?.querySelector(".gearDetails");
          if (detailsEl) {
            const wasOpen = detailsEl.open;
            detailsEl.open = !wasOpen;

            // Lazy-load rezerwacji przy pierwszym otwarciu karty
            if (!wasOpen && card) {
              const cardKayakId = String(card.getAttribute("data-gear-card-id") || "");
              // Kategoria z przycisku "Rezerwuj" tej samej karty — bez tego zapytanie
              // domyślnie leciało jako "kayaks" dla KAŻDEJ kategorii (bug: podgląd
              // rezerwacji dla wioseł/kamizelek/kasków/rzutek/fartuchów zawsze pusty).
              const cardCategory = String(card.querySelector("[data-gear-bundle-category]")?.getAttribute("data-gear-bundle-category") || "kayaks");
              const reservSection = card.querySelector(".gearReservSection");
              const reservContent = card.querySelector(".gearReservSectionContent");
              if (cardKayakId && reservSection && reservContent && !reservSection.getAttribute("data-loaded")) {
                reservSection.setAttribute("data-loaded", "1");
                loadAndRenderReservations(cardKayakId, reservContent, cardCategory);
              }
            }
          }
          return;
        }

        const detailsSummary = el.closest(".gearDetailsSummary");
        if (detailsSummary) {
          const detailsEl = detailsSummary.closest("details");
          if (detailsEl) {
            detailsEl.open = !detailsEl.open;
          }
        }
      });

      reloadBtn.addEventListener("click", async () => {
        await loadGear(activeTab);
      });

      searchEl.addEventListener("input", applyFilter);
      if (filterWorkingOnlyEl) filterWorkingOnlyEl.addEventListener("change", applyFilter);
      if (filterAvailableNowOnlyEl) filterAvailableNowOnlyEl.addEventListener("change", applyFilter);
      if (filterFavoritesOnlyEl) filterFavoritesOnlyEl.addEventListener("change", applyFilter);
      if (filterPoolOnlyEl) filterPoolOnlyEl.addEventListener("change", applyFilter);
      if (filterPrivateOnlyEl) filterPrivateOnlyEl.addEventListener("change", applyFilter);
      if (filterBrokenOnlyEl) filterBrokenOnlyEl.addEventListener("change", applyFilter);
      if (filterTypeSelectEl) filterTypeSelectEl.addEventListener("change", applyFilter);

      if (filterMyWeightOnlyEl) {
        filterMyWeightOnlyEl.addEventListener("change", async () => {
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
      }

      if (weightSaveBtnEl) {
        weightSaveBtnEl.addEventListener("click", async () => {
          const val = parseInt(String(weightInputEl?.value || ""), 10);
          if (!Number.isFinite(val) || val < 30 || val > 250) {
            setWeightErr("Podaj wagę od 30 do 250 kg.");
            return;
          }
          weightSaveBtnEl.disabled = true;
          try {
            await apiPostJson({ url: USER_WEIGHT_URL, idToken: ctx.idToken, body: { weight: val } });
            userWeight = val;
            closeWeightModal();
            if (filterMyWeightOnlyEl) filterMyWeightOnlyEl.checked = true;
            applyFilter();
          } catch {
            setWeightErr("Nie udało się zapisać wagi. Spróbuj ponownie.");
          } finally {
            weightSaveBtnEl.disabled = false;
          }
        });
      }

      viewEl.addEventListener("click", (e) => {
        if (e.target?.closest("[data-gear-weight-close]")) closeWeightModal();
      });
      if (filterSizeSelectEl) filterSizeSelectEl.addEventListener("change", applyFilter);
      if (filterPaddlePoolSelectEl) filterPaddlePoolSelectEl.addEventListener("change", applyFilter);

      await loadGear(activeTab);
    }
  };
}

function renderKayakCard(k, isFav = false, canUserReserve = true) {
  const number = String(k?.number || "").trim();
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const type = String(k?.type || "").trim();
  const color = String(k?.color || "").trim();

  const storageVal = String(k?.storage || k?.storedAt || "").trim().toLowerCase();
  const isPool = storageVal === "basen";

  const working = isWorking(k);
  const reservedNow = k?.isReservedNow === true;

  const isPrivate = toBool(k?.isPrivate);
  const privateRent = toBool(k?.privateForRent) || toBool(k?.isPrivateRentable);

  const canReserve = working && (!isPrivate || privateRent) && !isPool && canUserReserve;

  const workingBadge = working
    ? `<span class="badge ok">sprawny</span>`
    : `<span class="badge danger">niesprawny</span>`;

  const availabilityBadge = reservedNow
    ? `<span class="badge danger">rezerwacja</span>`
    : `<span class="badge soft">wolny</span>`;

  const poolBadge = isPool
    ? `<span class="badge pool">Basen</span>`
    : "";

  const typeBadge = type
    ? `<span class="badge soft">${escapeHtml(type)}</span>`
    : "";

  const title = buildKayakTitle(k);
  const detailsRows = buildKayakDetailsRows(k);

  return `
    <div class="gearCard ${isPrivate ? "gearPrivate" : working ? "gearOk" : "gearBad"}${isPool ? " gearPool" : ""}" data-gear-card-id="${escapeAttr(String(k?.id || ""))}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitleLine">
              <span class="gearTitle">${escapeHtml(brand || "Kajak")}</span><span class="gearModel"> ${escapeHtml(model || "")}</span>
            </div>
            ${type ? `<div class="gearInlineMeta gearInlineMetaMain gearMiniType">${escapeHtml(type)}</div>` : ""}
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Kolor:</strong> ${escapeHtml(color || "-")}</div>
            <div class="gearInlineMeta gearInlineMetaMain gearNr"><strong>Nr:</strong> ${escapeHtml(number || "-")}</div>
            <div class="gearNrColorMobile">Nr ${escapeHtml(number || "-")}${color ? ` (${escapeHtml(color)})` : ""}</div>
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(k?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            <div class="gearBadges gearBadgesStack">
              ${workingBadge}
              ${poolBadge || availabilityBadge}
              ${typeBadge}
            </div>
          </div>
        </div>

        <div class="gearImgs gearImgsSingle">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-kayak-cover="${escapeAttr(number)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img
                alt=""
                src="${escapeAttr(PLACEHOLDER_SVG)}"
                data-cover-number="${escapeAttr(number)}"
                loading="lazy"
              />
              <span class="gearImgCounter" hidden></span>
              <div class="gearImgLabel">Zdjecia</div>
              <div class="gearPhotoLoading hidden" aria-hidden="true"><div class="spinner"></div></div>
            </div>
          </button>
        </div>

        <div class="actions gearCardActions">
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
            type="button"
            class="primary gearBundleReserveBtn"
            data-gear-bundle-reserve="${escapeAttr(String(k?.id || ""))}"
            data-gear-bundle-category="kayaks"
            ${canReserve ? "" : "disabled"}>
            Rezerwuj
          </button>`}
          <button type="button" class="ghost gearMoreBtn">Więcej</button>
        </div>

        <div class="gearMiniBar">
          <div class="gearMiniIcons">
            ${isPrivate
              ? `<span class="gearMiniStatusIcon gearMiniPriv" title="Kajak prywatny">priv</span>`
              : `<span class="gearMiniStatusIcon ${working ? "gearMiniOk" : "gearMiniBad"}" title="${working ? "Sprawny" : "Niesprawny"}">${workingIconSvg(working)}</span>`}
            ${reservedNow ? `<span class="gearMiniStatusIcon gearMiniLocked" title="Zarezerwowany teraz">${lockIconSvg()}</span>` : ""}
            <button type="button" class="gearMiniMoreBtn gearMoreBtn" title="Szczegóły" aria-label="Szczegóły">${dotsIconSvg()}</button>
          </div>
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
            type="button"
            class="gearMiniReserveBtn gearBundleReserveBtn"
            data-gear-bundle-reserve="${escapeAttr(String(k?.id || ""))}"
            data-gear-bundle-category="kayaks"
            ${canReserve ? "" : "disabled"}>Rezerwuj</button>`}
        </div>

        <details class="gearDetails">
          <summary class="gearDetailsSummary">Więcej</summary>
          <div class="gearMeta">
            ${detailsRows}
          </div>
          <div class="gearReservSection">
            <div class="gearReservSectionContent"></div>
          </div>
        </details>

      </div>
    </div>
  `;
}

// Wiersz 2 karty kasku: "3 / czerwony (M)" — numer + kolor + rozmiar w nawiasie
function buildHelmetLine2(item) {
  const color = String(item?.color || "").trim();
  const size = String(item?.size || "").trim();
  const parts = [];
  if (color) parts.push(`kolor: ${color}`);
  if (size) parts.push(`rozm. ${size}`);
  return parts.join("  ·  ");
}

// Wiersz 3 karty kasku: "uwagi: ..." lub pusty
function buildHelmetLine3(item) {
  const notes = String(item?.notes || "").trim();
  return notes ? `uwagi: ${notes}` : "";
}

function renderHelmetCard(item, isFav = false, canUserReserve = true) {
  const number = String(item?.number || "").trim();
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const isPool = toBool(item?.isPoolAllowed);

  const title = buildGenericGearTitle(item);
  const line2 = buildHelmetLine2(item);
  const line3 = buildHelmetLine3(item);

  return `
    <div class="gearCard gearOk${isPool ? " gearPool" : ""}" data-gear-card-id="${escapeAttr(String(item?.id || ""))}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitleLine">
              <span class="gearTitle">${escapeHtml(brand || "Kask")}</span><span class="gearModel"> ${escapeHtml(model || "")}</span>${number ? `<span class="gearNrInline"> nr. ${escapeHtml(number)}</span>` : ""}
            </div>
            ${line2 ? `<div class="gearNrColorMobile">${escapeHtml(line2)}</div>` : ""}
            ${line3 ? `<div class="gearMiniType">${escapeHtml(line3)}</div>` : ""}
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(item?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            ${isPool ? `<div class="gearBadges gearBadgesStack"><span class="badge pool">Basen</span></div>` : ""}
          </div>
        </div>

        <div class="gearImgs gearImgsSingle">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-helmet-cover="${escapeAttr(number)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img
                alt=""
                src="${escapeAttr(PLACEHOLDER_SVG)}"
                data-helmet-number="${escapeAttr(number)}"
                loading="lazy"
              />
              <div class="gearImgLabel">Zdjęcie</div>
            </div>
          </button>
        </div>

        <div class="gearMiniBar">
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
                type="button"
                class="gearMiniReserveBtn gearBundleReserveBtn"
                data-gear-bundle-reserve="${escapeAttr(String(item?.id || ""))}"
                data-gear-bundle-category="helmets"
                ${canUserReserve ? "" : "disabled"}
              >Rezerwuj</button>`}
        </div>

      </div>
    </div>
  `;
}

function renderPaddleCard(item, isFav = false, canUserReserve = true) {
  const number = String(item?.number || "").trim();
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const color = String(item?.color || "").trim();
  const type = String(item?.type || "").trim();
  const lengthCm = String(item?.lengthCm || "").trim();
  const featherAngle = String(item?.featherAngle || "").trim();
  const notes = String(item?.notes || "").trim();

  const isPool = toBool(item?.isPoolAllowed);

  const brandModel = [brand, model].filter(Boolean).join(" ");

  return `
    <div class="gearCard gearOk${isPool ? " gearPool" : ""}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitleLine">
              <span class="gearTitle">Wiosło nr ${escapeHtml(number || "?")}</span>
            </div>
            ${brandModel ? `<div class="gearMiniType">${escapeHtml(brandModel)}</div>` : ""}
            ${type ? `<div class="gearInlineMeta gearInlineMetaMain gearMiniType">${escapeHtml(type)}</div>` : ""}
            ${lengthCm ? `<div class="gearInlineMeta gearInlineMetaMain"><strong>Długość:</strong> ${escapeHtml(lengthCm)} cm</div>` : ""}
            ${color ? `<div class="gearInlineMeta gearInlineMetaMain"><strong>Kolor:</strong> ${escapeHtml(color)}</div>` : ""}
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Kąt skrętu:</strong> ${featherAngle ? `${escapeHtml(featherAngle)}°` : "brak"}</div>
            ${notes ? `<div class="gearInlineMeta"><strong>Uwagi:</strong> ${escapeHtml(notes)}</div>` : ""}
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(item?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            ${isPool ? `<div class="gearBadges gearBadgesStack"><span class="badge pool">Basen</span></div>` : ""}
          </div>
        </div>

        <div class="gearMiniBar">
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
                type="button"
                class="gearMiniReserveBtn gearBundleReserveBtn"
                data-gear-bundle-reserve="${escapeAttr(String(item?.id || ""))}"
                data-gear-bundle-category="paddles"
                ${canUserReserve ? "" : "disabled"}
              >Rezerwuj</button>`}
        </div>

      </div>
    </div>
  `;
}

// Rzutki i fartuchy (jedyne kategorie bez dedykowanej funkcji renderowania) —
// bez prawdziwych zdjęć (zawsze placeholder) i bez na tyle danych, by uzasadnić
// osobny panel "Więcej" — świadomie BEZ przycisku rozwijania, wszystko widoczne
// od razu w max dwóch wierszach (feedback użytkownika 04.09.2026): wiersz 1 =
// tytuł "{producent} {numer}" (np. "HF 14") + ulubione + odznaki (typ/rozmiar/
// status/basen); wiersz 2 = pozostałe dane tekstem (kolor/uwagi) + Rezerwuj.
function renderGenericGearCard(item, isFav = false, canUserReserve = true) {
  const number = String(item?.number || "").trim();
  const brand = String(item?.brand || "").trim();
  const color = String(item?.color || "").trim();
  const size = String(item?.size || "").trim();
  const type = String(item?.type || "").trim();
  const status = String(item?.status || "").trim();
  const notes = String(item?.notes || "").trim();
  const categoryLabel = String(item?.gearCategoryDisplay || item?.gearCategory || "Sprzęt").trim();
  const category = String(item?.gearCategory || "").trim();

  const isPool = toBool(item?.isPoolAllowed);

  const label = [brand, number].filter(Boolean).join(" ") || categoryLabel;

  const typeBadge = type
    ? `<span class="badge soft">${escapeHtml(type)}</span>`
    : "";

  const sizeBadge = size
    ? `<span class="badge soft">rozm. ${escapeHtml(size)}</span>`
    : "";

  const statusBadge = status
    ? `<span class="badge soft">${escapeHtml(status)}</span>`
    : "";

  const poolBadge = isPool ? `<span class="badge pool">Basen</span>` : "";

  const metaParts = [color ? `kolor: ${color}` : "", notes].filter(Boolean);
  const metaText = metaParts.join(" · ");

  return `
    <div class="gearCard gearCardNoPhoto gearOk${isPool ? " gearPool" : ""}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitle">${escapeHtml(label)}</div>
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(item?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            <div class="gearBadges gearBadgesStack">
              ${poolBadge}
              ${typeBadge}
              ${sizeBadge}
              ${statusBadge}
            </div>
          </div>
        </div>

        <div class="gearMiniBar">
          <div class="gearMiniMeta">${escapeHtml(metaText)}</div>
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
            type="button"
            class="gearMiniReserveBtn gearBundleReserveBtn"
            data-gear-bundle-reserve="${escapeAttr(String(item?.id || ""))}"
            data-gear-bundle-category="${escapeAttr(category)}"
            ${canUserReserve ? "" : "disabled"}>Rezerwuj</button>`}
        </div>

      </div>
    </div>
  `;
}

function buildKayakDetailsRows(k) {
  const rows = [
    ["Rozmiar", k?.size],
    ["Litrów", k?.liters],
    ["Zakres wag", k?.weightRange],
    ["Kokpit", k?.cockpit],
    ["Pół na pół?", toBoolOrNull(k?.isHalfHalf) === null ? "" : (toBool(k?.isHalfHalf) ? "tak" : "nie")],
    ["Składowany", k?.storage],
    ["Prywatny?", toBoolOrNull(k?.isPrivate) === null ? "" : (toBool(k?.isPrivate) ? "tak" : "nie")],
    ["Prywatny do wypożyczenia?", toBoolOrNull(k?.privateForRent) === null && toBoolOrNull(k?.isPrivateRentable) === null ? "" : ((toBool(k?.privateForRent) || toBool(k?.isPrivateRentable)) ? "tak" : "nie")],
    ["Kontakt do właściciela", k?.ownerContact],
    ["Uwagi", k?.notes]
  ]
    .filter(([, value]) => String(value ?? "").trim() !== "")
    .map(([key, value]) => `
      <div class="gearMetaRow">
        <div class="gearMetaKey">${escapeHtml(String(key))}:</div>
        <div class="gearMetaVal">${escapeHtml(String(value))}</div>
      </div>
    `);

  if (!rows.length) {
    return `
      <div class="gearMetaRow">
        <div class="gearMetaKey">Informacje:</div>
        <div class="gearMetaVal">Brak dodatkowych danych</div>
      </div>
    `;
  }

  return rows.join("");
}

function buildKayakTitle(k) {
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const number = String(k?.number || "").trim();

  const core = [brand, model].filter(Boolean).join(" ").trim() || "Kajak";
  return number ? `${core} (nr ${number})` : core;
}

function buildGenericGearTitle(item) {
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const number = String(item?.number || "").trim();
  const category = String(item?.gearCategoryDisplay || item?.gearCategory || "Sprzęt").trim();

  const core = [brand, model].filter(Boolean).join(" ").trim() || category || "Sprzęt";
  return number ? `${core} (nr ${number})` : core;
}

// Wiersz 2 karty kamizelki: "27 / czerwony" — numer + kolor
function buildLifejacketLine2(item) {
  const color = String(item?.color || "").trim();
  return color ? `kolor: ${color}` : "";
}

// Wiersz 3 karty kamizelki: "asekuracyjna / M (50N)" — typ + rozmiar + wyporność
function buildLifejacketLine3(item) {
  const type = String(item?.type || "").trim();
  const size = String(item?.size || "").trim();
  const buoyancy = String(item?.meta?.buoyancy || "").trim();
  const typeSizePart = [type, size].filter(Boolean).join(" / ");
  const buoyancyPart = buoyancy ? `(${buoyancy})` : "";
  return [typeSizePart, buoyancyPart].filter(Boolean).join(" ");
}

function renderLifejacketCard(item, isFav = false, canUserReserve = true) {
  const number = String(item?.number || "").trim();
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const isPool = toBool(item?.isPoolAllowed);

  const title = buildGenericGearTitle(item);
  const line2 = buildLifejacketLine2(item);
  const line3 = buildLifejacketLine3(item);

  return `
    <div class="gearCard gearOk${isPool ? " gearPool" : ""}" data-gear-card-id="${escapeAttr(String(item?.id || ""))}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitleLine">
              <span class="gearTitle">${escapeHtml(brand || "Kamizelka")}</span><span class="gearModel"> ${escapeHtml(model || "")}</span>${number ? `<span class="gearNrInline"> nr. ${escapeHtml(number)}</span>` : ""}
            </div>
            ${line3 ? `<div class="gearMiniType">${escapeHtml(line3)}</div>` : ""}
            ${line2 ? `<div class="gearNrColorMobile">${escapeHtml(line2)}</div>` : ""}
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(item?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            ${isPool ? `<div class="gearBadges gearBadgesStack"><span class="badge pool">Basen</span></div>` : ""}
          </div>
        </div>

        <div class="gearImgs gearImgsSingle">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-lifejacket-cover="${escapeAttr(number)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img
                alt=""
                src="${escapeAttr(PLACEHOLDER_SVG)}"
                data-lifejacket-number="${escapeAttr(number)}"
                loading="lazy"
              />
              <div class="gearImgLabel">Zdjęcie</div>
            </div>
          </button>
        </div>

        <div class="gearMiniBar">
          ${isPool
            ? `<span class="badge pool gearPoolActionLabel">Basen</span>`
            : `<button
                type="button"
                class="gearMiniReserveBtn gearBundleReserveBtn"
                data-gear-bundle-reserve="${escapeAttr(String(item?.id || ""))}"
                data-gear-bundle-category="lifejackets"
                ${canUserReserve ? "" : "disabled"}
              >Rezerwuj</button>`}
        </div>

      </div>
    </div>
  `;
}

function parseWeightRangeMax(weightRange) {
  const nums = String(weightRange || "").match(/\d+/g);
  if (!nums || nums.length < 2) return null;
  return parseInt(nums[nums.length - 1], 10);
}

function normalizeTypeValue(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizeSimpleValue(v) {
  return String(v || "").trim().toLowerCase();
}

function isWorking(k) {
  const b =
    toBoolOrNull(k?.isWorking) ??
    toBoolOrNull(k?.working) ??
    toBoolOrNull(k?.isOk) ??
    toBoolOrNull(k?.ok) ??
    toBoolOrNull(k?.isOperational) ??
    null;

  if (b !== null) return b;

  const s = String(k?.status || "").trim().toLowerCase();
  if (!s) return true;
  if (s === "repair" || s === "broken" || s === "service" || s === "niesprawny") return false;
  return true;
}

function toBool(v) {
  return toBoolOrNull(v) === true;
}

function toBoolOrNull(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "true" || s === "tak" || s === "yes" || s === "1") return true;
  if (s === "false" || s === "nie" || s === "no" || s === "0") return false;
  return null;
}

function escapeAttr(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function heartSvg(filled) {
  const fill = filled ? "currentColor" : "none";
  return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function workingIconSvg(ok) {
  if (ok) {
    return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M6.5 10.5l2.5 2.5 4.5-5" stroke-width="1.75"/></svg>`;
  }
  return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><line x1="13.5" y1="6.5" x2="6.5" y2="13.5" stroke-width="1.75"/></svg>`;
}

function lockIconSvg() {
  return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="9.5" width="11" height="8" rx="1.5"/><path d="M7.5 9.5V7a2.5 2.5 0 015 0v2.5"/></svg>`;
}

function dotsIconSvg() {
  return `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="4.5" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="15.5" cy="10" r="1.5"/></svg>`;
}

function refreshIconSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
}

function formatDatePLFromIso(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso || "");
  const [y, m, d] = String(iso).split("-");
  return `${d}.${m}.${y}`;
}

function renderReservationsSimple(reservations) {
  if (!reservations.length) {
    return `<div class="gearReservNoData">Brak aktywnych rezerwacji.</div>`;
  }
  return reservations.map((r) => {
    const start = formatDatePLFromIso(r.blockStartIso || r.startDate);
    const end = formatDatePLFromIso(r.blockEndIso || r.endDate);
    const userLine = r.isClubEvent
      ? (r.eventName ? `Rezerwacja „${escapeHtml(r.eventName)}”` : "Rezerwacja (impreza klubowa)")
      : `Wypożyczony przez: ${escapeHtml(r.userDisplayName || "—")}`;
    return `
      <div class="gearReservSimpleRow">
        <div class="gearReservSimpleDates">Zajęty: ${escapeHtml(start)} – ${escapeHtml(end)}</div>
        <div class="gearReservSimpleUser">${userLine}</div>
      </div>
    `;
  }).join("");
}

function gearTabIcon(id) {
  const a = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  switch (id) {
    case "kayaks":
      return `<svg ${a}><path d="M3 13Q7.5 7.5 12 7.5Q16.5 7.5 21 13"/><path d="M2 13Q12 18.5 22 13"/><ellipse cx="12" cy="13.5" rx="3" ry="1.5"/></svg>`;
    case "paddles":
      return `<svg ${a}><line x1="12" y1="3" x2="12" y2="21"/><path d="M9 4Q12 2.5 15 4v5Q12 10.5 9 9V4z"/><path d="M9 20Q12 21.5 15 20v-5Q12 13.5 9 15v5z"/></svg>`;
    case "lifejackets":
      return `<svg ${a}><path d="M7 3L4.5 6.5v13h15V6.5L17 3"/><path d="M7 3Q12 7 17 3"/><line x1="12" y1="7" x2="12" y2="11.5"/></svg>`;
    case "helmets":
      return `<svg ${a}><path d="M4.5 17Q4.5 7 12 7Q19.5 7 19.5 17"/><line x1="3.5" y1="17" x2="20.5" y2="17"/><path d="M3.5 17Q3.5 20 6.5 20h11Q20.5 20 20.5 17"/></svg>`;
    case "throwbags":
      return `<svg ${a}><path d="M9 9.5a3 3 0 016 0V20H9V9.5z"/><path d="M9 9.5V8a3 3 0 016 0v1.5"/><circle cx="12" cy="5.5" r="1.5"/></svg>`;
    case "sprayskirts":
      return `<svg ${a}><ellipse cx="12" cy="15.5" rx="9" ry="4.5"/><ellipse cx="12" cy="15.5" rx="4.5" ry="2"/><line x1="12" y1="11" x2="12" y2="7"/><path d="M9.5 7.5Q12 6 14.5 7.5"/></svg>`;
    case "wetsuits":
      return `<svg ${a}><path d="M8 4h8v4l2 2v10H6V10l2-2V4z"/><line x1="8" y1="8" x2="16" y2="8"/><path d="M6 10H4v4h2"/><path d="M18 10h2v4h-2"/></svg>`;
    case "jackets":
      return `<svg ${a}><path d="M8 4L4 8v12h16V8l-4-4"/><path d="M8 4Q12 7 16 4"/><line x1="12" y1="7" x2="12" y2="20"/></svg>`;
    case "drybags":
      return `<svg ${a}><rect x="7" y="8" width="10" height="12" rx="2"/><path d="M9 8V6a3 3 0 016 0v2"/><line x1="9" y1="8" x2="15" y2="8"/></svg>`;
    case "other":
      return `<svg ${a}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`;
    default:
      return "";
  }
}

// ── Widok masowego dodawania sprzętu na imprezę klubową ──────────────────────
// Osobny ekran (routeId="club-event", z osobnego kafelka na stronie głównej dla
// aktywnego kierownika) — bez kalendarza (daty = daty imprezy, ustalone serwerowo),
// bez klikania pojedynczych kart. WSZYSTKIE kategorie (kajaki i drobny sprzęt)
// obsłużone identycznie: zwarta lista z checkboxami. Trwała, EDYTOWALNA lista
// (feedback użytkownika 04.09.2026 — potrzeby na imprezę się zmieniają): przy
// wejściu wczytujemy istniejącą rezerwację na tę imprezę (jeśli już jakaś jest)
// i preselectujemy jej pozycje; "Rezerwuj" nadpisuje PEŁNĄ listę przedmiotów tej
// samej rezerwacji (patrz UPDATE_BUNDLE_RESERVATION_ITEMS_URL), zamiast tworzyć
// kolejną osobną za każdym razem. Przyciski "Rezerwuj"/"Anuluj" na samej górze,
// przed listą przewijaną — na mobile poprzednia wersja (przycisk na dole, po
// całej liście) była poza ekranem bez przewinięcia całej strony.
async function renderClubEventBulkView({ viewEl, ctx, label }) {
  if (!ctx?.idToken) {
    viewEl.innerHTML = `<div class="card center"><h2>${escapeHtml(label)}</h2><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
    return;
  }

  const events = Array.isArray(ctx?.session?.activeKierownikEvents) ? ctx.session.activeKierownikEvents : [];
  const isEligible = events.length > 0;

  if (!isEligible) {
    viewEl.innerHTML = `
      <div class="card center">
        <h2>Sprzęt na imprezę klubową</h2>
        <p class="hint">Nie jesteś obecnie kierownikiem żadnej zatwierdzonej imprezy klubowej.</p>
        <button type="button" class="ghost" id="clubEventBackBtn" style="margin-top:12px;">Wróć</button>
      </div>
    `;
    viewEl.querySelector("#clubEventBackBtn")?.addEventListener("click", () => { window.location.hash = "#home/home"; });
    return;
  }

  // Jedna osoba może być kierownikiem kilku imprez klubowych naraz — wybór
  // widoczny tylko gdy jest więcej niż jedna, żeby przy jednej imprezie
  // zachowanie zostało identyczne jak wcześniej (bez dropdowna).
  let selectedEvent = events[0];

  viewEl.innerHTML = `
    <div class="card wide">
      <div class="moduleHeader">
        <h2 id="clubEventTitle"></h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>

      <div id="clubEventPicker" class="hidden" style="margin:8px 0;">
        <label for="clubEventSelect" style="display:block; font-size:13px; color:var(--text-muted,#888); margin-bottom:4px;">Impreza:</label>
        <select id="clubEventSelect" style="width:100%;">
          ${events.map((e) => `<option value="${escapeAttr(e.id)}">${escapeHtml(e.name)} (${escapeHtml(formatDatePLFromIso(e.startDate))} – ${escapeHtml(formatDatePLFromIso(e.endDate))})</option>`).join("")}
        </select>
      </div>

      <div class="actions clubEventActionsTop">
        <button id="clubEventSaveBtn" type="button" class="primary" disabled>Rezerwuj</button>
        <button id="clubEventCancelBtn" type="button" class="ghost ghostCancel">Anuluj</button>
      </div>

      <div class="clubEventDeleteRow">
        <button id="clubEventDeleteBtn" type="button" class="ghost ghostDanger hidden">Usuń rezerwację</button>
      </div>

      <div class="hint" id="clubEventTermHint" style="margin:10px 0;"></div>

      <div id="clubEventOk" class="ok hidden" style="margin-bottom:10px;"></div>
      <div id="clubEventErr" class="err hidden" style="margin-bottom:10px;"></div>

      <div id="clubEventSummary" class="clubEventSummary"></div>

      <div class="gearTabs" role="tablist" aria-label="Kategorie sprzętu">
        ${GEAR_TABS.map((tab, idx) => `
          <button
            type="button"
            class="gearTab${idx === 0 ? " active" : ""}"
            data-clubevent-tab="${escapeAttr(tab.id)}"
            aria-pressed="${idx === 0 ? "true" : "false"}"
            title="${escapeAttr(tab.label)}"
          >
            <span class="gearTabIcon">${gearTabIcon(tab.id)}</span>
            <span class="gearTabLabel">${escapeHtml(tab.label)}</span>
          </button>
        `).join("")}
      </div>

      <div id="clubEventCatBody" style="margin-top:12px;"></div>
    </div>
  `;

  viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => { window.location.hash = "#home/home"; });

  const catBodyEl = viewEl.querySelector("#clubEventCatBody");
  const summaryEl = viewEl.querySelector("#clubEventSummary");
  const saveBtn = viewEl.querySelector("#clubEventSaveBtn");
  const cancelBtn = viewEl.querySelector("#clubEventCancelBtn");
  const deleteBtn = viewEl.querySelector("#clubEventDeleteBtn");
  const okEl = viewEl.querySelector("#clubEventOk");
  const errEl = viewEl.querySelector("#clubEventErr");
  const titleEl = viewEl.querySelector("#clubEventTitle");
  const termHintEl = viewEl.querySelector("#clubEventTermHint");
  const pickerEl = viewEl.querySelector("#clubEventPicker");
  const pickerSelectEl = viewEl.querySelector("#clubEventSelect");

  const setErr = (msg) => { errEl.textContent = String(msg || ""); errEl.classList.toggle("hidden", !errEl.textContent); };
  const setOk = (msg) => { okEl.textContent = String(msg || ""); okEl.classList.toggle("hidden", !okEl.textContent); };

  if (events.length > 1) pickerEl.classList.remove("hidden");

  const applySelectedEventToHeader = () => {
    const eventName = String(selectedEvent?.name || "").trim();
    titleEl.textContent = eventName ? `Sprzęt na „${eventName}”` : "Sprzęt na imprezę klubową";
    termHintEl.innerHTML = `Termin: <strong>${escapeHtml(formatDatePLFromIso(selectedEvent.startDate))} – ${escapeHtml(formatDatePLFromIso(selectedEvent.endDate))}</strong> (daty imprezy, bezpłatnie, bez limitu ilości). Listę można edytować dowolnie — odznacz pozycję, aby ją usunąć z rezerwacji.`;
  };
  applySelectedEventToHeader();

  // Stan per kategoria: { loaded, items, selectedIds: Set }
  const state = new Map(GEAR_TABS.map((t) => [t.id, {
    loaded: false,
    items: [],
    selectedIds: new Set(),
  }]));
  let activeCat = GEAR_TABS[0].id;

  // Istniejąca rezerwacja na WYBRANĄ imprezę (jeśli kierownik już coś zapisał
  // wcześniej) — rozpoznana po eventId (MY_RESERVATIONS_URL zwraca surowy
  // dokument Firestore, eventId już tam jest). Od tego momentu "Rezerwuj"
  // EDYTUJE listę tej rezerwacji zamiast tworzyć kolejną osobną.
  let existingReservationId = null;
  let baseline = new Map(GEAR_TABS.map((t) => [t.id, new Set()]));

  const isDirty = () => GEAR_TABS.some((t) => {
    const cur = state.get(t.id).selectedIds;
    const base = baseline.get(t.id);
    if (cur.size !== base.size) return true;
    for (const id of cur) if (!base.has(id)) return true;
    return false;
  });

  const snapshotBaseline = () => {
    baseline = new Map(GEAR_TABS.map((t) => [t.id, new Set(state.get(t.id).selectedIds)]));
  };

  // Cache nazw wyświetlanych "Nazwa (nr X)" per pozycja (klucz "{kategoria}/{id}") — zasilany
  // ZARÓWNO z już zapisanej rezerwacji (itemLabel/itemNumber są w niej zdenormalizowane, więc
  // podgląd nie wymaga wczytania dostępności każdej kategorii z osobna), JAK I z list
  // dostępności odwiedzonych zakładek (nowo zaznaczana pozycja zawsze pochodzi z widocznej
  // listy, więc w chwili zaznaczenia jej etykieta już tu trafia). Dzięki temu podsumowanie
  // "do wygodnej weryfikacji" (feedback użytkownika 04.09.2026) działa natychmiast, bez
  // konieczności eager-loadingu wszystkich 6 kategorii na starcie ekranu.
  const labelCache = new Map();
  const cacheKey = (cat, id) => `${cat}/${id}`;
  const formatItemLabelFromParts = (labelRaw, numberRaw, id) => {
    const number = String(numberRaw || "").trim();
    const baseLabel = String(labelRaw || "").trim() || number || id;
    return number && baseLabel !== number ? `${baseLabel} (nr ${number})` : baseLabel;
  };
  const formatItemLabel = (cat, id) => {
    const key = cacheKey(cat, id);
    if (labelCache.has(key)) return labelCache.get(key);
    const it = state.get(cat)?.items?.find((x) => String(x?.id || "") === id);
    if (it) {
      const lbl = formatItemLabelFromParts(it.label, it.number, id);
      labelCache.set(key, lbl);
      return lbl;
    }
    return id;
  };

  const loadExisting = async () => {
    try {
      const resp = await apiGetJson({ url: MY_RESERVATIONS_URL, idToken: ctx.idToken });
      const items = Array.isArray(resp?.items) ? resp.items : [];
      const mine = items.find((r) => (
        String(r?.status || "") === "active" &&
        String(r?.eventId || "") === selectedEvent.id
      ));
      if (mine) {
        existingReservationId = String(mine.id || "");
        for (const it of Array.isArray(mine.items) ? mine.items : []) {
          const cat = String(it?.category || "").toLowerCase();
          const id = String(it?.itemId || "");
          if (state.has(cat) && id) {
            state.get(cat).selectedIds.add(id);
            labelCache.set(cacheKey(cat, id), formatItemLabelFromParts(it?.itemLabel, it?.itemNumber, id));
          }
        }
      }
    } catch (e) {
      // Brak podglądu istniejącej rezerwacji nie blokuje utworzenia nowej — cichy fallback.
    }
    snapshotBaseline();
  };

  const resolvedCount = (cat) => state.get(cat)?.selectedIds.size || 0;

  const updateSummaryAndButton = () => {
    saveBtn.textContent = existingReservationId ? "Edytuj" : "Rezerwuj";
    deleteBtn.classList.toggle("hidden", !existingReservationId);

    const dirty = isDirty();
    const catsWithItems = GEAR_TABS
      .map((t) => ({ tab: t, ids: Array.from(state.get(t.id).selectedIds) }))
      .filter((x) => x.ids.length > 0);

    let statusLine;
    if (!catsWithItems.length) {
      statusLine = "Nic jeszcze nie wybrano.";
    } else if (existingReservationId && !dirty) {
      statusLine = "Zapisano na imprezę:";
    } else if (existingReservationId && dirty) {
      statusLine = "Niezapisane zmiany (kliknij „Edytuj”, aby zapisać):";
    } else {
      statusLine = "Wybrano (kliknij „Rezerwuj”, aby zapisać):";
    }

    // Podsumowanie podzielone na kategorie — do wygodnej weryfikacji całej listy na
    // imprezę bez przełączania zakładek (feedback użytkownika 04.09.2026).
    const blocksHtml = catsWithItems.map(({ tab, ids }) => {
      const labels = ids.map((id) => formatItemLabel(tab.id, id)).sort((a, b) => a.localeCompare(b, "pl"));
      return `
        <div class="clubEventSummaryBlock">
          <div class="clubEventSummaryCatTitle">${escapeHtml(tab.label)} — ${ids.length} szt.</div>
          <ul class="clubEventSummaryList">${labels.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
        </div>
      `;
    }).join("");

    summaryEl.innerHTML = `<div class="clubEventSummaryStatus">${escapeHtml(statusLine)}</div>${blocksHtml}`;

    const total = GEAR_TABS.reduce((sum, t) => sum + resolvedCount(t.id), 0);
    saveBtn.disabled = total === 0 || !dirty;
  };

  const loadCategory = async (cat) => {
    const s = state.get(cat);
    if (s.loaded) return;
    catBodyEl.innerHTML = `<div class="hint">Ładuję dostępność...</div>`;
    try {
      const url = `${GEAR_ITEM_AVAILABILITY_URL}?category=${encodeURIComponent(cat)}&startDate=${encodeURIComponent(selectedEvent.startDate)}&endDate=${encodeURIComponent(selectedEvent.endDate)}`;
      const resp = await apiGetJson({ url, idToken: ctx.idToken });
      s.items = Array.isArray(resp?.items) ? resp.items : [];
      s.loaded = true;
    } catch (e) {
      catBodyEl.innerHTML = `<div class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się załadować dostępności."))}</div>`;
      return;
    }
  };

  const renderCategoryBody = (cat) => {
    const s = state.get(cat);

    if (!s.items.length) {
      catBodyEl.innerHTML = `<div class="hint">Brak sprzętu w tej kategorii.</div>`;
      return;
    }

    // Checkboxy per sztuka, identycznie dla każdej kategorii (kajaki i drobny
    // sprzęt). Świadomie BEZ skrótu "zaznacz pierwsze N wolnych" — kierownik
    // ma zawsze wskazać konkretne numery, nie zlecać systemowi dowolny wybór.
    const rows = s.items.map((it) => {
      const id = String(it?.id || "");
      const checked = s.selectedIds.has(id);
      // "zajęty" oznacza zablokowane przez CUDZĄ rezerwację — jeśli pozycja jest
      // już zaznaczona (czyli moja, wczytana z istniejącej rezerwacji na tę
      // imprezę), serwer i tak zgłasza ją jako niedostępną (bo koliduje z... samą
      // sobą), więc tu świadomie ignorujemy tę flagę, by dało się ją odznaczyć.
      const isAvail = it?.isAvailableForRange !== false || checked;
      // Numer inwentarzowy MUSI być widoczny — sprzęt jest fizycznie
      // identyfikowany po numerze, nie po nazwie modelu (ta bywa taka sama
      // dla wielu sztuk tego samego typu). Ten sam wzorzec "Nazwa (nr X)"
      // co buildKayakTitle() w my_reservations_module.js. Świadomie NIC
      // więcej (bez zakresu wag itp.) — tylko nazwa + numer, dla każdej kategorii.
      const displayLabel = formatItemLabelFromParts(it?.label, it?.number, id);
      labelCache.set(cacheKey(cat, id), displayLabel);
      return `
        <label class="clubEventItemRow${isAvail ? "" : " clubEventItemRowDisabled"}">
          <input type="checkbox" data-clubevent-item="${escapeAttr(id)}" ${checked ? "checked" : ""} ${isAvail ? "" : "disabled"} />
          <span>${escapeHtml(displayLabel)}</span>
          ${isAvail ? "" : `<span class="badge danger">zajęty</span>`}
        </label>
      `;
    }).join("");

    catBodyEl.innerHTML = `
      <div class="clubEventItemList">${rows}</div>
    `;

    catBodyEl.querySelectorAll("[data-clubevent-item]").forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.getAttribute("data-clubevent-item");
        if (el.checked) s.selectedIds.add(id); else s.selectedIds.delete(id);
        updateSummaryAndButton();
      });
    });
  };

  const showCategory = async (cat) => {
    activeCat = cat;
    viewEl.querySelectorAll("[data-clubevent-tab]").forEach((btn) => {
      const isActive = btn.getAttribute("data-clubevent-tab") === cat;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    await loadCategory(cat);
    renderCategoryBody(cat);
  };

  // Dostępność każdej kategorii jest wczytywana TYLKO RAZ per wizyta na zakładce
  // (loadCategory ma `if (s.loaded) return`) — świadomie, żeby nie odpytywać API
  // przy każdym przełączeniu zakładki. Ale to oznacza, że po zapisaniu/edycji/
  // usunięciu rezerwacji flaga "zajęty" w JUŻ wczytanych kategoriach staje się
  // NIEAKTUALNA (odzwierciedla stan sprzed zmiany) — bug zgłoszony przez
  // użytkownika 04.09.2026: rzutka pokazywała się jako zajęta mimo usunięcia jej
  // z rezerwacji. Naprawa: po KAŻDEJ udanej zmianie (zapis/edycja/usunięcie)
  // unieważniamy cache wszystkich kategorii i odświeżamy aktualnie widoczną.
  const invalidateAvailabilityAndRefresh = async () => {
    for (const s of state.values()) {
      s.loaded = false;
      s.items = [];
    }
    await loadCategory(activeCat);
    renderCategoryBody(activeCat);
  };

  viewEl.querySelectorAll("[data-clubevent-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showCategory(btn.getAttribute("data-clubevent-tab")));
  });

  // Przełączenie na inną imprezę (gdy kierownik prowadzi kilka naraz) — osobny
  // termin, osobna (albo brak) istniejąca rezerwacja, dostępność sprzętu do
  // przeładowania w całości (daty się zmieniły).
  const switchEvent = async (eventId) => {
    selectedEvent = events.find((e) => e.id === eventId) || events[0];
    applySelectedEventToHeader();
    existingReservationId = null;
    for (const s of state.values()) { s.loaded = false; s.items = []; s.selectedIds = new Set(); }
    baseline = new Map(GEAR_TABS.map((t) => [t.id, new Set()]));
    setErr(""); setOk("");
    await loadExisting();
    await showCategory(activeCat);
    updateSummaryAndButton();
  };

  pickerSelectEl?.addEventListener("change", () => switchEvent(pickerSelectEl.value));

  saveBtn.addEventListener("click", async () => {
    setErr(""); setOk("");

    const items = [];
    for (const t of GEAR_TABS) {
      const s = state.get(t.id);
      for (const id of s.selectedIds) items.push({ itemId: id, category: t.id });
    }

    if (!items.length) {
      setErr(existingReservationId ?
        "Wybierz przynajmniej jedną pozycję albo użyj przycisku „Usuń rezerwację” poniżej, aby zrezygnować z całego sprzętu na imprezę." :
        "Wybierz przynajmniej jedną pozycję.");
      return;
    }

    saveBtn.disabled = true;
    try {
      let resp;
      if (existingReservationId) {
        resp = await apiPostJson({
          url: UPDATE_BUNDLE_RESERVATION_ITEMS_URL,
          idToken: ctx.idToken,
          body: { reservationId: existingReservationId, items },
        });
      } else {
        resp = await apiPostJson({
          url: CREATE_BUNDLE_RESERVATION_URL,
          idToken: ctx.idToken,
          body: {
            items,
            starterCategory: items[0].category,
            starterItemId: items[0].itemId,
            asClubEvent: true,
            eventId: selectedEvent.id,
          },
        });
        existingReservationId = String(resp?.reservationId || "") || existingReservationId;
      }
      setOk(`Zapisano listę sprzętu na imprezę klubową (bezpłatnie) — liczba pozycji: ${items.length}.`);
      snapshotBaseline();
      await invalidateAvailabilityAndRefresh();
    } catch (e) {
      setErr(mapUserFacingApiError(e, "Nie udało się zapisać rezerwacji."));
    } finally {
      updateSummaryAndButton();
    }
  });

  cancelBtn.addEventListener("click", () => {
    if (isDirty() && !window.confirm("Masz niezapisane zmiany na liście — na pewno wyjść bez zapisywania?")) {
      return;
    }
    window.location.hash = "#home/home";
  });

  deleteBtn.addEventListener("click", async () => {
    if (!existingReservationId) return;
    if (!window.confirm("Na pewno usunąć całą rezerwację sprzętu na tę imprezę? Tej operacji nie można cofnąć.")) {
      return;
    }
    setErr(""); setOk("");
    deleteBtn.disabled = true;
    try {
      await apiPostJson({
        url: CANCEL_RESERVATION_URL,
        idToken: ctx.idToken,
        body: { reservationId: existingReservationId },
      });
      existingReservationId = null;
      for (const s of state.values()) s.selectedIds = new Set();
      snapshotBaseline();
      await invalidateAvailabilityAndRefresh();
      setOk("Rezerwacja usunięta.");
    } catch (e) {
      setErr(mapUserFacingApiError(e, "Nie udało się usunąć rezerwacji."));
    } finally {
      deleteBtn.disabled = false;
      updateSummaryAndButton();
    }
  });

  await loadExisting();
  await showCategory(activeCat);
  updateSummaryAndButton();
}
