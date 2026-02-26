/********************************************************************
 * 81_setup_roles.js
 *
 * Obsługa ról użytkowników:
 *  - normalizacja nazw ról (setup + arkusz)
 *  - odczyt roli z arkusza "członkowie i sympatycy"
 *  - wyznaczanie limitów (max_items, max_time)
 *  - getUserContext(email) do użycia w backendzie
 *
 * Kluczowe założenia:
 *  - Arkusz jest panelem Zarządu i źródłem roli.
 *  - Firestore jest silnikiem i archiwum.
 ********************************************************************/


/********************************************************************
 * normalizeRoleName(raw)
 *
 * Zwraca kod roli w wersji kanonicznej:
 *  - "zarzad"
 *  - "czlonek"
 *  - "kandydat"
 *  - "sympatyk"
 *  - "gosc"
 *  - "no_access"
 ********************************************************************/
function normalizeRoleName(raw) {
  const v = String(raw || "").trim().toLowerCase();

  if (!v) return "gosc";

  if (v === "zarząd" || v === "zarzad") return "zarzad";
  if (v === "członek" || v === "czlonek") return "czlonek";
  if (v === "kandydat") return "kandydat";
  if (v === "sympatyk") return "sympatyk";
  if (v === "brak dostępu" || v === "brak dostepu") return "no_access";
  if (v === "gość" || v === "gosc") return "gosc";

  // fallback – jeśli w setupie pojawi się np. nowa rola
  return v;
}


/********************************************************************
 * getRoleForEmail(email)
 *
 * Czyta dane z arkusza przez usersSheet_readAll_()
 * i wyszukuje wiersz po e-mailu. Rola brana z kolumny "Rola".
 *
 * Jeśli user nie znaleziony → "gosc".
 ********************************************************************/
function getRoleForEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return "gosc";

  try {
    const rows = usersSheet_readAll_();  // z 66_users_sheet_sync.js

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var e = String(row.email || "").trim().toLowerCase();
      if (!e) continue;

      if (e === norm) {
        var rawRole = row.rola || row.role || "";
        var code = normalizeRoleName(rawRole);
        return code;
      }
    }
  } catch (err) {
    Logger.log("getRoleForEmail ERROR: " + err);
  }

  // brak w arkuszu → traktujemy jak gość
  return "gosc";
}


/********************************************************************
 * getRoleLimits(roleCode)
 *
 * Zwraca { max_items, max_time } dla danej roli.
 * Bazuje na zakładce setup (funkcja getSetup()) jeśli pola istnieją,
 * w przeciwnym razie używa sensownych defaultów.
 ********************************************************************/
function getRoleLimits(roleCode) {
  var setup = (typeof getSetup === "function") ? getSetup() : {};
  var r = normalizeRoleName(roleCode);

  // domyślne wartości (gdyby setup jeszcze nie był skonfigurowany)
  var defaults = {
    zarzad:   { max_items: 100, max_time: 4 },
    czlonek:  { max_items: 3,   max_time: 2 },
    kandydat: { max_items: 1,   max_time: 1 },
    sympatyk: { max_items: 0,   max_time: 0 },
    gosc:     { max_items: 0,   max_time: 0 },
    no_access:{ max_items: 0,   max_time: 0 }
  };

  var cfg = defaults[r] || defaults.gosc;

  function pickNum(key1, key2, fallback) {
    if (setup && Object.prototype.hasOwnProperty.call(setup, key1) &&
        typeof setup[key1] === "number") {
      return setup[key1];
    }
    if (key2 &&
        setup && Object.prototype.hasOwnProperty.call(setup, key2) &&
        typeof setup[key2] === "number") {
      return setup[key2];
    }
    return fallback;
  }

  if (r === "zarzad") {
    return {
      max_items: pickNum("zarząd_max_items", "zarzad_max_items", cfg.max_items),
      max_time:  pickNum("zarząd_max_time",  "zarzad_max_time",  cfg.max_time)
    };
  }

  if (r === "czlonek") {
    return {
      max_items: pickNum("członek_max_items", "czlonek_max_items", cfg.max_items),
      max_time:  pickNum("członek_max_time",  "czlonek_max_time",  cfg.max_time)
    };
  }

  if (r === "kandydat") {
    return {
      max_items: pickNum("kandydat_max_items", null, cfg.max_items),
      max_time:  pickNum("kandydat_max_time",  null, cfg.max_time)
    };
  }

  if (r === "sympatyk") {
    // jeśli w setupie kiedyś pojawią się dedykowane limity,
    // można je tutaj dodać; na razie 0/0.
    return cfg;
  }

  // gosc, no_access – bierzemy default
  return cfg;
}


/********************************************************************
 * getUserContext(email)
 *
 * Zwraca:
 * {
 *   email:   string (lowercase),
 *   role:    "zarzad" | "czlonek" | "kandydat" | "sympatyk" | "gosc" | "no_access",
 *   rawRole: oryginalna/nienormalizowana nazwa (tu: taki sam jak role),
 *   maxItems: number,
 *   maxTime:  number
 * }
 ********************************************************************/
function getUserContext(email) {
  var emailNorm = String(email || "").trim().toLowerCase();

  if (!emailNorm) {
    return {
      email: "",
      role: "no_access",
      rawRole: "",
      maxItems: 0,
      maxTime: 0
    };
  }

  var roleCode = getRoleForEmail(emailNorm);
  var limits = getRoleLimits(roleCode);

  return {
    email: emailNorm,
    role: roleCode,
    rawRole: roleCode,
    maxItems: limits.max_items,
    maxTime: limits.max_time
  };
}
