/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetGearFavoritesDeps = {
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

export async function handleGetGearFavorites(
  req: Request, res: Response, deps: GetGearFavoritesDeps
) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;
      const raw = req.query?.category;
      const category = String(Array.isArray(raw) ? raw[0] : raw || "").trim().toLowerCase();

      if (!category || !VALID_CATEGORIES.has(category)) {
        res.status(400).json({error: "Invalid or missing category"});
        return;
      }

      const snap = await db.collection("gear_favorites")
        .where("uid", "==", uid)
        .where("category", "==", category)
        .get();

      const favoriteIds = snap.docs.map((d) => String(d.data()?.itemId || "")).filter(Boolean);

      res.status(200).json({ok: true, category, favoriteIds});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
