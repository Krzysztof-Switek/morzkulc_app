import * as admin from "firebase-admin";
import {ServiceTask} from "../types";

type Payload = {
  dry?: boolean;
};

type FunctionRoleKey = "sprzetowiec" | "szkoleniowiec" | "skarbnik" | "prezes";

const ROLE_KEYS: FunctionRoleKey[] = ["sprzetowiec", "szkoleniowiec", "skarbnik", "prezes"];

type CaseType = "no-op" | "onboard" | "offboard" | "switch";

function decideCase(prev: string, target: string): CaseType {
  if (!prev && !target) return "no-op";
  if (prev === target) return "no-op";
  if (!prev && target) return "onboard";
  if (prev && !target) return "offboard";
  return "switch";
}

/** Parsuje wartość setupVar do pojedynczego emaila. */
function parseSingleEmail(raw: any): {ok: boolean; email: string; reason?: string} {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return {ok: true, email: ""};
  // Wielokrotne wartości (przecinek/średnik) — sztywna reguła 1:1 nie pozwala.
  if (s.includes(",") || s.includes(";")) {
    return {ok: false, email: "", reason: "zawiera wiele adresów (przecinek lub średnik)"};
  }
  const lower = s.toLowerCase();
  if (!lower.includes("@") || lower.startsWith("@") || lower.endsWith("@")) {
    return {ok: false, email: "", reason: `nieprawidłowy format emaila: "${s}"`};
  }
  return {ok: true, email: lower};
}

/** local-part emaila → handle dla nazwy app password (kropki → myślniki). */
function operatorHandle(email: string): string {
  const localPart = String(email || "").split("@")[0] || email;
  return localPart.replace(/\./g, "-");
}

function buildAdminAlertBody(reasons: string[]): string {
  return [
    "Cześć,",
    "",
    "Próba sync setup wykryła niezgodność. Sync NIE został wykonany —",
    "żadne konta funkcyjne nie zostały zmienione.",
    "",
    "Wykryte problemy:",
    ...reasons.map((r) => `- ${r}`),
    "",
    "Popraw arkusz setup i ponów sync.",
    "",
    "— Automat SKK",
  ].join("\n");
}

function buildAdminOnboardingBody(
  roleNominative: string,
  mailbox: string,
  operatorEmail: string,
  operatorHandleStr: string,
  operatorWelcomeTemplate: string
): string {
  return [
    "Cześć,",
    "",
    `W arkuszu setup dopisany został nowy ${roleNominative}:`,
    `   ${operatorEmail}`,
    "",
    "Twoja akcja (2-3 minuty):",
    "",
    `1. Zaloguj się na ${mailbox}.`,
    "2. Kliknij awatar → Zarządzaj kontem Google.",
    "3. Wejdź w Zabezpieczenia i logowanie.",
    "4. Kliknij Weryfikacja dwuetapowa.",
    "5. Na dole kliknij Hasła do aplikacji.",
    `6. W polu Nazwa aplikacji wpisz: ${operatorHandleStr}-smtp`,
    "7. Kliknij Utwórz.",
    "8. Skopiuj wygenerowane 16-znakowe hasło.",
    "9. Wyślij operatorowi mail z szablonu poniżej — podmień <HASLO_TUTAJ> na hasło z punktu 8.",
    "",
    "—— SZABLON DO WYSŁANIA (kopiuj od tu) ——",
    "",
    operatorWelcomeTemplate,
    "",
    "—— KONIEC SZABLONU ——",
    "",
    `Auto-forwarding ze skrzynki ${mailbox} został już ustawiony przez system.`,
    "Kod weryfikacyjny Gmaila przy konfiguracji \"Wyślij jako\" dojdzie automatycznie",
    "na adres operatora.",
    "",
    "— Automat SKK",
  ].join("\n");
}

