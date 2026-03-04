export async function apiPostJson({ url, idToken, body }) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + idToken,
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

/**
 * Specjalna funkcja dla Google Apps Script, która unika CORS preflight (OPTIONS).
 * Wysyła dane jako text/plain (bez charset, aby niektóre przeglądarki nie wymuszały preflight).
 * idToken musi być wewnątrz body.
 */
export async function apiPostGasJson({ url, idToken, body }) {
  const payload = {
    ...body,
    idToken: idToken
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error("HTTP " + resp.status + ": " + text);
  }
  return JSON.parse(text);
}

/**
 * TEST ONLY: Funkcja do sprawdzenia połączenia z Google Apps Script Web App.
 */
export async function testGasConnection(gasUrl, idToken = null) {
  console.log("Testowanie połączenia z GAS:", gasUrl);
  try {
    // Test GET
    const respGet = await fetch(gasUrl + "?action=ping", { method: "GET" });
    const dataGet = await respGet.json();
    console.log("GAS GET Response:", dataGet);

    // Test POST (z Content-Type: text/plain aby uniknąć preflight CORS w GAS)
    const postBody = {
      test: "hello from frontend",
      timestamp: Date.now()
    };
    if (idToken) postBody.idToken = idToken;

    const respPost = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(postBody)
    });
    const dataPost = await respPost.json();
    console.log("GAS POST Response:", dataPost);

    return { ok: true, dataGet, dataPost };
  } catch (err) {
    console.error("Błąd testu GAS:", err);
    return { ok: false, error: err.message };
  }
}

export async function apiGetJson({ url, idToken }) {
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + idToken
    }
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error("HTTP " + resp.status + ": " + text);
  }
  return JSON.parse(text);
}
