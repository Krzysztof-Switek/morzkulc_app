import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { storageFetchKayakCoverUrl, storageFetchKayakGalleryUrls } from "/core/firebase_client.js";

const GEAR_URL = "/api/gear/kayaks";
const CREATE_RESERVATION_URL = "/api/gear/reservations/create";
const GEAR_FAVORITES_URL = "/api/gear/favorites";
const GEAR_FAVORITES_TOGGLE_URL = "/api/gear/favorites/toggle";
const KAYAK_RESERVATIONS_URL = "/api/gear/kayak-reservations";

// Lokalny placeholder dostępny zawsze z aplikacji
const PLACEHOLDER_SVG = "/assets/kayak-placeholder.png";

const GEAR_TABS = [
  { id: "kayaks", label: "Kajaki" },
  { id: "paddles", label: "Wiosła" },
  { id: "lifejackets", label: "Kamizelki" },
  { id: "helmets", label: "Kaski" },
  { id: "throwbags", label: "Rzutki" },
  { id: "sprayskirts", label: "Fartuchy" }
];

export function createGearModule({ id, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      const requestedRoute = String(routeId || "").trim() || "kayaks";
      const activeTab = GEAR_TABS.find((t) => t.id === requestedRoute)?.id || "kayaks";
      const activeTabLabel = GEAR_TABS.find((t) => t.id === activeTab)?.label || "Kajaki";
      const isKayaksView = activeTab === "kayaks";

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
          <h2>${escapeHtml(label)} – ${escapeHtml(activeTabLabel)}</h2>

          <div class="gearTabs" role="tablist" aria-label="Kategorie sprzętu">
            ${GEAR_TABS.map((tab) => `
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
            <div class="gearToolbarTop">
              <div class="row" style="margin:0;">
                <label for="gearSearch">Szukaj</label>
                <input
                  id="gearSearch"
                  placeholder="${escapeAttr(
                    isKayaksView ?
                      "np. Diesel, Wave sport, niebieski, creek..." :
                      "np. Werner, L, czerwony, pool..."
                  )}"
                />
              </div>

              <div class="actions" style="margin:0;">
                <button id="gearReloadBtn" type="button" class="gearReloadBtn ghost" title="Odśwież" aria-label="Odśwież">${refreshIconSvg()}</button>
                <span id="gearMeta" class="hint"></span>
              </div>
            </div>

            ${
              isKayaksView ? `
                <div class="gearFiltersBar">
                  <label class="gearCheckPill" for="filterWorkingOnly">
                    <input id="filterWorkingOnly" type="checkbox" />
                    <span>Sprawny</span>
                  </label>

                  <label class="gearCheckPill" for="filterAvailableNowOnly">
                    <input id="filterAvailableNowOnly" type="checkbox" />
                    <span>Dostępny</span>
                  </label>

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
              <button class="gearModalClose" type="button" data-gear-modal-close="1" aria-label="Zamknij">✕</button>
            </div>
            <div class="gearModalBody">
              <img id="gearModalImg" alt="Zdjęcie sprzętu" />
            </div>
            <div id="gearModalThumbs" class="gearModalThumbs hidden"></div>
            <div class="gearModalActions">
              <button id="gearModalTopBtn" type="button" class="ghost">Zdjęcie 1</button>
              <button id="gearModalSideBtn" type="button" class="ghost">Zdjęcie 2</button>
              <button id="gearModalAllBtn" type="button" class="ghost hidden">Więcej zdjęć</button>
              <span class="hint" id="gearModalHint"></span>
            </div>
          </div>
        </div>

        <div id="gearReservationModal" class="gearModal hidden" aria-hidden="true">
          <div class="gearModalBackdrop" data-gear-reservation-close="1"></div>
          <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Rezerwacja kajaka">
            <div class="gearModalTop">
              <div class="gearModalTitle" id="gearReservationTitle">Rezerwacja</div>
              <button class="gearModalClose" type="button" data-gear-reservation-close="1" aria-label="Zamknij">✕</button>
            </div>

            <div class="gearModalBody">
              <div style="width:100%; max-width:520px;">
                <div id="reservationInfo" class="hint" style="margin-bottom:10px;">
                  Wybierz kajak i kliknij „Rezerwuj”.
                </div>

                <div id="reservationOk" class="ok hidden" style="margin-bottom:10px;"></div>
                <div id="reservationErr" class="err hidden" style="margin-bottom:10px;"></div>

                <div class="row" style="margin:0;">
                  <label for="reservationSelectedKayak">Wybrany kajak</label>
                  <input id="reservationSelectedKayak" type="text" value="" readonly />
                </div>

                <div class="row" style="margin-top:10px;">
                  <label for="reservationStartDate">Data od</label>
                  <input id="reservationStartDate" type="date" />
                </div>

                <div class="row" style="margin-top:10px;">
                  <label for="reservationEndDate">Data do</label>
                  <input id="reservationEndDate" type="date" />
                </div>

                <div class="hint" style="margin-top:10px;">
                  Rezerwacja blokuje sprzęt dla innych użytkowników. Koszt godzinek i konflikty terminów sprawdza backend.
                </div>

                <div id="reservationExistingSection" class="gearReservModalSection hidden">
                  <div class="gearReservModalTitle">Kiedy zajęty?</div>
                  <div id="reservationExistingContent"></div>
                </div>
              </div>
            </div>

            <div class="gearModalActions">
              <button id="reservationCreateBtn" type="button" class="primary">Zapisz rezerwację</button>
              <button id="reservationClearBtn" type="button" class="ghost">Wyczyść</button>
              <button type="button" class="ghost" data-gear-reservation-close="1">Zamknij</button>
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

      const errEl = viewEl.querySelector("#gearErr");
      const listEl = viewEl.querySelector("#gearList");
      const metaEl = viewEl.querySelector("#gearMeta");
      const reloadBtn = viewEl.querySelector("#gearReloadBtn");
      const searchEl = viewEl.querySelector("#gearSearch");
      const filterTypeSelectEl = viewEl.querySelector("#filterTypeSelect");

      const filterWorkingOnlyEl = viewEl.querySelector("#filterWorkingOnly");
      const filterAvailableNowOnlyEl = viewEl.querySelector("#filterAvailableNowOnly");
      const filterFavoritesOnlyEl = viewEl.querySelector("#filterFavoritesOnly");
      const filterSizeSelectEl = viewEl.querySelector("#filterSizeSelect");

      const reservationModalEl = viewEl.querySelector("#gearReservationModal");
      const reservationTitleEl = viewEl.querySelector("#gearReservationTitle");
      const reservationInfoEl = viewEl.querySelector("#reservationInfo");
      const reservationOkEl = viewEl.querySelector("#reservationOk");
      const reservationErrEl = viewEl.querySelector("#reservationErr");
      const reservationSelectedKayakEl = viewEl.querySelector("#reservationSelectedKayak");
      const reservationStartDateEl = viewEl.querySelector("#reservationStartDate");
      const reservationEndDateEl = viewEl.querySelector("#reservationEndDate");
      const reservationCreateBtn = viewEl.querySelector("#reservationCreateBtn");
      const reservationClearBtn = viewEl.querySelector("#reservationClearBtn");
      const reservationExistingSectionEl = viewEl.querySelector("#reservationExistingSection");
      const reservationExistingContentEl = viewEl.querySelector("#reservationExistingContent");

      const modalEl = viewEl.querySelector("#gearImgModal");
      const modalImgEl = viewEl.querySelector("#gearModalImg");
      const modalTitleEl = viewEl.querySelector("#gearModalTitle");
      const modalHintEl = viewEl.querySelector("#gearModalHint");
      const modalTopBtn = viewEl.querySelector("#gearModalTopBtn");
      const modalSideBtn = viewEl.querySelector("#gearModalSideBtn");
      const modalThumbsEl = viewEl.querySelector("#gearModalThumbs");
      const modalAllBtn = viewEl.querySelector("#gearModalAllBtn");

      let all = [];
      let favSet = new Set();
      let selectedKayak = null;

      const setErr = (msg) => {
        errEl.textContent = String(msg || "");
        errEl.classList.toggle("hidden", !errEl.textContent);
      };

      const setReservationErr = (msg) => {
        reservationErrEl.textContent = String(msg || "");
        reservationErrEl.classList.toggle("hidden", !reservationErrEl.textContent);
      };

      const setReservationOk = (msg) => {
        reservationOkEl.textContent = String(msg || "");
        reservationOkEl.classList.toggle("hidden", !reservationOkEl.textContent);
      };

      const clearReservationMessages = () => {
        setReservationErr("");
        setReservationOk("");
      };

      const syncReservationForm = () => {
        reservationSelectedKayakEl.value = selectedKayak ? selectedKayak.title : "";
        reservationInfoEl.textContent = selectedKayak
          ? `Wybrany kajak: ${selectedKayak.title}`
          : "Wybierz kajak i kliknij „Rezerwuj”.";
        reservationTitleEl.textContent = selectedKayak
          ? `Rezerwacja – ${selectedKayak.title}`
          : "Rezerwacja";
      };

      const clearReservationForm = () => {
        selectedKayak = null;
        reservationSelectedKayakEl.value = "";
        reservationStartDateEl.value = "";
        reservationEndDateEl.value = "";
        clearReservationMessages();
        syncReservationForm();
      };

      const loadAndRenderReservations = async (kayakId, containerEl, withCalendar = false) => {
        containerEl.innerHTML = `<div class="gearReservNoData">Ładuję...</div>`;
        try {
          const resp = await apiGetJson({
            url: `${KAYAK_RESERVATIONS_URL}?kayakId=${encodeURIComponent(kayakId)}`,
            idToken: ctx.idToken,
          });
          const reservations = Array.isArray(resp?.reservations) ? resp.reservations : [];
          containerEl.innerHTML = withCalendar
            ? renderReservationsContent(reservations)
            : renderReservationsSimple(reservations);
        } catch {
          containerEl.innerHTML = `<div class="gearReservNoData">Nie udało się załadować.</div>`;
        }
      };

      const openReservationModal = () => {
        reservationModalEl.classList.remove("hidden");
        reservationModalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      };

      const closeReservationModal = () => {
        reservationModalEl.classList.add("hidden");
        reservationModalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        clearReservationForm();
      };

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

      const startCreateForKayak = async (kayakId) => {
        const found = all.find((k) => String(k?.id || "") === String(kayakId || ""));
        if (!found) {
          setErr("Nie znaleziono kajaka.");
          return;
        }

        selectedKayak = {
          id: String(found.id || ""),
          title: buildKayakTitle(found)
        };

        clearReservationMessages();
        syncReservationForm();
        openReservationModal();
        reservationStartDateEl.focus();

        // Pokaż aktywne rezerwacje w modalu (z kalendarzem)
        if (reservationExistingSectionEl && reservationExistingContentEl) {
          reservationExistingSectionEl.classList.remove("hidden");
          await loadAndRenderReservations(String(found.id || ""), reservationExistingContentEl, true);
        }
      };

      const render = (items) => {
        if (!items.length) {
          listEl.innerHTML = `<div class="hint">Brak wyników.</div>`;
          metaEl.textContent = `Widoczne: 0 / ${all.length}`;
          return;
        }

        const cards = isKayaksView
          ? items.map((k) => renderKayakCard(k, favSet.has(String(k?.id || "")))).join("")
          : items.map((item) => renderGenericGearCard(item, favSet.has(String(item?.id || "")))).join("");

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
                imgEl.src = url;
                imgEl.classList.add("gearCoverLoaded");
                const btn = imgEl.closest("[data-gear-kayak-cover]");
                if (btn) btn.setAttribute("data-loaded-cover-url", url);
              })
              .catch((err) => console.error("[Storage] cover load failed for", num, err));
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

            if (workingOnly && !isWorking(item)) return false;
            if (availableNowOnly && item?.isReservedNow === true) return false;
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

      const submitCreateReservation = async () => {
        clearReservationMessages();

        if (!selectedKayak?.id) {
          setReservationErr("Najpierw wybierz kajak.");
          return;
        }

        const startDate = String(reservationStartDateEl.value || "").trim();
        const endDate = String(reservationEndDateEl.value || "").trim();
        if (!startDate || !endDate) {
          setReservationErr("Wybierz datę od i do.");
          return;
        }

        reservationCreateBtn.disabled = true;

        try {
          const resp = await apiPostJson({
            url: CREATE_RESERVATION_URL,
            idToken: ctx.idToken,
            body: {
              startDate,
              endDate,
              kayakIds: [selectedKayak.id],
            }
          });

          setReservationOk(
            `Rezerwacja zapisana. Godzinki: ${String(resp?.costHours || 0)}`
          );

          await loadGear("kayaks");

          window.setTimeout(() => {
            closeReservationModal();
          }, 700);
        } catch (e) {
          setReservationErr(mapUserFacingApiError(e, "Nie udało się zapisać rezerwacji."));
        } finally {
          reservationCreateBtn.disabled = false;
        }
      };

      let currentImgTop = "";
      let currentImgSide = "";
      let currentTitle = "";
      let currentKayakNumber = null;

      modalImgEl.onerror = () => {
        const currentSrc = String(modalImgEl.getAttribute("src") || "");
        if (currentSrc !== PLACEHOLDER_SVG) {
          modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
        }
        modalHintEl.textContent = "Brak zdjęcia.";
      };

      function openModal({ title, topUrl, sideUrl, prefer }) {
        currentTitle = String(title || "Zdjęcie");
        currentImgTop = String(topUrl || "");
        currentImgSide = String(sideUrl || "");
        currentKayakNumber = null;

        modalTitleEl.textContent = currentTitle;
        modalHintEl.textContent = "";

        // Reset kayak-only elements
        modalThumbsEl.innerHTML = "";
        modalThumbsEl.classList.add("hidden");
        modalAllBtn.classList.add("hidden");
        modalTopBtn.classList.remove("hidden");
        modalSideBtn.classList.remove("hidden");

        const hasTop = Boolean(currentImgTop);
        const hasSide = Boolean(currentImgSide);

        modalTopBtn.disabled = !hasTop;
        modalSideBtn.disabled = !hasSide;

        modalTopBtn.textContent = "Zdjęcie 1";
        modalSideBtn.textContent = "Zdjęcie 2";

        const choice = prefer === "side" ? "side" : "top";
        const start =
          choice === "side"
            ? (hasSide ? currentImgSide : currentImgTop)
            : (hasTop ? currentImgTop : currentImgSide);

        if (!start) {
          modalHintEl.textContent = "Brak zdjęcia.";
          modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
        } else {
          modalImgEl.setAttribute("src", start);
        }

        modalEl.classList.remove("hidden");
        modalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }

      async function openKayakPhotoModal({ number, title, preloadedUrl }) {
        currentKayakNumber = String(number || "");
        currentImgTop = "";
        currentImgSide = "";
        currentTitle = String(title || "Zdjęcia");

        modalTitleEl.textContent = currentTitle;
        modalThumbsEl.innerHTML = "";
        modalThumbsEl.classList.add("hidden");

        // Show kayak-only elements, hide generic ones
        modalTopBtn.classList.add("hidden");
        modalSideBtn.classList.add("hidden");
        modalAllBtn.classList.remove("hidden");
        modalAllBtn.disabled = false;
        modalAllBtn.textContent = "Więcej zdjęć";

        if (preloadedUrl) {
          // Zdjęcie już załadowane w karcie — użyj bez ponownego fetcha
          modalImgEl.setAttribute("src", preloadedUrl);
          modalHintEl.textContent = "";
        } else {
          modalImgEl.removeAttribute("src");
          modalHintEl.textContent = "Ładuję...";
        }

        modalEl.classList.remove("hidden");
        modalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (!preloadedUrl) {
          try {
            const url = await storageFetchKayakCoverUrl(currentKayakNumber);
            if (url) {
              modalImgEl.setAttribute("src", url);
              modalHintEl.textContent = "";
            } else {
              modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
              modalHintEl.textContent = "Brak zdjęcia okładkowego.";
              console.warn("[Storage] brak cover dla kajaka nr", currentKayakNumber);
            }
          } catch (err) {
            modalImgEl.setAttribute("src", PLACEHOLDER_SVG);
            modalHintEl.textContent = "Nie udało się załadować zdjęcia.";
            console.error("[Storage] błąd cover dla kajaka nr", currentKayakNumber, err);
          }
        }
      }

      function closeModal() {
        modalEl.classList.add("hidden");
        modalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        modalImgEl.removeAttribute("src");
        currentImgTop = "";
        currentImgSide = "";
        currentTitle = "";
        currentKayakNumber = null;
        modalHintEl.textContent = "";
        modalThumbsEl.innerHTML = "";
        modalThumbsEl.classList.add("hidden");
        modalAllBtn.classList.add("hidden");
        modalTopBtn.classList.remove("hidden");
        modalSideBtn.classList.remove("hidden");
      }

      modalEl.addEventListener("click", (ev) => {
        const t = ev.target;
        if (t && t.getAttribute && t.getAttribute("data-gear-modal-close") === "1") {
          closeModal();
        }
      });

      reservationModalEl.addEventListener("click", (ev) => {
        const t = ev.target;
        if (t && t.getAttribute && t.getAttribute("data-gear-reservation-close") === "1") {
          closeReservationModal();
        }
      });

      // AbortController: listener jest automatycznie usuwany gdy viewEl dostaje nową treść
      // (MutationObserver na firstChild) — zapobiega akumulacji listenerów przy nawigacji
      const keyAbort = new AbortController();
      new MutationObserver(() => keyAbort.abort()).observe(viewEl, { childList: true });
      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
        if (ev.key === "Escape" && !reservationModalEl.classList.contains("hidden")) closeReservationModal();
      }, { signal: keyAbort.signal });

      modalTopBtn.addEventListener("click", () => {
        if (!currentImgTop) return;
        modalHintEl.textContent = "";
        modalImgEl.setAttribute("src", currentImgTop);
      });

      modalSideBtn.addEventListener("click", () => {
        if (!currentImgSide) return;
        modalHintEl.textContent = "";
        modalImgEl.setAttribute("src", currentImgSide);
      });

      modalAllBtn.addEventListener("click", async () => {
        if (!currentKayakNumber) return;
        modalAllBtn.disabled = true;
        modalHintEl.textContent = "Ładuję galerię...";

        try {
          const urls = await storageFetchKayakGalleryUrls(currentKayakNumber);
          if (!urls.length) {
            modalHintEl.textContent = "Brak zdjęć w galerii.";
            modalAllBtn.disabled = false;
            return;
          }
          modalThumbsEl.innerHTML = urls
            .map((url) => `<button class="gearThumbBtn" type="button" data-thumb-url="${escapeAttr(url)}"><img src="${escapeAttr(url)}" alt="" loading="lazy" /></button>`)
            .join("");
          modalThumbsEl.classList.remove("hidden");
          modalAllBtn.classList.add("hidden");
          modalHintEl.textContent = `${urls.length} zdjęć`;
          if (urls.length > 0) {
            modalImgEl.setAttribute("src", urls[0]);
          }
        } catch {
          modalHintEl.textContent = "Nie udało się załadować galerii.";
          modalAllBtn.disabled = false;
        }
      });

      modalThumbsEl.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-thumb-url]");
        if (!btn) return;
        const url = String(btn.getAttribute("data-thumb-url") || "");
        if (url) modalImgEl.setAttribute("src", url);
      });

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

        const reserveBtn = el.closest("[data-gear-reserve]");
        if (reserveBtn) {
          const kayakId = String(reserveBtn.getAttribute("data-gear-reserve") || "");
          await startCreateForKayak(kayakId);
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

            // Lazy-load rezerwacji przy pierwszym otwarciu karty kajaka
            if (!wasOpen && card) {
              const cardKayakId = String(card.getAttribute("data-gear-card-id") || "");
              const reservSection = card.querySelector(".gearReservSection");
              const reservContent = card.querySelector(".gearReservSectionContent");
              if (cardKayakId && reservSection && reservContent && !reservSection.getAttribute("data-loaded")) {
                reservSection.setAttribute("data-loaded", "1");
                loadAndRenderReservations(cardKayakId, reservContent);
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
      if (filterTypeSelectEl) filterTypeSelectEl.addEventListener("change", applyFilter);
      if (filterSizeSelectEl) filterSizeSelectEl.addEventListener("change", applyFilter);

      reservationCreateBtn.addEventListener("click", async () => {
        await submitCreateReservation();
      });

      reservationClearBtn.addEventListener("click", () => {
        clearReservationMessages();
        reservationStartDateEl.value = "";
        reservationEndDateEl.value = "";
      });

      syncReservationForm();
      await loadGear(activeTab);
    }
  };
}

