import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { formatFreeText, isUrlOnly } from "/core/text_format.js";

const EVENTS_URL = "/api/events";
const SUBMIT_URL = "/api/events/submit";
const INTERESTS_URL = "/api/events/interests";
const INTEREST_TOGGLE_URL = "/api/events/interest/toggle";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;


// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function spinnerHtml(text = "Ładowanie…") {
  return `<div class="thinking">${esc(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

const DESC_TRUNCATE_LIMIT = 220;

function truncateText(text, limit) {
  const t = String(text || "");
  if (t.length <= limit) return { short: t, isTruncated: false };
  const cut = t.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  const safeCut = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return { short: safeCut.trim(), isTruncated: true };
}

// ─── render funkcje ───────────────────────────────────────────────────────────

function renderTabsHtml(activeTab, canSubmit) {
  const tabs = [{ id: "list", label: "Imprezy" }];
  if (canSubmit) tabs.push({ id: "submit", label: "Dodaj imprezę" });
  return `<div class="imprezaTabs">
    ${tabs.map((t) => `
      <button type="button"
        class="imprezaTab${t.id === activeTab ? " active" : ""}"
        data-impreza-tab="${esc(t.id)}"
      >${esc(t.label)}</button>
    `).join("")}
  </div>`;
}

function heartSvg(filled) {
  const fill = filled ? "currentColor" : "none";
  return `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function renderEventCard(ev, isInterested) {
  const start = formatDate(ev.startDate);
  const end = formatDate(ev.endDate);
  const dateRange = ev.startDate === ev.endDate
    ? start
    : `${start} – ${end}`;

  // Preferuj jawne pole mapLink; dla starych wpisów, gdzie link do mapy
  // wylądował w polu "Miejsce" (zamiast nazwy), potraktuj go tak samo.
  const mapLinkUrl = String(ev.mapLink || "").trim() || (isUrlOnly(ev.location) ? String(ev.location || "").trim() : "");
  const { short: descShort, isTruncated: descTruncated } = truncateText(ev.description, DESC_TRUNCATE_LIMIT);

  return `
    <div class="imprezaCard">
      <div class="imprezaCardHead">
        <div class="imprezaName">${esc(ev.name)}</div>
        <div class="imprezaDates">${esc(dateRange)}</div>
        <div class="imprezaInterest">
          <button type="button"
            class="imprezaFavBtn${isInterested ? " active" : ""}"
            data-event-interest="${esc(ev.id)}"
            aria-pressed="${isInterested ? "true" : "false"}"
            aria-label="${isInterested ? "Usuń z interesujących" : "Oznacz jako interesującą"}"
          >${heartSvg(isInterested)}</button>
          <span class="imprezaInterestLabel">Interesuje mnie</span>
        </div>
      </div>
      ${ev.location && !isUrlOnly(ev.location) ? `<div class="imprezaMeta"><strong>Miejsce:</strong> ${formatFreeText(ev.location)}</div>` : ""}
      ${mapLinkUrl ? `<div class="imprezaMeta imprezaMapLink"><a href="${esc(mapLinkUrl)}" target="_blank" rel="noopener noreferrer">📍 Zobacz na mapie</a></div>` : ""}
      ${ev.description ? `
        <div class="imprezaDesc">
          <div class="imprezaDescShort">${formatFreeText(descShort)}${descTruncated ? "…" : ""}</div>
          ${descTruncated ? `<div class="imprezaDescFull" hidden>${formatFreeText(ev.description)}</div>` : ""}
          ${descTruncated ? `<button type="button" class="imprezaMoreBtn" data-impreza-more>więcej</button>` : ""}
        </div>
      ` : ""}
      <div class="imprezaFooter">
        ${ev.contact ? `<span class="imprezaContact">Kontakt: ${formatFreeText(ev.contact)}</span>` : ""}
        ${ev.link ? `<a class="imprezaLink" href="${esc(ev.link)}" target="_blank" rel="noopener noreferrer">Strona / zgłoszenia →</a>` : ""}
      </div>
    </div>
  `;
}

