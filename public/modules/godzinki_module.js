import { apiGetJson, apiPostJson } from "/core/api_client.js";

const GODZINKI_URL = "/api/godzinki";
const SUBMIT_URL = "/api/godzinki/submit";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const TABS = [
  { id: "balance", label: "Moje godzinki" },
  { id: "submit",  label: "Zgłoś godzinki" },
  { id: "history", label: "Historia" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function spinnerHtml(text = "Ładowanie…") {
  return `<div class="thinking">${esc(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatBalanceSign(balance) {
  if (balance > 0) return `+${balance}`;
  return String(balance);
}

function recordTypeLabel(type, approved) {
  if (type === "earn") {
    return approved ? "Przyznane" : "Oczekuje zatwierdzenia";
  }
  if (type === "spend") return "Wydane";
  if (type === "purchase") return "Wykupione";
  return type;
}

function recordTypeClass(type, approved) {
  if (type === "earn" && approved) return "ledgerEarn";
  if (type === "earn" && !approved) return "ledgerPending";
  if (type === "spend") return "ledgerSpend";
  if (type === "purchase") return "ledgerPurchase";
  return "";
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = isoStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return esc(isoStr);
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

// ─── widoki ───────────────────────────────────────────────────────────────────

function renderTabsHtml(activeTab) {
  return `<div class="godzinkiTabs">
    ${TABS.map(t => `
      <button type="button"
        class="godzinkiTab${t.id === activeTab ? " active" : ""}"
        data-godzinki-tab="${esc(t.id)}"
      >${esc(t.label)}</button>
    `).join("")}
  </div>`;
}

async function renderBalanceView(viewEl, ctx) {
  const inner = viewEl.querySelector("#godzinkiInner");
  if (!inner) return;
  inner.innerHTML = spinnerHtml("Pobieranie salda…");

  let data;
  try {
    data = await apiGetJson({ url: GODZINKI_URL + "?view=home", idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<div class="card center"><p class="errorMsg">Błąd pobierania danych: ${esc(e?.message || String(e))}</p></div>`;
    return;
  }

  const balance = Number(data?.balance ?? 0);
  const nextExpiry = data?.nextExpiryMonthYear || null;
  const recentEarnings = Array.isArray(data?.recentEarnings) ? data.recentEarnings : [];
  const limit = Number(data?.negativeBalanceLimit ?? 20);

  const balanceClass = balance < 0 ? "godzinkiBalanceNeg" : balance > 0 ? "godzinkiBalancePos" : "";

  inner.innerHTML = `
    <div class="godzinkiBalanceSection">
      <div class="godzinkiBalanceBox">
        <span class="godzinkiBalanceLabel">Twoje saldo godzinek</span>
        <span class="godzinkiBalanceValue ${esc(balanceClass)}">${esc(formatBalanceSign(balance))} h</span>
        ${nextExpiry ? `<span class="godzinkiBalanceExpiry">Najbliższe wygaśnięcie: ${esc(nextExpiry)}</span>` : ""}
      </div>
      ${balance < 0 ? `
        <div class="godzinkiInfo">
          Saldo ujemne: ${esc(String(balance))} h (limit: ${esc(String(-limit))} h)
        </div>
      ` : ""}
    </div>

    <div class="godzinkiRecentSection">
      <h3>Ostatnie godzinki</h3>
      ${recentEarnings.length === 0
        ? `<p class="godzinkiEmpty">Brak zgłoszonych godzinek.</p>`
        : `<div class="godzinkiList">
            ${recentEarnings.map(r => `
              <div class="godzinkiListItem ${esc(recordTypeClass(r.type, r.approved))}">
                <div class="godzinkiListMain">
                  <span class="godzinkiListReason">${esc(r.reason || "—")}</span>
                  <span class="godzinkiListMeta">${esc(recordTypeLabel(r.type, r.approved))}
                    ${r.grantedAt ? ` · ${esc(formatDate(r.grantedAt))}` : ""}
                    ${r.expiresAt ? ` · wygasa ${esc(r.expiresAt)}` : ""}
                  </span>
                </div>
                <span class="godzinkiListAmount">
                  ${r.type === "earn" ? `+${r.amount}` : r.type === "spend" ? `-${r.amount}` : `+${r.amount}`} h
                </span>
              </div>
            `).join("")}
          </div>`
      }
    </div>
  `;
}

async function renderHistoryView(viewEl, ctx) {
  const inner = viewEl.querySelector("#godzinkiInner");
  if (!inner) return;
  inner.innerHTML = spinnerHtml("Pobieranie historii…");

  let data;
  try {
    data = await apiGetJson({ url: GODZINKI_URL + "?view=full", idToken: ctx.idToken });
  } catch (e) {
    inner.innerHTML = `<div class="card center"><p class="errorMsg">Błąd pobierania historii: ${esc(e?.message || String(e))}</p></div>`;
    return;
  }

  const history = Array.isArray(data?.history) ? data.history : [];
  const balance = Number(data?.balance ?? 0);

  if (history.length === 0) {
    inner.innerHTML = `
      <div class="godzinkiBalanceSection">
        <div class="godzinkiBalanceBox">
          <span class="godzinkiBalanceLabel">Saldo</span>
          <span class="godzinkiBalanceValue">${esc(formatBalanceSign(balance))} h</span>
        </div>
      </div>
      <p class="godzinkiEmpty">Brak historii godzinek.</p>
    `;
    return;
  }

  inner.innerHTML = `
    <div class="godzinkiBalanceSection">
      <div class="godzinkiBalanceBox">
        <span class="godzinkiBalanceLabel">Saldo</span>
        <span class="godzinkiBalanceValue ${balance < 0 ? "godzinkiBalanceNeg" : ""}">${esc(formatBalanceSign(balance))} h</span>
      </div>
    </div>
    <div class="godzinkiHistorySection">
      <h3>Pełna historia (${history.length})</h3>
      <div class="godzinkiList">
        ${history.map(r => `
          <div class="godzinkiListItem ${esc(recordTypeClass(r.type, r.approved))}">
            <div class="godzinkiListMain">
              <span class="godzinkiListReason">${esc(r.reason || "—")}</span>
              <span class="godzinkiListMeta">
                ${esc(recordTypeLabel(r.type, r.approved))}
                ${r.grantedAt ? ` · data pracy: ${esc(formatDate(r.grantedAt))}` : ""}
                ${r.type === "earn" && r.expiresAt ? ` · wygasa: ${esc(r.expiresAt)}` : ""}
                ${r.type === "spend" && r.reservationId ? ` · rezerwacja #${esc(r.reservationId.slice(0, 8))}` : ""}
                ${r.type === "earn" && r.approved ? ` · pozostało: ${r.remaining ?? 0} h` : ""}
                · zgłoszono: ${esc(formatDate(r.createdAt))}
              </span>
            </div>
            <span class="godzinkiListAmount ${r.type === "spend" ? "godzinkiAmountNeg" : "godzinkiAmountPos"}">
              ${r.type === "spend" ? "-" : "+"}${r.amount} h
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSubmitView(viewEl, ctx) {
  const inner = viewEl.querySelector("#godzinkiInner");
  if (!inner) return;

  const today = todayIso();

  inner.innerHTML = `
    <div class="godzinkiSubmitSection">
      <h3>Zgłoś godzinki</h3>
      <p class="godzinkiInfo">
        Zgłoś czas pracy społecznej na rzecz klubu. Godzinki pojawią się w Twoim saldzie po zatwierdzeniu przez zarząd.
      </p>

      <form id="godzinkiSubmitForm" class="godzinkiForm" novalidate>
        <div class="formRow">
          <label for="godzinkiAmount">Liczba godzinek <span class="required">*</span></label>
          <input type="number" id="godzinkiAmount" name="amount" min="1" max="9999" step="1"
            placeholder="np. 4" required />
        </div>

        <div class="formRow">
          <label for="godzinkiGrantedAt">Data pracy <span class="required">*</span></label>
          <input type="date" id="godzinkiGrantedAt" name="grantedAt"
            max="${esc(today)}" required />
        </div>

        <div class="formRow">
          <label for="godzinkiReason">Opis pracy <span class="required">*</span></label>
          <textarea id="godzinkiReason" name="reason" rows="3" maxlength="500"
            placeholder="np. Organizacja spływu Dunajec 2026-03-15 — 6h pracy" required></textarea>
        </div>

        <div id="godzinkiFormError" class="errorMsg" hidden></div>
        <div id="godzinkiFormSuccess" class="successMsg" hidden></div>

        <div class="formActions">
          <button type="submit" id="godzinkiSubmitBtn" class="primary">Zgłoś godzinki</button>
        </div>
      </form>
    </div>
  `;

  const form = inner.querySelector("#godzinkiSubmitForm");
  const errEl = inner.querySelector("#godzinkiFormError");
  const okEl = inner.querySelector("#godzinkiFormSuccess");
  const btn = inner.querySelector("#godzinkiSubmitBtn");

  function setErr(msg) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
    okEl.hidden = true;
  }

  function setOk(msg) {
    okEl.textContent = msg;
    okEl.hidden = false;
    errEl.hidden = true;
    form.reset();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setErr("");

    const amount = Number(form.amount.value);
    const grantedAt = String(form.grantedAt.value || "").trim();
    const reason = String(form.reason.value || "").trim();

    if (!amount || amount <= 0) { setErr("Podaj prawidłową liczbę godzinek (> 0)."); return; }
    if (!grantedAt) { setErr("Podaj datę pracy."); return; }
    if (grantedAt > today) { setErr("Data pracy nie może być w przyszłości."); return; }
    if (!reason) { setErr("Podaj opis pracy."); return; }

    btn.disabled = true;
    btn.textContent = "Wysyłanie…";

    try {
      const resp = await apiPostJson({
        url: SUBMIT_URL,
        idToken: ctx.idToken,
        body: { amount, grantedAt, reason },
      });

      if (resp?.ok) {
        setOk("Godzinki zgłoszone! Oczekują zatwierdzenia przez zarząd.");
      } else {
        const fields = resp?.fields || {};
        const msgs = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(", ");
        setErr("Błąd: " + (msgs || resp?.message || "Nieznany błąd"));
      }
    } catch (err) {
      setErr("Błąd wysyłania: " + (err?.message || String(err)));
    } finally {
      btn.disabled = false;
      btn.textContent = "Zgłoś godzinki";
    }
  });
}

