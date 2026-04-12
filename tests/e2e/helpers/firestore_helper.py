"""
Firestore helper — direct access via Firebase Admin SDK with ADC.
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform
"""
import time
import logging
from datetime import datetime, timezone, timedelta
from config import EnvConfig

import firebase_admin
from firebase_admin import credentials, firestore

log = logging.getLogger(__name__)


class FirestoreHelper:
    def __init__(self, cfg: EnvConfig, app_name: str | None = None):
        self.cfg = cfg
        self._app_name = app_name or f"e2e-{cfg.name}-{id(self)}"
        try:
            self._app = firebase_admin.get_app(self._app_name)
        except ValueError:
            cred = credentials.ApplicationDefault()
            self._app = firebase_admin.initialize_app(
                cred,
                {"projectId": cfg.firebase_project_id},
                name=self._app_name,
            )
        self.db = firestore.client(app=self._app)

    # ------------------------------------------------------------------
    # User document helpers
    # ------------------------------------------------------------------

    def get_user(self, uid: str) -> dict | None:
        snap = self.db.collection("users_active").document(uid).get()
        return snap.to_dict() if snap.exists else None

    def get_user_by_email(self, email: str) -> tuple[str, dict] | None:
        email = email.strip().lower()
        snaps = (
            self.db.collection("users_active")
            .where("email", "==", email)
            .limit(1)
            .get()
        )
        for snap in snaps:
            return snap.id, snap.to_dict()
        return None

    def wait_for_user(self, email: str, timeout: int = 30) -> tuple[str, dict]:
        deadline = time.time() + timeout
        while time.time() < deadline:
            result = self.get_user_by_email(email)
            if result:
                return result
            time.sleep(2)
        raise TimeoutError(f"User {email} not found in users_active after {timeout}s")

    def get_user_role_and_status(self, uid: str) -> tuple[str, str]:
        data = self.get_user(uid)
        if not data:
            raise RuntimeError(f"User {uid} not in users_active")
        return data.get("role_key", ""), data.get("status_key", "")

    # ------------------------------------------------------------------
    # Service job queue
    # ------------------------------------------------------------------

    def enqueue_task(self, task_id: str, payload: dict) -> str:
        job_ref = self.db.collection("service_jobs").document()
        job_id = job_ref.id
        job_ref.set({
            "id": job_id,
            "taskId": task_id,
            "payload": payload,
            "status": "queued",
            "attempts": 0,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        log.info(f"Enqueued task {task_id} → job {job_id}")
        return job_id

    def poll_job(self, job_id: str, timeout: int | None = None, interval: int | None = None) -> dict:
        timeout = timeout or self.cfg.job_poll_timeout_seconds
        interval = interval or self.cfg.job_poll_interval_seconds
        deadline = time.time() + timeout
        while time.time() < deadline:
            snap = self.db.collection("service_jobs").document(job_id).get()
            if snap.exists:
                data = snap.to_dict()
                status = data.get("status", "")
                log.debug(f"Job {job_id} status={status}")
                if status in ("done", "dead", "failed"):
                    return data
            time.sleep(interval)
        raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")

    def run_task_and_wait(self, task_id: str, payload: dict, timeout: int | None = None) -> dict:
        job_id = self.enqueue_task(task_id, payload)
        result = self.poll_job(job_id, timeout=timeout)
        if result.get("status") != "done":
            raise RuntimeError(
                f"Task {task_id} ended with status={result.get('status')}: {result.get('error') or result}"
            )
        return result

    # ------------------------------------------------------------------
    # Godzinki (hours) ledger
    # ------------------------------------------------------------------

    def grant_godzinki(self, uid: str, hours: float, note: str = "e2e test grant") -> str:
        """
        Write an approved 'earn' record directly to godzinki_ledger.
        GAP-02: No admin HTTP endpoint for granting hours.

        Field structure mirrors godzinki_service.ts creditOpeningBalance():
          - type: "earn"
          - amount: hours
          - remaining: hours      ← must equal amount for balance to count
          - approved: True        ← must be True for computeBalance() to include it
          - expiresAt: datetime   ← must be in the future
          - grantedAt: datetime
        """
        now = datetime.now(timezone.utc)
        expires_at = now.replace(year=now.year + 4)  # 4 years, matches expiryYears default

        doc_ref = self.db.collection("godzinki_ledger").document()
        doc_ref.set({
            "id": doc_ref.id,
            "uid": uid,
            "type": "earn",
            "amount": float(hours),
            "remaining": float(hours),
            "grantedAt": now,
            "expiresAt": expires_at,
            "approved": True,
            "approvedAt": now,
            "approvedBy": "e2e-test",
            "reason": note,
            "submittedBy": "e2e-test",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        log.info(f"Granted {hours}h to uid={uid}, ledger={doc_ref.id}")
        return doc_ref.id

    def get_godzinki_balance(self, uid: str) -> float:
        """
        Compute balance from godzinki_ledger — mirrors computeBalance() in godzinki_service.ts:
          positive_balance = sum(earn.remaining WHERE approved=True AND expiresAt > now)
          net_overdraft    = sum(spend.overdraft WHERE refunded != True)
                           - sum(purchase.amount WHERE approved != False)
          balance          = positive_balance - net_overdraft
        """
        snaps = self.db.collection("godzinki_ledger").where("uid", "==", uid).get()
        now = datetime.now(timezone.utc)

        positive_balance = 0.0
        net_overdraft = 0.0

        for snap in snaps:
            data = snap.to_dict()
            t = data.get("type", "")

            if t == "earn":
                if data.get("approved") is True:
                    expires_at = data.get("expiresAt")
                    if expires_at:
                        # firebase-admin returns DatetimeWithNanoseconds (subclass of datetime)
                        if hasattr(expires_at, "tzinfo") and expires_at.tzinfo is None:
                            expires_at = expires_at.replace(tzinfo=timezone.utc)
                        if expires_at > now:
                            positive_balance += float(data.get("remaining", 0))
            elif t == "spend":
                if data.get("refunded") is not True:
                    net_overdraft += float(data.get("overdraft", 0))
            elif t == "purchase":
                # approved != False means: True or absent (legacy records)
                if data.get("approved") is not False:
                    net_overdraft -= float(data.get("amount", 0))

        return positive_balance - net_overdraft

    # ------------------------------------------------------------------
    # Setup / vars helpers
    # ------------------------------------------------------------------

    def get_setup_vars_godzinki(self) -> dict:
        snap = self.db.collection("setup").document("vars_godzinki").get()
        return snap.to_dict() if snap.exists else {}

    def get_setup_vars_gear(self) -> dict:
        snap = self.db.collection("setup").document("vars_gear").get()
        return snap.to_dict() if snap.exists else {}

    # ------------------------------------------------------------------
    # Reservation helpers
    # ------------------------------------------------------------------

    def get_user_reservations(self, uid: str) -> list[dict]:
        snaps = (
            self.db.collection("gear_reservations")
            .where("userUid", "==", uid)  # field is "userUid", not "uid"
            .get()
        )
        return [s.to_dict() for s in snaps]

    def get_reservation(self, reservation_id: str) -> dict | None:
        snap = self.db.collection("gear_reservations").document(reservation_id).get()
        return snap.to_dict() if snap.exists else None