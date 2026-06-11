import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: gear.syncAllFromSheet
 *
 * Port appscriptowego sync_kayaks.gs (9 kategorii sprzętu). Czyta zakładki arkusza sprzętu,
 * upsertuje do kolekcji gear_* (zachowując createdAt) i oznacza brakujące jako zezłomowane.
 * Walidacja: prywatne kajaki muszą mieć mail właściciela — inaczej cały sync jest blokowany
 * przed jakimkolwiek zapisem.
 */

type Payload = {
  dry?: boolean;
  limit?: number;
  requestedBy?: string;
};

type GearCategory = {
  key: string;
  label: string;
  collection: string;
  sheetTab: string;
  idHeader: string;
};

const GEAR_CATEGORIES: GearCategory[] = [
  {key: "kayaks", label: "Kajaki", collection: "gear_kayaks", sheetTab: "kajaki", idHeader: "ID"},
  {key: "paddles", label: "Wiosła", collection: "gear_paddles", sheetTab: "wiosła", idHeader: "ID"},
  {key: "lifejackets", label: "Kamizelki", collection: "gear_lifejackets", sheetTab: "kamizelki", idHeader: "ID"},
  {key: "helmets", label: "Kaski", collection: "gear_helmets", sheetTab: "kaski", idHeader: "ID"},
  {key: "throwbags", label: "Rzutki", collection: "gear_throwbags", sheetTab: "rzutki", idHeader: "ID"},
  {key: "sprayskirts", label: "Fartuchy", collection: "gear_sprayskirts", sheetTab: "fartuchy", idHeader: "ID"},
  {key: "flotationChambers", label: "Komory", collection: "gear_flotation_chambers", sheetTab: "komory", idHeader: "ID"},
  {key: "wetsuits", label: "Kurtki/Pianki", collection: "gear_wetsuits", sheetTab: "kurtki pianki", idHeader: "ID"},
  {key: "miscellaneous", label: "Inne różne", collection: "gear_miscellaneous", sheetTab: "inne różne", idHeader: "Id"},
];

const SCRAP_FIELD_NAME = "gearScrapped";
const SCRAP_AT_FIELD_NAME = "scrappedAt";

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
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
  return Number.isNaN(n) ? null : n;
}

