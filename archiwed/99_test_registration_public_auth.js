/********************************************************************
 * 99_test_registration_public_auth.js
 *
 * TEST E2E (LOGICZNY):
 * - publiczna rejestracja przez Google ID Token
 * - BEZ Session.getActiveUser
 * - BEZ prawdziwego Google login
 *
 * Cel:
 * - sprawdzić, czy registration_core()
 *   działa identycznie dla gmail i workspace
 ********************************************************************/

/**
 * MOCK auth_verifyGoogleIdToken
 * Nadpisujemy TYLKO na czas testu
 */
function __mock_auth_verifyGoogleIdToken__(email) {
  return function(idToken) {
    if (idToken !== "__TEST_TOKEN__") {
      throw new Error("Nieprawidłowy testowy token");
    }
    return {
      ok: true,
      email: email,
      emailVerified: true,
      raw: {
        aud: "test",
        iss: "accounts.google.com",
        exp: Math.floor(Date.now() / 1000) + 300
      }
    };
  };
}

/**
 * TEST: rejestracja użytkownika z prywatnym mailem (gmail)
 */
function TEST_registration_public_gmail() {
  const ORIGINAL_AUTH = auth_verifyGoogleIdToken;

  try {
    // 🔁 mock auth
    auth_verifyGoogleIdToken =
      __mock_auth_verifyGoogleIdToken__("switek.k@gmail.com");

    const data = {
      idToken: "__TEST_TOKEN__",
      imie: "Test",
      nazwisko: "Gmail",
      ksywa: "TG",
      telefon: "000",
      zgodaRodo: true
    };

    const res = registration_core(data);

    if (!res || res.ok !== true) {
      throw new Error("❌ Rejestracja gmail nie powiodła się");
    }

    if (res.email !== "switek.k@gmail.com") {
      throw new Error("❌ Email niepoprawny: " + res.email);
    }

    Logger.log("✅ TEST OK — rejestracja gmail działa");
  } finally {
    // 🔙 przywróć oryginał
    auth_verifyGoogleIdToken = ORIGINAL_AUTH;
  }
}

/**
 * TEST: rejestracja użytkownika z domeny Workspace
 */
function TEST_registration_public_workspace() {
  const ORIGINAL_AUTH = auth_verifyGoogleIdToken;

  try {
    // 🔁 mock auth
    auth_verifyGoogleIdToken =
      __mock_auth_verifyGoogleIdToken__("admin@morzkulc.pl");

    const data = {
      idToken: "__TEST_TOKEN__",
      imie: "Test",
      nazwisko: "Workspace",
      ksywa: "TW",
      telefon: "111",
      zgodaRodo: true
    };

    const res = registration_core(data);

    if (!res || res.ok !== true) {
      throw new Error("❌ Rejestracja workspace nie powiodła się");
    }

    if (res.email !== "admin@morzkulc.pl") {
      throw new Error("❌ Email niepoprawny: " + res.email);
    }

    Logger.log("✅ TEST OK — rejestracja workspace działa");
  } finally {
    // 🔙 przywróć oryginał
    auth_verifyGoogleIdToken = ORIGINAL_AUTH;
  }
}
