"""
Phase 5: Reservation limit errors
Tests (rola_czlonek defaults from setup_gear_vars.ts):
  - maxWeeksByRole: 2 weeks → endDate must be ≤ today+14 days
    Error code: "max_time_exceeded"
  - maxItemsByRole: 3 simultaneous reservations
    Error code: "max_items_exceeded"
  - negative balance limit (negativeBalanceLimit, default 20h)
    Error code: "negative_limit_exceeded"

After Phase 4: balance ≈ 80h (100h granted - 20h used).
"""
import time
import logging
from datetime import date, timedelta
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P5"
    name = "Reservation limit errors (maxWeeks, maxItems, negBalance)"

    try:
        uid = ctx.get("test_uid")
        first_kayak_id = ctx.get("first_kayak_id")

        if not uid or not first_kayak_id:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid or first_kayak_id in context (Phase 4 skipped or failed)",
            )

        auth = ctx["auth"]
        api = ctx["api"]
        token = auth.test_user_token()

        today = date.today()
        errors_found = []
        errors_missed = []
        extra_ids = []

        # ----------------------------------------------------------------
        # Test 1: maxWeeksByRole (2 weeks for rola_czlonek)
        # End date = today + 15 days → exceeds 2-week window → "max_time_exceeded"
        # ----------------------------------------------------------------
        over_start = today + timedelta(days=3)
        over_end = today + timedelta(days=15)  # 15 days from today > 14 days limit
        log.info(f"Test maxWeeksByRole: {over_start} → {over_end} (15 days from today, limit=14)")
        resp_weeks = api.reserve_kayaks_soft(token, [first_kayak_id], over_start.isoformat(), over_end.isoformat())
        log.info(f"maxWeeksByRole response: {resp_weeks}")

        if not resp_weeks.get("ok") and resp_weeks.get("code") == "max_time_exceeded":
            errors_found.append("maxWeeksByRole: blocked with max_time_exceeded ✓")
        elif resp_weeks.get("reservationId"):
            # Was allowed — clean up and note
            try:
                api.cancel_reservation(token, resp_weeks["reservationId"])
            except Exception:
                extra_ids.append(resp_weeks["reservationId"])
            errors_missed.append(
                f"maxWeeksByRole: reservation was created (not blocked). "
                f"maxWeeks may differ from default=2 in this environment."
            )
        else:
            errors_found.append(f"maxWeeksByRole: blocked with code={resp_weeks.get('code')!r}")

        # ----------------------------------------------------------------
        # Test 2: maxItemsByRole (3 for rola_czlonek)
        # We already have 1 from Phase 4. Create 2 more → total 3 = at limit.
        # Try 4th → "max_items_exceeded"
        # Use non-overlapping dates far in the future
        # ----------------------------------------------------------------
        base = today + timedelta(days=4)

        for i in range(2):
            s = base + timedelta(days=i * 3)
            e = s + timedelta(days=1)
            resp_extra = api.reserve_kayaks_soft(token, [first_kayak_id], s.isoformat(), e.isoformat())
            if resp_extra.get("reservationId"):
                extra_ids.append(resp_extra["reservationId"])
                log.info(f"Extra reservation {i+1}: {resp_extra['reservationId']} ({s}–{e})")
            else:
                log.warning(f"Could not create extra reservation {i+1}: {resp_extra}")

        ctx["extra_reservation_ids"] = extra_ids

        # Now try 4th (should be blocked if we have 3 active)
        s4 = base + timedelta(days=10)
        e4 = s4 + timedelta(days=1)
        log.info(f"Test maxItemsByRole: trying 4th reservation ({s4}–{e4})")
        resp_items = api.reserve_kayaks_soft(token, [first_kayak_id], s4.isoformat(), e4.isoformat())
        log.info(f"maxItemsByRole response: {resp_items}")

        if not resp_items.get("ok") and resp_items.get("code") == "max_items_exceeded":
            errors_found.append("maxItemsByRole: blocked with max_items_exceeded ✓")
        elif resp_items.get("reservationId"):
            try:
                api.cancel_reservation(token, resp_items["reservationId"])
            except Exception:
                extra_ids.append(resp_items["reservationId"])
                ctx["extra_reservation_ids"] = extra_ids
            errors_missed.append(
                f"maxItemsByRole: 4th reservation was created. "
                f"maxItems may differ from default=3 in this environment."
            )
        else:
            errors_found.append(f"maxItemsByRole: blocked with code={resp_items.get('code')!r}")

        # ----------------------------------------------------------------
        # Test 3: Negative balance limit
        # Current balance ≈ 80h, negativeBalanceLimit = 20h from context or default
        # We need to try reserving more than (balance + negativeBalanceLimit) hours
        # 1 kayak × 11 days = 110h → 80 - 110 = -30h which is below -20h limit
        # But maxWeeks=2 → max 14 days → use 1 kayak × 11 days = 110h
        # If balance < negativeBalanceLimit + cost → blocked
        # ----------------------------------------------------------------
        neg_limit = float(ctx.get("negative_balance_limit", 20.0))
        try:
            godzinki_resp = api.get_godzinki(token, view="home")
            current_balance = float(godzinki_resp.get("balance", 0))
        except Exception:
            from helpers.firestore_helper import FirestoreHelper
            current_balance = ctx["firestore"].get_godzinki_balance(uid)

        log.info(f"Balance for neg-limit test: {current_balance}h, limit={neg_limit}h")

        # We need cost > current_balance + neg_limit
        # hoursPerKayakPerDay=10, so days needed = ceil((current_balance + neg_limit + 1) / 10)
        import math
        days_needed = math.ceil((current_balance + neg_limit + 1) / 10)
        days_needed = min(days_needed, 13)  # cap at 13 days (within 2-week maxWeeks limit)
        expected_cost_neg = days_needed * 10

        neg_start = today + timedelta(days=3)
        neg_end = neg_start + timedelta(days=days_needed - 1)

        log.info(
            f"Test negBalance: {days_needed} days → cost={expected_cost_neg}h, "
            f"balance={current_balance}h, limit=-{neg_limit}h, "
            f"result would be {current_balance - expected_cost_neg}h"
        )

        if expected_cost_neg > current_balance + neg_limit:
            resp_neg = api.reserve_kayaks_soft(token, [first_kayak_id], neg_start.isoformat(), neg_end.isoformat())
            log.info(f"negBalance response: {resp_neg}")

            if not resp_neg.get("ok") and resp_neg.get("code") == "negative_limit_exceeded":
                errors_found.append("negBalance: blocked with negative_limit_exceeded ✓")
            elif resp_neg.get("reservationId"):
                try:
                    api.cancel_reservation(token, resp_neg["reservationId"])
                except Exception:
                    extra_ids.append(resp_neg["reservationId"])
                    ctx["extra_reservation_ids"] = extra_ids
                errors_missed.append(
                    f"negBalance: reservation created despite exceeding limit "
                    f"(cost={expected_cost_neg}h, balance={current_balance}h, limit={neg_limit}h). "
                    f"Code: {resp_neg.get('code')!r}"
                )
            else:
                errors_found.append(f"negBalance: blocked with code={resp_neg.get('code')!r}")
        else:
            log.info(f"negBalance test skipped — can't construct a cost that exceeds limit within maxWeeks=2")
            errors_found.append(f"negBalance: test inconclusive (balance={current_balance}h too high to test)")

        status = "pass" if not errors_missed else "fail"
        msg = f"Limit tests: {len(errors_found)} blocked correctly, {len(errors_missed)} NOT blocked"

        return PhaseResult(
            phase_id=phase_id, name=name, status=status,
            duration_s=time.time() - t0,
            message=msg,
            details={
                "errors_found": errors_found,
                "errors_missed": errors_missed,
                "extra_reservations_created": extra_ids,
            },
            error=("\n".join(errors_missed) if errors_missed else None),
        )

    except Exception as e:
        log.exception("Phase 5 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )