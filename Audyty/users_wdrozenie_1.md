# Wdrożenie: Obsługa kursantów — lista dyskusyjna i maile

Data planu: 2026-05-13

## Kontekst i cel

Użytkownicy z rolą `rola_kursant` nie powinni trafiać na listę dyskusyjną lista@morzkulc.pl.
Sympatycy mają dostęp tylko do odczytu (bez możliwości wysyłania). Kandydaci, członkowie, zarząd
i KR mają pełny dostęp (odczyt + wysyłanie). Każda zmiana roli powinna aktualizować dostęp do
listy i wysyłać mail informacyjny.

**Zidentyfikowany problem w kodzie:** `onUserRegisteredWelcome.ts` step B (linia 59) dodaje
WSZYSTKICH użytkowników do lista@ bez sprawdzania roli. `enforceListaPostingPolicy()` jest
zdefiniowana w providerze (`googleWorkspaceProvider.ts:136`) ale nigdzie nie wywoływana —
ustawienie grupy na `ALL_MANAGERS_CAN_POST` nie zostało jeszcze zastosowane w Google Groups.

---

## Prawa do lista@ według roli

| Rola | Dostęp do lista@ | Rola w grupie Google |
|---|---|---|
| `rola_kursant` | brak | nie dodawany |
| `rola_sympatyk` | tylko odczyt | `MEMBER` |
| `rola_kandydat` | pełny (odczyt + wysyłanie) | `MANAGER` |
| `rola_czlonek` | pełny | `MANAGER` |
| `rola_zarzad` | pełny | `MANAGER` |
| `rola_kr` | pełny | `MANAGER` |

Rozróżnienie MEMBER vs MANAGER działa dzięki ustawieniu grupy `whoCanPostMessage = ALL_MANAGERS_CAN_POST`
— provider już ma `enforceListaPostingPolicy()` która to ustawia, ale trzeba ją wywołać (Krok 0).

Możliwe ścieżki zmiany roli:
- Kursant → tylko na kandydata (nie bezpośrednio na członka)
- Następnie kandydat → czlonek, sympatyk itp.

---

## Infrastruktura już dostępna (nie trzeba zmieniać)

- `workspace.addMemberToGroup(group, email, "MEMBER"|"MANAGER")` — obsługuje role i
  **automatycznie aktualizuje** rolę jeśli użytkownik już jest w grupie
  (`providers/googleWorkspaceProvider.ts:84-125`)
- `workspace.removeMemberFromGroup(group, email)` — usuwa z grupy
- `workspace.enforceListaPostingPolicy(listaEmail, privilegedGroups)` — ustawia
  `ALL_MANAGERS_CAN_POST` (zdefiniowana ale nigdy niewywoływana — `googleWorkspaceProvider.ts:136`)

---

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `functions/src/service/service_config.ts` | `welcomeBodyText` przyjmuje `listaAccess` zamiast zakładać "full" dla każdego |
| `functions/src/service/tasks/onUserRegisteredWelcome.ts` | Step B: rola → właściwy dostęp do listy; Step A: email zależny od roli |
| `functions/src/service/tasks/usersSyncRolesFromSheet.ts` | Każda zmiana roli → aktualizacja lista@ + mail z info |
| `functions/src/service/registry.ts` | Nowy task `lista.enforcePostingPolicy` |

---

## Krok 0 — jednorazowe zastosowanie ustawień grupy (przed lub zaraz po wdrożeniu)

`enforceListaPostingPolicy` jest nigdzie nie wywoływana. Ustawienie `ALL_MANAGERS_CAN_POST`
musi być zastosowane zanim MEMBER vs MANAGER zacznie mieć znaczenie dla praw wysyłania.

**Plan:** Dodać do `functions/src/service/registry.ts` nowy task jednorazowy:

```typescript
{
  id: "lista.enforcePostingPolicy",
  description: "Ustaw lista@: ALL_MANAGERS_CAN_POST, privileged groups jako MANAGER",
  validate: (_payload) => {},
  run: async (_payload, ctx) => {
    await ctx.workspace.enforceListaPostingPolicy(
      ctx.config.listaGroupEmail,
      ctx.config.privilegedPosterGroups
    );
    return { ok: true };
  }
}
```

