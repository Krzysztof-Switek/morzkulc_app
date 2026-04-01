"""
Testy logiki biznesowej systemu rezerwacji zestawów sprzętu (bundle reservations).

Testy uruchamiane lokalnie (pytest). Brak zewnętrznych zależności — pure Python.

Odwzorowują funkcje z gear_bundle_service.ts:
  compositeId(category, itemId)
  computeReservationKind(items)
  computePrimaryItemIdx(items)
  findBundleConflicts(compositeIds, reservations, blockStart, blockEnd)
  countOverlappingItems(uid, reservations, blockStart, blockEnd)

Sekcje:
  A. Testy logiki (8 testów) — czyszte funkcje pomocnicze
  B. Testy scenariuszowe (10 testów) — end-to-end flow przez pure-Python backend stub
"""

import unittest

# ──────────────────────────────────────────────────────────────────────────────
# Pure-Python mirrors of gear_bundle_service.ts pure functions
# ──────────────────────────────────────────────────────────────────────────────

CATEGORY_PRIORITY = ["kayaks", "paddles", "lifejackets", "helmets", "sprayskirts", "throwbags"]

CATEGORY_COLLECTIONS = {
    "kayaks": "gear_kayaks",
    "paddles": "gear_paddles",
    "lifejackets": "gear_lifejackets",
    "helmets": "gear_helmets",
    "throwbags": "gear_throwbags",
    "sprayskirts": "gear_sprayskirts",
}


def composite_id(category: str, item_id: str) -> str:
    """"{category}/{itemId}" — e.g. "kayaks/K01", "paddles/P01"."""
    return f"{category.strip()}/{item_id.strip()}"


def compute_reservation_kind(items: list) -> str:
    """
    "kayak_bundle" if any item is in the "kayaks" category, "gear_only" otherwise.
    Mirrors computeReservationKind() in gear_bundle_service.ts.
    """
    for item in items:
        if str(item.get("category", "")).strip().lower() == "kayaks":
            return "kayak_bundle"
    return "gear_only"


def compute_primary_item_idx(items: list) -> int:
    """
    Returns index of the primary item using CATEGORY_PRIORITY.
    Mirrors computePrimaryItemIdx() in gear_bundle_service.ts.
    """
    for cat in CATEGORY_PRIORITY:
        for idx, item in enumerate(items):
            if str(item.get("category", "")).strip().lower() == cat:
                return idx
    return 0


