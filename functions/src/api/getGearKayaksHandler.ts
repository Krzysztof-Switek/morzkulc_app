/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import type * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetGearKayaksDeps = {
  db: FirebaseFirestore.Firestore;
  admin: typeof admin;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function toNumberSafe(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v));
  if (Number.isNaN(n)) return null;
  return n;
}

function pickKayak(doc: any) {
  return {
    id: String(doc?.id || ""),
    number: String(doc?.number || ""),
    brand: String(doc?.brand || ""),
    model: String(doc?.model || ""),
    type: String(doc?.type || ""),
    color: String(doc?.color || ""),
    liters: toNumberSafe(doc?.liters),
    status: String(doc?.status || ""),
    images: {
      top: String(doc?.images?.top || ""),
      side: String(doc?.images?.side || ""),
    },
  };
}

export async function handleGetGearKayaks(req: Request, res: Response, deps: GetGearKayaksDeps) {
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

      const snap = await db
        .collection("gear_kayaks")
        .where("isActive", "==", true)
        .limit(500)
        .get();

      const kayaks = snap.docs.map((d) => pickKayak(d.data()));

      res.status(200).json({ok: true, kayaks});
    } catch (err: any) {
      logger.error("getGearKayaks failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
