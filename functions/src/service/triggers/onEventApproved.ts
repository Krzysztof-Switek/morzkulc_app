import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getServiceConfig } from "../service_config";

function jobIdForNotifyNew(eventId: string) {
  return `events-notify-new:${eventId}`;
}

function jobIdForNotifyKierownik(eventId: string, uid: string) {
  return `events-notify-kierownik:${eventId}:${uid}`;
}

/**
 * Impreza staje się „nowa" (publicznie widoczna) w momencie, gdy `approved`
 * przechodzi na true — nie w momencie zgłoszenia (zgłoszenia startują jako
 * approved:false, patrz submitEventHandler.ts). Deterministyczny jobId
 * zapewnia, że mail „nowa impreza" wysyłamy dokładnie raz na całe życie
 * imprezy, nawet jeśli `approved` później mignie false→true ponownie
 * (np. po removed_from_sheet i ponownym dodaniu do arkusza).
 *
 * Mail do kierownika o objęciu funkcji jest niezależny od tego — impreza
 * klubowa może zyskać KOLEJNEGO kierownika już po zatwierdzeniu (arkusz:
 * kolumna "Kierownik" dopuszcza kilka e-maili oddzielonych przecinkiem,
 * zarząd dopisuje uprawnienia z poziomu arkusza). Dlatego liczymy różnicę
 * `kierownikUids` (before→after) niezależnie od przejścia approved, z jobId
 * per (eventId, uid) — każda osoba dostaje maila dokładnie raz na czas
 * bycia kierownikiem tej konkretnej imprezy.
 */
export const onEventApproved = onDocumentWritten(
  { document: "events/{eventId}" },
  async (event) => {
    const eventId = event.params.eventId as string;

    const before = event.data?.before?.exists ? (event.data.before.data() as any) : null;
    const after = event.data?.after?.exists ? (event.data.after.data() as any) : null;
    if (!after) return;

    const wasApprovedActive = before?.approved === true && before?.rejected !== true;
    const isApprovedActiveNow = after?.approved === true && after?.rejected !== true;

    const cfg = getServiceConfig();
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    if (!wasApprovedActive && isApprovedActiveNow) {
      console.log("events: approved false->true -> enqueue notify job", { eventId });

      const jobRef = db.collection(cfg.jobsCollection).doc(jobIdForNotifyNew(eventId));
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

    // Mail do kierownika o objęciu funkcji — tylko dla imprez klubowych
    // (organizer==="morzkulc"), tylko dla UID-ów NOWYCH względem stanu sprzed
    // zapisu (jeśli impreza nie była wcześniej aktywna/zatwierdzona, wszyscy
    // obecni kierownicy liczą się jako nowi).
    if (isApprovedActiveNow && after?.organizer === "morzkulc") {
      const beforeUids: string[] = wasApprovedActive && Array.isArray(before?.kierownikUids) ? before.kierownikUids : [];
      const afterUids: string[] = Array.isArray(after?.kierownikUids) ? after.kierownikUids : [];
      const newUids = afterUids.filter((uid) => !beforeUids.includes(uid));

      for (const uid of newUids) {
        const kierownikJobRef = db.collection(cfg.jobsCollection).doc(jobIdForNotifyKierownik(eventId, uid));
        await db.runTransaction(async (tx) => {
          const existing = await tx.get(kierownikJobRef);
          if (existing.exists) return;

          tx.set(kierownikJobRef, {
            taskId: "events.notifyKierownik",
            status: "queued",
            attempts: 0,
            maxAttempts: cfg.worker.maxAttempts,
            createdAt: now,
            updatedAt: now,
            nextRunAt: now,
            lockedUntil: null,
            lockOwner: null,
            payload: { eventId, uid },
          });
        });
      }
    }
  }
);
