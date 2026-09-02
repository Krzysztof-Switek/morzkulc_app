// TEST + CLEANUP: kursant Z godzinami na koncie zapisujący się na slot ogólnodostępny
// (H2) — powinien zostać poprawnie obciążony (-1h), tak jak zwykły członek.
// node --use-system-ca functions/scripts/testKursantBillingPositive.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const {
  getBasenVars,
  createSession,
  enrollInSlot,
} = require("../lib/modules/basen/basen_service");
const { adminAddBasenGodziny } = require("../lib/modules/basen/basen_godziny_service");

const TEST_DATE = "2027-06-16";
const TEST_UID = "TEST_KURSANT_POS_" + Date.now();

async function cleanup() {
  await db.collection("basen_enrollments").doc(`${TEST_DATE}_H2_${TEST_UID}`).delete().catch(() => {});
  const ledgerSnap = await db.collection("basen_godziny_ledger").where("uid", "==", TEST_UID).get();
  for (const doc of ledgerSnap.docs) await doc.ref.delete();
  await db.collection("basen_sessions").doc(TEST_DATE).delete().catch(() => {});
  console.log(`\n[cleanup] usunięto sesję ${TEST_DATE}, 1 zapis, ${ledgerSnap.size} wpisów ledgera dla ${TEST_UID}.`);
}

(async () => {
  try {
    const existing = await db.collection("basen_sessions").doc(TEST_DATE).get();
    if (existing.exists) { console.error("FAILED: sesja już istnieje."); process.exit(2); }

    const vars = await getBasenVars(db);
    await createSession(db, {
      date: TEST_DATE, saunaEnabled: false,
      h1Reserved: { count: vars.basen_limit_uczestnikow, restrictedToKursant: true },
      h2Reserved: undefined,
      notes: "TEST AUTOMATYCZNY — do usunięcia",
      createdBy: "test-script", vars,
    });

    await adminAddBasenGodziny(db, { uid: TEST_UID, amount: 5, reason: "TEST", performedBy: "test-script" });
    console.log(`Dopisano 5h testowemu kursantowi ${TEST_UID}.`);

    console.log(`\n--- Zapis kursanta (5h na koncie) na H2 (ogólnodostępny) ---`);
    await enrollInSlot(db, {
      sessionId: TEST_DATE, slot: "H2", uid: TEST_UID,
      email: "test@test.local", displayName: "Test Kursant Pos", mode: "regular", isKursant: true,
    });
    console.log("WYNIK: zapis na H2 powiódł się.");

    const enrollSnap = await db.collection("basen_enrollments").doc(`${TEST_DATE}_H2_${TEST_UID}`).get();
    console.log("chargedGodziny na zapisie:", enrollSnap.data().chargedGodziny, "(oczekiwane: true)");

    const ledgerSnap = await db.collection("basen_godziny_ledger").where("uid", "==", TEST_UID).get();
    const records = ledgerSnap.docs.map((d) => d.data());
    console.log(`Wpisy w ledgerze (${records.length}):`);
    records.forEach((r) => console.log("  ", r.type, r.amount, "-", r.reason));
    const balance = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    console.log(`Saldo końcowe: ${balance} h (oczekiwane: 4 — 5 dopisane, -1 za zapis na H2).`);

    await cleanup();
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e.message);
    await cleanup().catch(() => {});
    process.exit(2);
  }
})();
