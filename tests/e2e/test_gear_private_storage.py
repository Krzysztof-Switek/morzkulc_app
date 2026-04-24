"""
Testy integracyjne — naliczanie opłat za prywatne kajaki (gear.chargePrivateStorage)
=====================================================================================

Weryfikuje:
  PS01 — kajak bez ownerContact (pusty lub brak "@") → gear_storage_charges status="failed"
  PS02 — kajak zarządu/kr z boardDoesNotPay=true → status="exempt", zero-spend w godzinki_ledger
  PS03 — kajak normalnego członka → status="charged", spend w godzinki_ledger, bilans maleje
  PS04 — idempotencja: drugi run w tym samym miesiącu → skipped, rekord nie jest nadpisywany

Strategia:
  - Testy tworzą tymczasowe kajaki w gear_kayaks (z flagą _testFixture=True).
  - Przed uruchomieniem taska BLOKUJE wszystkie prawdziwe kajaki prywatne na czas testu,
    tworząc gear_storage_charges/{id}_{month} z status="blocked-by-test". Dzięki temu
    idempotencja taska pomija realne kajaki i przetwarza tylko nasze testowe.
  - tearDown usuwa kajaki, rekordy opłat i przywraca saldo godzinkowe (via earnDeductions).

Uruchamianie:
    cd tests/e2e
    ENV=prod python -m pytest test_gear_private_storage.py -v

Wymagania .env.test:
    PROD_TEST_MEMBER_EMAIL / PROD_TEST_MEMBER_PASSWORD   — rola_czlonek, status_aktywny
    PROD_TEST_BOARD_EMAIL / PROD_TEST_BOARD_PASSWORD     — rola_zarzad lub rola_kr

UWAGA: test PS03 może chwilowo zmniejszyć bilans godzinkowy konta testowego.
       Bilans jest w pełni przywracany w tearDown via earnDeductions ze spend rekordu.
"""
import os
import sys
import unittest
import logging
from datetime import datetime, timezone

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

from google.cloud import firestore as gcf
from config import ACTIVE as cfg
from helpers.firestore_helper import FirestoreHelper
from firebase_admin import firestore

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Miesiąc testowy — wystarczająco daleko w przeszłości żeby nie kolidować z prawdziwymi
# cyklami. Przed testem blokujemy prawdziwe kajaki na ten miesiąc (patrz _block_real_kayaks).
TEST_MONTH = "2020-06"


def _skip_if_missing(*attrs):
    missing = [a for a in attrs if not getattr(cfg, a, "")]
    if missing:
        return f"Missing config: {', '.join(missing)}"
    return None


