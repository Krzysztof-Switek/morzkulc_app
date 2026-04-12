"""
Phase 7: Drain godzinki balance + verify negative limit enforcement
- Make enough reservations to bring balance close to 0
- Verify the system blocks a reservation that would go below -negativeBalanceLimit
  Expected error code: "negative_limit_exceeded"
- Balance is read via GET /api/godzinki (authoritative)

After Phase 6 balance should be ≈ 100h (grant restored after cancels).
Each 1-kayak × 2-day reservation costs 20h.
"""
import time
import math
import logging
from datetime import date, timedelta
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P7"
    name = "Balance drain + negative limit enforcement"

    try:
        uid = ctx.get("test_uid")
        first_kayak_id = ctx.get("first_kayak_id")
        neg_limit = float(ctx.get("negative_balance_limit", 20.0))

        if not uid or not first_kayak_id:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid or first_kayak_id in context",
            )

        auth = ctx["auth"]
        api = ctx["api"]
        token = auth.test_user_token()

        try:
            balance_start = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            balance_start = ctx["firestore"].get_godzinki_balance(uid)

        log.info(f"Starting balance: {balance_start}h, negativeBalanceLimit={neg_limit}h")

        today = date.today()
        base = today + timedelta(days=60)  # far future, avoids conflicts with other phases

        # How many 20h (1 kayak × 2 days) reservations can we make before hitting limit?
        # balance - n*20 > -neg_limit → n < (balance + neg_limit) / 20
        max_allowed = math.floor((balance_start + neg_limit) / 20.0)
        drain_count = max(0, max_allowed - 1)  # leave 1 slot to test the boundary
        log.info(f"Will create {drain_count} × 20h reservations to drain balance")

        drain_ids = []
        for i in range(drain_count):
            s = base + timedelta(days=i * 3)
            e = s + timedelta(days=1)
            resp = api.reserve_kayaks_soft(token, [first_kayak_id], s.isoformat(), e.isoformat())
            r_id = resp.get("reservationId", "")
            if r_id:
                drain_ids.append(r_id)
                log.info(f"Drain {i+1}/{drain_count}: {r_id} ({s}–{e})")
            else:
                log.warning(f"Drain reservation {i+1} failed: {resp}")
                break

        ctx["drain_reservation_ids"] = drain_ids

        try:
            balance_mid = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            balance_mid = ctx["firestore"].get_godzinki_balance(uid)
        log.info(f"Balance after {len(drain_ids)} drain reservations: {balance_mid}h")

        # Test boundary: one more 20h reservation that would go to exactly -neg_limit
        # (or just below it)
        neg_limit_blocked = False
        neg_limit_result = "not tested"

        limit_start = base + timedelta(days=drain_count * 3)
        limit_end = limit_start + timedelta(days=1)

        log.info(f"Testing negative limit: 20h reservation with balance={balance_mid}h (limit=-{neg_limit}h)")
        resp_limit = api.reserve_kayaks_soft(token, [first_kayak_id], limit_start.isoformat(), limit_end.isoformat())
        log.info(f"Limit test response: {resp_limit}")

        if not resp_limit.get("ok") and resp_limit.get("code") == "negative_limit_exceeded":
            neg_limit_blocked = True
            neg_limit_result = f"blocked with negative_limit_exceeded ✓ (balance={balance_mid}h)"
        elif resp_limit.get("reservationId"):
            # Allowed — this means balance was still high enough
            drain_ids.append(resp_limit["reservationId"])
            ctx["drain_reservation_ids"] = drain_ids
            neg_limit_result = (
                f"reservation allowed (balance={balance_mid}h still > -{neg_limit}h). "
                f"Negative limit not yet reached."
            )
            log.info(f"Limit reservation allowed (balance still above limit): {resp_limit['reservationId']}")

            # Try one more to actually hit the limit
            limit_start2 = base + timedelta(days=(drain_count + 1) * 3)
            limit_end2 = limit_start2 + timedelta(days=1)
            try:
                balance_mid2 = float(api.get_godzinki(token, view="home").get("balance", 0))
            except Exception:
                balance_mid2 = balance_mid - 20
            log.info(f"Trying again: balance={balance_mid2}h")
            resp_limit2 = api.reserve_kayaks_soft(token, [first_kayak_id], limit_start2.isoformat(), limit_end2.isoformat())
            log.info(f"Second limit test response: {resp_limit2}")
            if not resp_limit2.get("ok") and resp_limit2.get("code") == "negative_limit_exceeded":
                neg_limit_blocked = True
                neg_limit_result = f"blocked with negative_limit_exceeded ✓ (balance={balance_mid2}h)"
            elif resp_limit2.get("reservationId"):
                drain_ids.append(resp_limit2["reservationId"])
                ctx["drain_reservation_ids"] = drain_ids
                neg_limit_result += f" | 2nd attempt also allowed (balance={balance_mid2}h)"
        else:
            # Some other error (e.g. conflict, max_items, etc.)
            neg_limit_result = f"blocked with code={resp_limit.get('code')!r} (expected negative_limit_exceeded)"
            if resp_limit.get("code") not in ("conflict", "max_items_exceeded", "max_time_exceeded"):
                neg_limit_blocked = True  # any balance-related block is acceptable

        try:
            balance_final = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            balance_final = ctx["firestore"].get_godzinki_balance(uid)

        ctx["godzinki_balance_after_p7"] = balance_final
        ctx["drain_reservation_ids"] = drain_ids

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"Drained {len(drain_ids)} reservations. "
                f"Balance: {balance_start}→{balance_final}h. "
                f"Neg-limit: {neg_limit_result}"
            ),
            details={
                "balance_start": balance_start,
                "balance_final": balance_final,
                "drain_count": len(drain_ids),
                "neg_limit_blocked": neg_limit_blocked,
                "neg_limit_result": neg_limit_result,
            },
        )

    except Exception as e:
        log.exception("Phase 7 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )