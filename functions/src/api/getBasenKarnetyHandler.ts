import type {Request, Response} from "express";
import {getUserKarnety, getBasenVars} from "../modules/basen/basen_service";

type Deps = {
  db: FirebaseFirestore.Firestore;
  sendPreflight: (req: Request, res: Response) => boolean;
  requireAllowedHost: (req: Request, res: Response) => boolean;
  setCorsHeaders: (req: Request, res: Response) => void;
  corsHandler: (req: Request, res: Response, next: () => void) => void;
  requireIdToken: (req: Request) => Promise<{error: string} | {decoded: any}>;
};

export async function handleGetBasenKarnety(req: Request, res: Response, deps: Deps): Promise<void> {
  if (deps.sendPreflight(req, res)) return;
  if (!deps.requireAllowedHost(req, res)) return;
  deps.setCorsHeaders(req, res);

  deps.corsHandler(req, res, async () => {
    try {
      const tokenCheck = await deps.requireIdToken(req);
      if ("error" in tokenCheck) {
        res.status(401).json({error: tokenCheck.error});
        return;
      }

      const uid = tokenCheck.decoded.uid;

      const [karnety, vars] = await Promise.all([
        getUserKarnety(deps.db, uid),
        getBasenVars(deps.db),
      ]);

      res.status(200).json({
        ok: true,
        karnety: karnety.map((k) => ({
          id: k.id,
          totalEntries: k.totalEntries,
          usedEntries: k.usedEntries,
          remaining: k.totalEntries - k.usedEntries,
          status: k.status,
          createdAt: k.createdAt,
        })),
        config: {
          cenaZaKarnet: vars.basen_cena_za_karnet,
          ileWejsc: vars.basen_ile_wejsc_na_karnet,
          cenaZaGodzine: vars.basen_cena_za_godzine,
        },
      });
    } catch (err) {
      const e = err as {message?: string};
      res.status(500).json({error: "Server error", message: e?.message || String(err)});
    }
  });
}
