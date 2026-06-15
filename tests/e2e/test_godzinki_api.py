"""
Testy integracyjne API godzinek — SKK Morzkulc
===============================================

Weryfikuje endpointy godzinkowe przez żywe wywołania HTTP na PROD:
  GET  /api/godzinki
  POST /api/godzinki/submit

Pokrywa:
  - Autoryzacja (brak tokena → 401, zły token → 401)
  - Blokada konta zawieszonego (status_zawieszony → 403)
  - Bilans API odpowiada bilansowi Firestore
  - Submit tworzy rekord approved=false (bilans się nie zmienia)
  - Walidacja pól submit (brak amount, ujemny, przyszła data, brak reason)
  - Bilans wzrasta po zatwierdzeniu (wymaga ręcznego kroku — udokumentowane)

Uruchamianie (z katalogu tests/e2e/):
    ENV=prod python -m pytest test_godzinki_api.py -v

Wymagania .env.test:
    PROD_TEST_MEMBER_EMAIL / PROD_TEST_MEMBER_PASSWORD   — rola_czlonek, status_aktywny
    PROD_TEST_SUSPENDED_EMAIL / PROD_TEST_SUSPENDED_PASSWORD — status_zawieszony
    PROD_ADMIN_USER_EMAIL / PROD_ADMIN_USER_PASSWORD

UWAGA: submit tworzy pending-earn w ledgerze. Testy sprawdzają że bilans się nie zmienia
       (approved=false). Testy nie zatwierdzają zgłoszeń automatycznie — pending rekordy
       należy usunąć ręcznie po testach lub używać dedykowanego konta testowego czyszczonego
       przez fixture.
"""
import os
import sys
import unittest
import logging
from datetime import datetime, timezone, timedelta

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
from helpers.api_helper import ApiHelper
from helpers.firestore_helper import FirestoreHelper
from helpers.gear_discovery import GearDiscovery

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_auth = FirebaseAuthHelper(cfg)
_api = ApiHelper(cfg)
BASE = cfg.app_base_url.rstrip("/")

# Data w przeszłości do użycia w submit (grantedAt musi być <= today)
_PAST_DATE = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
_FUTURE_DATE = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d")


def _skip_if_missing(*attrs):
    """Return skip reason if any of the config fields are empty."""
    missing = [a for a in attrs if not getattr(cfg, a, "")]
    if missing:
        return f"Missing config: {', '.join(missing)}"
    return None


# ---------------------------------------------------------------------------
# G01-G02 Autoryzacja
# ---------------------------------------------------------------------------

class TestGodzinkiAuthorization(unittest.TestCase):
    """
    G01 — brak tokena → 401
    G02 — nieprawidłowy token → 401
    """

    def test_G01_no_token_returns_401(self):
        resp = requests.get(f"{BASE}/api/godzinki", timeout=10)
        self.assertEqual(resp.status_code, 401, resp.text[:300])

    def test_G01b_submit_no_token_returns_401(self):
        resp = requests.post(
            f"{BASE}/api/godzinki/submit",
            json={"amount": 2, "grantedAt": _PAST_DATE, "reason": "test"},
            timeout=10,
        )
        self.assertEqual(resp.status_code, 401, resp.text[:300])

    def test_G02_bad_token_returns_401(self):
        resp = requests.get(
            f"{BASE}/api/godzinki",
            headers={"Authorization": "Bearer this_is_not_a_valid_token"},
            timeout=10,
        )
        self.assertEqual(resp.status_code, 401, resp.text[:300])

    def test_G02b_submit_bad_token_returns_401(self):
        resp = requests.post(
            f"{BASE}/api/godzinki/submit",
            headers={"Authorization": "Bearer bad_token", "Content-Type": "application/json"},
            json={"amount": 2, "grantedAt": _PAST_DATE, "reason": "test"},
            timeout=10,
        )
        self.assertEqual(resp.status_code, 401, resp.text[:300])


# ---------------------------------------------------------------------------
# G03 Zablokowany status
# ---------------------------------------------------------------------------