async function renderListView(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie imprez…");

  try {
    const [data, interestedIds] = await Promise.all([
      apiGetJson({ url: EVENTS_URL, idToken: ctx.idToken }),
      apiGetJson({ url: INTERESTS_URL, idToken: ctx.idToken })
        .then((r) => (Array.isArray(r?.interestedEventIds) ? r.interestedEventIds : []))
        .catch(() => []),
    ]);
    const events = Array.isArray(data?.events) ? data.events : [];

    if (!events.length) {
      innerEl.innerHTML = `<div class="hint imprezaEmpty">Brak nadchodzących imprez.</div>`;
      return;
    }

    const interestedSet = new Set(interestedIds);
    innerEl.innerHTML = `<div class="imprezaList">${events.map((ev) => renderEventCard(ev, interestedSet.has(ev.id))).join("")}</div>`;

    bindInterestButtons(innerEl, ctx);
    bindMoreButtons(innerEl);
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się załadować imprez.")}</div>`;
  }
}

function bindMoreButtons(innerEl) {
  innerEl.querySelectorAll("[data-impreza-more]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".imprezaDesc");
      if (!wrap) return;
      const shortEl = wrap.querySelector(".imprezaDescShort");
      const fullEl = wrap.querySelector(".imprezaDescFull");
      const expanding = fullEl.hidden;
      fullEl.hidden = !expanding;
      shortEl.hidden = expanding;
      btn.textContent = expanding ? "mniej" : "więcej";
    });
  });
}

