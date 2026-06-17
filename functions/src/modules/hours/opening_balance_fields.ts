/**
 * Helpery odczytu pól z wiersza bilansu otwarcia (kolekcja users_opening_balance_26).
 * Wspólne dla rejestracji (registerUserHandler) i taska reconcileOpeningBalance,
 * aby mapowanie pól bilansu → admin.* miało jedno źródło prawdy.
 */

/** Normalizuje nagłówek bilansu do dopasowania niewrażliwego na wielkość liter, spacje i kropki. */
export function normObKey(s: any): string {
  return String(s == null ? "" : s).toLowerCase().replace(/[\s.]+/g, "").trim();
}

/** Pierwsza wartość z obData, której znormalizowany nagłówek ZACZYNA SIĘ od prefiksu. */
export function obValueByPrefix(obData: any, prefix: string): any {
  if (!obData) return undefined;
  const np = normObKey(prefix);
  const key = Object.keys(obData).find((k) => normObKey(k).startsWith(np));
  return key ? obData[key] : undefined;
}

/** Pierwsza wartość z obData o znormalizowanym nagłówku równym jednemu z kandydatów. */
export function obValueExact(obData: any, ...names: string[]): any {
  if (!obData) return undefined;
  const set = names.map(normObKey);
  const key = Object.keys(obData).find((k) => set.includes(normObKey(k)));
  return key ? obData[key] : undefined;
}

export function obBool(v: any): boolean {
  if (v === true) return true;
  return ["tak", "true", "1", "✓"].includes(String(v == null ? "" : v).toLowerCase().trim());
}

/**
 * Odczytuje ilość godzinek z dokumentu bilansu otwarcia.
 * Nazwa pola zawiera datę (np. "Godzinki Bilans otwarcia01.04.2026"),
 * dlatego szukamy po prefiksie "Godzinki" (case-insensitive).
 */
export function getObHours(obData: any): number {
  if (!obData) return 0;
  const key = Object.keys(obData).find((k) => k.toLowerCase().startsWith("godzinki"));
  if (!key) return 0;
  return Number(obData[key] ?? 0) || 0;
}

/**
 * Buduje patch pól admin.* z wiersza bilansu otwarcia, aby po rejestracji aplikacja
 * czytała dane z users_active, a nie z kolekcji bilansu. Pełny wiersz i tak jest
 * zachowany w users_active.openingBalance (audyt).
 */
export function buildOpeningBalanceAdminPatch(obData: any): Record<string, any> | null {
  if (!obData) return null;
  const adminPatch: Record<string, any> = {};

  const contributions = obValueByPrefix(obData, "składki");
  if (contributions != null && String(contributions).trim() !== "") {
    adminPatch.contributions = String(contributions).trim();
  }

  // Saldo godzinek z bilansu jako informacja w admin.hours (źródłem prawdy jest godzinki_ledger).
  adminPatch.hours = String(getObHours(obData));

  const schoolYear = obValueExact(obData, "Szkoleniówka");
  if (schoolYear != null && String(schoolYear).trim() !== "") adminPatch.schoolYear = String(schoolYear).trim();

  const badge = obValueExact(obData, "blacha");
  if (badge != null && String(badge).trim() !== "") adminPatch.badge = String(badge).trim();

  const legNr = obValueExact(obData, "Nr leg.", "Nr leg");
  if (legNr != null && String(legNr).trim() !== "") adminPatch.legNr = String(legNr).trim();

  const university = obValueExact(obData, "Uczelnia");
  if (university != null && String(university).trim() !== "") adminPatch.university = String(university).trim();

  const clubFunctions = obValueExact(obData, "Funkcje pełnione na rzecz klubu");
  if (clubFunctions != null && String(clubFunctions).trim() !== "") adminPatch.clubFunctions = String(clubFunctions).trim();

  const founder = obValueExact(obData, "założyciel stowarzyszenia");
  if (founder !== undefined) adminPatch.founder = obBool(founder);

  return Object.keys(adminPatch).length ? adminPatch : null;
}
