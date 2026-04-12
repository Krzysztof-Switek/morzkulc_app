/**
 * km_scoring.ts
 *
 * Czyste funkcje obliczania punktów dla modułu Kilometrówka.
 * Punkty obliczane ON WRITE — nigdy ON READ.
 *
 * Punkty przyznawane wyłącznie za wywrotolotek (przygody):
 *   kabina, rolka, dziubek
 * Kilometry i godziny są zapisywane jako liczniki — bez przeliczenia na punkty.
 */

import {KmVars} from "./km_vars";

export type CapsizeRolls = {
  kabina: number;
  rolka: number;
  dziubek: number;
};

export type PointsBreakdown = {
  capsizeRolls: number;
};

export type ScoringResult = {
  pointsTotal: number;
  pointsBreakdown: PointsBreakdown;
  scoringVersion: string;
};

export function computePoints(
  capsizeRolls: CapsizeRolls,
  vars: KmVars
): ScoringResult {
  const kabina = Math.max(0, Math.round(capsizeRolls.kabina || 0));
  const rolka = Math.max(0, Math.round(capsizeRolls.rolka || 0));
  const dziubek = Math.max(0, Math.round(capsizeRolls.dziubek || 0));

  const rollsPts = kabina * vars.ptsKabina + rolka * vars.ptsEskimoska + dziubek * vars.ptsDziubek;

  return {
    pointsTotal: Math.round(rollsPts * 100) / 100,
    pointsBreakdown: {
      capsizeRolls: Math.round(rollsPts * 100) / 100,
    },
    scoringVersion: vars.scoringVersion,
  };
}

/**
 * Zwraca aktualny rok (YYYY) dla daty w formacie "YYYY-MM-DD".
 */
export function getYearFromDate(date: string): number {
  return parseInt(date.slice(0, 4), 10) || new Date().getFullYear();
}

/**
 * W MVP sezon = rok.
 */
export function getSeasonKeyFromDate(date: string): string {
  return date.slice(0, 4);
}
