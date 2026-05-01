/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions, logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import cors from "cors";
import type {Request, Response} from "express";

import {handleRegisterUser} from "./api/registerUserHandler";
import {handleGetGearKayaks} from "./api/getGearKayaksHandler";
import {handleGetGearItems} from "./api/getGearItemsHandler";
import {handleGearMyReservations} from "./api/gearMyReservationsHandler";
import {handleGearReservationCreate} from "./api/gearReservationCreateHandler";
import {handleGearBundleReservationCreate} from "./api/gearBundleReservationCreateHandler";
import {handleGetGearItemAvailability} from "./api/getGearItemAvailabilityHandler";
import {handleGearReservationUpdate} from "./api/gearReservationUpdateHandler";
import {handleGearReservationCancel} from "./api/gearReservationCancelHandler";
import {handleGetGearFavorites} from "./api/getGearFavoritesHandler";
import {handleGearFavoriteToggle} from "./api/gearFavoriteToggleHandler";
import {handleGetGodzinki} from "./api/getGodzinkiHandler";
import {handleSubmitGodzinki} from "./api/submitGodzinkiHandler";
import {handleGodzinkiPurchase} from "./api/godzinkiPurchaseHandler";
import {handleGetKayakReservations} from "./api/getKayakReservationsHandler";
import {handleGetEvents} from "./api/getEventsHandler";
import {handleGetAdminPending} from "./api/getAdminPendingHandler";
import {handleAdminEventsSyncCalendar} from "./api/adminEventsSyncCalendarHandler";
import {handleSubmitEvent} from "./api/submitEventHandler";
import {handleGetBasenSessions} from "./api/getBasenSessionsHandler";
import {handleBasenEnroll} from "./api/basenEnrollHandler";
import {handleBasenCancelEnrollment} from "./api/basenCancelEnrollmentHandler";
import {handleGetBasenKarnety} from "./api/getBasenKarnetyHandler";
import {handleBasenCreateSession} from "./api/basenCreateSessionHandler";
import {handleBasenCancelSession} from "./api/basenCancelSessionHandler";
import {handleBasenGrantKarnet} from "./api/basenGrantKarnetHandler";
import {handleGetBasenGodziny} from "./api/getBasenGodzinyHandler";
import {handleBasenAdminAddGodziny} from "./api/basenAdminAddGodzinyHandler";
import {handleBasenAdminCorrectGodziny} from "./api/basenAdminCorrectGodzinyHandler";
import {handleBasenAdminSearchUsers} from "./api/basenAdminSearchUsersHandler";
import {handleKmAddLog} from "./api/kmAddLogHandler";
import {handleKmMyLogs} from "./api/kmMyLogsHandler";
import {handleKmMyStats} from "./api/kmMyStatsHandler";
import {handleKmRankings} from "./api/kmRankingsHandler";
import {handleKmPlaces} from "./api/kmPlacesHandler";
import {handleKmEventStats} from "./api/kmEventStatsHandler";
import {handleKmMapData} from "./api/kmMapDataHandler";
import {handleKmAdminMergePlaces} from "./api/kmAdminMergePlacesHandler";
import {getServiceConfig} from "./service/service_config";

setGlobalOptions({region: "us-central1"});

admin.initializeApp();
const db = admin.firestore();
db.settings({ignoreUndefinedProperties: true});

const svcCfg = getServiceConfig();
const {adminRoleKeys, memberRoleKeys} = svcCfg;

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
  testUserGranted?: boolean; // set server-side when testUsersAllow overrides disabled/off state
};

type SetupModuleConfig = {
  label?: string;
  type?: string; // e.g. "gear" | "godzinki" | "imprezy" | "basen" — used by frontend to resolve component
  defaultRoute?: string;
  order?: number;
  enabled?: boolean;
  access?: ModuleAccess;
};

type StatusMapping = {
  label: string;
  blocksAccess?: boolean;
};

type RoleMapping = {
  label: string;
  groups?: string[]; // Google Group email addresses for users with this role
};

type SetupDefaults = {
  newUserRoleCode?: string;
  newUserStatusCode?: string;
  openingBalanceMemberField?: string;
  openingBalanceMemberRoleCode?: string;
};

type SetupApp = {
  modules?: Record<string, SetupModuleConfig>;
  statusMappings?: Record<string, StatusMapping>;
  roleMappings?: Record<string, RoleMapping>;
  defaults?: SetupDefaults;
  updatedAt?: any;
  updatedBy?: string;
};
// ===========================================

