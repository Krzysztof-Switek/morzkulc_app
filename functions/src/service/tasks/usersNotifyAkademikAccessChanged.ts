import {ServiceTask} from "../types";

/**
 * Task: users.notifyAkademikAccessChanged
 *
 * Wysyła e-mail do użytkownika po zmianie uprawnienia „Dostęp akademik" (odbiór
 * kluczy do siedziby z akademika) wykrytej przy synchronizacji arkusza
 * (users.syncFieldsFromSheet). Jedno zadanie obsługuje zarówno nadanie, jak
 * i cofnięcie — rozróżnia payload.granted.
 */

type Payload = {
  uid: string;
  email: string;
  name: string;
  granted: boolean;
};

function norm(v: any): string {
  return String(v == null ? "" : v).trim();
}

export const usersNotifyAkademikAccessChangedTask: ServiceTask<Payload> = {
  id: "users.notifyAkademikAccessChanged",
  description: "Wysyła e-mail o nadaniu/cofnięciu dostępu do odbioru kluczy z akademika.",

  validate: (payload) => {
    if (!payload?.uid) throw new Error("Missing uid in payload");
    if (!payload?.email || !payload.email.includes("@")) throw new Error("Missing/invalid email in payload");
    if (typeof payload?.granted !== "boolean") throw new Error("Missing granted (boolean) in payload");
  },

  run: async (payload, ctx) => {
    const email = norm(payload.email).toLowerCase();
    const name = norm(payload.name);
    const greeting = name ? `Cześć ${name},` : "Cześć,";

    // Adres, pod którym znajdują się klucze — zmienna setup/vars_members.akademik_adres
    // (ta sama zakładka SETUP co konto_klubowe/statut_url itp.). Opcjonalna — pomijamy
    // linię, gdy zmienna nie istnieje jeszcze w arkuszu.
    const varsSnap = await ctx.firestore.collection("setup").doc("vars_members").get();
    const akademikAdres = norm((varsSnap.exists ? (varsSnap.data() as any)?.vars?.akademik_adres?.value : "") ?? "");

    const subject = payload.granted ?
      "Dostęp do akademika — nadanie uprawnienia" :
      "Dostęp do akademika — cofnięcie uprawnienia";

    const status = payload.granted ? "dodany/a do listy" : "usunięty/a z listy";
    const bodyLines = [
      greeting,
      "",
      "Informujemy, że lista uprawnionych do pobierania kluczy z akademika została zaktualizowana.",
      `Zostałeś/aś ${status}.`,
    ];
    if (payload.granted && akademikAdres) {
      bodyLines.push("", `Adres, pod którym znajdują się klucze: ${akademikAdres}`);
    }
    bodyLines.push("", "SKK Morzkulc");
    const body = bodyLines.join("\n");

    try {
      await ctx.workspace.sendGenericEmail(email, subject, body);
      ctx.logger.info("usersNotifyAkademikAccessChanged: sent", {uid: payload.uid, email, granted: payload.granted});
      return {ok: true, message: `sent to ${email} (granted=${payload.granted})`};
    } catch (e: any) {
      ctx.logger.error("usersNotifyAkademikAccessChanged: send failed", {uid: payload.uid, email, message: e?.message});
      return {ok: false, message: e?.message || "send failed"};
    }
  },
};
