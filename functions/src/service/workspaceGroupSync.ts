import {GoogleWorkspaceProvider} from "./providers/googleWorkspaceProvider";

/**
 * Wspólne źródło prawdy dla synchronizacji ról użytkowników z członkostwem w grupach
 * Google Workspace (lista@ i grupy z setup/app.roleMappings). Wywoływane z KAŻDEGO
 * miejsca, które zapisuje role_key — patrz Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD.
 */

export type RoleMappingEntry = {
  label?: string;
  groups?: string[];
};

export type SimpleLogger = {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

function norm(v: any): string {
  return String(v || "").trim();
}

/** Docelowa rola w lista@ dla danej roli klubowej. null = brak dostępu (kursant). */
export function listaRoleForUserRole(roleKey: string): "MANAGER" | "MEMBER" | null {
  if (roleKey === "rola_kursant") return null;
  if (roleKey === "rola_sympatyk") return "MEMBER";
  return "MANAGER"; // kandydat, czlonek, zarzad, kr
}

/**
 * Synchronizuje członkostwo w lista@ dla jednego użytkownika wg jego roli.
 * Non-fatal: błędy Workspace są logowane i połykane (caller nie musi ich obsługiwać) —
 * zgodne z oryginalnym zachowaniem w usersSyncRolesFromSheet.ts.
 */
export async function syncListaGroupForUser(
  workspace: GoogleWorkspaceProvider,
  listaGroupEmail: string,
  userEmail: string,
  roleKey: string,
  logger: SimpleLogger,
  dryRun: boolean
): Promise<void> {
  const targetListaRole = listaRoleForUserRole(roleKey);

  if (dryRun) {
    logger.info("DRYRUN syncListaGroupForUser", {userEmail, roleKey, targetListaRole});
    return;
  }

  try {
    if (targetListaRole === null) {
      await workspace.removeMemberFromGroup(listaGroupEmail, userEmail);
      logger.info("syncListaGroupForUser: removed from lista@", {userEmail, roleKey});
    } else {
      await workspace.addMemberToGroup(listaGroupEmail, userEmail, targetListaRole);
      logger.info("syncListaGroupForUser: lista@ updated", {userEmail, roleKey, targetListaRole});
    }
  } catch (e: any) {
    logger.error("syncListaGroupForUser: lista@ update failed (non-fatal)", {
      userEmail,
      roleKey,
      message: e?.message,
      code: e?.code,
    });
  }
}

/**
 * Synchronizuje członkostwo użytkownika we WSZYSTKICH grupach zarządzanych przez
 * setup/app.roleMappings (poza lista@, patrz syncListaGroupForUser).
 *
 * Logika:
 *   - allManagedGroups = suma grup ze wszystkich wpisów roleMappings
 *   - targetGroups     = grupy dla nowej roli usera
 *   - dla każdej zarządzanej grupy: dodaj jeśli w target, usuń jeśli nie
 *
 * Grupy spoza roleMappings (np. lista@) nigdy nie są tu ruszane.
 * Operacje idempotentne (add no-op jeśli już member, remove no-op jeśli nie member).
 * Błędy są rzucane do wywołującego (on decyduje czy są fatalne).
 */
export async function syncWorkspaceGroupsForUser(
  workspace: GoogleWorkspaceProvider,
  userEmail: string,
  newRoleKey: string,
  roleMappings: Record<string, RoleMappingEntry>,
  logger: SimpleLogger,
  dryRun: boolean
): Promise<void> {
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

/**
 * Jeden punkt wejścia łączący lista@ + pozostałe grupy zarządzane przez roleMappings.
 * TO JEST FUNKCJA, którą powinien wołać każdy przyszły kod zmieniający role_key
 * (patrz Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD, sekcja pamięci projektu).
 */
export async function syncAllWorkspaceGroupsForRoleChange(
  workspace: GoogleWorkspaceProvider,
  userEmail: string,
  roleKey: string,
  roleMappings: Record<string, RoleMappingEntry>,
  listaGroupEmail: string,
  logger: SimpleLogger,
  dryRun: boolean
): Promise<void> {
  await syncListaGroupForUser(workspace, listaGroupEmail, userEmail, roleKey, logger, dryRun);
  await syncWorkspaceGroupsForUser(workspace, userEmail, roleKey, roleMappings, logger, dryRun);
}
