/********************************************************************
 * 05_ui_router.js
 * GŁÓWNY ROUTER UI — PUBLIC (GIS ID TOKEN)
 *
 * Kluczowa zasada:
 * - doGet() NIE próbuje ustalać użytkownika (Session zawsze = admin).
 * - doGet() serwuje tylko "shell" aplikacji, a właściwy widok
 *   (HOME/REGISTER/NO_ACCESS) jest ustalany po stronie UI na podstawie
 *   Google ID Token i zwracany z backendu przez google.script.run.
 ********************************************************************/

function doGet(e) {
  e = e || {};
  const p = e.parameter || {};

  // ===== STATIC ASSET: CSS (dla kompatybilności) =====
  if (p.asset === "ui_theme") {
    return ContentService
      .createTextOutput(
        HtmlService.createHtmlOutputFromFile("ui_theme").getContent()
      )
      .setMimeType(ContentService.MimeType.CSS);
  }

  // Zawsze startujemy od SHELL.
  return render_app_shell({
    target: String(p.target || "")
  });
}

/********************************************************************
 * resolve_view_from_token(idToken)
 * Backendowy router widoku na podstawie Google ID Token:
 * - jak user istnieje w users_active -> HOME
 * - jak nie istnieje -> REGISTER (z prefill email)
 * - jak token zły -> NO_ACCESS z komunikatem
 ********************************************************************/
function resolve_view_from_token(idToken) {
  try {
    const auth = auth_verifyGoogleIdToken(idToken);
    if (!auth || !auth.ok || !auth.email) {
      return render_no_access({ reason: "Nieprawidłowy token logowania." }).getContent();
    }

    const email = String(auth.email).trim().toLowerCase();

    // 1) Czy user już istnieje?
    const doc = user_getActive(email); // z 60_users_core.js
    if (doc && doc.fields) {
      const homeData = users_getHomeData(email); // 62_users_home_core.js
      if (homeData && homeData.ok) {
        return render_home(homeData).getContent();
      }
      // istnieje w Firestore, ale nie da się zbudować homeData
      return render_no_access({ reason: homeData?.error || "Błąd danych użytkownika." }).getContent();
    }

    // 2) Nowy user -> rejestracja
    return render_register({ prefillEmail: email }).getContent();

  } catch (err) {
    return render_no_access({ reason: String(err && err.message ? err.message : err) }).getContent();
  }
}

