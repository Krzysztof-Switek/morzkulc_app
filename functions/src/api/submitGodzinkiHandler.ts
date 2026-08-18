import type {Request, Response} from "express";
import {submitEarning, getAllRecords} from "../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../modules/hours/godzinki_vars";
import {isIsoDateYYYYMMDD} from "../modules/calendar/calendar_utils";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";
import {norm} from "../modules/shared/text_utils";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

/**
 * Wylicza próg "za stare zgłoszenie" (today − reportWindowDays, ISO YYYY-MM-DD) i
 * porównuje z datą pracy. Czysta funkcja — eksportowana dla testów jednostkowych.
 */
export function isTooOldGrantedAt(grantedAt: string, todayIso: string, reportWindowDays: number): boolean {
  const cutoffDate = new Date(todayIso + "T00:00:00Z");
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - reportWindowDays);
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  return grantedAt < cutoff;
}

export type SubmitGodzinkiDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  godzinkiRoleKeys: string[];
  /** Opcjonalne: kolejkowanie zadania syncu do Google Sheets (fire-and-forget) */
  enqueueGodzinkiSheetWrite?: (recordId: string, uid: string) => Promise<void>;
};

/**
 * POST /api/godzinki/submit
 *
 * Body:
 *   amount: number       — liczba godzinek (> 0)
 *   grantedAt: string    — data pracy, format YYYY-MM-DD (nie może być przyszła; nie
 *                          starsza niż setup/vars_godzinki.ile_dni_na_zgloszenie_godzinek dni)
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

      const userSnap = await db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({ok: false, code: "forbidden", error: "User not registered"});
        return;
      }

      const statusKey = String((userSnap.data() as any)?.status_key || "");
      if (await isUserStatusBlocked(db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", error: "Konto zawieszone."});
        return;
      }
      const roleKey = String((userSnap.data() as any)?.role_key || "");
      if (!deps.godzinkiRoleKeys.includes(roleKey)) {
        res.status(403).json({ok: false, code: "forbidden", error: "Zgłaszanie godzinek wymaga roli Kandydat lub Członek."});
        return;
      }

      const body = (req.body || {}) as any;

      const amount = Number(body.amount);
      const grantedAt = norm(body.grantedAt);
      const reason = norm(body.reason);

      // Walidacja
      const fields: Record<string, string> = {};

      if (!amount || amount <= 0 || !Number.isFinite(amount)) fields.amount = "must_be_positive";
      else if (!Number.isInteger(amount)) fields.amount = "must_be_integer";
      else if (amount > 9999) fields.amount = "too_large";
      if (!grantedAt) fields.grantedAt = "required";
      if (grantedAt && !isIsoDateYYYYMMDD(grantedAt)) fields.grantedAt = "invalid_format";
      if (grantedAt && isIsoDateYYYYMMDD(grantedAt)) {
        // "Dziś" w strefie klubu (Europe/Warsaw), nie UTC — tuż po północy
        // czasu PL data lokalna była w UTC "przyszła" i zgłoszenie odpadało.
        const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Warsaw"}).format(new Date());
        if (grantedAt > today) {
          fields.grantedAt = "cannot_be_future";
        } else {
          // Limit zgłaszania wstecz (setup/vars_godzinki.ile_dni_na_zgloszenie_godzinek) —
          // godzinki mają być zgłaszane na bieżąco, nie z pół roku opóźnienia.
          const godzinkiVars = await getGodzinkiVars(db);
          if (isTooOldGrantedAt(grantedAt, today, godzinkiVars.reportWindowDays)) {
            fields.grantedAt = "too_old";
          }
        }
      }
      if (!reason) fields.reason = "required";
      if (reason.length > 500) fields.reason = "too_long";

      if (Object.keys(fields).length > 0) {
        res.status(400).json({ok: false, code: "validation_failed", fields});
        return;
      }

      // Dedup (Z14 z planu panelu): identyczne zgłoszenie z ostatnich 60 s jest
      // odrzucane — double-click / ponowienie żądania tworzyło duplikaty
      // (zaobserwowane na prod: 2 identyczne rekordy w odstępie 2 s).
      const recent = await getAllRecords(db, uid);
      const nowMs = Date.now();
      const duplicate = recent.find((r) => {
        if (r.type !== "earn") return false;
        if (Number(r.amount) !== amount) return false;
        if (String(r.reason || "").trim() !== reason) return false;
        const grantedIso = (r.grantedAt as any)?.toDate?.()?.toISOString?.()?.slice(0, 10);
        if (grantedIso !== grantedAt) return false;
        const createdMs = (r.createdAt as any)?.toMillis?.() ?? 0;
        return nowMs - createdMs < 60_000;
      });
      if (duplicate) {
        res.status(409).json({ok: false, code: "duplicate_submission", error: "Identyczne zgłoszenie zostało już zapisane przed chwilą.", recordId: duplicate.id});
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
