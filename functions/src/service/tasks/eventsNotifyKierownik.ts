import {ServiceTask} from "../types";
import {norm} from "../../modules/shared/text_utils";
import {getAppVars} from "../../modules/setup/app_vars";

/**
 * Task: events.notifyKierownik
 *
 * Wysyła mail do JEDNEGO kierownika imprezy klubowej (payload.uid) o objęciu
 * funkcji i możliwości bezpłatnego rezerwowania sprzętu bez limitu ilości.
 * Kolejkowany przez trigger onEventApproved — raz przy pierwszym zatwierdzeniu
 * imprezy (dla wszystkich ówczesnych kierowników) i ponownie za każdym razem,
 * gdy do już zatwierdzonej imprezy klubowej dołącza KOLEJNY kierownik (arkusz:
 * kolumna "Kierownik" dopuszcza kilka e-maili). JobId deterministyczny per
 * (eventId, uid) — jedna osoba dostaje maila dokładnie raz na czas bycia
 * kierownikiem tej imprezy.
 */

type Payload = {
  eventId: string;
  uid: string;
};

function dateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

export function buildKierownikEmail(
  ev: {name: string; startDate: string; endDate: string; kierownikDisplayName: string},
  appUrl: string
): {subject: string; bodyText: string} {
  const subject = `SKK Morzkulc — jesteś kierownikiem imprezy: ${ev.name}`;
  const greeting = ev.kierownikDisplayName ? `Cześć ${ev.kierownikDisplayName},` : "Cześć,";

  const lines: string[] = [];
  lines.push(greeting);
  lines.push("");
  lines.push(`Zostałeś/aś kierownikiem imprezy klubowej: ${ev.name}`);
  lines.push(`Termin: ${dateRange(ev.startDate, ev.endDate)}`);
  lines.push("");
  lines.push(
    "Jako kierownik możesz rezerwować sprzęt w dowolnych ilościach na potrzeby imprezy — " +
    "bezpłatnie i bez limitu — poprzez dostęp kierownika w aplikacji (kafelek „Sprzęt na " +
    "imprezę” na stronie głównej)."
  );
  lines.push("");
  lines.push(appUrl);
  lines.push("");
  lines.push("— Automatyczne powiadomienie SKK Morzkulc");

  return {subject, bodyText: lines.join("\n")};
}

export const eventsNotifyKierownikTask: ServiceTask<Payload> = {
  id: "events.notifyKierownik",
  description: "Wysyła mail do jednego kierownika o objęciu funkcji przy zatwierdzeniu imprezy klubowej.",

  validate: (payload) => {
    if (!payload?.eventId) throw new Error("Missing eventId");
    if (!payload?.uid) throw new Error("Missing uid");
  },

  run: async (payload, ctx) => {
    const dryRun = ctx.dryRun;

    const eventSnap = await ctx.firestore.collection("events").doc(payload.eventId).get();
    if (!eventSnap.exists) {
      return {ok: true, message: "skip: event not found", details: {sent: 0}};
    }
    const eventData = eventSnap.data() as any;
    if (eventData?.rejected === true) {
      return {ok: true, message: "skip: event rejected", details: {sent: 0}};
    }
    if (eventData?.organizer !== "morzkulc") {
      return {ok: true, message: "skip: not a club event", details: {sent: 0}};
    }

    const kierownicy: Array<{email: string; uid: string | null; displayName: string}> = Array.isArray(eventData?.kierownicy) ? eventData.kierownicy : [];
    const entry = kierownicy.find((k) => k?.uid === payload.uid);
    const kierownikEmail = norm(entry?.email).toLowerCase();
    if (!entry || !kierownikEmail.includes("@")) {
      return {ok: true, message: "skip: uid is not (or no longer) a resolved kierownik of this event", details: {sent: 0}};
    }

    const {appUrl} = await getAppVars(ctx.firestore);
    const {subject, bodyText} = buildKierownikEmail({
      name: norm(eventData?.name),
      startDate: norm(eventData?.startDate),
      endDate: norm(eventData?.endDate),
      kierownikDisplayName: norm(entry.displayName),
    }, appUrl);

    if (dryRun) {
      ctx.logger.info("eventsNotifyKierownik: [DRY RUN] would send", {eventId: payload.eventId, uid: payload.uid, subject, to: kierownikEmail});
      return {
        ok: true,
        message: `[DRY RUN] would notify ${kierownikEmail}`,
        details: {sent: 0, dryRun: true, subject, body: bodyText},
      };
    }

    try {
      await ctx.workspace.sendGenericEmail(kierownikEmail, subject, bodyText);
      ctx.logger.info("eventsNotifyKierownik: sent", {eventId: payload.eventId, uid: payload.uid, to: kierownikEmail});
      return {ok: true, message: `sent to ${kierownikEmail}`, details: {sent: 1}};
    } catch (e: any) {
      ctx.logger.error("eventsNotifyKierownik: send failed", {eventId: payload.eventId, uid: payload.uid, to: kierownikEmail, message: e?.message});
      return {ok: false, message: e?.message || "send failed", details: {sent: 0}};
    }
  },
};
