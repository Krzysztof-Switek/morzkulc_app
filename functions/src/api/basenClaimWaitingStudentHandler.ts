import type {Request, Response} from "express";
import {claimWaitingStudent, BasenSlotLabel} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

const VALID_SLOTS: BasenSlotLabel[] = ["H1", "H2"]; // sauna nie ma parowania z instruktorem

/**
 * POST /api/basen/instructor/claim (authenticated)
 * Instruktor przypisuje SIEBIE do studenta, który zapisał się "na training" bez
 * wybranego instruktora (szuka instruktora). Wywołujący musi być aktywnym instruktorem
 * na tym samym slocie — weryfikowane w claimWaitingStudent.
 */
export async function handleBasenClaimWaitingStudent(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const instructorUid = tokenCheck.decoded.uid;

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      const slot = String(body.slot || "").trim() as BasenSlotLabel;
      const targetUid = String(body.targetUid || "").trim();

      if (!sessionId || !VALID_SLOTS.includes(slot)) {
        res.status(400).json({error: "Brakuje sessionId lub nieprawidłowy slot."});
        return;
      }
      if (!targetUid) {
        res.status(400).json({error: "Brakuje targetUid."});
        return;
      }

      await claimWaitingStudent(deps.db, {sessionId, slot, instructorUid, targetUid});

      res.status(200).json({ok: true});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const clientErrors = ["nie istnieje", "anulowany", "instruktor", "szuka", "samego siebie", "maksymalną"];
      const isClient = clientErrors.some((s) => msg.includes(s));
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
