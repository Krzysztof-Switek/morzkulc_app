"""
Phase 9: Cleanup — cancel all active test reservations
Queries Firestore using "userUid" field (not "uid" — gear_reservations uses userUid).
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P9"
    name = "Cleanup (cancel all test reservations)"

    try:
        uid = ctx.get("test_uid")
        if not uid:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid — nothing to clean up",
            )

        auth = ctx["auth"]
        api = ctx["api"]
        fs = ctx["firestore"]
        token = auth.test_user_token()

        # Collect IDs from context
        all_ids: set[str] = set()
        for key in ("reservation_1_id", "extra_reservation_ids", "drain_reservation_ids"):
            val = ctx.get(key)
            if val:
                if isinstance(val, list):
                    all_ids.update(v for v in val if v)
                elif isinstance(val, str):
                    all_ids.add(val)

        # Also query Firestore for any remaining active reservations
        # gear_reservations uses "userUid" field
        user_reservations = fs.get_user_reservations(uid)
        for res in user_reservations:
            status = res.get("status", "")
            if status not in ("cancelled", "completed"):
                res_id = res.get("id", res.get("reservationId", ""))
                if res_id:
                    all_ids.add(res_id)

        log.info(f"Cancelling {len(all_ids)} reservations ...")

        cancelled = []
        failed = []

        for res_id in all_ids:
            # Check current status
            res_doc = fs.get_reservation(res_id)
            if res_doc and res_doc.get("status") in ("cancelled", "completed"):
                log.debug(f"{res_id}: already {res_doc.get('status')}, skipping")
                cancelled.append(res_id)
                continue

            resp = api.cancel_reservation_soft(token, res_id)
            if resp.get("ok"):
                cancelled.append(res_id)
                log.info(f"Cancelled: {res_id}")
            else:
                code = resp.get("code", "")
                if code in ("cancel_blocked", "invalid_state"):
                    # cancel_blocked = reservation starts today/tomorrow, can't cancel
                    # invalid_state = already cancelled
                    log.info(f"Skipped {res_id}: {code}")
                    cancelled.append(res_id)
                else:
                    log.warning(f"Failed to cancel {res_id}: {resp}")
                    failed.append({"id": res_id, "code": code, "msg": resp.get("message", "")})

        try:
            final_balance = float(api.get_godzinki(token, view="home").get("balance", 0))
        except Exception:
            final_balance = fs.get_godzinki_balance(uid)
        log.info(f"Final godzinki balance: {final_balance}h")

        status = "pass" if not failed else "fail"
        return PhaseResult(
            phase_id=phase_id, name=name, status=status,
            duration_s=time.time() - t0,
            message=f"Cancelled={len(cancelled)}, Failed={len(failed)}. Final balance: {final_balance}h",
            details={
                "cancelled": cancelled,
                "failed": failed,
                "final_balance_h": final_balance,
            },
            error=(str(failed) if failed else None),
        )

    except Exception as e:
        log.exception("Phase 9 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )