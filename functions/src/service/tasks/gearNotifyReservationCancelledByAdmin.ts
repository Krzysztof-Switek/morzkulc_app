import {ServiceTask} from "../types";

/**
 * Task: gear.notifyReservationCancelledByAdmin
 *
 * Wysyła e-mail do właściciela rezerwacji po wymuszonym anulowaniu przez
 * zarząd/KR (panel admina, sekcja "Wypożyczenia sprzętu" — np. sprzęt nie
 * został oddany przez poprzedniego użytkownika). Czyta już zapisany
 * (anulowany) rekord gear_reservations, więc payload niesie tylko jego id.
 */

type Payload = {
  reservationId: string;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

const CATEGORY_NOUN: Record<string, string> = {
  kayaks: "Kajak",
  paddles: "Wiosło",
  lifejackets: "Kamizelka",
  helmets: "Kask",
  throwbags: "Rzutka",
  sprayskirts: "Fartuch",
};

function formatDatePL(iso: string): string {
  const s = norm(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

function describeItems(r: any): string {
  if (Array.isArray(r?.items) && r.items.length) {
    return r.items
      .map((it: any) => {
        const cat = norm(it?.category).toLowerCase();
        const noun = CATEGORY_NOUN[cat] || "Sprzęt";
        const number = norm(it?.itemNumber);
        const label = norm(it?.itemLabel);
        const head = [noun, number].filter(Boolean).join(" ");
        return label ? `${head} (${label})` : head;
      })
      .join(", ");
  }
  if (Array.isArray(r?.kayakIds) && r.kayakIds.length) {
    return r.kayakIds.map((kid: any) => `Kajak ${norm(kid)}`).join(", ");
  }
  return "sprzęt";
}

export const gearNotifyReservationCancelledByAdminTask: ServiceTask<Payload> = {
  id: "gear.notifyReservationCancelledByAdmin",
  description: "Wysyła e-mail do użytkownika o wymuszonym anulowaniu rezerwacji sprzętu przez zarząd/KR i zwrocie godzinek.",

  validate: (payload) => {
    if (!payload?.reservationId) throw new Error("Missing reservationId");
  },

  run: async (payload, ctx) => {
    const rSnap = await ctx.firestore.collection("gear_reservations").doc(payload.reservationId).get();
    if (!rSnap.exists) {
      return {ok: false, message: `Reservation ${payload.reservationId} not found`};
    }

    const r = rSnap.data() as any;
    const userUid = norm(r?.userUid);
    let email = norm(r?.userEmail).toLowerCase();
    let name = "";

    if (userUid) {
      const uSnap = await ctx.firestore.collection("users_active").doc(userUid).get();
      const u = uSnap.data() as any;
      if (!email) email = norm(u?.email).toLowerCase();
      const firstName = norm(u?.profile?.firstName);
      const nickname = norm(u?.profile?.nickname);
      name = firstName || nickname;
    }

    if (!email || !email.includes("@")) {
      return {ok: false, message: "Missing/invalid recipient email"};
    }

    const greeting = name ? `Cześć ${name},` : "Cześć,";
    const term = `${formatDatePL(r?.startDate)} – ${formatDatePL(r?.endDate)}`;
    const itemsDesc = describeItems(r);
    const costHours = Number(r?.costHours || 0);
    const reason = norm(r?.cancelReason);

    const bodyLines = [
      greeting,
      "",
      `Twoja rezerwacja sprzętu (${itemsDesc}, ${term}) została anulowana przez Zarząd.`,
    ];
    if (reason) bodyLines.push(`Powód: ${reason}`);
    if (costHours > 0) {
      bodyLines.push("", `Godzinki za tę rezerwację (${costHours} godz.) zostały zwrócone na Twoje konto.`);
    }
    bodyLines.push("", "W razie pytań odezwij się do Zarządu: zarzad@morzkulc.pl", "", "SKK Morzkulc");
    const body = bodyLines.join("\n");

    try {
      await ctx.workspace.sendGenericEmail(email, "Anulowanie rezerwacji sprzętu przez Zarząd", body);
      ctx.logger.info("gearNotifyReservationCancelledByAdmin: sent", {reservationId: payload.reservationId, email});
      return {ok: true, message: `sent to ${email}`};
    } catch (e: any) {
      ctx.logger.error("gearNotifyReservationCancelledByAdmin: send failed", {
        reservationId: payload.reservationId,
        email,
        message: e?.message,
      });
      return {ok: false, message: e?.message || "send failed"};
    }
  },
};
