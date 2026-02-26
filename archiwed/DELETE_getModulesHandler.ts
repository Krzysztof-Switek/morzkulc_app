/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import cors from "cors";
import type {Request, Response} from "express";

const db = admin.firestore();

/**
 * Hosting allowlist (blocks direct *.a.run.app access).
 * Add additional hosts here if you use another Hosting site/custom domain.
 */
const ALLOWED_HOSTS = new Set<string>([
  "morzkulc-e9df7.web.app",
  "morzkulc-e9df7.firebaseapp.com",
  "localhost",
  "127.0.0.1",
]);

/**
 * CORS allowlist (UI origin).
 * Note: Origin includes scheme and optional port.
 */
const ALLOWED_ORIGINS = new Set<string>([
  "https://morzkulc-e9df7.web.app",
  "https://morzkulc-e9df7.firebaseapp.com",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
]);

function normalizeHost(raw: unknown): string {
  const s = String(raw || "").trim().toLowerCase();
  const first = s.split(",")[0].trim();
  return first.replace(/:\d+$/, "");
}

function getRequestHost(req: Request): string {
  const xfHost = req.headers["x-forwarded-host"];
  const host = xfHost ?? req.headers.host ?? "";
  return normalizeHost(host);
}

function normalizeOrigin(raw: unknown): string {
  return String(raw || "").trim();
}

function getRequestOrigin(req: Request): string {
  return normalizeOrigin(req.headers.origin);
}

function isAllowedHost(reqHost: string): boolean {
  if (!reqHost) return false;
  return ALLOWED_HOSTS.has(reqHost);
}

function setCorsHeaders(req: Request, res: Response) {
  const origin = getRequestOrigin(req);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function deny(res: Response, status: number, message: string) {
  res.status(status).json({error: message});
}

function requireAllowedHost(req: Request, res: Response): boolean {
  const reqHost = getRequestHost(req);

  if (!isAllowedHost(reqHost)) {
    logger.warn("Blocked request by host allowlist", {
      reqHost,
      origin: getRequestOrigin(req),
      path: req.path,
      method: req.method,
    });
    deny(res, 403, "Forbidden (host not allowed)");
    return false;
  }
  return true;
}

function sendPreflight(req: Request, res: Response): boolean {
  if (req.method !== "OPTIONS") return false;

  if (!requireAllowedHost(req, res)) return true;

  setCorsHeaders(req, res);

  const origin = getRequestOrigin(req);
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    deny(res, 403, "Forbidden (origin not allowed)");
    return true;
  }

  res.status(204).send("");
  return true;
}

const corsHandler = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

type SetupItem = {
  typ_elementu?: string;
  id_elementu?: string;
  nazwa_wyswietlana?: string;
  aktywny?: boolean;
  ekran_domyslny?: string;
  kolejnosc?: number;
  dostep_zarzad_i_kr?: boolean;
  dostep_czlonek?: boolean;
  dostep_kandydat?: boolean;
  dostep_sympatyk?: boolean;
  dostep_kursant?: boolean;
  dostep_testowy_dla?: string;
  blokuj_dla?: string;
  opis?: string;
};

type SetupApp = {
  items?: SetupItem[];
};

async function requireIdToken(req: Request) {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return {error: "Missing token"} as const;
  const decoded = await admin.auth().verifyIdToken(idToken);
  return {decoded} as const;
}

async function getSetupApp(): Promise<SetupApp | null> {
  const snap = await db.collection("setup").doc("app").get();
  if (!snap.exists) return null;
  return (snap.data() as SetupApp) || null;
}

function isAllowedForRole(item: SetupItem, roleKey: string): boolean {
  if (!item.aktywny) return false;
  if (roleKey === "rola_zarzad" || roleKey === "rola_kr") return Boolean(item.dostep_zarzad_i_kr);
  if (roleKey === "rola_czlonek") return Boolean(item.dostep_czlonek);
  if (roleKey === "rola_kandydat") return Boolean(item.dostep_kandydat);
  if (roleKey === "rola_sympatyk") return Boolean(item.dostep_sympatyk);
  if (roleKey === "rola_kursant") return Boolean(item.dostep_kursant);
  return false;
}

/**
 * GET /api/modules (authenticated)
 */
export const getModules = onRequest({invoker: "private"}, async (req, res) => {
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

      const decoded = tokenCheck.decoded;
      const uid = decoded.uid;

      const userSnap = await db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(404).json({error: "User not registered"});
        return;
      }

      const userData = userSnap.data() || {};
      const roleKey = String(userData.role_key || "rola_sympatyk");
      const statusKey = String(userData.status_key || "status_aktywny");

      const setup = await getSetupApp();
      const items = setup?.items || [];
      const modules = items
        .filter((x) => x.typ_elementu === "moduł")
        .filter((x) => isAllowedForRole(x, roleKey))
        .sort((a, b) => Number(a.kolejnosc || 9999) - Number(b.kolejnosc || 9999))
        .map((x) => ({
          id: x.id_elementu || null,
          name: x.nazwa_wyswietlana || null,
          order: x.kolejnosc || null,
          description: x.opis || null,
        }));

      res.status(200).json({
        ok: true,
        role_key: roleKey,
        status_key: statusKey,
        setupMissing: setup ? false : true,
        modules,
      });
    } catch (err) {
      const e = err as { message?: string; code?: string; stack?: string };
      logger.error("getModules failed", {message: e?.message, code: e?.code, stack: e?.stack});
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
});
