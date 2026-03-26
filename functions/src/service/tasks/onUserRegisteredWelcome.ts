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

// Role keys that grant membership-level access (members group / shared drive)
const MEMBER_LEVEL_ROLES = new Set([
  "rola_czlonek",
  "rola_zarzad",
  "rola_kr",
]);

export const onUserRegisteredWelcomeTask: ServiceTask<OnUserRegisteredPayload> = {
  id: "onUserRegistered.welcome",
  description: "Send welcome email, add user to lista@ group and role-based groups.",

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
    const roleKey = String((data as any).role_key || "");

    const welcomeEmailSentAt = service.welcomeEmailSentAt || null;
    const addedToListaGroupAt = service.addedToListaGroupAt || null;
    const addedToRoleGroupAt = service.addedToRoleGroupAt || null;

    // B) Add to lista@ group (everyone) - idempotent
    if (!addedToListaGroupAt) {
      logger.info("WelcomeTask: step B addMemberToGroup lista - begin", {
        uid,
        group: config.listaGroupEmail,
        userEmail,
      });

      if (dryRun) {
        logger.info("DRYRUN: would add member to lista group", { uid });
      } else {
        try {
          const already = await workspace.isMemberOfGroup(config.listaGroupEmail, userEmail);
          logger.info("WelcomeTask: step B isMemberOfGroup lista", { uid, already });

          if (!already) {
            await workspace.addMemberToGroup(config.listaGroupEmail, userEmail, "MEMBER");
            logger.info("WelcomeTask: step B addMemberToGroup lista - done", { uid });
          } else {
            logger.info("WelcomeTask: step B already member of lista - skip", { uid });
          }

          await userRef.update({ "service.addedToListaGroupAt": new Date() });
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

    // C) Add to role-based group for Drive access - idempotent
    const membersGroup = config.membersGroupEmail;
    const shouldAddToMembersGroup = membersGroup && MEMBER_LEVEL_ROLES.has(roleKey);

    if (shouldAddToMembersGroup && !addedToRoleGroupAt) {
      logger.info("WelcomeTask: step C addMemberToGroup role - begin", {
        uid,
        group: membersGroup,
        userEmail,
        roleKey,
      });

      if (dryRun) {
        logger.info("DRYRUN: would add member to role group", { uid, membersGroup });
      } else {
        try {
          const already = await workspace.isMemberOfGroup(membersGroup, userEmail);
          logger.info("WelcomeTask: step C isMemberOfGroup role", { uid, already });

          if (!already) {
            await workspace.addMemberToGroup(membersGroup, userEmail, "MEMBER");
            logger.info("WelcomeTask: step C addMemberToGroup role - done", { uid });
          } else {
            logger.info("WelcomeTask: step C already member of role group - skip", { uid });
          }

          await userRef.update({
            "service.addedToRoleGroupAt": new Date(),
            "service.addedToRoleGroup": membersGroup,
          });
          logger.info("WelcomeTask: step C firestore marker set", { uid });
        } catch (e) {
          const err = asErr(e);
          logger.error("WelcomeTask: step C FAILED", {
            uid,
            group: membersGroup,
            code: err?.code,
            message: err?.message,
            errors: err?.errors,
            status: err?.response?.status,
            data: err?.response?.data,
          });
          throw e;
        }
      }
    } else if (!shouldAddToMembersGroup) {
      logger.info("WelcomeTask: step C skip - role not eligible for members group", { uid, roleKey });
    } else {
      logger.info("Skip: already added to role group", { uid });
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

          await userRef.update({ "service.welcomeEmailSentAt": new Date() });
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
