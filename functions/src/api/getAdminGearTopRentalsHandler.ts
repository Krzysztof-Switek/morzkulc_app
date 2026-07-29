/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {daysOnWaterInclusive} from "../modules/calendar/calendar_utils";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminGearTopRentalsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

// Etykiety PL kategorii sprzętu.
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

function minusMonths(iso: string, n: number): string {
  const d = isoToDateUTC(iso);
  d.setUTCMonth(d.getUTCMonth() - n);
  return dateUTCToIso(d);
}

/** Zakres [from, to] (YYYY-MM-DD). Domyślnie semestr (6 mies. wstecz). */
function resolveRange(range: string, fromQ: string, toQ: string):
  | {ok: true; from: string; to: string; key: string}
  | {ok: false; message: string} {
  const today = todayWarsawIso();
  switch (range) {
  case "month":
    return {ok: true, key: "month", from: minusMonths(today, 1), to: today};
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

type RentalEntry = {
  userUid: string;
  userName: string;
  userNick: string;
  userEmail: string;
  days: number;
};

type ItemAgg = {
  category: string;
  categoryLabel: string;
  number: string;
  name: string;
  totalDays: number;
  rentalsCount: number;
  rentals: RentalEntry[];
};

function fullName(u: any): string {
  const p = u?.profile || {};
  const full = [p.firstName, p.lastName].map((s: any) => norm(s)).filter(Boolean).join(" ").trim();
  return full || norm(p.nickname) || "";
}

function nickname(u: any): string {
  return norm(u?.profile?.nickname);
}

export async function handleGetAdminGearTopRentals(req: Request, res: Response, deps: GetAdminGearTopRentalsDeps) {
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

      // Nakładanie okresu rezerwacji [startDate, endDate] na [from, to]:
      //   endDate >= from (filtr Firestore, pojedyncze pole → indeks automatyczny)
      //   startDate <= to (filtr w pamięci)
      const snap = await db
        .collection("gear_reservations")
        .where("endDate", ">=", from)
        .orderBy("endDate")
        .limit(2000)
        .get();

      const byKey = new Map<string, ItemAgg>();
      const missingNameRefs = new Map<string, {category: string; number: string}>();
      const uids = new Set<string>();

      for (const doc of snap.docs) {
        const r = doc.data() as any;
        if (norm(r.status) !== "active") continue;
        const startDate = norm(r.startDate);
        const endDate = norm(r.endDate);
        if (!startDate || startDate > to) continue; // brak nakładania

        // Pozycje: nowy format items[]; legacy fallback z kayakIds[] (bez nazwy — dociągamy niżej).
        let items: Array<{category: string; number: string; name: string}> = [];
        if (Array.isArray(r.items) && r.items.length) {
          items = r.items.map((it: any) => ({
            category: norm(it.category).toLowerCase(),
            number: norm(it.itemNumber) || norm(it.number),
            name: norm(it.itemLabel),
          }));
        } else if (Array.isArray(r.kayakIds) && r.kayakIds.length) {
          items = r.kayakIds.map((kid: any) => ({category: "kayaks", number: norm(kid), name: ""}));
        }
        if (!items.length) continue;

        // Dni nakładania tej rezerwacji z wybranym oknem (nie cała długość rezerwacji).
        const overlapStart = startDate > from ? startDate : from;
        const overlapEnd = endDate < to ? endDate : to;
        const days = daysOnWaterInclusive(overlapStart, overlapEnd);
        if (days <= 0) continue;

        const userUid = norm(r.userUid);
        const userEmail = norm(r.userEmail);
        if (userUid) uids.add(userUid);

        for (const it of items) {
          if (!it.category || !it.number) continue;
          const itemKey = `${it.category}/${it.number}`;
          const rentalEntry: RentalEntry = {userUid, userName: "", userNick: "", userEmail, days};
          const existing = byKey.get(itemKey);
          if (existing) {
            existing.totalDays += days;
            existing.rentalsCount += 1;
            existing.rentals.push(rentalEntry);
            if (!existing.name && it.name) existing.name = it.name;
          } else {
            byKey.set(itemKey, {
              category: it.category,
              categoryLabel: CATEGORY_LABELS[it.category] || it.category || "Sprzęt",
              number: it.number,
              name: it.name,
              totalDays: days,
              rentalsCount: 1,
              rentals: [rentalEntry],
            });
            if (!it.name) missingNameRefs.set(itemKey, {category: it.category, number: it.number});
          }
        }
      }

      // Dociągnij nazwy (marka+model) dla pozycji bez itemLabel — legacy kayakIds[] (doc id = number).
      if (missingNameRefs.size) {
        const kayakKeys = Array.from(missingNameRefs.entries()).filter(([, v]) => v.category === "kayaks");
        if (kayakKeys.length) {
          const refs = kayakKeys.map(([, v]) => db.collection("gear_kayaks").doc(v.number));
          const kayakDocs = await db.getAll(...refs);
          kayakDocs.forEach((d, i) => {
            if (!d.exists) return;
            const [itemKey] = kayakKeys[i];
            const kd = d.data() as any;
            const name = [norm(kd?.brand), norm(kd?.model)].filter(Boolean).join(" ");
            if (name) {
              const agg = byKey.get(itemKey);
              if (agg) agg.name = name;
            }
          });
        }
      }

      // Rozwiąż nazwy użytkowników jednym batchem (jak w innych raportach).
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
        for (const item of byKey.values()) {
          for (const rental of item.rentals) {
            rental.userName = nameByUid.get(rental.userUid) || "";
            rental.userNick = nickByUid.get(rental.userUid) || "";
          }
        }
      }

      const rows = Array.from(byKey.values())
        .sort((a, b) => (b.totalDays - a.totalDays) || a.number.localeCompare(b.number, "pl"))
        .map((row, i) => ({
          rank: i + 1,
          ...row,
          rentals: row.rentals.sort((a, b) => b.days - a.days),
        }));

      res.status(200).json({
        ok: true,
        range: {key, from, to},
        count: rows.length,
        rows,
      });
    } catch (err: any) {
      logger.error("getAdminGearTopRentals failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
