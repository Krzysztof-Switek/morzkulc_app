"""
Phase B: Module visibility per role
- GET /api/setup jako zwykły użytkownik → weryfikuje że modules nie jest puste
- GET /api/setup jako admin → weryfikuje że admin widzi co najmniej tyle co zwykły user
- Loguje które moduły są dostępne dla której roli

Faza NIE failuje jeśli konfiguracja modułów różni się między rolami —
różne konfiguracje klubu mogą mieć różne ustawienia.
Failuje tylko jeśli:
  - setup zwraca puste modules dla jakiegokolwiek zalogowanego użytkownika
  - admin nie widzi modułów widocznych dla zwykłego użytkownika

Wymaga: DEV_TEST_USER_EMAIL + DEV_ADMIN_USER_EMAIL
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
        errors = []

        # --- Setup dla zwykłego użytkownika ---
        user_token = auth.test_user_token()
        user_resp = api.get_setup(user_token)
        user_modules = user_resp.get("setup", {}).get("modules", [])
        user_module_ids = {m.get("id") for m in user_modules if isinstance(m, dict) and m.get("id")}
        user_role = ctx.get("test_role_key", "?")
        log.info(f"Moduły dla {user_role}: {sorted(user_module_ids) or '(brak)'}")

        if not user_modules:
            errors.append(
                f"GET /api/setup dla test_user ({cfg.test_user_email}) zwróciło puste modules. "
                f"Sprawdź setup/app w Firestore — czy skonfigurowane są moduły dla tej roli?"
            )

        # --- Setup dla admina ---
        admin_token = auth.admin_user_token()
        admin_resp = api.get_setup(admin_token)
        admin_modules = admin_resp.get("setup", {}).get("modules", [])
        admin_module_ids = {m.get("id") for m in admin_modules if isinstance(m, dict) and m.get("id")}
        log.info(f"Moduły dla admina ({cfg.admin_user_email}): {sorted(admin_module_ids) or '(brak)'}")

        if not admin_modules:
            errors.append(
                f"GET /api/setup dla admin_user ({cfg.admin_user_email}) zwróciło puste modules."
            )

        # Admin nie powinien widzieć MNIEJ niż zwykły user
        if user_module_ids and admin_module_ids:
            missing_in_admin = user_module_ids - admin_module_ids
            if missing_in_admin:
                errors.append(
                    f"Admin nie widzi modułów dostępnych dla zwykłego użytkownika: {missing_in_admin}. "
                    f"Sprawdź filterSetupForUser() i reguły dostępu w setup/app."
                )

        # Loguj moduły dostępne tylko dla admina
        if user_module_ids and admin_module_ids:
            admin_only = admin_module_ids - user_module_ids
            if admin_only:
                log.info(f"Moduły tylko dla admina: {sorted(admin_only)}")
            else:
                log.info("Admin i user widzą te same moduły (konfiguracja bez modułów admin-only)")

        # Zapisz w ctx do użycia przez kolejne fazy (opcjonalne)
        ctx["user_module_ids"] = sorted(user_module_ids)
        ctx["admin_module_ids"] = sorted(admin_module_ids)

        if errors:
            return PhaseResult(
                phase_id=phase_id, name=name, status="fail",
                duration_s=time.time() - t0,
                message=f"{len(errors)} problem(y) z widocznością modułów",
                error="\n".join(errors),
            )

        return PhaseResult(
            phase_id=phase_id, name=name, status="pass",
            duration_s=time.time() - t0,
            message=(
                f"User ({user_role}): {len(user_module_ids)} moduł(y). "
                f"Admin: {len(admin_module_ids)} moduł(y)."
            ),
            details={
                "user_role": user_role,
                "user_modules": sorted(user_module_ids),
                "admin_modules": sorted(admin_module_ids),
                "admin_only_modules": sorted(admin_module_ids - user_module_ids),
            },
        )

    except Exception as e:
        log.exception("Phase B error")
        return PhaseResult(
            phase_id=phase_id, name=name, status="error",
            duration_s=time.time() - t0,
            error=str(e),
        )