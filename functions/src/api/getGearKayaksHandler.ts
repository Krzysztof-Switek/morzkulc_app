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

function todayIsoUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickKayak(doc: any, reservedKayakIdsNow: Set<string>) {
  const id = String(doc?.id || "");
  const isReservedNow = reservedKayakIdsNow.has(id);

  return {
    id,
    number: String(doc?.number || ""),
    brand: String(doc?.brand || ""),
    model: String(doc?.model || ""),
    type: String(doc?.type || ""),
    color: String(doc?.color || ""),
    liters: toNumberSafe(doc?.liters),
    status: String(doc?.status || ""),
    isReservedNow,
    reservedNowLabel: isReservedNow ? "zarezerwowany teraz" : "dostępny teraz",
    images: {
      top: String(doc?.images?.top || ""),
      side: String(doc?.images?.side || ""),
    },
  };
}

async function loadReservedKayakIdsNow(db: FirebaseFirestore.Firestore): Promise<Set<string>> {
  const todayIso = todayIsoUTC();

  const snap = await db
    .collection("gear_reservations")
    .where("status", "==", "active")
    .where("blockStartIso", "<=", todayIso)
    .get();

  const reserved = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const blockStartIso = String(data?.blockStartIso || "");
    const blockEndIso = String(data?.blockEndIso || "");
    if (!blockStartIso || !blockEndIso) continue;

    if (!(blockStartIso <= todayIso && todayIso <= blockEndIso)) continue;

    const kayakIds = Array.isArray(data?.kayakIds) ? data.kayakIds.map(String) : [];
    for (const kayakId of kayakIds) {
      if (kayakId) reserved.add(kayakId);
    }
  }

  return reserved;
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

      const [kayaksSnap, reservedKayakIdsNow] = await Promise.all([
        db.collection("gear_kayaks").where("isActive", "==", true).limit(500).get(),
        loadReservedKayakIdsNow(db),
      ]);

      const kayaks = kayaksSnap.docs.map((d) => pickKayak(d.data(), reservedKayakIdsNow));

      res.status(200).json({ok: true, kayaks});
    } catch (err: any) {
      logger.error("getGearKayaks failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
