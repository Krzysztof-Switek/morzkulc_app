/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import * as admin from "firebase-admin";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type EventInterestToggleDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

export async function handleEventInterestToggle(
  req: Request, res: Response, deps: EventInterestToggleDeps
) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken} = deps;

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
      const body = (req.body || {}) as any;
      const eventId = String(body?.eventId || "").trim();

      if (!eventId) {
        res.status(400).json({error: "Missing eventId"});
        return;
      }

      // Deterministyczne ID dokumentu — idempotentny upsert/delete
      const docId = `${uid}_${eventId}`;
      const docRef = db.collection("event_interests").doc(docId);

      const snap = await docRef.get();

      if (snap.exists) {
        await docRef.delete();
        res.status(200).json({ok: true, isInterested: false});
      } else {
        await docRef.set({
          uid,
          eventId,
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ok: true, isInterested: true});
      }
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
