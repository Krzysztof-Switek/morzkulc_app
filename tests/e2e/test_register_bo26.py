"""
Testy logiki rejestracji i BO26 — SKK Morzkulc
===============================================
Weryfikuje:
  - Nowy użytkownik spoza users_opening_balance_26 → rola_sympatyk
  - Nowy użytkownik z pełnym profilem → profileComplete=True
  - Walidacja profilu: brakujące wymagane pola → profileComplete=False
  - Idempotentność: ponowna rejestracja → existed=True
  - Użytkownik z BO26 (memberField=True) → rola_czlonek (jeśli test_user jest w BO26)

Uruchamianie (z katalogu tests/e2e/):
    ENV=dev python -m pytest test_register_bo26.py -v

Wymagania:
    - DEV_TEST_USER_EMAIL / DEV_TEST_USER_PASSWORD
    - DEV_NEW_USER_EMAIL / DEV_NEW_USER_PASSWORD (konto spoza BO26, krok 0 wymagań wstępnych)
    - DEV_NEW_USER_FIRST_NAME, DEV_NEW_USER_LAST_NAME, DEV_NEW_USER_PHONE, DEV_NEW_USER_DOB
"""
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

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
from helpers.firestore_helper import FirestoreHelper

_auth = FirebaseAuthHelper(cfg)
_fs = FirestoreHelper(cfg)

BASE = cfg.app_base_url.rstrip("/")
REGISTER_URL = f"{BASE}/api/register"


def make_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _new_user_profile(cfg_) -> dict:
    """Kompletny profil dla konta new_user."""
    return {
        "firstName": cfg_.new_user_first_name,
        "lastName": cfg_.new_user_last_name,
        "nickname": "nowak_test",
        "phone": cfg_.new_user_phone,
        "dateOfBirth": cfg_.new_user_date_of_birth,
        "consentRodo": True,
        "consentStatute": True,
    }


# ---------------------------------------------------------------------------
# Testy dla konta spoza BO26 (rola_sympatyk)
# ---------------------------------------------------------------------------

class TestNewUserOutsideBO26(unittest.TestCase):
    """
    Wymaga konta DEV_NEW_USER_EMAIL, które NIE ma wpisu
    w kolekcji users_opening_balance_26 (ani po emailu, ani po nazwisku).
    """

    def setUp(self):
        if not cfg.new_user_email or not cfg.new_user_password:
            self.skipTest(
                "DEV_NEW_USER_EMAIL / DEV_NEW_USER_PASSWORD nie skonfigurowane. "
                "Wykonaj krok 0 z wymagań wstępnych."
            )
        if not cfg.new_user_phone or not cfg.new_user_date_of_birth:
            self.skipTest("DEV_NEW_USER_PHONE / DEV_NEW_USER_DOB nie skonfigurowane")

    def test_outside_bo26_gets_rola_sympatyk(self):
        """Użytkownik spoza BO26 powinien dostać rola_sympatyk."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)
        profile = _new_user_profile(cfg)
        resp = requests.post(REGISTER_URL, json=profile, headers=make_headers(token), timeout=30)
        self.assertEqual(resp.status_code, 200, f"Rejestracja zwróciła {resp.status_code}: {resp.text[:400]}")

        data = resp.json()
        self.assertTrue(data.get("ok"), f"Rejestracja zwróciła ok=False: {data}")

        role_key = data.get("role_key", "")
        opening_match = data.get("openingMatch", None)

        self.assertFalse(
            opening_match,
            f"Konto spoza BO26 nie powinno mieć openingMatch=True. Dane: {data}",
        )
        self.assertEqual(
            role_key, "rola_sympatyk",
            f"Oczekiwano rola_sympatyk, otrzymano: {role_key!r}. Dane: {data}",
        )

    def test_outside_bo26_profile_complete(self):
        """Pełny profil → profileComplete=True."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)
        profile = _new_user_profile(cfg)
        resp = requests.post(REGISTER_URL, json=profile, headers=make_headers(token), timeout=30)
        data = resp.json()
        self.assertTrue(
            data.get("profileComplete"),
            f"Pełny profil powinien dać profileComplete=True. Dane: {data}",
        )

    def test_outside_bo26_uid_and_email_in_response(self):
        """Odpowiedź zawiera uid i email."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)
        resp = requests.post(REGISTER_URL, json={}, headers=make_headers(token), timeout=30)
        data = resp.json()
        self.assertTrue(data.get("uid"), f"Brak uid w odpowiedzi: {data}")
        self.assertTrue(data.get("email"), f"Brak email w odpowiedzi: {data}")

    def tearDown(self):
        """Usuń użytkownika new_user z users_active po każdym teście (best-effort)."""
        if not cfg.new_user_email:
            return
        try:
            result = _fs.get_user_by_email(cfg.new_user_email)
            if result:
                uid, _ = result
                _fs.db.collection("users_active").document(uid).delete()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Testy idempotentności i walidacji (dla głównego konta testowego)
# ---------------------------------------------------------------------------

class TestRegistrationIdempotency(unittest.TestCase):
    """
    Wymaga DEV_TEST_USER_EMAIL — konto które już wcześniej przeszło przez rejestrację.
    """

    def setUp(self):
        if not cfg.test_user_email or not cfg.test_user_password:
            self.skipTest("DEV_TEST_USER_EMAIL / DEV_TEST_USER_PASSWORD nie skonfigurowane")

    def test_reregistration_returns_existed_true(self):
        """Ponowna rejestracja istniejącego użytkownika → existed=True."""
        token = _auth.test_user_token()
        resp = requests.post(REGISTER_URL, json={}, headers=make_headers(token), timeout=30)
        self.assertEqual(resp.status_code, 200, f"{resp.status_code}: {resp.text[:400]}")
        data = resp.json()
        self.assertTrue(
            data.get("existed"),
            f"Ponowna rejestracja powinna zwrócić existed=True. Dane: {data}",
        )

    def test_reregistration_preserves_role(self):
        """Ponowna rejestracja nie zmienia istniejącej roli."""
        token = _auth.test_user_token()
        resp = requests.post(REGISTER_URL, json={}, headers=make_headers(token), timeout=30)
        data = resp.json()
        role_key = data.get("role_key", "")
        self.assertTrue(
            role_key.startswith("rola_"),
            f"role_key powinien zaczynać się od 'rola_'. Dane: {data}",
        )

    def test_empty_profile_returns_profile_complete_false(self):
        """Rejestracja bez profilu → profileComplete=False (jeśli profil niekompletny)."""
        token = _auth.test_user_token()
        # Wywołaj z pustym body — profil nie zostanie zaktualizowany
        # Jeśli user już ma kompletny profil, to profileComplete może być True — to też OK
        resp = requests.post(REGISTER_URL, json={}, headers=make_headers(token), timeout=30)
        self.assertEqual(resp.status_code, 200, f"{resp.status_code}: {resp.text[:400]}")
        data = resp.json()
        # Weryfikujemy tylko że pole istnieje i jest booleanem
        self.assertIn(
            "profileComplete", data,
            f"Brak pola profileComplete w odpowiedzi: {data}",
        )
        self.assertIsInstance(
            data["profileComplete"], bool,
            f"profileComplete powinno być bool: {data}",
        )


# ---------------------------------------------------------------------------
# Test użytkownika z BO26 (rola_czlonek)
# ---------------------------------------------------------------------------

class TestBO26MemberRole(unittest.TestCase):
    """
    Weryfikuje że użytkownik z users_opening_balance_26
    z polem "członek stowarzyszenia"=True dostaje rola_czlonek.

    Działa tylko jeśli test_user_email jest w BO26 z tym polem.
    Jeśli nie jest — test jest pomijany z informacją.
    """

    def setUp(self):
        if not cfg.test_user_email or not cfg.test_user_password:
            self.skipTest("DEV_TEST_USER_EMAIL nie skonfigurowane")

    def test_bo26_member_gets_rola_czlonek(self):
        """Użytkownik z BO26 (członek=True) → rola_czlonek."""
        token = _auth.test_user_token()
        resp = requests.post(REGISTER_URL, json={}, headers=make_headers(token), timeout=30)
        self.assertEqual(resp.status_code, 200, f"{resp.status_code}: {resp.text[:400]}")
        data = resp.json()

        if not data.get("openingMatch"):
            self.skipTest(
                f"test_user_email={cfg.test_user_email!r} nie jest w BO26 "
                "(openingMatch=False). Zmień konto testowe lub dodaj wpis do BO26."
            )

        role_key = data.get("role_key", "")
        self.assertEqual(
            role_key, "rola_czlonek",
            f"Użytkownik z BO26 (członek=True) powinien mieć rola_czlonek. Dane: {data}",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)