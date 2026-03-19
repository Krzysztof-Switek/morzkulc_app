import { ServiceTask } from "../types";

export interface OnUserRegisteredPayload {
  uid: string;
  email: string;
  displayName?: string | null;
}

function assertString(v: any, name: string) {
  if (typeof v !== "string" || !v.trim()) throw new Error(`Invalid ${name}`);
}

function asErr(e: unknown): any {
  return e as any;
}

export const onUserRegisteredWelcomeTask: ServiceTask<OnUserRegisteredPayload> = {
  id: "onUserRegistered.welcome",
  description: "Send welcome email and add user to lista@ group.",

  validate: (payload) => {
    assertString(payload.uid, "uid");
    assertString(payload.email, "email");
  },

  run: async (payload, ctx) => {
    const { firestore, config, workspace, logger, dryRun } = ctx;

    const uid = payload.uid;
    const userEmail = payload.email.trim().toLowerCase();
    const displayName = payload.displayName || null;

    logger.info("WelcomeTask: start", { uid, userEmail, dryRun });

    const userRef = firestore.collection("users_active").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      logger.warn("WelcomeTask: users_active doc missing - skip", { uid });
      return { ok: false, message: "users_active doc missing - skip" };
    }

    const data = snap.data() || {};
    const service = (data as any).service || {};
    const welcomeEmailSentAt = service.welcomeEmailSentAt || null;
    const addedToListaGroupAt = service.addedToListaGroupAt || null;

    // B) Add to lista group (member) - idempotent
    if (!addedToListaGroupAt) {
      logger.info("WelcomeTask: step B addMemberToGroup - begin", {
        uid,
        group: config.listaGroupEmail,
        userEmail,
      });

      if (dryRun) {
        logger.info("DRYRUN: would add member to lista group", { uid });
      } else {
        try {
          const already = await workspace.isMemberOfGroup(config.listaGroupEmail, userEmail);
          logger.info("WelcomeTask: step B isMemberOfGroup", { uid, already });

          if (!already) {
            await workspace.addMemberToGroup(config.listaGroupEmail, userEmail, "MEMBER");
            logger.info("WelcomeTask: step B addMemberToGroup - done", { uid });
          } else {
            logger.info("WelcomeTask: step B already member - skip", { uid });
          }

          await userRef.set({ "service.addedToListaGroupAt": new Date() }, { merge: true });
          logger.info("WelcomeTask: step B firestore marker set", { uid });
        } catch (e) {
          const err = asErr(e);
          logger.error("WelcomeTask: step B FAILED", {
            uid,
            code: err?.code,
            message: err?.message,
            errors: err?.errors,
            status: err?.response?.status,
            data: err?.response?.data,
          });
          throw e;
        }
      }
    } else {
      logger.info("Skip: already added to lista group", { uid });
    }

    // A) Welcome email - idempotent
    if (!welcomeEmailSentAt) {
      logger.info("WelcomeTask: step A sendWelcomeEmail - begin", {
        uid,
        from: config.welcomeFromEmail,
        replyTo: config.welcomeReplyToEmail,
        to: userEmail,
      });

      const body = config.welcomeBodyText(displayName, userEmail);
      if (dryRun) {
        logger.info("DRYRUN: would send welcome email", { uid });
      } else {
        try {
          await workspace.sendWelcomeEmail(
            config.welcomeFromEmail,
            userEmail,
            config.welcomeReplyToEmail,
            config.welcomeSubject,
            body
          );
          logger.info("WelcomeTask: step A sendWelcomeEmail - done", { uid });

          await userRef.set({ "service.welcomeEmailSentAt": new Date() }, { merge: true });
          logger.info("WelcomeTask: step A firestore marker set", { uid });
        } catch (e) {
          const err = asErr(e);
          logger.error("WelcomeTask: step A FAILED", {
            uid,
            code: err?.code,
            message: err?.message,
            errors: err?.errors,
            status: err?.response?.status,
            data: err?.response?.data,
          });
          throw e;
        }
      }
    } else {
      logger.info("Skip: welcome email already sent", { uid });
    }

    logger.info("WelcomeTask: completed", { uid });
    return { ok: true, message: "Welcome task completed", details: { uid } };
  },
};
