/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {processApproval} from "../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../modules/hours/godzinki_vars";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

export type AdminApprovalDeps = {
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

/** Kolejkuje job serwisowy (fire-and-forget z gwarancją zapisu joba). */
async function enqueueJob(db: FirebaseFirestore.Firestore, taskId: string, payload: Record<string, any>): Promise<string> {
  const jobRef = db.collection("service_jobs").doc();
  await jobRef.set({
    id: jobRef.id,
    taskId,
    payload,
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return jobRef.id;
}

/**
 * Wspólna preambuła: preflight, host, CORS, metoda POST, token, rola admin.
 * Zwraca {uid, email} albo null (odpowiedź już wysłana).
 */
async function authorizeAdmin(
  req: Request,
  res: Response,
  deps: AdminApprovalDeps
): Promise<{uid: string; email: string} | null> {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return null;
  }
  const tokenCheck = await deps.requireIdToken(req);
  if ("error" in tokenCheck) {
    res.status(401).json({error: tokenCheck.error});
    return null;
  }
  const uid = tokenCheck.decoded.uid;
  const email = norm(tokenCheck.decoded.email);
  const userSnap = await deps.db.collection("users_active").doc(uid).get();
  const roleKey = norm((userSnap.data() as any)?.role_key);
  if (!deps.adminRoleKeys.includes(roleKey)) {
    res.status(403).json({error: "Forbidden"});
    return null;
  }
  return {uid, email: email || uid};
}

function parseKindId(req: Request): {kind: "godzinki" | "event"; id: string} | null {
  const body = (req.body || {}) as any;
  const kind = norm(body.kind);
  const id = norm(body.id);
  if ((kind !== "godzinki" && kind !== "event") || !id) return null;
  return {kind: kind as "godzinki" | "event", id};
}

/**
 * POST /api/admin/approve  {kind: "godzinki"|"event", id}
 *
 * godzinki: processApproval (z wbudowaną rewalidacją wykupu i blokadą
 *   przeterminowanych — naprawy L2/L10); przy odmowie zwraca kod do panelu.
 * event: approved=true + enqueue events.syncCalendar (wpis do kalendarza).
 * Oba: write-back do arkusza (TAK + daty) przez service job z retry.
 */
export async function handleAdminApprove(req: Request, res: Response, deps: AdminApprovalDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, db} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      const auth = await authorizeAdmin(req, res, deps);
      if (!auth) return;

      const parsed = parseKindId(req);
      if (!parsed) {
        res.status(400).json({error: "Invalid body: {kind: 'godzinki'|'event', id}"});
        return;
      }
      const {kind, id} = parsed;

      if (kind === "godzinki") {
        const vars = await getGodzinkiVars(db);
        const result = await processApproval(db, id, auth.email, vars.expiryMonths);
        if (!result.ok) {
          // Odmowa merytoryczna (already_expired, purchase_no_longer_valid, not_found…)
          const status = result.code === "not_found" ? 404 : 422;
          res.status(status).json({ok: false, code: result.code, message: result.message});
          return;
        }
        await enqueueJob(db, "admin.approvalWriteBack", {kind: "godzinki", id, decision: "approved"});
        logger.info("adminApprove: godzinki approved", {id, by: auth.email});
        res.status(200).json({ok: true});
        return;
      }

      // kind === "event"
      const ref = db.collection("events").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ok: false, code: "not_found", message: "Impreza nie znaleziona"});
        return;
      }
      await ref.update({
        approved: true,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: auth.email,
        rejected: admin.firestore.FieldValue.delete(),
        rejectedAt: admin.firestore.FieldValue.delete(),
        rejectedBy: admin.firestore.FieldValue.delete(),
        rejectedReason: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await enqueueJob(db, "events.syncCalendar", {});
      await enqueueJob(db, "admin.approvalWriteBack", {kind: "event", id, decision: "approved"});
      logger.info("adminApprove: event approved", {id, by: auth.email});
      res.status(200).json({ok: true});
    } catch (err: any) {
      logger.error("adminApprove failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}

/**
 * POST /api/admin/reject  {kind: "godzinki"|"event", id, reason?}
 *
 * godzinki: rejected=true (approved zostaje false, bilans nietknięty).
 * event: approved=false + rejected=true + enqueue events.syncCalendar
 *   (usuwa wpis z kalendarza, jeśli był — domyka Z15/I6).
 * Oba: write-back do arkusza (kolumna zatwierdzenia = "ODRZUCONA") z retry.
 * Pozycja znika z panelu i z digestu (filtr rejected==true).
 */
export async function handleAdminReject(req: Request, res: Response, deps: AdminApprovalDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, db} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      const auth = await authorizeAdmin(req, res, deps);
      if (!auth) return;

      const parsed = parseKindId(req);
      if (!parsed) {
        res.status(400).json({error: "Invalid body: {kind: 'godzinki'|'event', id}"});
        return;
      }
      const {kind, id} = parsed;
      const reason = norm((req.body as any)?.reason).slice(0, 500);

      const collection = kind === "godzinki" ? "godzinki_ledger" : "events";
      const ref = db.collection(collection).doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ok: false, code: "not_found", message: "Pozycja nie znaleziona"});
        return;
      }

      // Nie pozwalamy odrzucić już zatwierdzonej pozycji z poziomu tej ścieżki —
      // cofnięcie zatwierdzenia ma inne skutki (bilans/kalendarz) i nie jest tu obsługiwane.
      if ((snap.data() as any)?.approved === true) {
        res.status(409).json({ok: false, code: "already_approved", message: "Pozycja jest już zatwierdzona — nie można jej odrzucić tą ścieżką."});
        return;
      }

      const rejectPatch: Record<string, any> = {
        rejected: true,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy: auth.email,
        rejectedReason: reason || null,
        // Czyścimy ślad odmowy syncu (jeśli był) — pozycja jest teraz świadomie odrzucona.
        approvalRejectedCode: admin.firestore.FieldValue.delete(),
        approvalRejectedMessage: admin.firestore.FieldValue.delete(),
        approvalRejectedAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (kind === "event") rejectPatch.approved = false;

      await ref.update(rejectPatch);

      await enqueueJob(db, "admin.approvalWriteBack", {kind, id, decision: "rejected"});
      // Impreza mogła być wcześniej zatwierdzona i trafić do kalendarza — sync
      // kalendarza usunie wpis dla rejected==true (pass usuwający).
      if (kind === "event") await enqueueJob(db, "events.syncCalendar", {});

      logger.info("adminReject: rejected", {kind, id, by: auth.email});
      res.status(200).json({ok: true});
    } catch (err: any) {
      logger.error("adminReject failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
