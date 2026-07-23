// public/modules/raporty/reports_panel.js
// Launcher raportów Zarządu: kafelki pogrupowane w kategorie + szukajka → szczegół.
// Pokazuje WSZYSTKIE raporty na jednej karcie, ale dane renderuje tylko jeden naraz.
import { REPORTS } from "./registry.js";

// Kolejność kategorii w launcherze; nieznane trafiają na koniec (alfabetycznie).
const CATEGORY_ORDER = ["Sprzęt", "Finanse", "Członkowie", "Imprezy", "Inne"];

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}

function catOrder(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

export function renderReportsPanel({ container, ctx }) {
  const renderLauncher = () => {
    const byCat = new Map();
    for (const r of REPORTS) {
      const cat = r.category || "Inne";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(r);
    }
    const cats = Array.from(byCat.keys()).sort((a, b) => (catOrder(a) - catOrder(b)) || a.localeCompare(b, "pl"));

    let html = `<div class="reportLauncher">
      <input type="search" class="reportSearch" id="reportSearch" placeholder="🔍 Szukaj raportu..." autocomplete="off">
      <div id="reportTiles">`;
    for (const cat of cats) {
      html += `<div class="reportCatGroup" data-cat="${escapeAttr(cat)}">
        <div class="reportCatHead">${escapeHtml(cat)}</div>
        <div class="reportGrid">`;
      for (const r of byCat.get(cat)) {
        const desc = r.description ? `<span class="reportTileDesc">${escapeHtml(r.description)}</span>` : "";
        html += `<button type="button" class="reportTile" data-report="${escapeAttr(r.id)}">
          <span class="reportTileLabel">${escapeHtml(r.label)}</span>${desc}
        </button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>
      <p class="hint hidden" id="reportNoMatch">Brak raportów pasujących do wyszukiwania.</p>
    </div>`;
    container.innerHTML = html;

    const searchEl = container.querySelector("#reportSearch");
    const groups = Array.from(container.querySelectorAll(".reportCatGroup"));
    const noMatch = container.querySelector("#reportNoMatch");
    const applySearch = () => {
      const q = (searchEl.value || "").trim().toLowerCase();
      let anyVisible = false;
      for (const g of groups) {
        let groupVisible = false;
        g.querySelectorAll(".reportTile").forEach((tile) => {
          const label = (tile.querySelector(".reportTileLabel")?.textContent || "").toLowerCase();
          const desc = (tile.querySelector(".reportTileDesc")?.textContent || "").toLowerCase();
          const match = !q || label.includes(q) || desc.includes(q);
          tile.classList.toggle("hidden", !match);
          if (match) groupVisible = true;
        });
        g.classList.toggle("hidden", !groupVisible);
        if (groupVisible) anyVisible = true;
      }
      noMatch.classList.toggle("hidden", anyVisible);
    };
    searchEl.addEventListener("input", applySearch);

    container.querySelectorAll(".reportTile").forEach((tile) => {
      tile.addEventListener("click", () => openReport(tile.getAttribute("data-report")));
    });
  };

  const openReport = (id) => {
    const descriptor = REPORTS.find((r) => r.id === id);
    if (!descriptor) { renderLauncher(); return; }
    const dateStr = new Date().toLocaleString("pl-PL");
    container.innerHTML = `
      <div class="reportDetailHead">
        <button type="button" class="ghost" id="reportBackBtn">← Raporty</button>
        <h3 class="reportDetailTitle">${escapeHtml(descriptor.label)}</h3>
        <button type="button" class="ghost reportPdfBtn" id="reportPdfBtn" title="Zapisz raport jako PDF (Drukuj → Zapisz jako PDF)">📄 Pobierz PDF</button>
      </div>
      <div id="reportDetailBody">
        <div class="reportPrintHeader">
          <div class="reportPrintTitle">SKK Morzkulc — ${escapeHtml(descriptor.label)}</div>
          <div class="reportPrintDate">Wygenerowano: ${escapeHtml(dateStr)}</div>
        </div>
        <div id="reportRenderTarget"></div>
      </div>
    `;
    container.querySelector("#reportBackBtn").addEventListener("click", renderLauncher);
    // PDF = natywny druk → „Zapisz jako PDF". Arkusz @media print izoluje sam raport.
    container.querySelector("#reportPdfBtn").addEventListener("click", () => {
      const cleanup = () => {
        document.body.classList.remove("printingReport");
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      document.body.classList.add("printingReport");
      window.print();
    });
    const body = container.querySelector("#reportRenderTarget");
    try {
      descriptor.render({ container: body, ctx });
    } catch (e) {
      body.innerHTML = `<p class="err">Błąd raportu: ${escapeHtml(String(e?.message || e))}</p>`;
    }
  };

  renderLauncher();
}
