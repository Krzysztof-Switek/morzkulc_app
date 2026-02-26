export function isIsoDateYYYYMMDD(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

export function todayIsoUTC(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseIsoToUtcDate(iso: string): Date {
  const [yy, mm, dd] = iso.split("-").map((x) => Number(x));
  return new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoToUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function computeBlockIso(startIso: string, endIso: string, offsetDays: number) {
  const off = Number(offsetDays || 0);
  return {
    blockStartIso: addDaysIso(startIso, -off),
    blockEndIso: addDaysIso(endIso, off),
  };
}

export function maxEndIsoByWeeks(weeks: number): string {
  const today = todayIsoUTC();
  return addDaysIso(today, Number(weeks || 0) * 7);
}

export function overlapsIso(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  // YYYY-MM-DD lexicographic compare works
  return aStart <= bEnd && aEnd >= bStart;
}

export function daysOnWaterInclusive(startIso: string, endIso: string): number {
  const a = parseIsoToUtcDate(startIso).getTime();
  const b = parseIsoToUtcDate(endIso).getTime();
  const days = Math.floor((b - a) / (24 * 3600 * 1000)) + 1;
  return days < 1 ? 0 : days;
}
