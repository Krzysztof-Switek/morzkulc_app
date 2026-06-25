import {overlapsIso} from "../../calendar/calendar_utils";

// ──────────────────────────────────────────────────────────────────────────────
// Limit rezerwacji liczony PER KATEGORIA (zamyka lukę S2).
//
// Reguła: dla każdego rodzaju sprzętu osobno suma sztuk w aktywnych, nakładających
// się rezerwacjach użytkownika nie może przekroczyć `maxItems` (limit roli).
// Dzięki temu komplet można złożyć z kilku osobnych rezerwacji (kajak osobno,
// wiosło osobno), a limit nadal pilnuje, by nie trzymać >N sztuk danej kategorii
// w tym samym czasie.
//
// Te helpery są mirrorowane w tests/test_bundle_reservations.py.
// ──────────────────────────────────────────────────────────────────────────────

function norm(s: any): string {
  return String(s || "").trim();
}

/**
 * Zlicza sztuki sprzętu PER KATEGORIA w aktywnych, nakładających się
 * rezerwacjach użytkownika.
 *
 * Format bundle: tally po `r.items[].category`.
 * Format legacy: `r.kayakIds[]` liczone jako kategoria "kayaks".
 */
export async function countMyOverlappingItemsByCategory(
  db: FirebaseFirestore.Firestore,
  uid: string,
  blockStartIso: string,
  blockEndIso: string,
  excludeReservationId?: string,
  tx?: FirebaseFirestore.Transaction
): Promise<Map<string, number>> {
  const query = db
    .collection("gear_reservations")
    .where("userUid", "==", uid)
    .where("status", "==", "active")
    .where("blockStartIso", "<=", blockEndIso);
  const snap = tx ? await tx.get(query) : await query.get();

  const counts = new Map<string, number>();

  for (const doc of snap.docs) {
    const r = doc.data() as any;
    if (excludeReservationId && norm(r?.id) === excludeReservationId) continue;

    const rStart = norm(r?.blockStartIso);
    const rEnd = norm(r?.blockEndIso);
    if (!rStart || !rEnd) continue;
    if (!overlapsIso(rStart, rEnd, blockStartIso, blockEndIso)) continue;

    if (Array.isArray(r?.items) && r.items.length > 0) {
      for (const it of r.items as any[]) {
        const cat = norm(it?.category).toLowerCase() || "kayaks";
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    } else if (Array.isArray(r?.kayakIds)) {
      counts.set("kayaks", (counts.get("kayaks") ?? 0) + (r.kayakIds as any[]).length);
    }
  }

  return counts;
}

/**
 * Zlicza żądane pozycje PER KATEGORIA.
 */
export function countItemsByCategory(items: { category: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const cat = norm(it?.category).toLowerCase();
    if (!cat) continue;
    m.set(cat, (m.get(cat) ?? 0) + 1);
  }
  return m;
}

/**
 * Zwraca pierwszą kategorię, dla której `already + requested > maxItems`,
 * albo null gdy limit zachowany. Sprawdza tylko kategorie obecne w żądaniu —
 * dodanie sprzętu jednej kategorii nie może przekroczyć limitu innej.
 */
export function findCategoryOverLimit(
  already: Map<string, number>,
  requested: Map<string, number>,
  maxItems: number
): { category: string; already: number; requested: number } | null {
  for (const [cat, req] of requested.entries()) {
    const have = already.get(cat) ?? 0;
    if (have + req > maxItems) {
      return {category: cat, already: have, requested: req};
    }
  }
  return null;
}
