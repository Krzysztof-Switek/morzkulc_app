/********************************************************************
 * 67_auth_core.js — weryfikacja Google ID Token
 ********************************************************************/

const AUTH_GOOGLE_CLIENT_ID_WEB =
  "273912496654-ol37cqfc7pqqtunj17rt9a59bnqk4tbb.apps.googleusercontent.com";

const AUTH_GOOGLE_ISSUERS = [
  "accounts.google.com",
  "https://accounts.google.com",
];

const AUTH_CLOCK_SKEW_MS = 30000;

function auth_validateExpiry(exp) {
  if (!exp) return false;
  return Number(exp) * 1000 + AUTH_CLOCK_SKEW_MS > Date.now();
}

function auth_verifyAudience(aud) {
  return String(aud) === String(AUTH_GOOGLE_CLIENT_ID_WEB);
}

function auth_verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error("Brak idToken do weryfikacji");

  const url =
    "https://oauth2.googleapis.com/tokeninfo?id_token=" +
    encodeURIComponent(idToken);

  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = resp.getResponseCode();

  if (code !== 200) {
    throw new Error("Google tokeninfo HTTP=" + code);
  }

  const data = JSON.parse(resp.getContentText());

  if (AUTH_GOOGLE_ISSUERS.indexOf(data.iss) === -1)
    throw new Error("Nieprawidłowy issuer");

  if (!auth_verifyAudience(data.aud))
    throw new Error("Nieprawidłowa audience");

  if (!auth_validateExpiry(data.exp))
    throw new Error("Token wygasł");

  return {
    ok: true,
    email: (data.email || "").toLowerCase(),
    emailVerified: data.email_verified === true || data.email_verified === "true",
    raw: data
  };
}