Po wdrożeniu wywołać raz przez `adminRunServiceTask`.

---

## Krok 1 — `service_config.ts`: parametryczny mail powitalny

### Zmiana interfejsu (linia 14)

```typescript
// PRZED:
welcomeBodyText: (displayName: string | null, userEmail: string) => string;

// PO:
welcomeBodyText: (displayName: string | null, userEmail: string,
  listaAccess: "full" | "readonly" | "none") => string;
```

### Zmiana implementacji w `getServiceConfig()` (linia 119)

Funkcja `welcomeBodyText` generuje email z wariantem sekcji lista@ zależnym od `listaAccess`:

**`listaAccess === "none"` (kursant):**
```
[imię],

Witamy w aplikacji SKK Morzkulc!
Twoje konto jest aktywne — możesz korzystać z aplikacji.

[sekcja kalendarza]
[sekcja PWA install]
[pytania → zarzad@]
```

**`listaAccess === "readonly"` (sympatyk):**
```
[imię],

Witamy w workspace Morzkulc.
Dodałem/am Cię do listy dyskusyjnej lista@morzkulc.pl jako obserwatora.
Możesz czytać i otrzymywać wiadomości, ale nie wysyłać.
Kiedy Twój status się zmieni — otrzymasz pełny dostęp.

Jak znaleźć grupę (lista nie jest publicznie wyszukiwalna):
1) Wejdź w Google Groups: https://groups.google.com
2) Zaloguj się na to samo konto Google, którym logujesz się do aplikacji
3) Otwórz grupę: lista@morzkulc.pl
4) Ustaw odbieranie: „Moje ustawienia członkostwa" → „Subskrypcja" → „Każdy e-mail"

[sekcja kalendarza]
[sekcja PWA install]
[pytania → zarzad@]
```

**`listaAccess === "full"` (kandydat, czlonek, zarzad, kr):**
```
Obecna treść maila powitalnego (bez zmian w tej sekcji)
```

Sekcja kalendarza i instalacja PWA pozostają we wszystkich wariantach.

---

## Krok 2 — `onUserRegisteredWelcome.ts`: rola → dostęp do listy

### Pomocnicza funkcja (dodać po `MEMBER_LEVEL_ROLES`, ~linia 22)

```typescript
function listaRoleForUserRole(roleKey: string): "MANAGER" | "MEMBER" | null {
  if (roleKey === "rola_kursant") return null;
  if (roleKey === "rola_sympatyk") return "MEMBER";
  return "MANAGER"; // kandydat, czlonek, zarzad, kr
}
```

### Step B (linia 58) — zastąp cały blok `if (!addedToListaGroupAt)`

```typescript
// B) lista@ — rola w grupie zależy od roli użytkownika
const targetListaRole = listaRoleForUserRole(roleKey);

if (!addedToListaGroupAt) {
  if (targetListaRole === null) {
    // Kursant — nie trafia na listę; ustaw marker idempotencji
    if (!dryRun) {
      await userRef.update({ "service.addedToListaGroupAt": new Date() });
    }
    logger.info("WelcomeTask: step B skipped for kursant", { uid });
  } else {
    logger.info("WelcomeTask: step B addMemberToGroup lista", { uid, role: targetListaRole });
    if (dryRun) {
      logger.info("DRYRUN: would add to lista group", { uid, targetListaRole });
    } else {
      try {
        await workspace.addMemberToGroup(config.listaGroupEmail, userEmail, targetListaRole);
        await userRef.update({ "service.addedToListaGroupAt": new Date() });
        logger.info("WelcomeTask: step B done", { uid, targetListaRole });
      } catch (e) {
        const err = asErr(e);
        logger.error("WelcomeTask: step B FAILED", {
          uid, code: err?.code, message: err?.message,
          errors: err?.errors, status: err?.response?.status, data: err?.response?.data,
        });
        throw e;
      }
    }
  }
} else {
  logger.info("Skip: already processed lista group", { uid });
}
```

### Step A (linia 171) — email zależny od roli

```typescript
// PRZED:
const body = config.welcomeBodyText(displayName, userEmail);

// PO:
const listaAccess = targetListaRole === null ? "none"
  : targetListaRole === "MEMBER" ? "readonly"
  : "full";
const body = config.welcomeBodyText(displayName, userEmail, listaAccess);
```