class TestGodzinkiSuspendedUser(unittest.TestCase):
    """
    G03 — zawieszony użytkownik nie może zgłaszać godzinek (POST /submit → 403)
    GET /api/godzinki dla zawieszonego: handler NIE blokuje na status — tylko submit robi
    """

    def setUp(self):
        skip = _skip_if_missing("suspended_user_email", "suspended_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.suspended_user_email, cfg.suspended_user_password)

    def test_G03_suspended_cannot_submit_godzinki(self):
        """POST /api/godzinki/submit z kontem zawieszonym → 403"""
        resp = requests.post(
            f"{BASE}/api/godzinki/submit",
            headers={"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"},
            json={"amount": 2, "grantedAt": _PAST_DATE, "reason": "test suspension block"},
            timeout=15,
        )
        self.assertEqual(resp.status_code, 403, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"), body)

    def test_G03b_suspended_can_read_godzinki(self):
        """GET /api/godzinki NIE blokuje na status — zwraca bilans (403 nie oczekiwane)"""
        resp = requests.get(
            f"{BASE}/api/godzinki",
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=15,
        )
        # getGodzinkiHandler nie sprawdza statusu — bilans jest dostępny
        self.assertEqual(resp.status_code, 200, resp.text[:300])
        body = resp.json()
        self.assertTrue(body.get("ok"), body)
        self.assertIn("balance", body, body)


# ---------------------------------------------------------------------------
# G04-G05 Bilans API zgodny z Firestore
# ---------------------------------------------------------------------------

class TestGodzinkiBalance(unittest.TestCase):
    """
    G04 — GET /api/godzinki zwraca bilans zgodny z obliczeniem z godzinki_ledger
    G05 — bilans API po submit z approved=false NIE ulega zmianie
    """

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        self._fs = FirestoreHelper(cfg)
        uid_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not uid_result:
            self.skipTest(f"Użytkownik {cfg.member_user_email} nie istnieje w users_active")
        self._uid, _ = uid_result
        self._submitted_record_id = None

    def tearDown(self):
        # Usuń pending-earn stworzony przez submit jeśli test to zrobił
        if self._submitted_record_id:
            try:
                self._fs.db.collection("godzinki_ledger").document(
                    self._submitted_record_id
                ).delete()
                log.info(f"Cleanup: usunięto pending earn {self._submitted_record_id}")
            except Exception as exc:
                log.warning(f"Cleanup earn failed: {exc}")

    def test_G04_api_balance_matches_firestore_balance(self):
        """GET /api/godzinki balance == computeBalance z godzinki_ledger"""
        api_resp = _api.get_godzinki(self._token, view="home")
        self.assertTrue(api_resp.get("ok"), api_resp)

        fs_balance = self._fs.get_godzinki_balance(self._uid)
        api_balance = api_resp["balance"]

        self.assertAlmostEqual(
            api_balance, fs_balance, places=2,
            msg=f"API balance={api_balance} != Firestore balance={fs_balance}",
        )

    def test_G04b_full_view_returns_history(self):
        """GET /api/godzinki?view=full zwraca historię i negativeBalanceLimit"""
        resp = _api.get_godzinki(self._token, view="full")
        self.assertTrue(resp.get("ok"), resp)
        self.assertIn("balance", resp)
        self.assertIn("history", resp)
        self.assertIn("negativeBalanceLimit", resp)
        self.assertIsInstance(resp["history"], list)

    def test_G04c_home_view_returns_recent_earnings(self):
        """GET /api/godzinki?view=home zwraca recentEarnings (max 5)"""
        resp = _api.get_godzinki(self._token, view="home")
        self.assertTrue(resp.get("ok"), resp)
        self.assertIn("recentEarnings", resp)
        self.assertIsInstance(resp["recentEarnings"], list)
        self.assertLessEqual(len(resp["recentEarnings"]), 5)

    def test_G05_submit_pending_does_not_change_balance(self):
        """
        POST /api/godzinki/submit tworzy rekord approved=false.
        Bilans przed i po submit powinien być taki sam (pending nie jest liczony).
        """
        # Bilans przed
        before = _api.get_godzinki(self._token, view="home")
        balance_before = before["balance"]

        # Wyślij zgłoszenie
        resp = requests.post(
            f"{BASE}/api/godzinki/submit",
            headers={"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"},
            json={"amount": 8, "grantedAt": _PAST_DATE, "reason": "e2e test — pending should not affect balance"},
            timeout=20,
        )
        self.assertEqual(resp.status_code, 200, resp.text[:300])
        body = resp.json()
        self.assertTrue(body.get("ok"), body)
        self.assertIn("recordId", body)
        self._submitted_record_id = body["recordId"]

        # Sprawdź że rekord ma approved=false w Firestore
        ledger_snap = self._fs.db.collection("godzinki_ledger").document(
            self._submitted_record_id
        ).get()
        self.assertTrue(ledger_snap.exists, "Rekord nie istnieje w godzinki_ledger")
        ledger_data = ledger_snap.to_dict()
        self.assertEqual(ledger_data.get("type"), "earn", ledger_data)
        self.assertFalse(ledger_data.get("approved"), "Nowy submit powinien mieć approved=false")

        # Bilans po — nie powinien się zmienić
        after = _api.get_godzinki(self._token, view="home")
        balance_after = after["balance"]

        self.assertAlmostEqual(
            balance_before, balance_after, places=2,
            msg=f"Bilans zmienił się po submit pending: przed={balance_before}, po={balance_after}",
        )


# ---------------------------------------------------------------------------
# G06-G10 Walidacja submit
# ---------------------------------------------------------------------------

class TestGodzinkiSubmitValidation(unittest.TestCase):
    """
    G06 — amount = 0 lub ujemny → 400 validation_failed
    G07 — amount brakujący → 400 validation_failed
    G08 — grantedAt przyszłość → 400 cannot_be_future
    G09 — grantedAt brak → 400 required
    G10 — reason brak → 400 required
    """

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)

    def _submit(self, body: dict) -> requests.Response:
        return requests.post(
            f"{BASE}/api/godzinki/submit",
            headers={"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"},
            json=body,
            timeout=15,
        )

    def test_G06_zero_amount_rejected(self):
        resp = self._submit({"amount": 0, "grantedAt": _PAST_DATE, "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("amount", body.get("fields", {}))

    def test_G06b_negative_amount_rejected(self):
        resp = self._submit({"amount": -5, "grantedAt": _PAST_DATE, "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("amount", body.get("fields", {}))

    def test_G07_missing_amount_rejected(self):
        resp = self._submit({"grantedAt": _PAST_DATE, "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])

    def test_G08_future_date_rejected(self):
        resp = self._submit({"amount": 2, "grantedAt": _FUTURE_DATE, "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        fields = body.get("fields", {})
        self.assertIn("grantedAt", fields, body)
        self.assertEqual(fields["grantedAt"], "cannot_be_future")

    def test_G09_missing_grantedAt_rejected(self):
        resp = self._submit({"amount": 2, "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("grantedAt", body.get("fields", {}))

    def test_G09b_invalid_date_format_rejected(self):
        resp = self._submit({"amount": 2, "grantedAt": "20-01-2025", "reason": "test"})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("grantedAt", body.get("fields", {}))

    def test_G10_missing_reason_rejected(self):
        resp = self._submit({"amount": 2, "grantedAt": _PAST_DATE})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("reason", body.get("fields", {}))

    def test_G10b_empty_reason_rejected(self):
        resp = self._submit({"amount": 2, "grantedAt": _PAST_DATE, "reason": ""})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("reason", body.get("fields", {}))

    def test_G10c_very_long_reason_rejected(self):
        resp = self._submit({"amount": 2, "grantedAt": _PAST_DATE, "reason": "x" * 501})
        self.assertEqual(resp.status_code, 400, resp.text[:300])
        body = resp.json()
        self.assertFalse(body.get("ok"))
        self.assertIn("reason", body.get("fields", {}))


# ---------------------------------------------------------------------------
# G11 Balance po zatwierdzeniu (przepływ manualny — udokumentowany)
# ---------------------------------------------------------------------------

class TestGodzinkiApprovalFlow(unittest.TestCase):
    """
    G11 — Bilans wzrasta po zatwierdzeniu zgłoszenia godzinek.

    Scenariusz wymaga ręcznego zatwierdzenia lub bezpośredniego zapisu do Firestore
    (grant_godzinki z FirestoreHelper). Ten test weryfikuje automatycznie całość:
    1. Odczytaj bilans przed
    2. Wstaw approved=true earn bezpośrednio do godzinki_ledger (symulacja zatwierdzenia)
    3. Sprawdź GET /api/godzinki — bilans wzrósł
    4. Cleanup: usuń wstawiony rekord

    Różni się od flow z submit (pending → zarząd zatwierdza w arkuszu):
    tutaj pomijamy krok oczekiwania na arkusz i wstawiamy approved=true wprost.
    """

    _grant_id: str | None = None

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        self._fs = FirestoreHelper(cfg)
        uid_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not uid_result:
            self.skipTest(f"Użytkownik {cfg.member_user_email} nie istnieje w users_active")
        self._uid, _ = uid_result

    def tearDown(self):
        if self._grant_id:
            try:
                self._fs.db.collection("godzinki_ledger").document(self._grant_id).delete()
                log.info(f"Cleanup: usunięto earn {self._grant_id}")
            except Exception as exc:
                log.warning(f"Cleanup earn failed: {exc}")

    def test_G11_approved_earn_increases_balance(self):
        """Wstawienie approved=true earn podnosi bilans w GET /api/godzinki"""
        # Bilans przed
        before_resp = _api.get_godzinki(self._token, view="home")
        self.assertTrue(before_resp.get("ok"), before_resp)
        balance_before = before_resp["balance"]

        # Wstaw earn
        grant_amount = 7.0
        self._grant_id = self._fs.grant_godzinki(self._uid, grant_amount, note="e2e G11 test")

        # Bilans po
        after_resp = _api.get_godzinki(self._token, view="home")
        self.assertTrue(after_resp.get("ok"), after_resp)
        balance_after = after_resp["balance"]

        self.assertAlmostEqual(
            balance_after, balance_before + grant_amount, places=2,
            msg=f"Bilans po grant: oczekiwano {balance_before + grant_amount}, otrzymano {balance_after}",
        )

    def test_G11b_balance_restored_after_earn_removal(self):
        """
        Po usunięciu approved earn bilans wraca do wartości sprzed grantu.
        Weryfikuje że Firestore jest źródłem prawdy i nie ma cache.
        """
        # Bilans bazowy (bez naszego grantu)
        base_resp = _api.get_godzinki(self._token, view="home")
        balance_base = base_resp["balance"]

        # Wstaw earn
        grant_amount = 5.0
        self._grant_id = self._fs.grant_godzinki(self._uid, grant_amount, note="e2e G11b test")

        # Usuń earn
        self._fs.db.collection("godzinki_ledger").document(self._grant_id).delete()
        self._grant_id = None  # tearDown już nie musi czyścić

        # Bilans po usunięciu — powinien wrócić do base
        restored_resp = _api.get_godzinki(self._token, view="home")
        balance_restored = restored_resp["balance"]

        self.assertAlmostEqual(
            balance_restored, balance_base, places=2,
            msg=f"Bilans nie wrócił: base={balance_base}, restored={balance_restored}",
        )


# ---------------------------------------------------------------------------
# G12 Bilans po rezerwacji i anulowaniu (cross-module)
# ---------------------------------------------------------------------------

class TestGodzinkiBalanceAfterReservation(unittest.TestCase):
    """
    G12 — Bilans godzinkowy zmienia się po rezerwacji i wraca po anulowaniu.
    Integracja: godzinki + rezerwacje.
    """

    _reservation_id: str | None = None
    _grant_id: str | None = None

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        GearDiscovery.load(self._token, cfg)
        self._fs = FirestoreHelper(cfg)
        uid_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not uid_result:
            self.skipTest(f"Użytkownik {cfg.member_user_email} nie istnieje w users_active")
        self._uid, _ = uid_result

    def tearDown(self):
        if self._reservation_id:
            try:
                _api.cancel_reservation(self._token, self._reservation_id)
            except Exception:
                pass
        if self._grant_id:
            try:
                self._fs.db.collection("godzinki_ledger").document(self._grant_id).delete()
            except Exception:
                pass

    def test_G12_balance_decreases_after_reservation_then_restores_on_cancel(self):
        """
        1. Zarejestruj bilans przed
        2. Utwórz rezerwację kajaka (1 dzień, daleka data)
        3. Sprawdź że bilans zmalał o costHours
        4. Anuluj rezerwację
        5. Sprawdź że bilans wrócił do oryginalnego
        """
        kid = GearDiscovery.require_kayak()

        # Upewnij się że jest wystarczające saldo do rezerwacji
        gear_vars_snap = self._fs.get_setup_vars_gear()
        vars_data = gear_vars_snap.get("vars", {})
        rate = float(vars_data.get("godzinki_za_kajak", {}).get("value", 10))

        # Potrzebujemy co najmniej 1 dzień × 1 kajak godzinek
        # Zrób grant zapasowy aby test nie blokował na saldo
        self._grant_id = self._fs.grant_godzinki(
            self._uid, rate + 20, note="e2e G12 buffer grant"
        )

        # Bilans przed
        before_resp = _api.get_godzinki(self._token, view="home")
        balance_before = before_resp["balance"]

        # Rezerwacja: 1 kajak, 1 dzień, daleko w przyszłości
        start = (datetime.now(timezone.utc) + timedelta(days=200)).strftime("%Y-%m-%d")
        end = (datetime.now(timezone.utc) + timedelta(days=200)).strftime("%Y-%m-%d")

        res_resp = _api.reserve_kayaks(self._token, [kid], start, end)
        self.assertTrue(res_resp.get("ok"), res_resp)
        self._reservation_id = res_resp["reservationId"]
        expected_cost = res_resp["costHours"]

        # Bilans po rezerwacji
        after_reserve_resp = _api.get_godzinki(self._token, view="home")
        balance_after_reserve = after_reserve_resp["balance"]

        self.assertAlmostEqual(
            balance_after_reserve, balance_before - expected_cost, places=2,
            msg=f"Po rezerwacji: oczekiwano {balance_before - expected_cost}, otrzymano {balance_after_reserve}",
        )

        # Anulowanie
        cancel_resp = _api.cancel_reservation(self._token, self._reservation_id)
        self.assertTrue(cancel_resp.get("ok"), cancel_resp)
        self._reservation_id = None  # tearDown już nie będzie anulować

        # Bilans po anulowaniu
        after_cancel_resp = _api.get_godzinki(self._token, view="home")
        balance_after_cancel = after_cancel_resp["balance"]

        self.assertAlmostEqual(
            balance_after_cancel, balance_before, places=2,
            msg=f"Po anulowaniu: oczekiwano {balance_before}, otrzymano {balance_after_cancel}",
        )


# ---------------------------------------------------------------------------
# G13 rola_zarzad / boardDoesNotPay — saldo nie zmienia się
# ---------------------------------------------------------------------------

class TestGodzinkiBoardDoesNotPay(unittest.TestCase):
    """
    G13 — Zarząd z boardDoesNotPay=true: bilans nie zmienia się po rezerwacji.
    """

    _reservation_id: str | None = None

    def setUp(self):
        skip = _skip_if_missing("board_user_email", "board_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.board_user_email, cfg.board_user_password)
        GearDiscovery.load(self._token, cfg)
        self._fs = FirestoreHelper(cfg)

    def tearDown(self):
        if self._reservation_id:
            try:
                _api.cancel_reservation(self._token, self._reservation_id)
            except Exception:
                pass

    def test_G13_board_balance_unchanged_after_reservation(self):
        """Zarząd nie płaci → bilans godzinkowy nie zmienia się po rezerwacji kajaka"""
        # Sprawdź czy boardDoesNotPay=true w setupie
        gear_vars = self._fs.get_setup_vars_gear()
        vars_data = gear_vars.get("vars", {})
        board_does_not_pay = vars_data.get("zarzad_nie_płaci_za_sprzet", {}).get("value", False)
        if not board_does_not_pay:
            self.skipTest("boardDoesNotPay nie jest ustawione na true w setup/vars_gear — pomiń ten test")

        uid_result = self._fs.get_user_by_email(cfg.board_user_email)
        if not uid_result:
            self.skipTest(f"Brak {cfg.board_user_email} w users_active")
        uid, _ = uid_result

        balance_before = self._fs.get_godzinki_balance(uid)

        start = (datetime.now(timezone.utc) + timedelta(days=210)).strftime("%Y-%m-%d")
        end = (datetime.now(timezone.utc) + timedelta(days=212)).strftime("%Y-%m-%d")

        kid = GearDiscovery.require_kayak()
        res_resp = _api.reserve_kayaks(self._token, [kid], start, end)
        self.assertTrue(res_resp.get("ok"), res_resp)
        self._reservation_id = res_resp["reservationId"]

        self.assertEqual(
            res_resp["costHours"], 0,
            f"boardDoesNotPay=true ale costHours={res_resp['costHours']}",
        )

        balance_after = self._fs.get_godzinki_balance(uid)
        self.assertAlmostEqual(
            balance_before, balance_after, places=2,
            msg=f"Bilans zarządu zmienił się: przed={balance_before}, po={balance_after}",
        )


# ---------------------------------------------------------------------------
# G14 Anulowanie rezerwacji z overdraftem (regresja poprawki L1)
# ---------------------------------------------------------------------------

class TestGodzinkiCancelWithOverdraft(unittest.TestCase):
    """
    G14 — Anulowanie rezerwacji pokrytej (częściowo) z salda ujemnego musi
    przywrócić saldo DOKŁADNIE do stanu sprzed rezerwacji.

    Regresja błędu L1 (podwójny zwrot overdraftu): stary kod przy anulowaniu
    oznaczał spend jako refunded (overdraft przestawał obciążać saldo) ORAZ
    tworzył nową pulę earn o wartości overdraftu → saldo rosło o overdraft
    ponad stan wyjściowy (godzinki z niczego).

    Strategia: tymczasowy syntetyczny spend (overdraft) zeruje saldo konta
    testowego, rezerwacja 1-dniowa idzie w całości na kredyt, anulowanie musi
    wrócić do wyzerowanego stanu. Syntetyczny spend usuwany w tearDown.
    """

    _reservation_id: str | None = None
    _synthetic_spend_id: str | None = None

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        GearDiscovery.load(self._token, cfg)
        self._fs = FirestoreHelper(cfg)
        uid_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not uid_result:
            self.skipTest(f"Użytkownik {cfg.member_user_email} nie istnieje w users_active")
        self._uid, _ = uid_result

    def tearDown(self):
        if self._reservation_id:
            try:
                _api.cancel_reservation(self._token, self._reservation_id)
            except Exception:
                pass
        if self._synthetic_spend_id:
            try:
                self._fs.db.collection("godzinki_ledger").document(self._synthetic_spend_id).delete()
            except Exception:
                pass

    def _zero_balance_with_synthetic_spend(self) -> float:
        """Jeśli saldo > 0, dodaje syntetyczny spend (overdraft=saldo) → saldo ≈ 0. Zwraca saldo po."""
        balance = self._fs.get_godzinki_balance(self._uid)
        if balance > 0:
            ref = self._fs.db.collection("godzinki_ledger").document()
            ref.set({
                "id": ref.id,
                "uid": self._uid,
                "type": "spend",
                "amount": balance,
                "fromEarn": 0,
                "overdraft": balance,
                "earnDeductions": [],
                "reservationId": None,
                "refunded": False,
                "reason": "e2e G14 synthetic spend (usuwany w tearDown)",
                "submittedBy": "e2e-test",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            })
            self._synthetic_spend_id = ref.id
        return self._fs.get_godzinki_balance(self._uid)

    def test_G14_cancel_overdraft_reservation_restores_exact_balance(self):
        """
        1. Wyzeruj saldo syntetycznym spendem (overdraft)
        2. Rezerwacja 1 dzień × 1 kajak — w całości na kredyt (saldo → -koszt)
        3. Anuluj
        4. Saldo MUSI wrócić do stanu z kroku 1 (błąd L1: saldo rosło o koszt)
        """
        gear_vars_snap = self._fs.get_setup_vars_gear()
        vars_data = gear_vars_snap.get("vars", {})
        rate = float(vars_data.get("godzinki_za_kajak", {}).get("value", 10))

        godzinki_vars = self._fs.get_setup_vars_godzinki()
        gv_map = godzinki_vars.get("vars") or {}
        neg_limit = float((gv_map.get("limit_ujemnego_salda") or {}).get("value", 20))

        if rate <= 0:
            self.skipTest("godzinki_za_kajak <= 0 — rezerwacja darmowa, test nie ma sensu")

        balance_start = self._zero_balance_with_synthetic_spend()
        if balance_start - rate < -neg_limit:
            self.skipTest(
                f"Saldo {balance_start}h - koszt {rate}h przekroczyłoby limit -{neg_limit}h — nie można utworzyć rezerwacji na kredyt"
            )

        kid = GearDiscovery.require_kayak()
        day = (datetime.now(timezone.utc) + timedelta(days=220)).strftime("%Y-%m-%d")

        res_resp = _api.reserve_kayaks(self._token, [kid], day, day)
        self.assertTrue(res_resp.get("ok"), res_resp)
        self._reservation_id = res_resp["reservationId"]
        cost = float(res_resp["costHours"])
        self.assertGreater(cost, 0, "Rezerwacja musi mieć koszt > 0")

        balance_after_reserve = self._fs.get_godzinki_balance(self._uid)
        self.assertAlmostEqual(
            balance_after_reserve, balance_start - cost, places=2,
            msg="Po rezerwacji saldo musi spaść o koszt (rezerwacja na kredyt)",
        )

        cancel_resp = _api.cancel_reservation(self._token, self._reservation_id)
        self.assertTrue(cancel_resp.get("ok"), cancel_resp)
        self._reservation_id = None

        balance_after_cancel = self._fs.get_godzinki_balance(self._uid)
        self.assertAlmostEqual(
            balance_after_cancel, balance_start, places=2,
            msg=(
                f"REGRESJA L1: po anulowaniu saldo={balance_after_cancel}h, oczekiwano {balance_start}h. "
                f"Wynik {balance_start + cost}h oznacza podwójny zwrot overdraftu."
            ),
        )


# ---------------------------------------------------------------------------
# G15 Wykup salda ujemnego — pending nie może przekroczyć długu (poprawka L2)
# ---------------------------------------------------------------------------

class TestGodzinkiPurchasePendingGuard(unittest.TestCase):
    """
    G15 — Suma oczekujących (pending) wykupów nie może przekroczyć długu.

    Regresja błędu L2: stary kod walidował każdy wykup osobno względem salda
    (pending nie zmienia salda) → dwa wykupy po 5h przy długu -5h oba przechodziły,
    a po zatwierdzeniu saldo wychodziło na +5h.

    Rewalidacja przy ZATWIERDZANIU (processApproval) jest pokryta testami
    jednostkowymi (TestWykupRewalidacjaL2 w tests/test_godzinki.py) — e2e wymagałoby
    arkusza testowego.
    """

    _synthetic_spend_id: str | None = None
    _purchase_ids: list

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        self._fs = FirestoreHelper(cfg)
        uid_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not uid_result:
            self.skipTest(f"Użytkownik {cfg.member_user_email} nie istnieje w users_active")
        self._uid, _ = uid_result
        self._purchase_ids = []

    def tearDown(self):
        for pid in self._purchase_ids:
            try:
                self._fs.db.collection("godzinki_ledger").document(pid).delete()
            except Exception:
                pass
        if self._synthetic_spend_id:
            try:
                self._fs.db.collection("godzinki_ledger").document(self._synthetic_spend_id).delete()
            except Exception:
                pass

    def _force_debt(self, debt: float) -> float:
        """Syntetyczny spend doprowadza saldo do ok. -debt. Zwraca saldo po."""
        balance = self._fs.get_godzinki_balance(self._uid)
        overdraft_needed = balance + debt
        if overdraft_needed <= 0:
            return balance  # saldo już wystarczająco ujemne
        ref = self._fs.db.collection("godzinki_ledger").document()
        ref.set({
            "id": ref.id,
            "uid": self._uid,
            "type": "spend",
            "amount": overdraft_needed,
            "fromEarn": 0,
            "overdraft": overdraft_needed,
            "earnDeductions": [],
            "reservationId": None,
            "refunded": False,
            "reason": "e2e G15 synthetic debt (usuwany w tearDown)",
            "submittedBy": "e2e-test",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        })
        self._synthetic_spend_id = ref.id
        return self._fs.get_godzinki_balance(self._uid)

    def test_G15_second_pending_purchase_above_debt_rejected(self):
        """
        1. Doprowadź saldo do ok. -3h
        2. Wykup |saldo| h → ok (pending)
        3. Drugi wykup 1h → MUSI być odrzucony (purchase_exceeds_debt)
        """
        balance = self._force_debt(3)
        if balance >= 0:
            self.skipTest(f"Nie udało się uzyskać ujemnego salda (saldo={balance}h)")

        debt = int(abs(balance))
        if debt < 1:
            self.skipTest(f"Dług {abs(balance)}h za mały na test (wykupy całkowite)")

        resp1 = _api.purchase_godzinki_soft(self._token, debt)
        self.assertTrue(resp1.get("ok"), f"Pierwszy wykup {debt}h w granicach długu musi przejść: {resp1}")
        if resp1.get("recordId"):
            self._purchase_ids.append(resp1["recordId"])

        resp2 = _api.purchase_godzinki_soft(self._token, 1)
        self.assertFalse(resp2.get("ok"), f"REGRESJA L2: drugi wykup ponad dług przeszedł: {resp2}")
        self.assertEqual(resp2.get("code"), "purchase_exceeds_debt", resp2)

        # Saldo bez zmian — pending wykupy nie wchodzą do bilansu
        balance_after = self._fs.get_godzinki_balance(self._uid)
        self.assertAlmostEqual(balance_after, balance, places=2)


# ---------------------------------------------------------------------------
# G16 Kwoty muszą być całkowite (poprawka L6)
# ---------------------------------------------------------------------------

class TestGodzinkiIntegerAmounts(unittest.TestCase):
    """G16 — Ułamkowe kwoty godzinek odrzucane (ochrona przed dryfem float w FIFO)."""

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)

    def test_G16_fractional_submit_rejected(self):
        """POST /api/godzinki/submit z amount=2.5 → 400 validation_failed (must_be_integer)"""
        resp = _api.submit_godzinki_soft(self._token, 2.5, _PAST_DATE, "e2e G16 fractional")
        self.assertFalse(resp.get("ok"), f"Ułamkowa kwota przeszła walidację: {resp}")
        self.assertEqual(resp.get("code"), "validation_failed", resp)
        self.assertEqual((resp.get("fields") or {}).get("amount"), "must_be_integer", resp)

    def test_G16b_fractional_purchase_rejected(self):
        """POST /api/godzinki/purchase z amount=0.5 → 400 validation_failed (must_be_integer)"""
        resp = _api.purchase_godzinki_soft(self._token, 0.5)
        self.assertFalse(resp.get("ok"), f"Ułamkowy wykup przeszedł walidację: {resp}")
        self.assertEqual(resp.get("code"), "validation_failed", resp)
        self.assertEqual((resp.get("fields") or {}).get("amount"), "must_be_integer", resp)


# ---------------------------------------------------------------------------
# Manual approval flow — dokumentacja
# ---------------------------------------------------------------------------

class TestGodzinkiManualApprovalDocumented(unittest.TestCase):
    """
    Scenariusz wymagający ręcznej interwencji — udokumentowany, nie automatyczny.

    Pełny flow zatwierdzania godzinek:
    1. Użytkownik: POST /api/godzinki/submit → tworzy pending earn (approved=false)
       → job jest kolejkowany → rekord trafia do Google Sheets
    2. Zarząd: w Google Sheets zaznacza wiersz jako zatwierdzony
    3. Zarząd: service task "approveGodzinki" przetwarza zatwierdzenia
       → earn.approved = true, earn.approvedAt = now
    4. Użytkownik: GET /api/godzinki → bilans wzrósł

    Krok 2-3 wymaga ręcznego działania lub dodatkowego service task.
    Test ten jest oznaczony @unittest.skip jeśli brak admin credentials.

    WAŻNE: nie możemy w pełni zautomatyzować tego testu bez:
    - API do zatwierdzania godzinek (admina)
    - LUB bezpośredniego zapisu do Firestore (co robi test_G11_approved_earn_increases_balance)
    """

    @unittest.skip("Wymaga ręcznego zatwierdzenia w Google Sheets — przebieg udokumentowany powyżej")
    def test_full_approval_flow_manual(self):
        pass


if __name__ == "__main__":
    unittest.main()
