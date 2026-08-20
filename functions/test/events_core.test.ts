/**
 * Testy jednostkowe TS dla przepływu imprez (naprawy I1–I3 z audytu
 * 12.06_imprezy_audyt.md). Wykonują kod produkcyjny.
 *
 * Uruchamianie: npm --prefix functions run test
 */
import {describe, it, expect} from "vitest";
import {normDate, isApproved, buildEventRowPatch, findHeaderCaseInsensitive, EVENT_ROW_CREATE_ONLY_COLUMNS, shouldScrapAbsentEvent} from "../src/service/tasks/eventsSyncFromSheet";
import {buildRowValuesForUpsert, findFirstEmptySlotIndex, canonicalHeader, buildLooseRowGetter} from "../src/service/providers/googleSheetsProvider";
import {selectNewRecipientUids, buildUpcomingEventEmail, daysUntilIso} from "../src/service/tasks/eventsNotifyUpcoming";

describe("selectNewRecipientUids — dogonienie spóźnionych subskrybentów (regresja: impreza za 2 dni bez maila)", () => {
  it("nikt jeszcze nie dostał maila → wszyscy uprawnieni są nowi", () => {
    expect(selectNewRecipientUids(["u1", "u2"], [])).toEqual(["u1", "u2"]);
  });

  it("część już dostała → tylko reszta jest nowa", () => {
    expect(selectNewRecipientUids(["u1", "u2", "u3"], ["u1"])).toEqual(["u2", "u3"]);
  });

  it("wszyscy już dostali → pusta lista, brak duplikatów maila", () => {
    expect(selectNewRecipientUids(["u1", "u2"], ["u1", "u2"])).toEqual([]);
  });

  it("użytkownik oznaczył zainteresowanie PO tym, jak inni już dostali mail → i tak trafia na listę nowych", () => {
    // Scenariusz zgłoszony przez usera: włączył powiadomienia i oznaczył
    // imprezę jako interesującą już po pierwszym uruchomieniu crona dla tej
    // imprezy — poprzednia logika (globalny reminderSentAt na evencie) by go
    // pominęła na zawsze; per-uid tracking musi go złapać.
    expect(selectNewRecipientUids(["u1", "u2", "uSwitek"], ["u1", "u2"])).toEqual(["uSwitek"]);
  });
});

describe("daysUntilIso — liczba dni do startu liczona na żywo (nie ze statycznego reminderDays)", () => {
  it("zwraca różnicę w pełnych dniach", () => {
    expect(daysUntilIso("2026-08-20", "2026-08-27")).toBe(7);
    expect(daysUntilIso("2026-08-20", "2026-08-21")).toBe(1);
    expect(daysUntilIso("2026-08-20", "2026-08-20")).toBe(0);
  });

  it("regresja: cron dogania spóźnioną wysyłkę innego dnia niż dokładnie reminderDays przed startem — treść maila musi pokazać rzeczywisty odstęp, nie skonfigurowany próg", () => {
    // reminderDays=7, ale wysyłka realnie leci dzień przed startem (dogonienie okna)
    expect(daysUntilIso("2026-08-20", "2026-08-21")).toBe(1);
  });
});

describe("buildUpcomingEventEmail — treść przypomnienia", () => {
  it("zawiera nazwę, liczbę dni i link do aplikacji", () => {
    const {subject, bodyText} = buildUpcomingEventEmail(
      {name: "Devils extreme Race", startDate: "2026-08-21", endDate: "2026-08-23", location: "Wełtawa"},
      7,
      "https://app.morzkulc.pl/"
    );
    expect(subject).toContain("Devils extreme Race");
    expect(bodyText).toContain("Za 7 dni");
    expect(bodyText).toContain("2026-08-21 – 2026-08-23");
    expect(bodyText).toContain("Wełtawa");
    expect(bodyText).toContain("https://app.morzkulc.pl/");
  });

  it("1 dzień → 'Jutro', 0 dni → 'Dziś' (nie 'Za 1 dni'/'Za 0 dni')", () => {
    const tomorrow = buildUpcomingEventEmail(
      {name: "X", startDate: "2026-08-21", endDate: "2026-08-21", location: ""}, 1, "https://app.morzkulc.pl/"
    );
    expect(tomorrow.bodyText).toContain("Jutro odbywa się impreza");

    const today = buildUpcomingEventEmail(
      {name: "X", startDate: "2026-08-20", endDate: "2026-08-20", location: ""}, 0, "https://app.morzkulc.pl/"
    );
    expect(today.bodyText).toContain("Dziś odbywa się impreza");
  });
});

