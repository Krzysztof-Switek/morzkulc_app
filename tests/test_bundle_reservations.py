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

# Role uprawnione do bycia kierownikiem imprezy klubowej (rola_kursant/rola_sympatyk
# WYKLUCZONE — mirror memberRoleKeys z functions/src/service/service_config.ts).
MEMBER_ROLE_KEYS = ["rola_czlonek", "rola_kandydat", "rola_zarzad", "rola_kr"]


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


def count_overlapping_items_by_category(uid: str, reservations: list,
                                        block_start: str, block_end: str,
                                        exclude_id: str = None) -> dict:
    """
    Counts items PER CATEGORY in a user's active, overlapping reservations.
    Uses items[].category for new bundles, kayakIds[] (as "kayaks") for legacy.
    Mirrors countMyOverlappingItemsByCategory() in reservation_limits.ts.
    """
    counts = {}

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

        if "items" in r and isinstance(r["items"], list) and r["items"]:
            for it in r["items"]:
                cat = str(it.get("category", "")).strip().lower() or "kayaks"
                counts[cat] = counts.get(cat, 0) + 1
        elif "kayakIds" in r and isinstance(r["kayakIds"], list):
            counts["kayaks"] = counts.get("kayaks", 0) + len(r["kayakIds"])

    return counts


def count_items_by_category(items: list) -> dict:
    """Tally requested items per category. Mirrors countItemsByCategory()."""
    m = {}
    for it in items:
        cat = str(it.get("category", "")).strip().lower()
        if not cat:
            continue
        m[cat] = m.get(cat, 0) + 1
    return m


def find_category_over_limit(already: dict, requested: dict, max_items: int):
    """
    First requested category exceeding max_items, or None.
    Mirrors findCategoryOverLimit().
    """
    for cat, req in requested.items():
        have = already.get(cat, 0)
        if have + req > max_items:
            return {"category": cat, "already": have, "requested": req}
    return None


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


def is_free_rental_exempt(school_year, today_iso: str) -> bool:
    """
    Zwolnienie z opłaty: tegoroczna szkoleniówka i rezerwacja składana do 30.09.
    Mirror isFreeRentalExempt() w gear_bundle_service.ts.
    """
    if not school_year:
        return False
    if int(str(today_iso)[:4]) != int(school_year):
        return False
    return today_iso <= f"{int(school_year)}-09-30"