> `targetListaRole` jest zadeklarowany wyżej w step B — dostępny tu bez zmian.

---

## Krok 3 — `usersSyncRolesFromSheet.ts`: aktualizacja lista@ przy każdej zmianie roli

### Pomocnicza funkcja (dodać przed `syncWorkspaceGroupsForUser`)

```typescript
function listaRoleForUserRole(roleKey: string): "MANAGER" | "MEMBER" | null {
  if (roleKey === "rola_kursant") return null;
  if (roleKey === "rola_sympatyk") return "MEMBER";
  return "MANAGER";
}
```

### Treść maila o zmianie roli — rozszerz o sekcję lista@ (po `boardInstructions`, ~linia 293)

```typescript
const newListaRole = listaRoleForUserRole(newRoleKey);
const oldListaRole = listaRoleForUserRole(currentRoleKey);
const listaChanged = newListaRole !== oldListaRole;

const listaInstructions = !listaChanged ? [] : newListaRole === null ? [
  "",
  "---",
  "",
  "Twój dostęp do listy dyskusyjnej lista@morzkulc.pl został usunięty.",
] : newListaRole === "MEMBER" ? [
  "",
  "---",
  "",
  `Masz teraz dostęp do listy dyskusyjnej ${cfg.listaGroupEmail} (tylko odczyt).`,
  "",
  "Możesz czytać i otrzymywać wiadomości — możliwość wysyłania uzyskasz po zmianie roli na kandydata lub członka.",
  "",
  "Jak znaleźć grupę (lista nie jest publicznie wyszukiwalna):",
  "• Zaloguj się na swoje konto Google i wejdź na: https://groups.google.com",
  `• Poszukaj grupy: ${cfg.listaGroupEmail}`,
  "• Ustaw \"Moje ustawienia członkostwa\" → \"Subskrypcja\" → \"Każdy e-mail\" żeby wiadomości trafiały do Gmaila.",
] : [
  "",
  "---",
  "",
  `Masz teraz pełny dostęp do listy dyskusyjnej: ${cfg.listaGroupEmail}`,
  "",
  "Jak znaleźć grupę (lista nie jest publicznie wyszukiwalna):",
  "• Zaloguj się na swoje konto Google i wejdź na: https://groups.google.com",
  `• Poszukaj grupy: ${cfg.listaGroupEmail}`,
  "• Ustaw \"Moje ustawienia członkostwa\" → \"Subskrypcja\" → \"Każdy e-mail\" żeby wiadomości trafiały do Gmaila.",
  "",
  `Jak wysyłać: wyślij e-mail na adres ${cfg.listaGroupEmail} — treść jak zwykły mail.`,
];
```

Dodaj `...listaInstructions` na końcu tablicy treści maila, po `...boardInstructions`:
```typescript
[
  "Cześć!",
  "",
  "Twoja rola w SKK Morzkulc została zmieniona.",
  "",
  `Poprzednia rola: ${oldRoleLabel}`,
  `Nowa rola: ${newRoleLabel}`,
  "",
  "Jeśli masz pytania, odpisz na tego maila.",
  "",
  "SKK Morzkulc",
  ...boardInstructions,
  ...listaInstructions,   // <-- dodane
].join("\n")
```

### Aktualizacja lista@ po wysłaniu maila (~linia 337)

```typescript
// Aktualizuj dostęp do lista@ na podstawie nowej roli
if (roleChanged && newRoleKey && !dryRun) {
  const targetListaRole = listaRoleForUserRole(newRoleKey);
  try {
    if (targetListaRole === null) {
      // Kursant lub inna rola bez dostępu — usuń z listy
      await workspace.removeMemberFromGroup(cfg.listaGroupEmail, email);
      ctx.logger.info("syncRoles: removed from lista@", { email, newRoleKey });
    } else {
      // addMemberToGroup sam obsługuje update roli jeśli użytkownik już jest w grupie
      await workspace.addMemberToGroup(cfg.listaGroupEmail, email, targetListaRole);
      ctx.logger.info("syncRoles: lista@ updated", { email, newRoleKey, targetListaRole });
    }
  } catch (listaErr: any) {
    ctx.logger.error("syncRoles: lista@ update failed (non-fatal)", {
      email, message: listaErr?.message,
    });
  }
}
```