// dd[.:/-]mm[.:/-]yyyy → Date (dane z Sheets API to stringi). Inaczej null.
function parseSheetDate(v: any): Date | null {
  const s = norm(v);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[:./-](\d{1,2})[:./-](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

type Row = Record<string, string>;

function isRealRow(key: string, r: Row): boolean {
  switch (key) {
  case "kayaks":
    return Boolean(norm(r["Numer Kajaka"]) || norm(r["Producent"]) || norm(r["Model"]));
  case "paddles":
  case "lifejackets":
  case "helmets":
    return Boolean(norm(r["Numer"]) || norm(r["Producent"]) || norm(r["Model"]));
  case "throwbags":
    return Boolean(norm(r["Numer"]) || norm(r["Producent"]) || norm(r["Uwagi"]));
  case "sprayskirts":
    return Boolean(norm(r["Numer"]) || norm(r["Producent"]) || norm(r["Materiał"]));
  case "flotationChambers":
    return Boolean(norm(r["Numer"]) || norm(r["Producent"]));
  case "wetsuits":
    return Boolean(norm(r["typ"]) || norm(r["rozmiar"]));
  case "miscellaneous":
    return Boolean(norm(r["Nazwa"]));
  default:
    return false;
  }
}

function buildDoc(key: string, id: string, r: Row, now: any, sheetTab: string): Record<string, any> {
  const base = {
    isActive: true,
    gearScrapped: false,
    source: {sheetTab, syncedAt: now},
    updatedAt: now,
  };

  switch (key) {
  case "kayaks": {
    const isOperational = parseBool(r["Sprawny?"]);
    return {
      id: String(id),
      number: norm(r["Numer Kajaka"]),
      brand: norm(r["Producent"]),
      model: norm(r["Model"]),
      size: norm(r["Rozmiar"]),
      color: norm(r["Kolor"]),
      type: norm(r["Typ"]),
      liters: parseNumber(r["Litrów"]),
      weightRange: norm(r["Zakres wag"]),
      cockpit: norm(r["Kokpit"]),
      storedAt: norm(r["Składowany"]),
      images: {top: norm(r["Zdjęcie z góry"])},
      isOperational,
      isHalfHalf: parseBool(r["Pół na pół?"]),
      isPrivate: parseBool(r["Prywatny?"]),
      isPrivateRentable: parseBool(r["Prywatny do wypożyczenia?"]),
      ownerContact: norm(r["kontakt do właściciela"]),
      privateSinceInClub: parseSheetDate(r["od kiedy w klubie (kajaki prywatne)"]),
      notes: norm(r["Uwagi"]),
      status: isOperational === false ? "repair" : "available",
      gearCategory: "kayaks",
      gearCategoryDisplay: "Kajaki",
      ...base,
    };
  }
  case "paddles":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      model: norm(r["Model"]),
      color: norm(r["Kolor"]),
      type: norm(r["Rodzaj"]),
      lengthCm: parseNumber(r["Długość"]),
      featherAngle: norm(r["Kąt skrętu"]),
      isBreakdown: parseBool(r["Składane"]),
      isPoolAllowed: parseBool(r["Basen"]),
      notes: norm(r["Uwagi"]),
      image: norm(r["Zdjęcia"]),
      images: {main: norm(r["Zdjęcia"])},
      status: "available",
      gearCategory: "paddles",
      gearCategoryDisplay: "Wiosła",
      ...base,
    };
  case "lifejackets":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      model: norm(r["Model"]),
      color: norm(r["Kolor"]),
      buoyancy: norm(r["Wyporność"]),
      type: norm(r["Typ"]),
      size: norm(r["Rozmiar"]),
      isPoolAllowed: parseBool(r["Basen"]),
      notes: norm(r["Uwagi"]),
      image: norm(r["Zdjęcie"]),
      images: {main: norm(r["Zdjęcie"])},
      status: "available",
      gearCategory: "lifejackets",
      gearCategoryDisplay: "Kamizelki",
      ...base,
    };
  case "helmets":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      model: norm(r["Model"]),
      color: norm(r["Kolor"]),
      size: norm(r["Rozmiar"]),
      isPoolAllowed: parseBool(r["Basen"]),
      notes: norm(r["Uwagi"]),
      image: norm(r["Zdjęcie"]),
      images: {main: norm(r["Zdjęcie"])},
      status: "available",
      gearCategory: "helmets",
      gearCategoryDisplay: "Kaski",
      ...base,
    };
  case "throwbags":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      notes: norm(r["Uwagi"]),
      status: "available",
      gearCategory: "throwbags",
      gearCategoryDisplay: "Rzutki",
      ...base,
    };
  case "sprayskirts":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      material: norm(r["Materiał"]),
      size: norm(r["Rozmiar"]),
      tunnelSize: norm(r["Rozmiar Komina"]),
      isPoolAllowed: parseBool(r["Basen"]),
      isLowlandAllowed: parseBool(r["Niziny"]),
      notes: norm(r["Uwagi"]),
      status: "available",
      gearCategory: "sprayskirts",
      gearCategoryDisplay: "Fartuchy",
      ...base,
    };
  case "flotationChambers":
    return {
      id: String(id),
      number: norm(r["Numer"]),
      brand: norm(r["Producent"]),
      color: norm(r["Kolor"]),
      assignedToKayak: norm(r["Przypisana do kajaka"]),
      notes: norm(r["uwagi"]),
      status: "available",
      gearCategory: "flotationChambers",
      gearCategoryDisplay: "Komory",
      ...base,
    };
  case "wetsuits":
    return {
      id: String(id),
      type: norm(r["typ"]),
      size: norm(r["rozmiar"]),
      color: norm(r["kolor"]),
      notes: norm(r["uwagi"]),
      status: "available",
      gearCategory: "wetsuits",
      gearCategoryDisplay: "Kurtki/Pianki",
      ...base,
    };
  case "miscellaneous":
    return {
      id: String(id),
      name: norm(r["Nazwa"]),
      color: norm(r["Kolor"]),
      notes: norm(r["Uwagi"]),
      status: "available",
      gearCategory: "miscellaneous",
      gearCategoryDisplay: "Inne różne",
      ...base,
    };
  default:
    throw new Error(`Unsupported gear category: "${key}"`);
  }
}

type CatSummary = {
  key: string; label: string; processed: number; upserted: number;
  skippedNoId: number; skippedNotReal: number; scrapped: number;
};

