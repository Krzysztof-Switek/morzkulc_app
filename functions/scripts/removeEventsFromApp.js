// Usuwa wskazane imprezy z aplikacji (np. DUPLIKATY) — Firestore.
//
// Ustawia: approved=false (znika z listy w aplikacji), rejected=true
// (znika z panelu zarządu i digestu — filtr Fazy 2), rejectedReason="removed_duplicate",
// removedFromSheetAt. Wpis w Google Calendar (jeśli był) zostanie usunięty przy
// najbliższym `events.syncCalendar` (pass usuwający rejected==true — cron 05:00
// lub przycisk „Synchronizuj zatwierdzenia" w panelu).
//
// KIEDY UŻYĆ: dla duplikatów/imprez BEZ wiersza w arkuszu. Jeśli impreza MA wiersz
// w arkuszu — usuń wiersz w arkuszu i uruchom sync (eventsSyncFromSheet zrobi
// reconciliation). Inaczej kolejny sync mógłby ponownie ustawić approved=true.
//
// Domyślnie DRY-RUN. Użycie:
//   node --use-system-ca functions/scripts/removeEventsFromApp.js --ids ID1,ID2
//   node --use-system-ca functions/scripts/removeEventsFromApp.js --ids ID1,ID2 --execute
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const EXECUTE = process.argv.includes("--execute");

function parseIds() {
  const argv = process.argv;
  let raw = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ids") { raw = argv[i + 1] || ""; break; }
    if (argv[i].startsWith("--ids=")) { raw = argv[i].slice("--ids=".length); break; }
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

(async () => {
  const ids = parseIds();
  if (!ids.length) {
    console.error("Brak ID. Użycie: --ids ID1,ID2[,...] [--execute]");
    process.exit(1);
  }

  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");
  console.log(`Do rozpatrzenia: ${ids.length} imprez\n`);

  let removed = 0;
  let skipped = 0;

  for (const id of ids) {
    const ref = db.collection("events").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`SKIP ${id} — dokument nie istnieje`);
      skipped++;
      continue;
    }
    const x = snap.data() || {};
    if (x.rejected === true) {
      console.log(`SKIP ${id} — już oznaczona jako usunięta/odrzucona`);
      skipped++;
      continue;
    }

    const hasRow = (typeof x.sheetRowNumber === "number" && x.sheetRowNumber > 0) ||
      (x.sheetSyncedAt && typeof x.sheetSyncedAt.toDate === "function");
    const rowWarn = hasRow ?
      "  UWAGA: ma wiersz w arkuszu — rozważ usunięcie wiersza + sync zamiast tego skryptu (inaczej sync może przywrócić approved)." :
      "";

    console.log(
      `REMOVE ${id}: "${String(x.name || "").slice(0, 50)}" start=${x.startDate} approved=${x.approved} source=${x.source}` + rowWarn
    );

    if (EXECUTE) {
      await ref.update({
        approved: false,
        rejected: true,
        rejectedReason: "removed_duplicate",
        removedFromSheetAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    removed++;
  }

  console.log(
    `\nPodsumowanie: ${EXECUTE ? "usunięto" : "do usunięcia"}=${removed}, pominięto=${skipped}` +
    (EXECUTE ? "\nKalendarz: wpisy znikną przy najbliższym events.syncCalendar (cron 05:00 lub przycisk w panelu)." : " (nic nie zapisano — dry-run)")
  );
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
