import type {Request, Response} from "express";
import {listUpcomingSessions, getUserEnrollments, getActiveKarnet, getUserKarnety} from "../modules/basen/basen_service";

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

      const [sessions, userEnrollments, activeKarnet, karnety] = await Promise.all([
        listUpcomingSessions(deps.db),
        getUserEnrollments(deps.db, uid),
        getActiveKarnet(deps.db, uid),
        getUserKarnety(deps.db, uid),
      ]);

      const enrolledSessionIds = new Set(userEnrollments.map((e) => e.sessionId));
      const enrollmentBySessionId = Object.fromEntries(
        userEnrollments.map((e) => [e.sessionId, e])
      );

      const sessionsWithStatus = sessions.map((s) => ({
        id: s.id,
        date: s.date,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
        capacity: s.capacity,
        enrolledCount: s.enrolledCount,
        instructorName: s.instructorName,
        notes: s.notes,
        status: s.status,
        userEnrolled: enrolledSessionIds.has(s.id),
        userEnrollmentId: enrollmentBySessionId[s.id]?.id || null,
        userPaymentType: enrollmentBySessionId[s.id]?.paymentType || null,
      }));

      res.status(200).json({
        ok: true,
        sessions: sessionsWithStatus,
        activeKarnet: activeKarnet ?
          {
            id: activeKarnet.id,
            totalEntries: activeKarnet.totalEntries,
            usedEntries: activeKarnet.usedEntries,
            remaining: activeKarnet.totalEntries - activeKarnet.usedEntries,
            status: activeKarnet.status,
          } :
          null,
        karnetyCount: karnety.filter((k) => k.status === "active").length,
      });
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
