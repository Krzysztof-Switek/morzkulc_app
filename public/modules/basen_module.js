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
  const tabs = [
    { id: "sessions", label: "Baseny" },
  ];
  if (isAdmin) tabs.push({ id: "admin", label: "Zarządzanie" });

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
  const remaining = slot.capacity - slot.enrolledCount;
  const isCancelled = slot.status === "cancelled";
  const isFull = !isCancelled && remaining <= 0;
  const isSauna = slotKey === "SAUNA";

  let spotsHtml;
  if (isCancelled) spotsHtml = `<span class="basenSpotsFull">Odwołane</span>`;
  else if (isFull) spotsHtml = `<span class="basenSpotsFull">Brak miejsc</span>`;
  else spotsHtml = `<span class="basenSpots">${remaining} miejsc wolnych</span>`;

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

// ─── Admin view ───────────────────────────────────────────────────────────────

function renderAdminView(innerEl, ctx) {
  innerEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">

      <div class="basenAdminSection">
        <h3>Utwórz termin</h3>
        <form id="basenCreateForm" class="basenAdminForm" autocomplete="off">
          <div class="row">
            <label for="bDate">Data *</label>
            <input id="bDate" type="date" min="${todayIso()}" required />
          </div>

          <div class="basenFormGrid">
            <div class="row">
              <label for="bH1Start">H1 — od</label>
              <input id="bH1Start" type="time" />
            </div>
            <div class="row">
              <label for="bH1End">H1 — do</label>
              <input id="bH1End" type="time" />
            </div>
            <div class="row">
              <label for="bH1Cap">H1 — limit miejsc</label>
              <input id="bH1Cap" type="number" min="1" max="100" placeholder="Domyślny" />
            </div>
          </div>

          <div class="basenFormGrid">
            <div class="row">
              <label for="bH2Start">H2 — od</label>
              <input id="bH2Start" type="time" />
            </div>
            <div class="row">
              <label for="bH2End">H2 — do</label>
              <input id="bH2End" type="time" />
            </div>
            <div class="row">
              <label for="bH2Cap">H2 — limit miejsc</label>
              <input id="bH2Cap" type="number" min="1" max="100" placeholder="Domyślny" />
            </div>
          </div>

          <label class="basenCheckLabel">
            <input id="bSaunaEnabled" type="checkbox" />
            Sauna
          </label>
          <div class="basenFormGrid" id="bSaunaFields" style="display:none;">
            <div class="row">
              <label for="bSaunaStart">Sauna — od</label>
              <input id="bSaunaStart" type="time" />
            </div>
            <div class="row">
              <label for="bSaunaEnd">Sauna — do</label>
              <input id="bSaunaEnd" type="time" />
            </div>
            <div class="row">
              <label for="bSaunaCap">Sauna — limit miejsc</label>
              <input id="bSaunaCap" type="number" min="1" max="100" placeholder="Domyślny" />
            </div>
          </div>

          <div class="row">
            <label for="bNotes">Uwagi</label>
            <textarea id="bNotes" rows="2" maxlength="500"></textarea>
          </div>
          <div id="bCreateErr" class="err hidden" style="margin-top:8px;"></div>
          <div id="bCreateOk" class="ok hidden" style="margin-top:8px;"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="bCreateBtn" type="submit" class="primary">Utwórz termin</button>
          </div>
        </form>
      </div>

      <div class="basenAdminSection">
        <h3>Anuluj termin / slot</h3>
        <form id="basenCancelSessionForm" class="basenAdminForm" autocomplete="off">
          <div class="row">
            <label for="bCancelSessionId">ID terminu</label>
            <input id="bCancelSessionId" type="text" placeholder="ID z listy terminów" required />
          </div>
          <div class="row">
            <label for="bCancelSlot">Slot</label>
            <select id="bCancelSlot">
              <option value="">Cały dzień</option>
              <option value="H1">I godzina (H1)</option>
              <option value="H2">II godzina (H2)</option>
              <option value="SAUNA">Sauna</option>
            </select>
          </div>
          <div id="bCancelErr" class="err hidden" style="margin-top:8px;"></div>
          <div id="bCancelOk" class="ok hidden" style="margin-top:8px;"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="bCancelBtn" type="submit" class="danger">Anuluj</button>
          </div>
        </form>
      </div>

    </div>
  `;

  bindAdminActions(innerEl, ctx);
}

function bindAdminActions(innerEl, ctx) {
  // Sauna toggle
  const saunaCheck = innerEl.querySelector("#bSaunaEnabled");
  const saunaFields = innerEl.querySelector("#bSaunaFields");
  saunaCheck?.addEventListener("change", () => {
    saunaFields.style.display = saunaCheck.checked ? "" : "none";
  });

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
    if (!date) { setCreateErr("Wypełnij datę."); return; }

    const h1 = {
      timeStart: innerEl.querySelector("#bH1Start")?.value || "",
      timeEnd: innerEl.querySelector("#bH1End")?.value || "",
      capacity: Number(innerEl.querySelector("#bH1Cap")?.value || 0) || undefined,
    };
    const h2 = {
      timeStart: innerEl.querySelector("#bH2Start")?.value || "",
      timeEnd: innerEl.querySelector("#bH2End")?.value || "",
      capacity: Number(innerEl.querySelector("#bH2Cap")?.value || 0) || undefined,
    };
    const saunaEnabled = innerEl.querySelector("#bSaunaEnabled")?.checked === true;
    const sauna = saunaEnabled ? {
      enabled: true,
      timeStart: innerEl.querySelector("#bSaunaStart")?.value || "",
      timeEnd: innerEl.querySelector("#bSaunaEnd")?.value || "",
      capacity: Number(innerEl.querySelector("#bSaunaCap")?.value || 0) || undefined,
    } : undefined;
    const notes = String(innerEl.querySelector("#bNotes")?.value || "").trim();

    createBtn.disabled = true;
    createBtn.textContent = "Tworzę…";

    try {
      const data = await apiPostJson({
        url: CREATE_SESSION_URL,
        idToken: ctx.idToken,
        body: { date, h1, h2, sauna, notes },
      });
      setCreateOk(`Termin utworzony (ID: ${data.sessionId})`);
      createForm.reset();
      if (saunaFields) saunaFields.style.display = "none";
    } catch (e) {
      setCreateErr(e?.message || "Nie udało się utworzyć terminu.");
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Utwórz termin";
    }
  });

  // Cancel session/slot form
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
    const slot = String(innerEl.querySelector("#bCancelSlot")?.value || "").trim();
    if (!sessionId) { setCancelErr("Podaj ID terminu."); return; }
    if (!confirm(`Anulować ${slot ? `slot ${slot}` : "cały termin"} (${sessionId})? Wszyscy uczestnicy zostaną wypisani.`)) return;

    cancelBtn.disabled = true;
    cancelBtn.textContent = "Anuluję…";
    setCancelErr("");
    setCancelOk("");

    try {
      const data = await apiPostJson({ url: CANCEL_SESSION_URL, idToken: ctx.idToken, body: { sessionId, slot: slot || undefined } });
      setCancelOk(`Anulowano. Wypisano ${data.cancelledEnrollments} uczestników.`);
      cancelSessionForm.reset();
    } catch (e) {
      setCancelErr(e?.message || "Nie udało się anulować.");
    } finally {
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Anuluj";
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
      const validTabs = ["sessions", ...(isAdmin ? ["admin"] : [])];
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

      if (activeTab === "admin" && isAdmin) {
        renderAdminView(innerEl, ctx);
      } else {
        await renderSessionsView(innerEl, ctx, canEnroll);
      }
    },
  };
}
