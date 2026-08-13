import {ServiceTask} from "../types";
import {GoogleWorkspaceProvider} from "../providers/googleWorkspaceProvider";
import {listaRoleForUserRole, RoleMappingEntry, SimpleLogger} from "../workspaceGroupSync";

/**
 * Task: users.reconcileWorkspaceGroups
 *
 * Rekoncyliacja członkostwa w lista@ i grupach z setup/app.roleMappings wg role_key/status_key
 * KAŻDEGO aktywnego użytkownika, porównana z ŻYWYM stanem Google Directory API — NIE z markerami
 * Firestore (service.addedToListaGroupAt itd.), bo te są zawodne (patrz Audyty/13.08_NAPRAWA_UPRAWNIEŃ_LISTA.MD).
 *
 * Dwa tryby:
 *   - HURTOWY (bez payload.email): iteruje wszystkich users_active, dla każdej zarządzanej grupy
 *     czyta członkostwo JEDNYM wywołaniem (listMembersDetailed), koryguje różnice.
 *   - PUNKTOWY (payload.email): przetwarza jednego użytkownika. Cel wywołań z registerUserHandler.ts
 *     (enqueueWorkspaceGroupsRoleSync) — natychmiastowa reakcja po zmianie roli poza sheet-syncem.
 *
 * Zawieszeni/skreśleni (status_key != status_aktywny) → oczekiwane: brak członkostwa w ŻADNEJ
 * zarządzanej grupie, w tym lista@.
 *
 * Idempotentny, non-destructive dla kont spoza users_active (np. sprzetowiec@ jako MANAGER na
 * lista@ — nie ma dokumentu w users_active, więc nigdy nie jest ruszany).
 */

