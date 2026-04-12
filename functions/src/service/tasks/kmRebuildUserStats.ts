/**
 * kmRebuildUserStats.ts
 *
 * Task: km.rebuildUserStats
 *
 * Przelicza km_user_stats/{uid} od zera na podstawie wszystkich km_logs tego użytkownika.
 * Wywoływany:
 *   - manualnie przez admina po zmianie punktacji (km.rebuildRankings wywołuje ten task dla każdego uid)
 *   - opcjonalnie po imporcie historycznym dla konkretnego użytkownika
 *
 * Payload:
 *   uid: string  — Firebase UID użytkownika do przebudowy
 *   dry?: boolean — tryb podglądu (nie zapisuje)
 *
 * Zasada: nie nadpisuje danych historycznych — tylko agreguje istniejące km_logs.
 */

import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {getKmVars} from "../../modules/km/km_vars";
import {computePoints} from "../../modules/km/km_scoring";

type Payload = {
  uid: string;
  dry?: boolean;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

export const kmRebuildUserStatsTask: ServiceTask<Payload> = {
  id: "km.rebuildUserStats",
  description: "Przelicza km_user_stats/{uid} od zera z km_logs (ON WRITE rebuild po zmianie punktacji).",

  validate: (payload) => {
    if (!payload?.uid) throw new Error("Missing uid in payload");
  },

  run: async (payload, ctx) => {
    const uid = norm(payload.uid);
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    ctx.logger.info("km.rebuildUserStats: start", {uid, dryRun});

    // Pobierz aktualne vars punktacji
    const vars = await getKmVars(ctx.firestore);
    const currentYear = String(new Date().getFullYear());

    // Pobierz wszystkie km_logs dla użytkownika
    const logsSnap = await ctx.firestore.collection("km_logs")
      .where("uid", "==", uid)
      .orderBy("date", "asc")
      .get();

    if (logsSnap.empty) {
      ctx.logger.info("km.rebuildUserStats: no logs found", {uid});
      return {ok: true, message: "No logs found for uid", details: {uid, logsCount: 0}};
    }

    // Pobierz snapshot użytkownika
    const userSnap = await ctx.firestore.collection("users_active").doc(uid).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : null;
    const profile = userData?.profile || {};
    const displayName = norm(profile?.firstName + " " + profile?.lastName) || norm(userData?.email);
    const nickname = norm(profile?.nickname);

    // Akumuluj agregaty
    let allTimeKm = 0;
    let allTimeHours = 0;
    let allTimeDays = 0;
    let allTimePoints = 0;
    let allTimeLogs = 0;
    let allTimeCapsizeKabina = 0;
    let allTimeCapsizeRolka = 0;
    let allTimeCapsizeDziubek = 0;
    let yearKm = 0;
    let yearHours = 0;
    let yearDays = 0;
    let yearPoints = 0;
    let yearLogs = 0;

    // Przelicz punkty dla każdego wpisu i aktualizuj go w Firestore
    const batch = ctx.firestore.batch();
    let batchCount = 0;
    const MAX_BATCH = 400;

    const flushBatch = async () => {
      if (batchCount > 0 && !dryRun) {
        await batch.commit();
        ctx.logger.info("km.rebuildUserStats: batch committed", {batchCount});
      }
    };

    for (const doc of logsSnap.docs) {
      const log = doc.data() as any;
      const logYear = String(log.year || log.date?.slice(0, 4) || "");

      // Przelicz punkty według aktualnych vars
      const capsizeRolls = {
        kabina: Math.max(0, parseInt(log.capsizeRolls?.kabina || "0", 10)),
        rolka: Math.max(0, parseInt(log.capsizeRolls?.rolka || "0", 10)),
        dziubek: Math.max(0, parseInt(log.capsizeRolls?.dziubek || "0", 10)),
      };

      const scoring = computePoints(capsizeRolls, vars);

      // Akumuluj all-time
      allTimeKm += log.km || 0;
      allTimeHours += log.hoursOnWater || 0;
      allTimeDays += 1;
      allTimePoints += scoring.pointsTotal;
      allTimeLogs += 1;
      allTimeCapsizeKabina += capsizeRolls.kabina;
      allTimeCapsizeRolka += capsizeRolls.rolka;
      allTimeCapsizeDziubek += capsizeRolls.dziubek;

      // Akumuluj bieżący rok
      if (logYear === currentYear) {
        yearKm += log.km || 0;
        yearHours += log.hoursOnWater || 0;
        yearDays += 1;
        yearPoints += scoring.pointsTotal;
        yearLogs += 1;
      }

      // Zaktualizuj pointsTotal/pointsBreakdown w samym logu
      if (!dryRun) {
        batch.update(doc.ref, {
          pointsTotal: scoring.pointsTotal,
          pointsBreakdown: scoring.pointsBreakdown,
          scoringVersion: scoring.scoringVersion,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        batchCount++;

        if (batchCount >= MAX_BATCH) {
          await flushBatch();
          batchCount = 0;
        }
      }
    }

    await flushBatch();

    // Zapisz nowe agregaty do km_user_stats
    const statsData = {
      uid,
      displayName,
      nickname,
      allTimeKm: Math.round(allTimeKm * 100) / 100,
      allTimeHours: Math.round(allTimeHours * 100) / 100,
      allTimeDays,
      allTimePoints: Math.round(allTimePoints * 100) / 100,
      allTimeLogs,
      allTimeCapsizeKabina,
      allTimeCapsizeRolka,
      allTimeCapsizeDziubek,
      yearKey: currentYear,
      yearKm: Math.round(yearKm * 100) / 100,
      yearHours: Math.round(yearHours * 100) / 100,
      yearDays,
      yearPoints: Math.round(yearPoints * 100) / 100,
      yearLogs,
      seasonKey: currentYear,
      seasonKm: Math.round(yearKm * 100) / 100,
      seasonHours: Math.round(yearHours * 100) / 100,
      seasonDays: yearDays,
      seasonPoints: Math.round(yearPoints * 100) / 100,
      seasonLogs: yearLogs,
      scoringVersion: vars.scoringVersion,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    ctx.logger.info("km.rebuildUserStats: stats computed", {
      uid, allTimeKm, allTimeLogs, yearKm, yearLogs, dryRun,
    });

    if (!dryRun) {
      await ctx.firestore.collection("km_user_stats").doc(uid).set(statsData, {merge: false});
    }

    return {
      ok: true,
      message: `ok uid=${uid} logs=${allTimeLogs} allTimeKm=${allTimeKm} yearKm=${yearKm}`,
      details: {uid, logsCount: allTimeLogs, allTimeKm, yearKm, dryRun},
    };
  },
};