async function requireIdToken(req: Request) {
  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return {error: "Missing token"} as const;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {decoded} as const;
  } catch {
    return {error: "Invalid token"} as const;
  }
}

async function getSetupApp(): Promise<SetupApp | null> {
  const snap = await db.collection("setup").doc("app").get();
  if (!snap.exists) return null;
  return (snap.data() as SetupApp) || null;
}

function defaultScreenForRoleKey(_roleKey: string): string {
  return "home";
}

function computeAllowedActions(roleKey: string): string[] {
  const actions: string[] = [];
  const {adminRoleKeys, memberRoleKeys, godzinkiRoleKeys} = svcCfg;
  if (memberRoleKeys.includes(roleKey)) {
    actions.push("gear.reserve", "basen.enroll", "events.submit");
  }
  if (godzinkiRoleKeys.includes(roleKey)) {
    actions.push("godzinki.submit");
  }
  if (adminRoleKeys.includes(roleKey)) {
    actions.push("admin.pending", "basen.admin", "events.admin");
  }
  return actions;
}

function requireAdminEmail(email: string): boolean {
  return String(email || "").toLowerCase() === "admin@morzkulc.pl";
}


/**
 * Splits and normalises an array of email/uid strings stored in Firestore.
 * Each element may contain multiple values separated by commas, which is
 * convenient when editing the list in the Firebase console or admin tools.
 */
function flattenEmails(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return (arr as unknown[])
    .flatMap((e) => String(e).split(",").map((s) => s.trim().toLowerCase()))
    .filter(Boolean);
}

/**
 * Filters setup.modules to only those the given user can see.
 *
 * Filtering rules (must match canSeeModule in access_control.js):
 *   - uid/email in access.usersBlock                 → hidden (always, even for test users)
 *   - statusMappings[statusKey].blocksAccess === true → all modules hidden
 *   - module.enabled !== true                        → hidden UNLESS uid/email in testUsersAllow
 *   - access.mode === "off"                          → hidden UNLESS uid/email in testUsersAllow
 *   - access.mode === "test" and uid/email not in testUsersAllow → hidden
 *   - access.mode === "prod" and rolesAllowed empty  → hidden
 *   - access.mode === "prod" and roleKey not in rolesAllowed → hidden
 *
 * When a module is shown via testUsersAllow override (enabled=false or mode=off),
 * the response includes testUserGranted:true so the frontend can bypass its own guards.
 * Sensitive fields (testUsersAllow, usersBlock) are otherwise stripped from the response.
 */
function filterSetupForUser(
  setup: SetupApp,
  uid: string,
  email: string,
  roleKey: string,
  statusKey: string
): SetupApp {
  const statusBlocked =
    setup.statusMappings?.[statusKey]?.blocksAccess === true;

  const emailLower = email.toLowerCase();
  const filteredModules: Record<string, SetupModuleConfig> = {};

  for (const [id, cfg] of Object.entries(setup.modules || {})) {
    const access = cfg.access || {};

    // testUsersAllow sprawdzamy najwcześniej — może nadpisać disabled/off
    const testAllow = flattenEmails(access.testUsersAllow);
    const isTestUser = testAllow.includes(uid) || testAllow.includes(emailLower);

    // usersBlock wygrywa zawsze, nawet nad testUsersAllow
    const usersBlock = flattenEmails(access.usersBlock);
    if (usersBlock.includes(uid) || usersBlock.includes(emailLower)) continue;

    if (!cfg.enabled && !isTestUser) continue;
    if (statusBlocked) continue;

    const mode = String(access.mode || "prod");

    if (mode === "off" && !isTestUser) continue;

    if (mode === "test" || mode === "off") {
      // Dla mode=test lub mode=off (z override) wymagamy bycia na liście testowej
      if (!isTestUser) continue;
    } else {
      // prod
      const rolesAllowed = Array.isArray(access.rolesAllowed) ?
        access.rolesAllowed.map(String) :
        [];
      if (rolesAllowed.length === 0) continue;
      if (!rolesAllowed.includes(roleKey)) continue;
    }

    // Moduł widoczny — pomiń wrażliwe pola z access przed zwróceniem.
    // Gdy testUsersAllow nadpisało disabled/off, dodaj flagę testUserGranted
    // żeby frontend mógł pominąć swoje własne blokady.
    const testUserOverride = isTestUser && (!cfg.enabled || mode === "off");
    const safeAccess: ModuleAccess = {
      mode: access.mode,
      rolesAllowed: access.rolesAllowed,
      ...(testUserOverride ? {testUserGranted: true} : {}),
    };

    filteredModules[id] = {...cfg, enabled: true, access: safeAccess};
  }

  return {
    ...setup,
    modules: filteredModules,
  };
}

/**
 * GET /api/setup (authenticated)
 * Returns setup filtered to modules visible for the requesting user.
 * Sensitive access fields (testUsersAllow, usersBlock) are stripped from the response.
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

      const uid = tokenCheck.decoded.uid;
      const email = String(tokenCheck.decoded.email || "").trim().toLowerCase();

      const [setup, userSnap] = await Promise.all([
        getSetupApp(),
        db.collection("users_active").doc(uid).get(),
      ]);

      if (!setup) {
        res.status(200).json({ok: true, setup: null, setupMissing: true});
        return;
      }

      const userData = userSnap.exists ? (userSnap.data() as any) : null;
      const roleKey = String(userData?.role_key || "");
      const statusKey = String(userData?.status_key || "");

      const filteredSetup = filterSetupForUser(setup, uid, email, roleKey, statusKey);

      res.status(200).json({ok: true, setup: filteredSetup, setupMissing: false});
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
    computeAllowedActions,
    enqueueMemberSheetSync,
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
 * GET /api/gear/items (authenticated)
 */
export const getGearItems = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetGearItems(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /api/gear/my-reservations (authenticated)
 */
export const getGearMyReservations = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearMyReservations(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/gear/reservations/create (authenticated)
 */
export const createGearReservation = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearReservationCreate(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    memberRoleKeys: svcCfg.memberRoleKeys,
  });
});

/**
 * POST /api/gear/reservations/create-bundle (authenticated)
 */
export const createBundleGearReservation = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearBundleReservationCreate(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    memberRoleKeys: svcCfg.memberRoleKeys,
  });
});

/**
 * GET /api/gear/items/availability?category=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (authenticated)
 */
