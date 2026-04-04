import {computeBlockIso, overlapsIso, maxEndIsoByWeeks, todayIsoUTC} from "../../calendar/calendar_utils";
import {getGearVars, roleMaxItems, roleMaxWeeks} from "../../setup/setup_gear_vars";
import {quoteKayaksCostHours} from "../../hours/hours_quote";
import {deductHours, creditReservationAdjustment} from "../../hours/godzinki_service";
import {getGodzinkiVars} from "../../hours/godzinki_vars";
import {isUserStatusBlocked} from "../../users/userStatusCheck";
import {updateReservationDates} from "../kayaks/gear_kayaks_service";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type BundleItemInput = {
  itemId: string;
  category: string;
};

export type BundleItemStored = {
  itemId: string;
  category: string;
  itemNumber: string;
  itemLabel: string;
  isPrimary: boolean;
  isKayak: boolean;
};

export type ReservationKind = "kayak_bundle" | "gear_only";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLLECTIONS: Record<string, string> = {
  kayaks: "gear_kayaks",
  paddles: "gear_paddles",
  lifejackets: "gear_lifejackets",
  helmets: "gear_helmets",
  throwbags: "gear_throwbags",
  sprayskirts: "gear_sprayskirts",
};

// Priority order for computing the primary item in a bundle.
// Lower index = higher priority. A kayak always wins.
const CATEGORY_PRIORITY = ["kayaks", "paddles", "lifejackets", "helmets", "sprayskirts", "throwbags"];

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers — these are mirrored exactly in test_bundle_reservations.py
// ──────────────────────────────────────────────────────────────────────────────

function norm(s: any): string {
  return String(s || "").trim();
}

/**
 * Composite identifier for an item across all categories.
 * Format: "{category}/{itemId}" — e.g. "kayaks/K01", "paddles/P01"
 */
export function compositeId(category: string, itemId: string): string {
  return `${norm(category)}/${norm(itemId)}`;
}

export function isSupportedBundleCategory(category: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATEGORY_COLLECTIONS, norm(category).toLowerCase());
}

/**
 * Determines reservationKind from an item list.
 * "kayak_bundle" if any item is in the "kayaks" category, "gear_only" otherwise.
 */
export function computeReservationKind(items: BundleItemInput[]): ReservationKind {
  return items.some((i) => norm(i.category).toLowerCase() === "kayaks") ?
    "kayak_bundle" :
    "gear_only";
}

/**
 * Returns the index of the primary item in the stored items array.
 * Primary = item in highest-priority category. If multiple items share the
 * same category, the first one (as provided) is primary.
 */
export function computePrimaryItemIdx(items: BundleItemStored[]): number {
  for (const cat of CATEGORY_PRIORITY) {
    const idx = items.findIndex((i) => norm(i.category).toLowerCase() === cat);
    if (idx !== -1) return idx;
  }
  return 0;
}