def assert_kursant_rental_allowed(flag_on: bool, exempt: bool, school_year):
    """
    Bramka rezerwacji kursanta. Zwraca dict błędu albo None gdy dozwolone.
    Mirror assertKursantRentalAllowed() w gear_bundle_service.ts.
    """
    if not flag_on:
        return {"ok": False, "code": "forbidden", "message": "Rezerwacje dla kursantów są obecnie wyłączone."}
    if not exempt:
        if school_year:
            return {"ok": False, "code": "kursant_window_closed", "schoolYear": school_year}
        return {"ok": False, "code": "kursant_no_year"}
    return None


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

    def __init__(self, users: dict, catalog: dict, kurs_wypozycza: bool = False, today: str = None,
                 kierownik_events: dict = None):
        """
        users: {uid: {"role_key": ..., "status_key": ..., "email": ..., "school_year": ...}}
        catalog: {composite_id: {"active": True, "operational": True, ...}}
        kurs_wypozycza: globalny przełącznik zarządu (setup/vars_members.vars.kurs_wypożycza).
        today: data ISO używana w oknie szkoleniówki kursanta (None → realne dziś).
        kierownik_events: {uid: {"id": ..., "startDate": ..., "endDate": ...}} — aktywna
            impreza klubowa danego uid (mirror findActiveKierownikEvent w events_service.ts).
            Brak wpisu = uid nie jest aktualnie kierownikiem żadnej imprezy.
        """
        self.users = users
        self.catalog = catalog
        self.kurs_wypozycza = kurs_wypozycza
        self.today = today
        self.kierownik_events = kierownik_events or {}
        self.reservations = []
        self._next_id = 1

    def _gen_id(self):
        rid = f"R{self._next_id:04d}"
        self._next_id += 1
        return rid

    def create_bundle_reservation(self, uid: str, start_date: str, end_date: str,
                                   items: list, starter_category: str = "",
                                   starter_item_id: str = "",
                                   as_club_event: bool = False) -> dict:
        """
        items: [{"itemId": ..., "category": ...}]
        as_club_event: tryb "impreza klubowa" — kierownik rezerwuje DOWOLNĄ ilość
            sprzętu bezpłatnie, wyłącznie na tę imprezę. Daty są NADPISANE datami
            imprezy (start_date/end_date przekazane przez wołającego są ignorowane),
            limit ilości per kategoria jest pomijany. Konflikt terminów i walidacja
            przedmiotów NIGDY nie są pomijane — patrz gear_bundle_service.ts.
        Returns: {"ok": True, "id": ..., "costHours": ...} or {"ok": False, "code": ..., "message": ...}
        """
        # Auth
        user = self.users.get(uid)
        if not user:
            return {"ok": False, "code": "forbidden", "message": "Użytkownik nie zarejestrowany"}

        role_key = user.get("role_key", "rola_sympatyk")
        if role_key == "rola_sympatyk":
            return {"ok": False, "code": "forbidden", "message": "Rola nie pozwala na rezerwację"}

        club_event = None
        if as_club_event:
            if role_key not in MEMBER_ROLE_KEYS:
                return {"ok": False, "code": "forbidden", "message": "Rola nie uprawnia do rezerwacji na imprezę klubową."}
            club_event = self.kierownik_events.get(uid)
            if not club_event:
                return {
                    "ok": False, "code": "not_a_kierownik",
                    "message": "Nie jesteś obecnie kierownikiem żadnej zatwierdzonej imprezy klubowej.",
                }
            start_date = club_event["startDate"]
            end_date = club_event["endDate"]

        # Kursant rezerwuje jak kandydat, ale tylko w oknie szkoleniówki + flaga zarządu.
        # (Nieosiągalne w trybie "impreza klubowa" — kursant nie jest w MEMBER_ROLE_KEYS.)
        if role_key == "rola_kursant":
            from datetime import datetime
            today_iso = self.today or datetime.utcnow().strftime("%Y-%m-%d")
            school_year = user.get("school_year")
            exempt = is_free_rental_exempt(school_year, today_iso)
            gate = assert_kursant_rental_allowed(self.kurs_wypozycza, exempt, school_year)
            if gate:
                return gate

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

        # Item count limit — PER KATEGORIA (S2): każdy rodzaj sprzętu osobno.
        # POMIJANE dla trybu "impreza klubowa" (dowolna ilość sprzętu).
        if not club_event:
            max_items = self.ROLE_MAX_ITEMS.get(role_key, 1)
            already = count_overlapping_items_by_category(uid, self.reservations, block_start, block_end)
            requested = count_items_by_category(items)
            over = find_category_over_limit(already, requested, max_items)
            if over:
                return {
                    "ok": False, "code": "too_many_items",
                    "category": over["category"],
                    "message": (
                        f"Przekroczono limit {max_items} szt. kategorii {over['category']} "
                        f"(masz: {over['already']}, dodajesz: {over['requested']})"
                    ),
                }

        # Cost hours: only for kayak items. Impreza klubowa: mechanizm godzinkowy
        # pomijany W CAŁOŚCI (decyzja użytkownika 05.09.2026) — zero, żaden wpis
        # w godzinki_ledger, niezależnie od liczby kajaków.
        if club_event:
            cost_hours = 0
        else:
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
            "eventId": club_event["id"] if club_event else None,
            "waived": False,
        }
        self.reservations.append(doc)

        return {
            "ok": True,
            "id": rid,
            "costHours": cost_hours,
            "reservationKind": kind,
            "eventId": club_event["id"] if club_event else None,
            "waived": False,
        }

    def cancel_reservation(self, uid: str, reservation_id: str) -> dict:
        for r in self.reservations:
            if r.get("id") == reservation_id:
                if r.get("userUid") != uid:
                    return {"ok": False, "code": "forbidden", "message": "Nie masz uprawnień"}
                r["status"] = "cancelled"
                return {"ok": True}
        return {"ok": False, "code": "not_found", "message": "Rezerwacja nie istnieje"}

    def update_bundle_reservation_items(self, uid: str, reservation_id: str, items: list) -> dict:
        """
        Kierownik podmienia PEŁNĄ listę przedmiotów istniejącej rezerwacji na
        imprezę klubową (potrzeby się zmieniają — patrz feedback użytkownika
        04.09.2026). WYŁĄCZNIE dla rezerwacji z eventId. Limit ilości POMIJANY
        (jak przy tworzeniu), konflikt terminów i sprawność przedmiotów NIGDY
        nie są pomijane. Mirror updateBundleReservationItems() w gear_bundle_service.ts.
        """
        user = self.users.get(uid)
        if not user:
            return {"ok": False, "code": "forbidden", "message": "Użytkownik nie zarejestrowany"}

        if not items:
            return {
                "ok": False, "code": "no_items",
                "message": "Lista nie może być pusta — anuluj rezerwację, jeśli rezygnujesz z całego sprzętu.",
            }

        # Dedup items by composite ID
        seen_cids = set()
        deduped = []
        for item in items:
            cid = composite_id(item["category"], item["itemId"])
            if cid not in seen_cids:
                seen_cids.add(cid)
                deduped.append(item)
        items = deduped

        target = next((r for r in self.reservations if r.get("id") == reservation_id), None)
        if not target:
            return {"ok": False, "code": "not_found", "message": "Rezerwacja nie istnieje"}
        if target.get("userUid") != uid:
            return {"ok": False, "code": "forbidden", "message": "Nie masz uprawnień"}
        if target.get("status") != "active":
            return {"ok": False, "code": "invalid_state", "message": "Rezerwacja nieaktywna"}

        event_id = target.get("eventId")
        if not event_id:
            return {
                "ok": False, "code": "not_club_event_reservation",
                "message": "Edycja listy przedmiotów jest dostępna tylko dla rezerwacji na imprezę klubową.",
            }

        active_event = self.kierownik_events.get(uid)
        if not active_event or active_event["id"] != event_id:
            return {
                "ok": False, "code": "not_a_kierownik",
                "message": "Nie jesteś już kierownikiem tej imprezy — edycja listy jest niedostępna.",
            }

        # Sprawność/dostępność przedmiotów — sprawdzana na NOWO dla całej listy.
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

        block_start = target["blockStartIso"]
        block_end = target["blockEndIso"]
        composite_ids_list = [composite_id(i["category"], i["itemId"]) for i in items]

        # Konflikt terminów (z wyłączeniem samej siebie) — NIGDY nie pomijany.
        conflicts = find_bundle_conflicts(composite_ids_list, self.reservations,
                                          block_start, block_end, exclude_id=reservation_id)
        if conflicts:
            return {
                "ok": False, "code": "conflict",
                "message": f"Konflikty rezerwacji: {', '.join(conflicts)}",
                "conflicts": conflicts,
            }

        kind = compute_reservation_kind(items)
        stored_items = []
        primary_idx = compute_primary_item_idx([{"category": i["category"]} for i in items])
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

        kayak_ids = [i["itemId"] for i in items if i["category"] == "kayaks"]

        # Impreza klubowa: mechanizm godzinkowy pomijany W CAŁOŚCI — edycja listy
        # nigdy nie dotyka costHours/waived (decyzja użytkownika 05.09.2026).
        target["items"] = stored_items
        target["itemIds"] = composite_ids_list
        target["reservationKind"] = kind
        target["kayakIds"] = kayak_ids
        target["kayakCount"] = len(kayak_ids)

        return {"ok": True, "id": reservation_id}

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
            count_overlapping_items_by_category("U1", [], "2025-05-01", "2025-05-07"),
            {}
        )

    def test_counts_new_bundle_items_by_category(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01", "category": "kayaks"},
                   {"itemId": "P01", "category": "paddles"}]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {"kayaks": 1, "paddles": 1}
        )

    def test_counts_legacy_kayak_ids_as_kayaks(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            kayak_ids=["K01", "K02"]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {"kayaks": 2}
        )

    def test_missing_category_defaults_to_kayaks(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01"}]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {"kayaks": 1}
        )

    def test_ignores_other_users(self):
        rsv = self._make_reservation(
            "R1", "U2", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01", "category": "kayaks"}]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {}
        )

    def test_ignores_non_overlapping(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-06-01", "2025-06-07",
            items=[{"itemId": "K01", "category": "kayaks"}]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {}
        )

    def test_excludes_reservation_by_id(self):
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01", "category": "kayaks"}]
        )
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07",
                                                exclude_id="R1"),
            {}
        )

    def test_prefers_items_over_kayak_ids(self):
        # If both items[] and kayakIds[] are present, use items[]
        rsv = self._make_reservation(
            "R1", "U1", "2025-05-01", "2025-05-07",
            items=[{"itemId": "K01", "category": "kayaks"},
                   {"itemId": "P01", "category": "paddles"},
                   {"itemId": "H01", "category": "helmets"}],
            kayak_ids=["K01"]
        )
        # Should count items[] per category, not kayakIds[]
        self.assertEqual(
            count_overlapping_items_by_category("U1", [rsv], "2025-05-01", "2025-05-07"),
            {"kayaks": 1, "paddles": 1, "helmets": 1}
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


# ──────────────────────────────────────────────────────────────────────────────
# Section C: Cross-format conflict tests (bundle vs legacy kayakIds[])
# ──────────────────────────────────────────────────────────────────────────────

class TestCrossFormatConflicts(unittest.TestCase):
    """
    Weryfikuje że findBundleConflicts() poprawnie wykrywa konflikty między
    rezerwacjami w nowym formacie (itemIds[]) i starym formacie (kayakIds[]).
    Odzwierciedla gear_bundle_service.ts:305-322.
    """

    def _make_legacy_reservation(self, kayak_ids: list, block_start: str, block_end: str,
                                  status: str = "active", uid: str = "U1") -> dict:
        """Stara rezerwacja — tylko kayakIds[], bez itemIds[]."""
        return {
            "id": "R_LEGACY",
            "status": status,
            "userUid": uid,
            "blockStartIso": block_start,
            "blockEndIso": block_end,
            "kayakIds": kayak_ids,
        }

    def _make_bundle_reservation(self, item_ids: list, block_start: str, block_end: str,
                                   status: str = "active", uid: str = "U2") -> dict:
        """Nowa rezerwacja bundle — itemIds[], kayakIds[] puste."""
        return {
            "id": "R_BUNDLE",
            "status": status,
            "userUid": uid,
            "blockStartIso": block_start,
            "blockEndIso": block_end,
            "itemIds": item_ids,
            "kayakIds": [],
        }

    def test_bundle_conflicts_with_legacy_same_kayak(self):
        """
        Stara rezerwacja z kayakIds=["K01"].
        Nowa próba z items=[{category: kayaks, itemId: K01}] → compositeId=kayaks/K01.
        findBundleConflicts musi wykryć konflikt przez legacy-format ścieżkę.
        """
        existing = self._make_legacy_reservation(["K01"], "2025-07-01", "2025-07-08")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01"],
            reservations=[existing],
            block_start="2025-07-02",
            block_end="2025-07-06",
        )
        self.assertIn("kayaks/K01", conflicts)

    def test_bundle_conflicts_with_legacy_different_kayak(self):
        """
        Stara rezerwacja z K01 — nowa próba z K02 → brak konfliktu.
        """
        existing = self._make_legacy_reservation(["K01"], "2025-07-01", "2025-07-08")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K02"],
            reservations=[existing],
            block_start="2025-07-02",
            block_end="2025-07-06",
        )
        self.assertEqual(conflicts, [])

    def test_bundle_conflicts_with_new_format_same_item(self):
        """
        Nowa rezerwacja z itemIds=["kayaks/K01"].
        Nowa próba z compositeId=kayaks/K01 → konflikt przez itemIds[].
        """
        existing = self._make_bundle_reservation(["kayaks/K01"], "2025-07-01", "2025-07-08")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01"],
            reservations=[existing],
            block_start="2025-07-02",
            block_end="2025-07-06",
        )
        self.assertIn("kayaks/K01", conflicts)

    def test_bundle_conflicts_with_new_format_accessory(self):
        """
        Nowa rezerwacja ma itemIds=["paddles/P01"].
        Nowa próba z paddles/P01 → konflikt.
        """
        existing = self._make_bundle_reservation(["paddles/P01"], "2025-07-01", "2025-07-08")
        conflicts = find_bundle_conflicts(
            composite_ids=["paddles/P01"],
            reservations=[existing],
            block_start="2025-07-03",
            block_end="2025-07-06",
        )
        self.assertIn("paddles/P01", conflicts)

    def test_legacy_cancelled_not_conflicting(self):
        """Anulowana stara rezerwacja nie blokuje."""
        existing = self._make_legacy_reservation(["K01"], "2025-07-01", "2025-07-08", status="cancelled")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01"],
            reservations=[existing],
            block_start="2025-07-02",
            block_end="2025-07-06",
        )
        self.assertEqual(conflicts, [])

    def test_legacy_non_overlapping_not_conflicting(self):
        """Stara rezerwacja nie nakłada się na nowe daty → brak konfliktu."""
        existing = self._make_legacy_reservation(["K01"], "2025-07-20", "2025-07-25")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01"],
            reservations=[existing],
            block_start="2025-07-01",
            block_end="2025-07-08",
        )
        self.assertEqual(conflicts, [])

    def test_multiple_items_partial_conflict(self):
        """
        Próba rezerwacji K01 + P01 + H01.
        Istniejąca rezerwacja ma K01 (legacy) i P01 (bundle).
        → Oba powinny być w konfliktach, H01 nie.
        """
        legacy_r = self._make_legacy_reservation(["K01"], "2025-07-01", "2025-07-10")
        bundle_r = self._make_bundle_reservation(["paddles/P01"], "2025-07-02", "2025-07-09", uid="U3")
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01", "paddles/P01", "helmets/H01"],
            reservations=[legacy_r, bundle_r],
            block_start="2025-07-03",
            block_end="2025-07-08",
        )
        self.assertIn("kayaks/K01", conflicts)
        self.assertIn("paddles/P01", conflicts)
        self.assertNotIn("helmets/H01", conflicts)

    def test_exclude_id_skips_own_reservation(self):
        """
        Przy aktualizacji rezerwacji (exclude_id) własna rezerwacja nie blokuje samej siebie.
        """
        existing = self._make_bundle_reservation(["kayaks/K01"], "2025-07-01", "2025-07-10")
        existing["id"] = "R_OWN"
        conflicts = find_bundle_conflicts(
            composite_ids=["kayaks/K01"],
            reservations=[existing],
            block_start="2025-07-02",
            block_end="2025-07-08",
            exclude_id="R_OWN",
        )
        self.assertEqual(conflicts, [])


