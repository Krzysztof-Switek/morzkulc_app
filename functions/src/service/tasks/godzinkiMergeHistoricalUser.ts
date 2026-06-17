/**
 * godzinkiMergeHistoricalUser.ts
 *
 * Task: godzinki.mergeHistoricalUser
 *
 * Scala przejściowe rekordy godzinki_ledger spod uid "hist_{email}" na prawdziwy uid
 * użytkownika. Wywoływany automatycznie po rejestracji, jeśli email pasuje do danych
 * importowanych z arkusza "Godzinki 2026 i korekty".
 *
 * Ślad FIFO (spend.earnDeductions) wskazuje na earnId (id dokumentów), które nie zmieniają
 * się przy podmianie uid — saldo pozostaje poprawne bez żadnego replay.
 *
 * Payload:
 *   uid: string      — prawdziwy Firebase UID zarejestrowanego użytkownika
 *   email: string    — znormalizowany email (lowercase)
 *   histUid: string  — "hist_" + email
 */

import * as admin from "firebase-admin";
import {ServiceTask} from "../types";

type Payload = {
  uid: string;
  email: string;
  histUid: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

export const godzinkiMergeHistoricalUserTask: ServiceTask<Payload> = {
  id: "godzinki.mergeHistoricalUser",
  description: "Scala godzinki_ledger z uid hist_{email} na prawdziwy uid użytkownika po rejestracji.",

  validate: (payload) => {
    if (!payload?.uid) throw new Error("Missing uid in payload");
    if (!payload?.email) throw new Error("Missing email in payload");
    if (!payload?.histUid) throw new Error("Missing histUid in payload");
  },

  run: async (payload, ctx) => {
    const uid = norm(payload.uid);
    const histUid = norm(payload.histUid);

    ctx.logger.info("godzinki.mergeHistoricalUser: start", {uid, histUid});

    // 1. Idempotency: marker zakończenia
    const userSnap = await ctx.firestore.collection("users_active").doc(uid).get();
    if (userSnap.exists) {
      const userData = userSnap.data() as any;
      if (userData?.service?.godzinkiHistMergedFrom === histUid) {
        ctx.logger.info("godzinki.mergeHistoricalUser: already merged", {uid, histUid});
        return {ok: true, message: `already merged histUid=${histUid}`};
      }
    }

    // 2. Pobierz wszystkie rekordy godzinki_ledger dla histUid
    const recsSnap = await ctx.firestore.collection("godzinki_ledger")
      .where("uid", "==", histUid)
      .get();

    if (recsSnap.empty) {
      ctx.logger.info("godzinki.mergeHistoricalUser: no hist records found", {uid, histUid});
      // Zapisz marker, aby nie próbować ponownie przy każdym logowaniu.
      await ctx.firestore.collection("users_active").doc(uid).set(
        {
          "service.godzinkiHistMergedFrom": histUid,
          "service.godzinkiHistMergedAt": admin.firestore.Timestamp.now(),
        },
        {merge: true}
      );
      return {ok: true, message: `no hist records for histUid=${histUid}`};
    }

    ctx.logger.info("godzinki.mergeHistoricalUser: found hist records", {uid, histUid, count: recsSnap.size});

    // 3. Batch-update: uid → realUid (maks 400 per batch)
    let currentBatch = ctx.firestore.batch();
    let batchCount = 0;
    const MAX_BATCH = 400;

    for (const doc of recsSnap.docs) {
      currentBatch.update(doc.ref, {
        uid,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      batchCount++;
      if (batchCount >= MAX_BATCH) {
        await currentBatch.commit();
        ctx.logger.info("godzinki.mergeHistoricalUser: batch committed", {batchCount});
        currentBatch = ctx.firestore.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await currentBatch.commit();
      ctx.logger.info("godzinki.mergeHistoricalUser: final batch committed", {batchCount});
    }

    // 4. Marker ukończenia na users_active/{uid}
    await ctx.firestore.collection("users_active").doc(uid).set(
      {
        "service.godzinkiHistMergedFrom": histUid,
        "service.godzinkiHistMergedAt": admin.firestore.Timestamp.now(),
      },
      {merge: true}
    );

    ctx.logger.info("godzinki.mergeHistoricalUser: done", {uid, histUid, recordsCount: recsSnap.size});

    return {
      ok: true,
      message: `merged histUid=${histUid} recordsCount=${recsSnap.size}`,
      details: {uid, histUid, recordsCount: recsSnap.size},
    };
  },
};