function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of arr) {
    const k = key(t);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

function buildCostReason(items: BundleItemStored[], startDate: string, endDate: string): string {
  const kayaks = items.filter((i) => i.isKayak);
  if (kayaks.length === 1) {
    return `Rezerwacja zestawu z kajakiem (${startDate}–${endDate})`;
  }
  if (kayaks.length > 1) {
    return `Rezerwacja zestawu z ${kayaks.length} kajakami (${startDate}–${endDate})`;
  }
  return `Rezerwacja sprzętu — zestaw (${startDate}–${endDate})`;
}

function buildNonKayakMeta(d: any, cat: string): Record<string, any> {
  switch (cat) {
  case "paddles":
    return {
      lengthCm: d?.lengthCm ?? null,
      featherAngle: norm(d?.featherAngle),
      isBreakdown: d?.isBreakdown ?? null,
    };
  case "lifejackets":
    return {buoyancy: norm(d?.buoyancy)};
  case "helmets":
    return {};
  case "throwbags":
    return {};
  case "sprayskirts":
    return {
      material: norm(d?.material),
      tunnelSize: norm(d?.tunnelSize),
    };
  default:
    return {};
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: user auth
// ──────────────────────────────────────────────────────────────────────────────

async function getUserRole(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db.collection("users_active").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  return {
    roleKey: norm(data?.role_key) || "rola_sympatyk",
    statusKey: norm(data?.status_key) || "status_aktywny",
    email: norm(data?.email),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: item detail fetching + validation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and validates item details from their respective Firestore collections.
 * Validates that each item:
 *   - exists in its collection
 *   - is active and not scrapped
 *   - passes category-specific reservability checks (kayaks: isOperational, isPrivate)
 */
export async function fetchItemDetails(
  db: FirebaseFirestore.Firestore,
  items: BundleItemInput[]
): Promise<
  | {ok: true; items: BundleItemStored[]}
  | {ok: false; code: string; message: string; details?: any}
> {
  // Group by category for batch fetching
  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const cat = norm(item.category).toLowerCase();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    const catList = byCategory.get(cat);
    if (catList) catList.push(norm(item.itemId));
  }

  // Fetch each category and build a map: compositeId → doc data
  const foundDocs = new Map<string, any>();

  for (const [cat] of byCategory.entries()) {
    const collection = CATEGORY_COLLECTIONS[cat];
    if (!collection) {
      return {ok: false, code: "invalid_category", message: `Nieobsługiwana kategoria: ${cat}`};
    }

    const snap = await db.collection(collection).where("isActive", "==", true).get();
    for (const doc of snap.docs) {
      const d = doc.data() as any;
      if (d?.gearScrapped === true) continue;
      const resolvedId = norm(d?.id) || doc.id;
      foundDocs.set(compositeId(cat, resolvedId), {...d, _resolvedId: resolvedId, _category: cat});
    }
  }

  // Validate and build result list
  const result: BundleItemStored[] = [];

  for (const inputItem of items) {
    const cat = norm(inputItem.category).toLowerCase();
    const iid = norm(inputItem.itemId);
    const cid = compositeId(cat, iid);
    const found = foundDocs.get(cid);

    if (!found) {
      return {
        ok: false,
        code: "item_not_found",
        message: `Nie znaleziono przedmiotu: ${iid} (kategoria: ${cat})`,
        details: {itemId: iid, category: cat},
      };
    }

    // Category-specific checks
    if (cat === "kayaks") {
      const storageVal = norm(found?.storage || found?.storedAt).toLowerCase();
      if (storageVal === "basen") {
        return {
          ok: false,
          code: "item_not_reservable",
          message: `Kajak ${iid} jest przypisany do basenu i nie może być rezerwowany w module Sprzęt`,
          details: {itemId: iid, category: cat},
        };
      }
      if (found.isOperational !== true) {
        return {
          ok: false,
          code: "item_not_operational",
          message: `Kajak ${iid} jest niesprawny`,
          details: {itemId: iid, category: cat},
        };
      }
      if (found.isPrivate === true && found.isPrivateRentable !== true) {
        return {
          ok: false,
          code: "item_not_reservable",
          message: `Kajak prywatny ${iid} nie jest dostępny do rezerwacji`,
          details: {itemId: iid, category: cat},
        };
      }
    }

    const isKayak = cat === "kayaks";
    const number = norm(found?.number || found?._resolvedId);
    const brand = norm(found?.brand);
    const model = norm(found?.model);
    const label = [brand, model].filter(Boolean).join(" ") || number || cat;

    result.push({
      itemId: iid,
      category: cat,
      itemNumber: number,
      itemLabel: label,
      isPrimary: false, // set below
      isKayak,
    });
  }

  // Mark primary
  const primaryIdx = computePrimaryItemIdx(result);
  result.forEach((item, idx) => {
    item.isPrimary = idx === primaryIdx;
  });

  return {ok: true, items: result};
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: conflict detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Finds conflicting composite item IDs for a proposed date range.
 *
 * Checks against both:
 *   - r.itemIds[]  — new bundle format ("kayaks/K01", "paddles/P01")
 *   - r.kayakIds[] — legacy kayak-only format ("K01") for backward compatibility
 *
 * This mirrors find_bundle_conflicts() in test_bundle_reservations.py.
 */
export async function findBundleConflicts(
  db: FirebaseFirestore.Firestore,
  compositeIds: string[],
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string
): Promise<string[]> {
  const snap = await db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

  const conflicts = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && norm(r?.id) === excludeReservationId) continue;

    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    const existingItemIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];
    const existingKayakIds: string[] = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];

    for (const cid of compositeIds) {
      // New-format check
      if (existingItemIds.includes(cid)) {
        conflicts.add(cid);
        continue;
      }
      // Legacy kayak check: "kayaks/K01" vs legacy "K01"
      if (cid.startsWith("kayaks/")) {
        const kayakId = cid.slice("kayaks/".length);
        if (existingKayakIds.includes(kayakId)) conflicts.add(cid);
      }
    }
  }

  return Array.from(conflicts);
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: overlapping item count
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Counts total items in all of a user's active, overlapping reservations.
 *
 * Uses items[] length for new bundle reservations,
 * kayakIds[] length for legacy kayak-only reservations.
 *
 * This mirrors count_overlapping_items() in test_bundle_reservations.py.
 */
export async function countMyOverlappingBundleItems(
  db: FirebaseFirestore.Firestore,
  uid: string,
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string
): Promise<number> {
  const snap = await db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

  let count = 0;

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && norm(r?.id) === excludeReservationId) continue;

    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    if (Array.isArray(r?.items)) {
      count += (r.items as any[]).length;
    } else if (Array.isArray(r?.kayakIds)) {
      count += (r.kayakIds as any[]).length;
    }
  }

  return count;
}