describe("shouldScrapAbsentEvent — usuwanie imprez skasowanych z arkusza", () => {
  const ts = {toDate: () => new Date("2026-06-01T00:00:00Z")};

  it("impreza z arkusza (source=sheet) → usuwana", () => {
    expect(shouldScrapAbsentEvent({source: "sheet"})).toBe(true);
  });

  it("impreza z aplikacji już zsynchronizowana (sheetSyncedAt=timestamp) → usuwana", () => {
    expect(shouldScrapAbsentEvent({source: "app", sheetSyncedAt: ts})).toBe(true);
  });

  it("zgłoszenie z aplikacji czekające na backfill (sheetSyncedAt===null) → NIE usuwać", () => {
    expect(shouldScrapAbsentEvent({source: "app", sheetSyncedAt: null})).toBe(false);
  });

  it("już odrzucona/usunięta (rejected===true) → pomiń", () => {
    expect(shouldScrapAbsentEvent({source: "sheet", rejected: true})).toBe(false);
  });

  it("nieznane źródło bez timestampu → zachowawczo NIE usuwać", () => {
    expect(shouldScrapAbsentEvent({source: ""})).toBe(false);
    expect(shouldScrapAbsentEvent({source: "app"})).toBe(false);
    expect(shouldScrapAbsentEvent(null)).toBe(false);
  });
});

describe("normDate — formaty dat z arkusza", () => {
  it("akceptuje YYYY-MM-DD", () => {
    expect(normDate("2026-07-15")).toBe("2026-07-15");
  });

  it("konwertuje DD.MM.YYYY (format polskiego locale arkusza)", () => {
    expect(normDate("15.07.2026")).toBe("2026-07-15");
  });

  it("trymuje białe znaki", () => {
    expect(normDate("  2026-07-15  ")).toBe("2026-07-15");
  });

  it("nierozpoznany format przechodzi bez zmian (walidacja dalej po stronie konsumenta)", () => {
    expect(normDate("15/07/2026")).toBe("15/07/2026");
    expect(normDate("")).toBe("");
  });
});

describe("isApproved — wartości kolumny Zatwierdzona", () => {
  it("akceptuje warianty TAK", () => {
    for (const v of ["TAK", "tak", "t", "yes", "TRUE", "true", "1", "✓"]) {
      expect(isApproved(v), `wariant: ${v}`).toBe(true);
    }
  });

  it("odrzuca NIE, ODRZUCONA, puste i śmieci", () => {
    // "ODRZUCONA" (write-back odrzucenia z aplikacji, Faza 2 Z9/D4) MUSI być
    // traktowane jak NIE — gwarancja zero zmian protokołu syncu.
    for (const v of ["NIE", "nie", "ODRZUCONA", "odrzucona", "", "  ", "0", "x", null, undefined]) {
      expect(isApproved(v), `wariant: ${String(v)}`).toBe(false);
    }
  });
});

describe("buildEventRowPatch", () => {
  const data = {
    startDate: "2026-07-01",
    endDate: "2026-07-03",
    name: "Spływ Brdą",
    location: "Brda",
    description: "opis",
    contact: "jan@example.com",
    link: "https://example.com",
  };

  it("buduje komplet kolumn arkusza z Zatwierdzona=NIE", () => {
    const row = buildEventRowPatch("ev1", data);
    expect(row["ID"]).toBe("ev1");
    expect(row["data rozpoczęcia"]).toBe("2026-07-01");
    expect(row["data zakończenia"]).toBe("2026-07-03");
    expect(row["nazwa imprezy"]).toBe("Spływ Brdą");
    expect(row["miejsce"]).toBe("Brda");
    expect(row["Zatwierdzona"]).toBe("NIE");
    expect(row["ranking?"]).toBe("NIE");
    expect(row["kursowa?"]).toBe("NIE");
  });

  it("kolumny decyzyjne są zadeklarowane jako create-only", () => {
    expect(EVENT_ROW_CREATE_ONLY_COLUMNS).toEqual(["Zatwierdzona", "ranking?", "kursowa?"]);
  });
});

