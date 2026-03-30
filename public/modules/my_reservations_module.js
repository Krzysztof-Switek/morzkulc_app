import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

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

      if (r !== "list") {
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
          <h2>${escapeHtml(label)}</h2>

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
                        Moja rezerwacja: ${escapeHtml(formatDatePL(String(rsv?.startDate || "")))} – ${escapeHtml(formatDatePL(String(rsv?.endDate || "")))}
                        · <strong>${escapeHtml(String(rsv?.costHours ?? "—"))} godz.</strong>
                      </div>
                      <div class="gearSubtitle muted">
                        Sprzęt niedostępny: ${escapeHtml(formatDatePL(String(rsv?.blockStartIso || "")))} – ${escapeHtml(formatDatePL(String(rsv?.blockEndIso || "")))}
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
