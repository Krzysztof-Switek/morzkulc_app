// public/modules/raporty/member_dues.js
// Raport „Składki" — pełni członkowie: zaległości, opłacone, uprawnieni do głosowania.
import { apiGetJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const REPORT_URL = "/api/admin/reports/member-dues";

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// „składki opłacone do" → DD.MM.YYYY (akceptuje YYYY-MM-DD oraz DD-MM-YYYY / DD.MM.YYYY).
function formatContribDate(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  m = s.match(/^(\d{2})[-.](\d{2})[-.](\d{4})$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  return s;
}

export const memberDuesReport = {
  id: "member-dues",
  category: "Członkowie",
  label: "Składki i uprawnieni do głosowania",
  description: "",

  render({ container, ctx }) {
    container.innerHTML = `
      <div class="reportControls">
        <label class="reportLabel">Pokaż:
          <select id="duesView">
            <option value="all" selected>Wszyscy</option>
            <option value="overdue">Zaległości składkowe</option>
            <option value="paid">Opłacone składki</option>
            <option value="voting">Uprawnieni do głosowania</option>
          </select>
        </label>
      </div>
      <div id="duesSummary" class="hint" style="margin:4px 0 8px;"></div>
      <div id="duesContent"></div>
    `;

    const viewSel = container.querySelector("#duesView");
    const summaryEl = container.querySelector("#duesSummary");
    const content = container.querySelector("#duesContent");
    let data = null;

    const passesView = (r, view) => {
      if (view === "overdue") return !r.paid;
      if (view === "paid") return r.paid;
      if (view === "voting") return r.votingEligible;
      return true;
    };

    const renderTable = () => {
      if (!data) return;
      const s = data.summary || {};
      summaryEl.textContent =
        `Razem: ${s.total ?? 0} · Zaległości: ${s.overdue ?? 0} · Opłacone: ${s.paid ?? 0} · Uprawnieni do głosowania: ${s.voting ?? 0}`;

      const view = viewSel.value;
      const rows = (Array.isArray(data.rows) ? data.rows : []).filter((r) => passesView(r, view));
      if (!rows.length) {
        content.innerHTML = `<p class="hint">Brak osób w tym widoku.</p>`;
        return;
      }
      let html = `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Osoba</th><th>Składki opłacone do</th><th>Saldo godzinek</th><th>Głosowanie</th></tr></thead><tbody>`;
      for (const r of rows) {
        const email = r.userEmail ? `<div class="reportEmail">${escapeHtml(r.userEmail)}</div>` : "";
        const person = `<div class="reportPerson">${escapeHtml(r.userName || r.userNick || "—")}</div>${email}`;
        const contrib = r.contributionsPaidUntil
          ? `<span class="${r.paid ? "duesOk" : "duesBad"}">${escapeHtml(formatContribDate(r.contributionsPaidUntil))}</span>`
          : `<span class="duesBad">brak</span>`;
        const bal = Number(r.balance || 0);
        const balCls = bal > 0 ? "duesOk" : (bal < 0 ? "duesBad" : "");
        const sign = bal > 0 ? "+" : "";
        const voting = r.votingEligible ? `<span class="duesOk">✓</span>` : `<span class="reportEmail">—</span>`;
        html += `<tr><td>${person}</td><td>${contrib}</td><td class="reportTerm"><span class="${balCls}">${sign}${escapeHtml(String(bal))} h</span></td><td>${voting}</td></tr>`;
      }
      html += `</tbody></table></div><p class="hint" style="margin-top:8px;">Pozycji: ${rows.length}</p>`;
      content.innerHTML = html;
    };

    const load = async () => {
      content.innerHTML = `<p class="hint">Ładuję...</p>`;
      summaryEl.textContent = "";
      try {
        data = await apiGetJson({ url: REPORT_URL, idToken: ctx.idToken });
        renderTable();
      } catch (e) {
        data = null;
        content.innerHTML = `<p class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać raportu."))}</p>`;
      }
    };

    viewSel.addEventListener("change", renderTable);
    load();
  },
};
