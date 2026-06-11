// Usuwa konkretny, wiszący job z service_jobs.
// node --use-system-ca functions/scripts/deleteStuckJob.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const ID = "users.syncFunctionRolesFromSetup:1780911005363";

(async () => {
  const ref = db.collection("service_jobs").doc(ID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log("Nie istnieje (już usunięty?):", ID);
    process.exit(0);
  }
  const d = snap.data() || {};
  console.log("Usuwam job:", ID, "| status:", d.status, "| lastError:", d.lastError ? d.lastError.message : null);
  await ref.delete();
  console.log("Usunięto.");
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