---

## Kwestia istniejących kursantów w lista@

Kursanci którzy zarejestrowali się przed wdrożeniem tej zmiany mogą już być na liście (stary
buggy kod dodawał wszystkich). Jednorazowe czyszczenie: osobny task lub ręcznie w admin.google.com.
**Nie jest częścią tego PR** — tech debt do zrobienia po wdrożeniu.

---

## Kolejność implementacji (jedna zmiana na raz, po każdej — build)

1. `functions/src/service/registry.ts` — task `lista.enforcePostingPolicy`
2. `functions/src/service/service_config.ts` — nowa sygnatura `welcomeBodyText` z `listaAccess`
3. `functions/src/service/tasks/onUserRegisteredWelcome.ts` — `listaRoleForUserRole` + step B + step A
4. `functions/src/service/tasks/usersSyncRolesFromSheet.ts` — `listaRoleForUserRole` + lista@ sync + mail

```bash
npm --prefix functions run build
```

---

## Plan testów

### Test 1 — rejestracja kursanta

**Warunek:** nowy użytkownik z `role_key = "rola_kursant"` tworzony w `users_active`

**Oczekiwane:**
- Logi: `"WelcomeTask: step B skipped for kursant"` + `"service.addedToListaGroupAt"` ustawiony
- Mail powitalny BEZ wzmianki o liście dyskusyjnej
- `admin.google.com` → użytkownik NIE jest na lista@morzkulc.pl

### Test 2 — rejestracja sympatyka

**Warunek:** nowy użytkownik z `role_key = "rola_sympatyk"`

**Oczekiwane:**
- Dodany do lista@ jako `MEMBER`
- Mail powitalny z info "dostęp tylko do odczytu"
- `admin.google.com` → rola `Member` (nie `Manager`)

### Test 3 — rejestracja kandydata/członka

**Warunek:** nowy użytkownik z `role_key = "rola_kandydat"` lub `"rola_czlonek"`

**Oczekiwane:**
- Dodany do lista@ jako `MANAGER`
- Mail powitalny z pełnymi instrukcjami listy
- `admin.google.com` → rola `Manager`

### Test 4 — zmiana roli kursant → kandydat (syncRolesFromSheet)

**Warunek:** zmiana w arkuszu Google Sheets; task `users.syncRolesFromSheet` uruchomiony

**Oczekiwane:**
- Mail "Zmiana roli" z sekcją lista@ (pełny dostęp)
- Dodany do lista@ jako `MANAGER`
- `admin.google.com` → rola `Manager`

### Test 5 — zmiana roli kandydat → sympatyk (downgrade)

**Oczekiwane:**
- Mail "Zmiana roli" z sekcją "dostęp tylko do odczytu"
- Rola w lista@ zmieniona z `MANAGER` na `MEMBER`
- `admin.google.com` → rola `Member`

### Test 6 — zmiana roli kandydat → kursant (edge case)

**Oczekiwane:**
- Mail "Zmiana roli" z info "dostęp do listy usunięty"
- Usunięty z lista@
- `admin.google.com` → brak na liście

### Test 7 — task `lista.enforcePostingPolicy`

**Oczekiwane:**
- Po wywołaniu: grupa lista@morzkulc.pl ma `whoCanPostMessage = ALL_MANAGERS_CAN_POST`
- Weryfikacja: MEMBER nie może wysłać wiadomości; MANAGER może

---

## Uwagi do implementacji

- `listaRoleForUserRole` jest zduplikowana w dwóch plikach — celowo (3 linie, prosta funkcja,
  nie warto tworzyć nowego pliku z jedną funkcją)
- `addMemberToGroup` automatycznie aktualizuje rolę jeśli użytkownik już jest w grupie
  (`googleWorkspaceProvider.ts:96-111`) — nie trzeba osobnego `updateMember`
- Błąd lista@ w `syncRolesFromSheet` jest non-fatal — zmiana roli w Firestore nie cofa się
- Kursanci istniejący w lista@ (stary bug) wymagają jednorazowego czyszczenia po wdrożeniu