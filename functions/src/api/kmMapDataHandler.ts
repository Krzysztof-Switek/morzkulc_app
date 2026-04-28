/**
 * kmMapDataHandler.ts
 *
 * GET /api/km/map-data
 *
 * Zwraca pre-computed cache lokalizacji aktywności z km_map_cache/v1.
 * Dane budowane przez task km.rebuildMapData (wywoływany z GAS menu).
 * O(1) read — jeden dokument Firestore.
 *
 * Query params:
 *   year? — "YYYY" — jeśli podany, filtruje locations do tych z danym rokiem w yearsActive
 */

import type {Request, Response} from "express";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type KmMapDataDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

export async function handleKmMapData(
  req: Request,
  res: Response,
  deps: KmMapDataDeps
): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const yearRaw = String(req.query.year || "").trim();
      const filterYear = /^\d{4}$/.test(yearRaw) ? parseInt(yearRaw, 10) : null;

      const snap = await deps.db.collection("km_map_cache").doc("v1").get();

      if (!snap.exists) {
        res.status(200).json({ok: true, locations: [], locationCount: 0, years: [], updatedAt: null});
        return;
      }

      const data = snap.data() as any;
      const updatedAt = data.updatedAt?.toDate?.()?.toISOString() || null;
      const allLocations: any[] = data.locations || [];
      const years: number[] = data.years || [];

      const locations = filterYear != null ?
        allLocations.filter((l: any) => Array.isArray(l.yearsActive) && l.yearsActive.includes(filterYear)) :
        allLocations;

      const responseBody: Record<string, any> = {
        ok: true,
        updatedAt,
        locationCount: locations.length,
        locations,
        years,
      };
      if (filterYear != null) responseBody.filteredByYear = filterYear;
      res.status(200).json(responseBody);
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
