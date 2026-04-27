// public/modules/basen_module.js
import { apiGetJson, apiPostJson } from "/core/api_client.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const SESSIONS_URL = "/api/basen/sessions";
const ENROLL_URL = "/api/basen/enroll";
const CANCEL_ENROLL_URL = "/api/basen/cancel-enrollment";
const KARNETY_URL = "/api/basen/karnety";
const CREATE_SESSION_URL = "/api/basen/sessions/create";
const CANCEL_SESSION_URL = "/api/basen/sessions/cancel";
const GRANT_KARNET_URL = "/api/basen/karnety/grant";


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

function spinnerHtml(text = "Ładowanie…") {
  return `<div class="thinking">${esc(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const d = new Date(`${iso}T12:00:00`);
  const dayName = days[d.getDay()] || "";
  return `${m[3]}.${m[2]}.${m[1]} (${dayName})`;
}

function karnetStatusLabel(status) {
  switch (status) {
  case "active": return "Aktywny";
  case "exhausted": return "Wykorzystany";
  case "expired": return "Wygasły";
  case "pending": return "Oczekuje";
  default: return status;
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function renderTabsHtml(activeTab, isAdmin) {
  const tabs = [
    { id: "sessions", label: "Sesje" },
    { id: "karnet", label: "Mój karnet" },
  ];
  if (isAdmin) tabs.push({ id: "admin", label: "Zarządzanie" });

  return `<div class="basenTabs">
    ${tabs.map((t) => `
      <button type="button"
        class="basenTab${t.id === activeTab ? " active" : ""}"
        data-basen-tab="${esc(t.id)}"
      >${esc(t.label)}</button>
    `).join("")}
  </div>`;
}

// ─── Sessions view ────────────────────────────────────────────────────────────

function renderSessionCard(s, canEnroll, activeKarnet) {
  const remaining = s.capacity - s.enrolledCount;
  const spotsLabel = remaining > 0
    ? `<span class="basenSpots">${remaining} miejsc wolnych</span>`
    : `<span class="basenSpotsFull">Brak miejsc</span>`;

  const karnetRemaining = activeKarnet
    ? activeKarnet.totalEntries - activeKarnet.usedEntries
    : 0;

  let actionHtml = "";
  if (s.userEnrolled) {
    actionHtml = `
      <div class="basenEnrolledBadge">Zapisany/a</div>
      <button type="button" class="ghost basenCancelEnrollBtn"
        data-enrollment-id="${esc(s.userEnrollmentId)}"
        data-session-date="${esc(s.date)}"
        data-session-time="${esc(s.timeStart)}"
      >Anuluj</button>
    `;
  } else if (canEnroll && remaining > 0) {
    const karnetOpt = karnetRemaining > 0
      ? `<option value="karnet">Karnet (${karnetRemaining} wejść)</option>`
      : "";
    const jednorazOpt = `<option value="jednorazowe">Jednorazowe</option>`;

    if (!karnetOpt && !jednorazOpt) {
      actionHtml = `<span class="basenHint">Brak opcji płatności</span>`;
    } else {
      actionHtml = `
        <div class="basenEnrollRow">
          <select class="basenPaymentSelect" data-session-id="${esc(s.id)}">
            ${karnetOpt}
            ${jednorazOpt}
          </select>
          <button type="button" class="primary basenEnrollBtn"
            data-session-id="${esc(s.id)}"
          >Zapisz się</button>
        </div>
      `;
    }
  } else if (!canEnroll) {
    actionHtml = `<span class="basenHint">Tylko dla członków klubu</span>`;
  }

  return `
    <div class="basenCard" data-session-id="${esc(s.id)}">
      <div class="basenCardHead">
        <div class="basenCardDate">${esc(formatDate(s.date))}</div>
        <div class="basenCardTime">${esc(s.timeStart)} – ${esc(s.timeEnd)}</div>
      </div>
      <div class="basenCardMeta">
        ${spotsLabel}
        ${s.instructorName ? `<span class="basenInstructor">Prowadzący: ${esc(s.instructorName)}</span>` : ""}
      </div>
      ${s.notes ? `<div class="basenCardNotes">${esc(s.notes)}</div>` : ""}
      <div class="basenCardFooter">
        ${actionHtml}
      </div>
      <div class="basenCardMsg hidden err" id="basenMsg-${esc(s.id)}"></div>
    </div>
  `;
}

async function renderSessionsView(innerEl, ctx, canEnroll) {
  innerEl.innerHTML = spinnerHtml("Ładowanie sesji…");

  try {
    const data = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const activeKarnet = data?.activeKarnet || null;

    if (!sessions.length) {
      innerEl.innerHTML = `<div class="hint" style="margin-top:16px;">Brak nadchodzących sesji basenowych.</div>`;
      return;
    }

    innerEl.innerHTML = `
      ${activeKarnet ? `
        <div class="basenKarnetBanner">
          Aktywny karnet: <strong>${activeKarnet.remaining} z ${activeKarnet.totalEntries} wejść</strong>
        </div>
      ` : ""}
      <div class="basenList">
        ${sessions.map((s) => renderSessionCard(s, canEnroll, activeKarnet)).join("")}
      </div>
    `;

    bindSessionActions(innerEl, ctx);
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się załadować sesji.")}</div>`;
  }
}

