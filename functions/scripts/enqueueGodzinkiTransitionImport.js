// Import tegorocznych godzinek/korekt z arkusza "Godzinki 2026 i korekty" do godzinki_ledger.
// Tworzy job `godzinki.importTransitionFromSheet`, czeka na wynik.
//
// WYMAGANIA:
//   - funkcje wdrożone (build + `firebase deploy --only functions`) — trigger uruchamia KOD W CHMURZE.
//   - ADC: `gcloud auth application-default login`.
//   - spreadsheetId: z env SVC_GODZINKI_TRANSITION_SHEET_ID (wdrożonej funkcji) LUB z --spreadsheet=<id>.
//
// URUCHOMIENIE (z katalogu functions/):
//   node scripts/enqueueGodzinkiTransitionImport.js [--project dev|prod] [--dry] [--spreadsheet=<id>] [--tab="Godzinki 2026 i korekty"]

const admin = require("firebase-admin");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const getOpt = (name) => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : "";
};
const projArg = getOpt("project");
const projectId = projArg === "dev" ? "sprzet-skk-morzkulc" :
  projArg === "prod" || projArg === "" ? "morzkulc-e9df7" : projArg;
const spreadsheetId = getOpt("spreadsheet");
const tabName = getOpt("tab");

admin.initializeApp({ projectId });
const db = admin.firestore();

(async () => {
  const payload = { dry };
  if (spreadsheetId) payload.spreadsheetId = spreadsheetId;
  if (tabName) payload.tabName = tabName;

  const id = `manual-godzinki-transition-${Date.now()}`;
  const ref = db.collection("service_jobs").doc(id);
  await ref.set({
    taskId: "godzinki.importTransitionFromSheet",
    payload,
    status: "queued",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`CREATED job id: ${id} (project=${projectId}, payload=${JSON.stringify(payload)})`);

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