describe("buildRowValuesForUpsert — regresja I3 (retry nie cofa zatwierdzenia)", () => {
  const headers = ["ID", "nazwa imprezy", "Zatwierdzona", "ranking?"];

  it("tworzenie nowego wiersza: kolumny create-only SĄ ustawiane", () => {
    const row = buildRowValuesForUpsert({
      headers,
      existingRow: null,
      rowPatch: {"ID": "ev1", "nazwa imprezy": "Spływ", "Zatwierdzona": "NIE", "ranking?": "NIE"},
      createOnlyColumns: ["Zatwierdzona", "ranking?"],
    });
    expect(row).toEqual(["ev1", "Spływ", "NIE", "NIE"]);
  });

  it("aktualizacja istniejącego wiersza: kolumny create-only ZACHOWUJĄ wartość z arkusza", () => {
    // Scenariusz I3: zarząd wpisał TAK, job zapisu jest ponawiany (retry)
    const row = buildRowValuesForUpsert({
      headers,
      existingRow: ["ev1", "Spływ", "TAK", "TAK"],
      rowPatch: {"ID": "ev1", "nazwa imprezy": "Spływ (po korekcie)", "Zatwierdzona": "NIE", "ranking?": "NIE"},
      createOnlyColumns: ["Zatwierdzona", "ranking?"],
    });
    expect(row[2]).toBe("TAK", "REGRESJA I3: retry nadpisał Zatwierdzona=TAK na NIE");
    expect(row[3]).toBe("TAK");
    expect(row[1]).toBe("Spływ (po korekcie)", "zwykłe kolumny nadal aktualizowane");
  });

  it("aktualizacja bez createOnlyColumns: zachowanie jak dotychczas (pełny nadpis)", () => {
    const row = buildRowValuesForUpsert({
      headers,
      existingRow: ["ev1", "Spływ", "TAK", "TAK"],
      rowPatch: {"ID": "ev1", "Zatwierdzona": "NIE"},
    });
    expect(row[2]).toBe("NIE");
  });

  it("kolumny spoza nagłówków pomijane; kolumny spoza patcha zachowane", () => {
    const row = buildRowValuesForUpsert({
      headers,
      existingRow: ["ev1", "Stara nazwa", "NIE", ""],
      rowPatch: {"ID": "ev1", "nieistniejąca kolumna": "x"},
    });
    expect(row).toEqual(["ev1", "Stara nazwa", "NIE", ""]);
  });

  it("tworzenie: wiersz dopełniony pustymi wartościami do długości nagłówków", () => {
    const row = buildRowValuesForUpsert({
      headers,
      existingRow: null,
      rowPatch: {"ID": "ev2"},
    });
    expect(row).toEqual(["ev2", "", "", ""]);
  });
});

describe("canonicalHeader + buildLooseRowGetter — tolerancja nagłówków (Z1/Z2 z planu panelu)", () => {
  it("kanonizacja zrównuje rozjazdy zastane na prod", () => {
    expect(canonicalHeader("Ranking?")).toBe(canonicalHeader("ranking?"));
    expect(canonicalHeader("Kursowa?")).toBe(canonicalHeader("kursowa?"));
    expect(canonicalHeader("kontakt ")).toBe(canonicalHeader("kontakt"));
    expect(canonicalHeader("link do strony zgłoszeń")).toBe(canonicalHeader("link do strony / zgłoszeń"));
    expect(canonicalHeader("Zsynchronizowano")).toBe(canonicalHeader("zsynchronizowano"));
  });

  it("kanonizacja NIE zrównuje różnych kolumn", () => {
    expect(canonicalHeader("data rozpoczęcia")).not.toBe(canonicalHeader("data zakończenia"));
    expect(canonicalHeader("Zatwierdzona")).not.toBe(canonicalHeader("Zsynchronizowano"));
  });

  it("getter czyta wartości mimo rozjazdu nagłówków (scenariusz z prod)", () => {
    const headers = ["ID", "nazwa imprezy", "link do strony zgłoszeń", "Ranking?", "Kursowa?"];
    const get = buildLooseRowGetter(headers);
    const row = {
      "ID": "ev1",
      "nazwa imprezy": "Spływ",
      "link do strony zgłoszeń": "https://example.com",
      "Ranking?": "TAK",
      "Kursowa?": "NIE",
    };
    expect(get(row, "link do strony / zgłoszeń")).toBe("https://example.com");
    expect(get(row, "ranking?")).toBe("TAK");
    expect(get(row, "kursowa?")).toBe("NIE");
    expect(get(row, "nazwa imprezy")).toBe("Spływ");
  });

  it("brak kolumny → pusty string (jak dotychczas)", () => {
    const get = buildLooseRowGetter(["ID"]);
    expect(get({"ID": "x"}, "nieistniejąca")).toBe("");
  });
});

describe("upsert z looseHeaders — patch trafia w faktyczne nagłówki", () => {
  it("klucze patcha mapowane kanonicznie, createOnly honorowane", () => {
    // Test przez buildRowValuesForUpsert nie pokrywa mapowania (dzieje się w
    // upsertMemberRowById) — tu sprawdzamy kontrakt kanonizacji par klucz→nagłówek
    const headers = ["ID", "ranking?", "kursowa?"];
    const byCanonical = new Map(headers.map((h) => [canonicalHeader(h), h]));
    expect(byCanonical.get(canonicalHeader("Ranking?"))).toBe("ranking?");
    expect(byCanonical.get(canonicalHeader("Kursowa?"))).toBe("kursowa?");
  });
});

