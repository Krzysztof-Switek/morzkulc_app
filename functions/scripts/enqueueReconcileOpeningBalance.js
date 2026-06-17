// Jednorazowy reconciliation już-zarejestrowanych ze świeżą kolekcją users_opening_balance_26.
// Tworzy job `opening.reconcile`, czeka na wynik.
//
// WYMAGANIA:
//   - funkcje wdrożone (build + `firebase deploy --only functions`) — trigger uruchamia KOD W CHMURZE.
//   - ADC: `gcloud auth application-default login`.
//
// URUCHOMIENIE (z katalogu functions/):
//   node scripts/enqueueReconcileOpeningBalance.js [--project dev|prod] [--dry]
//   (na tej maszynie zwykle: node --use-system-ca scripts/enqueueReconcileOpeningBalance.js --dry)

const admin = require("firebase-admin");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const projArg = (args.find((a) => a.startsWith("--project")) || "").split("=")[1] ||
  (args[args.indexOf("--project") + 1] || "");
const projectId = projArg === "dev" ? "sprzet-skk-morzkulc" :
  projArg === "prod" || projArg === "" ? "morzkulc-e9df7" : projArg;

admin.initializeApp({ projectId });
const db = admin.firestore();

(async () => {
  const id = `manual-opening-reconcile-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  await ref.set({
    taskId: "opening.reconcile",
    payload: { dry },
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`CREATED job id: ${id} (project=${projectId}, dry=${dry})`);

  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const snap = await ref.get();
    const data = snap.data() || {};
    console.log(`[t+${(i + 1) * 5}s] status=${data.status} attempts=${data.attempts || 0}`);
    if (data.status === "done" || data.status === "dead") {
      console.log("\n===== RESULT =====\n");
      console.log(JSON.stringify(data.result || data.lastError || data, null, 2));
      process.exit(data.status === "done" ? 0 : 1);
    }
  }
  console.log("TIMEOUT po 3 minutach — sprawdź service_jobs/" + id);
  process.exit(1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
