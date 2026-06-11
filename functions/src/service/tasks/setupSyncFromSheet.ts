import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: setup.syncFromSheet
 *
 * Port appscriptowego syncSetupToFirestore(). Czyta:
 *   - zakładkę APP_SETUP (arkusz members) → modules
 *   - zakładkę SETUP (arkusz members)     → setup/vars_members
 *   - zakładkę SETUP (arkusz gear)        → setup/vars_gear
 * i zapisuje:
 *   - setup/app: { modules, roleMappings, statusMappings, updatedAt, updatedBy } — przez UPDATE,
 *     żeby NIE skasować innych pól (np. defaults używanych przy rejestracji).
 *   - setup/vars_members, setup/vars_gear: { vars, updatedAt, updatedBy }
 * Na koniec kolejkuje users.syncFunctionRolesFromSetup (jak appscript).
 *
 * ROLE_MAPPINGS / STATUS_MAPPINGS są od teraz utrzymywane TUTAJ (przeniesione z Apps Script).
 */

const TAB_APP_SETUP = "APP_SETUP";
const TAB_SETUP = "SETUP";

// Mapowanie ról na grupy Google Workspace (źródło prawdy przeniesione z Apps Script).
const ROLE_MAPPINGS: Record<string, {label: string; groups: string[]}> = {
  rola_czlonek: {label: "Członek", groups: ["czlonkowie@morzkulc.pl"]},
  rola_zarzad: {label: "Zarząd", groups: ["zarzad_skk@morzkulc.pl", "zarzad@morzkulc.pl", "czlonkowie@morzkulc.pl"]},
  rola_kr: {label: "KR", groups: ["kr@morzkulc.pl", "zarzad@morzkulc.pl", "czlonkowie@morzkulc.pl"]},
  rola_kandydat: {label: "Kandydat", groups: ["kandydaci@morzkulc.pl"]},
  rola_sympatyk: {label: "Sympatyk", groups: ["sympatycy@morzkulc.pl"]},
  rola_kursant: {label: "Kursant", groups: []},
};

const STATUS_MAPPINGS: Record<string, {label: string; blocksAccess: boolean}> = {
  status_aktywny: {label: "Aktywny", blocksAccess: false},
  status_zawieszony: {label: "Zawieszony", blocksAccess: true},
  status_pending: {label: "Oczekujący", blocksAccess: false},
};

type Payload = {
  dry?: boolean;
  requestedBy?: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

function toBool(v: any): boolean {
  const s = norm(v).toLowerCase();
  return s === "true" || s === "tak" || s === "1" || s === "yes";
}

function toNumberOrNull(v: any): number | null {
  const s = norm(v);
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

// Mirror appscript normalizeHeader_ — lowercase, underscores, strip PL diacritics.
function normalizeHeader(h: string): string {
  return String(h == null ? "" : h).trim().toLowerCase()
    .split(" ").join("_").split("-").join("_")
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ż/g, "z").replace(/ź/g, "z")
    .replace(/[^a-z0-9_]/g, "");
}

function splitList(s: string): string[] {
  const raw = norm(s);
  if (!raw) return [];
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]/g).map((x) => norm(x)).filter(Boolean)) {
    const key = part.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(part);
  }
  return out;
}

function rolesAllowedFromFlags(flags: {zarzadKr: boolean; czlonek: boolean; kandydat: boolean; sympatyk: boolean; kursant: boolean}): string[] {
  const out: string[] = [];
  if (flags.zarzadKr) {
    out.push("rola_zarzad");
    out.push("rola_kr");
  }
  if (flags.czlonek) out.push("rola_czlonek");
  if (flags.kandydat) out.push("rola_kandydat");
  if (flags.sympatyk) out.push("rola_sympatyk");
  if (flags.kursant) out.push("rola_kursant");
  return out;
}

function parseSetupValue(raw: string): {type: string; value: any} {
  const s = norm(raw);
  if (!s) return {type: "string", value: ""};
  const low = s.toLowerCase();
  if (low === "true" || low === "false") return {type: "boolean", value: low === "true"};
  if (/^-?\d+(\.\d+)?$/.test(s)) return {type: "number", value: Number(s)};
  return {type: "string", value: s};
}

/** Build a normalized-header → raw-header map for a table. */
function headerMap(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const raw of headers) m[normalizeHeader(raw)] = raw;
  return m;
}

