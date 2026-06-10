import {ServiceTask} from "../types";

type Payload = {
  groups?: string[];
};

// Grupy istotne dla problemu „zarzad@ nie dociera od zewnętrznych nadawców".
const DEFAULT_GROUPS = [
  "zarzad@morzkulc.pl",
  "kr@morzkulc.pl",
  "zarzad_skk@morzkulc.pl",
  "lista@morzkulc.pl",
  "czlonkowie@morzkulc.pl",
];

/**
 * READ-ONLY diagnostyka grup Workspace.
 *
 * Czyta (nie modyfikuje):
 *   - ustawienia każdej grupy (whoCanPostMessage, moderacja, allowExternalMembers, ...)
 *   - pełne członkostwo każdej grupy (z typem USER/GROUP → widać zagnieżdżenia)
 *   - setup/app.roleMappings — które grupy są pod kontrolą rekonsyliatora ról
 *
 * Wynik zapisuje do dokumentu Firestore `service_diag/groups`
 * (jobProcessor nie utrwala `result.details`, więc raport idzie do osobnego dokumentu).
 */
export const groupsDiagnoseTask: ServiceTask<Payload> = {
  id: "groups.diagnose",
  description: "READ-ONLY: snapshot ustawień postowania i członkostwa grup + setup/app.roleMappings → service_diag/groups.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, workspace, config, logger} = ctx;

    const groups = (payload?.groups && payload.groups.length > 0 ? payload.groups : DEFAULT_GROUPS)
      .map((g) => String(g || "").trim().toLowerCase())
      .filter((g) => g.includes("@"));

    logger.info("groupsDiagnose: start", {groups});

    // setup/app → roleMappings (steruje rekonsyliatorem członkostwa grup)
    const setupSnap = await firestore.collection("setup").doc("app").get();
    const setupData = (setupSnap.exists ? setupSnap.data() : null) as any;
    const roleMappings: Record<string, {label?: string; groups?: string[]}> = setupData?.roleMappings || {};

    // Suma wszystkich grup wymienionych przy dowolnej roli = "grupy zarządzane".
    // Dla takich grup kod DODAJE/USUWA użytkowników wg roli (patrz syncWorkspaceGroupsForUser).
    const managedGroups = new Set<string>();
    const roleGroups: Record<string, string[]> = {};
    for (const [roleKey, entry] of Object.entries(roleMappings)) {
      const gs = ((entry?.groups || []) as any[]).map((g) => String(g || "").trim().toLowerCase()).filter((g) => g.includes("@"));
      roleGroups[roleKey] = gs;
      for (const g of gs) managedGroups.add(g);
    }

    const perGroup: Record<string, any> = {};
    for (const g of groups) {
      const out: any = {group: g, settings: null};

      try {
        out.settings = await workspace.getGroupSettings(g);
      } catch (e: any) {
        out.settings = null;
        out.settingsError = `${e?.code || ""} ${e?.message || String(e)}`.trim() || "unknown error";
      }

      try {
        const members = await workspace.listMembersDetailed(g);
        out.memberCount = members.length;
        out.members = members;
        out.nestedGroupMembers = members.filter((m) => m.type === "GROUP").map((m) => m.email);
      } catch (e: any) {
        out.membersError = e?.message || String(e);
      }

      // Czy ta grupa jest pod kontrolą rekonsyliatora i przy których rolach jest "docelowa".
      out.isManagedByReconciler = managedGroups.has(g);
      out.inRoleGroups = Object.entries(roleGroups)
        .filter(([, gs]) => gs.includes(g))
        .map(([roleKey]) => roleKey);

      perGroup[g] = out;
    }

    const snapshot = {
      generatedAt: new Date(),
      envName: config.envName,
      // konfiguracja z env, która dotyka grup
      privilegedPosterGroups: config.privilegedPosterGroups,
      listaGroupEmail: config.listaGroupEmail,
      membersGroupEmail: config.membersGroupEmail,
      adminActionEmail: config.adminActionEmail,
      welcomeReplyToEmail: config.welcomeReplyToEmail,
      // setup/app
      roleMappingsPresent: Object.keys(roleMappings).length > 0,
      roleGroups,
      managedGroups: [...managedGroups],
      // per-grupa
      groups: perGroup,
    };

    await firestore.collection("service_diag").doc("groups").set(snapshot);

    logger.info("groupsDiagnose: done", {groups: groups.length, managedGroups: [...managedGroups]});

    return {
      ok: true,
      message: `Diagnose complete for ${groups.length} groups → service_diag/groups`,
      details: {groups, managedGroups: [...managedGroups]},
    };
  },
};
