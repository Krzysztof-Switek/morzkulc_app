/********************************************************************
 * 99_test_ui_routing_diagnostics.js
 *
 * DIAGNOSTYKA ROUTINGU / TOŻSAMOŚCI
 * - nie zapisuje niczego (tylko logi)
 * - pomaga rozdzielić:
 *   (A) co widzi Session / EffectiveUser
 *   (B) co siedzi w CacheService
 *   (C) czy użytkownik istnieje w Firestore
 *   (D) co zwraca doGet() przy pustych parametrach
 ********************************************************************/

function __short__(s, n) {
  s = String(s || "");
  n = n || 240;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function __safeEmail__(fn) {
  try {
    return fn();
  } catch (e) {
    return "ERROR: " + (e && e.message ? e.message : String(e));
  }
}

function __logUserLookup__(label, email) {
  try {
    if (!email || String(email).startsWith("ERROR:")) {
      Logger.log(label + " = " + email);
      return;
    }

    const norm = String(email).trim().toLowerCase();
    const found = user_findByEmail(norm); // zwraca {source, doc} albo null (wg Twojego core)
    Logger.log(label + " = " + norm + " | user_findByEmail = " + (found ? "FOUND (" + found.source + ")" : "NOT FOUND"));

    // dodatkowo sprawdź ACTIVE wprost
    try {
      const active = user_getActive(norm);
      Logger.log("  └─ user_getActive(): " + (active && active.fields ? "HAS DOC" : "NO DOC"));
    } catch (e1) {
      Logger.log("  └─ user_getActive(): ERROR " + (e1 && e1.message ? e1.message : String(e1)));
    }

    // HOME data (czy da się zbudować ekran)
    try {
      const home = users_getHomeData(norm);
      Logger.log("  └─ users_getHomeData(): ok=" + home.ok + (home.error ? " | error=" + home.error : ""));
    } catch (e2) {
      Logger.log("  └─ users_getHomeData(): ERROR " + (e2 && e2.message ? e2.message : String(e2)));
    }
  } catch (e) {
    Logger.log("__logUserLookup__ ERROR: " + (e && e.message ? e.message : String(e)));
  }
}

/**
 * GŁÓWNY TEST: diagnoza kontekstu tożsamości i routingu
 */
function TEST_DIAG_UI_ROUTING_CONTEXT() {
  Logger.log("=========== UI ROUTING DIAG START ===========");

  // 1) Session / EffectiveUser
  const sessionEmail = __safeEmail__(function () {
    return (Session.getActiveUser && Session.getActiveUser().getEmail()) || "";
  });

  const effectiveEmail = __safeEmail__(function () {
    return (Session.getEffectiveUser && Session.getEffectiveUser().getEmail()) || "";
  });

  Logger.log("Session.getActiveUser().getEmail()   => " + sessionEmail);
  Logger.log("Session.getEffectiveUser().getEmail()=> " + effectiveEmail);

  // 2) Cache (jeśli istnieje)
  let cacheVal = "";
  try {
    const cache = CacheService.getUserCache();
    cacheVal = cache.get("last_known_email") || "";
  } catch (e) {
    cacheVal = "ERROR: " + (e && e.message ? e.message : String(e));
  }
  Logger.log("CacheService.getUserCache().get('last_known_email') => " + cacheVal);

  // 3) Lookup w Firestore (czy te maile istnieją)
  __logUserLookup__("LOOKUP: sessionEmail", sessionEmail);
  __logUserLookup__("LOOKUP: effectiveEmail", effectiveEmail);
  __logUserLookup__("LOOKUP: cacheEmail", cacheVal);

  // 4) Sprawdź zachowanie helpera routera (jeśli istnieje)
  if (typeof _getCurrentEmail_ === "function") {
    let current = "";
    try {
      current = _getCurrentEmail_();
    } catch (e) {
      current = "ERROR: " + (e && e.message ? e.message : String(e));
    }
    Logger.log("_getCurrentEmail_() => " + current);
    __logUserLookup__("LOOKUP: _getCurrentEmail_", current);
  } else {
    Logger.log("_getCurrentEmail_() brak (nie istnieje w aktualnej wersji routera)");
  }

  // 5) Próba „suchego” doGet (pusty request)
  try {
    const out = doGet({ parameter: {} });
    if (out && typeof out.getContent === "function") {
      const html = out.getContent();
      Logger.log("doGet({}) returned HtmlOutput, first chars: " + __short__(html, 300));
    } else {
      Logger.log("doGet({}) returned: " + __short__(out, 200));
    }
  } catch (e) {
    Logger.log("doGet({}) ERROR: " + (e && e.message ? e.message : String(e)));
  }

  Logger.log("=========== UI ROUTING DIAG END ===========");
}
