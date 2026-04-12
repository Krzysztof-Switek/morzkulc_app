"""
Phase 3: Grant godzinki (hours) to test user
GAP-02: No admin HTTP endpoint exists for granting hours directly.
We write to godzinki_ledger via Firestore Admin SDK with the correct structure
required by computeBalance() in godzinki_service.ts:
  - type: "earn", approved: True, remaining: amount, expiresAt: future timestamp

Grant 100h and verify via GET /api/godzinki that balance increased.
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)

GRANT_HOURS = 100.0


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P3"
    name = "Grant godzinki (GAP-02: direct Firestore write)"

    try:
        uid = ctx.get("test_uid")
        if not uid:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid in context (Phase 1 skipped or failed)",
            )

        fs = ctx["firestore"]
        api = ctx["api"]
        auth = ctx["auth"]
        token = auth.test_user_token()

        # Balance before grant (via API — authoritative)
        try:
            godzinki_resp = api.get_godzinki(token, view="home")
            balance_before = float(godzinki_resp.get("balance", 0))
            neg_limit = float(godzinki_resp.get("negativeBalanceLimit", 20))
        except Exception as e:
            log.warning(f"Could not read balance via API: {e} — using Firestore fallback")
            balance_before = fs.get_godzinki_balance(uid)
            neg_limit = 20.0

        log.info(f"Balance before grant: {balance_before}h, negativeBalanceLimit: {neg_limit}h")
        ctx["negative_balance_limit"] = neg_limit

        # Write earn record directly to godzinki_ledger
        ledger_id = fs.grant_godzinki(uid, GRANT_HOURS, note="e2e test initial grant")
        log.info(f"Granted {GRANT_HOURS}h, ledger doc: {ledger_id}")

        # Verify via API (balance should have increased)
        time.sleep(2)
        try:
            godzinki_after = api.get_godzinki(token, view="home")
            balance_after = float(godzinki_after.get("balance", 0))
        except Exception as e:
            log.warning(f"Could not verify balance via API: {e} — using Firestore")
            balance_after = fs.get_godzinki_balance(uid)

        log.info(f"Balance after grant: {balance_after}h")
        expected = balance_before + GRANT_HOURS
        if abs(balance_after - expected) > 0.5:
            raise AssertionError(
                f"Balance mismatch after grant: expected≈{expected}h, actual={balance_after}h. "
                f"Check that grant_godzinki() writes correct Firestore structure "
                f"(approved=True, remaining=amount, expiresAt in future)."
            )

        ctx["initial_godzinki_balance"] = balance_after

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"Granted {GRANT_HOURS}h. Balance: {balance_before}h → {balance_after}h. "
                f"negativeBalanceLimit={neg_limit}h. GAP-02: via direct Firestore write."
            ),
            details={
                "uid": uid,
                "granted_hours": GRANT_HOURS,
                "balance_before": balance_before,
                "balance_after": balance_after,
                "negative_balance_limit": neg_limit,
                "ledger_id": ledger_id,
            },
        )

    except Exception as e:
        log.exception("Phase 3 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )