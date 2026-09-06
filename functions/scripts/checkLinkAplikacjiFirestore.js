// READ-ONLY: sprawdza setup/vars_members.vars.link_aplikacji po syncu z arkusza.
// node --use-system-ca functions/scripts/checkLinkAplikacjiFirestore.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();
(async () => {
  const snap = await db.collection("setup").doc("vars_members").get();
  console.log(JSON.stringify(snap.data()?.vars?.link_aplikacji, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(2); });