# ──────────────────────────────────────────────────────────────────────────────
# Section D: max_items bundle enforcement
# ──────────────────────────────────────────────────────────────────────────────

class TestMaxItemsBundleEnforcement(unittest.TestCase):
    """
    Weryfikuje, że limit max_items jest liczony OSOBNO DLA KAŻDEJ KATEGORII (S2):
    komplet można złożyć z kilku osobnych rezerwacji, a limit pilnuje, by nie
    trzymać >N sztuk danego rodzaju sprzętu w nakładającym się terminie.
    Odzwierciedla reservation_limits.ts (countMyOverlappingItemsByCategory /
    countItemsByCategory / findCategoryOverLimit).

    Domyślne limity BackendStub (max sztuk per kategoria):
      rola_czlonek = 3
      rola_kandydat = 1
      rola_zarzad = 100
    """

    CATALOG = {
        "kayaks/K01": {"active": True, "operational": True, "number": "K01", "label": "Kajak K01"},
        "kayaks/K02": {"active": True, "operational": True, "number": "K02", "label": "Kajak K02"},
        "kayaks/K03": {"active": True, "operational": True, "number": "K03", "label": "Kajak K03"},
        "kayaks/K04": {"active": True, "operational": True, "number": "K04", "label": "Kajak K04"},
        "paddles/P01": {"active": True, "number": "P01", "label": "Wiosło P01"},
        "paddles/P02": {"active": True, "number": "P02", "label": "Wiosło P02"},
        "paddles/P03": {"active": True, "number": "P03", "label": "Wiosło P03"},
        "paddles/P04": {"active": True, "number": "P04", "label": "Wiosło P04"},
        "helmets/H01": {"active": True, "number": "H01", "label": "Kask H01"},
        "lifejackets/LJ01": {"active": True, "number": "LJ01", "label": "Kamizelka LJ01"},
    }

    def _make_backend(self, role: str = "rola_czlonek") -> BackendStub:
        return BackendStub(
            users={"U1": {"role_key": role, "status_key": "status_aktywny"}},
            catalog=self.CATALOG,
        )

    def test_member_kayak_paddle_lifejacket_one_each_ok(self):
        """Czlonek: kajak + wiosło + kamizelka = po 1 z każdej kategorii ≤ 3 → OK."""
        backend = self._make_backend("rola_czlonek")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "LJ01", "category": "lifejackets"},
            ],
        )
        self.assertTrue(result["ok"], result)

    def test_member_four_categories_one_each_ok(self):
        """
        Czlonek: kajak + wiosło + kask + kamizelka = po 1 z 4 kategorii.
        Per-kategoria (≤3) → OK (wcześniej blokada przy liczeniu łącznym — S2).
        """
        backend = self._make_backend("rola_czlonek")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
                {"itemId": "LJ01", "category": "lifejackets"},
            ],
        )
        self.assertTrue(result["ok"], result)

    def test_member_four_paddles_blocked(self):
        """Czlonek: 4 wiosła w jednej rezerwacji > limit 3 dla kategorii → blokada."""
        backend = self._make_backend("rola_czlonek")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "P02", "category": "paddles"},
                {"itemId": "P03", "category": "paddles"},
                {"itemId": "P04", "category": "paddles"},
            ],
        )
        self.assertFalse(result["ok"], result)
        self.assertEqual(result["code"], "too_many_items")
        self.assertEqual(result["category"], "paddles")

    def test_candidate_1_kayak_ok(self):
        """Kandydat: 1 kajak = max_items=1 → OK."""
        backend = self._make_backend("rola_kandydat")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)

    def test_candidate_kayak_plus_paddle_one_each_ok(self):
        """
        Kandydat: kajak + wiosło w jednym koszyku = po 1 z każdej kategorii ≤ 1 → OK.
        (Wcześniej blokowane przez luka S2 — liczenie łączne.)
        """
        backend = self._make_backend("rola_kandydat")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
            ],
        )
        self.assertTrue(result["ok"], result)

    def test_candidate_kayak_then_paddle_separate_reservations_ok(self):
        """
        GŁÓWNY scenariusz zgłoszenia: kandydat rezerwuje kajak osobno, a wiosło
        w drugiej, nakładającej się rezerwacji → OK (różne kategorie, po 1 ≤ 1).
        """
        backend = self._make_backend("rola_kandydat")
        first = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(first["ok"], first)

        second = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-02",
            end_date="2025-08-04",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(second["ok"], second)

    def test_candidate_second_kayak_blocked(self):
        """Kandydat: drugi kajak w nakładającym się terminie > 1 → blokada."""
        backend = self._make_backend("rola_kandydat")
        first = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(first["ok"], first)

        second = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-02",
            end_date="2025-08-04",
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(second["ok"], second)
        self.assertEqual(second["code"], "too_many_items")
        self.assertEqual(second["category"], "kayaks")

    def test_candidate_second_paddle_blocked(self):
        """Kandydat: drugie wiosło w nakładającym się terminie > 1 → blokada."""
        backend = self._make_backend("rola_kandydat")
        first = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[{"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(first["ok"], first)

        second = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-02",
            end_date="2025-08-04",
            items=[{"itemId": "P02", "category": "paddles"}],
        )
        self.assertFalse(second["ok"], second)
        self.assertEqual(second["code"], "too_many_items")
        self.assertEqual(second["category"], "paddles")

    def test_board_many_items_ok(self):
        """Zarząd: limit = 100, 2 kajaki + 2 akcesoria → OK."""
        backend = self._make_backend("rola_zarzad")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "K02", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ],
        )
        self.assertTrue(result["ok"], result)

    def test_cumulative_kayaks_across_overlapping_reservations_ok(self):
        """
        Czlonek ma już 2 kajaki w nakładającej się rezerwacji.
        Dodanie 3. kajaka w drugiej, nakładającej się rezerwacji → 3 kajaki ≤ 3 → OK.
        """
        backend = self._make_backend("rola_czlonek")

        first = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-01",
            end_date="2025-09-05",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "K02", "category": "kayaks"},
            ],
        )
        self.assertTrue(first["ok"], first)

        second = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-03",
            end_date="2025-09-07",
            items=[{"itemId": "K03", "category": "kayaks"}],
        )
        self.assertTrue(second["ok"], second)

    def test_cumulative_kayaks_over_limit_blocked(self):
        """
        Czlonek ma już 3 kajaki. 4. kajak w nakładającej się rezerwacji → 4 > 3 → blokada.
        Akcesoria (inna kategoria) nadal przeszłyby — liczenie jest per kategoria.
        """
        backend = self._make_backend("rola_czlonek")

        first = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-01",
            end_date="2025-09-05",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "K02", "category": "kayaks"},
                {"itemId": "K03", "category": "kayaks"},
            ],
        )
        self.assertTrue(first["ok"], first)

        # 4. kajak → blokada
        fourth_kayak = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-03",
            end_date="2025-09-07",
            items=[{"itemId": "K04", "category": "kayaks"}],
        )
        self.assertFalse(fourth_kayak["ok"], fourth_kayak)
        self.assertEqual(fourth_kayak["code"], "too_many_items")
        self.assertEqual(fourth_kayak["category"], "kayaks")

        # Akcesorium innej kategorii w tym samym terminie → OK (per kategoria)
        helmet = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-09-03",
            end_date="2025-09-07",
            items=[{"itemId": "H01", "category": "helmets"}],
        )
        self.assertTrue(helmet["ok"], helmet)

    def test_gear_only_bundle_no_kayak_cost_zero(self):
        """
        Bundle bez kajaka → reservationKind=gear_only, costHours=0.
        Odzwierciedla luka K1: akcesoria nie mają ceny.
        """
        backend = self._make_backend("rola_czlonek")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-05",
            items=[
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ],
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["reservationKind"], "gear_only")
        self.assertEqual(result["costHours"], 0)

    def test_kayak_bundle_cost_only_from_kayaks(self):
        """
        Bundle z kajakiem i akcesoriami: costHours = tylko dni × kajaki.
        Akcesoria (wiosło, kask) mają koszt=0 — luka K1.
        """
        backend = self._make_backend("rola_czlonek")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-01",
            end_date="2025-08-03",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "P01", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ],
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["reservationKind"], "kayak_bundle")
        # BackendStub: 1h/dzień/kajak, 3 dni = 3h. Akcesoria 0.
        self.assertEqual(result["costHours"], 3)

    def test_accessories_price_gap_k1_documented(self):
        """
        LUKA K1: Akcesoria (wiosło, kask, fartuch) nie mają cennika.
        Oczekiwany koszt = tylko kajaki × dni × stawka.
        Ten test dokumentuje zachowanie obecne (nie oczekiwane docelowo).
        """
        backend = self._make_backend("rola_czlonek")
        result_kayak_only = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-10",
            end_date="2025-08-12",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        result_kayak_with_extras = backend.create_bundle_reservation(
            uid="U1",
            start_date="2025-08-15",
            end_date="2025-08-17",
            items=[
                {"itemId": "K02", "category": "kayaks"},
                {"itemId": "P02", "category": "paddles"},
                {"itemId": "H01", "category": "helmets"},
            ],
        )
        self.assertTrue(result_kayak_only["ok"], result_kayak_only)
        self.assertTrue(result_kayak_with_extras["ok"], result_kayak_with_extras)

        # Oba mają 1 kajak na 3 dni → ten sam koszt mimo różnej liczby akcesoriów
        self.assertEqual(
            result_kayak_only["costHours"],
            result_kayak_with_extras["costHours"],
            "Luka K1: koszt z akcesoriami powinien równać się kosztowi bez akcesoriów (akcesoria bezpłatne)",
        )


