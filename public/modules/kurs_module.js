// public/modules/kurs_module.js
import { apiGetJson } from "/core/api_client.js";

const KURS_INFO_URL = "/api/kurs/info";

const CHAPTERS = [
  { id: "ch01", num: 1, title: "Wstęp" },
  { id: "ch02", num: 2, title: "Sprzęt" },
  { id: "ch03", num: 3, title: "Locja" },
  { id: "ch04", num: 4, title: "PKP — Podstawy Kajakarstwa" },
  { id: "ch05", num: 5, title: "Manewry" },
  { id: "ch06", num: 6, title: "Bezpieczeństwo" },
];

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function spinnerHtml(text = "Ładowanie…") {
  return `<div class="thinking">${esc(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function renderTabsHtml(activeTab) {
  const tabs = [
    { id: "skrypt", label: "Skrypt" },
    { id: "harmonogram", label: "Harmonogram" },
  ];
  return `<div class="kursTabs">
    ${tabs.map((t) => `
      <button type="button"
        class="kursTab${t.id === activeTab ? " active" : ""}"
        data-kurs-tab="${esc(t.id)}"
      >${esc(t.label)}</button>
    `).join("")}
  </div>`;
}

// ─── TOC view ─────────────────────────────────────────────────────────────────

function renderToc(innerEl, moduleId) {
  innerEl.innerHTML = `
    <div class="skryptToc">
      ${CHAPTERS.map((ch) => `
        <button type="button" class="skryptTocItem" data-ch-id="${esc(ch.id)}">
          <span class="skryptTocNum">${ch.num}.</span>
          <span>${esc(ch.title)}</span>
        </button>
      `).join("")}
    </div>
  `;

  innerEl.querySelectorAll("[data-ch-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chId = btn.getAttribute("data-ch-id");
      window.location.hash = `#${moduleId}/${chId}`;
    });
  });
}

// ─── Chapter view ─────────────────────────────────────────────────────────────

