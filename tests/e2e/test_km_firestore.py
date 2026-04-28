"""
Testy integralności Firestore — km / ranking / mapa — SKK Morzkulc
===================================================================

Weryfikuje poprawność danych zapisanych w Firestore przez moduł km:
  - km_logs/{logId}     — struktura dokumentu, pola obowiązkowe
  - km_user_stats/{uid} — agregaty po zapisie wpisu (allTimeKm, yearKm, years map)
  - km_scoring          — przeliczenie punktów przez computePoints

Każdy test tworzy wpis przez POST /api/km/log/add i sprawdza Firestore przez ADC.
note="autotest-km" w każdym wpisie — cleanup tearDownClass usuwa te dokumenty.

Uruchamianie (z katalogu tests/e2e/):
    ENV=dev python -m pytest test_km_firestore.py -v

Wymagania:
    DEV_TEST_MEMBER_EMAIL / DEV_TEST_MEMBER_PASSWORD
    gcloud auth application-default login --scopes=cloud-platform
    setup/vars_members w Firestore (ptsKabina, ptsEskimoska, ptsDziubek)
"""
import os
import sys
import uuid
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

from config import ACTIVE as cfg
from helpers.firebase_auth import FirebaseAuthHelper
from helpers.api_helper import ApiHelper
from helpers.firestore_helper import FirestoreHelper

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_auth = FirebaseAuthHelper(cfg)
_api = ApiHelper(cfg)
_fs = FirestoreHelper(cfg)

_TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
_YESTERDAY = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
_YEAR_CURRENT = str(datetime.now(timezone.utc).year)
_YEAR_PAST = str(datetime.now(timezone.utc).year - 1)
_DATE_PAST_YEAR = f"{_YEAR_PAST}-06-15"

_TEST_TAG = "autotest-km"


