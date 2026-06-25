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
  // Zwolnienie z opłaty (tegoroczna szkoleniówka, do końca września). Rekord jest
  // widoczny w historii (przekreślony koszt), ale neutralny dla salda:
  // fromEarn=0, overdraft=0 → computeBalance go nie liczy.
  waived?: boolean;
  // Rok szkoleniówki uzasadniający zwolnienie (waived) — do znacznika "zwolnienie kurs RRRR".
  schoolYear?: number | null;
  refundedAt?: FirebaseFirestore.Timestamp | null;
  earnDeductions?: {earnId: string; amount: number}[];

  // Typ źródłowy dla rekordów earn tworzonych przez system (nie przez użytkownika):
  //   "adjustment" = korekta zwrotna z aktualizacji dat rezerwacji (creditReservationAdjustment)
  // Rekord z sourceType="adjustment" musi być zerowany przy anulowaniu rezerwacji.
  sourceType?: "adjustment";

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
 * Suma WYPRACOWANYCH godzinek: zatwierdzone rekordy "earn" (approved=true),
 * z pominięciem korekt rezerwacji (sourceType="adjustment" — to zwroty z edycji
 * rezerwacji, nie praca).
 *
 * To licznik kumulacyjny „ile łącznie zarobiono" — NIE jest pomniejszany o wydane
 * godzinki ani o wygaśnięcie pul. Używany do progresu stażu kandydata (cel 20 h):
 * saldo może być ujemne (sprzęt wypożyczany na bieżąco), ale staż liczymy po sumie
 * zarobionych godzinek.
 */
export function computeEarnedTotal(records: GodzinkiRecord[]): number {
  let total = 0;
  for (const r of records) {
    if (r.type !== "earn") continue;
    if (r.approved !== true) continue;
    if (r.sourceType === "adjustment") continue;
    total += Number(r.amount ?? 0);
  }
  return total;
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
  if (!Number.isInteger(amount)) throw new Error("amount must be an integer");

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
    // Jawny null (nie brak pola!) — umożliwia zapytanie where("sheetSyncedAt","==",null)
    // w backfillu syncu (rekordy, które nigdy nie trafiły do arkusza, np. po martwym jobie).
    sheetSyncedAt: null,
    sheetRowNumber: null,
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

    // Rewalidacja w momencie zatwierdzenia: saldo mogło się zmienić od zgłoszenia
    // (np. anulowana rezerwacja zwróciła godzinki, inny wykup już zatwierdzono).
    // Bez tej kontroli zatwierdzenie mogłoby wynieść saldo powyżej zera.
    const records = await getAllRecords(db, data.uid);
    const currentBalance = computeBalance(records);
    const amount = Number(data.amount ?? 0);

    if (currentBalance >= 0) {
      const message = `Saldo użytkownika nie jest już ujemne (${currentBalance}) — wykup nieaktualny`;
      await markApprovalRejected(ref, "purchase_no_longer_valid", message);
      return {ok: false, code: "purchase_no_longer_valid", message};
    }
    if (amount > Math.abs(currentBalance)) {
      const message = `Wykup ${amount} przekracza bieżące saldo ujemne (${currentBalance}) — wykup nieaktualny`;
      await markApprovalRejected(ref, "purchase_no_longer_valid", message);
      return {ok: false, code: "purchase_no_longer_valid", message};
    }

    await ref.update({
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: String(approvedBy),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvalRejectedCode: admin.firestore.FieldValue.delete(),
      approvalRejectedMessage: admin.firestore.FieldValue.delete(),
      approvalRejectedAt: admin.firestore.FieldValue.delete(),
    });
    return {ok: true};
  }

  if (data.type !== "earn") return {ok: false, code: "invalid_type", message: "Not an earn or purchase record"};
  if (data.approved === true) return {ok: true}; // idempotentnie: już zatwierdzone

  const grantedAt = toDate(data.grantedAt);
  if (!grantedAt) return {ok: false, code: "missing_granted_at", message: "Missing grantedAt"};

  const expiresAt = new Date(grantedAt.getTime());
  expiresAt.setFullYear(expiresAt.getFullYear() + expiryYears);

  // Data pracy starsza niż okres ważności → pula byłaby martwa od urodzenia
  // (remaining ustawione, ale expiresAt w przeszłości — bilans bez zmian).
  // Odmawiamy: admin może poprawić "Data pracy" w arkuszu (sync koryguje pending).
  if (expiresAt.getTime() <= Date.now()) {
    const message = `Data pracy ${grantedAt.toISOString().slice(0, 10)} jest starsza niż okres ważności (${expiryYears} lat) — godzinki byłyby wygasłe w momencie zatwierdzenia`;
    await markApprovalRejected(ref, "already_expired", message);
    return {ok: false, code: "already_expired", message};
  }

  await ref.update({
    approved: true,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: String(approvedBy),
    remaining: Number(data.amount),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvalRejectedCode: admin.firestore.FieldValue.delete(),
    approvalRejectedMessage: admin.firestore.FieldValue.delete(),
    approvalRejectedAt: admin.firestore.FieldValue.delete(),
  });

  return {ok: true};
}

