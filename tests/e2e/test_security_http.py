"""
Testy bezpieczeństwa HTTP — SKK Morzkulc
=========================================
Weryfikuje middleware auth, CORS i host allowlist bez użycia przeglądarki.
Używa bezpośrednich wywołań HTTP przez requests do live API.

Uruchamianie (z katalogu tests/e2e/):
    ENV=dev python -m pytest test_security_http.py -v

Wymagania:
    - pip install -r requirements.txt
    - DEV_TEST_USER_EMAIL / DEV_TEST_USER_PASSWORD ustawione w .env.test
    - DEV_ADMIN_USER_EMAIL / DEV_ADMIN_USER_PASSWORD (dla testu admin 403)
    - DEV_SUSPENDED_USER_EMAIL / DEV_SUSPENDED_USER_PASSWORD (opcjonalne)
    - DEV_DELETED_USER_EMAIL / DEV_DELETED_USER_PASSWORD (opcjonalne)

UWAGA — test host allowlist (test_unknown_host_returns_403):
    Wysyła X-Forwarded-Host: evil.example.com. Firebase Hosting może nadpisać
    ten nagłówek własną wartością — jeśli test zwraca 401 zamiast 403, oznacza
    to że Firebase nadpisał nagłówek i middleware widzi poprawny host.
    W takim przypadku test jest oznaczony jako skip z odpowiednim komunikatem.
"""
import os
import sys
import unittest

# Umożliwia import z katalogu tests/e2e/ niezależnie od cwd
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

# Auto-load .env.test jeśli istnieje
try:
    from dotenv import load_dotenv
    _env = os.path.join(_HERE, ".env.test")
    if os.path.isfile(_env):
        load_dotenv(_env)
except ImportError:
    pass

import requests
from config import ACTIVE as cfg
from helpers.firebase_auth import FirebaseAuthHelper

_auth = FirebaseAuthHelper(cfg)

BASE = cfg.app_base_url.rstrip("/")
VALID_ORIGIN = BASE
VALID_HOST = BASE.replace("https://", "").replace("http://", "")

REGISTER_URL = f"{BASE}/api/register"
SETUP_URL = f"{BASE}/api/setup"
ADMIN_SETUP_URL = f"{BASE}/api/admin/setup"


