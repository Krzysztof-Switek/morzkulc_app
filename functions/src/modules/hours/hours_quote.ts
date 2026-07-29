import {daysOnWaterInclusive} from "../calendar/calendar_utils";
import {GearVars} from "../setup/setup_gear_vars";

export function quoteKayaksCostHours(vars: GearVars, roleKey: string, startIso: string, endIso: string, kayakCount: number) {
  const count = Number(kayakCount || 0);
  if (count <= 0) return 0;

  // Uwaga: koszt liczymy normalnie dla WSZYSTKICH ról, łącznie z zarządem/KR i
  // kursantem/kandydatem w oknie szkoleniówki. Zwolnienia z opłaty (zarząd/KR
  // gdy boardDoesNotPay, tegoroczna szkoleniówka do końca września) obsługuje
  // gear_bundle_service — zapisuje realny koszt jako "waived" (przekreślony,
  // widoczny w historii, saldo bez zmian), zamiast zwracać tu 0 i przez to
  // całkowicie pomijać wpis w godzinki_ledger.
  const days = daysOnWaterInclusive(startIso, endIso);
  const perDay = Number(vars.hoursPerKayakPerDay || 0);
  const out = days * count * perDay;
  return out < 0 ? 0 : out;
}
