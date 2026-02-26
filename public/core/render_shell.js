// public/core/render_shell.js
import { canSeeModule } from "/core/access_control.js";
import { setHash, parseHash } from "/core/router.js";
import { apiPostJson } from "/core/api_client.js";

const REGISTER_URL = "/api/register";

export function renderNav({ navEl, ctx }) {
  navEl.innerHTML = "";

  const homeBtn = document.createElement("button");
  homeBtn.textContent = "Start";
  homeBtn.addEventListener("click", () => setHash("home", "home"));
  navEl.appendChild(homeBtn);

  const modules = Array.isArray(ctx.modules) ? ctx.modules : [];
  const visible = modules.filter((m) => canSeeModule({ ctx, module: m }));

  for (const m of visible) {
    const btn = document.createElement("button");
    btn.textContent = m.label;
    btn.addEventListener("click", () => setHash(m.id, m.defaultRoute || "home"));
    navEl.appendChild(btn);
  }
}

export async function renderView({ viewEl, ctx }) {
  const { moduleId, routeId } = parseHash();

  // ✅ Jeśli profil niekompletny → zawsze pokaż formularz (jednorazowo)
  if (!ctx.session?.profileComplete) {
    renderProfileForm({ viewEl, ctx });
    return;
  }

  if (moduleId === "home") {
    const userDisplayName = String(ctx.user?.displayName || "").trim();

    const roleKey = String(ctx.session?.role_key || "");
    const statusKey = String(ctx.session?.status_key || "");

    const roleLabel = roleKeyToLabel(roleKey);
    const statusLabel = statusKeyToLabel(statusKey);

    // 🔴 MOCK – do zastąpienia realnym backendem (Firestore/Cloud Functions)
    // TODO: replace with real volunteer hours (Godzinki)
    const mockHours = 12;

    // TODO: replace with real membership payment data (Składki)
    const mockMembershipPaidUntil = "2026-12-31"; // YYYY-MM-DD

    // TODO: replace with real events feed (Imprezy)
    const mockUpcomingEvents = [
      { id: "e1", title: "Spływ Redą", date: "2026-03-14", description: "Opis wkrótce." },
      { id: "e2", title: "Trening techniczny", date: "2026-03-21", description: "Opis wkrótce." },
      { id: "e3", title: "Kajak Jamboree – spotkanie organizacyjne", date: "2026-03-28", description: "Opis wkrótce." }
    ];
    // 🔴 END MOCK

    const eventsToShow = mockUpcomingEvents.slice(0, 3);

    viewEl.innerHTML = `
      <div class="dashboard">
        <div class="dashboardHeader">
          <div class="dashboardTitle">
            <h2>Witaj ${escapeHtml(userDisplayName || "w aplikacji")}</h2>
            <div class="dashboardMeta">
              <span class="dashMetaLine">Rola w systemie: <strong>${escapeHtml(roleLabel)}</strong></span>
              <span class="dashMetaLine">Status konta: <strong>${escapeHtml(statusLabel)}</strong></span>
            </div>
          </div>
        </div>

        <div class="dashboardGrid">
          <div class="dashCard">
            <div class="dashCardHead">
              <h3>Godzinki</h3>
            </div>
            <div class="dashValue">${escapeHtml(String(mockHours))} h</div>
            <div class="dashSub">Stan aktualny</div>
          </div>

          <div class="dashCard">
            <div class="dashCardHead">
              <h3>Składka</h3>
            </div>
            <div class="dashValue">${escapeHtml(formatDatePL(mockMembershipPaidUntil))}</div>
            <div class="dashSub">Opłacone do</div>
          </div>

          <div class="dashCard wide">
            <div class="dashCardHead">
              <h3>Nadchodzące wydarzenia</h3>
            </div>

            ${
              eventsToShow.length
                ? `
                  <ul class="eventsList">
                    ${eventsToShow
                      .map(
                        (e) => `
                          <li class="eventItem">
                            <div class="eventMain">
                              <div class="eventDate">${escapeHtml(formatDatePL(e.date))}</div>
                              <div class="eventTitle">${escapeHtml(String(e.title || ""))}</div>
                            </div>
                            <button class="eventBtn" type="button" data-event-id="${escapeHtml(String(e.id))}">
                              Szczegóły
                            </button>
                          </li>
                        `
                      )
                      .join("")}
                  </ul>
                `
                : `<div class="dashEmpty">Brak nadchodzących wydarzeń.</div>`
            }
          </div>
        </div>
      </div>
    `;

    // 🔴 MOCK – klik „Szczegóły” pokazuje alert; do zastąpienia realnym widokiem wydarzenia
    for (const btn of [...viewEl.querySelectorAll(".eventBtn")]) {
      btn.addEventListener("click", () => {
        const id = String(btn.getAttribute("data-event-id") || "");
        const ev = mockUpcomingEvents.find((x) => String(x.id) === id);
        if (!ev) return;
        alert(`${formatDatePL(ev.date)}\n${ev.title}\n\n${ev.description || ""}`);
      });
    }
    // 🔴 END MOCK

    return;
  }

  const modules = Array.isArray(ctx.modules) ? ctx.modules : [];
  const mod = modules.find((m) => m.id === moduleId);

  if (!mod) {
    viewEl.innerHTML = `<div class="card center"><h2>Nieznany moduł: ${escapeHtml(moduleId)}</h2></div>`;
    return;
  }

  // gating w view też (na wypadek ręcznego wpisania hash)
  if (!canSeeModule({ ctx, module: mod })) {
    viewEl.innerHTML = `<div class="card center"><h2>Brak dostępu do modułu: ${escapeHtml(mod.label)}</h2></div>`;
    return;
  }

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

    // UI walidacja (backend i tak wymusi)
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

      // najprościej: reload całej appki (ponownie pobierze setup/moduły)
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
  if (k === "status_pending") return "Pending";
  return k || "-";
}

function normalizePhoneDigits(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  const keepPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return keepPlus ? ("+" + digits) : digits;
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
  // expected format: "HTTP 400: {json...}"
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
