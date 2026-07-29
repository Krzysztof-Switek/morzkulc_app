// public/modules/raporty/top_rentals.js
// Raport „Najczęściej wypożyczane" — ranking sprzętu wg sumy dni wypożyczenia.
import { apiGetJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const REPORT_URL = "/api/admin/reports/gear-top-rentals";

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const topRentalsReport = {
  id: "gear-top-rentals",
  category: "Sprzęt",
  label: "Najczęściej wypożyczane",
  description: "",

  render({ container, ctx }) {
    container.innerHTML = `
      <div class="reportControls">
        <label class="reportLabel">Zakres:
          <select id="trRange">
            <option value="month">Ostatni miesiąc</option>
            <option value="semester" selected>Ostatni semestr</option>
            <option value="year">Ostatni rok</option>
            <option value="custom">Zakres dat</option>
          </select>
        </label>
        <span id="trCustomDates" class="hidden">
          <input type="date" id="trFrom"> – <input type="date" id="trTo">
          <button type="button" id="trShowBtn">Pokaż</button>
        </span>
      </div>
      <div class="reportCats">
        <label><input type="checkbox" id="trCatAll" checked> Wszystkie</label>
        <label><input type="checkbox" class="trCatChk" value="kayaks" checked> Kajaki</label>
        <label><input type="checkbox" class="trCatChk" value="paddles" checked> Wiosła</label>
        <label><input type="checkbox" class="trCatChk" value="lifejackets" checked> Kamizelki</label>
        <label><input type="checkbox" class="trCatChk" value="helmets" checked> Kaski</label>
        <label><input type="checkbox" class="trCatChk" value="throwbags" checked> Rzutki</label>
        <label><input type="checkbox" class="trCatChk" value="sprayskirts" checked> Fartuchy</label>
      </div>
      <div id="trContent" style="margin-top:12px;"></div>
    `;

    const rangeSel = container.querySelector("#trRange");
    const customSpan = container.querySelector("#trCustomDates");
    const fromInput = container.querySelector("#trFrom");
    const toInput = container.querySelector("#trTo");
    const content = container.querySelector("#trContent");
    const catAllChk = container.querySelector("#trCatAll");
    const catChks = Array.from(container.querySelectorAll(".trCatChk"));
    let lastRows = null;

    // null = bez filtra (Wszystkie); inaczej Set zaznaczonych kategorii.
    const selectedCats = () => {
      if (catAllChk.checked) return null;
      const s = new Set();
      catChks.forEach((c) => { if (c.checked) s.add(c.value); });
      return s;
    };

    const renderRows = () => {
      if (!lastRows) return;
      const cats = selectedCats();
      const rows = cats ? lastRows.filter((r) => cats.has(r.category)) : lastRows;
      if (!rows.length) {
        content.innerHTML = `<p class="hint">Brak wypożyczeń w wybranym zakresie.</p>`;
        return;
      }
      let html = `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Lp.</th><th>Sprzęt</th><th>Liczba dni</th><th></th></tr></thead><tbody>`;
      rows.forEach((r, i) => {
        const head = [r.categoryLabel, r.number].filter(Boolean).join(" ") || "—";
        const name = r.name ? `<div class="reportEmail">${escapeHtml(r.name)}</div>` : "";
        const gear = `<div class="reportPerson">${escapeHtml(head)}</div>${name}`;
        const rowId = `trDetail${i}`;
        html += `<tr><td>${i + 1}</td><td>${gear}</td><td class="reportTerm"><strong>${escapeHtml(String(r.totalDays))} dni</strong></td>`;
        html += `<td><button type="button" class="ghost trMoreBtn" data-target="${rowId}">Więcej</button></td></tr>`;
        const rentals = Array.isArray(r.rentals) ? r.rentals : [];
        const detailRows = rentals.map((rt) => {
          const who = escapeHtml(rt.userName || rt.userNick || rt.userEmail || "—");
          return `<div class="reportEmail">${who} — ${escapeHtml(String(rt.days))} dni</div>`;
        }).join("");
        html += `<tr class="hidden" id="${rowId}"><td></td><td colspan="3">${detailRows || `<div class="hint">Brak danych.</div>`}</td></tr>`;
      });
      html += `</tbody></table></div><p class="hint" style="margin-top:8px;">Pozycji: ${rows.length}</p>`;
      content.innerHTML = html;

      content.querySelectorAll(".trMoreBtn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = content.querySelector("#" + btn.getAttribute("data-target"));
          if (!target) return;
          const nowHidden = target.classList.toggle("hidden");
          btn.textContent = nowHidden ? "Więcej" : "Mniej";
        });
      });
    };

    const load = async () => {
      const range = rangeSel.value;
      let url = `${REPORT_URL}?range=${encodeURIComponent(range)}`;
      if (range === "custom") {
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) { content.innerHTML = `<p class="hint">Wybierz zakres dat (od i do).</p>`; return; }
        url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      }
      content.innerHTML = `<p class="hint">Ładuję...</p>`;
      try {
        const data = await apiGetJson({ url, idToken: ctx.idToken });
        lastRows = Array.isArray(data?.rows) ? data.rows : [];
        renderRows();
      } catch (e) {
        lastRows = null;
        content.innerHTML = `<p class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać raportu."))}</p>`;
      }
    };

    rangeSel.addEventListener("change", () => {
      const isCustom = rangeSel.value === "custom";
      customSpan.classList.toggle("hidden", !isCustom);
      if (!isCustom) load();
    });
    container.querySelector("#trShowBtn").addEventListener("click", load);
    catAllChk.addEventListener("change", () => {
      catChks.forEach((c) => { c.checked = catAllChk.checked; });
      renderRows();
    });
    catChks.forEach((c) => c.addEventListener("change", () => {
      catAllChk.checked = catChks.every((x) => x.checked);
      renderRows();
    }));

    // Pierwsze załadowanie — domyślnie „Ostatni semestr".
    load();
  },
};
