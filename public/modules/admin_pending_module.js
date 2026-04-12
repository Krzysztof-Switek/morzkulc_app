import { apiGetJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";
import { setHash } from "/core/router.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const ADMIN_PENDING_URL = "/api/admin/pending";

export function createAdminPendingModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, ctx }) {
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
            <h2>${escapeHtml(label)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>

          <div class="actions" style="margin-top:12px;">
            <div class="hint">Zatwierdzanie odbywa się w arkuszu Google — poniżej lista oczekujących pozycji.</div>
            <button id="adminPendingReloadBtn" type="button">Odśwież</button>
          </div>

          <div id="adminPendingErr" class="err hidden" style="margin-top:12px;"></div>
          <div id="adminPendingContent" style="margin-top:16px;"></div>
        </div>
      `;

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("home", "home"));

      const errEl = viewEl.querySelector("#adminPendingErr");
      const contentEl = viewEl.querySelector("#adminPendingContent");
      const reloadBtn = viewEl.querySelector("#adminPendingReloadBtn");

      const setErr = (msg) => {
        errEl.textContent = String(msg || "");
        errEl.classList.toggle("hidden", !errEl.textContent);
      };

      const renderContent = (data) => {
        const godzinki = data?.godzinki || { count: 0, items: [] };
        const events = data?.events || { count: 0, items: [] };

        let html = "";

        // Sekcja godzinki
        html += `<h3 style="margin:0 0 8px;">Godzinki do zatwierdzenia (${escapeHtml(String(godzinki.count))})</h3>`;
        if (!godzinki.items?.length) {
          html += `<p class="hint" style="margin-bottom:20px;">Brak oczekujących.</p>`;
        } else {
          html += `<div style="margin-bottom:20px;">`;
          for (const item of godzinki.items) {
            const typeLabel = item.type === "purchase" ? "Wykup" : "Zgłoszenie";
            const dateStr = item.createdAt ? formatDatePL(item.createdAt.slice(0, 10)) : "—";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.reason || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(typeLabel)} · <strong>${escapeHtml(String(item.amount))} godz.</strong>
                        · zgłosił: ${escapeHtml(item.submittedBy || "—")}
                        · ${escapeHtml(dateStr)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        // Sekcja imprezy
        html += `<h3 style="margin:0 0 8px;">Imprezy do zatwierdzenia (${escapeHtml(String(events.count))})</h3>`;
        if (!events.items?.length) {
          html += `<p class="hint">Brak oczekujących.</p>`;
        } else {
          html += `<div>`;
          for (const item of events.items) {
            const startStr = item.startDate ? formatDatePL(item.startDate) : "—";
            const endStr = item.endDate ? formatDatePL(item.endDate) : "—";
            const dateStr = item.createdAt ? formatDatePL(item.createdAt.slice(0, 10)) : "—";
            html += `
              <div class="gearCard" style="margin-bottom:8px;">
                <div class="gearCardInner">
                  <div class="gearHead">
                    <div class="gearTitleWrap">
                      <div class="gearTitle">${escapeHtml(item.name || "—")}</div>
                      <div class="gearSubtitle">
                        ${escapeHtml(startStr)} – ${escapeHtml(endStr)}
                        · zgłosił: ${escapeHtml(item.userEmail || "—")}
                        · ${escapeHtml(dateStr)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
          html += `</div>`;
        }

        contentEl.innerHTML = html;
      };

      const load = async () => {
        setErr("");
        contentEl.innerHTML = `<p class="hint">Ładuję...</p>`;
        try {
          const data = await apiGetJson({ url: ADMIN_PENDING_URL, idToken: ctx.idToken });
          renderContent(data);
        } catch (e) {
          setErr(mapUserFacingApiError(e, "Nie udało się pobrać danych."));
          contentEl.innerHTML = "";
        }
      };

      reloadBtn.addEventListener("click", load);
      await load();
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDatePL(iso) {
  const s = String(iso || "").trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [yyyy, mm, dd] = s.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