def overlaps_iso(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    """
    Lexicographic ISO date overlap check (same as overlapsIso in calendar_utils.ts).
    [aStart, aEnd] overlaps [bStart, bEnd] iff aStart <= bEnd AND aEnd >= bStart.
    """
    return a_start <= b_end and a_end >= b_start


def compute_block_iso(start_date: str, end_date: str, offset_days: int = 1) -> tuple:
    """
    blockStartIso = startDate - offset_days, blockEndIso = endDate + offset_days.
    Pure string arithmetic: YYYY-MM-DD. For simplicity we use datetime.
    """
    from datetime import datetime, timedelta
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    block_start = (start - timedelta(days=offset_days)).strftime("%Y-%m-%d")
    block_end = (end + timedelta(days=offset_days)).strftime("%Y-%m-%d")
    return block_start, block_end


def find_bundle_conflicts(composite_ids: list, reservations: list,
                          block_start: str, block_end: str,
                          exclude_id: str = None) -> list:
    """
    Finds conflicting composite IDs.
    Checks r.itemIds[] (new format) and r.kayakIds[] (legacy format).
    Mirrors findBundleConflicts() in gear_bundle_service.ts.
    """
    conflicts = set()

    for r in reservations:
        if r.get("status") != "active":
            continue
        if exclude_id and str(r.get("id", "")) == exclude_id:
            continue

        r_start = str(r.get("blockStartIso", ""))
        r_end = str(r.get("blockEndIso", ""))
        if not r_start or not r_end:
            continue
        if not overlaps_iso(r_start, r_end, block_start, block_end):
            continue

        existing_item_ids = [str(x) for x in r.get("itemIds", [])]
        existing_kayak_ids = [str(x) for x in r.get("kayakIds", [])]

        for cid in composite_ids:
            # New-format check
            if cid in existing_item_ids:
                conflicts.add(cid)
                continue
            # Legacy kayak check: "kayaks/K01" vs legacy "K01"
            if cid.startswith("kayaks/"):
                kayak_id = cid[len("kayaks/"):]
                if kayak_id in existing_kayak_ids:
                    conflicts.add(cid)

    return sorted(conflicts)


def count_overlapping_items(uid: str, reservations: list,
                            block_start: str, block_end: str,
                            exclude_id: str = None) -> int:
    """
    Counts total items in all of a user's active, overlapping reservations.
    Uses items[] length for new bundles, kayakIds[] length for legacy.
    Mirrors countMyOverlappingBundleItems() in gear_bundle_service.ts.
    """
    count = 0

    for r in reservations:
        if r.get("userUid") != uid:
            continue
        if r.get("status") != "active":
            continue
        if exclude_id and str(r.get("id", "")) == exclude_id:
            continue

        r_start = str(r.get("blockStartIso", ""))
        r_end = str(r.get("blockEndIso", ""))
        if not r_start or not r_end:
            continue
        if not overlaps_iso(r_start, r_end, block_start, block_end):
            continue

        if "items" in r and isinstance(r["items"], list):
            count += len(r["items"])
        elif "kayakIds" in r and isinstance(r["kayakIds"], list):
            count += len(r["kayakIds"])

    return count


def get_reserved_composite_ids_for_period(reservations: list,
                                          block_start: str,
                                          block_end: str) -> set:
    """
    Returns a set of composite IDs that are reserved in the given block period.
    Handles both new itemIds[] and legacy kayakIds[].
    Mirrors getReservedCompositeIdsForPeriod() in gear_bundle_service.ts.
    """
    reserved = set()

    for r in reservations:
        if r.get("status") != "active":
            continue
        r_start = str(r.get("blockStartIso", ""))
        r_end = str(r.get("blockEndIso", ""))
        if not r_start or not r_end:
            continue
        if not overlaps_iso(r_start, r_end, block_start, block_end):
            continue

        for cid in r.get("itemIds", []):
            reserved.add(str(cid))

        for kid in r.get("kayakIds", []):
            if kid:
                reserved.add(composite_id("kayaks", str(kid)))

    return reserved


# ──────────────────────────────────────────────────────────────────────────────
# Pure-Python backend stub for scenario tests
# ──────────────────────────────────────────────────────────────────────────────

class BackendStub:
    """
    Minimal in-memory stub of the bundle reservation backend.
    Validates input, checks conflicts, creates reservation docs.
    """

    OFFSET_DAYS = 1
    ROLE_MAX_ITEMS = {
        "rola_czlonek": 3,
        "rola_kandydat": 1,
        "rola_zarzad": 100,
        "rola_kr": 100,
        "rola_kursant": 1,
    }

    def __init__(self, users: dict, catalog: dict):
        """
        users: {uid: {"role_key": ..., "status_key": ..., "email": ...}}
        catalog: {composite_id: {"active": True, "operational": True, ...}}
        """
        self.users = users
        self.catalog = catalog
        self.reservations = []
        self._next_id = 1

    def _gen_id(self):
        rid = f"R{self._next_id:04d}"
        self._next_id += 1
        return rid

    def create_bundle_reservation(self, uid: str, start_date: str, end_date: str,
                                   items: list, starter_category: str = "",
                                   starter_item_id: str = "") -> dict:
        """
        items: [{"itemId": ..., "category": ...}]
        Returns: {"ok": True, "id": ..., "costHours": ...} or {"ok": False, "code": ..., "message": ...}
        """
        # Auth
        user = self.users.get(uid)
        if not user:
            return {"ok": False, "code": "forbidden", "message": "Użytkownik nie zarejestrowany"}

        role_key = user.get("role_key", "rola_sympatyk")
        if role_key == "rola_sympatyk":
            return {"ok": False, "code": "forbidden", "message": "Rola nie pozwala na rezerwację"}

        # Input validation
        if not items:
            return {"ok": False, "code": "no_items", "message": "Brak pozycji do zarezerwowania"}

        if start_date > end_date:
            return {"ok": False, "code": "validation_failed", "message": "Nieprawidłowy zakres dat"}

        # Dedup items by composite ID
        seen_cids = set()
        deduped = []
        for item in items:
            cid = composite_id(item["category"], item["itemId"])
            if cid not in seen_cids:
                seen_cids.add(cid)
                deduped.append(item)
        items = deduped

        # Validate each item in catalog
        for item in items:
            cid = composite_id(item["category"], item["itemId"])
            entry = self.catalog.get(cid)
            if not entry:
                return {
                    "ok": False, "code": "item_not_found",
                    "message": f"Nie znaleziono: {item['itemId']} ({item['category']})"
                }
            if not entry.get("active", True):
                return {
                    "ok": False, "code": "item_not_found",
                    "message": f"Przedmiot nieaktywny: {item['itemId']}"
                }
            if item["category"] == "kayaks":
                if not entry.get("operational", True):
                    return {
                        "ok": False, "code": "item_not_operational",
                        "message": f"Kajak niesprawny: {item['itemId']}"
                    }
                if entry.get("isPrivate") and not entry.get("isPrivateRentable"):
                    return {
                        "ok": False, "code": "item_not_reservable",
                        "message": f"Kajak prywatny niedostępny: {item['itemId']}"
                    }

        # Compute block ISO
        block_start, block_end = compute_block_iso(start_date, end_date, self.OFFSET_DAYS)

        # Conflict check
        composite_ids_list = [composite_id(i["category"], i["itemId"]) for i in items]
        conflicts = find_bundle_conflicts(composite_ids_list, self.reservations,
                                          block_start, block_end)
        if conflicts:
            return {
                "ok": False, "code": "conflict",
                "message": f"Konflikty rezerwacji: {', '.join(conflicts)}",
                "conflicts": conflicts,
            }

        # Item count limit
        max_items = self.ROLE_MAX_ITEMS.get(role_key, 1)
        current_count = count_overlapping_items(uid, self.reservations, block_start, block_end)
        if current_count + len(items) > max_items:
            return {
                "ok": False, "code": "too_many_items",
                "message": f"Przekroczono limit {max_items} pozycji (masz: {current_count}, dodajesz: {len(items)})"
            }

        # Cost hours: only for kayak items
        kayak_count = sum(1 for i in items if i["category"] == "kayaks")
        from datetime import datetime
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        days = (end_dt - start_dt).days + 1
        cost_hours = kayak_count * days  # simplified: 1h/day/kayak

        # Reservation kind
        kind = compute_reservation_kind(items)

        # Build stored items
        stored_items = []
        primary_idx = compute_primary_item_idx(
            [{"category": i["category"]} for i in items]
        )
        for idx, item in enumerate(items):
            entry = self.catalog[composite_id(item["category"], item["itemId"])]
            stored_items.append({
                "itemId": item["itemId"],
                "category": item["category"],
                "itemNumber": entry.get("number", item["itemId"]),
                "itemLabel": entry.get("label", item["itemId"]),
                "isPrimary": idx == primary_idx,
                "isKayak": item["category"] == "kayaks",
            })

        rid = self._gen_id()
        kayak_ids = [i["itemId"] for i in items if i["category"] == "kayaks"]

        doc = {
            "id": rid,
            "status": "active",
            "reservationKind": kind,
            "userUid": uid,
            "startDate": start_date,
            "endDate": end_date,
            "blockStartIso": block_start,
            "blockEndIso": block_end,
            "items": stored_items,
            "itemIds": composite_ids_list,
            "kayakIds": kayak_ids,
            "kayakCount": len(kayak_ids),
            "starterCategory": starter_category,
            "starterItemId": starter_item_id,
            "costHours": cost_hours,
        }
        self.reservations.append(doc)

        return {
            "ok": True,
            "id": rid,
            "costHours": cost_hours,
            "reservationKind": kind,
        }

    def cancel_reservation(self, uid: str, reservation_id: str) -> dict:
        for r in self.reservations:
            if r.get("id") == reservation_id:
                if r.get("userUid") != uid:
                    return {"ok": False, "code": "forbidden", "message": "Nie masz uprawnień"}
                r["status"] = "cancelled"
                return {"ok": True}
        return {"ok": False, "code": "not_found", "message": "Rezerwacja nie istnieje"}

    def get_items_with_availability(self, category: str, start_date: str, end_date: str) -> list:
        """Returns catalog items with isAvailableForRange flag."""
        block_start, block_end = compute_block_iso(start_date, end_date, self.OFFSET_DAYS)
        reserved = get_reserved_composite_ids_for_period(self.reservations, block_start, block_end)

        result = []
        for cid, entry in self.catalog.items():
            cat, item_id = cid.split("/", 1)
            if cat != category:
                continue
            if not entry.get("active", True):
                continue
            is_available = cid not in reserved
            result.append({
                "id": item_id,
                "category": category,
                "number": entry.get("number", item_id),
                "label": entry.get("label", item_id),
                "isAvailableForRange": is_available,
            })
        result.sort(key=lambda x: x["number"])
        return result


# ──────────────────────────────────────────────────────────────────────────────
# Section A: Logic tests (pure functions)
# ──────────────────────────────────────────────────────────────────────────────

class TestCompositeId(unittest.TestCase):

    def test_basic_kayak(self):
        self.assertEqual(composite_id("kayaks", "K01"), "kayaks/K01")

    def test_basic_paddle(self):
        self.assertEqual(composite_id("paddles", "P05"), "paddles/P05")

    def test_strips_whitespace(self):
        self.assertEqual(composite_id("  helmets  ", "  H01  "), "helmets/H01")

    def test_other_categories(self):
        self.assertEqual(composite_id("lifejackets", "LJ10"), "lifejackets/LJ10")
        self.assertEqual(composite_id("sprayskirts", "SS03"), "sprayskirts/SS03")
        self.assertEqual(composite_id("throwbags", "TB02"), "throwbags/TB02")


class TestComputeReservationKind(unittest.TestCase):

    def test_single_kayak_is_kayak_bundle(self):
        items = [{"category": "kayaks", "itemId": "K01"}]
        self.assertEqual(compute_reservation_kind(items), "kayak_bundle")

    def test_kayak_plus_paddle_is_kayak_bundle(self):
        items = [
            {"category": "kayaks", "itemId": "K01"},
            {"category": "paddles", "itemId": "P01"},
        ]
        self.assertEqual(compute_reservation_kind(items), "kayak_bundle")

    def test_only_non_kayak_is_gear_only(self):
        items = [
            {"category": "paddles", "itemId": "P01"},
            {"category": "helmets", "itemId": "H01"},
        ]
        self.assertEqual(compute_reservation_kind(items), "gear_only")

    def test_empty_list_is_gear_only(self):
        self.assertEqual(compute_reservation_kind([]), "gear_only")

    def test_category_case_insensitive(self):
        items = [{"category": "KAYAKS", "itemId": "K01"}]
        self.assertEqual(compute_reservation_kind(items), "kayak_bundle")


class TestComputePrimaryItemIdx(unittest.TestCase):

    def test_kayak_wins_over_paddle(self):
        items = [
            {"category": "paddles"},
            {"category": "kayaks"},
        ]
        self.assertEqual(compute_primary_item_idx(items), 1)

    def test_first_kayak_is_primary_when_multiple(self):
        items = [
            {"category": "kayaks"},
            {"category": "kayaks"},
        ]
        self.assertEqual(compute_primary_item_idx(items), 0)

    def test_paddle_beats_helmet(self):
        items = [
            {"category": "helmets"},
            {"category": "paddles"},
        ]
        self.assertEqual(compute_primary_item_idx(items), 1)

    def test_single_item_is_primary(self):
        items = [{"category": "sprayskirts"}]
        self.assertEqual(compute_primary_item_idx(items), 0)

    def test_full_priority_order(self):
        # All categories in reverse priority — kayak (last in list) should win
        items = [
            {"category": "throwbags"},
            {"category": "sprayskirts"},
            {"category": "helmets"},
            {"category": "lifejackets"},
            {"category": "paddles"},
            {"category": "kayaks"},
        ]
        self.assertEqual(compute_primary_item_idx(items), 5)

    def test_empty_returns_zero(self):
        self.assertEqual(compute_primary_item_idx([]), 0)


class TestOverlapsIso(unittest.TestCase):

    def test_exact_overlap(self):
        self.assertTrue(overlaps_iso("2025-05-01", "2025-05-07",
                                     "2025-05-01", "2025-05-07"))

    def test_partial_overlap_start(self):
        self.assertTrue(overlaps_iso("2025-05-01", "2025-05-05",
                                     "2025-05-04", "2025-05-10"))

    def test_partial_overlap_end(self):
        self.assertTrue(overlaps_iso("2025-05-05", "2025-05-10",
                                     "2025-05-01", "2025-05-07"))

    def test_no_overlap_before(self):
        self.assertFalse(overlaps_iso("2025-05-01", "2025-05-03",
                                      "2025-05-05", "2025-05-10"))

    def test_no_overlap_after(self):
        self.assertFalse(overlaps_iso("2025-05-10", "2025-05-15",
                                      "2025-05-01", "2025-05-07"))

    def test_adjacent_no_overlap(self):
        # Adjacent dates: end of A = start of B - 1 day → no overlap
        self.assertFalse(overlaps_iso("2025-05-01", "2025-05-04",
                                      "2025-05-05", "2025-05-10"))

    def test_adjacent_overlap_on_same_day(self):
        # blockEnd of A = blockStart of B → overlap (both contain that day)
        self.assertTrue(overlaps_iso("2025-05-01", "2025-05-05",
                                     "2025-05-05", "2025-05-10"))


class TestFindBundleConflicts(unittest.TestCase):

    def _make_reservation(self, rid, start, end, item_ids=None, kayak_ids=None):
        return {
            "id": rid,
            "status": "active",
            "blockStartIso": start,
            "blockEndIso": end,
            "itemIds": item_ids or [],
            "kayakIds": kayak_ids or [],
        }

    def test_no_conflict_no_reservations(self):
        result = find_bundle_conflicts(
            ["kayaks/K01"], [], "2025-05-01", "2025-05-07"
        )
        self.assertEqual(result, [])

    def test_conflict_with_new_format(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     item_ids=["kayaks/K01", "paddles/P01"])
        result = find_bundle_conflicts(
            ["kayaks/K01"], [rsv], "2025-05-01", "2025-05-07"
        )
        self.assertIn("kayaks/K01", result)

    def test_conflict_with_legacy_kayak_ids(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     kayak_ids=["K01"])
        result = find_bundle_conflicts(
            ["kayaks/K01"], [rsv], "2025-05-01", "2025-05-07"
        )
        self.assertIn("kayaks/K01", result)

    def test_no_conflict_non_kayak_vs_legacy(self):
        # Legacy reservation has K01; new bundle wants paddle P01 — no conflict
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     kayak_ids=["K01"])
        result = find_bundle_conflicts(
            ["paddles/P01"], [rsv], "2025-05-01", "2025-05-07"
        )
        self.assertEqual(result, [])

    def test_no_conflict_different_dates(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-05",
                                     item_ids=["kayaks/K01"])
        result = find_bundle_conflicts(
            ["kayaks/K01"], [rsv], "2025-05-10", "2025-05-15"
        )
        self.assertEqual(result, [])

    def test_excluded_reservation_not_counted(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     item_ids=["kayaks/K01"])
        result = find_bundle_conflicts(
            ["kayaks/K01"], [rsv], "2025-05-01", "2025-05-07",
            exclude_id="R1"
        )
        self.assertEqual(result, [])

    def test_cancelled_reservation_not_counted(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     item_ids=["kayaks/K01"])
        rsv["status"] = "cancelled"
        result = find_bundle_conflicts(
            ["kayaks/K01"], [rsv], "2025-05-01", "2025-05-07"
        )
        self.assertEqual(result, [])

    def test_multiple_conflicts_returned(self):
        rsv = self._make_reservation("R1", "2025-05-01", "2025-05-07",
                                     item_ids=["kayaks/K01", "paddles/P01"])
        result = find_bundle_conflicts(
            ["kayaks/K01", "paddles/P01"], [rsv], "2025-05-01", "2025-05-07"
        )
        self.assertIn("kayaks/K01", result)
        self.assertIn("paddles/P01", result)


