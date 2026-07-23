/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {getAllRecords, computeBalance, computeNextExpiry} from "../modules/hours/godzinki_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminUserActivityDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}
function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function todayWarsawIso(): string {
  return new Date().toLocaleDateString("en-CA", {timeZone: "Europe/Warsaw"});
}
function isoToDateUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
function dateUTCToIso(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}
function minusDays(iso: string, n: number): string {
  const d = isoToDateUTC(iso); d.setUTCDate(d.getUTCDate() - n); return dateUTCToIso(d);
}
function minusMonths(iso: string, n: number): string {
  const d = isoToDateUTC(iso); d.setUTCMonth(d.getUTCMonth() - n); return dateUTCToIso(d);
}
function fullName(u: any): string {
  const p = u?.profile || {};
  const full = [p.firstName, p.lastName].map((s: any) => norm(s)).filter(Boolean).join(" ").trim();
  return full || norm(p.nickname) || "";
}
function nickname(u: any): string {
  return norm(u?.profile?.nickname);
}

/** Dopasowanie użytkownika do frazy (substring po e-mailu, imieniu, nazwisku, ksywie, „imię nazwisko"). */
function matchesQuery(u: any, qLower: string): boolean {
  const p = u?.profile || {};
  const hay = [norm(u?.email), norm(p.firstName), norm(p.lastName), norm(p.nickname), fullName(u)]
    .join(" ").toLowerCase();
  return hay.includes(qLower);
}
function tsIso(v: any): string | null {
  return (v && typeof v.toDate === "function") ? v.toDate().toISOString() : null;
}

/** Serializacja rekordu godzinki_ledger do postaci jak w widoku historii w aplikacji. */
function serialize(r: any): any {
  const out: any = {id: r.id, type: r.type, amount: r.amount, reason: norm(r.reason), createdAt: tsIso(r.createdAt)};
  if (r.type === "earn") {
    out.approved = r.approved ?? false;
    out.grantedAt = (r.grantedAt && r.grantedAt.toDate) ? r.grantedAt.toDate().toISOString().slice(0, 10) : null;
    out.expiresAt = (r.expiresAt && r.expiresAt.toDate) ? r.expiresAt.toDate().toISOString().slice(0, 7) : null;
    out.remaining = r.remaining ?? 0;
  }
  if (r.type === "spend") {
    out.overdraft = r.overdraft ?? 0;
    out.fromEarn = r.fromEarn ?? 0;
    out.waived = r.waived === true;
    out.schoolYear = r.schoolYear ?? null;
  }
  return out;
}

function resolveRange(range: string, fromQ: string, toQ: string):
  | {ok: true; from: string; to: string; key: string}
  | {ok: false; message: string} {
  const today = todayWarsawIso();
  switch (range) {
  case "month":
    return {ok: true, key: "month", from: minusDays(today, 30), to: today};
  case "year":
    return {ok: true, key: "year", from: minusMonths(today, 12), to: today};
  case "custom": {
    const from = norm(fromQ); const to = norm(toQ);
    if (!isIsoDate(from) || !isIsoDate(to)) return {ok: false, message: "Nieprawidłowy zakres dat (YYYY-MM-DD)."};
    if (from > to) return {ok: false, message: "Data „od\" jest późniejsza niż „do\"."};
    return {ok: true, key: "custom", from, to};
  }
  case "semester":
  default:
    return {ok: true, key: "semester", from: minusMonths(today, 6), to: today};
  }
}

export async function handleGetAdminUserActivity(req: Request, res: Response, deps: GetAdminUserActivityDeps) {
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
      const roleKey = norm((userSnap.data() as any)?.role_key);
      if (!adminRoleKeys.includes(roleKey)) {
        res.status(403).json({error: "Forbidden"});
        return;
      }

      const query = norm((req.query.query as string) || (req.query.email as string));
      if (!query) {
        res.status(400).json({error: "Podaj e-mail, nazwisko lub ksywę użytkownika."});
        return;
      }

      const range = norm((req.query.range as string) || "semester").toLowerCase();
      const rr = resolveRange(range, (req.query.from as string) || "", (req.query.to as string) || "");
      if (!rr.ok) {
        res.status(400).json({error: rr.message});
        return;
      }
      const {from, to, key} = rr;

      // Rozwiązanie użytkownika: pełny e-mail (dokładnie, 1 read) albo fraza (substring
      // po e-mailu/imieniu/nazwisku/ksywie — skan ~44 dokumentów, filtr w pamięci).
      const qLower = query.toLowerCase();
      let targetDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      if (qLower.includes("@")) {
        const exact = await db.collection("users_active").where("email", "==", qLower).limit(1).get();
        if (!exact.empty) targetDoc = exact.docs[0];
      }
      if (!targetDoc) {
        const all = await db.collection("users_active").get();
        const matches = all.docs.filter((d) => matchesQuery(d.data(), qLower));
        if (matches.length === 0) {
          res.status(200).json({ok: true, found: false, message: `Nie znaleziono użytkownika dla „${query}".`});
          return;
        }
        if (matches.length > 1) {
          const candidates = matches.slice(0, 12).map((d) => {
            const x = d.data() as any;
            return {name: fullName(x), nick: nickname(x), email: norm(x.email)};
          }).sort((a, b) => a.name.localeCompare(b.name, "pl"));
          res.status(200).json({ok: true, found: false, candidates, message: `Pasuje ${matches.length} osób — doprecyzuj lub wybierz.`});
          return;
        }
        targetDoc = matches[0];
      }

      const targetUid = targetDoc.id;
      const targetData = targetDoc.data() as any;

      const records = await getAllRecords(db, targetUid);
      const now = new Date();
      const balance = computeBalance(records, now);
      const nextExpiry = computeNextExpiry(records, now);
      const nextExpiryMonthYear = nextExpiry ?
        String(nextExpiry.getMonth() + 1).padStart(2, "0") + "-" + nextExpiry.getFullYear() : null;

      // Saldo liczymy ze WSZYSTKICH rekordów (jak w profilu); historia ograniczona zakresem
      // po dacie wpisu (createdAt) — tej samej, którą pokazuje widok historii w aplikacji.
      const history = records
        .map(serialize)
        .filter((r) => {
          const d = r.createdAt ? String(r.createdAt).slice(0, 10) : "";
          return d && d >= from && d <= to;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      res.status(200).json({
        ok: true,
        found: true,
        user: {name: fullName(targetData), email: norm(targetData.email)},
        range: {key, from, to},
        balance,
        nextExpiryMonthYear,
        count: history.length,
        history,
      });
    } catch (err: any) {
      logger.error("getAdminUserActivity failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
