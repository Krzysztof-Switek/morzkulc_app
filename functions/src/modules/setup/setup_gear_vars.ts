export type GearVarsDoc = {
  vars?: Record<string, { value?: any }>;
};

export type GearVars = {
  offsetDays: number;

  hoursPerKayakPerDay: number;
  boardDoesNotPay: boolean;

  maxWeeksByRole: Record<string, number>;
  maxItemsByRole: Record<string, number>;
};

function getVar(doc: GearVarsDoc | null, key: string): any {
  return doc?.vars?.[key]?.value;
}

function toNumber(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function toBool(v: any, fallback: boolean): boolean {
  if (v === true) return true;
  if (v === false) return false;
  return fallback;
}

export async function getGearVars(db: FirebaseFirestore.Firestore): Promise<GearVars> {
  const snap = await db.collection("setup").doc("vars_gear").get();
  const raw = (snap.exists ? (snap.data() as GearVarsDoc) : null) || null;

  const offsetDays = toNumber(getVar(raw, "offset_rezerwacji"), 1);
  const hoursPerKayakPerDay = toNumber(getVar(raw, "godzinki_za_kajak"), 10);
  const boardDoesNotPay = toBool(getVar(raw, "zarzad_nie_płaci_za_sprzet"), false);

  const maxWeeksByRole: Record<string, number> = {
    rola_zarzad: toNumber(getVar(raw, "zarząd_max_time"), 4),
    rola_kr: toNumber(getVar(raw, "zarząd_max_time"), 4),
    rola_czlonek: toNumber(getVar(raw, "członek_max_time"), 2),
    rola_kandydat: toNumber(getVar(raw, "kandydat_max_time"), 1),
  };

  const maxItemsByRole: Record<string, number> = {
    rola_zarzad: toNumber(getVar(raw, "zarząd_max_items"), 100),
    rola_kr: toNumber(getVar(raw, "zarząd_max_items"), 100),
    rola_czlonek: toNumber(getVar(raw, "członek_max_items"), 3),
    rola_kandydat: toNumber(getVar(raw, "kandydat_max_items"), 1),
  };

  return {
    offsetDays,
    hoursPerKayakPerDay,
    boardDoesNotPay,
    maxWeeksByRole,
    maxItemsByRole,
  };
}

export function roleMaxWeeks(vars: GearVars, roleKey: string): number {
  return Number(vars.maxWeeksByRole[roleKey] ?? 0);
}

export function roleMaxItems(vars: GearVars, roleKey: string): number {
  return Number(vars.maxItemsByRole[roleKey] ?? 0);
}
