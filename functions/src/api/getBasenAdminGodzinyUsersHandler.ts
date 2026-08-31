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

/**
 * GET /api/basen/admin/godziny/users
 * Lista wszystkich zarejestrowanych userów (niezależnie od roli — dowolna rola może
 * mieć basen.enroll) z saldem godzin basenowych. Wyszukiwanie po mailu/nazwisku/ksywce
 * odbywa się po stronie klienta (patrz getAdminMemberDuesHandler.ts — ten sam wzorzec:
 * mały klub, jeden odczyt całej kolekcji jest tańszy niż zapytania OR na Firestore).
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

      const [usersSnap, ledgerSnap] = await Promise.all([
        deps.db.collection("users_active").get(),
        deps.db.collection("basen_godziny_ledger").get(),
      ]);

      const recsByUid = new Map<string, BasenGodzinyRecord[]>();
      ledgerSnap.forEach((doc) => {
        const r = doc.data() as any;
        const ruid = norm(r.uid);
        if (!ruid) return;
        const arr = recsByUid.get(ruid);
        if (arr) arr.push(r as BasenGodzinyRecord);
        else recsByUid.set(ruid, [r as BasenGodzinyRecord]);
      });

      const rows = usersSnap.docs
        .filter((d) => isRegistered(d.data()))
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
