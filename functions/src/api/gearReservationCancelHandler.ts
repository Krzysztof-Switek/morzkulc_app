import type {Request, Response} from "express";
import {cancelReservation} from "../modules/equipment/kayaks/gear_kayaks_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GearReservationCancelDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function norm(v: any): string {
  return String(v || "").trim();
}

export async function handleGearReservationCancel(req: Request, res: Response, deps: GearReservationCancelDeps) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const body = (req.body || {}) as any;
      const reservationId = norm(body.reservationId);

      const out = await cancelReservation(db, {uid: tokenCheck.decoded.uid, reservationId});

      if (!out.ok) {
        res.status(400).json(out);
        return;
      }

      res.status(200).json(out);
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