function bindSessionActions(innerEl, ctx) {
  // Enroll
  innerEl.querySelectorAll(".basenEnrollBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = btn.getAttribute("data-session-id");
      const select = innerEl.querySelector(`.basenPaymentSelect[data-session-id="${sessionId}"]`);
      const paymentType = select ? select.value : "jednorazowe";
      const msgEl = innerEl.querySelector(`#basenMsg-${sessionId}`);

      btn.disabled = true;
      btn.textContent = "Zapisuję…";
      if (msgEl) { msgEl.textContent = ""; msgEl.classList.add("hidden"); }

      try {
        await apiPostJson({ url: ENROLL_URL, idToken: ctx.idToken, body: { sessionId, paymentType } });
        // Refresh sessions view
        const data = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const activeKarnet = data?.activeKarnet || null;
        const canEnroll = (ctx?.session?.allowed_actions ?? []).includes("basen.enroll");

        innerEl.innerHTML = `
          ${activeKarnet ? `
            <div class="basenKarnetBanner">
              Aktywny karnet: <strong>${activeKarnet.remaining} z ${activeKarnet.totalEntries} wejść</strong>
            </div>
          ` : ""}
          <div class="basenList">
            ${sessions.map((s) => renderSessionCard(s, canEnroll, activeKarnet)).join("")}
          </div>
        `;
        bindSessionActions(innerEl, ctx);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Zapisz się";
        if (msgEl) {
          msgEl.textContent = e?.message || "Nie udało się zapisać.";
          msgEl.classList.remove("hidden");
        }
      }
    });
  });

  // Cancel enrollment
  innerEl.querySelectorAll(".basenCancelEnrollBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const enrollmentId = btn.getAttribute("data-enrollment-id");
      const date = btn.getAttribute("data-session-date");
      const time = btn.getAttribute("data-session-time");
      const cardEl = btn.closest(".basenCard");
      const sessionId = cardEl?.getAttribute("data-session-id") || "";
      const msgEl = innerEl.querySelector(`#basenMsg-${sessionId}`);

      if (!confirm(`Anulować zapis na sesję ${formatDate(date)} ${time}?`)) return;

      btn.disabled = true;
      btn.textContent = "Anuluję…";

      try {
        await apiPostJson({ url: CANCEL_ENROLL_URL, idToken: ctx.idToken, body: { enrollmentId } });
        const data = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const activeKarnet = data?.activeKarnet || null;
        const canEnroll = (ctx?.session?.allowed_actions ?? []).includes("basen.enroll");

        innerEl.innerHTML = `
          ${activeKarnet ? `
            <div class="basenKarnetBanner">
              Aktywny karnet: <strong>${activeKarnet.remaining} z ${activeKarnet.totalEntries} wejść</strong>
            </div>
          ` : ""}
          <div class="basenList">
            ${sessions.map((s) => renderSessionCard(s, canEnroll, activeKarnet)).join("")}
          </div>
        `;
        bindSessionActions(innerEl, ctx);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Anuluj";
        if (msgEl) {
          msgEl.textContent = e?.message || "Nie udało się anulować.";
          msgEl.classList.remove("hidden");
        }
      }
    });
  });
}

// ─── Karnet view ──────────────────────────────────────────────────────────────

async function renderKarnetView(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie karnetu…");

  try {
    const data = await apiGetJson({ url: KARNETY_URL, idToken: ctx.idToken });
    const karnety = Array.isArray(data?.karnety) ? data.karnety : [];
    const cfg = data?.config || {};

    const active = karnety.filter((k) => k.status === "active");
    const others = karnety.filter((k) => k.status !== "active");

    let html = "";

    if (cfg.cenaZaKarnet || cfg.ileWejsc || cfg.cenaZaGodzine) {
      html += `
        <div class="basenKarnetInfo">
          ${cfg.ileWejsc ? `<div>Karnet: <strong>${cfg.ileWejsc} wejść</strong></div>` : ""}
          ${cfg.cenaZaKarnet ? `<div>Cena karnetu: <strong>${cfg.cenaZaKarnet} zł</strong></div>` : ""}
          ${cfg.cenaZaGodzine ? `<div>Jednorazowe: <strong>${cfg.cenaZaGodzine} zł</strong></div>` : ""}
        </div>
      `;
    }

    if (!karnety.length) {
      html += `<div class="hint" style="margin-top:16px;">Nie masz żadnego karnetu. Skontaktuj się z zarządem lub KR, aby zakupić karnet.</div>`;
    } else {
      if (active.length) {
        html += `<h3 style="margin:16px 0 8px;">Aktywne karnety</h3>`;
        html += active.map((k) => `
          <div class="basenKarnetCard basenKarnetActive">
            <div class="basenKarnetRow">
              <span>Wejścia:</span>
              <strong>${k.usedEntries} / ${k.totalEntries} wykorzystanych</strong>
            </div>
            <div class="basenKarnetProgress">
              <div class="basenKarnetBar" style="width:${Math.round((k.usedEntries / k.totalEntries) * 100)}%"></div>
            </div>
            <div class="basenKarnetRow">
              <span>Pozostało:</span>
              <strong>${k.remaining} wejść</strong>
            </div>
          </div>
        `).join("");
      }

      if (others.length) {
        html += `<h3 style="margin:16px 0 8px;">Historia</h3>`;
        html += others.map((k) => `
          <div class="basenKarnetCard">
            <div class="basenKarnetRow">
              <span>Status:</span>
              <strong>${esc(karnetStatusLabel(k.status))}</strong>
            </div>
            <div class="basenKarnetRow">
              <span>Wejścia:</span>
              <strong>${k.usedEntries} / ${k.totalEntries}</strong>
            </div>
          </div>
        `).join("");
      }
    }

    innerEl.innerHTML = html;
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się załadować karnetu.")}</div>`;
  }
}

// ─── Admin view ───────────────────────────────────────────────────────────────

