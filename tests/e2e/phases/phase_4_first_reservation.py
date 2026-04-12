"""
Phase 4: First kayak reservation
- GET /api/gear/kayaks → pick first available (isOperational=True)
- POST /api/gear/reservations/create with kayakIds: ["id"] (array)
  Body: {startDate, endDate, kayakIds: ["id"]}
  Response: {ok, reservationId, costHours, blockStartIso, blockEndIso}
- Verify reservation in Firestore (collection: gear_reservations, field: userUid)
- Verify cost = 1 kayak × 2 days × 10h = 20h
- Verify godzinki balance decreased by 20h via GET /api/godzinki

Cost formula from gear_kayaks_service.ts:
  daysOnWaterInclusive = floor((endDate - startDate) / 86400000) + 1
  costHours = days × kayakCount × hoursPerKayakPerDay (default 10)
  2 days × 1 kayak × 10h = 20h

Limit for rola_czlonek: maxWeeks=2 → end date ≤ today + 14 days.
We use start=today+2, end=today+3 (2 days inclusive, well within limits).
"""
import time
import logging
from datetime import date, timedelta
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)

EXPECTED_COST_HOURS = 20.0  # 1 kayak × 2 days × 10h


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P4"
    name = "First reservation (1 kayak × 2 days = 20h)"

    try:
        uid = ctx.get("test_uid")
        if not uid:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid in context (Phase 1 skipped or failed)",
            )

        auth = ctx["auth"]
        api = ctx["api"]
        fs = ctx["firestore"]
        token = auth.test_user_token()

        # Step 1: Get kayaks catalog
        catalog = api.get_kayaks(token)
        log.info(f"Kayaks catalog: ok={catalog.get('ok')}, count={len(catalog.get('kayaks', []))}")

        kayaks = catalog.get("kayaks", [])
        if not kayaks:
            raise AssertionError(
                f"No kayaks in catalog from GET /api/gear/kayaks. "
                f"Response: {catalog}"
            )

        # Pick first kayak where isOperational is not False (prefer True or None)
        kayak = None
        for k in kayaks:
            if k.get("isOperational") is not False and not k.get("isPrivate"):
                kayak = k
                break
        if not kayak:
            kayak = kayaks[0]
            log.warning(f"No clearly operational non-private kayak found, using first: {kayak}")

        kayak_id = str(kayak.get("id", "")).strip()
        if not kayak_id:
            raise AssertionError(f"Could not determine kayak ID from: {kayak}")

        log.info(f"Selected kayak: id={kayak_id}, brand={kayak.get('brand')}, model={kayak.get('model')}, isReservedNow={kayak.get('isReservedNow')}")

        # Step 2: Choose dates
        # start=today+2, end=today+3 → 2 days inclusive
        # Stays within maxWeeks=2 (14 days) for rola_czlonek
        today = date.today()
        start_date = today + timedelta(days=2)
        end_date = start_date + timedelta(days=1)  # inclusive → 2 days total
        start_iso = start_date.isoformat()
        end_iso = end_date.isoformat()

        # Step 3: Balance before reservation
        try:
            godzinki_before = api.get_godzinki(token, view="home")
            balance_before = float(godzinki_before.get("balance", 0))
        except Exception:
            balance_before = fs.get_godzinki_balance(uid)
        log.info(f"Balance before reservation: {balance_before}h")

        if balance_before < EXPECTED_COST_HOURS:
            raise AssertionError(
                f"Insufficient balance for reservation: {balance_before}h < {EXPECTED_COST_HOURS}h. "
                f"Phase 3 (grant godzinki) may have failed."
            )

        # Step 4: Create reservation
        log.info(f"Creating reservation: kayak={kayak_id}, {start_iso} → {end_iso}")
        res_result = api.reserve_kayaks(token, [kayak_id], start_iso, end_iso)
        log.info(f"Reservation response: {res_result}")

        reservation_id = res_result.get("reservationId", "")
        if not reservation_id:
            raise AssertionError(f"No reservationId in response: {res_result}")

        cost_hours = float(res_result.get("costHours", 0))
        block_start = res_result.get("blockStartIso", "")
        block_end = res_result.get("blockEndIso", "")
        log.info(f"Reservation created: id={reservation_id}, cost={cost_hours}h, blockStart={block_start}")

        # Step 5: Verify cost
        if abs(cost_hours - EXPECTED_COST_HOURS) > 0.1:
            raise AssertionError(
                f"Cost mismatch: expected={EXPECTED_COST_HOURS}h, actual={cost_hours}h. "
                f"Check hoursPerKayakPerDay in setup/vars_gear."
            )

        # Step 6: Verify reservation in Firestore
        time.sleep(2)
        res_doc = fs.get_reservation(reservation_id)
        if not res_doc:
            raise AssertionError(f"Reservation {reservation_id} not found in Firestore")

        # Firestore doc uses "userUid" (not "uid")
        assert res_doc.get("userUid") == uid, f"userUid mismatch: {res_doc.get('userUid')} != {uid}"
        assert res_doc.get("status") == "active", f"status={res_doc.get('status')!r} (expected 'active')"
        assert float(res_doc.get("costHours", 0)) == cost_hours, "costHours mismatch in Firestore"

        # Step 7: Verify balance decreased
        try:
            godzinki_after = api.get_godzinki(token, view="home")
            balance_after = float(godzinki_after.get("balance", 0))
        except Exception:
            balance_after = fs.get_godzinki_balance(uid)

        log.info(f"Balance after reservation: {balance_after}h (expected: {balance_before - cost_hours})")
        expected_balance = balance_before - cost_hours
        if abs(balance_after - expected_balance) > 0.5:
            raise AssertionError(
                f"Balance after reservation mismatch: expected≈{expected_balance}h, actual={balance_after}h"
            )

        # Save to context for subsequent phases
        ctx["reservation_1_id"] = reservation_id
        ctx["reservation_1_cost_hours"] = cost_hours
        ctx["first_kayak"] = kayak
        ctx["first_kayak_id"] = kayak_id
        ctx["godzinki_balance_after_p4"] = balance_after

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=f"Reserved {kayak_id} ({start_iso}–{end_iso}). cost={cost_hours}h. balance: {balance_before}→{balance_after}h",
            details={
                "reservation_id": reservation_id,
                "kayak_id": kayak_id,
                "start": start_iso,
                "end": end_iso,
                "cost_hours": cost_hours,
                "block_start": block_start,
                "block_end": block_end,
                "balance_before": balance_before,
                "balance_after": balance_after,
            },
        )

    except Exception as e:
        log.exception("Phase 4 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )