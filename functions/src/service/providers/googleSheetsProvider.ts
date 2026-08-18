import {google} from "googleapis";
import type {sheets_v4} from "googleapis";
import {getDelegatedAuth} from "./googleAuth";

export const SHEETS_SCOPES = {
  SPREADSHEETS: "https://www.googleapis.com/auth/spreadsheets",
} as const;

function normalizeStr(v: any): string {
  return String(v || "").trim();
}

function assertNonEmpty(label: string, v: string) {
  if (!v) throw new Error(`Missing ${label}`);
}

// Google Sheets API wymaga apostrofów wokół nazwy zakładki jeśli zawiera spacje lub znaki specjalne.
// Apostrofy wewnątrz nazwy są escapowane jako ''.
function quoteTab(tabName: string): string {
  return `'${tabName.replace(/'/g, "''")}'`;
}

function columnToA1(colIndex0: number): string {
  // 0->A, 25->Z, 26->AA...
  let n = colIndex0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export type MembersSheetConfig = {
  spreadsheetId: string;
  tabName: string;
};

export type UpsertResult = {
  action: "updated" | "appended";
  rowNumber: number; // 1-based (Sheets)
};

export type SheetTableConfig = {
  spreadsheetId: string;
  tabName: string;
  rangeA1?: string; // optional, e.g. "A:Q"
};

export type SheetTableReadResult = {
  headers: string[];
  rows: Record<string, string>[]; // each row includes _rowNumber (1-based sheet row)
};

/**
 * Kanoniczna postać nagłówka kolumny — do TOLERANCYJNEGO dopasowania.
 * Arkusze edytują ludzie: wielkość liter, spacje, znaki interpunkcyjne dryfują
 * (na prod zastane: "Ranking?" vs "ranking?", "link do strony zgłoszeń" vs
 * "link do strony / zgłoszeń", "kontakt " z trailing spacją). Kanonizacja:
 * małe litery + tylko litery/cyfry. Eksport dla testów.
 */
export function canonicalHeader(h: any): string {
  return String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]/g, "");
}

/**
 * Buduje funkcję odczytu wartości z wiersza (readTableAsObjects) po nazwie
 * OCZEKIWANEJ przez kod, tolerancyjnie względem faktycznych nagłówków arkusza.
 * Eksport dla tasków synców i testów.
 */
export function buildLooseRowGetter(headers: string[]): (row: Record<string, string>, expectedName: string) => string {
  const byCanonical = new Map<string, string>();
  for (const h of headers) {
    const c = canonicalHeader(h);
    if (c && !byCanonical.has(c)) byCanonical.set(c, h);
  }
  return (row, expectedName) => {
    const direct = row[expectedName];
    if (direct !== undefined) return direct;
    const actual = byCanonical.get(canonicalHeader(expectedName));
    return actual !== undefined ? (row[actual] ?? "") : "";
  };
}

/**
 * Wartości traktowane jako "puste" przy szukaniu wolnego wiersza do dopisania.
 * Komórka-checkbox w Sheets ZAWSZE ma wartość (TRUE/FALSE, locale PL: PRAWDA/FAŁSZ)
 * w KAŻDYM wierszu kolumny — także w wierszach bez danych, gdy kolumnę checkboxów
 * przeciągnięto w dół „dla formatowania". Dlatego ignorujemy OBA stany boxa
 * (zaznaczony i nie): prawdziwy wpis i tak ma zawsze treść nie-boolean (ID, nazwa),
 * więc nigdy nie zostanie uznany za pusty. Bez tego nowe wiersze lądowały dziesiątki
 * wierszy poniżej widocznej tabeli (kolumna z TRUE wyglądała na zajętą).
 */
const EMPTY_SLOT_TOKENS = new Set(["", "false", "fałsz", "true", "prawda"]);

