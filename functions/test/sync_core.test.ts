/**
 * Testy jednostkowe TS dla logiki korekt pending z arkusza (poprawka P1).
 * buildPendingCorrection decyduje, które edycje arkusza trafiają do Firestore.
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {buildPendingCorrection, buildLedgerRowPatch} from "../src/service/tasks/godzinkiSyncFromSheet";

function ts(iso: string): any {
  const d = new Date(iso);
  return {toDate: () => d, toMillis: () => d.getTime()};
}

function earnData(overrides: Record<string, any> = {}) {
  return {
    type: "earn",
    amount: 5,
    grantedAt: ts("2026-03-01T00:00:00Z"),
    reason: "praca przy sprzęcie",
    ...overrides,
  };
}

describe("buildPendingCorrection — kwota (Godzinki)", () => {
  it("zmieniona kwota trafia do patcha", () => {
    const {patch, rejected} = buildPendingCorrection({"Godzinki": "8"}, earnData());
    expect(patch.amount).toBe(8);
    expect(rejected).toHaveLength(0);
  });

  it("niezmieniona kwota = brak patcha", () => {
    const {patch} = buildPendingCorrection({"Godzinki": "5"}, earnData());
    expect(patch.amount).toBeUndefined();
  });

  it("kwota ułamkowa odrzucona (spójnie z L6)", () => {
    const {patch, rejected} = buildPendingCorrection({"Godzinki": "2.5"}, earnData());
    expect(patch.amount).toBeUndefined();
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("kwota z przecinkiem dziesiętnym odrzucona", () => {
    const {patch, rejected} = buildPendingCorrection({"Godzinki": "2,5"}, earnData());
    expect(patch.amount).toBeUndefined();
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("kwota <= 0 lub > 9999 odrzucona", () => {
    expect(buildPendingCorrection({"Godzinki": "0"}, earnData()).rejected.length).toBeGreaterThan(0);
    expect(buildPendingCorrection({"Godzinki": "-3"}, earnData()).rejected.length).toBeGreaterThan(0);
    expect(buildPendingCorrection({"Godzinki": "10000"}, earnData()).rejected.length).toBeGreaterThan(0);
  });

  it("pusta komórka = brak korekty (nie zeruje kwoty)", () => {
    const {patch, rejected} = buildPendingCorrection({"Godzinki": ""}, earnData());
    expect(patch.amount).toBeUndefined();
    expect(rejected).toHaveLength(0);
  });
});

describe("buildPendingCorrection — data pracy i opis (tylko earn)", () => {
  it("zmieniona data pracy trafia do patcha jako Timestamp", () => {
    const {patch} = buildPendingCorrection({"Data pracy": "2026-02-15"}, earnData());
    expect(patch.grantedAt).toBeDefined();
    expect(patch.grantedAt.toDate().toISOString().slice(0, 10)).toBe("2026-02-15");
  });

  it("niezmieniona data = brak patcha", () => {
    const {patch} = buildPendingCorrection({"Data pracy": "2026-03-01"}, earnData());
    expect(patch.grantedAt).toBeUndefined();
  });

  it("zły format daty odrzucony (np. format z polskiego locale)", () => {
    const {patch, rejected} = buildPendingCorrection({"Data pracy": "15.02.2026"}, earnData());
    expect(patch.grantedAt).toBeUndefined();
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("zmieniony opis trafia do patcha", () => {
    const {patch} = buildPendingCorrection({"Opis": "nowy opis"}, earnData());
    expect(patch.reason).toBe("nowy opis");
  });

  it("purchase: data pracy i opis ignorowane, kwota korygowana", () => {
    const data = {type: "purchase", amount: 5, reason: "Wykup salda ujemnego"};
    const {patch} = buildPendingCorrection(
      {"Godzinki": "3", "Data pracy": "2026-02-15", "Opis": "cokolwiek"},
      data
    );
    expect(patch.amount).toBe(3);
    expect(patch.grantedAt).toBeUndefined();
    expect(patch.reason).toBeUndefined();
  });
});

describe("buildLedgerRowPatch", () => {
  it("earn: pełny wiersz z datą pracy i opisem", () => {
    const row = buildLedgerRowPatch({
      recordId: "r1",
      uid: "u1",
      data: earnData(),
      firstName: "Jan",
      lastName: "Kowalski",
    });
    expect(row["ID"]).toBe("r1");
    expect(row["Godzinki"]).toBe("5");
    expect(row["Data pracy"]).toBe("2026-03-01");
    expect(row["Opis"]).toBe("praca przy sprzęcie");
    expect(row["Zatwierdzone"]).toBe("NIE");
  });

  it("purchase: pusta data pracy i etykieta WYKUP", () => {
    const row = buildLedgerRowPatch({
      recordId: "r2",
      uid: "u1",
      data: {type: "purchase", amount: 4},
      firstName: "Jan",
      lastName: "Kowalski",
    });
    expect(row["Data pracy"]).toBe("");
    expect(row["Opis"]).toBe("WYKUP SALDA UJEMNEGO");
    expect(row["Godzinki"]).toBe("4");
  });
});
