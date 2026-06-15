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

      // Pełny sync zatwierdzeń: GODZINKI (arkusz→Firestore) + IMPREZY
      // (arkusz→Firestore, w tym backfill) + KALENDARZ (Firestore→Calendar).
      // Wcześniej przycisk kolejkował WYŁĄCZNIE sync kalendarza — zatwierdzenia
      // z arkusza nie docierały do aplikacji (audyt imprez I1/I9; panel Z11).
      const enqueue = async (taskId: string) => {
        const jobRef = db.collection("service_jobs").doc();
        await jobRef.set({
          id: jobRef.id,
          taskId,
          payload: {},
          status: "queued",
          attempts: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return jobRef.id;
      };

      const godzinkiJobId = await enqueue("godzinki.syncFromSheet");
      const sheetJobId = await enqueue("events.syncFromSheet");
      const calendarJobId = await enqueue("events.syncCalendar");

      logger.info("adminEventsSyncCalendar: jobs enqueued", {godzinkiJobId, sheetJobId, calendarJobId, uid});
      res.status(200).json({ok: true, jobId: calendarJobId, godzinkiJobId, sheetJobId, calendarJobId});
    } catch (err: any) {
      logger.error("adminEventsSyncCalendar failed", {message: err?.message});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
