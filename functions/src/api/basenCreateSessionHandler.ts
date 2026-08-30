import type {Request, Response} from "express";
import {createSession, getBasenVars, resolveBasenAdminGrant} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  adminRoleKeys: string[];
};

function readTimeBlock(raw: any, fallback: {timeStart: string; timeEnd: string}, defaultCapacity: number) {
  const timeStart = String(raw?.timeStart || "").trim() || fallback.timeStart;
  const timeEnd = String(raw?.timeEnd || "").trim() || fallback.timeEnd;
  const capacity = Number(raw?.capacity || 0) || defaultCapacity;
  return {timeStart, timeEnd, capacity};
}

export async function handleBasenCreateSession(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    if (req.method !== "POST") {
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

      const userSnap = await deps.db.collection("users_active").doc(uid).get();
      if (!userSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const userData = userSnap.data() as any;
      const roleKey = String(userData?.role_key || "");
      const email = String(userData?.email || "");

      if (!deps.adminRoleKeys.includes(roleKey) && !(await resolveBasenAdminGrant(deps.db, email))) {
        res.status(403).json({error: "Brak uprawnień. Wymagana rola: zarząd/KR lub opiekun basenowy."});
        return;
      }

      const body = req.body || {};
      const date = String(body.date || "").trim();
      const notes = String(body.notes || "").trim();

      if (!date) {
        res.status(400).json({error: "Wymagane pole: data."});
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({error: "Nieprawidłowy format daty (YYYY-MM-DD)."});
        return;
      }

      const vars = await getBasenVars(deps.db);
      const h1 = readTimeBlock(body.h1, {timeStart: vars.basen_1_godzina_domyslna, timeEnd: vars.basen_1_godzina_domyslna}, vars.basen_limit_uczestnikow);
      const h2 = readTimeBlock(body.h2, {timeStart: vars.basen_2_godzina_domyslna, timeEnd: vars.basen_2_godzina_domyslna}, vars.basen_limit_uczestnikow);

      if (!h1.timeStart || !h1.timeEnd || !h2.timeStart || !h2.timeEnd) {
        res.status(400).json({error: "Wymagane godziny H1 i H2."});
        return;
      }

      const saunaRaw = body.sauna || {};
      const sauna = saunaRaw?.enabled === true ?
        {
          enabled: true,
          timeStart: String(saunaRaw?.timeStart || "").trim() || h1.timeStart,
          timeEnd: String(saunaRaw?.timeEnd || "").trim() || h1.timeEnd,
          capacity: Number(saunaRaw?.capacity || 0) || vars.basen_limit_uczestnikow,
        } :
        undefined;

      const sessionId = await createSession(deps.db, {
        date,
        h1,
        h2,
        sauna,
        notes,
        createdBy: uid,
      });

      res.status(200).json({ok: true, sessionId});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
