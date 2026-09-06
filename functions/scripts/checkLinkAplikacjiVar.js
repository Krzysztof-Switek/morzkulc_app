// READ-ONLY: pokazuje aktualny wiersz "link_aplikacji" w zakładce Vars_CZLONKOWIE
// arkusza App_SETUP (ten sam mechanizm auth co inne skrypty w tym katalogu).
// node --use-system-ca functions/scripts/checkLinkAplikacjiVar.js
const { google } = require("googleapis");

const SPREADSHEET_ID = "17hQBG_BBwzFf-tbhuKPzaAjEeP9d3pMIivQX_K-LnBA";
const TAB_NAME = "Vars_CZLONKOWIE";

async function signJwtWithIamCredentials(serviceAccountEmail, payload) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/iam"] });
  const iam = google.iamcredentials({ version: "v1", auth });
  const res = await iam.projects.serviceAccounts.signJwt({
    name: "projects/-/serviceAccounts/" + serviceAccountEmail,
    requestBody: { payload: JSON.stringify(payload) },
  });
  return res.data.signedJwt;
}
async function exchangeJwtForAccessToken(assertion) {
  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", assertion);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error("token exchange failed: " + resp.status + " " + text);
  return JSON.parse(text).access_token;
}
async function getDelegatedSheetsClient() {
  const sa = "workspace-bot@morzkulc-e9df7.iam.gserviceaccount.com";
  const sub = "admin@morzkulc.pl";
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const iat = Math.floor(Date.now() / 1000);
  const jwtPayload = { iss: sa, sub, scope: scopes.join(" "), aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 };
  const signedJwt = await signJwtWithIamCredentials(sa, jwtPayload);
  const accessToken = await exchangeJwtForAccessToken(signedJwt);
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

function normalizeHeader(h) {
  return String(h == null ? "" : h).trim().toLowerCase()
    .split(" ").join("_").split("-").join("_")
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ż/g, "z").replace(/ź/g, "z")
    .replace(/[^a-z0-9_]/g, "");
}

(async () => {
  const sheets = await getDelegatedSheetsClient();
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `'${TAB_NAME}'` });
  const values = resp.data.values || [];
  const headers = values[0] || [];
  const normHeaders = headers.map(normalizeHeader);
  const idxName = normHeaders.indexOf("zmienna_nazwa");
  const idxVal = normHeaders.indexOf("wartosc_zmiennej");
  console.log("Nagłówki (surowe):", headers);
  console.log("Nagłówki (znormalizowane):", normHeaders);
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if ((row[idxName] || "").trim() === "link_aplikacji") {
      console.log(`Znaleziono w wierszu arkusza ${i + 1} (0-based data index ${i}):`);
      console.log(JSON.stringify(row, null, 2));
      console.log("Kolumna", headers[idxVal], "to indeks", idxVal, "-> litera", String.fromCharCode(65 + idxVal), ", wiersz arkusza:", i + 1);
    }
  }
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(2); });
