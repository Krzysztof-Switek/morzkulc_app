import type {Request, Response} from "express";
import {enrollInSlot, getBasenVars, BasenSlotLabel} from "../modules/basen/basen_service";
import {isUserStatusBlocked} from "../modules/users/userStatusCheck";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
  memberRoleKeys: string[];
};

const VALID_SLOTS: BasenSlotLabel[] = ["H1", "H2", "SAUNA"];

export async function handleBasenEnroll(req: Request, res: Response, deps: Deps): Promise<void> {
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
      const statusKey = String(userData?.status_key || "");

      if (await isUserStatusBlocked(deps.db, statusKey)) {
        res.status(403).json({ok: false, code: "forbidden", error: "Konto zawieszone."});
        return;
      }

      // Sympatyk i kursant też mogą zapisać się na basen (mimo że nie są w memberRoleKeys).
      const canEnroll = deps.memberRoleKeys.includes(roleKey) ||
        roleKey === "rola_sympatyk" ||
        roleKey === "rola_kursant";
      if (!canEnroll) {
        res.status(403).json({error: "Brak uprawnień do zapisu na basen."});
        return;
      }

      const body = req.body || {};
      const sessionId = String(body.sessionId || "").trim();
      const slot = String(body.slot || "").trim() as BasenSlotLabel;
      const mode = String(body.mode || "regular").trim() as "regular" | "training" | "instructor";
      const instructorUid = String(body.instructorUid || "").trim();
      const kayakId = String(body.kayakId || "").trim();

      if (!sessionId || !VALID_SLOTS.includes(slot)) {
        res.status(400).json({error: "Brakuje sessionId lub nieprawidłowy slot."});
        return;
      }

      if (!["regular", "training", "instructor"].includes(mode)) {
        res.status(400).json({error: "mode musi być 'regular', 'training' lub 'instructor'."});
        return;
      }

      const isKursant = roleKey === "rola_kursant";

      const profile = userData?.profile || {};
      const firstName = String(profile?.firstName || "").trim();
      const lastName = String(profile?.lastName || "").trim();
      const userDisplayName = [firstName, lastName].filter(Boolean).join(" ") || String(userData?.email || uid);
      const userEmail = String(userData?.email || "").trim();

      if (mode === "instructor") {
        // Jedyny gatekeeper: kolumna "Instruktor (kadra)" w arkuszu (admin.basenInstructor).
        // Bez dodatkowego ograniczenia po roli — flaga jest już wystarczająco jawną,
        // ręcznie zarządzaną decyzją zarządu (patrz usersSyncFieldsFromSheet.ts), a
        // ograniczenie po roli tylko odcinało legalne przypadki (np. konta zewnętrzne
        // typu sympatyk oznaczone jako instruktor).
        const isInstructor = userData?.admin?.basenInstructor === true;
        if (!isInstructor) {
          res.status(403).json({error: "Brak uprawnień instruktora basenowego."});
          return;
        }
        if (slot === "SAUNA") {
          res.status(400).json({error: "Sauna nie ma slotu instruktorskiego."});
          return;
        }
      }

      if (mode === "training" && slot === "SAUNA") {
        res.status(400).json({error: "Sauna nie ma slotu instruktorskiego."});
        return;
      }

      // instructorUid dla mode="training" jest OPCJONALNY — brak → zapis powstaje jako
      // "szuka instruktora" (patrz basen_service.ts::listSlotAttendees/claimWaitingStudent).

      // Waliduje istnienie configu (spójne z dotychczasowym zachowaniem).
      await getBasenVars(deps.db);

      const {enrollmentId} = await enrollInSlot(deps.db, {
        sessionId,
        slot,
        uid,
        email: userEmail,
        displayName: userDisplayName,
        mode,
        instructorUid: mode === "training" ? instructorUid : undefined,
        kayakId: kayakId || undefined,
        isKursant,
      });

      res.status(200).json({ok: true, enrollmentId});
    } catch (err) {
      const e = err as {message?: string};
      const msg = e?.message || String(err);
      const clientPatterns = ["pełny", "anulowan", "już zapisany", "nie istnieje", "zajęty", "dostępny", "maksymalną"];
      const status = clientPatterns.some((p) => msg.includes(p)) ? 400 : 500;
      res.status(status).json({error: msg});
    }
  });
}
