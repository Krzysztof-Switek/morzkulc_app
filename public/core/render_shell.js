// public/core/render_shell.js
import { canSeeModule } from "/core/access_control.js";
import { setHash, parseHash } from "/core/router.js";
import { apiPostJson, apiGetJson } from "/core/api_client.js";

export function spinnerHtml(text = "Morzkulc myśli") {
  return `<div class="thinking">${escapeHtml(text)}<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>`;
}

const REGISTER_URL = "/api/register";
const MY_RESERVATIONS_URL = "/api/gear/my-reservations";
const KAYAKS_URL = "/api/gear/kayaks";
const GODZINKI_URL = "/api/godzinki";
const EVENTS_URL = "/api/events";

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
  const { moduleId, routeId } = parseHash();

  if (!ctx.session?.profileComplete) {
    renderProfileForm({ viewEl, ctx });
    return;
  }

  if (moduleId === "home") {
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

async function renderHomeDashboard({ viewEl, ctx }) {
  const helloName = getHelloName(ctx);
  const roleLabel = roleKeyToLabel(String(ctx.session?.role_key || ""));
  const statusLabel = statusKeyToLabel(String(ctx.session?.status_key || ""));
  const hoursValue = getHoursValue(ctx);
  const membershipPaidUntil = getMembershipPaidUntil(ctx);

  // Render struktury natychmiast — rezerwacje ładujemy asynchronicznie
  viewEl.innerHTML = `
    <div class="dashboard dashboardStart">
      <section class="startTop">
        <div class="startHero">
          <h2>Cześć${helloName ? `, ${escapeHtml(helloName)}` : ""}</h2>

          <div class="startStats">
            <div class="startStatRow">
              <span class="startStatKey">Rola:</span>
              <strong class="startStatVal">${escapeHtml(roleLabel)}</strong>
            </div>

            <div class="startStatRow">
              <span class="startStatKey">Status:</span>
              <strong class="startStatVal">${escapeHtml(statusLabel)}</strong>
            </div>

            <div class="startStatRow">
              <span class="startStatKey">Godzinki:</span>
              <span id="homeHoursCell">
                <strong class="startStatVal">${escapeHtml(hoursValue || "…")}</strong>
              </span>
            </div>

            <div class="startStatRow">
              <span class="startStatKey">Składka:</span>
              <strong class="startStatVal">${escapeHtml(membershipPaidUntil ? formatDatePL(membershipPaidUntil) : "Dostępne wkrótce")}</strong>
            </div>
          </div>
        </div>

        <div class="startTopActions">
          <button type="button" class="startTile primary" data-home-action="reserve-gear">
            <span class="startTileTitle">Rezerwuj sprzęt</span>
          </button>

          <button type="button" class="startTile" data-home-action="add-hours">
            <span class="startTileTitle">Dodaj godzinki</span>
          </button>

          <button type="button" class="startTile" data-home-action="report-repair">
            <span class="startTileTitle">Zgłoś naprawę</span>
            <span class="startTileMeta">Dostępne wkrótce</span>
          </button>

          <button type="button" class="startTile" data-home-action="add-event">
            <span class="startTileTitle">Dodaj imprezę</span>
          </button>
        </div>
      </section>

      <section class="dashCard startSection">
        <div class="dashCardHead">
          <h3>Moje rezerwacje</h3>
          <button type="button" class="ghost" data-home-action="my-reservations">Zobacz wszystkie</button>
        </div>

        <div class="startList" id="homeReservationsList">
          ${spinnerHtml("Ładowanie rezerwacji...")}
        </div>
      </section>

      <section class="dashCard startSection">
        <div class="dashCardHead">
          <h3>Najbliższe imprezy</h3>
          <button type="button" class="ghost" data-home-action="events">Zobacz wszystkie</button>
        </div>

        <div class="startList" id="homeEventsList">
          ${spinnerHtml("Ładowanie imprez...")}
        </div>
      </section>

    </div>
  `;

  const reserveBtn = viewEl.querySelector("[data-home-action='reserve-gear']");
  const myReservationsBtn = viewEl.querySelector("[data-home-action='my-reservations']");
  const eventsBtn = viewEl.querySelector("[data-home-action='events']");

  const openGear = () => {
    const gearTarget = getGearRoute(ctx);
    setHash(gearTarget.moduleId, gearTarget.routeId);
  };

  if (reserveBtn) reserveBtn.addEventListener("click", openGear);

  if (myReservationsBtn) {
    myReservationsBtn.addEventListener("click", () => setHash("my_reservations", "list"));
  }

  if (eventsBtn) {
    eventsBtn.addEventListener("click", () => {
      const eventsTarget = getModuleRouteByLabelOrId(ctx, ["imprezy", "modul_4"]);
      setHash(eventsTarget.moduleId, eventsTarget.routeId);
    });
  }

  const addEventBtn = viewEl.querySelector("[data-home-action='add-event']");
  if (addEventBtn) {
    addEventBtn.addEventListener("click", () => {
      const eventsTarget = getModuleRouteByLabelOrId(ctx, ["imprezy", "modul_4"]);
      if (eventsTarget.moduleId !== "home") {
        setHash(eventsTarget.moduleId, "submit");
      } else {
        setHash("modul_4", "submit");
      }
    });
  }

  const addHoursBtn = viewEl.querySelector("[data-home-action='add-hours']");
  if (addHoursBtn) {
    addHoursBtn.addEventListener("click", () => {
      const godzinkiTarget = getModuleRouteByLabelOrId(ctx, ["godzinki", "modul_3"]);
      if (godzinkiTarget.moduleId !== "home") {
        setHash(godzinkiTarget.moduleId, "submit");
      } else {
        setHash("modul_3", "submit");
      }
    });
  }

  // Ładuj rezerwacje asynchronicznie po wyrenderowaniu dashboardu
  buildHomeReservationsSection(ctx).then((html) => {
    const listEl = viewEl.querySelector("#homeReservationsList");
    if (listEl) listEl.innerHTML = html;
  }).catch(() => {
    const listEl = viewEl.querySelector("#homeReservationsList");
    if (listEl) listEl.innerHTML = `<div class="startListItem"><div class="startListMain"><div class="startListTitle">Nie udało się pobrać rezerwacji.</div></div></div>`;
  });

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
}

async function buildHomeHoursCell(ctx) {
  if (!ctx?.idToken) return `<strong class="startStatVal">—</strong>`;

  try {
    const data = await apiGetJson({ url: GODZINKI_URL + "?view=home", idToken: ctx.idToken });
    const balance = Number(data?.balance ?? 0);
    const nextExpiry = data?.nextExpiryMonthYear || null;
    const sign = balance > 0 ? "+" : "";
    const cls = balance < 0 ? "startStatValNeg" : "";

    return `
      <strong class="startStatVal ${escapeHtml(cls)}">${escapeHtml(sign + balance)} h</strong>
      ${nextExpiry ? `<span class="startStatExpiry">wygasa ${escapeHtml(nextExpiry)}</span>` : ""}
    `;
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

    const activeReservations = reservations
      .filter((r) => String(r?.status || "") === "active")
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

        return `
          <div class="startListItem">
            <div class="startListMain">
              <div class="startListTitle">${escapeHtml(mainTitle)}</div>
              <div class="startListMeta">
                ${escapeHtml(formatDatePL(String(rsv?.startDate || "")))} → ${escapeHtml(formatDatePL(String(rsv?.endDate || "")))}
              </div>
            </div>
            <div class="startListSide">aktywna</div>
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
  return getModuleRouteByLabelOrId(ctx, ["sprzęt", "modul_2"]);
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

function roleKeyToLabel(roleKey) {
  const k = String(roleKey || "").trim();
  if (k === "rola_zarzad") return "Zarząd";
  if (k === "rola_kr") return "KR";
  if (k === "rola_czlonek") return "Członek";
  if (k === "rola_kandydat") return "Kandydat";
  if (k === "rola_sympatyk") return "Sympatyk";
  if (k === "rola_kursant") return "Kursant";
  return k || "-";
}

function statusKeyToLabel(statusKey) {
  const k = String(statusKey || "").trim();
  if (k === "status_aktywny") return "Aktywny";
  if (k === "status_zawieszony") return "Zawieszony";
  if (k === "status_skreslony") return "Skreślony";
  return k || "-";
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