async function renderChapter(innerEl, moduleId, chId) {
  const chapterIndex = CHAPTERS.findIndex((ch) => ch.id === chId);
  if (chapterIndex === -1) {
    renderToc(innerEl, moduleId);
    return;
  }

  const chapter = CHAPTERS[chapterIndex];
  const prev = CHAPTERS[chapterIndex - 1] || null;
  const next = CHAPTERS[chapterIndex + 1] || null;

  const navHtml = `
    <div class="skryptNav">
      <button type="button" class="ghost skryptNavBack" data-kurs-toc>
        ← Spis treści
      </button>
      <div class="skryptNavPages">
        ${prev ? `<button type="button" class="ghost" data-ch-id="${esc(prev.id)}">← ${esc(prev.num)}. ${esc(prev.title)}</button>` : "<span></span>"}
        ${next ? `<button type="button" class="ghost" data-ch-id="${esc(next.id)}">${esc(next.num)}. ${esc(next.title)} →</button>` : "<span></span>"}
      </div>
    </div>
  `;

  innerEl.innerHTML = spinnerHtml("Ładowanie rozdziału…");

  try {
    const res = await fetch(`/skrypt_kurs/chapters/${chId}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    innerEl.innerHTML = `
      ${navHtml}
      <div class="skryptContent">${html}</div>
      ${navHtml}
    `;
  } catch (e) {
    innerEl.innerHTML = `
      ${navHtml}
      <div class="err">Nie udało się załadować rozdziału: ${esc(e?.message || "błąd sieci")}</div>
    `;
  }

  innerEl.querySelectorAll("[data-kurs-toc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = `#${moduleId}/skrypt`;
    });
  });

  innerEl.querySelectorAll("[data-ch-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-ch-id");
      window.location.hash = `#${moduleId}/${id}`;
    });
  });

  innerEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Harmonogram — dane z API ─────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function formatDateRange(start, end) {
  if (!start && !end) return "—";
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function kursInfoCardHtml(info) {
  const linkHtml = info.link
    ? `<a href="${esc(info.link)}" target="_blank" rel="noopener" class="kursLink">Strona kursu →</a>`
    : "";
  const rows = [
    info.startDate || info.endDate ? `<dt>Termin</dt><dd>${esc(formatDateRange(info.startDate, info.endDate))}</dd>` : "",
    info.location ? `<dt>Miejsce zajęć</dt><dd>${esc(info.location)}</dd>` : "",
    info.instructor ? `<dt>Instruktor</dt><dd>${esc(info.instructor)}</dd>` : "",
    info.instructorContact ? `<dt>Kontakt</dt><dd>${esc(info.instructorContact)}</dd>` : "",
    info.description ? `<dt>Opis</dt><dd>${esc(info.description)}</dd>` : "",
    linkHtml ? `<dt></dt><dd>${linkHtml}</dd>` : "",
  ].filter(Boolean).join("");
  return `
    <div class="kursInfoCard">
      <h3>${esc(info.name)}</h3>
      <dl class="kursInfoDl">${rows}</dl>
    </div>
  `;
}

function kursEventRowHtml(ev) {
  const locationHtml = ev.location ? ` · ${esc(ev.location)}` : "";
  const linkHtml = ev.link ? ` <a href="${esc(ev.link)}" target="_blank" rel="noopener">→</a>` : "";
  return `
    <div class="kursEventRow">
      <span class="kursEventDate">${esc(formatDateRange(ev.startDate, ev.endDate))}</span>
      <span class="kursEventName">${esc(ev.name)}${locationHtml}${linkHtml}</span>
    </div>
  `;
}

async function renderHarmonogram(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie danych kursu…");

  let data;
  try {
    data = await apiGetJson({ url: KURS_INFO_URL, idToken: ctx.idToken });
  } catch (e) {
    innerEl.innerHTML = `<p class="err">Nie udało się załadować danych kursu: ${esc(e?.message || "błąd sieci")}</p>`;
    return;
  }

  if (data.unconfigured) {
    innerEl.innerHTML = `<p class="muted">Dane kursu nie zostały jeszcze skonfigurowane.</p>`;
    return;
  }

  let html = "";

  if (data.info && data.info.length > 0) {
    html += data.info.map(kursInfoCardHtml).join("");
  } else {
    html += `<p class="muted">Brak aktywnych kursów.</p>`;
  }

  if (data.events && data.events.length > 0) {
    const eventsHtml = data.events.map(kursEventRowHtml).join("");
    html += `
      <div class="kursEventsSection">
        <h3>Imprezy kursowe</h3>
        <div class="kursEventList">${eventsHtml}</div>
      </div>
    `;
  }

  innerEl.innerHTML = html;
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function createKursModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute,
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      const route = String(routeId || "skrypt").trim();

      const isChapter = CHAPTERS.some((ch) => ch.id === route);
      const activeTab = route === "harmonogram" ? "harmonogram" : "skrypt";

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader kursHeader">
            <h2>${esc(label)}</h2>
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="ghost kursPrintBtn" title="Drukuj / zapisz jako PDF">&#128438; PDF</button>
              <div class="moduleNav">
                <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
                <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
              </div>
            </div>
          </div>
          ${renderTabsHtml(activeTab)}
          <div id="kursInner"></div>
        </div>
      `;

      const innerEl = viewEl.querySelector("#kursInner");

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
        window.location.hash = "#home/home";
      });
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
        if (isChapter) {
          window.location.hash = `#${id}/skrypt`;
        } else if (route !== "skrypt") {
          window.location.hash = `#${id}/skrypt`;
        } else {
          window.location.hash = "#home/home";
        }
      });

      viewEl.querySelector(".kursTabs")?.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-kurs-tab]");
        if (!btn) return;
        const tab = btn.getAttribute("data-kurs-tab");
        window.location.hash = `#${id}/${tab}`;
      });

      viewEl.querySelector(".kursPrintBtn")?.addEventListener("click", () => {
        window.print();
      });

      if (activeTab === "harmonogram") {
        await renderHarmonogram(innerEl, ctx);
      } else if (isChapter) {
        await renderChapter(innerEl, id, route);
      } else {
        renderToc(innerEl, id);
      }
    },
  };
}
