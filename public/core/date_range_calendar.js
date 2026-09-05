// Lekki, współdzielony kalendarz wyboru zakresu dat (start/stop klikami na siatce
// miesiąca) — zajęte dni pomarańczowa obwódka + kłódka, wybrany zakres zielony.
// Zero zależności od domeny (sprzęt/kajaki) — przyjmuje dane, zwraca uchwyt do
// sterowania. Wzorowany na kalendarzu basenowym (public/modules/basen_module.js,
// public/core/render_shell.js::renderHomeBasenCalendar), ale generyczny: brak
// importu stąd do modułów (core świadomie nie zależy od modules/), moduły
// importują stąd — zgodnie z resztą public/core/.

const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const WEEKDAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "So", "Nd"];

// Musi być zgodne z domyślnym offsetDays w functions/src/modules/setup/setup_gear_vars.ts
// (blockStartIso/blockEndIso = startDate/endDate ± offsetDays) — tu tylko do podglądu,
// backend i tak jest autorytatywny przy zapisie.
const BUFFER_DAYS = 1;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoFromParts(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function addDaysIso(iso, delta) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return isoFromParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Lokalna data (nie UTC) — dzień zmienia się o północy czasu użytkownika, nie UTC.
function localTodayIso() {
  const d = new Date();
  return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDatePL(iso) {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function daysInclusive(startIso, endIso) {
  const a = new Date(`${startIso}T00:00:00Z`);
  const b = new Date(`${endIso}T00:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

function expandRangeDays(startIso, endIso) {
  const days = [];
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso && guard < 400) {
    days.push(cur);
    cur = addDaysIso(cur, 1);
    guard += 1;
  }
  return days;
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function lockIconSvg() {
  return `<svg class="gearCalLockIcon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="9.5" width="11" height="8" rx="1.5"/><path d="M7.5 9.5V7a2.5 2.5 0 015 0v2.5"/></svg>`;
}

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.containerEl - stabilny element, jego innerHTML jest zarządzany przez komponent
 * @param {string|null} [opts.initialStartIso]
 * @param {string|null} [opts.initialEndIso]
 * @param {(startIso: string|null, endIso: string|null, meta: {daysInclusive: number}) => void} [opts.onRangeChange]
 * @returns {{ setOccupiedRanges: (ranges: Array<{startIso:string,endIso:string,label?:string}>) => void, reset: () => void, getRange: () => {startIso: string|null, endIso: string|null} }}
 */
export function createReservationCalendar({ containerEl, initialStartIso = null, initialEndIso = null, onRangeChange }) {
  const todayIso = localTodayIso();
  const todayParts = todayIso.split("-").map(Number);

  const state = {
    year: initialStartIso ? Number(initialStartIso.slice(0, 4)) : todayParts[0],
    month: initialStartIso ? Number(initialStartIso.slice(5, 7)) - 1 : todayParts[1] - 1,
    rangeStart: initialStartIso || null,
    rangeEnd: initialEndIso || initialStartIso || null,
    occupied: [],
    message: "",
    conflictDates: [],
  };

  function isOccupied(dateIso) {
    return state.occupied.some((r) => dateIso >= r.startIso && dateIso <= r.endIso);
  }

  function occupiedInfoFor(dateIso) {
    return state.occupied.find((r) => dateIso >= r.startIso && dateIso <= r.endIso) || null;
  }

  // Dni zajęte w [loIso-BUFFER_DAYS, hiIso+BUFFER_DAYS] — nie tylko w samym [loIso,hiIso].
  // System doda bufor automatycznie do KAŻDEJ rezerwacji (patrz computeBlockIso na
  // backendzie), więc wybór graniczący z zajętym terminem też jest realnym konfliktem,
  // nawet jeśli same [loIso,hiIso] wyglądają na wolne.
  function bufferedConflictDays(loIso, hiIso) {
    const bLo = addDaysIso(loIso, -BUFFER_DAYS);
    const bHi = addDaysIso(hiIso, BUFFER_DAYS);
    return expandRangeDays(bLo, bHi).filter((d) => isOccupied(d));
  }

  function emitChange() {
    if (typeof onRangeChange !== "function") return;
    if (state.rangeStart && state.rangeEnd) {
      onRangeChange(state.rangeStart, state.rangeEnd, { daysInclusive: daysInclusive(state.rangeStart, state.rangeEnd) });
    } else {
      onRangeChange(null, null, { daysInclusive: 0 });
    }
  }

  function handleDayClick(dateIso) {
    if (dateIso < todayIso) return;

    if (isOccupied(dateIso)) {
      const info = occupiedInfoFor(dateIso);
      state.message = `${formatDatePL(info.startIso)} – ${formatDatePL(info.endIso)} — zajęte${info.label ? ` (${info.label})` : ""}`;
      state.conflictDates = [dateIso];
      draw();
      return;
    }

    state.conflictDates = [];

    if (!state.rangeStart) {
      const conflicts = bufferedConflictDays(dateIso, dateIso);
      if (conflicts.length) {
        state.message = "Ten dzień graniczy z zajętym terminem (system dolicza bufor) — wybierz inny.";
        state.conflictDates = conflicts;
      } else {
        state.rangeStart = dateIso;
        state.rangeEnd = dateIso;
        state.message = "";
      }
    } else if (state.rangeStart === state.rangeEnd) {
      if (dateIso === state.rangeStart) {
        state.rangeStart = null;
        state.rangeEnd = null;
        state.message = "";
      } else {
        const lo = dateIso < state.rangeStart ? dateIso : state.rangeStart;
        const hi = dateIso < state.rangeStart ? state.rangeStart : dateIso;
        const conflicts = bufferedConflictDays(lo, hi);
        if (conflicts.length) {
          state.message = "Wybrany zakres (z buforem) zachodzi na zajęty termin — wybierz inny.";
          state.conflictDates = conflicts;
        } else {
          state.rangeStart = lo;
          state.rangeEnd = hi;
          state.message = "";
        }
      }
    } else {
      const conflicts = bufferedConflictDays(dateIso, dateIso);
      if (conflicts.length) {
        state.message = "Ten dzień graniczy z zajętym terminem (system dolicza bufor) — wybierz inny.";
        state.conflictDates = conflicts;
      } else {
        state.rangeStart = dateIso;
        state.rangeEnd = dateIso;
        state.message = "";
      }
    }

    emitChange();
    draw();
  }

  function summaryHtml() {
    if (state.message) {
      return `<div class="gearCalSummary gearCalSummary--warn">${escapeHtml(state.message)}</div>`;
    }
    if (!state.rangeStart) {
      return "";
    }
    if (state.rangeStart === state.rangeEnd) {
      return `<div class="gearCalSummary">Start: <strong>${escapeHtml(formatDatePL(state.rangeStart))}</strong> — kliknij dzień zakończenia (albo ten sam dzień ponownie, żeby zarezerwować tylko jeden dzień).</div>`;
    }
    const n = daysInclusive(state.rangeStart, state.rangeEnd);
    return `<div class="gearCalSummary gearCalSummary--ok">Wybrany termin: <strong>${escapeHtml(formatDatePL(state.rangeStart))} – ${escapeHtml(formatDatePL(state.rangeEnd))}</strong> (${n} ${n === 1 ? "dzień" : "dni"}).</div>`;
  }

  function draw() {
    const { year, month } = state;
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadBlanks = (first.getDay() + 6) % 7;

    let cells = "";
    for (let i = 0; i < leadBlanks; i++) {
      cells += `<div class="gearCalDay gearCalDay--blank"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateIso = isoFromParts(year, month, day);

      if (dateIso < todayIso) {
        cells += `<div class="gearCalDay gearCalDay--past"><span class="gearCalDayNum">${day}</span></div>`;
        continue;
      }

      const occupied = isOccupied(dateIso);
      const inRange = state.rangeStart && state.rangeEnd && dateIso >= state.rangeStart && dateIso <= state.rangeEnd;
      const isEdge = dateIso === state.rangeStart || dateIso === state.rangeEnd;
      const isBuffer = !occupied && !inRange && state.rangeStart && state.rangeEnd &&
        (dateIso === addDaysIso(state.rangeStart, -BUFFER_DAYS) || dateIso === addDaysIso(state.rangeEnd, BUFFER_DAYS));
      const isConflict = state.conflictDates.includes(dateIso);

      let cls = "gearCalDay--available";
      if (occupied) cls = "gearCalDay--occupied";
      else if (inRange && isEdge) cls = "gearCalDay--edge gearCalDay--in-range";
      else if (inRange) cls = "gearCalDay--in-range";
      else if (isBuffer) cls = "gearCalDay--buffer";
      if (isConflict) cls += " gearCalDay--conflict";

      const icon = occupied ? lockIconSvg() : "";
      cells += `
        <button type="button" class="gearCalDay ${cls}" data-cal-date="${dateIso}" aria-label="${day}.${pad2(month + 1)}.${year}${occupied ? " — zajęte" : ""}">
          <span class="gearCalDayNum">${day}</span>
          ${icon}
        </button>
      `;
    }

    containerEl.innerHTML = `
      <div class="gearCal">
        <div class="gearCalHead">
          <button type="button" class="ghost gearCalNavBtn" data-cal-nav="prev" aria-label="Poprzedni miesiąc">&lsaquo;</button>
          <div class="gearCalTitle">${escapeHtml(MONTHS_PL[month])} ${year}</div>
          <button type="button" class="ghost gearCalNavBtn" data-cal-nav="next" aria-label="Następny miesiąc">&rsaquo;</button>
        </div>
        <div class="gearCalWeekdays">${WEEKDAYS_PL.map((w) => `<div class="gearCalWeekday">${w}</div>`).join("")}</div>
        <div class="gearCalGrid">${cells}</div>
        <div class="gearCalLegend">
          <span class="gearCalLegendItem"><span class="gearCalLegendSwatch gearCalLegendSwatch--occupied"></span>Zajęte</span>
          <span class="gearCalLegendItem"><span class="gearCalLegendSwatch gearCalLegendSwatch--selected"></span>Wybrany termin</span>
          <span class="gearCalLegendItem"><span class="gearCalLegendSwatch gearCalLegendSwatch--buffer"></span>Dzień bufora</span>
        </div>
        <div class="gearCalHint">Rezerwuj dni na wodzie — system automatycznie doda dzień bufora przed i po rezerwacji.</div>
        ${summaryHtml()}
      </div>
    `;
  }

  containerEl.addEventListener("click", (ev) => {
    const navBtn = ev.target.closest?.("[data-cal-nav]");
    if (navBtn) {
      state.month += navBtn.getAttribute("data-cal-nav") === "next" ? 1 : -1;
      if (state.month < 0) { state.month = 11; state.year -= 1; }
      if (state.month > 11) { state.month = 0; state.year += 1; }
      state.conflictDates = [];
      draw();
      return;
    }

    const dayBtn = ev.target.closest?.("[data-cal-date]");
    if (dayBtn) {
      handleDayClick(dayBtn.getAttribute("data-cal-date"));
    }
  });

  draw();
  if (state.rangeStart && state.rangeEnd) emitChange();

  return {
    setOccupiedRanges(ranges) {
      state.occupied = Array.isArray(ranges) ? ranges : [];
      state.conflictDates = [];
      draw();
    },
    reset() {
      state.rangeStart = null;
      state.rangeEnd = null;
      state.message = "";
      state.conflictDates = [];
      emitChange();
      draw();
    },
    getRange() {
      return { startIso: state.rangeStart, endIso: state.rangeEnd };
    },
  };
}
