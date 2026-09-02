// Renderowanie surowego, wolnego tekstu (opisy imprez itp.) jako bezpiecznego,
// czytelnego HTML: puste linie usuwane całkowicie (użytkownicy notorycznie
// wciskają Enter dwa razy po KAŻDEJ linijce, nawet krótkich nagłówkach — zwarty
// tekst jest czytelniejszy niż odstępy po każdym zdaniu), linki klikalne,
// wszystko bezpiecznie escapowane przeciw XSS. Kontener nadal potrzebuje CSS
// `white-space: pre-line` — ta funkcja NIE zamienia `\n` na `<br>`.

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBlankLines(raw) {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Allowlist znaków URI — celowo NIE dopasowuje emoji/polskich znaków, więc URL
// wklejony bez spacji przed/po sąsiadującym tekstem nie wchłania go do linku.
const URL_RE = /((?:https?:\/\/|www\.)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;

// Odcina końcową interpunkcję doklejoną do URLa (kropkę, przecinek itp.), żeby
// nie trafiła do hrefa. Świadomy kompromis: URL faktycznie kończący się nawiasem
// zamykającym straci go z linku — akceptowalne dla tego zakresu.
function stripTrailingPunct(match) {
  const m = /^(.*?)([.,;:!?)\]}'"]+)$/.exec(match);
  if (!m) return {url: match, trailing: ""};
  return {url: m[1], trailing: m[2]};
}

// Pole "Miejsce" imprez ma być nazwą miejsca, nie linkiem — użytkownicy notorycznie
// wklejają tam cały link do mapy zamiast nazwy. Używane zarówno do walidacji przy
// zgłaszaniu, jak i do wyświetlania (stare wpisy z linkiem w "Miejsce" pokazujemy
// jako "Zobacz na mapie", a nie jako brzydki surowy URL podpisany "Miejsce:").
export function isUrlOnly(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return /^(https?:\/\/|www\.)\S+$/i.test(t);
}

export function formatFreeText(raw) {
  const normalized = normalizeBlankLines(raw);
  if (!normalized) return "";

  const segments = normalized.split(URL_RE);

  return segments.map((seg, i) => {
    if (i % 2 === 1) {
      const {url, trailing} = stripTrailingPunct(seg);
      const href = /^www\./i.test(url) ? `https://${url}` : url;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
    }
    return escapeHtml(seg);
  }).join("");
}
