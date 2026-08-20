# Plan wdrożenia testów – logowanie, rejestracja, obsługa kont, bezpieczeństwo

**Data:** 2026-04-10  
**Na podstawie:** `audyt_testow_logowanie_uzytkownicy_v1.md`  
**Kolejność:** od luk krytycznych do średnich

---

## Przegląd zmian

| # | Nowy plik / zmiana | Pokrywane luki | Priorytet |
|---|--------------------|---------------|----------|
| 1 | `tests/test_security_http.py` (nowy) | L1 – CORS, auth middleware | KRYTYCZNY |
| 2 | `tests/e2e/phases/phase_A_suspended_user.py` (nowy) | L2 – zawieszony/skreślony | KRYTYCZNY |
| 3 | `tests/e2e/config.py` (rozszerzenie) | L2, L4 – nowe konta testowe | KRYTYCZNY |
| 4 | `tests/e2e/phases/phase_1_registration.py` (rozszerzenie) | L7, L9 – negatywne, idempotentność | WYSOKI |
| 5 | `tests/test_register_bo26.py` (nowy) | L4 – logika BO26 | WYSOKI |
| 6 | `tests/e2e/phases/phase_B_module_visibility.py` (nowy) | L5 – widoczność modułów | WYSOKI |
| 7 | `tests/e2e/phases/phase_2_role_change_via_sheet.py` (rozszerzenie) | L8 – wiele ról | ŚREDNI |
| 8 | `tests/e2e/run_e2e.py` (aktualizacja) | wszystkie nowe fazy | TOWARZYSZĄCE |
| 9 | Konfiguracja kont testowych (Firebase Auth DEV) | L2, L4, L6 | INFRASTRUKTURA |

> **L3 (Firestore Rules)** — pominięte w tym planie. Wymaga najpierw etapu 3 z `plan_audyt_v2.md`  
> (pobranie reguł `firebase firestore:get-rules > firestore.rules`). Testy reguł dojdą w osobnej iteracji.  
> **L6 (sesja 24h)** — pomięte. Logika wyłącznie frontendowa (`sessionStorage`); testowanie wymaga  
> Playwright z manipulacją czasem systemowym lub `Date.now()` mock — zakres na przyszłą iterację.  
> **L10 (scheduler `usersSyncRolesDaily`)** — scheduler testowany pośrednio przez P2 (wywołuje ten sam task).

---

## Krok 0 — Konfiguracja kont testowych (infrastruktura)

Wykonaj **ręcznie** (raz, przed uruchomieniem testów):

### 0.1 Utwórz konta w Firebase Auth (DEV: `sprzet-skk-morzkulc`)

W Firebase Console → Authentication → Users → Add user:

| Email | Hasło | Cel |
|-------|-------|-----|
| `test-zawieszony@morzkulc.pl` | (losowe, zapisz w `.env`) | Test blokady dla zawieszonych |
| `test-skreslony@morzkulc.pl` | (losowe, zapisz w `.env`) | Test blokady dla skreślonych |
| `test-nowy@morzkulc.pl` | (losowe, zapisz w `.env`) | Test roli sympatyk (spoza BO26) |

Po utworzeniu — pobierz UID z Firebase Console (Authentication → skopiuj UID).

### 0.2 Utwórz dokumenty w Firestore `users_active` (DEV)

