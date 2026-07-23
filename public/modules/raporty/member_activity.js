// public/modules/raporty/member_activity.js
// Raport „Najbardziej aktywni" — ranking członków wg wypracowanych godzinek.
import { apiGetJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const REPORT_URL = "/api/admin/reports/member-activity";

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const memberActivityReport = {
  id: "member-activity",
  category: "Członkowie",
  label: "Najbardziej aktywni",
  description: "",

  render({ container, ctx }) {
    container.innerHTML = `
      <div class="reportControls">
        <label class="reportLabel">Zakres:
          <select id="maRange">
            <option value="month">Ostatni miesiąc</option>
            <option value="semester" selected>Ostatni semestr</option>
            <option value="year">Ostatni rok</option>
            <option value="custom">Zakres dat</option>
          </select>
        </label>
        <span id="maCustomDates" class="hidden">
          <input type="date" id="maFrom"> – <input type="date" id="maTo">
          <button type="button" id="maShowBtn">Pokaż</button>
        </span>
      </div>
      <div id="maContent" style="margin-top:12px;"></div>
    `;

    const rangeSel = container.querySelector("#maRange");
    const customSpan = container.querySelector("#maCustomDates");
    const fromInput = container.querySelector("#maFrom");
    const toInput = container.querySelector("#maTo");
    const content = container.querySelector("#maContent");

    const renderRows = (data) => {
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      if (!rows.length) {
        content.innerHTML = `<p class="hint">Brak wypracowanych godzinek w wybranym zakresie.</p>`;
        return;
      }
      let html = `<p class="hint" style="margin:0 0 8px;">Suma godzin <strong>wypracowanych w wybranym zakresie</strong> — to nie jest bieżące saldo (saldo w raporcie „Składki").</p>`;
      html += `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Lp.</th><th>Osoba</th><th>Godziny w okresie</th></tr></thead><tbody>`;
      for (const r of rows) {
        const email = r.userEmail ? `<div class="reportEmail">${escapeHtml(r.userEmail)}</div>` : "";
        const name = r.userName || r.userNick || "—";
        const person = `<div class="reportPerson">${escapeHtml(name)}</div>${email}`;
        html += `<tr><td>${escapeHtml(String(r.rank))}</td><td>${person}</td><td class="reportTerm"><strong>${escapeHtml(String(r.hours))} h</strong></td></tr>`;
      }
      html += `</tbody></table></div><p class="hint" style="margin-top:8px;">Członków: ${rows.length}</p>`;
      content.innerHTML = html;
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
        renderRows(data);
      } catch (e) {
        content.innerHTML = `<p class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać raportu."))}</p>`;
      }
    };

    rangeSel.addEventListener("change", () => {
      const isCustom = rangeSel.value === "custom";
      customSpan.classList.toggle("hidden", !isCustom);
      if (!isCustom) load();
    });
    container.querySelector("#maShowBtn").addEventListener("click", load);

    // Pierwsze załadowanie — domyślnie „Ostatni semestr".
    load();
  },
};
