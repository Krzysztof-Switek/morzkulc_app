// Usuwa TESTOWE/ŚMIECIOWE godzinki-widma z Firestore (pending, bez wiersza w arkuszu).
//
// Bezpieczeństwo (analiza w Audyty/12.06_panel_zarzadu_audyt.md):
//   - rekordy approved==false nie wchodzą do bilansu (computeBalance liczy tylko
//     approved earn z remaining>0; pending purchase pomijany) → usunięcie jest
//     balans-neutralne,
//   - pending earn nigdy nie jest źródłem dedukcji (spend.earnDeductions wskazują
//     tylko zatwierdzone pule) → brak osieroconych referencji,
//   - sync iteruje wiersze arkusza; rekord bez wiersza nie jest nigdzie odwoływany.
//
// Zabezpieczenia skryptu:
//   - approved===true            → ABORT (nie ruszamy zatwierdzonych),
//   - rekord MA wiersz w arkuszu → WARN/SKIP (usunięcie zostawiłoby osierocony
//     wiersz; taki przypadek wymaga też skasowania wiersza w arkuszu — poza
//     zakresem „śmieci bez wiersza"),
//   - nie istnieje               → SKIP.
//
// Domyślnie DRY-RUN. Użycie:
//   node --use-system-ca functions/scripts/deleteGhostGodzinki.js --ids ID1,ID2
//   node --use-system-ca functions/scripts/deleteGhostGodzinki.js --ids ID1,ID2 --execute
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

function hasSheetRow(x) {
  const rowNum = x.sheetRowNumber;
  const hasRowNumber = typeof rowNum === "number" && rowNum > 0;
  const syncedIsTimestamp = x.sheetSyncedAt && typeof x.sheetSyncedAt.toDate === "function";
  return hasRowNumber || syncedIsTimestamp;
}

(async () => {
  const ids = parseIds();
  if (!ids.length) {
    console.error("Brak ID. Użycie: --ids ID1,ID2[,...] [--execute]");
    process.exit(1);
  }

  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");
  console.log(`Do rozpatrzenia: ${ids.length} rekordów\n`);

  let deleted = 0;
  let skipped = 0;
  let aborted = 0;

  for (const id of ids) {
    const ref = db.collection("godzinki_ledger").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`SKIP ${id} — dokument nie istnieje`);
      skipped++;
      continue;
    }

    const x = snap.data() || {};

    if (x.approved === true) {
      console.log(`ABORT ${id} — rekord jest ZATWIERDZONY (approved==true), nie usuwam`);
      aborted++;
      continue;
    }

    if (hasSheetRow(x)) {
      console.log(
        `WARN/SKIP ${id} — rekord MA wiersz w arkuszu ` +
        `(sheetRowNumber=${x.sheetRowNumber ?? "?"}, sheetSyncedAt=${x.sheetSyncedAt && x.sheetSyncedAt.toDate ? x.sheetSyncedAt.toDate().toISOString() : x.sheetSyncedAt}). ` +
        `Najpierw usuń wiersz w arkuszu, potem rekord — pomijam.`
      );
      skipped++;
      continue;
    }

    console.log(
      `DELETE ${id}: type=${x.type} amount=${x.amount} approved=${x.approved} ` +
      `reason="${String(x.reason || "").slice(0, 50)}"`
    );
    if (EXECUTE) await ref.delete();
    deleted++;
  }

  console.log(
    `\nPodsumowanie: ${EXECUTE ? "usunięto" : "do usunięcia"}=${deleted}, pominięto=${skipped}, abort(zatwierdzone)=${aborted}` +
    (EXECUTE ? "" : " (nic nie zapisano — dry-run)")
  );
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
