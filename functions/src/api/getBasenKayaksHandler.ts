import type {Request, Response} from "express";
import {listAvailableBasenKayaks, BasenSlotLabel} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

const VALID_SLOTS: BasenSlotLabel[] = ["H1", "H2", "SAUNA"];

export async function handleGetBasenKayaks(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;
      const sessionId = String(req.query.sessionId || "").trim();
      const slot = String(req.query.slot || "").trim() as BasenSlotLabel;

      if (!sessionId || !VALID_SLOTS.includes(slot)) {
        res.status(400).json({error: "Brakuje sessionId lub nieprawidłowy slot."});
        return;
      }

      const kayaks = await listAvailableBasenKayaks(deps.db, sessionId, slot, uid);

      res.status(200).json({ok: true, kayaks});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
