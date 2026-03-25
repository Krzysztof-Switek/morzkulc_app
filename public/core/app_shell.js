import {
  authOnChange,
  authLoginPopup,
  authLogout,
  authGetIdToken,
  authGetBasicUser,
  isDev
} from "/core/firebase_client.js";

import { apiPostJson, apiGetJson } from "/core/api_client.js";
import { buildModulesFromSetup } from "/core/modules_registry.js";
import { renderNav, renderView } from "/core/render_shell.js";

const REGISTER_URL = "/api/register";
const SETUP_URL = "/api/setup";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userData = document.getElementById("userData");
const registerData = document.getElementById("registerData");
const modulesData = document.getElementById("modulesData");

const appRoot = document.getElementById("appRoot");
const navEl = document.getElementById("nav");
const viewEl = document.getElementById("view");

if (!appRoot || !navEl || !viewEl) {
  // eslint-disable-next-line no-console
  console.error("Missing DOM nodes: appRoot/nav/view. Check public/index.html ids.");
}

const debugPanel = document.getElementById("debugPanel");
if (debugPanel && !isDev) {
  debugPanel.remove();
}

const ctx = {
  user: null,
  session: null,
  idToken: null,
  setup: null,
  modules: []
};

// ✅ Debug hook (żeby DevTools widziało aktualny stan)
window.__APP_CTX__ = ctx;

loginBtn.addEventListener("click", async () => {
  await authLoginPopup();
});

logoutBtn.addEventListener("click", async () => {
  await authLogout();
  hardResetUi();
});

window.addEventListener("hashchange", async () => {
  if (!ctx.session) return;
  await renderView({ viewEl, ctx });
});

authOnChange(async (user) => {
  if (!user) {
    hardResetUi();
    return;
  }

  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  appRoot.classList.remove("hidden");

  ctx.user = user;
  window.__APP_CTX__ = ctx;

  if (userData) userData.textContent = JSON.stringify(authGetBasicUser(user), null, 2);

  try {
    if (registerData) registerData.textContent = "Rejestracja: wysyłam token do backendu...";
    const idToken = await authGetIdToken(user, true);
    ctx.idToken = idToken;
    window.__APP_CTX__ = ctx;

    const session = await apiPostJson({
      url: REGISTER_URL,
      idToken,
      body: { hello: "world" }
    });

    ctx.session = session;
    window.__APP_CTX__ = ctx;

    if (registerData) registerData.textContent = JSON.stringify(session, null, 2);

    // setup jest opcjonalny (może jeszcze nie istnieć)
    ctx.setup = null;
    window.__APP_CTX__ = ctx;

    try {
      const setupResp = await apiGetJson({ url: SETUP_URL, idToken });
      ctx.setup = setupResp?.setup || null;
      window.__APP_CTX__ = ctx;
    } catch (_) {
      ctx.setup = null;
      window.__APP_CTX__ = ctx;
    }

    ctx.modules = buildModulesFromSetup(ctx.setup);
    window.__APP_CTX__ = ctx;

    renderNav({ navEl, ctx });

    if (!location.hash) location.hash = "#/home/home";
    await renderView({ viewEl, ctx });

    // debug
    if (modulesData) {
      modulesData.textContent = JSON.stringify(
        { ok: true, modules: ctx.modules.map((m) => m.id) },
        null,
        2
      );
    }
  } catch (e) {
    if (registerData) registerData.textContent = "Błąd rejestracji: " + (e?.message || e);
    ctx.session = null;
    window.__APP_CTX__ = ctx;
  }
});

function hardResetUi() {
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  appRoot.classList.add("hidden");

  if (userData) userData.textContent = "";
  if (registerData) registerData.textContent = "";
  if (modulesData) modulesData.textContent = "";

  navEl.innerHTML = "";
  viewEl.innerHTML = "";

  ctx.user = null;
  ctx.session = null;
  ctx.idToken = null;
  ctx.setup = null;
  ctx.modules = [];

  window.__APP_CTX__ = ctx;

  location.hash = "";
}
