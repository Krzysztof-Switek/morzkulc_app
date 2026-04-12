"""
Firebase Auth helper — obtain ID tokens via Firebase REST API (signInWithPassword).
No browser, no Google OAuth popup. Works for email/password accounts only.
"""
import time
import requests
from config import EnvConfig

SIGN_IN_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
REFRESH_URL = "https://securetoken.googleapis.com/v1/token"


class FirebaseAuthHelper:
    def __init__(self, cfg: EnvConfig):
        self.cfg = cfg
        self._token_cache: dict[str, dict] = {}  # email -> {id_token, refresh_token, expires_at}

    def sign_in(self, email: str, password: str) -> str:
        """Sign in with email/password. Returns ID token."""
        resp = requests.post(
            SIGN_IN_URL,
            params={"key": self.cfg.firebase_api_key},
            json={"email": email, "password": password, "returnSecureToken": True},
            timeout=15,
        )
        if not resp.ok:
            raise RuntimeError(f"Firebase sign-in failed for {email}: {resp.status_code} {resp.text}")
        data = resp.json()
        id_token = data["idToken"]
        refresh_token = data["refreshToken"]
        expires_in = int(data.get("expiresIn", 3600))
        self._token_cache[email] = {
            "id_token": id_token,
            "refresh_token": refresh_token,
            "expires_at": time.time() + expires_in - 60,  # 1 min buffer
        }
        return id_token

    def get_token(self, email: str, password: str) -> str:
        """Return a valid (non-expired) ID token, refreshing if needed."""
        cached = self._token_cache.get(email)
        if cached and time.time() < cached["expires_at"]:
            return cached["id_token"]
        # Try refresh
        if cached and cached.get("refresh_token"):
            try:
                return self._refresh(email, cached["refresh_token"])
            except Exception:
                pass
        # Full sign-in
        return self.sign_in(email, password)

    def _refresh(self, email: str, refresh_token: str) -> str:
        resp = requests.post(
            REFRESH_URL,
            params={"key": self.cfg.firebase_api_key},
            json={"grant_type": "refresh_token", "refresh_token": refresh_token},
            timeout=15,
        )
        if not resp.ok:
            raise RuntimeError(f"Token refresh failed: {resp.status_code} {resp.text}")
        data = resp.json()
        id_token = data["id_token"]
        new_refresh = data["refresh_token"]
        expires_in = int(data.get("expires_in", 3600))
        self._token_cache[email] = {
            "id_token": id_token,
            "refresh_token": new_refresh,
            "expires_at": time.time() + expires_in - 60,
        }
        return id_token

    def test_user_token(self) -> str:
        return self.get_token(self.cfg.test_user_email, self.cfg.test_user_password)

    def admin_user_token(self) -> str:
        return self.get_token(self.cfg.admin_user_email, self.cfg.admin_user_password)