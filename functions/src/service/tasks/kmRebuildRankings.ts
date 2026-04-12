/**
 * kmRebuildRankings.ts
 *
 * Task: km.rebuildRankings
 *
 * Przebudowuje km_user_stats dla WSZYSTKICH użytkowników którzy mają wpisy w km_logs.
 * Wywoływany przez admina po:
 *   - zmianie punktacji w setup/vars_km
 *   - imporcie historycznym (po załadowaniu danych historycznych)
 *
 * Payload:
 *   dry?: boolean — tryb podglądu (nie zapisuje)
 *
 * Implementacja: iteruje po wszystkich unikalnych uid w km_logs,
 * dla każdego enqueue-uje lub inline wywołuje km.rebuildUserStats.
 *
 * Uwaga: dla dużych zbiorów (> kilkuset użytkowników) należy rozważyć
 * paginację i osobne joby per uid. W MVP inline call jest wystarczający.
 */

import {ServiceTask} from "../types";
import {kmRebuildUserStatsTask} from "./kmRebuildUserStats";

type Payload = {
  dry?: boolean;
};

export const kmRebuildRankingsTask: ServiceTask<Payload> = {
  id: "km.rebuildRankings",
  description: "Przebudowuje km_user_stats dla wszystkich użytkowników z km_logs (po zmianie punktacji).",

  validate: (_payload) => {
    // Brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    ctx.logger.info("km.rebuildRankings: start", {dryRun});

    // Pobierz wszystkie unikalne uid z km_logs (może być duże — pobieramy tylko uid)
    // Firestore nie ma DISTINCT, więc pobieramy dokumenty i deduplikujemy
    const logsSnap = await ctx.firestore.collection("km_logs")
      .select("uid")
      .get();

    const uids = new Set<string>();
    for (const doc of logsSnap.docs) {
      const uid = String(doc.data()?.uid || "").trim();
      if (uid) uids.add(uid);
    }

    ctx.logger.info("km.rebuildRankings: unique users found", {count: uids.size, dryRun});

    let processed = 0;
    let errors = 0;

    for (const uid of uids) {
      if (uid === "historical_unmatched") {
        ctx.logger.info("km.rebuildRankings: skipping historical_unmatched");
        continue;
      }
      try {
        const result = await kmRebuildUserStatsTask.run({uid, dry: dryRun}, ctx);
        if (result.ok) {
          processed++;
        } else {
          errors++;
          ctx.logger.warn("km.rebuildRankings: rebuildUserStats failed", {uid, message: result.message});
        }
      } catch (e: any) {
        errors++;
        ctx.logger.error("km.rebuildRankings: error for uid", {uid, message: e?.message});
      }
    }

    const message = `processed=${processed}, errors=${errors}, total=${uids.size}`;
    ctx.logger.info("km.rebuildRankings: done", {processed, errors, dryRun});

    return {
      ok: errors === 0,
      message,
      details: {processed, errors, total: uids.size, dryRun},
    };
  },
};
