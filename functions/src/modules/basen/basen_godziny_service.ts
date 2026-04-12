import * as admin from "firebase-admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BasenGodzinyOpType =
  | "admin_add"
  | "admin_correct_plus"
  | "admin_correct_minus"
  | "booking_block"
  | "booking_refund"
  | "booking_forfeit"
  | "instructor_earn";

export interface BasenGodzinyRecord {
  id: string;
  uid: string;
  type: BasenGodzinyOpType;
  amount: number; // positive = credit, negative = debit
  reason: string;
  sessionId?: string;
  enrollmentId?: string;
  performedBy: string; // uid lub "system"
  createdAt: any;
  updatedAt: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeBasenGodzinyBalance(records: BasenGodzinyRecord[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getBasenGodzinyRecords(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<BasenGodzinyRecord[]> {
  const snap = await db
    .collection("basen_godziny_ledger")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({id: d.id, ...d.data()} as BasenGodzinyRecord));
}

// ─── Admin operations ────────────────────────────────────────────────────────

export async function adminAddBasenGodziny(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    amount: number;
    reason: string;
    performedBy: string;
  }
): Promise<string> {
  if (args.amount <= 0) throw new Error("Liczba godzin musi być większa od 0.");
  const ref = db.collection("basen_godziny_ledger").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
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

export async function adminCorrectBasenGodziny(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    amount: number; // dodatnie lub ujemne
    reason: string;
    performedBy: string;
  }
): Promise<string> {
  if (args.amount === 0) throw new Error("Kwota korekty nie może być zerowa.");
  const opType: BasenGodzinyOpType = args.amount > 0 ? "admin_correct_plus" : "admin_correct_minus";
  const ref = db.collection("basen_godziny_ledger").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set({
    id: ref.id,
    uid: args.uid,
    type: opType,
    amount: args.amount,
    reason: args.reason || "Korekta godzin przez admina",
    performedBy: args.performedBy,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