Dla `test-zawieszony`:
```json
{
  "uid": "<UID-zawieszony>",
  "email": "test-zawieszony@morzkulc.pl",
  "role_key": "rola_czlonek",
  "status_key": "status_zawieszony",
  "profile": {"firstName": "Test", "lastName": "Zawieszony"},
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

Dla `test-skreslony`:
```json
{
  "uid": "<UID-skreslony>",
  "email": "test-skreslony@morzkulc.pl",
  "role_key": "rola_czlonek",
  "status_key": "status_skreslony",
  "profile": {"firstName": "Test", "lastName": "Skreslony"},
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

Dla `test-nowy` — **nie twórz** dokumentu w `users_active` ani wpisu w `users_opening_balance_26`. Będzie tworzony przez `/api/register` w teście.

### 0.3 Sprawdź `setup/app` — `statusMappings`

Upewnij się, że w Firestore `setup/app` masz:
```json
{
  "statusMappings": {
    "status_zawieszony": {"label": "Zawieszony", "blocksAccess": true},
    "status_skreslony": {"label": "Skreślony", "blocksAccess": true}
  }
}
```
Bez `blocksAccess: true` użytkownik nie zostanie zablokowany (warunek w `index.ts`).

### 0.4 Dodaj zmienne środowiskowe

Do pliku `.env` (lub systemu env) używanego przez testy dodaj:
```
DEV_SUSPENDED_USER_EMAIL=test-zawieszony@morzkulc.pl
DEV_SUSPENDED_USER_PASSWORD=<hasło>
DEV_DELETED_USER_EMAIL=test-skreslony@morzkulc.pl
DEV_DELETED_USER_PASSWORD=<hasło>
DEV_NEW_USER_EMAIL=test-nowy@morzkulc.pl
DEV_NEW_USER_PASSWORD=<hasło>
DEV_NEW_USER_FIRST_NAME=Nowy
DEV_NEW_USER_LAST_NAME=Testowy
DEV_NEW_USER_PHONE=+48600900800
DEV_NEW_USER_DOB=1995-03-20
```

---

## Krok 1 — `tests/test_security_http.py` (nowy plik)

**Cel:** Pokrycie L1 — CORS, host allowlist, brak tokenu, błędny token, admin endpoint.  
**Nie wymaga** kont Google OAuth ani Firebase emulatorów. Używa `requests` bezpośrednio.  
**Ważne:** Musi korzystać z poprawnego `X-Forwarded-Host` (lub `Host`) — inaczej middleware zablokuje wszystkie żądania.

### Wzorzec importów i setup

```python
# tests/test_security_http.py
import unittest
import requests
from tests.e2e.config import ACTIVE as cfg
from tests.e2e.helpers.firebase_auth import FirebaseAuthHelper

BASE = cfg.app_base_url.rstrip("/")
VALID_ORIGIN = BASE  # np. "https://morzkulc-e9df7.web.app"
VALID_HOST = BASE.replace("https://", "").replace("http://", "")  # np. "morzkulc-e9df7.web.app"
REGISTER_URL = f"{BASE}/api/register"
SETUP_URL = f"{BASE}/api/setup"
ADMIN_SETUP_URL = f"{BASE}/api/admin/setup"

_auth = FirebaseAuthHelper(cfg)


def valid_headers(token: str | None = None) -> dict:
    """Nagłówki z poprawnym Origin i Host — przechodzą przez middleware."""
    h = {
        "Origin": VALID_ORIGIN,
        "X-Forwarded-Host": VALID_HOST,
        "Content-Type": "application/json",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h
```

### Testy klasy `TestAuthMiddleware`

```python
class TestAuthMiddleware(unittest.TestCase):

    def test_register_no_token_returns_401(self):
        """POST /api/register bez Authorization → 401."""
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers())
        self.assertEqual(resp.status_code, 401, resp.text)

    def test_register_bad_token_returns_401(self):
        """POST /api/register z błędnym tokenem → 401."""
        headers = valid_headers("bad.token.here")
        resp = requests.post(REGISTER_URL, json={}, headers=headers)
        self.assertEqual(resp.status_code, 401, resp.text)

    def test_setup_no_token_returns_401(self):
        """GET /api/setup bez Authorization → 401."""
        resp = requests.get(SETUP_URL, headers=valid_headers())
        self.assertEqual(resp.status_code, 401, resp.text)

    def test_admin_setup_non_admin_returns_403(self):
        """POST /api/admin/setup z tokenem nie-admina → 403."""
        token = _auth.test_user_token()
        resp = requests.post(ADMIN_SETUP_URL, json={}, headers=valid_headers(token))
        self.assertIn(resp.status_code, [403, 404], resp.text)
        # 404 akceptujemy — endpoint może nie istnieć na tym projekcie
```

### Testy klasy `TestHostAllowlist`

```python
class TestHostAllowlist(unittest.TestCase):

    def test_unknown_host_returns_403(self):
        """Żądanie z nieznanym hostem → 403 (host allowlist)."""
        headers = {
            "Origin": "https://evil.example.com",
            "X-Forwarded-Host": "evil.example.com",
            "Content-Type": "application/json",
        }
        resp = requests.post(REGISTER_URL, json={}, headers=headers)
        self.assertEqual(resp.status_code, 403, resp.text)

    def test_known_host_preflight_passes(self):
        """OPTIONS z poprawnym hostem i Origin → 204 (preflight OK)."""
        headers = {
            "Origin": VALID_ORIGIN,
            "X-Forwarded-Host": VALID_HOST,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        }
        resp = requests.options(REGISTER_URL, headers=headers)
        self.assertIn(resp.status_code, [200, 204], resp.text)

    def test_unknown_origin_preflight_blocked(self):
        """OPTIONS z nieznanym Origin → 403 lub brak ACAO nagłówka."""
        headers = {
            "Origin": "https://evil.example.com",
            "X-Forwarded-Host": VALID_HOST,  # poprawny host
            "Access-Control-Request-Method": "POST",
        }
        resp = requests.options(REGISTER_URL, headers=headers)
        # Może być 403 (jawna blokada) lub 204 bez ACAO header (silent reject)
        if resp.status_code == 204:
            acao = resp.headers.get("Access-Control-Allow-Origin", "")
            self.assertNotEqual(acao, "https://evil.example.com",
                                "Zły origin nie powinien być w ACAO")
        else:
            self.assertEqual(resp.status_code, 403, resp.text)

    def test_valid_origin_in_cors_response_header(self):
        """Odpowiedź z poprawnym tokenem zawiera ACAO z dozwolonym Origin."""
        token = _auth.test_user_token()
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token))
        acao = resp.headers.get("Access-Control-Allow-Origin", "")
        # Jeśli serwer zwraca ACAO — musi być równy VALID_ORIGIN
        if acao:
            self.assertEqual(acao, VALID_ORIGIN)
```

### Testy klasy `TestSuspendedUser`

```python
class TestSuspendedUser(unittest.TestCase):
    """Wymaga konta test-zawieszony i test-skreslony z kroku 0."""

    @classmethod
    def setUpClass(cls):
        import os
        cls.susp_email = os.environ.get("DEV_SUSPENDED_USER_EMAIL", "")
        cls.susp_pass = os.environ.get("DEV_SUSPENDED_USER_PASSWORD", "")
        cls.del_email = os.environ.get("DEV_DELETED_USER_EMAIL", "")
        cls.del_pass = os.environ.get("DEV_DELETED_USER_PASSWORD", "")

    def _skip_if_no_creds(self, email, password):
        if not email or not password:
            self.skipTest("Brak konfiguracji konta testowego")

    def test_suspended_user_register_returns_403(self):
        """Zawieszony użytkownik → POST /api/register → 403."""
        self._skip_if_no_creds(self.susp_email, self.susp_pass)
        token = _auth.get_token(self.susp_email, self.susp_pass)
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token))
        self.assertEqual(resp.status_code, 403, resp.text)

    def test_deleted_user_register_returns_403(self):
        """Skreślony użytkownik → POST /api/register → 403."""
        self._skip_if_no_creds(self.del_email, self.del_pass)
        token = _auth.get_token(self.del_email, self.del_pass)
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token))
        self.assertEqual(resp.status_code, 403, resp.text)

    def test_suspended_user_setup_returns_403(self):
        """Zawieszony użytkownik → GET /api/setup → 403."""
        self._skip_if_no_creds(self.susp_email, self.susp_pass)
        token = _auth.get_token(self.susp_email, self.susp_pass)
        resp = requests.get(SETUP_URL, headers=valid_headers(token))
        self.assertEqual(resp.status_code, 403, resp.text)
```

**Uwaga techniczna:** `checkUserSuspended` w `index.ts` sprawdza `setup.statusMappings[statusKey].blocksAccess === true` — jeśli `setup/app` nie ma tego pola, użytkownik NIE zostanie zablokowany. Upewnij się, że krok 0.3 jest wykonany.

---

## Krok 2 — `tests/e2e/config.py` (rozszerzenie)

Dodaj 3 nowe pola do `EnvConfig` oraz ich wartości w blokach `DEV` i `PROD`:

```python
# Dodaj do dataclass EnvConfig:
suspended_user_email: str = ""
suspended_user_password: str = ""
deleted_user_email: str = ""
deleted_user_password: str = ""
new_user_email: str = ""         # spoza BO26 → rola_sympatyk
new_user_password: str = ""
new_user_first_name: str = ""
new_user_last_name: str = ""
new_user_phone: str = ""
new_user_date_of_birth: str = ""
```

```python
# Dodaj do bloku DEV = EnvConfig(...):
suspended_user_email=os.environ.get("DEV_SUSPENDED_USER_EMAIL", ""),
suspended_user_password=os.environ.get("DEV_SUSPENDED_USER_PASSWORD", ""),
deleted_user_email=os.environ.get("DEV_DELETED_USER_EMAIL", ""),
deleted_user_password=os.environ.get("DEV_DELETED_USER_PASSWORD", ""),
new_user_email=os.environ.get("DEV_NEW_USER_EMAIL", ""),
new_user_password=os.environ.get("DEV_NEW_USER_PASSWORD", ""),
new_user_first_name=os.environ.get("DEV_NEW_USER_FIRST_NAME", "Nowy"),
new_user_last_name=os.environ.get("DEV_NEW_USER_LAST_NAME", "Testowy"),
new_user_phone=os.environ.get("DEV_NEW_USER_PHONE", ""),
new_user_date_of_birth=os.environ.get("DEV_NEW_USER_DOB", ""),
```

Analogicznie w bloku `PROD` z prefixem `PROD_`.

---

## Krok 3 — Rozszerzenie `phase_1_registration.py`

Bieżący plik kończy się na linii 129. Dodaj na końcu funkcji `run()`, po bloku weryfikacji Sheets, dwa dodatkowe scenariusze:

### 3.1 Idempotentność rejestracji (L9)

```python
# Po sukcesie P1 (user już zarejestrowany) — wywołaj register ponownie
log.info("Testing idempotent re-registration ...")
reg_result_2 = api.register(token, profile)
existed_flag = reg_result_2.get("existed", None)
if existed_flag is not True:
    raise AssertionError(
        f"Re-registration should return existed=True, got: existed={existed_flag!r}. "
        f"Full response: {reg_result_2}"
    )
log.info(f"Idempotent re-registration OK: existed=True, uid={reg_result_2.get('uid')}")
```

### 3.2 Rejestracja z niekompletnym profilem (L7)

```python
# Test z pustym profilem — profileComplete powinno być False
log.info("Testing registration with empty profile ...")
reg_empty = api.register(token, {})
if reg_empty.get("profileComplete") is not False:
    log.warning(
        f"Expected profileComplete=False for empty profile, got: {reg_empty.get('profileComplete')!r}"
    )
# To nie jest błąd krytyczny (user może już mieć profil z poprzedniego kroku),
# więc tylko logujemy ostrzeżenie.
```

---

## Krok 4 — `tests/test_register_bo26.py` (nowy plik)

**Cel:** Pokrycie L4 — weryfikacja logiki BO26 (bootstrapping roli przy rejestracji).  
**Wymaga:** konta `test-nowy@morzkulc.pl` spoza `users_opening_balance_26` (krok 0.1).

```python
# tests/test_register_bo26.py
import unittest
import requests
from tests.e2e.config import ACTIVE as cfg
from tests.e2e.helpers.firebase_auth import FirebaseAuthHelper
from tests.e2e.helpers.firestore_helper import FirestoreHelper

BASE = cfg.app_base_url.rstrip("/")
REGISTER_URL = f"{BASE}/api/register"
VALID_ORIGIN = BASE
VALID_HOST = BASE.replace("https://", "").replace("http://", "")

_auth = FirebaseAuthHelper(cfg)
_fs = FirestoreHelper(cfg)


def valid_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Origin": VALID_ORIGIN,
        "X-Forwarded-Host": VALID_HOST,
        "Content-Type": "application/json",
    }


class TestRegistrationBO26Logic(unittest.TestCase):
    """
    Testuje logikę przyznawania roli przy rejestracji:
    - Email w BO26 + "członek stowarzyszenia"=True → rola_czlonek
    - Email poza BO26 → rola_sympatyk (domyślna)

    UWAGA: Test dla rola_czlonek wymaga, aby konto testowe (test_user_email)
    miało wpis w users_opening_balance_26 z "członek stowarzyszenia"=True.
    Test dla rola_sympatyk używa new_user_email (spoza BO26).
    """

    def setUp(self):
        if not cfg.new_user_email or not cfg.new_user_password:
            self.skipTest("DEV_NEW_USER_EMAIL / DEV_NEW_USER_PASSWORD nie skonfigurowane")

    def test_new_user_not_in_bo26_gets_rola_sympatyk(self):
        """Nowy użytkownik spoza BO26 powinien otrzymać rola_sympatyk."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)

        profile = {
            "firstName": cfg.new_user_first_name,
            "lastName": cfg.new_user_last_name,
            "nickname": "nowak",
            "phone": cfg.new_user_phone,
            "dateOfBirth": cfg.new_user_date_of_birth,
            "consentRodo": True,
            "consentStatute": True,
        }
        resp = requests.post(REGISTER_URL, json={"profile": profile}, headers=valid_headers(token))
        self.assertEqual(resp.status_code, 200, resp.text)

        data = resp.json()
        self.assertTrue(data.get("ok"), f"Rejestracja zwróciła ok=False: {data}")

        role_key = data.get("role_key", "")
        opening_match = data.get("openingMatch", None)

        self.assertFalse(opening_match,
                         f"Użytkownik spoza BO26 nie powinien mieć openingMatch=True, got: {opening_match}")
        self.assertEqual(role_key, "rola_sympatyk",
                         f"Oczekiwano rola_sympatyk, otrzymano: {role_key!r}")

    def test_new_user_not_in_bo26_profile_complete(self):
        """Rejestracja z pełnym profilem → profileComplete=True."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)

        profile = {
            "firstName": cfg.new_user_first_name,
            "lastName": cfg.new_user_last_name,
            "nickname": "nowak",
            "phone": cfg.new_user_phone,
            "dateOfBirth": cfg.new_user_date_of_birth,
            "consentRodo": True,
            "consentStatute": True,
        }
        resp = requests.post(REGISTER_URL, json={"profile": profile}, headers=valid_headers(token))
        data = resp.json()
        self.assertTrue(data.get("profileComplete"),
                        f"Pełny profil powinien dawać profileComplete=True: {data}")

    def test_existing_user_in_bo26_gets_rola_czlonek(self):
        """Użytkownik z BO26 (członek stowarzyszenia=True) → rola_czlonek."""
        # Ten test działa tylko jeśli test_user_email jest w users_opening_balance_26
        # z polem "członek stowarzyszenia"=True.
        token = _auth.test_user_token()

        # Sprawdź w Firestore czy user ma rola_czlonek
        user_data = _fs.get_user_by_email(cfg.test_user_email)
        if user_data is None:
            self.skipTest(f"Brak użytkownika {cfg.test_user_email} w Firestore")

        uid, data = user_data
        role_key = data.get("role_key", "")

        # Wywołaj register ponownie (idempotentne)
        resp = requests.post(REGISTER_URL, json={}, headers=valid_headers(token))
        reg_data = resp.json()

        returned_role = reg_data.get("role_key", "")

        if reg_data.get("openingMatch"):
            # Jeśli user był w BO26 — rola powinna być czlonek
            self.assertEqual(returned_role, "rola_czlonek",
                             f"Użytkownik BO26 powinien mieć rola_czlonek, ma: {returned_role!r}")
        else:
            # Jeśli test_user nie jest w BO26 — pomijamy asercję roli
            self.skipTest(
                f"test_user_email={cfg.test_user_email} nie jest w BO26 — "
                "nie można testować logiki czlonek. Sprawdź dane testowe."
            )

    def test_registration_validation_missing_required_fields(self):
        """POST /api/register z profilem bez wymaganych pól → validation_failed."""
        token = _auth.get_token(cfg.new_user_email, cfg.new_user_password)

        # Profil bez firstName i lastName (wymagane)
        incomplete_profile = {
            "consentRodo": True,
            "consentStatute": True,
        }
        resp = requests.post(
            REGISTER_URL,
            json={"profile": incomplete_profile},
            headers=valid_headers(token),
        )
        # Serwer może zwrócić 200 z profileComplete=False lub 400 z validation_failed
        self.assertIn(resp.status_code, [200, 400], resp.text)

        data = resp.json()
        if resp.status_code == 200:
            self.assertFalse(data.get("profileComplete"),
                             f"Niekompletny profil powinien dawać profileComplete=False: {data}")
        else:
            self.assertEqual(data.get("code"), "validation_failed",
                             f"Oczekiwano code=validation_failed: {data}")

    def tearDown(self):
        """Sprzątanie: usuń użytkownika test-nowy z users_active po testach."""
        if not cfg.new_user_email:
            return
        try:
            result = _fs.get_user_by_email(cfg.new_user_email)
            if result:
                uid, _ = result
                _fs.db.collection("users_active").document(uid).delete()
        except Exception:
            pass  # Sprzątanie best-effort
```

---

## Krok 5 — `tests/e2e/phases/phase_A_suspended_user.py` (nowy plik)

**Cel:** L2 — weryfikacja blokady dla zawieszonych i skreślonych.

```python
"""
Phase A: Suspended / deleted user access blocking
- Verify that users with status_zawieszony → 403 on all API endpoints
- Verify that users with status_skreslony → 403 on all API endpoints

Requires:
  DEV_SUSPENDED_USER_EMAIL, DEV_SUSPENDED_USER_PASSWORD
  DEV_DELETED_USER_EMAIL, DEV_DELETED_USER_PASSWORD
"""
import time
import logging
import requests
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "PA"
    name = "Suspended/Deleted user access blocking"

    if not cfg.suspended_user_email or not cfg.suspended_user_password:
        return PhaseResult(
            phase_id=phase_id, name=name, status="skip",
            duration_s=time.time() - t0,
            message="DEV_SUSPENDED_USER_EMAIL not configured — skipping",
        )

    base = cfg.app_base_url.rstrip("/")
    origin = base
    host = base.replace("https://", "").replace("http://", "")

    def make_headers(token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Origin": origin,
            "X-Forwarded-Host": host,
            "Content-Type": "application/json",
        }

    auth = ctx["auth"]
    errors = []

    try:
        # --- Test zawieszony ---
        log.info(f"Getting token for suspended user: {cfg.suspended_user_email}")
        susp_token = auth.get_token(cfg.suspended_user_email, cfg.suspended_user_password)

        endpoints = [
            ("POST", f"{base}/api/register", {}),
            ("GET", f"{base}/api/setup", None),
        ]

        for method, url, body in endpoints:
            headers = make_headers(susp_token)
            if method == "POST":
                resp = requests.post(url, json=body or {}, headers=headers)
            else:
                resp = requests.get(url, headers=headers)

            if resp.status_code != 403:
                errors.append(
                    f"[zawieszony] {method} {url} → expected 403, got {resp.status_code}"
                )
                log.error(errors[-1])
            else:
                log.info(f"[zawieszony] {method} {url} → 403 OK")

        # --- Test skreślony ---
        if cfg.deleted_user_email and cfg.deleted_user_password:
            log.info(f"Getting token for deleted user: {cfg.deleted_user_email}")
            del_token = auth.get_token(cfg.deleted_user_email, cfg.deleted_user_password)

            for method, url, body in endpoints:
                headers = make_headers(del_token)
                if method == "POST":
                    resp = requests.post(url, json=body or {}, headers=headers)
                else:
                    resp = requests.get(url, headers=headers)

                if resp.status_code != 403:
                    errors.append(
                        f"[skreslony] {method} {url} → expected 403, got {resp.status_code}"
                    )
                    log.error(errors[-1])
                else:
                    log.info(f"[skreslony] {method} {url} → 403 OK")
        else:
            log.warning("DEV_DELETED_USER_* not configured — skipping deleted user tests")

        if errors:
            return PhaseResult(
                phase_id=phase_id, name=name, status="fail",
                duration_s=time.time() - t0,
                message=f"{len(errors)} assertion(s) failed",
                error="\n".join(errors),
            )

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message="Suspended and deleted users correctly blocked (403)",
        )

    except Exception as e:
        log.exception("Phase A error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )
```

---

## Krok 6 — `tests/e2e/phases/phase_B_module_visibility.py` (nowy plik)

**Cel:** L5 — weryfikacja, że `GET /api/setup` zwraca różne moduły dla różnych ról.

```python
"""
Phase B: Module visibility per role
- GET /api/setup as test_user (rola_czlonek) → verify setup.modules
- Compare with admin (rola_zarzad) → should see different/more modules

Uses ctx["test_uid"] and ctx["test_role_key"] from P1.
"""
import time
import logging
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "PB"
    name = "Module visibility per role"

    try:
        auth = ctx["auth"]
        api = ctx["api"]

        # Pobierz setup dla zwykłego użytkownika
        user_token = auth.test_user_token()
        user_setup = api.get_setup(user_token)
        user_modules = user_setup.get("setup", {}).get("modules", [])
        user_module_ids = {m.get("id") for m in user_modules if isinstance(m, dict)}
        log.info(f"User modules ({ctx.get('test_role_key', '?')}): {sorted(user_module_ids)}")

        # Pobierz setup dla admina
        admin_token = auth.admin_user_token()
        admin_setup = api.get_setup(admin_token)
        admin_modules = admin_setup.get("setup", {}).get("modules", [])
        admin_module_ids = {m.get("id") for m in admin_modules if isinstance(m, dict)}
        log.info(f"Admin modules: {sorted(admin_module_ids)}")

        errors = []

        # Weryfikacje
        if not user_modules:
            errors.append("User setup returned empty modules list")

        if not admin_modules:
            errors.append("Admin setup returned empty modules list")

        # Admin powinien mieć co najmniej tyle samo modułów co zwykły user
        missing_in_admin = user_module_ids - admin_module_ids
        if missing_in_admin:
            errors.append(
                f"Admin nie widzi modułów widocznych dla usera: {missing_in_admin}"
            )

        # Jeśli user jest czlonkiem — nie powinien widzieć modułów admin
        if ctx.get("test_role_key") == "rola_czlonek":
            # Sprawdź, że user nie widzi modułów zastrzeżonych dla zarządu
            admin_only = admin_module_ids - user_module_ids
            log.info(f"Admin-only modules (not visible to czlonek): {admin_only}")
            # Nie asertujemy — różne konfiguracje klubu mogą nie mieć admin-only modułów

        if errors:
            return PhaseResult(
                phase_id=phase_id, name=name, status="fail",
                duration_s=time.time() - t0,
                message=f"{len(errors)} issues found",
                error="\n".join(errors),
            )

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"User modules: {sorted(user_module_ids)}. "
                f"Admin modules: {sorted(admin_module_ids)}."
            ),
            details={
                "user_modules": sorted(user_module_ids),
                "admin_modules": sorted(admin_module_ids),
                "admin_only": sorted(admin_module_ids - user_module_ids),
            },
        )

    except Exception as e:
        log.exception("Phase B error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )
```

---

## Krok 7 — Rozszerzenie `phase_2_role_change_via_sheet.py`

Aktualnie testowana jest tylko rola `Członek`. Dodaj parametryzację, żeby pokryć przynajmniej 2 role:

Na początku pliku (po `TARGET_ROLE_LABEL`) dodaj:

```python
# Sekwencja zmian ról do przetestowania: [(label_w_arkuszu, oczekiwany_role_key)]
ROLE_CHANGE_SEQUENCE = [
    ("Kandydat", "rola_kandydat"),
    ("Członek", "rola_czlonek"),  # finalnie przywróć na czlonek (potrzebny dla P3+)
]
```

W funkcji `run()` zastąp jeden sync wywołaniem pętli:

```python
for sheet_label, expected_role_key in ROLE_CHANGE_SEQUENCE:
    log.info(f"Testing role change: {sheet_label} → {expected_role_key}")

    sheets.update_member_role_and_status(
        cfg.test_user_email,
        role_label=sheet_label,
        status_label="Aktywny",
    )

    fs.run_task_and_wait("users.syncRolesFromSheet", {}, timeout=120)

    role_key, status_key = fs.get_user_role_and_status(uid)
    if role_key != expected_role_key:
        raise AssertionError(
            f"Po zmianie na {sheet_label!r}: "
            f"oczekiwano {expected_role_key!r}, otrzymano {role_key!r}"
        )
    log.info(f"Role change {sheet_label} → {expected_role_key}: OK")
```

---

## Krok 8 — Aktualizacja `tests/e2e/run_e2e.py`

Dodaj nowe fazy do listy wykonania. Wstaw fazy `PA` i `PB` po P1, przed P2:

```python
# Import nowych faz
from phases import phase_A_suspended_user
from phases import phase_B_module_visibility

# W liście faz (po phase_1_registration, przed phase_2_role_change):
phases_to_run = [
    phase_0_precheck,
    phase_1_registration,
    phase_A_suspended_user,   # NOWE: blokada zawieszonych
    phase_B_module_visibility, # NOWE: widoczność modułów
    phase_2_role_change_via_sheet,
    phase_3_godzinki_grant,
    phase_4_first_reservation,
    phase_5_limit_errors,
    phase_6_cancel_reservation,
    phase_7_balance_drain,
    phase_8_sheet_sync_after_role,
    phase_9_cleanup,
]
```

---

## Krok 9 — Weryfikacja end-to-end

Po wdrożeniu wszystkich kroków:

### 9.1 Testy bezpieczeństwa HTTP (bez Firebase emulatorów)

```bash
cd /c/Users/kswitek/Documents/morzkulc_app
ENV=dev python -m pytest tests/test_security_http.py -v
```

Oczekiwane: wszystkie `TestAuthMiddleware` i `TestHostAllowlist` przechodzą.  
`TestSuspendedUser` — przechodzą po wykonaniu kroku 0.

### 9.2 Testy logiki BO26

```bash
ENV=dev python -m pytest tests/test_register_bo26.py -v
```

Oczekiwane: `test_new_user_not_in_bo26_gets_rola_sympatyk` pass, `test_existing_user_in_bo26_gets_rola_czlonek` pass lub skip (jeśli test_user nie jest w BO26).

### 9.3 Pełne E2E z nowymi fazami

```bash
cd /c/Users/kswitek/Documents/morzkulc_app/tests/e2e
ENV=dev python run_e2e.py
```

Oczekiwane: PA (suspended) → pass, PB (modules) → pass, rozszerzone P2 → pass dla 2 ról.

### 9.4 Sprawdzenie pokrycia po wdrożeniu

| Obszar | Przed | Po wdrożeniu |
|--------|-------|-------------|
| Logowanie | 0/7 | 0/7 (wymaga browser + Google OAuth — zakres przyszłej iteracji) |
| Rejestracja | 2/10 | 6/10 (+idempotentność, +walidacja, +BO26 sympatyk, +BO26 czlonek) |
| Obsługa kont | 3/8 | 6/8 (+zawieszony, +skreślony, +widoczność modułów) |
| Bezpieczeństwo | 0/11 | 7/11 (+CORS, +host allowlist, +brak tokenu, +błędny token, +admin 403, +zawieszony 403, +skreślony 403) |
| **Razem** | **5/36** | **~19/36 (~53%)** |

---

## Zależności i kolejność wykonania

```
Krok 0 (konta testowe)
  └─► Krok 2 (config.py) ──► Krok 5 (phase_A) ──► Krok 8 (run_e2e.py)
  └─► Krok 1 (test_security_http.py)
  └─► Krok 4 (test_register_bo26.py)

Krok 3 (phase_1 rozszerzenie) ──► Krok 8 (run_e2e.py)
Krok 6 (phase_B) ──────────────► Krok 8 (run_e2e.py)
Krok 7 (phase_2 rozszerzenie) ──► Krok 8 (run_e2e.py)
```

Kroki 1 i 4 są niezależne od siebie — można je wykonywać równolegle.  
Krok 8 (run_e2e.py) zawsze na końcu, po wszystkich fazach.

---

*Plan na podstawie: `audyt_testow_logowanie_uzytkownicy_v1.md`, `functions/src/index.ts`, `functions/src/api/registerUserHandler.ts`, `tests/e2e/`*