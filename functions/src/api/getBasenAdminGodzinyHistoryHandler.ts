import type {Request, Response} from "express";
import {resolveBasenAdminGrant} from "../modules/basen/basen_service";
import {getBasenGodzinyRecords, computeBasenGodzinyBalance} from "../modules/basen/basen_godziny_service";

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
 * GET /api/basen/admin/godziny/history?userUid=... (authenticated, role: zarzad/kr/opiekun basenowy)
 * Pełna historia godzin basenowych DOWOLNEGO usera — ten sam "wyciąg bankowy" co
 * getBasenMyGodzinyHandler.ts (zakładka "Moje konto"), tylko dla wskazanego usera
 * zamiast requestera — wołane z zakładki "Płatności" ("Pokaż historię").
 */
export async function handleGetBasenAdminGodzinyHistory(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;
      const adminSnap = await deps.db.collection("users_active").doc(uid).get();
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

      const targetUid = String(req.query.userUid || "").trim();
      if (!targetUid) {
        res.status(400).json({error: "Brakuje userUid."});
        return;
      }

      const records = await getBasenGodzinyRecords(deps.db, targetUid);
      const balance = computeBasenGodzinyBalance(records);

      const sorted = [...records].sort((a, b) => {
        const at = (a.createdAt as any)?.toMillis?.() ?? 0;
        const bt = (b.createdAt as any)?.toMillis?.() ?? 0;
        return bt - at;
      });

      const serialized = sorted.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        reason: r.reason,
        sessionId: r.sessionId ?? null,
        slot: r.slot ?? null,
        createdAt: r.createdAt && typeof (r.createdAt as any).toDate === "function" ?
          (r.createdAt as any).toDate().toISOString() :
          null,
      }));

      res.status(200).json({ok: true, balance, records: serialized});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
