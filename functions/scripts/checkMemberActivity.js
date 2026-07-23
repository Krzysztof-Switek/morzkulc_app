// READ-ONLY test regresyjny raportu „Najbardziej aktywni" (panel Zarząd → Raporty).
//
// Uruchamia PRAWDZIWY skompilowany handler getAdminMemberActivity (functions/lib/...)
// — ten sam kod, który się wdraża — i sprawdza:
//   1) autoryzację: konto spoza Zarządu/KR → HTTP 403,
//   2) działanie: konto Zarząd/KR → ok=true dla zakresów (default=semester) month/
//      semester/year, oraz custom bez dat → HTTP 400,
//   3) ranking: lista członków posortowana malejąco po godzinkach.
// Bramka zależy tylko od roli żądającego (z users_active/{uid}).
//
// Wymaga zbudowanego backendu (functions/lib): `npm --prefix functions run build`.
//
// URUCHOMIENIE (Windows, inspekcja SSL → wymagana flaga):
//   node --use-system-ca functions/scripts/checkMemberActivity.js [projectId]
//   domyślnie projectId = morzkulc-e9df7 (prod)

const admin = require("firebase-admin");
const { handleGetAdminMemberActivity } = require("../lib/api/getAdminMemberActivityHandler");

const PROJECT = process.argv[2] || process.env.GCLOUD_PROJECT || "morzkulc-e9df7";
// = SVC_ADMIN_ROLE_KEYS (default); zweryfikowano: brak nadpisania w .env.* .
const ADMIN_ROLE_KEYS = ["rola_zarzad", "rola_kr"];

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();

// Wywołuje realny handler jako użytkownik (uid) z zadanym zakresem.
async function call(uid, range) {
  const req = { method: "GET", headers: {}, query: range ? { range } : {} };
  const res = {};
  res.status = (c) => { res._code = c; return res; };
  res.json = (o) => { res._json = o; return res; };
  res.setHeader = () => {};

  handleGetAdminMemberActivity(req, res, {
    db,
    sendPreflight: () => false,
    requireAllowedHost: () => true,
    setCorsHeaders: () => {},
    corsHandler: (rq, rs, fn) => { rs._done = Promise.resolve().then(fn); },
    requireIdToken: async () => ({ decoded: { uid } }),
    adminRoleKeys: ADMIN_ROLE_KEYS,
  });
  await res._done;
  return res;
}

(async () => {
  const snap = await db.collection("users_active").get();
  let adminUser = null;
  let nonAdminUser = null;
  snap.forEach((d) => {
    const role = String((d.data() || {}).role_key || "");
    if (!adminUser && ADMIN_ROLE_KEYS.includes(role)) adminUser = { uid: d.id, role };
    if (!nonAdminUser && !ADMIN_ROLE_KEYS.includes(role)) nonAdminUser = { uid: d.id, role };
  });

  console.log(`Projekt: ${PROJECT}`);
  console.log(`Role z dostępem: ${JSON.stringify(ADMIN_ROLE_KEYS)}\n`);

  const failures = [];

  // 1) Autoryzacja — nie-admin → 403.
  if (nonAdminUser) {
    const r = await call(nonAdminUser.uid, "semester");
    const ok = r._code === 403;
    console.log(`Nie-admin (${nonAdminUser.role}) → HTTP ${r._code} ${ok ? "✅ (Forbidden)" : "❌ OCZEKIWANO 403"}`);
    if (!ok) failures.push(`nie-admin (${nonAdminUser.role}) dostał HTTP ${r._code}, oczekiwano 403`);
  } else {
    console.log("(brak konta nie-admin do testu — pomijam test 403)");
  }

  // 2) Admin → ok=true dla zakresów (w tym domyślnego = semester).
  if (adminUser) {
    for (const range of [undefined, "month", "semester", "year"]) {
      const r = await call(adminUser.uid, range);
      const j = r._json || {};
      const ok = r._code === 200 && j.ok === true && j.range && j.range.from && j.range.to;
      const label = String(range || "(default)").padEnd(10);
      console.log(`Admin range=${label} → ok=${j.ok} count=${j.count} okres=${j.range ? j.range.key + " " + j.range.from + ".." + j.range.to : "-"} ${ok ? "✅" : "❌"}`);
      if (!ok) failures.push(`admin range=${range} → ok=${j.ok}, code=${r._code}`);
    }

    // Domyślny zakres musi być semester.
    const def = await call(adminUser.uid, undefined);
    const defKey = def._json && def._json.range && def._json.range.key;
    console.log(`Domyślny zakres = ${defKey} ${defKey === "semester" ? "✅" : "❌ OCZEKIWANO semester"}`);
    if (defKey !== "semester") failures.push(`domyślny zakres = ${defKey}, oczekiwano semester`);

    // Walidacja custom bez dat → 400.
    const bad = await call(adminUser.uid, "custom");
    const badOk = bad._code === 400;
    console.log(`Admin custom bez dat → HTTP ${bad._code} ${badOk ? "✅ (400)" : "❌ OCZEKIWANO 400"}`);
    if (!badOk) failures.push(`custom bez dat → HTTP ${bad._code}, oczekiwano 400`);

    // Ranking malejąco + próbka.
    const sem = await call(adminUser.uid, "semester");
    const rows = (sem._json && sem._json.rows) || [];
    let sorted = true;
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i - 1].hours) < Number(rows[i].hours)) { sorted = false; break; }
    }
    console.log(`Ranking malejąco po godzinkach: ${sorted ? "✅" : "❌ NIEPOSORTOWANY"}`);
    if (!sorted) failures.push("ranking nie jest posortowany malejąco");
    console.log(`\nTop 5 (semestr, ${rows.length} członków):`);
    rows.slice(0, 5).forEach((r) => console.log(`  ${r.rank}. ${r.userName || r.userEmail} — ${r.hours} h`));
    if (!rows.length) console.log("  (brak)");
  } else {
    console.log("(brak konta admin do testu — pomijam testy danych)");
    failures.push("brak konta Zarząd/KR do testu");
  }

  console.log("");
  if (failures.length) {
    console.log(`❌ TEST NIEUDANY (${failures.length}):`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("✅ OK — autoryzacja (403/400), zakresy (default=semester) i ranking działają poprawnie.");
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e && e.message);
  process.exit(2);
});