type Payload = {
  dry?: boolean;
  email?: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

type Correction = {
  email: string;
  group: string;
  before: string | null;
  after: string | null;
};

function targetListaRoleFor(roleKey: string, statusKey: string): "MANAGER" | "MEMBER" | null {
  if (statusKey !== "status_aktywny") return null;
  return listaRoleForUserRole(roleKey);
}

function targetManagedGroupsFor(
  roleKey: string,
  statusKey: string,
  roleMappings: Record<string, RoleMappingEntry>
): Set<string> {
  if (statusKey !== "status_aktywny") return new Set();
  return new Set(
    (roleMappings[roleKey]?.groups || [])
      .map((g) => norm(g).toLowerCase())
      .filter((g) => g.includes("@"))
  );
}

/** Wymusza docelowy stan (idempotentnie) dla JEDNEGO usera — używane w trybie punktowym. */
async function enforceTargetStateForUser(
  workspace: GoogleWorkspaceProvider,
  email: string,
  roleKey: string,
  statusKey: string,
  roleMappings: Record<string, RoleMappingEntry>,
  managedGroups: Set<string>,
  listaGroupEmail: string,
  logger: SimpleLogger
): Promise<void> {
  const targetListaRole = targetListaRoleFor(roleKey, statusKey);
  if (targetListaRole === null) {
    await workspace.removeMemberFromGroup(listaGroupEmail, email);
  } else {
    await workspace.addMemberToGroup(listaGroupEmail, email, targetListaRole);
  }

  const targetGroups = targetManagedGroupsFor(roleKey, statusKey, roleMappings);
  for (const group of managedGroups) {
    if (group === listaGroupEmail) continue;
    if (targetGroups.has(group)) {
      await workspace.addMemberToGroup(group, email, "MEMBER");
    } else {
      await workspace.removeMemberFromGroup(group, email);
    }
  }
  logger.info("reconcileWorkspaceGroups: enforced target state", {email, roleKey, statusKey, targetListaRole});
}

export const reconcileWorkspaceGroupsTask: ServiceTask<Payload> = {
  id: "users.reconcileWorkspaceGroups",
  description: "Rekoncyliacja członkostwa w lista@ i grupach roleMappings wg role_key/status_key, porównana z żywym stanem Directory API (nie markerami Firestore). Tryb hurtowy lub punktowy (payload.email).",

  validate: (_payload) => {
    // brak wymaganych pól
  },

  run: async (payload, ctx) => {
    const {firestore, workspace, config, logger} = ctx;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);
    const targetEmail = norm(payload?.email).toLowerCase();
    const listaGroupEmail = norm(config.listaGroupEmail).toLowerCase();

    logger.info("reconcileWorkspaceGroups: start", {dryRun, targetEmail: targetEmail || null});

    const setupSnap = await firestore.collection("setup").doc("app").get();
    const setupData = (setupSnap.exists ? setupSnap.data() : null) as any;
    const roleMappings: Record<string, RoleMappingEntry> = setupData?.roleMappings || {};

    const managedGroups = new Set<string>();
    for (const entry of Object.values(roleMappings)) {
      for (const g of (entry?.groups || [])) {
        const gn = norm(g).toLowerCase();
        if (gn && gn.includes("@")) managedGroups.add(gn);
      }
    }
    managedGroups.add(listaGroupEmail);

    // =========================
    // TRYB PUNKTOWY
    // =========================
    if (targetEmail) {
      const snap = await firestore.collection("users_active").where("email", "==", targetEmail).limit(1).get();
      if (snap.empty) {
        logger.warn("reconcileWorkspaceGroups: user not found", {targetEmail});
        return {
          ok: false,
          message: `Nie znaleziono użytkownika o adresie ${targetEmail} w users_active.`,
          details: {targetEmail, userFound: false},
        };
      }
      const data = snap.docs[0].data() as any;
      const roleKey = norm(data?.role_key);
      const statusKey = norm(data?.status_key);

      if (dryRun) {
        logger.info("DRYRUN reconcileWorkspaceGroups (point)", {targetEmail, roleKey, statusKey});
      } else {
        await enforceTargetStateForUser(
          workspace, targetEmail, roleKey, statusKey, roleMappings, managedGroups, listaGroupEmail, logger
        );
      }

      return {
        ok: true,
        message: `reconcile(${targetEmail}): roleKey=${roleKey}, statusKey=${statusKey}${dryRun ? " (DRY RUN)" : ""}`,
        details: {targetEmail, roleKey, statusKey, dryRun},
      };
    }

    // =========================
    // TRYB HURTOWY
    // =========================
    // Jedno wywołanie listMembersDetailed per grupa — unika N×M zapytań per-user.
    const groupMembers: Record<string, Map<string, string>> = {};
    for (const group of managedGroups) {
      const members = await workspace.listMembersDetailed(group);
      const map = new Map<string, string>();
      for (const m of members) {
        if (m.type === "USER") map.set(m.email.toLowerCase(), m.role);
      }
      groupMembers[group] = map;
    }

    const usersSnap = await firestore.collection("users_active").get();

    const corrections: Correction[] = [];
    let usersChecked = 0;
    let errors = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data() as any;
      const email = norm(data?.email).toLowerCase();
      if (!email || !email.includes("@")) continue;
      usersChecked++;

      const roleKey = norm(data?.role_key);
      const statusKey = norm(data?.status_key);

      // lista@
      const targetListaRole = targetListaRoleFor(roleKey, statusKey);
      const actualListaRole = groupMembers[listaGroupEmail]?.get(email) || null;
      if (targetListaRole !== actualListaRole) {
        corrections.push({email, group: listaGroupEmail, before: actualListaRole, after: targetListaRole});
        if (!dryRun) {
          try {
            if (targetListaRole === null) {
              await workspace.removeMemberFromGroup(listaGroupEmail, email);
            } else {
              await workspace.addMemberToGroup(listaGroupEmail, email, targetListaRole);
            }
          } catch (e: any) {
            logger.error("reconcileWorkspaceGroups: lista correction failed", {email, message: e?.message, code: e?.code});
            errors++;
          }
        }
      }

      // pozostałe zarządzane grupy (roleMappings)
      const targetGroups = targetManagedGroupsFor(roleKey, statusKey, roleMappings);
      for (const group of managedGroups) {
        if (group === listaGroupEmail) continue;
        const shouldBeIn = targetGroups.has(group);
        const actualIn = groupMembers[group]?.has(email) || false;
        if (shouldBeIn !== actualIn) {
          corrections.push({email, group, before: actualIn ? "MEMBER" : null, after: shouldBeIn ? "MEMBER" : null});
          if (!dryRun) {
            try {
              if (shouldBeIn) {
                await workspace.addMemberToGroup(group, email, "MEMBER");
              } else {
                await workspace.removeMemberFromGroup(group, email);
              }
            } catch (e: any) {
              logger.error("reconcileWorkspaceGroups: group correction failed", {email, group, message: e?.message, code: e?.code});
              errors++;
            }
          }
        }
      }
    }

    const snapshot = {
      generatedAt: new Date(),
      dryRun,
      usersChecked,
      correctionsCount: corrections.length,
      corrections,
      errors,
      managedGroups: [...managedGroups],
    };
    await firestore.collection("service_diag").doc("workspaceGroupsReconcile").set(snapshot);

    logger.info("reconcileWorkspaceGroups: done", {
      usersChecked,
      correctionsCount: corrections.length,
      errors,
      dryRun,
    });

    return {
      ok: errors === 0,
      message: `Reconcile complete: usersChecked=${usersChecked}, corrections=${corrections.length}, errors=${errors}${dryRun ? " (DRY RUN)" : ""}`,
      details: snapshot,
    };
  },
};
