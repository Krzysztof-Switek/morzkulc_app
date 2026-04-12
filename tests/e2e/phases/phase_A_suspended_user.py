"""
Phase A: Suspended / Deleted user access blocking
- Weryfikuje że użytkownik ze status_zawieszony dostaje 403 na wszystkich endpointach API
- Weryfikuje że użytkownik ze status_skreslony dostaje 403 na wszystkich endpointach API

Wymaga:
    DEV_SUSPENDED_USER_EMAIL + DEV_SUSPENDED_USER_PASSWORD w .env.test
    DEV_DELETED_USER_EMAIL   + DEV_DELETED_USER_PASSWORD   w .env.test (opcjonalne)

    Konta muszą mieć dokumenty w users_active z odpowiednimi status_key.
    W setup/app.statusMappings musi być skonfigurowane blocksAccess: true
    dla status_zawieszony i status_skreslony. Szczegóły: wymagania_wstepne.md

Jeśli konta nie są skonfigurowane — faza jest pomijana (status: skip).
"""
import time
import logging
import requests
from helpers.reporter import PhaseResult
from config import EnvConfig

log = logging.getLogger(__name__)

ENDPOINTS_TO_TEST = [
    ("POST", "/api/register", {}),
    ("GET",  "/api/setup",    None),
]


def _check_user_blocked(base_url: str, token: str, label: str) -> list[str]:
    """
    Sprawdza czy użytkownik z danym tokenem dostaje 403 na kluczowych endpointach.
    Zwraca listę błędów (pusta = wszystko OK).
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    errors = []
    for method, path, body in ENDPOINTS_TO_TEST:
        url = base_url.rstrip("/") + path
        try:
            if method == "POST":
                resp = requests.post(url, json=body or {}, headers=headers, timeout=15)
            else:
                resp = requests.get(url, headers=headers, timeout=15)

            if resp.status_code != 403:
                err = (
                    f"[{label}] {method} {path} → oczekiwano 403, "
                    f"otrzymano {resp.status_code}. Body: {resp.text[:200]}"
                )
                errors.append(err)
                log.error(err)
            else:
                log.info(f"[{label}] {method} {path} → 403 ✓")
        except requests.RequestException as e:
            errors.append(f"[{label}] {method} {path} → błąd połączenia: {e}")
    return errors


def run(cfg: EnvConfig, ctx: dict) -> PhaseResult:
    t0 = time.time()
    phase_id = "PA"
    name = "Suspended/Deleted user access blocking"

    if not cfg.suspended_user_email or not cfg.suspended_user_password:
        return PhaseResult(
            phase_id=phase_id, name=name, status="skip",
            duration_s=time.time() - t0,
            message=(
                "DEV_SUSPENDED_USER_EMAIL nie skonfigurowane — faza pominięta. "
                "Wykonaj krok 0 z wymagań wstępnych testu."
            ),
        )

    auth = ctx["auth"]
    base = cfg.app_base_url
    all_errors = []

    try:
        # --- Test: zawieszony ---
        log.info(f"Pobieranie tokenu dla zawieszony: {cfg.suspended_user_email}")
        susp_token = auth.get_token(cfg.suspended_user_email, cfg.suspended_user_password)
        errors = _check_user_blocked(base, susp_token, "zawieszony")
        all_errors.extend(errors)

        # --- Test: skreślony ---
        if cfg.deleted_user_email and cfg.deleted_user_password:
            log.info(f"Pobieranie tokenu dla skreślony: {cfg.deleted_user_email}")
            del_token = auth.get_token(cfg.deleted_user_email, cfg.deleted_user_password)
            errors = _check_user_blocked(base, del_token, "skreslony")
            all_errors.extend(errors)
        else:
            log.warning("DEV_DELETED_USER_* nie skonfigurowane — pomijam test skreślonego")

        if all_errors:
            return PhaseResult(
                phase_id=phase_id, name=name, status="fail",
                duration_s=time.time() - t0,
                message=f"{len(all_errors)} asercja/asercje nie przeszły",
                error="\n".join(all_errors),
            )

        tested = ["zawieszony"]
        if cfg.deleted_user_email:
            tested.append("skreślony")

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=f"Użytkownicy {', '.join(tested)} poprawnie blokowani (403)",
            details={"tested_users": tested, "endpoints": [p for _, p, _ in ENDPOINTS_TO_TEST]},
        )

    except Exception as e:
        log.exception("Phase A error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )