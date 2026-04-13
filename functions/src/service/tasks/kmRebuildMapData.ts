/**
 * kmRebuildMapData.ts
 *
 * Task: km.rebuildMapData
 *
 * Skanuje całą kolekcję km_logs i agreguje lokalizacje aktywności do pre-computed cache.
 * Wynik zapisywany w km_map_cache/v1 — jeden dokument z tablicą locations.
 *
 * Grupowanie:
 *   - po placeId jeśli log.placeId istnieje
 *   - inaczej po zaokrąglonym lat.toFixed(3)+","+lng.toFixed(3) (≈111m)
 *
 * Payload: brak (pełny rescan wszystkich km_logs z lat/lng).
 * Wyzwalanie: manualnie z menu GAS "Odśwież mapę aktywności".
 */

import * as admin from "firebase-admin";
import {ServiceTask} from "../types";

type Payload = Record<string, never>;

type TopUser = { name: string; km: number };

type LocationEntry = {
  lat: number;
  lng: number;
  placeName: string;
  logCount: number;
  totalKm: number;
  topUsers: TopUser[];
};

type GroupEntry = {
  lat: number;
  lng: number;
  placeName: string;
  logCount: number;
  totalKm: number;
  userKm: Map<string, { name: string; km: number }>;
};

function resolveDisplayName(log: any): string {
  const snap = log.userSnapshot || {};
  const nickname = String(snap.nickname || "").trim();
  if (nickname) return nickname;

  const displayName = String(snap.displayName || "").trim();
  if (!displayName || displayName === "undefined undefined") return "";

  // "Jan Kowalski" → "Jan K."
  const parts = displayName.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return parts[0] + " " + parts[1][0].toUpperCase() + ".";
  }
  return displayName; // pojedyncze słowo lub email
}

export const kmRebuildMapDataTask: ServiceTask<Payload> = {
  id: "km.rebuildMapData",
  description: "Przebudowuje cache mapy aktywności (km_map_cache/v1) z km_logs z lat/lng.",

  validate: (_payload) => {
    // Brak wymaganych pól w payload
  },

  run: async (_payload, ctx) => {
    ctx.logger.info("km.rebuildMapData: start");

    // Pobierz wszystkie km_logs — filtr lat!=null nie jest obsługiwany w Firestore dla undefined
    // Filtrujemy in-memory (tańsze niż scan po indeksie którego nie ma)
    const logsSnap = await ctx.firestore.collection("km_logs").get();

    ctx.logger.info("km.rebuildMapData: loaded logs", {total: logsSnap.size});

    // Grupuj po placeId lub zaokrąglonym lat/lng
    const groups: Map<string, GroupEntry> = new Map();

    for (const doc of logsSnap.docs) {
      const log = doc.data() as any;

      const lat = typeof log.lat === "number" ? log.lat : null;
      const lng = typeof log.lng === "number" ? log.lng : null;
      if (lat == null || lng == null) continue;

      const placeName = String(log.placeName || "").trim() || "nieznane";
      const km = typeof log.km === "number" ? log.km : 0;
      const uid = String(log.uid || "").trim();

      // Klucz grupowania
      const groupKey: string = log.placeId ?
        String(log.placeId) :
        `${lat.toFixed(3)},${lng.toFixed(3)}`;

      let entry = groups.get(groupKey);
      if (!entry) {
        entry = {
          lat: Math.round(lat * 100000) / 100000,
          lng: Math.round(lng * 100000) / 100000,
          placeName,
          logCount: 0,
          totalKm: 0,
          userKm: new Map(),
        };
        groups.set(groupKey, entry);
      }
      entry.logCount += 1;
      entry.totalKm = Math.round((entry.totalKm + km) * 100) / 100;

      // Akumuluj km per użytkownik (pomijaj historical_unmatched i puste uid)
      if (uid && uid !== "historical_unmatched") {
        const name = resolveDisplayName(log);
        if (name) {
          const prev = entry.userKm.get(uid);
          if (prev) {
            prev.km = Math.round((prev.km + km) * 100) / 100;
          } else {
            entry.userKm.set(uid, {name, km: Math.round(km * 100) / 100});
          }
        }
      }
    }

    const locations: LocationEntry[] = Array.from(groups.values())
      .map((g) => {
        const topUsers = Array.from(g.userKm.values())
          .sort((a, b) => b.km - a.km)
          .slice(0, 3)
          .map(({name, km}) => ({name, km}));
        return {
          lat: g.lat,
          lng: g.lng,
          placeName: g.placeName,
          logCount: g.logCount,
          totalKm: g.totalKm,
          topUsers,
        };
      })
      .sort((a, b) => b.logCount - a.logCount);

    const cacheDoc = {
      updatedAt: admin.firestore.Timestamp.now(),
      locationCount: locations.length,
      locations,
    };

    await ctx.firestore.collection("km_map_cache").doc("v1").set(cacheDoc);

    ctx.logger.info("km.rebuildMapData: done", {locationCount: locations.length});

    return {
      ok: true,
      message: `ok locationCount=${locations.length} logsScanned=${logsSnap.size}`,
      details: {locationCount: locations.length, logsScanned: logsSnap.size},
    };
  },
};
