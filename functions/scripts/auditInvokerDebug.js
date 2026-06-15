// READ-ONLY DEBUG: surowa polityka IAM dla wybranych funkcji, różne API/wersje.
// node --use-system-ca functions/scripts/auditInvokerDebug.js
const { GoogleAuth } = require("google-auth-library");

const PROJECT = "morzkulc-e9df7";
const LOCATION = "us-central1";
const TARGETS = ["adminapprove", "gearprivatestoragemonthly", "getbasengodziny", "submitgodzinki"];

(async () => {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();

  for (const svc of TARGETS) {
    console.log("\n===================== " + svc + " =====================");

    // A) Cloud Run v2 getIamPolicy
    try {
      const u = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/services/${svc}:getIamPolicy`;
      const r = await client.request({ url: u });
      console.log("[run v2] bindings:", JSON.stringify(r.data.bindings || [], null, 2));
    } catch (e) { console.log("[run v2] ERR", e.response && e.response.status, e.message); }

    // B) Cloud Run v1 getIamPolicy (policyVersion 3)
    try {
      const u = `https://run.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/services/${svc}:getIamPolicy?options.requestedPolicyVersion=3`;
      const r = await client.request({ url: u });
      console.log("[run v1] bindings:", JSON.stringify(r.data.bindings || [], null, 2));
    } catch (e) { console.log("[run v1] ERR", e.response && e.response.status, e.message); }

    // C) Cloud Functions v2 getIamPolicy (function-level)
    try {
      const u = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${LOCATION}/functions/${svc}:getIamPolicy`;
      const r = await client.request({ url: u });
      console.log("[fn v2] bindings:", JSON.stringify(r.data.bindings || [], null, 2));
    } catch (e) { console.log("[fn v2] ERR", e.response && e.response.status, e.message); }
  }
})().catch((e) => {
  console.error("BŁĄD:", e.message);
  if (e.response && e.response.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});