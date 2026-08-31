import * as admin from "firebase-admin";
import {resolveFunctionRoleEmail} from "../setup/function_roles_service";

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
  enrollmentId: string;
  userUid: string;
  userDisplayName: string;
  userEmail: string;
  kayakId: string | null;
}

export interface SlotAttendeesResult {
  instructors: SlotAttendee[];
  paired: Array<{ instructorUid: string; instructor: SlotAttendee | null; participants: SlotAttendee[] }>;
  regular: SlotAttendee[];
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
  const ref = db.collection("basen_sessions").doc();
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

  await ref.set({
    id: ref.id,
    date: args.date,
    notes: args.notes,
    slots,
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
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

  await db.runTransaction(async (tx) => {
    // ── wszystkie odczyty przed jakimkolwiek zapisem ──
    const [sessionSnap, existingEnrollSnap, allocationSnap, instructorEnrollSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(enrollRef),
      allocationRef ? tx.get(allocationRef) : Promise.resolve(null),
      instructorEnrollRef ? tx.get(instructorEnrollRef) : Promise.resolve(null),
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
    }

    if (args.mode === "training") {
      if (!args.instructorUid) throw new Error("Brakuje wybranego instruktora.");
      const instrData = instructorEnrollSnap && instructorEnrollSnap.exists ?
        (instructorEnrollSnap.data() as BasenEnrollment) :
        null;
      if (!instrData || instrData.status !== "active" || instrData.type !== "instructor") {
        throw new Error("Wybrany instruktor nie jest już dostępny na ten slot.");
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
): Promise<void> {
  const eid = enrollmentId(args.sessionId, args.slot, args.uid);
  const enrollRef = db.collection("basen_enrollments").doc(eid);
  const sessionRef = db.collection("basen_sessions").doc(args.sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const [enrollSnap, sessionSnap] = await Promise.all([tx.get(enrollRef), tx.get(sessionRef)]);
    if (!enrollSnap.exists) throw new Error("Zapis nie istnieje.");

    const enrollment = enrollSnap.data() as BasenEnrollment;
    if (enrollment.status === "cancelled") throw new Error("Zapis jest już anulowany.");
    if (!sessionSnap.exists) throw new Error("Termin nie istnieje.");

    const session = sessionSnap.data() as BasenSession;
    const slotData = session.slots?.[args.slot] || null;

    // Okno anulowania — pomijane, gdy slot jest już anulowany przez admina (sprzątanie).
    if (slotData && slotData.status !== "cancelled") {
      const slotMs = sessionSlotDatetimeMs(session, slotData);
      const windowMs = args.cancellationWindowHours * 60 * 60 * 1000;
      if (slotMs > 0 && Date.now() + windowMs > slotMs) {
        throw new Error(`Anulowanie możliwe tylko do ${args.cancellationWindowHours}h przed zajęciami.`);
      }
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

    tx.update(enrollRef, {status: "cancelled", cancelledAt: now, updatedAt: now});
  });
}

export async function cancelSession(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  slot?: BasenSlotLabel
): Promise<{ enrollments: BasenEnrollment[] }> {
  const sessionRef = db.collection("basen_sessions").doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const sessionSnapPre = await sessionRef.get();
  if (!sessionSnapPre.exists) throw new Error("Termin nie istnieje.");
  const sessionPre = sessionSnapPre.data() as BasenSession;

  const allLabels = Object.keys(sessionPre.slots || {}) as BasenSlotLabel[];
  const targetLabels = slot ? [slot] : allLabels;

  if (slot && !sessionPre.slots?.[slot]) throw new Error("Slot nie istnieje dla tego terminu.");
  if (slot && sessionPre.slots?.[slot]?.status === "cancelled") throw new Error("Slot jest już anulowany.");
  if (!slot && allLabels.every((l) => sessionPre.slots?.[l]?.status === "cancelled")) {
    throw new Error("Termin jest już anulowany.");
  }

  const activeLabels = targetLabels.filter((l) => {
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

export async function listAvailableBasenKayaks(
  db: FirebaseFirestore.Firestore,
  sessionId: string,
  slot: BasenSlotLabel
): Promise<Array<{ id: string; label: string; isPrivate: boolean; ownerContact: string | null }>> {
  const kayaksSnap = await db.collection("gear_kayaks").where("isActive", "==", true).get();
  const poolKayaks = kayaksSnap.docs
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

  const allocSnap = await db.collection("basen_kayak_allocations")
    .where("sessionId", "==", sessionId)
    .where("slot", "==", slot)
    .get();
  const allocatedIds = new Set(allocSnap.docs.map((d) => String((d.data() as any)?.kayakId || "")));

  const available = poolKayaks
    .filter((k) => !allocatedIds.has(k.id))
    .map((k) => {
      const brand = norm(k?.brand);
      const model = norm(k?.model);
      const number = norm(k?.number || k?.id);
      const base = [brand, model].filter(Boolean).join(" ") || number || k.id;
      const baseLabel = number && base !== number ? `${base} (nr ${number})` : base;
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
    .get();

  const all = snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenEnrollment));

  const toAttendee = (e: BasenEnrollment): SlotAttendee => ({
    enrollmentId: e.id,
    userUid: e.userUid,
    userDisplayName: e.userDisplayName,
    userEmail: e.userEmail,
    kayakId: e.kayakId ?? null,
  });

  const instructors = all.filter((e) => e.type === "instructor").map(toAttendee);
  const instructorByUid = new Map(instructors.map((i) => [i.userUid, i]));

  const trainingByInstructor = new Map<string, SlotAttendee[]>();
  for (const e of all) {
    if (e.type !== "training") continue;
    const key = e.instructorUid || "";
    if (!trainingByInstructor.has(key)) trainingByInstructor.set(key, []);
    (trainingByInstructor.get(key) as SlotAttendee[]).push(toAttendee(e));
  }

  const paired = Array.from(trainingByInstructor.entries()).map(([instructorUid, participants]) => ({
    instructorUid,
    instructor: instructorByUid.get(instructorUid) || null,
    participants,
  }));

  const regular = all.filter((e) => e.type === "regular").map(toAttendee);

  return {instructors, paired, regular};
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
