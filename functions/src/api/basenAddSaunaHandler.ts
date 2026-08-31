import type {Request, Response} from "express";
import {addSaunaToSession, getBasenVars, resolveBasenAdminGrant} from "../modules/basen/basen_service";

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
 * POST /api/basen/sessions/add-sauna (authenticated, role: zarzad/kr/opiekun basenowy)
 * Dodaje saunę do istniejącego terminu, który powstał bez niej.
 */
export async function handleBasenAddSauna(req: Request, res: Response, deps: Deps): Promise<void> {
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
      const email = String(userData?.email || "");

      if (!deps.adminRoleKeys.includes(roleKey) && !(await resolveBasenAdminGrant(deps.db, email))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd/KR lub opiekun basenowy."});
        return;
      }

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      if (!sessionId) {
        res.status(400).json({error: "Brakuje sessionId."});
        return;
      }

      const vars = await getBasenVars(deps.db);
      await addSaunaToSession(deps.db, {sessionId, vars});

      res.status(200).json({ok: true});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const isClient = msg.includes("nie istnieje") || msg.includes("już saunę") || msg.includes("przeszłości");
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
