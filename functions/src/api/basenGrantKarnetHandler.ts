import type {Request, Response} from "express";
import {grantKarnet, getBasenVars} from "../modules/basen/basen_service";

const ADMIN_ROLES = new Set(["rola_zarzad", "rola_kr"]);

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleBasenGrantKarnet(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const adminUid = tokenCheck.decoded.uid;

      const adminSnap = await deps.db.collection("users_active").doc(adminUid).get();
      if (!adminSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const adminData = adminSnap.data() as any;
      if (!ADMIN_ROLES.has(String(adminData?.role_key || ""))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd lub KR."});
        return;
      }

      const body = req.body || {};
      const targetUid = String(body.userUid || "").trim();

      if (!targetUid) {
        res.status(400).json({error: "Brakuje userUid."});
        return;
      }

      const targetSnap = await deps.db.collection("users_active").doc(targetUid).get();
      if (!targetSnap.exists) {
        res.status(400).json({error: "Użytkownik nie istnieje."});
        return;
      }

      const targetData = targetSnap.data() as any;
      const profile = targetData?.profile || {};
      const firstName = String(profile?.firstName || "").trim();
      const lastName = String(profile?.lastName || "").trim();
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || String(targetData?.email || targetUid);
      const userEmail = String(targetData?.email || "").trim();

      const vars = await getBasenVars(deps.db);
      const totalEntries = Number(body.totalEntries || 0) || vars.basen_ile_wejsc_na_karnet;

      const karnetId = await grantKarnet(deps.db, {
        userUid: targetUid,
        userEmail,
        userDisplayName: displayName,
        totalEntries,
        grantedBy: adminUid,
      });

      res.status(200).json({ok: true, karnetId});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
