import * as admin from "firebase-admin";
import { runTaskById } from "../runner";
import { getServiceConfig } from "../service_config";

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function errInfo(err: any) {
  return {
    message: err?.message || String(err),
    code: err?.code,
    stack: err?.stack,
  };
}

export async function processJobDoc(
  jobRef: FirebaseFirestore.DocumentReference,
  lockOwner: string
): Promise<void> {
  const cfg = getServiceConfig();
  const db = admin.firestore();

  const now = new Date();
  const lockUntil = admin.firestore.Timestamp.fromDate(
    addSeconds(now, cfg.worker.eventLockSeconds)
  );

  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(jobRef);
    const data = fresh.data() as any;
    if (!data) return false;

    if (data.status !== "queued") return false;

    if (data.nextRunAt && data.nextRunAt.toDate && data.nextRunAt.toDate() > now) return false;
    if (data.lockedUntil && data.lockedUntil.toDate && data.lockedUntil.toDate() > now) return false;

    tx.update(jobRef, {
      status: "running",
      lockedUntil: lockUntil,
      lockOwner,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return true;
  });

  if (!claimed) return;

  // refresh job after claim
  const snap = await jobRef.get();
  const job = snap.data() as any;
  if (!job) return;

  let result;
  try {
    result = await runTaskById(String(job.taskId), job.payload, { dryRun: false });
  } catch (err: any) {
    // runTaskById powinien zwrócić ok:false, ale gdyby coś poleciało wyżej:
    console.error("processJobDoc: runTaskById threw", { jobPath: jobRef.path, ...errInfo(err) });
    result = { ok: false, message: (err?.message || String(err)).slice(0, 500) };
  }

  if (result.ok) {
    try {
      await jobRef.update({
        status: "done",
        updatedAt: admin.firestore.Timestamp.now(),
        lockedUntil: null,
        lockOwner: null,
        lastError: null,
      });
    } catch (err: any) {
      console.error("processJobDoc: FAILED to persist DONE", {
        jobPath: jobRef.path,
        ...errInfo(err),
      });
      // nie rzucamy dalej – żeby nie robić pętli
    }
    return;
  }

  const attempts = Number(job.attempts || 0) + 1;
  const maxAttempts = Number(job.maxAttempts || cfg.worker.maxAttempts);
  const backoff =
    cfg.worker.backoffSeconds[Math.min(attempts - 1, cfg.worker.backoffSeconds.length - 1)] || 300;
  const nextRunAt = admin.firestore.Timestamp.fromDate(addSeconds(new Date(), backoff));
  const newStatus = attempts >= maxAttempts ? "dead" : "queued";

  try {
    await jobRef.update({
      status: newStatus,
      attempts,
      nextRunAt,
      updatedAt: admin.firestore.Timestamp.now(),
      lockedUntil: null,
      lockOwner: null,
      lastError: {
        message: (result.message || "unknown").slice(0, 500),
        at: admin.firestore.Timestamp.now(),
      },
    });
  } catch (err: any) {
    console.error("processJobDoc: FAILED to persist FAILED/RETRY state", {
      jobPath: jobRef.path,
      desiredStatus: newStatus,
      attempts,
      nextRunAt: nextRunAt.toDate().toISOString(),
      ...errInfo(err),
    });

    // awaryjnie: zdejmij lock, żeby nie zablokować joba na długo
    try {
      await jobRef.update({
        lockedUntil: null,
        lockOwner: null,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    } catch (e2: any) {
      console.error("processJobDoc: FAILED to clear lock after persist error", {
        jobPath: jobRef.path,
        ...errInfo(e2),
      });
    }
  }
}
