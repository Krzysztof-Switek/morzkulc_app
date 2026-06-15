// READ-ONLY: weryfikacja wdrożonych funkcji v2 na prod (updateTime, stan, env).
// node --use-system-ca functions/scripts/verifyDeploy.js
const { GoogleAuth } = require("google-auth-library");

const PROJECT = "morzkulc-e9df7";
const LOCATION = "us-central1";
const WANT = ["adminApprove", "adminReject", "adminPendingNotifyDaily", "onServiceJobCreated"];
const ENV_KEYS = ["SVC_ADMIN_NOTIFY_EMAIL", "SVC_ADMIN_NOTIFY_AGE_DAYS", "ENV_NAME"];

(async () => {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const url = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/functions?pageSize=200`;
  const res = await client.request({ url });
  const fns = res.data.functions || [];
  console.log(`Łącznie funkcji v2 w ${PROJECT}/${LOCATION}: ${fns.length}\n`);

  for (const f of fns) {
    const short = f.name.split("/").pop();
    if (!WANT.includes(short)) continue;
    const sc = f.serviceConfig || {};
    const env = sc.environmentVariables || {};
    console.log(`### ${short}`);
    console.log(`  state:      ${f.state}`);
    console.log(`  updateTime: ${f.updateTime}`);
    console.log(`  revision:   ${sc.revision || "?"}`);
    const envShown = ENV_KEYS.filter((k) => k in env).map((k) => `${k}=${env[k]}`);
    console.log(`  env:        ${envShown.length ? envShown.join("  ") : "(brak interesujących kluczy)"}`);
    console.log("");
  }

  // pokaż jakich z WANT nie znaleziono
  const present = new Set(fns.map((f) => f.name.split("/").pop()));
  const missing = WANT.filter((w) => !present.has(w));
  if (missing.length) console.log("NIE ZNALEZIONO: " + missing.join(", "));
})().catch((e) => {
  console.error("BŁĄD:", e.message);
  if (e.response && e.response.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});