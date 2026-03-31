import * as admin from "firebase-admin";
import {GodzinkiVars} from "./godzinki_vars";

/**
 * TYPY REKORDÓW W KOLEKCJI godzinki_ledger
 *
 * Model bilansu:
 *   positive_balance = sum(earn.remaining WHERE approved=true AND expiresAt > now AND refunded != true)
 *   net_overdraft    = sum(spend.overdraft WHERE refunded != true) - sum(purchase.amount WHERE approved != false)
 *   balance          = positive_balance - net_overdraft
 *
 * Odliczanie godzinek odbywa się FIFO (najstarsze pule najpierw).
 * Pola overdraft i fromEarn w rekordzie "spend" pozwalają odtworzyć historię.
 * Pole earnDeductions w rekordzie "spend" przechowuje szczegółowy ślad FIFO.
 *
 * Rekord "purchase" wymaga zatwierdzenia przez admina (Sheets → sync).
 * Pending purchase (approved=false) nie wchodzi do bilansu do czasu zatwierdzenia.
 * Dla kompatybilności wstecznej: purchase bez pola approved traktowany jako zatwierdzone.
 */

export type GodzinkiRecordType = "earn" | "spend" | "purchase";

export type GodzinkiRecord = {
  id: string;
  uid: string;
  type: GodzinkiRecordType;
  amount: number;

  // Tylko "earn":
  remaining?: number;
  grantedAt?: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
  approved?: boolean;
  approvedAt?: FirebaseFirestore.Timestamp | null;
  approvedBy?: string | null;

  // Tylko "spend":
  fromEarn?: number;
  overdraft?: number;
  reservationId?: string | null;
  refunded?: boolean;
  refundedAt?: FirebaseFirestore.Timestamp | null;
  earnDeductions?: {earnId: string; amount: number}[];

  reason: string;
  submittedBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;

  // Śledzenie syncu z Google Sheets
  sheetRowNumber?: number;
  sheetSyncedAt?: FirebaseFirestore.Timestamp;
};

const COLLECTION = "godzinki_ledger";

function toTimestamp(v: any): FirebaseFirestore.Timestamp | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v as FirebaseFirestore.Timestamp;
  return null;
}

function toDate(v: any): Date | null {
  const ts = toTimestamp(v);
  if (ts) return ts.toDate();
  return null;
}

/**
 * Pobiera wszystkie rekordy użytkownika z kolekcji godzinki_ledger.
 */
export async function getAllRecords(db: FirebaseFirestore.Firestore, uid: string): Promise<GodzinkiRecord[]> {
  const snap = await db.collection(COLLECTION).where("uid", "==", uid).get();
  return snap.docs.map((d) => ({id: d.id, ...d.data()} as GodzinkiRecord));
}

/**
 * Oblicza aktualne saldo godzinek użytkownika.
 *
 * balance = positive_balance - net_overdraft
 *   positive_balance = sum(earn.remaining WHERE approved=true AND expiresAt > now)
 *   net_overdraft    = sum(spend.overdraft WHERE refunded != true)
 *                    - sum(purchase.amount WHERE approved != false)
 *
 * Kompatybilność wsteczna:
 *   spend.refunded === undefined → liczymy (stare rekordy przed refund-flow)
 *   purchase.approved === undefined → liczymy (stare rekordy przed approval-flow)
 */
export function computeBalance(records: GodzinkiRecord[], now: Date = new Date()): number {
  let positiveBalance = 0;
  let netOverdraft = 0;

  for (const r of records) {
    if (r.type === "earn") {
      if (r.approved === true) {
        const expiresAt = toDate(r.expiresAt);
        if (expiresAt && expiresAt > now) {
          positiveBalance += Number(r.remaining ?? 0);
        }
      }
    } else if (r.type === "spend") {
      // Pomiń zrefundowane rekordy (anulowane rezerwacje)
      if (r.refunded !== true) {
        netOverdraft += Number(r.overdraft ?? 0);
      }
    } else if (r.type === "purchase") {
      // Pomiń niezatwierdzone wykupy (oczekujące na zatwierdzenie admina)
      // approved !== false: true (zatwierdzony) LUB undefined (stary rekord bez approved)
      if (r.approved !== false) {
        netOverdraft -= Number(r.amount ?? 0);
      }
    }
  }

  return positiveBalance - netOverdraft;
}

/**
 * Zwraca datę najbliższego wygaśnięcia godzinek (najstarsza pula z remaining > 0).
 */
