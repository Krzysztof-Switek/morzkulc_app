import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {getGearVars} from "../../modules/setup/setup_gear_vars";
import {getGodzinkiVars} from "../../modules/hours/godzinki_vars";
import {deductHours} from "../../modules/hours/godzinki_service";

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
 * Idempotencja:
 *   Kolekcja gear_storage_charges/{kayakId}_{YYYY-MM}
 *   Rekord tworzony przed dedukcją (status: "pending") i aktualizowany po (status: "charged"|"failed"|"exempt").
 *   Przy ponownym uruchomieniu w tym samym miesiącu rekord już istnieje → skip.
 *
 * Koszt:
 *   vars_gear.godzinki_za_sprzęt_prywatny → hoursPerPrivateKayakPerMonth
 *
 * Zwolnienie:
 *   Gdy boardDoesNotPay=true i właściciel ma rolę rola_zarzad lub rola_kr:
 *   tworzy rekord {status: "exempt", hoursCharged: 0} oraz wpis 0h w godzinki_ledger.
 */

type Payload = {
  dry?: boolean;
  month?: string; // override: "YYYY-MM" (do testów/poprawek)
};

function norm(v: any): string {
  return String(v || "").trim();
}

/**
 * Zwraca "YYYY-MM" dla podanej daty.
 */
export function toYearMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

    let charged = 0;
    let exempt = 0;
    let skipped = 0;
    let failed = 0;
    let notEligible = 0;

    for (const kayakDoc of kayaksSnap.docs) {
      const kayak = kayakDoc.data() as any;
      const kayakId = String(kayak?.id || kayakDoc.id);

      // --- Sprawdź warunki naliczenia ---

      // storage === "Klub" (case-insensitive)
      const storageVal = norm(kayak?.storage).toLowerCase();
      if (storageVal !== "klub") {
        notEligible++;
        continue;
      }

      // Jeśli kajak jest wypożyczalny → nie naliczamy
      if (kayak?.isPrivateRentable === true) {
        notEligible++;
        continue;
      }

      // --- Idempotencja (przed walidacją emailu — żeby "failed" rekordy też były idempotentne) ---
      const chargeDocId = `${kayakId}_${currentMonth}`;
      const chargeRef = ctx.firestore.collection(STORAGE_CHARGES_COLLECTION).doc(chargeDocId);
      const chargeSnap = await chargeRef.get();

      if (chargeSnap.exists) {
        ctx.logger.info("gearPrivateStorage: already processed", {chargeDocId, status: chargeSnap.data()?.status});
        skipped++;
        continue;
      }

      // Musi mieć email właściciela
      const ownerContact = norm(kayak?.ownerContact);
      if (!ownerContact || !ownerContact.includes("@")) {
        ctx.logger.warn("gearPrivateStorage: missing or invalid ownerContact", {kayakId, ownerContact});
        if (!dryRun) {
          await chargeRef.set({
            kayakId,
            billingMonth: currentMonth,
            ownerContact: ownerContact || "",
            status: "failed",
            message: "Missing or invalid ownerContact",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        failed++;
        continue;
      }

      // Musi mieć datę wejścia do klubu
      const privateSinceIso = norm(kayak?.privatesinceinclub);
      if (!privateSinceIso) {
        ctx.logger.warn("gearPrivateStorage: missing privatesinceinclub", {kayakId, ownerContact});
        notEligible++;
        continue;
      }

      // Sprawdź czy bieżący miesiąc jest naliczalny
      if (!isChargeableThisMonth(privateSinceIso, currentMonth)) {
        ctx.logger.info("gearPrivateStorage: not chargeable yet", {kayakId, privateSinceIso, currentMonth});
        skipped++;
        continue;
      }

      // --- Znajdź użytkownika po emailu ---
      const userSnap = await ctx.firestore
        .collection("users_active")
        .where("email", "==", ownerContact.toLowerCase())
        .limit(1)
        .get();

      if (userSnap.empty) {
        ctx.logger.warn("gearPrivateStorage: user not found", {kayakId, ownerContact});
        if (!dryRun) {
          await chargeRef.set({
            kayakId,
            billingMonth: currentMonth,
            ownerContact,
            status: "failed",
            message: "User not found by email",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        failed++;
        continue;
      }

      const userDoc = userSnap.docs[0];
      const uid = userDoc.id;
      const roleKey = String((userDoc.data() as any)?.role_key || "");
      const isExempt = gearVars.boardDoesNotPay &&
        (roleKey === "rola_zarzad" || roleKey === "rola_kr");

      // --- Zarząd/kr zwolniony z opłaty ---
      if (isExempt) {
        if (!dryRun) {
          await chargeRef.set({
            kayakId,
            billingMonth: currentMonth,
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
            reason: `Opłata za przechowywanie kajaka ${kayak?.number || kayakId} — ${currentMonth} (zwolnienie zarząd/kr)`,
            submittedBy: "system",
            reservationId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        ctx.logger.info("gearPrivateStorage: exempt (boardDoesNotPay)", {kayakId, uid, roleKey, currentMonth});
        exempt++;
        continue;
      }

      // --- Dry run ---
      if (dryRun) {
        ctx.logger.info("gearPrivateStorage: [DRY RUN] would charge", {
          kayakId, ownerContact, uid, costHours, currentMonth,
        });
        charged++;
        continue;
      }

      // --- Rezerwuj idempotencję przed dedukcją ---
      await chargeRef.set({
        kayakId,
        billingMonth: currentMonth,
        uid,
        ownerContact,
        hoursCharged: costHours,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // --- Odlicz godzinki ---
      try {
        const result = await deductHours(
          ctx.firestore,
          uid,
          {
            amount: costHours,
            reason: `Opłata za przechowywanie kajaka ${kayak?.number || kayakId} — ${currentMonth}`,
          },
          godzinkiVars,
          ctx.now
        );

        if (result.ok) {
          await chargeRef.update({
            status: "charged",
            chargedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          ctx.logger.info("gearPrivateStorage: charged", {kayakId, uid, costHours, currentMonth});
          charged++;
        } else {
          await chargeRef.update({
            status: "failed",
            message: result.message || result.code || "deductHours failed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          ctx.logger.warn("gearPrivateStorage: deductHours failed", {
            kayakId, uid, code: result.code, message: result.message,
          });
          failed++;
        }
      } catch (e: any) {
        await chargeRef.update({
          status: "failed",
          message: e?.message || "unexpected error",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        ctx.logger.error("gearPrivateStorage: error charging", {kayakId, uid, message: e?.message});
        failed++;
      }
    }

    const message = `charged=${charged}, exempt=${exempt}, skipped=${skipped}, notEligible=${notEligible}, failed=${failed}`;
    ctx.logger.info("gearPrivateStorage: done", {charged, exempt, skipped, notEligible, failed, dryRun});

    // ok=true zawsze — poszczególne błędy (brak emaila, user not found) są zapisane
    // w gear_storage_charges i są idempotentne. Retry joba niczego nie naprawia.
    return {
      ok: true,
      message,
      details: {charged, exempt, skipped, notEligible, failed, currentMonth, dryRun},
    };
  },
};
