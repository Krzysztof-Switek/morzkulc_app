// public/modules/basen_module.js
import { apiGetJson, apiPostJson } from "/core/api_client.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

const SESSIONS_URL = "/api/basen/sessions";
const ENROLL_URL = "/api/basen/enroll";
const CANCEL_ENROLL_URL = "/api/basen/cancel-enrollment";
const CREATE_SESSION_URL = "/api/basen/sessions/create";
const CANCEL_SESSION_URL = "/api/basen/sessions/cancel";
const SET_KAYAK_URL = "/api/basen/kayak";
const KAYAKS_URL = "/api/basen/kayaks";
const ATTENDEES_URL = "/api/basen/attendees";

const SLOT_ORDER = ["H1", "H2", "SAUNA"];
const SLOT_LABELS = { H1: "I godzina", H2: "II godzina", SAUNA: "Sauna" };

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

function kayakLabel(kayakId) {
  if (!kayakId) return "Brak";
  if (kayakId === "PRIVATE") return "Kajak prywatny";
  return `Kajak (nr ${esc(kayakId)})`;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function renderTabsHtml(activeTab, isAdmin) {
  if (!isAdmin) return ""; // brak zakładek dla zwykłych userów — lista terminów jest jedyną zawartością

  const tabs = [
    { id: "calendar", label: "Dodaj basen" },
    { id: "payments", label: "Płatności" },
  ];

  return `<div class="modTabs basenTabs">
    ${tabs.map((t) => `
      <button type="button"
        class="modTab basenTab${t.id === activeTab ? " active" : ""}"
        data-basen-tab="${esc(t.id)}"
      >${esc(t.label)}</button>
    `).join("")}
  </div>`;
}

// ─── Attendees panel (lazy loaded) ────────────────────────────────────────────

function renderAttendeesBody(data) {
  const instructors = Array.isArray(data?.instructors) ? data.instructors : [];
  const paired = Array.isArray(data?.paired) ? data.paired : [];
  const regular = Array.isArray(data?.regular) ? data.regular : [];

  if (!instructors.length && !paired.length && !regular.length) {
    return `<div class="basenHint">Brak zapisanych osób.</div>`;
  }

  let html = "";

  if (instructors.length) {
    html += `<div class="basenAttendeesGroup">
      <div class="basenAttendeesGroupTitle">Instruktorzy dostępni</div>
      ${instructors.map((i) => `<div class="basenAttendeeRow">${esc(i.userDisplayName)}</div>`).join("")}
    </div>`;
  }

  if (paired.length) {
    html += `<div class="basenAttendeesGroup">
      <div class="basenAttendeesGroupTitle">Zapisy z instruktorem</div>
      ${paired.map((p) => `
        <div class="basenAttendeePair">
          <div class="basenAttendeePairInstructor">${esc(p.instructor?.userDisplayName || "Instruktor")}</div>
          ${p.participants.map((a) => `<div class="basenAttendeeRow basenAttendeeRowSub">${esc(a.userDisplayName)}${a.kayakId ? ` · ${esc(kayakLabel(a.kayakId))}` : ""}</div>`).join("")}
        </div>
      `).join("")}
    </div>`;
  }

  if (regular.length) {
    html += `<div class="basenAttendeesGroup">
      <div class="basenAttendeesGroupTitle">Uczestnicy</div>
      ${regular.map((a) => `<div class="basenAttendeeRow">${esc(a.userDisplayName)}${a.kayakId ? ` · ${esc(kayakLabel(a.kayakId))}` : ""}</div>`).join("")}
    </div>`;
  }

  return html;
}

function bindAttendeesDetails(container, ctx) {
  container.querySelectorAll("details.basenAttendeesDetails").forEach((details) => {
    details.addEventListener("toggle", async () => {
      if (!details.open) return;
      const body = details.querySelector("[data-attendees-body]");
      if (!body || body.getAttribute("data-loaded") === "1") return;
      body.innerHTML = spinnerHtml("Ładowanie…");
      const sessionId = details.getAttribute("data-session-id");
      const slot = details.getAttribute("data-slot");
      try {
        const data = await apiGetJson({ url: `${ATTENDEES_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slot)}`, idToken: ctx.idToken });
        body.innerHTML = renderAttendeesBody(data);
        body.setAttribute("data-loaded", "1");
      } catch (e) {
        body.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się pobrać listy uczestników.")}</div>`;
      }
    });
  });
}

// ─── Slot card ────────────────────────────────────────────────────────────────

function renderSlotCard(sessionId, slotKey, slot, ctx, canEnroll) {
  const remaining = Number(slot.remaining ?? (slot.capacity - slot.enrolledCount));
  const isCancelled = slot.status === "cancelled";
  const isFull = !isCancelled && slot.isFull === true;
  const isSauna = slotKey === "SAUNA";

  let spotsHtml;
  if (isCancelled) spotsHtml = `<span class="basenSpotsFull">Odwołane</span>`;
  else if (isFull) spotsHtml = `<span class="basenSpotsFull">Brak miejsc</span>`;
  else spotsHtml = `<span class="basenSpots">${remaining} miejsc wolnych</span>`;

  const reservedNote = (!isSauna && slot.reservedSpots && slot.reservedSpots.count > 0)
    ? `<div class="basenReservedNote">${slot.reservedSpots.count} miejsc zarezerwowanych${slot.reservedSpots.restrictedToKursant ? " (tylko dla kursantów)" : ""}</div>`
    : "";

  const canBeInstructor = !isSauna && !isCancelled && ctx?.session?.basenInstructor === true;
  const isInstructorEnrolled = slot.userEnrolled && slot.userEnrollmentType === "instructor";
  const isParticipantEnrolled = slot.userEnrolled && slot.userEnrollmentType !== "instructor";

  let footerHtml = "";

  if (isCancelled) {
    footerHtml = `<span class="basenHint">Ten slot został odwołany.</span>`;
  } else if (isInstructorEnrolled) {
    footerHtml = `
      <div class="basenEnrolledBadge">Zapisany/a jako instruktor</div>
      <button type="button" class="ghost basenCancelBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Zrezygnuj</button>
    `;
  } else if (isParticipantEnrolled) {
    const typeLabel = slot.userEnrollmentType === "training" ? "z instruktorem" : "";
    footerHtml = `
      <div class="basenEnrolledInfo">
        <div class="basenEnrolledBadge">Zapisany/a${typeLabel ? ` ${esc(typeLabel)}` : ""}</div>
        ${!isSauna ? `<div class="basenKayakRow">Kajak: <strong data-kayak-current>${esc(kayakLabel(slot.userKayakId))}</strong>
          <button type="button" class="ghost small basenChangeKayakBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Zmień</button>
        </div>` : ""}
      </div>
      <button type="button" class="ghost basenCancelBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Anuluj</button>
    `;
  } else if (!canEnroll) {
    footerHtml = `<span class="basenHint">Tylko dla członków klubu.</span>`;
  } else if (isFull) {
    footerHtml = `<span class="basenHint">Slot jest pełny.</span>`;
    if (canBeInstructor) {
      footerHtml += `<button type="button" class="ghost basenInstructorBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Dodaj się jako instruktor</button>`;
    }
  } else {
    footerHtml = `
      <form class="basenEnrollForm" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
        <div class="basenEnrollRow">
          <button type="submit" class="primary basenEnrollBtn">Zapisz się</button>
        </div>
        ${!isSauna ? `
          <label class="basenCheckLabel">
            <input type="checkbox" class="basenWithInstructorCheck" />
            Zapisz się z instruktorem
          </label>
          <div class="basenInstructorPickerWrap hidden">
            <select class="basenInstructorSelect"><option value="">Ładowanie…</option></select>
          </div>
          <div class="basenKayakPickerWrap">
            <button type="button" class="ghost small basenLoadKayaksBtn">Wybierz kajak (opcjonalnie)</button>
          </div>
        ` : ""}
      </form>
    `;
    if (canBeInstructor) {
      footerHtml += `<button type="button" class="ghost basenInstructorBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Dodaj się jako instruktor</button>`;
    }
  }

  return `
    <div class="basenSlotCard${isCancelled ? " basenSlotCancelled" : ""}" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
      <div class="basenSlotHead">
        <span class="basenSlotLabel">${esc(SLOT_LABELS[slotKey] || slotKey)}</span>
        <span class="basenCardTime">${esc(slot.timeStart)} – ${esc(slot.timeEnd)}</span>
        ${spotsHtml}
      </div>
      ${reservedNote}
      <details class="basenAttendeesDetails" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
        <summary>Uczestnicy</summary>
        <div class="basenAttendeesBody" data-attendees-body>${spinnerHtml("Ładowanie…")}</div>
      </details>
      <div class="basenSlotFooter">
        ${footerHtml}
      </div>
      <div class="basenCardMsg hidden err" data-slot-msg></div>
    </div>
  `;
}

function renderSessionCard(s, ctx, canEnroll) {
  const slotsHtml = SLOT_ORDER
    .filter((key) => s.slots?.[key])
    .map((key) => renderSlotCard(s.id, key, s.slots[key], ctx, canEnroll))
    .join("");

  return `
    <div class="basenCard basenDayCard" data-session-id="${esc(s.id)}">
      <div class="basenCardHead">
        <div class="basenCardDate">${esc(formatDate(s.date))}</div>
      </div>
      ${s.notes ? `<div class="basenCardNotes">${esc(s.notes)}</div>` : ""}
      <div class="basenSlotGrid">
        ${slotsHtml}
      </div>
    </div>
  `;
}

async function renderSessionsView(innerEl, ctx, canEnroll) {
  innerEl.innerHTML = spinnerHtml("Ładowanie terminów…");

  try {
    const data = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];

    if (!sessions.length) {
      innerEl.innerHTML = `<div class="hint" style="margin-top:16px;">Brak nadchodzących terminów basenowych.</div>`;
      return;
    }

    innerEl.innerHTML = `
      <div class="basenList">
        ${sessions.map((s) => renderSessionCard(s, ctx, canEnroll)).join("")}
      </div>
    `;

    bindSessionActions(innerEl, ctx, canEnroll);
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się załadować terminów.")}</div>`;
  }
}