/**
 * Zapisuje na rekordzie ślad odmowy zatwierdzenia (Z10 z planu panelu zarządu):
 * bez tego odmowa była widoczna wyłącznie w logach, a admin patrzył na wiecznie
 * "oczekujący" rekord bez wyjaśnienia. Panel pokazuje kod/komunikat; udane
 * zatwierdzenie czyści ślad.
 */
async function markApprovalRejected(
  ref: FirebaseFirestore.DocumentReference,
  code: string,
  message: string
): Promise<void> {
  try {
    await ref.update({
      approvalRejectedCode: code,
      approvalRejectedMessage: message,
      approvalRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // ślad jest pomocniczy — błąd zapisu nie może blokować przebiegu syncu
  }
}

export type DeductHoursInput = {
  amount: number;
  reason: string;
  reservationId?: string;
  /**
   * Wymuszone naliczenie (np. miesięczna opłata magazynowa) — pomija limit
   * ujemnego salda. Naliczenia przymusowe nie mogą być blokowane długiem.
   */
  force?: boolean;
};

/**
 * Odlicza godzinki metodą FIFO wewnątrz ISTNIEJĄCEJ transakcji Firestore.
 *
 * Algorytm:
 * 1. Pobiera wszystkie zatwierdzone, niewygasłe rekordy "earn" posortowane po grantedAt ASC.
 * 2. Zużywa z najstarszych pul (FIFO), zmniejszając earn.remaining.
 * 3. Jeśli brakuje godzinek — tworzy "overdraft" (saldo ujemne).
 * 4. Sprawdza limit ujemnego salda z GodzinkiVars (chyba że input.force=true).
 * 5. Tworzy rekord "spend" z podziałem na fromEarn, overdraft i earnDeductions (ślad FIFO).
 *
 * UWAGA (kolejność w transakcji): wszystkie odczyty tej funkcji muszą nastąpić
 * przed jakimkolwiek zapisem w transakcji wywołującego. Walidacje (w tym limit)
 * wykonują się przed pierwszym zapisem — wynik {ok:false} nie zostawia
 * częściowych zapisów.
 */
export async function deductHoursInTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: DeductHoursInput,
  vars: GodzinkiVars,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string; fromEarn?: number; overdraft?: number}> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return {ok: false, code: "bad_request", message: "amount must be positive"};

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

  // Oblicz bieżące saldo — JEDNĄ formułą (computeBalance), nie kopią.
  // Zapytanie earn ma filtr approved==true, więc niezatwierdzone pule i tak
  // nie weszłyby do bilansu — zbiór rekordów jest równoważny pełnemu.
  const allRecords = [...earnSnap.docs, ...spendSnap.docs, ...purchaseSnap.docs]
    .map((d) => ({id: d.id, ...d.data()} as GodzinkiRecord));
  const currentBalance = computeBalance(allRecords, now);

  // Sprawdź limit ujemnego salda (pomijany dla naliczeń wymuszonych)
  const newBalance = currentBalance - amount;
  if (!input.force && newBalance < -vars.negativeBalanceLimit) {
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
}

/**
 * Odlicza godzinki metodą FIFO we własnej transakcji Firestore.
 * Wrapper na deductHoursInTx dla wywołań samodzielnych (np. opłata magazynowa).
 */
export async function deductHours(
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: DeductHoursInput,
  vars: GodzinkiVars,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string; fromEarn?: number; overdraft?: number}> {
  return db.runTransaction(async (tx) => deductHoursInTx(tx, db, uid, input, vars, now));
}

/**
 * Zapisuje rekord "spend" zwolniony z opłaty (waived) wewnątrz ISTNIEJĄCEJ transakcji.
 *
 * Przeznaczenie: bezpłatne wypożyczenie sprzętu (tegoroczna szkoleniówka, do końca
 * września). Rekord pokazuje koszt, który normalnie byłby pobrany (amount), ale ma
 * fromEarn=0, overdraft=0 i waived=true — więc NIE zmienia salda (computeBalance liczy
 * tylko overdraft). Front renderuje go przekreślonego. Brak earnDeductions sprawia,
 * że anulowanie/zwrot rezerwacji jest dla niego no-opem (oznacza refunded, saldo bez zmian).
 */
export function writeWaivedSpendInTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: {amount: number; reason: string; reservationId?: string; schoolYear?: number | null}
): void {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return;

  const spendRef = db.collection(COLLECTION).doc();
  tx.set(spendRef, {
    id: spendRef.id,
    uid,
    type: "spend",
    amount,
    fromEarn: 0,
    overdraft: 0,
    waived: true,
    // Rok szkoleniówki, z której wynika zwolnienie — front renderuje "zwolnienie kurs RRRR".
    schoolYear: input.schoolYear ?? null,
    earnDeductions: [],
    reservationId: input.reservationId ? String(input.reservationId) : null,
    refunded: false,
    reason: String(input.reason || "").trim(),
    submittedBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Zwraca godzinki za anulowaną rezerwację — wewnątrz ISTNIEJĄCEJ transakcji.
 *
 * Mechanizm:
 * - Szuka rekordów "spend" powiązanych z rezerwacją (reservationId).
 * - Jeśli rekord nie istnieje a costHours > 0 → błąd integralności danych (blokuje anulowanie).
 * - Przywraca earn.remaining dla pul FIFO które nie wygasły.
 * - Pule które wygasły po dacie rezerwacji → blokuje anulowanie z komunikatem dla użytkownika.
 * - Część pokryta z salda ujemnego (overdraft) wraca WYŁĄCZNIE przez oznaczenie
 *   spend jako refunded=true — refunded spend przestaje obciążać bilans w
 *   computeBalance(). NIE tworzymy dodatkowej puli earn za overdraft: robiły to
 *   starsze wersje i skutkowało to podwójnym zwrotem (saldo rosło o overdraft
 *   ponad stan sprzed rezerwacji).
 * - Oznacza spend jako refunded=true.
 *
 * Wszystkie odczyty wykonują się przed zapisami; wynik {ok:false} nie zostawia
 * częściowych zapisów.
 */
export async function refundHoursForReservationInTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  reservationId: string,
  costHours: number,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string}> {
  if (costHours <= 0) return {ok: true};

  // ── ODCZYTY ────────────────────────────────────────────────────────────────

  // Znajdź rekordy spend dla tej rezerwacji (nie zrefundowane)
  const spendSnap = await tx.get(
    db
      .collection(COLLECTION)
      .where("uid", "==", uid)
      .where("type", "==", "spend")
      .where("reservationId", "==", reservationId)
  );

  const activeSpendsArr = spendSnap.docs.filter((d) => (d.data() as any).refunded !== true);

  if (activeSpendsArr.length === 0) {
    return {
      ok: false,
      code: "spend_not_found",
      message: "Nie można anulować rezerwacji — brak zapisu godzinkowego. Skontaktuj się z administratorem.",
    };
  }

  // Zbierz wszystkie earn deductions ze wszystkich spend records tej rezerwacji
  // (agregacja per pula — jedna pula mogła być źródłem wielu dedukcji)
  const restoreByEarnId = new Map<string, number>();

  for (const spendDoc of activeSpendsArr) {
    const spendData = spendDoc.data() as any;
    const earnDeductions: {earnId: string; amount: number}[] = Array.isArray(spendData.earnDeductions) ? spendData.earnDeductions : [];
    for (const ded of earnDeductions) {
      const id = String(ded.earnId);
      restoreByEarnId.set(id, (restoreByEarnId.get(id) ?? 0) + Number(ded.amount ?? 0));
    }
  }

  // Odczytaj pule earn i sprawdź czy można je przywrócić (nie wygasły)
  type EarnRestore = {ref: FirebaseFirestore.DocumentReference; current: number; amount: number};
  let lostHours = 0;
  const validRestores: EarnRestore[] = [];

  for (const [earnId, amount] of restoreByEarnId.entries()) {
    if (amount <= 0) continue;
    const earnRef = db.collection(COLLECTION).doc(earnId);
    const earnSnap = await tx.get(earnRef);
    if (!earnSnap.exists) {
      lostHours += amount;
      continue;
    }
    const earnData = earnSnap.data() as any;
    const expiresAt = toDate(earnData.expiresAt);
    if (!expiresAt || expiresAt <= now) {
      lostHours += amount;
    } else {
      validRestores.push({ref: earnRef, current: Number(earnData.remaining ?? 0), amount});
    }
  }

  if (lostHours > 0) {
    return {
      ok: false,
      code: "pool_expired",
      message: `Nie można anulować rezerwacji — ${lostHours} godz. z tej rezerwacji wygasło i nie może zostać zwróconych. Skontaktuj się z administratorem.`,
    };
  }

  // Znajdź rekordy earn będące korektami tej rezerwacji (sourceType="adjustment").
  // Powstają przy skróceniu rezerwacji w starym przepływie (creditReservationAdjustment)
  // oraz jako fallback dla rekordów bez śladu FIFO — muszą być wyzerowane przy
  // anulowaniu, inaczej użytkownik dostałby podwójny zwrot.
  const adjustmentEarnSnap = await tx.get(
    db.collection(COLLECTION).where("uid", "==", uid).where("type", "==", "earn")
  );

  const adjustmentEarnDocs = adjustmentEarnSnap.docs.filter((d) => {
    const data = d.data() as any;
    return (
      data.sourceType === "adjustment" &&
      String(data.reservationId || "") === reservationId &&
      Number(data.remaining ?? 0) > 0
    );
  });

  // ── ZAPISY ─────────────────────────────────────────────────────────────────

  // Przywróć earn.remaining dla wszystkich pul FIFO
  for (const restore of validRestores) {
    tx.update(restore.ref, {
      remaining: restore.current + restore.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Wyzeruj earn korekty tej rezerwacji (zapobiega podwójnemu zwrotowi przy update+cancel)
  for (const adjDoc of adjustmentEarnDocs) {
    tx.update(adjDoc.ref, {
      remaining: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Oznacz wszystkie spend records jako zrefundowane
  // (to przywraca również część overdraft — refunded spend nie obciąża bilansu)
  for (const spendDoc of activeSpendsArr) {
    tx.update(spendDoc.ref, {
      refunded: true,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {ok: true};
}

/**
 * Zwraca godzinki za anulowaną rezerwację we własnej transakcji.
 * Wrapper na refundHoursForReservationInTx.
 */
export async function refundHoursForReservation(
  db: FirebaseFirestore.Firestore,
  uid: string,
  reservationId: string,
  costHours: number,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string}> {
  return db.runTransaction(async (tx) =>
    refundHoursForReservationInTx(tx, db, uid, reservationId, costHours, now)
  );
}

/**
 * Cofa część dedukcji godzinek przy SKRÓCENIU rezerwacji (delta < 0).
 *
 * Zamiast tworzyć nową pulę earn ze świeżą ważnością (stary przepływ
 * creditReservationAdjustment — pozwalał "odświeżać" wygasające godzinki),
 * przywraca godzinki do ORYGINALNYCH pul FIFO, z których zostały pobrane,
 * cofając od najnowszych zapisów:
 *   1. najpierw część overdraft (saldo ujemne) najnowszego spend,
 *   2. potem dedukcje z pul w odwrotnej kolejności FIFO (ślad earnDeductions),
 *   3. spend records tej rezerwacji są pomniejszane (amount/fromEarn/overdraft/
 *      earnDeductions) tak, by późniejszy pełny refund przy anulowaniu zwracał
 *      dokładnie pozostały koszt.
 *
 * Pula źródłowa wygasła → {ok:false, code:"pool_expired"} (spójnie z anulowaniem).
 * Stare rekordy spend bez śladu earnDeductions: nieodtwarzalna część wraca jako
 * pula earn z sourceType="adjustment" (zerowana przy anulowaniu) — zachowanie
 * jak w starym przepływie, tylko dla danych sprzed wprowadzenia śladu FIFO.
 *
 * Wszystkie odczyty przed zapisami; wynik {ok:false} nie zostawia zapisów.
 */
export async function reverseDeductHoursInTx(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  reservationId: string,
  amount: number,
  expiryYears: number,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string}> {
  const toReverse = Number(amount);
  if (!toReverse || toReverse <= 0) return {ok: true};

  // ── ODCZYTY ────────────────────────────────────────────────────────────────

  const spendSnap = await tx.get(
    db
      .collection(COLLECTION)
      .where("uid", "==", uid)
      .where("type", "==", "spend")
      .where("reservationId", "==", reservationId)
  );

  // Aktywne spend records tej rezerwacji, od najnowszego
  const activeSpends = spendSnap.docs
    .filter((d) => (d.data() as any).refunded !== true)
    .sort((a, b) => {
      const aTs = (a.data() as any)?.createdAt?.toMillis?.() ?? 0;
      const bTs = (b.data() as any)?.createdAt?.toMillis?.() ?? 0;
      return bTs - aTs;
    });

  if (activeSpends.length === 0) {
    return {
      ok: false,
      code: "spend_not_found",
      message: "Nie można skorygować rezerwacji — brak zapisu godzinkowego. Skontaktuj się z administratorem.",
    };
  }

  // Zaplanuj cofnięcie: overdraft najnowszego spend najpierw, potem ślad FIFO od końca
  type SpendPatch = {
    ref: FirebaseFirestore.DocumentReference;
    amount: number;
    fromEarn: number;
    overdraft: number;
    earnDeductions: {earnId: string; amount: number}[];
  };

  let remaining = toReverse;
  const spendPatches: SpendPatch[] = [];
  const restoreByEarnId = new Map<string, number>();

  for (const spendDoc of activeSpends) {
    if (remaining <= 0) break;
    const s = spendDoc.data() as any;

    let sAmount = Number(s.amount ?? 0);
    let sFromEarn = Number(s.fromEarn ?? 0);
    let sOverdraft = Number(s.overdraft ?? 0);
    const deds: {earnId: string; amount: number}[] = Array.isArray(s.earnDeductions) ?
      s.earnDeductions.map((d: any) => ({earnId: String(d.earnId), amount: Number(d.amount ?? 0)})) :
      [];

    let changed = false;

    // Najpierw cofnij część overdraft (była "ostatnia" w kolejności zużycia)
    const takeOverdraft = Math.min(remaining, sOverdraft);
    if (takeOverdraft > 0) {
      sOverdraft -= takeOverdraft;
      sAmount -= takeOverdraft;
      remaining -= takeOverdraft;
      changed = true;
    }

    // Potem cofaj dedukcje z pul od końca śladu (odwrotność FIFO)
    for (let i = deds.length - 1; i >= 0 && remaining > 0; i--) {
      const take = Math.min(remaining, deds[i].amount);
      if (take <= 0) continue;
      deds[i].amount -= take;
      sFromEarn -= take;
      sAmount -= take;
      remaining -= take;
      restoreByEarnId.set(deds[i].earnId, (restoreByEarnId.get(deds[i].earnId) ?? 0) + take);
      changed = true;
    }

    if (changed) {
      spendPatches.push({
        ref: spendDoc.ref,
        amount: sAmount,
        fromEarn: sFromEarn,
        overdraft: sOverdraft,
        earnDeductions: deds.filter((d) => d.amount > 0),
      });
    }
  }

  // Nieodtwarzalna reszta — stare spend records bez śladu earnDeductions
  const untraced = remaining;

  // Odczytaj i zweryfikuj pule do przywrócenia (nie mogą być wygasłe)
  type PoolRestore = {ref: FirebaseFirestore.DocumentReference; current: number; amount: number};
  const poolRestores: PoolRestore[] = [];

  for (const [earnId, restoreAmount] of restoreByEarnId.entries()) {
    if (restoreAmount <= 0) continue;
    const earnRef = db.collection(COLLECTION).doc(earnId);
    const earnSnap = await tx.get(earnRef);
    if (!earnSnap.exists) {
      return {
        ok: false,
        code: "pool_missing",
        message: "Nie można skorygować rezerwacji — brak puli źródłowej godzinek. Skontaktuj się z administratorem.",
      };
    }
    const earnData = earnSnap.data() as any;
    const expiresAt = toDate(earnData.expiresAt);
    if (!expiresAt || expiresAt <= now) {
      return {
        ok: false,
        code: "pool_expired",
        message: "Nie można skorygować rezerwacji — godzinki użyte do tej rezerwacji wygasły i nie mogą zostać zwrócone. Skontaktuj się z administratorem.",
      };
    }
    poolRestores.push({ref: earnRef, current: Number(earnData.remaining ?? 0), amount: restoreAmount});
  }

  // ── ZAPISY ─────────────────────────────────────────────────────────────────

  for (const patch of spendPatches) {
    tx.update(patch.ref, {
      amount: patch.amount,
      fromEarn: patch.fromEarn,
      overdraft: patch.overdraft,
      earnDeductions: patch.earnDeductions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const restore of poolRestores) {
    tx.update(restore.ref, {
      remaining: restore.current + restore.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Fallback dla rekordów sprzed śladu FIFO: nowa pula adjustment (jak dawniej).
  // Zerowana przy anulowaniu rezerwacji (refundHoursForReservationInTx).
  if (untraced > 0) {
    const newEarnRef = db.collection(COLLECTION).doc();
    const expiresAtDate = new Date(now);
    expiresAtDate.setFullYear(expiresAtDate.getFullYear() + expiryYears);
    tx.set(newEarnRef, {
      id: newEarnRef.id,
      uid,
      type: "earn",
      amount: untraced,
      remaining: untraced,
      grantedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: "refund",
      sourceType: "adjustment",
      reason: "Zwrot godzinek z korekty rezerwacji",
      submittedBy: "system",
      reservationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {ok: true};
}

/**
 * LEGACY — nieużywany w bieżącym przepływie korekt rezerwacji.
 * Skrócenie rezerwacji obsługuje reverseDeductHoursInTx (przywraca oryginalne
 * pule FIFO zamiast tworzyć nową pulę ze świeżą ważnością). Funkcja pozostaje
 * dla zgodności z istniejącymi danymi (rekordy sourceType="adjustment" są nadal
 * zerowane przy anulowaniu) oraz dla ewentualnych skryptów naprawczych.
 *
 * Tworzy rekord earn jako zwrot różnicy godzinek przy korekcie rezerwacji (skrócenie).
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
    sourceType: "adjustment",
    reason: "Zwrot godzinek z korekty rezerwacji",
    submittedBy: "system",
    reservationId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {id: ref.id};
}

/**
 * Zapisuje od razu zatwierdzoną (approved=true) pulę "earn" z jawną datą pracy i wygaśnięcia.
 * Wspólna podstawa dla bilansu otwarcia i importu danych przejściowych.
 * submittedBy="system" → backfill syncu pomija te rekordy (nie trafiają do arkusza głównego "Godzinki").
 */
export async function creditApprovedEarn(
  db: FirebaseFirestore.Firestore,
  uid: string,
  amount: number,
  grantedAt: Date,
  expiresAt: Date,
  opts?: {reason?: string; approvedBy?: string; submittedBy?: string}
): Promise<{id: string}> {
  const ref = db.collection(COLLECTION).doc();
  const grantedTs = admin.firestore.Timestamp.fromDate(grantedAt);
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
    approvedBy: opts?.approvedBy ?? "system",
    reason: opts?.reason ?? "",
    submittedBy: opts?.submittedBy ?? "system",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {id: ref.id};
}

/**
 * Zapisuje godzinki z bilansu otwarcia jako od razu zatwierdzone (approved=true).
 * Używane wyłącznie przy pierwszej rejestracji użytkownika pasującego do bilansu otwarcia.
 * grantedAt = dzisiaj (UTC), expiresAt przekazywane z zewnątrz (wymaganie biznesowe: 30.06.2029).
 */
export async function creditOpeningBalance(
  db: FirebaseFirestore.Firestore,
  uid: string,
  amount: number,
  expiresAt: Date
): Promise<{id: string}> {
  const today = new Date();
  const grantedAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return creditApprovedEarn(db, uid, amount, grantedAt, expiresAt, {
    reason: "Bilans otwarcia",
    approvedBy: "opening_balance",
    submittedBy: "system",
  });
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
 *   - Suma oczekujących (pending) wykupów + nowy wykup nie może przekroczyć długu —
 *     inaczej zatwierdzenie wielu pending wyniosłoby saldo powyżej zera.
 */
export async function submitPurchaseRequest(
  db: FirebaseFirestore.Firestore,
  uid: string,
  input: PurchaseInput,
  now: Date = new Date()
): Promise<{ok: boolean; code?: string; message?: string; id?: string}> {
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return {ok: false, code: "bad_request", message: "amount must be positive"};
  if (!Number.isInteger(amount)) return {ok: false, code: "bad_request", message: "amount must be an integer"};

  const records = await getAllRecords(db, uid);
  const currentBalance = computeBalance(records, now);

  if (currentBalance >= 0) {
    return {ok: false, code: "balance_not_negative", message: "Balance is not negative, cannot purchase"};
  }

  // Pending wykupy (approved=false) nie wchodzą do bilansu, ale rezerwują dług
  const pendingPurchases = records
    .filter((r) => r.type === "purchase" && r.approved === false)
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const maxPurchase = Math.abs(currentBalance) - pendingPurchases;
  if (amount > maxPurchase) {
    return {
      ok: false,
      code: "purchase_exceeds_debt",
      message: `Purchase would bring balance above zero. Max allowed: ${Math.max(0, maxPurchase)}` +
        (pendingPurchases > 0 ? ` (pending purchases: ${pendingPurchases})` : ""),
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
    // Jawny null — patrz komentarz w submitEarning (backfill syncu do arkusza).
    sheetSyncedAt: null,
    sheetRowNumber: null,
  });

  return {ok: true, id: ref.id};
}
