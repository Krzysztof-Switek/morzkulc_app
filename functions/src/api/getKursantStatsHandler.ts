/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetKursantStatsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

export async function handleGetKursantStats(req: Request, res: Response, deps: GetKursantStatsDeps) {
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
      const userData = userSnap.data() as any;
      const roleKey = String(userData?.role_key || "");
      const userEmail = String(userData?.email || "").trim().toLowerCase();

      const isKursant = roleKey === "rola_kursant";
      const isAdmin = adminRoleKeys.includes(roleKey);

      if (!isKursant && !isAdmin) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const kursantsSnap = await db
        .collection("users_active")
        .where("role_key", "==", "rola_kursant")
        .get();

      const kursantUids = kursantsSnap.docs.map((d) => d.id);

      if (!kursantUids.length) {
        res.status(200).json({ok: true, myCapsizes: 0, myRank: 1, totalKursants: 0});
        return;
      }

      const nameByUid = new Map<string, string>();
      kursantsSnap.docs.forEach((d) => {
        const p = (d.data() as any)?.profile;
        const fullName = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
        const name = fullName || String(p?.nickname || "").trim() || "Kursant";
        nameByUid.set(d.id, name);
      });

      const statsSnaps = await Promise.all(
        kursantUids.map((kuid) => db.collection("km_user_stats").doc(kuid).get())
      );

      const pointsByUid = new Map<string, number>();
      statsSnaps.forEach((s) => {
        if (s.exists) {
          const pts = Math.round(Number((s.data() as any)?.allTimePoints || 0) * 100) / 100;
          pointsByUid.set(s.id, pts);
        }
      });

      type PointsEntry = {uid: string; points: number};
      const allStats: PointsEntry[] = kursantUids.map((kuid) => ({
        uid: kuid,
        points: pointsByUid.get(kuid) ?? 0,
      }));

      allStats.sort((a, b) => b.points - a.points);

      const myEntry = allStats.find((s) => s.uid === uid);
      const myCapsizes = myEntry?.points ?? 0;
      const myRank = myEntry ? allStats.indexOf(myEntry) + 1 : allStats.length + 1;
      const totalKursants = kursantUids.length;

      const leaderboard = allStats.map((s, i) => ({
        rank: i + 1,
        name: nameByUid.get(s.uid) || "Kursant",
        isMe: s.uid === uid,
        total: s.points,
      }));

      const [kursantDocSnap, varsKursSnap] = await Promise.all([
        userEmail ? db.collection("kurs_uczestnicy").doc(userEmail).get() : Promise.resolve(null),
        db.collection("setup").doc("vars_kurs").get(),
      ]);

      const kursantData = kursantDocSnap?.exists ? (kursantDocSnap.data() as any) : null;
      const fee = kursantData?.fee ?? null;
      const weight = kursantData?.weight ?? null;
      const height = kursantData?.height ?? null;
      const phone = kursantData?.phone ?? null;
      const pesel = kursantData?.pesel ?? null;
      const cenaKursu = (varsKursSnap.data() as any)?.vars?.cena_kursu?.value ?? null;

      res.status(200).json({ok: true, myCapsizes, myRank, totalKursants, fee, weight, height, phone, pesel, cena_kursu: cenaKursu, leaderboard});
    } catch (err: any) {
      logger.error("getKursantStats failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
