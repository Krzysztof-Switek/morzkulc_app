import type {Request, Response} from "express";
import {updateBundleReservationItems, BundleItemInput} from "../modules/equipment/bundle/gear_bundle_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GearBundleReservationUpdateItemsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function norm(v: any): string {
  return String(v || "").trim();
}

function parseItems(raw: any): BundleItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const result: BundleItemInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const itemId = norm(entry.itemId);
    const category = norm(entry.category).toLowerCase();
    if (!itemId || !category) return null;
    result.push({itemId, category});
  }
  return result;
}

export async function handleGearBundleReservationUpdateItems(
  req: Request,
  res: Response,
  deps: GearBundleReservationUpdateItemsDeps
) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken} = deps;

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

      if (req.method !== "POST") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const body = (req.body || {}) as any;
      const reservationId = norm(body.reservationId);
      const items = parseItems(body.items);

      if (!reservationId) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Missing reservationId"});
        return;
      }
      if (!items) {
        res.status(400).json({ok: false, code: "validation_failed", message: "items must be a non-empty array of {itemId, category}"});
        return;
      }

      const out = await updateBundleReservationItems(db, {
        uid: tokenCheck.decoded.uid,
        reservationId,
        items,
      });

      if (!out.ok) {
        res.status(400).json(out);
        return;
      }

      res.status(200).json(out);
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
