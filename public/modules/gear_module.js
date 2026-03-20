import { apiGetJson, apiPostJson } from "/core/api_client.js";

const KAYAKS_URL = "/api/gear/kayaks";
const CREATE_RESERVATION_URL = "/api/gear/reservations/create";

// CC0 placeholder (SVG) – używany jako miniatura zanim user kliknie
const PLACEHOLDER_SVG = "https://www.svgrepo.com/download/426147/kayak.svg";

export function createGearModule({ id, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      const r = String(routeId || "").trim() || "kayaks";

      if (r !== "kayaks") {
        viewEl.innerHTML = `
          <div class="card center">
            <h2>${escapeHtml(label)}</h2>
            <p>Nieznana podstrona: <strong>${escapeHtml(r)}</strong></p>
          </div>
        `;
        return;
      }

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
          <h2>${escapeHtml(label)} – Kajaki</h2>

          <div class="gearToolbar">
            <div class="gearToolbarTop">
              <div class="row" style="margin:0;">
                <label for="kayaksSearch">Szukaj</label>
                <input id="kayaksSearch" placeholder="np. Diesel, Wave sport, niebieski, creek..." />
                <div class="hint">Filtruje po: nr, producent, model, typ, kolor, status, litry, zakres wag</div>
              </div>

              <div class="actions" style="margin:0;">
                <button id="kayaksReloadBtn" type="button">Odśwież</button>
                <span id="kayaksMeta" class="hint"></span>
              </div>
            </div>

            <div class="card" style="margin-top:12px;">
              <h3 style="margin-top:0;">Rezerwacja</h3>

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

              <div class="actions" style="margin-top:12px;">
                <button id="reservationCreateBtn" type="button">Zapisz rezerwację</button>
                <button id="reservationClearBtn" type="button" class="ghost">Wyczyść</button>
              </div>

              <div class="hint" style="margin-top:10px;">
                Rezerwacja blokuje sprzęt dla innych użytkowników. Koszt godzinek i konflikty terminów sprawdza backend.
              </div>
            </div>

            <div id="kayaksErr" class="err hidden"></div>
            <div id="kayaksList"></div>
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
            <div class="gearModalActions">
              <button id="gearModalTopBtn" type="button" class="ghost">Z góry</button>
              <button id="gearModalSideBtn" type="button" class="ghost">Z boku</button>
              <span class="hint" id="gearModalHint"></span>
            </div>
          </div>
        </div>
      `;

      const errEl = viewEl.querySelector("#kayaksErr");
      const listEl = viewEl.querySelector("#kayaksList");
      const metaEl = viewEl.querySelector("#kayaksMeta");
      const reloadBtn = viewEl.querySelector("#kayaksReloadBtn");
      const searchEl = viewEl.querySelector("#kayaksSearch");

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

      const startCreateForKayak = (kayakId) => {
        const found = all.find((k) => String(k?.id || "") === String(kayakId || ""));
        if (!found) {
          setReservationErr("Nie znaleziono kajaka.");
          return;
        }

        selectedKayak = {
          id: String(found.id || ""),
          title: buildKayakTitle(found)
        };

        clearReservationMessages();
        syncReservationForm();
        reservationStartDateEl.focus();
        reservationSelectedKayakEl.scrollIntoView({ behavior: "smooth", block: "center" });
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
        if (!q) {
          render(all);
          return;
        }

        const filtered = all.filter((k) => {
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
            k?.notes
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
          render(all);
        } catch (e) {
          const msg = String(e?.message || e);
          setErr("Błąd pobierania kajaków: " + msg);
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
          clearReservationForm();
          await loadKayaks();
        } catch (e) {
          const msg = String(e?.message || e);
          setReservationErr("Nie udało się zapisać rezerwacji: " + msg);
        } finally {
          reservationCreateBtn.disabled = false;
        }
      };

      let currentImgTop = "";
      let currentImgSide = "";
      let currentTitle = "";

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
          modalImgEl.removeAttribute("src");
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

      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !modalEl.classList.contains("hidden")) closeModal();
      });

      modalTopBtn.addEventListener("click", () => {
        if (!currentImgTop) return;
        modalImgEl.setAttribute("src", currentImgTop);
      });

      modalSideBtn.addEventListener("click", () => {
        if (!currentImgSide) return;
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
        if (!imgBtn) return;

        const prefer = String(imgBtn.getAttribute("data-gear-img") || "top");
        const topUrl = String(imgBtn.getAttribute("data-gear-top") || "");
        const sideUrl = String(imgBtn.getAttribute("data-gear-side") || "");
        const title = String(imgBtn.getAttribute("data-gear-title") || "Zdjęcie");

        openModal({ title, topUrl, sideUrl, prefer });
      });

      reloadBtn.addEventListener("click", async () => {
        await loadKayaks();
      });

      searchEl.addEventListener("input", applyFilter);

      reservationCreateBtn.addEventListener("click", async () => {
        await submitCreateReservation();
      });

      reservationClearBtn.addEventListener("click", () => {
        clearReservationForm();
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

  const liters = k?.liters == null ? "" : String(k.liters);
  const weightRange = String(k?.weightRange || "").trim();
  const storage = String(k?.storage || "").trim();
  const isPrivate = toBool(k?.isPrivate);
  const privateRent = toBool(k?.privateForRent) || toBool(k?.isPrivateRentable);
  const ownerContact = String(k?.ownerContact || "").trim();
  const notes = String(k?.notes || "").trim();

  const canReserve = working && (!isPrivate || privateRent);

  const workingBadge = working
    ? `<span class="badge ok">sprawny</span>`
    : `<span class="badge danger">niesprawny</span>`;

  const availabilityBadge = reservedNow
    ? `<span class="badge danger">zarezerwowany teraz</span>`
    : `<span class="badge soft">dostępny teraz</span>`;

  const typeBadge = type ? `<span class="badge soft">${escapeHtml(type)}</span>` : "";

  const imgTop = String(k?.images?.top || "").trim();
  const imgSide = String(k?.images?.side || "").trim();

  const title = buildKayakTitle(k);
  const subtitleParts = [];
  if (number) subtitleParts.push("Nr " + number);
  if (color) subtitleParts.push(color);
  const subtitle = subtitleParts.join(" • ");

  const privacyLine = isPrivate
    ? (privateRent ? "Prywatny (do wypożyczenia)" : "Prywatny (nie do wypożyczenia)")
    : (storage ? storage : "");

  const detailsRows = [
    { k: "Dostępność", v: reservedNow ? "Zarezerwowany teraz" : "Dostępny teraz" },
    { k: "Pojemność", v: liters ? (liters + " L") : "-" },
    { k: "Zakres wag", v: weightRange || "-" },
    { k: "Składowanie", v: storage || "-" },
    { k: "Własność", v: isPrivate ? "Prywatny" : "Klub" },
    { k: "Kontakt", v: (isPrivate ? (ownerContact || "-") : "-") },
    { k: "Uwagi", v: notes || "-" }
  ];

  return `
    <div class="gearCard ${working ? "gearOk" : "gearBad"}">
      <div class="gearCardInner">
        <div class="gearHead">
          <div class="gearTitleWrap">
            <div class="gearTitle">${escapeHtml(title)}</div>
            <div class="gearSubtitle">${escapeHtml(subtitle)}</div>
            ${privacyLine ? `<div class="gearSubtitle">${escapeHtml(privacyLine)}</div>` : ""}
          </div>
          <div class="gearBadges">
            ${workingBadge}
            ${availabilityBadge}
            ${typeBadge}
          </div>
        </div>

        <div class="gearImgs">
          <button
            class="gearImgBtn"
            type="button"
            data-gear-img="top"
            data-gear-top="${escapeAttr(imgTop)}"
            data-gear-side="${escapeAttr(imgSide)}"
            data-gear-title="${escapeAttr(title)}"
            aria-label="Pokaż zdjęcie z góry">
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
            data-gear-title="${escapeAttr(title)}"
            aria-label="Pokaż zdjęcie z boku">
            <div class="gearImgPh">
              <img alt="" loading="lazy" src="${escapeAttr(PLACEHOLDER_SVG)}" />
              <div class="gearImgLabel">Z boku</div>
            </div>
          </button>
        </div>

        <div class="actions" style="margin-top:4px;">
          <button
            type="button"
            data-gear-reserve="${escapeAttr(String(k?.id || ""))}"
            ${canReserve ? "" : "disabled"}>
            Rezerwuj termin
          </button>
        </div>

        <details class="gearDetails">
          <summary class="gearDetailsSummary">Szczegóły</summary>
          <div class="gearMeta">
            ${detailsRows
              .map(
                (r) => `
                  <div class="gearMetaRow">
                    <div class="gearMetaKey">${escapeHtml(r.k)}</div>
                    <div class="gearMetaVal">${escapeHtml(r.v)}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </details>
      </div>
    </div>
  `;
}

function buildKayakTitle(k) {
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const number = String(k?.number || "").trim();

  const core = [brand, model].filter(Boolean).join(" ").trim() || "Kajak";
  return number ? `${core} (nr ${number})` : core;
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
