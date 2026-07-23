// Runner remediacji bilansu otwarcia: opening.reconcile (uzgadnia godzinki_ledger
// z kolekcją users_opening_balance_26). Uruchamia REALNY skompilowany task.
//
// DOMYŚLNIE DRY-RUN (bez zapisu). Podaj argument "apply", by ZAPISAĆ na produkcji.
//
// URUCHOMIENIE:
//   node --use-system-ca functions/scripts/runReconcileOpeningBalance.js          (dry-run)
//   node --use-system-ca functions/scripts/runReconcileOpeningBalance.js apply    (zapis)
//   ...[apply] <email>   — tryb punktowy dla jednego użytkownika
//
// Wymaga zbudowanego lib/: npm --prefix functions run build

const admin = require("firebase-admin");
const { reconcileOpeningBalanceTask } = require("../lib/service/tasks/reconcileOpeningBalance");

const PROJECT = process.env.GCLOUD_PROJECT || "morzkulc-e9df7";
const args = process.argv.slice(2);
const APPLY = args.includes("apply");
const email = args.find((a) => a.includes("@")) || undefined;

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();

const logger = {
  info: (m, x) => console.log("· " + m, x ? JSON.stringify(x) : ""),
  warn: (m, x) => console.log("⚠ " + m, x ? JSON.stringify(x) : ""),
  error: (m, x) => console.log("✗ " + m, x ? JSON.stringify(x) : ""),
};

(async () => {
  console.log(`Projekt: ${PROJECT} | tryb: ${APPLY ? "APPLY (ZAPIS)" : "DRY-RUN (bez zapisu)"}${email ? " | email=" + email : " | HURTOWO"}\n`);
  const ctx = { firestore: db, logger, dryRun: !APPLY };
  const res = await reconcileOpeningBalanceTask.run({ dry: !APPLY, email }, ctx);
  console.log("\n=== WYNIK ===");
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.ok ? 0 : 1);
})().catch((e) => { console.error("FAILED:", e && e.message); process.exit(2); });
