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

// Serwer (nasza funkcja) zwraca błędy jako JSON {error, message?}. Ale odpowiedź
// mogła w ogóle nie dotrzeć do funkcji (np. zły routing Hostingu, przerwane
// połączenie) — wtedy dostajemy surowy HTML/tekst zamiast JSON. Nigdy nie wolno
// wrzucać takiej surowej treści do komunikatu widocznego dla użytkownika.
function friendlyErrorMessage(resp, rawText) {
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object") {
      const msg = parsed.error || parsed.message;
      if (msg) return String(msg);
    }
  } catch {
    // odpowiedź nie jest JSON-em — na pewno nie z naszej funkcji, patrz niżej
  }
  return `Błąd serwera (HTTP ${resp.status}). Spróbuj ponownie za chwilę.`;
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
    throw new Error(friendlyErrorMessage(resp, text));
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Błąd serwera (HTTP ${resp.status}: nieprawidłowa odpowiedź). Spróbuj ponownie za chwilę.`);
  }
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
    throw new Error(friendlyErrorMessage(resp, text));
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Błąd serwera (HTTP ${resp.status}: nieprawidłowa odpowiedź). Spróbuj ponownie za chwilę.`);
  }
}