# ──────────────────────────────────────────────────────────────────────────────
# Section E: Kursant rental gating (flaga + okno szkoleniówki)
# ──────────────────────────────────────────────────────────────────────────────

class TestKursantExemptAndGate(unittest.TestCase):
    """Pure-function: zwolnienie z opłaty + bramka rezerwacji kursanta."""

    def test_exempt_current_year_before_sep30(self):
        self.assertTrue(is_free_rental_exempt(2026, "2026-07-01"))

    def test_exempt_on_sep30_inclusive(self):
        self.assertTrue(is_free_rental_exempt(2026, "2026-09-30"))

    def test_not_exempt_after_sep30(self):
        self.assertFalse(is_free_rental_exempt(2026, "2026-10-01"))

    def test_not_exempt_wrong_year(self):
        self.assertFalse(is_free_rental_exempt(2025, "2026-07-01"))

    def test_not_exempt_no_year(self):
        self.assertFalse(is_free_rental_exempt(None, "2026-07-01"))

    def test_gate_flag_off_forbidden(self):
        gate = assert_kursant_rental_allowed(False, True, 2026)
        self.assertIsNotNone(gate)
        self.assertEqual(gate["code"], "forbidden")

    def test_gate_in_window_allowed(self):
        self.assertIsNone(assert_kursant_rental_allowed(True, True, 2026))

    def test_gate_window_closed(self):
        gate = assert_kursant_rental_allowed(True, False, 2026)
        self.assertEqual(gate["code"], "kursant_window_closed")

    def test_gate_no_year(self):
        gate = assert_kursant_rental_allowed(True, False, None)
        self.assertEqual(gate["code"], "kursant_no_year")


