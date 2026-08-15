/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type NotificationPrefsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

const PREF_KEYS = ["eventsNew", "eventsUpcoming", "eventsUpcomingInteresting"] as const;
type PrefKey = typeof PREF_KEYS[number];

export async function handleNotificationPrefs(req: Request, res: Response, deps: NotificationPrefsDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, db} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;

      if (req.method === "GET") {
        const snap = await db.collection("users_active").doc(uid).get();
        const data = snap.exists ? (snap.data() as any) : null;
        const stored = data?.profile?.notifications || {};

        const prefs: Record<PrefKey, boolean> = {
          eventsNew: false,
          eventsUpcoming: false,
          eventsUpcomingInteresting: false,
        };
        for (const key of PREF_KEYS) {
          prefs[key] = stored[key] === true;
        }

        res.status(200).json({ok: true, prefs});
        return;
      }

      if (req.method === "POST") {
        const body = (req.body || {}) as Record<string, unknown>;

        const patch: Partial<Record<PrefKey, boolean>> = {};
        for (const key of PREF_KEYS) {
          if (typeof body[key] === "boolean") {
            patch[key] = body[key] as boolean;
          }
        }

        if (Object.keys(patch).length === 0) {
          res.status(400).json({error: "Missing valid notification preference fields"});
          return;
        }

        await db.collection("users_active").doc(uid).set(
          {profile: {notifications: patch}},
          {merge: true}
        );

        res.status(200).json({ok: true});
        return;
      }

      res.status(405).json({error: "Method not allowed"});
    } catch (err: any) {
      logger.error("notificationPrefs failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
