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
  rows: Record<string, string>[];
};

export class GoogleSheetsProvider {
  constructor(private delegatedUserEmail: string) {}

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = await getDelegatedAuth([SHEETS_SCOPES.SPREADSHEETS], this.delegatedUserEmail);
    return google.sheets({version: "v4", auth});
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
    const range = rangeA1 ? `${tabName}!${rangeA1}` : `${tabName}`;
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

      if (any) rows.push(obj);
    }

    return {headers, rows};
  }

  /**
   * ✅ UPSERT by ID (primary key).
   * If ID not found:
   *   - optional fallback: if e-mail matches an existing row, update that row and set ID (migration)
   *   - else append new row
   */
  async upsertMemberRowById(
    cfg: MembersSheetConfig,
    rowPatch: Record<string, any>
  ): Promise<UpsertResult> {
    const spreadsheetId = normalizeStr(cfg.spreadsheetId);
    const tabName = normalizeStr(cfg.tabName);

    assertNonEmpty("spreadsheetId", spreadsheetId);
    assertNonEmpty("tabName", tabName);

    const sheets = await this.getSheetsClient();

    // 1) read header row
    const headerResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!1:1`,
      majorDimension: "ROWS",
    });

    const headers = (headerResp.data.values?.[0] || []).map((h) => normalizeStr(h));
    if (!headers.length) {
      throw new Error(`Sheet "${tabName}" has no header row`);
    }

    const headerIndex = new Map<string, number>();
    headers.forEach((h, i) => headerIndex.set(h, i));

    const idHeader = "ID";
    if (!headerIndex.has(idHeader)) {
      throw new Error(`Header "${idHeader}" not found in sheet "${tabName}"`);
    }

    const idColIdx = headerIndex.get(idHeader) as number;
    const idColA1 = columnToA1(idColIdx);

    const targetId = normalizeStr(rowPatch[idHeader]);
    if (!targetId) throw new Error("Missing \"ID\" in rowPatch");

    // helper to build full row values based on headers
    const buildRowValues = (existingRow: string[] | null): string[] => {
      const out = new Array(headers.length).fill("");
      if (existingRow) {
        for (let i = 0; i < Math.min(existingRow.length, out.length); i++) out[i] = normalizeStr(existingRow[i]);
      }

      for (const [k, v] of Object.entries(rowPatch)) {
        if (!headerIndex.has(k)) continue;
        const idx = headerIndex.get(k) as number;
        out[idx] = normalizeStr(v);
      }
      return out;
    };

    // 2) find row by ID
    const idColResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!${idColA1}2:${idColA1}`,
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
        range: `${tabName}!${foundRowNumber}:${foundRowNumber}`,
        majorDimension: "ROWS",
      });

      const existingRow = (rowResp.data.values?.[0] || []).map((v) => normalizeStr(v));
      const newRow = buildRowValues(existingRow);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!${foundRowNumber}:${foundRowNumber}`,
        valueInputOption: "RAW",
        requestBody: {values: [newRow]},
      });

      return {action: "updated", rowNumber: foundRowNumber};
    }

    // 3B) fallback: try find by e-mail (migration path)
    const emailHeader = "e-mail";
    const targetEmail = normalizeStr(rowPatch[emailHeader]).toLowerCase();

    if (targetEmail && headerIndex.has(emailHeader)) {
      const emailColIdx = headerIndex.get(emailHeader) as number;
      const emailColA1 = columnToA1(emailColIdx);

      const emailColResp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!${emailColA1}2:${emailColA1}`,
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
          range: `${tabName}!${emailRowNumber}:${emailRowNumber}`,
          majorDimension: "ROWS",
        });

        const existingRow = (rowResp.data.values?.[0] || []).map((v) => normalizeStr(v));
        const newRow = buildRowValues(existingRow);

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!${emailRowNumber}:${emailRowNumber}`,
          valueInputOption: "RAW",
          requestBody: {values: [newRow]},
        });

        return {action: "updated", rowNumber: emailRowNumber};
      }
    }

    // 3C) append new row
    const newRow = buildRowValues(null);

    const appendResp = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:ZZ`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {values: [newRow]},
    });

    // best effort parse row number from updates
    const updatedRange = appendResp.data.updates?.updatedRange || "";
    // example: 'TAB!A123:Q123'
    const m = /!A(\d+):/i.exec(updatedRange);
    const rowNumber = m ? Number(m[1]) : (2 + idValues.length);

    return {action: "appended", rowNumber};
  }

  async upsertMemberRowByEmail(
    _cfg: MembersSheetConfig,
    _rowPatch: Record<string, any>
  ): Promise<UpsertResult> {
    throw new Error("upsertMemberRowByEmail is deprecated. Provide \"ID\" and use upsertMemberRowById.");
  }
}
