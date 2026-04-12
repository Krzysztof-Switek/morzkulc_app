"""
Phase 2: Role change via Google Sheets → sync → verify in Firestore
- Change 'Rola' in the members sheet to 'Członek' (rola_czlonek)
- Change 'Status' to 'Aktywny' (status_aktywny)
- Trigger users.syncRolesFromSheet task via Firestore service_jobs
- Verify user's role_key updated in Firestore
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)

# Sekwencja zmian ról do przetestowania: (label_w_arkuszu, oczekiwany_role_key)
# Każda para musi odpowiadać etykiecie skonfigurowanej w setup/app.roleMappings.
# Ostatnia pozycja powinna przywracać rolę potrzebną dla kolejnych faz (rola_czlonek).
ROLE_CHANGE_SEQUENCE = [
    ("Kandydat", "rola_kandydat"),  # pośrednia zmiana — weryfikuje drugi mapping
    ("Członek",  "rola_czlonek"),   # finalna zmiana — wymagana dla P3+
]
TARGET_STATUS_LABEL = "Aktywny"
EXPECTED_STATUS_KEY = "status_aktywny"
# Ostateczna oczekiwana rola (musi zgadzać się z ostatnim elementem ROLE_CHANGE_SEQUENCE)
EXPECTED_ROLE_KEY = "rola_czlonek"


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P2"
    name = "Role change via Sheets → sync → Firestore"

    try:
        uid = ctx.get("test_uid")
        if not uid:
            return PhaseResult(
                phase_id=phase_id, name=name, status="skip",
                duration_s=time.time() - t0,
                message="No test_uid in context (Phase 1 skipped or failed)",
            )

        sheets = ctx["sheets"]
        fs = ctx["firestore"]

        # Wykonaj sekwencję zmian ról
        for step_idx, (role_label, expected_role_key) in enumerate(ROLE_CHANGE_SEQUENCE, start=1):
            log.info(
                f"Step {step_idx}/{len(ROLE_CHANGE_SEQUENCE)}: "
                f"Updating sheet → Rola={role_label!r}, Status={TARGET_STATUS_LABEL!r}"
            )
            updated = sheets.update_member_role_and_status(
                cfg.test_user_email,
                new_role_label=role_label,
                new_status_label=TARGET_STATUS_LABEL,
            )
            if not updated:
                raise AssertionError(
                    f"Could not find {cfg.test_user_email} in sheet to update role "
                    f"(step {step_idx}: {role_label!r}). "
                    "Ensure Phase 1 passed and the user is in the sheet."
                )

            log.info(f"Sheet updated. Triggering users.syncRolesFromSheet task (step {step_idx}) ...")
            job = fs.run_task_and_wait(
                "users.syncRolesFromSheet",
                {},
                timeout=120,
            )
            log.info(f"Sync task result (step {step_idx}): {job.get('result')}")

            time.sleep(2)  # brief settle
            role_key, status_key = fs.get_user_role_and_status(uid)
            log.info(f"After sync (step {step_idx}): role_key={role_key}, status_key={status_key}")

            if role_key != expected_role_key:
                raise AssertionError(
                    f"Step {step_idx} ({role_label!r}): "
                    f"role_key mismatch: expected={expected_role_key!r}, actual={role_key!r}. "
                    f"Sprawdź czy etykieta {role_label!r} jest skonfigurowana w setup/app.roleMappings."
                )
            if status_key != EXPECTED_STATUS_KEY:
                raise AssertionError(
                    f"Step {step_idx}: status_key mismatch: "
                    f"expected={EXPECTED_STATUS_KEY!r}, actual={status_key!r}"
                )
            log.info(f"Step {step_idx} OK: {role_label!r} → {expected_role_key}")

        ctx["test_role_key"] = role_key
        ctx["test_status_key"] = status_key

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"Przetestowano {len(ROLE_CHANGE_SEQUENCE)} zmian ról. "
                f"Finalna rola: {EXPECTED_ROLE_KEY} / {EXPECTED_STATUS_KEY}"
            ),
            details={
                "uid": uid,
                "role_key": role_key,
                "status_key": status_key,
                "steps_tested": len(ROLE_CHANGE_SEQUENCE),
                "sequence": [r for r, _ in ROLE_CHANGE_SEQUENCE],
            },
        )

    except Exception as e:
        log.exception("Phase 2 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )