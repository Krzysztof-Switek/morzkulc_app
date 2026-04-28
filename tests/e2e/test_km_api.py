"""
Testy integracyjne API kilometrówki — SKK Morzkulc
====================================================

Weryfikuje endpointy km przez żywe wywołania HTTP:
  POST /api/km/log/add      — dodaj wpis aktywności
  GET  /api/km/logs         — moje wpisy
  GET  /api/km/stats        — moje statystyki
  GET  /api/km/rankings     — ranking (type, period, specificYear)
  GET  /api/km/places       — podpowiedzi akwenów
  GET  /api/km/map-data     — dane mapy
  GET  /api/km/event-stats  — statystyki wywrotolotek per impreza

Pokrywa kategorie:
  SEC — autoryzacja (401 bez tokena, 401 zły token)
  FA  — walidacja i zapis wpisu (6 typów akwenu, walidacja dat/km/hoursOnWater/trudności)
  ML  — moje logi (sortowanie, limit, izolacja per uid)
  MS  — moje statystyki (struktura, null dla nowego użytkownika)
  RK  — ranking (type, period, limit, struktura entry)
  RW  — ranking per konkretny rok (specificYear)
  PL  — podpowiedzi akwenów (min długość query, limit)
  MP  — dane mapy (struktura odpowiedzi)
  EV  — event-stats (agregacja, brak eventId → 400, nieznany eventId → pusta lista)

Uruchamianie (z katalogu tests/e2e/):
    ENV=dev python -m pytest test_km_api.py -v
    ENV=dev python -m pytest test_km_api.py::TestKmSecurity -v

Wymagania .env.test (lub zmienne środowiskowe):
    DEV_TEST_MEMBER_EMAIL / DEV_TEST_MEMBER_PASSWORD  — rola_czlonek lub wyżej, status_aktywny
    DEV_TEST_BOARD_EMAIL  / DEV_TEST_BOARD_PASSWORD   — rola_zarzad (opcjonalne, do multi-user testów)

UWAGA: Testy tworzące wpisy km_logs oznaczają je note="autotest-km" + uuid.
       Cleanup usuwa te wpisy z Firestore po każdej klasie przez tearDownClass.
       Dane km_user_stats NIE są resetowane — testy muszą zakładać istniejące dane.
"""
import os
import sys
import uuid
import unittest
import logging
import requests
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

from config import ACTIVE as cfg
from helpers.firebase_auth import FirebaseAuthHelper
from helpers.api_helper import ApiHelper
from helpers.firestore_helper import FirestoreHelper

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_auth = FirebaseAuthHelper(cfg)
_api = ApiHelper(cfg)
_fs = FirestoreHelper(cfg)
BASE = cfg.app_base_url.rstrip("/")

_TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
_YESTERDAY = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
_TOMORROW = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
_YEAR_2025 = "2025-06-15"  # data historyczna do testów specificYear

_TEST_TAG = "autotest-km"


def _valid_log_body(**overrides) -> dict:
    """Minimalne poprawne body dla POST /api/km/log/add."""
    base = {
        "date": _YESTERDAY,
        "waterType": "mountains",
        "placeName": f"Autotest Rzeka {uuid.uuid4().hex[:6]}",
        "km": 10.0,
        "hoursOnWater": 2.0,
        "capsizeRolls": {"kabina": 0, "rolka": 0, "dziubek": 0},
        "note": _TEST_TAG,
    }
    base.update(overrides)
    return base


def _skip_if_missing(*attrs):
    missing = [a for a in attrs if not getattr(cfg, a, "")]
    if missing:
        return f"Missing config: {', '.join(missing)}"
    return None


def _cleanup_km_logs(uid: str):
    """Usuwa z Firestore km_logs stworzone przez testy (note == _TEST_TAG)."""
    try:
        snaps = (
            _fs.db.collection("km_logs")
            .where("uid", "==", uid)
            .where("note", "==", _TEST_TAG)
            .get()
        )
        for snap in snaps:
            snap.reference.delete()
        log.info(f"Cleanup: usunięto {len(list(snaps))} testowych km_logs dla uid={uid}")
    except Exception as e:
        log.warning(f"Cleanup km_logs error: {e}")


# ---------------------------------------------------------------------------
# SEC — Autoryzacja
# ---------------------------------------------------------------------------

class TestKmSecurity(unittest.TestCase):
    """
    SEC-01..07 — endpointy km wymagają prawidłowego tokenu Bearer.
    """

    def _assert_401(self, resp: requests.Response, label: str):
        self.assertEqual(resp.status_code, 401, f"{label}: {resp.text[:300]}")

    def test_SEC01_add_log_no_token_401(self):
        resp = requests.post(f"{BASE}/api/km/log/add", json=_valid_log_body(), timeout=10)
        self._assert_401(resp, "SEC-01 add_log no token")

    def test_SEC02_rankings_no_token_401(self):
        resp = requests.get(f"{BASE}/api/km/rankings", timeout=10)
        self._assert_401(resp, "SEC-02 rankings no token")

    def test_SEC03_my_logs_no_token_401(self):
        resp = requests.get(f"{BASE}/api/km/logs", timeout=10)
        self._assert_401(resp, "SEC-03 my_logs no token")

    def test_SEC04_my_stats_no_token_401(self):
        resp = requests.get(f"{BASE}/api/km/stats", timeout=10)
        self._assert_401(resp, "SEC-04 my_stats no token")

    def test_SEC05_places_no_token_401(self):
        resp = requests.get(f"{BASE}/api/km/places", params={"q": "test"}, timeout=10)
        self._assert_401(resp, "SEC-05 places no token")

    def test_SEC06_event_stats_no_token_401(self):
        resp = requests.get(f"{BASE}/api/km/event-stats", params={"eventId": "x"}, timeout=10)
        self._assert_401(resp, "SEC-06 event_stats no token")

    def test_SEC07_add_log_bad_token_401(self):
        resp = requests.post(
            f"{BASE}/api/km/log/add",
            headers={"Authorization": "Bearer not_a_real_token", "Content-Type": "application/json"},
            json=_valid_log_body(),
            timeout=10,
        )
        self._assert_401(resp, "SEC-07 add_log bad token")

    def test_SEC07b_rankings_bad_token_401(self):
        resp = requests.get(
            f"{BASE}/api/km/rankings",
            headers={"Authorization": "Bearer not_a_real_token"},
            timeout=10,
        )
        self._assert_401(resp, "SEC-07b rankings bad token")


# ---------------------------------------------------------------------------
# FA — Dodawanie aktywności (happy path — wszystkie typy akwenu)
# ---------------------------------------------------------------------------

class TestKmAddLogHappyPath(unittest.TestCase):
    """
    FA-01..06 — każdy z 6 typów akwenu daje HTTP 200 z {ok: true, logId}.
    """

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        # pobierz uid przez my_stats (żeby wiedzieć co czyścić)
        result = _api.km_my_stats(cls.token)
        stats = result.get("stats") or {}
        cls.uid = stats.get("uid") or ""
        # jeśli stats=null (nowy użytkownik) — pobierz uid z Firestore
        if not cls.uid:
            fs_user = _fs.get_user_by_email(cfg.member_user_email)
            cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def _add_and_assert(self, body: dict, label: str) -> str:
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"{label}: {result}")
        log_id = result.get("logId", "")
        self.assertTrue(log_id, f"{label}: brak logId w odpowiedzi")
        self.created_log_ids.append(log_id)
        return log_id

    def test_FA01_mountains(self):
        body = _valid_log_body(
            waterType="mountains", km=15.5, hoursOnWater=3.0,
            difficultyScale="WW", difficulty="WW3",
        )
        self._add_and_assert(body, "FA-01 mountains")

    def test_FA02_lowlands(self):
        body = _valid_log_body(
            waterType="lowlands", km=8.0, hoursOnWater=2.5,
            difficultyScale="U", difficulty="U2",
        )
        self._add_and_assert(body, "FA-02 lowlands")

    def test_FA03_sea(self):
        body = _valid_log_body(waterType="sea", km=20.0, hoursOnWater=4.0)
        self._add_and_assert(body, "FA-03 sea")

    def test_FA04_track(self):
        body = _valid_log_body(waterType="track", km=10.0, hoursOnWater=1.0)
        self._add_and_assert(body, "FA-04 track")

    def test_FA05_pool(self):
        body = _valid_log_body(waterType="pool", km=3.0, hoursOnWater=1.5)
        self._add_and_assert(body, "FA-05 pool")

    def test_FA06_playspot_km_zero(self):
        """km=0 jest dozwolone dla playspot (KROK 0)."""
        body = _valid_log_body(waterType="playspot", km=0, hoursOnWater=2.0)
        self._add_and_assert(body, "FA-06 playspot km=0")

    def test_FA14_km_zero_mountains(self):
        """km=0 jest dozwolone dla każdego typu akwenu (playspot to minimum sens, ale backend go akceptuje)."""
        body = _valid_log_body(waterType="mountains", km=0, hoursOnWater=1.0)
        self._add_and_assert(body, "FA-14 mountains km=0")


# ---------------------------------------------------------------------------
# FA — Walidacja daty
# ---------------------------------------------------------------------------

class TestKmAddLogDateValidation(unittest.TestCase):
    """FA-07..09 — walidacja pola date."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def _assert_validation_error(self, body: dict, label: str):
        result = _api.km_add_log_soft(self.token, body)
        self.assertFalse(result.get("ok"), f"{label}: oczekiwano ok=false, dostano: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"{label}: {result}")

    def test_FA07_missing_date(self):
        body = _valid_log_body()
        del body["date"]
        self._assert_validation_error(body, "FA-07 brak date")

    def test_FA08_invalid_date_format(self):
        body = _valid_log_body(date="2026-13-01")
        self._assert_validation_error(body, "FA-08 zły format daty")

    def test_FA09_future_date(self):
        body = _valid_log_body(date=_TOMORROW)
        self._assert_validation_error(body, "FA-09 data z przyszłości")

    def test_FA08b_non_date_string(self):
        body = _valid_log_body(date="nie-data")
        self._assert_validation_error(body, "FA-08b string zamiast daty")


# ---------------------------------------------------------------------------
# FA — Walidacja waterType i placeName
# ---------------------------------------------------------------------------

class TestKmAddLogFieldValidation(unittest.TestCase):
    """FA-10..11, FA-28 — walidacja waterType i placeName."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def _assert_validation_error(self, body: dict, label: str):
        result = _api.km_add_log_soft(self.token, body)
        self.assertFalse(result.get("ok"), f"{label}: oczekiwano ok=false, dostano: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"{label}: {result}")

    def test_FA10_invalid_water_type(self):
        body = _valid_log_body(waterType="river")
        self._assert_validation_error(body, "FA-10 waterType nieznany")

    def test_FA11_empty_water_type(self):
        body = _valid_log_body(waterType="")
        self._assert_validation_error(body, "FA-11 waterType pusty")

    def test_FA28_empty_place_name(self):
        body = _valid_log_body(placeName="")
        self._assert_validation_error(body, "FA-28 placeName pusty")


# ---------------------------------------------------------------------------
# FA — Walidacja km
# ---------------------------------------------------------------------------

class TestKmAddLogKmValidation(unittest.TestCase):
    """FA-12..13 — walidacja pola km."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def _assert_validation_error(self, body: dict, label: str):
        result = _api.km_add_log_soft(self.token, body)
        self.assertFalse(result.get("ok"), f"{label}: oczekiwano ok=false, dostano: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"{label}: {result}")

    def test_FA12_negative_km(self):
        body = _valid_log_body(km=-1)
        self._assert_validation_error(body, "FA-12 km ujemne")

    def test_FA13_km_over_limit(self):
        body = _valid_log_body(km=10000)
        self._assert_validation_error(body, "FA-13 km > 9999")


# ---------------------------------------------------------------------------
# FA — Walidacja hoursOnWater
# ---------------------------------------------------------------------------

class TestKmAddLogHoursValidation(unittest.TestCase):
    """FA-15..19 — hoursOnWater wymagane, zakres 0..99."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        cls.uid = ""
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        if fs_user:
            cls.uid = fs_user[0]
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def _assert_validation_error(self, body: dict, label: str):
        result = _api.km_add_log_soft(self.token, body)
        self.assertFalse(result.get("ok"), f"{label}: oczekiwano ok=false, dostano: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"{label}: {result}")

    def test_FA15_missing_hours(self):
        body = _valid_log_body()
        del body["hoursOnWater"]
        self._assert_validation_error(body, "FA-15 brak hoursOnWater")

    def test_FA16_null_hours(self):
        body = _valid_log_body(hoursOnWater=None)
        self._assert_validation_error(body, "FA-16 hoursOnWater=null")

    def test_FA17_negative_hours(self):
        body = _valid_log_body(hoursOnWater=-0.5)
        self._assert_validation_error(body, "FA-17 hoursOnWater ujemne")

    def test_FA18_hours_over_limit(self):
        body = _valid_log_body(hoursOnWater=100)
        self._assert_validation_error(body, "FA-18 hoursOnWater > 99")

    def test_FA19_zero_hours_ok(self):
        """hoursOnWater=0 jest dozwolone (KROK 1)."""
        body = _valid_log_body(hoursOnWater=0)
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"FA-19: {result}")
        if result.get("logId"):
            self.created_log_ids.append(result["logId"])


# ---------------------------------------------------------------------------
# FA — Walidacja trudności
# ---------------------------------------------------------------------------

class TestKmAddLogDifficultyValidation(unittest.TestCase):
    """FA-20..24 — walidacja difficultyScale / difficulty."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        cls.uid = ""
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        if fs_user:
            cls.uid = fs_user[0]
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def _assert_validation_error(self, body: dict, label: str):
        result = _api.km_add_log_soft(self.token, body)
        self.assertFalse(result.get("ok"), f"{label}: oczekiwano ok=false, dostano: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"{label}: {result}")

    def test_FA20_mountains_wrong_scale(self):
        body = _valid_log_body(waterType="mountains", difficultyScale="U", difficulty="U2")
        self._assert_validation_error(body, "FA-20 mountains ze skalą U")

    def test_FA21_lowlands_wrong_scale(self):
        body = _valid_log_body(waterType="lowlands", difficultyScale="WW", difficulty="WW3")
        self._assert_validation_error(body, "FA-21 lowlands ze skalą WW")

    def test_FA22_unknown_ww_level(self):
        body = _valid_log_body(waterType="mountains", difficultyScale="WW", difficulty="WW9")
        self._assert_validation_error(body, "FA-22 nieznany poziom WW9")

    def test_FA23_sea_with_difficulty(self):
        body = _valid_log_body(waterType="sea", difficulty="WW3")
        self._assert_validation_error(body, "FA-23 sea z difficulty")

    def test_FA24_mountains_no_difficulty_ok(self):
        """Brak difficultyScale jest OK — trudność jest opcjonalna."""
        body = _valid_log_body(waterType="mountains")
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"FA-24: {result}")
        if result.get("logId"):
            self.created_log_ids.append(result["logId"])


# ---------------------------------------------------------------------------
# FA — Wywrotolotek
# ---------------------------------------------------------------------------

class TestKmAddLogCapsizeRolls(unittest.TestCase):
    """FA-25..26 — capsizeRolls zapis w Firestore."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def test_FA25_capsize_rolls_saved(self):
        """Wywrotolotek zapisany w Firestore z poprawnymi wartościami."""
        body = _valid_log_body(
            waterType="mountains",
            capsizeRolls={"kabina": 2, "rolka": 1, "dziubek": 0},
        )
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"FA-25 zapis: {result}")
        log_id = result.get("logId", "")
        self.assertTrue(log_id, "FA-25: brak logId")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        self.assertTrue(snap.exists, "FA-25: log_id nie istnieje w Firestore")
        data = snap.to_dict()
        rolls = data.get("capsizeRolls", {})
        self.assertEqual(rolls.get("kabina"), 2, f"FA-25 kabina: {data}")
        self.assertEqual(rolls.get("rolka"), 1, f"FA-25 rolka: {data}")
        self.assertEqual(rolls.get("dziubek"), 0, f"FA-25 dziubek: {data}")

    def test_FA26_missing_capsize_rolls_defaults_to_zero(self):
        """Brak capsizeRolls w body → backend zapisuje zera."""
        body = _valid_log_body()
        del body["capsizeRolls"]
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"FA-26: {result}")
        log_id = result.get("logId", "")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        data = snap.to_dict()
        rolls = data.get("capsizeRolls", {})
        self.assertEqual(rolls.get("kabina", -1), 0, f"FA-26 kabina: {data}")
        self.assertEqual(rolls.get("rolka", -1), 0, f"FA-26 rolka: {data}")
        self.assertEqual(rolls.get("dziubek", -1), 0, f"FA-26 dziubek: {data}")


# ---------------------------------------------------------------------------
# FA — Pola dodatkowe: eventId, sectionDescription
# ---------------------------------------------------------------------------

class TestKmAddLogOptionalFields(unittest.TestCase):
    """FA-27 — eventId i eventName zapisane w Firestore."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def test_FA27_event_id_saved(self):
        """eventId i eventName przekazane w body są zapisywane w logu."""
        ev_id = f"ev-test-{uuid.uuid4().hex[:8]}"
        body = _valid_log_body(eventId=ev_id, eventName="Autotest Impreza")
        result = _api.km_add_log(self.token, body)
        self.assertTrue(result.get("ok"), f"FA-27: {result}")
        log_id = result.get("logId", "")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        data = snap.to_dict()
        self.assertEqual(data.get("eventId"), ev_id, f"FA-27 eventId: {data}")
        self.assertEqual(data.get("eventName"), "Autotest Impreza", f"FA-27 eventName: {data}")


# ---------------------------------------------------------------------------
# ML — Moje logi
# ---------------------------------------------------------------------------

class TestKmMyLogs(unittest.TestCase):
    """ML-01..05 — GET /api/km/logs."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []
        # Utwórz 2 wpisy testowe żeby ML-01 i ML-03 miały dane
        for _ in range(2):
            r = _api.km_add_log(cls.token, _valid_log_body())
            if r.get("logId"):
                cls.created_log_ids.append(r["logId"])

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def test_ML01_returns_logs_list(self):
        result = _api.km_my_logs(self.token)
        self.assertTrue(result.get("ok"), f"ML-01: {result}")
        self.assertIn("logs", result, result)
        self.assertIsInstance(result["logs"], list, result)
        self.assertGreater(result.get("count", 0), 0, "ML-01: count powinno być > 0")

    def test_ML01b_logs_sorted_by_date_desc(self):
        result = _api.km_my_logs(self.token, limit=20)
        logs = result.get("logs", [])
        if len(logs) < 2:
            self.skipTest("Za mało logów do weryfikacji sortowania")
        dates = [l.get("date", "") for l in logs]
        self.assertEqual(dates, sorted(dates, reverse=True), "ML-01b: logi nie posortowane date DESC")

    def test_ML03_limit_respected(self):
        result = _api.km_my_logs(self.token, limit=1)
        self.assertTrue(result.get("ok"), f"ML-03: {result}")
        self.assertLessEqual(len(result.get("logs", [])), 1, "ML-03: limit=1 naruszony")

    def test_ML04_limit_max_clamp(self):
        result = _api.km_my_logs(self.token, limit=200)
        self.assertTrue(result.get("ok"), f"ML-04: {result}")
        self.assertLessEqual(len(result.get("logs", [])), 100, "ML-04: limit > 100 nie obcięty")

    def test_ML05_only_own_logs(self):
        """Logi zawierają tylko uid zalogowanego użytkownika."""
        result = _api.km_my_logs(self.token, limit=20)
        logs = result.get("logs", [])
        if not logs or not self.uid:
            self.skipTest("Brak logów lub uid")
        for entry in logs:
            self.assertEqual(entry.get("uid"), self.uid,
                             f"ML-05: obcy log w wynikach: uid={entry.get('uid')}")


# ---------------------------------------------------------------------------
# MS — Moje statystyki
# ---------------------------------------------------------------------------

class TestKmMyStats(unittest.TestCase):
    """MS-01..02 — GET /api/km/stats."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def test_MS01_returns_stats_structure(self):
        result = _api.km_my_stats(self.token)
        self.assertTrue(result.get("ok"), f"MS-01: {result}")
        self.assertIn("stats", result, result)
        stats = result["stats"]
        if stats is None:
            self.skipTest("MS-01: stats=null — użytkownik nie ma jeszcze wpisów")
        for field in ("allTimeKm", "allTimeHours", "yearKm", "allTimeLogs"):
            self.assertIn(field, stats, f"MS-01: brak pola {field} w stats: {stats}")

    def test_MS01b_numeric_fields_are_numbers(self):
        result = _api.km_my_stats(self.token)
        stats = result.get("stats")
        if stats is None:
            self.skipTest("MS-01b: stats=null")
        for field in ("allTimeKm", "allTimeHours", "yearKm", "allTimeLogs",
                      "allTimePoints", "yearPoints"):
            val = stats.get(field)
            if val is not None:
                self.assertIsInstance(val, (int, float),
                                      f"MS-01b: {field} nie jest liczbą: {val!r}")


# ---------------------------------------------------------------------------
# RK — Ranking
# ---------------------------------------------------------------------------

class TestKmRankings(unittest.TestCase):
    """RK-01..10 — GET /api/km/rankings."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def test_RK01_default_response_structure(self):
        result = _api.km_rankings(self.token)
        self.assertTrue(result.get("ok"), f"RK-01: {result}")
        self.assertIn("entries", result, result)
        self.assertIsInstance(result["entries"], list, result)
        self.assertIn("count", result, result)
        self.assertEqual(result.get("type"), "km", f"RK-01 default type: {result}")
        self.assertEqual(result.get("period"), "alltime", f"RK-01 default period: {result}")

    def test_RK02_entries_sorted_desc(self):
        result = _api.km_rankings(self.token, type="km", period="alltime")
        entries = result.get("entries", [])
        if len(entries) < 2:
            self.skipTest("RK-02: za mało wpisów do weryfikacji sortowania")
        values = [e.get("value", 0) for e in entries]
        self.assertEqual(values, sorted(values, reverse=True), "RK-02: entries nie posortowane DESC")

    def test_RK03_type_points(self):
        result = _api.km_rankings(self.token, type="points", period="alltime")
        self.assertTrue(result.get("ok"), f"RK-03: {result}")
        self.assertEqual(result.get("type"), "points", result)
        self.assertIn("allTimePoints", result.get("orderField", ""),
                      f"RK-03 orderField: {result.get('orderField')}")

    def test_RK04_type_hours(self):
        result = _api.km_rankings(self.token, type="hours", period="alltime")
        self.assertTrue(result.get("ok"), f"RK-04: {result}")
        self.assertEqual(result.get("type"), "hours", result)

    def test_RK05_period_year(self):
        result = _api.km_rankings(self.token, type="km", period="year")
        self.assertTrue(result.get("ok"), f"RK-05: {result}")
        self.assertEqual(result.get("period"), "year", result)
        self.assertIn("yearKm", result.get("orderField", ""),
                      f"RK-05 orderField: {result.get('orderField')}")

    def test_RK06_limit_respected(self):
        result = _api.km_rankings(self.token, limit=3)
        self.assertTrue(result.get("ok"), f"RK-06: {result}")
        self.assertLessEqual(len(result.get("entries", [])), 3, "RK-06: limit=3 naruszony")

    def test_RK07_limit_max_clamp(self):
        result = _api.km_rankings(self.token, limit=200)
        self.assertTrue(result.get("ok"), f"RK-07: {result}")
        self.assertLessEqual(len(result.get("entries", [])), 100, "RK-07: limit > 100 nie obcięty")

    def test_RK08_invalid_type_fallback(self):
        result = _api.km_rankings(self.token, type="invalid_type")
        self.assertTrue(result.get("ok"), f"RK-08: {result}")
        self.assertEqual(result.get("type"), "km", f"RK-08 fallback type: {result}")

    def test_RK09_invalid_period_fallback(self):
        result = _api.km_rankings(self.token, period="weekly")
        self.assertTrue(result.get("ok"), f"RK-09: {result}")
        self.assertEqual(result.get("period"), "alltime", f"RK-09 fallback period: {result}")

    def test_RK10_entry_structure(self):
        result = _api.km_rankings(self.token, limit=1)
        entries = result.get("entries", [])
        if not entries:
            self.skipTest("RK-10: brak wpisów w rankingu")
        entry = entries[0]
        for field in ("rank", "uid", "displayName", "nickname", "value",
                      "allTimeKm", "yearKm", "allTimeLogs"):
            self.assertIn(field, entry, f"RK-10: brak pola {field} w entry: {entry}")
        self.assertEqual(entry["rank"], 1, f"RK-10: rank pierwszego powinno być 1: {entry}")


# ---------------------------------------------------------------------------
# RW — Ranking per konkretny rok
# ---------------------------------------------------------------------------

class TestKmRankingsSpecificYear(unittest.TestCase):
    """RW-01..03 — period=specificYear."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def test_RW01_specific_year_response(self):
        current_year = str(datetime.now(timezone.utc).year)
        result = _api.km_rankings(self.token, period="specificYear", year=current_year)
        self.assertTrue(result.get("ok"), f"RW-01: {result}")
        self.assertEqual(result.get("period"), "specificYear", result)
        self.assertEqual(result.get("year"), current_year, result)
        self.assertIn("entries", result, result)

    def test_RW02_specific_year_no_data(self):
        result = _api.km_rankings(self.token, period="specificYear", year="1999")
        self.assertTrue(result.get("ok"), f"RW-02: {result}")
        self.assertEqual(result.get("entries", []), [], f"RW-02: oczekiwano pustej listy: {result}")

    def test_RW03_specific_year_without_year_param_fallback(self):
        """Brak parametru year przy period=specificYear → fallback do alltime."""
        result = _api.km_rankings(self.token, period="specificYear")
        self.assertTrue(result.get("ok"), f"RW-03: {result}")
        # isSpecificYear=false gdy year nie pasuje do /^\d{4}$/ — handler użyje alltime
        self.assertEqual(result.get("period"), "alltime", f"RW-03 fallback: {result}")


# ---------------------------------------------------------------------------
# PL — Podpowiedzi akwenów
# ---------------------------------------------------------------------------

class TestKmPlaces(unittest.TestCase):
    """PL-01..05 — GET /api/km/places."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def test_PL01_short_query_empty(self):
        """Query = 1 znak → pusta lista bez błędu."""
        result = _api.km_places(self.token, q="a")
        self.assertTrue(result.get("ok"), f"PL-01: {result}")
        self.assertEqual(result.get("places", []), [], f"PL-01: oczekiwano pustej listy: {result}")
        self.assertEqual(result.get("count", 0), 0, f"PL-01 count: {result}")

    def test_PL02_empty_query_empty(self):
        result = _api.km_places(self.token, q="")
        self.assertTrue(result.get("ok"), f"PL-02b: {result}")
        self.assertEqual(result.get("places", []), [], f"PL-02b: {result}")

    def test_PL03_no_results_for_unknown_query(self):
        result = _api.km_places(self.token, q="zzzxxx_nieznane_miejsce_9999")
        self.assertTrue(result.get("ok"), f"PL-03: {result}")
        self.assertIsInstance(result.get("places", []), list, result)

    def test_PL04_limit_respected(self):
        result = _api.km_places(self.token, q="an", limit=3)
        self.assertTrue(result.get("ok"), f"PL-04: {result}")
        self.assertLessEqual(len(result.get("places", [])), 3, "PL-04: limit=3 naruszony")

    def test_PL05_limit_max_clamp(self):
        result = _api.km_places(self.token, q="an", limit=50)
        self.assertTrue(result.get("ok"), f"PL-05: {result}")
        self.assertLessEqual(len(result.get("places", [])), 20, "PL-05: limit > 20 nie obcięty")


# ---------------------------------------------------------------------------
# MP — Dane mapy
# ---------------------------------------------------------------------------

class TestKmMapData(unittest.TestCase):
    """MP-01 — GET /api/km/map-data."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

    def test_MP01_response_structure(self):
        result = _api.km_map_data(self.token)
        self.assertTrue(result.get("ok"), f"MP-01: {result}")
        self.assertIn("locations", result, result)
        self.assertIsInstance(result["locations"], list, result)
        self.assertIn("locationCount", result, result)
        # updatedAt może być null (pusty cache) lub string ISO
        self.assertIn("updatedAt", result, result)
        self.assertEqual(result.get("locationCount"), len(result.get("locations", [])),
                         "MP-01: locationCount != len(locations)")


# ---------------------------------------------------------------------------
# EV — Event stats
# ---------------------------------------------------------------------------

class TestKmEventStats(unittest.TestCase):
    """EV-01..04 — GET /api/km/event-stats."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def test_EV02_missing_event_id_400(self):
        """Brak eventId → HTTP 400."""
        result = _api.km_event_stats_soft(self.token, event_id="")
        self.assertFalse(result.get("ok"), f"EV-02: oczekiwano ok=false: {result}")
        self.assertEqual(result.get("code"), "missing_eventId", f"EV-02: {result}")

    def test_EV03_unknown_event_id_empty(self):
        """Nieznany eventId → pusta lista participants."""
        result = _api.km_event_stats(self.token, event_id="nieistniejace_event_999")
        self.assertTrue(result.get("ok"), f"EV-03: {result}")
        self.assertEqual(result.get("participants", []), [], f"EV-03: {result}")
        self.assertEqual(result.get("count", 0), 0, f"EV-03 count: {result}")

    def test_EV05_event_id_visible_in_stats(self):
        """Wpis z eventId widoczny w event-stats."""
        ev_id = f"ev-autotest-{uuid.uuid4().hex[:8]}"
        body = _valid_log_body(
            eventId=ev_id,
            eventName="Autotest EV-05",
            capsizeRolls={"kabina": 1, "rolka": 0, "dziubek": 0},
        )
        add_result = _api.km_add_log(self.token, body)
        self.assertTrue(add_result.get("ok"), f"EV-05 add: {add_result}")
        if add_result.get("logId"):
            self.created_log_ids.append(add_result["logId"])

        stats = _api.km_event_stats(self.token, event_id=ev_id)
        self.assertTrue(stats.get("ok"), f"EV-05 stats: {stats}")
        self.assertGreater(stats.get("count", 0), 0, f"EV-05: brak uczestników: {stats}")
        participant = stats["participants"][0]
        self.assertEqual(participant.get("capsizeKabina"), 1,
                         f"EV-05 capsizeKabina: {participant}")

    def test_EV04_aggregation_multi_log(self):
        """Dwa wpisy tego samego uid z tym samym eventId — sumowane w stats."""
        ev_id = f"ev-agg-{uuid.uuid4().hex[:8]}"
        for i in range(2):
            body = _valid_log_body(
                eventId=ev_id,
                eventName="Autotest EV-04",
                capsizeRolls={"kabina": 1, "rolka": 1, "dziubek": 0},
            )
            r = _api.km_add_log(self.token, body)
            self.assertTrue(r.get("ok"), f"EV-04 add {i}: {r}")
            if r.get("logId"):
                self.created_log_ids.append(r["logId"])

        stats = _api.km_event_stats(self.token, event_id=ev_id)
        self.assertTrue(stats.get("ok"), f"EV-04 stats: {stats}")
        participants = stats.get("participants", [])
        self.assertEqual(len(participants), 1,
                         f"EV-04: oczekiwano 1 uczestnika (ten sam uid): {stats}")
        p = participants[0]
        self.assertEqual(p.get("capsizeKabina"), 2, f"EV-04 kabina sum: {p}")
        self.assertEqual(p.get("capsizeRolka"), 2, f"EV-04 rolka sum: {p}")
        self.assertEqual(p.get("logs"), 2, f"EV-04 logs count: {p}")


# ---------------------------------------------------------------------------
# MG — Merge places (KROK 6)
# ---------------------------------------------------------------------------

