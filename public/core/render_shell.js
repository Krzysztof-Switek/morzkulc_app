// public/core/render_shell.js
import { canSeeModule } from "/core/access_control.js";
import { setHash, parseHash } from "/core/router.js";
import { apiPostJson, apiGetJson } from "/core/api_client.js";

export function spinnerHtml(text = "Morzkulc myśli") {
  return `<div class="thinking">${escapeHtml(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

const REGISTER_URL = "/api/register";
const ADMIN_PENDING_URL = "/api/admin/pending";
const MY_RESERVATIONS_URL = "/api/gear/my-reservations";
const KAYAKS_URL = "/api/gear/kayaks";
const CANCEL_RESERVATION_URL = "/api/gear/reservations/cancel";
const GODZINKI_URL = "/api/godzinki";
const EVENTS_URL = "/api/events";
const BASEN_SESSIONS_URL = "/api/basen/sessions";

export function renderNav({ navEl, ctx }) {
  navEl.innerHTML = "";

  const homeBtn = document.createElement("button");
  homeBtn.textContent = "Start";
  homeBtn.addEventListener("click", () => setHash("home", "home"));
  navEl.appendChild(homeBtn);

  const modules = Array.isArray(ctx.modules) ? ctx.modules : [];
  const visible = modules.filter((m) => canSeeModule({ ctx, module: m }) && m.id !== "my_reservations");

  for (const m of visible) {
    const btn = document.createElement("button");
    btn.textContent = m.label;
    btn.addEventListener("click", () => setHash(m.id, m.defaultRoute || "home"));
    navEl.appendChild(btn);
  }
}

export async function renderView({ viewEl, ctx }) {
  // Zawsze resetuj overflow — modal mógł być otwarty gdy użytkownik zmienił widok
  document.body.style.overflow = "";

  const { moduleId, routeId } = parseHash();

  if (!ctx.session?.profileComplete) {
    renderProfileForm({ viewEl, ctx });
    return;
  }

  if (moduleId === "home") {
    if (routeId === "profile") {
      renderHomeProfile({ viewEl, ctx });
      return;
    }
    await renderHomeDashboard({ viewEl, ctx });
    return;
  }

  const modules = Array.isArray(ctx.modules) ? ctx.modules : [];
  const mod = modules.find((m) => m.id === moduleId);

  if (!mod) {
    viewEl.innerHTML = `<div class="card center"><h2>Nieznany moduł: ${escapeHtml(moduleId)}</h2></div>`;
    return;
  }

  if (!canSeeModule({ ctx, module: mod })) {
    viewEl.innerHTML = `<div class="card center"><h2>Brak dostępu do modułu: ${escapeHtml(mod.label)}</h2></div>`;
    return;
  }

  viewEl.innerHTML = spinnerHtml();

  try {
    await mod.render({ viewEl, routeId, ctx });
  } catch (e) {
    viewEl.innerHTML = `
      <div class="card center">
        <h2>Błąd modułu: ${escapeHtml(mod.id)}</h2>
        <pre class="codeBlock">${escapeHtml(String(e?.message || e))}</pre>
      </div>
    `;
  }
}

function getDashboardConfig(ctx) {
  const actions = ctx?.session?.allowed_actions ?? [];
  const roleKey = String(ctx?.session?.role_key || "");
  return {
    isAdmin:           actions.includes("admin.pending"),
    canReserveGear:    actions.includes("gear.reserve"),
    canEnrollBasen:    actions.includes("basen.enroll"),
    canSubmitGodzinki: actions.includes("godzinki.submit"),
    canSubmitEvents:   actions.includes("events.submit"),
    isKursant:         roleKey === "rola_kursant",
    isSympatyk:        roleKey === "rola_sympatyk",
    isKandydat:        roleKey === "rola_kandydat",
  };
}

async function renderHomeDashboard({ viewEl, ctx }) {
  const dash = getDashboardConfig(ctx);
  const helloName = getHelloName(ctx);
  const hoursValue = getHoursValue(ctx);
  const membershipPaidUntil = getMembershipPaidUntil(ctx);
  const today = new Date().toISOString().slice(0, 10);
  const isSkladkiOverdue = membershipPaidUntil ? membershipPaidUntil < today : false;

  // Basen tile: zawsze widoczny, disabled gdy moduł nieaktywny w setup
  const basenEnabledTile = (ctx.modules || []).find((m) =>
    m?.type === "basen"
  )?.enabled === true;

  const kmModuleRoute = getModuleRouteByType(ctx, "km");
  const hasKmModule = kmModuleRoute.moduleId !== "home";

  // Komunikat dla ról z ograniczonym dostępem
  const accessInfoMsg = dash.isSympatyk
    ? "Jako Sympatyk możesz przeglądać sprzęt i imprezy. Rezerwacja sprzętu i zapisy na basen dostępne dla Członków."
    : dash.isKandydat
      ? "Jako Kandydat możesz zgłaszać godzinki. Rezerwacja sprzętu i zapisy na basen dostępne po przyjęciu w poczet Członków."
      : "";

  // Render struktury natychmiast — rezerwacje ładujemy asynchronicznie
  viewEl.innerHTML = `
    <div class="dashboard dashboardStart">
      <section class="startTop">
        <div class="startHero">
          <h2>Cześć${helloName ? `, ${escapeHtml(helloName)}` : ""}</h2>

          <div class="startStatInline">
            <span class="startStatInlineItem">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span id="homeKmCell">— km</span>
            </span>
            <span class="startStatInlineItem">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
              <span id="homeRankingCell">— miejsce</span>
            </span>
            <span class="startStatInlineItem">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span id="homeHoursCell"><strong class="startStatVal">${escapeHtml(hoursValue || "…")}</strong></span>
            </span>
          </div>

          <div class="startTileGrid">
            <button type="button" class="startTile2${dash.canReserveGear ? " primary" : ""}" data-home-action="reserve-gear"
              title="${dash.canReserveGear ? "Rezerwuj sprzęt" : "Przeglądaj sprzęt"}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 C4 8 8 7 12 7 C16 7 20 8 22 12 C20 16 16 17 12 17 C8 17 4 16 2 12 Z"/><ellipse cx="12" cy="11" rx="3.5" ry="1.5"/></svg>
              <span class="startTile2Title">Sprzęt</span>
            </button>

            <button type="button" class="startTile2" data-home-action="add-hours">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="startTile2Title">Godzinki</span>
            </button>

            <button type="button" class="startTile2" data-home-action="add-event">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
              <span class="startTile2Title">Imprezy</span>
            </button>

            <button type="button" class="startTile2" data-home-action="basen"${basenEnabledTile ? "" : " disabled"}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
              <span class="startTile2Title">Basen</span>
            </button>

            ${hasKmModule ? `
            <button type="button" class="startTile2" data-home-action="km">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span class="startTile2Title">Ranking</span>
            </button>
            ` : ""}

            <button type="button" class="startTile2${isSkladkiOverdue ? " danger" : ""}" data-home-action="skladki">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span class="startTile2Title">Składki</span>
            </button>

            ${dash.isAdmin ? `
            <button type="button" class="startTile2" data-home-action="admin-pending" style="position:relative;">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span class="startTile2Title">Zarząd</span>
              <span class="tileNotifBadge hidden" id="adminPendingBadge"></span>
            </button>
            ` : ""}
          </div>
        </div>
      </section>

      ${dash.isKursant ? `
      <section class="dashCard startSection">
        <div class="dashCardHead"><h3>Witaj w SKK Morzkulc!</h3></div>
        <p class="muted" style="padding:0 16px 12px;">Jesteś kursantem — poniżej znajdziesz moduły dostępne dla Ciebie. Zapoznaj się z imprezami i aktywnościami klubu.</p>
      </section>
      ` : ""}

      ${accessInfoMsg ? `
      <section class="dashCard startSection">
        <div class="dashCardHead"><h3>Twój dostęp</h3></div>
        <p class="muted" style="padding:0 16px 12px;">${escapeHtml(accessInfoMsg)}</p>
      </section>
      ` : ""}

      ${dash.canReserveGear ? `
      <section class="dashCard startSection">
        <div class="dashCardHead">
          <h3>Moje rezerwacje</h3>
          <button type="button" class="ghost" data-home-action="all-reservations">Zobacz wszystkie</button>
        </div>

        <div class="startList" id="homeReservationsList">
          ${spinnerHtml("Ładowanie rezerwacji...")}
        </div>
      </section>
      ` : ""}

      <section class="dashCard startSection">
        <div class="dashCardHead">
          <h3>Najbliższe wydarzenia</h3>
          <button type="button" class="ghost" data-home-action="add-event">Dodaj wydarzenie +</button>
        </div>

        <div class="startList" id="homeEventsList">
          ${spinnerHtml("Ładowanie wydarzeń...")}
        </div>
      </section>

      <section class="dashCard startSection" id="homeBasenSection" style="display:none;">
        <div class="dashCardHead">
          <h3>Zajęcia basenowe</h3>
          <button type="button" class="ghost" data-home-action="basen">Zobacz wszystkie</button>
        </div>

        <div class="startList" id="homeBasenList">
          ${spinnerHtml("Ładowanie sesji...")}
        </div>
      </section>

    </div>
  `;

  viewEl.querySelectorAll("[data-home-action='all-reservations']").forEach((btn) => {
    btn.addEventListener("click", () => setHash("my_reservations", "list"));
  });

  const adminPendingBtn = viewEl.querySelector("[data-home-action='admin-pending']");
  if (adminPendingBtn) {
    const adminTarget = getModuleRouteByType(ctx, "admin_pending");
    adminPendingBtn.addEventListener("click", () => setHash(adminTarget.moduleId, "list"));
  }

  if (dash.isAdmin && ctx?.idToken) {
    loadAdminPendingBadge(ctx, viewEl).catch(() => {});
  }

  const reserveBtn = viewEl.querySelector("[data-home-action='reserve-gear']");
  if (reserveBtn) reserveBtn.addEventListener("click", () => {
    const gearTarget = getGearRoute(ctx);
    setHash(gearTarget.moduleId, gearTarget.routeId);
  });

  viewEl.querySelectorAll("[data-home-action='basen']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const basenTarget = getModuleRouteByType(ctx, "basen");
      setHash(basenTarget.moduleId, basenTarget.routeId);
    });
  });

  viewEl.querySelectorAll("[data-home-action='add-event']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventsTarget = getModuleRouteByType(ctx, "imprezy");
      if (eventsTarget.moduleId !== "home") {
        setHash(eventsTarget.moduleId, dash.canSubmitEvents ? "submit" : "list");
      }
    });
  });

  const addHoursBtn = viewEl.querySelector("[data-home-action='add-hours']");
  if (addHoursBtn) {
    addHoursBtn.addEventListener("click", () => {
      const godzinkiTarget = getModuleRouteByType(ctx, "godzinki");
      if (godzinkiTarget.moduleId !== "home") {
        setHash(godzinkiTarget.moduleId, dash.canSubmitGodzinki ? "submit" : "balance");
      }
    });
  }

  const kmBtn = viewEl.querySelector("[data-home-action='km']");
  if (kmBtn) kmBtn.addEventListener("click", () => setHash(kmModuleRoute.moduleId, kmModuleRoute.routeId));

  const skladkiBtn = viewEl.querySelector("[data-home-action='skladki']");
  if (skladkiBtn) skladkiBtn.addEventListener("click", () => setHash("home", "profile"));

  // Ładuj rezerwacje asynchronicznie — tylko dla ról z gear.reserve
  if (dash.canReserveGear) {
    buildHomeReservationsSection(ctx).then((html) => {
      const listEl = viewEl.querySelector("#homeReservationsList");
      if (!listEl) return;
      listEl.innerHTML = html;
      listEl.addEventListener("click", async (ev) => {
        const editBtn = ev.target.closest("[data-home-rsv-edit]");
        if (editBtn) {
          const rsvId = String(editBtn.getAttribute("data-home-rsv-edit") || "");
          if (rsvId) setHash("my_reservations", rsvId);
          return;
        }
        const cancelBtn = ev.target.closest("[data-home-rsv-cancel]");
        if (cancelBtn && !cancelBtn.disabled) {
          const rsvId = String(cancelBtn.getAttribute("data-home-rsv-cancel") || "");
          if (!rsvId) return;
          if (!window.confirm("Na pewno anulować tę rezerwację?")) return;
          cancelBtn.disabled = true;
          try {
            await apiPostJson({
              url: CANCEL_RESERVATION_URL,
              idToken: ctx.idToken,
              body: { reservationId: rsvId }
            });
            setHash("home", "home");
          } catch (e) {
            cancelBtn.disabled = false;
            window.alert("Nie udało się anulować: " + (e?.message || "Spróbuj ponownie."));
          }
        }
      });
    }).catch(() => {
      const listEl = viewEl.querySelector("#homeReservationsList");
      if (listEl) listEl.innerHTML = `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać rezerwacji.</div></div></div>`;
    });
  }

  // Ładuj saldo godzinek asynchronicznie
  if (ctx?.idToken) {
    buildHomeHoursCell(ctx).then((html) => {
      const cell = viewEl.querySelector("#homeHoursCell");
      if (cell) cell.innerHTML = html;
    }).catch(() => {
      // cicha porażka — komórka zostaje z placeholder "…"
    });
  }

  // Ładuj nadchodzące imprezy asynchronicznie
  buildHomeEventsSection(ctx).then((html) => {
    const listEl = viewEl.querySelector("#homeEventsList");
    if (listEl) listEl.innerHTML = html;
  }).catch(() => {
    const listEl = viewEl.querySelector("#homeEventsList");
    if (listEl) listEl.innerHTML = `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać imprez.</div></div></div>`;
  });

  // Ładuj zajęcia basenowe — sekcja widoczna tylko jeśli moduł "Basen" dostępny
  const basenModule = (ctx.modules || []).find((m) =>
    m?.type === "basen" && m.enabled
  );
  if (basenModule) {
    const basenSection = viewEl.querySelector("#homeBasenSection");
    if (basenSection) basenSection.style.display = "";

    buildHomeBasenSection(ctx).then((html) => {
      const listEl = viewEl.querySelector("#homeBasenList");
      if (listEl) listEl.innerHTML = html;
    }).catch(() => {
      const listEl = viewEl.querySelector("#homeBasenList");
      if (listEl) listEl.innerHTML = `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać sesji.</div></div></div>`;
    });
  }
}

function renderHomeProfile({ viewEl, ctx }) {
  const name = getHelloName(ctx);
  const email = String(ctx?.user?.email || "").trim();
  const roleLabel = roleKeyToLabel(String(ctx?.session?.role_key || ""), ctx?.setup?.roleMappings);
  const statusLabel = statusKeyToLabel(String(ctx?.session?.status_key || ""), ctx?.setup?.statusMappings);
  const hoursValue = getHoursValue(ctx);

  viewEl.innerHTML = `
    <div class="card center">
      <h2>${name ? escapeHtml(name) : "Profil"}</h2>
      ${email ? `<p class="muted" style="margin-bottom:12px;">${escapeHtml(email)}</p>` : ""}

      <div class="startStatBar" style="margin-bottom:14px;">
        <div class="startStatChip">
          <span class="startStatChipKey">Rola</span>
          <span class="startStatChipVal">${escapeHtml(roleLabel)}</span>
        </div>
        <div class="startStatChip">
          <span class="startStatChipKey">Status</span>
          <span class="startStatChipVal">${escapeHtml(statusLabel)}</span>
        </div>
      </div>

      <div class="startStatInline" style="margin-bottom:16px;">
        <span class="startStatInlineItem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>— km</span>
        </span>
        <span class="startStatInlineItem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
          <span>— miejsce</span>
        </span>
        <span class="startStatInlineItem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${escapeHtml(hoursValue || "— h")}</span>
        </span>
      </div>

      <p class="muted">Więcej opcji dostępnych wkrótce.</p>
      <div class="actions">
        <button type="button" class="ghost" id="profileBackBtn">← Wróć</button>
      </div>
    </div>
  `;

  const backBtn = viewEl.querySelector("#profileBackBtn");
  if (backBtn) backBtn.addEventListener("click", () => setHash("home", "home"));
}

const _ADMIN_BADGE_CACHE_KEY = "adminPendingGodzinkiCount";
const _ADMIN_BADGE_CACHE_TTL = 5 * 60 * 1000;

async function loadAdminPendingBadge(ctx, viewEl) {
  const updateBadge = (count) => {
    const badge = viewEl.querySelector("#adminPendingBadge");
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  };

  try {
    const cached = JSON.parse(sessionStorage.getItem(_ADMIN_BADGE_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < _ADMIN_BADGE_CACHE_TTL) {
      updateBadge(cached.count);
      return;
    }
  } catch { /* ignore */ }

  try {
    const data = await apiGetJson({ url: ADMIN_PENDING_URL, idToken: ctx.idToken });
    const count = Number(data?.godzinki?.count ?? 0);
    sessionStorage.setItem(_ADMIN_BADGE_CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
    updateBadge(count);
  } catch { /* cicha porażka */ }
}

async function buildHomeHoursCell(ctx) {
  if (!ctx?.idToken) return `<strong class="startStatVal">—</strong>`;

  try {
    const data = await apiGetJson({ url: GODZINKI_URL + "?view=home", idToken: ctx.idToken });
    const balance = Number(data?.balance ?? 0);
    const sign = balance > 0 ? "+" : "";
    const cls = balance < 0 ? "startStatValNeg" : "";

    return `<strong class="startStatVal ${escapeHtml(cls)}">${escapeHtml(sign + balance)} h</strong>`;
  } catch {
    return `<strong class="startStatVal">—</strong>`;
  }
}

async function buildHomeEventsSection(ctx) {
  if (!ctx?.idToken) {
    return `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Brak sesji.</div></div></div>`;
  }

  try {
    const data = await apiGetJson({ url: EVENTS_URL, idToken: ctx.idToken });
    const events = Array.isArray(data?.events) ? data.events : [];
    const upcoming = events.slice(0, 3);

    if (!upcoming.length) {
      return `
        <div class="startListItem">
          <div class="startListMain">
            <div class="startListTitle">Brak nadchodzących imprez</div>
          </div>
        </div>
      `;
    }

    return upcoming.map((ev) => {
      const start = formatDatePL(String(ev?.startDate || ""));
      const end = formatDatePL(String(ev?.endDate || ""));
      const dateRange = ev.startDate === ev.endDate ? start : `${start} – ${end}`;
      return `
        <div class="startListItem">
          <div class="startListMain">
            <div class="startListTitle">${escapeHtml(String(ev?.name || "Impreza"))}</div>
            <div class="startListMeta">${escapeHtml(String(ev?.location || ""))}${ev?.location ? " · " : ""}${escapeHtml(dateRange)}</div>
          </div>
        </div>
      `;
    }).join("");
  } catch {
    return `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać imprez.</div></div></div>`;
  }
}

async function buildHomeBasenSection(ctx) {
  if (!ctx?.idToken) {
    return `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Brak sesji.</div></div></div>`;
  }

  try {
    const data = await apiGetJson({ url: BASEN_SESSIONS_URL, idToken: ctx.idToken });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const upcoming = sessions.slice(0, 3);

    if (!upcoming.length) {
      return `
        <div class="startListItem">
          <div class="startListMain">
            <div class="startListTitle">Brak nadchodzących zajęć</div>
          </div>
        </div>
      `;
    }

    return upcoming.map((s) => {
      const days = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];
      const d = new Date(`${s.date}T12:00:00`);
      const dayName = days[d.getDay()] || "";
      const m = String(s.date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dateStr = m ? `${m[3]}.${m[2]} (${dayName})` : String(s.date || "");
      const spotsLeft = s.capacity - s.enrolledCount;
      const spotsLabel = s.userEnrolled
        ? "Zapisany/a"
        : spotsLeft > 0 ? `${spotsLeft} miejsc` : "Brak miejsc";

      return `
        <div class="startListItem">
          <div class="startListMain">
            <div class="startListTitle">${escapeHtml(dateStr)} ${escapeHtml(s.timeStart || "")}–${escapeHtml(s.timeEnd || "")}</div>
            <div class="startListMeta">${escapeHtml(spotsLabel)}${s.instructorName ? " · " + escapeHtml(String(s.instructorName)) : ""}</div>
          </div>
        </div>
      `;
    }).join("");
  } catch {
    return `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać zajęć.</div></div></div>`;
  }
}

async function buildHomeReservationsSection(ctx) {
  if (!ctx?.idToken) {
    return `
      <div class="startListItem">
        <div class="startListMain">
          <div class="startListTitle">Moje rezerwacje</div>
          <div class="startListMeta">Brak tokenu sesji.</div>
        </div>
        <div class="startListSide">—</div>
      </div>
    `;
  }

  try {
    const [reservationsResp, kayaksResp] = await Promise.all([
      apiGetJson({
        url: MY_RESERVATIONS_URL,
        idToken: ctx.idToken
      }),
      apiGetJson({
        url: KAYAKS_URL,
        idToken: ctx.idToken
      })
    ]);

    const reservations = Array.isArray(reservationsResp?.items) ? reservationsResp.items : [];
    const kayaks = Array.isArray(kayaksResp?.kayaks) ? kayaksResp.kayaks : [];

    const kayakMap = new Map(
      kayaks.map((k) => [String(k?.id || ""), buildKayakTitle(k)])
    );

    const todayIso = new Date().toISOString().slice(0, 10);
    const activeReservations = reservations
      .filter((r) => String(r?.status || "") === "active" && String(r?.endDate || "") >= todayIso)
      .slice(0, 3);

    if (!activeReservations.length) {
      return `
        <div class="startListItem">
          <div class="startListMain">
            <div class="startListTitle">Brak aktywnych rezerwacji</div>
            <div class="startListMeta">Kiedy zarezerwujesz sprzęt, pojawi się tutaj.</div>
          </div>
          <div class="startListSide">—</div>
        </div>
      `;
    }

    return activeReservations
      .map((rsv) => {
        const kayakTitles = getReservationKayakTitles(rsv, kayakMap);
        const mainTitle = kayakTitles.join(", ") || "Rezerwacja";
        const rsvId = escapeHtml(String(rsv?.id || ""));
        const blockStart = String(rsv?.blockStartIso || "");
        const blockEnd = String(rsv?.blockEndIso || "");
        const canCancel = blockStart && todayIso < blockStart;
        const startDate = String(rsv?.startDate || "");
        const endDate = String(rsv?.endDate || "");
        const days = countReservationDays(startDate, endDate);
        const dateLabel = `${formatDayMonth(blockStart || startDate)} – ${formatDayMonth(blockEnd || endDate)} (${pluralizeDays(days)})`;

        return `
          <div class="startListItem">
            <div class="startListMain">
              <div class="startListTitle">${escapeHtml(mainTitle)}</div>
              <div class="startListMeta">${escapeHtml(dateLabel)}</div>
            </div>
            <div class="startListSide" style="display:flex;gap:4px;align-items:center;">
              <button type="button" class="ghost" style="padding:4px 6px;line-height:1;" title="Edytuj" data-home-rsv-edit="${rsvId}" aria-label="Edytuj rezerwację">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="ghost" style="padding:4px 6px;line-height:1;" title="Anuluj rezerwację" data-home-rsv-cancel="${rsvId}" aria-label="Anuluj rezerwację"${canCancel ? "" : " disabled"}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (_e) {
    return `
      <div class="startListItem">
        <div class="startListMain">
          <div class="startListTitle">Moje rezerwacje</div>
          <div class="startListMeta">Nie udało się pobrać danych.</div>
        </div>
        <div class="startListSide">błąd</div>
      </div>
    `;
  }
}

