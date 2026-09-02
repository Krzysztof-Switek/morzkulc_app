// READ-ONLY diagnostyka: sprawdza czy jakiś user ma >2 aktywne, niebędące
// instruktorem zapisy basenowe na ten sam sessionId (dzień) — powinno być
// zablokowane przez enrollInSlot po fixie z 01.09.2026.
// node --use-system-ca functions/scripts/checkBasenDailyLimit.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  const snap = await db.collection("basen_enrollments").where("status", "==", "active").get();

  const rows = [];
  snap.forEach((d) => {
    const x = d.data() || {};
    rows.push({
      id: d.id,
      sessionId: x.sessionId,
      slot: x.slot,
      userUid: x.userUid,
      userEmail: x.userEmail,
      type: x.type,
      status: x.status,
      chargedGodziny: x.chargedGodziny,
      createdAt: tsToIso(x.createdAt),
    });
  });

  console.log(`basen_enrollments status=active (${rows.length} dokumentów)\n`);
  console.log(JSON.stringify(rows, null, 2));

  const byKey = new Map();
  for (const r of rows) {
    if (r.type === "instructor") continue;
    const key = `${r.sessionId}__${r.userUid}`;
    const list = byKey.get(key) || [];
    list.push(r);
    byKey.set(key, list);
  }

  console.log("\n--- Grupy sessionId+userUid z >=2 aktywnymi slotami (nie-instruktor) ---");
  for (const [key, list] of byKey.entries()) {
    if (list.length >= 2) {
      console.log(`${key}: ${list.length} slotów -> ${list.map((r) => r.slot).join(", ")}`);
    }
  }

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
