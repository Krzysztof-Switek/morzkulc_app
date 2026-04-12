import * as admin from "firebase-admin";
import {ServiceTask} from "../types";
import {GoogleSheetsProvider} from "../providers/googleSheetsProvider";
import {GoogleWorkspaceProvider} from "../providers/googleWorkspaceProvider";
import {getServiceConfig} from "../service_config";

type Payload = {
  dry?: boolean;
  limit?: number;
};

type RoleMappingEntry = {
  label?: string;
  groups?: string[];
};

function norm(v: any): string {
  return String(v || "").trim();
}

/**
 * Builds an inverted map: lowercase_label → code.
 *
 * Reads from setup mappings if available (Record<code, {label}>);
 * otherwise falls back to the provided built-in defaults.
 */
function buildInvertedLabelMap(
  mappings: Record<string, {label?: string}> | null | undefined,
  defaults: Record<string, string>
): Record<string, string> {
  if (!mappings || Object.keys(mappings).length === 0) {
    return {...defaults};
  }
  const out: Record<string, string> = {};
  for (const [code, val] of Object.entries(mappings)) {
    const label = norm(val?.label).toLowerCase();
    if (label) {
      out[label] = code;
    }
  }
  return out;
}

/**
 * Synchronizes Workspace group membership for a user after their role changes.
 *
 * Logic:
 *   - allManagedGroups = union of groups from all entries in roleMappings
 *   - targetGroups     = groups for the user's new role
 *   - For each managed group: add if in target, remove if not in target
 *
 * lista@ and other groups not listed in any roleMappings are never touched.
 * All operations are idempotent (add is no-op if already member, remove is no-op if not member).
 * Errors are thrown to the caller (caller decides whether to count as fatal).
 */
async function syncWorkspaceGroupsForUser(
  workspace: GoogleWorkspaceProvider,
  userEmail: string,
  newRoleKey: string,
  roleMappings: Record<string, RoleMappingEntry>,
  logger: {info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void},
  dryRun: boolean
): Promise<void> {
  // Zbuduj zestaw wszystkich grup zarządzanych przez ten system
  const allManagedGroups = new Set<string>();
  for (const entry of Object.values(roleMappings)) {
    for (const g of (entry.groups || [])) {
      const gNorm = norm(g).toLowerCase();
      if (gNorm && gNorm.includes("@")) {
        allManagedGroups.add(gNorm);
      }
    }
  }

  if (allManagedGroups.size === 0) {
    logger.info("syncWorkspaceGroups: no groups configured in roleMappings — skip", {userEmail});
    return;
  }

  // Docelowe grupy dla nowej roli
  const targetGroups = new Set<string>(
    (roleMappings[newRoleKey]?.groups || [])
      .map((g) => norm(g).toLowerCase())
      .filter((g) => g.includes("@"))
  );

  for (const groupEmail of allManagedGroups) {
    const shouldBeIn = targetGroups.has(groupEmail);

    if (dryRun) {
      logger.info("DRYRUN syncWorkspaceGroups", {
        userEmail,
        groupEmail,
        action: shouldBeIn ? "add" : "remove",
      });
      continue;
    }

    if (shouldBeIn) {
      try {
        const result = await workspace.addMemberToGroup(groupEmail, userEmail, "MEMBER");
        logger.info("syncWorkspaceGroups: addMember", {userEmail, groupEmail, result});
      } catch (e: any) {
        logger.error("syncWorkspaceGroups: addMember failed", {
          userEmail,
          groupEmail,
          message: e?.message,
          code: e?.code,
        });
        throw e;
      }
    } else {
      try {
        const result = await workspace.removeMemberFromGroup(groupEmail, userEmail);
        if (result === "removed") {
          logger.info("syncWorkspaceGroups: removeMember", {userEmail, groupEmail});
        }
      } catch (e: any) {
        logger.error("syncWorkspaceGroups: removeMember failed", {
          userEmail,
          groupEmail,
          message: e?.message,
          code: e?.code,
        });
        throw e;
      }
    }
  }
}

// Built-in fallbacks — must match roleLabel() and statusLabel() in index.ts.
// Override by setting setup/app.roleMappings and setup/app.statusMappings in Firestore.
const ROLE_LABEL_DEFAULTS: Record<string, string> = {
  "zarząd": "rola_zarzad",
  "kr": "rola_kr",
  "członek": "rola_czlonek",
  "kandydat": "rola_kandydat",
  "sympatyk": "rola_sympatyk",
  "kursant": "rola_kursant",
};

