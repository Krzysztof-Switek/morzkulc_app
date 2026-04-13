/**
 * kmEventStatsHandler.ts
 *
 * GET /api/km/event-stats?eventId=XXX
 *
 * Zwraca agregowane statystyki wywrotolotek per uczestnik dla danej imprezy.
 * Dane z km_logs gdzie eventId == eventId.
 * Sortowanie: pointsTotal DESC.
 */

import type {Request, Response} from "express";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type KmEventStatsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

export async function handleKmEventStats(
  req: Request,
  res: Response,
  deps: KmEventStatsDeps
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

      const eventId = norm(req.query.eventId).slice(0, 128);
      if (!eventId) {
        res.status(400).json({ok: false, code: "missing_eventId", message: "Brak parametru eventId."});
        return;
      }

      // Pobierz wszystkie km_logs dla tej imprezy (equality query — single-field index auto-created)
      const logsSnap = await deps.db.collection("km_logs")
        .where("eventId", "==", eventId)
        .get();

      // Zbierz nazwę imprezy z pierwszego logu (denormalizowana)
      let eventName = "";

      // Agreguj per uid
      const byUid: Record<string, {
        uid: string;
        displayName: string;
        nickname: string;
        capsizeKabina: number;
        capsizeRolka: number;
        capsizeDziubek: number;
        pointsTotal: number;
        logs: number;
      }> = {};

      for (const doc of logsSnap.docs) {
        const log = doc.data() as any;
        if (!eventName && log.eventName) eventName = String(log.eventName);

        const uid = norm(log.uid);
        if (!uid || uid === "historical_unmatched") continue;

        if (!byUid[uid]) {
          const snap = log.userSnapshot || {};
          byUid[uid] = {
            uid,
            displayName: norm(snap.displayName) || norm(log.displayName) || uid,
            nickname: norm(snap.nickname) || norm(log.nickname) || "",
            capsizeKabina: 0,
            capsizeRolka: 0,
            capsizeDziubek: 0,
            pointsTotal: 0,
            logs: 0,
          };
        }

        const entry = byUid[uid];
        const rolls = log.capsizeRolls || {};
        entry.capsizeKabina += Math.max(0, parseInt(rolls.kabina || "0", 10));
        entry.capsizeRolka += Math.max(0, parseInt(rolls.rolka || "0", 10));
        entry.capsizeDziubek += Math.max(0, parseInt(rolls.dziubek || "0", 10));
        entry.pointsTotal += Number(log.pointsTotal || 0);
        entry.logs += 1;
      }

      const participants = Object.values(byUid)
        .map((p) => ({
          ...p,
          capsizeTotal: p.capsizeKabina + p.capsizeRolka + p.capsizeDziubek,
          pointsTotal: Math.round(p.pointsTotal * 100) / 100,
        }))
        .sort((a, b) => b.pointsTotal - a.pointsTotal);

      const totals = participants.reduce(
        (acc, p) => ({
          capsizeKabina: acc.capsizeKabina + p.capsizeKabina,
          capsizeRolka: acc.capsizeRolka + p.capsizeRolka,
          capsizeDziubek: acc.capsizeDziubek + p.capsizeDziubek,
          capsizeTotal: acc.capsizeTotal + p.capsizeTotal,
          pointsTotal: Math.round((acc.pointsTotal + p.pointsTotal) * 100) / 100,
          logs: acc.logs + p.logs,
        }),
        {capsizeKabina: 0, capsizeRolka: 0, capsizeDziubek: 0, capsizeTotal: 0, pointsTotal: 0, logs: 0}
      );

      res.status(200).json({
        ok: true,
        eventId,
        eventName,
        participants,
        totals,
        count: participants.length,
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
