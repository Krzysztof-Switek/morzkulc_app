/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import type * as admin from "firebase-admin";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

type SetupApp = {
  modules?: Record<string, any>;
  defaults?: {
    newUserRoleCode?: string;
    newUserStatusCode?: string;
    openingBalanceMemberField?: string;
    openingBalanceMemberRoleCode?: string;
  };
};

export type RegisterUserDeps = {
  db: FirebaseFirestore.Firestore;
  admin: typeof admin;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  getSetupApp: () => Promise<SetupApp | null>;
  defaultScreenForRoleKey: (roleKey: string) => string;

  // ✅ sheets sync
  syncMemberToSheet: (uid: string) => Promise<void>;
};

type ProfileInput = {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  phone?: string;

  // ✅ NEW
  dateOfBirth?: string; // YYYY-MM-DD
  consentRodo?: boolean;
  consentStatute?: boolean;
};

type ValidationResult = {
  ok: boolean;
  fields: Record<string, string>;
};

function normalizeStr(v: any): string {
  return String(v || "").trim();
}

function normalizePhone(v: any): string {
  const s = normalizeStr(v);
  return s.replace(/\s+/g, " ");
}

function normalizeBool(v: any): boolean | undefined {
  if (v === true) return true;
  if (v === false) return false;
  // allow "true"/"false" from some clients
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return undefined;
}

// returns normalized E.164-like digits string without spaces/hyphens; keeps leading '+'
function normalizePhoneDigits(v: string): string {
  const s = normalizeStr(v);
  if (!s) return "";
  const keepPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return keepPlus ? "+" + digits : digits;
}

function isPhoneValid(v: string): boolean {
  const n = normalizePhoneDigits(v);
  const digitsCount = n.replace(/[^\d]/g, "").length;
  // liberal but sane: 9..15 digits
  if (digitsCount < 9) return false;
  if (digitsCount > 15) return false;
  return true;
}

function isIsoDateYYYYMMDD(v: string): boolean {
  // strict YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [yy, mm, dd] = v.split("-").map((x) => Number(x));
  if (!yy || !mm || !dd) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  // validate actual date
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  if (Number.isNaN(d.getTime())) return false;
  if (d.getUTCFullYear() !== yy) return false;
  if (d.getUTCMonth() !== mm - 1) return false;
  if (d.getUTCDate() !== dd) return false;
  return true;
}

function isDateNotInFuture(iso: string): boolean {
  if (!isIsoDateYYYYMMDD(iso)) return false;
  const [yy, mm, dd] = iso.split("-").map((x) => Number(x));
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return d.getTime() <= todayUtc.getTime();
}

function readProfileInput(req: Request): ProfileInput {
  const b = (req.body || {}) as any;

  const firstName = normalizeStr(b.firstName);
  const lastName = normalizeStr(b.lastName);
  const nickname = normalizeStr(b.nickname);
  const phone = normalizePhone(b.phone);

  const dateOfBirth = normalizeStr(b.dateOfBirth);
  const consentRodo = normalizeBool(b.consentRodo);
  const consentStatute = normalizeBool(b.consentStatute);

  const out: ProfileInput = {};
  if (firstName) out.firstName = firstName;
  if (lastName) out.lastName = lastName;
  if (nickname) out.nickname = nickname;
  if (phone) out.phone = phone;

  // keep date even if empty? no — only if provided
  if (dateOfBirth) out.dateOfBirth = dateOfBirth;
  if (typeof consentRodo === "boolean") out.consentRodo = consentRodo;
  if (typeof consentStatute === "boolean") out.consentStatute = consentStatute;

  return out;
}

function isProfileComplete(p: any): boolean {
  const firstName = normalizeStr(p?.firstName);
  const lastName = normalizeStr(p?.lastName);
  const phone = normalizeStr(p?.phone);

  const dateOfBirth = normalizeStr(p?.dateOfBirth);
  const consentRodo = p?.consentRodo === true;
  const consentStatute = p?.consentStatute === true;

  return Boolean(firstName && lastName && phone && dateOfBirth && consentRodo && consentStatute);
}

