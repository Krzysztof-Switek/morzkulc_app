import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: setup.syncFromSheet
 *
 * Jedyne źródło: arkusz "App_SETUP" (jeden spreadsheetId, `cfg.setup.spreadsheetId`).
 * Czyta 6 zakładek tego JEDNEGO arkusza:
 *   - App_SETUP       → modules + roleMappings (role→grupy Workspace, kolumna Grupy_workspace)
 *   - Vars_CZLONKOWIE → setup/vars_members
 *   - Vars_SPRZET     → setup/vars_gear
 *   - Vars_BASEN      → setup/vars_basen
 *   - Vars_GODZINKI   → setup/vars_godzinki
 *   - Vars_KURS       → setup/vars_kurs
 * i zapisuje:
 *   - setup/app: { modules, roleMappings, statusMappings, updatedAt, updatedBy } — przez UPDATE,
 *     żeby NIE skasować innych pól (np. defaults używanych przy rejestracji).
 *   - setup/vars_members, vars_gear, vars_basen, vars_godzinki, vars_kurs — przez SET.
 * Na koniec kolejkuje users.syncFunctionRolesFromSetup (jak dawniej).
 *
 * roleMappings pochodzi TERAZ z arkusza (wiersze Typ_elementu="rola", kolumna
 * Grupy_workspace) — nie jest już hardkodowany w kodzie (patrz plan
 * "Pełne przełączenie na arkusz App_SETUP", Faza 1/5).
 *
 * statusMappings ZOSTAJE hardkodowany w kodzie (świadoma decyzja): wiersze
 * Typ_elementu="status" w arkuszu dziś nie odpowiadają kanonicznym kluczom statusu
 * używanym w całym projekcie (`status_zawieszony`, `status_pending` — arkusz miał m.in.
 * `status_skreslony`, którego nigdzie indziej nie ma) — status_key jest zapisywany w
 * dokumencie KAŻDEGO użytkownika i czytany w dziesiątkach plików, więc migracja tego
 * konkretnego mapowania na arkusz wymaga osobnego uporządkowania, nie tej zmiany.
 */

const TAB_APP = "App_SETUP";
const TAB_VARS_CZLONKOWIE = "Vars_CZLONKOWIE";
const TAB_VARS_SPRZET = "Vars_SPRZET";
const TAB_VARS_BASEN = "Vars_BASEN";
const TAB_VARS_GODZINKI = "Vars_GODZINKI";
const TAB_VARS_KURS = "Vars_KURS";

// Mapowanie statusów kont — blocksAccess: true blokuje dostęp (np. konto zawieszone).
// Zostaje w kodzie — patrz uzasadnienie w komentarzu nagłówkowym pliku.
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
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    // Konwertuj na number TYLKO gdy nie tracimy precyzji (round-trip String(n) === s).
    // Długie identyfikatory (numer konta NRB, PESEL, telefon z zerem wiodącym)
    // przekraczają bezpieczny zakres liczb i muszą zostać stringiem.
    if (Number.isFinite(n) && String(n) === s) return {type: "number", value: n};
    return {type: "string", value: s};
  }
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
  const table = await sheets.readTableAsObjects({spreadsheetId, tabName: TAB_APP});
  const hmap = headerMap(table.headers);

  const required = [
    "typ_elementu", "id_elementu", "nazwa_wyswietlana", "aktywny", "ekran_domyslny",
    "kolejnosc", "dostep_zarzad_i_kr", "dostep_czlonek", "dostep_kandydat",
    "dostep_sympatyk", "dostep_kursant", "dostep_testowy_dla", "blokuj_dla", "opis",
  ];
  const missing = required.filter((h) => !(h in hmap));
  if (missing.length) {
    throw new Error(`App_SETUP headers mismatch. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
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

/**
 * Czyta wiersze Typ_elementu="rola" z App_SETUP i buduje mapowanie ról→grupy Workspace
 * z kolumny "Grupy_workspace" (lista rozdzielona przecinkiem/średnikiem).
 * Zastępuje dawny hardkodowany ROLE_MAPPINGS.
 */
async function readAppSetupRoles(
  sheets: GoogleSheetsProvider,
  spreadsheetId: string
): Promise<Record<string, {label: string; groups: string[]}>> {
  const table = await sheets.readTableAsObjects({spreadsheetId, tabName: TAB_APP});
  const hmap = headerMap(table.headers);

  const required = ["typ_elementu", "id_elementu", "nazwa_wyswietlana", "grupy_workspace"];
  const missing = required.filter((h) => !(h in hmap));
  if (missing.length) {
    throw new Error(`App_SETUP (role) headers mismatch. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
  }

  const g = (row: Record<string, string>, normKey: string): string => norm(row[hmap[normKey]] ?? "");

  const roles: Record<string, {label: string; groups: string[]}> = {};
  for (const row of table.rows) {
    const typ = g(row, "typ_elementu").toLowerCase();
    if (typ !== "rola") continue;

    const id = g(row, "id_elementu");
    if (!id) continue;

    const label = g(row, "nazwa_wyswietlana") || id;
    const groups = splitList(g(row, "grupy_workspace"));

    roles[id] = {label, groups};
  }

  return roles;
}

