/**
 * km_places_service.ts
 *
 * Serwis słownika nazw akwenów (km_places).
 * Używany do podpowiedzi autocomplete w formularzu dodawania wpisu.
 *
 * Model km_places/{placeId}:
 *   name: string           — canonical nazwa
 *   aliases: string[]      — alternatywne nazwy (historyczne, skróty)
 *   searchTerms: string[]  — tokeny lowercase do array-contains query
 *   waterType?: string     — typ akwenu (mountains, lowlands, sea, ...)
 *   country?: string       — kraj
 *   useCount: number       — licznik użyć (popularity)
 *   createdAt, updatedAt: Timestamp
 *
 * Wyszukiwanie: array-contains na polu searchTerms, limit 10, debounce po stronie klienta.
 */

import * as admin from "firebase-admin";

/**
 * Tokenizuje nazwę na lowercase tokeny do full-text-like search.
 * Przykład: "Rzeka Radunia" → ["rzeka", "radunia", "rzeka radunia"]
 */
export function tokenizeName(name: string): string[] {
  const lower = name.trim().toLowerCase();
  if (!lower) return [];
  const words = lower.split(/\s+/).filter(Boolean);
  const tokens = new Set<string>([lower, ...words]);
  // Dodaj prefiks każdego słowa (min 2 znaki) dla prefix-match
  for (const w of words) {
    for (let i = 2; i < w.length; i++) {
      tokens.add(w.slice(0, i));
    }
    // Pełne słowo już w tokens
  }
  return Array.from(tokens).slice(0, 50); // limit tokenów
}

/**
 * Wyszukuje podpowiedzi nazw akwenów pasujących do query.
 * Wymaga indeksu Firestore na (searchTerms ARRAY_CONTAINS, useCount DESC).
 * Zwraca lat/lng jeśli zapisane w słowniku (używane przez formularz do prefill).
 */
export async function searchKmPlaces(
  db: FirebaseFirestore.Firestore,
  query: string,
  limit = 10
): Promise<any[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  try {
    const snap = await db.collection("km_places")
      .where("searchTerms", "array-contains", q)
      .orderBy("useCount", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      const result: Record<string, any> = {
        placeId: d.id,
        name: data.name,
        waterType: data.waterType || null,
        country: data.country || null,
        useCount: data.useCount || 0,
      };
      if (data.lat != null) result.lat = data.lat;
      if (data.lng != null) result.lng = data.lng;
      return result;
    });
  } catch {
    // Jeśli indeks jeszcze nie istnieje lub query się nie powiodło — zwróć pusty wynik
    return [];
  }
}

/**
 * Tworzy lub aktualizuje wpis w słowniku nazw akwenów.
 * Wywołane przy zapisie nowego wpisu km — jeśli placeName jest nowy, dodaje go.
 * Inkrementuje useCount jeśli wpis już istnieje.
 * Zapisuje lat/lng jeśli podane (dla mapy), nie nadpisuje istniejących współrzędnych.
 */
export async function upsertKmPlace(
  db: FirebaseFirestore.Firestore,
  opts: {
    placeId?: string;
    name: string;
    waterType?: string;
    country?: string;
    lat?: number;
    lng?: number;
  }
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const searchTerms = tokenizeName(opts.name);

  if (opts.placeId) {
    // Znany placeId — inkrementuj useCount, uzupełnij lat/lng jeśli brakuje
    const ref = db.collection("km_places").doc(opts.placeId);
    const snap = await ref.get();
    if (snap.exists) {
      const existing = snap.data() as any;
      const upd: Record<string, any> = {
        useCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      };
      if (opts.lat != null && existing.lat == null) upd.lat = opts.lat;
      if (opts.lng != null && existing.lng == null) upd.lng = opts.lng;
      await ref.update(upd);
      return opts.placeId;
    }
  }

  // Brak placeId — sprawdź czy istnieje po canonical name
  const existing = await db.collection("km_places")
    .where("name", "==", opts.name)
    .limit(1)
    .get();

  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    const existingData = existing.docs[0].data() as any;
    const upd: Record<string, any> = {
      useCount: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    };
    if (opts.lat != null && existingData.lat == null) upd.lat = opts.lat;
    if (opts.lng != null && existingData.lng == null) upd.lng = opts.lng;
    await ref.update(upd);
    return ref.id;
  }

  // Nowy wpis
  const ref = db.collection("km_places").doc();
  const newDoc: Record<string, any> = {
    placeId: ref.id,
    name: opts.name,
    aliases: [],
    searchTerms,
    waterType: opts.waterType || null,
    country: opts.country || null,
    useCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.lat != null) newDoc.lat = opts.lat;
  if (opts.lng != null) newDoc.lng = opts.lng;
  await ref.set(newDoc);
  return ref.id;
}
