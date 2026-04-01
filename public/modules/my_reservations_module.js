import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { setHash } from "/core/router.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const MY_RESERVATIONS_URL = "/api/gear/my-reservations";
const KAYAKS_URL = "/api/gear/kayaks";
const UPDATE_RESERVATION_URL = "/api/gear/reservations/update";
const CANCEL_RESERVATION_URL = "/api/gear/reservations/cancel";

export function createMyReservationsModule({ id, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      const r = String(routeId || "").trim() || "list";

      if (!ctx?.idToken) {
        viewEl.innerHTML = `
          <div class="card center">
            <h2>${escapeHtml(label)}</h2>
            <p>Brak tokenu sesji. Odśwież stronę.</p>
          </div>
        `;
        return;
      }

      // Jeśli routeId to ID rezerwacji (nie "list") — renderuj dedykowany widok edycji
      if (r !== "list") {
        await renderDedicatedEditView({ viewEl, reservationId: r, ctx });
        return;
      }

      // ── Widok listy ──────────────────────────────────────────────────────────

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader">
            <h2>${escapeHtml(label)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>

          <div class="actions" style="margin-top:12px; justify-content:space-between;">
            <div class="hint">Tutaj są tylko Twoje rezerwacje. Sprzęt został od tego oddzielony.</div>
            <button id="myReservationsReloadBtn" type="button">Odśwież</button>
          </div>

          <div id="myReservationsOk" class="ok hidden" style="margin-top:12px;"></div>
          <div id="myReservationsErr" class="err hidden" style="margin-top:12px;"></div>

          <div id="myReservationsList" style="margin-top:12px;"></div>
        </div>

        <div id="reservationEditModal" class="gearModal hidden" aria-hidden="true">
          <div class="gearModalBackdrop" data-edit-modal-close="1"></div>
          <div class="gearModalCard" role="dialog" aria-modal="true" aria-label="Edytuj rezerwację">
            <div class="gearModalTop">
              <div class="gearModalTitle" id="reservationEditTitle">Edytuj rezerwację</div>
              <button class="gearModalClose" type="button" data-edit-modal-close="1" aria-label="Zamknij">✕</button>
            </div>

            <div class="gearModalBody">
              <div style="width:100%; max-width:520px;">
                <div class="row">
                  <label for="reservationEditKayak">Kajak</label>
                  <input id="reservationEditKayak" type="text" readonly />
                </div>

                <div class="row">
                  <label for="reservationEditStartDate">Data od</label>
                  <input id="reservationEditStartDate" type="date" />
                </div>

                <div class="row">
                  <label for="reservationEditEndDate">Data do</label>
                  <input id="reservationEditEndDate" type="date" />
                </div>

                <div id="reservationEditErr" class="err hidden"></div>
                <div id="reservationEditOk" class="ok hidden"></div>
              </div>
            </div>

            <div class="gearModalActions">
              <button id="reservationEditSaveBtn" type="button" class="primary">Zapisz zmiany</button>
              <button id="reservationEditCancelBtn" type="button" class="ghost" data-edit-modal-close="1">Zamknij</button>
            </div>
          </div>
        </div>
      `;

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("home", "home"));

      const listEl = viewEl.querySelector("#myReservationsList");
      const errEl = viewEl.querySelector("#myReservationsErr");
      const okEl = viewEl.querySelector("#myReservationsOk");
      const reloadBtn = viewEl.querySelector("#myReservationsReloadBtn");

      const editModalEl = viewEl.querySelector("#reservationEditModal");
      const editTitleEl = viewEl.querySelector("#reservationEditTitle");
      const editKayakEl = viewEl.querySelector("#reservationEditKayak");
      const editStartDateEl = viewEl.querySelector("#reservationEditStartDate");
      const editEndDateEl = viewEl.querySelector("#reservationEditEndDate");
      const editErrEl = viewEl.querySelector("#reservationEditErr");
      const editOkEl = viewEl.querySelector("#reservationEditOk");
      const editSaveBtn = viewEl.querySelector("#reservationEditSaveBtn");

      let reservations = [];
      let kayakMap = new Map();
      let editReservation = null;

      const setErr = (msg) => {
        errEl.textContent = String(msg || "");
        errEl.classList.toggle("hidden", !errEl.textContent);
      };

      const setOk = (msg) => {
        okEl.textContent = String(msg || "");
        okEl.classList.toggle("hidden", !okEl.textContent);
      };

      const setEditErr = (msg) => {
        editErrEl.textContent = String(msg || "");
        editErrEl.classList.toggle("hidden", !editErrEl.textContent);
      };

      const setEditOk = (msg) => {
        editOkEl.textContent = String(msg || "");
        editOkEl.classList.toggle("hidden", !editOkEl.textContent);
      };

      const closeEditModal = () => {
        editModalEl.classList.add("hidden");
        editModalEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        editReservation = null;
        setEditErr("");
        setEditOk("");
      };

      const openEditModal = (reservationId) => {
        const found = reservations.find((x) => String(x?.id || "") === String(reservationId || ""));
        if (!found) {
          setErr("Nie znaleziono rezerwacji.");
          return;
        }

        editReservation = found;

        const kayakTitles = getReservationKayakTitles(found, kayakMap);
        editTitleEl.textContent = "Edytuj rezerwację";
        editKayakEl.value = kayakTitles.join(", ") || "—";
        editStartDateEl.value = String(found?.startDate || "");
        editEndDateEl.value = String(found?.endDate || "");
        setEditErr("");
        setEditOk("");

        editModalEl.classList.remove("hidden");
        editModalEl.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      };

      const renderReservations = () => {
        // Ukryj aktywne rezerwacje których data zakończenia minęła
        const todayIso = new Date().toISOString().slice(0, 10);
        const visible = reservations.filter((rsv) => {
          if (String(rsv?.status || "") !== "active") return true;
          return String(rsv?.endDate || "") >= todayIso;
        });

        if (!visible.length) {
          listEl.innerHTML = `<div class="hint">Nie masz żadnych aktywnych rezerwacji.</div>`;
          return;
        }

        listEl.innerHTML = visible
          .map((rsv) => {
            const status = String(rsv?.status || "");
            const badge =
              status === "active"
                ? `<span class="badge ok">aktywna</span>`
                : `<span class="badge danger">${escapeHtml(status || "nieaktywna")}</span>`;

            const kayakTitles = getReservationKayakTitles(rsv, kayakMap);
            const canEdit = status === "active";
            const canCancel = status === "active";

            return `
              <div class="gearCard" style="margin-top:10px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(kayakTitles.join(", ") || "Rezerwacja")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(formatDayMonth(String(rsv?.blockStartIso || rsv?.startDate || "")))} – ${escapeHtml(formatDayMonth(String(rsv?.blockEndIso || rsv?.endDate || "")))} (${escapeHtml(pluralizeDays(countReservationDays(String(rsv?.startDate || ""), String(rsv?.endDate || ""))))})
                        · <strong>${escapeHtml(String(rsv?.costHours ?? "—"))} godz.</strong>
                      </div>
                    </div>
                    <div class="gearBadges">
                      ${badge}
                    </div>
                  </div>

                  <div class="actions" style="margin-top:10px;">
                    <button
                      type="button"
                      class="ghost"
                      data-rsv-edit="${escapeAttr(String(rsv?.id || ""))}"
                      ${canEdit ? "" : "disabled"}>
                      Zmień daty
                    </button>

                    <button
                      type="button"
                      class="ghost"
                      data-rsv-cancel="${escapeAttr(String(rsv?.id || ""))}"
                      ${canCancel ? "" : "disabled"}>
                      Anuluj
                    </button>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");
      };

      const loadKayakMap = async () => {
        const resp = await apiGetJson({
          url: KAYAKS_URL,
          idToken: ctx.idToken
        });

        const kayaks = Array.isArray(resp?.kayaks) ? resp.kayaks : [];
        kayakMap = new Map(
          kayaks.map((k) => [String(k?.id || ""), buildKayakTitle(k)])
        );
      };

      const loadReservations = async () => {
        setErr("");
        setOk("");
        listEl.innerHTML = `<div class="hint">Ładuję...</div>`;

        try {
          await loadKayakMap();

          const resp = await apiGetJson({
            url: MY_RESERVATIONS_URL,
            idToken: ctx.idToken
          });

          reservations = Array.isArray(resp?.items) ? resp.items : [];
          renderReservations();
        } catch (e) {
          setErr(mapUserFacingApiError(e, "Nie udało się pobrać rezerwacji."));
          listEl.innerHTML = "";
        }
      };

      const submitUpdateReservation = async () => {
        setEditErr("");
        setEditOk("");

        if (!editReservation?.id) {
          setEditErr("Brak rezerwacji do edycji.");
          return;
        }

        const startDate = String(editStartDateEl.value || "").trim();
        const endDate = String(editEndDateEl.value || "").trim();

        if (!startDate || !endDate) {
          setEditErr("Wybierz datę od i do.");
          return;
        }

        editSaveBtn.disabled = true;

        try {
          const resp = await apiPostJson({
            url: UPDATE_RESERVATION_URL,
            idToken: ctx.idToken,
            body: {
              reservationId: String(editReservation.id || ""),
              startDate,
              endDate
            }
          });

          setOk(`Rezerwacja zmieniona. Godzinki: ${String(resp?.costHours || 0)}`);
          closeEditModal();
          await loadReservations();
        } catch (e) {
          setEditErr(mapUserFacingApiError(e, "Nie udało się zmienić rezerwacji."));
        } finally {
          editSaveBtn.disabled = false;
        }
      };

      const submitCancelReservation = async (reservationId) => {
        setErr("");
        setOk("");

        const confirmed = window.confirm("Na pewno anulować tę rezerwację?");
        if (!confirmed) return;

        try {
          await apiPostJson({
            url: CANCEL_RESERVATION_URL,
            idToken: ctx.idToken,
            body: { reservationId }
          });

          setOk("Rezerwacja anulowana.");
          await loadReservations();
        } catch (e) {
          setErr(mapUserFacingApiError(e, "Nie udało się anulować rezerwacji."));
        }
      };

      listEl.addEventListener("click", (ev) => {
        const el = ev.target;
        if (!el || !el.closest) return;

        const editBtn = el.closest("[data-rsv-edit]");
        if (editBtn) {
          const reservationId = String(editBtn.getAttribute("data-rsv-edit") || "");
          openEditModal(reservationId);
          return;
        }

        const cancelBtn = el.closest("[data-rsv-cancel]");
        if (cancelBtn) {
          const reservationId = String(cancelBtn.getAttribute("data-rsv-cancel") || "");
          submitCancelReservation(reservationId);
        }
      });

      editModalEl.addEventListener("click", (ev) => {
        const t = ev.target;
        if (t && t.getAttribute && t.getAttribute("data-edit-modal-close") === "1") {
          closeEditModal();
        }
      });

      const keyAbort = new AbortController();
      new MutationObserver(() => keyAbort.abort()).observe(viewEl, { childList: true });
      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !editModalEl.classList.contains("hidden")) {
          closeEditModal();
        }
      }, { signal: keyAbort.signal });

      reloadBtn.addEventListener("click", loadReservations);
      editSaveBtn.addEventListener("click", submitUpdateReservation);

      await loadReservations();
    }
  };
}

