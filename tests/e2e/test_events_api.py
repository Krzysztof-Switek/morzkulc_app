"""
Testy integracyjne przepływu imprez — SKK Morzkulc
===================================================

Pokrywa naprawy I1–I3 z audytu `Audyty/12.06_imprezy_audyt.md` oraz zgłoszenie
użytkowników "dodanie imprezy w aplikacji nie dodaje jej do arkusza":

  EV01 — submit z aplikacji: rekord w Firestore (approved=false, source=app,
         sheetSyncedAt=null), NIE ma go na publicznej liście /api/events,
         JEST w panelu zarządu /api/admin/pending
  EV02 — po zatwierdzeniu (approved=true) impreza pojawia się na liście /api/events
  EV03 — [wymaga oauth_client.json] zapis do arkusza: wiersz pojawia się w zakładce
         imprezy; retry joba writeToSheet NIE cofa Zatwierdzona=TAK (regresja I3);
         events.syncFromSheet ustawia approved=true w Firestore
  EV04 — backfill: impreza z sheetSyncedAt=null (martwy job) zostaje dopisana do
         arkusza przy syncu (regresja zgłoszonego buga)

Uruchamianie (z katalogu tests/e2e/):
    ENV=prod python -m pytest test_events_api.py -v

Wymagania .env.test:
    PROD_TEST_MEMBER_EMAIL / PROD_TEST_MEMBER_PASSWORD   — rola_czlonek
    PROD_TEST_BOARD_EMAIL / PROD_TEST_BOARD_PASSWORD     — rola_zarzad/kr (panel)
Opcjonalnie (EV03/EV04): tests/e2e/oauth_client.json — dostęp do arkusza (SheetsHelper).
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

from config import ACTIVE as cfg
from helpers.firebase_auth import FirebaseAuthHelper
from helpers.api_helper import ApiHelper
from helpers.firestore_helper import FirestoreHelper

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_auth = FirebaseAuthHelper(cfg)
_api = ApiHelper(cfg)

EVENTS_TAB = "imprezy"  # zakładka arkusza członków (SVC_EVENTS_SHEET_TAB)


def _skip_if_missing(*attrs):
    missing = [a for a in attrs if not getattr(cfg, a, "")]
    if missing:
        return f"Missing config: {', '.join(missing)}"
    return None


def _future(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


def _test_event_body(suffix: str) -> dict:
    return {
        "name": f"E2E test impreza {suffix}",
        "startDate": _future(180),
        "endDate": _future(182),
        "location": "E2E testowo",
        "description": "utworzone przez testy e2e — do usunięcia",
        "contact": "e2e@test.local",
        "link": "",
    }


def _sheets_helper_or_none():
    """SheetsHelper wymaga oauth_client.json — bez niego testy arkuszowe są pomijane."""
    oauth_path = os.path.join(_HERE, "oauth_client.json")
    if not os.path.isfile(oauth_path):
        return None
    try:
        from helpers.sheets_helper import SheetsHelper
        return SheetsHelper(cfg)
    except Exception as exc:
        log.warning(f"SheetsHelper unavailable: {exc}")
        return None


class _EventsTestBase(unittest.TestCase):
    _event_ids: list

    def setUp(self):
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)
        self._token = _auth.sign_in(cfg.member_user_email, cfg.member_user_password)
        self._fs = FirestoreHelper(cfg)
        self._event_ids = []

    def tearDown(self):
        for eid in self._event_ids:
            try:
                self._fs.db.collection("events").document(eid).delete()
                log.info(f"tearDown: deleted event {eid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot delete event {eid}: {exc}")

    # -- helpers --------------------------------------------------------

    def _get_event_doc(self, event_id: str) -> dict | None:
        snap = self._fs.db.collection("events").document(event_id).get()
        return snap.to_dict() if snap.exists else None

    def _delete_sheet_row(self, sheets, event_id: str):
        """Usuwa wiersz testowej imprezy z zakładki imprezy (cleanup EV03/EV04)."""
        try:
            ws = sheets._get_worksheet(EVENTS_TAB)
            cell = ws.find(event_id)
            if cell:
                ws.delete_rows(cell.row)
                log.info(f"cleanup: deleted sheet row {cell.row} for event {event_id}")
        except Exception as exc:
            log.warning(f"cleanup: cannot delete sheet row for {event_id}: {exc}")


# ---------------------------------------------------------------------------
# EV01 — zgłoszenie z aplikacji
# ---------------------------------------------------------------------------

class TestEventSubmit(_EventsTestBase):
    def test_EV01_submit_creates_pending_not_listed_visible_in_panel(self):
        body = _test_event_body("EV01")
        resp = _api.submit_event(self._token, body)
        self.assertTrue(resp.get("ok"), resp)
        event_id = resp["eventId"]
        self._event_ids.append(event_id)

        # Firestore: pending, source=app, jawny sheetSyncedAt=null (umożliwia backfill)
        doc = self._get_event_doc(event_id)
        self.assertIsNotNone(doc, "Brak dokumentu events po submit")
        self.assertFalse(doc.get("approved"), doc)
        self.assertEqual(doc.get("source"), "app", doc)
        self.assertIn("sheetSyncedAt", doc, "Brak jawnego sheetSyncedAt=null — backfill nie znajdzie rekordu")
        self.assertIsNone(doc.get("sheetSyncedAt"), doc.get("sheetSyncedAt"))

        # Publiczna lista NIE zawiera niezatwierdzonej imprezy
        events = _api.get_events(self._token).get("events", [])
        self.assertNotIn(event_id, [e.get("id") for e in events],
                         "Niezatwierdzona impreza widoczna na liście publicznej")

        # Panel zarządu ZAWIERA oczekującą imprezę
        skip = _skip_if_missing("board_user_email", "board_user_password")
        if skip:
            self.skipTest(f"Panel pending nie sprawdzony: {skip}")
        board_token = _auth.sign_in(cfg.board_user_email, cfg.board_user_password)
        pending = _api.get_admin_pending(board_token)
        pending_ids = [e.get("id") for e in pending.get("events", {}).get("items", [])]
        self.assertIn(event_id, pending_ids,
                      "Zgłoszona impreza nie pojawiła się w panelu zarządu (admin/pending)")

    def test_EV01b_validation_rejects_bad_dates(self):
        body = _test_event_body("EV01b")
        body["startDate"], body["endDate"] = body["endDate"], body["startDate"]  # start > end
        resp = _api.submit_event_soft(self._token, body)
        self.assertFalse(resp.get("ok"), resp)


# ---------------------------------------------------------------------------
# EV02 — zatwierdzenie → widoczność na liście
# ---------------------------------------------------------------------------

class TestEventApprovalVisibility(_EventsTestBase):
    def test_EV02_approved_event_appears_on_list(self):
        body = _test_event_body("EV02")
        resp = _api.submit_event(self._token, body)
        self.assertTrue(resp.get("ok"), resp)
        event_id = resp["eventId"]
        self._event_ids.append(event_id)

        # Zatwierdzenie (bezpośrednio w Firestore — ścieżka arkuszowa testowana w EV03)
        self._fs.db.collection("events").document(event_id).update({"approved": True})

        events = _api.get_events(self._token).get("events", [])
        self.assertIn(event_id, [e.get("id") for e in events],
                      "Zatwierdzona impreza (przyszła) nie pojawiła się na liście /api/events")


# ---------------------------------------------------------------------------
# EV03 — pełna ścieżka arkuszowa (wymaga oauth_client.json)
# ---------------------------------------------------------------------------

class TestEventSheetFlow(_EventsTestBase):
    def setUp(self):
        super().setUp()
        self._sheets = _sheets_helper_or_none()
        if not self._sheets:
            self.skipTest("Brak tests/e2e/oauth_client.json — testy arkuszowe pominięte")

    def tearDown(self):
        if getattr(self, "_sheets", None):
            for eid in list(self._event_ids):
                self._delete_sheet_row(self._sheets, eid)
        super().tearDown()

    def _find_sheet_row(self, event_id: str) -> dict | None:
        rows = self._sheets.get_all_records(EVENTS_TAB)
        for row in rows:
            if str(row.get("ID", "")).strip() == event_id:
                return row
        return None

    def _set_sheet_cell(self, event_id: str, column_header: str, value: str):
        ws = self._sheets._get_worksheet(EVENTS_TAB)
        headers = [h.strip() for h in ws.row_values(1)]
        col_idx = headers.index(column_header) + 1
        cell = ws.find(event_id)
        ws.update_cell(cell.row, col_idx, value)

    def test_EV03_write_retry_and_sync(self):
        """
        1. submit → run events.writeToSheet → wiersz w arkuszu (Zatwierdzona=NIE)
           [regresja zgłoszonego buga: "dodanie imprezy nie dodaje jej do arkusza"]
        2. ustaw Zatwierdzona=TAK w arkuszu
        3. ponów events.writeToSheet (symulacja retry) → TAK ZACHOWANE (regresja I3)
        4. run events.syncFromSheet → approved=true w Firestore i impreza na liście
        """
        body = _test_event_body("EV03")
        resp = _api.submit_event(self._token, body)
        self.assertTrue(resp.get("ok"), resp)
        event_id = resp["eventId"]
        self._event_ids.append(event_id)
        uid = self._get_event_doc(event_id).get("userUid")

        # 1. Zapis do arkusza (jawne uruchomienie — nie polegamy na auto-jobie)
        self._fs.run_task_and_wait("events.writeToSheet", {"eventId": event_id, "uid": uid})
        row = self._find_sheet_row(event_id)
        self.assertIsNotNone(row, "ZGŁOSZONY BUG: wiersz imprezy nie pojawił się w arkuszu")
        self.assertEqual(str(row.get("Zatwierdzona", "")).strip().upper(), "NIE", row)
        self.assertEqual(str(row.get("nazwa imprezy", "")).strip(), body["name"], row)

        # 2. Zarząd zatwierdza w arkuszu
        self._set_sheet_cell(event_id, "Zatwierdzona", "TAK")

        # 3. Retry joba zapisu — NIE może cofnąć zatwierdzenia (I3)
        self._fs.run_task_and_wait("events.writeToSheet", {"eventId": event_id, "uid": uid})
        row_after_retry = self._find_sheet_row(event_id)
        self.assertEqual(
            str(row_after_retry.get("Zatwierdzona", "")).strip().upper(), "TAK",
            "REGRESJA I3: retry events.writeToSheet nadpisał Zatwierdzona=TAK na NIE",
        )

        # 4. Sync arkusz→Firestore
        self._fs.run_task_and_wait("events.syncFromSheet", {})
        doc = self._get_event_doc(event_id)
        self.assertTrue(doc.get("approved"), f"Po syncu approved nie jest true: {doc}")

        # 4b. Potwierdzenie syncu w arkuszu (I7): kolumna zsynchronizowano wypełniona
        # (asercja tylko gdy kolumna istnieje w zakładce)
        row_after_sync = self._find_sheet_row(event_id)
        zsync_keys = [k for k in row_after_sync.keys() if str(k).strip().lower() == "zsynchronizowano"]
        if zsync_keys:
            self.assertTrue(
                str(row_after_sync.get(zsync_keys[0], "")).strip(),
                "REGRESJA I7: kolumna zsynchronizowano pusta po syncu",
            )

        events = _api.get_events(self._token).get("events", [])
        self.assertIn(event_id, [e.get("id") for e in events],
                      "Zatwierdzona w arkuszu impreza nie pojawiła się na liście w aplikacji")

    def test_EV04_backfill_writes_missing_row(self):
        """
        Impreza z sheetSyncedAt=null bez wiersza w arkuszu (symulacja martwego joba
        writeToSheet) → events.syncFromSheet dopisuje wiersz (backfill).
        """
        body = _test_event_body("EV04")
        ref = self._fs.db.collection("events").document()
        event_id = ref.id
        self._event_ids.append(event_id)
        ref.set({
            "id": event_id,
            "startDate": body["startDate"],
            "endDate": body["endDate"],
            "name": body["name"],
            "location": body["location"],
            "description": body["description"],
            "contact": body["contact"],
            "link": "",
            "approved": False,
            "source": "app",
            "userUid": "e2e-test",
            "userEmail": cfg.member_user_email,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "sheetSyncedAt": None,
            "sheetRowNumber": None,
        })

        self.assertIsNone(self._find_sheet_row(event_id), "Wiersz nie powinien jeszcze istnieć")

        self._fs.run_task_and_wait("events.syncFromSheet", {})

        row = self._find_sheet_row(event_id)
        self.assertIsNotNone(row, "Backfill nie dopisał brakującego wiersza do arkusza")
        self.assertEqual(str(row.get("Zatwierdzona", "")).strip().upper(), "NIE", row)

        doc = self._get_event_doc(event_id)
        self.assertIsNotNone(doc.get("sheetSyncedAt"), "Backfill nie ustawił sheetSyncedAt")


if __name__ == "__main__":
    unittest.main()
