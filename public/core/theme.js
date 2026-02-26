const STORAGE_KEY = "morzkulc_theme"; // "dark" | "light" | "auto"

function getInitialTheme() {
  // default = dark (as requested)
  const saved = String(localStorage.getItem(STORAGE_KEY) || "").trim();
  if (saved === "light" || saved === "dark" || saved === "auto") return saved;
  return "dark";
}

function applyTheme(mode) {
  const root = document.documentElement; // <html>
  root.setAttribute("data-theme", mode);
  updateToggleUi(mode);
}

function updateToggleUi(mode) {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  // show what will happen on click
  const isLight = mode === "light";
  btn.setAttribute("aria-label", isLight ? "Przełącz na motyw ciemny" : "Przełącz na motyw jasny");
  btn.title = isLight ? "Ciemny" : "Jasny";
  btn.textContent = isLight ? "🌙" : "☀️";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
}

(function initTheme() {
  const mode = getInitialTheme();
  applyTheme(mode);

  // bind after DOM exists (but safe even if called early)
  window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", toggleTheme);
    updateToggleUi(document.documentElement.getAttribute("data-theme") || mode);
  });
})();
