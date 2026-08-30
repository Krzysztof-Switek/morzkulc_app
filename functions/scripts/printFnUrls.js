// READ-ONLY: wypisz bezpośrednie URL-e Cloud Run (serviceConfig.uri) wybranych funkcji.
// node --use-system-ca functions/scripts/printFnUrls.js
const { GoogleAuth } = require("google-auth-library");
const PROJECT = "morzkulc-e9df7";
const LOCATION = "us-central1";
const TARGETS = ["adminApprove", "getBasenSessions", "submitGodzinki", "kmMapData", "gearPrivateStorageMonthly"];

(async () => {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const u = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/functions?pageSize=300`;
  const r = await client.request({ url: u });
  const fns = r.data.functions || [];
  for (const t of TARGETS) {
    const f = fns.find((x) => x.name.split("/").pop() === t);
    const uri = f && f.serviceConfig && f.serviceConfig.uri;
    console.log(`${t}\t${uri || "(brak)"}`);
  }
})().catch((e) => { console.error("BŁĄD:", e.message); process.exit(1); });