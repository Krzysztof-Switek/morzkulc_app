import type {Request, Response} from "express";
import {isIsoDateYYYYMMDD} from "../modules/calendar/calendar_utils";
import {createBundleReservation, BundleItemInput} from "../modules/equipment/bundle/gear_bundle_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GearBundleReservationCreateDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  memberRoleKeys: string[];
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

export async function handleGearBundleReservationCreate(
  req: Request,
  res: Response,
  deps: GearBundleReservationCreateDeps
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

      const uid = tokenCheck.decoded.uid;

      const userSnap = await db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({ok: false, code: "forbidden", message: "User not registered"});
        return;
      }

      const statusKey = String((userSnap.data() as any)?.status_key || "");
      if (await isUserStatusBlocked(db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Konto zawieszone."});
        return;
      }
      const roleKey = String((userSnap.data() as any)?.role_key || "");
      if (!deps.memberRoleKeys.includes(roleKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Rezerwacja sprzętu wymaga roli Członek."});
        return;
      }

      const body = (req.body || {}) as any;
      const startDate = norm(body.startDate);
      const endDate = norm(body.endDate);
      const starterCategory = norm(body.starterCategory).toLowerCase();
      const starterItemId = norm(body.starterItemId);
      const items = parseItems(body.items);

      if (!isIsoDateYYYYMMDD(startDate) || !isIsoDateYYYYMMDD(endDate) || startDate > endDate) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Invalid startDate/endDate"});
        return;
      }

      if (!items) {
        res.status(400).json({ok: false, code: "validation_failed", message: "items must be a non-empty array of {itemId, category}"});
        return;
      }

      const out = await createBundleReservation(db, {
        uid,
        startDate,
        endDate,
        items,
        starterCategory: starterCategory || "",
        starterItemId: starterItemId || "",
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