class TestGearPrivateStorage(unittest.TestCase):
    """
    Testy naliczania miesięcznych opłat za prywatne kajaki.
    """

    # --- IDs do sprzątania ---
    _created_kayak_ids: list
    _charge_doc_ids: list       # gear_storage_charges IDs (nasze testowe + blokady)
    _spend_doc_ids: list        # godzinki_ledger IDs do przywrócenia/usunięcia
    _buffer_grant_ids: list     # tymczasowe earn granty
    _blocked_charge_ids: list   # blokady prawdziwych kajaków (usuwane osobno w tearDown)

    def setUp(self):
        self._fs = FirestoreHelper(cfg)
        self._created_kayak_ids = []
        self._charge_doc_ids = []
        self._spend_doc_ids = []
        self._buffer_grant_ids = []
        self._blocked_charge_ids = []

        # Odczytaj konfigurację
        gear_vars = self._fs.get_setup_vars_gear()
        vars_map = gear_vars.get("vars") or {}
        self._cost_hours = float((vars_map.get("godzinki_za_sprzęt_prywatny") or {}).get("value") or 0)
        if self._cost_hours <= 0:
            self.skipTest("godzinki_za_sprzęt_prywatny <= 0 w setup/vars_gear — test pomijany")

        self._board_does_not_pay = bool((vars_map.get("zarzad_nie_płaci_za_sprzet") or {}).get("value", False))

        godzinki_vars = self._fs.get_setup_vars_godzinki()
        gv_map = (godzinki_vars.get("vars") or {})
        self._neg_limit = float((gv_map.get("limit_ujemnego_salda") or {}).get("value", 20))

    def tearDown(self):
        # 1. Usuń tymczasowe kajaki
        for kid in self._created_kayak_ids:
            try:
                self._fs.db.collection("gear_kayaks").document(kid).delete()
                log.info(f"tearDown: deleted test kayak {kid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot delete kayak {kid}: {exc}")

        # 2. Usuń rekordy gear_storage_charges (nasze testowe)
        for cid in self._charge_doc_ids:
            try:
                self._fs.db.collection("gear_storage_charges").document(cid).delete()
                log.info(f"tearDown: deleted charge {cid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot delete charge {cid}: {exc}")

        # 3. Usuń blokady prawdziwych kajaków
        for cid in self._blocked_charge_ids:
            try:
                self._fs.db.collection("gear_storage_charges").document(cid).delete()
                log.info(f"tearDown: removed real-kayak block {cid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot delete block {cid}: {exc}")

        # 4. Przywróć godzinki ze spend records i usuń spend records
        for sid in self._spend_doc_ids:
            try:
                snap = self._fs.db.collection("godzinki_ledger").document(sid).get()
                if snap.exists:
                    data = snap.to_dict() or {}
                    earn_deductions = data.get("earnDeductions") or []
                    for ded in earn_deductions:
                        earn_id = ded.get("earnId")
                        deducted = float(ded.get("amount") or 0)
                        if earn_id and deducted > 0:
                            earn_ref = self._fs.db.collection("godzinki_ledger").document(earn_id)
                            earn_snap = earn_ref.get()
                            if earn_snap.exists:
                                current = float((earn_snap.to_dict() or {}).get("remaining") or 0)
                                earn_ref.update({"remaining": current + deducted})
                                log.info(f"tearDown: restored {deducted}h to earn {earn_id}")
                self._fs.db.collection("godzinki_ledger").document(sid).delete()
                log.info(f"tearDown: deleted spend {sid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot restore/delete spend {sid}: {exc}")

        # 5. Usuń tymczasowe granty buforowe
        for gid in self._buffer_grant_ids:
            try:
                self._fs.db.collection("godzinki_ledger").document(gid).delete()
                log.info(f"tearDown: deleted buffer grant {gid}")
            except Exception as exc:
                log.warning(f"tearDown: cannot delete buffer grant {gid}: {exc}")

    # -----------------------------------------------------------------------
    # Pomocnicze
    # -----------------------------------------------------------------------

    def _create_kayak(self, label: str, owner_contact: str, private_since: str = "2019-01-01") -> str:
        """Tworzy tymczasowy prywatny kajak. Zwraca docId."""
        ref = self._fs.db.collection("gear_kayaks").document()
        kid = ref.id
        ref.set({
            "id": kid,
            "number": f"TEST-{label}",
            "isPrivate": True,
            "storage": "Klub",
            "ownerContact": owner_contact,
            "privatesinceinclub": private_since,
            "isPrivateRentable": False,
            "_testFixture": True,
        })
        self._created_kayak_ids.append(kid)
        log.info(f"Created test kayak TEST-{label} id={kid}")
        return kid

    def _block_real_kayaks(self, month: str):
        """
        Blokuje prawdziwe prywatne kajaki na podany miesiąc testowy, żeby task je pominął.
        Tworzy gear_storage_charges/{id}_{month} z status='blocked-by-test' tylko tam gdzie
        rekord jeszcze nie istnieje.
        """
        snaps = self._fs.db.collection("gear_kayaks").where("isPrivate", "==", True).get()
        for snap in snaps:
            data = snap.to_dict() or {}
            if data.get("_testFixture"):
                continue  # nasze kajaki pomijamy
            kayak_id = str(data.get("id") or snap.id)
            charge_id = f"{kayak_id}_{month}"
            charge_ref = self._fs.db.collection("gear_storage_charges").document(charge_id)
            if not charge_ref.get().exists:
                charge_ref.set({
                    "kayakId": kayak_id,
                    "billingMonth": month,
                    "status": "blocked-by-test",
                    "message": "Temporary e2e test block",
                    "createdAt": firestore.SERVER_TIMESTAMP,
                })
                self._blocked_charge_ids.append(charge_id)
                log.info(f"Blocked real kayak {kayak_id} for {month}")

    def _run_task(self, dry: bool = False) -> dict:
        job = self._fs.run_task_and_wait(
            "gear.chargePrivateStorage",
            {"month": TEST_MONTH, "dry": dry},
        )
        result = job.get("result") or {}
        log.info(f"Task result: {result}")
        return result

    def _get_charge(self, kayak_id: str) -> dict | None:
        charge_id = f"{kayak_id}_{TEST_MONTH}"
        snap = self._fs.db.collection("gear_storage_charges").document(charge_id).get()
        return snap.to_dict() if snap.exists else None

    def _find_spend_for_kayak(self, uid: str, kayak_number: str) -> tuple | None:
        """Szuka spend rekordu w godzinki_ledger powiązanego z kajak_number i TEST_MONTH."""
        snaps = (
            self._fs.db.collection("godzinki_ledger")
            .where("uid", "==", uid)
            .where("type", "==", "spend")
            .get()
        )
        for snap in snaps:
            d = snap.to_dict() or {}
            reason = d.get("reason") or ""
            if kayak_number in reason and TEST_MONTH in reason:
                return snap.id, d
        return None

    def _ensure_enough_balance(self, uid: str) -> str | None:
        """
        Jeśli balance + neg_limit < costHours, dodaje tymczasowy grant buforowy ze starą datą
        (grantedAt=2019-01-01) żeby FIFO wziął z niego pierwsze. Zwraca grant_id lub None.
        """
        current_balance = self._fs.get_godzinki_balance(uid)
        needed = self._cost_hours - (current_balance + self._neg_limit)
        if needed <= 0:
            log.info(f"Balance {current_balance}h + limit {self._neg_limit}h — wystarczy bez grantu")
            return None

        buffer = needed + 5  # margines
        ref = self._fs.db.collection("godzinki_ledger").document()
        old_date = datetime(2019, 1, 1, tzinfo=timezone.utc)
        ref.set({
            "id": ref.id,
            "uid": uid,
            "type": "earn",
            "amount": float(buffer),
            "remaining": float(buffer),
            "grantedAt": old_date,
            "expiresAt": datetime(2030, 1, 1, tzinfo=timezone.utc),
            "approved": True,
            "approvedAt": old_date,
            "approvedBy": "e2e-test-ps03",
            "reason": "e2e PS03 buffer grant",
            "submittedBy": "e2e-test",
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        self._buffer_grant_ids.append(ref.id)
        log.info(f"Created buffer grant {ref.id}: {buffer}h for uid={uid}")
        return ref.id

    # -----------------------------------------------------------------------
    # PS01 — brakujący/nieprawidłowy email
    # -----------------------------------------------------------------------

    def test_PS01_empty_owner_contact_creates_failed_record(self):
        """Kajak bez ownerContact → gear_storage_charges status='failed'"""
        kayak_id = self._create_kayak("NOEMAIL", owner_contact="")
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        self._run_task()

        charge = self._get_charge(kayak_id)
        self.assertIsNotNone(charge, f"Brak rekordu gear_storage_charges dla kajaka bez emaila")
        self.assertEqual(charge.get("status"), "failed", charge)
        self.assertIn("ownercontact", (charge.get("message") or "").lower(), charge)

    def test_PS01b_invalid_email_no_at_creates_failed_record(self):
        """Kajak z emailem bez @ → gear_storage_charges status='failed'"""
        kayak_id = self._create_kayak("BADEMAIL", owner_contact="notanemail")
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        self._run_task()

        charge = self._get_charge(kayak_id)
        self.assertIsNotNone(charge, "Brak rekordu dla emaila bez @")
        self.assertEqual(charge.get("status"), "failed", charge)

    def test_PS01c_second_run_same_month_does_not_overwrite_failed(self):
        """Idempotencja dla 'failed': drugi run w tym samym miesiącu → rekord nie jest nadpisywany"""
        kayak_id = self._create_kayak("IDEM_FAIL", owner_contact="")
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        self._run_task()
        charge_first = self._get_charge(kayak_id)
        self.assertIsNotNone(charge_first, "Brak rekordu po pierwszym runie")

        # Drugi run — powinien pominąć kajak (idempotencja)
        self._run_task()
        charge_second = self._get_charge(kayak_id)

        self.assertEqual(charge_second.get("status"), "failed", charge_second)
        # createdAt nie zmienił się
        self.assertEqual(
            charge_first.get("createdAt"), charge_second.get("createdAt"),
            "createdAt zmienił się — idempotencja nie działa",
        )

    # -----------------------------------------------------------------------
    # PS02 — zarząd/kr zwolniony
    # -----------------------------------------------------------------------

    def test_PS02_board_exempt_creates_exempt_record_and_zero_spend(self):
        """Zarząd z boardDoesNotPay=true → status='exempt', hoursCharged=0, zero-spend w godzinki_ledger"""
        if not self._board_does_not_pay:
            self.skipTest("boardDoesNotPay=false w setupie — test nie dotyczy")

        skip = _skip_if_missing("board_user_email")
        if skip:
            self.skipTest(skip)

        board_result = self._fs.get_user_by_email(cfg.board_user_email)
        if not board_result:
            self.skipTest(f"Brak {cfg.board_user_email} w users_active")
        board_uid, board_data = board_result

        role = board_data.get("role_key", "")
        if role not in ("rola_zarzad", "rola_kr"):
            self.skipTest(f"{cfg.board_user_email} ma rolę {role!r}, oczekiwano rola_zarzad/rola_kr")

        kayak_id = self._create_kayak("BOARD", owner_contact=cfg.board_user_email)
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        balance_before = self._fs.get_godzinki_balance(board_uid)

        self._run_task()

        # Sprawdź charge record
        charge = self._get_charge(kayak_id)
        self.assertIsNotNone(charge, "Brak rekordu gear_storage_charges dla zarządu")
        self.assertEqual(charge.get("status"), "exempt", charge)
        self.assertEqual(charge.get("hoursCharged"), 0, charge)
        self.assertIn("boardDoesNotPay", charge.get("message") or "", charge)
        self.assertIn(role, charge.get("message") or "", charge)

        # Sprawdź zero-spend w godzinki_ledger
        spend_result = self._find_spend_for_kayak(board_uid, "TEST-BOARD")
        self.assertIsNotNone(spend_result, "Brak zero-spend rekordu w godzinki_ledger dla zarządu")
        spend_id, spend_data = spend_result
        self._spend_doc_ids.append(spend_id)  # tearDown usunie

        self.assertEqual(spend_data.get("amount"), 0, spend_data)
        self.assertEqual(spend_data.get("fromEarn"), 0, spend_data)
        self.assertEqual(spend_data.get("overdraft"), 0, spend_data)

        # Bilans nie powinien się zmienić
        balance_after = self._fs.get_godzinki_balance(board_uid)
        self.assertAlmostEqual(
            balance_before, balance_after, places=2,
            msg=f"Bilans zarządu zmienił się: przed={balance_before}, po={balance_after}",
        )

    def test_PS02b_board_exempt_idempotency(self):
        """Drugi run dla zarządu — kajak skipped (nie tworzy drugiego exempt rekordu)"""
        if not self._board_does_not_pay:
            self.skipTest("boardDoesNotPay=false — test nie dotyczy")

        skip = _skip_if_missing("board_user_email")
        if skip:
            self.skipTest(skip)

        board_result = self._fs.get_user_by_email(cfg.board_user_email)
        if not board_result:
            self.skipTest(f"Brak {cfg.board_user_email} w users_active")
        board_uid, _ = board_result

        kayak_id = self._create_kayak("BOARD2", owner_contact=cfg.board_user_email)
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        # Pierwszy run
        self._run_task()
        spend_before = self._find_spend_for_kayak(board_uid, "TEST-BOARD2")
        if spend_before:
            self._spend_doc_ids.append(spend_before[0])

        charge_first = self._get_charge(kayak_id)
        first_created_at = charge_first.get("createdAt") if charge_first else None

        # Drugi run
        self._run_task()
        charge_second = self._get_charge(kayak_id)

        self.assertEqual(charge_second.get("status"), "exempt", charge_second)
        self.assertEqual(charge_second.get("createdAt"), first_created_at,
                         "createdAt zmienił się po drugim runie — brak idempotencji")

        # Sprawdź że nie pojawił się drugi spend z zerowym amount
        spend_snaps = (
            self._fs.db.collection("godzinki_ledger")
            .where("uid", "==", board_uid)
            .where("type", "==", "spend")
            .get()
        )
        board2_spends = [
            s for s in spend_snaps
            if "TEST-BOARD2" in (s.to_dict().get("reason") or "")
            and TEST_MONTH in (s.to_dict().get("reason") or "")
        ]
        self.assertEqual(len(board2_spends), 1,
                         f"Oczekiwano 1 spend rekordu dla zarządu, znaleziono {len(board2_spends)}")

    # -----------------------------------------------------------------------
    # PS03 — normalny członek
    # -----------------------------------------------------------------------

    def test_PS03_member_charge_creates_charged_record_and_deducts_balance(self):
        """Normalny członek → status='charged', spend w godzinki_ledger, bilans maleje o costHours"""
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)

        member_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not member_result:
            self.skipTest(f"Brak {cfg.member_user_email} w users_active")
        uid, member_data = member_result

        role = member_data.get("role_key", "")
        if role in ("rola_zarzad", "rola_kr") and self._board_does_not_pay:
            self.skipTest(f"member_user_email ma rolę {role!r} + boardDoesNotPay=true — użyj innego konta")

        kayak_id = self._create_kayak("MEMBER", owner_contact=cfg.member_user_email)
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        # Zapewnij wystarczające saldo
        self._ensure_enough_balance(uid)

        balance_before = self._fs.get_godzinki_balance(uid)

        self._run_task()

        # Sprawdź charge record
        charge = self._get_charge(kayak_id)
        self.assertIsNotNone(charge, "Brak rekordu gear_storage_charges dla członka")
        self.assertEqual(charge.get("status"), "charged", charge)
        self.assertEqual(float(charge.get("hoursCharged") or 0), self._cost_hours, charge)
        self.assertEqual(charge.get("uid"), uid, charge)

        # Sprawdź spend w godzinki_ledger
        spend_result = self._find_spend_for_kayak(uid, "TEST-MEMBER")
        self.assertIsNotNone(spend_result, "Brak spend rekordu w godzinki_ledger dla członka")
        spend_id, spend_data = spend_result
        self._spend_doc_ids.append(spend_id)  # tearDown przywróci earn i usunie

        self.assertEqual(float(spend_data.get("amount") or 0), self._cost_hours, spend_data)
        self.assertIsNotNone(spend_data.get("reason"), spend_data)
        self.assertIn(TEST_MONTH, spend_data.get("reason") or "", spend_data)

        # Bilans powinien spaść o costHours
        balance_after = self._fs.get_godzinki_balance(uid)
        self.assertAlmostEqual(
            balance_after, balance_before - self._cost_hours, places=2,
            msg=f"Bilans po naliczeniu: oczekiwano {balance_before - self._cost_hours:.2f}, otrzymano {balance_after:.2f}",
        )

    def test_PS03b_charged_record_idempotency(self):
        """Drugi run dla naładowanego kajaka → skipped, bilans nie zmienia się drugi raz"""
        skip = _skip_if_missing("member_user_email", "member_user_password")
        if skip:
            self.skipTest(skip)

        member_result = self._fs.get_user_by_email(cfg.member_user_email)
        if not member_result:
            self.skipTest(f"Brak {cfg.member_user_email} w users_active")
        uid, member_data = member_result

        role = member_data.get("role_key", "")
        if role in ("rola_zarzad", "rola_kr") and self._board_does_not_pay:
            self.skipTest(f"member_user_email ma rolę {role!r} + boardDoesNotPay=true")

        kayak_id = self._create_kayak("MEMBER2", owner_contact=cfg.member_user_email)
        self._charge_doc_ids.append(f"{kayak_id}_{TEST_MONTH}")
        self._block_real_kayaks(TEST_MONTH)

        self._ensure_enough_balance(uid)

        # Pierwszy run
        self._run_task()
        charge_first = self._get_charge(kayak_id)
        self.assertIsNotNone(charge_first)
        self.assertEqual(charge_first.get("status"), "charged", charge_first)

        spend_result = self._find_spend_for_kayak(uid, "TEST-MEMBER2")
        if spend_result:
            self._spend_doc_ids.append(spend_result[0])

        balance_after_first = self._fs.get_godzinki_balance(uid)

        # Drugi run
        self._run_task()
        balance_after_second = self._fs.get_godzinki_balance(uid)

        self.assertAlmostEqual(
            balance_after_first, balance_after_second, places=2,
            msg=f"Bilans zmienił się po drugim runie — idempotencja nie działa",
        )

        charge_second = self._get_charge(kayak_id)
        self.assertEqual(charge_second.get("status"), "charged", charge_second)
        self.assertEqual(
            charge_second.get("createdAt"), charge_first.get("createdAt"),
            "createdAt zmienił się — rekord był nadpisywany",
        )


if __name__ == "__main__":
    unittest.main()
