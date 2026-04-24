/* eslint-disable require-jsdoc */
import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string}};

export type AdminEventsSyncCalendarDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

export async function handleAdminEventsSyncCalendar(
  req: Request,
  res: Response,
  deps: AdminEventsSyncCalendarDeps
) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, db, adminRoleKeys} = deps;

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
      const roleKey = String((userSnap.data() as any)?.role_key || "");

      if (!adminRoleKeys.includes(roleKey)) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const jobRef = db.collection("service_jobs").doc();
      await jobRef.set({
        id: jobRef.id,
        taskId: "events.syncCalendar",
        payload: {},
        status: "queued",
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("adminEventsSyncCalendar: job enqueued", {jobId: jobRef.id, uid});
      res.status(200).json({ok: true, jobId: jobRef.id});
    } catch (err: any) {
      logger.error("adminEventsSyncCalendar failed", {message: err?.message});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