export const getGearItemAvailability = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetGearItemAvailability(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/gear/reservations/update (authenticated)
 */
export const updateGearReservation = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearReservationUpdate(req, res, {
    db,
    sendPreflight,


    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/gear/reservations/cancel (authenticated)
 */
export const cancelGearReservation = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearReservationCancel(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /api/gear/favorites?category=kayaks (authenticated)
 */
export const getGearFavorites = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetGearFavorites(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/gear/favorites/toggle (authenticated)
 */
export const gearFavoriteToggle = onRequest({invoker: "private"}, async (req, res) => {
  return handleGearFavoriteToggle(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * Kolejkuje zadanie serwisowe zapisu godzinek do Google Sheets.
 * Fire-and-forget — nie blokuje odpowiedzi na zgłoszenie.
 */
async function enqueueGodzinkiSheetWrite(recordId: string, uid: string): Promise<void> {
  const jobRef = db.collection("service_jobs").doc();
  await jobRef.set({
    id: jobRef.id,
    taskId: "godzinki.writeToSheet",
    payload: {recordId, uid},
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * GET /api/godzinki (authenticated)
 */
export const getGodzinki = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetGodzinki(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /api/gear/kayak-reservations?kayakId=X (authenticated)
 * Zwraca aktywne rezerwacje danego kajaka z nazwami użytkowników.
 */
export const getKayakReservations = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetKayakReservations(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/godzinki/submit (authenticated)
 */
export const submitGodzinki = onRequest({invoker: "private"}, async (req, res) => {
  return handleSubmitGodzinki(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    godzinkiRoleKeys: svcCfg.godzinkiRoleKeys,
    enqueueGodzinkiSheetWrite,
  });
});

/**
 * POST /api/godzinki/purchase (authenticated)
 * Zgłasza wniosek o wykup salda ujemnego (pending → zatwierdza admin przez Sheets).
 */
export const purchaseGodzinki = onRequest({invoker: "private"}, async (req, res) => {
  return handleGodzinkiPurchase(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    enqueueGodzinkiSheetWrite,
  });
});

/**
 * Kolejkuje zadanie serwisowe synchronizacji członka z Google Sheets.
 * Używa deterministycznego ID joba (`sheet-sync:{uid}`) — zapobiega duplikatom.
 * Jeśli job jest już w stanie "queued" lub "running" — nie tworzy nowego.
 * Jeśli job jest w stanie "done", "failed" lub "dead" — nadpisuje (re-enqueue).
 */
async function enqueueMemberSheetSync(uid: string): Promise<void> {
  const jobId = `sheet-sync:${uid}`;
  const jobRef = db.collection("service_jobs").doc(jobId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(jobRef);
    if (existing.exists) {
      const status = String((existing.data() as any)?.status || "");
      if (status === "queued" || status === "running") return; // już w kolejce lub działa — pomiń
    }
    tx.set(jobRef, {
      id: jobId,
      taskId: "members.syncToSheet",
      payload: {uid},
      status: "queued",
      attempts: 0,
      createdAt: existing.exists ? existing.data()?.createdAt : now,
      updatedAt: now,
    });
  });
}

/**
 * Kolejkuje zadanie serwisowe zapisu imprezy do Google Sheets.
 */
async function enqueueEventSheetWrite(eventId: string, uid: string): Promise<void> {
  const jobRef = db.collection("service_jobs").doc();
  await jobRef.set({
    id: jobRef.id,
    taskId: "events.writeToSheet",
    payload: {eventId, uid},
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * GET /api/events (authenticated)
 */
export const getEvents = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetEvents(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /api/admin/pending (authenticated, role: zarzad/kr)
 * Zwraca listę godzinek i imprez oczekujących na zatwierdzenie.
 */
export const getAdminPending = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetAdminPending(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /api/admin/events/sync-calendar (authenticated, role: zarzad/kr)
 * Kolejkuje job events.syncCalendar — synchronizuje zatwierdzone imprezy z Google Calendar.
 */
export const adminEventsSyncCalendar = onRequest({invoker: "private"}, async (req, res) => {
  return handleAdminEventsSyncCalendar(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /api/events/submit (authenticated, role: czlonek/zarzad/kr)
 */
export const submitEvent = onRequest({invoker: "private"}, async (req, res) => {
  return handleSubmitEvent(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    enqueueEventSheetWrite,
    memberRoleKeys,
  });
});

/**
 * Kolejkuje powiadomienie o anulowaniu sesji basenowej.
 */
async function enqueueBasenSessionCancelledNotify(sessionId: string): Promise<void> {
  const jobRef = db.collection("service_jobs").doc();
  await jobRef.set({
    id: jobRef.id,
    taskId: "basen.notifySessionCancelled",
    payload: {sessionId},
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * GET /api/basen/sessions (authenticated)
 */
export const getBasenSessions = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetBasenSessions(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/basen/enroll (authenticated, role: czlonek/zarzad/kr)
 */
export const basenEnroll = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenEnroll(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    memberRoleKeys,
  });
});

/**
 * POST /api/basen/cancel-enrollment (authenticated)
 */
export const basenCancelEnrollment = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenCancelEnrollment(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /api/basen/karnety (authenticated)
 */
export const getBasenKarnety = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetBasenKarnety(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * POST /api/basen/sessions/create (authenticated, role: zarzad/kr)
 */
export const basenCreateSession = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenCreateSession(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /api/basen/sessions/cancel (authenticated, role: zarzad/kr)
 */
export const basenCancelSession = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenCancelSession(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    enqueueBasenSessionCancelledNotify,
    adminRoleKeys,
  });
});

/**
 * POST /api/basen/karnety/grant (authenticated, role: zarzad/kr)
 */
export const basenGrantKarnet = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenGrantKarnet(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * GET /api/basen/godziny (authenticated)
 * Saldo i historia godzin basenowych. Admin może podać ?uid= dla innego użytkownika.
 */
export const getBasenGodziny = onRequest({invoker: "private"}, async (req, res) => {
  return handleGetBasenGodziny(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /api/basen/admin/godziny/add (authenticated, role: zarzad/kr)
 * Admin dopisuje godziny basenowe użytkownikowi.
 */
export const basenAdminAddGodziny = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenAdminAddGodziny(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /api/basen/admin/godziny/correct (authenticated, role: zarzad/kr)
 * Admin wykonuje korektę godzin basenowych (plus lub minus).
 */
export const basenAdminCorrectGodziny = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenAdminCorrectGodziny(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * GET /api/basen/admin/users (authenticated, role: zarzad/kr)
 * Wyszukiwanie użytkowników po fragmencie e-mail (?q=).
 */
export const basenAdminSearchUsers = onRequest({invoker: "private"}, async (req, res) => {
  return handleBasenAdminSearchUsers(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * POST /kmAddLog (authenticated)
 * Dodaje nowy wpis aktywności. Oblicza punkty ON WRITE.
 */
export const kmAddLog = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmAddLog(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmMyLogs (authenticated)
 * Moje wpisy aktywności (posortowane po dacie malejąco).
 */
export const kmMyLogs = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmMyLogs(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmMyStats (authenticated)
 * Moje statystyki z km_user_stats — odczyt O(1), brak przeliczania.
 */
export const kmMyStats = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmMyStats(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmRankings (authenticated)
 * Rankingi: type=km|points|hours, period=year|alltime.
 */
export const kmRankings = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmRankings(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmPlaces (authenticated)
 * Podpowiedzi nazw akwenów: ?q=rad (min 2 znaki).
 */
export const kmPlaces = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmPlaces(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmEventStats (authenticated)
 * Statystyki wywrotolotek per uczestnik dla danej imprezy: ?eventId=XXX
 */
export const kmEventStats = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmEventStats(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  });
});

/**
 * GET /kmMapData (publiczny — bez auth, dane pre-computed)
 * Pre-computed cache lokalizacji aktywności km dla mapy.
 */
export const kmMapData = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmMapData(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
  });
});

/**
 * POST /kmAdminMergePlaces (admin: rola_zarzad | rola_kr)
 * Scala zduplikowane miejsca w km_places.
 */
export const kmAdminMergePlaces = onRequest({invoker: "private"}, async (req, res) => {
  return handleKmAdminMergePlaces(req, res, {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    adminRoleKeys,
  });
});

/**
 * SERVICE MODULE EXPORTS
 */
export {onUsersActiveCreated} from "./service/triggers/onUsersActiveCreated";
export {onServiceJobCreated} from "./service/worker/onJobCreatedWorker";
export {serviceFallbackDaily} from "./service/worker/fallbackDailyWorker";
export {adminRunServiceTask} from "./service/admin/adminRunTask";

/**
 * SCHEDULER: Miesięczna opłata za przechowywanie prywatnych kajaków w klubie.
 * Uruchamiany 1. dnia każdego miesiąca o 04:00 czasu warszawskiego.
 */
import {onSchedule} from "firebase-functions/v2/scheduler";
import {runTaskById} from "./service/runner";

export const gearPrivateStorageMonthly = onSchedule(
  {schedule: "0 4 1 * *", timeZone: "Europe/Warsaw"},
  async () => {
    logger.info("gearPrivateStorageMonthly: start");
    const result = await runTaskById("gear.chargePrivateStorage", {});
    logger.info("gearPrivateStorageMonthly: done", result as unknown as Record<string, unknown>);
  }
);

/**
 * SCHEDULER: Dzienny sync ról i statusów użytkowników z Google Sheets do Firestore.
 * Uruchamiany codziennie o 04:30 czasu warszawskiego.
 * Odpowiada za aktualizację role_key i status_key na podstawie arkusza członków.
 */
export const usersSyncRolesDaily = onSchedule(
  {schedule: "30 4 * * *", timeZone: "Europe/Warsaw"},
  async () => {
    logger.info("usersSyncRolesDaily: start");
    const result = await runTaskById("users.syncRolesFromSheet", {});
    logger.info("usersSyncRolesDaily: done", result as unknown as Record<string, unknown>);
  }
);

/**
 * SCHEDULER: Dzienny sync zatwierdzonych imprez z Firestore do Google Calendar.
 * Uruchamiany codziennie o 05:00 czasu warszawskiego.
 */
export const eventsSyncCalendarDaily = onSchedule(
  {schedule: "0 5 * * *", timeZone: "Europe/Warsaw"},
  async () => {
    logger.info("eventsSyncCalendarDaily: start");
    const result = await runTaskById("events.syncCalendar", {});
    logger.info("eventsSyncCalendarDaily: done", result as unknown as Record<string, unknown>);
  }
);

/**
 * SCHEDULER: Miesięczna przebudowa cache mapy aktywności km.
 * Uruchamiany 1. dnia każdego miesiąca o 03:30 czasu warszawskiego.
 */
export const kmRebuildMapMonthly = onSchedule(
  {schedule: "30 3 1 * *", timeZone: "Europe/Warsaw"},
  async () => {
    logger.info("kmRebuildMapMonthly: start");
    const result = await runTaskById("km.rebuildMapData", {});
    logger.info("kmRebuildMapMonthly: done", result as unknown as Record<string, unknown>);
  }
);
