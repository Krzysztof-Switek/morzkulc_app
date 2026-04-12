/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminPendingDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

function tsToIso(v: any): string | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

export async function handleGetAdminPending(req: Request, res: Response, deps: GetAdminPendingDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, db, adminRoleKeys} = deps;

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

      const userSnap = await db.collection("users_active").doc(uid).get();
      const roleKey = String((userSnap.data() as any)?.role_key || "");

      if (!adminRoleKeys.includes(roleKey)) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const LIMIT = 50;

      const [earnSnap, purchaseSnap, eventsSnap] = await Promise.all([
        db.collection("godzinki_ledger")
          .where("approved", "==", false)
          .where("type", "==", "earn")
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
        db.collection("godzinki_ledger")
          .where("approved", "==", false)
          .where("type", "==", "purchase")
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
        db.collection("events")
          .where("approved", "==", false)
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
      ]);

      const godzinkiItems = [...earnSnap.docs, ...purchaseSnap.docs]
        .sort((a, b) => {
          const aTs = a.data().createdAt?.toMillis?.() ?? 0;
          const bTs = b.data().createdAt?.toMillis?.() ?? 0;
          return aTs - bTs;
        })
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            uid: String(data.uid || ""),
            type: String(data.type || ""),
            amount: Number(data.amount ?? 0),
            reason: String(data.reason || ""),
            submittedBy: String(data.submittedBy || ""),
            createdAt: tsToIso(data.createdAt),
          };
        });

      const eventsItems = eventsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: String(data.name || ""),
          startDate: String(data.startDate || ""),
          endDate: String(data.endDate || ""),
          userEmail: String(data.userEmail || ""),
          createdAt: tsToIso(data.createdAt),
        };
      });

      res.status(200).json({
        ok: true,
        godzinki: {count: godzinkiItems.length, items: godzinkiItems},
        events: {count: eventsItems.length, items: eventsItems},
      });
    } catch (err: any) {
      logger.error("getAdminPending failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
