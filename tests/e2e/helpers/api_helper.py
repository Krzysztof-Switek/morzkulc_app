"""
API helper — HTTP calls to the live app's Cloud Functions endpoints.

Endpoint map (verified against functions/src/index.ts):
  POST /api/register               — upsert user + profile
  GET  /api/setup                  — module config
  GET  /api/gear/kayaks            — kayak catalog, returns {ok, kayaks: [{id, ...}]}
  GET  /api/gear/items             — other gear items
  GET  /api/gear/items/availability?category=X&startDate=...&endDate=...
  GET  /api/gear/my-reservations   — current user's reservations
  POST /api/gear/reservations/create         — body: {startDate, endDate, kayakIds}
                                               returns: {ok, reservationId, costHours, blockStartIso, blockEndIso}
  POST /api/gear/reservations/create-bundle  — body: {startDate, endDate, items[], starterCategory, starterItemId}
                                               returns: {ok, reservationId, costHours, blockStartIso, blockEndIso, reservationKind}
  POST /api/gear/reservations/cancel         — body: {reservationId}
  POST /api/gear/reservations/update         — body: {reservationId, startDate, endDate}
  GET  /api/godzinki               — returns {ok, balance, negativeBalanceLimit, ...}
  POST /api/godzinki/submit        — body: {amount, grantedAt, reason}
                                     returns: {ok, recordId}
  GET  /api/gear/kayak-reservations?kayakId=X
  POST /api/km/log/add         — body: {date, waterType, placeName, km, hoursOnWater, ...}
  GET  /api/km/logs            — returns {ok, logs, count}
  GET  /api/km/stats           — returns {ok, stats}
  GET  /api/km/rankings        — returns {ok, type, period, entries, count}
  GET  /api/km/places          — returns {ok, places, count}
  GET  /api/km/map-data        — returns {ok, locations, locationCount, updatedAt}
  GET  /api/km/event-stats     — returns {ok, eventId, participants, totals, count}
"""
import logging
import requests
from config import EnvConfig

log = logging.getLogger(__name__)


