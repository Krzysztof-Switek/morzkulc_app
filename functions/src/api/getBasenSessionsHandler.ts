import type {Request, Response} from "express";
import {listUpcomingSessions, getUserEnrollments} from "../modules/basen/basen_service";

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

      const [sessions, userEnrollments] = await Promise.all([
        listUpcomingSessions(deps.db),
        getUserEnrollments(deps.db, uid),
      ]);

      const enrollmentByKey = new Map(userEnrollments.map((e) => [`${e.sessionId}_${e.slot}`, e]));

      const sessionsWithStatus = sessions.map((s) => {
        const slots: Record<string, any> = {};
        for (const [label, slot] of Object.entries(s.slots || {})) {
          if (!slot) continue;
          const enrollment = enrollmentByKey.get(`${s.id}_${label}`) || null;
          slots[label] = {
            timeStart: slot.timeStart,
            timeEnd: slot.timeEnd,
            capacity: slot.capacity,
            enrolledCount: slot.enrolledCount,
            status: slot.status,
            userEnrolled: Boolean(enrollment),
            userEnrollmentType: enrollment?.type || null,
            userKayakId: enrollment?.kayakId || null,
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
