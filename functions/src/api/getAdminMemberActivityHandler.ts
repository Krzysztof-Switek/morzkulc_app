/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminMemberActivityDeps = {
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
  const d = isoToDateUTC(iso);
  d.setUTCDate(d.getUTCDate() - n);
  return dateUTCToIso(d);
}
function minusMonths(iso: string, n: number): string {
  const d = isoToDateUTC(iso);
  d.setUTCMonth(d.getUTCMonth() - n);
  return dateUTCToIso(d);
}
function fullName(u: any): string {
  const p = u?.profile || {};
  const full = [p.firstName, p.lastName].map((s: any) => norm(s)).filter(Boolean).join(" ").trim();
  return full || norm(p.nickname) || "";
}
function nickname(u: any): string {
  return norm(u?.profile?.nickname);
}

/** Zarejestrowany = ukończona rejestracja (profil z imieniem i nazwiskiem). */
function isRegistered(u: any): boolean {
  const p = u?.profile || {};
  return Boolean(norm(p.firstName) && norm(p.lastName));
}

/** Zakres [from, to] (YYYY-MM-DD). Domyślnie semestr (6 mies. wstecz). Bez „current". */
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
    const from = norm(fromQ);
    const to = norm(toQ);
    if (!isIsoDate(from) || !isIsoDate(to)) {
      return {ok: false, message: "Nieprawidłowy zakres dat (wymagany format YYYY-MM-DD)."};
    }
    if (from > to) return {ok: false, message: "Data „od\" jest późniejsza niż „do\"."};
    return {ok: true, key: "custom", from, to};
  }
  case "semester":
  default:
    return {ok: true, key: "semester", from: minusMonths(today, 6), to: today};
  }
}

export async function handleGetAdminMemberActivity(req: Request, res: Response, deps: GetAdminMemberActivityDeps) {
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

      const range = norm((req.query.range as string) || "semester").toLowerCase();
      const rr = resolveRange(range, (req.query.from as string) || "", (req.query.to as string) || "");
      if (!rr.ok) {
        res.status(400).json({error: rr.message});
        return;
      }
      const {from, to, key} = rr;

      // Tylko rekordy "earn" mają grantedAt (północ UTC dnia pracy), więc zapytanie po
      // grantedAt w zakresie zwraca same earny — bez indeksu złożonego.
      const fromDate = new Date(from + "T00:00:00.000Z");
      const toDate = new Date(to + "T23:59:59.999Z");

      const snap = await db
        .collection("godzinki_ledger")
        .where("grantedAt", ">=", fromDate)
        .where("grantedAt", "<=", toDate)
        .orderBy("grantedAt")
        .limit(20000)
        .get();

      // Bilans otwarcia dla ZAREJESTROWANYCH użytkowników się liczy (jak najbardziej).
      // „Tylko zarejestrowani" załatwia filtr isRegistered niżej — historyczne konta
      // spoza users_active (np. pule pod hist_*) i tak nie przejdą.
      const hoursByUid = new Map<string, number>();
      snap.forEach((doc) => {
        const r = doc.data() as any;
        if (norm(r.type) !== "earn") return;
        if (r.approved !== true) return;
        const ruid = norm(r.uid);
        if (!ruid) return;
        hoursByUid.set(ruid, (hoursByUid.get(ruid) || 0) + Number(r.amount || 0));
      });

      const uidList = Array.from(hoursByUid.keys());
      const nameByUid = new Map<string, string>();
      const nickByUid = new Map<string, string>();
      const emailByUid = new Map<string, string>();
      const registered = new Set<string>();
      if (uidList.length) {
        const refs = uidList.map((u) => db.collection("users_active").doc(u));
        const userDocs = await db.getAll(...refs);
        userDocs.forEach((d) => {
          // Tylko zarejestrowani (ukończona rejestracja) — odsiewamy puste konta SSO.
          if (d.exists && isRegistered(d.data())) {
            const u = d.data();
            registered.add(d.id);
            nameByUid.set(d.id, fullName(u));
            nickByUid.set(d.id, nickname(u));
            emailByUid.set(d.id, norm((u as any)?.email));
          }
        });
      }

      // Tylko użytkownicy zarejestrowani w aplikacji (mają dokument users_active).
      const rows = uidList
        .filter((u) => registered.has(u))
        .map((u) => ({
          userUid: u,
          userName: nameByUid.get(u) || "",
          userNick: nickByUid.get(u) || "",
          userEmail: emailByUid.get(u) || "",
          hours: Math.round((hoursByUid.get(u) || 0) * 100) / 100,
        }))
        .sort((a, b) => (b.hours - a.hours) || a.userName.localeCompare(b.userName, "pl"))
        .map((row, i) => ({rank: i + 1, ...row}));

      res.status(200).json({
        ok: true,
        range: {key, from, to},
        count: rows.length,
        rows,
      });
    } catch (err: any) {
      logger.error("getAdminMemberActivity failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