export function computeNextExpiry(records: GodzinkiRecord[], now: Date = new Date()): Date | null {
  const candidates: Date[] = [];

  for (const r of records) {
    if (r.type !== "earn") continue;
    if (r.approved !== true) continue;
    const remaining = Number(r.remaining ?? 0);
    if (remaining <= 0) continue;
    const expiresAt = toDate(r.expiresAt);
    if (!expiresAt || expiresAt <= now) continue;
    candidates.push(expiresAt);
  }

  if (!candidates.length) return null;
  return candidates.reduce((min, d) => (d < min ? d : min));
}

/**
 * Pobiera aktualne saldo godzinek z Firestore.
 */
export async function getBalance(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: Date = new Date()
): Promise<number> {
  const records = await getAllRecords(db, uid);
  return computeBalance(records, now);
}

/**
 * Pobiera datę najbliższego wygaśnięcia godzinek z Firestore.
 */
export async function getNextExpiry(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: Date = new Date()
): Promise<Date | null> {
  const records = await getAllRecords(db, uid);
  return computeNextExpiry(records, now);
}

/**
 * Pobiera pełną historię rekordów godzinkowych użytkownika.
 * Sortowanie: od najnowszych.
 */
export async function getHistory(
  db: FirebaseFirestore.Firestore,
  uid: string,
  limit = 100
): Promise<GodzinkiRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({id: d.id, ...d.data()} as GodzinkiRecord));
}

/**
 * Pobiera ostatnie przyznane godzinki (tylko typ "earn") — do wyświetlenia na stronie głównej.
 */
export async function getRecentEarnings(
  db: FirebaseFirestore.Firestore,
  uid: string,
  limit = 5
): Promise<GodzinkiRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .where("type", "==", "earn")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({id: d.id, ...d.data()} as GodzinkiRecord));
}

export type SubmitEarningInput = {
  amount: number;
  grantedAt: string; // ISO date YYYY-MM-DD
  reason: string;
  submittedBy: string;
};

/**
 * Zgłoszenie godzinek przez użytkownika.
 * Zapis do Firestore z approved=false, remaining=0 (nie liczy się do bilansu do czasu zatwierdzenia).
 */
export async function submitEarning(
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: SubmitEarningInput
): Promise<{id: string; record: Partial<GodzinkiRecord>}> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) throw new Error("amount must be positive");

  const grantedDate = new Date(input.grantedAt + "T00:00:00Z");
  if (Number.isNaN(grantedDate.getTime())) throw new Error("invalid grantedAt");

  const grantedTs = admin.firestore.Timestamp.fromDate(grantedDate);

  const ref = db.collection(COLLECTION).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const record: Record<string, any> = {
    id: ref.id,
    uid,
    type: "earn",
    amount,
    remaining: 0, // nie liczy się do bilansu, dopóki approved !== true
    grantedAt: grantedTs,
    expiresAt: null, // zostanie ustawione przy zatwierdzeniu
    approved: false,
    approvedAt: null,
    approvedBy: null,
    reason: String(input.reason || "").trim(),
    submittedBy: String(input.submittedBy || uid),
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(record);
  return {id: ref.id, record};
}

/**
 * Zatwierdza rekord godzinek lub wykupu (ustawia approved=true).
 *
 * Dla rekordu "earn":
 *   Ustawia remaining=amount, expiresAt = grantedAt + expiryYears.
 *
 * Dla rekordu "purchase":
 *   Ustawia approved=true — wykup zaczyna pomniejszać saldo ujemne.
 *
 * Wywoływane przez sync z Google Sheets (kolumna Zatwierdzone=TAK).
 */
