/* eslint-disable require-jsdoc */
/* eslint-disable valid-jsdoc */

import type {Request, Response} from "express";
import {logger} from "firebase-functions/v2";

type TokenCheck =
  | {error: string}
  | {decoded: {uid: string; email?: string; name?: string}};

export type GetKlubInfoDeps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: any;
  requireIdToken: (req: Request) => Promise<TokenCheck>;
  adminRoleKeys: string[]; // role widzące dane finansowe (rola_zarzad, rola_kr)
  memberRoleKeys: string[]; // role widzące listę kluczy (kandydat/członek/zarząd/KR — jak moduł Klub)
};

// Funkcje zarządu w kolejności prezentacji. mailbox = domyślna skrzynka funkcyjna
// (kontakt zawsze przez nią, nie przez prywatny adres operatora). Może zostać
// nadpisana przez service_state/function_roles.<key>.mailbox.
const FUNCTION_ROLES: Array<{key: string; label: string; mailbox: string}> = [
  {key: "prezes", label: "Prezes", mailbox: "prezes@morzkulc.pl"},
  {key: "skarbnik", label: "Skarbnik", mailbox: "skarbnik@morzkulc.pl"},
  {key: "sprzetowiec", label: "Sprzętowiec", mailbox: "sprzetowiec@morzkulc.pl"},
  {key: "szkoleniowiec", label: "Szkoleniowiec", mailbox: "szkoleniowiec@morzkulc.pl"},
];

/** Składa imię+nazwisko z profilu, z fallbackiem na ksywę/displayName. */
function fullNameFromUser(u: any, fallback: string): string {
  const p = u?.profile || {};
  const full = [p.firstName, p.lastName].map((s) => String(s || "").trim()).filter(Boolean).join(" ").trim();
  return full || String(p.nickname || "").trim() || String(u?.displayName || "").trim() || fallback;
}

/** Parsuje setupVar do pojedynczego, poprawnego emaila (lub ""). */
function singleEmail(raw: any): string {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s || s.includes(",") || s.includes(";")) return "";
  if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) return "";
  return s;
}

/** „8699,01"/„8699.01"/8699 → string w PL (przecinek dziesiętny); pusto → „0". */
function financeAmount(v: any): string {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "0";
  return s.replace(/\./g, ",");
}