class TestKmAdminMergePlaces(unittest.TestCase):
    """
    MG-01..11 — POST /api/admin/km/places/merge

    Testy tworzą tymczasowe dokumenty km_places bezpośrednio przez Firestore ADC
    i sprzątają je w tearDownClass niezależnie od wyniku testu.

    Wymagania:
      board_user_email / board_user_password — rola_zarzad lub rola_kr
      member_user_email / member_user_password — rola bez uprawnień admin
    """

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("board_user_email", "board_user_password",
                                "member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)

        cls.admin_token = _auth.get_token(cfg.board_user_email, cfg.board_user_password)
        cls.member_token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)

        # ID tymczasowych dokumentów km_places — sprzątane w tearDown
        cls.created_place_ids: list[str] = []
        # ID tymczasowych km_logs — sprzątane w tearDown
        cls.created_log_ids: list[str] = []
        # uid konta member do cleanup logów
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.member_uid = fs_user[0] if fs_user else ""

    @classmethod
    def tearDownClass(cls):
        # Usuń tymczasowe km_places (te które jeszcze istnieją)
        for place_id in cls.created_place_ids:
            try:
                _fs.db.collection("km_places").document(place_id).delete()
            except Exception:
                pass
        # Usuń tymczasowe km_logs
        if cls.member_uid:
            _cleanup_km_logs(cls.member_uid)

    # ------------------------------------------------------------------
    # Pomocnicze: tworzenie tymczasowych km_places przez Firestore ADC
    # ------------------------------------------------------------------

    @staticmethod
    def _tokenize(name: str) -> list[str]:
        """Tokenizacja inline — odpowiednik tokenizeName() z km_places_service.ts."""
        lower = name.strip().lower()
        if not lower:
            return []
        words = lower.split()
        tokens: set[str] = set([lower] + words)
        for w in words:
            for i in range(2, len(w)):
                tokens.add(w[:i])
        return list(tokens)[:50]

    def _create_place(self, name: str, water_type: str = "mountains",
                      use_count: int = 1) -> str:
        """Tworzy dokument km_places bezpośrednio przez ADC i rejestruje do sprzątania."""
        from datetime import datetime, timezone as tz
        now = datetime.now(tz.utc)
        ref = _fs.db.collection("km_places").document()
        ref.set({
            "placeId": ref.id,
            "name": name,
            "aliases": [],
            "searchTerms": self._tokenize(name),
            "waterType": water_type,
            "country": None,
            "useCount": use_count,
            "createdAt": now,
            "updatedAt": now,
        })
        self.created_place_ids.append(ref.id)
        return ref.id

    # ------------------------------------------------------------------
    # SEC — autoryzacja
    # ------------------------------------------------------------------

    def test_MG01_no_token_401(self):
        """Brak tokena → 401."""
        resp = requests.post(
            f"{BASE}/api/admin/km/places/merge",
            json={"keepPlaceId": "x", "mergeIds": ["y"]},
            timeout=10,
        )
        self.assertEqual(resp.status_code, 401, resp.text[:300])

    def test_MG02_bad_token_401(self):
        """Zły token → 401."""
        resp = requests.post(
            f"{BASE}/api/admin/km/places/merge",
            headers={"Authorization": "Bearer fake_token", "Content-Type": "application/json"},
            json={"keepPlaceId": "x", "mergeIds": ["y"]},
            timeout=10,
        )
        self.assertEqual(resp.status_code, 401, resp.text[:300])

    def test_MG03_member_forbidden_403(self):
        """Rola bez uprawnień admin → 403."""
        result = _api.km_admin_merge_places_soft(
            self.member_token, keep_place_id="x", merge_ids=["y"]
        )
        self.assertFalse(result.get("ok"), f"MG-03: oczekiwano ok=false: {result}")
        # status_code nie jest dostępny przez _soft, ale brak ok=true wystarczy
        # Dla pewności sprawdź przez surowe requests
        resp = requests.post(
            f"{BASE}/api/admin/km/places/merge",
            headers={"Authorization": f"Bearer {self.member_token}",
                     "Content-Type": "application/json"},
            json={"keepPlaceId": "x", "mergeIds": ["y"]},
            timeout=15,
        )
        self.assertEqual(resp.status_code, 403, f"MG-03 HTTP status: {resp.text[:300]}")

    # ------------------------------------------------------------------
    # Walidacja body
    # ------------------------------------------------------------------

    def test_MG04_missing_keep_place_id_400(self):
        """Brak keepPlaceId → 400 validation_failed."""
        result = _api.km_admin_merge_places_soft(
            self.admin_token, keep_place_id="", merge_ids=["some_id"]
        )
        self.assertFalse(result.get("ok"), f"MG-04: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"MG-04: {result}")

    def test_MG05_empty_merge_ids_400(self):
        """Pusta tablica mergeIds → 400 validation_failed."""
        result = _api.km_admin_merge_places_soft(
            self.admin_token, keep_place_id="some_id", merge_ids=[]
        )
        self.assertFalse(result.get("ok"), f"MG-05: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"MG-05: {result}")

    def test_MG06_keep_in_merge_ids_400(self):
        """keepPlaceId w mergeIds → 400 validation_failed."""
        result = _api.km_admin_merge_places_soft(
            self.admin_token, keep_place_id="abc", merge_ids=["abc"]
        )
        self.assertFalse(result.get("ok"), f"MG-06: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"MG-06: {result}")

    def test_MG07_too_many_merge_ids_400(self):
        """Ponad 20 mergeIds → 400 validation_failed."""
        result = _api.km_admin_merge_places_soft(
            self.admin_token, keep_place_id="keep", merge_ids=[f"id{i}" for i in range(21)]
        )
        self.assertFalse(result.get("ok"), f"MG-07: {result}")
        self.assertEqual(result.get("code"), "validation_failed", f"MG-07: {result}")

    def test_MG08_unknown_keep_place_id_404(self):
        """keepPlaceId nie istnieje w km_places → 404 not_found."""
        result = _api.km_admin_merge_places_soft(
            self.admin_token,
            keep_place_id=f"nieistniejace_{uuid.uuid4().hex}",
            merge_ids=["any_id"],
        )
        self.assertFalse(result.get("ok"), f"MG-08: {result}")
        self.assertEqual(result.get("code"), "not_found", f"MG-08: {result}")

    # ------------------------------------------------------------------
    # Happy path — merge + weryfikacja Firestore
    # ------------------------------------------------------------------

    def test_MG09_merge_returns_ok(self):
        """Poprawny merge → HTTP 200, {ok: true, keepPlaceId, mergeResults, rebuildJobId}."""
        keep_id = self._create_place("Autotest Keep MG09", use_count=5)
        merge_id = self._create_place("Autotest Merge MG09", use_count=3)

        result = _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])

        self.assertTrue(result.get("ok"), f"MG-09: {result}")
        self.assertEqual(result.get("keepPlaceId"), keep_id, f"MG-09 keepPlaceId: {result}")
        self.assertIn("mergeResults", result, f"MG-09: brak mergeResults: {result}")
        self.assertIn("rebuildJobId", result, f"MG-09: brak rebuildJobId: {result}")
        self.assertTrue(result["rebuildJobId"], f"MG-09: rebuildJobId pusty: {result}")

        merge_results = result["mergeResults"]
        self.assertEqual(len(merge_results), 1, f"MG-09 mergeResults len: {result}")
        self.assertEqual(merge_results[0].get("mergeId"), merge_id,
                         f"MG-09 mergeId w wyniku: {merge_results}")

    def test_MG10_merged_place_deleted(self):
        """Po merge scalone miejsce nie istnieje w km_places."""
        keep_id = self._create_place("Autotest Keep MG10", use_count=2)
        merge_id = self._create_place("Autotest Merge MG10", use_count=1)

        _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])

        snap = _fs.db.collection("km_places").document(merge_id).get()
        self.assertFalse(snap.exists,
                         f"MG-10: scalone miejsce {merge_id} nadal istnieje w km_places")

        # keepPlace nadal istnieje
        keep_snap = _fs.db.collection("km_places").document(keep_id).get()
        self.assertTrue(keep_snap.exists, f"MG-10: keepPlace {keep_id} zniknęło")

    def test_MG11_aliases_updated(self):
        """Nazwa scalanego miejsca trafia do keepPlace.aliases[]."""
        keep_id = self._create_place("Autotest Keep MG11", use_count=2)
        merge_name = "Autotest Merge Alias MG11"
        merge_id = self._create_place(merge_name, use_count=1)

        _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])

        snap = _fs.db.collection("km_places").document(keep_id).get()
        self.assertTrue(snap.exists, f"MG-11: keepPlace zniknęło")
        data = snap.to_dict() or {}
        aliases = data.get("aliases", [])
        self.assertIn(merge_name, aliases,
                      f"MG-11: '{merge_name}' nie ma w aliases={aliases}")

    def test_MG12_use_count_summed(self):
        """useCount keepPlace wzrasta o useCount scalanych miejsc."""
        keep_id = self._create_place("Autotest Keep MG12", use_count=5)
        merge_id = self._create_place("Autotest Merge MG12", use_count=3)

        _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])

        snap = _fs.db.collection("km_places").document(keep_id).get()
        data = snap.to_dict() or {}
        use_count = data.get("useCount", 0)
        self.assertEqual(use_count, 8,
                         f"MG-12: useCount={use_count}, oczekiwano 8 (5+3)")

    def test_MG13_km_logs_placeId_updated(self):
        """km_logs z placeId = mergeId mają po merge placeId = keepId."""
        keep_id = self._create_place("Autotest Keep MG13", use_count=1)
        merge_id = self._create_place("Autotest Merge MG13", use_count=1)

        # Utwórz log z placeId = merge_id przez POST (placeId jest przekazywane w body)
        body = _valid_log_body(
            placeName="Autotest Merge MG13",
            placeId=merge_id,
            waterType="sea",
        )
        r = _api.km_add_log(self.member_token, body)
        self.assertTrue(r.get("ok"), f"MG-13 add log: {r}")
        log_id = r.get("logId", "")
        if log_id:
            self.created_log_ids.append(log_id)

        # Wykonaj merge
        _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])

        # Sprawdź że log ma nowy placeId
        if log_id:
            log_snap = _fs.db.collection("km_logs").document(log_id).get()
            log_data = log_snap.to_dict() or {}
            self.assertEqual(log_data.get("placeId"), keep_id,
                             f"MG-13: log.placeId={log_data.get('placeId')}, oczekiwano {keep_id}")

    def test_MG14_nonexistent_merge_id_skipped(self):
        """mergeId które nie istnieje jest pomijane bez błędu — merge kontynuuje."""
        keep_id = self._create_place("Autotest Keep MG14", use_count=1)
        fake_merge_id = f"nieistniejace_{uuid.uuid4().hex}"

        result = _api.km_admin_merge_places(self.admin_token, keep_id, [fake_merge_id])

        self.assertTrue(result.get("ok"), f"MG-14: {result}")
        merge_results = result.get("mergeResults", [])
        self.assertEqual(len(merge_results), 1, f"MG-14: {merge_results}")
        self.assertEqual(merge_results[0]["mergeId"], fake_merge_id,
                         f"MG-14: brak wpisu dla fake mergeId: {merge_results}")

    def test_MG15_rebuild_job_queued(self):
        """Po merge w service_jobs istnieje job km.rebuildMapData."""
        keep_id = self._create_place("Autotest Keep MG15", use_count=1)
        merge_id = self._create_place("Autotest Merge MG15", use_count=1)

        result = _api.km_admin_merge_places(self.admin_token, keep_id, [merge_id])
        job_id = result.get("rebuildJobId", "")
        self.assertTrue(job_id, f"MG-15: brak rebuildJobId w odpowiedzi")

        snap = _fs.db.collection("service_jobs").document(job_id).get()
        self.assertTrue(snap.exists, f"MG-15: job {job_id} nie istnieje w service_jobs")
        job_data = snap.to_dict() or {}
        self.assertEqual(job_data.get("taskId"), "km.rebuildMapData",
                         f"MG-15: taskId={job_data.get('taskId')}")
        self.assertIn(job_data.get("status"), ("queued", "done"),
                      f"MG-15: status={job_data.get('status')}")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
