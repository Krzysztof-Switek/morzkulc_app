import * as admin from "firebase-admin";
import {resolveFunctionRoleEmail} from "../setup/function_roles_service";
import {computeBasenGodzinyBalance, blockBasenGodzinyInTx, refundBasenGodzinyInTx} from "./basen_godziny_service";

// Maksymalna liczba uczestników jednego instruktora na jednym slocie — ustalone
// z użytkownikiem: instruktor może dopisać sobie max 2 osoby szukające instruktora
// (uczestnik z natury rzeczy paruje się z JEDNYM instruktorem — pole instructorUid
// jest pojedyncze, więc ten kierunek limitu wymuszony jest już przez model danych).
const MAX_STUDENTS_PER_INSTRUCTOR = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BasenSlotLabel = "H1" | "H2" | "SAUNA";
export type SlotStatus = "open" | "full" | "cancelled";
export type EnrollmentStatus = "active" | "cancelled";
export type EnrollmentType = "regular" | "training" | "instructor";

export interface BasenVars {
  // E-maile "opiekunów basenowych" — ci sami ludzie mają dostęp do zakładki Zarządzanie
  // co zarząd/KR (patrz registerUserHandler.ts::resolveBasenAdminGrant), niezależnie od
  // swojej roli klubowej. Zakładka Vars_BASEN, lista rozdzielona przecinkami.
  basen_admin_mail: string[];
  basen_limit_uczestnikow: number;
  basen_1_godzina_domyslna: string;
  basen_2_godzina_domyslna: string;
  basen_sauna: boolean;
  basen_sauna_cena: number;
  basen_okno_anulowania_h: number;
  // Wyłącznie informacyjne (ściągawka cenowa w zakładce Płatności) — nie napędzają
  // żadnej logiki, saldo godzin basenowych dopisuje admin ręcznie po wpłacie.
  basen_cena_za_godzine: number;
  basen_cena_za_karnet: number;
  basen_ile_wejsc_na_karnet: number;
}

export interface BasenReservedSpots {
  count: number;
  restrictedToKursant: boolean; // false = blokada ogólna, true = pula wyłącznie dla rola_kursant
  label?: string; // tylko dla blokady ogólnej — notatka admina, np. "grupa X"
  usedCount: number; // tylko dla restrictedToKursant — ile z puli kursanckiej zajęte
}

export interface BasenSlot {
  timeStart: string;
  timeEnd: string;
  capacity: number;
  enrolledCount: number; // WYŁĄCZNIE pula ogólna — bez zmian znaczenia dla slotów bez reservedSpots
  status: SlotStatus;
  reservedSpots?: BasenReservedSpots; // tylko H1/H2, nigdy SAUNA
}

