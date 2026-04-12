"""
Google Sheets helper — read/write via gspread.

Auth strategy (split credentials — bez service account key):
  - Firestore używa ADC z zakresem cloud-platform (gcloud auth application-default login)
  - Sheets wymaga zakresów Drive/Sheets, których ADC nie obsługuje bez własnego OAuth Client ID
    → używamy google-auth-oauthlib InstalledAppFlow (user OAuth 2.0, Desktop app)

Setup (jednorazowy):
  1. GCP Console → APIs & Services → Credentials → Create Credentials → OAuth client ID
     Type: Desktop application, Name: "morzkulc-e2e" (dowolna)
  2. Download JSON → zapisz jako tests/e2e/oauth_client.json
  3. Przy pierwszym uruchomieniu otworzy się przeglądarka do zalogowania Google.
     Token zostaje zapisany w ~/.config/morzkulc_e2e/sheets_token.json
     Kolejne uruchomienia używają zapisanego tokenu (refresh automatyczny).

Uwaga: oauth_client.json to OAUTH CLIENT ID (Desktop App) — NIE service account key.
  - Nie daje dostępu serwerowego bez zgody użytkownika
  - Można go umieszczać w współdzielonych katalogach zespołu (ale nie commitować do git)
  - Twój gmail musi mieć dostęp edytora do arkusza członków
"""
import json
import logging
import os

import google.auth
import google.auth.transport.requests
import gspread
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from config import EnvConfig

log = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Domyślna lokalizacja OAuth client JSON (Desktop App)
DEFAULT_OAUTH_CLIENT_PATH = os.path.join(os.path.dirname(__file__), "..", "oauth_client.json")
# Gdzie przechowujemy zapisany token (poza repo, w home użytkownika)
DEFAULT_TOKEN_PATH = os.path.expanduser("~/.config/morzkulc_e2e/sheets_token.json")


def _get_sheets_creds(
    oauth_client_path: str = DEFAULT_OAUTH_CLIENT_PATH,
    token_path: str = DEFAULT_TOKEN_PATH,
) -> Credentials:
    """
    Zwraca credentials do Google Sheets przez user OAuth flow.
    Przy pierwszym uruchomieniu: otwiera przeglądarkę do logowania.
    Przy kolejnych: używa zapisanego refresh tokenu.
    """
    creds = None

    # Wczytaj zapisany token jeśli istnieje
    if os.path.isfile(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            log.debug(f"Loaded Sheets token from {token_path}")
        except Exception as e:
            log.warning(f"Could not load Sheets token from {token_path}: {e}")
            creds = None

    # Odśwież jeśli wygasł
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(google.auth.transport.requests.Request())
            log.debug("Sheets token refreshed")
            _save_token(creds, token_path)
        except Exception as e:
            log.warning(f"Token refresh failed: {e} — will re-authenticate")
            creds = None

    # Pełny flow OAuth jeśli brak tokenu lub refresh nie zadziałał
    if not creds or not creds.valid:
        if not os.path.isfile(oauth_client_path):
            raise FileNotFoundError(
                f"OAuth client JSON not found: {oauth_client_path}\n\n"
                "Jak uzyskać plik oauth_client.json:\n"
                "  1. GCP Console → APIs & Services → Credentials\n"
                "  2. Create Credentials → OAuth client ID → Desktop application\n"
                "  3. Download JSON → zapisz jako tests/e2e/oauth_client.json\n"
                "  4. Upewnij się że Twój gmail ma dostęp edytora do arkusza Google Sheets\n"
                "\nTo NIE jest service account key — to OAuth client dla użytkownika."
            )
        log.info("Opening browser for Google Sheets OAuth consent ...")
        flow = InstalledAppFlow.from_client_secrets_file(oauth_client_path, SCOPES)
        creds = flow.run_local_server(port=0, open_browser=True)
        _save_token(creds, token_path)
        log.info(f"Sheets token saved to {token_path}")

    return creds


def _save_token(creds: Credentials, token_path: str):
    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    with open(token_path, "w") as f:
        f.write(creds.to_json())


class SheetsHelper:
    def __init__(
        self,
        cfg: EnvConfig,
        oauth_client_path: str = DEFAULT_OAUTH_CLIENT_PATH,
        token_path: str = DEFAULT_TOKEN_PATH,
    ):
        self.cfg = cfg
        creds = _get_sheets_creds(oauth_client_path, token_path)
        self._gc = gspread.authorize(creds)
        self._sheet = self._gc.open_by_key(cfg.members_sheet_id)

    def _get_worksheet(self, tab_name: str | None = None) -> gspread.Worksheet:
        tab = tab_name or self.cfg.members_sheet_tab
        return self._sheet.worksheet(tab)

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_all_records(self, tab_name: str | None = None) -> list[dict]:
        ws = self._get_worksheet(tab_name)
        return ws.get_all_records()

    def find_row_by_email(self, email: str, tab_name: str | None = None) -> dict | None:
        """Find the first row where 'e-mail' column matches (case-insensitive)."""
        email = email.strip().lower()
        rows = self.get_all_records(tab_name)
        for row in rows:
            if str(row.get("e-mail", "")).strip().lower() == email:
                return row
        return None

    def get_member_row(self, email: str) -> dict | None:
        return self.find_row_by_email(email)

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    def update_member_role_and_status(
        self,
        email: str,
        new_role_label: str,
        new_status_label: str,
        tab_name: str | None = None,
    ) -> bool:
        """
        Update 'Rola' and 'Status' columns for the row matching email.
        Returns True if found and updated, False otherwise.
        """
        ws = self._get_worksheet(tab_name)
        all_values = ws.get_all_values()
        if not all_values:
            return False

        headers = [h.strip() for h in all_values[0]]
        email_col = self._col_index(headers, "e-mail")
        role_col = self._col_index(headers, "Rola")
        status_col = self._col_index(headers, "Status")

        if email_col is None or role_col is None or status_col is None:
            raise RuntimeError(f"Required columns not found. Headers: {headers}")

        email_lower = email.strip().lower()
        for row_idx, row in enumerate(all_values[1:], start=2):
            cell_email = row[email_col].strip().lower() if email_col < len(row) else ""
            if cell_email == email_lower:
                ws.update_cell(row_idx, role_col + 1, new_role_label)
                ws.update_cell(row_idx, status_col + 1, new_status_label)
                log.info(f"Updated row {row_idx}: Rola={new_role_label}, Status={new_status_label}")
                return True

        log.warning(f"Email {email} not found in tab {tab_name or self.cfg.members_sheet_tab}")
        return False

    @staticmethod
    def _col_index(headers: list[str], name: str) -> int | None:
        name_lower = name.strip().lower()
        for i, h in enumerate(headers):
            if h.strip().lower() == name_lower:
                return i
        return None

    # ------------------------------------------------------------------
    # Verification helpers
    # ------------------------------------------------------------------

    def assert_member_in_sheet(self, email: str) -> dict:
        row = self.get_member_row(email)
        if not row:
            raise AssertionError(
                f"Member {email} not found in sheet "
                f"'{self.cfg.members_sheet_tab}' (sheet {self.cfg.members_sheet_id})"
            )
        return row

    def assert_member_role(self, email: str, expected_role_label: str) -> dict:
        row = self.assert_member_in_sheet(email)
        actual = str(row.get("Rola", "")).strip()
        if actual.lower() != expected_role_label.strip().lower():
            raise AssertionError(
                f"Role mismatch for {email}: expected={expected_role_label!r}, actual={actual!r}"
            )
        return row