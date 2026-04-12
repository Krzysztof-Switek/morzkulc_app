import {todayIsoUTC, isIsoDateYYYYMMDD} from "./calendar_utils";

const COLLECTION = "events";

function norm(s: any): string {
  return String(s || "").trim();
}

export type EventRecord = {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  location: string;
  description: string;
  contact: string;
  link: string;
  approved: boolean;
  source: "app" | "sheet";
  userUid?: string;
  userEmail?: string;
  createdAt: any;
  updatedAt: any;
  sheetRowNumber?: number;
  sheetSyncedAt?: any;
};

export async function listUpcomingEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const todayIso = todayIsoUTC();

  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .where("endDate", ">=", todayIso)
    .orderBy("endDate", "asc")
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

/**
 * Zwraca imprezy które się zaczęły (startDate <= dziś) i nie zakończyły dawniej niż 30 dni temu.
 * Używane przez dropdown w formularzu km — krótka lista, tylko bieżące i niedawne.
 */
export async function listRecentEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const todayIso = todayIsoUTC();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .where("endDate", ">=", thirtyDaysAgo)
    .orderBy("endDate", "asc")
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .filter((e) => String(e.startDate) <= todayIso)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
}

/**
 * Zwraca wszystkie zatwierdzone imprezy bez filtra daty, posortowane startDate DESC.
 * Używane przez zakładkę „Imprezy" w km module.
 */
export async function listAllEvents(db: FirebaseFirestore.Firestore): Promise<EventRecord[]> {
  const snap = await db
    .collection(COLLECTION)
    .where("approved", "==", true)
    .get();

  return snap.docs
    .map((d) => d.data() as EventRecord)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
}

export async function createEvent(
  db: FirebaseFirestore.Firestore,
  args: {
    uid: string;
    email: string;
    startDate: string;
    endDate: string;
    name: string;
    location: string;
    description: string;
    contact: string;
    link: string;
  }
): Promise<{ok: true; eventId: string} | {ok: false; code: string; message: string}> {
  if (!isIsoDateYYYYMMDD(args.startDate) || !isIsoDateYYYYMMDD(args.endDate)) {
    return {ok: false, code: "validation_failed", message: "Invalid dates"};
  }
  if (args.startDate > args.endDate) {
    return {ok: false, code: "validation_failed", message: "startDate must be <= endDate"};
  }
  if (!norm(args.name)) {
    return {ok: false, code: "validation_failed", message: "Missing name"};
  }
  if (!norm(args.location)) {
    return {ok: false, code: "validation_failed", message: "Missing location"};
  }

  const ref = db.collection(COLLECTION).doc();
  const now = new Date();

  const doc: EventRecord = {
    id: ref.id,
    startDate: args.startDate,
    endDate: args.endDate,
    name: norm(args.name),
    location: norm(args.location),
    description: norm(args.description),
    contact: norm(args.contact),
    link: norm(args.link),
    approved: false,
    source: "app",
    userUid: args.uid,
    userEmail: args.email,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(doc);
  return {ok: true, eventId: ref.id};
}