// ── Dedykowany widok edycji (bez listy, bez modalu) ───────────────────────────
// Renderowany gdy routeId to ID rezerwacji, np. po kliknięciu "Edytuj" na dashboardzie.
// Po zapisie lub anulowaniu wraca na Start (#/home/home).

async function renderDedicatedEditView({ viewEl, reservationId, ctx }) {
  viewEl.innerHTML = `<div class="card center"><p class="hint">Ładowanie rezerwacji…</p></div>`;

  let rsv = null;
  let kayakMap = new Map();

  try {
    const [rsvResp, kayaksResp] = await Promise.all([
      apiGetJson({ url: MY_RESERVATIONS_URL, idToken: ctx.idToken }),
      apiGetJson({ url: KAYAKS_URL, idToken: ctx.idToken })
    ]);

    const reservations = Array.isArray(rsvResp?.items) ? rsvResp.items : [];
    rsv = reservations.find((x) => String(x?.id || "") === String(reservationId || "")) || null;

    const kayaks = Array.isArray(kayaksResp?.kayaks) ? kayaksResp.kayaks : [];
    kayakMap = new Map(kayaks.map((k) => [String(k?.id || ""), buildKayakTitle(k)]));
  } catch (e) {
    viewEl.innerHTML = `
      <div class="card center">
        <p class="err">Błąd ładowania: ${escapeHtml(e?.message || String(e))}</p>
        <button type="button" class="ghost" id="editBackBtn" style="margin-top:12px;">Wróć</button>
      </div>
    `;
    viewEl.querySelector("#editBackBtn")?.addEventListener("click", () => setHash("home", "home"));
    return;
  }

  if (!rsv) {
    viewEl.innerHTML = `
      <div class="card center">
        <p>Nie znaleziono rezerwacji.</p>
        <button type="button" class="ghost" id="editBackBtn" style="margin-top:12px;">Wróć</button>
      </div>
    `;
    viewEl.querySelector("#editBackBtn")?.addEventListener("click", () => setHash("home", "home"));
    return;
  }

  const kayakTitles = getReservationKayakTitles(rsv, kayakMap);
  const todayIso = new Date().toISOString().slice(0, 10);
  const blockStart = String(rsv?.blockStartIso || "");
  const canCancelReservation = blockStart && todayIso < blockStart;

  viewEl.innerHTML = `
    <div class="card center" style="max-width:480px;">
      <div class="moduleHeader">
        <h2>Edytuj rezerwację</h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>
      <p class="hint" style="margin-bottom:16px;">${escapeHtml(kayakTitles.join(", ") || "—")}</p>

      <div class="row">
        <label for="dedEditStartDate">Data od</label>
        <input id="dedEditStartDate" type="date" value="${escapeAttr(String(rsv.startDate || ""))}" />
      </div>

      <div class="row" style="margin-top:8px;">
        <label for="dedEditEndDate">Data do</label>
        <input id="dedEditEndDate" type="date" value="${escapeAttr(String(rsv.endDate || ""))}" />
      </div>

      <div id="dedEditErr" class="err hidden" style="margin-top:8px;"></div>
      <div id="dedEditOk" class="ok hidden" style="margin-top:8px;"></div>

      <div class="actions" style="margin-top:16px;">
        <button id="dedEditSaveBtn" type="button" class="primary">Zapisz zmiany</button>
        <button id="dedEditCancelBtn" type="button" class="ghost">Anuluj</button>
      </div>

      <hr style="margin:20px 0;border:none;border-top:1px solid var(--border,#e5e7eb);">

      <div id="dedCancelRsvErr" class="err hidden" style="margin-bottom:8px;"></div>

      <button id="dedCancelRsvBtn" type="button" class="ghost"${canCancelReservation ? "" : " disabled"}>
        Anuluj rezerwację
      </button>
      ${!canCancelReservation
        ? `<p class="hint" style="margin-top:6px;color:var(--muted,#6b7280);font-size:0.85em;">Nie można anulować — blokada już trwa (od ${escapeHtml(formatDatePL(blockStart))}).</p>`
        : ""}
    </div>
  `;

  viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
  viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("my_reservations", "list"));

  const saveBtn = viewEl.querySelector("#dedEditSaveBtn");
  const cancelBtn = viewEl.querySelector("#dedEditCancelBtn");
  const errEl = viewEl.querySelector("#dedEditErr");
  const okEl = viewEl.querySelector("#dedEditOk");
  const startDateEl = viewEl.querySelector("#dedEditStartDate");
  const endDateEl = viewEl.querySelector("#dedEditEndDate");
  const cancelRsvBtn = viewEl.querySelector("#dedCancelRsvBtn");
  const cancelRsvErrEl = viewEl.querySelector("#dedCancelRsvErr");

  const setErr = (msg) => {
    errEl.textContent = String(msg || "");
    errEl.classList.toggle("hidden", !errEl.textContent);
  };

  const setCancelRsvErr = (msg) => {
    cancelRsvErrEl.textContent = String(msg || "");
    cancelRsvErrEl.classList.toggle("hidden", !cancelRsvErrEl.textContent);
  };

  cancelBtn.addEventListener("click", () => setHash("home", "home"));

  if (cancelRsvBtn && canCancelReservation) {
    cancelRsvBtn.addEventListener("click", async () => {
      setCancelRsvErr("");
      if (!window.confirm("Na pewno anulować tę rezerwację? Tej operacji nie można cofnąć.")) return;
      cancelRsvBtn.disabled = true;
      try {
        await apiPostJson({
          url: CANCEL_RESERVATION_URL,
          idToken: ctx.idToken,
          body: { reservationId: String(rsv.id || "") }
        });
        setHash("home", "home");
      } catch (e) {
        cancelRsvBtn.disabled = false;
        setCancelRsvErr(mapUserFacingApiError(e, "Nie udało się anulować rezerwacji."));
      }
    });
  }

  saveBtn.addEventListener("click", async () => {
    setErr("");
    const startDate = String(startDateEl.value || "").trim();
    const endDate = String(endDateEl.value || "").trim();

    if (!startDate || !endDate) {
      setErr("Wybierz datę od i do.");
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      const resp = await apiPostJson({
        url: UPDATE_RESERVATION_URL,
        idToken: ctx.idToken,
        body: { reservationId: String(rsv.id || ""), startDate, endDate }
      });

      okEl.textContent = `Zapisano. Godzinki: ${String(resp?.costHours || 0)}`;
      okEl.classList.remove("hidden");

      window.setTimeout(() => setHash("home", "home"), 1000);
    } catch (e) {
      setErr(mapUserFacingApiError(e, "Nie udało się zmienić rezerwacji."));
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getReservationKayakTitles(rsv, kayakMap) {
  const kayakIds = Array.isArray(rsv?.kayakIds) ? rsv.kayakIds.map(String) : [];
  return kayakIds.map((id) => kayakMap.get(id) || `Kajak ID ${id}`);
}

function buildKayakTitle(k) {
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const number = String(k?.number || "").trim();

  const core = [brand, model].filter(Boolean).join(" ").trim() || "Kajak";
  return number ? `${core} (nr ${number})` : core;
}

function formatDayMonth(iso) {
  const months = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "—";
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1] || m[2]}`;
}

function countReservationDays(startDate, endDate) {
  try {
    const diff = Math.round((new Date(endDate + "T12:00:00") - new Date(startDate + "T12:00:00")) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

function pluralizeDays(n) {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

function formatDatePL(iso) {
  const s = String(iso || "").trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "-";
  const [yyyy, mm, dd] = s.split("-");
  return `${dd}.${mm}.${yyyy}`;
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