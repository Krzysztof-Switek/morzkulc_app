/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type CheckNicknameAvailabilityDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function normalizeNicknameKey(v: unknown): string {
  return String(v || "").trim().toLowerCase();
}

/**
 * GET /api/nickname-availability?nickname=XXX (authenticated)
 * Sprawdza czy ksywa jest wolna (case-insensitive, porównanie po profile.nicknameLower).
 * Własna, już zapisana ksywa (ten sam uid) liczy się jako dostępna.
 */
export async function handleCheckNicknameAvailability(
  req: Request,
  res: Response,
  deps: CheckNicknameAvailabilityDeps
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
      const uid = tokenCheck.decoded.uid;

      const nicknameRaw = String(req.query?.nickname || "").trim();
      if (!nicknameRaw) {
        res.status(400).json({error: "Missing nickname"});
        return;
      }

      const nicknameLower = normalizeNicknameKey(nicknameRaw);

      const snap = await db
        .collection("users_active")
        .where("profile.nicknameLower", "==", nicknameLower)
        .limit(5)
        .get();

      const takenByOther = snap.docs.some((d) => d.id !== uid);

      res.status(200).json({ok: true, nickname: nicknameRaw, available: !takenByOther});
    } catch (err: any) {
      logger.error("checkNicknameAvailability failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