async function readSetupVars(
  sheets: GoogleSheetsProvider,
  spreadsheetId: string,
  tabName: string
): Promise<Record<string, any>> {
  const table = await sheets.readTableAsObjects({spreadsheetId, tabName});
  const hmap = headerMap(table.headers);

  const required = ["zmienna_nazwa", "wartosc_zmiennej", "grupa_zmiennych", "opis"];
  const missing = required.filter((h) => !(h in hmap));
  if (missing.length) {
    throw new Error(`${tabName} headers mismatch in ${spreadsheetId}. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
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
  description: "Sync setup z arkusza App_SETUP (6 zakładek, jedno źródło) do Firestore: modules+roleMappings, vars_members, vars_gear, vars_basen, vars_godzinki, vars_kurs; kolejkuje users.syncFunctionRolesFromSetup.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, logger} = ctx;
    const cfg = getServiceConfig();
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const who = norm(payload?.requestedBy).toLowerCase();

    const spreadsheetId = cfg.setup.spreadsheetId;

    logger.info("setupSyncFromSheet: start", {spreadsheetId, dryRun, who});

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);

    const modules = await readAppSetupModules(sheets, spreadsheetId);
    const roleMappings = await readAppSetupRoles(sheets, spreadsheetId);
    const membersVars = await readSetupVars(sheets, spreadsheetId, TAB_VARS_CZLONKOWIE);
    const gearVars = await readSetupVars(sheets, spreadsheetId, TAB_VARS_SPRZET);
    const basenVars = await readSetupVars(sheets, spreadsheetId, TAB_VARS_BASEN);
    const godzinkiVars = await readSetupVars(sheets, spreadsheetId, TAB_VARS_GODZINKI);
    const kursVars = await readSetupVars(sheets, spreadsheetId, TAB_VARS_KURS);

    const nowIso = new Date().toISOString();

    if (dryRun) {
      logger.info("setupSyncFromSheet: [DRY RUN] parsed", {
        modules: Object.keys(modules).length,
        roles: Object.keys(roleMappings).length,
        membersVars: Object.keys(membersVars).length,
        gearVars: Object.keys(gearVars).length,
        basenVars: Object.keys(basenVars).length,
        godzinkiVars: Object.keys(godzinkiVars).length,
        kursVars: Object.keys(kursVars).length,
      });
      return {
        ok: true,
        message: `DRYRUN: modules=${Object.keys(modules).length}, roles=${Object.keys(roleMappings).length}, vars_members=${Object.keys(membersVars).length}, vars_gear=${Object.keys(gearVars).length}, vars_basen=${Object.keys(basenVars).length}, vars_godzinki=${Object.keys(godzinkiVars).length}, vars_kurs=${Object.keys(kursVars).length}`,
        details: {modules: Object.keys(modules), roleMappings: Object.keys(roleMappings)},
      };
    }

    // setup/app: UPDATE (zachowuje defaults i inne pola; zastępuje modules/roleMappings/statusMappings)
    await firestore.collection("setup").doc("app").update({
      modules,
      roleMappings,
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

    await firestore.collection("setup").doc("vars_basen").set({
      vars: basenVars,
      updatedAt: nowIso,
      updatedBy: who,
    });

    await firestore.collection("setup").doc("vars_godzinki").set({
      vars: godzinkiVars,
      updatedAt: nowIso,
      updatedBy: who,
    });

    await firestore.collection("setup").doc("vars_kurs").set({
      vars: kursVars,
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

    logger.info("setupSyncFromSheet: done", {modules: Object.keys(modules).length, roles: Object.keys(roleMappings).length});

    return {
      ok: true,
      message: `Setup synced: modules=${Object.keys(modules).length}, roles=${Object.keys(roleMappings).length}, vars_members=${Object.keys(membersVars).length}, vars_gear=${Object.keys(gearVars).length}, vars_basen=${Object.keys(basenVars).length}, vars_godzinki=${Object.keys(godzinkiVars).length}, vars_kurs=${Object.keys(kursVars).length}`,
      details: {
        modules: Object.keys(modules).length,
        roles: Object.keys(roleMappings).length,
        varsMembers: Object.keys(membersVars).length,
        varsGear: Object.keys(gearVars).length,
        varsBasen: Object.keys(basenVars).length,
        varsGodzinki: Object.keys(godzinkiVars).length,
        varsKurs: Object.keys(kursVars).length,
      },
    };
  },
};
