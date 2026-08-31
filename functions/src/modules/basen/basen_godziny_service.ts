import * as admin from "firebase-admin";

/**
 * Saldo godzin basenowych — osobna "waluta" od klubowych godzinek
 * (godzinki_ledger). Admin dopisuje godziny ręcznie po potwierdzeniu
 * wpłaty poza aplikacją; system nie księguje żadnych płatności.
 *
 * Model: prosty ledger (suma amount), bez wygasania/FIFO/zatwierdzania
 * jak w godzinki_service.ts — basenowe godziny nie wygasają i nie mają
 * osobnego kroku zatwierdzenia.
 */
export type BasenGodzinyOpType = "admin_add" | "booking_block" | "booking_refund" | "instructor_reward";

export interface BasenGodzinyRecord {
  id: string;
  uid: string;
  type: BasenGodzinyOpType;
  amount: number; // dodatnie = kredyt, ujemne = debet
  reason: string;
  sessionId?: string;
  slot?: string;
  enrollmentId?: string;
  performedBy: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

const COLLECTION = "basen_godziny_ledger";

export function computeBasenGodzinyBalance(records: BasenGodzinyRecord[]): number {
  return records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

export async function getBasenGodzinyRecords(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<BasenGodzinyRecord[]> {
  const snap = await db.collection(COLLECTION).where("uid", "==", uid).get();
  return snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenGodzinyRecord));
}

export async function adminAddBasenGodziny(
  db: FirebaseFirestore.Firestore,
  args: { uid: string; amount: number; reason: string; performedBy: string }
): Promise<string> {
  if (!args.amount || args.amount <= 0) {
    throw new Error("Liczba godzin musi być większa od 0.");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    id: ref.id,
    uid: args.uid,
    type: "admin_add",
    amount: args.amount,
    reason: args.reason || "Dopisanie godzin przez admina",
    performedBy: args.performedBy,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/**
 * Blokuje 1 godzinę w ramach istniejącej transakcji (enrollInSlot).
 * `ledgerRef` musi być utworzony PRZED runTransaction (db.collection(...).doc()),
 * tak jak enrollRef/allocationRef — auto-id nie wymaga odczytu sieciowego.
 */
export function blockBasenGodzinyInTx(
  tx: FirebaseFirestore.Transaction,
  ledgerRef: FirebaseFirestore.DocumentReference,
  args: { uid: string; sessionId: string; slot: string; enrollmentId: string; performedBy: string }
): void {
  const now = admin.firestore.FieldValue.serverTimestamp();
  tx.set(ledgerRef, {
    id: ledgerRef.id,
    uid: args.uid,
    type: "booking_block",
    amount: -1,
    reason: "Zapis na basen",
    sessionId: args.sessionId,
    slot: args.slot,
    enrollmentId: args.enrollmentId,
    performedBy: args.performedBy,
    createdAt: now,
    updatedAt: now,
  });
}

/** Zwraca 1 godzinę w ramach istniejącej transakcji (cancelEnrollment, tylko gdy !wasLate). */
export function refundBasenGodzinyInTx(
  tx: FirebaseFirestore.Transaction,
  ledgerRef: FirebaseFirestore.DocumentReference,
  args: { uid: string; sessionId: string; slot: string; enrollmentId: string; performedBy: string }
): void {
  const now = admin.firestore.FieldValue.serverTimestamp();
  tx.set(ledgerRef, {
    id: ledgerRef.id,
    uid: args.uid,
    type: "booking_refund",
    amount: 1,
    reason: "Zwrot godziny — anulowanie zapisu na basen",
    sessionId: args.sessionId,
    slot: args.slot,
    enrollmentId: args.enrollmentId,
    performedBy: args.performedBy,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Przyznaje 1 godzinę instruktorowi za PRZEPROWADZONY basen — wołane wyłącznie przez
 * zadanie cykliczne `basen.grantInstructorRewards` PO dacie terminu (nie przy zapisie,
 * żeby nie nagradzać za sam zapis, tylko za realne odbycie się zajęć). Idempotencja
 * pilnowana przez wywołującego (sprawdza istniejące rekordy po enrollmentId PRZED
 * wywołaniem tej funkcji) — sama funkcja tylko zapisuje.
 */
export async function grantInstructorReward(
  db: FirebaseFirestore.Firestore,
  args: { uid: string; sessionId: string; slot: string; enrollmentId: string; performedBy: string }
): Promise<string> {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection(COLLECTION).doc();
  await ref.set({
    id: ref.id,
    uid: args.uid,
    type: "instructor_reward",
    amount: 1,
    reason: "Nagroda za poprowadzenie basenu",
    sessionId: args.sessionId,
    slot: args.slot,
    enrollmentId: args.enrollmentId,
    performedBy: args.performedBy,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getAllInstructorRewardEnrollmentIds(db: FirebaseFirestore.Firestore): Promise<Set<string>> {
  const snap = await db.collection(COLLECTION).where("type", "==", "instructor_reward").get();
  return new Set(snap.docs.map((d) => String((d.data() as any)?.enrollmentId || "")).filter(Boolean));
}