def _valid_log_body(**overrides) -> dict:
    base = {
        "date": _YESTERDAY,
        "waterType": "mountains",
        "placeName": f"Autotest FS {uuid.uuid4().hex[:6]}",
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
    try:
        snaps = (
            _fs.db.collection("km_logs")
            .where("uid", "==", uid)
            .where("note", "==", _TEST_TAG)
            .get()
        )
        count = 0
        for snap in snaps:
            snap.reference.delete()
            count += 1
        log.info(f"Cleanup: usunięto {count} testowych km_logs dla uid={uid}")
    except Exception as e:
        log.warning(f"Cleanup km_logs error: {e}")


def _get_km_vars() -> dict:
    """Pobiera km_vars z setup/vars_members."""
    snap = _fs.db.collection("setup").document("vars_members").get()
    if not snap.exists:
        return {}
    data = snap.to_dict() or {}
    return {
        "ptsKabina": float(data.get("ptsKabina", 0)),
        "ptsEskimoska": float(data.get("ptsEskimoska", 0)),
        "ptsDziubek": float(data.get("ptsDziubek", 0)),
    }


# ---------------------------------------------------------------------------
# FS-06 — Struktura dokumentu km_logs
# ---------------------------------------------------------------------------

class TestKmLogDocumentStructure(unittest.TestCase):
    """FS-06 — poprawny km_logs dokument zawiera wszystkie wymagane pola."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.log_id = ""
        cls.log_data: dict = {}

        # Utwórz 1 wpis testowy
        r = _api.km_add_log(cls.token, _valid_log_body(
            km=12.5, hoursOnWater=3.0,
            waterType="sea",
            capsizeRolls={"kabina": 0, "rolka": 0, "dziubek": 0},
        ))
        if r.get("ok") and r.get("logId"):
            cls.log_id = r["logId"]
            snap = _fs.db.collection("km_logs").document(cls.log_id).get()
            cls.log_data = snap.to_dict() or {}

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def setUp(self):
        if not self.log_data:
            self.skipTest("FS-06: nie udało się stworzyć wpisu testowego")

    def test_FS06_required_fields_present(self):
        required = [
            "logId", "uid", "date", "waterType", "placeName",
            "km", "hoursOnWater", "capsizeRolls",
            "pointsTotal", "pointsBreakdown", "scoringVersion",
            "sourceType", "schemaVersion", "isPartial", "visibility",
            "year", "seasonKey", "createdAt", "updatedAt",
        ]
        for field in required:
            self.assertIn(field, self.log_data,
                          f"FS-06: brak pola '{field}' w km_logs: {list(self.log_data.keys())}")

    def test_FS06b_static_fields_correct(self):
        self.assertEqual(self.log_data.get("sourceType"), "runtime",
                         f"FS-06b sourceType: {self.log_data.get('sourceType')}")
        self.assertEqual(self.log_data.get("schemaVersion"), 1,
                         f"FS-06b schemaVersion: {self.log_data.get('schemaVersion')}")
        self.assertEqual(self.log_data.get("isPartial"), False,
                         f"FS-06b isPartial: {self.log_data.get('isPartial')}")
        self.assertEqual(self.log_data.get("visibility"), "visible",
                         f"FS-06b visibility: {self.log_data.get('visibility')}")

    def test_FS06c_logId_matches_document_key(self):
        self.assertEqual(self.log_data.get("logId"), self.log_id,
                         "FS-06c: logId w dokumencie != ID dokumentu Firestore")

    def test_FS06d_uid_correct(self):
        self.assertEqual(self.log_data.get("uid"), self.uid,
                         f"FS-06d: uid w logu != uid użytkownika")

    def test_FS06e_year_derived_from_date(self):
        expected_year = int(_YESTERDAY[:4])
        self.assertEqual(self.log_data.get("year"), expected_year,
                         f"FS-06e: year={self.log_data.get('year')} != {expected_year}")

    def test_FS06f_km_and_hours_saved(self):
        self.assertAlmostEqual(float(self.log_data.get("km", -1)), 12.5, places=3,
                               msg=f"FS-06f km: {self.log_data.get('km')}")
        self.assertAlmostEqual(float(self.log_data.get("hoursOnWater", -1)), 3.0, places=3,
                               msg=f"FS-06f hoursOnWater: {self.log_data.get('hoursOnWater')}")


# ---------------------------------------------------------------------------
# FS-01 — Agregaty dla nowego użytkownika (lub po cleanup)
# FS-02 — Kumulacja agregatów po dwóch wpisach
# FS-03 — Agregaty per rok (years map)
# ---------------------------------------------------------------------------

class TestKmUserStatsAggregation(unittest.TestCase):
    """
    FS-01..03 — km_user_stats aktualizowane po każdym addKmLog.

    UWAGA: Testy używają istniejącego konta member_user i NIE resetują km_user_stats
    (reset wymagałby uprawnień admin i mógłby zniszczyć produkcyjne dane testowe).
    Zamiast tego testy sprawdzają WZROST wartości po dodaniu wpisu, nie absolutne wartości.
    """

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

    def _read_stats(self) -> dict:
        snap = _fs.db.collection("km_user_stats").document(self.uid).get()
        return snap.to_dict() or {} if snap.exists else {}

    def test_FS01_stats_created_or_incremented_after_log(self):
        """Po dodaniu wpisu km_user_stats/{uid} istnieje i allTimeKm > 0."""
        if not self.uid:
            self.skipTest("FS-01: brak uid")

        stats_before = self._read_stats()
        km_before = float(stats_before.get("allTimeKm", 0))
        logs_before = int(stats_before.get("allTimeLogs", 0))

        body = _valid_log_body(km=7.5, hoursOnWater=1.5)
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-01 add: {r}")
        if r.get("logId"):
            self.created_log_ids.append(r["logId"])

        stats_after = self._read_stats()
        km_after = float(stats_after.get("allTimeKm", 0))
        logs_after = int(stats_after.get("allTimeLogs", 0))

        self.assertAlmostEqual(km_after, km_before + 7.5, places=2,
                               msg=f"FS-01: allTimeKm przed={km_before}, po={km_after} (oczekiwano +7.5)")
        self.assertEqual(logs_after, logs_before + 1,
                         f"FS-01: allTimeLogs przed={logs_before}, po={logs_after} (oczekiwano +1)")

    def test_FS02_second_log_accumulates(self):
        """Drugi wpis kumuluje allTimeKm i allTimeLogs."""
        if not self.uid:
            self.skipTest("FS-02: brak uid")

        stats_before = self._read_stats()
        km_before = float(stats_before.get("allTimeKm", 0))
        hours_before = float(stats_before.get("allTimeHours", 0))

        for km_val, hours_val in [(5.0, 1.0), (3.0, 0.5)]:
            body = _valid_log_body(km=km_val, hoursOnWater=hours_val)
            r = _api.km_add_log(self.token, body)
            self.assertTrue(r.get("ok"), f"FS-02 add km={km_val}: {r}")
            if r.get("logId"):
                self.created_log_ids.append(r["logId"])

        stats_after = self._read_stats()
        km_after = float(stats_after.get("allTimeKm", 0))
        hours_after = float(stats_after.get("allTimeHours", 0))

        self.assertAlmostEqual(km_after, km_before + 8.0, places=2,
                               msg=f"FS-02: allTimeKm przed={km_before}, po={km_after} (oczekiwano +8.0)")
        self.assertAlmostEqual(hours_after, hours_before + 1.5, places=2,
                               msg=f"FS-02: allTimeHours przed={hours_before}, po={hours_after} (oczekiwano +1.5)")

    def test_FS03_years_map_updated(self):
        """Po dodaniu wpisu z bieżącym rokiem — years[YYYY].km wzrasta."""
        if not self.uid:
            self.skipTest("FS-03: brak uid")

        stats_before = self._read_stats()
        year_key = _YEAR_CURRENT
        km_in_year_before = float((stats_before.get("years") or {}).get(year_key, {}).get("km", 0))

        body = _valid_log_body(km=4.0, hoursOnWater=1.0, date=_YESTERDAY)
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-03 add: {r}")
        if r.get("logId"):
            self.created_log_ids.append(r["logId"])

        stats_after = self._read_stats()
        km_in_year_after = float((stats_after.get("years") or {}).get(year_key, {}).get("km", 0))

        self.assertAlmostEqual(km_in_year_after, km_in_year_before + 4.0, places=2,
                               msg=f"FS-03: years[{year_key}].km przed={km_in_year_before}, po={km_in_year_after}")

    def test_FS03b_historical_log_updates_years_map_not_current_year(self):
        """Wpis z poprzedniego roku aktualizuje years[prev_year] ale nie yearKm bieżącego roku."""
        if not self.uid:
            self.skipTest("FS-03b: brak uid")

        stats_before = self._read_stats()
        year_km_before = float(stats_before.get("yearKm", 0))
        past_year_km_before = float(
            (stats_before.get("years") or {}).get(_YEAR_PAST, {}).get("km", 0)
        )

        body = _valid_log_body(km=6.0, hoursOnWater=1.0, date=_DATE_PAST_YEAR)
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-03b add: {r}")
        if r.get("logId"):
            self.created_log_ids.append(r["logId"])

        stats_after = self._read_stats()
        year_km_after = float(stats_after.get("yearKm", 0))
        past_year_km_after = float(
            (stats_after.get("years") or {}).get(_YEAR_PAST, {}).get("km", 0)
        )

        self.assertAlmostEqual(year_km_after, year_km_before, places=2,
                               msg=f"FS-03b: historyczny wpis zmienił yearKm: {year_km_before} → {year_km_after}")
        self.assertAlmostEqual(past_year_km_after, past_year_km_before + 6.0, places=2,
                               msg=f"FS-03b: years[{_YEAR_PAST}].km nie wzrosło")

    def test_FS01b_stats_structure(self):
        """km_user_stats/{uid} zawiera wszystkie oczekiwane pola po wpisie."""
        if not self.uid:
            self.skipTest("FS-01b: brak uid")

        r = _api.km_add_log(self.token, _valid_log_body(km=1.0, hoursOnWater=0))
        self.assertTrue(r.get("ok"), f"FS-01b add: {r}")
        if r.get("logId"):
            self.created_log_ids.append(r["logId"])

        stats = self._read_stats()
        expected_fields = [
            "uid", "allTimeKm", "allTimeHours", "allTimeDays", "allTimePoints",
            "allTimeLogs", "yearKey", "yearKm", "yearHours", "yearDays",
            "yearPoints", "yearLogs", "years",
        ]
        for field in expected_fields:
            self.assertIn(field, stats,
                          f"FS-01b: brak pola '{field}' w km_user_stats: {list(stats.keys())}")


# ---------------------------------------------------------------------------
# FS-04..05 — Scoring (computePoints)
# ---------------------------------------------------------------------------

class TestKmScoring(unittest.TestCase):
    """
    FS-04..05 — punkty obliczane ON WRITE przez computePoints(capsizeRolls, vars).
    Weryfikuje że pointsTotal w Firestore == ręczne przeliczenie z km_vars.
    """

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.km_vars = _get_km_vars()
        cls.created_log_ids: list[str] = []

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)

    def test_FS04_points_computed_from_vars(self):
        """pointsTotal == kabina*ptsKabina + rolka*ptsEskimoska + dziubek*ptsDziubek."""
        if not self.km_vars:
            self.skipTest("FS-04: brak setup/vars_members w Firestore")

        kabina, rolka, dziubek = 2, 1, 3
        expected_pts = (
            kabina * self.km_vars["ptsKabina"]
            + rolka * self.km_vars["ptsEskimoska"]
            + dziubek * self.km_vars["ptsDziubek"]
        )
        expected_pts = round(expected_pts * 100) / 100

        body = _valid_log_body(
            waterType="mountains",
            capsizeRolls={"kabina": kabina, "rolka": rolka, "dziubek": dziubek},
        )
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-04 add: {r}")
        log_id = r.get("logId", "")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        data = snap.to_dict() or {}
        actual_pts = round(float(data.get("pointsTotal", -999)) * 100) / 100

        self.assertAlmostEqual(actual_pts, expected_pts, places=2,
                               msg=f"FS-04: pointsTotal={actual_pts} != expected={expected_pts} "
                                   f"(vars={self.km_vars})")

    def test_FS05_zero_rolls_zero_points(self):
        """Brak wywrotolotek → pointsTotal = 0."""
        body = _valid_log_body(capsizeRolls={"kabina": 0, "rolka": 0, "dziubek": 0})
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-05 add: {r}")
        log_id = r.get("logId", "")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        data = snap.to_dict() or {}
        self.assertEqual(float(data.get("pointsTotal", -1)), 0.0,
                         f"FS-05: pointsTotal != 0: {data.get('pointsTotal')}")
        breakdown = data.get("pointsBreakdown", {})
        self.assertEqual(float(breakdown.get("capsizeRolls", -1)), 0.0,
                         f"FS-05: pointsBreakdown.capsizeRolls != 0: {breakdown}")

    def test_FS04b_scoring_version_present(self):
        """scoringVersion jest zapisana w logu i odpowiada wartości z km_vars."""
        body = _valid_log_body(capsizeRolls={"kabina": 1, "rolka": 0, "dziubek": 0})
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-04b add: {r}")
        log_id = r.get("logId", "")
        self.created_log_ids.append(log_id)

        snap = _fs.db.collection("km_logs").document(log_id).get()
        data = snap.to_dict() or {}
        self.assertTrue(data.get("scoringVersion"),
                        f"FS-04b: brak scoringVersion w logu: {data}")


# ---------------------------------------------------------------------------
# FS-07 — km_places upsert
# ---------------------------------------------------------------------------

class TestKmPlacesUpsert(unittest.TestCase):
    """FS-07 — po addKmLog z nową nazwą akwenu, km_places zawiera nowy dokument."""

    @classmethod
    def setUpClass(cls):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            raise unittest.SkipTest(skip)
        cls.token = _auth.get_token(cfg.member_user_email, cfg.member_user_password)
        fs_user = _fs.get_user_by_email(cfg.member_user_email)
        cls.uid = fs_user[0] if fs_user else ""
        cls.created_log_ids: list[str] = []
        cls.test_place_name = f"Autotest Rzeka Unikalna {uuid.uuid4().hex}"

    @classmethod
    def tearDownClass(cls):
        if cls.uid:
            _cleanup_km_logs(cls.uid)
        # Usuń testowe miejsca z km_places
        try:
            snaps = (
                _fs.db.collection("km_places")
                .where("name", "==", cls.test_place_name)
                .get()
            )
            for snap in snaps:
                snap.reference.delete()
        except Exception as e:
            log.warning(f"Cleanup km_places error: {e}")

    def test_FS07_place_created_after_log(self):
        """Nowe miejsce pojawia się w km_places po zapisaniu wpisu."""
        body = _valid_log_body(
            placeName=self.test_place_name,
            waterType="mountains",
        )
        r = _api.km_add_log(self.token, body)
        self.assertTrue(r.get("ok"), f"FS-07 add: {r}")
        if r.get("logId"):
            self.created_log_ids.append(r["logId"])

        snaps = (
            _fs.db.collection("km_places")
            .where("name", "==", self.test_place_name)
            .limit(1)
            .get()
        )
        places = [s.to_dict() for s in snaps]
        self.assertEqual(len(places), 1,
                         f"FS-07: nowe miejsce nie znalezione w km_places (name={self.test_place_name})")
        place = places[0]
        self.assertEqual(place.get("name"), self.test_place_name, f"FS-07 name: {place}")
        search_terms = place.get("searchTerms", [])
        self.assertTrue(len(search_terms) > 0,
                        f"FS-07: searchTerms puste: {place}")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
