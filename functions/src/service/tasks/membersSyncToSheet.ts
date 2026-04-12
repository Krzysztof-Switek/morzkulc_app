import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

export interface MembersSyncToSheetPayload {
  uid: string;
}

function norm(v: any): string {
  return String(v || "").trim();
}

const ROLE_LABEL_FALLBACK: Record<string, string> = {
  rola_zarzad: "Zarząd",
  rola_kr: "KR",
  rola_czlonek: "Członek",
  rola_kandydat: "Kandydat",
  rola_sympatyk: "Sympatyk",
  rola_kursant: "Kursant",
};

const STATUS_LABEL_FALLBACK: Record<string, string> = {
  status_aktywny: "Aktywny",
  status_zawieszony: "Zawieszony",
  status_skreslony: "Skreślony",
};

function roleLabel(roleKey: string, roleMappings?: Record<string, {label?: string}>): string {
  const fromSetup = roleMappings?.[roleKey]?.label;
  if (fromSetup) return String(fromSetup);
  return ROLE_LABEL_FALLBACK[roleKey] || roleKey || "";
}

function statusLabel(statusKey: string, statusMappings?: Record<string, {label?: string}>): string {
  const fromSetup = statusMappings?.[statusKey]?.label;
  if (fromSetup) return String(fromSetup);
  return STATUS_LABEL_FALLBACK[statusKey] || statusKey || "";
}

function formatDatePL(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function ensureMemberId(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<number> {
  const userRef = db.collection("users_active").doc(uid);
  const counterRef = db.collection("counters").doc("members");

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("users_active missing for uid=" + uid);

    const data = userSnap.data() as any;
    const existingId = Number(data?.memberId || 0);
    if (existingId > 0) return existingId;

    const counterSnap = await tx.get(counterRef);
    let nextId = 1;
    if (counterSnap.exists) {
      const c = counterSnap.data() as any;
      const stored = Number(c?.nextId || 1);
      nextId = stored > 0 ? stored : 1;
    }

    tx.set(userRef, {memberId: nextId, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
    tx.set(counterRef, {nextId: nextId + 1}, {merge: true});

    return nextId;
  });
}

export const membersSyncToSheetTask: ServiceTask<MembersSyncToSheetPayload> = {
  id: "members.syncToSheet",
  description: "Sync single member to Google Sheets members tab (upsert by member ID).",

  validate: (payload) => {
    if (!payload?.uid || typeof payload.uid !== "string" || !payload.uid.trim()) {
      throw new Error("Invalid uid in payload");
    }
  },

  run: async (payload, ctx) => {
    const {firestore, logger} = ctx;
    const cfg = getServiceConfig();
    const uid = norm(payload.uid);

    logger.info("membersSyncToSheet: start", {uid});

    const snap = await firestore.collection("users_active").doc(uid).get();
    if (!snap.exists) {
      logger.warn("membersSyncToSheet: user not found - skip", {uid});
      return {ok: true, message: "User not found in users_active - skipped"};
    }

    const data = snap.data() as any;
    const email = norm(data?.email).toLowerCase();
    const profile = data?.profile || {};
    const roleKey = norm(data?.role_key);
    const statusKey = norm(data?.status_key);

    const firstName = norm(profile?.firstName);
    const lastName = norm(profile?.lastName);
    const nickname = norm(profile?.nickname);
    const phone = norm(profile?.phone);
    const dateOfBirth = norm(profile?.dateOfBirth);
    const consentRodo = profile?.consentRodo === true;
    const consentStatute = profile?.consentStatute === true;

    if (!email || !firstName || !lastName || !phone || !dateOfBirth) {
      logger.info("membersSyncToSheet: profile incomplete - skip", {uid, email: !!email, firstName: !!firstName, lastName: !!lastName, phone: !!phone, dateOfBirth: !!dateOfBirth});
      return {ok: true, message: "Profile incomplete - skipped"};
    }
    if (!consentRodo || !consentStatute) {
      logger.info("membersSyncToSheet: consents missing - skip", {uid});
      return {ok: true, message: "Consents not given - skipped"};
    }

    const memberId = await ensureMemberId(firestore, uid);
    logger.info("membersSyncToSheet: memberId resolved", {uid, memberId});

    // Odczyt setup/app dla etykiet ról i statusów (opcjonalny — fallback na wartości domyślne)
    const setupSnap = await firestore.collection("setup").doc("app").get();
    const setupData = setupSnap.exists ? (setupSnap.data() as any) : null;
    const roleMappings = setupData?.roleMappings as Record<string, {label?: string}> | undefined;
    const statusMappings = setupData?.statusMappings as Record<string, {label?: string}> | undefined;

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);

    const createdAt = toDateSafe(data?.createdAt) || new Date();
    const registrationDatePL = formatDatePL(createdAt);

    const patch: Record<string, any> = {
      "ID": String(memberId),
      "e-mail": email,
      "imię": firstName,
      "nazwisko": lastName,
      "ksywa": nickname,
      "telefon": phone,
      "data urodzenia": dateOfBirth,
      "Rola": roleLabel(roleKey, roleMappings),
      "Status": statusLabel(statusKey, statusMappings),
      "Zgody RODO": "TAK",
      "data rejestracji": registrationDatePL,
    };

    const result = await sheets.upsertMemberRowById(
      {spreadsheetId: cfg.sheets.membersSpreadsheetId, tabName: cfg.sheets.membersTabName},
      patch
    );

    await firestore.collection("users_active").doc(uid).update({
      "service.sheetSyncedAt": admin.firestore.FieldValue.serverTimestamp(),
      "service.sheetRowNumber": result.rowNumber,
      "service.sheetAction": result.action,
      "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("membersSyncToSheet: done", {uid, memberId, rowNumber: result.rowNumber, action: result.action});
    return {ok: true, message: `Member synced to sheet (${result.action})`, details: {uid, memberId, rowNumber: result.rowNumber}};
  },
};