/**
 * Zwraca 0-based indeks pierwszego wolnego wiersza w bodyRows (wiersze od 2.
 * wiersza arkusza). Wiersz jest wolny, gdy nie zawiera żadnej wartości poza
 * artefaktami checkboxów (TRUE/FALSE/PRAWDA/FAŁSZ). Gdy brak wolnego —
 * zwraca bodyRows.length (dopisanie za ostatnim wierszem).
 *
 * Eksportowane jako funkcja czysta dla testów jednostkowych (vitest).
 */
export function findFirstEmptySlotIndex(bodyRows: any[][]): number {
  for (let i = 0; i < bodyRows.length; i++) {
    const row = bodyRows[i] || [];
    const hasContent = row.some(
      (cell: any) => !EMPTY_SLOT_TOKENS.has(normalizeStr(cell).toLowerCase())
    );
    if (!hasContent) return i;
  }
  return bodyRows.length;
}

/**
 * Buduje pełny wiersz wartości dla upsertu na podstawie nagłówków arkusza.
 *
 * - existingRow === null → tworzenie nowego wiersza (wszystkie kolumny patcha),
 * - existingRow podany → aktualizacja: kolumny spoza patcha zachowane,
 *   a kolumny z createOnlyColumns NIE są nadpisywane (zachowują wartość
 *   z arkusza — np. "Zatwierdzona" ustawiona przez admina nie może zostać
 *   cofnięta przez retry joba zapisu).
 * - klucze patcha nieobecne w nagłówkach są pomijane po cichu.
 *
 * Eksportowane jako funkcja czysta dla testów jednostkowych (vitest).
 */
export function buildRowValuesForUpsert(args: {
  headers: string[];
  existingRow: string[] | null;
  rowPatch: Record<string, any>;
  createOnlyColumns?: string[];
}): string[] {
  const {headers, existingRow, rowPatch, createOnlyColumns} = args;

  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => headerIndex.set(h, i));

  const isUpdate = existingRow !== null;
  const skipOnUpdate = new Set(isUpdate ? (createOnlyColumns || []) : []);

  const out = new Array(headers.length).fill("");
  if (existingRow) {
    for (let i = 0; i < Math.min(existingRow.length, out.length); i++) out[i] = normalizeStr(existingRow[i]);
  }

  for (const [k, v] of Object.entries(rowPatch)) {
    if (!headerIndex.has(k)) continue;
    if (skipOnUpdate.has(k)) continue;
    const idx = headerIndex.get(k) as number;
    out[idx] = normalizeStr(v);
  }
  return out;
}

export class GoogleSheetsProvider {
  constructor(private delegatedUserEmail: string) {}

