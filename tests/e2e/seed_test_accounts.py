"""
Skrypt seed kont testowych — SKK Morzkulc PROD
===============================================

Tworzy 7 kont testowych w Firebase Auth i Firestore.
Bezpieczny do wielokrotnego uruchamiania (idempotentny).

Wymagania:
  - gcloud auth application-default login --scopes=cloud-platform
  - tests/e2e/.env.test z hasłami (PROD_TEST_*_PASSWORD)
  - pip install firebase-admin python-dotenv

Uruchamianie (z katalogu tests/e2e/):
  ENV=prod python seed_test_accounts.py
"""
import os
import sys
from datetime import datetime, timezone

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

try:
    from dotenv import load_dotenv
    _env = os.path.join(_HERE, ".env.test")
    if os.path.isfile(_env):
        load_dotenv(_env)
        print(f"Załadowano .env.test z {_env}")
    else:
        print(f"UWAGA: Brak pliku .env.test w {_HERE} — ustaw zmienne ENV ręcznie")
except ImportError:
    print("UWAGA: python-dotenv niedostępne — zmienne ENV muszą być ustawione ręcznie")

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

from config import ACTIVE as cfg

# ---------------------------------------------------------------------------
# Inicjalizacja Firebase Admin SDK
# ---------------------------------------------------------------------------

_APP_NAME = "seed-test-accounts"
try:
    _app = firebase_admin.get_app(_APP_NAME)
except ValueError:
    _cred = credentials.ApplicationDefault()
    _app = firebase_admin.initialize_app(
        _cred,
        {"projectId": cfg.firebase_project_id},
        name=_APP_NAME,
    )

db = firestore.client(app=_app)

# ---------------------------------------------------------------------------
# Definicje kont testowych
# ---------------------------------------------------------------------------

_SEED_DATE = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

ACCOUNTS = [
    {
        "email": "test.czlonek@morzkulc.pl",
        "password_env": "PROD_TEST_MEMBER_PASSWORD",
        "role_key": "rola_czlonek",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "Czlonek",
        "nickname": "Czlonek",
        "phone": "+48500000001",
        "date_of_birth": "1990-01-01",
        "seed_godzinki": True,
    },
    {
        "email": "test.kandydat@morzkulc.pl",
        "password_env": "PROD_TEST_CANDIDATE_PASSWORD",
        "role_key": "rola_kandydat",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "Kandydat",
        "nickname": "Kandydat",
        "phone": "+48500000002",
        "date_of_birth": "1995-03-15",
        "seed_godzinki": False,
    },
    {
        "email": "test.zarzad@morzkulc.pl",
        "password_env": "PROD_TEST_BOARD_PASSWORD",
        "role_key": "rola_zarzad",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "Zarzad",
        "nickname": "Zarzad",
        "phone": "+48500000003",
        "date_of_birth": "1985-06-20",
        "seed_godzinki": False,
    },
    {
        "email": "test.kr@morzkulc.pl",
        "password_env": "PROD_TEST_KR_PASSWORD",
        "role_key": "rola_kr",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "KR",
        "nickname": "KR",
        "phone": "+48500000004",
        "date_of_birth": "1988-09-10",
        "seed_godzinki": False,
    },
    {
        "email": "test.zawieszony@morzkulc.pl",
        "password_env": "PROD_SUSPENDED_USER_PASSWORD",
        "role_key": "rola_czlonek",
        "status_key": "status_zawieszony",
        "first_name": "Test",
        "last_name": "Zawieszony",
        "nickname": "Zawieszony",
        "phone": "+48500000005",
        "date_of_birth": "1992-11-05",
        "seed_godzinki": False,
    },
    {
        "email": "test.sympatyk@morzkulc.pl",
        "password_env": "PROD_TEST_SYMPATYK_PASSWORD",
        "role_key": "rola_sympatyk",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "Sympatyk",
        "nickname": "Sympatyk",
        "phone": "+48500000006",
        "date_of_birth": "1998-04-22",
        "seed_godzinki": False,
    },
    {
        "email": "test.graniczny@morzkulc.pl",
        "password_env": "PROD_TEST_BOUNDARY_PASSWORD",
        "role_key": "rola_czlonek",
        "status_key": "status_aktywny",
        "first_name": "Test",
        "last_name": "Graniczny",
        "nickname": "Graniczny",
        "phone": "+48500000007",
        "date_of_birth": "1993-07-18",
        "seed_godzinki": False,
    },
]

