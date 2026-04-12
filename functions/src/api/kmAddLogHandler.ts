/**
 * kmAddLogHandler.ts
 *
 * POST /kmAddLog
 *
 * Dodaje nowy wpis aktywności do modułu Kilometrówka.
 * Oblicza punkty ON WRITE po stronie backendu.
 * Aktualizuje agregaty użytkownika (km_user_stats).
 *
 * Body:
 *   date: string               — "YYYY-MM-DD", wymagane, nie z przyszłości
 *   waterType: string          — enum: mountains|lowlands|sea|track|pool|playspot
 *   placeName: string          — nazwa akwenu (canonical lub raw), wymagane
 *   placeNameRaw?: string      — raw input, jeśli różny od placeName
 *   placeId?: string           — ID z km_places (jeśli wybrano z podpowiedzi)
 *   km: number                 — kilometry, > 0, <= 9999
 *   hoursOnWater?: number      — godziny na wodzie, >= 0
 *   activityType?: string      — typ aktywności
 *   difficultyScale?: string   — "WW"|"U" — wymagane dla mountains/lowlands, null dla reszty
 *   difficulty?: string        — "WW3", "U2", itp. — wymagane jeśli difficultyScale podane
 *   capsizeRolls?: {kabina, rolka, dziubek} — wywrotolotek (całkowite, >= 0)
 *   sectionDescription?: string
 *   note?: string
 */

import type {Request, Response} from "express";
import {getKmVars} from "../modules/km/km_vars";
import {addKmLog} from "../modules/km/km_log_service";
import {upsertKmPlace} from "../modules/km/km_places_service";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type KmAddLogDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
};

const VALID_WATER_TYPES = new Set([
  "mountains", "lowlands", "sea", "track", "pool", "playspot",
]);

const WATER_TYPES_WITH_DIFFICULTY = new Set(["mountains", "lowlands"]);

const VALID_DIFFICULTY_WW = new Set(["WW1", "WW2", "WW3", "WW4", "WW5"]);
const VALID_DIFFICULTY_U = new Set(["U1", "U2", "U3"]);

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toSafeInt(v: any): number {
  const n = parseInt(String(v || "0"), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function toSafeFloat(v: any): number {
  const n = parseFloat(String(v || "0"));
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export async function handleKmAddLog(
  req: Request,
  res: Response,
  deps: KmAddLogDeps
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
      // 1. Token
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }
      const uid = tokenCheck.decoded.uid;

      // 2. Pobierz profil użytkownika dla snapshotu
      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({error: "Użytkownik nie znaleziony."});
        return;
      }
      const userData = userSnap.data() as any;
      const profile = userData?.profile || {};
      const userSnapshot = {
        displayName: norm(userData?.profile?.firstName + " " + userData?.profile?.lastName) ||
          norm(tokenCheck.decoded.name) ||
          norm(tokenCheck.decoded.email),
        nickname: norm(profile?.nickname),
        email: norm(userData?.email || tokenCheck.decoded.email),
      };

      // 3. Walidacja body
      const body = (req.body || {}) as any;
      const date = norm(body.date);
      const waterType = norm(body.waterType);
      const placeName = norm(body.placeName).slice(0, 200);
      const placeNameRaw = norm(body.placeNameRaw || body.placeName).slice(0, 200);
      const placeId = norm(body.placeId) || undefined;
      const kmRaw = toSafeFloat(body.km);
      const hoursOnWater = body.hoursOnWater != null ? toSafeFloat(body.hoursOnWater) : undefined;
      const activityType = norm(body.activityType) || undefined;
      const difficultyScale = norm(body.difficultyScale) || null;
      const difficulty = norm(body.difficulty) || null;
      const sectionDescription = norm(body.sectionDescription).slice(0, 500) || undefined;
      const note = norm(body.note).slice(0, 1000) || undefined;

      const capsizeRolls = {
        kabina: toSafeInt(body.capsizeRolls?.kabina),
        rolka: toSafeInt(body.capsizeRolls?.rolka),
        dziubek: toSafeInt(body.capsizeRolls?.dziubek),
      };

      const lat = body.lat != null ? parseFloat(String(body.lat)) : undefined;
      const lng = body.lng != null ? parseFloat(String(body.lng)) : undefined;

      // Walidacja date
      if (!isIsoDate(date)) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowy format daty (wymagane YYYY-MM-DD)."});
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (date > today) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Data nie może być z przyszłości."});
        return;
      }

      // Walidacja waterType
      if (!VALID_WATER_TYPES.has(waterType)) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowy typ akwenu."});
        return;
      }

      // Walidacja placeName
      if (!placeName) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Nazwa akwenu jest wymagana."});
        return;
      }

      // Walidacja km
      if (kmRaw <= 0 || kmRaw > 9999) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Kilometry muszą być większe od 0 i nie większe niż 9999."});
        return;
      }

      // Walidacja lat/lng
      if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowa szerokość geograficzna (lat)."});
        return;
      }
      if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) {
        res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowa długość geograficzna (lng)."});
        return;
      }

      // Walidacja trudności — logika warunkowa
      if (WATER_TYPES_WITH_DIFFICULTY.has(waterType)) {
        // mountains: tylko WW, lowlands: tylko U
        if (waterType === "mountains") {
          if (difficultyScale && difficultyScale !== "WW") {
            res.status(400).json({ok: false, code: "validation_failed", message: "Dla gór wymagana skala WW."});
            return;
          }
          if (difficultyScale === "WW" && difficulty && !VALID_DIFFICULTY_WW.has(difficulty)) {
            res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowy poziom WW (WW1–WW5)."});
            return;
          }
        }
        if (waterType === "lowlands") {
          if (difficultyScale && difficultyScale !== "U") {
            res.status(400).json({ok: false, code: "validation_failed", message: "Dla nizin wymagana skala U."});
            return;
          }
          if (difficultyScale === "U" && difficulty && !VALID_DIFFICULTY_U.has(difficulty)) {
            res.status(400).json({ok: false, code: "validation_failed", message: "Nieprawidłowy poziom U (U1–U3)."});
            return;
          }
        }
      } else {
        // Dla sea/track/pool/playspot — skala trudności nie może być podana
        if (difficulty) {
          res.status(400).json({ok: false, code: "validation_failed", message: "Skala trudności nie dotyczy wybranego typu akwenu."});
          return;
        }
      }

      // 4. Pobierz konfigurację punktacji
      const vars = await getKmVars(deps.db);

      // 5. Upsert place w słowniku
      let resolvedPlaceId: string | undefined;
      try {
        resolvedPlaceId = await upsertKmPlace(deps.db, {
          placeId,
          name: placeName,
          waterType,
          lat,
          lng,
        });
      } catch {
        // Błąd słownika nie blokuje zapisu wpisu
      }

      // 6. Zapisz wpis
      const logId = await addKmLog(deps.db, {
        uid,
        userSnapshot,
        date,
        waterType: waterType as any,
        placeName,
        placeNameRaw,
        placeId: resolvedPlaceId,
        lat,
        lng,
        sectionDescription,
        km: kmRaw,
        hoursOnWater,
        activityType,
        difficultyScale: difficultyScale as any,
        difficulty,
        capsizeRolls,
        note,
      }, vars);

      res.status(200).json({ok: true, logId});
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
