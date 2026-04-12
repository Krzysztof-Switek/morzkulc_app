import type {Request, Response} from "express";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  adminRoleKeys: string[];
};

/**
 * GET /api/basen/admin/users?q=<fragment>
 * Admin wyszukuje użytkowników po fragmencie e-mail.
 * Zwraca uid, email, displayName (maks. 20 wyników).
 */
export async function handleBasenAdminSearchUsers(req: Request, res: Response, deps: Deps): Promise<void> {
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

      const callerUid = tokenCheck.decoded.uid;

      const callerSnap = await deps.db.collection("users_active").doc(callerUid).get();
      if (!callerSnap.exists) {
        res.status(403).json({error: "User not found"});
        return;
      }

      const callerData = callerSnap.data() as any;
      if (!deps.adminRoleKeys.includes(String(callerData?.role_key || ""))) {
        res.status(403).json({error: "Brak uprawnień."});
        return;
      }

      const q = String(req.query?.q || "").trim().toLowerCase();

      if (!q || q.length < 2) {
        res.status(400).json({error: "Podaj co najmniej 2 znaki wyszukiwania (parametr q)."});
        return;
      }

      // Prefix search by email (Firestore range query)
      const qEnd = q.replace(/.$/, (c) => String.fromCharCode(c.charCodeAt(0) + 1));

      const snap = await deps.db
        .collection("users_active")
        .where("email", ">=", q)
        .where("email", "<", qEnd)
        .limit(20)
        .get();

      const users = snap.docs.map((d) => {
        const data = d.data() as any;
        const profile = data?.profile || {};
        const firstName = String(profile?.firstName || "").trim();
        const lastName = String(profile?.lastName || "").trim();
        const displayName = [firstName, lastName].filter(Boolean).join(" ") || String(data?.email || d.id);
        return {
          uid: d.id,
          email: String(data?.email || ""),
          displayName,
        };
      });

      res.status(200).json({ok: true, users});
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
