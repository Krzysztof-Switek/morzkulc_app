/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";
import {getServiceConfig} from "../service/service_config";
import {parseSchoolYear, getKursWindowEndSuffix} from "../modules/equipment/bundle/gear_bundle_service";
import {computeNegativeBalances, NegativeBalanceEntry} from "../modules/hours/godzinki_service";
import {getGodzinkiVars} from "../modules/hours/godzinki_vars";

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

type DeadJob = {
  id: string;
  taskId: string;
  attempts: number;
  lastErrorMessage: string;
  updatedAt: string | null;
};

type FailedStorageCharge = {
  id: string;
  kayakId: string;
  billingMonth: string;
  ownerContact: string;
  message: string;
  createdAt: string | null;
};

type GearSyncReport = {
  hasWarnings: boolean;
  ranAt: string | null;
  blocked: boolean;
  privateKayakErrors: Array<{id: string; reason: string}>;
  duplicateIdErrors: Array<{category: string; id: string; rowNumber: string}>;
  totals: Record<string, number>;
  perCategory: Array<{
    key: string;
    label: string;
    sheetRows: number;
    upserted: number;
    duplicateId: number;
    duplicates: Array<{id: string; number: string; model: string; rowNumber: string}>;
    skippedNoId: number;
    skippedNotReal: number;
    scrapped: number;
  }>;
  error: string | null;
};

