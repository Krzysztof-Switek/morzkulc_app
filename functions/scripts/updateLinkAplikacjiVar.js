// Aktualizuje wartość zmiennej "link_aplikacji" w arkuszu App_SETUP/Vars_CZLONKOWIE
// (kolumna B, wiersz 19 — zweryfikowane przez checkLinkAplikacjiVar.js) na nowy,
// przyjazny adres app.morzkulc.pl.
// node --use-system-ca functions/scripts/updateLinkAplikacjiVar.js
const { google } = require("googleapis");

const SPREADSHEET_ID = "17hQBG_BBwzFf-tbhuKPzaAjEeP9d3pMIivQX_K-LnBA";
const TAB_NAME = "Vars_CZLONKOWIE";
const CELL_RANGE = `'${TAB_NAME}'!B19`;
const NEW_VALUE = "https://app.morzkulc.pl/";

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

(async () => {
  const sheets = await getDelegatedSheetsClient();

  const before = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: CELL_RANGE });
  console.log("Wartość PRZED:", before.data.values);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: CELL_RANGE,
    valueInputOption: "RAW",
    requestBody: { values: [[NEW_VALUE]] },
  });

  const after = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: CELL_RANGE });
  console.log("Wartość PO:", after.data.values);

  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(2); });
