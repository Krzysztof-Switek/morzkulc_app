import {computeBlockIso, overlapsIso, maxEndIsoByWeeks, todayIsoUTC} from "../../calendar/calendar_utils";
import {getGearVars, roleMaxItems, roleMaxWeeks} from "../../setup/setup_gear_vars";
import {quoteKayaksCostHours} from "../../hours/hours_quote";
import {deductHoursInTx, refundHoursForReservationInTx, reverseDeductHoursInTx} from "../../hours/godzinki_service";
import {getGodzinkiVars} from "../../hours/godzinki_vars";
import {isUserStatusBlocked} from "../../users/userStatusCheck";

function norm(s: any): string {
  return String(s || "").trim();
}

export async function listKayaks(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("gear_kayaks").where("isActive", "==", true).get();
  const out: any[] = [];

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    if (d?.gearScrapped === true) continue;
    out.push({...d, id: String(d?.id || doc.id)});
  }

  out.sort((a, b) => String(a?.number || a?.id || "").localeCompare(String(b?.number || b?.id || "")));
  return out;
}

export async function listMyReservations(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => d.data());
}

async function getUserRole(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db.collection("users_active").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  return {
    roleKey: String(data?.role_key || "rola_sympatyk"),
    statusKey: String(data?.status_key || "status_aktywny"),
    email: String(data?.email || ""),
  };
}

async function countMyOverlappingItems(
  db: FirebaseFirestore.Firestore,
  uid: string,
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string,
  tx?: FirebaseFirestore.Transaction
) {
  const query = db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso);
  const snap = tx ? await tx.get(query) : await query.get();

  let count = 0;

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && String(r?.id) === excludeReservationId) continue;

    const rStart = String(r?.blockStartIso || "");
    const rEnd = String(r?.blockEndIso || "");
    if (!rStart || !rEnd) continue;

    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    // For bundle reservations use items[].length; fall back to kayakIds[] for legacy reservations.
    const itemCount = Array.isArray(r?.items) && r.items.length > 0 ?
      r.items.length :
      (Array.isArray(r?.kayakIds) ? r.kayakIds.length : 0);
    count += itemCount;
  }

  return count;
}

async function findConflicts(
  db: FirebaseFirestore.Firestore,
  kayakIds: string[],
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string,
  tx?: FirebaseFirestore.Transaction
) {
  const query = db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso);
  const snap = tx ? await tx.get(query) : await query.get();

  const conflicts = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && String(r?.id) === excludeReservationId) continue;

    const rStart = String(r?.blockStartIso || "");
    const rEnd = String(r?.blockEndIso || "");
    if (!rStart || !rEnd) continue;

    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    const ids = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];
    for (const id of ids) {
      const sid = norm(id);
      if (sid && kayakIds.includes(sid)) conflicts.add(sid);
    }
  }

  return Array.from(conflicts);
}

// UWAGA (D2): legacy createReservation została usunięta — tworzenie rezerwacji
// kajakowych przechodzi przez createBundleReservation (gear_bundle_service.ts),
// która zapisuje też pola kayakIds/kayakCount dla zgodności wstecznej.
// Ten moduł nadal obsługuje: cancelReservation (wspólny dla obu formatów)
// oraz updateReservationDates (dla ISTNIEJĄCYCH rezerwacji legacy bez itemIds —
// routing w updateGearReservationDates).

export async function cancelReservation(db: FirebaseFirestore.Firestore, args: { uid: string; reservationId: string }) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const ref = db.collection("gear_reservations").doc(rid);

  // DECYZJA (audyt L9): anulowanie CELOWO nie sprawdza zawieszenia konta —
  // zawieszony użytkownik może wycofać rezerwację (klub odzyskuje sprzęt,
  // użytkownik godzinki). Tworzenie i zmiana dat pozostają zablokowane
  // (isUserStatusBlocked w create/update).
  // Jedna transakcja: odczyt rezerwacji + zwrot godzinek + zmiana statusu.
  // Eliminuje okno awarii, w którym refund się powiódł, a rezerwacja
  // pozostała aktywna (kolejne anulowanie kończyłoby się spend_not_found).
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

    const r = snap.data() as any;
    if (String(r?.userUid || "") !== args.uid) return {ok: false, code: "forbidden", message: "Not yours"} as const;
    if (String(r?.status || "") !== "active") return {ok: false, code: "invalid_state", message: "Not active"} as const;

    const todayIso = todayIsoUTC();
    const blockStartIso = String(r?.blockStartIso || "");

    // Anulowanie tylko przed startem okresu blokady (offset)
    if (!(todayIso < blockStartIso)) {
      return {ok: false, code: "cancel_blocked", message: "Cannot cancel after offset start"} as const;
    }

    // Zwróć godzinki przed anulowaniem rezerwacji
    const costHours = Number(r?.costHours || 0);
    if (costHours > 0) {
      const refundResult = await refundHoursForReservationInTx(tx, db, args.uid, rid, costHours, new Date());

      if (!refundResult.ok) {
        return {
          ok: false,
          code: refundResult.code || "refund_failed",
          message: refundResult.message || "Cannot refund hours for this reservation",
        } as const;
      }
    }

    tx.set(ref, {status: "cancelled", cancelledAt: new Date(), updatedAt: new Date()}, {merge: true});
    return {ok: true} as const;
  });
}

