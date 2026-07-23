// READ-ONLY weryfikacja bezpieczeństwa danych finansowych boxa „Klub".
//
// Uruchamia PRAWDZIWY skompilowany handler getKlubInfo (functions/lib/...) — ten sam
// kod, który się wdraża — jako KAŻDE realne konto z users_active i sprawdza, czy pola
// finansowe (finanse.stanKonta / finanse.stanGotowki) trafiają do odpowiedzi.
//
// Reguła: finanse widzą WYŁĄCZNIE role rola_zarzad i rola_kr. Każde inne konto, które
// dostanie te pola = NARUSZENIE (skrypt kończy się kodem 1 i wypisuje listę).
//
// Bramka w handlerze zależy tylko od roli żądającego (czytanej z users_active/{uid}),
// więc podstawiając uid danego użytkownika testujemy dokładnie realną logikę serwera.
//
// URUCHOMIENIE (Windows, inspekcja SSL → wymagana flaga):
//   node --use-system-ca functions/scripts/checkKlubFinanceLeak.js [projectId]
//   domyślnie projectId = morzkulc-e9df7 (prod)

const admin = require("firebase-admin");
const { handleGetKlubInfo } = require("../lib/api/getKlubInfoHandler");

const PROJECT = process.argv[2] || process.env.GCLOUD_PROJECT || "morzkulc-e9df7";
// = SVC_ADMIN_ROLE_KEYS (default); zweryfikowano: brak nadpisania w .env.* .
const ADMIN_ROLE_KEYS = ["rola_zarzad", "rola_kr"];

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();

// Wywołuje realny handler jako użytkownik (uid/email), zwraca przechwyconą odpowiedź.
async function callKlub(uid, email) {
  const req = { method: "GET", headers: {} };
  const res = {};
  res.status = (c) => { res._code = c; return res; };
  res.json = (o) => { res._json = o; return res; };
  res.setHeader = () => {};

  const deps = {
    db,
    sendPreflight: () => false,
    requireAllowedHost: () => true,
    setCorsHeaders: () => {},
    // handler odpala logikę wewnątrz corsHandler i nie zwraca promise — łapiemy go.
    corsHandler: (rq, rs, fn) => { rs._done = Promise.resolve().then(fn); },
    requireIdToken: async () => ({ decoded: { uid, email } }),
    adminRoleKeys: ADMIN_ROLE_KEYS,
  };

  handleGetKlubInfo(req, res, deps);
  await res._done;
  return res;
}

function hasFinanceFields(json) {
  const fin = (json && json.finanse) || {};
  return fin.stanKonta !== undefined || fin.stanGotowki !== undefined;
}

(async () => {
  const snap = await db.collection("users_active").get();
  const users = [];
  snap.forEach((d) => {
    const x = d.data() || {};
    users.push({
      uid: d.id,
      email: String(x.email || "").toLowerCase(),
      role: String(x.role_key || ""),
    });
  });
  users.sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));

  console.log(`Projekt: ${PROJECT}`);
  console.log(`Role z dostępem do finansów: ${JSON.stringify(ADMIN_ROLE_KEYS)}`);
  console.log(`users_active: ${users.length} kont\n`);

  const byRole = {};         // role -> { total, withFinance }
  const violations = [];     // nie-admin z finansami LUB admin bez finansów

  for (const u of users) {
    const res = await callKlub(u.uid, u.email);
    const hasFin = hasFinanceFields(res._json);
    const isAdmin = ADMIN_ROLE_KEYS.includes(u.role);

    byRole[u.role] = byRole[u.role] || { total: 0, withFinance: 0 };
    byRole[u.role].total++;
    if (hasFin) byRole[u.role].withFinance++;

    if (!isAdmin && hasFin) {
      violations.push({ uid: u.uid, email: u.email, role: u.role, problem: "KONTO SPOZA KR/ZARZĄD WIDZI FINANSE", finanse: res._json.finanse });
    }
    if (isAdmin && !hasFin) {
      violations.push({ uid: u.uid, email: u.email, role: u.role, problem: "KR/ZARZĄD NIE WIDZI FINANSÓW", httpCode: res._code, json: res._json });
    }
  }

  console.log("=== Podsumowanie wg roli ===");
  console.log("(withFinance powinno = total dla rola_zarzad/rola_kr, oraz 0 dla każdej innej roli)\n");
  for (const role of Object.keys(byRole).sort()) {
    const r = byRole[role];
    const expect = ADMIN_ROLE_KEYS.includes(role) ? "→ oczekiwane: WSZYSTKIE" : "→ oczekiwane: 0";
    console.log(`  ${role.padEnd(16)} total=${String(r.total).padStart(3)}  withFinance=${String(r.withFinance).padStart(3)}  ${expect}`);
  }
  console.log("");

  // Surowe próbki odpowiedzi (dowód „na oczy").
  const sampleNon = users.find((u) => !ADMIN_ROLE_KEYS.includes(u.role));
  const sampleAdm = users.find((u) => ADMIN_ROLE_KEYS.includes(u.role));
  if (sampleNon) {
    const r = await callKlub(sampleNon.uid, sampleNon.email);
    console.log(`Próbka NIE-admin (${sampleNon.role} / ${sampleNon.email}):`);
    console.log(`  finanse = ${JSON.stringify(r._json && r._json.finanse)}`);
  }
  if (sampleAdm) {
    const r = await callKlub(sampleAdm.uid, sampleAdm.email);
    console.log(`Próbka ADMIN   (${sampleAdm.role} / ${sampleAdm.email}):`);
    console.log(`  finanse = ${JSON.stringify(r._json && r._json.finanse)}`);
  }
  console.log("");

  const nonAdminCount = users.filter((u) => !ADMIN_ROLE_KEYS.includes(u.role)).length;

  if (violations.length) {
    console.log(`❌ WYKRYTO NARUSZENIA (${violations.length}):`);
    console.log(JSON.stringify(violations, null, 2));
    process.exit(1);
  }

  console.log(`✅ OK — żadne z ${nonAdminCount} kont spoza Zarządu/KR nie otrzymało danych finansowych.`);
  console.log("   Wszystkie konta Zarząd/KR otrzymały finanse zgodnie z oczekiwaniem.");
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e && e.message);
  process.exit(2);
});
