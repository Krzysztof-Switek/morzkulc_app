/**
 * Testy jednostkowe TS dla czystej logiki dodanej przy pełnym przełączeniu na
 * arkusz "App_SETUP" (limit zgłaszania godzinek wstecz, czyszczenie arkusza Godzinki).
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {isTooOldGrantedAt} from "../src/api/submitGodzinkiHandler";
import {selectRowsToArchive} from "../src/service/tasks/godzinkiArchiveSheetRows";

describe("isTooOldGrantedAt — limit zgłaszania godzinek wstecz", () => {
  it("data dokładnie na granicy (dziś − N dni) jest akceptowana", () => {
    expect(isTooOldGrantedAt("2026-03-01", "2026-03-15", 14)).toBe(false);
  });

  it("data jeden dzień za starą jest odrzucona", () => {
    expect(isTooOldGrantedAt("2026-02-28", "2026-03-15", 14)).toBe(true);
  });

  it("data dzisiejsza zawsze akceptowana", () => {
    expect(isTooOldGrantedAt("2026-03-15", "2026-03-15", 14)).toBe(false);
  });

  it("większe okno (reportWindowDays) akceptuje starsze daty", () => {
    expect(isTooOldGrantedAt("2026-02-01", "2026-03-15", 60)).toBe(false);
  });
});

describe("selectRowsToArchive — czyszczenie arkusza Godzinki", () => {
  const cutoff = "2026-02-15";

  it("wiersz starszy niż cutoff wybrany do usunięcia", () => {
    const rows = [{"Data pracy": "2026-01-01", "_rowNumber": "5"}];
    expect(selectRowsToArchive(rows, cutoff)).toEqual([5]);
  });

  it("wiersz nowszy/równy cutoff pominięty", () => {
    const rows = [
      {"Data pracy": "2026-02-15", "_rowNumber": "5"},
      {"Data pracy": "2026-03-01", "_rowNumber": "6"},
    ];
    expect(selectRowsToArchive(rows, cutoff)).toEqual([]);
  });

  it("puste 'Data pracy' (wiersze purchase) pominięte niezależnie od wieku", () => {
    const rows = [{"Data pracy": "", "_rowNumber": "5"}];
    expect(selectRowsToArchive(rows, cutoff)).toEqual([]);
  });

  it("nieparsowalna data pracy pominięta (nie wywala błędu)", () => {
    const rows = [{"Data pracy": "15.02.2026", "_rowNumber": "5"}];
    expect(selectRowsToArchive(rows, cutoff)).toEqual([]);
  });

  it("wiele wierszy: zwraca tylko te starsze niż cutoff", () => {
    const rows = [
      {"Data pracy": "2026-01-01", "_rowNumber": "2"},
      {"Data pracy": "2026-01-15", "_rowNumber": "3"},
      {"Data pracy": "2026-03-01", "_rowNumber": "4"},
      {"Data pracy": "", "_rowNumber": "5"},
    ];
    expect(selectRowsToArchive(rows, cutoff)).toEqual([2, 3]);
  });
});
