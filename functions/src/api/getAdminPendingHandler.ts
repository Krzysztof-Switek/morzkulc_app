/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetAdminPendingDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[];
};

function tsToIso(v: any): string | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function norm(v: any): string {
  return String(v || "").trim();
}

type PrivateKayakEmailIssue = {
  kayakId: string;
  number: string;
  ownerContact: string;
  reason: string;
};

type PrivateKayakUnpaidContributions = {
  kayakId: string;
  number: string;
  ownerContact: string;
  ownerName: string;
  contributions: string;
};

export async function handleGetAdminPending(req: Request, res: Response, deps: GetAdminPendingDeps) {
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

      const LIMIT = 50;
      const currentYear = String(new Date().getFullYear());

      const [earnSnap, purchaseSnap, eventsSnap, privateKayaksSnap] = await Promise.all([
        db.collection("godzinki_ledger")
          .where("approved", "==", false)
          .where("type", "==", "earn")
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
        db.collection("godzinki_ledger")
          .where("approved", "==", false)
          .where("type", "==", "purchase")
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
        db.collection("events")
          .where("approved", "==", false)
          .orderBy("createdAt", "asc")
          .limit(LIMIT)
          .get(),
        db.collection("gear_kayaks")
          .where("isPrivate", "==", true)
          .get(),
      ]);

      const godzinkiItems = [...earnSnap.docs, ...purchaseSnap.docs]
        .sort((a, b) => {
          const aTs = a.data().createdAt?.toMillis?.() ?? 0;
          const bTs = b.data().createdAt?.toMillis?.() ?? 0;
          return aTs - bTs;
        })
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            uid: norm(data.uid),
            type: norm(data.type),
            amount: Number(data.amount ?? 0),
            reason: norm(data.reason),
            submittedBy: norm(data.submittedBy),
            createdAt: tsToIso(data.createdAt),
          };
        });

      const eventsItems = eventsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: norm(data.name),
          startDate: norm(data.startDate),
          endDate: norm(data.endDate),
          userEmail: norm(data.userEmail),
          createdAt: tsToIso(data.createdAt),
        };
      });

      // Private kayaks stored in club — check email resolvability and contributions
      const privateKayakEmailIssues: PrivateKayakEmailIssue[] = [];
      const privateKayakUnpaidContributions: PrivateKayakUnpaidContributions[] = [];

      for (const kayakDoc of privateKayaksSnap.docs) {
        const kayak = kayakDoc.data() as any;
        const storage = norm(kayak?.storage).toLowerCase();

        if (storage !== "klub") continue;
        if (kayak?.isPrivateRentable === true) continue;

        const kayakId = norm(kayak?.id || kayakDoc.id);
        const number = norm(kayak?.number);
        const ownerContact = norm(kayak?.ownerContact);

        // Missing or invalid email
        if (!ownerContact || !ownerContact.includes("@")) {
          privateKayakEmailIssues.push({
            kayakId,
            number,
            ownerContact,
            reason: "Brak adresu email właściciela",
          });
          continue;
        }

        const ownerSnap = await db.collection("users_active")
          .where("email", "==", ownerContact.toLowerCase())
          .limit(1)
          .get();

        if (ownerSnap.empty) {
          privateKayakEmailIssues.push({
            kayakId,
            number,
            ownerContact,
            reason: "Właściciel nie znaleziony w bazie użytkowników",
          });
          continue;
        }

        // Owner found — check contributions
        const ownerData = ownerSnap.docs[0].data() as any;
        const contributions = norm(ownerData?.admin?.contributions);
        const firstName = norm(ownerData?.profile?.firstName);
        const lastName = norm(ownerData?.profile?.lastName);
        const ownerName = [firstName, lastName].filter(Boolean).join(" ") || ownerContact;

        if (!contributions || !contributions.includes(currentYear)) {
          privateKayakUnpaidContributions.push({
            kayakId,
            number,
            ownerContact,
            ownerName,
            contributions,
          });
        }
      }

      res.status(200).json({
        ok: true,
        godzinki: {count: godzinkiItems.length, items: godzinkiItems},
        events: {count: eventsItems.length, items: eventsItems},
        privateKayakEmailIssues: {count: privateKayakEmailIssues.length, items: privateKayakEmailIssues},
        privateKayakUnpaidContributions: {count: privateKayakUnpaidContributions.length, items: privateKayakUnpaidContributions},
      });
    } catch (err: any) {
      logger.error("getAdminPending failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
