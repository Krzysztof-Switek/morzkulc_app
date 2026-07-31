import {ServiceTask} from "../types";

/**
 * Task: gear.notifyReservationCancelledByAdmin
 *
 * Wysyła e-mail do właściciela rezerwacji ORAZ na adres zarządu
 * (ctx.config.adminNotify.email, domyślnie zarzad@morzkulc.pl — żeby cały
 * zarząd wiedział o takich sytuacjach, nie tylko admin, który je obsłużył)
 * po wymuszonym anulowaniu rezerwacji przez zarząd/KR (panel admina, sekcja
 * "Wypożyczenia sprzętu" — np. sprzęt nie został oddany przez poprzedniego
 * użytkownika). Oba maile zawierają powód anulowania i kto go dokonał.
 * Czyta już zapisany (anulowany) rekord gear_reservations, więc payload
 * niesie tylko jego id.
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

function displayNameOf(u: any): string {
  const firstName = norm(u?.profile?.firstName);
  const lastName = norm(u?.profile?.lastName);
  const nickname = norm(u?.profile?.nickname);
  return [firstName, lastName].filter(Boolean).join(" ") || nickname;
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
    let userEmail = norm(r?.userEmail).toLowerCase();
    let userName = "";

    if (userUid) {
      const uSnap = await ctx.firestore.collection("users_active").doc(userUid).get();
      const u = uSnap.data() as any;
      if (!userEmail) userEmail = norm(u?.email).toLowerCase();
      userName = displayNameOf(u);
    }

    if (!userEmail || !userEmail.includes("@")) {
      return {ok: false, message: "Missing/invalid recipient email"};
    }

    // Kto dokonał anulowania (do audytu w mailu — user i zarząd mają widzieć to samo).
    const adminUid = norm(r?.cancelledByUid);
    let adminLabel = "Zarząd";
    if (adminUid) {
      const aSnap = await ctx.firestore.collection("users_active").doc(adminUid).get();
      const a = aSnap.data() as any;
      const adminName = displayNameOf(a);
      const adminEmail = norm(a?.email).toLowerCase();
      adminLabel = [adminName, adminEmail].filter(Boolean).join(" — ") || adminEmail || "Zarząd";
    }

    const term = `${formatDatePL(r?.startDate)} – ${formatDatePL(r?.endDate)}`;
    const itemsDesc = describeItems(r);
    const costHours = Number(r?.costHours || 0);
    const reason = norm(r?.cancelReason) || "(nie podano)";

    const detailLines = [
      `Sprzęt: ${itemsDesc}`,
      `Termin: ${term}`,
      `Powód: ${reason}`,
      `Anulował: ${adminLabel}`,
    ];
    if (costHours > 0) {
      detailLines.push(`Zwrócone godzinki: ${costHours} godz.`);
    }

    const userGreeting = userName ? `Cześć ${userName},` : "Cześć,";
    const userBody = [
      userGreeting,
      "",
      "Twoja rezerwacja sprzętu została anulowana przez Zarząd.",
      "",
      ...detailLines,
      "",
      "W razie pytań odezwij się do Zarządu: zarzad@morzkulc.pl",
      "",
      "SKK Morzkulc",
    ].join("\n");

    const boardUserLabel = [userName, userEmail].filter(Boolean).join(" — ") || userEmail;
    const boardBody = [
      `Rezerwacja sprzętu użytkownika ${boardUserLabel} została anulowana przez Zarząd (panel Zarządu — Wypożyczenia sprzętu).`,
      "",
      ...detailLines,
      "",
      "SKK Morzkulc — powiadomienie automatyczne",
    ].join("\n");

    const subject = "Anulowanie rezerwacji sprzętu przez Zarząd";
    const boardEmail = norm(ctx.config.adminNotify?.email).toLowerCase();

    let sent = 0;
    let errors = 0;

    try {
      await ctx.workspace.sendGenericEmail(userEmail, subject, userBody);
      sent++;
    } catch (e: any) {
      errors++;
      ctx.logger.error("gearNotifyReservationCancelledByAdmin: send to user failed", {
        reservationId: payload.reservationId,
        email: userEmail,
        message: e?.message,
      });
    }

    if (boardEmail && boardEmail.includes("@") && boardEmail !== userEmail) {
      try {
        await ctx.workspace.sendGenericEmail(boardEmail, subject, boardBody);
        sent++;
      } catch (e: any) {
        errors++;
        ctx.logger.error("gearNotifyReservationCancelledByAdmin: send to board failed", {
          reservationId: payload.reservationId,
          email: boardEmail,
          message: e?.message,
        });
      }
    }

    ctx.logger.info("gearNotifyReservationCancelledByAdmin: done", {reservationId: payload.reservationId, sent, errors});
    return {ok: errors === 0, message: `sent=${sent}, errors=${errors}`, details: {sent, errors}};
  },
};
