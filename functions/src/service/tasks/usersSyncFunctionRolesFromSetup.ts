import * as admin from "firebase-admin";
import {ServiceTask} from "../types";

type Payload = {
  dry?: boolean;
};

type FunctionRoleKey = "sprzetowiec" | "szkoleniowiec";

const FUNCTION_ROLE_LABELS: Record<FunctionRoleKey, string> = {
  sprzetowiec: "sprzętowca",
  szkoleniowiec: "szkoleniowca",
};

function parseEmailList(raw: any): Set<string> {
  const out = new Set<string>();
  const s = String(raw == null ? "" : raw);
  for (const part of s.split(/[,;\n]/g)) {
    const e = part.trim().toLowerCase();
    if (e && e.includes("@") && !e.startsWith("@") && !e.endsWith("@")) {
      out.add(e);
    }
  }
  return out;
}

function welcomeBody(role: FunctionRoleKey, group: string, listaGroup: string): string {
  const roleLabel = FUNCTION_ROLE_LABELS[role];
  return [
    "Cześć!",
    "",
    `Zostałeś dołączony do funkcji ${roleLabel} w SKK Morzkulc.`,
    "",
    `Oznacza to, że możesz wysyłać maile na listę dyskusyjną ${listaGroup}`,
    `z adresu ${group}.`,
    "",
    "KROK 1 — odbieranie maili do grupy:",
    "1. Wejdź na https://groups.google.com (zalogowany na to konto Google).",
    `2. Znajdź grupę ${group}.`,
    "3. „Moje ustawienia członkostwa\" → „Subskrypcja\" → „Każdy e-mail\".",
    "",
    `KROK 2 — wysyłanie maili jako ${group}:`,
    "1. W Gmailu: koło zębate → Ustawienia → zakładka „Konta i import\".",
    "2. „Wyślij pocztę jako\" → „Dodaj inny adres e-mail\".",
    `3. Wpisz: ${group} → Dalej.`,
    `4. Gmail wyśle kod weryfikacyjny na ${group} — odbierzesz go,`,
    "   bo dodaliśmy Cię właśnie do tej grupy.",
    "5. Wpisz kod — gotowe.",
    "",
    `Od tej chwili przy nowej wiadomości w Gmailu możesz wybrać „Od" → ${group}.`,
    "",
    "SKK Morzkulc",
  ].join("\n");
}

function offboardingBody(role: FunctionRoleKey, group: string, listaGroup: string): string {
  const roleLabel = FUNCTION_ROLE_LABELS[role];
  return [
    "Cześć!",
    "",
    `Twoja funkcja ${roleLabel} w SKK Morzkulc została cofnięta.`,
    `Nie jesteś już członkiem grupy ${group} — nie możesz wysyłać maili`,
    `z tego adresu na ${listaGroup}.`,
    "",
    "Jeśli to pomyłka, odezwij się do zarządu.",
    "",
    "SKK Morzkulc",
  ].join("\n");
}

export const usersSyncFunctionRolesFromSetupTask: ServiceTask<Payload> = {
  id: "users.syncFunctionRolesFromSetup",
  description: "Synchronizuje członków grup sprzetowiec@ i szkoleniowiec@ na podstawie zmiennych setup/vars_members. Wysyła welcome/off-boarding maile.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, config, workspace, logger} = ctx;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    logger.info("syncFunctionRoles: start", {
      sprzetowiecGroup: config.functionRoles.sprzetowiec,
      szkoleniowiecGroup: config.functionRoles.szkoleniowiec,
      dryRun,
    });

    const varsSnap = await firestore.collection("setup").doc("vars_members").get();
    const vars = (varsSnap.exists ? (varsSnap.data() as any)?.vars : null) || {};

    const stateRef = firestore.collection("service_state").doc("function_roles");

    const roles: FunctionRoleKey[] = ["sprzetowiec", "szkoleniowiec"];
    const details: Record<string, unknown> = {};
    let totalErrors = 0;

    for (const role of roles) {
      const group = config.functionRoles[role];
      const rawValue = vars?.[role]?.value;
      const targetSet = parseEmailList(rawValue);

      let currentSet: Set<string>;
      try {
        const members = await workspace.listMembersOfGroup(group);
        currentSet = new Set(members.map((m) => m.email.toLowerCase()));
      } catch (e: any) {
        logger.error("syncFunctionRoles: listMembersOfGroup failed", {
          role, group, message: e?.message, code: e?.code,
        });
        throw e;
      }

      const toAdd = [...targetSet].filter((e) => !currentSet.has(e));
      const toRemove = [...currentSet].filter((e) => !targetSet.has(e));

      logger.info("syncFunctionRoles: diff", {
        role, group,
        target: [...targetSet],
        current: [...currentSet],
        toAdd,
        toRemove,
        dryRun,
      });

      const added: string[] = [];
      const removed: string[] = [];
      let mailErrors = 0;

      for (const email of toAdd) {
        if (dryRun) {
          logger.info("DRYRUN syncFunctionRoles: would add", {role, group, email});
          added.push(email);
          continue;
        }
        try {
          await workspace.addMemberToGroup(group, email, "MANAGER");
          added.push(email);
          logger.info("syncFunctionRoles: addMember", {role, group, email});
        } catch (e: any) {
          logger.error("syncFunctionRoles: addMember FAILED", {
            role, group, email, message: e?.message, code: e?.code,
          });
          throw e;
        }

        try {
          await workspace.sendWelcomeEmail(
            config.welcomeFromEmail,
            email,
            config.welcomeReplyToEmail,
            `Funkcja ${FUNCTION_ROLE_LABELS[role]} w SKK Morzkulc`,
            welcomeBody(role, group, config.listaGroupEmail)
          );
          logger.info("syncFunctionRoles: welcome email sent", {role, email});
        } catch (e: any) {
          // non-fatal
          mailErrors++;
          logger.error("syncFunctionRoles: welcome email failed (non-fatal)", {
            role, email, message: e?.message, code: e?.code,
          });
        }
      }

      for (const email of toRemove) {
        if (dryRun) {
          logger.info("DRYRUN syncFunctionRoles: would remove", {role, group, email});
          removed.push(email);
          continue;
        }
        try {
          await workspace.removeMemberFromGroup(group, email);
          removed.push(email);
          logger.info("syncFunctionRoles: removeMember", {role, group, email});
        } catch (e: any) {
          logger.error("syncFunctionRoles: removeMember FAILED", {
            role, group, email, message: e?.message, code: e?.code,
          });
          throw e;
        }

        try {
          await workspace.sendGenericEmail(
            email,
            `Funkcja ${FUNCTION_ROLE_LABELS[role]} — cofnięcie`,
            offboardingBody(role, group, config.listaGroupEmail)
          );
          logger.info("syncFunctionRoles: off-boarding email sent", {role, email});
        } catch (e: any) {
          // non-fatal
          mailErrors++;
          logger.error("syncFunctionRoles: off-boarding email failed (non-fatal)", {
            role, email, message: e?.message, code: e?.code,
          });
        }
      }

      details[role] = {
        group,
        target: [...targetSet],
        added,
        removed,
        mailErrors,
      };
      totalErrors += mailErrors;

      if (!dryRun) {
        await stateRef.set({
          [role]: {
            group,
            emails: [...targetSet],
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        }, {merge: true});
      }
    }

    logger.info("syncFunctionRoles: done", {details, totalErrors, dryRun});

    return {
      ok: true,
      message: `Function roles synced (mailErrors=${totalErrors})`,
      details,
    };
  },
};
