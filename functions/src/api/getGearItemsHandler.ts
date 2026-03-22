/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {listGearItemsByCategory, isSupportedGearCategory} from "../modules/equipment/shared/gear_catalog_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetGearItemsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function getCategoryFromRequest(req: Request): string {
  const raw = req.query?.category;
  if (Array.isArray(raw)) return String(raw[0] || "").trim().toLowerCase();
  return String(raw || "").trim().toLowerCase();
}

export async function handleGetGearItems(req: Request, res: Response, deps: GetGearItemsDeps) {
  const {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  } = deps;

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

      const category = getCategoryFromRequest(req);
      if (!category) {
        res.status(400).json({error: "Missing category"});
        return;
      }

      if (!isSupportedGearCategory(category)) {
        res.status(400).json({error: "Unsupported category"});
        return;
      }

      const items = await listGearItemsByCategory(db, category);

      res.status(200).json({
        ok: true,
        category,
        count: items.length,
        items,
      });
    } catch (err: any) {
      logger.error("getGearItems failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
