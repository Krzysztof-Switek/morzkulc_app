/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetKayakReservationsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function todayIsoUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function handleGetKayakReservations(
  req: Request,
  res: Response,
  deps: GetKayakReservationsDeps
) {
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

      const kayakId = String(req.query?.kayakId || "").trim();
      if (!kayakId) {
        res.status(400).json({error: "Missing kayakId"});
        return;
      }

      const todayIso = todayIsoUTC();

      const snap = await db
        .collection("gear_reservations")
        .where("status", "==", "active")
        .where("kayakIds", "array-contains", kayakId)
        .get();

      const docs = snap.docs
        .map((d) => d.data() as any)
        .filter((r) => String(r?.blockEndIso || "") >= todayIso);

      // Batch-fetch user display names from users_active
      const uids = [...new Set(docs.map((r) => String(r?.userUid || "")).filter(Boolean))];

      const nameMap: Record<string, string> = {};
      if (uids.length) {
        const userSnaps = await Promise.all(
          uids.map((uid) => db.collection("users_active").doc(uid).get())
        );
        for (const userSnap of userSnaps) {
          if (!userSnap.exists) continue;
          const data = userSnap.data() as any;
          const firstName = String(data?.profile?.firstName || "").trim();
          const lastName = String(data?.profile?.lastName || "").trim();
          const displayName = [firstName, lastName].filter(Boolean).join(" ");
          nameMap[userSnap.id] = displayName || String(data?.email || "");
        }
      }

      const reservations = docs
        .sort((a, b) =>
          String(a?.startDate || "").localeCompare(String(b?.startDate || ""))
        )
        .map((r) => ({
          startDate: String(r?.startDate || ""),
          endDate: String(r?.endDate || ""),
          blockStartIso: String(r?.blockStartIso || ""),
          blockEndIso: String(r?.blockEndIso || ""),
          userDisplayName:
            nameMap[String(r?.userUid || "")] || String(r?.userEmail || ""),
        }));

      res.status(200).json({ok: true, kayakId, reservations});
    } catch (err: any) {
      logger.error("getKayakReservations failed", {
        message: err?.message,
        stack: err?.stack,
      });
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