// ─── główny render ────────────────────────────────────────────────────────────

async function renderGodzinkiView(viewEl, routeId, ctx, moduleId) {
  const activeTab = TABS.find(t => t.id === routeId)?.id || "balance";

  if (!ctx?.idToken) {
    viewEl.innerHTML = `<div class="card center"><p>Brak tokenu sesji. Odśwież stronę.</p></div>`;
    return;
  }

  viewEl.innerHTML = `
    <div class="card wide godzinkiModule">
      <div class="moduleHeader">
        <h2>Godzinki</h2>
        <div class="moduleNav">
          <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
          <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
        </div>
      </div>
      ${renderTabsHtml(activeTab)}
      <div id="godzinkiInner">
        ${spinnerHtml()}
      </div>
    </div>
  `;

  // Nawigacja: wróć / strona główna
  viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
    import("/core/router.js").then(({ setHash }) => setHash("home", "home"));
  });
  viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
    import("/core/router.js").then(({ setHash }) => {
      if (activeTab !== "balance") {
        setHash(moduleId, "balance");
      } else {
        setHash("home", "home");
      }
    });
  });

  // Podłącz przełączanie zakładek
  viewEl.querySelectorAll("[data-godzinki-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.godzinkiTab;
      import("/core/router.js").then(({ setHash }) => {
        setHash(moduleId, tab);
      });
    });
  });

  // Renderuj aktywną zakładkę
  if (activeTab === "balance") {
    await renderBalanceView(viewEl, ctx);
  } else if (activeTab === "history") {
    await renderHistoryView(viewEl, ctx);
  } else if (activeTab === "submit") {
    renderSubmitView(viewEl, ctx);
  }
}

// ─── export ───────────────────────────────────────────────────────────────────

export function createGodzinkiModule({ id, type, label, defaultRoute, order, enabled, access }) {
  return {
    id,
    type,
    label,
    defaultRoute: defaultRoute === "home" ? "balance" : (defaultRoute || "balance"),
    order,
    enabled,
    access,

    async render({ viewEl, routeId, ctx }) {
      await renderGodzinkiView(viewEl, routeId || "balance", ctx, id);
    },
  };
}