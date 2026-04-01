import type {Request, Response} from "express";
import {isIsoDateYYYYMMDD} from "../modules/calendar/calendar_utils";
import {getItemsWithAvailability, isSupportedBundleCategory} from "../modules/equipment/bundle/gear_bundle_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetGearItemAvailabilityDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function getQueryString(req: Request, key: string): string {
  const raw = req.query?.[key];
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

export async function handleGetGearItemAvailability(
  req: Request,
  res: Response,
  deps: GetGearItemAvailabilityDeps
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

      const category = getQueryString(req, "category").toLowerCase();
      const startDate = getQueryString(req, "startDate");
      const endDate = getQueryString(req, "endDate");

      if (!category) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Missing category"});
        return;
      }
      if (!isSupportedBundleCategory(category)) {
        res.status(400).json({ok: false, code: "validation_failed", message: `Unsupported category: ${category}`});
        return;
      }
      if (!isIsoDateYYYYMMDD(startDate) || !isIsoDateYYYYMMDD(endDate) || startDate > endDate) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Invalid startDate/endDate"});
        return;
      }

      const offsetDays = 1;
      const result = await getItemsWithAvailability(db, category, startDate, endDate, offsetDays);
      const items = result.items;

      res.status(200).json({
        ok: true,
        category,
        startDate,
        endDate,
        count: items.length,
        items,
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
