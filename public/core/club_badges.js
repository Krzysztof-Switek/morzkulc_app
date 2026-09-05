// Ikonki/nazwy klubów w grupie zaprzyjaźnionych klubów — Morzkulc + 4
// partnerskie (Bystrze, Panta Rei, Habazie, Przewrotka). Impreza z organizatorem
// spoza tej piątki (albo bez wybranego organizatora) nie dostaje żadnej
// ikonki/informacji — świadoma decyzja, nie placeholder.
//
// "Impreza klubowa" (jedyny przypadek z darmową rezerwacją sprzętu przez
// kierownika) to WYŁĄCZNIE organizer==="morzkulc" + ustawiony kierownik.
//
// Na dziś (feedback użytkownika 04.09.2026, wersja desktopowa) plakietka
// pokazuje ikonkę + nazwę klubu, bez kierownika — nazwa jest potrzebna, bo
// część logotypów (np. Przewrotka) słabo czyta się samodzielnie w małym
// rozmiarze.

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const CLUB_ORGANIZER_KEYS = ["morzkulc", "bystrze", "panta_rei", "habazie", "przewrotka"];

export const CLUB_DISPLAY_NAMES = {
  morzkulc: "Morzkulc",
  bystrze: "Bystrze",
  panta_rei: "Panta Rei",
  habazie: "Habazie",
  przewrotka: "Przewrotka",
};

// Ścieżka stała wg klucza — podmiana pliku (np. gdy dotrze prawdziwe logo
// Przewrotki) nie wymaga żadnej zmiany w kodzie.
export function clubIconPath(key) {
  return `/assets/clubs/${key}.png`;
}

export function clubDisplayName(key) {
  return CLUB_DISPLAY_NAMES[String(key || "").trim().toLowerCase()] || "";
}

/**
 * HTML plakietki organizatora (ikonka + nazwa klubu, bez kierownika — patrz
 * uwaga wyżej), do wstawienia w tym samym rzędzie co nazwa imprezy. Pusty
 * string, gdy organizator nie jest jednym z 5 znanych kluczy.
 */
export function renderClubBadgeHtml(organizer) {
  const key = String(organizer || "").trim().toLowerCase();
  const name = clubDisplayName(key);
  if (!name) return "";

  return `
    <span class="clubBadge">
      <img class="clubBadgeIcon" src="${escapeHtml(clubIconPath(key))}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}" loading="lazy">
      <span class="clubBadgeName">${escapeHtml(name)}</span>
    </span>
  `;
}