export interface BasenSession {
  id: string;
  date: string;
  notes: string;
  slots: Partial<Record<BasenSlotLabel, BasenSlot>>;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface BasenEnrollment {
  id: string; // deterministyczne: `${sessionId}_${slot}_${uid}`
  sessionId: string;
  slot: BasenSlotLabel;
  userUid: string;
  userEmail: string;
  userDisplayName: string;
  type: EnrollmentType;
  instructorUid?: string | null; // uid sparowanego instruktora, tylko dla type="training"
  kayakId?: string | null; // id z gear_kayaks lub sentinel "PRIVATE"
  viaReservedPool?: boolean; // true tylko gdy zapis poszedł przez pulę kursancką (reservedSpots.restrictedToKursant)
  status: EnrollmentStatus;
  cancelledAt?: any;
  cancelledLate?: boolean; // true jeśli anulowano w oknie <cancellationWindowHours> — ślad dla rozliczeń
  createdAt: any;
  updatedAt: any;
}

export interface BasenKayakAllocation {
  id: string; // deterministyczne: `${sessionId}_${slot}_${kayakId}`
  sessionId: string;
  slot: BasenSlotLabel;
  kayakId: string;
  enrollmentId: string;
  uid: string;
  createdAt: any;
}

export interface SlotAttendee {
  userUid: string;
  userDisplayName: string;
}

export interface SlotAttendeesResult {
  // JEDYNI konsumenci: dropdown wyboru instruktora przy zapisie i w "Modyfikuj zapis"
  // (public/modules/basen_module.js) — pełna lista uczestników slotu (kto z kim,
  // kto szuka instruktora) pokazywana jest OD RAZU na karcie slotu, patrz
  // getAttendeesBySessionSlot/getBasenSessionsHandler.ts, nie tędy.
  instructors: SlotAttendee[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function norm(v: any): string {
  return String(v || "").trim();
}

function parseVarValue(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "value" in v) return v.value;
  return v;
}

// Lista e-maili rozdzielona przecinkami — wzorem flattenEmails() z index.ts (index.ts
// nie może być importowany tutaj, bo importuje ten moduł — więc lokalna kopia).
function splitEmails(raw: any): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

export async function getBasenVars(db: FirebaseFirestore.Firestore): Promise<BasenVars> {
  const snap = await db.collection("setup").doc("vars_basen").get();
  const vars = (snap.exists ? (snap.data() as any)?.vars || {} : {}) as Record<string, any>;

  return {
    basen_admin_mail: splitEmails(parseVarValue(vars["basen_admin_mail"])),
    // Klucz arkusza ma polskie znaki ("uczestników") — kod dostosowany do arkusza, nie odwrotnie.
    basen_limit_uczestnikow: Number(parseVarValue(vars["basen_limit_uczestników"]) ?? 15),
    basen_1_godzina_domyslna: String(parseVarValue(vars["basen_1_godzina_domyslna"]) ?? "19:00"),
    basen_2_godzina_domyslna: String(parseVarValue(vars["basen_2_godzina_domyslna"]) ?? "21:00"),
    basen_sauna: Boolean(parseVarValue(vars["basen_sauna"]) ?? false),
    basen_sauna_cena: Number(parseVarValue(vars["basen_sauna_cena"]) ?? 0),
    // Klucz arkusza to "basen_rezygnacja_za_darmo" (ten sam koncept, inna nazwa historycznie w arkuszu).
    basen_okno_anulowania_h: Number(parseVarValue(vars["basen_rezygnacja_za_darmo"]) ?? 24),
    basen_cena_za_godzine: Number(parseVarValue(vars["basen_cena_za_godzine"]) ?? 0),
    basen_cena_za_karnet: Number(parseVarValue(vars["basen_cena_za_karnet"]) ?? 0),
    basen_ile_wejsc_na_karnet: Number(parseVarValue(vars["basen_ile_wejść_na_karnet"]) ?? 0),
  };
}

export function sessionSlotDatetimeMs(
  session: Pick<BasenSession, "date">,
  slotData: Pick<BasenSlot, "timeStart"> | undefined | null
): number {
  if (!slotData?.timeStart) return 0;
  try {
    return new Date(`${session.date}T${slotData.timeStart}:00`).getTime();
  } catch {
    return 0;
  }
}

export interface SlotAvailability {
  remaining: number; // dla TEGO widza — z puli kursanckiej gdy dotyczy, inaczej z puli ogólnej
  isFull: boolean;
  viaReservedPool: boolean; // true = ten widz rezerwuje/rezerwowałby z puli kursanckiej
  generalCapacity: number; // capacity - (reservedSpots?.count ?? 0)
  generalRemaining: number;
}

// Matematyka dostępności slotu, zależna od roli widza — kursant na slocie z
// reservedSpots.restrictedToKursant rezerwuje WYŁĄCZNIE z własnej puli, nigdy z
// ogólnej (potwierdzone przez użytkownika — inaczej niż standardowo, gdzie kursant
// ma pełne prawa członka). Dla slotu bez reservedSpots kolapsuje do dzisiejszego
// capacity - enrolledCount, zero regresji. Współdzielone przez enrollInSlot
// (walidacja) i getBasenSessionsHandler (odpowiedź) — jedno źródło rozgałęzień.
export function computeSlotAvailability(slot: BasenSlot, isKursant: boolean): SlotAvailability {
  const reserved = slot.reservedSpots;
  const generalCapacity = Math.max(0, slot.capacity - (reserved?.count ?? 0));
  const generalRemaining = Math.max(0, generalCapacity - slot.enrolledCount);

  if (isKursant && reserved && reserved.restrictedToKursant === true) {
    const remaining = Math.max(0, reserved.count - reserved.usedCount);
    return {remaining, isFull: remaining <= 0, viaReservedPool: true, generalCapacity, generalRemaining};
  }
  return {remaining: generalRemaining, isFull: generalRemaining <= 0, viaReservedPool: false, generalCapacity, generalRemaining};
}

function kayakAllocationId(sessionId: string, slot: BasenSlotLabel, kayakId: string): string {
  return `${sessionId}_${slot}_${kayakId}`;
}

function enrollmentId(sessionId: string, slot: BasenSlotLabel, uid: string): string {
  return `${sessionId}_${slot}_${uid}`;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function listUpcomingSessions(
  db: FirebaseFirestore.Firestore
): Promise<BasenSession[]> {
  const today = todayIso();
  const snap = await db
    .collection("basen_sessions")
    .where("date", ">=", today)
    .orderBy("date", "asc")
    .get();

  const sessions = snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenSession));

  // Ukryj dni, w których WSZYSTKIE sloty są anulowane (nic do pokazania/zapisu).
  return sessions.filter((s) => {
    const slots = Object.values(s.slots || {});
    return slots.some((slot) => slot && slot.status !== "cancelled");
  });
}

export async function getUserEnrollments(
  db: FirebaseFirestore.Firestore,
  userUid: string
): Promise<BasenEnrollment[]> {
  const snap = await db
    .collection("basen_enrollments")
    .where("userUid", "==", userUid)
    .where("status", "==", "active")
    .get();

  return snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenEnrollment));
}

/**
 * Kto na KTÓRYM terminie/slocie "szuka instruktora" (type="training", brak
 * instructorUid) — pogrupowane po `${sessionId}_${slot}`, żeby lista basenów mogła
 * pokazać to OD RAZU (bez rozwijania "Uczestnicy"), bez osobnego zapytania per slot.
 * Celowo bez kajaka — niepotrzebny do dopasowania instruktora.
 */
export interface SimpleAttendee {
  userUid: string;
  displayLabel: string; // ksywka, a jak brak to imię+nazwisko — NIGDY oba naraz (prosta lista)
  type: EnrollmentType;
  instructorUid: string | null;
}

/**
 * Pełna lista uczestników KAŻDEGO terminu/slotu naraz, pogrupowana po
 * `${sessionId}_${slot}` — zastępuje osobne zapytanie per slot (dawne
 * listSlotAttendees + rozwijana lista), żeby "Uczestnicy" mogli być pokazani OD RAZU,
 * prostą płaską listą, bez klikania w cokolwiek. Bez kajaka — świadomie pominięty,
 * niepotrzebny do samego zorientowania się kto jest zapisany / kto szuka instruktora.
 */
export async function getAttendeesBySessionSlot(
  db: FirebaseFirestore.Firestore
): Promise<Map<string, SimpleAttendee[]>> {
  const snap = await db.collection("basen_enrollments")
    .where("status", "==", "active")
    .get();

  const enrollments = snap.docs.map((d) => d.data() as BasenEnrollment);

  const uniqueUids = Array.from(new Set(enrollments.map((e) => e.userUid)));
  const nicknameByUid = new Map<string, string>();
  await Promise.all(uniqueUids.map(async (uid) => {
    const userSnap = await db.collection("users_active").doc(uid).get();
    const nick = String((userSnap.data() as any)?.profile?.nickname || "").trim();
    if (nick) nicknameByUid.set(uid, nick);
  }));

  const byKey = new Map<string, SimpleAttendee[]>();
  for (const e of enrollments) {
    const key = `${e.sessionId}_${e.slot}`;
    const list = byKey.get(key) || [];
    list.push({
      userUid: e.userUid,
      displayLabel: nicknameByUid.get(e.userUid) || e.userDisplayName,
      type: e.type,
      instructorUid: e.instructorUid || null,
    });
    byKey.set(key, list);
  }
  return byKey;
}

