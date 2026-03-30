import * as admin from "firebase-admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionStatus = "open" | "full" | "cancelled";
export type EnrollmentStatus = "active" | "cancelled";
export type KarnetStatus = "pending" | "active" | "exhausted" | "expired";
export type PaymentType = "karnet" | "jednorazowe";

export interface BasenVars {
  basen_admin_mail: string;
  basen_cena_za_godzine: number;
  basen_cena_za_karnet: number;
  basen_ile_wejsc_na_karnet: number;
  basen_limit_uczestnikow: number;
  basen_1_godzina_domyslna: string;
  basen_2_godzina_domyslna: string;
  basen_sauna: boolean;
  basen_sauna_cena: number;
  basen_okno_anulowania_h: number;
}

export interface BasenSession {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  capacity: number;
  enrolledCount: number;
  instructorEmail: string;
  instructorName: string;
  notes: string;
  status: SessionStatus;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface BasenEnrollment {
  id: string;
  sessionId: string;
  userUid: string;
  userEmail: string;
  userDisplayName: string;
  paymentType: PaymentType;
  karnetId?: string;
  status: EnrollmentStatus;
  cancelledAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface BasenKarnet {
  id: string;
  userUid: string;
  userEmail: string;
  userDisplayName: string;
  totalEntries: number;
  usedEntries: number;
  status: KarnetStatus;
  grantedBy?: string;
  createdAt: any;
  updatedAt: any;
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

export async function getBasenVars(db: FirebaseFirestore.Firestore): Promise<BasenVars> {
  const snap = await db.collection("setup").doc("vars_basen").get();
  const vars = (snap.exists ? (snap.data() as any)?.vars || {} : {}) as Record<string, any>;

  return {
    basen_admin_mail: String(parseVarValue(vars["basen_admin_mail"]) ?? ""),
    basen_cena_za_godzine: Number(parseVarValue(vars["basen_cena_za_godzine"]) ?? 0),
    basen_cena_za_karnet: Number(parseVarValue(vars["basen_cena_za_karnet"]) ?? 0),
    basen_ile_wejsc_na_karnet: Number(parseVarValue(vars["basen_ile_wejsc_na_karnet"]) ?? 10),
    basen_limit_uczestnikow: Number(parseVarValue(vars["basen_limit_uczestnikow"]) ?? 15),
    basen_1_godzina_domyslna: String(parseVarValue(vars["basen_1_godzina_domyslna"]) ?? "19:00"),
    basen_2_godzina_domyslna: String(parseVarValue(vars["basen_2_godzina_domyslna"]) ?? "21:00"),
    basen_sauna: Boolean(parseVarValue(vars["basen_sauna"]) ?? false),
    basen_sauna_cena: Number(parseVarValue(vars["basen_sauna_cena"]) ?? 0),
    basen_okno_anulowania_h: Number(parseVarValue(vars["basen_okno_anulowania_h"]) ?? 24),
  };
}

export function sessionDatetimeMs(session: Pick<BasenSession, "date" | "timeStart">): number {
  try {
    const dt = new Date(`${session.date}T${session.timeStart}:00`);
    return dt.getTime();
  } catch {
    return 0;
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function listUpcomingSessions(
  db: FirebaseFirestore.Firestore
): Promise<BasenSession[]> {
  const today = todayIso();
  const snap = await db
    .collection("basen_sessions")
    .where("date", ">=", today)
    .where("status", "in", ["open", "full"])
    .orderBy("date", "asc")
    .orderBy("timeStart", "asc")
    .get();

  return snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenSession));
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

export async function createSession(
  db: FirebaseFirestore.Firestore,
  args: {
    date: string;
    timeStart: string;
    timeEnd: string;
    capacity: number;
    instructorEmail: string;
    instructorName: string;
    notes: string;
    createdBy: string;
  }
): Promise<string> {
  const ref = db.collection("basen_sessions").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await ref.set({
    id: ref.id,
    date: args.date,
    timeStart: args.timeStart,
    timeEnd: args.timeEnd,
    capacity: args.capacity,
    enrolledCount: 0,
    instructorEmail: args.instructorEmail,
    instructorName: args.instructorName,
    notes: args.notes,
    status: "open",
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

export async function enrollInSession(
  db: FirebaseFirestore.Firestore,
  args: {
    sessionId: string;
    userUid: string;
    userEmail: string;
    userDisplayName: string;
    paymentType: PaymentType;
    karnetId?: string;
  }
): Promise<{ enrollmentId: string }> {
  const sessionRef = db.collection("basen_sessions").doc(args.sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Check for duplicate enrollment
  const existing = await db
    .collection("basen_enrollments")
    .where("sessionId", "==", args.sessionId)
    .where("userUid", "==", args.userUid)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("Jesteś już zapisany/a na tę sesję.");
  }

  const enrollmentRef = db.collection("basen_enrollments").doc();

  const result = await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new Error("Sesja nie istnieje.");

    const session = sessionSnap.data() as BasenSession;
    if (session.status === "cancelled") throw new Error("Sesja jest anulowana.");
    if (session.status === "full") throw new Error("Sesja jest już pełna.");
    if (session.date < todayIso()) throw new Error("Nie można zapisać się na przeszłą sesję.");

    const newCount = session.enrolledCount + 1;
    const newStatus: SessionStatus = newCount >= session.capacity ? "full" : "open";

    tx.update(sessionRef, {
      enrolledCount: newCount,
      status: newStatus,
      updatedAt: now,
    });

    // If karnet payment — deduct entry inside transaction
    if (args.paymentType === "karnet" && args.karnetId) {
      const karnetRef = db.collection("basen_karnety").doc(args.karnetId);
      const karnetSnap = await tx.get(karnetRef);

      if (!karnetSnap.exists) throw new Error("Karnet nie istnieje.");

      const karnet = karnetSnap.data() as BasenKarnet;
      if (karnet.status !== "active") throw new Error("Karnet nie jest aktywny.");
      if (karnet.userUid !== args.userUid) throw new Error("Karnet nie należy do Ciebie.");

      const remaining = karnet.totalEntries - karnet.usedEntries;
      if (remaining <= 0) throw new Error("Karnet nie ma już wejść.");

      const newUsed = karnet.usedEntries + 1;
      const newKarnetStatus: KarnetStatus =
        newUsed >= karnet.totalEntries ? "exhausted" : "active";

      tx.update(karnetRef, {
        usedEntries: newUsed,
        status: newKarnetStatus,
        updatedAt: now,
      });
    }

    tx.set(enrollmentRef, {
      id: enrollmentRef.id,
      sessionId: args.sessionId,
      userUid: args.userUid,
      userEmail: args.userEmail,
      userDisplayName: args.userDisplayName,
      paymentType: args.paymentType,
      karnetId: args.karnetId || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {enrollmentId: enrollmentRef.id};
  });

  return result;
}

export async function cancelEnrollment(
  db: FirebaseFirestore.Firestore,
  args: {
    enrollmentId: string;
    userUid: string;
    cancellationWindowHours: number;
  }
): Promise<void> {
  const enrollmentRef = db.collection("basen_enrollments").doc(args.enrollmentId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const enrollmentSnap = await tx.get(enrollmentRef);
    if (!enrollmentSnap.exists) throw new Error("Zapis nie istnieje.");

    const enrollment = enrollmentSnap.data() as BasenEnrollment;
    if (enrollment.userUid !== args.userUid) throw new Error("Brak dostępu.");
    if (enrollment.status === "cancelled") throw new Error("Zapis jest już anulowany.");

    const sessionRef = db.collection("basen_sessions").doc(enrollment.sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new Error("Sesja nie istnieje.");

    const session = sessionSnap.data() as BasenSession;

    // Check cancellation window
    if (session.status !== "cancelled") {
      const sessionMs = sessionDatetimeMs(session);
      const windowMs = args.cancellationWindowHours * 60 * 60 * 1000;
      if (sessionMs > 0 && Date.now() + windowMs > sessionMs) {
        throw new Error(
          `Anulowanie możliwe tylko do ${args.cancellationWindowHours}h przed sesją.`
        );
      }
    }

    // Refund karnet entry if applicable
    if (enrollment.paymentType === "karnet" && enrollment.karnetId) {
      const karnetRef = db.collection("basen_karnety").doc(enrollment.karnetId);
      const karnetSnap = await tx.get(karnetRef);

      if (karnetSnap.exists) {
        const karnet = karnetSnap.data() as BasenKarnet;
        const newUsed = Math.max(0, karnet.usedEntries - 1);
        const newStatus: KarnetStatus =
          karnet.status === "exhausted" ? "active" : karnet.status;

        tx.update(karnetRef, {
          usedEntries: newUsed,
          status: newStatus,
          updatedAt: now,
        });
      }
    }

    // Update session count
    if (session.status !== "cancelled") {
      const newCount = Math.max(0, session.enrolledCount - 1);
      const newStatus: SessionStatus = newCount < session.capacity ? "open" : "full";
      tx.update(sessionRef, {
        enrolledCount: newCount,
        status: newStatus,
        updatedAt: now,
      });
    }

    tx.update(enrollmentRef, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });
  });
}

export async function cancelSession(
  db: FirebaseFirestore.Firestore,
  sessionId: string
): Promise<{ enrollments: BasenEnrollment[] }> {
  const sessionRef = db.collection("basen_sessions").doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Get active enrollments before cancelling
  const enrollmentsSnap = await db
    .collection("basen_enrollments")
    .where("sessionId", "==", sessionId)
    .where("status", "==", "active")
    .get();

  const enrollments = enrollmentsSnap.docs.map(
    (d) => ({id: d.id, ...d.data()} as BasenEnrollment)
  );

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new Error("Sesja nie istnieje.");

    const session = sessionSnap.data() as BasenSession;
    if (session.status === "cancelled") throw new Error("Sesja jest już anulowana.");

    tx.update(sessionRef, {status: "cancelled", updatedAt: now});

    // Cancel all enrollments and refund karnety
    for (const enrollment of enrollments) {
      const enrollRef = db.collection("basen_enrollments").doc(enrollment.id);
      tx.update(enrollRef, {status: "cancelled", cancelledAt: now, updatedAt: now});

      if (enrollment.paymentType === "karnet" && enrollment.karnetId) {
        const karnetRef = db.collection("basen_karnety").doc(enrollment.karnetId);
        const karnetSnap = await tx.get(karnetRef);

        if (karnetSnap.exists) {
          const karnet = karnetSnap.data() as BasenKarnet;
          const newUsed = Math.max(0, karnet.usedEntries - 1);
          const newStatus: KarnetStatus =
            karnet.status === "exhausted" ? "active" : karnet.status;
          tx.update(karnetRef, {
            usedEntries: newUsed,
            status: newStatus,
            updatedAt: now,
          });
        }
      }
    }
  });

  return {enrollments};
}

// ─── Karnety ─────────────────────────────────────────────────────────────────

export async function getUserKarnety(
  db: FirebaseFirestore.Firestore,
  userUid: string
): Promise<BasenKarnet[]> {
  const snap = await db
    .collection("basen_karnety")
    .where("userUid", "==", userUid)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenKarnet));
}

export async function getActiveKarnet(
  db: FirebaseFirestore.Firestore,
  userUid: string
): Promise<BasenKarnet | null> {
  const snap = await db
    .collection("basen_karnety")
    .where("userUid", "==", userUid)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const d = snap.docs[0];
  return {id: d.id, ...d.data()} as BasenKarnet;
}

export async function grantKarnet(
  db: FirebaseFirestore.Firestore,
  args: {
    userUid: string;
    userEmail: string;
    userDisplayName: string;
    totalEntries: number;
    grantedBy: string;
  }
): Promise<string> {
  const ref = db.collection("basen_karnety").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await ref.set({
    id: ref.id,
    userUid: args.userUid,
    userEmail: args.userEmail,
    userDisplayName: args.userDisplayName,
    totalEntries: args.totalEntries,
    usedEntries: 0,
    status: "active",
    grantedBy: args.grantedBy,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}