const STATUS_LABEL_DEFAULTS: Record<string, string> = {
  "aktywny": "status_aktywny",
  "zawieszony": "status_zawieszony",
  "skreślony": "status_skreslony",
};

export const usersSyncRolesFromSheetTask: ServiceTask<Payload> = {
  id: "users.syncRolesFromSheet",
  description: "Synchronizes role_key and status_key from the members Google Sheet to Firestore users_active. When role changes, also syncs Workspace group membership based on setup/app.roleMappings[roleKey].groups.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const cfg = getServiceConfig();
    const delegated = cfg.workspace.delegatedSubject;
    const spreadsheetId = cfg.sheets.membersSpreadsheetId;
    const tabName = cfg.sheets.membersTabName;

    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    ctx.logger.info("usersSyncRolesFromSheet: start", {spreadsheetId, tabName, dryRun});

    // Czytaj setup/app żeby zbudować odwrotne mapowania label → code
    const firestore = admin.firestore();
    const setupSnap = await firestore.collection("setup").doc("app").get();
    const setupData = (setupSnap.exists ? setupSnap.data() : null) as any;

    const roleMappings: Record<string, RoleMappingEntry> = setupData?.roleMappings || {};

    const roleLabelMap = buildInvertedLabelMap(roleMappings, ROLE_LABEL_DEFAULTS);
    const statusLabelMap = buildInvertedLabelMap(setupData?.statusMappings, STATUS_LABEL_DEFAULTS);

    if (Object.keys(roleMappings).length === 0) {
      ctx.logger.warn("usersSyncRolesFromSheet: setup/app.roleMappings missing — using built-in defaults, group sync disabled", {});
    }
    if (!setupData?.statusMappings || Object.keys(setupData.statusMappings).length === 0) {
      ctx.logger.warn("usersSyncRolesFromSheet: setup/app.statusMappings missing — using built-in defaults", {});
    }

    const workspace = new GoogleWorkspaceProvider(delegated);

    // Czytaj arkusz
    const sheets = new GoogleSheetsProvider(delegated);
    const table = await sheets.readTableAsObjects({spreadsheetId, tabName});

    if (!table.headers.includes("e-mail")) {
      throw new Error(`Sheet "${tabName}" missing required header "e-mail"`);
    }

    const rows = payload?.limit ? table.rows.slice(0, Number(payload.limit)) : table.rows;

    ctx.logger.info("usersSyncRolesFromSheet: rows read", {count: rows.length});

    let updated = 0;
    let unchanged = 0;
    let notFound = 0;
    let skipped = 0;
    let errors = 0;
    let groupSyncErrors = 0;

    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const row of rows) {
      const email = norm(row["e-mail"]).toLowerCase();
      if (!email || !email.includes("@")) {
        skipped++;
        continue;
      }

      const roleLabelRaw = norm(row["Rola"]);
      const statusLabelRaw = norm(row["Status"]);

      const newRoleKey = roleLabelRaw ? (roleLabelMap[roleLabelRaw.toLowerCase()] ?? null) : null;
      const newStatusKey = statusLabelRaw ? (statusLabelMap[statusLabelRaw.toLowerCase()] ?? null) : null;

      // Nieznana etykieta roli — pomiń wiersz (nie nadpisuj nieznaną wartością)
      if (roleLabelRaw && !newRoleKey) {
        ctx.logger.warn("usersSyncRolesFromSheet: unknown role label — skipping row", {email, roleLabelRaw});
        skipped++;
        continue;
      }
      // Nieznana etykieta statusu — pomiń wiersz
      if (statusLabelRaw && !newStatusKey) {
        ctx.logger.warn("usersSyncRolesFromSheet: unknown status label — skipping row", {email, statusLabelRaw});
        skipped++;
        continue;
      }

      // Brak obu wartości do ustawienia — pomiń
      if (!newRoleKey && !newStatusKey) {
        skipped++;
        continue;
      }

      try {
        const userQuery = await firestore
          .collection("users_active")
          .where("email", "==", email)
          .limit(1)
          .get();

        if (userQuery.empty) {
          ctx.logger.info("usersSyncRolesFromSheet: email not in users_active", {email});
          notFound++;
          continue;
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data() as any;
        const currentRoleKey = norm(userData?.role_key);
        const currentStatusKey = norm(userData?.status_key);

        const roleChanged = Boolean(newRoleKey && newRoleKey !== currentRoleKey);
        const statusChanged = Boolean(newStatusKey && newStatusKey !== currentStatusKey);

        if (!roleChanged && !statusChanged) {
          unchanged++;
          continue;
        }

        const patch: Record<string, any> = {
          "updatedAt": now,
          "service.sheetRoleSyncAt": now,
        };

        if (roleChanged) patch.role_key = newRoleKey;
        if (statusChanged) patch.status_key = newStatusKey;

        ctx.logger.info("usersSyncRolesFromSheet: updating user", {
          email,
          uid: userDoc.id,
          changes: {
            role: roleChanged ? {from: currentRoleKey, to: newRoleKey} : null,
            status: statusChanged ? {from: currentStatusKey, to: newStatusKey} : null,
          },
          dryRun,
        });

        if (!dryRun) {
          await userDoc.ref.update(patch);
        }

        updated++;

        // Email powiadomienie o zmianie roli (non-fatal)
        if (roleChanged && newRoleKey && !dryRun) {
          const oldRoleLabel = roleMappings[currentRoleKey]?.label || currentRoleKey;
          const newRoleLabel = roleMappings[newRoleKey]?.label || newRoleKey;
          const isBoardRole = newRoleKey === "rola_zarzad" || newRoleKey === "rola_kr";
          const boardInstructions = isBoardRole ? [
            "",
            "---",
            "",
            "Jako członek Zarządu/KR obsługujesz adres: zarzad@morzkulc.pl",
            "",
            "ODBIERANIE MAILI:",
            "1. Wejdź na groups.google.com",
            "2. Znajdź grupę zarzad_skk@morzkulc.pl",
            "3. Kliknij \"Moje ustawienia członkostwa\" → \"Subskrypcja\" → wybierz \"Każdy e-mail\"",
            "4. Od tej chwili maile do zarzad@morzkulc.pl będą trafiać do Twojego Gmaila.",
            "",
            "ODPOWIADANIE JAKO zarzad@morzkulc.pl:",
            "1. W Gmailu: koło zębate → Ustawienia → zakładka \"Konta i import\"",
            "2. \"Wyślij pocztę jako\" → \"Dodaj inny adres e-mail\"",
            "3. Wpisz: zarzad@morzkulc.pl → kliknij Dalej",
            "4. Gmail wyśle kod weryfikacyjny na zarzad@ — odbierzesz go bo jesteś już w grupie",
            "5. Po wpisaniu kodu możesz pisać i odpowiadać jako zarzad@morzkulc.pl",
          ] : [];
          try {
            await workspace.sendWelcomeEmail(
              cfg.welcomeFromEmail,
              email,
              cfg.welcomeReplyToEmail,
              "Zmiana roli w SKK Morzkulc",
              [
                "Cześć!",
                "",
                "Twoja rola w SKK Morzkulc została zmieniona.",
                "",
                `Poprzednia rola: ${oldRoleLabel}`,
                `Nowa rola: ${newRoleLabel}`,
                "",
                "Jeśli masz pytania, odpisz na tego maila.",
                "",
                "SKK Morzkulc",
                ...boardInstructions,
              ].join("\n")
            );
            ctx.logger.info("usersSyncRolesFromSheet: role change email sent", {email, oldRoleLabel, newRoleLabel, isBoardRole});
          } catch (emailErr: any) {
            ctx.logger.error("usersSyncRolesFromSheet: role change email failed (non-fatal)", {
              email, message: emailErr?.message,
            });
          }
        }

        // Sync grup Workspace jeśli rola się zmieniła i roleMappings jest skonfigurowane
        if (roleChanged && newRoleKey && Object.keys(roleMappings).length > 0) {
          try {
            await syncWorkspaceGroupsForUser(
              workspace,
              email,
              newRoleKey,
              roleMappings,
              ctx.logger,
              dryRun
            );
          } catch (groupErr: any) {
            // Błąd Workspace nie cofa zmiany roli w Firestore — logujemy i kontynuujemy
            ctx.logger.error("usersSyncRolesFromSheet: workspace group sync failed (non-fatal)", {
              email,
              newRoleKey,
              message: groupErr?.message,
              code: groupErr?.code,
            });
            groupSyncErrors++;
          }
        }
      } catch (e) {
        const err = e as any;
        ctx.logger.error("usersSyncRolesFromSheet: error processing row", {
          email,
          message: err?.message,
          code: err?.code,
        });
        errors++;
      }
    }

    const details = {updated, unchanged, notFound, skipped, errors, groupSyncErrors, dryRun};
    ctx.logger.info("usersSyncRolesFromSheet: done", details);

    return {
      ok: errors === 0,
      message: `Sync complete: updated=${updated}, unchanged=${unchanged}, notFound=${notFound}, skipped=${skipped}, errors=${errors}, groupSyncErrors=${groupSyncErrors}`,
      details,
    };
  },
};