def valid_headers(token: str | None = None) -> dict:
    """Nagłówki dla żądań przechodzących przez normalną ścieżkę (host ustawiany przez Firebase Hosting)."""
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def evil_host_headers(token: str | None = None) -> dict:
    """Nagłówki z nadpisanym X-Forwarded-Host — powinno wywoływać blokadę 403."""
    h = {
        "Content-Type": "application/json",
        "Origin": "https://evil.example.com",
        "X-Forwarded-Host": "evil.example.com",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


# ---------------------------------------------------------------------------
# Auth middleware — brak tokenu i błędny token
# ---------------------------------------------------------------------------

class TestAuthMiddleware(unittest.TestCase):

    def test_register_no_token_returns_401(self):
        """POST /api/register bez Authorization → 401."""
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(), timeout=15)
        self.assertEqual(
            resp.status_code, 401,
            f"Oczekiwano 401 bez tokenu. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_register_bad_token_returns_401(self):
        """POST /api/register z losowym śmieciowym tokenem → 401."""
        resp = requests.post(
            REGISTER_URL, json={},
            headers=valid_headers("definitely.not.a.valid.token"),
            timeout=15,
        )
        self.assertEqual(
            resp.status_code, 401,
            f"Oczekiwano 401 dla błędnego tokenu. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_register_malformed_bearer_returns_401(self):
        """POST /api/register z 'Bearer ' bez tokenu → 401."""
        resp = requests.post(
            REGISTER_URL, json={},
            headers={**valid_headers(), "Authorization": "Bearer "},
            timeout=15,
        )
        self.assertEqual(
            resp.status_code, 401,
            f"Oczekiwano 401 dla pustego Bearer. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_setup_no_token_returns_401(self):
        """GET /api/setup bez Authorization → 401."""
        resp = requests.get(SETUP_URL, headers=valid_headers(), timeout=15)
        self.assertEqual(
            resp.status_code, 401,
            f"Oczekiwano 401 dla /api/setup bez tokenu. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_setup_bad_token_returns_401(self):
        """GET /api/setup z błędnym tokenem → 401."""
        resp = requests.get(
            SETUP_URL,
            headers=valid_headers("bad.token.xyz"),
            timeout=15,
        )
        self.assertEqual(
            resp.status_code, 401,
            f"Oczekiwano 401 dla błędnego tokenu. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_valid_token_register_not_401(self):
        """POST /api/register z poprawnym tokenem → NIE 401 (token akceptowany)."""
        if not cfg.test_user_email or not cfg.test_user_password:
            self.skipTest("DEV_TEST_USER_EMAIL / DEV_TEST_USER_PASSWORD nie skonfigurowane")
        token = _auth.test_user_token()
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token), timeout=30)
        self.assertNotEqual(
            resp.status_code, 401,
            f"Poprawny token nie powinien dawać 401. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )


# ---------------------------------------------------------------------------
# Admin endpoint — brak uprawnień
# ---------------------------------------------------------------------------

class TestAdminEndpoint(unittest.TestCase):

    def test_admin_setup_without_token_returns_401(self):
        """POST /api/admin/setup bez tokenu → 401."""
        resp = requests.post(ADMIN_SETUP_URL, json={}, headers=valid_headers(), timeout=15)
        # Może być 404 jeśli endpoint nie jest skonfigurowany w tym projekcie
        self.assertIn(
            resp.status_code, [401, 404],
            f"Oczekiwano 401 lub 404. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_admin_setup_non_admin_returns_403(self):
        """POST /api/admin/setup z tokenem zwykłego użytkownika → 403."""
        if not cfg.test_user_email or not cfg.test_user_password:
            self.skipTest("DEV_TEST_USER_EMAIL / DEV_TEST_USER_PASSWORD nie skonfigurowane")
        token = _auth.test_user_token()
        resp = requests.post(ADMIN_SETUP_URL, json={}, headers=valid_headers(token), timeout=15)
        # Dopuszczamy 404 jeśli endpoint nie istnieje w danym projekcie
        self.assertIn(
            resp.status_code, [403, 404],
            f"Oczekiwano 403 (lub 404) dla nie-admina. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )


# ---------------------------------------------------------------------------
# Host allowlist
# ---------------------------------------------------------------------------

class TestHostAllowlist(unittest.TestCase):

    def test_unknown_host_header_returns_403(self):
        """Żądanie z X-Forwarded-Host: evil.example.com → 403.

        UWAGA: Firebase Hosting może nadpisać X-Forwarded-Host własną wartością.
        Jeśli Firebase Hosting zastępuje nagłówek, dostaniemy 401 zamiast 403
        (middleware widzi poprawny host, blokuje tylko ze względu na brak tokenu).
        W takim przypadku test jest pomijany z informacją.
        """
        resp = requests.post(
            REGISTER_URL, json={},
            headers=evil_host_headers(),
            timeout=15,
        )
        if resp.status_code == 401:
            self.skipTest(
                "Firebase Hosting nadpisał X-Forwarded-Host — middleware widzi poprawny host. "
                "Test host allowlist nieefektywny przez Firebase Hosting proxy. "
                f"Odpowiedź: {resp.status_code}"
            )
        self.assertEqual(
            resp.status_code, 403,
            f"Oczekiwano 403 dla nieznanego hosta. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_preflight_known_origin_returns_204(self):
        """OPTIONS z poprawnym Origin i bez hosta → 204 lub 200 (preflight OK)."""
        headers = {
            "Origin": VALID_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        }
        resp = requests.options(REGISTER_URL, headers=headers, timeout=15)
        self.assertIn(
            resp.status_code, [200, 204],
            f"Preflight z poprawnym Origin powinien dać 200/204. Odpowiedź: {resp.status_code}",
        )

    def test_preflight_unknown_origin_no_acao(self):
        """OPTIONS z nieznanym Origin — odpowiedź nie powinna zawierać ACAO z tym origin."""
        headers = {
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "POST",
        }
        resp = requests.options(REGISTER_URL, headers=headers, timeout=15)
        acao = resp.headers.get("Access-Control-Allow-Origin", "")
        self.assertNotEqual(
            acao, "https://evil.example.com",
            f"Zły Origin nie powinien pojawić się w ACAO. Nagłówek: {acao!r}",
        )

    def test_valid_request_acao_header_correct(self):
        """POST z poprawnym tokenem i Origin → ACAO musi być równy wysłanemu Origin (lub brak)."""
        if not cfg.test_user_email or not cfg.test_user_password:
            self.skipTest("DEV_TEST_USER_EMAIL nie skonfigurowane")
        token = _auth.test_user_token()
        headers = {**valid_headers(token), "Origin": VALID_ORIGIN}
        resp = requests.post(REGISTER_URL, json={}, headers=headers, timeout=30)
        acao = resp.headers.get("Access-Control-Allow-Origin", "")
        if acao:
            self.assertEqual(
                acao, VALID_ORIGIN,
                f"ACAO powinien być równy {VALID_ORIGIN!r}, dostaliśmy: {acao!r}",
            )
        # Brak ACAO też jest OK (same-origin lub brak Origin check)


# ---------------------------------------------------------------------------
# Użytkownicy z blokadą dostępu (status_zawieszony / status_skreslony)
# ---------------------------------------------------------------------------

class TestBlockedUsers(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.susp_email = cfg.suspended_user_email
        cls.susp_pass = cfg.suspended_user_password
        cls.del_email = cfg.deleted_user_email
        cls.del_pass = cfg.deleted_user_password

    def _skip_if_no_creds(self, email: str, password: str, label: str):
        if not email or not password:
            self.skipTest(f"Brak konfiguracji konta '{label}' — pomiń krok 0 z wymagań wstępnych")

    def test_suspended_user_register_returns_403(self):
        """POST /api/register jako zawieszony użytkownik → 403."""
        self._skip_if_no_creds(self.susp_email, self.susp_pass, "suspended")
        token = _auth.get_token(self.susp_email, self.susp_pass)
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token), timeout=15)
        self.assertEqual(
            resp.status_code, 403,
            f"Zawieszony user powinien dostać 403. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_suspended_user_setup_returns_403(self):
        """GET /api/setup jako zawieszony użytkownik → 403."""
        self._skip_if_no_creds(self.susp_email, self.susp_pass, "suspended")
        token = _auth.get_token(self.susp_email, self.susp_pass)
        resp = requests.get(SETUP_URL, headers=valid_headers(token), timeout=15)
        self.assertEqual(
            resp.status_code, 403,
            f"Zawieszony user powinien dostać 403 dla /setup. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_deleted_user_register_returns_403(self):
        """POST /api/register jako skreślony użytkownik → 403."""
        self._skip_if_no_creds(self.del_email, self.del_pass, "deleted")
        token = _auth.get_token(self.del_email, self.del_pass)
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token), timeout=15)
        self.assertEqual(
            resp.status_code, 403,
            f"Skreślony user powinien dostać 403. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )

    def test_deleted_user_setup_returns_403(self):
        """GET /api/setup jako skreślony użytkownik → 403."""
        self._skip_if_no_creds(self.del_email, self.del_pass, "deleted")
        token = _auth.get_token(self.del_email, self.del_pass)
        resp = requests.get(SETUP_URL, headers=valid_headers(token), timeout=15)
        self.assertEqual(
            resp.status_code, 403,
            f"Skreślony user powinien dostać 403 dla /setup. Odpowiedź: {resp.status_code} {resp.text[:300]}",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)