function getReservationKayakTitles(rsv, kayakMap) {
  const kayakIds = Array.isArray(rsv?.kayakIds) ? rsv.kayakIds.map(String) : [];
  return kayakIds.map((id) => kayakMap.get(id) || `Kajak ID ${id}`);
}

function buildKayakTitle(k) {
  const brand = String(k?.brand || "").trim();
  const model = String(k?.model || "").trim();
  const number = String(k?.number || "").trim();

  const core = [brand, model].filter(Boolean).join(" ").trim() || "Kajak";
  return number ? `${core} (nr ${number})` : core;
}

function renderProfileForm({ viewEl, ctx }) {
  viewEl.innerHTML = `
    <h2>Uzupełnij dane (jednorazowo)</h2>

    <div class="card center">
      <div class="row">
        <label for="firstName">Imię</label>
        <input id="firstName" autocomplete="given-name" />
      </div>

      <div class="row">
        <label for="lastName">Nazwisko</label>
        <input id="lastName" autocomplete="family-name" />
      </div>

      <div class="row">
        <label for="nickname">Ksywa</label>
        <input id="nickname" autocomplete="nickname" />
      </div>

      <div class="row">
        <label for="phone">Telefon</label>
        <input id="phone" autocomplete="tel" />
        <div class="hint">Min. 9 cyfr (np. +48 600 700 800)</div>
      </div>

      <div class="row">
        <label for="dateOfBirth">Data urodzenia</label>
        <input id="dateOfBirth" type="date" />
      </div>

      <div class="checkRow">
        <input id="consentRodo" type="checkbox" />
        <label for="consentRodo">Zapoznałem(-am) się z RODO i akceptuję.</label>
      </div>

      <div class="checkRow">
        <input id="consentStatute" type="checkbox" />
        <label for="consentStatute">Akceptuję statut i regulaminy.</label>
      </div>

      <div class="actions">
        <button id="saveProfileBtn" class="primary">Zapisz</button>
        <span class="hint">Zapisze dane w Firestore i dopiero wtedy wczyta moduły.</span>
      </div>

      <div id="profileErr" class="err hidden"></div>
    </div>
  `;

  const errEl = document.getElementById("profileErr");
  const btn = document.getElementById("saveProfileBtn");

  const setErr = (msg) => {
    errEl.textContent = String(msg || "");
    errEl.classList.toggle("hidden", !errEl.textContent);
  };

  btn.addEventListener("click", async () => {
    setErr("");

    const fn = String(document.getElementById("firstName").value || "").trim();
    const ln = String(document.getElementById("lastName").value || "").trim();
    const nn = String(document.getElementById("nickname").value || "").trim();
    const ph = String(document.getElementById("phone").value || "").trim();
    const dob = String(document.getElementById("dateOfBirth").value || "").trim();
    const consentRodo = document.getElementById("consentRodo").checked === true;
    const consentStatute = document.getElementById("consentStatute").checked === true;

    if (!fn || !ln || !ph || !dob) {
      setErr("Uzupełnij: imię, nazwisko, telefon i datę urodzenia.");
      return;
    }
    if (!isPhoneValid(ph)) {
      setErr("Telefon ma nieprawidłowy format (min. 9 cyfr).");
      return;
    }
    if (!isIsoDateYYYYMMDD(dob)) {
      setErr("Data urodzenia ma nieprawidłowy format.");
      return;
    }
    if (!consentRodo || !consentStatute) {
      setErr("Musisz zaakceptować RODO oraz statut/regulaminy.");
      return;
    }

    if (!ctx.idToken) {
      setErr("Brak tokenu sesji (odśwież stronę).");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Zapisuję...";

    try {
      const session = await apiPostJson({
        url: REGISTER_URL,
        idToken: ctx.idToken,
        body: {
          firstName: fn,
          lastName: ln,
          nickname: nn,
          phone: ph,
          dateOfBirth: dob,
          consentRodo,
          consentStatute
        }
      });

      ctx.session = session;
      location.reload();
    } catch (e) {
      const msg = String(e?.message || e);
      const json = tryParseJsonFromHttpError(msg);

      if (json?.code === "validation_failed" && json?.fields) {
        const lines = Object.entries(json.fields).map(([k, v]) => fieldErrorToPl(k, v));
        setErr("Błąd walidacji: " + lines.join("; "));
      } else {
        setErr("Błąd zapisu: " + msg);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Zapisz";
    }
  });
}

function getGearRoute(ctx) {
  return getModuleRouteByType(ctx, "gear");
}

function getModuleRouteByType(ctx, moduleType) {
  const modules = Array.isArray(ctx?.modules) ? ctx.modules : [];
  const found = modules.find((m) => m?.type === moduleType) || null;

  if (!found) {
    return { moduleId: "home", routeId: "home" };
  }

  return {
    moduleId: String(found.id || "home"),
    routeId: String(found.defaultRoute || "home")
  };
}

function getModuleRouteByLabelOrId(ctx, names) {
  const modules = Array.isArray(ctx?.modules) ? ctx.modules : [];
  const normalized = Array.isArray(names) ? names.map((x) => String(x || "").trim().toLowerCase()) : [];

  const found = modules.find((m) => {
    const id = String(m?.id || "").trim().toLowerCase();
    const label = String(m?.label || "").trim().toLowerCase();
    return normalized.includes(id) || normalized.includes(label);
  }) || null;

  if (!found) {
    return { moduleId: "home", routeId: "home" };
  }

  return {
    moduleId: String(found.id || "home"),
    routeId: String(found.defaultRoute || "home")
  };
}

function getHelloName(ctx) {
  const sessionNickname = String(ctx?.session?.nickname || "").trim();
  if (sessionNickname) return sessionNickname;

  const sessionFirstName = String(ctx?.session?.firstName || ctx?.session?.first_name || "").trim();
  if (sessionFirstName) return sessionFirstName;

  const userDisplayName = String(ctx?.user?.displayName || "").trim();
  if (userDisplayName) return userDisplayName;

  return "";
}

function getHoursValue(ctx) {
  const candidates = [
    ctx?.session?.hours_balance,
    ctx?.session?.hoursBalance,
    ctx?.session?.godzinki_balance,
    ctx?.session?.godzinkiBalance
  ];

  for (const value of candidates) {
    if (value === 0 || value === "0") return "0 h";
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return `${String(value).trim()} h`;
    }
  }

  return "";
}

function getMembershipPaidUntil(ctx) {
  const candidates = [
    ctx?.session?.membership_paid_until,
    ctx?.session?.membershipPaidUntil,
    ctx?.session?.skladka_paid_until,
    ctx?.session?.skladkaPaidUntil
  ];

  for (const value of candidates) {
    const s = String(value || "").trim();
    if (s) return s;
  }

  return "";
}

function roleKeyToLabel(roleKey, roleMappings) {
  const k = String(roleKey || "").trim();
  if (!k) return "-";
  const fromSetup = roleMappings?.[k]?.label;
  if (fromSetup) return String(fromSetup);
  // fallback — klucze techniczne istniejące przed wprowadzeniem setup.roleMappings
  if (k === "rola_zarzad") return "Zarząd";
  if (k === "rola_kr") return "KR";
  if (k === "rola_czlonek") return "Członek";
  if (k === "rola_kandydat") return "Kandydat";
  if (k === "rola_sympatyk") return "Sympatyk";
  if (k === "rola_kursant") return "Kursant";
  return k;
}

function statusKeyToLabel(statusKey, statusMappings) {
  const k = String(statusKey || "").trim();
  if (!k) return "-";
  const fromSetup = statusMappings?.[k]?.label;
  if (fromSetup) return String(fromSetup);
  // fallback — klucze techniczne istniejące przed wprowadzeniem setup.statusMappings
  if (k === "status_aktywny") return "Aktywny";
  if (k === "status_zawieszony") return "Zawieszony";
  if (k === "status_skreslony") return "Skreślony";
  return k;
}

function normalizePhoneDigits(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  const keepPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return keepPlus ? (`+${digits}`) : digits;
}

function isPhoneValid(v) {
  const n = normalizePhoneDigits(v);
  const digitsCount = n.replace(/[^\d]/g, "").length;
  return digitsCount >= 9 && digitsCount <= 15;
}

function isIsoDateYYYYMMDD(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

function tryParseJsonFromHttpError(msg) {
  const idx = msg.indexOf(":");
  if (idx < 0) return null;
  const tail = msg.slice(idx + 1).trim();
  try {
    return JSON.parse(tail);
  } catch {
    return null;
  }
}

function fieldErrorToPl(field, code) {
  const dict = {
    firstName: "Imię",
    lastName: "Nazwisko",
    nickname: "Ksywa",
    phone: "Telefon",
    dateOfBirth: "Data urodzenia",
    consentRodo: "RODO",
    consentStatute: "Statut i regulaminy"
  };
  const label = dict[field] || field;

  if (code === "required") return `${label}: wymagane`;
  if (code === "invalid_format") return `${label}: nieprawidłowy format`;
  if (code === "cannot_be_future") return `${label}: nie może być w przyszłości`;
  if (code === "must_be_true") return `${label}: musisz zaakceptować`;
  return `${label}: błąd (${code})`;
}

function formatDayMonth(iso) {
  const months = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || "—";
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1] || m[2]}`;
}

function countReservationDays(startDate, endDate) {
  try {
    const diff = Math.round((new Date(endDate + "T12:00:00") - new Date(startDate + "T12:00:00")) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

function pluralizeDays(n) {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

function formatDatePL(iso) {
  const s = String(iso || "").trim();
  if (!s) return "-";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