function renderAdminView(innerEl, ctx) {
  innerEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">

      <div class="basenAdminSection">
        <h3>Utwórz sesję</h3>
        <form id="basenCreateForm" class="basenAdminForm" autocomplete="off">
          <div class="basenFormGrid">
            <div class="row">
              <label for="bDate">Data *</label>
              <input id="bDate" type="date" min="${todayIso()}" required />
            </div>
            <div class="row">
              <label for="bTimeStart">Od *</label>
              <input id="bTimeStart" type="time" required />
            </div>
            <div class="row">
              <label for="bTimeEnd">Do *</label>
              <input id="bTimeEnd" type="time" required />
            </div>
            <div class="row">
              <label for="bCapacity">Limit miejsc</label>
              <input id="bCapacity" type="number" min="1" max="100" placeholder="Domyślny z konfiguracji" />
            </div>
          </div>
          <div class="row">
            <label for="bInstructorName">Prowadzący</label>
            <input id="bInstructorName" type="text" maxlength="100" />
          </div>
          <div class="row">
            <label for="bInstructorEmail">Email prowadzącego</label>
            <input id="bInstructorEmail" type="email" maxlength="200" />
          </div>
          <div class="row">
            <label for="bNotes">Uwagi</label>
            <textarea id="bNotes" rows="2" maxlength="500"></textarea>
          </div>
          <div id="bCreateErr" class="err hidden" style="margin-top:8px;"></div>
          <div id="bCreateOk" class="ok hidden" style="margin-top:8px;"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="bCreateBtn" type="submit" class="primary">Utwórz sesję</button>
          </div>
        </form>
      </div>

      <div class="basenAdminSection">
        <h3>Anuluj sesję</h3>
        <form id="basenCancelSessionForm" class="basenAdminForm" autocomplete="off">
          <div class="row">
            <label for="bCancelSessionId">ID sesji</label>
            <input id="bCancelSessionId" type="text" placeholder="ID z listy sesji" required />
          </div>
          <div id="bCancelErr" class="err hidden" style="margin-top:8px;"></div>
          <div id="bCancelOk" class="ok hidden" style="margin-top:8px;"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="bCancelBtn" type="submit" class="danger">Anuluj sesję</button>
          </div>
        </form>
      </div>

      <div class="basenAdminSection">
        <h3>Nadaj karnet</h3>
        <form id="basenGrantForm" class="basenAdminForm" autocomplete="off">
          <div class="row">
            <label for="bGrantUid">UID użytkownika *</label>
            <input id="bGrantUid" type="text" required placeholder="Firebase UID" />
          </div>
          <div class="row">
            <label for="bGrantEntries">Liczba wejść (0 = domyślna z konfiguracji)</label>
            <input id="bGrantEntries" type="number" min="0" max="100" value="0" />
          </div>
          <div id="bGrantErr" class="err hidden" style="margin-top:8px;"></div>
          <div id="bGrantOk" class="ok hidden" style="margin-top:8px;"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="bGrantBtn" type="submit" class="primary">Nadaj karnet</button>
          </div>
        </form>
      </div>

    </div>
  `;

  bindAdminActions(innerEl, ctx);
}

function bindAdminActions(innerEl, ctx) {
  // Create session form
  const createForm = innerEl.querySelector("#basenCreateForm");
  const createErr = innerEl.querySelector("#bCreateErr");
  const createOk = innerEl.querySelector("#bCreateOk");
  const createBtn = innerEl.querySelector("#bCreateBtn");

  const setCreateErr = (msg) => {
    createErr.textContent = msg;
    createErr.classList.toggle("hidden", !msg);
    createOk.classList.add("hidden");
  };
  const setCreateOk = (msg) => {
    createOk.textContent = msg;
    createOk.classList.toggle("hidden", !msg);
    createErr.classList.add("hidden");
  };

  createForm?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setCreateErr("");
    setCreateOk("");

    const date = innerEl.querySelector("#bDate")?.value || "";
    const timeStart = innerEl.querySelector("#bTimeStart")?.value || "";
    const timeEnd = innerEl.querySelector("#bTimeEnd")?.value || "";
    const capacity = Number(innerEl.querySelector("#bCapacity")?.value || 0);
    const instructorName = String(innerEl.querySelector("#bInstructorName")?.value || "").trim();
    const instructorEmail = String(innerEl.querySelector("#bInstructorEmail")?.value || "").trim();
    const notes = String(innerEl.querySelector("#bNotes")?.value || "").trim();

    if (!date || !timeStart || !timeEnd) {
      setCreateErr("Wypełnij datę i godziny.");
      return;
    }

    createBtn.disabled = true;
    createBtn.textContent = "Tworzę…";

    try {
      const data = await apiPostJson({
        url: CREATE_SESSION_URL,
        idToken: ctx.idToken,
        body: { date, timeStart, timeEnd, capacity: capacity || 0, instructorName, instructorEmail, notes },
      });
      setCreateOk(`Sesja utworzona (ID: ${data.sessionId})`);
      createForm.reset();
    } catch (e) {
      setCreateErr(e?.message || "Nie udało się utworzyć sesji.");
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Utwórz sesję";
    }
  });

  // Cancel session form
  const cancelSessionForm = innerEl.querySelector("#basenCancelSessionForm");
  const cancelErr = innerEl.querySelector("#bCancelErr");
  const cancelOk = innerEl.querySelector("#bCancelOk");
  const cancelBtn = innerEl.querySelector("#bCancelBtn");

  const setCancelErr = (msg) => {
    cancelErr.textContent = msg;
    cancelErr.classList.toggle("hidden", !msg);
    cancelOk.classList.add("hidden");
  };
  const setCancelOk = (msg) => {
    cancelOk.textContent = msg;
    cancelOk.classList.toggle("hidden", !msg);
    cancelErr.classList.add("hidden");
  };

  cancelSessionForm?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const sessionId = String(innerEl.querySelector("#bCancelSessionId")?.value || "").trim();
    if (!sessionId) { setCancelErr("Podaj ID sesji."); return; }
    if (!confirm(`Anulować sesję ${sessionId}? Wszyscy uczestnicy zostaną wypisani, karnety zwrócone.`)) return;

    cancelBtn.disabled = true;
    cancelBtn.textContent = "Anuluję…";
    setCancelErr("");
    setCancelOk("");

    try {
      const data = await apiPostJson({ url: CANCEL_SESSION_URL, idToken: ctx.idToken, body: { sessionId } });
      setCancelOk(`Sesja anulowana. Wypisano ${data.cancelledEnrollments} uczestników.`);
      cancelSessionForm.reset();
    } catch (e) {
      setCancelErr(e?.message || "Nie udało się anulować sesji.");
    } finally {
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Anuluj sesję";
    }
  });

  // Grant karnet form
  const grantForm = innerEl.querySelector("#basenGrantForm");
  const grantErr = innerEl.querySelector("#bGrantErr");
  const grantOk = innerEl.querySelector("#bGrantOk");
  const grantBtn = innerEl.querySelector("#bGrantBtn");

  const setGrantErr = (msg) => {
    grantErr.textContent = msg;
    grantErr.classList.toggle("hidden", !msg);
    grantOk.classList.add("hidden");
  };
  const setGrantOk = (msg) => {
    grantOk.textContent = msg;
    grantOk.classList.toggle("hidden", !msg);
    grantErr.classList.add("hidden");
  };

  grantForm?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const userUid = String(innerEl.querySelector("#bGrantUid")?.value || "").trim();
    const totalEntries = Number(innerEl.querySelector("#bGrantEntries")?.value || 0);

    if (!userUid) { setGrantErr("Podaj UID użytkownika."); return; }

    grantBtn.disabled = true;
    grantBtn.textContent = "Nadaję…";
    setGrantErr("");
    setGrantOk("");

    try {
      const data = await apiPostJson({ url: GRANT_KARNET_URL, idToken: ctx.idToken, body: { userUid, totalEntries } });
      setGrantOk(`Karnet nadany (ID: ${data.karnetId})`);
      grantForm.reset();
    } catch (e) {
      setGrantErr(e?.message || "Nie udało się nadać karnetu.");
    } finally {
      grantBtn.disabled = false;
      grantBtn.textContent = "Nadaj karnet";
    }
  });
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function createBasenModule({ id, type, label, defaultRoute, order, enabled, access }) {
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

      const actions = ctx?.session?.allowed_actions ?? [];
      const isAdmin = actions.includes("basen.admin");
      const canEnroll = actions.includes("basen.enroll");

      const requestedTab = String(routeId || "").trim();
      const validTabs = ["sessions", "karnet", ...(isAdmin ? ["admin"] : [])];
      const activeTab = validTabs.includes(requestedTab) ? requestedTab : "sessions";

      viewEl.innerHTML = `
        <div class="card wide">
          <div class="moduleHeader">
            <h2>${esc(label)}</h2>
            <div class="moduleNav">
              <button type="button" class="moduleNavBtn" data-mod-back title="Wróć">${NAV_BACK_SVG}</button>
              <button type="button" class="moduleNavBtn" data-mod-home title="Strona główna">${NAV_HOME_SVG}</button>
            </div>
          </div>
          ${renderTabsHtml(activeTab, isAdmin)}
          <div id="basenInner"></div>
        </div>
      `;

      const innerEl = viewEl.querySelector("#basenInner");

      viewEl.querySelector("[data-mod-home]")?.addEventListener("click", () => {
        window.location.hash = "#home/home";
      });
      viewEl.querySelector("[data-mod-back]")?.addEventListener("click", () => {
        if (activeTab !== "sessions") {
          window.location.hash = `#${id}/sessions`;
        } else {
          window.location.hash = "#home/home";
        }
      });

      viewEl.querySelector(".basenTabs")?.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-basen-tab]");
        if (!btn) return;
        const tab = btn.getAttribute("data-basen-tab");
        window.location.hash = `#${id}/${tab}`;
      });

      if (activeTab === "karnet") {
        await renderKarnetView(innerEl, ctx);
      } else if (activeTab === "admin" && isAdmin) {
        renderAdminView(innerEl, ctx);
      } else {
        await renderSessionsView(innerEl, ctx, canEnroll);
      }
    },
  };
}