class TestScenarioKursant(unittest.TestCase):
    """
    Kursant == kandydat W OKNIE (flaga ON, do 30.09 roku kursu); po oknie lub przy
    fladze OFF — zablokowany. Limit jak kandydat: 1 szt. na kategorię.
    """

    YEAR = 2026
    IN_WINDOW = "2026-07-01"
    AFTER_WINDOW = "2026-10-01"

    def _catalog(self):
        return make_catalog(
            {"category": "kayaks", "itemId": "K01", "number": "10"},
            {"category": "kayaks", "itemId": "K02", "number": "11"},
            {"category": "paddles", "itemId": "P01", "number": "W-01"},
            {"category": "helmets", "itemId": "H01", "number": "KAS-01"},
        )

    def _backend(self, flag, today, school_year=YEAR):
        users = {"U_KURS": {"role_key": "rola_kursant", "school_year": school_year}}
        return BackendStub(users, self._catalog(), kurs_wypozycza=flag, today=today)

    def test_in_window_can_reserve_kayak(self):
        backend = self._backend(True, self.IN_WINDOW)
        r = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-07-10", end_date="2026-07-12",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(r["ok"], r)

    def test_in_window_can_reserve_non_kayak_categories(self):
        # Klucz zgłoszenia: kategorie nie-kajakowe też muszą działać dla kursanta.
        backend = self._backend(True, self.IN_WINDOW)
        for item in ({"itemId": "P01", "category": "paddles"}, {"itemId": "H01", "category": "helmets"}):
            r = backend.create_bundle_reservation(
                uid="U_KURS", start_date="2026-07-10", end_date="2026-07-12", items=[item],
            )
            self.assertTrue(r["ok"], r)

    def test_in_window_limit_one_per_category_like_candidate(self):
        backend = self._backend(True, self.IN_WINDOW)
        first = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-07-10", end_date="2026-07-12",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(first["ok"], first)
        second = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-07-11", end_date="2026-07-13",
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(second["ok"], second)
        self.assertEqual(second["code"], "too_many_items")

    def test_flag_off_forbidden(self):
        backend = self._backend(False, self.IN_WINDOW)
        r = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-07-10", end_date="2026-07-12",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(r["ok"], r)
        self.assertEqual(r["code"], "forbidden")

    def test_after_window_blocked(self):
        backend = self._backend(True, self.AFTER_WINDOW)
        r = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-10-05", end_date="2026-10-07",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(r["ok"], r)
        self.assertEqual(r["code"], "kursant_window_closed")

    def test_no_school_year_blocked(self):
        backend = self._backend(True, self.IN_WINDOW, school_year=None)
        r = backend.create_bundle_reservation(
            uid="U_KURS", start_date="2026-07-10", end_date="2026-07-12",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertFalse(r["ok"], r)
        self.assertEqual(r["code"], "kursant_no_year")


class TestScenarioClubEvent(unittest.TestCase):
    """
    Tryb "impreza klubowa" (kierownik rezerwuje dowolną ilość sprzętu bezpłatnie,
    wyłącznie na tę imprezę). Mirror rozszerzenia createBundleReservation()
    w gear_bundle_service.ts — patrz komentarze przy as_club_event w BackendStub.

    Reguły pod testem:
      - limit ilości per kategoria POMIJANY,
      - daty NADPISANE datami imprezy (klient nie wybiera),
      - konflikt terminów i walidacja przedmiotów NIGDY nie pomijane,
      - rola musi być w MEMBER_ROLE_KEYS (rola_kursant/rola_sympatyk odrzucone),
      - brak aktywnej imprezy dla uid → "not_a_kierownik",
      - zapisana rezerwacja ma eventId ustawiony, costHours=0, waived=False —
        mechanizm godzinkowy pomijany W CAŁOŚCI, nie "zwalniany" (decyzja
        użytkownika 05.09.2026: wpis "waived" mylił, sugerował realny koszt/
        zwrot, którego nigdy nie było).
    """

    CATALOG = {
        "kayaks/K01": {"active": True, "operational": True, "number": "K01", "label": "Kajak K01"},
        "kayaks/K02": {"active": True, "operational": True, "number": "K02", "label": "Kajak K02"},
        "kayaks/K03": {"active": True, "operational": True, "number": "K03", "label": "Kajak K03"},
        "kayaks/K04": {"active": True, "operational": True, "number": "K04", "label": "Kajak K04"},
        "kayaks/K_BROKEN": {"active": True, "operational": False, "number": "K05", "label": "Kajak K05"},
        "paddles/P01": {"active": True, "number": "P01", "label": "Wiosło P01"},
    }

    EVENT = {"id": "EV1", "startDate": "2026-08-01", "endDate": "2026-08-03"}

    def _backend(self, role="rola_kandydat", kierownik_events=None, users_extra=None):
        users = {"U1": {"role_key": role, "status_key": "status_aktywny"}}
        if users_extra:
            users.update(users_extra)
        return BackendStub(
            users=users,
            catalog=self.CATALOG,
            kierownik_events=kierownik_events if kierownik_events is not None else {"U1": self.EVENT},
        )

    def test_bypasses_per_category_item_limit(self):
        """Kandydat (limit 1/kategoria) rezerwuje 4 kajaki naraz jako kierownik → OK."""
        backend = self._backend(role="rola_kandydat")
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2099-01-01",  # ignorowane — nadpisane datami imprezy
            end_date="2099-01-01",
            items=[
                {"itemId": "K01", "category": "kayaks"},
                {"itemId": "K02", "category": "kayaks"},
                {"itemId": "K03", "category": "kayaks"},
                {"itemId": "K04", "category": "kayaks"},
            ],
            as_club_event=True,
        )
        self.assertTrue(result["ok"], result)

    def test_dates_forced_to_event_dates(self):
        """Daty przesłane przez klienta są ignorowane — zapisana rezerwacja ma daty imprezy."""
        backend = self._backend()
        result = backend.create_bundle_reservation(
            uid="U1",
            start_date="2099-01-01",
            end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertTrue(result["ok"], result)
        stored = backend.reservations[0]
        self.assertEqual(stored["startDate"], self.EVENT["startDate"])
        self.assertEqual(stored["endDate"], self.EVENT["endDate"])

    def test_conflict_still_enforced(self):
        """Kajak już zajęty w terminie imprezy — konflikt NIE jest pomijany dla trybu klubowego."""
        backend = self._backend()
        # Inna osoba ma już aktywną rezerwację K01 nakładającą się na termin imprezy.
        backend.reservations.append({
            "id": "OTHER-001",
            "status": "active",
            "userUid": "U_OTHER",
            "startDate": "2026-08-02",
            "endDate": "2026-08-05",
            "blockStartIso": "2026-08-01",
            "blockEndIso": "2026-08-06",
            "itemIds": ["kayaks/K01"],
            "kayakIds": ["K01"],
        })
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "conflict")

    def test_item_validity_still_enforced(self):
        """Niesprawny kajak nadal odrzucony w trybie klubowym."""
        backend = self._backend()
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K_BROKEN", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_operational")

    def test_not_a_kierownik_when_no_active_event(self):
        """Rola uprawniona (kandydat), ale brak wpisu w kierownik_events → not_a_kierownik."""
        backend = self._backend(kierownik_events={})
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "not_a_kierownik")

    def test_role_not_allowed_kursant(self):
        """Kursant nie jest w MEMBER_ROLE_KEYS — odrzucony nawet z wpisem w kierownik_events."""
        backend = self._backend(role="rola_kursant")
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "forbidden")

    def test_role_not_allowed_sympatyk(self):
        """Sympatyk odrzucony już na ogólnej bramce roli (przed sprawdzeniem trybu klubowego)."""
        backend = self._backend(role="rola_sympatyk")
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "forbidden")

    def test_reservation_marked_event_id_no_godzinki_trace(self):
        """Zapisana rezerwacja niesie eventId, ale zero śladu w mechanizmie godzinkowym —
        costHours=0 i waived=False niezależnie od liczby kajaków (dyskryminator dla frontu
        to WYŁĄCZNIE eventId, nigdy waived)."""
        backend = self._backend()
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}],
            as_club_event=True,
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["eventId"], self.EVENT["id"])
        self.assertEqual(result["costHours"], 0)
        self.assertFalse(result["waived"])
        stored = backend.reservations[0]
        self.assertEqual(stored["eventId"], self.EVENT["id"])
        self.assertEqual(stored["costHours"], 0)
        self.assertFalse(stored["waived"])

    def test_normal_reservation_unaffected_eventid_none(self):
        """Zwykła rezerwacja (bez as_club_event) ma eventId=None, waived=False."""
        backend = self._backend()
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2026-09-01", end_date="2026-09-03",
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)
        self.assertIsNone(result["eventId"])
        self.assertFalse(result["waived"])

    def test_board_role_allowed_as_kierownik(self):
        """rola_zarzad też może być kierownikiem (w MEMBER_ROLE_KEYS)."""
        backend = self._backend(role="rola_zarzad")
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=[{"itemId": "K01", "category": "kayaks"}, {"itemId": "P01", "category": "paddles"}],
            as_club_event=True,
        )
        self.assertTrue(result["ok"], result)


