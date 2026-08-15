// READ-ONLY: diagnozuje dlaczego kafelek "Godzinki" na stronie głównej może się
// nie wyświetlać / nie liczyć dla danego użytkownika. Sprawdza:
//   1. rolę/status w users_active (kafelek jest CELOWO ukryty dla sympatyka i kursanta),
//   2. rekordy godzinki_ledger i obliczone saldo (logika 1:1 z computeBalance w
//      functions/src/modules/hours/godzinki_service.ts).
// node --use-system-ca functions/scripts/checkUserGodzinkiHome.js <email>
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

function computeBalance(records, now) {
  let positiveBalance = 0;
  let netOverdraft = 0;
  for (const r of records) {
    if (r.type === "earn") {
      if (r.approved === true) {
        const expiresAt = r.expiresAt && typeof r.expiresAt.toDate === "function" ? r.expiresAt.toDate() : null;
        if (expiresAt && expiresAt > now) positiveBalance += Number(r.remaining ?? 0);
      }
    } else if (r.type === "spend") {
      if (r.refunded !== true) netOverdraft += Number(r.overdraft ?? 0);
    } else if (r.type === "purchase") {
      if (r.approved !== false) netOverdraft -= Number(r.amount ?? 0);
    }
  }
  return positiveBalance - netOverdraft;
}

(async () => {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: node checkUserGodzinkiHome.js <email>");
    process.exit(1);
  }

  const userSnap = await db.collection("users_active").where("email", "==", email).limit(1).get();
  if (userSnap.empty) {
    console.log("USER: nie znaleziono w users_active dla email", email);
    process.exit(0);
  }

  const uid = userSnap.docs[0].id;
  const u = userSnap.docs[0].data();
  const roleKey = String(u.role_key || "");
  const statusKey = String(u.status_key || "");

  console.log("USER:", JSON.stringify({
    uid, email: u.email, role_key: roleKey, status_key: statusKey,
    nickname: u.profile?.nickname || null,
  }, null, 2));

  const isKursant = roleKey === "rola_kursant";
  const isSympatyk = !isKursant && roleKey === "rola_sympatyk";
  console.log("\nKafelek 'Godzinki' na stronie głównej renderuje się TYLKO gdy !isKursant && !isSympatyk.");
  console.log(`  isKursant=${isKursant}  isSympatyk=${isSympatyk}  => kafelek ${(!isKursant && !isSympatyk) ? "POWINIEN być widoczny" : "JEST CELOWO UKRYTY (by design)"}`);

  const ledgerSnap = await db.collection("godzinki_ledger").where("uid", "==", uid).get();
  const records = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  console.log(`\ngodzinki_ledger: ${records.length} rekordów dla uid=${uid}`);
  const byType = {};
  for (const r of records) byType[r.type] = (byType[r.type] || 0) + 1;
  console.log("Wg typu:", JSON.stringify(byType));

  const now = new Date();
  const balance = computeBalance(records, now);
  console.log(`\nObliczone saldo (computeBalance, now=${now.toISOString()}): ${balance} h`);

  console.log("\nSzczegóły rekordów:");
  console.log(JSON.stringify(records.map((r) => ({
    id: r.id, type: r.type, amount: r.amount, remaining: r.remaining, overdraft: r.overdraft,
    approved: r.approved, refunded: r.refunded, expiresAt: tsToIso(r.expiresAt),
    createdAt: tsToIso(r.createdAt), reason: r.reason,
  })), null, 2));

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
