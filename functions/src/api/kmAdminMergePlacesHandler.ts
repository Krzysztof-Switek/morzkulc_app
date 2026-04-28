/**
 * kmAdminMergePlacesHandler.ts
 *
 * POST /api/admin/km/places/merge
 *
 * Łączy zduplikowane miejsca w słowniku km_places.
 * Jedno miejsce (keepPlaceId) staje się canonical — pozostałe są usuwane.
 *
 * Body:
 *   keepPlaceId: string    — ID miejsca które zostaje jako canonical
 *   mergeIds: string[]     — ID miejsc do scalenia (min 1, max 20)
 *
 * Logika:
 *   1. Sprawdź role (adminRoleKeys)
 *   2. Pobierz keepPlace i wszystkie mergeIds
 *   3. Dla każdego mergeId:
 *      a. Dodaj jego name do keepPlace.aliases[]
 *      b. Zaktualizuj km_logs: placeId === mergeId → placeId = keepPlaceId
 *      c. Usuń km_places/{mergeId}
 *   4. Zapisz zaktualizowane keepPlace (aliases + suma useCount)
 *   5. Enqueue km.rebuildMapData
 */

import type {Request, Response} from "express";
import * as admin from "firebase-admin";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string}};

export type KmAdminMergePlacesDeps = {
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

async function batchUpdateLogs(
  db: FirebaseFirestore.Firestore,
  mergeId: string,
  keepPlaceId: string,
  keepPlaceName: string
): Promise<number> {
  const CHUNK = 400;
  let updated = 0;
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  for (;;) {
    let q = db.collection("km_logs")
      .where("placeId", "==", mergeId)
      .limit(CHUNK);
    if (lastDoc) q = q.startAfter(lastDoc) as any;

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        placeId: keepPlaceId,
        placeName: keepPlaceName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    updated += snap.docs.length;
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < CHUNK) break;
  }

  return updated;
}

export async function handleKmAdminMergePlaces(
  req: Request,
  res: Response,
  deps: KmAdminMergePlacesDeps
): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      // 1. Auth
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }
      const uid = tokenCheck.decoded.uid;

      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      const roleKey = norm((userSnap.data() as any)?.role_key);
      if (!deps.adminRoleKeys.includes(roleKey)) {
        res.status(403).json({error: "Forbidden — wymagana rola administratora."});
        return;
      }

      // 2. Walidacja body
      const body = (req.body || {}) as any;
      const keepPlaceId = norm(body.keepPlaceId).slice(0, 128);
      const mergeIdsRaw: unknown = body.mergeIds;

      if (!keepPlaceId) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Brak keepPlaceId."});
        return;
      }
      if (!Array.isArray(mergeIdsRaw) || mergeIdsRaw.length === 0) {
        res.status(400).json({ok: false, code: "validation_failed", message: "mergeIds musi być niepustą tablicą."});
        return;
      }
      const mergeIds: string[] = mergeIdsRaw
        .map((v) => norm(v).slice(0, 128))
        .filter(Boolean);

      if (mergeIds.length === 0) {
        res.status(400).json({ok: false, code: "validation_failed", message: "mergeIds nie może zawierać pustych wartości."});
        return;
      }
      if (mergeIds.length > 20) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Można scalić maksymalnie 20 miejsc naraz."});
        return;
      }
      if (mergeIds.includes(keepPlaceId)) {
        res.status(400).json({ok: false, code: "validation_failed", message: "keepPlaceId nie może być w mergeIds."});
        return;
      }

      // 3. Pobierz keepPlace
      const keepRef = deps.db.collection("km_places").doc(keepPlaceId);
      const keepSnap = await keepRef.get();
      if (!keepSnap.exists) {
        res.status(404).json({ok: false, code: "not_found", message: `Nie znaleziono miejsca keepPlaceId=${keepPlaceId}.`});
        return;
      }
      const keepData = keepSnap.data() as any;
      const keepName: string = norm(keepData.name);
      const existingAliases: string[] = Array.isArray(keepData.aliases) ? keepData.aliases : [];
      let accumulatedUseCount = 0;
      const newAliases = new Set<string>(existingAliases);

      // 4. Pobierz i scal każde mergeId
      const mergeResults: Array<{mergeId: string; logsUpdated: number}> = [];

      for (const mergeId of mergeIds) {
        const mergeRef = deps.db.collection("km_places").doc(mergeId);
        const mergeSnap = await mergeRef.get();

        if (!mergeSnap.exists) {
          // Nieistniejące miejsce — pomiń bez błędu
          mergeResults.push({mergeId, logsUpdated: 0});
          continue;
        }

        const mergeData = mergeSnap.data() as any;
        const mergeName = norm(mergeData.name);
        accumulatedUseCount += Number(mergeData.useCount || 0);

        // Dodaj alias z nazwy i dotychczasowych aliasów scalanego miejsca
        if (mergeName && mergeName !== keepName) newAliases.add(mergeName);
        const mergeAliases: string[] = Array.isArray(mergeData.aliases) ? mergeData.aliases : [];
        for (const a of mergeAliases) {
          if (a && a !== keepName) newAliases.add(a);
        }

        // Zaktualizuj km_logs dla scalanego miejsca
        const logsUpdated = await batchUpdateLogs(deps.db, mergeId, keepPlaceId, keepName);

        // Usuń scalone miejsce
        await mergeRef.delete();

        mergeResults.push({mergeId, logsUpdated});
      }

      // 5. Zaktualizuj keepPlace (aliases, useCount)
      await keepRef.update({
        aliases: Array.from(newAliases),
        useCount: admin.firestore.FieldValue.increment(accumulatedUseCount),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // 6. Enqueue km.rebuildMapData
      const jobRef = deps.db.collection("service_jobs").doc();
      await jobRef.set({
        id: jobRef.id,
        taskId: "km.rebuildMapData",
        payload: {},
        status: "queued",
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        ok: true,
        keepPlaceId,
        keepName,
        mergeResults,
        rebuildJobId: jobRef.id,
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