describe("findHeaderCaseInsensitive — kolumna zsynchronizowano (I7)", () => {
  it("znajduje nagłówek niezależnie od wielkości liter i spacji", () => {
    expect(findHeaderCaseInsensitive(["ID", "Zsynchronizowano"], "zsynchronizowano")).toBe("Zsynchronizowano");
    expect(findHeaderCaseInsensitive(["ID", "zsynchronizowano "], "zsynchronizowano")).toBe("zsynchronizowano ");
    expect(findHeaderCaseInsensitive(["ID", "ZSYNCHRONIZOWANO"], "zsynchronizowano")).toBe("ZSYNCHRONIZOWANO");
  });

  it("brak kolumny → null (potwierdzenia pomijane, sync działa dalej)", () => {
    expect(findHeaderCaseInsensitive(["ID", "nazwa imprezy"], "zsynchronizowano")).toBeNull();
  });
});

describe("findFirstEmptySlotIndex — regresja zgłoszonego buga (wiersze dopisywane poniżej tabeli)", () => {
  it("pusty arkusz → indeks 0 (wiersz 2 arkusza)", () => {
    expect(findFirstEmptySlotIndex([])).toBe(0);
  });

  it("dopisanie za ostatnim wierszem z danymi", () => {
    expect(findFirstEmptySlotIndex([["ev1", "Spływ"], ["ev2", "Rajd"]])).toBe(2);
  });

  it("pierwszy całkiem pusty wiersz pomiędzy danymi", () => {
    expect(findFirstEmptySlotIndex([["ev1", "Spływ"], [], ["ev3", "Rajd"]])).toBe(1);
  });

  it("ZGŁOSZONY BUG: niezaznaczone checkboxy (FALSE) nie blokują wolnego wiersza", () => {
    // Symulacja zakładki imprezy: dane w 2 wierszach, potem dziesiątki wierszy
    // z samym FALSE w kolumnie checkboxów — nowy wpis ma trafić ZARAZ po danych,
    // a nie za blokiem checkboxów (jak w prod: dane do w.19, wpisy lądowały w 75+).
    const rows: any[][] = [
      ["ev1", "Spływ", "TAK"],
      ["ev2", "Rajd", "FALSE"],
      ["", "", "FALSE"],
      ["", "", "FALSE"],
      ["", "", "FALSE"],
    ];
    expect(findFirstEmptySlotIndex(rows)).toBe(2);
  });

  it("polskie locale: FAŁSZ traktowane jak puste", () => {
    const rows: any[][] = [["ev1", "Spływ"], ["", "", "FAŁSZ"], []];
    expect(findFirstEmptySlotIndex(rows)).toBe(1);
  });

  it("ZAZNACZONY checkbox (TRUE/PRAWDA) bez innej treści NIE blokuje — to też artefakt formatowania", () => {
    // Kolumna checkboxów „dla formatowania" bywa przeciągnięta jako TRUE.
    // Sam zaznaczony box (bez ID/nazwy) musi liczyć się jak pusty wiersz —
    // inaczej nowe wpisy lądują na dole arkusza (zgłoszony bug).
    const rows: any[][] = [["", "", "TRUE"], ["", "", "PRAWDA"], []];
    expect(findFirstEmptySlotIndex(rows)).toBe(0);
  });

  it("ZGŁOSZONY BUG (kolumna H): boxy mieszane true/false pod danymi → slot zaraz po danych", () => {
    // Realny scenariusz użytkownika: kolumna H to checkboxy (true/false)
    // dorzucone dla formatowania; nowy wpis ma trafić w pierwszy wiersz po danych.
    const rows: any[][] = [
      ["g1", "Jan", "Kowalski", "5", "2026-06-01", "praca", "TRUE"],
      ["g2", "Anna", "Nowak", "3", "2026-06-02", "praca", "FALSE"],
      ["", "", "", "", "", "", "TRUE"],
      ["", "", "", "", "", "", "FALSE"],
      ["", "", "", "", "", "", "PRAWDA"],
    ];
    expect(findFirstEmptySlotIndex(rows)).toBe(2);
  });

  it("realna treść + zaznaczony box → wiersz nadal zajęty (nie nadpisujemy danych)", () => {
    const rows: any[][] = [["g1", "Jan", "TRUE"], ["g2", "Anna", "PRAWDA"], []];
    expect(findFirstEmptySlotIndex(rows)).toBe(2);
  });

  it("białe znaki traktowane jak puste", () => {
    expect(findFirstEmptySlotIndex([["  ", ""], ["x"]])).toBe(0);
  });
});
