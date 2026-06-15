/**
 * Testy jednostkowe TS dla czystych funkcji wyceny wypożyczeń i opłaty magazynowej.
 * Część adresowania ryzyka D1 (testy wykonują kod produkcyjny, nie lustra).
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {quoteKayaksCostHours} from "../src/modules/hours/hours_quote";
import {GearVars} from "../src/modules/setup/setup_gear_vars";
import {daysOnWaterInclusive} from "../src/modules/calendar/calendar_utils";
import {firstChargeableMonth, isChargeableThisMonth, toYearMonth} from "../src/service/tasks/gearPrivateStorage";

function vars(overrides: Partial<GearVars> = {}): GearVars {
  return {
    offsetDays: 1,
    hoursPerKayakPerDay: 10,
    boardDoesNotPay: false,
    hoursPerPrivateKayakPerMonth: 5,
    maxWeeksByRole: {},
    maxItemsByRole: {},
    ...overrides,
  };
}

describe("daysOnWaterInclusive", () => {
  it("ten sam dzień = 1 dzień", () => {
    expect(daysOnWaterInclusive("2026-06-01", "2026-06-01")).toBe(1);
  });

  it("zakres liczony inclusive", () => {
    expect(daysOnWaterInclusive("2026-06-01", "2026-06-03")).toBe(3);
  });

  it("odwrócony zakres = 0", () => {
    expect(daysOnWaterInclusive("2026-06-03", "2026-06-01")).toBe(0);
  });
});

describe("quoteKayaksCostHours", () => {
  it("koszt = dni × kajaki × stawka", () => {
    expect(quoteKayaksCostHours(vars(), "rola_czlonek", "2026-06-01", "2026-06-03", 2)).toBe(60);
  });

  it("zero kajaków = 0", () => {
    expect(quoteKayaksCostHours(vars(), "rola_czlonek", "2026-06-01", "2026-06-03", 0)).toBe(0);
  });

  it("zarząd/KR darmowo tylko przy boardDoesNotPay=true", () => {
    expect(quoteKayaksCostHours(vars({boardDoesNotPay: true}), "rola_zarzad", "2026-06-01", "2026-06-02", 1)).toBe(0);
    expect(quoteKayaksCostHours(vars({boardDoesNotPay: true}), "rola_kr", "2026-06-01", "2026-06-02", 1)).toBe(0);
    expect(quoteKayaksCostHours(vars({boardDoesNotPay: false}), "rola_zarzad", "2026-06-01", "2026-06-02", 1)).toBe(20);
  });

  it("członek płaci niezależnie od boardDoesNotPay", () => {
    expect(quoteKayaksCostHours(vars({boardDoesNotPay: true}), "rola_czlonek", "2026-06-01", "2026-06-02", 1)).toBe(20);
  });

  it("odwrócony zakres dat = 0 (nie ujemny)", () => {
    expect(quoteKayaksCostHours(vars(), "rola_czlonek", "2026-06-03", "2026-06-01", 1)).toBe(0);
  });
});

describe("firstChargeableMonth / isChargeableThisMonth", () => {
  it("wejście w środku miesiąca → pierwszy pełny miesiąc to następny", () => {
    expect(firstChargeableMonth("2025-03-02")).toBe("2025-04");
  });

  it("wejście 1. dnia miesiąca → ten miesiąc też nie jest pełny", () => {
    expect(firstChargeableMonth("2025-03-01")).toBe("2025-04");
  });

  it("grudzień → rollover roku", () => {
    expect(firstChargeableMonth("2025-12-15")).toBe("2026-01");
  });

  it("brak/zła data → null", () => {
    expect(firstChargeableMonth("")).toBeNull();
    expect(firstChargeableMonth("nie-data")).toBeNull();
  });

  it("granica naliczalności", () => {
    expect(isChargeableThisMonth("2025-03-02", "2025-03")).toBe(false);
    expect(isChargeableThisMonth("2025-03-02", "2025-04")).toBe(true);
    expect(isChargeableThisMonth("2025-03-02", "2026-01")).toBe(true);
  });
});

describe("toYearMonth", () => {
  it("formatuje YYYY-MM w UTC", () => {
    expect(toYearMonth(new Date("2026-06-01T02:00:00Z"))).toBe("2026-06");
    expect(toYearMonth(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
  });
});
