/**
 * Wspólne pomocniki tekstowe (D4: norm() było kopiowane per plik).
 */

/** Bezpieczna normalizacja do przyciętego stringa ("" dla null/undefined). */
export function norm(v: any): string {
  return String(v || "").trim();
}