function buildOperatorWelcomeTemplate(
  roleGenitive: string,
  displayName: string,
  mailbox: string,
  operatorEmail: string
): string {
  return [
    `Do: ${operatorEmail}`,
    `Temat: Funkcja ${roleGenitive} SKK Morzkulc — konfiguracja skrzynki`,
    "",
    "Cześć!",
    "",
    `Zostałeś dopisany do funkcji ${roleGenitive} w SKK Morzkulc.`,
    `Od teraz możesz wysyłać oficjalne maile z adresu ${mailbox}`,
    "korzystając ze swojej zwykłej skrzynki Gmail.",
    "",
    "Konfiguracja jednorazowa (5 min):",
    "",
    "1. W Gmailu kliknij koło zębate → \"Zobacz wszystkie ustawienia\".",
    "2. Zakładka \"Konta i import\".",
    "3. Sekcja \"Wyślij pocztę jako\" → \"Dodaj inny adres e-mail\".",
    "4. W okienku:",
    `   • Nazwa: ${displayName}`,
    `   • Adres e-mail: ${mailbox}`,
    "   • Zaznacz \"Traktuj jako alias\"",
    "   Kliknij \"Dalej\".",
    "5. W kolejnym oknie podaj:",
    "   • Serwer SMTP: smtp.gmail.com",
    "   • Port: 587",
    `   • Nazwa użytkownika: ${mailbox}`,
    "   • Hasło: <HASLO_TUTAJ>",
    "   • Zaznacz \"Połączenie zabezpieczone TLS\"",
    "   Kliknij \"Dodaj konto\".",
    `6. Gmail wyśle kod weryfikacyjny na ${mailbox} — automatycznie dojdzie`,
    "   na Twoją skrzynkę.",
    "   Wpisz kod → \"Zweryfikuj\".",
    "",
    "Gotowe. Od teraz przy pisaniu nowej wiadomości w Gmailu możesz rozwinąć",
    `pole "Od" i wybrać ${mailbox}.`,
    "",
    "Odpowiedzi na wiadomości wysłane z tego adresu trafiają automatycznie",
    "na Twoją prywatną skrzynkę.",
    "",
    "W razie problemów: napisz na zarzad@morzkulc.pl.",
    "",
    "SKK Morzkulc",
  ].join("\n");
}

function buildOperatorWaitBody(roleGenitive: string, mailbox: string): string {
  return [
    "Cześć!",
    "",
    `Zostałeś dopisany do funkcji ${roleGenitive} w SKK Morzkulc.`,
    "W ciągu najbliższych godzin admin przygotuje dla Ciebie hasło SMTP",
    `do skrzynki funkcyjnej ${mailbox} i wyśle Ci osobnego maila z`,
    "instrukcją konfiguracji w Gmailu.",
    "",
    "W międzyczasie nic nie musisz robić — czekaj na maila od zarzad@morzkulc.pl.",
    "",
    "SKK Morzkulc",
  ].join("\n");
}

function buildAdminOffboardingBody(
  roleGenitive: string,
  mailbox: string,
  operatorEmail: string,
  operatorHandleStr: string,
  forwardingChangeDescription: string
): string {
  return [
    "Cześć,",
    "",
    `W arkuszu setup usunięty/zmieniony został ${roleGenitive}:`,
    `   ${operatorEmail}  (poprzedni)`,
    "",
    "Twoja akcja (1 minuta):",
    "",
    `1. Zaloguj się na konto ${mailbox}`,
    "2. Zarządzaj kontem Google → Bezpieczeństwo → Hasła do aplikacji",
    "3. Znajdź pozycję o nazwie:",
    `      ${operatorHandleStr}-smtp`,
    "4. Kliknij \"Usuń\".",
    "",
    `Skutek: operator natychmiast dostanie błąd 535 przy próbie wysyłki z aliasu ${mailbox}.`,
    "",
    `${forwardingChangeDescription}`,
    "Operator dostał osobnym mailem informację o cofnięciu.",
    "",
    "— Automat SKK",
  ].join("\n");
}

function buildOperatorOffboardingBody(roleGenitive: string, mailbox: string): string {
  return [
    "Cześć!",
    "",
    `Twoja funkcja ${roleGenitive} w SKK Morzkulc została cofnięta.`,
    "W ciągu najbliższych godzin admin dezaktywuje Twoje hasło SMTP do",
    `skrzynki ${mailbox}. Od tej chwili Gmail zwróci błąd przy próbie`,
    "wysyłki z tego aliasu.",
    "",
    "Możesz teraz usunąć alias ze swoich ustawień Gmail:",
    `   Ustawienia → "Konta i import" → przy ${mailbox} → "usuń".`,
    "",
    `Reply na maile, które wysłałeś jako ${roleGenitive}, nie będą już do`,
    "Ciebie wracać — przejdą do następnego operatora funkcji (lub do",
    "skrzynki funkcyjnej do czasu obsadzenia).",
    "",
    "Jeśli to pomyłka, odezwij się do zarządu.",
    "",
    "SKK Morzkulc",
  ].join("\n");
}

