"""
GearDiscovery — lazy-loaded cache dostępnego sprzętu z PROD.

Pobiera kajaki i akcesoria z GET /api/gear/kayaks i GET /api/gear/items.
Jeśli IDs są ustawione w config (.env.test) — używa ich (deterministyczne).
Jeśli nie — auto-wykrywa z katalogu (wystarczy że sprzęt istnieje w Firestore).

Użycie:
    from helpers.gear_discovery import GearDiscovery

    GearDiscovery.load(token)          # ładuje raz na sesję (idempotentne)
    kid = GearDiscovery.require_kayak()
    kids = GearDiscovery.require_kayaks(2)
    paddle_id = GearDiscovery.require_accessory("paddles")
"""
import logging
import requests
import unittest
from config import EnvConfig

log = logging.getLogger(__name__)


class GearDiscovery:
    """Lazy-loaded cache sprzętu."""

    kayak_ids: list = []
    paddle_ids: list = []
    lifejacket_ids: list = []
    helmet_ids: list = []
    _loaded: bool = False
    _base_url: str = ""

    @classmethod
    def load(cls, token: str, cfg: "EnvConfig | None" = None):
        """Ładuje katalog sprzętu — wywołanie jest idempotentne."""
        if cls._loaded:
            return

        if cfg is None:
            from config import ACTIVE as cfg  # type: ignore

        cls._base_url = cfg.app_base_url.rstrip("/")

        # --- Kajaki ---
        if cfg.test_kayak_id_1 and cfg.test_kayak_id_2 and cfg.test_kayak_id_3:
            cls.kayak_ids = [cfg.test_kayak_id_1, cfg.test_kayak_id_2, cfg.test_kayak_id_3]
            log.info(f"[GearDiscovery] Kajaki z .env.test: {cls.kayak_ids}")
        else:
            cls.kayak_ids = cls._fetch_kayaks(token, cfg)

        # --- Akcesoria ---
        for category, config_attr, list_attr in [
            ("paddles",     "test_paddle_id",     "paddle_ids"),
            ("lifejackets", "test_lifejacket_id", "lifejacket_ids"),
            ("helmets",     "test_helmet_id",     "helmet_ids"),
        ]:
            config_id = getattr(cfg, config_attr, "")
            if config_id:
                setattr(cls, list_attr, [config_id])
                log.info(f"[GearDiscovery] {category} z .env.test: {config_id}")
            else:
                found = cls._fetch_items(token, category)
                setattr(cls, list_attr, found)

        cls._loaded = True
        log.info(
            f"[GearDiscovery] gotowy — kajaki={len(cls.kayak_ids)}, "
            f"wiosła={len(cls.paddle_ids)}, kamizelki={len(cls.lifejacket_ids)}, kaski={len(cls.helmet_ids)}"
        )

    @classmethod
    def _fetch_kayaks(cls, token: str, cfg) -> list:
        try:
            resp = requests.get(
                f"{cls._base_url}/api/gear/kayaks",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15,
            )
            resp.raise_for_status()
            kayaks = resp.json().get("kayaks", [])
            usable = [
                k["id"] for k in kayaks
                if k.get("isActive") is not False
                and k.get("isOperational") is not False
                and k.get("storage", "") != "basen"
                and not k.get("isPrivate", False)
            ]
            result = usable[:3]
            log.info(f"[GearDiscovery] kajaki auto ({len(usable)} dostępnych): {result}")
            return result
        except Exception as e:
            log.warning(f"[GearDiscovery] fetch kayaks failed: {e}")
            return []

    @classmethod
    def _fetch_items(cls, token: str, category: str) -> list:
        try:
            resp = requests.get(
                f"{cls._base_url}/api/gear/items",
                headers={"Authorization": f"Bearer {token}"},
                params={"category": category},
                timeout=15,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            result = [i["id"] for i in items if i.get("isActive") is not False][:1]
            log.info(f"[GearDiscovery] {category} auto: {result}")
            return result
        except Exception as e:
            log.warning(f"[GearDiscovery] fetch {category} failed: {e}")
            return []

    @classmethod
    def require_kayaks(cls, count: int = 1) -> list:
        if len(cls.kayak_ids) < count:
            raise unittest.SkipTest(
                f"Auto-discovery znalazło tylko {len(cls.kayak_ids)} kajaków, potrzeba {count}. "
                "Uzupełnij katalog sprzętu w Firestore lub ustaw PROD_TEST_KAYAK_ID_* w .env.test."
            )
        return cls.kayak_ids[:count]

    @classmethod
    def require_kayak(cls) -> str:
        return cls.require_kayaks(1)[0]

    @classmethod
    def require_accessory(cls, category: str) -> str:
        mapping = {
            "paddles": cls.paddle_ids,
            "lifejackets": cls.lifejacket_ids,
            "helmets": cls.helmet_ids,
        }
        ids = mapping.get(category, [])
        if not ids:
            raise unittest.SkipTest(
                f"Brak dostępnych {category} w katalogu PROD. "
                f"Ustaw PROD_TEST_{category.upper()[:-1]}_ID w .env.test lub dodaj {category} do Firestore."
            )
        return ids[0]
