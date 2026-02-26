/***************************************************
 * 99_test_api_router_registration_flow.js
 * Testy metodyczne dla BO26 match + decyzji roli/statusu
 ***************************************************/

function _assert_(cond, msg) {
  if (!cond) throw new Error("ASSERT FAIL: " + (msg || "no message"));
}

function _withMocks_(mocks, fn) {
  const original = {};
  Object.keys(mocks).forEach(k => {
    original[k] = this[k];
    this[k] = mocks[k];
  });

  try {
    return fn();
  } finally {
    Object.keys(mocks).forEach(k => {
      this[k] = original[k];
    });
  }
}

function test__api_openingBalance26_match__email_header_variants() {
  const fakeDoc = {
    name: "projects/x/databases/(default)/documents/users_opening_balance_26/id_123",
    fields: {
      // UWAGA: wariant nagłówka: "E-mail"
      "E-mail": { stringValue: "jan.kowalski@example.com" },
      "Imię": { stringValue: "Jan" },
      "Nazwisko": { stringValue: "Kowalski" },
      "Członek stowarzyszenia": { booleanValue: true }
    }
  };

  const res = _withMocks_({
    firestoreGetDocument: function () { return null; },
    firestoreGetCollection: function () { return { documents: [fakeDoc] }; }
  }, function () {
    return api_openingBalance26_match_("jan.kowalski@example.com", "Jan", "Kowalski");
  });

  _assert_(res.found === true, "should be found");
  _assert_(res.matchType === "email" || res.matchType === "name", "matchType should be email or name");
  _assert_(res.isMember === true, "isMember should be true");

  const dec = api_decideRoleStatus_(res);
  _assert_(dec.rola === "Czlonek", "rola should be Czlonek");
  _assert_(dec.status === "Aktywny", "status should be Aktywny");

  Logger.log("OK test__api_openingBalance26_match__email_header_variants");
}

function test__api_openingBalance26_match__not_found_pending() {
  const res = _withMocks_({
    firestoreGetDocument: function () { return null; },
    firestoreGetCollection: function () { return { documents: [] }; }
  }, function () {
    return api_openingBalance26_match_("nikt@example.com", "Nikt", "Nieznany");
  });

  _assert_(res.found === false, "should not be found");
  const dec = api_decideRoleStatus_(res);
  _assert_(dec.rola === "Sympatyk", "rola should be Sympatyk");
  _assert_(dec.status === "pending", "status should be pending");

  Logger.log("OK test__api_openingBalance26_match__not_found_pending");
}

function test__doGet_action_returns_error_not_ok_true() {
  const out = doGet({ parameter: { action: "register_from_firebase" } });
  const txt = out.getContent();
  const obj = JSON.parse(txt);

  _assert_(obj.ok === false, "doGet with action should be ok=false");
  _assert_(obj.error === "GET_NOT_SUPPORTED_FOR_ACTION", "should return GET_NOT_SUPPORTED_FOR_ACTION");

  Logger.log("OK test__doGet_action_returns_error_not_ok_true");
}
