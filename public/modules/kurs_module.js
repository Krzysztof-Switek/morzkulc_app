// public/modules/kurs_module.js

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

// ─── TOC view ─────────────────────────────────────────────────────────────────

function renderToc(innerEl, moduleId) {
  innerEl.innerHTML = `
    <p style="font-style:italic; color:var(--text-muted,#666); background:rgba(0,0,0,.04); border-left:3px solid var(--accent,#4a90e2); padding:10px 14px; border-radius:4px; margin:0 0 16px; font-size:.93em;"><em>skrypt zebrała do kupy i przygotowała Karolia z PrzeWrotki, Karolina jest fanem 50cm kebabów i białego półwytrawnego wina (najlepiej z lodem) — wiecie jak się odwdzięczyć&nbsp;;)</em></p>
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

      viewEl.querySelector(".kursPrintBtn")?.addEventListener("click", () => {
        window.print();
      });

      if (isChapter) {
        await renderChapter(innerEl, id, route);
      } else {
        renderToc(innerEl, id);
      }
    },
  };
}