class ApiHelper:
    def __init__(self, cfg: EnvConfig):
        self.cfg = cfg
        self.base_url = cfg.app_base_url.rstrip("/")
        self._session = requests.Session()

    def _headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _check(self, resp: requests.Response, label: str) -> dict:
        log.debug(f"{label}: HTTP {resp.status_code} {resp.text[:400]}")
        resp.raise_for_status()
        return resp.json() if resp.text.strip() else {}

    def _soft(self, resp: requests.Response, label: str) -> dict:
        """Like _check but does NOT raise on HTTP error. Returns raw JSON."""
        log.debug(f"{label}: HTTP {resp.status_code} {resp.text[:400]}")
        try:
            return resp.json()
        except Exception:
            return {"_raw": resp.text, "_status": resp.status_code}

    # ------------------------------------------------------------------
    # Auth / registration
    # ------------------------------------------------------------------

    def register(self, token: str, profile: dict | None = None) -> dict:
        """
        POST /api/register
        Pass complete profile to complete registration and trigger Sheets sync.
        profile = {firstName, lastName, nickname, phone, dateOfBirth,
                   consentRodo: True, consentStatute: True}
        """
        resp = self._session.post(
            f"{self.base_url}/api/register",
            headers=self._headers(token),
            json=profile or {},
            timeout=30,
        )
        return self._check(resp, "POST /api/register")

    def get_setup(self, token: str) -> dict:
        resp = self._session.get(
            f"{self.base_url}/api/setup",
            headers=self._headers(token),
            timeout=15,
        )
        return self._check(resp, "GET /api/setup")

    # ------------------------------------------------------------------
    # Gear / kayaks
    # ------------------------------------------------------------------

    def get_kayaks(self, token: str) -> dict:
        """
        GET /api/gear/kayaks
        Returns {ok: True, kayaks: [{id, number, brand, model, isOperational, ...}]}
        """
        resp = self._session.get(
            f"{self.base_url}/api/gear/kayaks",
            headers=self._headers(token),
            timeout=15,
        )
        return self._check(resp, "GET /api/gear/kayaks")

    def get_my_reservations(self, token: str) -> dict:
        """GET /api/gear/my-reservations"""
        resp = self._session.get(
            f"{self.base_url}/api/gear/my-reservations",
            headers=self._headers(token),
            timeout=15,
        )
        return self._check(resp, "GET /api/gear/my-reservations")

    def reserve_kayaks(self, token: str, kayak_ids: list[str], start_date: str, end_date: str) -> dict:
        """
        POST /api/gear/reservations/create
        Body: {startDate, endDate, kayakIds: ["id1", ...]}
        Returns: {ok, reservationId, costHours, blockStartIso, blockEndIso}
        """
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/create",
            headers=self._headers(token),
            json={"startDate": start_date, "endDate": end_date, "kayakIds": kayak_ids},
            timeout=30,
        )
        return self._check(resp, "POST /api/gear/reservations/create")

    def reserve_kayaks_soft(self, token: str, kayak_ids: list[str], start_date: str, end_date: str) -> dict:
        """Like reserve_kayaks but does NOT raise on error HTTP status."""
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/create",
            headers=self._headers(token),
            json={"startDate": start_date, "endDate": end_date, "kayakIds": kayak_ids},
            timeout=30,
        )
        return self._soft(resp, "POST /api/gear/reservations/create (soft)")

    def cancel_reservation(self, token: str, reservation_id: str) -> dict:
        """POST /api/gear/reservations/cancel — body: {reservationId}"""
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/cancel",
            headers=self._headers(token),
            json={"reservationId": reservation_id},
            timeout=30,
        )
        return self._check(resp, "POST /api/gear/reservations/cancel")

    def cancel_reservation_soft(self, token: str, reservation_id: str) -> dict:
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/cancel",
            headers=self._headers(token),
            json={"reservationId": reservation_id},
            timeout=30,
        )
        return self._soft(resp, "POST /api/gear/reservations/cancel (soft)")

    # ------------------------------------------------------------------
    # Godzinki
    # ------------------------------------------------------------------

    def get_godzinki(self, token: str, view: str = "home") -> dict:
        """
        GET /api/godzinki
        Returns {ok, balance, negativeBalanceLimit, nextExpiryMonthYear, recentEarnings, history}
        view: "home" (fast) or "full" (includes full history)
        """
        resp = self._session.get(
            f"{self.base_url}/api/godzinki",
            headers=self._headers(token),
            params={"view": view},
            timeout=15,
        )
        return self._check(resp, "GET /api/godzinki")

    def submit_godzinki(self, token: str, amount: float, granted_at: str, reason: str) -> dict:
        """
        POST /api/godzinki/submit
        Body: {amount, grantedAt: "YYYY-MM-DD", reason}
        Returns: {ok, recordId}
        """
        resp = self._session.post(
            f"{self.base_url}/api/godzinki/submit",
            headers=self._headers(token),
            json={"amount": amount, "grantedAt": granted_at, "reason": reason},
            timeout=20,
        )
        return self._check(resp, "POST /api/godzinki/submit")

    def submit_godzinki_soft(self, token: str, amount: float, granted_at: str, reason: str) -> dict:
        """Like submit_godzinki but does NOT raise on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/godzinki/submit",
            headers=self._headers(token),
            json={"amount": amount, "grantedAt": granted_at, "reason": reason},
            timeout=20,
        )
        return self._soft(resp, "POST /api/godzinki/submit (soft)")

    # ------------------------------------------------------------------
    # Bundle reservations
    # ------------------------------------------------------------------

    def reserve_bundle(self, token: str, items: list[dict], start_date: str, end_date: str,
                       starter_category: str = "kayaks", starter_item_id: str = "") -> dict:
        """
        POST /api/gear/reservations/create-bundle
        items: [{"category": "kayaks", "itemId": "K01"}, {"category": "paddles", "itemId": "P01"}]
        Returns: {ok, reservationId, costHours, blockStartIso, blockEndIso, reservationKind}
        """
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/create-bundle",
            headers=self._headers(token),
            json={
                "startDate": start_date,
                "endDate": end_date,
                "items": items,
                "starterCategory": starter_category,
                "starterItemId": starter_item_id or (items[0]["itemId"] if items else ""),
            },
            timeout=30,
        )
        return self._check(resp, "POST /api/gear/reservations/create-bundle")

    def reserve_bundle_soft(self, token: str, items: list[dict], start_date: str, end_date: str,
                            starter_category: str = "kayaks", starter_item_id: str = "") -> dict:
        """Like reserve_bundle but does NOT raise on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/create-bundle",
            headers=self._headers(token),
            json={
                "startDate": start_date,
                "endDate": end_date,
                "items": items,
                "starterCategory": starter_category,
                "starterItemId": starter_item_id or (items[0]["itemId"] if items else ""),
            },
            timeout=30,
        )
        return self._soft(resp, "POST /api/gear/reservations/create-bundle (soft)")

    def update_reservation(self, token: str, reservation_id: str, start_date: str, end_date: str) -> dict:
        """
        POST /api/gear/reservations/update
        Body: {reservationId, startDate, endDate}
        Returns: {ok, ...}
        """
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/update",
            headers=self._headers(token),
            json={"reservationId": reservation_id, "startDate": start_date, "endDate": end_date},
            timeout=30,
        )
        return self._check(resp, "POST /api/gear/reservations/update")

    def update_reservation_soft(self, token: str, reservation_id: str, start_date: str, end_date: str) -> dict:
        """Like update_reservation but does NOT raise on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/gear/reservations/update",
            headers=self._headers(token),
            json={"reservationId": reservation_id, "startDate": start_date, "endDate": end_date},
            timeout=30,
        )
        return self._soft(resp, "POST /api/gear/reservations/update (soft)")

    # ------------------------------------------------------------------
    # Kilometrówka / Ranking / Mapa
    # ------------------------------------------------------------------

    def km_add_log(self, token: str, body: dict) -> dict:
        """POST /api/km/log/add — raises on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/km/log/add",
            headers=self._headers(token),
            json=body,
            timeout=30,
        )
        return self._check(resp, "POST /api/km/log/add")

    def km_add_log_soft(self, token: str, body: dict) -> dict:
        """POST /api/km/log/add — does NOT raise on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/km/log/add",
            headers=self._headers(token),
            json=body,
            timeout=30,
        )
        return self._soft(resp, "POST /api/km/log/add (soft)")

    def km_my_logs(self, token: str, limit: int = 50, after_date: str = "") -> dict:
        """GET /api/km/logs — returns {ok, logs, count}."""
        params: dict = {"limit": limit}
        if after_date:
            params["afterDate"] = after_date
        resp = self._session.get(
            f"{self.base_url}/api/km/logs",
            headers=self._headers(token),
            params=params,
            timeout=15,
        )
        return self._check(resp, "GET /api/km/logs")

    def km_my_stats(self, token: str) -> dict:
        """GET /api/km/stats — returns {ok, stats}."""
        resp = self._session.get(
            f"{self.base_url}/api/km/stats",
            headers=self._headers(token),
            timeout=15,
        )
        return self._check(resp, "GET /api/km/stats")

    def km_rankings(self, token: str, type: str = "km", period: str = "alltime",
                    limit: int = 50, year: str = "") -> dict:
        """GET /api/km/rankings — returns {ok, type, period, entries, count}."""
        params: dict = {"type": type, "period": period, "limit": limit}
        if year:
            params["year"] = year
        resp = self._session.get(
            f"{self.base_url}/api/km/rankings",
            headers=self._headers(token),
            params=params,
            timeout=15,
        )
        return self._check(resp, "GET /api/km/rankings")

    def km_places(self, token: str, q: str, limit: int = 10) -> dict:
        """GET /api/km/places — returns {ok, places, count}."""
        resp = self._session.get(
            f"{self.base_url}/api/km/places",
            headers=self._headers(token),
            params={"q": q, "limit": limit},
            timeout=15,
        )
        return self._check(resp, "GET /api/km/places")

    def km_map_data(self, token: str) -> dict:
        """GET /api/km/map-data — returns {ok, locations, locationCount, updatedAt}."""
        resp = self._session.get(
            f"{self.base_url}/api/km/map-data",
            headers=self._headers(token),
            timeout=15,
        )
        return self._check(resp, "GET /api/km/map-data")

    def km_event_stats(self, token: str, event_id: str) -> dict:
        """GET /api/km/event-stats — raises on HTTP error."""
        resp = self._session.get(
            f"{self.base_url}/api/km/event-stats",
            headers=self._headers(token),
            params={"eventId": event_id},
            timeout=15,
        )
        return self._check(resp, "GET /api/km/event-stats")

    def km_event_stats_soft(self, token: str, event_id: str = "") -> dict:
        """GET /api/km/event-stats — does NOT raise on HTTP error."""
        params = {"eventId": event_id} if event_id else {}
        resp = self._session.get(
            f"{self.base_url}/api/km/event-stats",
            headers=self._headers(token),
            params=params,
            timeout=15,
        )
        return self._soft(resp, "GET /api/km/event-stats (soft)")

    def km_admin_merge_places(self, token: str, keep_place_id: str, merge_ids: list[str]) -> dict:
        """POST /api/admin/km/places/merge — raises on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/admin/km/places/merge",
            headers=self._headers(token),
            json={"keepPlaceId": keep_place_id, "mergeIds": merge_ids},
            timeout=30,
        )
        return self._check(resp, "POST /api/admin/km/places/merge")

    def km_admin_merge_places_soft(self, token: str, keep_place_id: str = "",
                                   merge_ids: list | None = None) -> dict:
        """POST /api/admin/km/places/merge — does NOT raise on HTTP error."""
        resp = self._session.post(
            f"{self.base_url}/api/admin/km/places/merge",
            headers=self._headers(token),
            json={"keepPlaceId": keep_place_id, "mergeIds": merge_ids or []},
            timeout=30,
        )
        return self._soft(resp, "POST /api/admin/km/places/merge (soft)")