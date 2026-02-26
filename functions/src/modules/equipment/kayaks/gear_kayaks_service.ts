import {computeBlockIso, overlapsIso, maxEndIsoByWeeks, todayIsoUTC} from "../../calendar/calendar_utils";
import {getGearVars, roleMaxItems, roleMaxWeeks} from "../../setup/setup_gear_vars";
import {quoteKayaksCostHours} from "../../hours/hours_quote";

type ReservationStatus = "active" | "cancelled";

function norm(s: any): string {
  return String(s || "").trim();
}

function uniq(xs: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const v = norm(x);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
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
  excludeReservationId?: string
) {
  const snap = await db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

  let count = 0;

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && String(r?.id) === excludeReservationId) continue;

    const rStart = String(r?.blockStartIso || "");
    const rEnd = String(r?.blockEndIso || "");
    if (!rStart || !rEnd) continue;

    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    const ids = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];
    count += ids.length;
  }

  return count;
}

async function findConflicts(
  db: FirebaseFirestore.Firestore,
  kayakIds: string[],
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string
) {
  const snap = await db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

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

export async function createReservation(
  db: FirebaseFirestore.Firestore,
  args: { uid: string; startDate: string; endDate: string; kayakIds: string[]; note?: string }
) {
  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  const roleKey = user.roleKey;
  if (roleKey === "rola_sympatyk") return {ok: false, code: "forbidden", message: "Role not allowed"} as const;

  const vars = await getGearVars(db);

  const kayakIds = uniq(args.kayakIds);
  if (!kayakIds.length) return {ok: false, code: "no_items", message: "No kayaks selected"} as const;

  const maxWeeks = roleMaxWeeks(vars, roleKey);
  const maxItems = roleMaxItems(vars, roleKey);
  if (maxWeeks <= 0 || maxItems <= 0) return {ok: false, code: "forbidden", message: "Role not allowed"} as const;

  const maxEndIso = maxEndIsoByWeeks(maxWeeks);
  if (args.endDate > maxEndIso) {
    return {ok: false, code: "max_time_exceeded", message: "Too far in future", details: {maxWeeks}} as const;
  }

  const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

  const already = await countMyOverlappingItems(db, args.uid, blockStartIso, blockEndIso);
  if (already + kayakIds.length > maxItems) {
    return {
      ok: false,
      code: "max_items_exceeded",
      message: "Max items exceeded",
      details: {already, requested: kayakIds.length, maxItems},
    } as const;
  }

  const conflicts = await findConflicts(db, kayakIds, blockStartIso, blockEndIso);
  if (conflicts.length) {
    return {ok: false, code: "conflict", message: "Not available", details: {conflictKayakIds: conflicts}} as const;
  }

  const costHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakIds.length);

  const ref = db.collection("gear_reservations").doc();
  const now = new Date();

  const doc = {
    id: ref.id,
    status: "active" as ReservationStatus,

    userUid: args.uid,
    userEmail: user.email,
    role_key: roleKey,
    status_key: user.statusKey,

    startDate: args.startDate,
    endDate: args.endDate,
    offsetDays: vars.offsetDays,
    blockStartIso,
    blockEndIso,

    kayakIds,
    kayakCount: kayakIds.length,

    costHours,
    note: norm(args.note),

    createdAt: now,
    updatedAt: now,
  };

  await ref.set(doc);
  return {ok: true, reservationId: ref.id, costHours, blockStartIso, blockEndIso} as const;
}

export async function cancelReservation(db: FirebaseFirestore.Firestore, args: { uid: string; reservationId: string }) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const ref = db.collection("gear_reservations").doc(rid);
  const snap = await ref.get();
  if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

  const r = snap.data() as any;
  if (String(r?.userUid || "") !== args.uid) return {ok: false, code: "forbidden", message: "Not yours"} as const;
  if (String(r?.status || "") !== "active") return {ok: false, code: "invalid_state", message: "Not active"} as const;

  const todayIso = todayIsoUTC();
  const blockStartIso = String(r?.blockStartIso || "");

  // ✅ anulowanie tylko przed startem offsetu
  if (!(todayIso < blockStartIso)) {
    return {ok: false, code: "cancel_blocked", message: "Cannot cancel after offset start"} as const;
  }

  await ref.set({status: "cancelled", cancelledAt: new Date(), updatedAt: new Date()}, {merge: true});
  return {ok: true} as const;
}

export async function updateReservationDates(
  db: FirebaseFirestore.Firestore,
  args: { uid: string; reservationId: string; startDate: string; endDate: string }
) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const ref = db.collection("gear_reservations").doc(rid);
  const snap = await ref.get();
  if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

  const r = snap.data() as any;
  if (String(r?.userUid || "") !== args.uid) return {ok: false, code: "forbidden", message: "Not yours"} as const;
  if (String(r?.status || "") !== "active") return {ok: false, code: "invalid_state", message: "Not active"} as const;

  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  const vars = await getGearVars(db);

  const oldStart = String(r?.startDate || "");
  const oldEnd = String(r?.endDate || "");
  const kayakIds = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];

  const todayIso = todayIsoUTC();
  const oldBlockStart = String(r?.blockStartIso || "");

  // ✅ jeśli offset już wystartował → tylko skrócenie do minimum 1 dzień na wodzie (start=end=OLD start)
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

  // przed offsetem: wolno modyfikować (shorten/extend), ale z limitami i bez kolizji
  const roleKey = user.roleKey;
  const maxWeeks = roleMaxWeeks(vars, roleKey);
  const maxItems = roleMaxItems(vars, roleKey);

  const maxEndIso = maxEndIsoByWeeks(maxWeeks);
  if (args.endDate > maxEndIso) {
    return {ok: false, code: "max_time_exceeded", message: "Too far in future", details: {maxWeeks}} as const;
  }

  const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

  // limit items: liczymy inne rezerwacje nakładające się + ta rezerwacja (wykluczamy ją w count)
  const already = await countMyOverlappingItems(db, args.uid, blockStartIso, blockEndIso, rid);
  if (already + kayakIds.length > maxItems) {
    return {
      ok: false,
      code: "max_items_exceeded",
      message: "Max items exceeded",
      details: {already, requested: kayakIds.length, maxItems},
    } as const;
  }

  const conflicts = await findConflicts(db, kayakIds, blockStartIso, blockEndIso, rid);
  if (conflicts.length) {
    return {ok: false, code: "conflict", message: "Not available", details: {conflictKayakIds: conflicts}} as const;
  }

  const costHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakIds.length);

  await ref.set(
    {
      startDate: args.startDate,
      endDate: args.endDate,
      blockStartIso,
      blockEndIso,
      costHours,
      updatedAt: new Date(),
      modifiedFrom: {startDate: oldStart, endDate: oldEnd},
    },
    {merge: true}
  );

  return {ok: true, costHours, blockStartIso, blockEndIso} as const;
}