function validateIncomingProfile(incoming: ProfileInput): ValidationResult {
  const fields: Record<string, string> = {};

  // required strings if ANY profile update is being attempted
  // (we validate only when client sends any of these keys)
  const hasAny =
    "firstName" in incoming ||
    "lastName" in incoming ||
    "nickname" in incoming ||
    "phone" in incoming ||
    "dateOfBirth" in incoming ||
    "consentRodo" in incoming ||
    "consentStatute" in incoming;

  if (!hasAny) return {ok: true, fields};

  const fn = normalizeStr(incoming.firstName);
  const ln = normalizeStr(incoming.lastName);
  const ph = normalizeStr(incoming.phone);
  const dob = normalizeStr(incoming.dateOfBirth);

  // required
  if (!fn) fields.firstName = "required";
  if (!ln) fields.lastName = "required";
  if (!ph) fields.phone = "required";
  if (!dob) fields.dateOfBirth = "required";

  // phone format
  if (ph && !isPhoneValid(ph)) fields.phone = "invalid_format";

  // date validity
  if (dob && !isIsoDateYYYYMMDD(dob)) fields.dateOfBirth = "invalid_format";
  if (dob && isIsoDateYYYYMMDD(dob) && !isDateNotInFuture(dob)) fields.dateOfBirth = "cannot_be_future";

  // consents required = true
  if (incoming.consentRodo !== true) fields.consentRodo = "must_be_true";
  if (incoming.consentStatute !== true) fields.consentStatute = "must_be_true";

  return {ok: Object.keys(fields).length === 0, fields};
}

function computeRoleKeyFromOpeningBalance(
  obData: any,
  memberField: string,
  memberRoleCode: string,
  defaultRoleCode: string
): string {
  if (obData && obData[memberField] === true) return memberRoleCode;
  return defaultRoleCode;
}

async function findOpeningBalance(
  db: FirebaseFirestore.Firestore,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<{openingMatch: boolean; obData: any; matchMethod: "email" | "name" | null}> {
  const snap = await db.collection("users_opening_balance_26").get();

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedFirst = normalizeStr(firstName).toLowerCase();
  const normalizedLast = normalizeStr(lastName).toLowerCase();

  let nameMatch: {openingMatch: boolean; obData: any; matchMethod: "name"} | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() as any;

    // 1. Dopasowanie po e-mailu (priorytet)
    if (normalizedEmail && normalizedEmail.includes("@")) {
      const rowEmail = String(data["e-mail"] || "").trim().toLowerCase();
      if (rowEmail && rowEmail === normalizedEmail) {
        return {openingMatch: true, obData: data, matchMethod: "email"};
      }
    }

    // 2. Zbierz kandydatów po imieniu i nazwisku (fallback)
    if (!nameMatch && normalizedFirst && normalizedLast) {
      const rowFirst = normalizeStr(data["imię"] || data["imie"] || "").toLowerCase();
      const rowLast = normalizeStr(data["nazwisko"] || "").toLowerCase();
      if (rowFirst && rowLast && rowFirst === normalizedFirst && rowLast === normalizedLast) {
        nameMatch = {openingMatch: true, obData: data, matchMethod: "name"};
      }
    }
  }

  if (nameMatch) return nameMatch;
  return {openingMatch: false, obData: null, matchMethod: null};
}

