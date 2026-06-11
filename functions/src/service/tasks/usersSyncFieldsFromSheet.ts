import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {getServiceConfig} from "../service_config";

/**
 * Task: users.syncFieldsFromSheet
 *
 * Port appscriptowego syncUsersToFirestore() w części „pola" (NIE role/status — te robi users.syncRolesFromSheet).
 * Czyta zakładkę members, znajduje users_active po memberId (== kolumna ID),
 * patchuje TYLKO zmienione pola: email, profile.*, admin.*.
 * Jeśli wykryje zmianę roli/statusu (po stronie arkusza) → kolejkuje users.syncRolesFromSheet.
 */

type Payload = {
  dry?: boolean;
  requestedBy?: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

function normalizeHeader(h: string): string {
  return String(h == null ? "" : h).trim().toLowerCase()
    .split(" ").join("_").split("-").join("_")
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ż/g, "z").replace(/ź/g, "z")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeBoolish(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = norm(v).toLowerCase();
  if (!s) return false;
  if (s === "true" || s === "tak" || s === "yes" || s === "1") return true;
  return false;
}

function normalizeDateString(v: any): string {
  const s = norm(v);
  if (!s) return "";
  // DD.MM.YYYY → YYYY-MM-DD (FORMATTED_VALUE z arkusza)
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function mapRoleDisplayToKey(label: string): string {
  const s = norm(label).toLowerCase();
  if (s === "zarząd" || s === "zarzad") return "rola_zarzad";
  if (s === "kr") return "rola_kr";
  if (s === "członek" || s === "czlonek") return "rola_czlonek";
  if (s === "kandydat") return "rola_kandydat";
  if (s === "sympatyk") return "rola_sympatyk";
  if (s === "kursant") return "rola_kursant";
  return "";
}

function mapStatusDisplayToKey(label: string): string {
  const s = norm(label).toLowerCase();
  if (s === "aktywny") return "status_aktywny";
  if (s === "zawieszony") return "status_zawieszony";
  if (s === "skreślony" || s === "skreslony") return "status_skreslony";
  if (s === "oczekujący" || s === "oczekujacy") return "status_pending";
  return "";
}

function headerMap(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const raw of headers) m[normalizeHeader(raw)] = raw;
  return m;
}

function getPath(obj: any, path: string): any {
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function valuesEqual(next: any, current: any): boolean {
  if (typeof next === "boolean" || typeof current === "boolean") {
    return Boolean(next) === Boolean(current);
  }
  const a = next === null || next === undefined ? "" : String(next).trim();
  const b = current === null || current === undefined ? "" : String(current).trim();
  return a === b;
}

export const usersSyncFieldsFromSheetTask: ServiceTask<Payload> = {
  id: "users.syncFieldsFromSheet",
  description: "Sync pól profilu/admin z arkusza members → users_active (po memberId). Nie rusza roli/statusu; kolejkuje users.syncRolesFromSheet przy ich zmianie.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, logger} = ctx;
    const cfg = getServiceConfig();
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const who = norm(payload?.requestedBy).toLowerCase();

    const spreadsheetId = cfg.sheets.membersSpreadsheetId;
    const tabName = cfg.sheets.membersTabName;

    logger.info("usersSyncFieldsFromSheet: start", {spreadsheetId, tabName, dryRun, who});

    const sheets = new GoogleSheetsProvider(cfg.workspace.delegatedSubject);
    const table = await sheets.readTableAsObjects({spreadsheetId, tabName});
    const hmap = headerMap(table.headers);

    const required = [
      "id", "ksywa", "imie", "nazwisko", "telefon", "e_mail", "data_urodzenia",
      "rok_szkoleniowki", "wpisowe_rok", "klucze_do_siedziby", "rola", "status",
      "blacha", "uwagi", "zgody_rodo", "skladki", "godzinki",
    ];
    const missing = required.filter((h) => !(h in hmap));
    if (missing.length) {
      throw new Error(`Users sheet headers mismatch. Missing: ${JSON.stringify(missing)} Found: ${JSON.stringify(Object.keys(hmap))}`);
    }
    const g = (row: Record<string, string>, normKey: string): string => norm(row[hmap[normKey]] ?? "");

    let found = 0;
    let patched = 0;
    let unchanged = 0;
    let notFound = 0;
    let skipped = 0;
    let roleStatusChanged = 0;
    const now = new Date().toISOString();

    for (const row of table.rows) {
      const memberIdRaw = g(row, "id");
      if (!memberIdRaw) {
        skipped++;
        continue;
      }
      const memberId = Number(memberIdRaw);
      if (!isFinite(memberId)) {
        logger.warn("usersSyncFieldsFromSheet: invalid memberId — skip", {memberIdRaw});
        skipped++;
        continue;
      }

      const roleKey = mapRoleDisplayToKey(g(row, "rola"));
      const statusKey = mapStatusDisplayToKey(g(row, "status"));
      if (!roleKey || !statusKey) {
        logger.warn("usersSyncFieldsFromSheet: unknown role/status — skip row", {memberId, rola: g(row, "rola"), status: g(row, "status")});
        skipped++;
        continue;
      }

      const sheetUser = {
        email: g(row, "e_mail").toLowerCase(),
        profile: {
          nickname: g(row, "ksywa"),
          firstName: g(row, "imie"),
          lastName: g(row, "nazwisko"),
          phone: g(row, "telefon"),
          dateOfBirth: normalizeDateString(g(row, "data_urodzenia")),
          consentRodo: normalizeBoolish(g(row, "zgody_rodo")),
        },
        admin: {
          schoolYear: g(row, "rok_szkoleniowki"),
          entryFeeYear: g(row, "wpisowe_rok"),
          hasClubKeys: normalizeBoolish(g(row, "klucze_do_siedziby")),
          badge: g(row, "blacha"),
          notes: g(row, "uwagi"),
          contributions: g(row, "skladki"),
          hours: g(row, "godzinki"),
        },
      };

      const snap = await firestore.collection("users_active").where("memberId", "==", memberId).limit(1).get();
      if (snap.empty) {
        notFound++;
        continue;
      }
      found++;
      const doc = snap.docs[0];
      const data = doc.data() as any;

      // Diff pól (bez role_key/status_key)
      const candidates: Array<[string, any]> = [
        ["email", sheetUser.email],
        ["profile.nickname", sheetUser.profile.nickname],
        ["profile.firstName", sheetUser.profile.firstName],
        ["profile.lastName", sheetUser.profile.lastName],
        ["profile.phone", sheetUser.profile.phone],
        ["profile.dateOfBirth", sheetUser.profile.dateOfBirth],
        ["profile.consentRodo", sheetUser.profile.consentRodo],
        ["admin.schoolYear", sheetUser.admin.schoolYear],
        ["admin.entryFeeYear", sheetUser.admin.entryFeeYear],
        ["admin.hasClubKeys", sheetUser.admin.hasClubKeys],
        ["admin.badge", sheetUser.admin.badge],
        ["admin.notes", sheetUser.admin.notes],
        ["admin.contributions", sheetUser.admin.contributions],
        ["admin.hours", sheetUser.admin.hours],
      ];

      const patch: Record<string, any> = {};
      for (const [path, nextVal] of candidates) {
        if (!valuesEqual(nextVal, getPath(data, path))) {
          patch[path] = nextVal;
        }
      }

      // Wykryj zmianę roli/statusu (faktyczny sync robi users.syncRolesFromSheet)
      const roleChanged = roleKey !== norm(data?.role_key);
      const statusChanged = statusKey !== norm(data?.status_key);
      if (roleChanged || statusChanged) roleStatusChanged++;

      const changedPaths = Object.keys(patch);
      if (!changedPaths.length) {
        unchanged++;
        continue;
      }

      if (dryRun) {
        logger.info("usersSyncFieldsFromSheet: [DRY RUN] would patch", {memberId, changedPaths});
        patched++;
        continue;
      }

      patch.updatedAt = now;
      patch.updatedBy = who;
      await doc.ref.update(patch);
      patched++;
      logger.info("usersSyncFieldsFromSheet: patched", {memberId, changedPaths});
    }

    // Zmiana roli/statusu → wyzwól sync ról (rekonsyliacja grup itd.)
    if (roleStatusChanged > 0 && !dryRun) {
      const jobId = `users-role-sync:${Date.now()}`;
      await firestore.collection("service_jobs").doc(jobId).set({
        id: jobId,
        taskId: "users.syncRolesFromSheet",
        payload: {},
        status: "queued",
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("usersSyncFieldsFromSheet: enqueued users.syncRolesFromSheet", {roleStatusChanged});
    }

    const details = {found, patched, unchanged, notFound, skipped, roleStatusChanged, dryRun};
    logger.info("usersSyncFieldsFromSheet: done", details);

    return {
      ok: true,
      message: `Users fields synced: found=${found}, patched=${patched}, unchanged=${unchanged}, notFound=${notFound}, skipped=${skipped}, roleStatusChanged=${roleStatusChanged}`,
      details,
    };
  },
};
