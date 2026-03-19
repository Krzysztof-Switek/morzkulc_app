/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions, logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import cors from "cors";
import type {Request, Response} from "express";

import {handleRegisterUser} from "./api/registerUserHandler";
import {handleGetGearKayaks} from "./api/getGearKayaksHandler";
import {getServiceConfig} from "./service/service_config";
import {GoogleSheetsProvider} from "./service/providers/googleSheetsProvider";

setGlobalOptions({region: "us-central1"});

admin.initializeApp();
const db = admin.firestore();
db.settings({ignoreUndefinedProperties: true});

const ALLOWED_HOSTS = new Set<string>([
  "morzkulc-e9df7.web.app",
  "morzkulc-e9df7.firebaseapp.com",
  "sprzet-skk-morzkulc.web.app",
  "sprzet-skk-morzkulc.firebaseapp.com",
  "localhost",
  "127.0.0.1",
]);

const ALLOWED_ORIGINS = new Set<string>([
  "https://morzkulc-e9df7.web.app",
  "https://morzkulc-e9df7.firebaseapp.com",
  "https://sprzet-skk-morzkulc.web.app",
  "https://sprzet-skk-morzkulc.firebaseapp.com",
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

// ====== NEW SINGLE SETUP SHAPE (ONLY) ======
type ModuleAccess = {
  mode?: "off" | "prod" | "test";
  rolesAllowed?: string[];
  testUsersAllow?: string[];
  usersBlock?: string[];
};

type SetupModuleConfig = {
  label?: string;
  defaultRoute?: string;
  order?: number;
  enabled?: boolean;
  access?: ModuleAccess;
};

type SetupApp = {
  modules?: Record<string, SetupModuleConfig>;
  updatedAt?: any;
  updatedBy?: string;
};
// ===========================================

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

function defaultScreenForRoleKey(roleKey: string): string {
  const map: Record<string, string> = {
    rola_zarzad: "screen_board",
    rola_kr: "screen_kr",
    rola_czlonek: "screen_member",
    rola_kandydat: "screen_candidate",
    rola_sympatyk: "screen_supporter",
    rola_kursant: "screen_trainee",
  };
  return map[roleKey] || "screen_supporter";
}

function requireAdminEmail(email: string): boolean {
  return String(email || "").toLowerCase() === "admin@morzkulc.pl";
}

function roleLabel(roleKey: string): string {
  const m: Record<string, string> = {
    rola_zarzad: "Zarząd",
    rola_kr: "KR",
    rola_czlonek: "Członek",
    rola_kandydat: "Kandydat",
    rola_sympatyk: "Sympatyk",
    rola_kursant: "Kursant",
  };
  return m[roleKey] || roleKey || "";
}

function statusLabel(statusKey: string): string {
  const m: Record<string, string> = {
    status_aktywny: "Aktywny",
    status_zawieszony: "Zawieszony",
    status_pending: "Pending",
  };
  return m[statusKey] || statusKey || "";
}

function formatDatePL(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function ensureMemberId(uid: string): Promise<number> {
  const userRef = db.collection("users_active").doc(uid);
  const counterRef = db.collection("counters").doc("members");

  const out = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("users_active missing for uid=" + uid);

    const data = userSnap.data() as any;
    const existingId = Number(data?.memberId || 0);
    if (existingId > 0) return existingId;

    const counterSnap = await tx.get(counterRef);
    let nextId = 1;
    if (counterSnap.exists) {
      const c = counterSnap.data() as any;
      const stored = Number(c?.nextId || 1);
      nextId = stored > 0 ? stored : 1;
    }

    tx.set(
      userRef,
      {
        memberId: nextId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    tx.set(counterRef, {nextId: nextId + 1}, {merge: true});

    return nextId;
  });

  return out;
}

async function syncMemberToSheet(uid: string): Promise<void> {
  const cfg = getServiceConfig();
  const delegated = cfg.workspace.delegatedSubject;

  const snap = await db.collection("users_active").doc(uid).get();
  if (!snap.exists) return;

  const data = snap.data() as any;
  const email = String(data?.email || "").trim().toLowerCase();
  const profile = data?.profile || {};
  const roleKey = String(data?.role_key || "");
  const statusKey = String(data?.status_key || "");

  const firstName = String(profile?.firstName || "").trim();
  const lastName = String(profile?.lastName || "").trim();
  const nickname = String(profile?.nickname || "").trim();
  const phone = String(profile?.phone || "").trim();
  const dateOfBirth = String(profile?.dateOfBirth || "").trim();

  const consentRodo = profile?.consentRodo === true;
  const consentStatute = profile?.consentStatute === true;

  if (!email || !firstName || !lastName || !phone || !dateOfBirth) return;
  if (!consentRodo || !consentStatute) return;

  const memberId = await ensureMemberId(uid);

  const sheets = new GoogleSheetsProvider(delegated);

  const createdAt = toDateSafe(data?.createdAt) || new Date();
  const registrationDatePL = formatDatePL(createdAt);

  const patch: Record<string, any> = {
    "ID": String(memberId),
    "e-mail": email,
    "imię": firstName,
    "nazwisko": lastName,
    "ksywa": nickname,
    "telefon": phone,
    "data urodzenia": dateOfBirth,
    "Rola": roleLabel(roleKey),
    "Status": statusLabel(statusKey),
    "Zgody RODO": "TAK",
    "data rejestracji": registrationDatePL,
  };

  const result = await sheets.upsertMemberRowById(
    {spreadsheetId: cfg.sheets.membersSpreadsheetId, tabName: cfg.sheets.membersTabName},
    patch
  );

  await db.collection("users_active").doc(uid).set(
    {
      "service.sheetSyncedAt": admin.firestore.FieldValue.serverTimestamp(),
      "service.sheetRowNumber": result.rowNumber,
      "service.sheetAction": result.action,
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
}

/**
 * GET /api/setup (authenticated)
 * Returns single setup shape: { setup: { modules: {...} } }
 */
export const getSetup = onRequest({invoker: "private"}, async (req, res) => {
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

      const setup = await getSetupApp();
      res.status(200).json({ok: true, setup, setupMissing: setup ? false : true});
    } catch (err) {
      const e = err as {message?: string; code?: string; stack?: string};
      logger.error("getSetup failed", {message: e?.message, code: e?.code, stack: e?.stack});
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
});

/**
 * POST /api/admin/setup (authenticated + admin)
 * Body: { modules: { [id]: SetupModuleConfig } }
 */
export const adminPutSetup = onRequest({invoker: "private"}, async (req, res) => {
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
      const email = String(decoded.email || "");
      if (!requireAdminEmail(email)) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const body = (req.body || {}) as {modules?: Record<string, SetupModuleConfig>};

      let modules: Record<string, SetupModuleConfig> | null = null;

      if (
        body.modules &&
        typeof body.modules === "object" &&
        !Array.isArray(body.modules)
      ) {
        modules = body.modules;
      }

      if (!modules) {
        res.status(400).json({error: "Missing body.modules{}"});
        return;
      }

      await db.collection("setup").doc("app").set(
        {
          modules,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: email,
        },
        {merge: true}
      );

      res.status(200).json({ok: true, count: Object.keys(modules).length});
    } catch (err) {
      const e = err as {message?: string; code?: string; stack?: string};
      logger.error("adminPutSetup failed", {message: e?.message, code: e?.code, stack: e?.stack});
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
});

/**
 * POST /api/register (authenticated)
 */
export const registerUser = onRequest({invoker: "private"}, async (req, res) => {
  return handleRegisterUser(req, res, {
    db,
    admin,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    getSetupApp,
    defaultScreenForRoleKey,
    syncMemberToSheet,
  });
});

/**
 * GET /api/gear/kayaks (authenticated)
 */
export const getGearKayaks = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetGearKayaks(req, res, {
    db,
    admin,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * SERVICE MODULE EXPORTS
 */
export {onUsersActiveCreated} from "./service/triggers/onUsersActiveCreated";
export {onServiceJobCreated} from "./service/worker/onJobCreatedWorker";
export {serviceFallbackDaily} from "./service/worker/fallbackDailyWorker";
export {adminRunServiceTask} from "./service/admin/adminRunTask";
