"""
Phase 8: Verify Sheets ↔ Firestore bidirectional sync consistency
- After Phase 2 role change, verify the sheet row reflects the correct role label
- Manually trigger members.syncToSheet and verify the sheet is updated
- Verify the memberId in Firestore matches the ID column in the sheet
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)

EXPECTED_ROLE_LABEL = "Członek"
EXPECTED_STATUS_LABEL = "Aktywny"


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P8"
    name = "Sheets ↔ Firestore sync consistency"

    try:
        uid = ctx.get("test_uid")
        if not uid:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid in context",
            )

        fs = ctx["firestore"]
        sheets = ctx["sheets"]

        # Step 1: Trigger fresh sync to sheet
        log.info(f"Triggering members.syncToSheet for uid={uid} ...")
        job = fs.run_task_and_wait(
            "members.syncToSheet",
            {"uid": uid},
            timeout=60,
        )
        log.info(f"Sync task result: {job.get('result')}")

        # Step 2: Read sheet row
        time.sleep(3)
        sheet_row = sheets.get_member_row(cfg.test_user_email)
        if not sheet_row:
            raise AssertionError(
                f"User {cfg.test_user_email} not found in sheet after sync"
            )

        log.info(f"Sheet row: {sheet_row}")

        # Step 3: Verify role and status labels
        actual_role = str(sheet_row.get("Rola", "")).strip()
        actual_status = str(sheet_row.get("Status", "")).strip()

        role_ok = actual_role.lower() == EXPECTED_ROLE_LABEL.lower()
        status_ok = actual_status.lower() == EXPECTED_STATUS_LABEL.lower()

        if not role_ok:
            raise AssertionError(
                f"Sheet Rola mismatch: expected={EXPECTED_ROLE_LABEL!r}, actual={actual_role!r}"
            )
        if not status_ok:
            raise AssertionError(
                f"Sheet Status mismatch: expected={EXPECTED_STATUS_LABEL!r}, actual={actual_status!r}"
            )

        # Step 4: Verify memberId consistency
        user_data = fs.get_user(uid)
        firestore_member_id = user_data.get("memberId") if user_data else None
        sheet_id = str(sheet_row.get("ID", "")).strip()

        if firestore_member_id and sheet_id:
            if str(firestore_member_id) != sheet_id:
                raise AssertionError(
                    f"MemberId mismatch: Firestore={firestore_member_id}, Sheet={sheet_id}"
                )
            log.info(f"MemberId consistent: {firestore_member_id} ✓")
        else:
            log.warning(f"Could not verify memberId: Firestore={firestore_member_id}, Sheet={sheet_id!r}")

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"Sheet row verified: Rola={actual_role}, Status={actual_status}, ID={sheet_id}. "
                f"Firestore memberId={firestore_member_id}."
            ),
            details={
                "uid": uid,
                "sheet_id": sheet_id,
                "firestore_member_id": str(firestore_member_id),
                "sheet_rola": actual_role,
                "sheet_status": actual_status,
            },
        )

    except Exception as e:
        log.exception("Phase 8 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )