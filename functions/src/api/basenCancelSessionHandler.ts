import type {Request, Response} from "express";
import {cancelSession} from "../modules/basen/basen_service";

const ADMIN_ROLES = new Set(["rola_zarzad", "rola_kr"]);

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  enqueueBasenSessionCancelledNotify: (sessionId: string) => Promise<void>;
};

export async function handleBasenCancelSession(req: Request, res: Response, deps: Deps): Promise<void> {
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
      const sessionId = String(body.sessionId || "").trim();

      if (!sessionId) {
        res.status(400).json({error: "Brakuje sessionId."});
        return;
      }

      const {enrollments} = await cancelSession(deps.db, sessionId);

      // Fire-and-forget email notification
      deps.enqueueBasenSessionCancelledNotify(sessionId).catch(() => {
        // best-effort
      });

      res.status(200).json({ok: true, cancelledEnrollments: enrollments.length});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const isClient = msg.includes("już anulowana") || msg.includes("nie istnieje");
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
