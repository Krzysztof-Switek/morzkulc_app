import * as admin from "firebase-admin";
import {ServiceTask, ServiceTaskContext} from "../types";
import {getGearVars, GearVars} from "../../modules/setup/setup_gear_vars";
import {getGodzinkiVars, GodzinkiVars} from "../../modules/hours/godzinki_vars";
import {deductHours} from "../../modules/hours/godzinki_service";
import {norm} from "../../modules/shared/text_utils";

/**
 * Task: gear.chargePrivateStorage
 *
 * Nalicza miesięczną opłatę godzinkową za trzymanie prywatnego kajaka w klubie.
 *
 * Warunki naliczenia (gear_kayaks):
 *   isPrivate === true
 *   storage (case-insensitive) === "klub"
 *   isPrivateRentable !== true   (kajak rentable → nie naliczamy)
 *   ownerContact                 (email właściciela — użytkownik w users_active)
 *   privatesinceinclub           (data wejścia do klubu, format "YYYY-MM-DD")
 *
 * Reguła miesięczna:
 *   Liczymy tylko pełne miesiące.
 *   Jeśli kajak wszedł 02.03 → marzec nie liczymy, pierwsze naliczenie 01.04.
 *   Scheduler uruchamia się 1. dnia każdego miesiąca.
 *
 * Idempotencja i retry:
 *   Kolekcja gear_storage_charges/{kayakId}_{YYYY-MM}
 *   Rekord tworzony przed dedukcją (status: "pending") i aktualizowany po (status: "charged"|"failed"|"exempt").
 *   Przy ponownym uruchomieniu: status "charged"/"exempt"/"pending" → skip;
 *   status "failed" → PONOWNA PRÓBA (wcześniej failed blokował naliczenie na zawsze
 *   i opłata za dany miesiąc przepadała). Każde uruchomienie próbuje też ponowić
 *   zaległe rekordy "failed" z poprzednich miesięcy.
 *
 * Koszt:
 *   vars_gear.godzinki_za_sprzęt_prywatny → hoursPerPrivateKayakPerMonth
 *
 * Limit ujemnego salda:
 *   Opłata jest naliczana z force=true — NIE podlega limitowi ujemnego salda
 *   (opłata przymusowa nie może być blokowana długiem; wcześniej dłużnicy
 *   przy limicie przestawali płacić).
 *
 * Zwolnienie:
 *   Gdy boardDoesNotPay=true i właściciel ma rolę rola_zarzad lub rola_kr:
 *   tworzy rekord {status: "exempt", hoursCharged: 0} oraz wpis 0h w godzinki_ledger.
 */

type Payload = {
  dry?: boolean;
  month?: string; // override: "YYYY-MM" (do testów/poprawek)
};

/**
 * Zwraca "YYYY-MM" dla podanej daty.
 */
export function toYearMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function tsToIsoYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Odczytuje datę wejścia kajaka do klubu jako ISO "YYYY-MM-DD".
 * gear.syncAllFromSheet zapisuje pole `privateSinceInClub` jako Timestamp (z parseSheetDate),
 * starsze/inne źródła mogą mieć `privatesinceinclub` jako string — obsługujemy oba.
 */
function readPrivateSinceIso(kayak: any): string {
  const raw = kayak?.privatesinceinclub ?? kayak?.privateSinceInClub;
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim().slice(0, 10);
  if (typeof raw?.toDate === "function") return tsToIsoYmd(raw.toDate());
  if (raw instanceof Date) return tsToIsoYmd(raw);
  return "";
}

/** Odczytuje miejsce składowania, tolerując dwie nazwy pól (`storage` / `storedAt`). */
function readStorage(kayak: any): string {
  return norm(kayak?.storage || kayak?.storedAt).toLowerCase();
}

