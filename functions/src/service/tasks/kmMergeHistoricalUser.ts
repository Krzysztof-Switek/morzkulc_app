/**
 * kmMergeHistoricalUser.ts
 *
 * Task: km.mergeHistoricalUser
 *
 * Scala historyczne wpisy km_logs spod uid "hist_{email}" na prawdziwy uid użytkownika.
 * Wywoływany automatycznie po rejestracji, jeśli email pasuje do historycznych danych.
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

export const kmMergeHistoricalUserTask: ServiceTask<Payload> = {
  id: "km.mergeHistoricalUser",
  description: "Scala km_logs z uid hist_{email} na prawdziwy uid użytkownika po rejestracji.",

  validate: (payload) => {
    if (!payload?.uid) throw new Error("Missing uid in payload");
    if (!payload?.email) throw new Error("Missing email in payload");
    if (!payload?.histUid) throw new Error("Missing histUid in payload");
  },

  run: async (payload, ctx) => {
    const uid = norm(payload.uid);
    const histUid = norm(payload.histUid);

    ctx.logger.info("km.mergeHistoricalUser: start", {uid, histUid});

    // 1. Idempotency: sprawdź marker zakończenia
    const userSnap = await ctx.firestore.collection("users_active").doc(uid).get();
    if (userSnap.exists) {
      const userData = userSnap.data() as any;
      if (userData?.service?.kmHistMergedFrom === histUid) {
        ctx.logger.info("km.mergeHistoricalUser: already merged", {uid, histUid});
        return {ok: true, message: `already merged histUid=${histUid}`};
      }
    }

    // 2. Pobierz wszystkie km_logs dla histUid
    const logsSnap = await ctx.firestore.collection("km_logs")
      .where("uid", "==", histUid)
      .get();

    if (logsSnap.empty) {
      ctx.logger.info("km.mergeHistoricalUser: no hist logs found", {uid, histUid});
      return {ok: true, message: `no hist logs for histUid=${histUid}`};
    }

    ctx.logger.info("km.mergeHistoricalUser: found hist logs", {uid, histUid, count: logsSnap.size});

    // 3. Batch-update km_logs: uid → realUid (maks 400 per batch)
    let currentBatch = ctx.firestore.batch();
    let batchCount = 0;
    const MAX_BATCH = 400;

    for (const doc of logsSnap.docs) {
      currentBatch.update(doc.ref, {
        uid,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      batchCount++;
      if (batchCount >= MAX_BATCH) {
        await currentBatch.commit();
        ctx.logger.info("km.mergeHistoricalUser: batch committed", {batchCount});
        currentBatch = ctx.firestore.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) {
      await currentBatch.commit();
      ctx.logger.info("km.mergeHistoricalUser: final batch committed", {batchCount});
    }

    // 4. Usuń stary km_user_stats/{histUid} (bezpieczne jeśli nie istnieje)
    await ctx.firestore.collection("km_user_stats").doc(histUid).delete();
    ctx.logger.info("km.mergeHistoricalUser: deleted hist stats doc", {histUid});

    // 5. Zapisz marker ukończenia na users_active/{uid}
    await ctx.firestore.collection("users_active").doc(uid).set(
      {
        "service.kmHistMergedFrom": histUid,
        "service.kmHistMergedAt": admin.firestore.Timestamp.now(),
      },
      {merge: true}
    );

    // 6. Enqueue km.rebuildUserStats dla realUid
    const rebuildJobId = `km-rebuild:${uid}`;
    const rebuildJobRef = ctx.firestore.collection("service_jobs").doc(rebuildJobId);
    const now = admin.firestore.Timestamp.now();

    await ctx.firestore.runTransaction(async (tx) => {
      const ex = await tx.get(rebuildJobRef);
      if (ex.exists) {
        const s = String((ex.data() as any)?.status || "");
        if (s === "queued" || s === "running") {
          ctx.logger.info("km.mergeHistoricalUser: rebuild job already queued", {uid});
          return;
        }
      }
      tx.set(rebuildJobRef, {
        taskId: "km.rebuildUserStats",
        payload: {uid},
        status: "queued",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        nextRunAt: now,
        lockOwner: null,
        lockedUntil: null,
      });
    });

    ctx.logger.info("km.mergeHistoricalUser: done", {uid, histUid, logsCount: logsSnap.size});

    return {
      ok: true,
      message: `merged histUid=${histUid} logsCount=${logsSnap.size}`,
      details: {uid, histUid, logsCount: logsSnap.size},
    };
  },
};
