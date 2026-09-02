import type {Request, Response} from "express";
import {resolveBasenAdminGrant} from "../modules/basen/basen_service";
import {computeBasenGodzinyBalance, BasenGodzinyRecord} from "../modules/basen/basen_godziny_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  adminRoleKeys: string[];
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}
function fullName(u: any): string {
  const p = u?.profile || {};
  const full = [p.firstName, p.lastName].map((s: any) => norm(s)).filter(Boolean).join(" ").trim();
  return full || norm(p.nickname) || "";
}
function nickname(u: any): string {
  return norm(u?.profile?.nickname);
}
/** Zarejestrowany = ukończył rejestrację w aplikacji (ma profil z imieniem i nazwiskiem). */
function isRegistered(u: any): boolean {
  const p = u?.profile || {};
  return Boolean(norm(p.firstName) && norm(p.lastName));
}

// Widoczni są tylko userzy AKTYWNI w ostatnich 4 miesiącach (zapis na basen — dowolna
// data sesji od cutoff wzwyż, czyli też wszystkie PRZYSZŁE — albo wpis w godziny_ledger
// od cutoff) — reszta jest w klubie, ale nieaktywna w basenie, więc admin i tak by ich
// szukał ręcznie; krótsza lista = mniej odczytów users_active (odczytujemy tylko
// aktywnych, nie całą kolekcję).
const ACTIVE_WINDOW_MONTHS = 4;

/**
 * GET /api/basen/admin/godziny/users
 * Lista AKTYWNYCH (ostatnie 4 miesiące — zapis na basen albo ruch na koncie godzin)
 * userów z saldem godzin basenowych. Wyszukiwanie po mailu/nazwisku/ksywce odbywa się
 * po stronie klienta spośród tej listy.
 */
export async function handleGetBasenAdminGodzinyUsers(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;
      const adminSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!adminSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const adminData = adminSnap.data() as any;
      const adminRoleKey = String(adminData?.role_key || "");
      const adminEmail = String(adminData?.email || "");
      if (!deps.adminRoleKeys.includes(adminRoleKey) && !(await resolveBasenAdminGrant(deps.db, adminEmail))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd/KR lub opiekun basenowy."});
        return;
      }

      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - ACTIVE_WINDOW_MONTHS);
      const cutoffMs = cutoff.getTime();
      const cutoffSessionId = cutoff.toISOString().slice(0, 10); // basen_enrollments.sessionId = data sesji (YYYY-MM-DD)

      const [ledgerSnap, recentEnrollSnap] = await Promise.all([
        // Cała historia — potrzebna do POPRAWNEGO salda (godziny nie wygasają, nie da się
        // go policzyć tylko z ostatnich 4 miesięcy), ale nie każdy z niej jest "aktywny".
        deps.db.collection("basen_godziny_ledger").get(),
        deps.db.collection("basen_enrollments").where("sessionId", ">=", cutoffSessionId).get(),
      ]);

      const recsByUid = new Map<string, BasenGodzinyRecord[]>();
      const activeUids = new Set<string>();
      ledgerSnap.forEach((doc) => {
        const r = doc.data() as any;
        const ruid = norm(r.uid);
        if (!ruid) return;
        const arr = recsByUid.get(ruid);
        if (arr) arr.push(r as BasenGodzinyRecord);
        else recsByUid.set(ruid, [r as BasenGodzinyRecord]);
        const createdMs = r.createdAt?.toMillis?.() ?? 0;
        if (createdMs >= cutoffMs) activeUids.add(ruid);
      });
      recentEnrollSnap.forEach((doc) => {
        const enrollUid = norm((doc.data() as any)?.userUid);
        if (enrollUid) activeUids.add(enrollUid);
      });

      // Tylko aktywni userzy odczytywani z users_active (nie cała kolekcja) — jeśli ktoś
      // spoza tej listy potrzebuje zarządzania godzinami, admin szuka go inaczej.
      const activeUserDocs = await Promise.all(
        Array.from(activeUids).map((activeUid) => deps.db.collection("users_active").doc(activeUid).get())
      );

      const rows = activeUserDocs
        .filter((d) => d.exists && isRegistered(d.data()))
        .map((d) => {
          const u = d.data() as any;
          return {
            userUid: d.id,
            userName: fullName(u),
            userNick: nickname(u),
            userEmail: norm(u?.email),
            roleKey: norm(u?.role_key),
            balance: computeBasenGodzinyBalance(recsByUid.get(d.id) || []),
          };
        });

      rows.sort((a, b) => a.userName.localeCompare(b.userName, "pl"));

      res.status(200).json({ok: true, rows});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
