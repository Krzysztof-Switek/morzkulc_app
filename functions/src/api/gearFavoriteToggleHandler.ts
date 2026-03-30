/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import * as admin from "firebase-admin";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GearFavoriteToggleDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

const VALID_CATEGORIES = new Set([
  "kayaks", "paddles", "lifejackets", "helmets", "throwbags", "sprayskirts",
]);

export async function handleGearFavoriteToggle(
  req: Request, res: Response, deps: GearFavoriteToggleDeps
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
      const itemId = String(body?.itemId || "").trim();
      const category = String(body?.category || "").trim().toLowerCase();

      if (!itemId) {
        res.status(400).json({error: "Missing itemId"});
        return;
      }
      if (!category || !VALID_CATEGORIES.has(category)) {
        res.status(400).json({error: "Invalid or missing category"});
        return;
      }

      // Deterministic document ID — idempotent upsert/delete
      const docId = `${uid}_${category}_${itemId}`;
      const docRef = db.collection("gear_favorites").doc(docId);

      const snap = await docRef.get();

      if (snap.exists) {
        await docRef.delete();
        res.status(200).json({ok: true, isFav: false});
      } else {
        await docRef.set({
          uid,
          category,
          itemId,
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ok: true, isFav: true});
      }
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
