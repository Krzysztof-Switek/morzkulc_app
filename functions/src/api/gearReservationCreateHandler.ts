import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {isIsoDateYYYYMMDD} from "../modules/calendar/calendar_utils";
import {createReservation} from "../modules/equipment/kayaks/gear_kayaks_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GearReservationCreateDeps = {
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

function asStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x || "").trim()).filter(Boolean);
}

export async function handleGearReservationCreate(req: Request, res: Response, deps: GearReservationCreateDeps) {
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

      const uid = tokenCheck.decoded.uid;

      const userSnap = await db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({ok: false, code: "forbidden", message: "User not registered"});
        return;
      }
      const userData = userSnap.data() as any;
      const roleKey = String(userData?.role_key || "");
      const statusKey = String(userData?.status_key || "");
      logger.info("gearReservationCreate: user data check", {
        uid,
        role_key: userData?.role_key,
        status_key: userData?.status_key,
        statusKey,
        userDocKeys: Object.keys(userData || {}),
      });
      if (await isUserStatusBlocked(db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Konto zawieszone."});
        return;
      }
      if (!deps.memberRoleKeys.includes(roleKey)) {
        res.status(403).json({ok: false, code: "forbidden", message: "Rezerwacja sprzętu wymaga roli Członek."});
        return;
      }

      const body = (req.body || {}) as any;
      const startDate = norm(body.startDate);
      const endDate = norm(body.endDate);
      const kayakIds = asStringArray(body.kayakIds);
      if (!isIsoDateYYYYMMDD(startDate) || !isIsoDateYYYYMMDD(endDate) || startDate > endDate) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Invalid startDate/endDate"});
        return;
      }

      const out = await createReservation(db, {
        uid,
        startDate,
        endDate,
        kayakIds,
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
