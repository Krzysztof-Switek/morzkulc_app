import type {Request, Response} from "express";
import * as admin from "firebase-admin";
import {adminCancelReservation} from "../modules/equipment/kayaks/gear_kayaks_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type AdminGearReservationCancelDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

function norm(v: any): string {
  return String(v || "").trim();
}

/** Kolejkuje job serwisowy (fire-and-forget z gwarancją zapisu joba). */
async function enqueueJob(db: FirebaseFirestore.Firestore, taskId: string, payload: Record<string, any>): Promise<void> {
  const jobRef = db.collection("service_jobs").doc();
  await jobRef.set({
    id: jobRef.id,
    taskId,
    payload,
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function handleAdminGearReservationCancel(req: Request, res: Response, deps: AdminGearReservationCancelDeps) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, adminRoleKeys} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;
      const userSnap = await db.collection("users_active").doc(uid).get();
      const roleKey = norm((userSnap.data() as any)?.role_key);
      if (!adminRoleKeys.includes(roleKey)) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const body = (req.body || {}) as any;
      const reservationId = norm(body.reservationId);
      const reason = norm(body.reason);

      if (!reason) {
        res.status(400).json({ok: false, code: "bad_request", message: "Podaj powód anulowania."});
        return;
      }

      const out = await adminCancelReservation(db, {reservationId, adminUid: uid, reason});

      if (!out.ok) {
        res.status(400).json(out);
        return;
      }

      await enqueueJob(db, "gear.notifyReservationCancelledByAdmin", {reservationId});

      res.status(200).json(out);
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
