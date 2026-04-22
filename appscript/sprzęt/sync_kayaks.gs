/** sync_kayaks.gs */

function syncAllGearDryRun() {
  syncAllGearCore_({ dryRun: true, limit: CONFIG.DEFAULT_LIMIT });
}

function syncAllGearToFirestore() {
  syncAllGearCore_({ dryRun: false, limit: CONFIG.DEFAULT_LIMIT });
}

function syncAllGearCore_(opts) {
  const dryRun = Boolean(opts && opts.dryRun);
  const limit = opts && opts.limit ? Number(opts.limit) : null;
  const now = new Date();

  const categories = getGearCategoryList_();
  const summaries = [];

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const summary = syncSingleGearCategory_(category, {
      dryRun: dryRun,
      limit: limit,
      now: now,
    });
    summaries.push(summary);
  }

  const total = summarizeAllGearResults_(summaries, dryRun);
  Logger.log(total.logText);
  SpreadsheetApp.getUi().alert(total.alertText);
}

function syncSingleGearCategory_(category, opts) {
  const dryRun = Boolean(opts && opts.dryRun);
  const limit = opts && opts.limit ? Number(opts.limit) : null;
  const now = opts && opts.now ? opts.now : new Date();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(category.sheetTab);
  if (!sh) throw new Error(`Missing sheet tab: "${category.sheetTab}"`);

  const data = sh.getDataRange().getValues();
  if (!data || data.length < 2) {
    return {
      key: category.key,
      label: category.label,
      collection: category.collection,
      sheetTab: category.sheetTab,
      dryRun: dryRun,
      processed: 0,
      upserted: 0,
      skippedNoId: 0,
      skippedNotReal: 0,
      sheetIds: 0,
      scrapped: 0,
    };
  }

  const headers = data[0].map((h) => String(h || "").trim());
  const idHeader = category.idHeader || CONFIG.SHEET_ID_HEADER;
  const idIdx = headers.indexOf(idHeader);
  if (idIdx < 0) {
    throw new Error(`Header "${idHeader}" not found in tab "${category.sheetTab}"`);
  }

  const headerIndex = {};
  headers.forEach((h, i) => {
    if (h) headerIndex[h] = i;
  });

  const rows = data.slice(1);
  const rowsLimited = limit ? rows.slice(0, limit) : rows;

  let processed = 0;
  let upserted = 0;
  let skippedNoId = 0;
  let skippedNotReal = 0;

  const sheetIds = {};
  let sheetIdsCount = 0;

  for (let r = 0; r < rowsLimited.length; r++) {
    const row = rowsLimited[r];
    const id = normCell_(row[idIdx]);

    if (!id) {
      skippedNoId++;
      if (CONFIG.SKIP_ROWS_WITHOUT_ID) continue;
      continue;
    }

    const rowObj = rowToObject_(row, headerIndex);

    if (!isRealGearRow_(category.key, rowObj)) {
      skippedNotReal++;
      continue;
    }

    if (!sheetIds[id]) {
      sheetIds[id] = true;
      sheetIdsCount++;
    }

    const doc = buildGearDocFromRow_(category.key, id, rowObj, now, category);
    processed++;

    if (dryRun) {
      Logger.log(
        `[DRYRUN] upsert ${category.collection}/${id} ` +
        `category=${category.key} label=${buildDocLogLabel_(doc)}`
      );
      upserted++;
      continue;
    }

    const existing = fsGetDoc_(category.collection, id);
    if (existing.ok && existing.doc && existing.doc.fields && existing.doc.fields.createdAt) {
      doc.createdAt = null;
    }

    const isNew = Boolean(existing.notFound);
    const payload = buildFirestorePayload_(doc, { isNew: isNew, now: now });

    fsUpsertDoc_(category.collection, id, payload);
    upserted++;
  }

  const scrappedCount = markMissingGearAsScrapped_(category, sheetIds, now, dryRun);

  return {
    key: category.key,
    label: category.label,
    collection: category.collection,
    sheetTab: category.sheetTab,
    dryRun: dryRun,
    processed: processed,
    upserted: upserted,
    skippedNoId: skippedNoId,
    skippedNotReal: skippedNotReal,
    sheetIds: sheetIdsCount,
    scrapped: scrappedCount,
  };
}

function getGearCategoryList_() {
  const cfg = CONFIG.GEAR_CATEGORIES || {};
  return [
    cfg.kayaks,
    cfg.paddles,
    cfg.lifejackets,
    cfg.helmets,
    cfg.throwbags,
    cfg.sprayskirts,
    cfg.flotationChambers,
    cfg.wetsuits,
    cfg.miscellaneous,
  ].filter(Boolean);
}

