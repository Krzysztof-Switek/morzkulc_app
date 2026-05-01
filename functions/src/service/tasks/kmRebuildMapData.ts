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

type TopUser = { name: string; date: string };

type LocationEntry = {
  lat: number;
  lng: number;
  placeName: string;
  logCount: number;
  topUsers: TopUser[];
  yearsActive: number[];
};

type ActivityEntry = { uid: string; name: string; date: string };

type GroupEntry = {
  lat: number;
  lng: number;
  placeName: string;
  logCount: number;
  recentActivities: ActivityEntry[];
  yearsActive: Set<number>;
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
  return displayName;
}

export const kmRebuildMapDataTask: ServiceTask<Payload> = {
  id: "km.rebuildMapData",
  description: "Przebudowuje cache mapy aktywności (km_map_cache/v1) z km_logs z lat/lng.",

  validate: (_payload) => {
    // Brak wymaganych pól w payload
  },

  run: async (_payload, ctx) => {
    ctx.logger.info("km.rebuildMapData: start");

    const logsSnap = await ctx.firestore.collection("km_logs").get();

    ctx.logger.info("km.rebuildMapData: loaded logs", {total: logsSnap.size});

    const groups: Map<string, GroupEntry> = new Map();

    for (const doc of logsSnap.docs) {
      const log = doc.data() as any;

      // Pomiń usunięte/ukryte wpisy
      if (log.visibility === "hidden" || log.deletedAt != null) continue;

      const lat = typeof log.lat === "number" ? log.lat : null;
      const lng = typeof log.lng === "number" ? log.lng : null;
      if (lat == null || lng == null) continue;

      const placeName = String(log.placeName || "").trim() || "nieznane";
      const uid = String(log.uid || "").trim();
      const date = String(log.date || "").slice(0, 10);
      const year = parseInt(date.slice(0, 4), 10);

      const groupKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

      let entry = groups.get(groupKey);
      if (!entry) {
        entry = {
          lat: Math.round(lat * 100000) / 100000,
          lng: Math.round(lng * 100000) / 100000,
          placeName,
          logCount: 0,
          recentActivities: [],
          yearsActive: new Set(),
        };
        groups.set(groupKey, entry);
      }

      entry.logCount += 1;
      if (year > 2000) entry.yearsActive.add(year);

      if (uid && uid !== "historical_unmatched" && date) {
        const name = resolveDisplayName(log);
        if (name) {
          entry.recentActivities.push({uid, name, date});
        }
      }
    }

    const locations: LocationEntry[] = Array.from(groups.values())
      .map((g) => {
        // Sortuj aktywności po dacie DESC, deduplikuj po uid (zostaje najnowsza wizyta), weź 3
        const topUsers: TopUser[] = g.recentActivities
          .sort((a, b) => b.date.localeCompare(a.date))
          .filter((a, i, arr) => arr.findIndex((x) => x.uid === a.uid) === i)
          .slice(0, 3)
          .map(({name, date}) => ({name, date}));

        return {
          lat: g.lat,
          lng: g.lng,
          placeName: g.placeName,
          logCount: g.logCount,
          topUsers,
          yearsActive: Array.from(g.yearsActive).sort((a, b) => b - a),
        };
      })
      .sort((a, b) => b.logCount - a.logCount);

    // Wszystkie lata z aktywnością (dla dropdownu w UI)
    const allYears = Array.from(
      new Set(locations.flatMap((l) => l.yearsActive))
    ).sort((a, b) => b - a);

    const cacheDoc = {
      updatedAt: admin.firestore.Timestamp.now(),
      locationCount: locations.length,
      locations,
      years: allYears,
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
