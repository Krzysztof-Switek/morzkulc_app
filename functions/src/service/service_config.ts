import * as functions from "firebase-functions";

export interface ServiceConfig {
  envName: string;
  jobsCollection: string;

  listaGroupEmail: string;
  membersGroupEmail: string;
  privilegedPosterGroups: string[];

  welcomeFromEmail: string;
  welcomeReplyToEmail: string;
  welcomeSubject: string;
  welcomeBodyText: (
    displayName: string | null,
    userEmail: string,
    listaAccess: "full" | "readonly" | "none"
  ) => string;

  adminRoleKeys: string[];
  memberRoleKeys: string[];
  godzinkiRoleKeys: string[];

  worker: {
    eventLockSeconds: number;
    fallbackSchedule: string;
    fallbackBatchSize: number;
    maxAttempts: number;
    backoffSeconds: number[];
  };

  workspace: {
    delegatedSubject: string;
  };

  sheets: {
    membersSpreadsheetId: string;
    membersTabName: string;
  };

  // ✅ NEW: Gear sheets config (manual sync for now)
  gear: {
    kayaksSpreadsheetId: string;
    kayaksTabName: string;
  };

  // ✅ NEW: Godzinki sheets config
  godzinki: {
    spreadsheetId: string;
    tabName: string;
  };

  // ✅ NEW: Events (imprezy) sheets config
  events: {
    spreadsheetId: string;
    tabName: string;
  };

  // ✅ NEW: Basen (pool) config
  basen: {
    adminEmail: string;
  };

  // ✅ NEW: Google Calendar config
  calendar: {
    calendarId: string; // empty string = calendar sync disabled
  };

  kurs: {
    spreadsheetId: string;
    tabName: string;
  };

  // ✅ Konta funkcyjne (sprzetowiec, szkoleniowiec, skarbnik, prezes).
  // Każde konto to USER w Workspace; operator wysyła "Wyślij jako" z SMTP + app password.
  // Forwarding 1:1 dla wszystkich 4 funkcji (na prywatny mail osoby pełniącej funkcję).
  // Prezes używa adresu `prezes@morzkulc.pl` (NIE `zarzad@` — to grupa Drive, nie wolno zamieniać na konto user).
  functionRoles: {
    sprzetowiec: { mailbox: string; label: { nominative: string; genitive: string; display: string } };
    szkoleniowiec: { mailbox: string; label: { nominative: string; genitive: string; display: string } };
    skarbnik: { mailbox: string; label: { nominative: string; genitive: string; display: string } };
    prezes: { mailbox: string; label: { nominative: string; genitive: string; display: string } };
  };

  // Adres na który task wysyła powiadomienia AKCJA dla admina (utwórz/usuń app password).
  adminActionEmail: string;
}

