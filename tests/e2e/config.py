"""
Environment-aware configuration for E2E tests.
Select environment via ENV variable: ENV=dev or ENV=prod (default: prod)

Authentication:
  - Firestore: gcloud auth application-default login --scopes=cloud-platform
  - Sheets: google-auth-oauthlib InstalledAppFlow (oauth_client.json, Desktop App)
"""
import os
from dataclasses import dataclass


@dataclass
class EnvConfig:
    name: str
    firebase_project_id: str
    firebase_api_key: str
    app_base_url: str
    # Google Sheets
    members_sheet_id: str
    members_sheet_tab: str
    # Test user credentials (email/password account in Firebase Auth)
    test_user_email: str
    test_user_password: str
    # Test user profile data — must be complete for Sheets sync to trigger
    test_user_first_name: str
    test_user_last_name: str
    test_user_nickname: str
    test_user_phone: str
    test_user_date_of_birth: str  # YYYY-MM-DD, must be in the past
    # Admin user credentials (rola_zarzad, for triggering service tasks via Firestore)
    admin_user_email: str
    admin_user_password: str
    # Konta testowe — użytkownicy z blokadą dostępu (status_zawieszony / status_skreslony)
    suspended_user_email: str = ""
    suspended_user_password: str = ""
    deleted_user_email: str = ""
    deleted_user_password: str = ""
    # Konto testowe — nowy użytkownik spoza BO26 (powinien dostać rola_sympatyk)
    new_user_email: str = ""
    new_user_password: str = ""
    new_user_first_name: str = "Nowy"
    new_user_last_name: str = "Testowy"
    new_user_phone: str = ""
    new_user_date_of_birth: str = ""
    # -----------------------------------------------------------------------
    # Konta testowe audytu sprzętu (gear audit accounts)
    # -----------------------------------------------------------------------
    # Członek z godzinkami (3 zatwierdzone pule FIFO)
    member_user_email: str = ""
    member_user_password: str = ""
    # Kandydat (max 1 kajak, 1 tydzień)
    candidate_user_email: str = ""
    candidate_user_password: str = ""
    # Zarząd (boardDoesNotPay test)
    board_user_email: str = ""
    board_user_password: str = ""
    # KR
    kr_user_email: str = ""
    kr_user_password: str = ""
    # Sympatyk (nie może rezerwować)
    sympatyk_user_email: str = ""
    sympatyk_user_password: str = ""
    # Graniczny (saldo ustawiane przez test fixture)
    boundary_user_email: str = ""
    boundary_user_password: str = ""
    # -----------------------------------------------------------------------
    # IDs sprzętu testowego
    # -----------------------------------------------------------------------
    test_kayak_id_1: str = ""
    test_kayak_id_2: str = ""
    test_kayak_id_3: str = ""
    test_kayak_basen_id: str = ""   # kajak przypisany do basenu
    test_paddle_id: str = ""
    test_lifejacket_id: str = ""
    test_helmet_id: str = ""
    # Timeouts
    job_poll_timeout_seconds: int = 60
    job_poll_interval_seconds: int = 2
    playwright_timeout_ms: int = 15000


