import type {Request, Response} from "express";
import {submitPurchaseRequest} from "../modules/hours/godzinki_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

export type GodzinkiPurchaseDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  enqueueGodzinkiSheetWrite?: (recordId: string, uid: string) => Promise<void>;
};

/**
 * POST /api/godzinki/purchase
 *
 * Zgłasza wniosek o wykup salda ujemnego.
 * Tworzy rekord "purchase" z approved=false (oczekuje na zatwierdzenie admina w Google Sheets).
 * Kolejkuje zapis do Sheets z etykietą "WYKUP SALDA UJEMNEGO".
 *
 * Body:
 *   amount: number  — kwota wykupu (> 0, nie może przekroczyć salda ujemnego)
 *
 * Warunki:
 *   - Bieżące saldo musi być ujemne
 *   - Kwota nie może wynieść więcej niż |saldo|
 */
export async function handleGodzinkiPurchase(req: Request, res: Response, deps: GodzinkiPurchaseDeps) {
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

      const body = (req.body || {}) as any;
      const amount = Number(body.amount);

      if (!amount || amount <= 0 || !Number.isFinite(amount)) {
        res.status(400).json({ok: false, code: "validation_failed", fields: {amount: "must_be_positive"}});
        return;
      }

      const result = await submitPurchaseRequest(db, uid, {
        amount,
        reason: "Wykup salda ujemnego",
      });

      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      // Kolejkuj zapis do Google Sheets (fire-and-forget)
      if (enqueueGodzinkiSheetWrite && result.id) {
        enqueueGodzinkiSheetWrite(result.id, uid).catch((err: any) => {
          console.error("enqueueGodzinkiSheetWrite (purchase) failed", {id: result.id, uid, message: err?.message});
        });
      }

      res.status(200).json({ok: true, recordId: result.id});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
