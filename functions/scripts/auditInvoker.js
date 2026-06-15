// READ-ONLY: audyt IAM invoker wszystkich funkcji v2 (Cloud Run) na prod.
// Wykrywa allUsers/allAuthenticatedUsers w roles/run.invoker (= PUBLIC).
// node --use-system-ca functions/scripts/auditInvoker.js
const { GoogleAuth } = require("google-auth-library");

const PROJECT = "morzkulc-e9df7";
const LOCATION = "us-central1";

(async () => {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();

  // 1) lista funkcji v2 + typ (HTTP vs event/schedule)
  const fnUrl = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/functions?pageSize=300`;
  const fnRes = await client.request({ url: fnUrl });
  const fns = (fnRes.data.functions || []).map((f) => {
    const short = f.name.split("/").pop();
    const trigger = f.eventTrigger ? (f.eventTrigger.eventType || "event") : "http/schedule";
    const svc = ((f.serviceConfig && f.serviceConfig.service) || "").split("/").pop();
    return { short, trigger, svc };
  });

  // 2) dla każdego serwisu Cloud Run — getIamPolicy → allUsers?
  const rows = [];
  for (const f of fns) {
    const svc = f.svc || f.short.toLowerCase();
    const polUrl = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/services/${svc}:getIamPolicy`;
    let pub = "?";
    let members = "";
    try {
      const pol = await client.request({ url: polUrl });
      const bindings = (pol.data.bindings || []).filter((b) => b.role === "roles/run.invoker");
      const allMembers = bindings.flatMap((b) => b.members || []);
      const isPublic = allMembers.some((m) => m === "allUsers" || m === "allAuthenticatedUsers");
      pub = isPublic ? "PUBLIC" : "private";
      members = allMembers.join(", ");
    } catch (e) {
      pub = "ERR:" + ((e.response && e.response.status) || e.message);
    }
    rows.push({ short: f.short, trigger: f.trigger, pub, members });
  }

  rows.sort((a, b) => (a.pub === b.pub ? a.short.localeCompare(b.short) : a.pub.localeCompare(b.pub)));
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("FUNKCJA", 32) + pad("STAN", 9) + "TYP | invoker members");
  console.log("-".repeat(110));
  for (const r of rows) {
    console.log(pad(r.short, 32) + pad(r.pub, 9) + pad(r.trigger, 22) + " | " + r.members);
  }
  const pubCount = rows.filter((r) => r.pub === "PUBLIC").length;
  const privCount = rows.filter((r) => r.pub === "private").length;
  console.log(`\nRAZEM: ${rows.length} · PUBLIC: ${pubCount} · private: ${privCount}`);
})().catch((e) => {
  console.error("BŁĄD:", e.message);
  if (e.response && e.response.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});