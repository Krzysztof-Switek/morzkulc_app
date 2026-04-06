/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {createEvent} from "../modules/calendar/events_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type SubmitEventDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  enqueueEventSheetWrite: (eventId: string, uid: string) => Promise<void>;
  memberRoleKeys: string[];
};

function norm(v: any): string {
  return String(v || "").trim();
}

export async function handleSubmitEvent(req: Request, res: Response, deps: SubmitEventDeps) {
  const {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    enqueueEventSheetWrite,
    memberRoleKeys,
  } = deps;

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
      const email = norm(tokenCheck.decoded.email);

      // Sprawdź rolę użytkownika
      const userSnap = await db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({ok: false, code: "forbidden", message: "User not registered"});
        return;
      }

      const userData = userSnap.data() as any;
      const roleKey = norm(userData?.role_key);
      const statusKey = norm(userData?.status_key);

      if (await isUserStatusBlocked(db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Konto zawieszone."});
        return;
      }

      if (!memberRoleKeys.includes(roleKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Role not allowed"});
        return;
      }

      const body = (req.body || {}) as any;

      const out = await createEvent(db, {
        uid,
        email,
        startDate: norm(body.startDate),
        endDate: norm(body.endDate),
        name: norm(body.name),
        location: norm(body.location),
        description: norm(body.description),
        contact: norm(body.contact),
        link: norm(body.link),
      });

      if (!out.ok) {
        res.status(400).json(out);
        return;
      }

      // Zapisz do Google Sheets w tle (fire-and-forget)
      enqueueEventSheetWrite(out.eventId, uid).catch((e: any) => {
        logger.warn("submitEvent: enqueueEventSheetWrite failed", {message: e?.message});
      });

      res.status(200).json({ok: true, eventId: out.eventId});
    } catch (err: any) {
      logger.error("submitEvent failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}