function summarizeAllGearResults_(summaries, dryRun) {
  const lines = [];
  let processed = 0;
  let upserted = 0;
  let skippedNoId = 0;
  let skippedNotReal = 0;
  let sheetIds = 0;
  let scrapped = 0;

  lines.push(`syncAllGear done: dryRun=${dryRun}`);

  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    processed += s.processed;
    upserted += s.upserted;
    skippedNoId += s.skippedNoId;
    skippedNotReal += s.skippedNotReal;
    sheetIds += s.sheetIds;
    scrapped += s.scrapped;

    lines.push(
      `- ${s.label}: processed=${s.processed} upserted=${s.upserted} ` +
      `skippedNoId=${s.skippedNoId} skippedNotReal=${s.skippedNotReal} ` +
      `sheetIds=${s.sheetIds} scrapped=${s.scrapped}`
    );
  }

  lines.push(
    `TOTAL: processed=${processed} upserted=${upserted} skippedNoId=${skippedNoId} ` +
    `skippedNotReal=${skippedNotReal} sheetIds=${sheetIds} scrapped=${scrapped}`
  );

  return {
    logText: lines.join("\n"),
    alertText:
      `Cały sprzęt sync done\n` +
      `dryRun: ${dryRun}\n` +
      `processed: ${processed}\n` +
      `upserted: ${upserted}\n` +
      `skippedNoId: ${skippedNoId}\n` +
      `skippedNotReal: ${skippedNotReal}\n` +
      `sheetIds: ${sheetIds}\n` +
      `scrapped: ${scrapped}`,
  };
}

function buildDocLogLabel_(doc) {
  return [
    doc.number,
    doc.brand,
    doc.model,
    doc.type,
    doc.size,
  ].filter(Boolean).join(" | ");
}

function isRealGearRow_(categoryKey, r) {
  switch (String(categoryKey || "")) {
    case "kayaks":
      return isRealKayakRow_(r);
    case "paddles":
      return isRealPaddleRow_(r);
    case "lifejackets":
      return isRealLifejacketRow_(r);
    case "helmets":
      return isRealHelmetRow_(r);
    case "throwbags":
      return isRealThrowbagRow_(r);
    case "sprayskirts":
      return isRealSprayskirtRow_(r);
    case "flotationChambers":
      return isRealFloatationChamberRow_(r);
    case "wetsuits":
      return isRealWetsuitRow_(r);
    case "miscellaneous":
      return isRealMiscRow_(r);
    default:
      return false;
  }
}

function buildGearDocFromRow_(categoryKey, id, r, now, category) {
  switch (String(categoryKey || "")) {
    case "kayaks":
      return buildKayakDocFromRow_(id, r, now);
    case "paddles":
      return buildPaddleDocFromRow_(id, r, now, category);
    case "lifejackets":
      return buildLifejacketDocFromRow_(id, r, now, category);
    case "helmets":
      return buildHelmetDocFromRow_(id, r, now, category);
    case "throwbags":
      return buildThrowbagDocFromRow_(id, r, now, category);
    case "sprayskirts":
      return buildSprayskirtDocFromRow_(id, r, now, category);
    case "flotationChambers":
      return buildFloatationChamberDocFromRow_(id, r, now, category);
    case "wetsuits":
      return buildWetsuitDocFromRow_(id, r, now, category);
    case "miscellaneous":
      return buildMiscDocFromRow_(id, r, now, category);
    default:
      throw new Error(`Unsupported gear category: "${categoryKey}"`);
  }
}

/**
 * KAJAKI
 * UWAGA: shape zostaje kompatybilny z obecnym backendem/frontem.
 */
function isRealKayakRow_(r) {
  const number = normCell_(r["Numer Kajaka"]);
  const brand = normCell_(r["Producent"]);
  const model = normCell_(r["Model"]);
  return Boolean(number || brand || model);
}

