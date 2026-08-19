/**
 * File: config.gs
 * Purpose: config arkusza "App_SETUP" — jedyne źródło konfiguracji aplikacji.
 *
 * Tylko PROD — środowisko dev (sprzet-skk-morzkulc) jest nieaktualne, nieużywane.
 */

const CONFIG = {
  ENV_NAME: "prod",
  // Endpoint backendu wyzwalający sync (przez Firebase Hosting rewrite → prywatna funkcja).
  SYNC_ENDPOINT_URL: "https://morzkulc-e9df7.web.app/api/apps-script-sync",
};
