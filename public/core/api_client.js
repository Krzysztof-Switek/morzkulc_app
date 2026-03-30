// Globalny getter świeżego tokenu — ustawiany przez app_shell po zalogowaniu,
// zerowany po wylogowaniu. Gdy ustawiony, każde wywołanie API automatycznie
// pobiera świeży token (Firebase SDK cachuje, odświeża tylko przy wygaśnięciu).
let _tokenGetter = null;

export function setApiTokenGetter(fn) {
  _tokenGetter = fn;
}

async function resolveToken(idToken) {
  if (_tokenGetter) {
    try {
      return await _tokenGetter();
    } catch {
      // getter rzucił (np. user wylogowany) — użyj przekazanego idToken
    }
  }
  return idToken;
}

export async function apiPostJson({ url, idToken, body }) {
  const token = await resolveToken(idToken);
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body ?? {})
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error("HTTP " + resp.status + ": " + text);
  }
  return JSON.parse(text);
}

export async function apiGetJson({ url, idToken }) {
  const token = await resolveToken(idToken);
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error("HTTP " + resp.status + ": " + text);
  }
  return JSON.parse(text);
}