class TestScenarioClubEventItemsEdit(unittest.TestCase):
    """
    Edycja listy przedmiotów już złożonej rezerwacji na imprezę klubową —
    potrzeby kierownika zmieniają się w miarę przygotowań (feedback użytkownika
    04.09.2026). Mirror updateBundleReservationItems() w gear_bundle_service.ts.

    Reguły pod testem:
      - podmienia PEŁNĄ listę (dodane pozycje wchodzą, pominięte znikają),
      - limit ilości POMIJANY (jak przy tworzeniu),
      - konflikt terminów (z wyłączeniem samej siebie) i sprawność przedmiotów
        NIGDY nie są pomijane,
      - działa WYŁĄCZNIE na rezerwacjach z eventId,
      - wymaga wciąż być aktywnym kierownikiem TEJ SAMEJ imprezy,
      - tylko właściciel rezerwacji może ją edytować.
    """

    CATALOG = {
        "kayaks/K01": {"active": True, "operational": True, "number": "K01", "label": "Kajak K01"},
        "kayaks/K02": {"active": True, "operational": True, "number": "K02", "label": "Kajak K02"},
        "kayaks/K_BROKEN": {"active": True, "operational": False, "number": "K05", "label": "Kajak K05"},
        "paddles/P01": {"active": True, "number": "P01", "label": "Wiosło P01"},
    }

    EVENT = {"id": "EV1", "startDate": "2026-08-01", "endDate": "2026-08-03"}

    def _backend(self, kierownik_events=None):
        return BackendStub(
            users={
                "U1": {"role_key": "rola_kandydat", "status_key": "status_aktywny"},
                "U2": {"role_key": "rola_czlonek", "status_key": "status_aktywny"},
            },
            catalog=self.CATALOG,
            kierownik_events=kierownik_events if kierownik_events is not None else {"U1": self.EVENT},
        )

    def _create(self, backend, items):
        result = backend.create_bundle_reservation(
            uid="U1", start_date="2099-01-01", end_date="2099-01-01",
            items=items, as_club_event=True,
        )
        self.assertTrue(result["ok"], result)
        return result["id"]

    def test_edit_adds_and_removes_items(self):
        """Odznaczenie K01 (usuwa) + dodanie K02 i wiosła — pełna lista podmieniona."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        result = backend.update_bundle_reservation_items(
            uid="U1", reservation_id=rid,
            items=[{"itemId": "K02", "category": "kayaks"}, {"itemId": "P01", "category": "paddles"}],
        )
        self.assertTrue(result["ok"], result)
        stored = backend.reservations[0]
        self.assertEqual(sorted(stored["itemIds"]), ["kayaks/K02", "paddles/P01"])
        self.assertNotIn("kayaks/K01", stored["itemIds"])

    def test_conflict_still_enforced_on_edit(self):
        """Dodanie kajaka zajętego przez CUDZĄ rezerwację — blokowane."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        backend.reservations.append({
            "id": "OTHER-001", "status": "active", "userUid": "U_OTHER",
            "startDate": "2026-08-02", "endDate": "2026-08-05",
            "blockStartIso": "2026-08-01", "blockEndIso": "2026-08-06",
            "itemIds": ["kayaks/K02"], "kayakIds": ["K02"],
        })
        result = backend.update_bundle_reservation_items(
            uid="U1", reservation_id=rid,
            items=[{"itemId": "K01", "category": "kayaks"}, {"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "conflict")

    def test_self_excluded_from_conflict_check(self):
        """Resubmisja tej samej listy (bez zmian) NIE koliduje sama ze sobą."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        result = backend.update_bundle_reservation_items(
            uid="U1", reservation_id=rid,
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)

    def test_item_validity_still_enforced_on_edit(self):
        """Dodanie niesprawnego kajaka do edytowanej listy — odrzucone."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        result = backend.update_bundle_reservation_items(
            uid="U1", reservation_id=rid,
            items=[{"itemId": "K01", "category": "kayaks"}, {"itemId": "K_BROKEN", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "item_not_operational")

    def test_not_a_kierownik_anymore_blocks_edit(self):
        """Impreza się skończyła / kierownik zmieniony — edycja listy zablokowana."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        backend.kierownik_events = {}  # impreza już nieaktywna dla U1
        result = backend.update_bundle_reservation_items(
            uid="U1", reservation_id=rid,
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "not_a_kierownik")

    def test_not_club_event_reservation_blocks_edit(self):
        """Zwykła (nie-klubowa) rezerwacja nie ma trybu edycji listy."""
        backend = self._backend()
        result = backend.create_bundle_reservation(
            uid="U2", start_date="2026-09-01", end_date="2026-09-03",
            items=[{"itemId": "K01", "category": "kayaks"}],
        )
        self.assertTrue(result["ok"], result)
        result = backend.update_bundle_reservation_items(
            uid="U2", reservation_id=result["id"],
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "not_club_event_reservation")

    def test_empty_items_blocked(self):
        """Pusta lista jest odrzucana — pełne zrzeczenie się sprzętu idzie przez anulowanie."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        result = backend.update_bundle_reservation_items(uid="U1", reservation_id=rid, items=[])
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "no_items")

    def test_forbidden_not_owner(self):
        """Inny użytkownik nie może edytować cudzej rezerwacji na imprezę."""
        backend = self._backend()
        rid = self._create(backend, [{"itemId": "K01", "category": "kayaks"}])
        result = backend.update_bundle_reservation_items(
            uid="U2", reservation_id=rid,
            items=[{"itemId": "K02", "category": "kayaks"}],
        )
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "forbidden")


if __name__ == "__main__":
    unittest.main()