import { ServiceTask } from "../types";

type Payload = Record<string, never>;

export const listaEnforcePostingPolicyTask: ServiceTask<Payload> = {
  id: "lista.enforcePostingPolicy",
  description: "Ustaw lista@: ALL_MANAGERS_CAN_POST, privileged groups jako MANAGER.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (_payload, ctx) => {
    const { workspace, config, logger, dryRun } = ctx;

    logger.info("listaEnforcePostingPolicy: start", {
      lista: config.listaGroupEmail,
      privilegedGroups: config.privilegedPosterGroups,
      dryRun,
    });

    if (dryRun) {
      return {
        ok: true,
        message: "DRYRUN: would enforce lista posting policy",
        details: {
          lista: config.listaGroupEmail,
          privilegedGroups: config.privilegedPosterGroups,
        },
      };
    }

    await workspace.enforceListaPostingPolicy(
      config.listaGroupEmail,
      config.privilegedPosterGroups
    );

    logger.info("listaEnforcePostingPolicy: done", { lista: config.listaGroupEmail });

    return {
      ok: true,
      message: "Lista posting policy enforced",
      details: {
        lista: config.listaGroupEmail,
        privilegedGroups: config.privilegedPosterGroups,
      },
    };
  },
};
