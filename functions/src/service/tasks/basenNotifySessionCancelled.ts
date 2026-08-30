import {ServiceTask} from "../types";
import {BasenSlotLabel} from "../../modules/basen/basen_service";

type Payload = {
  sessionId: string;
  slot?: BasenSlotLabel; // brak = anulowano cały dzień (wszystkie sloty)
};

function norm(v: any): string {
  return String(v || "").trim();
}

const SLOT_LABELS: Record<string, string> = {H1: "I godzina", H2: "II godzina", SAUNA: "Sauna"};

export const basenNotifySessionCancelledTask: ServiceTask<Payload> = {
  id: "basen.notifySessionCancelled",
  description: "Wysyła e-mail do instruktorów i uczestników po anulowaniu terminu/slotu basenowego.",

  validate: (payload) => {
    if (!payload?.sessionId) throw new Error("Missing sessionId");
  },

  run: async (payload, ctx) => {
    const sessionSnap = await ctx.firestore
      .collection("basen_sessions")
      .doc(payload.sessionId)
      .get();

    if (!sessionSnap.exists) {
      return {ok: false, message: `Session ${payload.sessionId} not found`};
    }

    const session = sessionSnap.data() as any;
    const dateStr = norm(session?.date);
    const slotLabel = payload.slot ? (SLOT_LABELS[payload.slot] || payload.slot) : "cały dzień";

    // Wszystkie anulowane zapisy dla tej sesji, ograniczone do anulowanego slotu
    // (gdy podano) — inaczej wcześniejsze anulowania innego slotu dostałyby powiadomienie ponownie.
    const enrollmentsSnap = await ctx.firestore
      .collection("basen_enrollments")
      .where("sessionId", "==", payload.sessionId)
      .where("status", "==", "cancelled")
      .get();

    const enrollments = enrollmentsSnap.docs
      .map((d) => d.data() as any)
      .filter((e) => !payload.slot || e.slot === payload.slot);

    const sessionDesc = `${dateStr} (${slotLabel})`;
    const subject = `Anulowanie zajęć basenowych — ${sessionDesc}`;
    const body = [
      "Informujemy, że zajęcia basenowe zostały anulowane.",
      "",
      `Termin: ${sessionDesc}`,
      "",
      "Jeśli byłeś/aś zapisany/a z karnetu, wejście zostało automatycznie zwrócone.",
      "",
      "SKK Morzkulc",
    ].join("\n");

    const recipients = new Set<string>();

    // Instruktorzy i uczestnicy — wszyscy są dziś zapisami (type: instructor/training/regular).
    // Opiekunowie basenowi (vars_basen.basen_admin_mail) świadomie NIE dostają tu kopii —
    // to oni anulują termin, więc już wiedzą, że to zrobili.
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
        ctx.logger.info("basenNotifySessionCancelled: sent", {to, sessionId: payload.sessionId, slot: payload.slot || null});
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
