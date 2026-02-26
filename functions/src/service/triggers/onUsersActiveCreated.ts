import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getServiceConfig } from "../service_config";

function jobIdForWelcome(uid: string) {
  return `welcome:${uid}`;
}

export const onUsersActiveCreated = onDocumentCreated(
  { document: "users_active/{uid}" },
  async (event) => {
    const uid = event.params.uid as string;
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as any;
    const email = (data?.email || data?.user?.email || "").toString().trim().toLowerCase();
    const displayName = (data?.displayName || data?.user?.displayName || null) as string | null;

    console.log("users_active created -> enqueue welcome job", { uid });

    if (!email.includes("@")) {
      console.warn("Missing email in users_active; skip enqueue", { uid });
      return;
    }

    const cfg = getServiceConfig();
    const db = admin.firestore();
    const jobRef = db.collection(cfg.jobsCollection).doc(jobIdForWelcome(uid));
    const now = admin.firestore.Timestamp.now();

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(jobRef);
      if (existing.exists) return;

      tx.set(jobRef, {
        taskId: "onUserRegistered.welcome",
        status: "queued",
        attempts: 0,
        maxAttempts: cfg.worker.maxAttempts,
        createdAt: now,
        updatedAt: now,
        nextRunAt: now,
        lockedUntil: null,
        lockOwner: null,
        payload: { uid, email, displayName },
      });
    });
  }
);
