/**
 * kmMyLogsHandler.ts
 *
 * GET /kmMyLogs
 *
 * Zwraca listę wpisów km_logs dla zalogowanego użytkownika.
 * Posortowane po dacie malejąco (najpierw najnowsze).
 *
 * Query params:
 *   limit?    — max liczba wpisów (domyślnie 50, max 100)
 *   afterDate? — paginacja: data "YYYY-MM-DD", zwróć rekordy starsze niż ta data
 */

import type {Request, Response} from "express";
import {getUserKmLogs} from "../modules/km/km_log_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type KmMyLogsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

export async function handleKmMyLogs(
  req: Request,
  res: Response,
  deps: KmMyLogsDeps
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

      const limitRaw = parseInt(String(req.query.limit || "50"), 10);
      const limit = Math.min(100, Math.max(1, Number.isNaN(limitRaw) ? 50 : limitRaw));
      const afterDate = String(req.query.afterDate || "").trim() || undefined;

      const logs = await getUserKmLogs(deps.db, uid, limit, afterDate);

      res.status(200).json({ok: true, logs, count: logs.length});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