export interface ReservedSpotsInput {
  count: number;
  restrictedToKursant: boolean;
  label?: string;
}

// Godziny i capacity ZAWSZE z setupu (basen_1/2_godzina_domyslna, basen_limit_uczestnikow)
// — klient nie nadpisuje ich per termin (zmiana godzin = zmiana w arkuszu, nie w aplikacji).
export async function createSession(
  db: FirebaseFirestore.Firestore,
  args: {
    date: string;
    saunaEnabled: boolean;
    h1Reserved?: ReservedSpotsInput;
    h2Reserved?: ReservedSpotsInput;
    notes: string;
    createdBy: string;
    vars: BasenVars;
  }
): Promise<string> {
  // ID DETERMINISTYCZNE = data (nie auto-ID) — jedyny sposób żeby Firestore sam
  // zagwarantował "jeden zestaw basenów na jeden dzień, niezależnie który admin je
  // dodaje". Bez tego dwaj opiekunowie klikający "Nowy termin" na ten sam dzień
  // niemal jednocześnie (żaden jeszcze nie widział zapisu drugiego) tworzyli DWA
  // osobne dokumenty dla tej samej daty — realny incydent na prod (01.09.2026).
  const ref = db.collection("basen_sessions").doc(args.date);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const buildReserved = (r?: ReservedSpotsInput): BasenReservedSpots | undefined =>
    r && r.count > 0 ? {
      count: r.count,
      restrictedToKursant: r.restrictedToKursant === true,
      label: r.restrictedToKursant ? undefined : (r.label || undefined),
      usedCount: 0,
    } : undefined;

  const h1Reserved = buildReserved(args.h1Reserved);
  const h2Reserved = buildReserved(args.h2Reserved);

  const slots: Partial<Record<BasenSlotLabel, BasenSlot>> = {
    H1: {
      timeStart: args.vars.basen_1_godzina_domyslna,
      timeEnd: args.vars.basen_1_godzina_domyslna,
      capacity: args.vars.basen_limit_uczestnikow,
      enrolledCount: 0,
      status: "open",
      ...(h1Reserved ? {reservedSpots: h1Reserved} : {}),
    },
    H2: {
      timeStart: args.vars.basen_2_godzina_domyslna,
      timeEnd: args.vars.basen_2_godzina_domyslna,
      capacity: args.vars.basen_limit_uczestnikow,
      enrolledCount: 0,
      status: "open",
      ...(h2Reserved ? {reservedSpots: h2Reserved} : {}),
    },
  };

  if (args.saunaEnabled) {
    slots.SAUNA = {
      timeStart: args.vars.basen_1_godzina_domyslna,
      timeEnd: args.vars.basen_1_godzina_domyslna,
      capacity: args.vars.basen_limit_uczestnikow,
      enrolledCount: 0,
      status: "open",
    };
  }

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      throw new Error("Termin na ten dzień już istnieje — odśwież kalendarz i sprawdź istniejący termin zamiast tworzyć nowy.");
    }
    tx.set(ref, {
      id: ref.id,
      date: args.date,
      notes: args.notes,
      slots,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  });

  return ref.id;
}

/**
 * Dodaje saunę do JUŻ ISTNIEJĄCEGO terminu, który powstał bez niej (jedyna dziś
 * dozwolona "modyfikacja" terminu po utworzeniu — reszta parametrów, godziny H1/H2,
 * jest i pozostaje sztywna z setupu). Te same domyślne wartości co przy tworzeniu
 * terminu z zaznaczoną sauną (godzina = basen_1_godzina_domyslna, capacity =
 * basen_limit_uczestnikow).
 */
export async function addSaunaToSession(
  db: FirebaseFirestore.Firestore,
  args: { sessionId: string; vars: BasenVars }
): Promise<void> {
  const sessionRef = db.collection("basen_sessions").doc(args.sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) throw new Error("Termin nie istnieje.");
    const session = snap.data() as BasenSession;

    if (session.date < todayIso()) throw new Error("Nie można modyfikować terminu z przeszłości.");
    if (session.slots?.SAUNA) throw new Error("Ten termin ma już saunę.");

    tx.update(sessionRef, {
      "slots.SAUNA": {
        timeStart: args.vars.basen_1_godzina_domyslna,
        timeEnd: args.vars.basen_1_godzina_domyslna,
        capacity: args.vars.basen_limit_uczestnikow,
        enrolledCount: 0,
        status: "open",
      },
      "updatedAt": now,
    });
  });
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

