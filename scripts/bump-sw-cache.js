/**
 * Automatycznie podmienia CACHE_VERSION w public/sw.js przed każdym deployem.
 * Uruchamiany przez predeploy hook w firebase.json.
 *
 * Wersja = krótki hash czasu w base-36, np. "lzx4k2" — unikalny przy każdym deploy.
 */

const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const content = fs.readFileSync(swPath, "utf8");

const newVersion = Date.now().toString(36);
const updated = content.replace(
  /const CACHE_VERSION = "[^"]+";/,
  `const CACHE_VERSION = "${newVersion}";`
);

if (updated === content) {
  console.error("[bump-sw-cache] BŁĄD: nie znaleziono CACHE_VERSION w sw.js");
  process.exit(1);
}

fs.writeFileSync(swPath, updated, "utf8");
console.log(`[bump-sw-cache] CACHE_VERSION → ${newVersion}`);