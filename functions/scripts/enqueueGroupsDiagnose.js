// READ-ONLY diagnostyka grup Workspace przez kolejkę jobów.
// Tworzy job `groups.diagnose`, czeka na wynik, po czym wypisuje raport z service_diag/groups.
//
// WYMAGANIA:
//   - funkcje muszą być wdrożone (build + `firebase deploy --only functions` na prod),
//     bo trigger onJobCreated uruchamia KOD WDROŻONY w chmurze.
//   - ADC z dostępem do projektu: `gcloud auth application-default login`.
//
// URUCHOMIENIE (z katalogu functions/):
//   node scripts/enqueueGroupsDiagnose.js

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

(async () => {
  const id = `manual-groups-diagnose-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  await ref.set({
    taskId: "groups.diagnose",
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
      if (data.status === "dead") {
        console.error("JOB DEAD:", JSON.stringify(data.lastError, null, 2));
        process.exit(1);
      }

      const diag = await db.collection("service_diag").doc("groups").get();
      console.log("\n===== SNAPSHOT GRUP (service_diag/groups) =====\n");
      console.log(JSON.stringify(diag.data(), null, 2));
      process.exit(0);
    }
  }

  console.log("TIMEOUT po 2 minutach — sprawdź Firestore: service_diag/groups");
  process.exit(1);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
