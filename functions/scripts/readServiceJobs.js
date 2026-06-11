// READ-ONLY: ostatnie joby z service_jobs (najnowsze pierwsze).
// node --use-system-ca functions/scripts/readServiceJobs.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  const snap = await db.collection("service_jobs")
    .orderBy("createdAt", "desc")
    .limit(25)
    .get();

  const rows = [];
  snap.forEach((d) => {
    const x = d.data() || {};
    rows.push({
      id: d.id,
      taskId: x.taskId,
      status: x.status,
      attempts: x.attempts || 0,
      requestedBy: (x.payload && x.payload.requestedBy) || null,
      createdAt: tsToIso(x.createdAt),
      lastError: x.lastError ? String(x.lastError.message || x.lastError).slice(0, 300) : null,
    });
  });

  console.log(`service_jobs (ostatnie ${rows.length}):\n`);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
