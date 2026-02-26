"use strict";

const functions = require("firebase-functions");

/**
 * Apps Script WebApp /exec
 * (to jest URL, który podałeś z Network)
 */
const GAS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzQg80NHd4oJNCKHN6g-yaKn1IHqOwlLXXDbUgiNYJ3YPXTMaP9o3-aC9ByleKUQ3yzfw/exec";

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * ✅ SZYBKI HEALTH CHECK (żeby CLI zawsze widziało przynajmniej jedną funkcję)
 * GET /api/health -> {ok:true}
 */
exports.health = functions.https.onRequest((req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  return res.status(200).json({ ok: true, service: "functions", ts: new Date().toISOString() });
});

/**
 * ✅ GŁÓWNY PROXY
 * Hosting rewrite: /api/** -> function gasProxy
 * Frontend woła: POST /api/register
 * Proxy mapuje na GAS: action=register_from_firebase
 */
exports.gasProxy = functions.https.onRequest(async (req, res) => {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED", hint: "Use POST." });
      return;
    }

    const path = (req.path || "").toLowerCase();

    let action = "";
    if (path.endsWith("/register")) action = "register_from_firebase";
    else {
      res.status(404).json({ ok: false, error: "UNKNOWN_ENDPOINT", path });
      return;
    }

    let bodyObj = req.body;
    if (typeof bodyObj === "string") {
      try { bodyObj = JSON.parse(bodyObj); } catch (_) { bodyObj = {}; }
    }
    if (!bodyObj || typeof bodyObj !== "object") bodyObj = {};

    const url = `${GAS_WEBAPP_URL}?action=${encodeURIComponent(action)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });

    const text = await r.text();

    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ ok: false, error: "BAD_GATEWAY_NON_JSON", raw: text.slice(0, 1200) });
      return;
    }

    res.status(200).json(obj);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});
