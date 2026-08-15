import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getServiceConfig } from "../service_config";

function jobIdForNotifyNew(eventId: string) {
  return `events-notify-new:${eventId}`;
}

/**
 * Impreza staje się „nowa" (publicznie widoczna) w momencie, gdy `approved`
 * przechodzi na true — nie w momencie zgłoszenia (zgłoszenia startują jako
 * approved:false, patrz submitEventHandler.ts). Deterministyczny jobId
 * zapewnia, że mail „nowa impreza" wysyłamy dokładnie raz na całe życie
 * imprezy, nawet jeśli `approved` później mignie false→true ponownie
 * (np. po removed_from_sheet i ponownym dodaniu do arkusza).
 */
export const onEventApproved = onDocumentWritten(
  { document: "events/{eventId}" },
  async (event) => {
    const eventId = event.params.eventId as string;

    const before = event.data?.before?.exists ? (event.data.before.data() as any) : null;
    const after = event.data?.after?.exists ? (event.data.after.data() as any) : null;
    if (!after) return;

    const wasApproved = before?.approved === true;
    const isApprovedNow = after?.approved === true;
    const isRejected = after?.rejected === true;

    if (wasApproved || !isApprovedNow || isRejected) return;

    console.log("events: approved false->true -> enqueue notify job", { eventId });

    const cfg = getServiceConfig();
    const db = admin.firestore();
    const jobRef = db.collection(cfg.jobsCollection).doc(jobIdForNotifyNew(eventId));
    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(jobRef);
      if (existing.exists) return;

      tx.set(jobRef, {
        taskId: "events.notifyNew",
        status: "queued",
        attempts: 0,
        maxAttempts: cfg.worker.maxAttempts,
        createdAt: now,
        updatedAt: now,
        nextRunAt: now,
        lockedUntil: null,
        lockOwner: null,
        payload: { eventId },
      });
    });
  }
);