class TestCountOverlappingItems(unittest.TestCase):

    def _make_reservation(self, rid, uid, start, end, items=None, kayak_ids=None):
        r = {
            "id": rid,
            "status": "active",
            "userUid": uid,
            "blockStartIso": start,
            "blockEndIso": end,
        }
        if items is not None:
            r["items"] = items
        if kayak_ids is not None:
            r["kayakIds"] = kayak_ids
        return r

    def test_no_reservations(self):
        self.assertEqual(
            count_overlapping_items("U1", [], "2025-05-01", "2025-05-07"),
            0
        )

    def test_counts_new_bundle_items(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01"}, {"itemId": "P01"}]
        )
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07"),
            2
        )

    def test_counts_legacy_kayak_ids(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            kayak_ids=["K01", "K02"]
        )
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07"),
            2
        )

    def test_ignores_other_users(self):
        rsv = self._make_reservation(
            "R1", "U2", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01"}]
        )
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07"),
            0
        )

    def test_ignores_non_overlapping(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-06-01", "2025-06-07",
            items=[{"itemId": "K01"}]
        )
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07"),
            0
        )

    def test_excludes_reservation_by_id(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01"}]
        )
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07",
                                    exclude_id="R1"),
            0
        )

    def test_prefers_items_over_kayak_ids(self):
        # If both items[] and kayakIds[] are present, use items[]
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01"}, {"itemId": "P01"}, {"itemId": "H01"}],
            kayak_ids=["K01"]
        )
        # Should count 3 (from items[]), not 1 (from kayakIds[])
        self.assertEqual(
            count_overlapping_items("U1", [rsv], "2025-05-01", "2025-05-07"),
            3
        )


