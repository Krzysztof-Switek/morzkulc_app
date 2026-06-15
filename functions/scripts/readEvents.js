// READ-ONLY: ostatnie dokumenty z kolekcji events (najnowsze pierwsze).
// node --use-system-ca functions/scripts/readEvents.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

(async () => {
  const snap = await db.collection("events").get();

  const rows = [];
  snap.forEach((d) => {
    const x = d.data() || {};
    rows.push({
      id: d.id,
      name: x.name,
      startDate: x.startDate,
      endDate: x.endDate,
      approved: x.approved,
      source: x.source,
      userEmail: x.userEmail || null,
      createdAt: tsToIso(x.createdAt),
      sheetRowNumber: x.sheetRowNumber ?? "(brak pola)",
      sheetSyncedAt: tsToIso(x.sheetSyncedAt) ?? (("sheetSyncedAt" in x) ? "null" : "(brak pola)"),
      calendarEventId: x.calendarEventId || null,
    });
  });

  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  console.log(`events (${rows.length} dokumentów, najnowsze pierwsze):\n`);
  console.log(JSON.stringify(rows.slice(0, 15), null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