function buildKayakDocFromRow_(id, r, now) {
  const liters = parseNumber_(r["Litrów"]);
  const isOperational = parseBool_(r["Sprawny?"]);
  const status = (isOperational === false) ? "repair" : "available";

  return {
    id: String(id),
    number: normCell_(r["Numer Kajaka"]),
    brand: normCell_(r["Producent"]),
    model: normCell_(r["Model"]),
    size: normCell_(r["Rozmiar"]),
    color: normCell_(r["Kolor"]),
    type: normCell_(r["Typ"]),
    liters: liters,
    weightRange: normCell_(r["Zakres wag"]),
    cockpit: normCell_(r["Kokpit"]),
    storedAt: normCell_(r["Składowany"]),
    images: {
      top: normCell_(r["Zdjęcie z góry"]),
    },

    isOperational: isOperational,
    isHalfHalf: parseBool_(r["Pół na pół?"]),
    isPrivate: parseBool_(r["Prywatny?"]),
    isPrivateRentable: parseBool_(r["Prywatny do wypożyczenia?"]),
    ownerContact: normCell_(r["kontakt do właściciela"]),
    privateSinceInClub: parseSheetDate_(r["od kiedy w klubie (kajaki prywatne)"]),
    notes: normCell_(r["Uwagi"]),

    isActive: true,
    status: status,

    gearCategory: "kayaks",
    gearCategoryDisplay: "Kajaki",

    gearScrapped: false,

    source: {
      sheetTab: CONFIG.SHEET_TAB_KAYAKS,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * WIOSŁA
 */
function isRealPaddleRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  const model = normCell_(r["Model"]);
  return Boolean(number || brand || model);
}

function buildPaddleDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    model: normCell_(r["Model"]),
    color: normCell_(r["Kolor"]),
    type: normCell_(r["Rodzaj"]),
    lengthCm: parseNumber_(r["Długość"]),
    featherAngle: normCell_(r["Kąt skrętu"]),
    isBreakdown: parseBool_(r["Składane"]),
    isPoolAllowed: parseBool_(r["Basen"]),
    notes: normCell_(r["Uwagi"]),

    image: normCell_(r["Zdjęcia"]),
    images: {
      main: normCell_(r["Zdjęcia"]),
    },

    isActive: true,
    status: "available",

    gearCategory: "paddles",
    gearCategoryDisplay: "Wiosła",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * KAMIZELKI
 */
function isRealLifejacketRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  const model = normCell_(r["Model"]);
  return Boolean(number || brand || model);
}

function buildLifejacketDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    model: normCell_(r["Model"]),
    color: normCell_(r["Kolor"]),
    buoyancy: normCell_(r["Wyporność"]),
    type: normCell_(r["Typ"]),
    size: normCell_(r["Rozmiar"]),
    isPoolAllowed: parseBool_(r["Basen"]),
    notes: normCell_(r["Uwagi"]),

    image: normCell_(r["Zdjęcie"]),
    images: {
      main: normCell_(r["Zdjęcie"]),
    },

    isActive: true,
    status: "available",

    gearCategory: "lifejackets",
    gearCategoryDisplay: "Kamizelki",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * KASKI
 */
function isRealHelmetRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  const model = normCell_(r["Model"]);
  return Boolean(number || brand || model);
}

function buildHelmetDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    model: normCell_(r["Model"]),
    color: normCell_(r["Kolor"]),
    size: normCell_(r["Rozmiar"]),
    isPoolAllowed: parseBool_(r["Basen"]),
    notes: normCell_(r["Uwagi"]),

    image: normCell_(r["Zdjęcie"]),
    images: {
      main: normCell_(r["Zdjęcie"]),
    },

    isActive: true,
    status: "available",

    gearCategory: "helmets",
    gearCategoryDisplay: "Kaski",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * RZUTKI
 */
function isRealThrowbagRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  const notes = normCell_(r["Uwagi"]);
  return Boolean(number || brand || notes);
}

function buildThrowbagDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    notes: normCell_(r["Uwagi"]),

    isActive: true,
    status: "available",

    gearCategory: "throwbags",
    gearCategoryDisplay: "Rzutki",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * FARTUCHY
 */
function isRealSprayskirtRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  const material = normCell_(r["Materiał"]);
  return Boolean(number || brand || material);
}

function buildSprayskirtDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    material: normCell_(r["Materiał"]),
    size: normCell_(r["Rozmiar"]),
    tunnelSize: normCell_(r["Rozmiar Komina"]),
    isPoolAllowed: parseBool_(r["Basen"]),
    isLowlandAllowed: parseBool_(r["Niziny"]),
    notes: normCell_(r["Uwagi"]),

    isActive: true,
    status: "available",

    gearCategory: "sprayskirts",
    gearCategoryDisplay: "Fartuchy",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * KOMORY
 * Kolumny: ID, Producent, Kolor, Numer, Przypisana do kajaka, uwagi
 */
