/**
 * km_log_service.ts
 *
 * Logika zapisu wpisów aktywności (km_logs) i aktualizacji agregatów użytkownika (km_user_stats).
 *
 * Zasady:
 * - Punkty obliczane ON WRITE przez computePoints() z km_scoring.ts
 * - km_user_stats/{uid} aktualizowane atomicznie po każdym zapisie
 * - Dane historyczne traktowane jak append-only — brak nadpisywania
 */

import * as admin from "firebase-admin";
import {computePoints, CapsizeRolls, getYearFromDate, getSeasonKeyFromDate} from "./km_scoring";
import {KmVars} from "./km_vars";

export type WaterType = "mountains" | "lowlands" | "sea" | "track" | "pool" | "playspot";

export type KmLogInput = {
  uid: string;
  userSnapshot: {displayName: string; nickname: string; email: string};
  date: string; // "YYYY-MM-DD"
  waterType: WaterType;
  placeName: string; // canonical
  placeNameRaw: string; // raw input
  placeId?: string;
  lat?: number; // WGS84 — z km_places lub pinu użytkownika
  lng?: number; // WGS84
  sectionDescription?: string;
  km: number;
  hoursOnWater?: number;
  activityType?: string;
  difficultyScale?: "WW" | "U" | null;
  difficulty?: string | null; // "WW3", "U2", null, itd.
  capsizeRolls: CapsizeRolls;
  note?: string;
};

export type KmLog = KmLogInput & {
  logId: string;
  sourceType: "runtime";
  schemaVersion: 1;
  isPartial: false;
  year: number;
  seasonKey: string;
  pointsTotal: number;
  pointsBreakdown: {capsizeRolls: number};
  scoringVersion: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
};

/**
 * Dodaje nowy wpis aktywności do km_logs i aktualizuje km_user_stats.
 * Zwraca ID nowo zapisanego dokumentu.
 */
export async function addKmLog(
  db: FirebaseFirestore.Firestore,
  input: KmLogInput,
  vars: KmVars
): Promise<string> {
  const year = getYearFromDate(input.date);
  const seasonKey = getSeasonKeyFromDate(input.date);
  const scoring = computePoints(input.capsizeRolls, vars);

  const logRef = db.collection("km_logs").doc();
  const now = admin.firestore.Timestamp.now();

  const logDoc: Record<string, any> = {
    logId: logRef.id,
    sourceType: "runtime",
    schemaVersion: 1,
    isPartial: false,
    uid: input.uid,
    userSnapshot: input.userSnapshot,
    date: input.date,
    year,
    seasonKey,
    waterType: input.waterType,
    placeName: input.placeName,
    placeNameRaw: input.placeNameRaw,
    km: input.km,
    capsizeRolls: {
      kabina: Math.max(0, Math.round(input.capsizeRolls.kabina || 0)),
      rolka: Math.max(0, Math.round(input.capsizeRolls.rolka || 0)),
      dziubek: Math.max(0, Math.round(input.capsizeRolls.dziubek || 0)),
    },
    pointsTotal: scoring.pointsTotal,
    pointsBreakdown: scoring.pointsBreakdown,
    scoringVersion: scoring.scoringVersion,
    createdAt: now,
    updatedAt: now,
  };

  // Opcjonalne pola — nie zapisuj undefined
  if (input.placeId) logDoc.placeId = input.placeId;
  if (input.lat != null) logDoc.lat = input.lat;
  if (input.lng != null) logDoc.lng = input.lng;
  if (input.sectionDescription) logDoc.sectionDescription = input.sectionDescription;
  if (input.hoursOnWater != null) logDoc.hoursOnWater = input.hoursOnWater;
  if (input.activityType) logDoc.activityType = input.activityType;
  if (input.difficultyScale) logDoc.difficultyScale = input.difficultyScale;
  if (input.difficulty) logDoc.difficulty = input.difficulty;
  if (input.note) logDoc.note = input.note;

  await db.runTransaction(async (tx) => {
    tx.set(logRef, logDoc);
    await updateUserStatsInTransaction(tx, db, input.uid, input.userSnapshot, {
      km: input.km,
      hoursOnWater: input.hoursOnWater ?? 0,
      pointsTotal: scoring.pointsTotal,
      date: input.date,
      year,
      seasonKey,
      capsizeRolls: logDoc.capsizeRolls,
      scoringVersion: scoring.scoringVersion,
    });
  });

  return logRef.id;
}

type StatsIncrement = {
  km: number;
  hoursOnWater: number;
  pointsTotal: number;
  date: string;
  year: number;
  seasonKey: string;
  capsizeRolls: {kabina: number; rolka: number; dziubek: number};
  scoringVersion: string;
};

/**
 * Aktualizuje km_user_stats/{uid} w ramach istniejącej transakcji.
 * Jeśli dokument nie istnieje — tworzy go z wartościami inicjalnymi.
 */