  // Cache wiersza nagłówków per (spreadsheetId|tabName) — unika ponownego odczytu przy
  // wielokrotnym zapisie komórek (np. write-back importu godzinek przejściowych).
  private headerCache = new Map<string, string[]>();

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = await getDelegatedAuth([SHEETS_SCOPES.SPREADSHEETS], this.delegatedUserEmail);
    return google.sheets({version: "v4", auth});
  }

  /** Odczytuje (z cache) wiersz nagłówków arkusza w oryginalnej postaci. */
  private async getHeaderRow(spreadsheetId: string, tabName: string): Promise<string[]> {
    const key = `${spreadsheetId}|${tabName}`;
    const cached = this.headerCache.get(key);
    if (cached) return cached;
    const sheets = await this.getSheetsClient();
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tabName)}!1:1`,
      majorDimension: "ROWS",
    });
    const headers = (headerResp.data.values?.[0] || []).map((h) => normalizeStr(h));
    this.headerCache.set(key, headers);
    return headers;
  }

  /** Odczytuje sheetId (gid) zakładki po nazwie — wymagany przez deleteDimension. */
  private async getSheetGid(spreadsheetId: string, tabName: string): Promise<number> {
    const sheets = await this.getSheetsClient();
    const resp = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const match = (resp.data.sheets || []).find((s) => s.properties?.title === tabName);
    if (!match || match.properties?.sheetId == null) {
      throw new Error(`Sheet "${tabName}" not found in spreadsheet ${spreadsheetId}`);
    }
    return match.properties.sheetId;
  }

  /**
   * Usuwa całe wiersze z zakładki (numery 1-based, wg numeracji arkusza — wiersz 1 to
   * nagłówek). Usuwane w JEDNYM batchUpdate, od NAJWYŻSZEGO numeru do najniższego —
   * kolejność krytyczna: deleteDimension operuje na indeksach siatki, więc usunięcie
   * wiersza o wyższym indeksie nie przesuwa (i nie unieważnia) indeksów wierszy poniżej,
   * które batch ma usunąć w kolejnych krokach tego samego wywołania.
   */
  async deleteRows(cfg: SheetTableConfig, rowNumbers1based: number[]): Promise<void> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);
    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const uniqueSorted = Array.from(new Set(rowNumbers1based)).sort((a, b) => b - a);
    if (!uniqueSorted.length) return;

    const sheetId = await this.getSheetGid(spreadsheetId, tabName);
    const sheets = await this.getSheetsClient();

    const requests = uniqueSorted.map((row1based) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: row1based - 1, // 0-based, inclusive
          endIndex: row1based, // 0-based, exclusive
        },
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {requests},
    });
  }

  /**
   * Zapisuje wiele komórek JEDNEGO wiersza w pojedynczym batchUpdate (po nazwach nagłówków).
   * Nagłówki czytane raz i cache'owane — koszt nie rośnie z liczbą zapisów.
   * Nagłówki nieznalezione są pomijane (nie przerywa zapisu pozostałych).
   */
  async writeRowCells(
    cfg: SheetTableConfig,
    rowNumber1based: number,
    patch: Record<string, string>
  ): Promise<void> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);
    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const headers = await this.getHeaderRow(spreadsheetId, tabName);
    const data: {range: string; values: string[][]}[] = [];
    for (const [header, value] of Object.entries(patch)) {
      const colIdx = headers.indexOf(header);
      if (colIdx === -1) continue;
      data.push({
        range: `${quoteTab(tabName)}!${columnToA1(colIdx)}${rowNumber1based}`,
        values: [[value]],
      });
    }
    if (!data.length) return;

    const sheets = await this.getSheetsClient();
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {valueInputOption: "RAW", data},
    });
  }

  /**
   * Read full table as objects using header row as keys.
   * Skips completely empty rows. Trims every cell.
   */
  async readTableAsObjects(cfg: SheetTableConfig): Promise<SheetTableReadResult> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);
    const rangeA1 = normalizeStr(cfg.rangeA1 || "");

    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const sheets = await this.getSheetsClient();

    // Read all values (header + data)
    const range = rangeA1 ? `${quoteTab(tabName)}!${rangeA1}` : quoteTab(tabName);
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });

    const values = resp.data.values || [];
    if (!values.length) return {headers: [], rows: []};

    const headersRaw = values[0] || [];
    const headers = headersRaw.map((h) => normalizeStr(h)).filter((h) => Boolean(h));
    if (!headers.length) throw new Error(`Sheet "${tabName}" has no header row`);

    const rows: Record<string, string>[] = [];

    for (let r = 1; r < values.length; r++) {
      const rowArr = values[r] || [];
      const obj: Record<string, string> = {};
      let any = false;

      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        const val = normalizeStr(rowArr[c] ?? "");
        if (val) any = true;
        obj[key] = val;
      }

      if (any) {
        obj["_rowNumber"] = String(r + 1); // 1-based sheet row (header is row 1)
        rows.push(obj);
      }
    }

    return {headers, rows};
  }

  /**
   * Writes a single cell value by row number and column header name.
   * Reads the header row to find the column index, then updates that cell.
   */
  async writeSingleCell(
    cfg: SheetTableConfig,
    rowNumber1based: number,
    colHeader: string,
    value: string
  ): Promise<void> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);

    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const sheets = await this.getSheetsClient();

    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tabName)}!1:1`,
      majorDimension: "ROWS",
    });

    const headers = (headerResp.data.values?.[0] || []).map((h) => normalizeStr(h));
    const colIdx = headers.indexOf(colHeader);
    if (colIdx === -1) throw new Error(`Column "${colHeader}" not found in sheet "${tabName}"`);

    const colA1 = columnToA1(colIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tabName)}!${colA1}${rowNumber1based}`,
      valueInputOption: "RAW",
      requestBody: {values: [[value]]},
    });
  }

  /**
   * ✅ UPSERT by ID (primary key).
   * If ID not found:
   *   - optional fallback: if e-mail matches an existing row, update that row and set ID (migration)
   *   - else append new row
   *
   * opts.createOnlyColumns: kolumny ustawiane WYŁĄCZNIE przy tworzeniu nowego
   * wiersza; przy aktualizacji istniejącego wartość w arkuszu jest zachowywana.
   * Chroni decyzje admina (np. "Zatwierdzona"=TAK) przed nadpisaniem przez
   * ponowienie joba zapisu (retry po częściowej awarii).
   */
  async upsertMemberRowById(
    cfg: MembersSheetConfig,
    rowPatch: Record<string, any>,
    opts?: {
      createOnlyColumns?: string[];
      /**
       * Tolerancyjne dopasowanie kluczy patcha do nagłówków arkusza
       * (canonicalHeader: case/spacje/interpunkcja). Bez tej opcji rozjazd
       * nagłówka oznacza cicho pominiętą kolumnę.
       */
      looseHeaders?: boolean;
    }
  ): Promise<UpsertResult> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);

    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const sheets = await this.getSheetsClient();

    // 1) read header row
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tabName)}!1:1`,
      majorDimension: "ROWS",
    });

    const headers = (headerResp.data.values?.[0] || []).map((h) => normalizeStr(h));
    if (!headers.length) {
      throw new Error(`Sheet "${tabName}" has no header row`);
    }

    const headerIndex = new Map<string, number>();
    headers.forEach((h, i) => headerIndex.set(h, i));

    // Tolerancyjne dopasowanie: zmapuj klucze patcha i createOnlyColumns na
    // FAKTYCZNE nagłówki arkusza (po kanonizacji), zanim trafią do budowy wiersza.
    let effectivePatch = rowPatch;
    let effectiveCreateOnly = opts?.createOnlyColumns;
    if (opts?.looseHeaders) {
      const byCanonical = new Map<string, string>();
      for (const h of headers) {
        const c = canonicalHeader(h);
        if (c && !byCanonical.has(c)) byCanonical.set(c, h);
      }
      effectivePatch = {};
      for (const [k, v] of Object.entries(rowPatch)) {
        effectivePatch[byCanonical.get(canonicalHeader(k)) ?? k] = v;
      }
      effectiveCreateOnly = (opts?.createOnlyColumns || []).map(
        (k) => byCanonical.get(canonicalHeader(k)) ?? k
      );
    }

    const idHeader = opts?.looseHeaders ?
      (headers.find((h) => canonicalHeader(h) === "id") ?? "ID") :
      "ID";
    if (!headerIndex.has(idHeader)) {
      throw new Error(`Header "ID" not found in sheet "${tabName}"`);
    }

    const idColIdx = headerIndex.get(idHeader) as number;
    const idColA1 = columnToA1(idColIdx);

    const targetId = normalizeStr(effectivePatch[idHeader]);
    if (!targetId) throw new Error("Missing \"ID\" in rowPatch");

    // helper to build full row values based on headers
    const buildRowValues = (existingRow: string[] | null): string[] =>
      buildRowValuesForUpsert({
        headers,
        existingRow,
        rowPatch: effectivePatch,
        createOnlyColumns: effectiveCreateOnly,
      });

    // 2) find row by ID
    const idColResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tabName)}!${idColA1}2:${idColA1}`,
      majorDimension: "COLUMNS",
    });

    const idValues = (idColResp.data.values?.[0] || []).map((v) => normalizeStr(v));

    let foundRowNumber = -1; // 1-based in sheet
    for (let i = 0; i < idValues.length; i++) {
      if (idValues[i] === targetId) {
        foundRowNumber = 2 + i;
        break;
      }
    }

    if (foundRowNumber > 0) {
      // 3A) update existing row (preserve other columns)
      const rowResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${quoteTab(tabName)}!${foundRowNumber}:${foundRowNumber}`,
        majorDimension: "ROWS",
      });

      const existingRow = (rowResp.data.values?.[0] || []).map((v) => normalizeStr(v));
      const newRow = buildRowValues(existingRow);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${quoteTab(tabName)}!${foundRowNumber}:${foundRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {values: [newRow]},
      });

      return {action: "updated", rowNumber: foundRowNumber};
    }

    // 3B) fallback: try find by e-mail (migration path)
    const emailHeader = "e-mail";
    const targetEmail = normalizeStr(effectivePatch[emailHeader]).toLowerCase();

    if (targetEmail && headerIndex.has(emailHeader)) {
      const emailColIdx = headerIndex.get(emailHeader) as number;
      const emailColA1 = columnToA1(emailColIdx);

      const emailColResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${quoteTab(tabName)}!${emailColA1}2:${emailColA1}`,
        majorDimension: "COLUMNS",
      });

      const emailValues = (emailColResp.data.values?.[0] || []).map((v) => normalizeStr(v).toLowerCase());

      let emailRowNumber = -1;
      for (let i = 0; i < emailValues.length; i++) {
        if (emailValues[i] === targetEmail) {
          emailRowNumber = 2 + i;
          break;
        }
      }

      if (emailRowNumber > 0) {
        // update that row AND set ID to prevent duplicates later
        const rowResp = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${quoteTab(tabName)}!${emailRowNumber}:${emailRowNumber}`,
          majorDimension: "ROWS",
        });

        const existingRow = (rowResp.data.values?.[0] || []).map((v) => normalizeStr(v));
        const newRow = buildRowValues(existingRow);

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${quoteTab(tabName)}!${emailRowNumber}:${emailRowNumber}`,
          valueInputOption: "RAW",
          requestBody: {values: [newRow]},
        });

        return {action: "updated", rowNumber: emailRowNumber};
      }
    }

    // 3C) append new row
    // Nie używamy values.append — wykrywa zasięg tabeli na podstawie formatowania,
    // co powoduje pominięcie pustych (ale sformatowanych) wierszy i zapis w złym miejscu.
    // Zamiast tego: czytamy rzeczywistą zawartość i piszemy dokładnie do pierwszego wolnego wiersza.
    const bodyResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTab(tabName)}!A2:ZZ`,
      majorDimension: "ROWS",
    });

    const bodyRows = bodyResp.data.values || [];
    // Szukamy PIERWSZEGO wolnego wiersza. API zwraca wiersze od wiersza 2 do
    // ostatniego niepustego — puste wiersze pomiędzy danymi są zwrócone jako [].
    // Artefakty niezaznaczonych checkboxów (FALSE/FAŁSZ) traktujemy jak puste
    // komórki — patrz findFirstEmptySlotIndex.
    const firstEmptyIdx = findFirstEmptySlotIndex(bodyRows as any[][]);
    // bodyRows[0] odpowiada wierszowi 2 arkusza
    const newRowNumber = 2 + firstEmptyIdx;
    const newRow = buildRowValues(null);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteTab(tabName)}!${newRowNumber}:${newRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {values: [newRow]},
    });

    return {action: "appended", rowNumber: newRowNumber};
  }

  async upsertMemberRowByEmail(
    _cfg: MembersSheetConfig,
    _rowPatch: Record<string, any>
  ): Promise<UpsertResult> {
    throw new Error("upsertMemberRowByEmail is deprecated. Provide \"ID\" and use upsertMemberRowById.");
  }
}