export async function handleGetKlubInfo(req: Request, res: Response, deps: GetKlubInfoDeps) {
  const {sendPreflight, requireAllowedHost, setCorsHeaders, corsHandler, requireIdToken, db, adminRoleKeys, memberRoleKeys} = deps;

  if (sendPreflight(req, res)) return;
  if (!requireAllowedHost(req, res)) return;
  setCorsHeaders(req, res);

  corsHandler(req, res, async () => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({error: "Method not allowed"});
        return;
      }

      const tokenCheck = await requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;

      // Jeden odczyt stanu funkcyjnego + zmiennych setup + KR + dok. użytkownika (rola).
      const [stateSnap, varsSnap, krSnap, userSnap] = await Promise.all([
        db.collection("service_state").doc("function_roles").get(),
        db.collection("setup").doc("vars_members").get(),
        db.collection("users_active").where("role_key", "==", "rola_kr").get(),
        db.collection("users_active").doc(uid).get(),
      ]);

      // Dane finansowe widzą TYLKO KR i Zarząd — filtrowanie po stronie serwera.
      const roleKey = userSnap.exists ? String((userSnap.data() as any)?.role_key || "") : "";
      const canSeeFinance = adminRoleKeys.includes(roleKey);
      // Lista kluczy widoczna TYLKO dla ról z dostępem do modułu Klub (kandydat/członek/zarząd/KR) —
      // /api/klub jest wołane przez box profilu dla WSZYSTKICH zalogowanych, więc bez tej bramki
      // sympatyk/kursant zobaczyliby listę w samej odpowiedzi sieciowej, mimo że moduł Klub jej nie pokaże.
      const canSeeKeys = memberRoleKeys.includes(roleKey);

      const state = (stateSnap.exists ? (stateSnap.data() as any) : null) || {};
      const vars = (varsSnap.exists ? (varsSnap.data() as any)?.vars : null) || {};

      // 1) Zarząd: ustal email + skrzynkę per funkcja (state → fallback vars).
      type Resolved = {key: string; funkcja: string; mailbox: string; email: string};
      const resolved: Resolved[] = FUNCTION_ROLES.map((r) => {
        const fromState = singleEmail(state?.[r.key]?.email);
        const fromVars = singleEmail(vars?.[r.key]?.value);
        const mailbox = String(state?.[r.key]?.mailbox || "").trim() || r.mailbox;
        return {key: r.key, funkcja: r.label, mailbox, email: fromState || fromVars};
      });

      // 2) Rozwiąż nazwy jednym zapytaniem (Firestore "in" ≤ 10 wartości).
      const emails = Array.from(new Set(resolved.map((r) => r.email).filter(Boolean)));
      const nameByEmail = new Map<string, string>();
      if (emails.length) {
        const usersSnap = await db
          .collection("users_active")
          .where("email", "in", emails.slice(0, 10))
          .get();
        usersSnap.forEach((d) => {
          const u = d.data() as any;
          const e = String(u?.email || "").trim().toLowerCase();
          if (e) nameByEmail.set(e, fullNameFromUser(u, ""));
        });
      }

      // Funkcję bez przypisanego operatora pomijamy.
      const zarzad = resolved
        .filter((r) => r.email)
        .map((r) => ({
          funkcja: r.funkcja,
          name: nameByEmail.get(r.email) || r.email,
          mailbox: r.mailbox,
        }));

      // 3) Komisja rewizyjna — sort po nazwisku.
      const kr = krSnap.docs
        .map((d) => ({name: fullNameFromUser(d.data() as any, "Członek KR")}))
        .sort((a, b) => a.name.localeCompare(b.name, "pl"));

      // 4) Finanse. Numer konta + bank — dla wszystkich; stany (konto/gotówka) — tylko KR/Zarząd.
      const konto = String(vars?.konto_klubowe?.value || "").trim();
      const bank = String(vars?.bank_klubowy?.value || "").trim();
      const finanse: Record<string, string> = {konto, bank};
      if (canSeeFinance) {
        finanse.stanKonta = financeAmount(vars?.stan_konta?.value);
        finanse.stanGotowki = financeAmount(
          vars?.["stan_kasy_gotówkowej"]?.value ?? vars?.["stan_kasy_gotowkowej"]?.value
        );
      }

      // 5) Linki/dokumenty — tylko gdy zmienne istnieją.
      const linki: Record<string, string> = {};
      const statut = String(vars?.statut_url?.value || "").trim();
      const regulamin = String(vars?.regulamin_url?.value || "").trim();
      const klucze = String(vars?.klucze?.value || "").trim();
      if (statut) linki.statut = statut;
      if (regulamin) linki.regulamin = regulamin;
      if (klucze) linki.klucze = klucze;

      // 6) Osoby z kluczami do siedziby / dostępem do akademika — tylko dla kandydat/członek/zarząd/KR.
      // Wyświetlanie: ksywka jeśli jest (inaczej imię+nazwisko); telefon zawsze osobną kolumną
      // (żeby dało się skontaktować w sprawie odbioru kluczy).
      let kluczeOsoby: Array<{name: string; phone: string | null; hasClubKeys: boolean; hasAkademikAccess: boolean}> | undefined;
      if (canSeeKeys) {
        const [withKeysSnap, withAkademikSnap] = await Promise.all([
          db.collection("users_active").where("admin.hasClubKeys", "==", true).get(),
          db.collection("users_active").where("admin.hasAkademikAccess", "==", true).get(),
        ]);

        type Entry = {profile: any; hasClubKeys: boolean; hasAkademikAccess: boolean};
        const byUid = new Map<string, Entry>();
        withKeysSnap.forEach((d) => {
          const u = d.data() as any;
          byUid.set(d.id, {profile: u?.profile || {}, hasClubKeys: true, hasAkademikAccess: false});
        });
        withAkademikSnap.forEach((d) => {
          const u = d.data() as any;
          const existing = byUid.get(d.id);
          if (existing) existing.hasAkademikAccess = true;
          else byUid.set(d.id, {profile: u?.profile || {}, hasClubKeys: false, hasAkademikAccess: true});
        });

        kluczeOsoby = Array.from(byUid.values())
          .map((entry) => {
            const p = entry.profile;
            const nickname = String(p?.nickname || "").trim();
            const fullName = [p?.firstName, p?.lastName].map((s: any) => String(s || "").trim()).filter(Boolean).join(" ").trim();
            const phone = String(p?.phone || "").trim();
            const name = nickname || fullName || "(bez nazwy)";
            return {
              name,
              phone: phone || null,
              hasClubKeys: entry.hasClubKeys,
              hasAkademikAccess: entry.hasAkademikAccess,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, "pl"));
      }

      res.status(200).json({
        ok: true,
        zarzad,
        kr,
        finanse,
        linki,
        ...(kluczeOsoby ? {kluczeOsoby} : {}),
      });
    } catch (err: any) {
      logger.error("getKlubInfo failed", {message: err?.message, stack: err?.stack});
      res.status(500).json({error: "Server error", message: err?.message || String(err)});
    }
  });
}