/**
 * Zwraca "YYYY-MM" pierwszego miesiąca za który naliczamy opłatę.
 * Zasada: tylko pełne miesiące → pierwszy pełny miesiąc = miesiąc PO privatesinceinclub.
 * Np. privatesinceinclub = "2025-03-02" → pierwszy naliczany miesiąc = "2025-04".
 * Np. privatesinceinclub = "2025-03-01" → pierwszy naliczany miesiąc = "2025-04" (marzec nie jest pełny).
 */
export function firstChargeableMonth(privateSinceIso: string): string | null {
  if (!privateSinceIso || !/^\d{4}-\d{2}-\d{2}/.test(privateSinceIso)) return null;
  const d = new Date(privateSinceIso + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  // Następny miesiąc po wejściu
  const nextMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return toYearMonth(nextMonth);
}

/**
 * Zwraca true jeśli currentMonth (YYYY-MM) >= firstChargeableMonth.
 */
export function isChargeableThisMonth(privateSinceIso: string, currentMonth: string): boolean {
  const first = firstChargeableMonth(privateSinceIso);
  if (!first) return false;
  return currentMonth >= first;
}

const STORAGE_CHARGES_COLLECTION = "gear_storage_charges";

type ChargeOutcome = "charged" | "exempt" | "skipped" | "notEligible" | "failed";

/**
 * Przetwarza naliczenie opłaty dla jednego kajaka za jeden miesiąc.
 * Wynik mówi wyłącznie jak zaktualizować liczniki — zapisy do
 * gear_storage_charges i godzinki_ledger wykonywane są wewnątrz.
 */
async function processKayakChargeForMonth(args: {
  ctx: ServiceTaskContext;
  kayak: any;
  kayakId: string;
  month: string;
  costHours: number;
  gearVars: GearVars;
  godzinkiVars: GodzinkiVars;
  dryRun: boolean;
}): Promise<ChargeOutcome> {
  const {ctx, kayak, kayakId, month, costHours, gearVars, godzinkiVars, dryRun} = args;

  // --- Sprawdź warunki naliczenia ---

  // storage === "Klub" (case-insensitive); pole z syncu to "storedAt", starsze "storage".
  const storageVal = readStorage(kayak);
  if (storageVal !== "klub") {
    return "notEligible";
  }

  // Jeśli kajak jest wypożyczalny → nie naliczamy
  if (kayak?.isPrivateRentable === true) {
    return "notEligible";
  }

  // --- Idempotencja z retry rekordów failed ---
  const chargeDocId = `${kayakId}_${month}`;
  const chargeRef = ctx.firestore.collection(STORAGE_CHARGES_COLLECTION).doc(chargeDocId);
  const chargeSnap = await chargeRef.get();

  if (chargeSnap.exists) {
    const existingStatus = String(chargeSnap.data()?.status || "");
    if (existingStatus !== "failed") {
      ctx.logger.info("gearPrivateStorage: already processed", {chargeDocId, status: existingStatus});
      return "skipped";
    }
    ctx.logger.info("gearPrivateStorage: retrying failed charge", {chargeDocId});
  }

  // Musi mieć email właściciela
  const ownerContact = norm(kayak?.ownerContact);
  if (!ownerContact || !ownerContact.includes("@")) {
    ctx.logger.warn("gearPrivateStorage: missing or invalid ownerContact", {kayakId, ownerContact});
    if (!dryRun) {
      await chargeRef.set({
        kayakId,
        billingMonth: month,
        ownerContact: ownerContact || "",
        status: "failed",
        message: "Missing or invalid ownerContact",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return "failed";
  }

  // Musi mieć datę wejścia do klubu (Timestamp z syncu → ISO)
  const privateSinceIso = readPrivateSinceIso(kayak);
  if (!privateSinceIso) {
    ctx.logger.warn("gearPrivateStorage: missing privatesinceinclub", {kayakId, ownerContact});
    return "notEligible";
  }

  // Sprawdź czy miesiąc jest naliczalny
  if (!isChargeableThisMonth(privateSinceIso, month)) {
    ctx.logger.info("gearPrivateStorage: not chargeable yet", {kayakId, privateSinceIso, month});
    return "skipped";
  }

  // --- Znajdź użytkownika po emailu ---
  const userSnap = await ctx.firestore
    .collection("users_active")
    .where("email", "==", ownerContact.toLowerCase())
    .limit(1)
    .get();

  // Właściciel niezarejestrowany → naliczamy pod uid "hist_{email}" (jak godzinki przejściowe).
  // Dług trafia od razu do ledgera; przy rejestracji task godzinki.mergeHistoricalUser
  // przepisze rekordy na prawdziwy uid. (Brak maila jest blokowany wcześniej — w syncu.)
  const ownerRegistered = !userSnap.empty;
  const uid = ownerRegistered ? userSnap.docs[0].id : `hist_${ownerContact.toLowerCase()}`;
  const roleKey = ownerRegistered ? String((userSnap.docs[0].data() as any)?.role_key || "") : "";
  const isExempt = ownerRegistered && gearVars.boardDoesNotPay &&
    (roleKey === "rola_zarzad" || roleKey === "rola_kr");

  // --- Zarząd/kr zwolniony z opłaty ---
  if (isExempt) {
    const roleLabel = roleKey === "rola_zarzad" ? "Zarząd" : "KR";
    if (!dryRun) {
      await chargeRef.set({
        kayakId,
        billingMonth: month,
        uid,
        ownerContact,
        hoursCharged: 0,
        status: "exempt",
        message: `boardDoesNotPay: role=${roleKey}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Zero-amount spend — widoczny w historii godzinek, bez wpływu na bilans
      await ctx.firestore.collection("godzinki_ledger").add({
        uid,
        type: "spend",
        amount: 0,
        fromEarn: 0,
        overdraft: 0,
        reason: `opłata za kajak prywatny w klubie (zwolnienie ${roleLabel})`,
        submittedBy: "system",
        reservationId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    ctx.logger.info("gearPrivateStorage: exempt (boardDoesNotPay)", {kayakId, uid, roleKey, month});
    return "exempt";
  }

  // --- Dry run ---
  if (dryRun) {
    ctx.logger.info("gearPrivateStorage: [DRY RUN] would charge", {
      kayakId, ownerContact, uid, costHours, month,
    });
    return "charged";
  }

  // --- Rezerwuj idempotencję przed dedukcją ---
  await chargeRef.set({
    kayakId,
    billingMonth: month,
    uid,
    ownerContact,
    unregistered: !ownerRegistered,
    hoursCharged: costHours,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // --- Odlicz godzinki (force: opłata przymusowa pomija limit ujemnego salda) ---
  try {
    const result = await deductHours(
      ctx.firestore,
      uid,
      {
        amount: costHours,
        reason: "opłata za kajak prywatny w klubie",
        force: true,
      },
      godzinkiVars,
      ctx.now
    );

    if (result.ok) {
      await chargeRef.update({
        status: "charged",
        chargedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      ctx.logger.info("gearPrivateStorage: charged", {kayakId, uid, costHours, month});
      return "charged";
    }

    await chargeRef.update({
      status: "failed",
      message: result.message || result.code || "deductHours failed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ctx.logger.warn("gearPrivateStorage: deductHours failed", {
      kayakId, uid, code: result.code, message: result.message,
    });
    return "failed";
  } catch (e: any) {
    await chargeRef.update({
      status: "failed",
      message: e?.message || "unexpected error",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ctx.logger.error("gearPrivateStorage: error charging", {kayakId, uid, message: e?.message});
    return "failed";
  }
}

export const gearPrivateStorageTask: ServiceTask<Payload> = {
  id: "gear.chargePrivateStorage",
  description: "Nalicza miesięczną opłatę godzinkową za prywatne kajaki trzymane w klubie (uruchamiany 1. dnia miesiąca).",

  validate: (payload) => {
    if (payload?.month && !/^\d{4}-\d{2}$/.test(payload.month)) {
      throw new Error("payload.month must be in YYYY-MM format");
    }
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const currentMonth = payload?.month || toYearMonth(ctx.now);

    ctx.logger.info("gearPrivateStorage: start", {currentMonth, dryRun});

    const gearVars = await getGearVars(ctx.firestore);
    const godzinkiVars = await getGodzinkiVars(ctx.firestore);

    const costHours = gearVars.hoursPerPrivateKayakPerMonth;

    if (costHours <= 0) {
      ctx.logger.warn("gearPrivateStorage: hoursPerPrivateKayakPerMonth = 0, nothing to charge");
      return {ok: true, message: "hoursPerPrivateKayakPerMonth = 0, skipped", details: {currentMonth}};
    }

    // Pobierz wszystkie prywatne kajaki (isPrivate=true)
    const kayaksSnap = await ctx.firestore
      .collection("gear_kayaks")
      .where("isPrivate", "==", true)
      .get();

    const counts: Record<ChargeOutcome, number> = {
      charged: 0,
      exempt: 0,
      skipped: 0,
      notEligible: 0,
      failed: 0,
    };

    // Mapa prywatnych kajaków po kajakowym ID (do retry zaległych miesięcy)
    const kayaksById = new Map<string, any>();

    for (const kayakDoc of kayaksSnap.docs) {
      const kayak = kayakDoc.data() as any;
      const kayakId = String(kayak?.id || kayakDoc.id);
      kayaksById.set(kayakId, kayak);

      const outcome = await processKayakChargeForMonth({
        ctx, kayak, kayakId, month: currentMonth, costHours, gearVars, godzinkiVars, dryRun,
      });
      counts[outcome]++;
    }

    // --- Retry zaległych naliczeń "failed" z poprzednich miesięcy ---
    // (np. właściciel zarejestrował się po nieudanym naliczeniu, poprawiono email).
    let retriedPrevious = 0;
    const failedSnap = await ctx.firestore
      .collection(STORAGE_CHARGES_COLLECTION)
      .where("status", "==", "failed")
      .get();

    for (const failedDoc of failedSnap.docs) {
      const charge = failedDoc.data() as any;
      const month = norm(charge?.billingMonth);
      const kayakId = norm(charge?.kayakId);

      // Bieżący miesiąc obsłużony w pętli głównej
      if (!month || !kayakId || month === currentMonth) continue;

      const kayak = kayaksById.get(kayakId);
      if (!kayak) {
        ctx.logger.warn("gearPrivateStorage: failed charge for unknown/non-private kayak — skipping retry", {
          kayakId, month,
        });
        continue;
      }

      const outcome = await processKayakChargeForMonth({
        ctx, kayak, kayakId, month, costHours, gearVars, godzinkiVars, dryRun,
      });
      counts[outcome]++;
      retriedPrevious++;
    }

    const {charged, exempt, skipped, notEligible, failed} = counts;
    const message = `charged=${charged}, exempt=${exempt}, skipped=${skipped}, notEligible=${notEligible}, failed=${failed}, retriedPrevious=${retriedPrevious}`;
    ctx.logger.info("gearPrivateStorage: done", {charged, exempt, skipped, notEligible, failed, retriedPrevious, dryRun});

    // ok=true zawsze — rekordy "failed" są ponawiane przy każdym kolejnym
    // uruchomieniu (retry joba w krótkim odstępie niczego by nie naprawił).
    // failed>0 logowany jako error → widoczny w alertach Cloud Logging.
    if (failed > 0) {
      ctx.logger.error("gearPrivateStorage: some charges FAILED — wymagają uwagi admina", {
        failed, currentMonth,
      });
    }

    return {
      ok: true,
      message,
      details: {charged, exempt, skipped, notEligible, failed, retriedPrevious, currentMonth, dryRun},
    };
  },
};
