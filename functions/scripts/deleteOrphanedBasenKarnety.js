// Kolekcja `basen_karnety` jest teraz w pełni osierocona — moduł Basen usunął cały
// system karnetów (kod, endpointy, indeksy). Żaden kod już nie czyta/pisze do tej
// kolekcji, więc bezpiecznie kasujemy WSZYSTKIE dokumenty (nie tylko testowe).
//
// Domyślnie DRY-RUN. Użycie:
//   node --use-system-ca functions/scripts/deleteOrphanedBasenKarnety.js
//   node --use-system-ca functions/scripts/deleteOrphanedBasenKarnety.js --execute
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const EXECUTE = process.argv.includes("--execute");

(async () => {
  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");

  const snap = await db.collection("basen_karnety").get();
  console.log(`Znaleziono ${snap.size} dokumentów w basen_karnety.\n`);

  for (const doc of snap.docs) {
    const x = doc.data() || {};
    console.log(
      `${EXECUTE ? "DELETE" : "WOULD DELETE"} ${doc.id}: userEmail=${x.userEmail} ` +
      `totalEntries=${x.totalEntries} usedEntries=${x.usedEntries} status=${x.status}`
    );
    if (EXECUTE) await doc.ref.delete();
  }

  console.log(`\nPodsumowanie: ${EXECUTE ? "usunięto" : "do usunięcia"}=${snap.size}` + (EXECUTE ? "" : " (nic nie zapisano — dry-run)"));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
