// Cofnięcie naliczonych opłat godzinkowych za sprzęt dla użytkownika, który w ramach
// tegorocznej szkoleniówki powinien wypożyczać BEZPŁATNIE (do końca września).
//
// Co robi dla każdego rekordu "spend" tego użytkownika (niezwrócony, niezwolniony,
// powiązany z rezerwacją sprzętu):
//   1) przywraca pobrane godzinki do oryginalnych pul FIFO (earn.remaining += fromEarn),
//   2) przepisuje rekord spend na "waived" (fromEarn=0, overdraft=0, earnDeductions=[],
//      waived=true) — saldo wraca do stanu sprzed opłaty, a w historii koszt zostaje
//      przekreślony jako zwolnienie (identycznie jak nowa logika createBundleReservation),
//   3) oznacza dokument rezerwacji waived=true.
//
// Saldo rośnie dokładnie o pobraną kwotę (fromEarn z pul + overdraft wyzerowany).
//
// Domyślnie DRY-RUN. Wykonanie:
//   node --use-system-ca functions/scripts/waiveUserGearCharges.js --execute
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const EXECUTE = process.argv.includes("--execute");
const EMAIL = (process.argv.find((a) => a.includes("@")) || "grzegorzpd80@gmail.com").trim().toLowerCase();

function toDate(v) {
  return v && typeof v.toDate === "function" ? v.toDate() : null;
}

// Mirror functions/src/modules/hours/godzinki_service.ts computeBalance
function computeBalance(records, now = new Date()) {
  let positive = 0;
  let netOverdraft = 0;
  for (const r of records) {
    if (r.type === "earn") {
      if (r.approved === true) {
        const exp = toDate(r.expiresAt);
        if (exp && exp > now) positive += Number(r.remaining || 0);
      }
    } else if (r.type === "spend") {
      if (r.refunded !== true) netOverdraft += Number(r.overdraft || 0);
    } else if (r.type === "purchase") {
      if (r.approved !== false) netOverdraft -= Number(r.amount || 0);
    }
  }
  return positive - netOverdraft;
}

(async () => {
  console.log(EXECUTE ? "=== TRYB WYKONANIA ===" : "=== DRY-RUN (dodaj --execute aby wykonać) ===");
  console.log("Użytkownik:", EMAIL);

  const us = await db.collection("users_active").where("email", "==", EMAIL).limit(1).get();
  if (us.empty) {
    console.error("BŁĄD: brak users_active dla", EMAIL);
    process.exit(2);
  }
  const uid = us.docs[0].id;
  console.log("uid:", uid, "rola:", us.docs[0].data().role_key);

  const ledgerSnap = await db.collection("godzinki_ledger").where("uid", "==", uid).get();
  const records = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log("Saldo PRZED:", computeBalance(records));

  const spends = ledgerSnap.docs.filter((d) => {
    const x = d.data();
    return x.type === "spend" && x.refunded !== true && x.waived !== true && x.reservationId;
  });

  if (!spends.length) {
    console.log("Brak naliczonych (niezwolnionych) opłat z rezerwacją — nic do zrobienia.");
    process.exit(0);
  }

  let delta = 0;
  for (const sdoc of spends) {
    const s = sdoc.data();
    const rId = String(s.reservationId);
    const rRef = db.collection("gear_reservations").doc(rId);
    const rSnap = await rRef.get();
    const amount = Number(s.amount || 0);
    const fromEarn = Number(s.fromEarn || 0);
    const overdraft = Number(s.overdraft || 0);
    const deds = Array.isArray(s.earnDeductions) ? s.earnDeductions : [];

    console.log(`\nSPEND ${sdoc.id}: amount=${amount} fromEarn=${fromEarn} overdraft=${overdraft} reservationId=${rId} gearExists=${rSnap.exists}`);
    console.log(`  reason: "${String(s.reason || "").slice(0, 60)}"`);
    if (!rSnap.exists) {
      console.log("  SKIP — reservationId nie wskazuje na gear_reservations");
      continue;
    }
    for (const d of deds) console.log(`  → przywróć pulę ${d.earnId} += ${d.amount}`);
    delta += amount;

    if (EXECUTE) {
      await db.runTransaction(async (tx) => {
        const poolRefs = deds.map((d) => db.collection("godzinki_ledger").doc(String(d.earnId)));
        const poolSnaps = await Promise.all(poolRefs.map((ref) => tx.get(ref)));
        poolSnaps.forEach((ps, i) => {
          if (ps.exists) {
            const cur = Number(ps.data().remaining || 0);
            tx.update(poolRefs[i], {
              remaining: cur + Number(deds[i].amount || 0),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.log(`  UWAGA: pula ${deds[i].earnId} nie istnieje — pomijam (część salda może nie wrócić)`);
          }
        });
        tx.update(sdoc.ref, {
          waived: true,
          fromEarn: 0,
          overdraft: 0,
          earnDeductions: [],
          refunded: false,
          reason: String(s.reason || "") + " — zwolnienie (korekta szkoleniówka)",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(rRef, {
          waived: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      console.log("  WYKONANO.");
    }
  }

  if (EXECUTE) {
    const after = (await db.collection("godzinki_ledger").where("uid", "==", uid).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`\nSaldo PO (rzeczywiste): ${computeBalance(after)} (oczekiwana delta +${delta})`);
  } else {
    console.log(`\nSzacowane saldo PO: ${computeBalance(records) + delta} (delta +${delta})`);
    console.log("DRY-RUN — nic nie zapisano. Uruchom z --execute aby wykonać.");
  }
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