export async function processApproval(
  db: FirebaseFirestore.Firestore,
  recordId: string,
  approvedBy: string,
  expiryYears = 4
): Promise<{ok: boolean; code?: string; message?: string}> {
  const ref = db.collection(COLLECTION).doc(recordId);
  const snap = await ref.get();

  if (!snap.exists) return {ok: false, code: "not_found", message: "Record not found"};

  const data = snap.data() as GodzinkiRecord;

  // Obsługa wykupu salda ujemnego
  if (data.type === "purchase") {
    if (data.approved === true) return {ok: true}; // idempotentnie: już zatwierdzone
    await ref.update({
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: String(approvedBy),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {ok: true};
  }

  if (data.type !== "earn") return {ok: false, code: "invalid_type", message: "Not an earn or purchase record"};
  if (data.approved === true) return {ok: true}; // idempotentnie: już zatwierdzone

  const grantedAt = toDate(data.grantedAt);
  if (!grantedAt) return {ok: false, code: "missing_granted_at", message: "Missing grantedAt"};

  const expiresAt = new Date(grantedAt.getTime());
  expiresAt.setFullYear(expiresAt.getFullYear() + expiryYears);

  await ref.update({
    approved: true,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: String(approvedBy),
    remaining: Number(data.amount),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true};
}

export type DeductHoursInput = {
  amount: number;
  reason: string;
  reservationId?: string;
};

/**
 * Odlicza godzinki metodą FIFO w ramach transakcji Firestore.
 *
 * Algorytm:
 * 1. Pobiera wszystkie zatwierdzone, niewygasłe rekordy "earn" posortowane po grantedAt ASC.
 * 2. Zużywa z najstarszych pul (FIFO), zmniejszając earn.remaining.
 * 3. Jeśli brakuje godzinek — tworzy "overdraft" (saldo ujemne).
 * 4. Sprawdza limit ujemnego salda z GodzinkiVars.
 * 5. Tworzy rekord "spend" z podziałem na fromEarn, overdraft i earnDeductions (ślad FIFO).
 */
export async function deductHours(
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: DeductHoursInput,
  vars: GodzinkiVars,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string; fromEarn?: number; overdraft?: number}> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return {ok: false, code: "bad_request", message: "amount must be positive"};

  return db.runTransaction(async (tx) => {
    // Pobierz wszystkie rekordy earn dla użytkownika
    const earnSnap = await tx.get(
      db
        .collection(COLLECTION)
        .where("uid", "==", uid)
        .where("type", "==", "earn")
        .where("approved", "==", true)
    );

    // Pobierz rekordy spend i purchase do obliczenia bieżącego overdraftu
    const spendSnap = await tx.get(
      db.collection(COLLECTION).where("uid", "==", uid).where("type", "==", "spend")
    );
    const purchaseSnap = await tx.get(
      db.collection(COLLECTION).where("uid", "==", uid).where("type", "==", "purchase")
    );

    // Filtruj zatwierdzone, niewygasłe rekordy earn, posortuj FIFO
    const earnRecords = earnSnap.docs
      .map((d) => ({ref: d.ref, data: d.data() as GodzinkiRecord}))
      .filter((r) => {
        const expiresAt = toDate(r.data.expiresAt);
        return expiresAt !== null && expiresAt > now && Number(r.data.remaining ?? 0) > 0;
      })
      .sort((a, b) => {
        const aDate = toDate(a.data.grantedAt);
        const bDate = toDate(b.data.grantedAt);
        if (!aDate || !bDate) return 0;
        return aDate.getTime() - bDate.getTime();
      });

    // Oblicz bieżące saldo
    const positiveBalance = earnRecords.reduce((sum, r) => sum + Number(r.data.remaining ?? 0), 0);
    const currentOverdraft = spendSnap.docs.reduce((sum, d) => {
      const s = d.data() as any;
      return s.refunded === true ? sum : sum + Number(s.overdraft ?? 0);
    }, 0);
    const currentPurchases = purchaseSnap.docs.reduce((sum, d) => {
      const p = d.data() as any;
      return p.approved === false ? sum : sum + Number(p.amount ?? 0);
    }, 0);
    const currentBalance = positiveBalance - currentOverdraft + currentPurchases;

    // Sprawdź limit ujemnego salda
    const newBalance = currentBalance - amount;
    if (newBalance < -vars.negativeBalanceLimit) {
      return {
        ok: false,
        code: "negative_limit_exceeded",
        message: `Balance would exceed negative limit of -${vars.negativeBalanceLimit}`,
      };
    }

    // FIFO: zużyj z najstarszych pul, rejestruj ślad dedukcji
    let remaining = amount;
    let fromEarn = 0;
    const earnDeductions: {earnId: string; amount: number}[] = [];

    for (const r of earnRecords) {
      if (remaining <= 0) break;
      const available = Number(r.data.remaining ?? 0);
      const take = Math.min(available, remaining);

      tx.update(r.ref, {
        remaining: available - take,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      earnDeductions.push({earnId: r.ref.id, amount: take});
      fromEarn += take;
      remaining -= take;
    }

    const overdraft = remaining; // co zostało po wyczerpaniu earn records

    // Utwórz rekord "spend"
    const spendRef = db.collection(COLLECTION).doc();
    const spendRecord: Record<string, any> = {
      id: spendRef.id,
      uid,
      type: "spend",
      amount,
      fromEarn,
      overdraft,
      earnDeductions,
      reservationId: input.reservationId ? String(input.reservationId) : null,
      refunded: false,
      reason: String(input.reason || "").trim(),
      submittedBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    tx.set(spendRef, spendRecord);

    return {ok: true, fromEarn, overdraft};
  });
}

/**
 * Zwraca godzinki za anulowaną rezerwację.
 *
 * Mechanizm:
 * - Szuka rekordu "spend" powiązanego z rezerwacją (reservationId).
 * - Jeśli rekord nie istnieje a costHours > 0 → błąd integralności danych (blokuje anulowanie).
 * - Przywraca earn.remaining dla pul FIFO które nie wygasły.
 * - Pule które wygasły po dacie rezerwacji → blokuje anulowanie z komunikatem dla użytkownika.
 * - Overdraft (godzinki z salda ujemnego) → zwracany jako nowy rekord earn.
 * - Oznacza spend jako refunded=true.
 */
export async function refundHoursForReservation(
  db: FirebaseFirestore.Firestore,
  uid: string,
  reservationId: string,
  costHours: number,
  vars: GodzinkiVars,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string}> {
  if (costHours <= 0) return {ok: true};

  // Znajdź rekord spend dla tej rezerwacji (nie zrefundowany)
  const spendSnap = await db
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .where("type", "==", "spend")
    .where("reservationId", "==", reservationId)
    .get();

  const activeSpendsArr = spendSnap.docs.filter((d) => (d.data() as any).refunded !== true);

  if (activeSpendsArr.length === 0) {
    return {
      ok: false,
      code: "spend_not_found",
      message: "Nie można anulować rezerwacji — brak zapisu godzinkowego. Skontaktuj się z administratorem.",
    };
  }

  // Zbierz wszystkie earn deductions ze wszystkich spend records tej rezerwacji
  type EarnRestore = {id: string; amount: number};
  const allEarnRestores: EarnRestore[] = [];
  let totalOverdraft = 0;

  for (const spendDoc of activeSpendsArr) {
    const spendData = spendDoc.data() as any;
    const earnDeductions: {earnId: string; amount: number}[] = Array.isArray(spendData.earnDeductions) ? spendData.earnDeductions : [];
    totalOverdraft += Number(spendData.overdraft ?? 0);
    for (const ded of earnDeductions) {
      allEarnRestores.push({id: ded.earnId, amount: ded.amount});
    }
  }

  // Sprawdź czy wszystkie pule earn można przywrócić (nie wygasły)
  let lostHours = 0;
  const validRestores: EarnRestore[] = [];

  for (const restore of allEarnRestores) {
    const earnSnap = await db.collection(COLLECTION).doc(restore.id).get();
    if (!earnSnap.exists) {
      lostHours += restore.amount;
      continue;
    }
    const earnData = earnSnap.data() as any;
    const expiresAt = toDate(earnData.expiresAt);
    if (!expiresAt || expiresAt <= now) {
      lostHours += restore.amount;
    } else {
      validRestores.push(restore);
    }
  }

  if (lostHours > 0) {
    return {
      ok: false,
      code: "pool_expired",
      message: `Nie można anulować rezerwacji — ${lostHours} godz. z tej rezerwacji wygasło i nie może zostać zwróconych. Skontaktuj się z administratorem.`,
    };
  }

  // Wszystko OK — wykonaj refund w transakcji
  await db.runTransaction(async (tx) => {
    // Przywróć earn.remaining dla wszystkich pul FIFO
    for (const restore of validRestores) {
      const earnRef = db.collection(COLLECTION).doc(restore.id);
      const earnSnap = await tx.get(earnRef);
      if (!earnSnap.exists) continue;
      const current = Number(earnSnap.data()?.remaining ?? 0);
      tx.update(earnRef, {
        remaining: current + restore.amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Overdraft — utwórz nowy rekord earn (godzinki z ujemnego salda wracają jako nowa pula)
    if (totalOverdraft > 0) {
      const newEarnRef = db.collection(COLLECTION).doc();
      const expiresAtDate = new Date(now);
      expiresAtDate.setFullYear(expiresAtDate.getFullYear() + vars.expiryYears);
      tx.set(newEarnRef, {
        id: newEarnRef.id,
        uid,
        type: "earn",
        amount: totalOverdraft,
        remaining: totalOverdraft,
        grantedAt: admin.firestore.Timestamp.fromDate(now),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
        approved: true,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: "refund",
        reason: "Zwrot godzinek z anulowanej rezerwacji",
        submittedBy: "system",
        reservationId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Oznacz wszystkie spend records jako zrefundowane
    for (const spendDoc of activeSpendsArr) {
      tx.update(spendDoc.ref, {
        refunded: true,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return {ok: true};
}

/**
 * Tworzy rekord earn jako zwrot różnicy godzinek przy korekcie rezerwacji (skrócenie).
 * Używany gdy nowe costHours < stare costHours (delta ujemny).
 * Rekord jest od razu zatwierdzony (approved=true) — to zwrot, nie nowe zgłoszenie.
 */
export async function creditReservationAdjustment(
  db: FirebaseFirestore.Firestore,
  uid: string,
  amount: number,
  reservationId: string,
  expiryYears: number,
  now: Date = new Date()
): Promise<{id: string}> {
  const ref = db.collection(COLLECTION).doc();
  const expiresAtDate = new Date(now);
  expiresAtDate.setFullYear(expiresAtDate.getFullYear() + expiryYears);

  await ref.set({
    id: ref.id,
    uid,
    type: "earn",
    amount,
    remaining: amount,
    grantedAt: admin.firestore.Timestamp.fromDate(now),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
    approved: true,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: "refund",
    reason: "Zwrot godzinek z korekty rezerwacji",
    submittedBy: "system",
    reservationId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {id: ref.id};
}

/**
 * Zapisuje godzinki z bilansu otwarcia jako od razu zatwierdzone (approved=true).
 * Używane wyłącznie przy pierwszej rejestracji użytkownika pasującego do bilansu otwarcia.
 * expiresAt jest stałe i przekazywane z zewnątrz (wymaganie biznesowe: 31.12.2029).
 */
export async function creditOpeningBalance(
  db: FirebaseFirestore.Firestore,
  uid: string,
  amount: number,
  expiresAt: Date
): Promise<{id: string}> {
  const ref = db.collection(COLLECTION).doc();
  const today = new Date();
  const grantedTs = admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  );
  const expiresTs = admin.firestore.Timestamp.fromDate(expiresAt);

  await ref.set({
    id: ref.id,
    uid,
    type: "earn",
    amount,
    remaining: amount,
    grantedAt: grantedTs,
    expiresAt: expiresTs,
    approved: true,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: "opening_balance",
    reason: "Bilans otwarcia",
    submittedBy: "system",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {id: ref.id};
}

export type PurchaseInput = {
  amount: number;
  reason: string;
};

/**
 * Zgłasza wniosek o wykup salda ujemnego (pending — wymaga zatwierdzenia admina przez Sheets).
 *
 * Tworzy rekord "purchase" z approved=false. Rekord NIE wpływa na bilans do czasu zatwierdzenia.
 * Admin zatwierdza w arkuszu Google (kolumna Zatwierdzone=TAK) → godzinkiSyncFromSheet
 * wywołuje processApproval → approved=true → bilans aktualizowany.
 *
 * Walidacja:
 *   - Bieżące saldo musi być ujemne (można wykupić tylko to co się jest winnym).
 *   - Kwota wykupu nie może przekroczyć salda ujemnego (nie można wyjść na plus).
 */
export async function submitPurchaseRequest(
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: PurchaseInput,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string; id?: string}> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return {ok: false, code: "bad_request", message: "amount must be positive"};

  const records = await getAllRecords(db, uid);
  const currentBalance = computeBalance(records, now);

  if (currentBalance >= 0) {
    return {ok: false, code: "balance_not_negative", message: "Balance is not negative, cannot purchase"};
  }

  const maxPurchase = Math.abs(currentBalance);
  if (amount > maxPurchase) {
    return {
      ok: false,
      code: "purchase_exceeds_debt",
      message: `Purchase would bring balance above zero. Max allowed: ${maxPurchase}`,
    };
  }

  const ref = db.collection(COLLECTION).doc();

  await ref.set({
    id: ref.id,
    uid,
    type: "purchase",
    amount,
    approved: false,
    approvedAt: null,
    approvedBy: null,
    reason: String(input.reason || "Wykup salda ujemnego").trim(),
    submittedBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {ok: true, id: ref.id};
}
