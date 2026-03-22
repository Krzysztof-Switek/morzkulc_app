import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const KAYAKS_URL = "/api/gear/kayaks";
const CREATE_RESERVATION_URL = "/api/gear/reservations/create";

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
              >
                ${escapeHtml(tab.label)}
              </button>
            `).join("")}
          </div>

          ${
            isKayaksView ? `
              <div class="gearToolbar">
                <div class="gearToolbarTop">
                  <div class="row" style="margin:0;">
                    <label for="kayaksSearch">Szukaj</label>
                    <input id="kayaksSearch" placeholder="np. Diesel, Wave sport, niebieski, creek..." />
                    <div class="hint">Szukaj po dowolnej informacji o kajaku.</div>
                  </div>

                  <div class="actions" style="margin:0;">
                    <button id="kayaksReloadBtn" type="button">Odśwież</button>
                    <span id="kayaksMeta" class="hint"></span>
                  </div>
                </div>

                <div class="gearFiltersBar">
                  <label class="gearCheckPill" for="filterWorkingOnly">
                    <input id="filterWorkingOnly" type="checkbox" />
                    <span>Sprawny</span>
                  </label>

                  <label class="gearCheckPill" for="filterAvailableNowOnly">
                    <input id="filterAvailableNowOnly" type="checkbox" />
                    <span>Dostępny teraz</span>
                  </label>

                  <div class="gearTypeFilter">
                    <label for="filterTypeSelect">Typ</label>
                    <select id="filterTypeSelect">
                      <option value="">Wszystkie typy</option>
                    </select>
                  </div>
                </div>

                <div id="kayaksErr" class="err hidden"></div>
                <div id="kayaksList"></div>
              </div>
            ` : `
              <div class="gearComingSoon card center">
                <h3>${escapeHtml(activeTabLabel)}</h3>
                <p>Dostępne wkrótce</p>
              </div>
            `
          }
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
            <div class="gearModalActions">
              <button id="gearModalTopBtn" type="button" class="ghost">Z góry</button>
              <button id="gearModalSideBtn" type="button" class="ghost">Z boku</button>
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

                <div class="row" style="margin-top:10px;">
                  <label for="reservationNote">Notatka</label>
                  <textarea id="reservationNote" rows="3" placeholder="Opcjonalna notatka"></textarea>
                </div>

                <div class="hint" style="margin-top:10px;">
                  Rezerwacja blokuje sprzęt dla innych użytkowników. Koszt godzinek i konflikty terminów sprawdza backend.
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

      if (!isKayaksView) {
        return;
      }

      const errEl = viewEl.querySelector("#kayaksErr");
      const listEl = viewEl.querySelector("#kayaksList");
      const metaEl = viewEl.querySelector("#kayaksMeta");
      const reloadBtn = viewEl.querySelector("#kayaksReloadBtn");
      const searchEl = viewEl.querySelector("#kayaksSearch");
      const filterWorkingOnlyEl = viewEl.querySelector("#filterWorkingOnly");
      const filterAvailableNowOnlyEl = viewEl.querySelector("#filterAvailableNowOnly");
      const filterTypeSelectEl = viewEl.querySelector("#filterTypeSelect");

      const reservationModalEl = viewEl.querySelector("#gearReservationModal");
      const reservationTitleEl = viewEl.querySelector("#gearReservationTitle");
      const reservationInfoEl = viewEl.querySelector("#reservationInfo");
      const reservationOkEl = viewEl.querySelector("#reservationOk");
      const reservationErrEl = viewEl.querySelector("#reservationErr");
      const reservationSelectedKayakEl = viewEl.querySelector("#reservationSelectedKayak");
      const reservationStartDateEl = viewEl.querySelector("#reservationStartDate");
      const reservationEndDateEl = viewEl.querySelector("#reservationEndDate");
      const reservationNoteEl = viewEl.querySelector("#reservationNote");
      const reservationCreateBtn = viewEl.querySelector("#reservationCreateBtn");
      const reservationClearBtn = viewEl.querySelector("#reservationClearBtn");

      const modalEl = viewEl.querySelector("#gearImgModal");
      const modalImgEl = viewEl.querySelector("#gearModalImg");
      const modalTitleEl = viewEl.querySelector("#gearModalTitle");
      const modalHintEl = viewEl.querySelector("#gearModalHint");
      const modalTopBtn = viewEl.querySelector("#gearModalTopBtn");
      const modalSideBtn = viewEl.querySelector("#gearModalSideBtn");

      let all = [];
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
        reservationNoteEl.value = "";
        clearReservationMessages();
        syncReservationForm();
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
        const currentValue = String(filterTypeSelectEl.value || "");
        const types = Array.from(
          new Set(
            items
              .map((k) => normalizeTypeValue(k?.type))
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

      const startCreateForKayak = (kayakId) => {
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
      };

      const render = (items) => {
        if (!items.length) {
          listEl.innerHTML = `<div class="hint">Brak wyników.</div>`;
          metaEl.textContent = `Widoczne: 0 / ${all.length}`;
          return;
        }

        const cards = items.map((k) => renderKayakCard(k)).join("");

        listEl.innerHTML = `
          <div class="gearGrid">
            ${cards}
          </div>
        `;

        metaEl.textContent = `Widoczne: ${items.length} / ${all.length}`;
      };

      const applyFilter = () => {
        const q = String(searchEl.value || "").trim().toLowerCase();
        const workingOnly = filterWorkingOnlyEl.checked === true;
        const availableNowOnly = filterAvailableNowOnlyEl.checked === true;
        const selectedType = normalizeTypeValue(filterTypeSelectEl.value || "");

        const filtered = all.filter((k) => {
          if (workingOnly && !isWorking(k)) return false;
          if (availableNowOnly && k?.isReservedNow === true) return false;

          if (selectedType) {
            const kayakType = normalizeTypeValue(k?.type);
            if (kayakType !== selectedType) return false;
          }

          if (!q) return true;

          const hay = [
            k?.number,
            k?.brand,
            k?.model,
            k?.type,
            k?.color,
            k?.status,
            k?.reservedNowLabel,
            k?.liters,
            k?.weightRange,
            k?.storage,
            k?.notes,
            k?.owner,
            k?.deck,
            k?.cockpit,
            k?.material
          ]
            .map((x) => String(x || "").toLowerCase())
            .join(" ");

          return hay.includes(q);
        });

        render(filtered);
      };

      const loadKayaks = async () => {
        setErr("");
        listEl.innerHTML = `<div class="hint">Ładuję...</div>`;
        metaEl.textContent = "";

        try {
          const resp = await apiGetJson({
            url: KAYAKS_URL,
            idToken: ctx.idToken
          });

          all = Array.isArray(resp?.kayaks) ? resp.kayaks : [];
          populateTypeFilter(all);
          applyFilter();
        } catch (e) {
          setErr(mapUserFacingApiError(e, "Nie udało się pobrać kajaków."));
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
        const note = String(reservationNoteEl.value || "").trim();

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
              note
            }
          });

          setReservationOk(
            `Rezerwacja zapisana. Godzinki: ${String(resp?.costHours || 0)}`
          );

          await loadKayaks();

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

        modalTitleEl.textContent = currentTitle;
        modalHintEl.textContent = "";

        const hasTop = Boolean(currentImgTop);
        const hasSide = Boolean(currentImgSide);

        modalTopBtn.disabled = !hasTop;
        modalSideBtn.disabled = !hasSide;

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

      function closeModal() {
        modalEl.classList.add("hidden");
        modalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        modalImgEl.removeAttribute("src");
        currentImgTop = "";
        currentImgSide = "";
        currentTitle = "";
        modalHintEl.textContent = "";
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

      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
        if (ev.key === "Escape" && !reservationModalEl.classList.contains("hidden")) closeReservationModal();
      });

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

      listEl.addEventListener("click", (ev) => {
        const el = ev.target;
        if (!el || !el.closest) return;

        const reserveBtn = el.closest("[data-gear-reserve]");
        if (reserveBtn) {
          const kayakId = String(reserveBtn.getAttribute("data-gear-reserve") || "");
          startCreateForKayak(kayakId);
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
            detailsEl.open = !detailsEl.open;
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
        await loadKayaks();
      });

      searchEl.addEventListener("input", applyFilter);
      filterWorkingOnlyEl.addEventListener("change", applyFilter);
      filterAvailableNowOnlyEl.addEventListener("change", applyFilter);
      filterTypeSelectEl.addEventListener("change", applyFilter);

      reservationCreateBtn.addEventListener("click", async () => {
        await submitCreateReservation();
      });

      reservationClearBtn.addEventListener("click", () => {
        clearReservationMessages();
        reservationStartDateEl.value = "";
        reservationEndDateEl.value = "";
        reservationNoteEl.value = "";
      });

      syncReservationForm();
      await loadKayaks();
    }
  };
}

function renderKayakCard(k) {
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
    <div class="gearCard ${working ? "gearOk" : "gearBad"}">
      <div class="gearCardInner">

        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitle">${escapeHtml(brand || "Kajak")}</div>
            <div class="gearModel">${escapeHtml(model || "-")}</div>
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Kolor:</strong> ${escapeHtml(color || "-")}</div>
            <div class="gearInlineMeta gearInlineMetaMain"><strong>Nr:</strong> ${escapeHtml(number || "-")}</div>
          </div>

          <div class="gearHeadSide">
            <div class="gearBadges gearBadgesStack">
              ${workingBadge}
              ${availabilityBadge}
              ${typeBadge}
            </div>
          </div>
        </div>

        <div class="gearImgs">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-img="top"
            data-gear-top="${escapeAttr(imgTop)}"
            data-gear-side="${escapeAttr(imgSide)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img alt="" loading="lazy" src="${escapeAttr(PLACEHOLDER_SVG)}" />
              <div class="gearImgLabel">Z góry</div>
            </div>
          </button>

          <button
            class="gearImgBtn"
            type="button"
            data-gear-img="side"
            data-gear-top="${escapeAttr(imgTop)}"
            data-gear-side="${escapeAttr(imgSide)}"
            data-gear-title="${escapeAttr(title)}">
            <div class="gearImgPh">
              <img alt="" loading="lazy" src="${escapeAttr(PLACEHOLDER_SVG)}" />
              <div class="gearImgLabel">Z boku</div>
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
        <div class="gearMetaKey">${escapeHtml(String(key))}</div>
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

function normalizeTypeValue(v) {
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