async function updateUserStatsInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  userSnapshot: {displayName: string; nickname: string; email: string},
  inc: StatsIncrement
): Promise<void> {
  const statsRef = db.collection("km_user_stats").doc(uid);
  const statsSnap = await tx.get(statsRef);
  const existing = statsSnap.exists ? (statsSnap.data() as any) : null;

  const currentYearKey = String(new Date().getFullYear());
  const incYear = String(inc.year);
  const incSeason = inc.seasonKey;

  const isSameYear = incYear === (existing?.yearKey || currentYearKey);
  const isSameSeason = incSeason === (existing?.seasonKey || currentYearKey);

  // Jeśli rok się zmienił — nie resetujemy (agregaty są kumulatywne per aktualny rok)
  // To znaczy year/season zawsze wskazują na AKTUALNY rok — starsze rekordy trafiają tylko do all-time
  // Uproszczenie MVP: yearKey = bieżący rok, nie rok wpisu
  const activeYear = currentYearKey;
  const activeSeason = currentYearKey;
  const isCurrentYear = incYear === activeYear;

  const base = existing || {
    uid,
    displayName: userSnapshot.displayName,
    nickname: userSnapshot.nickname,
    allTimeKm: 0,
    allTimeHours: 0,
    allTimeDays: 0,
    allTimePoints: 0,
    allTimeLogs: 0,
    allTimeCapsizeKabina: 0,
    allTimeCapsizeRolka: 0,
    allTimeCapsizeDziubek: 0,
    yearKey: activeYear,
    yearKm: 0,
    yearHours: 0,
    yearDays: 0,
    yearPoints: 0,
    yearLogs: 0,
    seasonKey: activeSeason,
    seasonKm: 0,
    seasonHours: 0,
    seasonDays: 0,
    seasonPoints: 0,
    seasonLogs: 0,
    scoringVersion: inc.scoringVersion,
  };

  const update: Record<string, any> = {
    uid,
    displayName: userSnapshot.displayName,
    nickname: userSnapshot.nickname,
    allTimeKm: (base.allTimeKm || 0) + inc.km,
    allTimeHours: (base.allTimeHours || 0) + inc.hoursOnWater,
    allTimeDays: (base.allTimeDays || 0) + 1,
    allTimePoints: (base.allTimePoints || 0) + inc.pointsTotal,
    allTimeLogs: (base.allTimeLogs || 0) + 1,
    allTimeCapsizeKabina: (base.allTimeCapsizeKabina || 0) + inc.capsizeRolls.kabina,
    allTimeCapsizeRolka: (base.allTimeCapsizeRolka || 0) + inc.capsizeRolls.rolka,
    allTimeCapsizeDziubek: (base.allTimeCapsizeDziubek || 0) + inc.capsizeRolls.dziubek,
    scoringVersion: inc.scoringVersion,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Aktualizuj agregaty roku/sezonu tylko jeśli wpis dotyczy bieżącego roku
  if (isCurrentYear) {
    update.yearKey = activeYear;
    update.yearKm = (isSameYear ? (base.yearKm || 0) : 0) + inc.km;
    update.yearHours = (isSameYear ? (base.yearHours || 0) : 0) + inc.hoursOnWater;
    update.yearDays = (isSameYear ? (base.yearDays || 0) : 0) + 1;
    update.yearPoints = (isSameYear ? (base.yearPoints || 0) : 0) + inc.pointsTotal;
    update.yearLogs = (isSameYear ? (base.yearLogs || 0) : 0) + 1;
    update.seasonKey = activeSeason;
    update.seasonKm = (isSameSeason ? (base.seasonKm || 0) : 0) + inc.km;
    update.seasonHours = (isSameSeason ? (base.seasonHours || 0) : 0) + inc.hoursOnWater;
    update.seasonDays = (isSameSeason ? (base.seasonDays || 0) : 0) + 1;
    update.seasonPoints = (isSameSeason ? (base.seasonPoints || 0) : 0) + inc.pointsTotal;
    update.seasonLogs = (isSameSeason ? (base.seasonLogs || 0) : 0) + 1;
  } else {
    // Wpis historyczny (inny rok) — nie nadpisuj bieżącego roku
    update.yearKey = base.yearKey || activeYear;
    update.yearKm = base.yearKm || 0;
    update.yearHours = base.yearHours || 0;
    update.yearDays = base.yearDays || 0;
    update.yearPoints = base.yearPoints || 0;
    update.yearLogs = base.yearLogs || 0;
    update.seasonKey = base.seasonKey || activeSeason;
    update.seasonKm = base.seasonKm || 0;
    update.seasonHours = base.seasonHours || 0;
    update.seasonDays = base.seasonDays || 0;
    update.seasonPoints = base.seasonPoints || 0;
    update.seasonLogs = base.seasonLogs || 0;
  }

  tx.set(statsRef, update, {merge: false});
}

/**
 * Pobiera listę wpisów km_logs dla danego użytkownika.
 * Posortowane po dacie malejąco.
 */
export async function getUserKmLogs(
  db: FirebaseFirestore.Firestore,
  uid: string,
  limit = 50,
  afterDate?: string
): Promise<any[]> {
  let q = db.collection("km_logs")
    .where("uid", "==", uid)
    .orderBy("date", "desc")
    .limit(limit);

  if (afterDate) {
    q = q.startAfter(afterDate) as any;
  }

  const snap = await q.get();
  return snap.docs.map((d) => d.data());
}

/**
 * Pobiera agregaty użytkownika (km_user_stats).
 * Zwraca null jeśli użytkownik nie ma jeszcze żadnych wpisów.
 */
export async function getUserKmStats(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<any | null> {
  const snap = await db.collection("km_user_stats").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as any;
}
