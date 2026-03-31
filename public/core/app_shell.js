import {
  authOnChange,
  authLoginPopup,
  authLogout,
  authGetIdToken,
  authGetBasicUser,
  authHandleRedirectResult
} from "/core/firebase_client.js";
import { apiPostJson, apiGetJson, setApiTokenGetter } from "/core/api_client.js";
import { buildModulesFromSetup } from "/core/modules_registry.js";
import { renderNav, renderView, spinnerHtml } from "/core/render_shell.js";

// ── Service Worker registration + nasłuch aktualizacji ───────────────────────
let swUpdatePending = false;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((err) => {
    // Rejestracja SW nie jest krytyczna — aplikacja działa bez niego
    console.warn("SW registration failed:", err?.message);
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED") {
      swUpdatePending = true;
    }
  });
}

const REGISTER_URL = "/api/register";
const SETUP_URL = "/api/setup";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const appRoot = document.getElementById("appRoot");
const navEl = document.getElementById("nav");
const viewEl = document.getElementById("view");

if (!appRoot || !navEl || !viewEl) {
  // eslint-disable-next-line no-console
  console.error("Missing DOM nodes: appRoot/nav/view. Check public/index.html ids.");
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
  if (swUpdatePending) {
    // Jest nowa wersja aplikacji — przeładuj przed logowaniem
    location.reload();
    return;
  }
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

const SESSION_MAX_MS = 24 * 60 * 60 * 1000; // 24 godziny

// ── Startup — redirect result najpierw, potem listener ───────────────────────
// Czekamy na getRedirectResult PRZED rejestracją onAuthStateChanged.
// Dzięki temu gdy listener po raz pierwszy odpali się, stan auth jest już ustawiony
// (user jest zalogowany po redirect). Bez tego: listener odpalał się z null →
// hardResetUi → ekran logowania, a potem ewentualnie ponownie z userem — race condition.
(async () => {
  let redirectError = null;
  try {
    await authHandleRedirectResult();
  } catch (e) {
    redirectError = e?.message || String(e || "Błąd logowania");
    console.error("[Auth] getRedirectResult error:", e?.code, e?.message);
  }

  authOnChange(async (user) => {
    if (!user) {
      hardResetUi();
      if (redirectError) {
        showAuthError(redirectError);
        redirectError = null;
      }
      return;
    }

    // Sprawdź czy sesja nie wygasła (24h od zalogowania)
  const sessionStarted = Number(sessionStorage.getItem("morzkulc_session_started") || 0);
  if (sessionStarted && Date.now() - sessionStarted > SESSION_MAX_MS) {
    sessionStorage.removeItem("morzkulc_session_started");
    await authLogout();
    return; // authOnChange odpali się ponownie z user=null → hardResetUi
  }

  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  appRoot.classList.remove("hidden");

  ctx.user = user;
  window.__APP_CTX__ = ctx;

  viewEl.innerHTML = spinnerHtml();

  try {
    const idToken = await authGetIdToken(user, true);
    ctx.idToken = idToken;
    window.__APP_CTX__ = ctx;

    // Ustaw getter świeżego tokenu — Firebase SDK auto-odświeża przed wygaśnięciem (1h).
    // Wszystkie moduły korzystają z api_client.js, który wywołuje ten getter automatycznie.
    setApiTokenGetter(() => authGetIdToken(ctx.user, false));

    const session = await apiPostJson({
      url: REGISTER_URL,
      idToken,
      body: { hello: "world" }
    });

    ctx.session = session;
    window.__APP_CTX__ = ctx;

    // Zapisz timestamp startu sesji (tylko przy świeżym logowaniu)
    if (!sessionStorage.getItem("morzkulc_session_started")) {
      sessionStorage.setItem("morzkulc_session_started", String(Date.now()));
    }

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


  } catch (e) {
    ctx.session = null;
    window.__APP_CTX__ = ctx;

    // ⚠️  Wyczyść spinner — bez tego UI zawisa na "Morzkulc myśli..." na zawsze
    viewEl.innerHTML = `
      <div class="card center" style="max-width:360px;margin:40px auto;text-align:center;">
        <h2>Nie można załadować aplikacji</h2>
        <p class="muted">Sprawdź połączenie z internetem i spróbuj ponownie.</p>
        <button id="startupRetryBtn" class="primary" type="button" style="margin-top:8px;">
          Odśwież stronę
        </button>
        <br />
        <button id="startupLogoutBtn" class="ghost" type="button" style="margin-top:8px;">
          Wyloguj i zaloguj ponownie
        </button>
      </div>`;
    document.getElementById("startupRetryBtn")
      ?.addEventListener("click", () => location.reload());
    document.getElementById("startupLogoutBtn")
      ?.addEventListener("click", async () => {
        await authLogout();
        hardResetUi();
      });
  }
  });
})();

function showAuthError(msg) {
  let el = document.getElementById("loginAuthError");
  if (!el) {
    el = document.createElement("p");
    el.id = "loginAuthError";
    el.style.cssText = "color:var(--err,#f87171);text-align:center;margin:8px auto 0;font-size:0.9em;max-width:320px;";
    loginBtn.insertAdjacentElement("afterend", el);
  }
  el.textContent = String(msg || "Błąd logowania. Spróbuj ponownie.");
  el.hidden = false;
}

function hardResetUi() {
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  appRoot.classList.add("hidden");

  navEl.innerHTML = "";
  viewEl.innerHTML = "";

  ctx.user = null;
  ctx.session = null;
  ctx.idToken = null;
  ctx.setup = null;
  ctx.modules = [];

  sessionStorage.removeItem("morzkulc_session_started");
  setApiTokenGetter(null);

  const loginErr = document.getElementById("loginAuthError");
  if (loginErr) loginErr.hidden = true;

  window.__APP_CTX__ = ctx;

  location.hash = "";
}