export async function enrollInSlot(
  db: FirebaseFirestore.Firestore,
  args: {
    sessionId: string;
    slot: BasenSlotLabel;
    uid: string;
    email: string;
    displayName: string;
    mode: "regular" | "training" | "instructor";
    instructorUid?: string;
    kayakId?: string; // id z gear_kayaks lub "PRIVATE"
    isKursant: boolean;
  }
): Promise<{ enrollmentId: string }> {
  const sessionRef = db.collection("basen_sessions").doc(args.sessionId);
  const eid = enrollmentId(args.sessionId, args.slot, args.uid);
  const enrollRef = db.collection("basen_enrollments").doc(eid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const hasKayak = Boolean(args.kayakId) && args.kayakId !== "PRIVATE";
  const allocationRef = hasKayak ?
    db.collection("basen_kayak_allocations").doc(kayakAllocationId(args.sessionId, args.slot, args.kayakId as string)) :
    null;

  const instructorEnrollRef = args.mode === "training" && args.instructorUid ?
    db.collection("basen_enrollments").doc(enrollmentId(args.sessionId, args.slot, args.instructorUid)) :
    null;

  const instructorStudentsQuery = args.mode === "training" && args.instructorUid ?
    db.collection("basen_enrollments")
      .where("sessionId", "==", args.sessionId)
      .where("slot", "==", args.slot)
      .where("instructorUid", "==", args.instructorUid)
      .where("status", "==", "active") :
    null;

  const godzinyLedgerRef = db.collection("basen_godziny_ledger").doc();

  await db.runTransaction(async (tx) => {
    // ── wszystkie odczyty przed jakimkolwiek zapisem ──
    const [sessionSnap, existingEnrollSnap, allocationSnap, instructorEnrollSnap, godzinyLedgerSnap, instructorStudentsSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(enrollRef),
      allocationRef ? tx.get(allocationRef) : Promise.resolve(null),
      instructorEnrollRef ? tx.get(instructorEnrollRef) : Promise.resolve(null),
      tx.get(db.collection("basen_godziny_ledger").where("uid", "==", args.uid)),
      instructorStudentsQuery ? tx.get(instructorStudentsQuery) : Promise.resolve(null),
    ]);

    if (!sessionSnap.exists) throw new Error("Termin nie istnieje.");
    const session = sessionSnap.data() as BasenSession;
    if (session.date < todayIso()) throw new Error("Nie można zapisać się na przeszły termin.");

    const slotData = session.slots?.[args.slot];
    if (!slotData) throw new Error("Slot nie istnieje dla tego terminu.");
    if (slotData.status === "cancelled") throw new Error("Slot jest anulowany.");

    if (existingEnrollSnap && existingEnrollSnap.exists) {
      const existing = existingEnrollSnap.data() as BasenEnrollment;
      if (existing.status === "active") throw new Error("Jesteś już zapisany/a na ten slot.");
    }

    let availability: SlotAvailability | null = null;
    if (args.mode !== "instructor") {
      availability = computeSlotAvailability(slotData, args.isKursant);
      if (availability.isFull) throw new Error("Slot jest już pełny.");

      const godzinyRecords = godzinyLedgerSnap.docs.map((d) => d.data() as any);
      const balance = computeBasenGodzinyBalance(godzinyRecords);
      if (balance < 1) {
        throw new Error("Brak dostępnych godzin basenowych. Skontaktuj się z opiekunem basenu, aby dopisać godziny.");
      }
    }

    // instructorUid jest OPCJONALNY dla mode="training": brak instruktora → zapis
    // powstaje jako "szuka instruktora" (patrz listSlotAttendees: seekingInstructor).
    // Doparowanie później: sam user przez setEnrollmentInstructor (modyfikacja zapisu)
    // albo instruktor przez claimWaitingStudent (przypisanie do siebie z listy).
    if (args.mode === "training" && args.instructorUid) {
      const instrData = instructorEnrollSnap && instructorEnrollSnap.exists ?
        (instructorEnrollSnap.data() as BasenEnrollment) :
        null;
      if (!instrData || instrData.status !== "active" || instrData.type !== "instructor") {
        throw new Error("Wybrany instruktor nie jest już dostępny na ten slot.");
      }
      if (instructorStudentsSnap && instructorStudentsSnap.size >= MAX_STUDENTS_PER_INSTRUCTOR) {
        throw new Error(`Ten instruktor ma już maksymalną liczbę uczestników (${MAX_STUDENTS_PER_INSTRUCTOR}).`);
      }
    }

    if (allocationRef && allocationSnap && allocationSnap.exists) {
      throw new Error("Ten kajak jest już zajęty dla tej godziny.");
    }

    // ── zapisy ──
    if (args.mode !== "instructor" && availability) {
      if (availability.viaReservedPool) {
        const newUsed = (slotData.reservedSpots?.usedCount ?? 0) + 1;
        tx.update(sessionRef, {
          [`slots.${args.slot}.reservedSpots.usedCount`]: newUsed,
          updatedAt: now,
        }); // status ogólny NIE dotykany — odzwierciedla wyłącznie pulę ogólną
      } else {
        const newCount = slotData.enrolledCount + 1;
        const newStatus: SlotStatus = newCount >= availability.generalCapacity ? "full" : "open";
        tx.update(sessionRef, {
          [`slots.${args.slot}.enrolledCount`]: newCount,
          [`slots.${args.slot}.status`]: newStatus,
          updatedAt: now,
        });
      }
    }

    if (allocationRef) {
      tx.set(allocationRef, {
        id: allocationRef.id,
        sessionId: args.sessionId,
        slot: args.slot,
        kayakId: args.kayakId,
        enrollmentId: eid,
        uid: args.uid,
        createdAt: now,
      });
    }

    tx.set(enrollRef, {
      id: eid,
      sessionId: args.sessionId,
      slot: args.slot,
      userUid: args.uid,
      userEmail: args.email,
      userDisplayName: args.displayName,
      type: args.mode,
      instructorUid: args.mode === "training" ? (args.instructorUid || null) : null,
      kayakId: args.kayakId || null,
      viaReservedPool: (args.mode !== "instructor" && availability?.viaReservedPool) === true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    if (args.mode !== "instructor") {
      blockBasenGodzinyInTx(tx, godzinyLedgerRef, {
        uid: args.uid,
        sessionId: args.sessionId,
        slot: args.slot,
        enrollmentId: eid,
        performedBy: args.uid,
      });
    }
  });

  return {enrollmentId: eid};
}

export async function cancelEnrollment(
  db: FirebaseFirestore.Firestore,
  args: {
    sessionId: string;
    slot: BasenSlotLabel;
    uid: string;
    cancellationWindowHours: number;
  }
): Promise<{ wasLate: boolean }> {
  const eid = enrollmentId(args.sessionId, args.slot, args.uid);
  const enrollRef = db.collection("basen_enrollments").doc(eid);
  const sessionRef = db.collection("basen_sessions").doc(args.sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  let wasLate = false;

  await db.runTransaction(async (tx) => {
    const [enrollSnap, sessionSnap] = await Promise.all([tx.get(enrollRef), tx.get(sessionRef)]);
    if (!enrollSnap.exists) throw new Error("Zapis nie istnieje.");

    const enrollment = enrollSnap.data() as BasenEnrollment;
    if (enrollment.status === "cancelled") throw new Error("Zapis jest już anulowany.");
    if (!sessionSnap.exists) throw new Error("Termin nie istnieje.");

    const session = sessionSnap.data() as BasenSession;
    const slotData = session.slots?.[args.slot] || null;

    // Okno anulowania JUŻ NIE BLOKUJE anulowania (potwierdzone z użytkownikiem: można
    // zrezygnować nawet <24h przed, ale nadal obowiązuje pełna opłata za tę godzinę
    // basenową jak za obecność) — tylko oznaczamy zapis jako spóźniony, żeby ślad
    // dotarł do kogoś rozliczającego płatności. Pomijane, gdy slot już anulowany
    // przez admina (sprzątanie po jego akcji, nie "spóźniona rezygnacja" usera).
    if (slotData && slotData.status !== "cancelled") {
      const slotMs = sessionSlotDatetimeMs(session, slotData);
      const windowMs = args.cancellationWindowHours * 60 * 60 * 1000;
      wasLate = slotMs > 0 && Date.now() + windowMs > slotMs;
    }

    // ── zapisy ──
    if (slotData && slotData.status !== "cancelled" && enrollment.type !== "instructor") {
      if (enrollment.viaReservedPool) {
        const newUsed = Math.max(0, (slotData.reservedSpots?.usedCount ?? 0) - 1);
        tx.update(sessionRef, {
          [`slots.${args.slot}.reservedSpots.usedCount`]: newUsed,
          updatedAt: now,
        });
      } else {
        const newCount = Math.max(0, slotData.enrolledCount - 1);
        const generalCapacity = Math.max(0, slotData.capacity - (slotData.reservedSpots?.count ?? 0));
        const newStatus: SlotStatus = newCount < generalCapacity ? "open" : "full";
        tx.update(sessionRef, {
          [`slots.${args.slot}.enrolledCount`]: newCount,
          [`slots.${args.slot}.status`]: newStatus,
          updatedAt: now,
        });
      }
    }

    if (enrollment.kayakId && enrollment.kayakId !== "PRIVATE") {
      const allocationRef = db.collection("basen_kayak_allocations")
        .doc(kayakAllocationId(args.sessionId, args.slot, enrollment.kayakId));
      tx.delete(allocationRef);
    }

    // Godzina wraca na saldo tylko gdy anulowano na czas (>=okno) lub slot anulował admin
    // (wasLate zostaje false w tym przypadku — patrz komentarz wyżej). Spóźniona rezygnacja
    // usera → godzina przepada, żaden nowy rekord ledgera nie powstaje (booking_block zostaje).
    if (enrollment.type !== "instructor" && !wasLate) {
      const godzinyLedgerRef = db.collection("basen_godziny_ledger").doc();
      refundBasenGodzinyInTx(tx, godzinyLedgerRef, {
        uid: args.uid,
        sessionId: args.sessionId,
        slot: args.slot,
        enrollmentId: eid,
        performedBy: args.uid,
      });
    }

    tx.update(enrollRef, {status: "cancelled", cancelledAt: now, updatedAt: now, cancelledLate: wasLate});
  });

  return {wasLate};
}

// Dodaje/zmienia/usuwa parowanie z instruktorem na JUŻ AKTYWNYM zapisie (dziś
// parowanie było możliwe wyłącznie w momencie tworzenia zapisu). Nie dotyka
// capacity/enrolledCount/reservedSpots — to wciąż to samo zajęte miejsce, tylko
// zmienia się jego typ/adnotacja.
export async function setEnrollmentInstructor(
  db: FirebaseFirestore.Firestore,
  args: {
    sessionId: string;
    slot: BasenSlotLabel;
    uid: string;
    instructorUid: string | null;
    // Rozróżnia DWA różne znaczenia instructorUid=null: false (domyślnie) = user
    // rezygnuje z parowania całkowicie → "regular". true = user nadal chce instruktora,
    // ale żaden jeszcze nie jest dostępny → zostaje "training" bez instructorUid
    // (widoczny w listSlotAttendees jako seekingInstructor, można potem doparować przez
    // to samo wywołanie z instructorUid ustawionym, albo przez claimWaitingStudent).
    seeking?: boolean;
  }
): Promise<void> {
  const eid = enrollmentId(args.sessionId, args.slot, args.uid);
  const enrollRef = db.collection("basen_enrollments").doc(eid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const instructorEnrollRef = args.instructorUid ?
    db.collection("basen_enrollments").doc(enrollmentId(args.sessionId, args.slot, args.instructorUid)) :
    null;

  const instructorStudentsQuery = args.instructorUid ?
    db.collection("basen_enrollments")
      .where("sessionId", "==", args.sessionId)
      .where("slot", "==", args.slot)
      .where("instructorUid", "==", args.instructorUid)
      .where("status", "==", "active") :
    null;

  await db.runTransaction(async (tx) => {
    const [enrollSnap, instructorEnrollSnap, instructorStudentsSnap] = await Promise.all([
      tx.get(enrollRef),
      instructorEnrollRef ? tx.get(instructorEnrollRef) : Promise.resolve(null),
      instructorStudentsQuery ? tx.get(instructorStudentsQuery) : Promise.resolve(null),
    ]);

    if (!enrollSnap.exists) throw new Error("Zapis nie istnieje.");
    const enrollment = enrollSnap.data() as BasenEnrollment;
    if (enrollment.status !== "active") throw new Error("Zapis jest anulowany.");
    if (enrollment.type === "instructor") throw new Error("Instruktor nie paruje się sam ze sobą.");

    if (args.instructorUid) {
      if (args.instructorUid === args.uid) throw new Error("Nie możesz wybrać samego siebie jako instruktora.");
      if (instructorStudentsSnap) {
        const currentCount = instructorStudentsSnap.docs.filter((d) => d.id !== eid).length;
        if (currentCount >= MAX_STUDENTS_PER_INSTRUCTOR) {
          throw new Error(`Ten instruktor ma już maksymalną liczbę uczestników (${MAX_STUDENTS_PER_INSTRUCTOR}).`);
        }
      }
      const instrData = instructorEnrollSnap && instructorEnrollSnap.exists ?
        (instructorEnrollSnap.data() as BasenEnrollment) :
        null;
      if (!instrData || instrData.status !== "active" || instrData.type !== "instructor") {
        throw new Error("Wybrany instruktor nie jest już dostępny na ten slot.");
      }
    }

    tx.update(enrollRef, {
      type: args.instructorUid || args.seeking ? "training" : "regular",
      instructorUid: args.instructorUid || null,
      updatedAt: now,
    });
  });
}

// Basen jest zawsze anulowany W CAŁOŚCI (H1+H2+SAUNA razem, jeśli istnieją) — nigdy
// pojedynczym slotem osobno. Świadoma decyzja: "anulujemy cały dzień, a nie
// poszczególne sloty" — kod celowo nie przyjmuje już parametru slot.
export async function cancelSession(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  performedBy: string
): Promise<{ enrollments: BasenEnrollment[] }> {
  const sessionRef = db.collection("basen_sessions").doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const sessionSnapPre = await sessionRef.get();
  if (!sessionSnapPre.exists) throw new Error("Termin nie istnieje.");
  const sessionPre = sessionSnapPre.data() as BasenSession;

  const allLabels = Object.keys(sessionPre.slots || {}) as BasenSlotLabel[];

  if (allLabels.every((l) => sessionPre.slots?.[l]?.status === "cancelled")) {
    throw new Error("Termin jest już anulowany.");
  }

  const activeLabels = allLabels.filter((l) => {
    const s = sessionPre.slots?.[l];
    return Boolean(s) && s?.status !== "cancelled";
  });

  // Odczyt aktywnych zapisów PRZED transakcją (jak w dotychczasowym cancelSession) —
  // filtrowanie po slocie w pamięci, żeby reużyć istniejący indeks (sessionId, status).
  const enrollmentsSnap = await db.collection("basen_enrollments")
    .where("sessionId", "==", sessionId)
    .where("status", "==", "active")
    .get();
  const enrollments = enrollmentsSnap.docs
    .map((d) => ({id: d.id, ...d.data()} as BasenEnrollment))
    .filter((e) => activeLabels.includes(e.slot));

  // Ledger refs utworzone PRZED transakcją (auto-id, jak enrollRef/allocationRef gdzie
  // indziej) — jeden na każdy zapis, który realnie zablokował godzinę (nie instruktor).
  const godzinyRefsByEnrollmentId = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const e of enrollments) {
    if (e.type !== "instructor") {
      godzinyRefsByEnrollmentId.set(e.id, db.collection("basen_godziny_ledger").doc());
    }
  }

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new Error("Termin nie istnieje.");

    // ── zapisy ──
    const slotUpdate: Record<string, any> = {updatedAt: now};
    for (const l of activeLabels) slotUpdate[`slots.${l}.status`] = "cancelled";
    tx.update(sessionRef, slotUpdate);

    for (const e of enrollments) {
      tx.update(db.collection("basen_enrollments").doc(e.id), {status: "cancelled", cancelledAt: now, updatedAt: now});

      if (e.kayakId && e.kayakId !== "PRIVATE") {
        tx.delete(db.collection("basen_kayak_allocations").doc(kayakAllocationId(e.sessionId, e.slot, e.kayakId)));
      }

      // Anulowanie przez admina — UŻYTKOWNIK NIGDY nie płaci za termin którego nie
      // odwołał sam (bez względu na to, ile czasu zostało do zajęć). Zawsze pełny
      // zwrot godziny, w odróżnieniu od cancelEnrollment (gdzie <24h = przepada).
      const ledgerRef = godzinyRefsByEnrollmentId.get(e.id);
      if (ledgerRef) {
        refundBasenGodzinyInTx(tx, ledgerRef, {
          uid: e.userUid,
          sessionId: e.sessionId,
          slot: e.slot,
          enrollmentId: e.id,
          performedBy,
        });
      }
    }
  });

  return {enrollments};
}

// ─── Kajaki basenowe ─────────────────────────────────────────────────────────

export async function setEnrollmentKayak(
  db: FirebaseFirestore.Firestore,
  args: {
    sessionId: string;
    slot: BasenSlotLabel;
    uid: string;
    kayakId: string | null; // null/"" = zwolnij; "PRIVATE" = kajak prywatny
  }
): Promise<void> {
  const eid = enrollmentId(args.sessionId, args.slot, args.uid);
  const enrollRef = db.collection("basen_enrollments").doc(eid);
  const nextKayakId = args.kayakId && args.kayakId.trim() ? args.kayakId.trim() : null;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const newAllocationRef = nextKayakId && nextKayakId !== "PRIVATE" ?
    db.collection("basen_kayak_allocations").doc(kayakAllocationId(args.sessionId, args.slot, nextKayakId)) :
    null;

  await db.runTransaction(async (tx) => {
    const [enrollSnap, newAllocationSnap] = await Promise.all([
      tx.get(enrollRef),
      newAllocationRef ? tx.get(newAllocationRef) : Promise.resolve(null),
    ]);

    if (!enrollSnap.exists) throw new Error("Zapis nie istnieje.");
    const enrollment = enrollSnap.data() as BasenEnrollment;
    if (enrollment.status !== "active") throw new Error("Zapis jest anulowany.");

    const currentKayakId = enrollment.kayakId || null;
    if (currentKayakId === nextKayakId) return; // no-op

    if (newAllocationRef && newAllocationSnap && newAllocationSnap.exists) {
      throw new Error("Ten kajak jest już zajęty dla tej godziny.");
    }

    if (currentKayakId && currentKayakId !== "PRIVATE") {
      tx.delete(db.collection("basen_kayak_allocations").doc(kayakAllocationId(args.sessionId, args.slot, currentKayakId)));
    }

    if (newAllocationRef) {
      tx.set(newAllocationRef, {
        id: newAllocationRef.id,
        sessionId: args.sessionId,
        slot: args.slot,
        kayakId: nextKayakId,
        enrollmentId: eid,
        uid: args.uid,
        createdAt: now,
      });
    }

    tx.update(enrollRef, {kayakId: nextKayakId, updatedAt: now});
  });
}

// Nazwa+numer kajaka (np. "Optima 2 (nr 66)") zamiast surowego ID — współdzielone
// przez listAvailableBasenKayaks (wybór) i resolveKayakLabel (już wybrany kajak).
function kayakBaseLabel(k: any, fallbackId: string): string {
  const brand = norm(k?.brand);
  const model = norm(k?.model);
  // Numer kajaka = kolumna "number" w arkuszu, NIC innego. "id"/fallbackId to primary
  // key dokumentu (albo surowe ID zapisu), nigdy nie numer — kajaki prywatne legalnie
  // nie mają numeru i nie mogą dostać sfabrykowanego "nr {id}" zamiast tego.
  const number = norm(k?.number);
  const color = norm(k?.color);
  // Producent na pierwszym miejscu (najważniejszy), potem model/numer/kolor —
  // wszystko w jednej linii, bez słowa "Kajak" (kontekst już to mówi).
  const secondary = [model, number ? `nr ${number}` : "", color].filter(Boolean).join(", ");
  if (brand && secondary) return `${brand} — ${secondary}`;
  return brand || secondary || fallbackId;
}

// Nazwa+numer JUŻ wybranego kajaka (basen_enrollments.kayakId) — używane tam, gdzie
// pokazujemy istniejący zapis (własna karta slotu, lista uczestników), w
// odróżnieniu od listAvailableBasenKayaks (lista do wyboru przy zapisie).
export async function resolveKayakLabel(db: FirebaseFirestore.Firestore, kayakId: string): Promise<string> {
  if (kayakId === "PRIVATE") return "Kajak prywatny";
  const snap = await db.collection("gear_kayaks").doc(kayakId).get();
  if (!snap.exists) return `Kajak (nr ${kayakId})`; // sprzątnięty/nieznaleziony kajak — degraduje się do surowego ID
  return kayakBaseLabel(snap.data(), kayakId);
}

export interface AvailableKayak { id: string; label: string; isPrivate: boolean; ownerContact: string | null }

async function fetchPoolKayaks(db: FirebaseFirestore.Firestore): Promise<any[]> {
  const kayaksSnap = await db.collection("gear_kayaks").where("isActive", "==", true).get();
  return kayaksSnap.docs
    .map((d) => {
      const data = d.data() as any;
      return {id: String(data?.id || d.id), ...data};
    })
    .filter((k) => k.gearScrapped !== true)
    .filter((k) => String(k?.storage || k?.storedAt || "").trim().toLowerCase() === "basen")
    .filter((k) => k?.isOperational === true)
    // Prywatny kajak niedostępny do wypożyczenia — widoczny tylko dla właściciela poza
    // tą listą (nie ma tu żadnej roli), więc go nie proponujemy innym uczestnikom.
    // Wzorem tej samej reguły w module Sprzęt (gear_bundle_service.ts).
    .filter((k) => k?.isPrivate !== true || k?.isPrivateRentable === true);
}

function buildAvailableKayaksList(poolKayaks: any[], allocatedIds: Set<string>): AvailableKayak[] {
  const available = poolKayaks
    .filter((k) => !allocatedIds.has(k.id))
    .map((k) => {
      const baseLabel = kayakBaseLabel(k, k.id);
      const isPrivate = k?.isPrivate === true;
      const ownerContact = isPrivate ? (norm(k?.ownerContact) || null) : null;
      // Kajak prywatny (choć użyczalny) — jasno oznaczony w liście wyboru, żeby
      // uczestnik wiedział, że wypożyczenie wymaga zgody właściciela (poza aplikacją —
      // ten sam wzorzec zaufania co płatność "jednorazowe"/nagrody instruktorskie).
      const label = isPrivate ?
        `${baseLabel} — PRYWATNY, wymaga zgody właściciela${ownerContact ? ` (${ownerContact})` : ""}` :
        baseLabel;
      return {id: k.id, label, isPrivate, ownerContact};
    })
    .sort((a, b) => a.label.localeCompare(b.label, "pl"));

  available.push({id: "PRIVATE", label: "Kajak prywatny", isPrivate: false, ownerContact: null});
  return available;
}

export async function listAvailableBasenKayaks(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  slot: BasenSlotLabel
): Promise<AvailableKayak[]> {
  const poolKayaks = await fetchPoolKayaks(db);
  const allocSnap = await db.collection("basen_kayak_allocations")
    .where("sessionId", "==", sessionId)
    .where("slot", "==", slot)
    .get();
  const allocatedIds = new Set(allocSnap.docs.map((d) => String((d.data() as any)?.kayakId || "")));
  return buildAvailableKayaksList(poolKayaks, allocatedIds);
}

/**
 * To samo co listAvailableBasenKayaks, ale dla WIELU sesji/slotów naraz — jeden odczyt
 * `gear_kayaks` i jeden odczyt CAŁEJ `basen_kayak_allocations` (mała kolekcja, tylko
 * aktywne alokacje) zamiast N osobnych zapytań. Wybór kajaka pokazywany OD RAZU w
 * formularzu zapisu (getBasenSessionsHandler.ts), bez osobnego przycisku/zapytania.
 */
export async function getAvailableKayaksBySessionSlot(
  db: FirebaseFirestore.Firestore,
  sessions: BasenSession[]
): Promise<Map<string, AvailableKayak[]>> {
  const [poolKayaks, allocSnap] = await Promise.all([
    fetchPoolKayaks(db),
    db.collection("basen_kayak_allocations").get(),
  ]);

  const allocatedByKey = new Map<string, Set<string>>();
  allocSnap.docs.forEach((d) => {
    const a = d.data() as any;
    const key = `${a.sessionId}_${a.slot}`;
    const set = allocatedByKey.get(key) || new Set<string>();
    set.add(String(a.kayakId || ""));
    allocatedByKey.set(key, set);
  });

  const result = new Map<string, AvailableKayak[]>();
  for (const s of sessions) {
    for (const slotLabel of Object.keys(s.slots || {})) {
      const key = `${s.id}_${slotLabel}`;
      result.set(key, buildAvailableKayaksList(poolKayaks, allocatedByKey.get(key) || new Set()));
    }
  }
  return result;
}

// ─── Lista uczestników slotu ─────────────────────────────────────────────────

export async function listSlotAttendees(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  slot: BasenSlotLabel
): Promise<SlotAttendeesResult> {
  const snap = await db.collection("basen_enrollments")
    .where("sessionId", "==", sessionId)
    .where("slot", "==", slot)
    .where("status", "==", "active")
    .where("type", "==", "instructor")
    .get();

  const instructors = snap.docs.map((d) => {
    const e = d.data() as BasenEnrollment;
    return {userUid: e.userUid, userDisplayName: e.userDisplayName};
  });

  return {instructors};
}

/**
 * Instruktor przypisuje SIEBIE jako parę dla studenta, który zapisał się na "training"
 * bez wybranego instruktora (szuka instruktora — patrz listSlotAttendees). W
 * odróżnieniu od setEnrollmentInstructor (który obsługuje samoobsługę właściciela
 * zapisu), tu wywołujący NIE jest właścicielem modyfikowanego zapisu — musi więc być
 * zweryfikowany jako aktywny instruktor na tym samym slocie, a cel musi faktycznie
 * "szukać instruktora" (type="training", instructorUid pusty), żeby nie dało się
 * przejąć/nadpisać już sparowanego studenta.
 */
export async function claimWaitingStudent(
  db: FirebaseFirestore.Firestore,
  args: { sessionId: string; slot: BasenSlotLabel; instructorUid: string; targetUid: string }
): Promise<void> {
  if (args.instructorUid === args.targetUid) throw new Error("Nie możesz przypisać samego siebie.");

  const instructorRef = db.collection("basen_enrollments").doc(enrollmentId(args.sessionId, args.slot, args.instructorUid));
  const targetRef = db.collection("basen_enrollments").doc(enrollmentId(args.sessionId, args.slot, args.targetUid));
  const instructorStudentsQuery = db.collection("basen_enrollments")
    .where("sessionId", "==", args.sessionId)
    .where("slot", "==", args.slot)
    .where("instructorUid", "==", args.instructorUid)
    .where("status", "==", "active");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const [instructorSnap, targetSnap, instructorStudentsSnap] = await Promise.all([
      tx.get(instructorRef),
      tx.get(targetRef),
      tx.get(instructorStudentsQuery),
    ]);

    const instructorData = instructorSnap.exists ? (instructorSnap.data() as BasenEnrollment) : null;
    if (!instructorData || instructorData.status !== "active" || instructorData.type !== "instructor") {
      throw new Error("Nie jesteś zapisany/a jako instruktor na ten slot.");
    }

    if (!targetSnap.exists) throw new Error("Zapis nie istnieje.");
    const target = targetSnap.data() as BasenEnrollment;
    if (target.status !== "active") throw new Error("Zapis jest anulowany.");
    if (target.type !== "training" || target.instructorUid) {
      throw new Error("Ta osoba nie szuka już instruktora.");
    }

    if (instructorStudentsSnap.size >= MAX_STUDENTS_PER_INSTRUCTOR) {
      throw new Error(`Masz już maksymalną liczbę uczestników (${MAX_STUDENTS_PER_INSTRUCTOR}).`);
    }

    tx.update(targetRef, {instructorUid: args.instructorUid, updatedAt: now});
  });
}

