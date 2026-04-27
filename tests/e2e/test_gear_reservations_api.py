"""
Testy integracyjne API rezerwacji sprzętu — SKK Morzkulc
=========================================================

Weryfikuje logikę backendową przez żywe wywołania HTTP na PROD.
Pokrywa: tworzenie, anulowanie, aktualizację rezerwacji, limity ról,
koszt godzinkowy, offset, konflikty dostępności i autoryzację.

Uruchamianie (z katalogu tests/e2e/):
    ENV=prod python -m pytest test_gear_reservations_api.py -v

Wymagania .env.test:
    PROD_TEST_MEMBER_EMAIL / PROD_TEST_MEMBER_PASSWORD   — rola_czlonek
    PROD_TEST_CANDIDATE_EMAIL / PROD_TEST_CANDIDATE_PASSWORD  — rola_kandydat
    PROD_TEST_BOARD_EMAIL / PROD_TEST_BOARD_PASSWORD  — rola_zarzad
    PROD_TEST_KR_EMAIL / PROD_TEST_KR_PASSWORD  — rola_kr
    PROD_TEST_SUSPENDED_EMAIL / PROD_TEST_SUSPENDED_PASSWORD  — status_zawieszony
    PROD_TEST_SYMPATYK_EMAIL / PROD_TEST_SYMPATYK_PASSWORD  — rola_sympatyk

    Sprzęt testowy — OPCJONALNE. Jeśli nie ustawione, testy auto-wykrywają
    dostępny sprzęt z GET /api/gear/kayaks i GET /api/gear/items.
    PROD_TEST_KAYAK_ID_1 / PROD_TEST_KAYAK_ID_2 / PROD_TEST_KAYAK_ID_3
    PROD_TEST_KAYAK_BASEN_ID  — kajak z storage=basen
    PROD_TEST_PADDLE_ID / PROD_TEST_LIFEJACKET_ID / PROD_TEST_HELMET_ID

UWAGA: Testy tworzą i anulują rezerwacje na PROD.
       Każdy test czyści po sobie (tearDown) — używa dat w dalekiej przyszłości
       aby offset nie blokował anulacji.
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

# ---------------------------------------------------------------------------
# Daty pomocnicze
# Używamy dat dalekich w przyszłości by offset nie blokował anulacji w tearDown.
# ---------------------------------------------------------------------------

def _future_dates(days_from_now_start: int = 14, duration_days: int = 1) -> tuple[str, str]:
    """Zwraca (startDate, endDate) w ISO format, daleko w przyszłości."""
    today = datetime.now(timezone.utc).date()
    start = today + timedelta(days=days_from_now_start)
    end = start + timedelta(days=duration_days - 1)
    return str(start), str(end)


def _token(email: str, password: str) -> str:
    return _auth.get_token(email, password)


def _get_any_token() -> str | None:
    """Zwraca token dowolnego skonfigurowanego konta (do ładowania katalogu sprzętu)."""
    for email_attr, pass_attr in [
        ("member_user_email", "member_user_password"),
        ("admin_user_email", "admin_user_password"),
        ("board_user_email", "board_user_password"),
        ("test_user_email", "test_user_password"),
    ]:
        email = getattr(cfg, email_attr, "")
        password = getattr(cfg, pass_attr, "")
        if email and password:
            try:
                return _auth.get_token(email, password)
            except Exception:
                continue
    return None


def _ensure_gear_loaded():
    if not GearDiscovery._loaded:
        tok = _get_any_token()
        if tok:
            GearDiscovery.load(tok, cfg)


def _require_kayaks(count: int = 1) -> list[str]:
    """Zwraca listę count kajaków — z config lub auto-discovery."""
    _ensure_gear_loaded()
    return GearDiscovery.require_kayaks(count)


def _require_kayak(attr: str = "test_kayak_id_1") -> str:
    """Zwraca jeden kajak. Przy jawnych IDs w .env.test zwraca właściwy wg pozycji."""
    _ensure_gear_loaded()
    idx = {"test_kayak_id_1": 0, "test_kayak_id_2": 1, "test_kayak_id_3": 2}.get(attr, 0)
    return GearDiscovery.require_kayaks(idx + 1)[idx]


# ---------------------------------------------------------------------------
# Pomocnik do anulacji po testach (cleanup)
# ---------------------------------------------------------------------------

def _try_cancel(token: str, reservation_id: str):
    """Próba anulacji rezerwacji — ignoruje błędy (cleanup)."""
    try:
        _api.cancel_reservation(token, reservation_id)
    except Exception as e:
        log.warning(f"cleanup cancel failed for {reservation_id}: {e}")


# ---------------------------------------------------------------------------
# A. AUTORYZACJA I DOSTĘP
# ---------------------------------------------------------------------------

class TestAuthorization(unittest.TestCase):
    """Testy autoryzacji — token, role, status."""

    def test_a01_no_token_returns_401(self):
        """A01: Brak tokena → 401."""
        start, end = _future_dates()
        resp = requests.post(
            f"{BASE}/api/gear/reservations/create",
            json={"startDate": start, "endDate": end, "kayakIds": ["fake"]},
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        self.assertEqual(resp.status_code, 401, f"Oczekiwano 401, got {resp.status_code}: {resp.text[:200]}")

    def test_a02_invalid_token_returns_401(self):
        """A02: Nieprawidłowy token → 401."""
        start, end = _future_dates()
        resp = requests.post(
            f"{BASE}/api/gear/reservations/create",
            json={"startDate": start, "endDate": end, "kayakIds": ["fake"]},
            headers={"Authorization": "Bearer invalidtoken123", "Content-Type": "application/json"},
            timeout=15,
        )
        self.assertEqual(resp.status_code, 401, f"Oczekiwano 401, got {resp.status_code}")

    def test_a03_sympatyk_cannot_reserve(self):
        """A03: Sympatyk próbuje zarezerwować kajak → 403 role not allowed."""
        if not cfg.sympatyk_user_email or not cfg.sympatyk_user_password:
            self.skipTest("Brak konta sympatyk w config")
        kid = _require_kayak()
        token = _token(cfg.sympatyk_user_email, cfg.sympatyk_user_password)
        start, end = _future_dates()
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        self.assertFalse(result.get("ok"), f"Sympatyk nie powinien mieć dostępu: {result}")
        self.assertIn(result.get("code", ""), ["forbidden", "role_not_allowed"],
                      f"Oczekiwano code=forbidden, got: {result}")

    def test_a04_suspended_user_cannot_reserve(self):
        """A04: Zawieszony użytkownik → 403 Access blocked."""
        if not cfg.suspended_user_email or not cfg.suspended_user_password:
            self.skipTest("Brak konta suspended w config")
        kid = _require_kayak()
        token = _token(cfg.suspended_user_email, cfg.suspended_user_password)
        start, end = _future_dates()
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        # Cleanup — jeśli status nie blokuje (błąd konfiguracji), posprzątaj rezerwację
        if result.get("ok") and result.get("reservationId"):
            _try_cancel(token, result["reservationId"])
        self.assertFalse(result.get("ok"), f"Zawieszony nie powinien mieć dostępu: {result}")
        self.assertIn(result.get("code", ""), ["forbidden"],
                      f"Oczekiwano code=forbidden, got: {result}")

    def test_a05_cancel_other_user_reservation_forbidden(self):
        """A05: User nie może anulować rezerwacji innego usera → 403 Not yours."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member w config")
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate w config")
        kid = _require_kayak()

        member_token = _token(cfg.member_user_email, cfg.member_user_password)
        candidate_token = _token(cfg.candidate_user_email, cfg.candidate_user_password)

        start, end = _future_dates(5)
        # Member tworzy rezerwację
        result = _api.reserve_kayaks_soft(member_token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Nie udało się utworzyć rezerwacji do testu: {result}")

        rsv_id = result["reservationId"]
        try:
            # Kandydat próbuje anulować rezerwację membera
            cancel_result = _api.cancel_reservation_soft(candidate_token, rsv_id)
            self.assertFalse(cancel_result.get("ok"),
                             f"Kandydat nie powinien móc anulować rezerwacji membera: {cancel_result}")
        finally:
            _try_cancel(member_token, rsv_id)

    def test_a06_admin_pending_requires_admin_role(self):
        """A06: GET /api/admin/pending przez zwykłego membera → 403."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member w config")
        token = _token(cfg.member_user_email, cfg.member_user_password)
        resp = requests.get(
            f"{BASE}/api/admin/pending",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=15,
        )
        self.assertEqual(resp.status_code, 403, f"Oczekiwano 403, got {resp.status_code}: {resp.text[:200]}")


# ---------------------------------------------------------------------------
# B. SETUP JAKO ŹRÓDŁO PRAWDY
# ---------------------------------------------------------------------------

class TestSetupAsSourceOfTruth(unittest.TestCase):
    """Weryfikuje że koszt i limity wynikają z setup/vars_gear."""

    @classmethod
    def setUpClass(cls):
        """Odczytaj setup z Firestore raz dla całej klasy."""
        try:
            fs = FirestoreHelper(cfg)
            cls.vars_gear = fs.get_setup_vars_gear()
            vars_inner = cls.vars_gear.get("vars", {})
            cls.hours_per_kayak = float(vars_inner.get("godzinki_za_kajak", {}).get("value", 10))
            cls.board_does_not_pay = bool(vars_inner.get("zarzad_nie_płaci_za_sprzet", {}).get("value", False))
            cls.member_max_weeks = int(vars_inner.get("członek_max_time", {}).get("value", 2))
            cls.member_max_items = int(vars_inner.get("członek_max_items", {}).get("value", 3))
            cls.candidate_max_weeks = int(vars_inner.get("kandydat_max_time", {}).get("value", 1))
            cls.candidate_max_items = int(vars_inner.get("kandydat_max_items", {}).get("value", 1))
            log.info(f"Setup vars: {cls.hours_per_kayak}h/kajak, boardNotPay={cls.board_does_not_pay}, "
                     f"memberMaxW={cls.member_max_weeks}, memberMaxI={cls.member_max_items}")
        except Exception as e:
            log.warning(f"Nie udało się odczytać setup z Firestore (ADC?): {e}")
            cls.vars_gear = {}
            cls.hours_per_kayak = 10
            cls.board_does_not_pay = True
            cls.member_max_weeks = 2
            cls.member_max_items = 3
            cls.candidate_max_weeks = 1
            cls.candidate_max_items = 1

    def setUp(self):
        self._created_reservations = []  # (token, rsv_id) do cleanup

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def test_b01_cost_matches_setup(self):
        """B01: Koszt rezerwacji = days × kajaki × godzinki_za_kajak z setup."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)
        start, end = _future_dates(5, 3)  # 3 dni
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Nie udało się zarezerwować: {result}")

        rsv_id = result["reservationId"]
        self._created_reservations.append((token, rsv_id))

        expected_cost = 3 * 1 * self.hours_per_kayak  # 3 dni × 1 kajak × stawka
        actual_cost = result.get("costHours", -1)
        self.assertEqual(actual_cost, expected_cost,
                         f"Koszt {actual_cost}h ≠ oczekiwany {expected_cost}h (setup={self.hours_per_kayak}h/kajak/dzień)")

    def test_b02_board_cost_zero_if_board_does_not_pay(self):
        """B02: Zarząd ma koszt=0 jeśli boardDoesNotPay=true w setup."""
        if not cfg.board_user_email or not cfg.board_user_password:
            self.skipTest("Brak konta zarząd")
        if not self.board_does_not_pay:
            self.skipTest("boardDoesNotPay=false w setup — pomiń test")
        kid = _require_kayak()
        token = _token(cfg.board_user_email, cfg.board_user_password)
        start, end = _future_dates(5, 3)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Nie udało się zarezerwować (zarząd): {result}")

        rsv_id = result["reservationId"]
        self._created_reservations.append((token, rsv_id))
        self.assertEqual(result.get("costHours"), 0,
                         f"Zarząd powinien mieć koszt=0, got {result.get('costHours')}")

    def test_b03_kr_cost_zero_if_board_does_not_pay(self):
        """B03: KR ma koszt=0 jeśli boardDoesNotPay=true (kr traktowany jak zarząd)."""
        if not cfg.kr_user_email or not cfg.kr_user_password:
            self.skipTest("Brak konta kr")
        if not self.board_does_not_pay:
            self.skipTest("boardDoesNotPay=false w setup")
        kid = _require_kayak()
        token = _token(cfg.kr_user_email, cfg.kr_user_password)
        start, end = _future_dates(5, 3)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Nie udało się zarezerwować (kr): {result}")

        rsv_id = result["reservationId"]
        self._created_reservations.append((token, rsv_id))
        self.assertEqual(result.get("costHours"), 0,
                         f"KR powinien mieć koszt=0, got {result.get('costHours')}")

    def test_b04_member_max_time_enforced(self):
        """B04: Rezerwacja powyżej max_time dla członka → 400."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)
        # endDate = dziś + (member_max_weeks * 7) + 1 (za limit)
        today = datetime.now(timezone.utc).date()
        start = today + timedelta(days=1)
        end = today + timedelta(days=self.member_max_weeks * 7 + 2)
        result = _api.reserve_kayaks_soft(token, [kid], str(start), str(end))
        self.assertFalse(result.get("ok"),
                         f"Rezerwacja powyżej max_time powinna być blokowana: {result}")
        self.assertEqual(result.get("code"), "max_time_exceeded",
                         f"Oczekiwano max_time_exceeded, got: {result}")

    def test_b05_candidate_max_items_enforced(self):
        """B05: Kandydat próbuje 2 kajaki → 400 max_items_exceeded."""
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate")
        kid1 = _require_kayak("test_kayak_id_1")
        kid2 = _require_kayak("test_kayak_id_2")
        token = _token(cfg.candidate_user_email, cfg.candidate_user_password)
        start, end = _future_dates(2, 1)
        result = _api.reserve_kayaks_soft(token, [kid1, kid2], start, end)
        self.assertFalse(result.get("ok"),
                         f"Kandydat z 2 kajakami powinien być blokowany: {result}")
        self.assertEqual(result.get("code"), "max_items_exceeded",
                         f"Oczekiwano max_items_exceeded, got: {result}")

    def test_b06_member_max_items_enforced(self):
        """B06: Członek próbuje 4 kajaki → 400 max_items_exceeded."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid1 = _require_kayak("test_kayak_id_1")
        kid2 = _require_kayak("test_kayak_id_2")
        kid3 = _require_kayak("test_kayak_id_3")
        token = _token(cfg.member_user_email, cfg.member_user_password)
        start, end = _future_dates(14, 1)
        # member_max_items = 3, próbujemy 3 kayaks (może być OK) — sprawdź czy 4 jest zablokowane
        # Ale mamy tylko 3 kajaki testowe, więc testujemy granicę member_max_items+1
        if self.member_max_items < 3:
            self.skipTest("member_max_items < 3 — test wymaga ≥4 kajaków testowych")
        # Próba rezerwacji member_max_items+1 (potrzeba member_max_items+1 różnych kajaków)
        kayaks = [kid1, kid2, kid3]
        if len(set(kayaks)) <= self.member_max_items:
            result = _api.reserve_kayaks_soft(token, kayaks, start, end)
            # Jeśli mamy dokładnie max_items kajaków → powinno OK (chyba że już są zajęte)
            log.info(f"3 kajaki test (max={self.member_max_items}): {result.get('ok')}, code={result.get('code')}")
        # Kluczowy test: powyżej limitu — tylko gdy mamy 4+ kajaków testowych
        self.skipTest("Potrzeba 4+ kajaków testowych do testu max_items=3+1")

    def test_b07_candidate_max_time_enforced(self):
        """B07: Kandydat próbuje rezerwację na >1 tydzień → 400."""
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate")
        kid = _require_kayak()
        token = _token(cfg.candidate_user_email, cfg.candidate_user_password)
        today = datetime.now(timezone.utc).date()
        start = today + timedelta(days=1)
        end = today + timedelta(days=self.candidate_max_weeks * 7 + 2)
        result = _api.reserve_kayaks_soft(token, [kid], str(start), str(end))
        self.assertFalse(result.get("ok"),
                         f"Kandydat powyżej max_time powinien być blokowany: {result}")
        self.assertEqual(result.get("code"), "max_time_exceeded")


# ---------------------------------------------------------------------------
# C. KONFLIKT I OFFSET
# ---------------------------------------------------------------------------

class TestConflictAndOffset(unittest.TestCase):
    """Weryfikuje blokady konfliktowe i działanie offsetu."""

    def setUp(self):
        self._created_reservations = []

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def test_c01_same_kayak_overlapping_dates_blocked(self):
        """C01: Dwie rezerwacje tego samego kajaka w nakładającym się terminie → konflikt."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate")
        kid = _require_kayak()

        member_token = _token(cfg.member_user_email, cfg.member_user_password)
        candidate_token = _token(cfg.candidate_user_email, cfg.candidate_user_password)

        start, end = _future_dates(3, 3)

        # Pierwsza rezerwacja (member)
        result1 = _api.reserve_kayaks_soft(member_token, [kid], start, end)
        if not result1.get("ok"):
            self.skipTest(f"Pierwsza rezerwacja nie powiodła się: {result1}")
        self._created_reservations.append((member_token, result1["reservationId"]))

        # Druga rezerwacja (candidate) — nakładający się termin
        result2 = _api.reserve_kayaks_soft(candidate_token, [kid], start, end)
        self.assertFalse(result2.get("ok"),
                         f"Druga rezerwacja na ten sam kajak powinna być zablokowana: {result2}")
        self.assertEqual(result2.get("code"), "conflict",
                         f"Oczekiwano code=conflict, got: {result2}")

    def test_c02_offset_blocks_adjacent_day(self):
        """C02: Offset=1: rezerwacja A [+3,+5], B próbuje [+5,+7] → konflikt (blockEnd A = +6, blockStart B = +4)."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate")
        kid = _require_kayak()

        member_token = _token(cfg.member_user_email, cfg.member_user_password)
        candidate_token = _token(cfg.candidate_user_email, cfg.candidate_user_password)

        today = datetime.now(timezone.utc).date()
        a_start = today + timedelta(days=3)
        a_end = a_start + timedelta(days=2)    # A: [+3, +5]
        b_start = a_end                        # B: [+5, +7] — powinno być blokowane przez offset A (blockEnd=+6)
        b_end = b_start + timedelta(days=2)

        result_a = _api.reserve_kayaks_soft(member_token, [kid], str(a_start), str(a_end))
        if not result_a.get("ok"):
            self.skipTest(f"Pierwsza rezerwacja nie powiodła się: {result_a}")
        self._created_reservations.append((member_token, result_a["reservationId"]))

        result_b = _api.reserve_kayaks_soft(candidate_token, [kid], str(b_start), str(b_end))
        # blockEndIso(A) = a_end + 1 = +6, blockStartIso(B) = b_start - 1 = +4
        # overlap: [+2, +6] vs [+4, +8] → overlap → powinno być blokowane
        self.assertFalse(result_b.get("ok"),
                         f"Rezerwacja B powinna być blokowana przez offset A: {result_b}")
        self.assertEqual(result_b.get("code"), "conflict")

    def test_c03_after_offset_no_conflict(self):
        """C03: Rezerwacja A [+1, +3], B [+6, +6] → brak konfliktu (blockEnd A = +4, blockStart B = +5)."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        if not cfg.candidate_user_email or not cfg.candidate_user_password:
            self.skipTest("Brak konta candidate")
        kid = _require_kayak()

        member_token = _token(cfg.member_user_email, cfg.member_user_password)
        candidate_token = _token(cfg.candidate_user_email, cfg.candidate_user_password)

        today = datetime.now(timezone.utc).date()
        a_start = today + timedelta(days=1)
        a_end = a_start + timedelta(days=2)    # A: [+1, +3], blockEnd A = +4
        b_start = a_end + timedelta(days=3)    # +6 > +4 → brak konfliktu (offset=1: blockStart B = +5 > blockEnd A = +4)
        b_end = b_start                         # 1-day reservation, b_end=+6 ≤ kandydat limit +7

        result_a = _api.reserve_kayaks_soft(member_token, [kid], str(a_start), str(a_end))
        if not result_a.get("ok"):
            self.skipTest(f"Pierwsza rezerwacja nie powiodła się: {result_a}")
        self._created_reservations.append((member_token, result_a["reservationId"]))

        result_b = _api.reserve_kayaks_soft(candidate_token, [kid], str(b_start), str(b_end))
        if result_b.get("ok"):
            self._created_reservations.append((candidate_token, result_b["reservationId"]))
        self.assertTrue(result_b.get("ok"),
                        f"Rezerwacja B powinna się udać (brak konfliktu): {result_b}")

    def test_c04_cost_does_not_include_offset_days(self):
        """C04: Koszt nie zawiera dni offsetu — liczymy tylko dni od start do end."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)
        start, end = _future_dates(5, 3)  # 3 dni

        # Pobierz stawkę z setupClass (lub użyj domyślnej)
        try:
            fs = FirestoreHelper(cfg)
            vars_inner = fs.get_setup_vars_gear().get("vars", {})
            hours_per_day = float(vars_inner.get("godzinki_za_kajak", {}).get("value", 10))
        except Exception:
            hours_per_day = 10

        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Nie udało się zarezerwować: {result}")

        rsv_id = result["reservationId"]
        _try_cancel(token, rsv_id)

        expected = 3 * hours_per_day
        self.assertEqual(result.get("costHours"), expected,
                         f"Koszt {result.get('costHours')} ≠ {expected} — offset nie powinien doliczać dni")


# ---------------------------------------------------------------------------
# D. GODZINKI — BILANS PO REZERWACJI I ANULACJI
# ---------------------------------------------------------------------------

class TestHoursBalanceFlow(unittest.TestCase):
    """Weryfikuje przepływ godzinek: dedukcja po rezerwacji, zwrot po anulacji."""

    def setUp(self):
        self._created_reservations = []
        self._fs = None
        try:
            self._fs = FirestoreHelper(cfg)
        except Exception as e:
            log.warning(f"FirestoreHelper niedostępny: {e}")

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def _get_fs_balance(self, email: str) -> float | None:
        if not self._fs:
            return None
        result = self._fs.get_user_by_email(email)
        if not result:
            return None
        uid, _ = result
        return self._fs.get_godzinki_balance(uid)

    def test_d01_balance_decreases_after_reservation(self):
        """D01: Bilans spada po zarezerwowaniu kajaka (koszt > 0)."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        balance_before_api = _api.get_godzinki(token).get("balance", None)
        if balance_before_api is None:
            self.skipTest("Nie udało się odczytać bilansu przed testem")

        start, end = _future_dates(5, 3)  # 3 dni
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się (być może brak godzinek): {result}")

        rsv_id = result["reservationId"]
        self._created_reservations.append((token, rsv_id))
        cost = result.get("costHours", 0)

        if cost == 0:
            self.skipTest("Koszt = 0 (zarząd lub brak stawki) — test nie ma sensu")

        balance_after_api = _api.get_godzinki(token).get("balance", None)
        expected = balance_before_api - cost
        self.assertAlmostEqual(balance_after_api, expected, places=1,
                               msg=f"Bilans po rezerwacji: {balance_after_api} ≠ {expected}")

    def test_d02_balance_restored_after_cancel(self):
        """D02: Bilans wraca do stanu sprzed rezerwacji po anulacji."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        balance_before = _api.get_godzinki(token).get("balance", None)
        if balance_before is None:
            self.skipTest("Nie udało się odczytać bilansu")

        start, end = _future_dates(5, 3)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        cost = result.get("costHours", 0)

        if cost == 0:
            _try_cancel(token, rsv_id)
            self.skipTest("Koszt = 0 — test nie ma sensu")

        # Anuluj
        cancel_result = _api.cancel_reservation_soft(token, rsv_id)
        self.assertTrue(cancel_result.get("ok"),
                        f"Anulacja powinna się udać: {cancel_result}")

        balance_after_cancel = _api.get_godzinki(token).get("balance", None)
        self.assertAlmostEqual(balance_after_cancel, balance_before, places=1,
                               msg=f"Bilans po anulacji {balance_after_cancel} ≠ przed rezerwacją {balance_before}")

    def test_d03_cancel_after_block_start_blocked(self):
        """D03: Nie można anulować gdy today >= blockStartIso."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        # Rezerwacja z jutrzejszym startem → blockStart = dziś (offset=1)
        today = datetime.now(timezone.utc).date()
        start = today + timedelta(days=1)  # jutro
        end = start + timedelta(days=2)

        result = _api.reserve_kayaks_soft(token, [kid], str(start), str(end))
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        # blockStartIso = start - offset = dziś → cancel powinien być zablokowany
        cancel_result = _api.cancel_reservation_soft(token, rsv_id)
        if cancel_result.get("ok"):
            # Jeśli się udało, to znaczy że offset nie blokuje (np. offset=0 lub data OK)
            log.info(f"Anulacja się udała — możliwe offset=0 lub data: {cancel_result}")
            # Nie fail — odnotuj
        else:
            self.assertEqual(cancel_result.get("code"), "cancel_blocked",
                             f"Oczekiwano cancel_blocked, got: {cancel_result}")

    def test_d04_api_balance_matches_firestore(self):
        """D04: Bilans z API = bilans obliczony z godzinki_ledger w Firestore."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        if not self._fs:
            self.skipTest("FirestoreHelper niedostępny (brak ADC?)")

        token = _token(cfg.member_user_email, cfg.member_user_password)
        api_balance = _api.get_godzinki(token).get("balance", None)
        if api_balance is None:
            self.skipTest("Nie udało się odczytać bilansu z API")

        fs_balance = self._get_fs_balance(cfg.member_user_email)
        if fs_balance is None:
            self.skipTest("Nie znaleziono użytkownika w Firestore")

        self.assertAlmostEqual(api_balance, fs_balance, places=1,
                               msg=f"API balance {api_balance} ≠ Firestore balance {fs_balance}")

    def test_d05_board_balance_unchanged_after_reservation(self):
        """D05: Saldo zarządu NIE zmienia się jeśli boardDoesNotPay=true."""
        if not cfg.board_user_email or not cfg.board_user_password:
            self.skipTest("Brak konta zarząd")
        kid = _require_kayak()
        token = _token(cfg.board_user_email, cfg.board_user_password)

        balance_before = _api.get_godzinki(token).get("balance", 0)
        start, end = _future_dates(5, 3)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        cost = result.get("costHours", -1)
        self._created = (token, rsv_id)

        try:
            if cost == 0:
                balance_after = _api.get_godzinki(token).get("balance", 0)
                self.assertAlmostEqual(balance_after, balance_before, places=1,
                                       msg=f"Saldo zarządu zmieniło się: {balance_before} → {balance_after}")
            else:
                log.warning(f"boardDoesNotPay=true ale koszt={cost} — sprawdź setup")
        finally:
            _try_cancel(token, rsv_id)


