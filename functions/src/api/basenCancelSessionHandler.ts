import type {Request, Response} from "express";
import {cancelSession, resolveBasenAdminGrant, BasenSlotLabel} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  enqueueBasenSessionCancelledNotify: (sessionId: string, slot?: BasenSlotLabel) => Promise<void>;
  adminRoleKeys: string[];
};

const VALID_SLOTS: BasenSlotLabel[] = ["H1", "H2", "SAUNA"];

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
      const email = String(userData?.email || "");

      if (!deps.adminRoleKeys.includes(roleKey) && !(await resolveBasenAdminGrant(deps.db, email))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd/KR lub opiekun basenowy."});
        return;
      }

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      const slotRaw = String(body.slot || "").trim();
      const slot = slotRaw && VALID_SLOTS.includes(slotRaw as BasenSlotLabel) ? (slotRaw as BasenSlotLabel) : undefined;

      if (!sessionId) {
        res.status(400).json({error: "Brakuje sessionId."});
        return;
      }
      if (slotRaw && !slot) {
        res.status(400).json({error: "Nieprawidłowy slot."});
        return;
      }

      const {enrollments} = await cancelSession(deps.db, sessionId, slot);

      // Fire-and-forget email notification
      deps.enqueueBasenSessionCancelledNotify(sessionId, slot).catch(() => {
        // best-effort
      });

      res.status(200).json({ok: true, cancelledEnrollments: enrollments.length});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const isClient = msg.includes("już anulowan") || msg.includes("nie istnieje");
      res.status(isClient ? 400 : 500).json({error: msg});
    }
  });
}
