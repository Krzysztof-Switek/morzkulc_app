type GearCategory =
  | "paddles"
  | "lifejackets"
  | "helmets"
  | "throwbags"
  | "sprayskirts";

type GearCollectionConfig = {
  category: GearCategory;
  collection: string;
  label: string;
};

const GEAR_COLLECTIONS: Record<GearCategory, GearCollectionConfig> = {
  paddles: {
    category: "paddles",
    collection: "gear_paddles",
    label: "Wiosła",
  },
  lifejackets: {
    category: "lifejackets",
    collection: "gear_lifejackets",
    label: "Kamizelki",
  },
  helmets: {
    category: "helmets",
    collection: "gear_helmets",
    label: "Kaski",
  },
  throwbags: {
    category: "throwbags",
    collection: "gear_throwbags",
    label: "Rzutki",
  },
  sprayskirts: {
    category: "sprayskirts",
    collection: "gear_sprayskirts",
    label: "Fartuchy",
  },
};

function norm(v: any): string {
  return String(v || "").trim();
}

function toNumberSafe(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v));
  if (Number.isNaN(n)) return null;
  return n;
}

function getCollectionConfig(category: string): GearCollectionConfig | null {
  const key = String(category || "").trim().toLowerCase() as GearCategory;
  return GEAR_COLLECTIONS[key] || null;
}

export function isSupportedGearCategory(category: string): category is GearCategory {
  return Boolean(getCollectionConfig(category));
}

function buildMeta(doc: any, category: GearCategory) {
  switch (category) {
  case "paddles":
    return {
      lengthCm: toNumberSafe(doc?.lengthCm),
      featherAngle: norm(doc?.featherAngle),
      isBreakdown: doc?.isBreakdown ?? null,
      isPoolAllowed: doc?.isPoolAllowed ?? null,
    };
  case "lifejackets":
    return {
      buoyancy: norm(doc?.buoyancy),
      isPoolAllowed: doc?.isPoolAllowed ?? null,
    };
  case "helmets":
    return {
      isPoolAllowed: doc?.isPoolAllowed ?? null,
    };
  case "throwbags":
    return {};
  case "sprayskirts":
    return {
      material: norm(doc?.material),
      tunnelSize: norm(doc?.tunnelSize),
      isPoolAllowed: doc?.isPoolAllowed ?? null,
      isLowlandAllowed: doc?.isLowlandAllowed ?? null,
    };
  default:
    return {};
  }
}

function pickGearItem(doc: any, category: GearCategory, fallbackLabel: string) {
  return {
    id: norm(doc?.id),
    number: norm(doc?.number),
    brand: norm(doc?.brand),
    model: norm(doc?.model),
    type: norm(doc?.type),
    color: norm(doc?.color),
    size: norm(doc?.size),
    status: norm(doc?.status),
    gearCategory: norm(doc?.gearCategory) || category,
    gearCategoryDisplay: norm(doc?.gearCategoryDisplay) || fallbackLabel,
    image: norm(doc?.image),
    images: {
      main: norm(doc?.images?.main),
      top: norm(doc?.images?.top),
      side: norm(doc?.images?.side),
    },
    notes: norm(doc?.notes),
    meta: buildMeta(doc, category),
  };
}

export async function listGearItemsByCategory(
  db: FirebaseFirestore.Firestore,
  category: string
) {
  const cfg = getCollectionConfig(category);
  if (!cfg) {
    throw new Error(`Unsupported gear category: ${category}`);
  }

  const snap = await db
    .collection(cfg.collection)
    .where("isActive", "==", true)
    .limit(500)
    .get();

  const out: any[] = [];

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    if (d?.gearScrapped === true) continue;

    out.push(
      pickGearItem(
        {...d, id: norm(d?.id) || doc.id},
        cfg.category,
        cfg.label
      )
    );
  }

  out.sort((a, b) => {
    const aKey = norm(a?.number) || norm(a?.id);
    const bKey = norm(b?.number) || norm(b?.id);
    return aKey.localeCompare(bKey, "pl");
  });

  return out;
}
