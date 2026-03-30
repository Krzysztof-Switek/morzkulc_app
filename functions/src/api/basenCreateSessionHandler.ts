import type {Request, Response} from "express";
import {createSession, getBasenVars} from "../modules/basen/basen_service";

const ADMIN_ROLES = new Set(["rola_zarzad", "rola_kr"]);

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleBasenCreateSession(req: Request, res: Response, deps: Deps): Promise<void> {
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

      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const userData = userSnap.data() as any;
      const roleKey = String(userData?.role_key || "");

      if (!ADMIN_ROLES.has(roleKey)) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd lub KR."});
        return;
      }

      const body = req.body || {};
      const date = String(body.date || "").trim();
      const timeStart = String(body.timeStart || "").trim();
      const timeEnd = String(body.timeEnd || "").trim();
      const notes = String(body.notes || "").trim();
      const instructorEmail = String(body.instructorEmail || "").trim();
      const instructorName = String(body.instructorName || "").trim();

      if (!date || !timeStart || !timeEnd) {
        res.status(400).json({error: "Wymagane pola: data, godzina od, godzina do."});
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({error: "Nieprawidłowy format daty (YYYY-MM-DD)."});
        return;
      }

      const vars = await getBasenVars(deps.db);
      const capacity = Number(body.capacity || 0) || vars.basen_limit_uczestnikow;

      const sessionId = await createSession(deps.db, {
        date,
        timeStart,
        timeEnd,
        capacity,
        instructorEmail,
        instructorName,
        notes,
        createdBy: uid,
      });

      res.status(200).json({ok: true, sessionId});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
