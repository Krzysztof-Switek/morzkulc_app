import type {Request, Response} from "express";
import {setEnrollmentInstructor, BasenSlotLabel} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

const VALID_SLOTS: BasenSlotLabel[] = ["H1", "H2"]; // sauna nie ma parowania z instruktorem

export async function handleBasenSetInstructor(req: Request, res: Response, deps: Deps): Promise<void> {
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

      const uid = tokenCheck.decoded.uid;

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      const slot = String(body.slot || "").trim() as BasenSlotLabel;
      const instructorUidRaw = body.instructorUid;
      const instructorUid = instructorUidRaw === null || instructorUidRaw === undefined || instructorUidRaw === "" ?
        null :
        String(instructorUidRaw).trim();
      const seeking = body.seeking === true;

      if (!sessionId || !VALID_SLOTS.includes(slot)) {
        res.status(400).json({error: "Brakuje sessionId lub nieprawidłowy slot."});
        return;
      }

      await setEnrollmentInstructor(deps.db, {sessionId, slot, uid, instructorUid, seeking});

      res.status(200).json({ok: true});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const clientErrors = ["nie istnieje", "anulowany", "dostępny", "samego siebie", "sam ze sobą", "maksymalną", "przypisaną"];
      const isClient = clientErrors.some((s) => msg.includes(s));
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