async function refreshSessionsView(innerEl, ctx, canEnroll) {
  await renderSessionsView(innerEl, ctx, canEnroll);
}

function bindSessionActions(innerEl, ctx, canEnroll) {
  bindAttendeesDetails(innerEl, ctx);

  // "Zapisz się z instruktorem" checkbox → lazy-load instructor list
  innerEl.querySelectorAll(".basenWithInstructorCheck").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const form = cb.closest(".basenEnrollForm");
      const wrap = form.querySelector(".basenInstructorPickerWrap");
      if (!wrap) return;
      wrap.classList.toggle("hidden", !cb.checked);
      if (!cb.checked) return;

      const select = wrap.querySelector(".basenInstructorSelect");
      if (select.getAttribute("data-loaded") === "1") return;

      const sessionId = form.getAttribute("data-session-id");
      const slot = form.getAttribute("data-slot");
      try {
        const data = await apiGetJson({ url: `${ATTENDEES_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slot)}`, idToken: ctx.idToken });
        const instructors = Array.isArray(data?.instructors) ? data.instructors : [];
        select.innerHTML = instructors.length
          ? instructors.map((i) => `<option value="${esc(i.userUid)}">${esc(i.userDisplayName)}</option>`).join("")
          : `<option value="">Brak dostępnych instruktorów</option>`;
        select.setAttribute("data-loaded", "1");
      } catch (e) {
        select.innerHTML = `<option value="">Błąd ładowania</option>`;
      }
    });
  });

  // "Wybierz kajak" → lazy-load kayak select
  innerEl.querySelectorAll(".basenLoadKayaksBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const form = btn.closest(".basenEnrollForm");
      const wrap = btn.closest(".basenKayakPickerWrap");
      const sessionId = form.getAttribute("data-session-id");
      const slot = form.getAttribute("data-slot");
      btn.disabled = true;
      btn.textContent = "Ładuję…";
      try {
        const data = await apiGetJson({ url: `${KAYAKS_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slot)}`, idToken: ctx.idToken });
        const kayaks = Array.isArray(data?.kayaks) ? data.kayaks : [];
        const select = document.createElement("select");
        select.className = "basenKayakSelect";
        select.innerHTML = `<option value="">Bez kajaka</option>${kayaks.map((k) => `<option value="${esc(k.id)}">${esc(k.label)}</option>`).join("")}`;
        wrap.innerHTML = "";
        wrap.appendChild(select);
      } catch (e) {
        wrap.innerHTML = `<span class="err">Nie udało się pobrać listy kajaków.</span>`;
      }
    });
  });

  // Enroll (regular/training)
  innerEl.querySelectorAll(".basenEnrollForm").forEach((form) => {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const sessionId = form.getAttribute("data-session-id");
      const slot = form.getAttribute("data-slot");
      const cardEl = form.closest(".basenSlotCard");
      const msgEl = cardEl?.querySelector("[data-slot-msg]");
      const withInstructor = form.querySelector(".basenWithInstructorCheck")?.checked === true;
      const instructorUid = withInstructor ? (form.querySelector(".basenInstructorSelect")?.value || "") : "";
      const kayakId = form.querySelector(".basenKayakSelect")?.value || "";

      if (withInstructor && !instructorUid) {
        if (msgEl) { msgEl.textContent = "Wybierz instruktora."; msgEl.classList.remove("hidden"); }
        return;
      }

      const btn = form.querySelector(".basenEnrollBtn");
      btn.disabled = true;
      btn.textContent = "Zapisuję…";
      if (msgEl) { msgEl.textContent = ""; msgEl.classList.add("hidden"); }

      try {
        await apiPostJson({
          url: ENROLL_URL,
          idToken: ctx.idToken,
          body: {
            sessionId,
            slot,
            mode: withInstructor ? "training" : "regular",
            instructorUid: withInstructor ? instructorUid : undefined,
            kayakId: kayakId || undefined,
          },
        });
        await refreshSessionsView(innerEl, ctx, canEnroll);
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

  // Instructor self sign-up
  innerEl.querySelectorAll(".basenInstructorBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = btn.getAttribute("data-session-id");
      const slot = btn.getAttribute("data-slot");
      const cardEl = btn.closest(".basenSlotCard");
      const msgEl = cardEl?.querySelector("[data-slot-msg]");

      btn.disabled = true;
      btn.textContent = "Zapisuję…";

      try {
        await apiPostJson({ url: ENROLL_URL, idToken: ctx.idToken, body: { sessionId, slot, mode: "instructor" } });
        await refreshSessionsView(innerEl, ctx, canEnroll);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Dodaj się jako instruktor";
        if (msgEl) {
          msgEl.textContent = e?.message || "Nie udało się zapisać.";
          msgEl.classList.remove("hidden");
        }
      }
    });
  });

  // Cancel enrollment (regular/training/instructor)
  innerEl.querySelectorAll(".basenCancelBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = btn.getAttribute("data-session-id");
      const slot = btn.getAttribute("data-slot");
      const cardEl = btn.closest(".basenSlotCard");
      const msgEl = cardEl?.querySelector("[data-slot-msg]");

      if (!confirm("Anulować ten zapis?")) return;

      btn.disabled = true;
      btn.textContent = "Anuluję…";

      try {
        await apiPostJson({ url: CANCEL_ENROLL_URL, idToken: ctx.idToken, body: { sessionId, slot } });
        await refreshSessionsView(innerEl, ctx, canEnroll);
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

  // Change kayak for an existing enrollment
  innerEl.querySelectorAll(".basenChangeKayakBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = btn.getAttribute("data-session-id");
      const slot = btn.getAttribute("data-slot");
      const row = btn.closest(".basenKayakRow");
      if (!row) return;

      btn.disabled = true;
      try {
        const data = await apiGetJson({ url: `${KAYAKS_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slot)}`, idToken: ctx.idToken });
        const kayaks = Array.isArray(data?.kayaks) ? data.kayaks : [];
        row.innerHTML = `
          <select class="basenKayakChangeSelect">
            <option value="">Bez kajaka</option>
            ${kayaks.map((k) => `<option value="${esc(k.id)}">${esc(k.label)}</option>`).join("")}
          </select>
          <button type="button" class="ghost small basenSaveKayakBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slot)}">Zapisz</button>
        `;
        row.querySelector(".basenSaveKayakBtn")?.addEventListener("click", async () => {
          const kayakId = row.querySelector(".basenKayakChangeSelect")?.value || "";
          const saveBtn = row.querySelector(".basenSaveKayakBtn");
          saveBtn.disabled = true;
          try {
            await apiPostJson({ url: SET_KAYAK_URL, idToken: ctx.idToken, body: { sessionId, slot, kayakId: kayakId || null } });
            await refreshSessionsView(innerEl, ctx, canEnroll);
          } catch (e) {
            saveBtn.disabled = false;
            alert(e?.message || "Nie udało się zmienić kajaka.");
          }
        });
      } catch (e) {
        row.innerHTML += `<span class="err">Nie udało się pobrać listy kajaków.</span>`;
      }
    });
  });
}