export async function handleRegisterUser(req: Request, res: Response, deps: RegisterUserDeps) {
  const {
    db,
    admin,
    sendPreflight,
    requireAllowedHost,
    setCorsHeaders,
    corsHandler,
    requireIdToken,
    getSetupApp,
    defaultScreenForRoleKey,
    syncMemberToSheet,
  } = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;

  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const setupApp = await getSetupApp();
      const setupDefaults = setupApp?.defaults || {};
      const newUserRoleCode = normalizeStr(setupDefaults.newUserRoleCode) || "rola_sympatyk";
      const newUserStatusCode = normalizeStr(setupDefaults.newUserStatusCode) || "status_aktywny";
      const obMemberField = normalizeStr(setupDefaults.openingBalanceMemberField) || "członek stowarzyszenia";
      const obMemberRoleCode = normalizeStr(setupDefaults.openingBalanceMemberRoleCode) || "rola_czlonek";

      const decoded = tokenCheck.decoded;
      const uid = decoded.uid;
      const email = String(decoded.email || "").trim().toLowerCase();
      const displayName = String(decoded.name || "").trim();

      const incomingProfile = readProfileInput(req);

      // ✅ validate if client attempts profile update
      const validation = validateIncomingProfile(incomingProfile);
      if (!validation.ok) {
        res.status(400).json({
          ok: false,
          code: "validation_failed",
          fields: validation.fields,
        });
        return;
      }

      const userRef = db.collection("users_active").doc(uid);
      const existing = await userRef.get();

      // =========================
      // EXISTING USER
      // =========================
      if (existing.exists) {
        const data = existing.data() || {};
        let roleKey = String((data as any).role_key || newUserRoleCode);
        const statusKey = String((data as any).status_key || newUserStatusCode);

        // Jednorazowy fallback po imieniu+nazwisku (tylko gdy nie ma jeszcze trafienia z BO26)
        if (
          !(data as any).openingMatch &&
          incomingProfile.firstName &&
          incomingProfile.lastName
        ) {
          const nameFound = await findOpeningBalance(
            db,
            email,
            incomingProfile.firstName,
            incomingProfile.lastName
          );
          if (nameFound.openingMatch && nameFound.obData) {
            roleKey = computeRoleKeyFromOpeningBalance(nameFound.obData, obMemberField, obMemberRoleCode, newUserRoleCode);
            await userRef.set(
              {
                role_key: roleKey,
                openingMatch: true,
                openingMatchMethod: nameFound.matchMethod,
                openingBalance: nameFound.obData,
                openingMatchedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true}
            );
          }
        }

        let profileComplete = isProfileComplete((data as any).profile);

        // jeśli front wysłał profil → dopisz profile.* (merge)
        if (Object.keys(incomingProfile).length > 0) {
          const nowTs = admin.firestore.FieldValue.serverTimestamp();

          // consent timestamps: only when true is submitted
          const consentPatch: any = {};
          if (incomingProfile.consentRodo === true) consentPatch.rodoAcceptedAt = nowTs;
          if (incomingProfile.consentStatute === true) consentPatch.statuteAcceptedAt = nowTs;

          await userRef.set(
            {
              profile: {
                ...(data as any).profile,
                ...incomingProfile,
                consents: {
                  ...((data as any).profile?.consents || {}),
                  ...consentPatch,
                },
                updatedAt: nowTs,
              },
              updatedAt: nowTs,
            },
            {merge: true}
          );

          // recompute completeness on merged profile
          profileComplete = isProfileComplete({
            ...((data as any).profile || {}),
            ...incomingProfile,
          });

          // jeśli po tym profilu jest komplet → sync do arkusza (fire-and-forget, nie blokuje odpowiedzi)
          if (profileComplete) {
            syncMemberToSheet(uid).catch((sheetErr: any) => {
              console.error("syncMemberToSheet failed (existing user)", {
                uid,
                message: sheetErr?.message || String(sheetErr),
              });
            });
          }
        }

        const mergedProfile = {
          ...((data as any).profile || {}),
          ...(Object.keys(incomingProfile).length > 0 ? incomingProfile : {}),
        };

        res.status(200).json({
          ok: true,
          existed: true,
          uid,
          email: (data as any).email || email,
          role_key: roleKey,
          status_key: statusKey,
          screen: defaultScreenForRoleKey(roleKey),
          setupMissing: !setupApp,
          openingMatch: Boolean((data as any).openingMatch),
          profileComplete,
          nickname: normalizeStr(mergedProfile.nickname) || null,
          firstName: normalizeStr(mergedProfile.firstName) || null,
        });
        return;
      }

      // =========================
      // NEW USER (BOOTSTRAP FROM BO26)
      // =========================
      const found = await findOpeningBalance(
        db,
        email,
        incomingProfile.firstName,
        incomingProfile.lastName
      );

      let roleKey: string = newUserRoleCode;
      if (found.openingMatch && found.obData) {
        roleKey = computeRoleKeyFromOpeningBalance(found.obData, obMemberField, obMemberRoleCode, newUserRoleCode);
      }

      const statusKey = newUserStatusCode;
      const openingMatch = Boolean(found.openingMatch);

      const docToCreate: any = {
        uid,
        email,
        displayName,
        role_key: roleKey,
        status_key: statusKey,
        openingMatch,
        firstLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (openingMatch && found.obData) {
        docToCreate.openingMatchMethod = found.matchMethod;
        docToCreate.openingBalance = found.obData;
        docToCreate.openingMatchedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      if (Object.keys(incomingProfile).length > 0) {
        const nowTs = admin.firestore.FieldValue.serverTimestamp();

        const consentPatch: any = {};
        if (incomingProfile.consentRodo === true) consentPatch.rodoAcceptedAt = nowTs;
        if (incomingProfile.consentStatute === true) consentPatch.statuteAcceptedAt = nowTs;

        docToCreate.profile = {
          ...incomingProfile,
          consents: {
            ...consentPatch,
          },
          createdAt: nowTs,
          updatedAt: nowTs,
        };
      }

      await userRef.set(docToCreate);

      const profileComplete = isProfileComplete(incomingProfile);

      // jeśli user już podał komplet profilu → sync do arkusza (fire-and-forget, nie blokuje odpowiedzi)
      if (profileComplete) {
        syncMemberToSheet(uid).catch((sheetErr: any) => {
          console.error("syncMemberToSheet failed (new user)", {
            uid,
            message: sheetErr?.message || String(sheetErr),
          });
        });
      }

      res.status(200).json({
        ok: true,
        existed: false,
        uid,
        email,
        role_key: roleKey,
        status_key: statusKey,
        screen: defaultScreenForRoleKey(roleKey),
        setupMissing: !setupApp,
        openingMatch,
        profileComplete,
        nickname: normalizeStr(incomingProfile.nickname) || null,
        firstName: normalizeStr(incomingProfile.firstName) || null,
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
