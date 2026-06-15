/**
 * Testy jednostkowe TS dla czystego rdzenia logiki godzinek.
 *
 * Adresują ryzyko D1 z audytu (12.06_godzinki_potencjalne_problemy.md):
 * formuła bilansu była testowana wyłącznie przez ręcznie pisane lustra w Pythonie
 * (tests/test_godzinki.py, tests/e2e/helpers/firestore_helper.py), które już raz
 * rozjechały się z implementacją (błąd L1 niewykrywalny dla zielonych testów).
 * Te testy wykonują PRODUKCYJNY kod z godzinki_service.ts.
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {computeBalance, computeNextExpiry, GodzinkiRecord} from "../src/modules/hours/godzinki_service";

const NOW = new Date("2026-03-28T00:00:00Z");

function ts(iso: string): any {
  const d = new Date(iso);
  return {toDate: () => d, toMillis: () => d.getTime()};
}

let seq = 0;

function makeEarn(args: {amount: number; remaining?: number; approved?: boolean; expiresAt?: string | null; grantedAt?: string}): GodzinkiRecord {
  const approved = args.approved ?? true;
  return {
    id: `earn-${++seq}`,
    uid: "u1",
    type: "earn",
    amount: args.amount,
    remaining: args.remaining ?? (approved ? args.amount : 0),
    approved,
    grantedAt: args.grantedAt ? ts(args.grantedAt) : ts("2024-01-01T00:00:00Z"),
    expiresAt: args.expiresAt === null ? undefined : ts(args.expiresAt ?? "2028-01-01T00:00:00Z"),
    reason: "test",
    submittedBy: "u1",
  } as unknown as GodzinkiRecord;
}

function makeSpend(args: {amount: number; overdraft?: number; refunded?: boolean | undefined}): GodzinkiRecord {
  const rec: any = {
    id: `spend-${++seq}`,
    uid: "u1",
    type: "spend",
    amount: args.amount,
    fromEarn: args.amount - (args.overdraft ?? 0),
    overdraft: args.overdraft ?? 0,
    reason: "test",
    submittedBy: "u1",
  };
  if (args.refunded !== undefined) rec.refunded = args.refunded;
  return rec as GodzinkiRecord;
}

function makePurchase(args: {amount: number; approved?: boolean | undefined}): GodzinkiRecord {
  const rec: any = {
    id: `purchase-${++seq}`,
    uid: "u1",
    type: "purchase",
    amount: args.amount,
    reason: "test",
    submittedBy: "u1",
  };
  if (args.approved !== undefined) rec.approved = args.approved;
  return rec as GodzinkiRecord;
}

describe("computeBalance", () => {
  it("zwraca 0 dla pustej listy", () => {
    expect(computeBalance([], NOW)).toBe(0);
  });

  it("liczy zatwierdzone, niewygasłe pule earn", () => {
    expect(computeBalance([makeEarn({amount: 10})], NOW)).toBe(10);
  });

  it("pomija niezatwierdzone earn", () => {
    expect(computeBalance([makeEarn({amount: 10, approved: false})], NOW)).toBe(0);
  });

  it("pomija wygasłe earn (expiresAt <= now)", () => {
    expect(computeBalance([makeEarn({amount: 10, expiresAt: "2026-03-28T00:00:00Z"})], NOW)).toBe(0);
    expect(computeBalance([makeEarn({amount: 10, expiresAt: "2025-01-01T00:00:00Z"})], NOW)).toBe(0);
  });

  it("liczy remaining, nie amount", () => {
    expect(computeBalance([makeEarn({amount: 10, remaining: 4})], NOW)).toBe(4);
  });

  it("spend.overdraft obciąża saldo", () => {
    expect(computeBalance([makeSpend({amount: 8, overdraft: 8})], NOW)).toBe(-8);
  });

  it("zrefundowany spend nie obciąża salda", () => {
    expect(computeBalance([makeSpend({amount: 8, overdraft: 8, refunded: true})], NOW)).toBe(0);
  });

  it("legacy spend bez pola refunded obciąża saldo", () => {
    expect(computeBalance([makeSpend({amount: 5, overdraft: 5, refunded: undefined})], NOW)).toBe(-5);
  });

  it("zatwierdzony purchase redukuje dług", () => {
    const records = [makeSpend({amount: 10, overdraft: 10}), makePurchase({amount: 4, approved: true})];
    expect(computeBalance(records, NOW)).toBe(-6);
  });

  it("pending purchase (approved=false) nie wchodzi do bilansu", () => {
    const records = [makeSpend({amount: 10, overdraft: 10}), makePurchase({amount: 4, approved: false})];
    expect(computeBalance(records, NOW)).toBe(-10);
  });

  it("legacy purchase bez pola approved wchodzi do bilansu", () => {
    const records = [makeSpend({amount: 10, overdraft: 10}), makePurchase({amount: 4, approved: undefined})];
    expect(computeBalance(records, NOW)).toBe(-6);
  });

  it("scenariusz L1: refund overdraftu wyłącznie przez refunded=true (bez dodatkowej puli)", () => {
    // earn 3 → rezerwacja 8 (fromEarn 3, overdraft 5) → cancel
    // Po poprawnym refundzie: pula przywrócona (remaining 3), spend refunded.
    const records = [
      makeEarn({amount: 3, remaining: 3}),
      makeSpend({amount: 8, overdraft: 5, refunded: true}),
    ];
    expect(computeBalance(records, NOW)).toBe(3);
  });
});

describe("computeNextExpiry", () => {
  it("zwraca null gdy brak pul", () => {
    expect(computeNextExpiry([], NOW)).toBeNull();
  });

  it("zwraca najwcześniejszą datę wygaśnięcia puli z remaining > 0", () => {
    const records = [
      makeEarn({amount: 5, expiresAt: "2029-06-01T00:00:00Z"}),
      makeEarn({amount: 5, expiresAt: "2027-02-01T00:00:00Z"}),
    ];
    expect(computeNextExpiry(records, NOW)?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });

  it("pomija pule wyzerowane, niezatwierdzone i wygasłe", () => {
    const records = [
      makeEarn({amount: 5, remaining: 0, expiresAt: "2027-01-01T00:00:00Z"}),
      makeEarn({amount: 5, approved: false}),
      makeEarn({amount: 5, expiresAt: "2025-01-01T00:00:00Z"}),
    ];
    expect(computeNextExpiry(records, NOW)).toBeNull();
  });
});