type NegativeBalancesReport = {
  items: NegativeBalanceEntry[];
  error: string | null;
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

      const svcCfg = getServiceConfig();
      const godzinkiSheetUrl = svcCfg.godzinki?.spreadsheetId ?
        `https://docs.google.com/spreadsheets/d/${svcCfg.godzinki.spreadsheetId}` :
        null;

      const LIMIT = 50;
      const currentYear = String(new Date().getFullYear());

      // Promise.allSettled (Z12 z planu panelu): awaria pojedynczego zapytania
      // (np. brakujący indeks) nie może wyłączać CAŁEGO panelu — sekcja z błędem
      // dostaje pustą listę + flagę error, pozostałe działają normalnie.
      const settled = await Promise.allSettled([
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
        db.collection("service_jobs")
          .where("status", "==", "dead")
          .limit(20)
          .get(),
        db.collection("gear_storage_charges")
          .where("status", "==", "failed")
          .limit(30)
          .get(),
      ]);

      const snapOf = (i: number): FirebaseFirestore.QuerySnapshot | null =>
        settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<FirebaseFirestore.QuerySnapshot>).value : null;
      const errorOf = (i: number): string | null => {
        if (settled[i].status !== "rejected") return null;
        const reason = (settled[i] as PromiseRejectedResult).reason;
        logger.error("getAdminPending: section query failed", {section: i, message: reason?.message});
        return "Sekcja chwilowo niedostępna";
      };
      const docsOf = (i: number) => snapOf(i)?.docs ?? [];

      const [earnSnap, purchaseSnap, eventsSnap, privateKayaksSnap, deadJobsSnap, failedChargesSnap] = [
        {docs: docsOf(0), error: errorOf(0)},
        {docs: docsOf(1), error: errorOf(1)},
        {docs: docsOf(2), error: errorOf(2)},
        {docs: docsOf(3), error: errorOf(3)},
        {docs: docsOf(4), error: errorOf(4)},
        {docs: docsOf(5), error: errorOf(5)},
      ];

      const godzinkiItems = [...earnSnap.docs, ...purchaseSnap.docs]
        // Pozycje odrzucone w aplikacji (rejected==true) znikają z panelu (Z9).
        .filter((d) => (d.data() as any)?.rejected !== true)
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
            approvalRejectedCode: norm(data.approvalRejectedCode) || null,
            approvalRejectedMessage: norm(data.approvalRejectedMessage) || null,
          };
        });

      // Odmowy zatwierdzenia (Z10): rekordy, których sync NIE zatwierdził mimo
      // TAK w arkuszu (przeterminowana data pracy, nieaktualny wykup) — bez tej
      // sekcji admin widział wiecznie "oczekujący" wpis bez wyjaśnienia.
      const godzinkiRejectedItems = godzinkiItems.filter((i) => i.approvalRejectedCode);

      // Resolve display names (nickname → firstName → email → uid) for godzinki submitters
      const godzinkiUids = [...new Set(godzinkiItems.map((i) => i.uid).filter(Boolean))];
      const uidToName = new Map<string, string>();
      if (godzinkiUids.length > 0) {
        await Promise.all(
          godzinkiUids.map(async (submitterUid) => {
            const snap = await db.collection("users_active").doc(submitterUid).get();
            const d = snap.data() as any;
            const nickname = norm(d?.profile?.nickname);
            const firstName = norm(d?.profile?.firstName);
            uidToName.set(submitterUid, nickname || firstName || norm(d?.email) || submitterUid);
          })
        );
      }

      // Group by uid — one entry per person with aggregated total
      const godzinkiByUid = new Map<string, {displayName: string; totalAmount: number}>();
      for (const item of godzinkiItems) {
        const displayName = uidToName.get(item.uid) || item.uid;
        const existing = godzinkiByUid.get(item.uid);
        if (existing) {
          existing.totalAmount += item.amount;
        } else {
          godzinkiByUid.set(item.uid, {displayName, totalAmount: item.amount});
        }
      }
      const godzinkiGrouped = [...godzinkiByUid.values()].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "pl")
      );

      const eventsItems = eventsSnap.docs
        // Imprezy odrzucone w aplikacji (rejected==true) znikają z panelu (Z9).
        .filter((d) => (d.data() as any)?.rejected !== true)
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: norm(data.name),
            startDate: norm(data.startDate),
            endDate: norm(data.endDate),
            userEmail: norm(data.userEmail),
            createdAt: tsToIso(data.createdAt),
            organizer: norm(data.organizer),
            // Impreza klubowa może mieć kilku kierowników (arkusz: kolumna
            // "Kierownik" dopuszcza kilka e-maili) — panel pokazuje wszystkich.
            kierownikEmails: (Array.isArray(data.kierownicy) ? data.kierownicy : []).map((k: any) => norm(k?.email)).filter(Boolean),
            kierownikDisplayNames: (Array.isArray(data.kierownicy) ? data.kierownicy : []).map((k: any) => norm(k?.displayName) || norm(k?.email)).filter(Boolean),
          };
        });

      // Private kayaks stored in club — check email resolvability and contributions
      const privateKayakEmailIssues: PrivateKayakEmailIssue[] = [];
      const privateKayakUnpaidContributions: PrivateKayakUnpaidContributions[] = [];

      for (const kayakDoc of privateKayaksSnap.docs) {
        const kayak = kayakDoc.data() as any;
        // gear.syncAllFromSheet zapisuje pole "storedAt"; starsze rekordy "storage" — czytamy oba.
        const storage = norm(kayak?.storage || kayak?.storedAt).toLowerCase();

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

        // Brak/niepoprawna data wejścia do klubu → opłata nie będzie naliczana (cicho).
        const sinceRaw = kayak?.privatesinceinclub ?? kayak?.privateSinceInClub;
        const hasSince = !!sinceRaw && (
          typeof (sinceRaw as any)?.toDate === "function" ||
          sinceRaw instanceof Date ||
          (typeof sinceRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(sinceRaw.trim()))
        );
        if (!hasSince) {
          privateKayakEmailIssues.push({
            kayakId,
            number,
            ownerContact,
            reason: "Brak daty wejścia do klubu (od kiedy w klubie)",
          });
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

      const deadJobs: DeadJob[] = deadJobsSnap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            taskId: norm(data.taskId),
            attempts: Number(data.attempts ?? 0),
            lastErrorMessage: norm(data.lastError?.message),
            updatedAt: tsToIso(data.updatedAt),
          };
        })
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

      const failedStorageCharges: FailedStorageCharge[] = failedChargesSnap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            kayakId: norm(data.kayakId),
            billingMonth: norm(data.billingMonth),
            ownerContact: norm(data.ownerContact),
            message: norm(data.message),
            createdAt: tsToIso(data.createdAt),
          };
        })
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      // Pozycje per-rekord z ID — panel pokazuje przycisk Zatwierdź/Odrzuć przy każdej.
      // (Sekcja "items" pozostaje zagregowana per osoba dla szybkiego przeglądu.)
      const godzinkiPending = godzinkiItems.map((i) => ({
        id: i.id,
        displayName: uidToName.get(i.uid) || i.uid,
        type: i.type,
        amount: i.amount,
        reason: i.reason,
        createdAt: i.createdAt,
      }));

      const godzinkiRejected = godzinkiRejectedItems.map((i) => ({
        id: i.id,
        displayName: uidToName.get(i.uid) || i.uid,
        type: i.type,
        amount: i.amount,
        code: i.approvalRejectedCode,
        message: i.approvalRejectedMessage,
      }));

      // Raport synchronizacji sprzętu (service_reports/gearSync) — zapisywany przez
      // gear.syncAllFromSheet. Duplikat ID nie jest wykrywalny po fakcie w Firestore
      // (kolaps do jednego dokumentu), więc panel czyta utrwalony raport z momentu syncu.
      const emptyGearSync: GearSyncReport = {
        hasWarnings: false, ranAt: null, blocked: false, privateKayakErrors: [], duplicateIdErrors: [], totals: {}, perCategory: [], error: null,
      };
      let gearSync: GearSyncReport = emptyGearSync;
      try {
        const reportSnap = await db.collection("service_reports").doc("gearSync").get();
        if (reportSnap.exists) {
          const d = reportSnap.data() as any;
          gearSync = {
            hasWarnings: d?.hasWarnings === true,
            ranAt: tsToIso(d?.ranAt),
            blocked: d?.blocked === true,
            privateKayakErrors: Array.isArray(d?.privateKayakErrors) ?
              d.privateKayakErrors.map((x: any) => ({id: norm(x?.id), reason: norm(x?.reason)})) : [],
            duplicateIdErrors: Array.isArray(d?.duplicateIdErrors) ?
              d.duplicateIdErrors.map((x: any) => ({category: norm(x?.category), id: norm(x?.id), rowNumber: norm(x?.rowNumber)})) : [],
            totals: (d?.totals as Record<string, number>) || {},
            perCategory: Array.isArray(d?.perCategory) ?
              d.perCategory
                .filter((c: any) => Number(c?.duplicateId) > 0 || Number(c?.skippedNoId) > 0 || Number(c?.skippedNotReal) > 0)
                .map((c: any) => ({
                  key: norm(c?.key),
                  label: norm(c?.label),
                  sheetRows: Number(c?.sheetRows ?? 0),
                  upserted: Number(c?.upserted ?? 0),
                  duplicateId: Number(c?.duplicateId ?? 0),
                  duplicates: Array.isArray(c?.duplicates) ? c.duplicates.map((x: any) => ({
                    id: norm(x?.id), number: norm(x?.number), model: norm(x?.model), rowNumber: norm(x?.rowNumber),
                  })) : [],
                  skippedNoId: Number(c?.skippedNoId ?? 0),
                  skippedNotReal: Number(c?.skippedNotReal ?? 0),
                  scrapped: Number(c?.scrapped ?? 0),
                })) :
              [],
            error: null,
          };
        }
      } catch (e: any) {
        logger.error("getAdminPending: gearSync report read failed", {message: e?.message});
        gearSync = {...emptyGearSync, error: "Sekcja chwilowo niedostępna"};
      }

      // Ujemne salda — liczone NA ŻYWO (computeNegativeBalances, ta sama funkcja co
      // miesięczny task godzinki.monthlyBalanceReview). Wcześniej panel czytał tu
      // miesięczny snapshot z service_reports/negativeBalances, co dawało nawet
      // miesiąc rozjazdu względem realnego salda widocznego w raportach/koncie usera.
      let negativeBalances: NegativeBalancesReport = {items: [], error: null};
      try {
        const godzinkiVars = await getGodzinkiVars(db);
        const items = await computeNegativeBalances(db, new Date(), godzinkiVars.negativeBalanceLimit);
        negativeBalances = {items, error: null};
      } catch (e: any) {
        logger.error("getAdminPending: negativeBalances live compute failed", {message: e?.message});
        negativeBalances = {items: [], error: "Sekcja chwilowo niedostępna"};
      }

      // Kursanci po terminie (P6): role_key == rola_kursant, którzy minęli okno
      // wypożyczeń (30 września roku szkoleniówki). role_key NIE jest zmieniany
      // automatem — zarząd nadaje rolę docelową ręcznie w arkuszu członków. Ta
      // sekcja przypomina, kogo trzeba przepisać.
      type ExpiredKursant = {uid: string; email: string; displayName: string; schoolYear: number};
      let expiredKursants: {count: number; items: ExpiredKursant[]; error: string | null} = {count: 0, items: [], error: null};
      try {
        const kursantsSnap = await db.collection("users_active")
          .where("role_key", "==", "rola_kursant")
          .get();
        const todayIso = new Date().toISOString().slice(0, 10);
        const windowEndSuffix = await getKursWindowEndSuffix(db);
        const items: ExpiredKursant[] = [];
        for (const d of kursantsSnap.docs) {
          const data = d.data() as any;
          const email = norm(data?.email).toLowerCase();
          if (!email) continue;
          const rok = parseSchoolYear(data?.admin?.schoolYear ?? null);
          if (rok === null) continue;
          if (todayIso > `${rok}-${windowEndSuffix}`) {
            const nickname = norm(data?.profile?.nickname);
            const firstName = norm(data?.profile?.firstName);
            const lastName = norm(data?.profile?.lastName);
            const displayName = [firstName, lastName].filter(Boolean).join(" ") || nickname || email;
            items.push({uid: d.id, email, displayName, schoolYear: rok});
          }
        }
        items.sort((a, b) => a.displayName.localeCompare(b.displayName, "pl"));
        expiredKursants = {count: items.length, items, error: null};
      } catch (e: any) {
        logger.error("getAdminPending: expiredKursants read failed", {message: e?.message});
        expiredKursants = {count: 0, items: [], error: "Sekcja chwilowo niedostępna"};
      }

      res.status(200).json({
        ok: true,
        meta: {godzinkiSheetUrl},
        expiredKursants,
        godzinki: {count: godzinkiItems.length, items: godzinkiGrouped, pending: godzinkiPending, error: earnSnap.error || purchaseSnap.error},
        godzinkiRejected: {count: godzinkiRejected.length, items: godzinkiRejected},
        events: {count: eventsItems.length, items: eventsItems, error: eventsSnap.error},
        privateKayakEmailIssues: {count: privateKayakEmailIssues.length, items: privateKayakEmailIssues, error: privateKayaksSnap.error},
        privateKayakUnpaidContributions: {count: privateKayakUnpaidContributions.length, items: privateKayakUnpaidContributions},
        deadJobs: {count: deadJobs.length, items: deadJobs, error: deadJobsSnap.error},
        failedStorageCharges: {count: failedStorageCharges.length, items: failedStorageCharges, error: failedChargesSnap.error},
        gearSync,
        negativeBalances: {count: negativeBalances.items.length, items: negativeBalances.items, error: negativeBalances.error},
      });
    } catch (err: any) {
      logger.error("getAdminPending failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
