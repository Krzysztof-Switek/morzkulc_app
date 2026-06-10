const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

(async () => {
  const id = `manual-lista-policy-post-rolemailbox-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  await ref.set({
    taskId: "lista.enforcePostingPolicy",
    payload: {},
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("CREATED job id:", id);

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const snap = await ref.get();
    const data = snap.data() || {};
    console.log(
      `[t+${(i + 1) * 5}s] status=${data.status} attempts=${data.attempts || 0}` +
        (data.lastError ? ` lastError=${JSON.stringify(data.lastError)}` : "")
    );
    if (data.status === "done" || data.status === "dead") {
      console.log("FINAL doc:", JSON.stringify(data, null, 2));
      process.exit(0);
    }
  }
  console.log("TIMEOUT after 2 minutes — check Firestore manually");
  process.exit(1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});