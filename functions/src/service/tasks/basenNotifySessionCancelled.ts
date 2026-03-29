import {ServiceTask} from "../types";
import {getBasenVars} from "../../modules/basen/basen_service";

type Payload = {
  sessionId: string;
};

function norm(v: any): string {
  return String(v || "").trim();
}

export const basenNotifySessionCancelledTask: ServiceTask<Payload> = {
  id: "basen.notifySessionCancelled",
  description: "Wysyła e-mail do prowadzącego i uczestników po anulowaniu sesji basenowej.",

  validate: (payload) => {
    if (!payload?.sessionId) throw new Error("Missing sessionId");
  },

  run: async (payload, ctx) => {
    const vars = await getBasenVars(ctx.firestore);

    const sessionSnap = await ctx.firestore
      .collection("basen_sessions")
      .doc(payload.sessionId)
      .get();

    if (!sessionSnap.exists) {
      return {ok: false, message: `Session ${payload.sessionId} not found`};
    }

    const session = sessionSnap.data() as any;
    const dateStr = norm(session?.date);
    const timeStart = norm(session?.timeStart);
    const timeEnd = norm(session?.timeEnd);

    // Get all cancelled enrollments for this session
    const enrollmentsSnap = await ctx.firestore
      .collection("basen_enrollments")
      .where("sessionId", "==", payload.sessionId)
      .where("status", "==", "cancelled")
      .get();

    const enrollments = enrollmentsSnap.docs.map((d) => d.data() as any);

    const sessionDesc = `${dateStr} ${timeStart}–${timeEnd}`;
    const subject = `Anulowanie zajęć basenowych — ${sessionDesc}`;
    const body = [
      "Informujemy, że zajęcia basenowe zostały anulowane.",
      "",
      `Data i godzina: ${sessionDesc}`,
      "",
      "Jeśli byłeś/aś zapisany/a z karnetu, wejście zostało automatycznie zwrócone.",
      "",
      "SKK Morzkulc",
    ].join("\n");

    const recipients = new Set<string>();

    // Add instructor
    const instructorEmail = norm(session?.instructorEmail);
    if (instructorEmail && instructorEmail.includes("@")) {
      recipients.add(instructorEmail);
    }

    // Add admin mail from vars
    if (vars.basen_admin_mail && vars.basen_admin_mail.includes("@")) {
      recipients.add(vars.basen_admin_mail);
    }

    // Add enrolled users
    for (const enrollment of enrollments) {
      const email = norm(enrollment?.userEmail);
      if (email && email.includes("@")) {
        recipients.add(email);
      }
    }

    let sent = 0;
    let errors = 0;

    for (const to of recipients) {
      try {
        await ctx.workspace.sendGenericEmail(to, subject, body);
        sent++;
        ctx.logger.info("basenNotifySessionCancelled: sent", {to, sessionId: payload.sessionId});
      } catch (e: any) {
        errors++;
        ctx.logger.error("basenNotifySessionCancelled: send failed", {
          to,
          message: e?.message || String(e),
        });
      }
    }

    return {
      ok: errors === 0,
      message: `sent=${sent}, errors=${errors}, recipients=${recipients.size}`,
      details: {sent, errors, recipients: recipients.size},
    };
  },
};
