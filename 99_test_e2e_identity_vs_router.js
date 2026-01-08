/********************************************************************
 * 99_test_e2e_identity_vs_router.js
 *
 * CEL:
 * - znaleźć PRZYCZYNĘ sytuacji:
 *   prywatny user (gmail) → widok ADMIN
 *
 * ZASADA:
 * - NIE ZMIENIAMY kodu produkcyjnego
 * - NIE ZGADUJEMY
 * - tylko: log + fakty
 ********************************************************************/

/**
 * helper: skracanie stringów do logów
 */
function _short(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * helper: bezpieczny call
 */
function _safe(fn) {
  try {
    return fn();
  } catch (e) {
    return "ERROR: " + (e && e.message ? e.message : String(e));
  }
}

/**
 * TEST GŁÓWNY
 */
function TEST_E2E_IDENTITY_VS_ROUTER() {
  Logger.log("=========== E2E IDENTITY vs ROUTER START ===========");

  /* --------------------------------------------------
   * 1️⃣ CO APPS SCRIPT UWAŻA ZA TOŻSAMOŚĆ
   * -------------------------------------------------- */
  const sessionEmail = _safe(() =>
    Session.getActiveUser().getEmail()
  );

  const effectiveEmail = _safe(() =>
    Session.getEffectiveUser().getEmail()
  );

  Logger.log("Session.getActiveUser()    => " + sessionEmail);
  Logger.log("Session.getEffectiveUser() => " + effectiveEmail);

  /* --------------------------------------------------
   * 2️⃣ CO SIEDZI W CACHE
   * -------------------------------------------------- */
  let cacheEmail = "";
  try {
    cacheEmail =
      CacheService.getUserCache().get("last_known_email") || "";
  } catch (e) {
    cacheEmail = "ERROR: " + e.message;
  }
  Logger.log("Cache last_known_email => " + cacheEmail);

  /* --------------------------------------------------
   * 3️⃣ JAK ROUTER WYZNACZA EMAIL
   * -------------------------------------------------- */
  if (typeof _getCurrentEmail_ === "function") {
    const current = _safe(() => _getCurrentEmail_());
    Logger.log("_getCurrentEmail_() => " + current);
  } else {
    Logger.log("_getCurrentEmail_() => BRAK (nie istnieje)");
  }

  /* --------------------------------------------------
   * 4️⃣ CO ISTNIEJE W SYSTEMIE (ADMIN VS GMAIL)
   * -------------------------------------------------- */
  const candidates = [
    "admin@morzkulc.pl",
    "switek.k@gmail.com"
  ];

  candidates.forEach(email => {
    Logger.log("---- LOOKUP: " + email + " ----");

    const found = _safe(() => user_findByEmail(email));
    Logger.log("user_findByEmail => " + (found ? "FOUND" : "NOT FOUND"));

    const active = _safe(() => user_getActive(email));
    Logger.log(
      "user_getActive => " +
        (active && active.fields ? "HAS ACTIVE DOC" : "NO ACTIVE DOC")
    );

    const home = _safe(() => users_getHomeData(email));
    Logger.log(
      "users_getHomeData => " +
        (home && home.ok
          ? "OK (HOME)"
          : "FAIL (" + (home.error || "no ok") + ")")
    );
  });

  /* --------------------------------------------------
   * 5️⃣ CO ZWRACA doGet() (REALNY ROUTING)
   * -------------------------------------------------- */
  try {
    const out = doGet({ parameter: {} });

    if (out && typeof out.getContent === "function") {
      const html = out.getContent();
      Logger.log(
        "doGet() HTML (first chars): " + _short(html, 300)
      );

      if (html.includes("Rejestracja")) {
        Logger.log("ROUTER DECYZJA: REGISTER");
      } else if (html.includes("Panel") || html.includes("HOME")) {
        Logger.log("ROUTER DECYZJA: HOME");
      } else {
        Logger.log("ROUTER DECYZJA: NIEJEDNOZNACZNA");
      }
    } else {
      Logger.log("doGet() returned non-HTML: " + out);
    }
  } catch (e) {
    Logger.log("doGet() ERROR: " + e.message);
  }

  Logger.log("=========== E2E IDENTITY vs ROUTER END ===========");
}
