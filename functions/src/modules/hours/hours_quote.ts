import {daysOnWaterInclusive} from "../calendar/calendar_utils";
import {GearVars} from "../setup/setup_gear_vars";

export function quoteKayaksCostHours(vars: GearVars, roleKey: string, startIso: string, endIso: string, kayakCount: number) {
  const count = Number(kayakCount || 0);
  if (count <= 0) return 0;

  if ((roleKey === "rola_zarzad" || roleKey === "rola_kr") && vars.boardDoesNotPay) return 0;

  const days = daysOnWaterInclusive(startIso, endIso);
  const perDay = Number(vars.hoursPerKayakPerDay || 0);
  const out = days * count * perDay;
  return out < 0 ? 0 : out;
}