// ─── Kalendarz admina ("Dodaj basen") ──────────────────────────────────────────

const POLISH_MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const WEEKDAY_LABELS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "So", "Nd"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoFromParts(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function buildSessionsByDate(data) {
  const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
  return new Map(sessions.map((s) => [s.date, s]));
}

function renderCalendarShellHtml(year, month, sessionsByDate) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS getDay(): 0=Ndz..6=Sob — przesuwamy na tydzień Pon-first (0=Pon..6=Ndz)
  const leadBlanks = (first.getDay() + 6) % 7;
  const today = todayIso();

  let cells = "";
  for (let i = 0; i < leadBlanks; i++) {
    cells += `<div class="basenCalDay basenCalDay--blank"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = isoFromParts(year, month, day);
    if (dateIso < today) {
      cells += `<div class="basenCalDay basenCalDay--past"><span class="basenCalDayNum">${day}</span></div>`;
      continue;
    }
    const hasSession = sessionsByDate.has(dateIso);
    cells += `
      <button type="button" class="basenCalDay ${hasSession ? "basenCalDay--has-session" : "basenCalDay--empty"}" data-cal-date="${dateIso}">
        <span class="basenCalDayNum">${day}</span>
        ${hasSession ? `<span class="basenCalDayDot"></span>` : ""}
      </button>
    `;
  }

  return `
    <div class="basenCalendar">
      <div class="basenCalendarHead">
        <button type="button" class="ghost basenCalNavBtn" data-cal-nav="prev">&lsaquo;</button>
        <div class="basenCalendarTitle">${esc(POLISH_MONTHS[month])} ${year}</div>
        <button type="button" class="ghost basenCalNavBtn" data-cal-nav="next">&rsaquo;</button>
      </div>
      <div class="basenCalendarWeekdays">
        ${WEEKDAY_LABELS_PL.map((w) => `<div class="basenCalendarWeekday">${w}</div>`).join("")}
      </div>
      <div class="basenCalendarGrid">${cells}</div>
    </div>
  `;
}

function renderReservedGroupHtml(prefix, title) {
  return `
    <div class="basenReservedGroup" data-reserved-group="${prefix}">
      <div class="basenReservedGroupTitle">${esc(title)}</div>
      <div class="row">
        <label for="cd${prefix}Count">Zarezerwuj N miejsc</label>
        <input type="number" id="cd${prefix}Count" min="0" step="1" placeholder="0" />
      </div>
      <label class="basenCheckLabel basenReservedSub hidden" data-reserved-sub="${prefix}">
        <input type="checkbox" id="cd${prefix}Kursant" />
        tylko dla kursantów
      </label>
      <div class="row basenReservedSub hidden" data-reserved-label-wrap="${prefix}">
        <label for="cd${prefix}Label">Etykieta (opcjonalnie)</label>
        <input type="text" id="cd${prefix}Label" maxlength="100" placeholder="np. grupa X" />
      </div>
    </div>
  `;
}

function renderCreateDayModalHtml() {
  return `
    <div id="basenCreateDayModal" class="basenModal hidden" aria-hidden="true">
      <div class="basenModalBackdrop" data-basen-modal-close="createDay"></div>
      <div class="basenModalCard" role="dialog" aria-modal="true" aria-label="Nowy termin basenowy">
        <div class="basenModalTop">
          <div class="basenModalTitle" data-create-day-title>Nowy termin</div>
          <button type="button" class="basenModalClose" data-basen-modal-close="createDay" aria-label="Zamknij">✕</button>
        </div>
        <div class="basenModalBody">
          <form id="basenCreateDayForm" autocomplete="off">
            <label class="basenCheckLabel">
              <input type="checkbox" id="cdSauna" />
              Sauna
            </label>
            <div class="basenFormGrid">
              ${renderReservedGroupHtml("H1", "I godzina (H1)")}
              ${renderReservedGroupHtml("H2", "II godzina (H2)")}
            </div>
            <div class="row">
              <label for="cdNotes">Uwagi</label>
              <textarea id="cdNotes" rows="2" maxlength="500"></textarea>
            </div>
            <div id="cdErr" class="err hidden"></div>
          </form>
        </div>
        <div class="basenModalActions">
          <button type="button" class="ghost" data-basen-modal-close="createDay">Anuluj</button>
          <button type="submit" form="basenCreateDayForm" class="primary" id="cdSubmitBtn">Utwórz termin</button>
        </div>
      </div>
    </div>
  `;
}

function renderDayDetailModalHtml() {
  return `
    <div id="basenDayDetailModal" class="basenModal hidden" aria-hidden="true">
      <div class="basenModalBackdrop" data-basen-modal-close="dayDetail"></div>
      <div class="basenModalCard" role="dialog" aria-modal="true" aria-label="Szczegóły terminu">
        <div class="basenModalTop">
          <div class="basenModalTitle" data-day-detail-title>Termin</div>
          <button type="button" class="basenModalClose" data-basen-modal-close="dayDetail" aria-label="Zamknij">✕</button>
        </div>
        <div class="basenModalBody" data-day-detail-body></div>
        <div class="basenModalActions">
          <button type="button" class="ghost" data-basen-modal-close="dayDetail">Zamknij</button>
          <button type="button" class="dangerBtn" id="ddCancelDayBtn">Anuluj cały dzień</button>
        </div>
      </div>
    </div>
  `;
}

async function renderCalendarTab(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie kalendarza…");

  let sessionsByDate;
  try {
    const data = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
    sessionsByDate = buildSessionsByDate(data);
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się pobrać terminów.")}</div>`;
    return;
  }

  const today = new Date();
  const state = { year: today.getFullYear(), month: today.getMonth() };

  const refresh = async () => {
    const fresh = await apiGetJson({ url: SESSIONS_URL, idToken: ctx.idToken });
    sessionsByDate = buildSessionsByDate(fresh);
    draw();
  };

  const draw = () => {
    innerEl.innerHTML = renderCalendarShellHtml(state.year, state.month, sessionsByDate)
      + renderCreateDayModalHtml() + renderDayDetailModalHtml();
    bindCalendarNav(innerEl, state, draw);
    bindCalendarModalCloseDelegation(innerEl);
    bindReservedFieldToggles(innerEl);
    bindCalendarDayClicks(innerEl, sessionsByDate, ctx, refresh);
  };

  draw();
}

function bindCalendarNav(innerEl, state, draw) {
  innerEl.querySelector(".basenCalendarHead")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-cal-nav]");
    if (!btn) return;
    state.month += btn.getAttribute("data-cal-nav") === "next" ? 1 : -1;
    if (state.month < 0) { state.month = 11; state.year -= 1; }
    if (state.month > 11) { state.month = 0; state.year += 1; }
    draw();
  });
}

function syncReservedSubFields(innerEl, prefix) {
  const n = Number(innerEl.querySelector(`#cd${prefix}Count`)?.value || 0);
  const kursantChecked = innerEl.querySelector(`#cd${prefix}Kursant`)?.checked === true;
  innerEl.querySelector(`[data-reserved-sub="${prefix}"]`)?.classList.toggle("hidden", !(n > 0));
  innerEl.querySelector(`[data-reserved-label-wrap="${prefix}"]`)?.classList.toggle("hidden", !(n > 0 && !kursantChecked));
}

function bindReservedFieldToggles(innerEl) {
  ["H1", "H2"].forEach((prefix) => {
    const sync = () => syncReservedSubFields(innerEl, prefix);
    innerEl.querySelector(`#cd${prefix}Count`)?.addEventListener("input", sync);
    innerEl.querySelector(`#cd${prefix}Kursant`)?.addEventListener("change", sync);
    sync();
  });
}

function bindCalendarModalCloseDelegation(innerEl) {
  innerEl.addEventListener("click", (ev) => {
    const key = ev.target?.getAttribute?.("data-basen-modal-close");
    if (key === "createDay") closeCreateDayModal(innerEl);
    if (key === "dayDetail") closeDayDetailModal(innerEl);
  });
}

function bindCalendarDayClicks(innerEl, sessionsByDate, ctx, onChanged) {
  innerEl.querySelectorAll(".basenCalDay[data-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const date = cell.getAttribute("data-cal-date");
      const session = sessionsByDate.get(date);
      if (session) openDayDetailModal(innerEl, ctx, session, onChanged);
      else openCreateDayModal(innerEl, ctx, date, onChanged);
    });
  });
}

function openCreateDayModal(innerEl, ctx, date, onChanged) {
  const modal = innerEl.querySelector("#basenCreateDayModal");
  if (!modal) return;

  const form = modal.querySelector("#basenCreateDayForm");
  form.reset();
  ["H1", "H2"].forEach((prefix) => syncReservedSubFields(innerEl, prefix));
  const errEl = modal.querySelector("#cdErr");
  errEl.textContent = "";
  errEl.classList.add("hidden");
  modal.querySelector("[data-create-day-title]").textContent = `Nowy termin — ${formatDate(date)}`;

  const submitBtn = modal.querySelector("#cdSubmitBtn");

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    errEl.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Tworzę…";

    const buildReserved = (prefix) => {
      const count = Number(modal.querySelector(`#cd${prefix}Count`)?.value || 0);
      if (!count) return undefined;
      const restrictedToKursant = modal.querySelector(`#cd${prefix}Kursant`)?.checked === true;
      const label = restrictedToKursant ? undefined : (String(modal.querySelector(`#cd${prefix}Label`)?.value || "").trim() || undefined);
      return { count, restrictedToKursant, label };
    };

    try {
      await apiPostJson({
        url: CREATE_SESSION_URL,
        idToken: ctx.idToken,
        body: {
          date,
          saunaEnabled: modal.querySelector("#cdSauna")?.checked === true,
          h1Reserved: buildReserved("H1"),
          h2Reserved: buildReserved("H2"),
          notes: String(modal.querySelector("#cdNotes")?.value || "").trim(),
        },
      });
      closeCreateDayModal(innerEl);
      await onChanged();
    } catch (e) {
      errEl.textContent = e?.message || "Nie udało się utworzyć terminu.";
      errEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Utwórz termin";
    }
  };

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCreateDayModal(innerEl) {
  const modal = innerEl.querySelector("#basenCreateDayModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderDayDetailSlotHtml(slotKey, slot) {
  const generalCapacity = slot.capacity - (slot.reservedSpots?.count || 0);
  const isCancelled = slot.status === "cancelled";

  let reservedLine = "";
  if (slot.reservedSpots) {
    const rs = slot.reservedSpots;
    reservedLine = rs.restrictedToKursant
      ? `<div>Zarezerwowane: ${rs.count} (tylko kursanci, wykorzystano ${rs.usedCount}/${rs.count})</div>`
      : `<div>Zarezerwowane: ${rs.count}${rs.label ? ` — ${esc(rs.label)}` : ""}</div>`;
  }

  return `
    <div class="basenDayDetailSlot">
      <div class="basenDayDetailSlotHead">
        <span class="basenSlotLabel">${esc(SLOT_LABELS[slotKey] || slotKey)}</span>
        <span class="basenCardTime">${esc(slot.timeStart)} – ${esc(slot.timeEnd)}</span>
        ${isCancelled ? `<span class="basenSpotsFull">Odwołane</span>` : ""}
      </div>
      <div class="basenDayDetailSlotStats">
        <div>Ogólna pula: ${slot.enrolledCount} / ${generalCapacity}</div>
        ${reservedLine}
      </div>
      ${!isCancelled ? `<button type="button" class="dangerBtn basenDayDetailCancelSlotBtn" data-slot="${esc(slotKey)}">Anuluj ten slot</button>` : ""}
    </div>
  `;
}

function openDayDetailModal(innerEl, ctx, session, onChanged) {
  const modal = innerEl.querySelector("#basenDayDetailModal");
  if (!modal) return;

  modal.querySelector("[data-day-detail-title]").textContent = formatDate(session.date);
  const body = modal.querySelector("[data-day-detail-body]");
  body.innerHTML = SLOT_ORDER
    .filter((key) => session.slots?.[key])
    .map((key) => renderDayDetailSlotHtml(key, session.slots[key]))
    .join("");

  body.querySelectorAll(".basenDayDetailCancelSlotBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const slot = btn.getAttribute("data-slot");
      if (!confirm(`Anulować slot ${slot}? Wszyscy uczestnicy zostaną wypisani.`)) return;
      btn.disabled = true;
      try {
        await apiPostJson({ url: CANCEL_SESSION_URL, idToken: ctx.idToken, body: { sessionId: session.id, slot } });
        closeDayDetailModal(innerEl);
        await onChanged();
      } catch (e) {
        btn.disabled = false;
        alert(e?.message || "Nie udało się anulować.");
      }
    });
  });

  const cancelDayBtn = modal.querySelector("#ddCancelDayBtn");
  cancelDayBtn.onclick = async () => {
    if (!confirm(`Anulować cały dzień ${formatDate(session.date)}? Wszyscy uczestnicy zostaną wypisani.`)) return;
    cancelDayBtn.disabled = true;
    try {
      await apiPostJson({ url: CANCEL_SESSION_URL, idToken: ctx.idToken, body: { sessionId: session.id } });
      closeDayDetailModal(innerEl);
      await onChanged();
    } catch (e) {
      cancelDayBtn.disabled = false;
      alert(e?.message || "Nie udało się anulować.");
    }
  };

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDayDetailModal(innerEl) {
  const modal = innerEl.querySelector("#basenDayDetailModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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
      const validTabs = ["sessions", ...(isAdmin ? ["calendar", "payments"] : [])];
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

      if (activeTab === "calendar" && isAdmin) {
        await renderCalendarTab(innerEl, ctx);
      } else if (activeTab === "payments" && isAdmin) {
        innerEl.innerHTML = `<div class="hint" style="margin-top:16px;">Wkrótce.</div>`;
      } else {
        await renderSessionsView(innerEl, ctx, canEnroll);
      }
    },
  };
}
