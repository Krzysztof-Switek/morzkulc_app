// Ręczne uruchomienie setup.syncFromSheet (sync arkusza App_SETUP -> Firestore).
// node --use-system-ca functions/scripts/enqueueSetupSyncFromSheet.js [--dry]
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const dry = args.includes("--dry");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

(async () => {
  const id = `manual-setup-sync-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  await ref.set({
    taskId: "setup.syncFromSheet",
    payload: { dry },
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`CREATED job id: ${id} (dry=${dry})`);

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
