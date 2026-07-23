// public/modules/raporty/user_activity.js
// Raport „Aktywność użytkownika" — pełna historia godzinek (przyznane + wydane)
// dowolnego użytkownika po e-mailu, w zakresie czasu. Render jak widok historii w aplikacji.
import { apiGetJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const REPORT_URL = "/api/admin/reports/user-activity";

// Helpery skopiowane z godzinki_module.js — identyczny wygląd (klasy .godzinki* z godzinki.css).
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = String(isoStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return esc(isoStr);
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}
function formatBalanceSign(b) { return b > 0 ? `+${b}` : String(b); }
function recordTypeClass(type, approved) {
  if (type === "earn" && approved) return "ledgerEarn";
  if (type === "earn" && !approved) return "ledgerPending";
  if (type === "spend") return "ledgerSpend";
  if (type === "purchase") return "ledgerPurchase";
  return "";
}
function shortenReason(reason) {
  if (!reason) return "—";
  if (reason.startsWith("Zwrot godzinek z")) return "Zwrot z rezerwacji";
  return reason;
}
function renderRecordTable(records) {
  if (!records.length) return `<p class="godzinkiEmpty">Brak wpisów w wybranym zakresie.</p>`;
  return `<table class="godzinkiTable"><thead><tr><th>Data</th><th>Ilość</th><th>Za co</th></tr></thead><tbody>${
    records.map((r) => {
      const isSpend = r.type === "spend";
      const isWaived = isSpend && r.waived === true;
      const isZero = Number(r.amount) === 0;
      const amountClass = isWaived ? "godzinkiAmountWaived" : isZero ? "" : isSpend ? "godzinkiAmountNeg" : "godzinkiAmountPos";
      const amountSign = isZero ? "" : isSpend ? "-" : "+";
      const isPending = r.type === "earn" && !r.approved;
      const amountHtml = isWaived ? `<s>${amountSign}${esc(String(r.amount))} h</s>` : `${amountSign}${esc(String(r.amount))} h`;
      return `<tr class="${esc(recordTypeClass(r.type, r.approved))}"><td class="godzinkiDateCell">${esc(formatDate(r.createdAt))}</td><td class="godzinkiAmountCell ${amountClass}">${amountHtml}</td><td><span class="godzinkiReason">${esc(shortenReason(r.reason))}</span>${isWaived ? `<span class="godzinkiWaivedTag">zwolnienie${r.schoolYear ? ` kurs ${esc(String(r.schoolYear))}` : ""}</span>` : ""}${isPending ? `<span class="godzinkiPending">oczekuje</span>` : ""}</td></tr>`;
    }).join("")
  }</tbody></table>`;
}
function infoBarHtml(balance, nextExpiry) {
  const cls = balance < 0 ? "godzinkiBalanceNeg" : balance > 0 ? "godzinkiBalancePos" : "";
  return `<div class="godzinkiInfoBar"><span class="godzinkiSaldo ${esc(cls)}">Saldo: ${esc(formatBalanceSign(balance))} h</span>${nextExpiry ? `<span class="godzinkiExpiry">Najbliższe wygasają: ${esc(nextExpiry)}</span>` : ""}</div>`;
}

export const userActivityReport = {
  id: "user-activity",
  category: "Członkowie",
  label: "Aktywność użytkownika",
  description: "",

  render({ container, ctx }) {
    container.innerHTML = `
      <div class="reportControls">
        <label class="reportLabel">Użytkownik:
          <input type="search" id="uaEmail" placeholder="E-mail, ksywa lub nazwisko" autocomplete="off" style="min-width:240px;">
        </label>
        <label class="reportLabel">Zakres:
          <select id="uaRange">
            <option value="month">Ostatni miesiąc</option>
            <option value="semester" selected>Ostatni semestr</option>
            <option value="year">Ostatni rok</option>
            <option value="custom">Zakres dat</option>
          </select>
        </label>
        <span id="uaCustomDates" class="hidden"><input type="date" id="uaFrom"> – <input type="date" id="uaTo"></span>
        <button type="button" id="uaShowBtn" class="primary">Pokaż</button>
      </div>
      <p class="hint" style="margin:2px 0 8px;">Szukaj po <strong>e-mailu, nazwisku lub ksywie</strong>.</p>
      <div id="uaContent"><p class="hint">Wpisz e-mail, nazwisko lub ksywę użytkownika i kliknij „Pokaż".</p></div>
    `;

    const emailEl = container.querySelector("#uaEmail");
    const rangeSel = container.querySelector("#uaRange");
    const customSpan = container.querySelector("#uaCustomDates");
    const fromEl = container.querySelector("#uaFrom");
    const toEl = container.querySelector("#uaTo");
    const content = container.querySelector("#uaContent");

    const render = (data) => {
      if (data && data.found === false) {
        // Wiele dopasowań → klikalna lista kandydatów (klik = wybór po e-mailu).
        if (Array.isArray(data.candidates) && data.candidates.length) {
          const items = data.candidates.map((c) =>
            `<button type="button" class="reportTile uaCandidate" data-email="${esc(c.email)}"><span class="reportTileLabel">${esc(c.name || c.email)}${c.nick ? ` „${esc(c.nick)}"` : ""}</span><span class="reportTileDesc">${esc(c.email)}</span></button>`
          ).join("");
          content.innerHTML = `<p class="hint">${esc(data.message || "Pasuje wiele osób — wybierz:")}</p><div class="reportGrid">${items}</div>`;
          content.querySelectorAll(".uaCandidate").forEach((btn) => {
            btn.addEventListener("click", () => { emailEl.value = btn.getAttribute("data-email") || ""; load(); });
          });
          return;
        }
        content.innerHTML = `<p class="hint">${esc(data.message || "Nie znaleziono użytkownika.")}</p>`;
        return;
      }
      const recs = Array.isArray(data?.history) ? data.history : [];
      const u = data?.user || {};
      const head = `<div class="reportPerson" style="font-size:15px;margin:4px 0 8px;">${esc(u.name || u.email || "")}${u.email ? ` <span class="reportEmail">${esc(u.email)}</span>` : ""}</div>`;
      content.innerHTML = head +
        infoBarHtml(Number(data?.balance ?? 0), data?.nextExpiryMonthYear || null) +
        `<div class="godzinkiHistorySection"><div class="godzinkiHistoryHead"><h3>Historia w zakresie (${recs.length})</h3></div>${renderRecordTable(recs)}</div>`;
    };

    const load = async () => {
      const queryStr = (emailEl.value || "").trim();
      if (!queryStr) { content.innerHTML = `<p class="hint">Podaj e-mail, nazwisko lub ksywę.</p>`; return; }
      const range = rangeSel.value;
      let url = `${REPORT_URL}?query=${encodeURIComponent(queryStr)}&range=${encodeURIComponent(range)}`;
      if (range === "custom") {
        const f = fromEl.value; const t = toEl.value;
        if (!f || !t) { content.innerHTML = `<p class="hint">Wybierz zakres dat (od i do).</p>`; return; }
        url += `&from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
      }
      content.innerHTML = `<p class="hint">Ładuję...</p>`;
      try {
        const data = await apiGetJson({ url, idToken: ctx.idToken });
        render(data);
      } catch (e) {
        content.innerHTML = `<p class="err">${esc(mapUserFacingApiError(e, "Nie udało się pobrać aktywności użytkownika."))}</p>`;
      }
    };

    rangeSel.addEventListener("change", () => { customSpan.classList.toggle("hidden", rangeSel.value !== "custom"); });
    container.querySelector("#uaShowBtn").addEventListener("click", load);
    emailEl.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); load(); } });
  },
};
