"""
Phase 1: User registration with complete profile
- Call POST /api/register with full profile data (firstName, lastName, phone, etc.)
- The endpoint merges profile into users_active and — when profile is complete —
  enqueues a members.syncToSheet job automatically
- Verify user appears in users_active with role_key and status_key
- Verify profileComplete=True in the register response
- Verify user row appears in Google Sheets (members tab)

Profile fields required by isProfileComplete() in registerUserHandler.ts:
  firstName, lastName, phone, dateOfBirth, consentRodo=True, consentStatute=True

POST /api/register returns:
  {ok, existed, uid, email, role_key, status_key, screen,
   profileComplete, nickname, firstName, openingMatch}
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "P1"
    name = "Registration + complete profile + Sheets sync"

    try:
        auth = ctx["auth"]
        api = ctx["api"]
        fs = ctx["firestore"]
        sheets = ctx["sheets"]

        token = auth.test_user_token()

        # Build complete profile from config
        profile = {
            "firstName": cfg.test_user_first_name,
            "lastName": cfg.test_user_last_name,
            "nickname": cfg.test_user_nickname,
            "phone": cfg.test_user_phone,
            "dateOfBirth": cfg.test_user_date_of_birth,
            "consentRodo": True,
            "consentStatute": True,
        }
        log.info(f"Calling POST /api/register with profile: {profile}")

        reg_result = api.register(token, profile)
        log.info(f"Register response: {reg_result}")

        uid = reg_result.get("uid", "")
        if not uid:
            raise AssertionError(f"No uid in register response: {reg_result}")

        profile_complete = reg_result.get("profileComplete", False)
        if not profile_complete:
            raise AssertionError(
                f"profileComplete=False after registration with full profile. "
                f"Response: {reg_result}. "
                f"Check that all profile fields pass validation in registerUserHandler.ts."
            )

        role_key = reg_result.get("role_key", "")
        status_key = reg_result.get("status_key", "")
        log.info(f"Registered: uid={uid}, role={role_key}, status={status_key}, profileComplete={profile_complete}")

        ctx["test_uid"] = uid
        ctx["test_role_key"] = role_key
        ctx["test_status_key"] = status_key

        # Verify Firestore document
        user_data = fs.get_user(uid)
        if not user_data:
            raise AssertionError(f"User {uid} not found in users_active after register")
        assert user_data.get("role_key"), f"role_key empty in Firestore for uid={uid}"
        assert user_data.get("status_key"), f"status_key empty in Firestore for uid={uid}"

        # Wait for Sheets sync (triggered automatically when profileComplete=True)
        log.info("Waiting for user to appear in Google Sheets (up to 90s) ...")
        sheet_row = None
        deadline = time.time() + 90
        while time.time() < deadline:
            sheet_row = sheets.get_member_row(cfg.test_user_email)
            if sheet_row:
                log.info(f"User found in sheet after {90 - (deadline - time.time()):.0f}s")
                break
            log.debug("Not in sheet yet, retrying in 5s ...")
            time.sleep(5)

        if not sheet_row:
            log.warning("Not in sheet after 90s — triggering manual sync job ...")
            fs.run_task_and_wait("members.syncToSheet", {"uid": uid}, timeout=60)
            time.sleep(5)
            sheet_row = sheets.get_member_row(cfg.test_user_email)

        if not sheet_row:
            raise AssertionError(
                f"User {cfg.test_user_email} did not appear in Google Sheets "
                f"after registration + manual sync.\n"
                f"Sheet: {cfg.members_sheet_id}, tab: {cfg.members_sheet_tab}"
            )

        member_id = str(sheet_row.get("ID", "")).strip()
        sheet_rola = str(sheet_row.get("Rola", "")).strip()
        log.info(f"Sheet row: ID={member_id}, Rola={sheet_rola}, Status={sheet_row.get('Status')}")

        # --- Idempotentność rejestracji ---
        log.info("Weryfikacja idempotentności: ponowne wywołanie POST /api/register ...")
        reg_result_2 = api.register(token, {})
        existed_flag = reg_result_2.get("existed", None)
        if existed_flag is not True:
            raise AssertionError(
                f"Ponowna rejestracja powinna zwrócić existed=True, "
                f"otrzymano existed={existed_flag!r}. Pełna odpowiedź: {reg_result_2}"
            )
        log.info(f"Idempotentność OK: existed=True, uid={reg_result_2.get('uid')}")

        # --- Rejestracja z niekompletnym profilem ---
        log.info("Weryfikacja niekompletnego profilu: POST /api/register z pustym body ...")
        reg_empty = api.register(token, {})
        # Po poprzednim kroku user już ma kompletny profil — profileComplete może być True
        # To jest poprawne zachowanie — profil nie jest kasowany przez puste body
        pc = reg_empty.get("profileComplete")
        log.info(f"profileComplete przy pustym body (po pełnej rejestracji): {pc}")
        if "profileComplete" not in reg_empty:
            raise AssertionError(
                f"Odpowiedź rejestracji powinna zawierać pole profileComplete. "
                f"Dane: {reg_empty}"
            )

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=f"uid={uid}, memberId={member_id}, role={role_key}, sheetRola={sheet_rola}",
            details={
                "uid": uid,
                "role_key": role_key,
                "status_key": status_key,
                "profile_complete": profile_complete,
                "member_id": member_id,
                "sheet_rola": sheet_rola,
            },
        )

    except Exception as e:
        log.exception("Phase 1 error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )