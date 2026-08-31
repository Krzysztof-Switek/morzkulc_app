// public/modules/basen_module.js
import { apiGetJson, apiPostJson } from "/core/api_client.js";

const NAV_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const NAV_HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
// Ikonki w komórkach kalendarza admina — basen (fala) i sauna (płomień) zaznaczane
// OSOBNO, żeby dało się na pierwszy rzut oka odróżnić dzień z samą sauną od dnia
// z basenem (albo obiema).
const POOL_ICON_SVG = `<svg class="basenCalIcon basenCalIconPool" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0"/><path d="M2 12c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0"/></svg>`;
const SAUNA_ICON_SVG = `<svg class="basenCalIcon basenCalIconSauna" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-1-2-1-2 2 1 3 3 3 5a5 5 0 0 1-10 0c0-5 5-6 5-11z"/></svg>`;

const SESSIONS_URL = "/api/basen/sessions";
const ENROLL_URL = "/api/basen/enroll";
const CANCEL_ENROLL_URL = "/api/basen/cancel-enrollment";
const CREATE_SESSION_URL = "/api/basen/sessions/create";
const CANCEL_SESSION_URL = "/api/basen/sessions/cancel";
const ADD_SAUNA_URL = "/api/basen/sessions/add-sauna";
const SET_KAYAK_URL = "/api/basen/kayak";
const SET_INSTRUCTOR_URL = "/api/basen/instructor";
const CLAIM_URL = "/api/basen/instructor/claim";
const KAYAKS_URL = "/api/basen/kayaks";
const ATTENDEES_URL = "/api/basen/attendees";
const GODZINY_USERS_URL = "/api/basen/admin/godziny/users";
const GODZINY_ADD_URL = "/api/basen/admin/godziny/add";
const GODZINY_MY_URL = "/api/basen/godziny/my";

const SLOT_ORDER = ["H1", "H2", "SAUNA"];
const SLOT_LABELS = { H1: "I godzina", H2: "II godzina", SAUNA: "Sauna" };
const SEEKING_SENTINEL = "__SEEKING__";

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

function kayakLabel(kayakId, resolvedLabel) {
  if (!kayakId) return "Brak";
  if (resolvedLabel) return resolvedLabel;
  if (kayakId === "PRIVATE") return "Kajak prywatny";
  return `Kajak (nr ${esc(kayakId)})`; // fallback gdy backend nie zwrócił etykiety
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function renderTabsHtml(activeTab, isAdmin) {
  // "Moje konto" (historia własnych godzin basenowych) widoczne dla WSZYSTKICH —
  // to nie funkcja administracyjna, każdy user ma prawo widzieć swój wyciąg.
  const tabs = isAdmin
    ? [
      { id: "calendar", label: "Dodaj / usuń basen" },
      { id: "payments", label: "Płatności" },
      { id: "account", label: "Moje konto" },
    ]
    : [
      { id: "sessions", label: "Baseny" },
      { id: "account", label: "Moje konto" },
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

  // Prosta, zawsze widoczna lista uczestników — bez rozwijania, bez kajaka. Ksywka,
  // a jak brak to imię+nazwisko. Instruktorzy zawsze na górze (lekka kreska oddziela
  // ich od reszty), sparowany uczestnik (training + instructorUid) pokazany razem
  // z instruktorem w jednym niebieskim kaflu. Osoba szukająca instruktora dostaje
  // klikalny kafelek (zamiast osobnego przycisku) TYLKO dla widza, który sam jest
  // instruktorem na ten slot — klik od razu go do niej przypisuje.
  const attendeesList = Array.isArray(slot.attendees) ? slot.attendees : [];
  const instructorAttendees = attendeesList.filter((a) => a.type === "instructor");
  const otherAttendees = attendeesList.filter((a) => a.type !== "instructor");
  const instructorLabelByUid = new Map(instructorAttendees.map((a) => [a.userUid, a.displayLabel]));
  const renderOtherAttendeeRow = (a) => {
    const label = esc(a.displayLabel);
    if (a.type === "training" && a.instructorUid) {
      const instructorLabel = instructorLabelByUid.get(a.instructorUid);
      return `<div class="basenAttendeeRow"><span class="basenAttendeeTag">${label}${instructorLabel ? ` + ${esc(instructorLabel)}` : ""}</span></div>`;
    }
    if (a.type === "training" && !a.instructorUid) {
      return isInstructorEnrolled
        ? `<button type="button" class="basenAttendeeTag basenClaimTagBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}" data-target-uid="${esc(a.userUid)}" title="Kliknij, aby przypisać siebie jako instruktora">${label} — potrzebuje instruktora</button>`
        : `<div class="basenAttendeeRow">${label} <span class="basenAttendeeTag">potrzebuje instruktora</span></div>`;
    }
    return `<div class="basenAttendeeRow">${label}</div>`;
  };
  const attendeesHtml = !isCancelled && attendeesList.length ? `
    <div class="basenAttendeesSimple">
      <div class="basenAttendeesSimpleTitle">Uczestnicy</div>
      ${instructorAttendees.map((a) => `<div class="basenAttendeeRow">${esc(a.displayLabel)} <span class="basenAttendeeTag">instruktor</span></div>`).join("")}
      ${instructorAttendees.length && otherAttendees.length ? `<div class="basenAttendeeDivider"></div>` : ""}
      ${otherAttendees.map(renderOtherAttendeeRow).join("")}
    </div>
  ` : "";

  let footerHtml = "";

  if (isCancelled) {
    footerHtml = `<span class="basenHint">Ten slot został odwołany.</span>`;
  } else if (isInstructorEnrolled) {
    footerHtml = `
      <div class="basenEnrolledBadge">Zapisany/a jako instruktor</div>
      <button type="button" class="ghost basenCancelBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Zrezygnuj</button>
    `;
  } else if (isParticipantEnrolled) {
    const typeLabel = slot.userEnrollmentType === "training"
      ? (slot.userInstructorUid ? "z instruktorem" : "szukam instruktora")
      : "";
    const kayakLine = (!isSauna && slot.userKayakId)
      ? `<div class="basenKayakRow">${esc(kayakLabel(slot.userKayakId, slot.userKayakLabel))}</div>`
      : "";
    footerHtml = `
      <div class="basenEnrolledInfo">
        <div class="basenEnrolledBadge">Zapisany/a${typeLabel ? ` ${esc(typeLabel)}` : ""}</div>
        ${kayakLine}
      </div>
      <div class="basenEnrolledActions">
        ${!isSauna ? `<button type="button" class="ghost basenModifyBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}" data-current-kayak-id="${esc(slot.userKayakId || "")}" data-current-instructor-uid="${esc(slot.userInstructorUid || "")}" data-current-type="${esc(slot.userEnrollmentType || "")}">Modyfikuj zapis</button>` : ""}
        <button type="button" class="ghost basenCancelBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}" data-within-window="${slot.isWithinCancellationWindow ? "1" : "0"}">Anuluj zapis</button>
      </div>
    `;
  } else if (!canEnroll) {
    footerHtml = `<span class="basenHint">Tylko dla członków klubu.</span>`;
  } else if (isFull) {
    footerHtml = `<span class="basenHint">Slot jest pełny.</span>`;
  } else if (isSauna) {
    // Sauna nie ma kajaka ani parowania z instruktorem — nic do rozwinięcia,
    // "Zapisz się" zapisuje od razu, jednym kliknięciem.
    footerHtml = `
      <form class="basenEnrollForm" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
        <button type="submit" class="primary basenEnrollBtn">Zapisz się</button>
      </form>
    `;
  } else {
    // Na starcie TYLKO "Zapisz się" — dopiero klik rozwija kajak/instruktora, żeby
    // niezapisany slot nie straszył formularzem zanim user w ogóle zdecyduje się
    // zapisać. Drugi klik (już w rozwiniętym stanie) faktycznie wysyła zapis.
    footerHtml = `
      <form class="basenEnrollForm" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
        <button type="button" class="primary basenEnrollRevealBtn">Zapisz się</button>
        <div class="basenEnrollExpanded hidden">
          <label class="basenCheckLabel">
            <input type="checkbox" class="basenWithInstructorCheck" />
            Potrzebuję instruktora
          </label>
          <div class="basenInstructorPickerWrap hidden">
            <select class="basenInstructorSelect"><option value="">Ładowanie…</option></select>
          </div>
          <div class="row">
            <label>Kajak (opcjonalnie)</label>
            <select class="basenKayakSelect">
              <option value="">Bez kajaka</option>
              ${(Array.isArray(slot.availableKayaks) ? slot.availableKayaks : []).map((k) => `<option value="${esc(k.id)}">${esc(k.label)}</option>`).join("")}
            </select>
          </div>
          <div class="basenEnrollRow">
            <button type="submit" class="primary basenEnrollBtn">Zapisz się</button>
            <button type="button" class="ghost basenEnrollCancelBtn">Anuluj</button>
          </div>
        </div>
      </form>
    `;
  }
  if (!isCancelled && !isInstructorEnrolled && !isParticipantEnrolled && canEnroll && canBeInstructor) {
    footerHtml += `<button type="button" class="ghost basenInstructorBtn" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">Dodaj się jako instruktor</button>`;
  }

  return `
    <div class="basenSlotCard${isCancelled ? " basenSlotCancelled" : ""}" data-session-id="${esc(sessionId)}" data-slot="${esc(slotKey)}">
      <div class="basenSlotHead">
        <span class="basenSlotLabel">${esc(SLOT_LABELS[slotKey] || slotKey)}</span>
        <span class="basenCardTime">${esc(slot.timeStart)}</span>
        ${spotsHtml}
      </div>
      ${reservedNote}
      ${attendeesHtml}
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
    const balance = Number(data?.userGodzinyBalance ?? 0);
    const balanceHtml = canEnroll
      ? `<div class="basenHint" style="margin-top:8px;">Dostępne godziny basenowe: <strong>${balance}</strong>${balance <= 0 ? " — zapisz się dopiero po dopisaniu godzin przez opiekuna basenu." : ""}</div>`
      : "";

    if (!sessions.length) {
      innerEl.innerHTML = balanceHtml + `<div class="hint" style="margin-top:16px;">Brak nadchodzących terminów basenowych.</div>`;
      return;
    }

    innerEl.innerHTML = `
      ${balanceHtml}
      <div class="basenList">
        ${sessions.map((s) => renderSessionCard(s, ctx, canEnroll)).join("")}
      </div>
      ${renderModifyModalHtml()}
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
  // Klik na kafelek osoby "szukającej instruktora" (widoczny od razu na karcie slotu,
  // tylko dla widza który sam jest instruktorem na tym slocie) → od razu przypisuje.
  innerEl.querySelectorAll(".basenClaimTagBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = btn.getAttribute("data-session-id");
      const slot = btn.getAttribute("data-slot");
      const targetUid = btn.getAttribute("data-target-uid");
      btn.disabled = true;
      try {
        await apiPostJson({ url: CLAIM_URL, idToken: ctx.idToken, body: { sessionId, slot, targetUid } });
        await refreshSessionsView(innerEl, ctx, canEnroll);
      } catch (e) {
        btn.disabled = false;
        alert(e?.message || "Nie udało się przypisać.");
      }
    });
  });

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
          ? `<option value="">Bez wyboru — dopasujemy później</option>${instructors.map((i) => `<option value="${esc(i.userUid)}">${esc(i.userDisplayName)}</option>`).join("")}`
          : `<option value="">Brak dostępnych instruktorów — zapiszesz się na listę oczekujących</option>`;
        select.setAttribute("data-loaded", "1");
      } catch (e) {
        select.innerHTML = `<option value="">Błąd ładowania</option>`;
      }
    });
  });

  // "Zapisz się" (pierwszy klik) → rozwiń formularz (kajak/instruktor), ukryj przycisk-wyzwalacz
  innerEl.querySelectorAll(".basenEnrollRevealBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".basenEnrollForm");
      const expanded = form?.querySelector(".basenEnrollExpanded");
      if (!expanded) return;
      btn.classList.add("hidden");
      expanded.classList.remove("hidden");
    });
  });

  // "Anuluj" w rozwiniętym formularzu → zwiń z powrotem, resetując wybory
  innerEl.querySelectorAll(".basenEnrollCancelBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".basenEnrollForm");
      if (!form) return;
      const revealBtn = form.querySelector(".basenEnrollRevealBtn");
      const expanded = form.querySelector(".basenEnrollExpanded");
      const check = form.querySelector(".basenWithInstructorCheck");
      const pickerWrap = form.querySelector(".basenInstructorPickerWrap");
      const instructorSelect = form.querySelector(".basenInstructorSelect");
      const kayakSelect = form.querySelector(".basenKayakSelect");
      if (check) check.checked = false;
      if (pickerWrap) pickerWrap.classList.add("hidden");
      if (instructorSelect) instructorSelect.removeAttribute("data-loaded");
      if (kayakSelect) kayakSelect.value = "";
      expanded?.classList.add("hidden");
      revealBtn?.classList.remove("hidden");
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

      const withinWindow = btn.getAttribute("data-within-window") === "1";
      const confirmMsg = withinWindow
        ? "Rezygnujesz mniej niż 24h przed zajęciami — mimo anulowania nadal obowiązuje pełna opłata za tę godzinę basenową. Kontynuować?"
        : "Anulować ten zapis?";
      if (!confirm(confirmMsg)) return;

      btn.disabled = true;
      btn.textContent = "Anuluję…";

      try {
        await apiPostJson({ url: CANCEL_ENROLL_URL, idToken: ctx.idToken, body: { sessionId, slot } });
        await refreshSessionsView(innerEl, ctx, canEnroll);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "Anuluj zapis";
        if (msgEl) {
          msgEl.textContent = e?.message || "Nie udało się anulować.";
          msgEl.classList.remove("hidden");
        }
      }
    });
  });

  // Modyfikuj zapis (kajak + instruktor) — otwiera wspólny modal
  innerEl.querySelectorAll(".basenModifyBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sessionId = btn.getAttribute("data-session-id");
      const slot = btn.getAttribute("data-slot");
      const currentKayakId = btn.getAttribute("data-current-kayak-id") || "";
      const currentInstructorUid = btn.getAttribute("data-current-instructor-uid") || "";
      const currentType = btn.getAttribute("data-current-type") || "";
      openModifyModal(innerEl, ctx, sessionId, slot, {currentKayakId, currentInstructorUid, currentType}, () => refreshSessionsView(innerEl, ctx, canEnroll));
    });
  });

  bindModalCloseDelegation(innerEl);
}

function bindModalCloseDelegation(innerEl) {
  innerEl.addEventListener("click", (ev) => {
    if (ev.target?.getAttribute?.("data-basen-modal-close") === "modify") closeModifyModal(innerEl);
  });
}

// ─── Modal "Modyfikuj zapis" (kajak + instruktor) ─────────────────────────────

function renderModifyModalHtml() {
  return `
    <div id="basenModifyModal" class="basenModal hidden" aria-hidden="true">
      <div class="basenModalBackdrop" data-basen-modal-close="modify"></div>
      <div class="basenModalCard" role="dialog" aria-modal="true" aria-label="Modyfikuj zapis">
        <div class="basenModalTop">
          <div class="basenModalTitle" data-modify-title>Modyfikuj zapis</div>
          <button type="button" class="basenModalClose" data-basen-modal-close="modify" aria-label="Zamknij">✕</button>
        </div>
        <div class="basenModalBody">
          <div class="row">
            <label for="basenModifyKayakSelect">Kajak</label>
            <select id="basenModifyKayakSelect"><option value="">Ładowanie…</option></select>
          </div>
          <div class="row">
            <label for="basenModifyInstructorSelect">Instruktor</label>
            <select id="basenModifyInstructorSelect"><option value="">Ładowanie…</option></select>
          </div>
          <div id="basenModifyMsg" class="err hidden"></div>
        </div>
        <div class="basenModalActions">
          <button type="button" class="ghost" data-basen-modal-close="modify">Anuluj</button>
          <button type="button" class="primary basenModifySaveBtn">Zapisz zmiany</button>
        </div>
      </div>
    </div>
  `;
}