function isRealFloatationChamberRow_(r) {
  const number = normCell_(r["Numer"]);
  const brand = normCell_(r["Producent"]);
  return Boolean(number || brand);
}

function buildFloatationChamberDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    number: normCell_(r["Numer"]),
    brand: normCell_(r["Producent"]),
    color: normCell_(r["Kolor"]),
    assignedToKayak: normCell_(r["Przypisana do kajaka"]),
    notes: normCell_(r["uwagi"]),

    isActive: true,
    status: "available",

    gearCategory: "flotationChambers",
    gearCategoryDisplay: "Komory",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * KURTKI / PIANKI
 * Kolumny: ID, typ, rozmiar, kolor, uwagi
 */
function isRealWetsuitRow_(r) {
  const type = normCell_(r["typ"]);
  const size = normCell_(r["rozmiar"]);
  return Boolean(type || size);
}

function buildWetsuitDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    type: normCell_(r["typ"]),
    size: normCell_(r["rozmiar"]),
    color: normCell_(r["kolor"]),
    notes: normCell_(r["uwagi"]),

    isActive: true,
    status: "available",

    gearCategory: "wetsuits",
    gearCategoryDisplay: "Kurtki/Pianki",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

/**
 * INNE RÓŻNE
 * Kolumny: Id, Nazwa, Kolor, Uwagi
 */
function isRealMiscRow_(r) {
  return Boolean(normCell_(r["Nazwa"]));
}

function buildMiscDocFromRow_(id, r, now, category) {
  return {
    id: String(id),
    name: normCell_(r["Nazwa"]),
    color: normCell_(r["Kolor"]),
    notes: normCell_(r["Uwagi"]),

    isActive: true,
    status: "available",

    gearCategory: "miscellaneous",
    gearCategoryDisplay: "Inne różne",

    gearScrapped: false,

    source: {
      sheetTab: category.sheetTab,
      syncedAt: now,
    },

    updatedAt: now,
  };
}

function markMissingGearAsScrapped_(category, sheetIdsMap, now, dryRun) {
  const pageSize = CONFIG.FIRESTORE_LIST_PAGE_SIZE || 200;
  let pageToken = null;
  let scrapped = 0;

  while (true) {
    const resp = fsListDocs_(category.collection, pageSize, pageToken);
    const docs = resp.docs || [];

    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const fullName = d && d.name ? String(d.name) : "";
      const docId = extractDocIdFromName_(fullName);

      if (!docId) continue;
      if (sheetIdsMap && sheetIdsMap[docId]) continue;

      const patch = {};
      patch[CONFIG.SCRAP_FIELD_NAME] = true;
      patch[CONFIG.SCRAP_AT_FIELD_NAME] = now;
      patch.updatedAt = now;
      patch.status = "scrapped";
      patch.isActive = false;

      if (dryRun) {
        Logger.log(`[DRYRUN] scrap ${category.collection}/${docId} (${CONFIG.SCRAP_FIELD_NAME}=true)`);
        scrapped++;
        continue;
      }

      fsPatchFields_(category.collection, docId, patch);
      scrapped++;
    }

    pageToken = resp.nextPageToken;
    if (!pageToken) break;
  }

  return scrapped;
}

function extractDocIdFromName_(docName) {
  const s = String(docName || "");
  const parts = s.split("/documents/");
  if (parts.length !== 2) return "";
  const tail = parts[1];
  const seg = tail.split("/");
  if (seg.length < 2) return "";
  return String(seg[1] || "").trim();
}

function rowToObject_(row, headerIndex) {
  const obj = {};
  Object.keys(headerIndex).forEach((h) => {
    const idx = headerIndex[h];
    obj[h] = row[idx];
  });
  return obj;
}

function buildFirestorePayload_(doc, meta) {
  const out = Object.assign({}, doc);

  if (meta.isNew) out.createdAt = meta.now;
  else delete out.createdAt;

  out.updatedAt = meta.now;
  return out;
}

function normCell_(v) {
  return String(v || "").trim();
}

function parseBool_(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (["tak", "t", "yes", "y", "true", "1", "✓", "x"].includes(s)) return true;
  if (["nie", "n", "no", "false", "0"].includes(s)) return false;
  return null;
}

function parseNumber_(v) {
  const s = String(v || "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function parseSheetDate_(v) {
  if (v === null || v === undefined || v === "") return null;

  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
    return v;
  }

  const s = String(v).trim();
  if (!s) return null;

  const match = s.match(/^(\d{1,2})[:.\/-](\d{1,2})[:.\/-](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
}