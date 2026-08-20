// READ-ONLY: diagnostyka powiadomien o imprezach dla switek.k@gmail.com
// node --use-system-ca investigateEventNotif.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  // 1. setup vars_members -> powiadomienie_imprezy
  const varsSnap = await db.collection("setup").doc("vars_members").get();
  const vars = varsSnap.exists ? varsSnap.data() : null;
  const reminderDaysVar = vars?.vars?.powiadomienie_imprezy;
  console.log("=== setup/vars_members.vars.powiadomienie_imprezy ===");
  console.log(JSON.stringify(reminderDaysVar, null, 2));

  // 2. user record
  const userSnap = await db.collection("users_active")
    .where("email", "==", "switek.k@gmail.com")
    .get();
  console.log(`\n=== users_active gdzie email == switek.k@gmail.com (${userSnap.size}) ===`);
  let uid = null;
  userSnap.forEach((d) => {
    uid = d.id;
    const x = d.data();
    console.log(JSON.stringify({
      uid: d.id,
      email: x.email,
      role_key: x.role_key,
      status_key: x.status_key,
      notifications: x.profile?.notifications || null,
    }, null, 2));
  });

  if (!uid) {
    console.log("Nie znaleziono usera po dokladnym emailu - probuje case-insensitive skan...");
    const allSnap = await db.collection("users_active").get();
    allSnap.forEach((d) => {
      const x = d.data();
      if (String(x.email || "").toLowerCase().trim() === "switek.k@gmail.com") {
        uid = d.id;
        console.log(JSON.stringify({
          uid: d.id,
          email: x.email,
          role_key: x.role_key,
          status_key: x.status_key,
          notifications: x.profile?.notifications || null,
        }, null, 2));
      }
    });
  }

  if (!uid) {
    console.log("BRAK usera - koniec.");
    process.exit(0);
  }

  // 3. event_interests dla tego uid
  const interestSnap = await db.collection("event_interests")
    .where("uid", "==", uid)
    .get();
  console.log(`\n=== event_interests dla uid=${uid} (${interestSnap.size}) ===`);
  const interestEventIds = [];
  interestSnap.forEach((d) => {
    const x = d.data();
    interestEventIds.push(x.eventId);
    console.log(JSON.stringify({ docId: d.id, ...x, createdAt: tsToIso(x.createdAt) }, null, 2));
  });

  // 4. wszystkie zatwierdzone imprezy w najblizszych 14 dniach + te z listy interestEventIds
  const todayIso = new Date().toISOString().slice(0, 10);
  const eventsSnap = await db.collection("events").get();
  console.log(`\n=== Wydarzenia (today=${todayIso}), przefiltrowane: startDate w ciagu 14 dni LUB w event_interests ===`);
  eventsSnap.forEach((d) => {
    const x = d.data();
    const isNear = x.startDate >= todayIso && x.startDate <= addDays(todayIso, 14);
    const isInterest = interestEventIds.includes(d.id);
    if (isNear || isInterest) {
      console.log(JSON.stringify({
        id: d.id,
        name: x.name,
        startDate: x.startDate,
        endDate: x.endDate,
        approved: x.approved,
        rejected: x.rejected,
        reminderSentAt: tsToIso(x.reminderSentAt),
        createdAt: tsToIso(x.createdAt),
        isInterestOfUser: isInterest,
      }, null, 2));
    }
  });

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
