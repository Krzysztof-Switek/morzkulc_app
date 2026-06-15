// READ-ONLY: oczekujące na zatwierdzenie godzinki i imprezy (stan panelu zarządu).
// node --use-system-ca functions/scripts/readPendingApprovals.js
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  return String(v);
}

function ageDays(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

(async () => {
  // Godzinki pending — jak w getAdminPendingHandler (bez orderBy, żeby złapać też doc bez createdAt)
  const ledgerSnap = await db.collection("godzinki_ledger").where("approved", "==", false).get();
  const ledger = [];
  ledgerSnap.forEach((d) => {
    const x = d.data() || {};
    if (x.type !== "earn" && x.type !== "purchase") return;
    const createdAt = tsToIso(x.createdAt);
    ledger.push({
      id: d.id,
      type: x.type,
      amount: x.amount,
      uid: String(x.uid || "").slice(0, 10),
      reason: String(x.reason || "").slice(0, 40),
      createdAt,
      ageDays: ageDays(createdAt),
      grantedAt: tsToIso(x.grantedAt),
      sheetRowNumber: x.sheetRowNumber ?? "(brak)",
      sheetSyncedAt: tsToIso(x.sheetSyncedAt) ?? (("sheetSyncedAt" in x) ? "null" : "(brak pola)"),
    });
  });
  ledger.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  // Events pending
  const eventsSnap = await db.collection("events").where("approved", "==", false).get();
  const events = [];
  eventsSnap.forEach((d) => {
    const x = d.data() || {};
    const createdAt = tsToIso(x.createdAt);
    events.push({
      id: d.id,
      name: x.name,
      startDate: x.startDate,
      source: x.source,
      createdAt: createdAt || "(BRAK createdAt — niewidoczne w panelu!)",
      ageDays: ageDays(createdAt),
      sheetRowNumber: x.sheetRowNumber ?? "(brak)",
      sheetSyncedAt: tsToIso(x.sheetSyncedAt) ?? (("sheetSyncedAt" in x) ? "null" : "(brak pola)"),
    });
  });
  events.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  console.log(`godzinki_ledger pending (${ledger.length}):\n` + JSON.stringify(ledger, null, 2));
  console.log(`\nevents pending (${events.length}):\n` + JSON.stringify(events, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
