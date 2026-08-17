/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import type * as admin from "firebase-admin";
import {creditOpeningBalance} from "../modules/hours/godzinki_service";
import {getObHours, buildOpeningBalanceAdminPatch, obValueExact, obEmailKey} from "../modules/hours/opening_balance_fields";
import {getKursWindowEndSuffix} from "../modules/equipment/bundle/gear_bundle_service";

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
  computeAllowedActions: (roleKey: string) => string[];

  // ✅ sheets sync (via service_job for retry support)
  enqueueMemberSheetSync: (uid: string) => Promise<void>;

  // Rekoncyliacja grup Workspace (lista@ + roleMappings) po zmianie role_key poza sheet-syncem
  // (dopasowanie do bilansu otwarcia / self-declared kursant) — patrz Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD.
  enqueueWorkspaceGroupsRoleSync: (uid: string, email: string) => Promise<void>;
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
  iAmKursant?: boolean;
};

type ValidationResult = {
  ok: boolean;
  fields: Record<string, string>;
};

function normalizeStr(v: any): string {
  return String(v || "").trim();
}

// Klucz do porównań ksywy niewrażliwych na wielkość liter (przechowywany w profile.nicknameLower).
function normalizeNicknameKey(v: any): string {
  return normalizeStr(v).toLowerCase();
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
  // liberal but sane: 8..15 digits
  if (digitsCount < 8) return false;
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
  const iAmKursant = normalizeBool(b.iAmKursant);

  const out: ProfileInput = {};
  if (firstName) out.firstName = firstName;
  if (lastName) out.lastName = lastName;
  if (nickname) out.nickname = nickname;
  if (phone) out.phone = phone;

  // keep date even if empty? no — only if provided
  if (dateOfBirth) out.dateOfBirth = dateOfBirth;
  if (typeof consentRodo === "boolean") out.consentRodo = consentRodo;
  if (typeof consentStatute === "boolean") out.consentStatute = consentStatute;
  if (typeof iAmKursant === "boolean") out.iAmKursant = iAmKursant;

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

type OpeningMatch = {
  openingMatch: boolean;
  obData: any;
  matchMethod: "email" | "name" | null;
  obDocId: string | null;
  obEmail: string | null;
};

async function findOpeningBalance(
  db: FirebaseFirestore.Firestore,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<OpeningMatch> {
  const snap = await db.collection("users_opening_balance_26").get();

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedFirst = normalizeStr(firstName).toLowerCase();
  const normalizedLast = normalizeStr(lastName).toLowerCase();

  let nameMatch: OpeningMatch | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const rowEmail = String(obValueExact(data, "e-mail", "email") || "").trim().toLowerCase();

    // 1. Dopasowanie po e-mailu (priorytet) — odczyt nagłówka niewrażliwy na wielkość liter
    if (normalizedEmail && normalizedEmail.includes("@")) {
      if (rowEmail && rowEmail === normalizedEmail) {
        return {openingMatch: true, obData: data, matchMethod: "email", obDocId: doc.id, obEmail: rowEmail};
      }
    }

    // 2. Zbierz kandydatów po imieniu i nazwisku (fallback)
    if (!nameMatch && normalizedFirst && normalizedLast) {
      const rowFirst = normalizeStr(obValueExact(data, "imię", "imie") || "").toLowerCase();
      const rowLast = normalizeStr(obValueExact(data, "nazwisko") || "").toLowerCase();
      if (rowFirst && rowLast && rowFirst === normalizedFirst && rowLast === normalizedLast) {
        nameMatch = {openingMatch: true, obData: data, matchMethod: "name", obDocId: doc.id, obEmail: rowEmail || null};
      }
    }
  }

  if (nameMatch) return nameMatch;
  return {openingMatch: false, obData: null, matchMethod: null, obDocId: null, obEmail: null};
}

/**
 * Czy podany e-mail występuje już w INNYM wierszu bilansu otwarcia (kolizja przy
 * aktualizacji maila po dopasowaniu po nazwisku). exceptDocId pomijamy (to nasz wiersz).
 */
async function emailExistsInOtherObRow(
  db: FirebaseFirestore.Firestore,
  email: string,
  exceptDocId: string | null
): Promise<boolean> {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  const snap = await db.collection("users_opening_balance_26").get();
  for (const doc of snap.docs) {
    if (exceptDocId && doc.id === exceptDocId) continue;
    const rowEmail = String(obValueExact(doc.data(), "e-mail", "email") || "").trim().toLowerCase();
    if (rowEmail && rowEmail === e) return true;
  }
  return false;
}

/** Aktualizuje pole e-mail w wierszu bilansu otwarcia (po potwierdzeniu przez użytkownika). */
async function updateObEmail(
  db: FirebaseFirestore.Firestore,
  docId: string | null,
  obData: any,
  newEmail: string
): Promise<void> {
  const key = obEmailKey(obData);
  if (!key || !docId) return;
  await db.collection("users_opening_balance_26").doc(docId).update({[key]: String(newEmail || "").trim().toLowerCase()});
}

async function enqueueKmHistoricalMerge(
  db: FirebaseFirestore.Firestore,
  adminSdk: typeof admin,
  uid: string,
  email: string
): Promise<void> {
  if (!email) return;
  const histUid = `hist_${email}`;
  // Quick probe — is there anything to merge?
  const probe = await db.collection("km_logs").where("uid", "==", histUid).limit(1).get();
  if (probe.empty) return;
  // Enqueue with deterministic job id (idempotent)
  const jobId = `km-hist-merge:${uid}`;
  const jobRef = db.collection("service_jobs").doc(jobId);
  await db.runTransaction(async (tx) => {
    const ex = await tx.get(jobRef);
    if (ex.exists) {
      const s = String((ex.data() as any)?.status || "");
      if (s === "queued" || s === "running" || s === "done") return;
    }
    const now = adminSdk.firestore.Timestamp.now();
    tx.set(jobRef, {
      taskId: "km.mergeHistoricalUser",
      payload: {uid, email, histUid},
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextRunAt: now,
      lockOwner: null,
      lockedUntil: null,
    });
  });
}

async function enqueueGodzinkiHistMerge(
  db: FirebaseFirestore.Firestore,
  adminSdk: typeof admin,
  uid: string,
  email: string
): Promise<void> {
  if (!email) return;
  const histUid = `hist_${email}`;
  // Quick probe — czy są godzinki przejściowe do scalenia?
  const probe = await db.collection("godzinki_ledger").where("uid", "==", histUid).limit(1).get();
  if (probe.empty) return;
  const jobId = `godzinki-hist-merge:${uid}`;
  const jobRef = db.collection("service_jobs").doc(jobId);
  await db.runTransaction(async (tx) => {
    const ex = await tx.get(jobRef);
    if (ex.exists) {
      const s = String((ex.data() as any)?.status || "");
      if (s === "queued" || s === "running" || s === "done") return;
    }
    const now = adminSdk.firestore.Timestamp.now();
    tx.set(jobRef, {
      taskId: "godzinki.mergeHistoricalUser",
      payload: {uid, email, histUid},
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      nextRunAt: now,
      lockOwner: null,
      lockedUntil: null,
    });
  });
}

/**
 * Zwraca uid właściciela ksywy (profile.nicknameLower), pomijając excludeUid (samego siebie).
 * Porównanie niewrażliwe na wielkość liter — patrz normalizeNicknameKey.
 */
async function findNicknameOwnerUid(
  db: FirebaseFirestore.Firestore,
  nicknameLower: string,
  excludeUid: string
): Promise<string | null> {
  if (!nicknameLower) return null;
  const snap = await db
    .collection("users_active")
    .where("profile.nicknameLower", "==", nicknameLower)
    .limit(5)
    .get();
  const owner = snap.docs.find((d) => d.id !== excludeUid);
  return owner ? owner.id : null;
}

type KursantEligibility =
  | {ok: true}
  | {ok: false; code: "kursant_not_found" | "kursant_window_closed"; message: string};

/**
 * Sprawdza, czy dany e-mail może samodzielnie zadeklarować się jako kursant przy
 * rejestracji. Źródło: members_roster/{email} — mirror arkusza "członkowie sympatycy
 * SKK" zasilany przez users.syncFieldsFromSheet (zastępuje dawną kolekcję
 * kurs_uczestnicy, arkusz "Szkoleniówka", wygaszony — patrz Audyty/17.08_*).
 * Wymaga rola=Kursant ORAZ okna szkoleniówki (rok == bieżący rok kalendarzowy, do dnia
 * z setup/vars_members.vars.koniec_kursu — getKursWindowEndSuffix) — ta sama reguła co
 * bramka rezerwacji sprzętu (gear_bundle_service.isFreeRentalExempt), żeby kursant
 * z zeszłego rocznika nie mógł się już zadeklarować po wygaśnięciu okna.
 */
async function resolveKursantEligibility(
  db: FirebaseFirestore.Firestore,
  email: string
): Promise<KursantEligibility> {
  const NOT_FOUND: KursantEligibility = {
    ok: false,
    code: "kursant_not_found",
    message: "Twój adres e-mail nie figuruje na liście kursantów. Jeśli to błąd, skontaktuj się z zarządem: zarzad@morzkulc.pl",
  };

  const rosterSnap = await db.collection("members_roster").doc(email).get();
  if (!rosterSnap.exists) return NOT_FOUND;

  const roster = rosterSnap.data() as any;
  if (String(roster?.rola || "") !== "rola_kursant") return NOT_FOUND;

  const rok = roster?.rokSzkoleniowki;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const windowEndSuffix = await getKursWindowEndSuffix(db);
  const windowOpen = typeof rok === "number" && rok === now.getUTCFullYear() && todayIso <= `${rok}-${windowEndSuffix}`;
  if (!windowOpen) {
    return {
      ok: false,
      code: "kursant_window_closed",
      message: "Twoje uprawnienia kursanta wygasły z końcem września. Skontaktuj się z zarządem: zarzad@morzkulc.pl",
    };
  }

  return {ok: true};
}

type Szkoleniowiec = {name: string; email: string};

/**
 * Rozwiązuje aktualnego szkoleniowca (opiekun stażu #1) do nazwy + kontaktu funkcyjnego.
 *
 * Źródło operatora: service_state/function_roles.szkoleniowiec.{email,mailbox}
 * (ustawiane przez users.syncFunctionRolesFromSetup). Fallback: setup/vars_members.vars.szkoleniowiec.value.
 * Kontakt zawsze przez skrzynkę funkcyjną (mailbox), nie prywatny adres operatora.
 * Wywoływać TYLKO dla kandydata (ogranicza odczyty Firestore).
 */
async function resolveSzkoleniowiec(db: FirebaseFirestore.Firestore): Promise<Szkoleniowiec> {
  const FALLBACK_MAILBOX = "szkoleniowiec@morzkulc.pl";
  let operatorEmail = "";
  let mailbox = FALLBACK_MAILBOX;

  try {
    const stateSnap = await db.collection("service_state").doc("function_roles").get();
    const szk = stateSnap.exists ? (stateSnap.data() as any)?.szkoleniowiec : null;
    operatorEmail = String(szk?.email || "").trim().toLowerCase();
    mailbox = String(szk?.mailbox || "").trim() || FALLBACK_MAILBOX;

    // Fallback do setup vars, gdy stan funkcyjny nie zna jeszcze operatora.
    if (!operatorEmail) {
      const varsSnap = await db.collection("setup").doc("vars_members").get();
      const raw = varsSnap.exists ? (varsSnap.data() as any)?.vars?.szkoleniowiec?.value : null;
      const fromVars = String(raw || "").trim().toLowerCase();
      if (fromVars && fromVars.includes("@") && !fromVars.includes(",") && !fromVars.includes(";")) {
        operatorEmail = fromVars;
      }
    }
  } catch {
    // brak stanu/uprawnień — zwracamy samą skrzynkę funkcyjną poniżej
  }

  if (!operatorEmail) return {name: "Szkoleniowiec SKK", email: mailbox};

  try {
    const userSnap = await db.collection("users_active").where("email", "==", operatorEmail).limit(1).get();
    if (!userSnap.empty) {
      const u = userSnap.docs[0].data() as any;
      const fullName = `${String(u?.profile?.firstName || "").trim()} ${String(u?.profile?.lastName || "").trim()}`.trim();
      const name = fullName || String(u?.displayName || "").trim() || "Szkoleniowiec SKK";
      return {name, email: mailbox};
    }
  } catch {
    // nie udało się rozwiązać nazwy — fallback poniżej
  }

  return {name: "Szkoleniowiec SKK", email: mailbox};
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
    enqueueMemberSheetSync,
    enqueueWorkspaceGroupsRoleSync,
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
      // Godzinki z bilansu otwarcia wygasają 30.06.2029 (wymóg biznesowy)
      const OB_HOURS_EXPIRES_AT = new Date(Date.UTC(2029, 5, 30));

      const decoded = tokenCheck.decoded;
      const uid = decoded.uid;
      const email = String(decoded.email || "").trim().toLowerCase();
      const displayName = String(decoded.name || "").trim();

      const incomingProfile = readProfileInput(req);

      // Potwierdzenie aktualizacji maila w bilansie otwarcia (dopasowanie po imieniu+nazwisku).
      const confirmOpeningEmailUpdate = normalizeBool((req.body as any)?.confirmOpeningEmailUpdate) === true;
      // Flagi odpowiedzi dla flow potwierdzenia (Problem 1).
      let openingNameMatchPendingConfirm = false;
      let obEmailForConfirm: string | null = null;
      let openingEmailCollision = false;

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

      // ✅ ksywa musi być unikalna (case-insensitive) — nie chcemy dwóch osób z tą samą ksywą
      if (incomingProfile.nickname) {
        const nicknameLower = normalizeNicknameKey(incomingProfile.nickname);
        const takenBy = await findNicknameOwnerUid(db, nicknameLower, uid);
        if (takenBy) {
          res.status(400).json({
            ok: false,
            code: "validation_failed",
            fields: {nickname: "taken"},
          });
          return;
        }
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
            // Dopasowanie po imieniu+nazwisku (mail nieznaleziony) wymaga potwierdzenia
            // użytkownika i aktualizacji maila w bilansie otwarcia (Problem 1).
            const needsConfirm = nameFound.matchMethod === "name";
            let applyMatch = !needsConfirm;

            if (needsConfirm) {
              if (!confirmOpeningEmailUpdate) {
                // Wstrzymaj — front pokaże osobny krok potwierdzenia.
                openingNameMatchPendingConfirm = true;
                obEmailForConfirm = nameFound.obEmail;
              } else if (await emailExistsInOtherObRow(db, email, nameFound.obDocId)) {
                // Kolizja: mail loginu istnieje w innym wierszu bilansu — nie nadpisujemy.
                openingEmailCollision = true;
              } else {
                await updateObEmail(db, nameFound.obDocId, nameFound.obData, email);
                applyMatch = true;
              }
            }

            if (applyMatch) {
              roleKey = computeRoleKeyFromOpeningBalance(nameFound.obData, obMemberField, obMemberRoleCode, newUserRoleCode);
              const adminPatch = buildOpeningBalanceAdminPatch(nameFound.obData);
              await userRef.set(
                {
                  role_key: roleKey,
                  openingMatch: true,
                  openingMatchMethod: nameFound.matchMethod,
                  openingBalance: nameFound.obData,
                  openingMatchedAt: admin.firestore.FieldValue.serverTimestamp(),
                  ...(adminPatch ? {admin: adminPatch} : {}),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                {merge: true}
              );
              // Kredytuj godzinki z bilansu otwarcia (fire-and-forget, idempotentne przez marker)
              const obHours = getObHours(nameFound.obData);
              if (obHours !== 0 && !data.service?.openingBalanceHoursCredited) {
                creditOpeningBalance(db, uid, obHours, OB_HOURS_EXPIRES_AT)
                  .then(() => userRef.set({"service.openingBalanceHoursCredited": true}, {merge: true}))
                  .catch((e: any) => console.error("creditOpeningBalance (existing user) failed", {uid, message: e?.message}));
              }
              // Rola zmieniła się poza sheet-syncem (dopasowanie do bilansu otwarcia) — zsynchronizuj
              // grupy Workspace (lista@ itd.), inaczej rola w grupie zostaje trwale nieaktualna.
              enqueueWorkspaceGroupsRoleSync(uid, email)
                .catch((e: any) => console.error("enqueueWorkspaceGroupsRoleSync (opening balance match) failed", {uid, message: e?.message}));
            }
          }
        }

        // Jeśli użytkownik zaznaczył "jestem kursantem" i nie ma jeszcze wyższej roli
        if (incomingProfile.iAmKursant === true && roleKey === newUserRoleCode) {
          const eligibility = await resolveKursantEligibility(db, email);
          if (!eligibility.ok) {
            res.status(403).json({ok: false, code: eligibility.code, message: eligibility.message});
            return;
          }
          roleKey = "rola_kursant";
          await userRef.set(
            {
              role_key: roleKey,
              kursantSelfDeclared: true,
              kursantSelfDeclaredAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
          );
          // Rola zmieniła się poza sheet-syncem (self-declared kursant) — zsynchronizuj grupy
          // Workspace (usuwa z lista@, bo kursant nie ma tam dostępu).
          enqueueWorkspaceGroupsRoleSync(uid, email)
            .catch((e: any) => console.error("enqueueWorkspaceGroupsRoleSync (self-declared kursant) failed", {uid, message: e?.message}));
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
                ...(incomingProfile.nickname ?
                  {nicknameLower: normalizeNicknameKey(incomingProfile.nickname)} :
                  {}),
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

          // jeśli po tym profilu jest komplet → sync do arkusza (await gwarantuje zapis joba przed odpowiedzią)
          if (profileComplete) {
            await enqueueMemberSheetSync(uid).catch((sheetErr: any) => {
              console.error("enqueueMemberSheetSync failed (existing user)", {
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

        // Jednorazowo: scal historyczne km_logs jeśli nie zrobiono jeszcze
        const existingData = data as any;
        if (email && !existingData.service?.kmHistMergedFrom && !existingData.service?.kmHistMergeEnqueued) {
          userRef.set({"service.kmHistMergeEnqueued": true}, {merge: true}).catch(() => {/* fire-and-forget */});
          enqueueKmHistoricalMerge(db, admin, uid, email)
            .catch((e: any) => console.error("enqueueKmHistoricalMerge (existing user) failed", {uid, message: e?.message}));
        }

        // Jednorazowo: scal przejściowe godzinki spod hist_{email} jeśli nie zrobiono jeszcze
        if (email && !existingData.service?.godzinkiHistMergedFrom && !existingData.service?.godzinkiHistMergeEnqueued) {
          userRef.set({"service.godzinkiHistMergeEnqueued": true}, {merge: true}).catch(() => {/* fire-and-forget */});
          enqueueGodzinkiHistMerge(db, admin, uid, email)
            .catch((e: any) => console.error("enqueueGodzinkiHistMerge (existing user) failed", {uid, message: e?.message}));
        }

        // Opiekunowie stażu kandydata: #2 z arkusza (admin.mentor), #1 = aktualny
        // szkoleniowiec (rozwiązywany tylko dla kandydata — ogranicza odczyty).
        const szkoleniowiec = roleKey === "rola_kandydat" ? await resolveSzkoleniowiec(db) : null;

        res.status(200).json({
          ok: true,
          existed: true,
          uid,
          email: (data as any).email || email,
          role_key: roleKey,
          status_key: statusKey,
          screen: defaultScreenForRoleKey(roleKey),
          allowed_actions: deps.computeAllowedActions(roleKey),
          setupMissing: !setupApp,
          openingMatch: Boolean((data as any).openingMatch),
          profileComplete,
          nickname: normalizeStr(mergedProfile.nickname) || null,
          firstName: normalizeStr(mergedProfile.firstName) || null,
          contributionsPaidUntil: (data as any).admin?.contributions ?? null,
          entryFeePaidAt: (data as any).admin?.entryFeePaidAt ?? null,
          mentor: (data as any).admin?.mentor ?? null,
          szkoleniowiec,
          openingNameMatchPendingConfirm,
          obEmail: obEmailForConfirm,
          openingEmailCollision,
        });
        return;
      }

      // =========================
      // NEW USER (BOOTSTRAP FROM BO26)
      // =========================
      const found: OpeningMatch = incomingProfile.iAmKursant === true ?
        {openingMatch: false, obData: null, matchMethod: null, obDocId: null, obEmail: null} :
        await findOpeningBalance(db, email, incomingProfile.firstName, incomingProfile.lastName);

      let roleKey: string = newUserRoleCode;
      let applyOpeningMatch = false;
      if (incomingProfile.iAmKursant === true) {
        const eligibility = await resolveKursantEligibility(db, email);
        if (!eligibility.ok) {
          res.status(403).json({ok: false, code: eligibility.code, message: eligibility.message});
          return;
        }
        roleKey = "rola_kursant";
      } else if (found.openingMatch && found.obData) {
        if (found.matchMethod === "name") {
          // Dopasowanie po imieniu+nazwisku (mail nieznaleziony) wymaga potwierdzenia (Problem 1).
          if (!confirmOpeningEmailUpdate) {
            openingNameMatchPendingConfirm = true;
            obEmailForConfirm = found.obEmail;
          } else if (await emailExistsInOtherObRow(db, email, found.obDocId)) {
            openingEmailCollision = true;
          } else {
            await updateObEmail(db, found.obDocId, found.obData, email);
            applyOpeningMatch = true;
          }
        } else {
          applyOpeningMatch = true; // dopasowanie po mailu — bez potwierdzenia
        }
        if (applyOpeningMatch) {
          roleKey = computeRoleKeyFromOpeningBalance(found.obData, obMemberField, obMemberRoleCode, newUserRoleCode);
        }
      }

      const statusKey = newUserStatusCode;
      const openingMatch = applyOpeningMatch;

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
        const adminPatch = buildOpeningBalanceAdminPatch(found.obData);
        if (adminPatch) docToCreate.admin = adminPatch;
      }

      if (incomingProfile.iAmKursant === true) {
        docToCreate.kursantSelfDeclared = true;
        docToCreate.kursantSelfDeclaredAt = admin.firestore.FieldValue.serverTimestamp();
      }

      if (Object.keys(incomingProfile).length > 0) {
        const nowTs = admin.firestore.FieldValue.serverTimestamp();

        const consentPatch: any = {};
        if (incomingProfile.consentRodo === true) consentPatch.rodoAcceptedAt = nowTs;
        if (incomingProfile.consentStatute === true) consentPatch.statuteAcceptedAt = nowTs;

        docToCreate.profile = {
          ...incomingProfile,
          ...(incomingProfile.nickname ?
            {nicknameLower: normalizeNicknameKey(incomingProfile.nickname)} :
            {}),
          consents: {
            ...consentPatch,
          },
          createdAt: nowTs,
          updatedAt: nowTs,
        };
      }

      await userRef.set(docToCreate);

      // Kredytuj godzinki z bilansu otwarcia (fire-and-forget, idempotentne przez marker)
      if (openingMatch && found.obData) {
        const obHours = getObHours(found.obData);
        if (obHours !== 0) {
          creditOpeningBalance(db, uid, obHours, OB_HOURS_EXPIRES_AT)
            .then(() => userRef.set({"service.openingBalanceHoursCredited": true}, {merge: true}))
            .catch((e: any) => console.error("creditOpeningBalance (new user) failed", {uid, message: e?.message}));
        }
      }

      // Fire-and-forget: scal historyczne km_logs jeśli istnieją
      enqueueKmHistoricalMerge(db, admin, uid, email)
        .catch((e: any) => console.error("enqueueKmHistoricalMerge (new user) failed", {uid, message: e?.message}));

      // Fire-and-forget: scal przejściowe godzinki spod hist_{email} jeśli istnieją
      enqueueGodzinkiHistMerge(db, admin, uid, email)
        .catch((e: any) => console.error("enqueueGodzinkiHistMerge (new user) failed", {uid, message: e?.message}));

      const profileComplete = isProfileComplete(incomingProfile);

      // jeśli user już podał komplet profilu → sync do arkusza (await gwarantuje zapis joba przed odpowiedzią)
      if (profileComplete) {
        await enqueueMemberSheetSync(uid).catch((sheetErr: any) => {
          console.error("enqueueMemberSheetSync failed (new user)", {
            uid,
            message: sheetErr?.message || String(sheetErr),
          });
        });
      }

      // Opiekunowie stażu (jak w gałęzi istniejącego usera). Nowy kandydat zwykle nie ma
      // jeszcze admin.mentor (trafia syncem z arkusza) — wtedy null.
      const szkoleniowiec = roleKey === "rola_kandydat" ? await resolveSzkoleniowiec(db) : null;

      res.status(200).json({
        ok: true,
        existed: false,
        uid,
        email,
        role_key: roleKey,
        status_key: statusKey,
        screen: defaultScreenForRoleKey(roleKey),
        allowed_actions: deps.computeAllowedActions(roleKey),
        setupMissing: !setupApp,
        openingMatch,
        profileComplete,
        nickname: normalizeStr(incomingProfile.nickname) || null,
        firstName: normalizeStr(incomingProfile.firstName) || null,
        contributionsPaidUntil: docToCreate.admin?.contributions ?? null,
        entryFeePaidAt: docToCreate.admin?.entryFeePaidAt ?? null,
        mentor: docToCreate.admin?.mentor ?? null,
        szkoleniowiec,
        openingNameMatchPendingConfirm,
        obEmail: obEmailForConfirm,
        openingEmailCollision,
      });
    } catch (err: any) {
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