async function syncCategory(
  firestore: FirebaseFirestore.Firestore,
  sheets: GoogleSheetsProvider,
  spreadsheetId: string,
  cat: GearCategory,
  now: any,
  dryRun: boolean,
  limit: number | null,
  logger: {info: (...a: any[]) => void; warn: (...a: any[]) => void}
): Promise<CatSummary> {
  let table;
  try {
    table = await sheets.readTableAsObjects({spreadsheetId, tabName: cat.sheetTab});
  } catch (e: any) {
    throw new Error(`Nie można odczytać zakładki "${cat.sheetTab}": ${e?.message || e}`);
  }

  if (!table.headers.includes(cat.idHeader)) {
    throw new Error(`Brak kolumny "${cat.idHeader}" w zakładce "${cat.sheetTab}"`);
  }

  const rows = limit ? table.rows.slice(0, limit) : table.rows;
  const col = firestore.collection(cat.collection);

  // Jedno czytanie istniejących ID — do zachowania createdAt (nowe dok.) i do złomowania.
  const existingSnap = await col.select().get();
  const existingIds = new Set<string>(existingSnap.docs.map((d) => d.id));

  let processed = 0;
  let upserted = 0;
  let skippedNoId = 0;
  let skippedNotReal = 0;
  const sheetIds = new Set<string>();

  // Zapisy wsadowe (limit Firestore: 500 op/batch → flush co 400).
  let batch = firestore.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  };

  for (const r of rows) {
    const id = norm(r[cat.idHeader]);
    if (!id) {
      skippedNoId++;
      continue;
    }
    if (!isRealRow(cat.key, r)) {
      skippedNotReal++;
      continue;
    }
    sheetIds.add(id);

    const doc = buildDoc(cat.key, id, r, now, cat.sheetTab);
    processed++;
    upserted++;

    if (dryRun) continue;

    const data = existingIds.has(id) ? doc : {...doc, createdAt: now};
    batch.set(col.doc(id), data, {merge: true});
    ops++;
    if (ops >= 400) await flush();
  }
  if (!dryRun) await flush();

  // Scrapping: dokumenty w kolekcji, których nie ma już w arkuszu.
  let scrapped = 0;
  let sbatch = firestore.batch();
  let sops = 0;
  const sflush = async () => {
    if (sops > 0) {
      await sbatch.commit();
      sbatch = firestore.batch();
      sops = 0;
    }
  };

  for (const id of existingIds) {
    if (sheetIds.has(id)) continue;
    scrapped++;
    if (dryRun) continue;
    sbatch.update(col.doc(id), {
      [SCRAP_FIELD_NAME]: true,
      [SCRAP_AT_FIELD_NAME]: now,
      updatedAt: now,
      status: "scrapped",
      isActive: false,
    });
    sops++;
    if (sops >= 400) await sflush();
  }
  if (!dryRun) await sflush();

  logger.info("gearSyncAll: category done", {key: cat.key, processed, upserted, scrapped, skippedNoId, skippedNotReal, dryRun});
  return {key: cat.key, label: cat.label, processed, upserted, skippedNoId, skippedNotReal, scrapped};
}

export const gearSyncAllFromSheetTask: ServiceTask<Payload> = {
  id: "gear.syncAllFromSheet",
  description: "Sync całego sprzętu (9 kategorii) z arkusza do Firestore gear_* (upsert + złomowanie brakujących).",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const firestore = ctx.firestore;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const limit = payload?.limit ? Number(payload.limit) : null;
    const spreadsheetId = cfg.gear.kayaksSpreadsheetId;
    const now = admin.firestore.FieldValue.serverTimestamp();

    ctx.logger.info("gearSyncAll: start", {spreadsheetId, dryRun, limit});

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);

    // Walidacja kajaków PRZED jakimkolwiek zapisem (atomowo) — prywatne muszą mieć mail właściciela.
    const kayakCat = GEAR_CATEGORIES.find((c) => c.key === "kayaks");
    if (!kayakCat) throw new Error("Brak konfiguracji kategorii kayaks");
    const kayakTable = await sheets.readTableAsObjects({spreadsheetId, tabName: kayakCat.sheetTab});
    const invalidPrivate: string[] = [];
    for (const r of kayakTable.rows) {
      if (parseBool(r["Prywatny?"]) !== true) continue;
      const owner = norm(r["kontakt do właściciela"]);
      if (!owner || !owner.includes("@")) {
        invalidPrivate.push(norm(r["Numer Kajaka"]) || norm(r["ID"]) || "?");
      }
    }
    if (invalidPrivate.length > 0) {
      const msg = `Sync zablokowany — prywatne kajaki bez maila właściciela: ${invalidPrivate.join(", ")}. Uzupełnij kolumnę "kontakt do właściciela" i uruchom ponownie.`;
      ctx.logger.warn("gearSyncAll: validation error", {invalidPrivate});
      return {ok: true, message: msg, details: {validationError: true, invalidPrivate, dryRun}};
    }

    const summaries: CatSummary[] = [];
    for (const cat of GEAR_CATEGORIES) {
      const s = await syncCategory(firestore, sheets, spreadsheetId, cat, now, dryRun, limit, ctx.logger);
      summaries.push(s);
    }

    const total = summaries.reduce(
      (acc, s) => ({
        processed: acc.processed + s.processed,
        upserted: acc.upserted + s.upserted,
        skippedNoId: acc.skippedNoId + s.skippedNoId,
        skippedNotReal: acc.skippedNotReal + s.skippedNotReal,
        scrapped: acc.scrapped + s.scrapped,
      }),
      {processed: 0, upserted: 0, skippedNoId: 0, skippedNotReal: 0, scrapped: 0}
    );

    ctx.logger.info("gearSyncAll: done", {...total, dryRun});

    return {
      ok: true,
      message: `Gear sync done: upserted=${total.upserted}, scrapped=${total.scrapped}, dryRun=${dryRun}`,
      details: {...total, dryRun, perCategory: summaries},
    };
  },
};
