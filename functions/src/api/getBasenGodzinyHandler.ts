import type {Request, Response} from "express";
import {getBasenGodzinyRecords, computeBasenGodzinyBalance} from "../modules/basen/basen_godziny_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  adminRoleKeys: string[];
};

/**
 * GET /api/basen/godziny
 * Zwraca saldo i historię godzin basenowych.
 * Użytkownik widzi swoje. Admin może podać ?uid= żeby zobaczyć cudze.
 */
export async function handleGetBasenGodziny(req: Request, res: Response, deps: Deps): Promise<void> {
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

      const callerUid = tokenCheck.decoded.uid;
      const queryUid = String(req.query?.uid || "").trim();

      let targetUid = callerUid;

      if (queryUid && queryUid !== callerUid) {
        const callerSnap = await deps.db.collection("users_active").doc(callerUid).get();
        const callerData = callerSnap.data() as any;
        if (!deps.adminRoleKeys.includes(String(callerData?.role_key || ""))) {
          res.status(403).json({error: "Brak uprawnień do przeglądania godzin innego użytkownika."});
          return;
        }
        targetUid = queryUid;
      }

      const records = await getBasenGodzinyRecords(deps.db, targetUid);
      const balance = computeBasenGodzinyBalance(records);

      res.status(200).json({ok: true, balance, records});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
