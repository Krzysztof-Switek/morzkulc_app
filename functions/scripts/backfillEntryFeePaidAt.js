// Backfill daty wpłaty wpisowego dla istniejących kont, które mają rok wpisowego
// (admin.entryFeeYear) ale nie mają jeszcze miesiąca (admin.entryFeePaidAt).
//
// Decyzja zarządu: takim kontom ustawiamy entryFeePaidAt = "2026-06" (czerwiec 2026)
// → panel pokaże „Wpisowe ważne do czerwiec 2027". Idąc dalej, sync
// (users.syncFieldsFromSheet) sam ustawia datę przy pojawieniu się / zmianie wpisowego.
//
// Domyślnie DRY-RUN. Wykonanie:
//   node --use-system-ca functions/scripts/backfillEntryFeePaidAt.js --execute
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const EXECUTE = process.argv.includes("--execute");
const BACKFILL_VALUE = "2026-06";

function norm(v) {
  return String(v == null ? "" : v).trim();
}

(async () => {
  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");
  console.log("Ustawiana wartość admin.entryFeePaidAt =", BACKFILL_VALUE);

  const snap = await db.collection("users_active").get();
  const targets = [];
  for (const d of snap.docs) {
    const x = d.data();
    const feeYear = norm(x.admin && x.admin.entryFeeYear);
    const paidAt = norm(x.admin && x.admin.entryFeePaidAt);
    if (feeYear && !paidAt) {
      targets.push({ uid: d.id, ref: d.ref, email: x.email, role: x.role_key, feeYear });
    }
  }

  console.log(`Kandydaci do backfillu (entryFeeYear ustawione, brak entryFeePaidAt): ${targets.length}`);
  for (const t of targets) {
    console.log(`  uid=${t.uid} email=${t.email} role=${t.role} entryFeeYear="${t.feeYear}" → entryFeePaidAt=${BACKFILL_VALUE}`);
  }

  if (!targets.length) {
    console.log("Nic do zrobienia.");
    process.exit(0);
  }

  if (EXECUTE) {
    let done = 0;
    for (const t of targets) {
      await t.ref.update({
        "admin.entryFeePaidAt": BACKFILL_VALUE,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: "backfillEntryFeePaidAt",
      });
      done++;
    }
    console.log(`WYKONANO: zaktualizowano ${done} kont.`);
  } else {
    console.log("DRY-RUN — nic nie zapisano. Uruchom z --execute aby wykonać.");
  }
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
