import type {Request, Response} from "express";
import {submitEarning} from "../modules/hours/godzinki_service";
import {isIsoDateYYYYMMDD} from "../modules/calendar/calendar_utils";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

export type SubmitGodzinkiDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  /** Opcjonalne: kolejkowanie zadania syncu do Google Sheets (fire-and-forget) */
  enqueueGodzinkiSheetWrite?: (recordId: string, uid: string) => Promise<void>;
};

function norm(v: any): string {
  return String(v || "").trim();
}

/**
 * POST /api/godzinki/submit
 *
 * Body:
 *   amount: number       — liczba godzinek (> 0)
 *   grantedAt: string    — data pracy, format YYYY-MM-DD (nie może być przyszła)
 *   reason: string       — opis (obowiązkowy)
 *
 * Tworzy rekord "earn" z approved=false.
 * Kolejkuje zadanie serwisowe zapisu do Google Sheets.
 */
export async function handleSubmitGodzinki(req: Request, res: Response, deps: SubmitGodzinkiDeps) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, enqueueGodzinkiSheetWrite} = deps;

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
      const body = (req.body || {}) as any;

      const amount = Number(body.amount);
      const grantedAt = norm(body.grantedAt);
      const reason = norm(body.reason);

      // Walidacja
      const fields: Record<string, string> = {};

      if (!amount || amount <= 0 || !Number.isFinite(amount)) fields.amount = "must_be_positive";
      if (amount > 9999) fields.amount = "too_large";
      if (!grantedAt) fields.grantedAt = "required";
      if (grantedAt && !isIsoDateYYYYMMDD(grantedAt)) fields.grantedAt = "invalid_format";
      if (grantedAt && isIsoDateYYYYMMDD(grantedAt)) {
        const today = new Date().toISOString().slice(0, 10);
        if (grantedAt > today) fields.grantedAt = "cannot_be_future";
      }
      if (!reason) fields.reason = "required";
      if (reason.length > 500) fields.reason = "too_long";

      if (Object.keys(fields).length > 0) {
        res.status(400).json({ok: false, code: "validation_failed", fields});
        return;
      }

      const {id} = await submitEarning(db, uid, {
        amount,
        grantedAt,
        reason,
        submittedBy: uid,
      });

      // Kolejkuj zapis do Google Sheets (fire-and-forget, nie blokuje odpowiedzi)
      if (enqueueGodzinkiSheetWrite) {
        enqueueGodzinkiSheetWrite(id, uid).catch((err: any) => {
          console.error("enqueueGodzinkiSheetWrite failed", {id, uid, message: err?.message});
        });
      }

      res.status(200).json({ok: true, recordId: id});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
