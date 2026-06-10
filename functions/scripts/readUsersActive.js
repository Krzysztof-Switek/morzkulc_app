// READ-ONLY: wypisuje wszystkie dokumenty users_active z polami diagnostycznymi.
// Pomaga zidentyfikować wpisy w Firestore, których nie ma w arkuszu.
//
// URUCHOMIENIE (Windows, inspekcja SSL → wymagana flaga):
//   node --use-system-ca functions/scripts/readUsersActive.js

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "morzkulc-e9df7" });
const db = admin.firestore();

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function isProfileComplete(p) {
  if (!p) return false;
  return Boolean(
    norm(p.firstName) && norm(p.lastName) && norm(p.phone) &&
    norm(p.dateOfBirth) && p.consentRodo === true && p.consentStatute === true
  );
}

function tsToIso(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString().slice(0, 10);
  return String(v);
}

(async () => {
  const snap = await db.collection("users_active").get();

  const rows = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const service = d.service || {};
    rows.push({
      uid: doc.id,
      email: norm(d.email).toLowerCase(),
      role_key: norm(d.role_key),
      status_key: norm(d.status_key),
      memberId: d.memberId || null,
      profileComplete: isProfileComplete(d.profile),
      syncedToSheet: Boolean(service.sheetSyncedAt),
      sheetRow: service.sheetRowNumber || null,
      openingMatch: Boolean(d.openingMatch),
      createdAt: tsToIso(d.createdAt),
    });
  });

  rows.sort((a, b) => a.role_key.localeCompare(b.role_key) || a.email.localeCompare(b.email));

  console.log(`users_active: ${rows.length} dokumentów\n`);

  // Podsumowanie wg roli
  const byRole = {};
  for (const r of rows) byRole[r.role_key] = (byRole[r.role_key] || 0) + 1;
  console.log("Wg roli:", JSON.stringify(byRole), "\n");

  // Kandydaci na "nadmiarowe" względem arkusza:
  // brak memberId LUB nie zsynchronizowany do arkusza LUB profil niekompletny.
  console.log("=== Prawdopodobnie spoza arkusza (brak memberId / nie zsync. / profil niekompletny / admin) ===");
  const suspects = rows.filter((r) =>
    !r.memberId || !r.syncedToSheet || !r.profileComplete || r.email === "admin@morzkulc.pl"
  );
  console.log(JSON.stringify(suspects, null, 2));

  console.log("\n=== Pełna lista users_active ===");
  console.log(JSON.stringify(rows, null, 2));

  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(2);
});
