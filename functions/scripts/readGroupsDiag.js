// READ-ONLY: odczyt raportu service_diag/groups + ostatniego joba groups.diagnose.
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

(async () => {
  const diag = await db.collection("service_diag").doc("groups").get();
  if (!diag.exists) {
    console.log("service_diag/groups: BRAK (raport jeszcze nie powstał)");
  } else {
    const d = diag.data() || {};
    const gen = d.generatedAt && d.generatedAt.toDate ? d.generatedAt.toDate().toISOString() : d.generatedAt;
    console.log("service_diag/groups generatedAt:", gen);
    console.log("\n===== SNAPSHOT =====\n");
    console.log(JSON.stringify(d, null, 2));
  }

  console.log("\n===== Ostatnie joby groups.diagnose =====");
  const jobs = await db.collection("service_jobs")
    .where("taskId", "==", "groups.diagnose")
    .get();
  const rows = [];
  jobs.forEach((j) => {
    const x = j.data() || {};
    rows.push({
      id: j.id,
      status: x.status,
      attempts: x.attempts || 0,
      lastError: x.lastError ? x.lastError.message : null,
    });
  });
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
