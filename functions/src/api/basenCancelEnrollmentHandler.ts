import type {Request, Response} from "express";
import {cancelEnrollment, getBasenVars} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleBasenCancelEnrollment(req: Request, res: Response, deps: Deps): Promise<void> {
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
      const enrollmentId = String(body.enrollmentId || "").trim();

      if (!enrollmentId) {
        res.status(400).json({error: "Brakuje enrollmentId."});
        return;
      }

      const vars = await getBasenVars(deps.db);

      await cancelEnrollment(deps.db, {
        enrollmentId,
        userUid: uid,
        cancellationWindowHours: vars.basen_okno_anulowania_h,
      });

      res.status(200).json({ok: true});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const clientErrors = ["nie istnieje", "Brak dostępu", "już anulowany", "możliwe tylko"];
      const isClient = clientErrors.some((s) => msg.includes(s));
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