// ──────────────────────────────────────────────────────────────────────────────
// Firestore: reserved composite ID set for a block period
// ──────────────────────────────────────────────────────────────────────────────

async function getReservedCompositeIdsForPeriod(
  db: FirebaseFirestore.Firestore,
  blockStartIso: string,
  blockEndIso: string
): Promise<Set<string>> {
  const snap = await db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso)
    .get();

  const reserved = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    // New format: itemIds
    const itemIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];
    for (const cid of itemIds) reserved.add(cid);

    // Legacy format: kayakIds → convert to composite
    const kayakIds: string[] = Array.isArray(r?.kayakIds) ? r.kayakIds.map(String) : [];
    for (const kid of kayakIds) {
      if (kid) reserved.add(compositeId("kayaks", kid));
    }
  }

  return reserved;
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Create bundle reservation
// ──────────────────────────────────────────────────────────────────────────────

export async function createBundleReservation(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    startDate: string;
    endDate: string;
    items: BundleItemInput[];
    starterCategory: string;
    starterItemId: string;
  }
) {
  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const roleKey = user.roleKey;
  if (roleKey === "rola_sympatyk") {
    return {ok: false, code: "forbidden", message: "Role not allowed"} as const;
  }

  // Normalise and deduplicate items
  const rawItems: BundleItemInput[] = args.items
    .map((i) => ({itemId: norm(i.itemId), category: norm(i.category).toLowerCase()}))
    .filter((i) => i.itemId && i.category);

  const items = uniqBy(rawItems, (i) => compositeId(i.category, i.itemId));

  if (!items.length) {
    return {ok: false, code: "no_items", message: "Nie wybrano żadnych przedmiotów"} as const;
  }

  // Validate all categories
  for (const item of items) {
    if (!isSupportedBundleCategory(item.category)) {
      return {
        ok: false,
        code: "invalid_category",
        message: `Nieobsługiwana kategoria: ${item.category}`,
      } as const;
    }
  }

  const vars = await getGearVars(db);
  const maxWeeks = roleMaxWeeks(vars, roleKey);
  const maxItems = roleMaxItems(vars, roleKey);

  if (maxWeeks <= 0 || maxItems <= 0) {
    return {ok: false, code: "forbidden", message: "Role not allowed"} as const;
  }

  const maxEndIso = maxEndIsoByWeeks(maxWeeks);
  if (args.endDate > maxEndIso) {
    return {ok: false, code: "max_time_exceeded", message: "Too far in future", details: {maxWeeks}} as const;
  }

  const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

  // Fetch and validate items from Firestore
  const itemDetailsResult = await fetchItemDetails(db, items);
  if (!itemDetailsResult.ok) {
    return itemDetailsResult;
  }

  const itemDetails = itemDetailsResult.items;
  const primaryItem = itemDetails.find((i) => i.isPrimary) || itemDetails[0];
  const reservationKind = computeReservationKind(items);

  // Composite IDs for conflict detection
  const compositeIds = items.map((i) => compositeId(i.category, i.itemId));

  // Check user's total overlapping item count
  const already = await countMyOverlappingBundleItems(db, args.uid, blockStartIso, blockEndIso);
  if (already + items.length > maxItems) {
    return {
      ok: false,
      code: "max_items_exceeded",
      message: "Max items exceeded",
      details: {already, requested: items.length, maxItems},
    } as const;
  }

  // Find conflicts with existing reservations
  const conflicts = await findBundleConflicts(db, compositeIds, blockStartIso, blockEndIso);
  if (conflicts.length) {
    return {
      ok: false,
      code: "conflict",
      message: "Wybrane przedmioty nie są dostępne w tym terminie",
      details: {conflictItemIds: conflicts},
    } as const;
  }

  // Cost: only kayaks are priced
  const kayakIds = items.filter((i) => i.category === "kayaks").map((i) => i.itemId);
  const costHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakIds.length);

  const ref = db.collection("gear_reservations").doc();
  const now = new Date();

  const doc = {
    id: ref.id,
    status: "active" as const,
    reservationKind,

    userUid: args.uid,
    userEmail: user.email,
    role_key: roleKey,
    status_key: user.statusKey,

    startDate: args.startDate,
    endDate: args.endDate,
    offsetDays: vars.offsetDays,
    blockStartIso,
    blockEndIso,

    // Bundle items (full details for display)
    items: itemDetails,
    // Flat composite IDs for Firestore conflict queries
    itemIds: compositeIds,

    // Starter item (where the user initiated the reservation)
    starterCategory: norm(args.starterCategory).toLowerCase(),
    starterItemId: norm(args.starterItemId),

    // Primary item (computed)
    primaryCategory: norm(primaryItem.category),
    primaryItemId: norm(primaryItem.itemId),

    // Backward compat: legacy kayak fields
    kayakIds,
    kayakCount: kayakIds.length,

    costHours,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(doc);

  // Deduct hours atomically — rollback if insufficient
  if (costHours > 0) {
    const godzinkiVars = await getGodzinkiVars(db);
    const deductResult = await deductHours(
      db,
      args.uid,
      {
        amount: costHours,
        reason: buildCostReason(itemDetails, args.startDate, args.endDate),
        reservationId: ref.id,
      },
      godzinkiVars,
      now
    );

    if (!deductResult.ok) {
      await ref.delete();
      return {
        ok: false,
        code: deductResult.code || "hours_deduction_failed",
        message: deductResult.message || "Insufficient hours",
      } as const;
    }
  }

  return {
    ok: true,
    reservationId: ref.id,
    costHours,
    reservationKind,
    blockStartIso,
    blockEndIso,
    primaryCategory: primaryItem.category,
    primaryItemId: primaryItem.itemId,
  } as const;
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Update reservation dates (unified — handles both old and new format)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Unified date-update entry point.
 * Routes to the legacy kayak flow for old reservations,
 * or to bundle-specific logic for reservations that have reservationKind set.
 */
export async function updateGearReservationDates(
  db: FirebaseFirestore.Firestore,
  args: {uid: string; reservationId: string; startDate: string; endDate: string}
) {
  const rid = norm(args.reservationId);
  if (!rid) return {ok: false, code: "bad_request", message: "Missing reservationId"} as const;

  const snap = await db.collection("gear_reservations").doc(rid).get();
  if (!snap.exists) return {ok: false, code: "not_found", message: "Not found"} as const;

  const r = snap.data() as any;
  const reservationKind = norm(r?.reservationKind);
  const isBundle = reservationKind === "kayak_bundle" || reservationKind === "gear_only" ||
                   Array.isArray(r?.items);

  if (isBundle) {
    return updateBundleReservationDates(db, args, r);
  }

  // Legacy kayak-only reservation — delegate unchanged
  return updateReservationDates(db, args);
}

async function updateBundleReservationDates(
  db: FirebaseFirestore.Firestore,
  args: {uid: string; reservationId: string; startDate: string; endDate: string},
  r: any
) {
  const rid = norm(args.reservationId);

  if (norm(r?.userUid) !== args.uid) {
    return {ok: false, code: "forbidden", message: "Not yours"} as const;
  }
  if (norm(r?.status) !== "active") {
    return {ok: false, code: "invalid_state", message: "Not active"} as const;
  }

  const user = await getUserRole(db, args.uid);
  if (!user) return {ok: false, code: "forbidden", message: "User not registered"} as const;

  if (await isUserStatusBlocked(db, user.statusKey)) {
    return {ok: false, code: "forbidden", message: "Access blocked"} as const;
  }

  const vars = await getGearVars(db);
  const roleKey = user.roleKey;

  const oldStart = norm(r?.startDate);
  const oldBlockStart = norm(r?.blockStartIso);
  const todayIso = todayIsoUTC();

  // After block start: only allow shortening to 1 day (same rule as kayaks)
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

  const maxWeeks = roleMaxWeeks(vars, roleKey);
  const maxItems = roleMaxItems(vars, roleKey);
  const maxEndIso = maxEndIsoByWeeks(maxWeeks);

  if (args.endDate > maxEndIso) {
    return {ok: false, code: "max_time_exceeded", message: "Too far in future", details: {maxWeeks}} as const;
  }

  const {blockStartIso, blockEndIso} = computeBlockIso(args.startDate, args.endDate, vars.offsetDays);

  // Stored items
  const storedItemDetails: BundleItemStored[] = Array.isArray(r?.items) ? r.items : [];
  const compositeIds: string[] = Array.isArray(r?.itemIds) ? r.itemIds.map(String) : [];

  // Item count check (exclude self)
  const already = await countMyOverlappingBundleItems(db, args.uid, blockStartIso, blockEndIso, rid);
  if (already + storedItemDetails.length > maxItems) {
    return {
      ok: false,
      code: "max_items_exceeded",
      message: "Max items exceeded",
      details: {already, requested: storedItemDetails.length, maxItems},
    } as const;
  }

  // Conflict check (exclude self)
  const conflicts = await findBundleConflicts(db, compositeIds, blockStartIso, blockEndIso, rid);
  if (conflicts.length) {
    return {
      ok: false,
      code: "conflict",
      message: "Wybrane przedmioty nie są dostępne w tym terminie",
      details: {conflictItemIds: conflicts},
    } as const;
  }

  const kayakCount = Number(r?.kayakCount ?? 0);
  const newCostHours = quoteKayaksCostHours(vars, roleKey, args.startDate, args.endDate, kayakCount);
  const oldCostHours = Number(r?.costHours ?? 0);
  const delta = newCostHours - oldCostHours;
  const now = new Date();

  if (delta > 0) {
    const godzinkiVars = await getGodzinkiVars(db);
    const deductResult = await deductHours(
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
    const godzinkiVars = await getGodzinkiVars(db);
    await creditReservationAdjustment(
      db,
      args.uid,
      Math.abs(delta),
      rid,
      godzinkiVars.expiryYears,
      now
    );
  }

  const oldEnd = norm(r?.endDate);
  await db.collection("gear_reservations").doc(rid).set(
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
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: Get items with availability for a date range
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns items in a category annotated with isAvailableForRange.
 * Applies category-specific reservability filters (for kayaks: isOperational, !isPrivate).
 * Non-kayak items: active and non-scrapped items are treated as reservable.
 */
export async function getItemsWithAvailability(
  db: FirebaseFirestore.Firestore,
  category: string,
  startDate: string,
  endDate: string,
  offsetDays: number
) {
  const cat = norm(category).toLowerCase();
  const collection = CATEGORY_COLLECTIONS[cat];
  if (!collection) throw new Error(`Unsupported category: ${cat}`);

  const {blockStartIso, blockEndIso} = computeBlockIso(startDate, endDate, offsetDays);
  const reservedCids = await getReservedCompositeIdsForPeriod(db, blockStartIso, blockEndIso);

  const snap = await db.collection(collection).where("isActive", "==", true).limit(500).get();
  const items: any[] = [];

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    if (d?.gearScrapped === true) continue;

    const resolvedId = norm(d?.id) || doc.id;
    const cid = compositeId(cat, resolvedId);

    // Kayak-specific: only show operational, reservable kayaks
    if (cat === "kayaks") {
      if (d?.isOperational !== true) continue;
      if (d?.isPrivate === true && d?.isPrivateRentable !== true) continue;
    }

    const isAvailableForRange = !reservedCids.has(cid);
    const number = norm(d?.number || resolvedId);
    const brand = norm(d?.brand);
    const model = norm(d?.model);
    const label = [brand, model].filter(Boolean).join(" ") || number;

    const item: Record<string, any> = {
      id: resolvedId,
      number,
      brand,
      model,
      type: norm(d?.type),
      color: norm(d?.color),
      size: norm(d?.size),
      status: norm(d?.status),
      label,
      category: cat,
      isAvailableForRange,
    };

    if (cat === "kayaks") {
      item.isOperational = d?.isOperational ?? null;
      item.isPrivate = d?.isPrivate ?? null;
      item.weightRange = norm(d?.weightRange);
      item.liters = d?.liters ?? null;
      item.cockpit = norm(d?.cockpit);
      item.storage = norm(d?.storage || d?.storedAt);
    } else {
      item.meta = buildNonKayakMeta(d, cat);
    }

    items.push(item);
  }

  items.sort((a, b) =>
    norm(a?.number || a?.id).localeCompare(norm(b?.number || b?.id), "pl")
  );

  return {items, blockStartIso, blockEndIso};
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC: List my reservations (supports both old and new format)
// ──────────────────────────────────────────────────────────────────────────────

export async function listMyBundleReservations(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((d) => d.data());
}
