// READ-ONLY podgląd remediacji bilansu otwarcia: per zarejestrowany pełny członek
// pokazuje saldo bieżące → projektowane po opening.reconcile, wartość BO z kolekcji
// users_opening_balance_26 i flagi. NIE zapisuje niczego.
//
//   node --use-system-ca functions/scripts/previewOpeningBalanceReconcile.js

const ROOT = require("path").resolve(__dirname, "..");
const admin = require("firebase-admin");
const { computeBalance } = require(ROOT + "/lib/modules/hours/godzinki_service");

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "morzkulc-e9df7" });
const db = admin.firestore();

const norm = (v) => String(v == null ? "" : v).trim();
const lower = (v) => norm(v).toLowerCase();
const normObKey = (s) => String(s == null ? "" : s).toLowerCase().replace(/[\s.]+/g, "").trim();
function obValEx(ob, ...names) {
  if (!ob) return undefined;
  const set = names.map(normObKey);
  const k = Object.keys(ob).find((k) => set.includes(normObKey(k)));
  return k ? ob[k] : undefined;
}
function getObHours(ob) {
  if (!ob) return null;
  const k = Object.keys(ob).find((k) => k.toLowerCase().startsWith("godzinki"));
  if (!k) return null;
  const s = String(ob[k] == null ? "" : ob[k]).trim();
  if (s === "") return "";
  const num = Number(s.replace(",", "."));
  return Number.isFinite(num) ? num : "?";
}

(async () => {
  const [members, ledger, obSnap] = await Promise.all([
    db.collection("users_active").where("role_key", "in", ["rola_czlonek", "rola_zarzad", "rola_kr"]).get(),
    db.collection("godzinki_ledger").get(),
    db.collection("users_opening_balance_26").get(),
  ]);
  const byUid = {};
  ledger.forEach((d) => { const r = d.data(); const u = norm(r.uid); if (!u) return; (byUid[u] = byUid[u] || []).push(r); });
  const byEmail = new Map(); const byName = new Map();
  obSnap.forEach((doc) => {
    const data = doc.data();
    const e = lower(obValEx(data, "e-mail", "email"));
    if (e && e.includes("@") && !byEmail.has(e)) byEmail.set(e, data);
    const f = lower(obValEx(data, "imię", "imie")); const l = lower(obValEx(data, "nazwisko"));
    if (f && l && !byName.has(f + "|" + l)) byName.set(f + "|" + l, data);
  });
  const now = new Date(); const rows = [];
  members.forEach((d) => {
    const u = d.data(); const p = u.profile || {}; const fn = norm(p.firstName); const ln = norm(p.lastName);
    if (!(fn && ln)) return; // tylko zarejestrowani
    const email = lower(u.email);
    let ob = byEmail.get(email); let method = "email";
    if (!ob) { ob = byName.get(lower(fn) + "|" + lower(ln)); method = ob ? "name" : "-"; }
    const recs = byUid[d.id] || []; const cur = computeBalance(recs, now);
    const obEarn = recs.find((r) => String(r.approvedBy || "") === "opening_balance");
    const oldAmt = obEarn ? Number(obEarn.amount || 0) : 0; const oldRem = obEarn ? Number(obEarn.remaining || 0) : 0;
    const oldLive = (obEarn && obEarn.approved === true && obEarn.expiresAt && obEarn.expiresAt.toDate && obEarn.expiresAt.toDate() > now) ? oldRem : 0;
    const consumed = oldAmt - oldRem; const obHours = ob ? getObHours(ob) : null;
    let proj = cur; let flag = "";
    if (obHours === null) flag = "BRAK_w_BO26";
    else if (obHours === "") flag = "ob_puste";
    else if (obHours === "?") flag = "ob_nieliczb";
    else { const newRem = Math.max(0, obHours - consumed); proj = cur + (newRem - oldLive); if (!obEarn && obHours > 0) flag = "utworzy"; if (consumed > 0) flag = (flag ? flag + "," : "") + "czesc_zuzyte"; }
    rows.push({ name: fn + " " + ln, cur, obHours, oldAmt, proj, delta: (typeof proj === "number" ? proj - cur : 0), method, flag });
  });
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  console.log("liczba członków:", rows.length);
  console.log("OSOBA".padEnd(22) + " | bież → proj | BO26 | staraOB | delta | match | flagi");
  rows.forEach((r) => console.log(`${r.name.padEnd(22)} | ${String(r.cur).padStart(4)} →${String(r.proj).padStart(5)} | ${String(r.obHours).padStart(4)} | ${String(r.oldAmt).padStart(5)} | ${String(r.delta).padStart(5)} | ${r.method.padEnd(5)} | ${r.flag}`));
  process.exit(0);
})().catch((e) => { console.error("FAIL:", e.message); process.exit(2); });
