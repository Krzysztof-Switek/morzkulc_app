// READ-ONLY: stan kolekcji gear_* (liczność, najnowszy updatedAt, ile zezłomowanych).
// node --use-system-ca functions/scripts/readGearCollections.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

const COLLECTIONS = [
  "gear_kayaks",
  "gear_paddles",
  "gear_lifejackets",
  "gear_helmets",
  "gear_throwbags",
  "gear_sprayskirts",
  "gear_flotation_chambers",
  "gear_wetsuits",
  "gear_miscellaneous",
];

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  const out = [];
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    let latest = null;
    let scrapped = 0;
    snap.forEach((d) => {
      const x = d.data() || {};
      if (x.gearScrapped === true) scrapped++;
      const u = x.updatedAt && x.updatedAt.toDate ? x.updatedAt.toDate().getTime() : 0;
      if (!latest || u > latest.t) latest = { t: u, iso: tsToIso(x.updatedAt) };
    });
    out.push({
      collection: name,
      docs: snap.size,
      scrapped,
      latestUpdatedAt: latest ? latest.iso : null,
    });
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
