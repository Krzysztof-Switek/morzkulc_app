// FAZA 0 (plan: Audyty/12.06_panel_zarzadu_problemy_i_plan_wdrozenia.md)
// Porządki danych-widm w Firestore prod, wg decyzji D1/D2:
//   D1: usunięcie 2 testowych godzinek-widm (bez wiersza w arkuszu, marzec 2026)
//   Z8: usunięcie duplikatu "Marna godzinka..." (młodszy z dwóch rekordów)
//   D2: przywrócenie 3 imprez-widm do obiegu arkuszowego
//       (sheetSyncedAt=null + source="app" -> backfill syncu odtworzy wiersze)
//
// Domyślnie DRY-RUN. Wykonanie: node --use-system-ca functions/scripts/fixGhostApprovals.js --execute
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const EXECUTE = process.argv.includes("--execute");

// D1: testowe zgłoszenia godzinek bez wiersza w arkuszu ("test 1", "twstowa praca...")
const GODZINKI_DELETE = ["snuw8ea4wwQnBRqdPfFU", "RDZbiy0lOjJ0vcQ1RQic"];
// Z8: duplikat — zostaje QZqUO5WSP2IKHAQyAtvZ (starszy, wiersz 79), usuwamy młodszy (wiersz 80)
const GODZINKI_DUPLICATE_DELETE = "MLvuBG81arXtaYS0BuTe";
// D2: imprezy-widma do przywrócenia w arkuszu przez backfill
const EVENTS_RESTORE = ["sT6K5wwkbhzoLdIXmGkZ", "T9KqWeuaXux5uwBqzg70", "Pbq0PvERSTqA3K64kQUy"];

(async () => {
  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");

  for (const id of [...GODZINKI_DELETE, GODZINKI_DUPLICATE_DELETE]) {
    const ref = db.collection("godzinki_ledger").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`SKIP delete godzinki ${id} — dokument nie istnieje`);
      continue;
    }
    const x = snap.data();
    if (x.approved === true) {
      console.log(`ABORT delete godzinki ${id} — rekord jest ZATWIERDZONY, nie usuwam`);
      continue;
    }
    console.log(`DELETE godzinki ${id}: "${String(x.reason).slice(0, 40)}" amount=${x.amount} approved=${x.approved}`);
    if (EXECUTE) await ref.delete();
  }

  for (const id of EVENTS_RESTORE) {
    const ref = db.collection("events").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`SKIP restore event ${id} — dokument nie istnieje`);
      continue;
    }
    const x = snap.data();
    if (x.approved === true) {
      console.log(`SKIP restore event ${id} — już zatwierdzona`);
      continue;
    }
    console.log(`RESTORE event ${id}: "${x.name}" -> sheetSyncedAt=null, source="app" (backfill odtworzy wiersz)`);
    if (EXECUTE) {
      await ref.update({
        sheetSyncedAt: null,
        sheetRowNumber: null,
        source: "app",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  console.log("Gotowe." + (EXECUTE ? "" : " (nic nie zapisano — dry-run)"));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
