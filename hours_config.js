/**
 * Konfiguracja systemu godzinek – wszystko z arkusza "setup".
 * Brak którejkolwiek zmiennej → BŁĄD (throw).
 *
 * Wymagane klucze w setup:
 *  - max_liczba_dni_na_zgloszenie_godzinek
 *  - okres_do_archiwizacji_godzinek
 *  - okres_wygasania_godzinek
 *  - limit_debetu_godzinek
 *  - cena_wykupu_godzinki
 *  - bonus_miesieczny_zarzad
 */

function getHoursConfig_() {
  const setup = getSetup(); // z setup_config.gs

  function requireNumber(key) {
    if (!(key in setup)) {
      throw new Error('Brak wymaganej zmiennej w setup: ' + key);
    }
    const v = setup[key];
    if (typeof v !== 'number' || isNaN(v)) {
      throw new Error('Zmienna setup.' + key + ' musi być LICZBĄ, jest: ' + v);
    }
    return v;
  }

  return {
    maxDaysToReport:   requireNumber('max_liczba_dni_na_zgloszenie_godzinek'),
    archiveAfterDays:  requireNumber('okres_do_archiwizacji_godzinek'),
    expiryMonths:      requireNumber('okres_wygasania_godzinek'),
    debitLimit:        requireNumber('limit_debetu_godzinek'),
    hourPrice:         requireNumber('cena_wykupu_godzinki'),
    monthlyBonusBoard: requireNumber('bonus_miesieczny_zarzad'),
  };
}

/**
 * INTERFEJS PUBLICZNY DLA TESTÓW
 * (test_hours_config_required oczekuje HOURS_CONFIG.load())
 */
var HOURS_CONFIG = {
  load: function() {
    return getHoursConfig_();
  }
};
