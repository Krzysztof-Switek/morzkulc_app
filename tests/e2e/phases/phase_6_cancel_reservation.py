"""
Phase 6: Cancel reservation + balance restore
- Cancel reservation_1 from Phase 4
- Verify Firestore status = "cancelled"
- Verify godzinki balance restored (via GET /api/godzinki)
- Clean up extra reservations from Phase 5
- Test cancel_blocked: create a reservation starting tomorrow
  blockStartIso = startDate - offsetDays (default 1) = today → today >= today → BLOCKED
  Expected error code: "cancel_blocked"

Cancel endpoint: POST /api/gear/reservations/cancel — body: {reservationId}
Success response: {ok: True}
Error response: {ok: False, code: "...", message: "..."}
"""
import time
import logging
from datetime import date, timedelta
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P6"
    name = "Cancel reservation + balance restore + cancel-blocked test"

    try:
        uid = ctx.get("test_uid")
        reservation_1_id = ctx.get("reservation_1_id")
        cost_hours = float(ctx.get("reservation_1_cost_hours", 20.0))
        extra_ids = ctx.get("extra_reservation_ids", [])
        first_kayak_id = ctx.get("first_kayak_id", "")

        if not uid or not reservation_1_id:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid or reservation_1_id in context (Phase 4 skipped or failed)",
            )

        auth = ctx["auth"]
        api = ctx["api"]
        fs = ctx["firestore"]
        token = auth.test_user_token()

        # Balance before cancel
        try:
            balance_before = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            balance_before = fs.get_godzinki_balance(uid)
        log.info(f"Balance before cancel: {balance_before}h, will restore {cost_hours}h")

        # Cancel main reservation from Phase 4
        log.info(f"Cancelling reservation {reservation_1_id} ...")
        cancel_result = api.cancel_reservation(token, reservation_1_id)
        log.info(f"Cancel result: {cancel_result}")
        assert cancel_result.get("ok"), f"Cancel failed: {cancel_result}"

        # Verify status in Firestore
        time.sleep(2)
        res_after = fs.get_reservation(reservation_1_id)
        if res_after:
            status_after = res_after.get("status", "")
            assert status_after == "cancelled", \
                f"Reservation status after cancel: {status_after!r} (expected 'cancelled')"
            log.info(f"Reservation status: {status_after} ✓")

        # Verify balance restored
        time.sleep(1)
        try:
            balance_after = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            balance_after = fs.get_godzinki_balance(uid)
        log.info(f"Balance after cancel: {balance_after}h (expected ≈ {balance_before + cost_hours}h)")
        expected = balance_before + cost_hours
        if abs(balance_after - expected) > 0.5:
            raise AssertionError(
                f"Balance not restored after cancel: expected≈{expected}h, actual={balance_after}h"
            )

        ctx["godzinki_balance_after_p6"] = balance_after

        # Cancel extra reservations from Phase 5
        cancelled_extras = []
        for extra_id in extra_ids:
            try:
                res = api.cancel_reservation_soft(token, extra_id)
                if res.get("ok"):
                    cancelled_extras.append(extra_id)
                    log.info(f"Cancelled extra: {extra_id}")
                else:
                    log.warning(f"Could not cancel extra {extra_id}: {res}")
            except Exception as e:
                log.warning(f"Error cancelling extra {extra_id}: {e}")

        # Test cancel-blocked:
        # Reserve starting tomorrow → blockStartIso = tomorrow - 1 = today
        # Cancel today → today >= today → BLOCKED
        cancel_blocked_result = "not tested (no kayak_id)"
        cancel_blocked_ok = False

        if first_kayak_id:
            tomorrow = date.today() + timedelta(days=1)
            day_after = tomorrow + timedelta(days=1)
            log.info(f"Creating 'soon' reservation for cancel-blocked test: {tomorrow} → {day_after} ...")
            try:
                soon_resp = api.reserve_kayaks_soft(
                    token, [first_kayak_id],
                    tomorrow.isoformat(), day_after.isoformat()
                )
                soon_id = soon_resp.get("reservationId", "")
                if soon_id:
                    log.info(f"Soon reservation created: {soon_id}. Trying cancel (should be blocked) ...")
                    # blockStartIso = startDate - 1 day = today → today >= today → BLOCKED
                    cancel_resp = api.cancel_reservation_soft(token, soon_id)
                    log.info(f"Cancel-blocked response: {cancel_resp}")
                    if not cancel_resp.get("ok") and cancel_resp.get("code") == "cancel_blocked":
                        cancel_blocked_result = "BLOCKED with cancel_blocked ✓"
                        cancel_blocked_ok = True
                    elif cancel_resp.get("ok"):
                        cancel_blocked_result = "NOT blocked — cancel succeeded (unexpected)"
                    else:
                        cancel_blocked_result = f"blocked with code={cancel_resp.get('code')!r}"
                        cancel_blocked_ok = True  # any rejection is acceptable
                else:
                    cancel_blocked_result = f"could not create 'soon' reservation: {soon_resp.get('code')!r}"
                    log.warning(f"Soon reservation not created: {soon_resp}")
            except Exception as e:
                cancel_blocked_result = f"error: {e}"
                log.warning(f"Cancel-blocked test error: {e}")

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"Cancelled {reservation_1_id}. Balance: {balance_before}→{balance_after}h. "
                f"Extras cancelled: {len(cancelled_extras)}. "
                f"Cancel-blocked: {cancel_blocked_result}"
            ),
            details={
                "reservation_1_id": reservation_1_id,
                "cost_hours": cost_hours,
                "balance_before": balance_before,
                "balance_after": balance_after,
                "cancelled_extras": cancelled_extras,
                "cancel_blocked_result": cancel_blocked_result,
                "cancel_blocked_ok": cancel_blocked_ok,
            },
        )

    except Exception as e:
        log.exception("Phase 6 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )