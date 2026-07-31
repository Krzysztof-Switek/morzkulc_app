// public/modules/raporty/gear_rentals.js
// Raport „Wypożyczony sprzęt" — deskryptor do rejestru raportów Zarządu.
import { apiGetJson, apiPostJson } from "/core/api_client.js";
import { mapUserFacingApiError } from "/core/user_error_messages.js";

const REPORT_URL = "/api/admin/reports/gear-rentals";
const ADMIN_CANCEL_URL = "/api/admin/gear-reservations/cancel";

// Kategoria → rzeczownik w liczbie POJEDYNCZEJ (do wyświetlania pozycji: „Kajak 11").
const CATEGORY_NOUN = {
  kayaks: "Kajak",
  paddles: "Wiosło",
  lifejackets: "Kamizelka",
  helmets: "Kask",
  throwbags: "Rzutka",
  sprayskirts: "Fartuch",
};

// Znaki traktowane jako część słowa przy tokenizacji wyszukiwania użytkownika
// (zachowujemy polskie litery, @, kropkę, podkreślenie, myślnik).
const USER_NONWORD = /[^a-z0-9ąćęłńóśźż@._-]+/g;

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
function formatDatePL(iso) {
  const s = String(iso || "").trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

export const gearRentalsReport = {
  id: "gear-rentals",
  category: "Sprzęt",
  label: "Wypożyczenia sprzętu",
  description: "",

  render({ container, ctx }) {
    container.innerHTML = `
      <div class="reportControls">
        <label class="reportLabel">Zakres:
          <select id="reportRange">
            <option value="current" selected>Aktualnie wypożyczony</option>
            <option value="month">Ostatni miesiąc</option>
            <option value="semester">Ostatni semestr</option>
            <option value="year">Ostatni rok</option>
            <option value="custom">Zakres dat</option>
          </select>
        </label>
        <span id="reportCustomDates" class="hidden">
          <input type="date" id="reportFrom"> – <input type="date" id="reportTo">
          <button type="button" id="reportShowBtn">Pokaż</button>
        </span>
        <label class="reportLabel">Użytkownik:
          <input type="search" id="reportUser" list="reportUserList" placeholder="Wszyscy — nazwisko, ksywa, mail" autocomplete="off">
          <datalist id="reportUserList"></datalist>
        </label>
      </div>
      <div class="reportCats">
        <label><input type="checkbox" id="catAll" checked> Wszystkie</label>
        <label><input type="checkbox" class="catChk" value="kayaks" checked> Kajaki</label>
        <label><input type="checkbox" class="catChk" value="paddles" checked> Wiosła</label>
        <label><input type="checkbox" class="catChk" value="lifejackets" checked> Kamizelki</label>
        <label><input type="checkbox" class="catChk" value="helmets" checked> Kaski</label>
        <label><input type="checkbox" class="catChk" value="throwbags" checked> Rzutki</label>
        <label><input type="checkbox" class="catChk" value="sprayskirts" checked> Fartuchy</label>
      </div>
      <div id="reportActionMsg" class="hidden" style="margin-top:8px;"></div>
      <div id="reportContent" style="margin-top:12px;"></div>
    `;

    const rangeSel = container.querySelector("#reportRange");
    const customSpan = container.querySelector("#reportCustomDates");
    const fromInput = container.querySelector("#reportFrom");
    const toInput = container.querySelector("#reportTo");
    const userInput = container.querySelector("#reportUser");
    const userList = container.querySelector("#reportUserList");
    const reportContent = container.querySelector("#reportContent");
    const actionMsg = container.querySelector("#reportActionMsg");
    const catAllChk = container.querySelector("#catAll");
    const catChks = Array.from(container.querySelectorAll(".catChk"));
    let lastRows = null;

    // Stan formularza „Anuluj i zwróć godziny": id rezerwacji, której formularz
    // jest aktualnie rozwinięty w tabeli, roboczy tekst powodu (przetrwa błąd
    // walidacji przy ponownym renderze) i ewentualny komunikat błędu tej pozycji.
    let cancelState = { openId: null, reason: "", error: "" };

    const setActionMsg = (text, kind) => {
      if (!text) {
        actionMsg.className = "hidden";
        actionMsg.textContent = "";
        return;
      }
      actionMsg.className = kind === "err" ? "err" : "ok";
      actionMsg.textContent = text;
    };

    // null = bez filtra (Wszystkie); inaczej Set zaznaczonych kategorii.
    const selectedCats = () => {
      if (catAllChk.checked) return null;
      const s = new Set();
      catChks.forEach((c) => { if (c.checked) s.add(c.value); });
      return s;
    };

    // Dopasowanie użytkownika po nazwisku / ksywie / mailu (substring lub tokenowo,
    // żeby zadziałało też po wyborze z listy „Imię Nazwisko — mail").
    const userMatches = (row, q) => {
      if (!q) return true;
      const hay = `${row.userName || ""} ${row.userNick || ""} ${row.userEmail || ""}`.toLowerCase();
      if (hay.includes(q)) return true;
      const tokens = q.split(/\s+/).map((t) => t.replace(USER_NONWORD, "")).filter(Boolean);
      return tokens.length > 0 && tokens.every((t) => hay.includes(t));
    };

    const rebuildUserList = () => {
      const seen = new Set();
      const opts = [];
      for (const r of (lastRows || [])) {
        const name = r.userName || r.userNick || "";
        const key = (name + "|" + (r.userEmail || "")).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const labelTxt = [name, r.userEmail].filter(Boolean).join(" — ");
        if (labelTxt) opts.push(`<option value="${escapeAttr(labelTxt)}"></option>`);
      }
      userList.innerHTML = opts.join("");
    };

    const renderReport = () => {
      if (!lastRows) return;
      const cats = selectedCats();
      const q = (userInput.value || "").trim().toLowerCase();
      const rows = [];
      for (const r of lastRows) {
        if (!userMatches(r, q)) continue;
        const items = cats ? (r.items || []).filter((it) => cats.has(it.category)) : (r.items || []);
        if (!items.length) continue;
        rows.push({ r, items });
      }
      if (!rows.length) {
        reportContent.innerHTML = `<p class="hint">Brak wypożyczeń w wybranym zakresie.</p>`;
        return;
      }
      let html = `<div class="tableWrapper"><table class="reportTable"><thead><tr><th>Osoba</th><th>Sprzęt</th><th>Termin</th><th>Akcja</th></tr></thead><tbody>`;
      for (const { r, items } of rows) {
        const email = r.userEmail ? `<div class="reportEmail">${escapeHtml(r.userEmail)}</div>` : "";
        const person = `<div class="reportPerson">${escapeHtml(r.userName || r.userNick || "—")}</div>${email}`;
        const gear = items.map((it) => {
          const noun = CATEGORY_NOUN[it.category] || it.categoryLabel || "Sprzęt";
          const head = [noun, it.number].filter(Boolean).join(" ");
          const lab = it.label ? ` — ${escapeHtml(it.label)}` : "";
          return `<div class="reportItem">${escapeHtml(head)}${lab}</div>`;
        }).join("");
        const term = `${escapeHtml(formatDatePL(r.startDate))} – ${escapeHtml(formatDatePL(r.endDate))}`;
        const rid = r.id || "";
        let action;
        if (rid && cancelState.openId === rid) {
          const errHtml = cancelState.error ? `<p class="err" style="margin:0;padding:6px 8px;">${escapeHtml(cancelState.error)}</p>` : "";
          action = `<div class="cancelForm">
            <input type="text" class="cancelReasonInput" data-reason-for="${escapeAttr(rid)}" placeholder="Powód (wymagany)" value="${escapeAttr(cancelState.reason)}">
            <div class="cancelFormBtns">
              <button type="button" class="dangerBtn" data-cancel-confirm="${escapeAttr(rid)}">Potwierdź</button>
              <button type="button" class="ghost" data-cancel-dismiss>Wróć</button>
            </div>
            ${errHtml}
          </div>`;
        } else if (rid) {
          action = `<button type="button" class="dangerBtn" data-cancel-open="${escapeAttr(rid)}">Anuluj i zwróć godziny</button>`;
        } else {
          action = "";
        }
        html += `<tr><td>${person}</td><td>${gear}</td><td class="reportTerm">${term}</td><td>${action}</td></tr>`;
      }
      html += `</tbody></table></div><p class="hint" style="margin-top:8px;">Pozycji: ${rows.length}</p>`;
      reportContent.innerHTML = html;

      const openInput = reportContent.querySelector(".cancelReasonInput");
      if (openInput) { openInput.focus(); openInput.setSelectionRange(openInput.value.length, openInput.value.length); }
    };

    reportContent.addEventListener("input", (ev) => {
      if (ev.target.matches?.(".cancelReasonInput")) {
        cancelState.reason = ev.target.value;
      }
    });

    reportContent.addEventListener("click", async (ev) => {
      const openBtn = ev.target.closest?.("[data-cancel-open]");
      const dismissBtn = ev.target.closest?.("[data-cancel-dismiss]");
      const confirmBtn = ev.target.closest?.("[data-cancel-confirm]");

      if (openBtn) {
        cancelState = { openId: openBtn.getAttribute("data-cancel-open"), reason: "", error: "" };
        renderReport();
        return;
      }
      if (dismissBtn) {
        cancelState = { openId: null, reason: "", error: "" };
        renderReport();
        return;
      }
      if (confirmBtn) {
        const rid = confirmBtn.getAttribute("data-cancel-confirm");
        const input = reportContent.querySelector(`[data-reason-for="${CSS.escape(rid)}"]`);
        const reason = (input?.value || "").trim();
        if (!reason) {
          cancelState = { openId: rid, reason: "", error: "Podaj powód anulowania." };
          renderReport();
          return;
        }
        const card = confirmBtn.closest(".cancelForm");
        card?.querySelectorAll("button, input").forEach((el) => { el.disabled = true; });
        try {
          const res = await apiPostJson({
            url: ADMIN_CANCEL_URL,
            idToken: ctx.idToken,
            body: { reservationId: rid, reason },
          });
          lastRows = (lastRows || []).filter((row) => row.id !== rid);
          cancelState = { openId: null, reason: "", error: "" };
          const hoursMsg = res?.costHours > 0 ? ` Zwrócono ${res.costHours} godz. na konto użytkownika.` : "";
          setActionMsg(`Rezerwacja anulowana.${hoursMsg} Użytkownik dostanie e-mail z informacją.`, "ok");
          rebuildUserList();
          renderReport();
        } catch (e) {
          cancelState = { openId: rid, reason, error: mapUserFacingApiError(e, "Nie udało się anulować rezerwacji.") };
          renderReport();
        }
      }
    });

    const loadReport = async () => {
      const range = rangeSel.value;
      let url = `${REPORT_URL}?range=${encodeURIComponent(range)}`;
      if (range === "custom") {
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) { reportContent.innerHTML = `<p class="hint">Wybierz zakres dat (od i do).</p>`; return; }
        url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      }
      reportContent.innerHTML = `<p class="hint">Ładuję...</p>`;
      setActionMsg("");
      cancelState = { openId: null, reason: "", error: "" };
      try {
        const data = await apiGetJson({ url, idToken: ctx.idToken });
        lastRows = Array.isArray(data?.rows) ? data.rows : [];
        rebuildUserList();
        renderReport();
      } catch (e) {
        lastRows = null;
        reportContent.innerHTML = `<p class="err">${escapeHtml(mapUserFacingApiError(e, "Nie udało się pobrać raportu."))}</p>`;
      }
    };

    rangeSel.addEventListener("change", () => {
      const isCustom = rangeSel.value === "custom";
      customSpan.classList.toggle("hidden", !isCustom);
      if (!isCustom) loadReport();
    });
    container.querySelector("#reportShowBtn").addEventListener("click", loadReport);
    userInput.addEventListener("input", renderReport);
    catAllChk.addEventListener("change", () => {
      catChks.forEach((c) => { c.checked = catAllChk.checked; });
      renderReport();
    });
    catChks.forEach((c) => c.addEventListener("change", () => {
      catAllChk.checked = catChks.every((x) => x.checked);
      renderReport();
    }));

    // Pierwsze załadowanie (domyślnie „Aktualnie wypożyczony").
    loadReport();
  },
};
