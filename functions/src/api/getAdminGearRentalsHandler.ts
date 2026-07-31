/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminGearRentalsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

// Etykiety PL kategorii sprzętu (kayaks obsługiwane osobno od pozostałych).
const CATEGORY_LABELS: Record<string, string> = {
  kayaks: "Kajaki",
  paddles: "Wiosła",
  lifejackets: "Kamizelki",
  helmets: "Kaski",
  throwbags: "Rzutki",
  sprayskirts: "Fartuchy",
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Dzisiejsza data w strefie Europe/Warsaw jako YYYY-MM-DD. */
function todayWarsawIso(): string {
  return new Date().toLocaleDateString("en-CA", {timeZone: "Europe/Warsaw"});
}

function isoToDateUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // południe UTC — bezpieczne dla DST
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

/** Wylicza [from, to] (YYYY-MM-DD) dla wybranego zakresu. */
function resolveRange(range: string, fromQ: string, toQ: string):
  | {ok: true; from: string; to: string; key: string}
  | {ok: false; message: string} {
  const today = todayWarsawIso();
  switch (range) {
  case "month":
    return {ok: true, key: "month", from: minusDays(today, 30), to: today};
  case "semester":
    return {ok: true, key: "semester", from: minusMonths(today, 6), to: today};
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
  case "current":
  default:
    return {ok: true, key: "current", from: today, to: today};
  }
}

export async function handleGetAdminGearRentals(req: Request, res: Response, deps: GetAdminGearRentalsDeps) {
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

      const range = norm((req.query.range as string) || "current").toLowerCase();
      const rr = resolveRange(range, (req.query.from as string) || "", (req.query.to as string) || "");
      if (!rr.ok) {
        res.status(400).json({error: rr.message});
        return;
      }
      const {from, to, key} = rr;

      // Nakładanie okresu rezerwacji [startDate, endDate] na [from, to]:
      //   endDate >= from (filtr Firestore, pojedyncze pole → indeks automatyczny)
      //   startDate <= to (filtr w pamięci)
      const snap = await db
        .collection("gear_reservations")
        .where("endDate", ">=", from)
        .orderBy("endDate")
        .limit(1000)
        .get();

      type Row = {
        id: string;
        userUid: string;
        userName: string;
        userNick: string;
        userEmail: string;
        startDate: string;
        endDate: string;
        costHours: number;
        items: Array<{category: string; categoryLabel: string; number: string; label: string}>;
      };

      const rows: Row[] = [];
      const uids = new Set<string>();

      for (const doc of snap.docs) {
        const r = doc.data() as any;
        if (norm(r.status) !== "active") continue;
        const startDate = norm(r.startDate);
        if (!startDate || startDate > to) continue; // brak nakładania

        // Pozycje: nowy format items[]; legacy fallback z kayakIds[].
        let items: Row["items"] = [];
        if (Array.isArray(r.items) && r.items.length) {
          items = r.items.map((it: any) => {
            const cat = norm(it.category).toLowerCase();
            return {
              category: cat,
              categoryLabel: CATEGORY_LABELS[cat] || norm(it.category) || "Sprzęt",
              number: norm(it.itemNumber) || norm(it.number),
              label: norm(it.label),
            };
          });
        } else if (Array.isArray(r.kayakIds) && r.kayakIds.length) {
          items = r.kayakIds.map((kid: any) => ({
            category: "kayaks",
            categoryLabel: CATEGORY_LABELS.kayaks,
            number: norm(kid),
            label: "",
          }));
        }

        const userUid = norm(r.userUid);
        if (userUid) uids.add(userUid);

        rows.push({
          id: norm(r.id) || doc.id,
          userUid,
          userName: "",
          userNick: "",
          userEmail: norm(r.userEmail),
          startDate,
          endDate: norm(r.endDate),
          costHours: Number(r.costHours || 0),
          items,
        });
      }

      // Rozwiąż nazwy użytkowników jednym batchem.
      const uidList = Array.from(uids);
      if (uidList.length) {
        const refs = uidList.map((u) => db.collection("users_active").doc(u));
        const userDocs = await db.getAll(...refs);
        const nameByUid = new Map<string, string>();
        const nickByUid = new Map<string, string>();
        userDocs.forEach((d) => {
          if (d.exists) {
            nameByUid.set(d.id, fullName(d.data()));
            nickByUid.set(d.id, nickname(d.data()));
          }
        });
        for (const row of rows) {
          row.userName = nameByUid.get(row.userUid) || "";
          row.userNick = nickByUid.get(row.userUid) || "";
        }
      }

      // Najnowsze wypożyczenia na górze.
      rows.sort((a, b) => (b.startDate.localeCompare(a.startDate)) || a.userName.localeCompare(b.userName, "pl"));

      res.status(200).json({
        ok: true,
        range: {key, from, to},
        count: rows.length,
        rows,
      });
    } catch (err: any) {
      logger.error("getAdminGearRentals failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
