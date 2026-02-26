import * as admin from "firebase-admin";
import { ServiceTask } from "../types";
import { GoogleSheetsProvider } from "../providers/googleSheetsProvider";
import { getServiceConfig } from "../service_config";

type Payload = {
  dry?: boolean; // alias (opcjonalnie)
  limit?: number; // testowo
};

function norm(v: any): string {
  return String(v || "").trim();
}

function parseBool(v: any): boolean | null {
  const s = norm(v).toLowerCase();
  if (!s) return null;
  if (["tak", "t", "yes", "y", "true", "1", "✓", "x"].includes(s)) return true;
  if (["nie", "n", "no", "false", "0"].includes(s)) return false;
  return null;
}

function parseNumber(v: any): number | null {
  const s = norm(v).replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

export const gearSyncKayaksFromSheetTask: ServiceTask<Payload> = {
  id: "gear.syncKayaksFromSheet",
  description: "Manual sync: Google Sheet (Kajaki) -> Firestore gear_kayaks (upsert by ID).",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;

    const spreadsheetId = cfg.gear?.kayaksSpreadsheetId || "1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI";
    const tabName = cfg.gear?.kayaksTabName || "Kajaki";

    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    ctx.logger.info("gearSyncKayaksFromSheet: start", { spreadsheetId, tabName, dryRun });

    const sheets = new GoogleSheetsProvider(delegated);
    const table = await sheets.readTableAsObjects({ spreadsheetId, tabName });

    if (!table.headers.includes("ID")) {
      throw new Error(`Sheet "${tabName}" missing required header "ID"`);
    }

    const rows = payload?.limit ? table.rows.slice(0, Number(payload.limit)) : table.rows;

    const firestore = admin.firestore();
    const col = firestore.collection("gear_kayaks");

    let upserted = 0;
    let skippedNoId = 0;

    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const r of rows) {
      const id = norm(r["ID"]);
      if (!id) {
        skippedNoId++;
        continue;
      }

      const liters = parseNumber(r["Litrów"]);
      const isOperational = parseBool(r["Sprawny?"]);
      const isHalfHalf = parseBool(r["Pół na pół?"]);
      const isPoolAllowed = parseBool(r["Basen?"]);
      const isPrivate = parseBool(r["Prywatny?"]);
      const isPrivateRentable = parseBool(r["Prywatny do wypożyczenia?"]);

      const status =
        isOperational === false ? "repair" : "available";

      const doc: Record<string, any> = {
        id,
        number: norm(r["Numer Kajaka"]),
        brand: norm(r["Producent"]),
        model: norm(r["Model"]),
        color: norm(r["Kolor"]),
        type: norm(r["Typ"]),
        liters: liters === null ? null : liters,
        weightRange: norm(r["Zakres wag"]),
        cockpit: norm(r["Kokpit"]),
        images: {
          top: norm(r["Zdjęcie z góry"]),
          side: norm(r["Zdjęcie z boku"]),
        },

        isOperational: isOperational === null ? null : isOperational,
        isHalfHalf: isHalfHalf === null ? null : isHalfHalf,
        isPoolAllowed: isPoolAllowed === null ? null : isPoolAllowed,
        isPrivate: isPrivate === null ? null : isPrivate,
        isPrivateRentable: isPrivateRentable === null ? null : isPrivateRentable,
        ownerContact: norm(r["kontakt do właściciela"]),
        notes: norm(r["Uwagi"]),

        isActive: true,
        status,

        source: {
          sheet: "Kajaki",
          syncedAt: now,
        },

        updatedAt: now,
      };

      const ref = col.doc(id);

      if (dryRun) {
        ctx.logger.info("DRYRUN upsert gear_kayaks", { id, number: doc.number, status: doc.status });
      } else {
        // create createdAt only if new doc
        await firestore.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) {
            tx.set(ref, { ...doc, createdAt: now }, { merge: true });
          } else {
            tx.set(ref, doc, { merge: true });
          }
        });
      }

      upserted++;
    }

    ctx.logger.info("gearSyncKayaksFromSheet: done", { upserted, skippedNoId, dryRun });

    return {
      ok: true,
      message: "gear kayaks sync completed",
      details: { upserted, skippedNoId, dryRun, tabName },
    };
  },
};
