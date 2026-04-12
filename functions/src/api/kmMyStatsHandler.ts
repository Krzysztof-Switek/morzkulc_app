/**
 * kmMyStatsHandler.ts
 *
 * GET /kmMyStats
 *
 * Zwraca agregaty zalogowanego użytkownika z kolekcji km_user_stats.
 * Dane gotowe — odczyt O(1), brak przeliczania po stronie serwera.
 */

import type {Request, Response} from "express";
import {getUserKmStats} from "../modules/km/km_log_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type KmMyStatsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

export async function handleKmMyStats(
  req: Request,
  res: Response,
  deps: KmMyStatsDeps
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
      const uid = tokenCheck.decoded.uid;

      const stats = await getUserKmStats(deps.db, uid);

      res.status(200).json({ok: true, stats});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
