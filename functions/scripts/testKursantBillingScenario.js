// TEST + CLEANUP: sprawdza empirycznie, czy kursant jest zwolniony z opłaty za basen
// TYLKO na slocie zarezerwowanym dla kursantów (viaReservedPool), czy też (błędnie)
// na KAŻDYM slocie (w tym ogólnodostępnym). Tworzy testową sesję na bezpieczną,
// odległą datę, zapisuje testowego (fałszywego) usera na H1 (100% dla kursantów) i H2
// (ogólnodostępny), sprawdza czy H2 wymaga godzin, po czym CAŁKOWICIE sprząta po sobie.
//
// node --use-system-ca functions/scripts/testKursantBillingScenario.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); // ten sam ustawienie co w functions/src/index.ts

const {
  getBasenVars,
  createSession,
  enrollInSlot,
  cancelSession,
} = require("../lib/modules/basen/basen_service");

const TEST_DATE = "2027-06-15"; // odległa, bezpieczna data — nie koliduje z realnymi terminami
const TEST_UID = "TEST_KURSANT_" + Date.now();

async function cleanup() {
  const enrollIds = [`${TEST_DATE}_H1_${TEST_UID}`, `${TEST_DATE}_H2_${TEST_UID}`];
  for (const id of enrollIds) {
    await db.collection("basen_enrollments").doc(id).delete().catch(() => {});
  }
  const ledgerSnap = await db.collection("basen_godziny_ledger").where("uid", "==", TEST_UID).get();
  for (const doc of ledgerSnap.docs) await doc.ref.delete();
  await db.collection("basen_sessions").doc(TEST_DATE).delete().catch(() => {});
  console.log(`\n[cleanup] usunięto sesję testową ${TEST_DATE}, ${enrollIds.length} zapisów, ${ledgerSnap.size} wpisów ledgera dla ${TEST_UID}.`);
}

(async () => {
  try {
    const existing = await db.collection("basen_sessions").doc(TEST_DATE).get();
    if (existing.exists) {
      console.error(`FAILED: sesja ${TEST_DATE} już istnieje — przerywam, żeby nic nie nadpisać.`);
      process.exit(2);
    }

    const vars = await getBasenVars(db);
    const capacity = vars.basen_limit_uczestnikow;
    console.log(`Pojemność (basen_limit_uczestnikow) = ${capacity}`);

    await createSession(db, {
      date: TEST_DATE,
      saunaEnabled: false,
      h1Reserved: { count: capacity, restrictedToKursant: true }, // 100% dla kursantów
      h2Reserved: undefined, // w pełni ogólnodostępny
      notes: "TEST AUTOMATYCZNY — do usunięcia",
      createdBy: "test-script",
      vars,
    });
    console.log(`Utworzono testową sesję ${TEST_DATE}: H1 = 100% kursanci, H2 = ogólnodostępny.\n`);

    const sessionSnap = await db.collection("basen_sessions").doc(TEST_DATE).get();
    const session = sessionSnap.data();
    console.log("H1:", JSON.stringify(session.slots.H1));
    console.log("H2:", JSON.stringify(session.slots.H2));

    console.log(`\n--- Zapis kursanta (uid=${TEST_UID}) na H1 (pula kursowa) ---`);
    try {
      await enrollInSlot(db, {
        sessionId: TEST_DATE,
        slot: "H1",
        uid: TEST_UID,
        email: "test-kursant@test.local",
        displayName: "Test Kursant",
        mode: "regular",
        isKursant: true,
      });
      console.log("WYNIK: zapis na H1 powiódł się (oczekiwane — pula kursowa, 0 wymaganych godzin).");
    } catch (e) {
      console.log("WYNIK: zapis na H1 ODRZUCONY:", e.message, "(NIEOCZEKIWANE — pula kursowa powinna być darmowa i zawsze dostępna).");
    }

    const ledgerAfterH1 = await db.collection("basen_godziny_ledger").where("uid", "==", TEST_UID).get();
    console.log(`Wpisów w basen_godziny_ledger po H1: ${ledgerAfterH1.size} (oczekiwane: 0 — pula kursowa nie powinna obciążać godzin).`);

    console.log(`\n--- Zapis TEGO SAMEGO kursanta (0 h na koncie) na H2 (slot OGÓLNODOSTĘPNY) ---`);
    try {
      await enrollInSlot(db, {
        sessionId: TEST_DATE,
        slot: "H2",
        uid: TEST_UID,
        email: "test-kursant@test.local",
        displayName: "Test Kursant",
        mode: "regular",
        isKursant: true,
      });
      console.log("WYNIK: zapis na H2 POWIÓDŁ SIĘ mimo 0 h na koncie.");
    } catch (e) {
      console.log("WYNIK: zapis na H2 ODRZUCONY:", e.message);
    }

    const ledgerAfterH2 = await db.collection("basen_godziny_ledger").where("uid", "==", TEST_UID).get();
    console.log(`Wpisów w basen_godziny_ledger po H2: ${ledgerAfterH2.size}.`);
    ledgerAfterH2.forEach((d) => console.log("  ", JSON.stringify(d.data())));

    await cleanup();
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e.message, e.stack);
    await cleanup().catch(() => {});
    process.exit(2);
  }
})();
