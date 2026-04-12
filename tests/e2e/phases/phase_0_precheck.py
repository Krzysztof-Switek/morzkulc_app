"""
Phase 0: Pre-flight checks
- Validate config (required env vars, credentials files)
- Verify Firebase project reachability (sign-in REST endpoint)
- Verify Google Sheets access
- Verify Firestore access
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig, validate_config

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P0"
    name = "Pre-flight checks"

    try:
        errors = validate_config(cfg)
        if errors:
            return PhaseResult(
                phase_id=phase_id, name=name, status="fail",
                duration_s=time.time() - t0,
                message="Config validation failed",
                error="\n".join(errors),
            )

        # Check Firebase auth (sign in as test user)
        auth = ctx["auth"]
        token = auth.test_user_token()
        assert token and len(token) > 100, "ID token looks invalid"
        log.info(f"Firebase auth OK for {cfg.test_user_email}")

        # Check admin auth
        admin_token = auth.admin_user_token()
        assert admin_token and len(admin_token) > 100, "Admin ID token looks invalid"
        log.info(f"Firebase auth OK for {cfg.admin_user_email}")

        # Check Firestore access
        fs = ctx["firestore"]
        result = fs.get_user_by_email(cfg.test_user_email)
        log.info(f"Firestore access OK (user found: {result is not None})")

        # Check Sheets access
        sheets = ctx["sheets"]
        records = sheets.get_all_records()
        log.info(f"Sheets access OK — {len(records)} rows in '{cfg.members_sheet_tab}'")

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=f"All pre-checks passed. Sheet has {len(records)} rows.",
            details={"sheet_rows": len(records)},
        )

    except Exception as e:
        log.exception("Phase 0 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )