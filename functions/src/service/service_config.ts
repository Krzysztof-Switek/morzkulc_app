import * as functions from "firebase-functions";

export interface ServiceConfig {
  envName: string;
  jobsCollection: string;

  listaGroupEmail: string;
  privilegedPosterGroups: string[];

  welcomeFromEmail: string;
  welcomeReplyToEmail: string;
  welcomeSubject: string;
  welcomeBodyText: (displayName: string | null, userEmail: string) => string;

  adminRoleKeys: string[];

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
}

export function getServiceConfig(): ServiceConfig {
  const envName = process.env.ENV_NAME || "prod";

  const listaGroupEmail = process.env.SVC_LISTA_GROUP_EMAIL || "lista@morzkulc.pl";

  const privilegedPosterGroupsRaw =
    process.env.SVC_PRIV_POSTER_GROUPS || "zarzad_skk@morzkulc.pl,kr@morzkulc.pl,czlonkowie@morzkulc.pl";

  const welcomeFromEmail = process.env.SVC_WELCOME_FROM_EMAIL || "admin@morzkulc.pl";
  const welcomeReplyToEmail = process.env.SVC_WELCOME_REPLY_TO_EMAIL || "zarzad@morzkulc.pl";
  const welcomeSubject = process.env.SVC_WELCOME_SUBJECT || "Witamy w Morzkulc!";
  const delegatedSubject = process.env.SVC_WORKSPACE_DELEGATED_SUBJECT || "admin@morzkulc.pl";

  const adminRoleKeysRaw = process.env.SVC_ADMIN_ROLE_KEYS || "rola_zarzad,rola_kr";

  const membersSpreadsheetId =
    process.env.SVC_MEMBERS_SHEET_ID || "1lF5eDF9B6ip4G497qG1QGePXqrXdLPS8kt-3pX-ZBsM";
  const membersTabName = process.env.SVC_MEMBERS_SHEET_TAB || "CZŁONKOWIE I SYMPATYCY";

  // ✅ gear defaults (you can override by env later)
  const kayaksSpreadsheetId =
    process.env.SVC_GEAR_KAYAKS_SHEET_ID || "1eUjW_hyhHBlv4lRTNYS3wcltUarV5G6FiH_b5kujgRI";
  const kayaksTabName = process.env.SVC_GEAR_KAYAKS_TAB || "Kajaki";

  const cfg: ServiceConfig = {
    envName,
    jobsCollection: "service_jobs",

    listaGroupEmail,
    privilegedPosterGroups: privilegedPosterGroupsRaw.split(",").map((s) => s.trim()).filter(Boolean),

    welcomeFromEmail,
    welcomeReplyToEmail,
    welcomeSubject,
    welcomeBodyText: (displayName: string | null, _userEmail: string) => {
      const name = (displayName || "").trim();
      const hello = name ? `Cześć ${name}!` : "Cześć!";

      return [
        hello,
        "",
        "Witamy w workspace Morzkulc.",
        `Dodałem/am Cię do listy dyskusyjnej: ${cfg?.listaGroupEmail || "lista@morzkulc.pl"}.`,
        "",
        "Jak szybko zacząć korzystać z listy:",
        "",
        "1) Wejdź w Google Groups: https://groups.google.com",
        `2) Otwórz grupę: ${cfg?.listaGroupEmail || "lista@morzkulc.pl"}`,
        "3) Ustaw odbieranie wiadomości: kliknij „Moje ustawienia członkostwa” → „Subskrypcja” → wybierz „Każdy e-mail”.",
        "",
        "Jak opublikować wiadomość (najprościej):",
        `• Wyślij e-mail na adres: ${cfg?.listaGroupEmail || "lista@morzkulc.pl"}`,
        "• Temat i treść jak zwykły mail — wiadomość pojawi się też w Google Groups w wątkach grupy.",
        "",
        "Jeśli nie widzisz grupy w Google Groups:",
        "• Upewnij się, że jesteś zalogowany/a na to samo konto Google, którym logujesz się do aplikacji.",
        "• Otwórz https://groups.google.com i wyszukaj grupę.",
        "• Sprawdź folder Spam w Gmailu.",
        "",
        `Pytania? Odpisz na tego maila — odpowiedź trafi do: ${cfg?.welcomeReplyToEmail || "zarzad@morzkulc.pl"}.`,
        "",
        "SKK Morzkulc",
      ].join("\n");
    },

    adminRoleKeys: adminRoleKeysRaw.split(",").map((s) => s.trim()).filter(Boolean),

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

  return cfg;
}
