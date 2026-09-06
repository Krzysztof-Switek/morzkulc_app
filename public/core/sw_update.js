// public/core/sw_update.js
// hardReloadApp() — używane po kliknięciu baneru "nowa wersja aplikacji"
// (#swUpdateReloadBtn w headerze, app_shell.js). Prawdziwie pełny reset:
// wyrejestrowuje Service Workera i czyści cały Cache API (nie tylko
// location.reload()) — zwykły reload zakłada, że nowy SW jest już aktywny
// i jego cache już świeży, co w praktyce nie zawsze się sprawdza (długo
// otwarta karta/PWA na telefonie). Best-effort: błąd unregister/clear nie
// blokuje samego reloadu.
//
// Watchdog (zgłoszenie użytkownika 06.09.2026, iOS "Dodaj do ekranu głównego"):
// getRegistrations()/unregister()/caches.keys()/caches.delete() to Promise, które
// w normalnym try/catch obsługują tylko ODRZUCENIE — jeśli któraś z nich nigdy
// się nie rozstrzygnie (zawiśnie), `await` czeka w nieskończoność i location.reload()
// NIGDY się nie wykonuje — użytkownik widzi trwale "zawieszoną" aplikację bez
// żadnego błędu w konsoli. Promise.race z limitem czasu gwarantuje, że reload
// nastąpi najpóźniej po WATCHDOG_MS, niezależnie od tego czy sprzątanie się udało.
const WATCHDOG_MS = 4000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hardReloadApp() {
  try {
    await Promise.race([
      (async () => {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      })(),
      delay(WATCHDOG_MS),
    ]);
  } catch {
    // best-effort — nawet przy błędzie i tak przeładowujemy
  }
  location.reload();
}
