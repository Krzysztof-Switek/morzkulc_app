/** config.gs */

/**
 * WAŻNE
 * - DEV  = sprzet-skk-morzkulc
 * - PROD = morzkulc-e9df7
 * - Ten plik wybiera środowisko przez CURRENT_ENV.
 * - W projekcie DEV ustaw CURRENT_ENV = "dev"
 * - W projekcie PROD ustaw CURRENT_ENV = "prod"
 *
 * Sync sprzętu wykonuje backend (task gear.syncAllFromSheet) — ten plik dostarcza
 * wyłącznie URL endpointu backendu. Arkusz, kolekcje i kategorie sprzętu są
 * skonfigurowane po stronie backendu (functions/src/service/service_config.ts),
 * nie tutaj.
 */

const CURRENT_ENV = "prod"; // "dev" | "prod"

const CONFIG_DEV = {
  ENV_NAME: "dev",
  SYNC_ENDPOINT_URL: "https://sprzet-skk-morzkulc.web.app/api/apps-script-sync",
};

const CONFIG_PROD = {
  ENV_NAME: "prod",
  SYNC_ENDPOINT_URL: "https://morzkulc-e9df7.web.app/api/apps-script-sync",
};

const CONFIG = CURRENT_ENV === "prod" ? CONFIG_PROD : CONFIG_DEV;