export const usersSyncFunctionRolesFromSetupTask: ServiceTask<Payload> = {
  id: "users.syncFunctionRolesFromSetup",
  description: "Synchronizuje konta funkcyjne (sprzetowiec/szkoleniowiec/skarbnik/prezes): ustawia forwarding, alarmuje admina o app password, powiadamia operatorów.",

  validate: (_payload) => {
    // no required fields
  },

  run: async (payload, ctx) => {
    const {firestore, config, workspace, logger} = ctx;
    const dryRun = ctx.dryRun || Boolean(payload?.dry);

    logger.info("syncFunctionRoles: start", {
      dryRun,
      adminActionEmail: config.adminActionEmail,
    });

    // 1) Wczytaj setup vars
    const varsSnap = await firestore.collection("setup").doc("vars_members").get();
    const vars = (varsSnap.exists ? (varsSnap.data() as any)?.vars : null) || {};

    // 2) Parsuj wartości per rola
    const targets: Record<FunctionRoleKey, string> = {
      sprzetowiec: "",
      szkoleniowiec: "",
      skarbnik: "",
      prezes: "",
    };
    const parseErrors: string[] = [];
    for (const role of ROLE_KEYS) {
      const parsed = parseSingleEmail(vars?.[role]?.value);
      if (!parsed.ok) {
        parseErrors.push(`Zmienna "${role}": ${parsed.reason}`);
      } else {
        targets[role] = parsed.email;
      }
    }

    // 3) Walidacja krzyżowa: rozłączność
    const emailToRoles: Record<string, FunctionRoleKey[]> = {};
    for (const role of ROLE_KEYS) {
      const email = targets[role];
      if (!email) continue;
      emailToRoles[email] = emailToRoles[email] || [];
      emailToRoles[email].push(role);
    }
    const conflicts = Object.entries(emailToRoles).filter(([, roles]) => roles.length > 1);
    const conflictReasons = conflicts.map(
      ([email, roles]) => `"${email}" jest w wielu funkcjach: ${roles.join(", ")}`
    );

    // 4) Walidacja: rola_zarzad w users_active (pole role_key)
    const allEmails = Array.from(new Set(Object.values(targets).filter(Boolean)));
    const missingZarzad: string[] = [];
    if (allEmails.length > 0) {
      const usersSnap = await firestore
        .collection("users_active")
        .where("role_key", "==", "rola_zarzad")
        .get();
      const zarzadEmails = new Set<string>();
      usersSnap.forEach((d) => {
        const e = String((d.data() as any)?.email || "").toLowerCase();
        if (e) zarzadEmails.add(e);
      });
      for (const email of allEmails) {
        if (!zarzadEmails.has(email)) missingZarzad.push(email);
      }
    }
    const zarzadReasons = missingZarzad.map(
      (e) => `"${e}" nie ma roli "rola_zarzad" w users_active`
    );

    const allReasons = [...parseErrors, ...conflictReasons, ...zarzadReasons];
    if (allReasons.length > 0) {
      logger.error("syncFunctionRoles: validation FAILED", {reasons: allReasons});
      if (!dryRun) {
        try {
          await workspace.sendGenericEmail(
            config.adminActionEmail,
            "[Morzkulc][BŁĄD] Konflikt w setup — funkcje nie są rozłączne",
            buildAdminAlertBody(allReasons)
          );
        } catch (e: any) {
          logger.error("syncFunctionRoles: admin alert email failed", {message: e?.message});
        }
      }
      return {
        ok: false,
        message: "Walidacja setup nie powiodła się — sync nie wykonany",
        details: {reasons: allReasons},
      };
    }

    // 5) Per rola: zdecyduj CASE i wykonaj
    const stateRef = firestore.collection("service_state").doc("function_roles");
    const prevSnap = await stateRef.get();
    const prevState = (prevSnap.exists ? (prevSnap.data() as any) : null) || {};

    const newStatePartial: Record<string, any> = {};
    const details: Record<string, unknown> = {};

    for (const role of ROLE_KEYS) {
      const target = targets[role];
      const prev = String(prevState?.[role]?.email || "");
      const cfg = config.functionRoles[role];
      const mailbox = cfg.mailbox;
      const label = cfg.label;

      const caseType = decideCase(prev, target);
      logger.info("syncFunctionRoles: case decided", {role, mailbox, prev, target, case: caseType});

      try {
        switch (caseType) {
        case "no-op":
          details[role] = {noChange: true, email: prev};
          break;

        case "onboard": {
          let forwardingActivated = dryRun;
          if (!dryRun) {
            const fwdStatus = await workspace.addForwardingAddress(mailbox, target);
            if (fwdStatus === "added" || fwdStatus === "already") {
              await workspace.setAutoForwardRule(mailbox, target, "archive");
              forwardingActivated = true;
            } else {
              // "pending" — Google wysłał email weryfikacyjny do operatora; auto-forward zostanie
              // aktywowany przy następnym uruchomieniu taska (po kliknięciu linku).
              logger.info("syncFunctionRoles: forwarding address pending verification — retry after operator clicks link", {
                role, mailbox, target,
              });
            }
          }

          const handleStr = operatorHandle(target);
          const opTemplate = buildOperatorWelcomeTemplate(
            label.genitive,
            label.display,
            mailbox,
            target
          );

          if (!dryRun) {
            try {
              await workspace.sendGenericEmail(
                config.adminActionEmail,
                `[Morzkulc][AKCJA] Nowy ${label.nominative} — utwórz app password`,
                buildAdminOnboardingBody(label.nominative, mailbox, target, handleStr, opTemplate)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: admin onboard email failed (non-fatal)", {
                role, message: e?.message,
              });
            }
            try {
              await workspace.sendGenericEmail(
                target,
                `Funkcja ${label.genitive} SKK Morzkulc — przygotowujemy dostęp`,
                buildOperatorWaitBody(label.genitive, mailbox)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: operator wait email failed (non-fatal)", {
                role, target, message: e?.message,
              });
            }
          }

          details[role] = {case: "onboard", added: target, forwardingActivated};
          break;
        }

        case "offboard": {
          if (!dryRun) {
            await workspace.disableAutoForwardRule(mailbox);
            await workspace.removeForwardingAddress(mailbox, prev);
          }

          const handleStr = operatorHandle(prev);
          const forwardingDesc = "Auto-forwarding ze skrzynki zostało wyłączone przez system.";

          if (!dryRun) {
            try {
              await workspace.sendGenericEmail(
                config.adminActionEmail,
                `[Morzkulc][AKCJA] Cofnięcie funkcji ${label.genitive} — usuń app password`,
                buildAdminOffboardingBody(label.genitive, mailbox, prev, handleStr, forwardingDesc)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: admin offboard email failed (non-fatal)", {
                role, message: e?.message,
              });
            }
            try {
              await workspace.sendGenericEmail(
                prev,
                `Funkcja ${label.genitive} SKK Morzkulc — cofnięcie`,
                buildOperatorOffboardingBody(label.genitive, mailbox)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: operator offboard email failed (non-fatal)", {
                role, prev, message: e?.message,
              });
            }
          }

          details[role] = {case: "offboard", removed: prev};
          break;
        }

        case "switch": {
          const oldHandle = operatorHandle(prev);
          const newHandle = operatorHandle(target);

          let forwardingActivated = dryRun;
          if (!dryRun) {
            const fwdStatus = await workspace.addForwardingAddress(mailbox, target);
            if (fwdStatus === "added" || fwdStatus === "already") {
              await workspace.setAutoForwardRule(mailbox, target, "archive");
              forwardingActivated = true;
            } else {
              logger.info("syncFunctionRoles: switch — forwarding address pending verification", {
                role, mailbox, target,
              });
            }
            await workspace.removeForwardingAddress(mailbox, prev);
          }

          const opTemplate = buildOperatorWelcomeTemplate(
            label.genitive,
            label.display,
            mailbox,
            target
          );
          const forwardingDescOff = `Auto-forwarding przepięte na nowego operatora (${target}).`;

          if (!dryRun) {
            // Najpierw offboard staremu
            try {
              await workspace.sendGenericEmail(
                config.adminActionEmail,
                `[Morzkulc][AKCJA] Cofnięcie funkcji ${label.genitive} — usuń app password`,
                buildAdminOffboardingBody(label.genitive, mailbox, prev, oldHandle, forwardingDescOff)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: admin offboard email failed (non-fatal)", {
                role, message: e?.message,
              });
            }
            try {
              await workspace.sendGenericEmail(
                prev,
                `Funkcja ${label.genitive} SKK Morzkulc — cofnięcie`,
                buildOperatorOffboardingBody(label.genitive, mailbox)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: operator offboard email failed (non-fatal)", {
                role, prev, message: e?.message,
              });
            }

            // Potem onboard nowemu
            try {
              await workspace.sendGenericEmail(
                config.adminActionEmail,
                `[Morzkulc][AKCJA] Nowy ${label.nominative} — utwórz app password`,
                buildAdminOnboardingBody(label.nominative, mailbox, target, newHandle, opTemplate)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: admin onboard email failed (non-fatal)", {
                role, message: e?.message,
              });
            }
            try {
              await workspace.sendGenericEmail(
                target,
                `Funkcja ${label.genitive} SKK Morzkulc — przygotowujemy dostęp`,
                buildOperatorWaitBody(label.genitive, mailbox)
              );
            } catch (e: any) {
              logger.error("syncFunctionRoles: operator wait email failed (non-fatal)", {
                role, target, message: e?.message,
              });
            }
          }

          details[role] = {case: "switch", from: prev, to: target, forwardingActivated};
          break;
        }
        }
      } catch (e: any) {
        logger.error("syncFunctionRoles: role processing FAILED", {
          role, mailbox, message: e?.message, code: e?.code,
        });
        throw e; // fatal — jobProcessor zrobi retry
      }

      newStatePartial[role] = {
        mailbox,
        email: target,
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    if (!dryRun) {
      await stateRef.set(newStatePartial, {merge: true});
    }

    logger.info("syncFunctionRoles: done", {details, dryRun});
    return {
      ok: true,
      message: "Function roles synced",
      details,
    };
  },
};