# ──────────────────────────────────────────────────────────────────────────────
# Section B: Scenario tests (end-to-end through BackendStub)
# ──────────────────────────────────────────────────────────────────────────────

def make_catalog(*entries):
    """Helper: build catalog from (category, item_id, ...) tuples."""
    catalog = {}
    for entry in entries:
        cat = entry["category"]
        item_id = entry["itemId"]
        cid = composite_id(cat, item_id)
        catalog[cid] = {
            "number": entry.get("number", item_id),
            "label": entry.get("label", item_id),
            "active": entry.get("active", True),
            "operational": entry.get("operational", True),
            "isPrivate": entry.get("isPrivate", False),
            "isPrivateRentable": entry.get("isPrivateRentable", False),
        }
    return catalog


class TestScenario01_SimplePaddleReservation(unittest.TestCase):
    """Scenario 01: Gear-only reservation of a single paddle."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek", "status_key": "status_aktywny"}}
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01", "number": "W-01"}
        )
        self.backend = BackendStub(users, catalog)

    def test_creates_gear_only_reservation(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["reservationKind"], "gear_only")
        self.assertEqual(result["costHours"], 0)  # No kayaks = no cost

    def test_reservation_blocks_paddle(self):
        self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        result2 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-03",
            end_date="2025-07-08",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertFalse(result2["ok"])
        self.assertEqual(result2["code"], "conflict")
        self.assertIn("paddles/P01", result2["conflicts"])


class TestScenario02_KayakBundleWithExtras(unittest.TestCase):
    """Scenario 02: Bundle with kayak + paddle + lifejacket = kayak_bundle."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek", "status_key": "status_aktywny"}}
        catalog = make_catalog(
            {"category": "kayaks", "itemId": "K01", "number": "10"},
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
            {"category": "lifejackets", "itemId": "LJ01", "number": "KM-01"},
        )
        self.backend = BackendStub(users, catalog)

    def test_bundle_kind_is_kayak_bundle(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "LJ01", "category": "lifejackets"},
            ]
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["reservationKind"], "kayak_bundle")

    def test_cost_hours_only_for_kayak(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "LJ01", "category": "lifejackets"},
            ]
        )
        self.assertTrue(result["ok"])
        # 1 kayak × 7 days = 7h
        self.assertEqual(result["costHours"], 7)

    def test_all_items_blocked_after_reservation(self):
        self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "LJ01", "category": "lifejackets"},
            ]
        )
        # K01 should be blocked
        r2 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-05",
            end_date="2025-07-10",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(r2["ok"])
        self.assertIn("kayaks/K01", r2["conflicts"])

        # P01 should also be blocked (in separate attempt)
        r3 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-05",
            end_date="2025-07-10",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertFalse(r3["ok"])
        self.assertIn("paddles/P01", r3["conflicts"])