export async function updateReservationDates(
  db: FirebaseFirestore.Firestore,
  args: { uid: string; reservationId: string; startDate: string; endDate: string }
) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const ref = db.collection("gear_reservations").doc(rid);

  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const vars = await getGearVars(db);
  const godzinkiVars = await getGodzinkiVars(db);

  // Jedna transakcja: świeży odczyt rezerwacji + kontrole + korekta godzinek
  // (dodeduktowanie lub cofnięcie FIFO) + zapis nowych dat.
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

    const r = snap.data() as any;
    if (String(r?.userUid || "") !== args.uid) return {ok: false, code: "forbidden", message: "Not yours"} as const;
    if (String(r?.status || "") !== "active") return {ok: false, code: "invalid_state", message: "Not active"} as const;

    const oldStart = String(r?.startDate || "");
    const oldEnd = String(r?.endDate || "");
    const kayakIds = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];

    const todayIso = todayIsoUTC();
    const oldBlockStart = String(r?.blockStartIso || "");

    // Po starcie offsetu → tylko skrócenie do 1 dnia (start=end=oryginalny start)
    if (!(todayIso < oldBlockStart)) {
      if (!(args.startDate === oldStart && args.endDate === oldStart)) {
        return {
          ok: false,
          code: "update_blocked",
          message: "After offset start you can only shorten to 1 day (start=end=original start)",
          details: {requiredStart: oldStart, requiredEnd: oldStart},
        } as const;
      }
    }

    const roleKey = user.roleKey;
    const maxWeeks = roleMaxWeeks(vars, roleKey);
    const maxItems = roleMaxItems(vars, roleKey);

    const maxEndIso = maxEndIsoByWeeks(maxWeeks);
    if (args.endDate > maxEndIso) {
      return {ok: false, code: "max_time_exceeded", message: "Too far in future", details: {maxWeeks}} as const;
    }

    const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

    const already = await countMyOverlappingItems(db, args.uid, blockStartIso, blockEndIso, rid, tx);
    if (already + kayakIds.length > maxItems) {
      return {
        ok: false,
        code: "max_items_exceeded",
        message: "Max items exceeded",
        details: {already, requested: kayakIds.length, maxItems},
      } as const;
    }

    const conflicts = await findConflicts(db, kayakIds, blockStartIso, blockEndIso, rid, tx);
    if (conflicts.length) {
      return {ok: false, code: "conflict", message: "Not available", details: {conflictKayakIds: conflicts}} as const;
    }

    const newCostHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakIds.length);
    const oldCostHours = Number(r?.costHours ?? 0);
    const delta = newCostHours - oldCostHours;
    const now = new Date();

    // Korekta godzinek dla delty różnicy kosztów
    if (delta > 0) {
      // Nowa data droższa — dodeduktuj różnicę
      const deductResult = await deductHoursInTx(
        tx,
        db,
        args.uid,
        {
          amount: delta,
          reason: `Korekta rezerwacji ${rid} (${oldCostHours}h → ${newCostHours}h)`,
          reservationId: rid,
        },
        godzinkiVars,
        now
      );

      if (!deductResult.ok) {
        return {
          ok: false,
          code: deductResult.code || "hours_deduction_failed",
          message: deductResult.message || "Insufficient hours for updated reservation",
        } as const;
      }
    } else if (delta < 0) {
      // Nowa data tańsza — cofnij dedukcję do oryginalnych pul FIFO
      // (zachowuje oryginalną ważność godzinek — bez "odświeżania" wygasających pul)
      const reverseResult = await reverseDeductHoursInTx(
        tx,
        db,
        args.uid,
        rid,
        Math.abs(delta),
        godzinkiVars.expiryYears,
        now
      );

      if (!reverseResult.ok) {
        return {
          ok: false,
          code: reverseResult.code || "hours_reverse_failed",
          message: reverseResult.message || "Cannot reverse hours for updated reservation",
        } as const;
      }
    }

    tx.set(
      ref,
      {
        startDate: args.startDate,
        endDate: args.endDate,
        blockStartIso,
        blockEndIso,
        costHours: newCostHours,
        updatedAt: now,
        modifiedFrom: {startDate: oldStart, endDate: oldEnd},
      },
      {merge: true}
    );

    return {ok: true, costHours: newCostHours, blockStartIso, blockEndIso} as const;
  });
}
