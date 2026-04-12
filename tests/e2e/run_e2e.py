"""
Main E2E test runner for SKK Morzkulc.

Usage:
  # Run on PROD (default):
  python run_e2e.py

  # Run on DEV:
  ENV=dev python run_e2e.py

  # Skip specific phases:
  SKIP_PHASES=P3,P7 python run_e2e.py

  # Stop on first failure:
  FAIL_FAST=1 python run_e2e.py

Prerequisites:
  1. pip install -r requirements.txt
  2. playwright install chromium
  3. cp .env.test.template .env.test && edytuj .env.test (emaile, hasła)

  4. Firestore — ADC z cloud-platform (bez SA key):
       gcloud auth application-default login \
         --scopes=https://www.googleapis.com/auth/cloud-platform
     Konto potrzebuje roles/datastore.user lub roles/firebase.admin.

  5. Google Sheets — OAuth Client ID (Desktop App, NIE SA key):
       a) GCP Console → APIs & Services → Credentials
          → Create Credentials → OAuth client ID → Desktop application
       b) Download JSON → zapisz jako tests/e2e/oauth_client.json
       c) Przy 1. uruchomieniu otworzy się przeglądarka (zgoda OAuth).
          Token zostanie zapisany w ~/.config/morzkulc_e2e/sheets_token.json
     Konto potrzebuje dostępu edytora do arkusza członków.
"""
import sys
import os
import logging
import time

# Auto-load .env.test if present
try:
    from dotenv import load_dotenv
    env_file = os.path.join(os.path.dirname(__file__), ".env.test")
    if os.path.isfile(env_file):
        load_dotenv(env_file)
        print(f"[env] Loaded {env_file}")
except ImportError:
    pass

# Must be after dotenv load so ENV var is set
from config import ACTIVE as cfg, validate_config

# Helpers
from helpers.firebase_auth import FirebaseAuthHelper
from helpers.firestore_helper import FirestoreHelper
from helpers.sheets_helper import SheetsHelper
from helpers.api_helper import ApiHelper
from helpers.reporter import TestReporter, PhaseResult

# Phases
from phases import (
    phase_0_precheck,
    phase_1_registration,
    phase_A_suspended_user,
    phase_B_module_visibility,
    phase_2_role_change_via_sheet,
    phase_3_godzinki_grant,
    phase_4_first_reservation,
    phase_5_limit_errors,
    phase_6_cancel_reservation,
    phase_7_balance_drain,
    phase_8_sheet_sync_after_role,
    phase_9_cleanup,
)

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("e2e")

# ---------------------------------------------------------------------------
# Phase registry (in order)
# ---------------------------------------------------------------------------
PHASES = [
    ("P0", "Pre-flight checks",                            phase_0_precheck.run),
    ("P1", "Registration + Sheets sync",                   phase_1_registration.run),
    ("PA", "Suspended/Deleted user access blocking",       phase_A_suspended_user.run),
    ("PB", "Module visibility per role",                   phase_B_module_visibility.run),
    ("P2", "Role change via Sheets → Firestore",           phase_2_role_change_via_sheet.run),
    ("P3", "Grant godzinki (GAP-02)",                      phase_3_godzinki_grant.run),
    ("P4", "First reservation",                            phase_4_first_reservation.run),
    ("P5", "Limit errors",                                 phase_5_limit_errors.run),
    ("P6", "Cancel reservation",                           phase_6_cancel_reservation.run),
    ("P7", "Balance drain",                                phase_7_balance_drain.run),
    ("P8", "Sheets ↔ Firestore consistency",               phase_8_sheet_sync_after_role.run),
    ("P9", "Cleanup",                                      phase_9_cleanup.run),
]


def main():
    print(f"\n{'='*60}")
    print(f"  SKK Morzkulc E2E Tests — [{cfg.name.upper()}]")
    print(f"  App: {cfg.app_base_url}")
    print(f"  Project: {cfg.firebase_project_id}")
    print(f"{'='*60}\n")

    # Parse options
    skip_phases = set(s.strip() for s in os.environ.get("SKIP_PHASES", "").split(",") if s.strip())
    fail_fast = os.environ.get("FAIL_FAST", "").strip() in ("1", "true", "yes")

    if skip_phases:
        log.info(f"Skipping phases: {skip_phases}")

    # Validate config
    errors = validate_config(cfg)
    if errors:
        print("\n[FATAL] Config validation failed:")
        for e in errors:
            print(f"  - {e}")
        print(f"\nCopy .env.test.template to .env.test and fill in all required values.")
        sys.exit(1)

    # Initialize shared helpers
    auth = FirebaseAuthHelper(cfg)
    fs = FirestoreHelper(cfg)
    sheets = SheetsHelper(cfg)
    api = ApiHelper(cfg)
    reporter = TestReporter(env_name=cfg.name, output_dir="./reports")

    # Shared context passed between phases
    ctx = {
        "auth": auth,
        "firestore": fs,
        "sheets": sheets,
        "api": api,
        # Phase results populate these:
        "test_uid": None,
        "test_user_data": None,
        "test_role_key": None,
        "test_status_key": None,
        "first_kayak": None,
        "reservation_1_id": None,
        "reservation_1_kayak_id": None,
        "extra_reservation_ids": [],
        "drain_reservation_ids": [],
        "initial_godzinki_balance": 0.0,
    }

    # Run phases
    any_failed = False
    for phase_id, phase_name, phase_fn in PHASES:
        if phase_id in skip_phases:
            result = PhaseResult(
                phase_id=phase_id, name=phase_name, status="skip",
                message=f"Skipped via SKIP_PHASES={skip_phases}",
            )
            reporter.record(result)
            continue

        log.info(f"\n--- Running {phase_id}: {phase_name} ---")
        try:
            result = phase_fn(cfg, ctx)
        except Exception as e:
            log.exception(f"Unhandled exception in {phase_id}")
            result = PhaseResult(
                phase_id=phase_id, name=phase_name, status="error",
                error=str(e),
            )

        reporter.record(result)

        if result.status in ("fail", "error"):
            any_failed = True
            if fail_fast:
                log.warning(f"FAIL_FAST enabled — stopping after {phase_id}")
                break

    # Report
    reporter.print_summary()
    json_path, md_path = reporter.save()
    print(f"\nReports: {json_path}\n         {md_path}\n")

    sys.exit(1 if any_failed else 0)


if __name__ == "__main__":
    main()