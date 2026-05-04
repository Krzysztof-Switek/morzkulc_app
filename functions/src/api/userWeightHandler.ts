/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type UserWeightDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

export async function handleUserWeight(req: Request, res: Response, deps: UserWeightDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, db} = deps;

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
      const email = String(tokenCheck.decoded.email || "").trim().toLowerCase();

      if (req.method === "GET") {
        const userSnap = await db.collection("users_active").doc(uid).get();
        const userData = userSnap.exists ? (userSnap.data() as any) : null;
        const roleKey = String(userData?.role_key || "");
        const isKursant = roleKey === "rola_kursant";

        let weight: number | null = null;

        if (isKursant && email) {
          const kursSnap = await db.collection("kurs_uczestnicy").doc(email).get();
          const kursData = kursSnap.exists ? (kursSnap.data() as any) : null;
          const kursWeight = kursData?.weight;
          if (typeof kursWeight === "number" && Number.isFinite(kursWeight)) {
            weight = kursWeight;
          }
        }

        if (weight === null) {
          const w = userData?.weight;
          if (typeof w === "number" && Number.isFinite(w)) {
            weight = w;
          }
        }

        res.status(200).json({ok: true, weight});
        return;
      }

      if (req.method === "POST") {
        const body = (req.body || {}) as {weight?: unknown};
        const raw = body.weight;
        const w = typeof raw === "string" ? parseFloat(raw) : Number(raw);

        if (!Number.isFinite(w) || w < 30 || w > 250) {
          res.status(400).json({error: "Nieprawidłowa waga. Podaj liczbę od 30 do 250."});
          return;
        }

        const weight = Math.round(w);

        await db.collection("users_active").doc(uid).set(
          {weight},
          {merge: true}
        );

        res.status(200).json({ok: true});
        return;
      }

      res.status(405).json({error: "Method not allowed"});
    } catch (err: any) {
      logger.error("userWeight failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
