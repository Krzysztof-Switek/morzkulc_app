// public/core/sw_update.js
// hardReloadApp() — używane po kliknięciu baneru "nowa wersja aplikacji"
// (#swUpdateReloadBtn w headerze, app_shell.js). Prawdziwie pełny reset:
// wyrejestrowuje Service Workera i czyści cały Cache API (nie tylko
// location.reload()) — zwykły reload zakłada, że nowy SW jest już aktywny
// i jego cache już świeży, co w praktyce nie zawsze się sprawdza (długo
// otwarta karta/PWA na telefonie). Best-effort: błąd unregister/clear nie
// blokuje samego reloadu.
export async function hardReloadApp() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // best-effort — nawet przy błędzie i tak przeładowujemy
  }
  location.reload();
}