export function getServiceConfig(): ServiceConfig {
  const envName = process.env.ENV_NAME || "prod";

  const listaGroupEmail = process.env.SVC_LISTA_GROUP_EMAIL || "lista@morzkulc.pl";
  const membersGroupEmail = process.env.SVC_MEMBERS_GROUP_EMAIL || "czlonkowie@morzkulc.pl";

  const privilegedPosterGroupsRaw =
    process.env.SVC_PRIV_POSTER_GROUPS ||
    "sprzetowiec@morzkulc.pl,szkoleniowiec@morzkulc.pl,skarbnik@morzkulc.pl,prezes@morzkulc.pl";

  const welcomeFromEmail = process.env.SVC_WELCOME_FROM_EMAIL || "admin@morzkulc.pl";
  const welcomeReplyToEmail = process.env.SVC_WELCOME_REPLY_TO_EMAIL || "zarzad@morzkulc.pl";
  const welcomeSubject = process.env.SVC_WELCOME_SUBJECT || "Witamy w Morzkulc!";
  const delegatedSubject = process.env.SVC_WORKSPACE_DELEGATED_SUBJECT || "admin@morzkulc.pl";

  const adminRoleKeysRaw = process.env.SVC_ADMIN_ROLE_KEYS || "rola_zarzad,rola_kr";
  const memberRoleKeysRaw = process.env.SVC_MEMBER_ROLE_KEYS || "rola_czlonek,rola_zarzad,rola_kr,rola_kandydat";

  const membersSpreadsheetId =
    process.env.SVC_MEMBERS_SHEET_ID || "1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM";
  const membersTabName = process.env.SVC_MEMBERS_SHEET_TAB || "CZŁONKOWIE I SYMPATYCY";

  // ✅ gear defaults (you can override by env later)
  const kayaksSpreadsheetId =
    process.env.SVC_GEAR_KAYAKS_SHEET_ID || "1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI";
  const kayaksTabName = process.env.SVC_GEAR_KAYAKS_TAB || "Kajaki";

  // ✅ godzinki defaults — domyślnie ten sam arkusz co członkowie, zakładka "Godzinki"
  const godzinkiSpreadsheetId = process.env.SVC_GODZINKI_SHEET_ID || membersSpreadsheetId;
  const godzinkiTabName = process.env.SVC_GODZINKI_SHEET_TAB || "Godzinki";

  // ✅ events defaults — ten sam arkusz co członkowie, zakładka "imprezy"
  const eventsSpreadsheetId = process.env.SVC_EVENTS_SHEET_ID || membersSpreadsheetId;
  const eventsTabName = process.env.SVC_EVENTS_SHEET_TAB || "imprezy";

  const kursSpreadsheetId = process.env.SVC_KURS_SHEET_ID || "";
  const kursTabName = process.env.SVC_KURS_SHEET_TAB || "Kurs";

  const sprzetowiecMailbox = process.env.SVC_SPRZETOWIEC_MAILBOX_EMAIL || "sprzetowiec@morzkulc.pl";
  const szkoleniowiecMailbox = process.env.SVC_SZKOLENIOWIEC_MAILBOX_EMAIL || "szkoleniowiec@morzkulc.pl";
  const skarbnikMailbox = process.env.SVC_SKARBNIK_MAILBOX_EMAIL || "skarbnik@morzkulc.pl";
  const prezesMailbox = process.env.SVC_PREZES_MAILBOX_EMAIL || "prezes@morzkulc.pl";
  const adminActionEmail = process.env.SVC_ADMIN_ACTION_EMAIL || "zarzad@morzkulc.pl";

  const cfg: ServiceConfig = {
    envName,
    jobsCollection: "service_jobs",

    listaGroupEmail,
    membersGroupEmail,
    privilegedPosterGroups: privilegedPosterGroupsRaw.split(",").map((s) => s.trim()).filter(Boolean),

    welcomeFromEmail,
    welcomeReplyToEmail,
    welcomeSubject,
    welcomeBodyText: (
      displayName: string | null,
      _userEmail: string,
      listaAccess: "full" | "readonly" | "none"
    ) => {
      const name = (displayName || "").trim();
      const hello = name ? `Cześć ${name}!` : "Cześć!";
      const lista = cfg?.listaGroupEmail || "lista@morzkulc.pl";
      const replyTo = cfg?.welcomeReplyToEmail || "zarzad@morzkulc.pl";

      const calendarSection = [
        "Kalendarz klubowy SKK Morzkulc:",
        "Kliknij poniższy link, żeby dodać kalendarz z imprezami i wydarzeniami klubu do swoich kalendarzy Google:",
        "https://calendar.google.com/calendar/u/0?cid=Y19iN2E4OWI2M2NiYTIwNDljZjY1YjU0N2ZlMWQ4ZWY1NDZmOWQ0YWUxNjk1OTI1MjE0YjYwOWE5N2Y3MmMwOTA4QGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20",
        "",
        "Korzystasz z telefonu? Dodaj aplikację do ekranu głównego, żeby uruchamiać ją jak zwykłą apkę.",
        "Android: otwórz aplikację w Chrome, kliknij menu przeglądarki i wybierz \"Dodaj do ekranu głównego\".",
        "iPhone (iOS): otwórz aplikację w Safari, kliknij Udostępnij, a potem wybierz \"Do ekranu początkowego\".",
        "",
        `Pytania? Odpisz na tego maila — odpowiedź trafi do: ${replyTo}.`,
        "",
        "SKK Morzkulc",
      ];

      if (listaAccess === "none") {
        return [
          hello,
          "",
          "Witamy w aplikacji SKK Morzkulc!",
          "Twoje konto jest aktywne — możesz korzystać z aplikacji.",
          "",
          ...calendarSection,
        ].join("\n");
      }

      if (listaAccess === "readonly") {
        return [
          hello,
          "",
          "Witamy w workspace Morzkulc.",
          `Dodałem/am Cię do listy dyskusyjnej ${lista} jako obserwatora.`,
          "Możesz czytać i otrzymywać wiadomości, ale nie wysyłać.",
          "Kiedy Twój status się zmieni — otrzymasz pełny dostęp.",
          "",
          "Jak znaleźć grupę (lista nie jest publicznie wyszukiwalna):",
          "1) Wejdź w Google Groups: https://groups.google.com",
          "2) Zaloguj się na to samo konto Google, którym logujesz się do aplikacji",
          `3) Otwórz grupę: ${lista}`,
          "4) Ustaw odbieranie: „Moje ustawienia członkostwa” → „Subskrypcja” → „Każdy e-mail”",
          "",
          ...calendarSection,
        ].join("\n");
      }

      // listaAccess === "full"
      return [
        hello,
        "",
        "Witamy w workspace Morzkulc.",
        `Dodałem/am Cię do listy dyskusyjnej: ${lista}.`,
        "",
        "Jak szybko zacząć korzystać z listy:",
        "",
        "1) Wejdź w Google Groups: https://groups.google.com",
        `2) Otwórz grupę: ${lista}`,
        "3) Ustaw odbieranie wiadomości: kliknij „Moje ustawienia członkostwa” → „Subskrypcja” → wybierz „Każdy e-mail”.",
        "",
        "Jak opublikować wiadomość (najprościej):",
        `• Wyślij e-mail na adres: ${lista}`,
        "• Temat i treść jak zwykły mail — wiadomość pojawi się też w Google Groups w wątkach grupy.",
        "",
        "Jeśli nie widzisz grupy w Google Groups:",
        "• Upewnij się, że jesteś zalogowany/a na to samo konto Google, którym logujesz się do aplikacji.",
        "• Otwórz https://groups.google.com i wyszukaj grupę.",
        "• Sprawdź folder Spam w Gmailu.",
        "",
        ...calendarSection,
      ].join("\n");
    },

    adminRoleKeys: adminRoleKeysRaw.split(",").map((s) => s.trim()).filter(Boolean),
    memberRoleKeys: memberRoleKeysRaw.split(",").map((s) => s.trim()).filter(Boolean),
    godzinkiRoleKeys: (() => {
      const raw = process.env.SVC_GODZINKI_ROLE_KEYS || "";
      if (raw) return raw.split(",").map((s) => s.trim()).filter(Boolean);
      const base = memberRoleKeysRaw.split(",").map((s) => s.trim()).filter(Boolean);
      return [...new Set([...base, "rola_kandydat"])];
    })(),

    worker: {
      eventLockSeconds: Number(process.env.SVC_WORKER_EVENT_LOCK_SECONDS || 120),
      fallbackSchedule: "every day 03:30",
      fallbackBatchSize: Number(process.env.SVC_WORKER_FALLBACK_BATCH_SIZE || 25),
      maxAttempts: Number(process.env.SVC_WORKER_MAX_ATTEMPTS || 5),
      backoffSeconds: [30, 60, 120, 300, 900],
    },

    workspace: {
      delegatedSubject,
    },

    sheets: {
      membersSpreadsheetId,
      membersTabName,
    },

    gear: {
      kayaksSpreadsheetId,
      kayaksTabName,
    },

    godzinki: {
      spreadsheetId: godzinkiSpreadsheetId,
      tabName: godzinkiTabName,
    },

    events: {
      spreadsheetId: eventsSpreadsheetId,
      tabName: eventsTabName,
    },

    basen: {
      adminEmail: process.env.SVC_BASEN_ADMIN_EMAIL || "",
    },

    calendar: {
      calendarId: process.env.SVC_CALENDAR_ID || "",
    },

    kurs: {
      spreadsheetId: kursSpreadsheetId,
      tabName: kursTabName,
    },

    functionRoles: {
      sprzetowiec: {
        mailbox: sprzetowiecMailbox,
        label: {nominative: "sprzętowiec", genitive: "sprzętowca", display: "Sprzętowiec SKK"},
      },
      szkoleniowiec: {
        mailbox: szkoleniowiecMailbox,
        label: {nominative: "szkoleniowiec", genitive: "szkoleniowca", display: "Szkoleniowiec SKK"},
      },
      skarbnik: {
        mailbox: skarbnikMailbox,
        label: {nominative: "skarbnik", genitive: "skarbnika", display: "Skarbnik SKK"},
      },
      prezes: {
        mailbox: prezesMailbox,
        label: {nominative: "prezes", genitive: "prezesa", display: "Zarząd SKK"},
      },
    },

    adminActionEmail,
  };

  if (!cfg.listaGroupEmail.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid lista group email");
  }
  if (!cfg.welcomeFromEmail.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid welcome from email");
  }
  if (!cfg.welcomeReplyToEmail.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid welcome reply-to email");
  }
  if (!cfg.workspace.delegatedSubject.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid delegated subject email");
  }

  if (!cfg.sheets.membersSpreadsheetId) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid members sheet id");
  }
  if (!cfg.sheets.membersTabName) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid members sheet tab");
  }

  if (!cfg.gear.kayaksSpreadsheetId) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid gear kayaks sheet id");
  }
  if (!cfg.gear.kayaksTabName) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid gear kayaks tab name");
  }

  if (!cfg.functionRoles.sprzetowiec.mailbox.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid sprzetowiec mailbox email");
  }
  if (!cfg.functionRoles.szkoleniowiec.mailbox.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid szkoleniowiec mailbox email");
  }
  if (!cfg.functionRoles.skarbnik.mailbox.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid skarbnik mailbox email");
  }
  if (!cfg.functionRoles.prezes.mailbox.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid prezes mailbox email");
  }
  if (!cfg.adminActionEmail.includes("@")) {
    throw new functions.https.HttpsError("failed-precondition", "Invalid adminActionEmail");
  }

  return cfg;
}
