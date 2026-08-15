// public/core/sw_update.js
// Współdzielony stan "dostępna nowa wersja aplikacji" — ustawiany przez
// app_shell.js (nasłuch wiadomości SW_UPDATED z service workera), czytany
// przez render_shell.js (banner w koncie użytkownika). Osobny moduł, żeby
// uniknąć cyklicznego importu między app_shell.js a render_shell.js.

let pending = false;

export function isSwUpdatePending() {
  return pending;
}

export function setSwUpdatePending(value) {
  pending = Boolean(value);
}

// Prawdziwie pełny reset: wyrejestrowuje Service Workera i czyści cały Cache
// API (nie tylko location.reload()) — zwykły reload zakłada, że nowy SW jest
// już aktywny i jego cache już świeży, co w praktyce nie zawsze się sprawdza
// (długo otwarta karta/PWA na telefonie). Best-effort: błąd unregister/clear
// nie blokuje samego reloadu.
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
