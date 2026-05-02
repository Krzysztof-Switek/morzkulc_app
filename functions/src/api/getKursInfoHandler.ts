/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {getServiceConfig} from "../service/service_config";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetKursInfoDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

function norm(v: any): string {
  return String(v || "").trim();
}

function flattenEmails(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s: any) => String(s || "").trim().toLowerCase()).filter(Boolean);
}

export async function handleGetKursInfo(req: Request, res: Response, deps: GetKursInfoDeps) {
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
      const email = (tokenCheck.decoded.email || "").toLowerCase();

      const userSnap = await db.collection("users_active").doc(uid).get();
      const roleKey = norm((userSnap.data() as any)?.role_key);

      const isKursant = roleKey === "rola_kursant";
      const isAdmin = adminRoleKeys.includes(roleKey);

      // Sprawdź testUsersAllow w konfiguracji modul_kurs
      let isTestUser = false;
      if (!isKursant && !isAdmin) {
        const setupSnap = await db.collection("setup").doc("app").get();
        const testUsers = flattenEmails(setupSnap.data()?.modules?.modul_kurs?.access?.testUsersAllow);
        isTestUser = testUsers.includes(uid) || testUsers.includes(email);
      }

      if (!isKursant && !isAdmin && !isTestUser) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const cfg = getServiceConfig();

      if (!cfg.kurs.spreadsheetId) {
        res.status(200).json({ok: true, info: [], events: [], unconfigured: true});
        return;
      }

      const [infoSnap, eventsSnap] = await Promise.all([
        db.collection("kurs_info").where("isActive", "==", true).get(),
        db.collection("kurs_events").where("approved", "==", true).orderBy("startDate", "asc").get(),
      ]);

      const info = infoSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: norm(data.id),
          name: norm(data.name),
          startDate: norm(data.startDate),
          endDate: norm(data.endDate),
          description: norm(data.description),
          instructor: norm(data.instructor),
          instructorContact: norm(data.instructorContact),
          location: norm(data.location),
          link: norm(data.link),
        };
      });

      const events = eventsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: norm(data.id),
          name: norm(data.name),
          startDate: norm(data.startDate),
          endDate: norm(data.endDate),
          location: norm(data.location),
          description: norm(data.description),
          contact: norm(data.contact),
          link: norm(data.link),
        };
      });

      res.status(200).json({ok: true, info, events});
    } catch (err: any) {
      logger.error("getKursInfo failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
