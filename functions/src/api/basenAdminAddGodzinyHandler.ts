import type {Request, Response} from "express";
import {resolveBasenAdminGrant} from "../modules/basen/basen_service";
import {adminAddBasenGodziny, getBasenGodzinyRecords, computeBasenGodzinyBalance} from "../modules/basen/basen_godziny_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  adminRoleKeys: string[];
};

/**
 * POST /api/basen/admin/godziny/add
 * Admin dopisuje godziny basenowe użytkownikowi po potwierdzeniu wpłaty poza aplikacją.
 * Body: { userUid: string, amount: number, reason?: string }
 */
export async function handleBasenAdminAddGodziny(req: Request, res: Response, deps: Deps): Promise<void> {
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
      const adminRoleKey = String(adminData?.role_key || "");
      const adminEmail = String(adminData?.email || "");
      if (!deps.adminRoleKeys.includes(adminRoleKey) && !(await resolveBasenAdminGrant(deps.db, adminEmail))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd/KR lub opiekun basenowy."});
        return;
      }

      const body = req.body || {};
      const targetUid = String(body.userUid || "").trim();
      const amount = Number(body.amount || 0);
      const reason = String(body.reason || "").trim();

      if (!targetUid) {
        res.status(400).json({error: "Brakuje userUid."});
        return;
      }
      if (!amount || amount <= 0) {
        res.status(400).json({error: "Liczba godzin musi być większa od 0."});
        return;
      }

      const targetSnap = await deps.db.collection("users_active").doc(targetUid).get();
      if (!targetSnap.exists) {
        res.status(400).json({error: "Użytkownik nie istnieje."});
        return;
      }

      const recordId = await adminAddBasenGodziny(deps.db, {
        uid: targetUid,
        amount,
        reason: reason || "Dopisanie godzin przez admina",
        performedBy: adminUid,
      });

      const records = await getBasenGodzinyRecords(deps.db, targetUid);
      const newBalance = computeBasenGodzinyBalance(records);

      res.status(200).json({ok: true, recordId, newBalance});
    } catch (err) {
      const e = err as {message?: string};
      res.status(400).json({error: e?.message || String(err)});
    }
  });
}
