// READ-ONLY: wypisuje WSZYSTKIE rezerwacje sprzętu danego użytkownika (dowolny
// status), żeby zdiagnozować dlaczego coś nie pojawia się w raporcie
// getAdminGearRentalsHandler (który filtruje status==="active" + startDate<=to
// + endDate>=from).
// node --use-system-ca functions/scripts/checkUserGearReservations.js <email>
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: node checkUserGearReservations.js <email>");
    process.exit(1);
  }

  const userSnap = await db.collection("users_active").where("email", "==", email).limit(1).get();
  let uid = null;
  if (!userSnap.empty) {
    uid = userSnap.docs[0].id;
    const u = userSnap.docs[0].data();
    console.log("USER:", JSON.stringify({ uid, email: u.email, role_key: u.role_key, status_key: u.status_key }, null, 2));
  } else {
    console.log("USER: nie znaleziono w users_active dla email", email);
  }

  const seen = new Map();

  if (uid) {
    const byUid = await db.collection("gear_reservations").where("userUid", "==", uid).get();
    byUid.forEach((d) => seen.set(d.id, d.data()));
  }

  const byEmail = await db.collection("gear_reservations").where("userEmail", "==", email).get();
  byEmail.forEach((d) => seen.set(d.id, d.data()));

  console.log(`\nZnaleziono ${seen.size} rezerwacji (po userUid i/lub userEmail):\n`);

  const rows = Array.from(seen.entries()).map(([id, r]) => ({
    id,
    status: r.status,
    userUid: r.userUid,
    userEmail: r.userEmail,
    startDate: r.startDate,
    endDate: r.endDate,
    blockStartIso: r.blockStartIso,
    blockEndIso: r.blockEndIso,
    costHours: r.costHours,
    kayakIds: r.kayakIds,
    itemIds: r.itemIds,
    cancelledAt: tsToIso(r.cancelledAt),
    cancelledByAdmin: r.cancelledByAdmin,
    cancelReason: r.cancelReason,
    createdAt: tsToIso(r.createdAt),
  }));

  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