// ─── Uprawnienia panelu "Zarządzanie" ────────────────────────────────────────

/**
 * Czy dany e-mail ma dostęp do zakładki "Zarządzanie" modułu Basen na takich samych
 * zasadach jak zarząd/KR — bo jest aktualnym skarbnikiem (konto funkcyjne) LUB jest na
 * liście "opiekunów basenowych" (setup/vars_basen.vars.basen_admin_mail, zakładka
 * Vars_BASEN arkusza App_SETUP). Rola zarząd/KR jest już objęta przez adminRoleKeys w
 * computeAllowedActions — to rozszerzenie dla osób BEZ tej roli.
 *
 * Używane w dwóch miejscach: registerUserHandler.ts (żeby dopisać "basen.admin" do
 * allowed_actions przy logowaniu, dla frontendu) i w handlerach basenCreateSession/
 * basenCancelSession (żeby faktycznie WPUŚCIĆ tę osobę do akcji, nie tylko pokazać
 * jej zakładkę).
 */
export async function resolveBasenAdminGrant(db: FirebaseFirestore.Firestore, email: string): Promise<boolean> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  const [skarbnikEmail, basenVars] = await Promise.all([
    resolveFunctionRoleEmail(db, "skarbnik"),
    getBasenVars(db),
  ]);

  if (skarbnikEmail && skarbnikEmail === normalizedEmail) return true;
  return basenVars.basen_admin_mail.includes(normalizedEmail);
}