async function readAppSetupModules(
  sheets: GoogleSheetsProvider,
  spreadsheetId: string
): Promise<Record<string, any>> {
  const table = await sheets.readTableAsObjects({spreadsheetId, tabName: TAB_APP_SETUP});
  const hmap = headerMap(table.headers);

  const required = [
    "typ_elementu", "id_elementu", "nazwa_wyswietlana", "aktywny", "ekran_domyslny",
    "kolejnosc", "dostep_zarzad_i_kr", "dostep_czlonek", "dostep_kandydat",
    "dostep_sympatyk", "dostep_kursant", "dostep_testowy_dla", "blokuj_dla", "opis",
  ];
  const missing = required.filter((h) => !(h in hmap));
  if (missing.length) {
    throw new Error(`APP_SETUP headers mismatch. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
  }

  const g = (row: Record<string, string>, normKey: string): string => norm(row[hmap[normKey]] ?? "");

  const modules: Record<string, any> = {};
  for (const row of table.rows) {
    const typ = g(row, "typ_elementu").toLowerCase();
    if (typ !== "moduł") continue;

    const id = g(row, "id_elementu");
    if (!id) continue;

    const label = g(row, "nazwa_wyswietlana");
    const defaultRoute = g(row, "ekran_domyslny");
    const enabled = toBool(g(row, "aktywny"));
    const orderN = toNumberOrNull(g(row, "kolejnosc"));

    const accessRoles = rolesAllowedFromFlags({
      zarzadKr: toBool(g(row, "dostep_zarzad_i_kr")),
      czlonek: toBool(g(row, "dostep_czlonek")),
      kandydat: toBool(g(row, "dostep_kandydat")),
      sympatyk: toBool(g(row, "dostep_sympatyk")),
      kursant: toBool(g(row, "dostep_kursant")),
    });

    const testUsersAllow = splitList(g(row, "dostep_testowy_dla"));
    const usersBlock = splitList(g(row, "blokuj_dla"));

    let mode = "off";
    if (enabled) mode = testUsersAllow.length ? "test" : "prod";

    const access: any = {mode};
    if (accessRoles.length) access.rolesAllowed = accessRoles;
    if (testUsersAllow.length) access.testUsersAllow = testUsersAllow;
    if (usersBlock.length) access.usersBlock = usersBlock;

    const cfg: any = {label: label || id, enabled, access};
    if (defaultRoute) cfg.defaultRoute = defaultRoute;
    if (orderN !== null) cfg.order = orderN;

    modules[id] = cfg;
  }

  return modules;
}

async function readSetupVars(
  sheets: GoogleSheetsProvider,
  spreadsheetId: string
): Promise<Record<string, any>> {
  const table = await sheets.readTableAsObjects({spreadsheetId, tabName: TAB_SETUP});
  const hmap = headerMap(table.headers);

  const required = ["zmienna_nazwa", "wartosc_zmiennej", "grupa_zmiennych", "opis"];
  const missing = required.filter((h) => !(h in hmap));
  if (missing.length) {
    throw new Error(`SETUP headers mismatch in ${spreadsheetId}. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
  }

  const g = (row: Record<string, string>, normKey: string): string => norm(row[hmap[normKey]] ?? "");

  const out: Record<string, any> = {};
  for (const row of table.rows) {
    const name = g(row, "zmienna_nazwa");
    if (!name) continue;
    const parsed = parseSetupValue(g(row, "wartosc_zmiennej"));
    out[name] = {
      type: parsed.type,
      value: parsed.value,
      group: g(row, "grupa_zmiennych") || "",
      description: g(row, "opis") || "",
    };
  }
  return out;
}

export const setupSyncFromSheetTask: ServiceTask<Payload> = {
  id: "setup.syncFromSheet",
  description: "Sync setup z arkusza do Firestore: APP_SETUP→modules, SETUP→vars, + roleMappings/statusMappings; kolejkuje users.syncFunctionRolesFromSetup.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, logger} = ctx;
    const cfg = getServiceConfig();
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const who = norm(payload?.requestedBy).toLowerCase();

    const membersSheetId = cfg.sheets.membersSpreadsheetId;
    const gearSheetId = cfg.gear.kayaksSpreadsheetId;

    logger.info("setupSyncFromSheet: start", {membersSheetId, gearSheetId, dryRun, who});

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);

    const modules = await readAppSetupModules(sheets, membersSheetId);
    const membersVars = await readSetupVars(sheets, membersSheetId);
    const gearVars = await readSetupVars(sheets, gearSheetId);

    const nowIso = new Date().toISOString();

    if (dryRun) {
      logger.info("setupSyncFromSheet: [DRY RUN] parsed", {
        modules: Object.keys(modules).length,
        membersVars: Object.keys(membersVars).length,
        gearVars: Object.keys(gearVars).length,
      });
      return {
        ok: true,
        message: `DRYRUN: modules=${Object.keys(modules).length}, vars_members=${Object.keys(membersVars).length}, vars_gear=${Object.keys(gearVars).length}`,
        details: {modules: Object.keys(modules), roleMappings: Object.keys(ROLE_MAPPINGS)},
      };
    }

    // setup/app: UPDATE (zachowuje defaults i inne pola; zastępuje modules/roleMappings/statusMappings)
    await firestore.collection("setup").doc("app").update({
      modules,
      roleMappings: ROLE_MAPPINGS,
      statusMappings: STATUS_MAPPINGS,
      updatedAt: nowIso,
      updatedBy: who,
    });

    await firestore.collection("setup").doc("vars_members").set({
      vars: membersVars,
      updatedAt: nowIso,
      updatedBy: who,
    });

    await firestore.collection("setup").doc("vars_gear").set({
      vars: gearVars,
      updatedAt: nowIso,
      updatedBy: who,
    });

    // Po sync setup wyzwól sync funkcyjnych ról (idempotentny no-op jeśli nic się nie zmieniło)
    const jobId = `setup-fn-roles:${Date.now()}`;
    await firestore.collection("service_jobs").doc(jobId).set({
      id: jobId,
      taskId: "users.syncFunctionRolesFromSetup",
      payload: {},
      status: "queued",
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("setupSyncFromSheet: done", {modules: Object.keys(modules).length});

    return {
      ok: true,
      message: `Setup synced: modules=${Object.keys(modules).length}, vars_members=${Object.keys(membersVars).length}, vars_gear=${Object.keys(gearVars).length}`,
      details: {modules: Object.keys(modules).length, varsMembers: Object.keys(membersVars).length, varsGear: Object.keys(gearVars).length},
    };
  },
};