# 3 pule FIFO dla test.czlonek — różne daty grantedAt dla testów FIFO
GODZINKI_POOLS = [
    {
        "reason": "saldo testowe — pula 1",
        "amount": 30.0,
        "granted_at": datetime(2023, 1, 15, 12, 0, 0, tzinfo=timezone.utc),
        "expires_at": datetime(2027, 1, 15, 12, 0, 0, tzinfo=timezone.utc),
    },
    {
        "reason": "saldo testowe — pula 2",
        "amount": 30.0,
        "granted_at": datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc),
        "expires_at": datetime(2028, 6, 1, 12, 0, 0, tzinfo=timezone.utc),
    },
    {
        "reason": "saldo testowe — pula 3",
        "amount": 40.0,
        "granted_at": datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "expires_at": datetime(2029, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_password(account: dict) -> str:
    env_var = account["password_env"]
    password = os.environ.get(env_var, "")
    if not password:
        print(f"\n[BŁĄD] Brak {env_var} w .env.test")
        print(f"       Ustaw hasło dla konta {account['email']} i uruchom ponownie.")
        sys.exit(1)
    return password


def _seed_auth(account: dict) -> str:
    """Tworzy lub pobiera konto w Firebase Auth. Zwraca UID."""
    email = account["email"]
    try:
        user = firebase_auth.get_user_by_email(email, app=_app)
        print(f"  [SKIP] Auth — konto już istnieje (uid={user.uid})")
        return user.uid
    except firebase_auth.UserNotFoundError:
        password = _get_password(account)
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=f"{account['first_name']} {account['last_name']}",
            app=_app,
        )
        print(f"  [CREATE] Auth — uid={user.uid}")
        return user.uid


def _seed_firestore(account: dict, uid: str):
    """Tworzy lub aktualizuje dokument users_active/{uid}."""
    doc_ref = db.collection("users_active").document(uid)
    snap = doc_ref.get()

    if snap.exists:
        doc_ref.update({
            "role_key": account["role_key"],
            "status_key": account["status_key"],
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        print(f"  [UPDATE] users_active — role_key={account['role_key']} status_key={account['status_key']}")
    else:
        doc_ref.set({
            "uid": uid,
            "email": account["email"],
            "displayName": f"{account['first_name']} {account['last_name']}",
            "role_key": account["role_key"],
            "status_key": account["status_key"],
            "firstLoginAt": _SEED_DATE,
            "createdAt": _SEED_DATE,
            "updatedAt": _SEED_DATE,
            "profile": {
                "firstName": account["first_name"],
                "lastName": account["last_name"],
                "nickname": account["nickname"],
                "phone": account["phone"],
                "dateOfBirth": account["date_of_birth"],
                "consents": {
                    "rodoAcceptedAt": _SEED_DATE,
                    "statuteAcceptedAt": _SEED_DATE,
                },
                "createdAt": _SEED_DATE,
                "updatedAt": _SEED_DATE,
            },
        })
        print(f"  [CREATE] users_active/{uid}")


def _seed_godzinki(uid: str):
    """Tworzy 3 pule FIFO w godzinki_ledger dla test.czlonek."""
    for pool in GODZINKI_POOLS:
        # Sprawdź czy pula już istnieje (po reason)
        existing = (
            db.collection("godzinki_ledger")
            .where("uid", "==", uid)
            .where("reason", "==", pool["reason"])
            .limit(1)
            .get()
        )
        if existing:
            print(f"  [SKIP] godzinki — {pool['reason']} już istnieje")
            continue

        doc_ref = db.collection("godzinki_ledger").document()
        doc_ref.set({
            "id": doc_ref.id,
            "uid": uid,
            "type": "earn",
            "amount": pool["amount"],
            "remaining": pool["amount"],
            "grantedAt": pool["granted_at"],
            "expiresAt": pool["expires_at"],
            "approved": True,
            "approvedAt": pool["granted_at"],
            "approvedBy": "seed",
            "reason": pool["reason"],
            "submittedBy": "seed",
            "createdAt": pool["granted_at"],
            "updatedAt": pool["granted_at"],
        })
        print(f"  [CREATE] godzinki — {pool['reason']}: {pool['amount']}h "
              f"grantedAt={pool['granted_at'].strftime('%Y-%m-%d')} "
              f"expiresAt={pool['expires_at'].strftime('%Y-%m-%d')}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"\n=== Seed kont testowych — {cfg.name.upper()} {cfg.firebase_project_id} ===\n")

    created = 0
    skipped = 0

    for account in ACCOUNTS:
        print(f"→ {account['email']}")

        uid = _seed_auth(account)
        _seed_firestore(account, uid)

        if account["seed_godzinki"]:
            _seed_godzinki(uid)

        print()

    print(f"=== Gotowe: {len(ACCOUNTS)} kont przetworzonych ===")
    print(f"\nNastępny krok — uruchom testy:")
    print(f"  cd {_HERE}")
    print(f"  ENV={cfg.name} python -m pytest test_gear_reservations_api.py::TestAuthorization -v")


if __name__ == "__main__":
    main()
