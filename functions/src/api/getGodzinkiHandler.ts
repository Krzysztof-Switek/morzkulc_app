import type {Request, Response} from "express";
import {getGodzinkiVars} from "../modules/hours/godzinki_vars";
import {getAllRecords, getHistory, getRecentEarnings, computeBalance, computeNextExpiry, GodzinkiRecord} from "../modules/hours/godzinki_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

export type GetGodzinkiDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function serializeRecord(r: GodzinkiRecord): Record<string, any> {
  const out: Record<string, any> = {
    id: r.id,
    uid: r.uid,
    type: r.type,
    amount: r.amount,
    reason: r.reason,
    submittedBy: r.submittedBy,
    createdAt: r.createdAt && typeof (r.createdAt as any).toDate === "function" ?
      (r.createdAt as any).toDate().toISOString() :
      null,
  };

  if (r.type === "earn") {
    out.remaining = r.remaining ?? 0;
    out.approved = r.approved ?? false;
    out.approvedAt = r.approvedAt && typeof (r.approvedAt as any).toDate === "function" ?
      (r.approvedAt as any).toDate().toISOString() :
      null;
    out.grantedAt = r.grantedAt && typeof (r.grantedAt as any).toDate === "function" ?
      (r.grantedAt as any).toDate().toISOString().slice(0, 10) :
      null;
    out.expiresAt = r.expiresAt && typeof (r.expiresAt as any).toDate === "function" ?
      (r.expiresAt as any).toDate().toISOString().slice(0, 7) : // format MM-YYYY (ISO YYYY-MM)
      null;
  }

  if (r.type === "spend") {
    out.fromEarn = r.fromEarn ?? 0;
    out.overdraft = r.overdraft ?? 0;
    out.reservationId = r.reservationId ?? null;
  }

  return out;
}

/**
 * GET /api/godzinki
 * Zwraca: balance, nextExpiryMonthYear, recentEarnings, history
 *
 * Query params:
 *   ?view=home   — tylko balance + nextExpiry + recentEarnings (bez pełnej historii)
 *   ?view=full   — pełna historia (domyślnie)
 */
export async function handleGetGodzinki(req: Request, res: Response, deps: GetGodzinkiDeps) {
  const {db, sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken} = deps;

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
      const view = String(req.query?.view || "full").trim().toLowerCase();
      const now = new Date();

      if (view === "home") {
        // Dla widoku home potrzebujemy wszystkich rekordów (earn+spend+purchase) do poprawnego
        // obliczenia salda i daty wygaśnięcia. recentEarnings budujemy z tych rekordów in-memory.
        const [vars, allRecords] = await Promise.all([
          getGodzinkiVars(db),
          getAllRecords(db, uid),
        ]);

        const balance = computeBalance(allRecords, now);
        const nextExpiry = computeNextExpiry(allRecords, now);
        const nextExpiryMonthYear = nextExpiry ?
          String(nextExpiry.getMonth() + 1).padStart(2, "0") + "-" + nextExpiry.getFullYear() :
          null;

        const recentEarnings = allRecords
          .filter((r) => r.type === "earn")
          .sort((a, b) => {
            const aTs = (a.createdAt as any)?.toMillis?.() ?? 0;
            const bTs = (b.createdAt as any)?.toMillis?.() ?? 0;
            return bTs - aTs;
          })
          .slice(0, 5);

        res.status(200).json({
          ok: true,
          balance,
          nextExpiryMonthYear,
          negativeBalanceLimit: vars.negativeBalanceLimit,
          recentEarnings: recentEarnings.map(serializeRecord),
          history: [],
        });
        return;
      }

      // view === "full"
      // Bilans i wygasanie liczymy ze WSZYSTKICH rekordów (bez limitu) — inaczej przy >200 wpisach
      // stare pule earn wypadałyby z okna i bilans byłby zaniżony.
      // Historia do wyświetlenia jest ograniczona do 200 najnowszych rekordów.
      const [vars, allRecords, history, recentEarnings] = await Promise.all([
        getGodzinkiVars(db),
        getAllRecords(db, uid),
        getHistory(db, uid, 200),
        getRecentEarnings(db, uid, 5),
      ]);

      const balance = computeBalance(allRecords, now);
      const nextExpiry = computeNextExpiry(allRecords, now);

      const nextExpiryMonthYear = nextExpiry ?
        String(nextExpiry.getMonth() + 1).padStart(2, "0") + "-" + nextExpiry.getFullYear() :
        null;

      res.status(200).json({
        ok: true,
        balance,
        nextExpiryMonthYear,
        negativeBalanceLimit: vars.negativeBalanceLimit,
        recentEarnings: recentEarnings.map(serializeRecord),
        history: history.map(serializeRecord),
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