function bindInterestButtons(innerEl, ctx) {
  innerEl.querySelectorAll("[data-event-interest]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.getAttribute("data-event-interest");
      const wasActive = btn.classList.contains("active");
      const nextActive = !wasActive;

      btn.disabled = true;
      btn.classList.toggle("active", nextActive);
      btn.setAttribute("aria-pressed", nextActive ? "true" : "false");
      btn.setAttribute("aria-label", nextActive ? "Usuń z interesujących" : "Oznacz jako interesującą");
      btn.innerHTML = heartSvg(nextActive);

      try {
        await apiPostJson({ url: INTEREST_TOGGLE_URL, idToken: ctx.idToken, body: { eventId } });
      } catch {
        btn.classList.toggle("active", wasActive);
        btn.setAttribute("aria-pressed", wasActive ? "true" : "false");
        btn.setAttribute("aria-label", wasActive ? "Usuń z interesujących" : "Oznacz jako interesującą");
        btn.innerHTML = heartSvg(wasActive);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function renderSubmitFormHtml() {
  const today = todayIso();
  return `
    <form id="imprezaForm" class="imprezaForm" autocomplete="off">
      <div class="imprezaFormSection">

        <div class="row">
          <label for="evName">Nazwa imprezy *</label>
          <input id="evName" type="text" maxlength="200" required />
        </div>

        <div class="imprezaDateRow">
          <div class="row">
            <label for="evStartDate">Data od *</label>
            <input id="evStartDate" type="date" min="${today}" required />
          </div>
          <div class="row">
            <label for="evEndDate">Data do *</label>
            <input id="evEndDate" type="date" min="${today}" required />
          </div>
        </div>

        <div class="row">
          <label for="evLocation">Miejsce *</label>
          <input id="evLocation" type="text" maxlength="200" placeholder="np. Ostrzyce, zbiornik" required />
          <div class="hint">Nazwa miejsca, nie link — na link do mapy jest pole niżej.</div>
        </div>

        <div class="row">
          <label for="evMapLink">Link do mapy</label>
          <input id="evMapLink" type="url" maxlength="500" placeholder="https://maps.google.com/…" />
        </div>

        <div class="row">
          <label for="evDescription">Opis</label>
          <textarea id="evDescription" rows="3" maxlength="1000"></textarea>
        </div>

        <div class="row">
          <label for="evContact">Kontakt</label>
          <input id="evContact" type="text" maxlength="200" />
        </div>

        <div class="row">
          <label for="evLink">Link do strony / zgłoszeń</label>
          <input id="evLink" type="url" maxlength="500" placeholder="https://…" />
        </div>

        <div class="hint" style="margin-top:8px;">
          Impreza trafi do weryfikacji. Zostanie opublikowana po zatwierdzeniu przez zarząd lub KR w Google Sheets.
        </div>

        <div id="evErr" class="err hidden" style="margin-top:8px;"></div>
        <div id="evOk" class="ok hidden" style="margin-top:8px;"></div>

        <div class="actions" style="margin-top:12px;">
          <button id="evSubmitBtn" type="submit" class="primary">Wyślij zgłoszenie</button>
          <button id="evClearBtn" type="button" class="ghost">Wyczyść</button>
        </div>

      </div>
    </form>
  `;
}

async function bindSubmitForm(innerEl, ctx) {
  const form = innerEl.querySelector("#imprezaForm");
  const errEl = innerEl.querySelector("#evErr");
  const okEl = innerEl.querySelector("#evOk");
  const submitBtn = innerEl.querySelector("#evSubmitBtn");
  const clearBtn = innerEl.querySelector("#evClearBtn");

  const setErr = (msg) => {
    errEl.textContent = String(msg || "");
    errEl.classList.toggle("hidden", !errEl.textContent);
    okEl.classList.add("hidden");
  };
  const setOk = (msg) => {
    okEl.textContent = String(msg || "");
    okEl.classList.toggle("hidden", !okEl.textContent);
    errEl.classList.add("hidden");
  };

  const getVal = (id) => String(innerEl.querySelector(`#${id}`)?.value || "").trim();

  clearBtn.addEventListener("click", () => {
    form.reset();
    setErr("");
    setOk("");
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setErr("");
    setOk("");

    const name = getVal("evName");
    const startDate = getVal("evStartDate");
    const endDate = getVal("evEndDate");
    const location = getVal("evLocation");
    const mapLink = getVal("evMapLink");
    const description = getVal("evDescription");
    const contact = getVal("evContact");
    const link = getVal("evLink");

    if (!name || !startDate || !endDate || !location) {
      setErr("Uzupełnij wymagane pola: nazwa, daty, miejsce.");
      return;
    }
    if (startDate > endDate) {
      setErr("Data od musi być wcześniejsza lub równa dacie do.");
      return;
    }
    if (isUrlOnly(location)) {
      setErr("Pole „Miejsce” powinno zawierać nazwę miejsca, nie link. Wklej link do mapy w polu „Link do mapy” poniżej.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Wysyłam…";

    try {
      await apiPostJson({
        url: SUBMIT_URL,
        idToken: ctx.idToken,
        body: { name, startDate, endDate, location, description, contact, link, mapLink },
      });

      setOk("Zgłoszenie wysłane. Impreza pojawi się po zatwierdzeniu.");
      form.reset();
    } catch (e) {
      setErr(e?.message || "Nie udało się wysłać zgłoszenia.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Wyślij zgłoszenie";
    }
  });
}

// ─── moduł ───────────────────────────────────────────────────────────────────

export function createImprezaModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      if (!ctx?.idToken) {
        viewEl.innerHTML = `<div class="card center"><h2>${esc(label)}</h2><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
        return;
      }

      const canSubmit = (ctx?.session?.allowed_actions ?? []).includes("events.submit");

      const requestedTab = String(routeId || "").trim();
      const activeTab = (requestedTab === "submit" && canSubmit) ? "submit" : "list";

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader">
            <h2>${esc(label)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>
          ${renderTabsHtml(activeTab, canSubmit)}
          <div id="imprezaInner"></div>
        </div>
      `;

      const innerEl = viewEl.querySelector("#imprezaInner");

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
        window.location.hash = "#home/home";
      });
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
        if (activeTab !== "list") {
          window.location.hash = `#${id}/list`;
        } else {
          window.location.hash = "#home/home";
        }
      });

      viewEl.querySelector(".imprezaTabs")?.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-impreza-tab]");
        if (!btn) return;
        const tab = btn.getAttribute("data-impreza-tab");
        window.location.hash = `#${id}/${tab}`;
      });

      if (activeTab === "submit") {
        innerEl.innerHTML = renderSubmitFormHtml();
        bindSubmitForm(innerEl, ctx);
      } else {
        await renderListView(innerEl, ctx);
      }
    },
  };
}