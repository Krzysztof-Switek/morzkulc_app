import type {Request, Response} from "express";
import {enrollInSession, getActiveKarnet, getBasenVars} from "../modules/basen/basen_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

const ENROLL_ROLES = new Set(["rola_czlonek", "rola_zarzad", "rola_kr"]);

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleBasenEnroll(req: Request, res: Response, deps: Deps): Promise<void> {
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

      const uid = tokenCheck.decoded.uid;

      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const userData = userSnap.data() as any;
      const roleKey = String(userData?.role_key || "");
      const statusKey = String(userData?.status_key || "");

      if (await isUserStatusBlocked(deps.db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", error: "Konto zawieszone."});
        return;
      }

      if (!ENROLL_ROLES.has(roleKey)) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: członek, zarząd lub KR."});
        return;
      }

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      const paymentType = String(body.paymentType || "").trim() as "karnet" | "jednorazowe";

      if (!sessionId) {
        res.status(400).json({error: "Brakuje sessionId."});
        return;
      }

      if (!["karnet", "jednorazowe"].includes(paymentType)) {
        res.status(400).json({error: "paymentType musi być 'karnet' lub 'jednorazowe'."});
        return;
      }

      const profile = userData?.profile || {};
      const firstName = String(profile?.firstName || "").trim();
      const lastName = String(profile?.lastName || "").trim();
      const userDisplayName = [firstName, lastName].filter(Boolean).join(" ") || String(userData?.email || uid);
      const userEmail = String(userData?.email || "").trim();

      let karnetId: string | undefined;

      if (paymentType === "karnet") {
        const activeKarnet = await getActiveKarnet(deps.db, uid);
        if (!activeKarnet) {
          res.status(400).json({error: "Nie masz aktywnego karnetu."});
          return;
        }
        if (activeKarnet.totalEntries - activeKarnet.usedEntries <= 0) {
          res.status(400).json({error: "Karnet nie ma już dostępnych wejść."});
          return;
        }
        karnetId = activeKarnet.id;
      }

      // Check vars for config (not strictly needed for enrollment, but validates setup exists)
      await getBasenVars(deps.db);

      const {enrollmentId} = await enrollInSession(deps.db, {
        sessionId,
        userUid: uid,
        userEmail,
        userDisplayName,
        paymentType,
        karnetId,
      });

      res.status(200).json({ok: true, enrollmentId});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const status = msg.includes("pełna") || msg.includes("anulowana") || msg.includes("już zapisany") ? 400 : 500;
      res.status(status).json({error: msg});
    }
  });
}