function openModifyModal(innerEl, ctx, sessionId, slotKey, current, onChanged) {
  const modal = innerEl.querySelector("#basenModifyModal");
  if (!modal) return;

  modal.querySelector("[data-modify-title]").textContent = `Modyfikuj zapis — ${SLOT_LABELS[slotKey] || slotKey}`;

  const kayakSelect = modal.querySelector("#basenModifyKayakSelect");
  const instructorSelect = modal.querySelector("#basenModifyInstructorSelect");
  const msgEl = modal.querySelector("#basenModifyMsg");
  const saveBtn = modal.querySelector(".basenModifySaveBtn");

  kayakSelect.innerHTML = `<option value="">Ładowanie…</option>`;
  instructorSelect.innerHTML = `<option value="">Ładowanie…</option>`;
  msgEl.textContent = "";
  msgEl.classList.add("hidden");
  saveBtn.disabled = false;
  saveBtn.textContent = "Zapisz zmiany";

  apiGetJson({ url: `${KAYAKS_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slotKey)}`, idToken: ctx.idToken })
    .then((data) => {
      const kayaks = Array.isArray(data?.kayaks) ? data.kayaks : [];
      kayakSelect.innerHTML = `<option value="">Bez kajaka</option>${kayaks.map((k) => `<option value="${esc(k.id)}">${esc(k.label)}</option>`).join("")}`;
      kayakSelect.value = current.currentKayakId || "";
    })
    .catch(() => { kayakSelect.innerHTML = `<option value="">Błąd ładowania</option>`; });

  // Trzy różne stany, nie dwa: "Brak" (zwykły zapis, bez instruktora, koniec tematu),
  // "Szukam instruktora" (nadal chcę, ale nikt jeszcze nie jest dostępny — dopasujemy
  // później, przez ten sam modal albo przez instruktora z listy uczestników) i konkretny
  // instruktor. Bez tego trzeciego stanu nie dało się PO ZAPISIE dołączyć do listy
  // szukających — jedyna droga była zaznaczenie checkboxa przy samym zapisie.
  const currentSelectValue = current.currentInstructorUid || (current.currentType === "training" ? SEEKING_SENTINEL : "");

  apiGetJson({ url: `${ATTENDEES_URL}?sessionId=${encodeURIComponent(sessionId)}&slot=${encodeURIComponent(slotKey)}`, idToken: ctx.idToken })
    .then((data) => {
      const instructors = Array.isArray(data?.instructors) ? data.instructors : [];
      instructorSelect.innerHTML = `<option value="">Brak</option><option value="${SEEKING_SENTINEL}">Szukam instruktora (dopasujemy później)</option>${instructors.map((i) => `<option value="${esc(i.userUid)}">${esc(i.userDisplayName)}</option>`).join("")}`;
      instructorSelect.value = currentSelectValue;
    })
    .catch(() => { instructorSelect.innerHTML = `<option value="">Błąd ładowania</option>`; });

  saveBtn.onclick = async () => {
    msgEl.classList.add("hidden");
    saveBtn.disabled = true;
    saveBtn.textContent = "Zapisuję…";
    try {
      // Wysyłamy tylko realnie zmienione pola — dla "szukam instruktora" (type=training,
      // instructorUid=null) pole instruktora domyślnie pokazuje "Brak"; wysłanie
      // instructorUid=null bez zmiany cofnęłoby type do "regular" (patrz
      // setEnrollmentInstructor), czyli wypisałoby osobę z listy szukających mimo że
      // nic nie zmieniła.
      const calls = [];
      if ((kayakSelect.value || "") !== (current.currentKayakId || "")) {
        calls.push(apiPostJson({ url: SET_KAYAK_URL, idToken: ctx.idToken, body: { sessionId, slot: slotKey, kayakId: kayakSelect.value || null } }));
      }
      if ((instructorSelect.value || "") !== currentSelectValue) {
        const selected = instructorSelect.value;
        const seeking = selected === SEEKING_SENTINEL;
        const instructorUid = seeking ? null : (selected || null);
        calls.push(apiPostJson({ url: SET_INSTRUCTOR_URL, idToken: ctx.idToken, body: { sessionId, slot: slotKey, instructorUid, seeking } }));
      }
      await Promise.all(calls);
      closeModifyModal(innerEl);
      await onChanged();
    } catch (e) {
      msgEl.textContent = e?.message || "Nie udało się zapisać zmian.";
      msgEl.classList.remove("hidden");
      saveBtn.disabled = false;
      saveBtn.textContent = "Zapisz zmiany";
    }
  };

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModifyModal(innerEl) {
  const modal = innerEl.querySelector("#basenModifyModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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
    const session = sessionsByDate.get(dateIso);
    const isActiveSlot = (s) => Boolean(s) && s.status !== "cancelled";
    const hasPool = Boolean(session) && (isActiveSlot(session.slots?.H1) || isActiveSlot(session.slots?.H2));
    const hasSauna = Boolean(session) && isActiveSlot(session.slots?.SAUNA);
    const hasSession = hasPool || hasSauna;
    cells += `
      <button type="button" class="basenCalDay ${hasSession ? "basenCalDay--has-session" : "basenCalDay--empty"}" data-cal-date="${dateIso}">
        <span class="basenCalDayNum">${day}</span>
        ${hasSession ? `<span class="basenCalDayIcons">${hasPool ? POOL_ICON_SVG : ""}${hasSauna ? SAUNA_ICON_SVG : ""}</span>` : ""}
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
          <div class="basenModalTopLeft">
            <button type="button" class="dangerBtn" id="ddCancelDayBtn">Anuluj basen</button>
            <div class="basenModalTitle" data-day-detail-title>Termin</div>
          </div>
          <button type="button" class="basenModalClose" data-basen-modal-close="dayDetail" aria-label="Zamknij">✕</button>
        </div>
        <div class="basenModalBody">
          <div class="row">
            <label for="ddCancelReason">Powód anulowania (opcjonalnie, trafia w mailu do zapisanych)</label>
            <input type="text" id="ddCancelReason" maxlength="500" placeholder="np. awaria niecki" />
          </div>
          <div data-day-detail-body></div>
          <div data-add-sauna-wrap></div>
        </div>
        <div class="basenModalActions">
          <button type="button" class="ghost" data-basen-modal-close="dayDetail">Zamknij</button>
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
        <span class="basenCardTime">${esc(slot.timeStart)}</span>
        ${isCancelled ? `<span class="basenSpotsFull">Odwołane</span>` : ""}
      </div>
      <div class="basenDayDetailSlotStats">
        <div>Ogólna pula: ${slot.enrolledCount} / ${generalCapacity}</div>
        ${reservedLine}
      </div>
    </div>
  `;
}

function openDayDetailModal(innerEl, ctx, session, onChanged) {
  const modal = innerEl.querySelector("#basenDayDetailModal");
  if (!modal) return;

  modal.querySelector("[data-day-detail-title]").textContent = formatDate(session.date);
  const reasonEl = modal.querySelector("#ddCancelReason");
  reasonEl.value = "";
  const body = modal.querySelector("[data-day-detail-body]");
  body.innerHTML = SLOT_ORDER
    .filter((key) => session.slots?.[key])
    .map((key) => renderDayDetailSlotHtml(key, session.slots[key]))
    .join("");

  const addSaunaWrap = modal.querySelector("[data-add-sauna-wrap]");
  if (!session.slots?.SAUNA) {
    addSaunaWrap.innerHTML = `<button type="button" class="ghost" id="ddAddSaunaBtn">Dodaj saunę do tego terminu</button>`;
    const addSaunaBtn = addSaunaWrap.querySelector("#ddAddSaunaBtn");
    addSaunaBtn.addEventListener("click", async () => {
      addSaunaBtn.disabled = true;
      addSaunaBtn.textContent = "Dodaję…";
      try {
        await apiPostJson({ url: ADD_SAUNA_URL, idToken: ctx.idToken, body: { sessionId: session.id } });
        closeDayDetailModal(innerEl);
        await onChanged();
      } catch (e) {
        addSaunaBtn.disabled = false;
        addSaunaBtn.textContent = "Dodaj saunę do tego terminu";
        alert(e?.message || "Nie udało się dodać sauny.");
      }
    });
  } else {
    addSaunaWrap.innerHTML = "";
  }

  const cancelDayBtn = modal.querySelector("#ddCancelDayBtn");
  cancelDayBtn.onclick = async () => {
    if (!confirm(`Anulować basen ${formatDate(session.date)}? Wszyscy uczestnicy zostaną wypisani, a zablokowane godziny wrócą na ich saldo.`)) return;
    cancelDayBtn.disabled = true;
    try {
      await apiPostJson({ url: CANCEL_SESSION_URL, idToken: ctx.idToken, body: { sessionId: session.id, reason: reasonEl.value.trim() || undefined } });
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

// ─── Płatności (saldo godzin basenowych) ───────────────────────────────────────

function renderAddGodzinyModalHtml() {
  return `
    <div id="basenAddGodzinyModal" class="basenModal hidden" aria-hidden="true">
      <div class="basenModalBackdrop" data-basen-modal-close="addGodziny"></div>
      <div class="basenModalCard" role="dialog" aria-modal="true" aria-label="Dopisz godziny basenowe">
        <div class="basenModalTop">
          <div class="basenModalTitle" data-add-godziny-title>Dopisz godziny</div>
          <button type="button" class="basenModalClose" data-basen-modal-close="addGodziny" aria-label="Zamknij">✕</button>
        </div>
        <div class="basenModalBody">
          <div class="row">
            <label for="agAmount">Liczba godzin</label>
            <input type="number" id="agAmount" min="1" step="1" placeholder="np. 10" />
          </div>
          <div class="row">
            <label for="agReason">Powód (opcjonalnie)</label>
            <input type="text" id="agReason" maxlength="200" placeholder="np. wpłata 10.09" />
          </div>
          <div id="agErr" class="err hidden"></div>
        </div>
        <div class="basenModalActions">
          <button type="button" class="ghost" data-basen-modal-close="addGodziny">Anuluj</button>
          <button type="button" class="primary" id="agSubmitBtn">Dopisz</button>
        </div>
      </div>
    </div>
  `;
}

function openAddGodzinyModal(innerEl, ctx, user, onSaved) {
  const modal = innerEl.querySelector("#basenAddGodzinyModal");
  if (!modal) return;

  modal.querySelector("[data-add-godziny-title]").textContent = `Dopisz godziny — ${user.userName || user.userNick || user.userEmail}`;
  const amountEl = modal.querySelector("#agAmount");
  const reasonEl = modal.querySelector("#agReason");
  const errEl = modal.querySelector("#agErr");
  const submitBtn = modal.querySelector("#agSubmitBtn");

  amountEl.value = "";
  reasonEl.value = "";
  errEl.textContent = "";
  errEl.classList.add("hidden");
  submitBtn.disabled = false;
  submitBtn.textContent = "Dopisz";

  submitBtn.onclick = async () => {
    const amount = Number(amountEl.value);
    if (!amount || amount <= 0) {
      errEl.textContent = "Podaj liczbę godzin większą od 0.";
      errEl.classList.remove("hidden");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Zapisuję…";
    try {
      const res = await apiPostJson({
        url: GODZINY_ADD_URL,
        idToken: ctx.idToken,
        body: { userUid: user.userUid, amount, reason: reasonEl.value.trim() || undefined },
      });
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      await onSaved(res?.newBalance);
    } catch (e) {
      errEl.textContent = e?.message || "Nie udało się dopisać godzin.";
      errEl.classList.remove("hidden");
      submitBtn.disabled = false;
      submitBtn.textContent = "Dopisz";
    }
  };

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function renderGodzinyRow(u) {
  const name = esc(u.userName || u.userNick || u.userEmail || u.userUid);
  const nickLine = (u.userNick && u.userName) ? `<div class="basenHint">${esc(u.userNick)}</div>` : "";
  const balCls = u.balance > 0 ? "basenGodzinyBalance" : "basenGodzinyBalanceZero";
  return `
    <div class="basenGodzinyRow" data-uid="${esc(u.userUid)}">
      <div class="basenGodzinyRowInfo">
        <div>${name}</div>
        ${nickLine}
        <div class="basenHint">${esc(u.userEmail || "")}</div>
      </div>
      <div class="${balCls}">${u.balance} h</div>
      <button type="button" class="ghost small basenAddGodzinyBtn" data-uid="${esc(u.userUid)}">Dopisz godziny</button>
    </div>
  `;
}

async function renderPaymentsTab(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie…");

  let rows;
  try {
    const data = await apiGetJson({ url: GODZINY_USERS_URL, idToken: ctx.idToken });
    rows = Array.isArray(data?.rows) ? data.rows : [];
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się pobrać listy użytkowników.")}</div>`;
    return;
  }

  const byUid = new Map(rows.map((u) => [u.userUid, u]));

  const draw = () => {
    innerEl.innerHTML = `
      <div class="row" style="margin-top:12px;">
        <label for="paymentsSearch">Szukaj (mail / nazwisko / ksywka)</label>
        <input type="text" id="paymentsSearch" placeholder="np. jan.kowalski albo Kowalski albo ksywka" autocomplete="off" />
      </div>
      <div id="paymentsSummary" class="hint" style="margin:8px 0;"></div>
      <div id="paymentsContent"></div>
      ${renderAddGodzinyModalHtml()}
    `;

    const searchEl = innerEl.querySelector("#paymentsSearch");
    const summaryEl = innerEl.querySelector("#paymentsSummary");
    const contentEl = innerEl.querySelector("#paymentsContent");

    const renderList = () => {
      const q = searchEl.value.trim().toLowerCase();
      const filtered = q
        ? rows.filter((u) =>
            String(u.userEmail || "").toLowerCase().includes(q) ||
            String(u.userName || "").toLowerCase().includes(q) ||
            String(u.userNick || "").toLowerCase().includes(q))
        : rows;

      const withHours = filtered.filter((u) => u.balance > 0);
      const withoutHours = filtered.filter((u) => u.balance <= 0);

      summaryEl.textContent = `Razem: ${filtered.length} · Mają godziny: ${withHours.length} · Brak godzin: ${withoutHours.length}`;

      let html = "";
      html += `<div class="basenAttendeesGroupTitle">Mają godziny</div>`;
      html += `<div class="basenGodzinyList">${withHours.length ? withHours.map(renderGodzinyRow).join("") : `<div class="basenHint">Brak.</div>`}</div>`;
      html += `<div class="basenAttendeesGroupTitle" style="margin-top:14px;">Brak godzin</div>`;
      html += `<div class="basenGodzinyList">${withoutHours.length ? withoutHours.map(renderGodzinyRow).join("") : `<div class="basenHint">Brak.</div>`}</div>`;
      contentEl.innerHTML = html;

      contentEl.querySelectorAll(".basenAddGodzinyBtn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const user = byUid.get(btn.getAttribute("data-uid"));
          if (!user) return;
          openAddGodzinyModal(innerEl, ctx, user, async (newBalance) => {
            if (typeof newBalance === "number") user.balance = newBalance;
            renderList();
          });
        });
      });
    };

    searchEl.addEventListener("input", renderList);
    innerEl.addEventListener("click", (ev) => {
      if (ev.target?.getAttribute?.("data-basen-modal-close") === "addGodziny") {
        const modal = innerEl.querySelector("#basenAddGodzinyModal");
        modal?.classList.add("hidden");
        modal?.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });

    renderList();
  };

  draw();
}

// ─── Moje konto (wyciąg — pełna historia własnych godzin basenowych) ──────────

const GODZINY_TYPE_LABELS = {
  admin_add: "Dopisane",
  booking_block: "Wykorzystane",
  booking_refund: "Zwrot",
  instructor_reward: "Nagroda za instruktorowanie",
};

function formatGodzinyDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function renderGodzinyLedgerRow(r) {
  const positive = r.amount > 0;
  const sign = positive ? "+" : "";
  const typeLabel = GODZINY_TYPE_LABELS[r.type] || r.type;
  return `
    <div class="basenLedgerRow">
      <div class="basenLedgerMain">
        <div class="basenLedgerType">${esc(typeLabel)}</div>
        <div class="basenLedgerReason">${esc(r.reason || "")}</div>
        <div class="basenLedgerDate">${esc(formatGodzinyDate(r.createdAt))}</div>
      </div>
      <div class="${positive ? "basenGodzinyBalance" : "basenGodzinyBalanceZero"}">${sign}${r.amount} h</div>
    </div>
  `;
}

async function renderAccountTab(innerEl, ctx) {
  innerEl.innerHTML = spinnerHtml("Ładowanie…");

  try {
    const data = await apiGetJson({ url: GODZINY_MY_URL, idToken: ctx.idToken });
    const balance = Number(data?.balance ?? 0);
    const records = Array.isArray(data?.records) ? data.records : [];

    const rowsHtml = records.length
      ? records.map(renderGodzinyLedgerRow).join("")
      : `<div class="basenHint">Brak historii — nie masz jeszcze żadnych operacji na godzinach basenowych.</div>`;

    innerEl.innerHTML = `
      <div class="row" style="margin-top:12px;">
        <div class="basenAttendeesGroupTitle">Saldo godzin basenowych</div>
        <div class="${balance > 0 ? "basenGodzinyBalance" : "basenGodzinyBalanceZero"}" style="font-size:20px;">${balance} h</div>
      </div>
      <div class="basenAttendeesGroupTitle" style="margin-top:16px;">Historia (wyciąg)</div>
      <div class="basenLedgerList">${rowsHtml}</div>
    `;
  } catch (e) {
    innerEl.innerHTML = `<div class="err">${esc(e?.message || "Nie udało się pobrać historii godzin.")}</div>`;
  }
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
      const validTabs = ["sessions", "account", ...(isAdmin ? ["calendar", "payments"] : [])];
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
        await renderPaymentsTab(innerEl, ctx);
      } else if (activeTab === "account") {
        await renderAccountTab(innerEl, ctx);
      } else {
        await renderSessionsView(innerEl, ctx, canEnroll);
      }
    },
  };
}
