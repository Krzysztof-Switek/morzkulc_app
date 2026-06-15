/**
 * Testy jednostkowe TS dla Fazy 2 panelu zarządu:
 *  - buildPendingDigest: treść digestu zaległych zatwierdzeń + zasada "pusto → null".
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {buildPendingDigest, DigestInput} from "../src/service/tasks/adminNotifyPendingApprovals";

/** Buduje digest i zapewnia, że nie jest null (zawęża typ dla TS bez "!"). */
function mustDigest(input: DigestInput): {subject: string; bodyText: string} {
  const d = buildPendingDigest(input);
  if (!d) throw new Error("expected a digest, got null");
  return d;
}

function baseInput(overrides: Partial<DigestInput> = {}): DigestInput {
  return {
    godzinki: [],
    events: [],
    rejected: [],
    godzinkiSheetUrl: "https://docs.google.com/spreadsheets/d/GID",
    eventsSheetUrl: "https://docs.google.com/spreadsheets/d/EID",
    appUrl: "https://morzkulc-e9df7.web.app/",
    ageDays: 3,
    ...overrides,
  };
}

describe("buildPendingDigest — zasada pusto → brak maila", () => {
  it("nic do zgłoszenia → null", () => {
    expect(buildPendingDigest(baseInput())).toBeNull();
  });

  it("same odmowy (bez pending) → digest jest wysyłany", () => {
    const d = mustDigest(baseInput({
      rejected: [{displayName: "Jan", amount: 5, message: "data pracy przeterminowana"}],
    }));
    expect(d.bodyText).toContain("WYMAGAJĄ INTERWENCJI");
    expect(d.bodyText).toContain("data pracy przeterminowana");
  });
});

describe("buildPendingDigest — treść", () => {
  it("liczy godzinki i imprezy w temacie", () => {
    const d = mustDigest(baseInput({
      godzinki: [
        {displayName: "Ala", type: "earn", amount: 8, reason: "sprzęt", ageDays: 5},
        {displayName: "Ola", type: "purchase", amount: 3, reason: "", ageDays: 10},
      ],
      events: [
        {name: "Spływ Brdą", startDate: "2026-07-01", userEmail: "a@b.pl", ageDays: 4},
      ],
    }));
    // 2 godzinki + 1 impreza = 3
    expect(d.subject).toContain("3");
    expect(d.subject).toContain("3 dni");
    expect(d.bodyText).toContain("GODZINKI (2)");
    expect(d.bodyText).toContain("IMPREZY (1)");
    expect(d.bodyText).toContain("wykup salda ujemnego");
    expect(d.bodyText).toContain("Spływ Brdą");
    expect(d.bodyText).toContain("zgłosił: a@b.pl");
  });

  it("zawiera linki do panelu i arkuszy", () => {
    const d = mustDigest(baseInput({
      godzinki: [{displayName: "Ala", type: "earn", amount: 8, reason: "x", ageDays: 5}],
    }));
    expect(d.bodyText).toContain("https://morzkulc-e9df7.web.app/");
    expect(d.bodyText).toContain("https://docs.google.com/spreadsheets/d/GID");
    expect(d.bodyText).toContain("https://docs.google.com/spreadsheets/d/EID");
  });

  it("pomija opis gdy pusty (brak pustego cudzysłowu)", () => {
    const d = mustDigest(baseInput({
      godzinki: [{displayName: "Ola", type: "purchase", amount: 3, reason: "", ageDays: 10}],
    }));
    expect(d.bodyText).not.toContain("„”");
  });
});