# ---------------------------------------------------------------------------
# DEV environment
# ---------------------------------------------------------------------------
DEV = EnvConfig(
    name="dev",
    firebase_project_id="sprzet-skk-morzkulc",
    firebase_api_key=os.environ.get("DEV_FIREBASE_API_KEY", "AIzaSyCzWcAgskiyp1AyibbiPLeAfCUfr7e3gtg"),
    app_base_url=os.environ.get("DEV_APP_URL", "https://sprzet-skk-morzkulc.web.app"),
    members_sheet_id=os.environ.get("DEV_MEMBERS_SHEET_ID", "1pw_hvxvtk_pX7BRcWatNChoAa4u6FmCZqKFMvJdhjFE"),
    members_sheet_tab=os.environ.get("DEV_MEMBERS_SHEET_TAB", "członkowie i sympatycy"),
    test_user_email=os.environ.get("DEV_TEST_USER_EMAIL", ""),
    test_user_password=os.environ.get("DEV_TEST_USER_PASSWORD", ""),
    test_user_first_name=os.environ.get("DEV_TEST_FIRST_NAME", "Jan"),
    test_user_last_name=os.environ.get("DEV_TEST_LAST_NAME", "Testowy"),
    test_user_nickname=os.environ.get("DEV_TEST_NICKNAME", "Janek"),
    test_user_phone=os.environ.get("DEV_TEST_PHONE", "+48500100200"),
    test_user_date_of_birth=os.environ.get("DEV_TEST_DOB", "1990-06-15"),
    admin_user_email=os.environ.get("DEV_ADMIN_USER_EMAIL", ""),
    admin_user_password=os.environ.get("DEV_ADMIN_USER_PASSWORD", ""),
    suspended_user_email=os.environ.get("DEV_SUSPENDED_USER_EMAIL", ""),
    suspended_user_password=os.environ.get("DEV_SUSPENDED_USER_PASSWORD", ""),
    deleted_user_email=os.environ.get("DEV_DELETED_USER_EMAIL", ""),
    deleted_user_password=os.environ.get("DEV_DELETED_USER_PASSWORD", ""),
    new_user_email=os.environ.get("DEV_NEW_USER_EMAIL", ""),
    new_user_password=os.environ.get("DEV_NEW_USER_PASSWORD", ""),
    new_user_first_name=os.environ.get("DEV_NEW_USER_FIRST_NAME", "Nowy"),
    new_user_last_name=os.environ.get("DEV_NEW_USER_LAST_NAME", "Testowy"),
    new_user_phone=os.environ.get("DEV_NEW_USER_PHONE", ""),
    new_user_date_of_birth=os.environ.get("DEV_NEW_USER_DOB", ""),
    member_user_email=os.environ.get("DEV_TEST_MEMBER_EMAIL", ""),
    member_user_password=os.environ.get("DEV_TEST_MEMBER_PASSWORD", ""),
    candidate_user_email=os.environ.get("DEV_TEST_CANDIDATE_EMAIL", ""),
    candidate_user_password=os.environ.get("DEV_TEST_CANDIDATE_PASSWORD", ""),
    board_user_email=os.environ.get("DEV_TEST_BOARD_EMAIL", ""),
    board_user_password=os.environ.get("DEV_TEST_BOARD_PASSWORD", ""),
    kr_user_email=os.environ.get("DEV_TEST_KR_EMAIL", ""),
    kr_user_password=os.environ.get("DEV_TEST_KR_PASSWORD", ""),
    sympatyk_user_email=os.environ.get("DEV_TEST_SYMPATYK_EMAIL", ""),
    sympatyk_user_password=os.environ.get("DEV_TEST_SYMPATYK_PASSWORD", ""),
    boundary_user_email=os.environ.get("DEV_TEST_BOUNDARY_EMAIL", ""),
    boundary_user_password=os.environ.get("DEV_TEST_BOUNDARY_PASSWORD", ""),
    test_kayak_id_1=os.environ.get("DEV_TEST_KAYAK_ID_1", ""),
    test_kayak_id_2=os.environ.get("DEV_TEST_KAYAK_ID_2", ""),
    test_kayak_id_3=os.environ.get("DEV_TEST_KAYAK_ID_3", ""),
    test_kayak_basen_id=os.environ.get("DEV_TEST_KAYAK_BASEN_ID", ""),
    test_paddle_id=os.environ.get("DEV_TEST_PADDLE_ID", ""),
    test_lifejacket_id=os.environ.get("DEV_TEST_LIFEJACKET_ID", ""),
    test_helmet_id=os.environ.get("DEV_TEST_HELMET_ID", ""),
)

# ---------------------------------------------------------------------------
# PROD environment
# ---------------------------------------------------------------------------
PROD = EnvConfig(
    name="prod",
    firebase_project_id="morzkulc-e9df7",
    firebase_api_key=os.environ.get("PROD_FIREBASE_API_KEY", "AIzaSyDp8Gyd45RkSS6cdJ32oczHGe6Fb9RrWeo"),
    app_base_url=os.environ.get("PROD_APP_URL", "https://morzkulc-e9df7.web.app"),
    members_sheet_id=os.environ.get("PROD_MEMBERS_SHEET_ID", "1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM"),
    members_sheet_tab=os.environ.get("PROD_MEMBERS_SHEET_TAB", "członkowie i sympatycy"),
    test_user_email=os.environ.get("PROD_TEST_USER_EMAIL", ""),
    test_user_password=os.environ.get("PROD_TEST_USER_PASSWORD", ""),
    test_user_first_name=os.environ.get("PROD_TEST_FIRST_NAME", "Jan"),
    test_user_last_name=os.environ.get("PROD_TEST_LAST_NAME", "Testowy"),
    test_user_nickname=os.environ.get("PROD_TEST_NICKNAME", "Janek"),
    test_user_phone=os.environ.get("PROD_TEST_PHONE", "+48500100200"),
    test_user_date_of_birth=os.environ.get("PROD_TEST_DOB", "1990-06-15"),
    admin_user_email=os.environ.get("PROD_ADMIN_USER_EMAIL", ""),
    admin_user_password=os.environ.get("PROD_ADMIN_USER_PASSWORD", ""),
    suspended_user_email=os.environ.get("PROD_SUSPENDED_USER_EMAIL", ""),
    suspended_user_password=os.environ.get("PROD_SUSPENDED_USER_PASSWORD", ""),
    deleted_user_email=os.environ.get("PROD_DELETED_USER_EMAIL", ""),
    deleted_user_password=os.environ.get("PROD_DELETED_USER_PASSWORD", ""),
    new_user_email=os.environ.get("PROD_NEW_USER_EMAIL", ""),
    new_user_password=os.environ.get("PROD_NEW_USER_PASSWORD", ""),
    new_user_first_name=os.environ.get("PROD_NEW_USER_FIRST_NAME", "Nowy"),
    new_user_last_name=os.environ.get("PROD_NEW_USER_LAST_NAME", "Testowy"),
    new_user_phone=os.environ.get("PROD_NEW_USER_PHONE", ""),
    new_user_date_of_birth=os.environ.get("PROD_NEW_USER_DOB", ""),
    member_user_email=os.environ.get("PROD_TEST_MEMBER_EMAIL", ""),
    member_user_password=os.environ.get("PROD_TEST_MEMBER_PASSWORD", ""),
    candidate_user_email=os.environ.get("PROD_TEST_CANDIDATE_EMAIL", ""),
    candidate_user_password=os.environ.get("PROD_TEST_CANDIDATE_PASSWORD", ""),
    board_user_email=os.environ.get("PROD_TEST_BOARD_EMAIL", ""),
    board_user_password=os.environ.get("PROD_TEST_BOARD_PASSWORD", ""),
    kr_user_email=os.environ.get("PROD_TEST_KR_EMAIL", ""),
    kr_user_password=os.environ.get("PROD_TEST_KR_PASSWORD", ""),
    sympatyk_user_email=os.environ.get("PROD_TEST_SYMPATYK_EMAIL", ""),
    sympatyk_user_password=os.environ.get("PROD_TEST_SYMPATYK_PASSWORD", ""),
    boundary_user_email=os.environ.get("PROD_TEST_BOUNDARY_EMAIL", ""),
    boundary_user_password=os.environ.get("PROD_TEST_BOUNDARY_PASSWORD", ""),
    test_kayak_id_1=os.environ.get("PROD_TEST_KAYAK_ID_1", ""),
    test_kayak_id_2=os.environ.get("PROD_TEST_KAYAK_ID_2", ""),
    test_kayak_id_3=os.environ.get("PROD_TEST_KAYAK_ID_3", ""),
    test_kayak_basen_id=os.environ.get("PROD_TEST_KAYAK_BASEN_ID", ""),
    test_paddle_id=os.environ.get("PROD_TEST_PADDLE_ID", ""),
    test_lifejacket_id=os.environ.get("PROD_TEST_LIFEJACKET_ID", ""),
    test_helmet_id=os.environ.get("PROD_TEST_HELMET_ID", ""),
)

# ---------------------------------------------------------------------------
# Active environment selection
# ---------------------------------------------------------------------------
_ENV_NAME = os.environ.get("ENV", "prod").strip().lower()
if _ENV_NAME not in ("dev", "prod"):
    raise ValueError(f"ENV must be 'dev' or 'prod', got: {_ENV_NAME!r}")

ACTIVE: EnvConfig = DEV if _ENV_NAME == "dev" else PROD


def validate_config(cfg: EnvConfig) -> list[str]:
    """Return list of validation errors (empty = OK)."""
    errors = []
    if not cfg.test_user_email:
        errors.append(f"[{cfg.name.upper()}] test_user_email not set")
    if not cfg.test_user_password:
        errors.append(f"[{cfg.name.upper()}] test_user_password not set")
    if not cfg.admin_user_email:
        errors.append(f"[{cfg.name.upper()}] admin_user_email not set")
    if not cfg.admin_user_password:
        errors.append(f"[{cfg.name.upper()}] admin_user_password not set")
    if not cfg.test_user_first_name or not cfg.test_user_last_name:
        errors.append(f"[{cfg.name.upper()}] test_user_first_name / last_name not set")
    if not cfg.test_user_phone:
        errors.append(f"[{cfg.name.upper()}] test_user_phone not set")
    if not cfg.test_user_date_of_birth:
        errors.append(f"[{cfg.name.upper()}] test_user_date_of_birth not set (YYYY-MM-DD)")
    return errors