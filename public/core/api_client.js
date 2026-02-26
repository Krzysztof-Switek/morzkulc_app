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
