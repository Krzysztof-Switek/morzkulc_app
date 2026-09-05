/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {compositeId, isSupportedBundleCategory} from "../modules/equipment/bundle/gear_bundle_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetKayakReservationsDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

function todayIsoUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function handleGetKayakReservations(
  req: Request,
  res: Response,
  deps: GetKayakReservationsDeps
) {
  const {
    db,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
  } = deps;

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

      // "itemId" is the generic param; "kayakId" stays as an accepted alias so the
      // existing per-card "Więcej" caller (gear_module.js) keeps working unchanged.
      const itemId = String(req.query?.itemId || req.query?.kayakId || "").trim();
      if (!itemId) {
        res.status(400).json({error: "Missing itemId"});
        return;
      }

      const categoryRaw = String(req.query?.category || "kayaks").trim().toLowerCase();
      if (!isSupportedBundleCategory(categoryRaw)) {
        res.status(400).json({error: "Unsupported category"});
        return;
      }

      const excludeReservationId = String(req.query?.excludeReservationId || "").trim();

      const todayIso = todayIsoUTC();
      const cid = compositeId(categoryRaw, itemId);

      // New-format bundle docs always carry itemIds — a direct array-contains query.
      const itemIdsSnap = await db
        .collection("gear_reservations")
        .where("status", "==", "active")
        .where("itemIds", "array-contains", cid)
        .get();

      const docsById = new Map<string, any>();
      for (const d of itemIdsSnap.docs) docsById.set(d.id, d.data());

      // Legacy pre-bundle kayak docs only have kayakIds, never itemIds.
      if (categoryRaw === "kayaks") {
        const kayakIdsSnap = await db
          .collection("gear_reservations")
          .where("status", "==", "active")
          .where("kayakIds", "array-contains", itemId)
          .get();
        for (const d of kayakIdsSnap.docs) {
          if (!docsById.has(d.id)) docsById.set(d.id, d.data());
        }
      }

      const docs = Array.from(docsById.entries())
        .filter(([id, r]) => String(r?.blockEndIso || "") >= todayIso && id !== excludeReservationId)
        .map(([, r]) => r);

      // Batch-fetch user display names from users_active
      const uids = [...new Set(docs.map((r) => String(r?.userUid || "")).filter(Boolean))];

      const nameMap: Record<string, string> = {};
      if (uids.length) {
        const userSnaps = await Promise.all(
          uids.map((uid) => db.collection("users_active").doc(uid).get())
        );
        for (const userSnap of userSnaps) {
          if (!userSnap.exists) continue;
          const data = userSnap.data() as any;
          const firstName = String(data?.profile?.firstName || "").trim();
          const lastName = String(data?.profile?.lastName || "").trim();
          const displayName = [firstName, lastName].filter(Boolean).join(" ");
          nameMap[userSnap.id] = displayName || String(data?.email || "");
        }
      }

      // Batch-fetch nazwy imprez dla rezerwacji "na imprezę klubową" — widoczność
      // dla WSZYSTKICH użytkowników przeglądających sprzęt objęła też nazwę imprezy
      // (feedback użytkownika 04.09.2026, wcześniej świadomie tylko kierownik bez nazwy).
      const eventIds = [...new Set(docs.map((r) => String(r?.eventId || "")).filter(Boolean))];
      const eventNameMap: Record<string, string> = {};
      if (eventIds.length) {
        const eventSnaps = await Promise.all(
          eventIds.map((id) => db.collection("events").doc(id).get())
        );
        for (const eventSnap of eventSnaps) {
          if (!eventSnap.exists) continue;
          eventNameMap[eventSnap.id] = String((eventSnap.data() as any)?.name || "");
        }
      }

      const reservations = docs
        .sort((a, b) =>
          String(a?.startDate || "").localeCompare(String(b?.startDate || ""))
        )
        .map((r) => ({
          startDate: String(r?.startDate || ""),
          endDate: String(r?.endDate || ""),
          blockStartIso: String(r?.blockStartIso || ""),
          blockEndIso: String(r?.blockEndIso || ""),
          userDisplayName:
            nameMap[String(r?.userUid || "")] || String(r?.userEmail || ""),
          // Rezerwacja "na imprezę klubową" — front pokazuje "Impreza klubowa: {nazwa}"
          // zamiast nazwiska.
          isClubEvent: Boolean(r?.eventId),
          eventName: r?.eventId ? (eventNameMap[String(r.eventId)] || "") : "",
        }));

      res.status(200).json({ok: true, category: categoryRaw, itemId, kayakId: itemId, reservations});
    } catch (err: any) {
      logger.error("getKayakReservations failed", {
        message: err?.message,
        stack: err?.stack,
      });
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
