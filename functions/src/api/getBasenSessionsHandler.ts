import type {Request, Response} from "express";
import {listUpcomingSessions, getUserEnrollments, computeSlotAvailability, resolveKayakLabel, getBasenVars, sessionSlotDatetimeMs} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleGetBasenSessions(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;

      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const userData = userSnap.data() as any;
      const isKursant = String(userData?.role_key || "") === "rola_kursant";

      const [sessions, userEnrollments, vars] = await Promise.all([
        listUpcomingSessions(deps.db),
        getUserEnrollments(deps.db, uid),
        getBasenVars(deps.db),
      ]);
      const cancellationWindowMs = vars.basen_okno_anulowania_h * 60 * 60 * 1000;

      const enrollmentByKey = new Map(userEnrollments.map((e) => [`${e.sessionId}_${e.slot}`, e]));

      // Nazwa+numer wybranego kajaka zamiast surowego ID (patrz resolveKayakLabel) —
      // rozwiązywane raz dla wszystkich unikalnych ID własnych zapisów requestera.
      const kayakIds = Array.from(new Set(
        userEnrollments.map((e) => e.kayakId).filter((id): id is string => Boolean(id) && id !== "PRIVATE")
      ));
      const kayakLabels = new Map<string, string>();
      await Promise.all(kayakIds.map(async (id) => {
        kayakLabels.set(id, await resolveKayakLabel(deps.db, id));
      }));
      const resolveOwnKayakLabel = (kayakId: string | null | undefined): string | null => {
        if (!kayakId) return null;
        if (kayakId === "PRIVATE") return "Kajak prywatny";
        return kayakLabels.get(kayakId) || null;
      };

      const sessionsWithStatus = sessions.map((s) => {
        const slots: Record<string, any> = {};
        for (const [label, slot] of Object.entries(s.slots || {})) {
          if (!slot) continue;
          const enrollment = enrollmentByKey.get(`${s.id}_${label}`) || null;
          const availability = computeSlotAvailability(slot, isKursant);
          const slotMs = sessionSlotDatetimeMs(s, slot);
          slots[label] = {
            timeStart: slot.timeStart,
            timeEnd: slot.timeEnd,
            capacity: slot.capacity,
            enrolledCount: slot.enrolledCount,
            status: slot.status,
            reservedSpots: slot.reservedSpots || null,
            remaining: availability.remaining,
            isFull: availability.isFull,
            isWithinCancellationWindow: slotMs > 0 && Date.now() + cancellationWindowMs > slotMs,
            userEnrolled: Boolean(enrollment),
            userEnrollmentType: enrollment?.type || null,
            userInstructorUid: enrollment?.instructorUid || null,
            userKayakId: enrollment?.kayakId || null,
            userKayakLabel: resolveOwnKayakLabel(enrollment?.kayakId),
            userViaReservedPool: enrollment?.viaReservedPool === true,
          };
        }

        return {
          id: s.id,
          date: s.date,
          notes: s.notes,
          slots,
        };
      });

      res.status(200).json({
        ok: true,
        sessions: sessionsWithStatus,
      });
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
