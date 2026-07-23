// READ-ONLY test regresyjny raportu wypożyczonego sprzętu (panel Zarząd → Raporty).
//
// Uruchamia PRAWDZIWY skompilowany handler getAdminGearRentals (functions/lib/...) —
// ten sam kod, który się wdraża — i sprawdza:
//   1) autoryzację: konto spoza Zarządu/KR dostaje HTTP 403,
//   2) działanie: konto Zarząd/KR dostaje ok=true + poprawne zakresy dat dla
//      current/month/semester/year.
// Bramka zależy tylko od roli żądającego (z users_active/{uid}), więc podstawiając
// uid danego konta testujemy realną logikę serwera bez mintowania tokenów.
//
// Wymaga zbudowanego backendu (functions/lib): `npm --prefix functions run build`.
//
// URUCHOMIENIE (Windows, inspekcja SSL → wymagana flaga):
//   node --use-system-ca functions/scripts/checkGearReport.js [projectId]
//   domyślnie projectId = morzkulc-e9df7 (prod)

const admin = require("firebase-admin");
const { handleGetAdminGearRentals } = require("../lib/api/getAdminGearRentalsHandler");

const PROJECT = process.argv[2] || process.env.GCLOUD_PROJECT || "morzkulc-e9df7";
// = SVC_ADMIN_ROLE_KEYS (default); zweryfikowano: brak nadpisania w .env.* .
const ADMIN_ROLE_KEYS = ["rola_zarzad", "rola_kr"];

// Rzeczownik w l. pojedynczej (jak w UI raportu) — do czytelnej próbki.
const NOUN = { kayaks: "Kajak", paddles: "Wiosło", lifejackets: "Kamizelka", helmets: "Kask", throwbags: "Rzutka", sprayskirts: "Fartuch" };

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();

// Wywołuje realny handler jako użytkownik (uid) z zadanym zakresem.
async function call(uid, range) {
  const req = { method: "GET", headers: {}, query: { range: range || "current" } };
  const res = {};
  res.status = (c) => { res._code = c; return res; };
  res.json = (o) => { res._json = o; return res; };
  res.setHeader = () => {};

  handleGetAdminGearRentals(req, res, {
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
    const r = await call(nonAdminUser.uid, "current");
    const ok = r._code === 403;
    console.log(`Nie-admin (${nonAdminUser.role}) → HTTP ${r._code} ${ok ? "✅ (Forbidden)" : "❌ OCZEKIWANO 403"}`);
    if (!ok) failures.push(`nie-admin (${nonAdminUser.role}) dostał HTTP ${r._code}, oczekiwano 403`);
  } else {
    console.log("(brak konta nie-admin do testu — pomijam test 403)");
  }

  // 2) Admin → ok=true dla każdego zakresu.
  if (adminUser) {
    for (const range of ["current", "month", "semester", "year"]) {
      const r = await call(adminUser.uid, range);
      const j = r._json || {};
      const ok = r._code === 200 && j.ok === true && j.range && j.range.from && j.range.to;
      console.log(`Admin (${adminUser.role}) range=${range.padEnd(9)} → ok=${j.ok} count=${j.count} okres=${j.range ? j.range.from + ".." + j.range.to : "-"} ${ok ? "✅" : "❌"}`);
      if (!ok) failures.push(`admin range=${range} → ok=${j.ok}, code=${r._code}`);
    }

    // Walidacja zakresów custom.
    const bad = await call(adminUser.uid, "custom");
    const badOk = bad._code === 400;
    console.log(`Admin custom bez dat → HTTP ${bad._code} ${badOk ? "✅ (400)" : "❌ OCZEKIWANO 400"}`);
    if (!badOk) failures.push(`custom bez dat → HTTP ${bad._code}, oczekiwano 400`);

    // Próbka „Aktualnie wypożyczony".
    const cur = await call(adminUser.uid, "current");
    const rows = (cur._json && cur._json.rows) || [];
    console.log(`\nPróbka „Aktualnie wypożyczony" (do 3 wierszy, ${rows.length} łącznie):`);
    rows.slice(0, 3).forEach((row) => {
      const gear = (row.items || []).map((it) => [NOUN[it.category] || it.categoryLabel, it.number].filter(Boolean).join(" ")).join(", ");
      const nick = row.userNick ? ` (${row.userNick})` : "";
      console.log(`  ${row.userName || row.userEmail}${nick} | ${row.startDate}–${row.endDate} | ${gear}`);
    });
    if (!rows.length) console.log("  (brak aktualnych wypożyczeń)");
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
  console.log("✅ OK — autoryzacja (403/400) i raport (current/month/semester/year) działają poprawnie.");
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e && e.message);
  process.exit(2);
});