function renderKayakCard(k, isFav = false) {
  const number = String(k?.number || "").trim();
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const type = String(k?.type || "").trim();
  const color = String(k?.color || "").trim();

  const working = isWorking(k);
  const reservedNow = k?.isReservedNow === true;

  const isPrivate = toBool(k?.isPrivate);
  const privateRent = toBool(k?.privateForRent) || toBool(k?.isPrivateRentable);

  const canReserve = working && (!isPrivate || privateRent);

  const workingBadge = working
    ? `<span class="badge ok">sprawny</span>`
    : `<span class="badge danger">niesprawny</span>`;

  const availabilityBadge = reservedNow
    ? `<span class="badge danger">rezerwacja</span>`
    : `<span class="badge soft">wolny</span>`;

  const typeBadge = type
    ? `<span class="badge soft">${escapeHtml(type)}</span>`
    : "";

  const imgTop = String(k?.images?.top || "").trim();
  const imgSide = String(k?.images?.side || "").trim();

  const title = buildKayakTitle(k);
  const detailsRows = buildKayakDetailsRows(k);

  return `
    <div class="gearCard ${working ? "gearOk" : "gearBad"}" data-gear-card-id="${escapeAttr(String(k?.id || ""))}">
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
              ${availabilityBadge}
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
              <div class="gearImgLabel">Zdjecia</div>
            </div>
          </button>
        </div>

        <div class="actions gearCardActions">
          <button
            type="button"
            data-gear-reserve="${escapeAttr(String(k?.id || ""))}"
            ${canReserve ? "" : "disabled"}>
            Rezerwuj
          </button>
          <button type="button" class="ghost gearMoreBtn">Więcej</button>
        </div>

        <div class="gearMiniBar">
          <div class="gearMiniIcons">
            <span class="gearMiniStatusIcon ${working ? "gearMiniOk" : "gearMiniBad"}"
              title="${working ? "Sprawny" : "Niesprawny"}">${workingIconSvg(working)}</span>
            ${reservedNow ? `<span class="gearMiniStatusIcon gearMiniLocked" title="Zarezerwowany teraz">${lockIconSvg()}</span>` : ""}
            <button type="button" class="gearMiniMoreBtn gearMoreBtn" title="Szczegóły" aria-label="Szczegóły">${dotsIconSvg()}</button>
          </div>
          <button
            type="button"
            class="gearMiniReserveBtn"
            data-gear-reserve="${escapeAttr(String(k?.id || ""))}"
            ${canReserve ? "" : "disabled"}>Rezerwuj</button>
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

function renderGenericGearCard(item, isFav = false) {
  const number = String(item?.number || "").trim();
  const brand = String(item?.brand || "").trim();
  const model = String(item?.model || "").trim();
  const color = String(item?.color || "").trim();
  const size = String(item?.size || "").trim();
  const type = String(item?.type || "").trim();
  const status = String(item?.status || "").trim();
  const categoryLabel = String(item?.gearCategoryDisplay || item?.gearCategory || "Sprzęt").trim();

  const imgMain = String(item?.images?.main || item?.image || "").trim();
  const imgTop = String(item?.images?.top || "").trim();
  const imgSide = String(item?.images?.side || "").trim();

  const primaryImg = imgMain || imgTop;
  const secondaryImg = imgSide || "";

  const title = buildGenericGearTitle(item);
  const detailsRows = buildGenericGearDetailsRows(item);

  const typeBadge = type
    ? `<span class="badge soft">${escapeHtml(type)}</span>`
    : "";

  const sizeBadge = size
    ? `<span class="badge soft">rozm. ${escapeHtml(size)}</span>`
    : "";

  const statusBadge = status
    ? `<span class="badge soft">${escapeHtml(status)}</span>`
    : "";

  return `
    <div class="gearCard gearOk">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitle">${escapeHtml(brand || categoryLabel)}</div>
            <div class="gearModel">${escapeHtml(model || "-")}</div>
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Kategoria:</strong> ${escapeHtml(categoryLabel)}</div>
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Nr:</strong> ${escapeHtml(number || "-")}</div>
            ${color ? `<div class="gearInlineMeta gearInlineMetaMain"><strong>Kolor:</strong> ${escapeHtml(color)}</div>` : ""}
          </div>

          <div class="gearHeadSide">
            <button
              class="gearFavBtn${isFav ? " active" : ""}"
              type="button"
              data-gear-fav="${escapeAttr(String(item?.id || ""))}"
              aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
            >${heartSvg(isFav)}</button>
            <div class="gearBadges gearBadgesStack">
              ${typeBadge}
              ${sizeBadge}
              ${statusBadge}
            </div>
          </div>
        </div>

        <div class="gearImgs">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-img="top"
            data-gear-top="${escapeAttr(primaryImg)}"
            data-gear-side="${escapeAttr(secondaryImg)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img alt="" loading="lazy" src="${escapeAttr(PLACEHOLDER_SVG)}" />
              <div class="gearImgLabel">Zdjęcie 1</div>
            </div>
          </button>

          <button
            class="gearImgBtn"
            type="button"
            data-gear-img="side"
            data-gear-top="${escapeAttr(primaryImg)}"
            data-gear-side="${escapeAttr(secondaryImg)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img alt="" loading="lazy" src="${escapeAttr(PLACEHOLDER_SVG)}" />
              <div class="gearImgLabel">Zdjęcie 2</div>
            </div>
          </button>
        </div>

        <div class="actions gearCardActions">
          <button type="button" class="ghost gearMoreBtn">Więcej</button>
        </div>

        <details class="gearDetails">
          <summary class="gearDetailsSummary">Więcej</summary>
          <div class="gearMeta">
            ${detailsRows}
          </div>
        </details>

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

function buildGenericGearDetailsRows(item) {
  const meta = item?.meta || {};

  const rows = [
    ["Kategoria", item?.gearCategoryDisplay || item?.gearCategory],
    ["Typ", item?.type],
    ["Rozmiar", item?.size],
    ["Kolor", item?.color],
    ["Status", item?.status],
    ["Długość (cm)", meta?.lengthCm],
    ["Kąt feather", meta?.featherAngle],
    ["Wyporność", meta?.buoyancy],
    ["Materiał", meta?.material],
    ["Rozmiar komina", meta?.tunnelSize],
    ["Składane?", toBoolOrNull(meta?.isBreakdown) === null ? "" : (toBool(meta?.isBreakdown) ? "tak" : "nie")],
    ["Basen?", toBoolOrNull(meta?.isPoolAllowed) === null ? "" : (toBool(meta?.isPoolAllowed) ? "tak" : "nie")],
    ["Nizinne?", toBoolOrNull(meta?.isLowlandAllowed) === null ? "" : (toBool(meta?.isLowlandAllowed) ? "tak" : "nie")],
    ["Uwagi", item?.notes]
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
        <div class="gearMetaKey">Informacje</div>
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
    return `
      <div class="gearReservSimpleRow">
        <div class="gearReservSimpleDates">Zajęty: ${escapeHtml(start)} – ${escapeHtml(end)}</div>
        <div class="gearReservSimpleUser">Wypożyczony przez: ${escapeHtml(r.userDisplayName || "—")}</div>
      </div>
    `;
  }).join("");
}

function renderReservationsContent(reservations) {
  return renderReservationsSimple(reservations);
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
    default:
      return "";
  }
}