class TestScenario03_LegacyKayakCompatibility(unittest.TestCase):
    """Scenario 03: New bundle conflicts with legacy kayak-only reservation."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek", "status_key": "status_aktywny"}}
        catalog = make_catalog(
            {"category": "kayaks", "itemId": "K01", "number": "10"},
        )
        self.backend = BackendStub(users, catalog)
        # Inject a legacy reservation (no itemIds, only kayakIds)
        self.backend.reservations.append({
            "id": "LEGACY-001",
            "status": "active",
            "userUid": "U_OTHER",
            "startDate": "2025-08-01",
            "endDate": "2025-08-07",
            "blockStartIso": "2025-07-31",
            "blockEndIso": "2025-08-08",
            "kayakIds": ["K01"],
            # Note: no itemIds field — this is legacy format
        })

    def test_new_bundle_detects_conflict_with_legacy(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-03",
            end_date="2025-08-10",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "conflict")
        self.assertIn("kayaks/K01", result["conflicts"])

    def test_non_conflicting_dates_pass(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-01",
            end_date="2025-09-07",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)


class TestScenario04_RolePermissions(unittest.TestCase):
    """Scenario 04: Role-based access control."""

    def setUp(self):
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01"},
            {"category": "paddles", "itemId": "P02"},
        )
        users = {
            "U_SYMP": {"role_key": "rola_sympatyk"},
            "U_KAND": {"role_key": "rola_kandydat"},
            "U_CZLON": {"role_key": "rola_czlonek"},
        }
        self.backend = BackendStub(users, catalog)

    def test_sympatyk_cannot_reserve(self):
        result = self.backend.create_bundle_reservation(
            uid="U_SYMP",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "forbidden")

    def test_kandydat_limited_to_1_item(self):
        result = self.backend.create_bundle_reservation(
            uid="U_KAND",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "P02", "category": "paddles"},
            ],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "too_many_items")

    def test_czlonek_can_reserve_up_to_3(self):
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01"},
            {"category": "paddles", "itemId": "P02"},
            {"category": "helmets", "itemId": "H01"},
        )
        users = {"U_CZLON": {"role_key": "rola_czlonek"}}
        backend = BackendStub(users, catalog)
        result = backend.create_bundle_reservation(
            uid="U_CZLON",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "P02", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ],
        )
        self.assertTrue(result["ok"], result)


class TestScenario05_ItemValidation(unittest.TestCase):
    """Scenario 05: Item validation — inactive, non-operational, private."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek"}}
        catalog = make_catalog(
            {"category": "kayaks", "itemId": "K_OK", "number": "10",
             "operational": True, "isPrivate": False},
            {"category": "kayaks", "itemId": "K_NON_OP", "number": "11",
             "operational": False},
            {"category": "kayaks", "itemId": "K_PRIV", "number": "12",
             "isPrivate": True, "isPrivateRentable": False},
            {"category": "kayaks", "itemId": "K_PRIV_RENT", "number": "13",
             "isPrivate": True, "isPrivateRentable": True, "operational": True},
            {"category": "paddles", "itemId": "P_INACTIVE",
             "active": False},
        )
        self.backend = BackendStub(users, catalog)

    def test_non_operational_kayak_rejected(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "K_NON_OP", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_operational")

    def test_private_non_rentable_kayak_rejected(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "K_PRIV", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_reservable")

    def test_private_rentable_kayak_allowed(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "K_PRIV_RENT", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)

    def test_inactive_item_rejected(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "P_INACTIVE", "category": "paddles"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_found")

    def test_unknown_item_rejected(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "NONEXISTENT", "category": "paddles"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_found")


class TestScenario06_AvailabilityCheck(unittest.TestCase):
    """Scenario 06: getItemsWithAvailability correctly marks items."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek"}}
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
            {"category": "paddles", "itemId": "P02", "number": "W-02"},
            {"category": "paddles", "itemId": "P03", "number": "W-03"},
        )
        self.backend = BackendStub(users, catalog)

    def test_all_available_when_no_reservations(self):
        items = self.backend.get_items_with_availability("paddles", "2025-07-01", "2025-07-07")
        self.assertEqual(len(items), 3)
        self.assertTrue(all(it["isAvailableForRange"] for it in items))

    def test_reserved_paddle_marked_unavailable(self):
        self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-03",
            end_date="2025-07-05",
            items=[{"itemId": "P02", "category": "paddles"}],
        )
        items = self.backend.get_items_with_availability("paddles", "2025-07-01", "2025-07-07")
        by_id = {it["id"]: it for it in items}
        self.assertTrue(by_id["P01"]["isAvailableForRange"])
        self.assertFalse(by_id["P02"]["isAvailableForRange"])
        self.assertTrue(by_id["P03"]["isAvailableForRange"])

    def test_availability_after_reservation_ends(self):
        self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        # Block period: 2025-06-30 to 2025-07-06
        # Query for 2025-07-10 to 2025-07-15 → block 2025-07-09 to 2025-07-16 → no overlap
        items = self.backend.get_items_with_availability("paddles", "2025-07-10", "2025-07-15")
        by_id = {it["id"]: it for it in items}
        self.assertTrue(by_id["P01"]["isAvailableForRange"])


class TestScenario07_MultipleReservations(unittest.TestCase):
    """Scenario 07: Multiple users reserving different items in same period."""

    def setUp(self):
        users = {
            "U1": {"role_key": "rola_czlonek"},
            "U2": {"role_key": "rola_czlonek"},
        }
        catalog = make_catalog(
            {"category": "kayaks", "itemId": "K01", "number": "10"},
            {"category": "kayaks", "itemId": "K02", "number": "11"},
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
        )
        self.backend = BackendStub(users, catalog)

    def test_different_items_no_conflict(self):
        r1 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        r2 = self.backend.create_bundle_reservation(
            uid="U2",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertTrue(r1["ok"], r1)
        self.assertTrue(r2["ok"], r2)

    def test_same_item_conflict_across_users(self):
        self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        r2 = self.backend.create_bundle_reservation(
            uid="U2",
            start_date="2025-07-05",
            end_date="2025-07-10",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(r2["ok"])
        self.assertIn("kayaks/K01", r2["conflicts"])


class TestScenario08_CancelAndRebook(unittest.TestCase):
    """Scenario 08: Cancel a reservation then rebook the same item."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek"}}
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
        )
        self.backend = BackendStub(users, catalog)

    def test_cancel_and_rebook(self):
        r1 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-07",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(r1["ok"])

        # Confirm blocked
        r2 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-03",
            end_date="2025-07-08",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertFalse(r2["ok"])

        # Cancel
        cancel = self.backend.cancel_reservation("U1", r1["id"])
        self.assertTrue(cancel["ok"])

        # Now should be available
        r3 = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-03",
            end_date="2025-07-08",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(r3["ok"], r3)


class TestScenario09_DeduplicationOfItems(unittest.TestCase):
    """Scenario 09: Duplicate items in request are silently deduplicated."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek"}}
        catalog = make_catalog(
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
        )
        self.backend = BackendStub(users, catalog)

    def test_dedup_does_not_exceed_limit(self):
        # kandydat has limit 1; if two P01 entries were counted, it would fail
        self.backend.users["U_KAND"] = {"role_key": "rola_kandydat"}
        result = self.backend.create_bundle_reservation(
            uid="U_KAND",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "P01", "category": "paddles"},  # duplicate
            ],
        )
        # After dedup, there's only 1 item — within the limit
        self.assertTrue(result["ok"], result)

    def test_dedup_stores_single_item(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "P01", "category": "paddles"},
            ],
        )
        self.assertTrue(result["ok"], result)
        # Exactly one reservation doc with one item
        rsv = self.backend.reservations[-1]
        self.assertEqual(len(rsv["items"]), 1)


class TestScenario10_PrimaryItemSelection(unittest.TestCase):
    """Scenario 10: Primary item is the highest-priority category item."""

    def setUp(self):
        users = {"U1": {"role_key": "rola_czlonek"}}
        catalog = make_catalog(
            {"category": "kayaks", "itemId": "K01", "number": "10"},
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
            {"category": "helmets", "itemId": "H01", "number": "KAS-01"},
        )
        self.backend = BackendStub(users, catalog)

    def test_kayak_is_primary_when_included(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
                {"itemId": "K01", "category": "kayaks"},
            ]
        )
        self.assertTrue(result["ok"], result)
        rsv = self.backend.reservations[-1]
        primary_items = [it for it in rsv["items"] if it["isPrimary"]]
        self.assertEqual(len(primary_items), 1)
        self.assertEqual(primary_items[0]["category"], "kayaks")

    def test_paddle_is_primary_when_no_kayak(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "H01", "category": "helmets"},
                {"itemId": "P01", "category": "paddles"},
            ]
        )
        self.assertTrue(result["ok"], result)
        rsv = self.backend.reservations[-1]
        primary_items = [it for it in rsv["items"] if it["isPrimary"]]
        self.assertEqual(len(primary_items), 1)
        self.assertEqual(primary_items[0]["category"], "paddles")

    def test_only_one_item_is_primary(self):
        result = self.backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-07-01",
            end_date="2025-07-05",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ]
        )
        self.assertTrue(result["ok"], result)
        rsv = self.backend.reservations[-1]
        primary_count = sum(1 for it in rsv["items"] if it["isPrimary"])
        self.assertEqual(primary_count, 1)


if __name__ == "__main__":
    unittest.main()