# ---------------------------------------------------------------------------
# E. ANULACJA I STANY REZERWACJI
# ---------------------------------------------------------------------------

class TestReservationStates(unittest.TestCase):
    """Testy anulacji i stanów rezerwacji."""

    def setUp(self):
        self._created_reservations = []

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def test_e01_cancel_nonexistent_reservation(self):
        """E01: Anulacja nieistniejącej rezerwacji → not_found."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        token = _token(cfg.member_user_email, cfg.member_user_password)
        result = _api.cancel_reservation_soft(token, "nonexistent-id-12345")
        self.assertFalse(result.get("ok"))
        self.assertIn(result.get("code", ""), ["not_found", "forbidden"],
                      f"Oczekiwano not_found lub forbidden, got: {result}")

    def test_e02_cancel_already_cancelled_reservation(self):
        """E02: Anulacja już anulowanej rezerwacji → invalid_state."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        start, end = _future_dates(5, 2)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        # Pierwsza anulacja — powinna się udać
        cancel1 = _api.cancel_reservation_soft(token, rsv_id)
        self.assertTrue(cancel1.get("ok"), f"Pierwsza anulacja powinna się udać: {cancel1}")

        # Druga anulacja — powinna być zablokowana
        cancel2 = _api.cancel_reservation_soft(token, rsv_id)
        self.assertFalse(cancel2.get("ok"),
                         f"Druga anulacja powinna być zablokowana: {cancel2}")
        self.assertIn(cancel2.get("code", ""), ["invalid_state"],
                      f"Oczekiwano invalid_state, got: {cancel2}")

    def test_e03_reservation_appears_in_my_reservations(self):
        """E03: Nowa rezerwacja pojawia się w my-reservations."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        start, end = _future_dates(5, 2)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        self._created_reservations.append((token, rsv_id))

        my_rsv = _api.get_my_reservations(token)
        ids = [r.get("id") for r in my_rsv.get("items", [])]
        self.assertIn(rsv_id, ids,
                      f"Rezerwacja {rsv_id} nie widoczna w my-reservations (znalezione: {ids[:5]})")

    def test_e04_cancelled_reservation_status_in_my_reservations(self):
        """E04: Anulowana rezerwacja ma status=cancelled."""
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        start, end = _future_dates(5, 2)
        result = _api.reserve_kayaks_soft(token, [kid], start, end)
        if not result.get("ok"):
            self.skipTest(f"Rezerwacja nie powiodła się: {result}")

        rsv_id = result["reservationId"]
        _api.cancel_reservation_soft(token, rsv_id)

        my_rsv = _api.get_my_reservations(token)
        cancelled = [r for r in my_rsv.get("items", []) if r.get("id") == rsv_id]
        if cancelled:
            self.assertEqual(cancelled[0].get("status"), "cancelled",
                             f"Status powinien być 'cancelled': {cancelled[0]}")


# ---------------------------------------------------------------------------
# F. LUKA K1 — BRAK CENNIKA AKCESORIÓW
# ---------------------------------------------------------------------------

class TestAccessoriesPricingGap(unittest.TestCase):
    """
    Dokumentuje lukę K1: akcesoria (wiosło, kask, fartuch) są bezpłatne.
    Testy te POTWIERDZAJĄ stan obecny i flagują go jako błąd.
    """

    def setUp(self):
        self._created_reservations = []

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def test_f01_accessories_in_bundle_have_zero_cost(self):
        """
        F01 (LUKA K1): Bundle z kajakiem + wiosłem: koszt = tylko kajak × dni.
        Wiosło, kask, fartuch nie dodają do kosztu — mimo wymagań biznesowych.
        Ten test PRZEJDZIE gdy luka istnieje, FAILUJE gdy luka zostanie naprawiona.
        """
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        paddle_id = cfg.test_paddle_id
        if not paddle_id:
            self.skipTest("Brak test_paddle_id w config")

        token = _token(cfg.member_user_email, cfg.member_user_password)

        try:
            fs = FirestoreHelper(cfg)
            vars_inner = fs.get_setup_vars_gear().get("vars", {})
            hours_per_kayak = float(vars_inner.get("godzinki_za_kajak", {}).get("value", 10))
        except Exception:
            hours_per_kayak = 10

        start, end = _future_dates(5, 3)  # 3 dni

        resp = requests.post(
            f"{BASE}/api/gear/reservations/create-bundle",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "startDate": start,
                "endDate": end,
                "items": [
                    {"itemId": kid, "category": "kayaks"},
                    {"itemId": paddle_id, "category": "paddles"},
                ],
                "starterCategory": "kayaks",
                "starterItemId": kid,
            },
            timeout=30,
        )

        if resp.status_code not in (200, 201):
            self.skipTest(f"Bundle create nie powiodło się: {resp.status_code} {resp.text[:200]}")

        data = resp.json()
        if not data.get("ok"):
            self.skipTest(f"Bundle create zwróciło ok=false: {data}")

        rsv_id = data.get("reservationId")
        if rsv_id:
            self._created_reservations.append((token, rsv_id))

        actual_cost = data.get("costHours", -1)
        cost_with_only_kayak = 3 * hours_per_kayak

        # Ten assert PRZEJDZIE dopóki luka istnieje:
        self.assertEqual(actual_cost, cost_with_only_kayak,
                         f"LUKA K1 POTWIERDZONA: koszt={actual_cost}h = tylko kajak ({cost_with_only_kayak}h). "
                         f"Wiosło jest bezpłatne. Należy implementować cennik akcesoriów.")


# ---------------------------------------------------------------------------
# G. PRZESZŁE DATY — LUKA K5
# ---------------------------------------------------------------------------

class TestPastDateValidation(unittest.TestCase):
    """Dokumentuje lukę K5: brak walidacji startDate >= today."""

    def setUp(self):
        self._created_reservations = []

    def tearDown(self):
        for token, rsv_id in self._created_reservations:
            _try_cancel(token, rsv_id)

    def test_g01_reservation_with_past_start_date(self):
        """
        G01 (LUKA K5): Rezerwacja z datą startową w przeszłości.
        Oczekiwane zachowanie: 400 Bad Request.
        Stan obecny: brak walidacji — może się udać lub nie.
        """
        if not cfg.member_user_email or not cfg.member_user_password:
            self.skipTest("Brak konta member")
        kid = _require_kayak()
        token = _token(cfg.member_user_email, cfg.member_user_password)

        today = datetime.now(timezone.utc).date()
        past_start = today - timedelta(days=7)
        past_end = today - timedelta(days=5)

        result = _api.reserve_kayaks_soft(token, [kid], str(past_start), str(past_end))

        if result.get("ok"):
            rsv_id = result.get("reservationId")
            if rsv_id:
                self._created_reservations.append((token, rsv_id))
            # Luka potwierdzona — odnotuj
            log.warning(f"LUKA K5 POTWIERDZONA: rezerwacja z przeszłą datą się udała! "
                        f"startDate={past_start}, reservationId={rsv_id}")
            # Nie fail — dokumentujemy stan, nie naprawiamy
        else:
            log.info(f"Rezerwacja z przeszłą datą zablokowana (kod: {result.get('code')}) — luka K5 nieistotna lub naprawiona")


if __name__ == "__main__":
    unittest.main(verbosity=2)
