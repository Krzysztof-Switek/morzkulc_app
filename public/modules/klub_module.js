// public/modules/klub_module.js
import { apiGetJson } from "/core/api_client.js";
import { setHash } from "/core/router.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const KLUB_URL = "/api/klub";

function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderKluczeTable(osoby) {
  if (!osoby.length) {
    return `<p class="hint">Brak osób z przypisanymi kluczami.</p>`;
  }
  const CHECK = `<span class="kluczeCheck">✓</span>`;
  const DASH = `<span class="kluczeDash">—</span>`;
  let html = `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Osoba</th><th>Telefon</th><th>Klucze do siedziby</th><th>Dostęp akademik</th></tr></thead><tbody>`;
  for (const o of osoby) {
    html += `<tr><td>${escapeHtml(o.name)}</td><td>${o.phone ? escapeHtml(o.phone) : DASH}</td><td>${o.hasClubKeys ? CHECK : DASH}</td><td>${o.hasAkademikAccess ? CHECK : DASH}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  return html;
}

async function renderKluczeView(innerEl, ctx) {
  innerEl.innerHTML = `<p class="hint">Ładuję…</p>`;
  try {
    const data = await apiGetJson({ url: KLUB_URL, idToken: ctx.idToken });
    const osoby = Array.isArray(data?.kluczeOsoby) ? data.kluczeOsoby : [];
    innerEl.innerHTML = renderKluczeTable(osoby);
  } catch (e) {
    innerEl.innerHTML = `<p class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać listy."))}</p>`;
  }
}

export function createKlubModule({ id, type, label, defaultRoute, order, enabled, access }) {
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
        viewEl.innerHTML = `<div class="card center"><h2>${escapeHtml(label)}</h2><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
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
          <h3 style="margin:12px 0 8px;">Kto ma klucze</h3>
          <div id="klubKluczeContent"></div>
        </div>
      `;

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => setHash("home", "home"));
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => setHash("home", "home"));

      await renderKluczeView(viewEl.querySelector("#klubKluczeContent"), ctx);
    },
  };
}
