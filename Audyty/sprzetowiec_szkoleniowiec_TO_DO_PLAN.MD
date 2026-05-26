# Plan: obsługa funkcji sprzętowca i szkoleniowca (sync setup → grupy Google → maile)

## Context

W zakładce **setup** arkusza „członkowie sympatycy SKK" dodane zostały dwie nowe zmienne:

- `sprzetowiec` — wartość: jeden lub kilka emaili (rozdzielonych przecinkami) osób pełniących funkcję sprzętowca
- `szkoleniowiec` — wartość: analogicznie dla szkoleniowca

Te zmienne lądują w `setup/vars_members.vars.{key}.value` przez istniejący `readSetupVars_` (`appscript/członkowie sympatycy SKK/setup_sync.gs:207`), który NIE normalizuje nazw zmiennych — klucze trafiają do Firestore tak jak w arkuszu.

**Cel.** Osoby wpisane w te zmienne mają móc wysyłać maile na listę dyskusyjną `lista@morzkulc.pl` z dedykowanych adresów grupowych:
- `sprzetowiec@morzkulc.pl`
- `szkoleniowiec@morzkulc.pl`

Mechanizm dostępu w Google Workspace: alias e-mailowy danej osoby (Gmail „Wyślij pocztę jako") wymaga członkostwa w grupie o tym adresie. Każda zmiana w arkuszu ma:

1. Usunąć z grupy starych członków, których w setupie już nie ma.
2. Dodać do grupy nowych członków, których w setupie przybyło.
3. Wysłać welcome mail z instrukcją „Wyślij pocztę jako" do nowo nominowanych.
4. Wysłać off-boarding mail do osób, którym właśnie cofnięto funkcję.
5. Zapewnić, że grupy `sprzetowiec@` i `szkoleniowiec@` mają rolę **MANAGER** w `lista@` (czyli mogą postować).

Wartości w arkuszu setup są źródłem prawdy — kod ma być idempotentny i odporny na ręczne modyfikacje w Workspace Admin (przy każdym sync wyrównujemy do stanu z arkusza).

## Architektura — analogia do istniejącego flow ról

Istniejący wzorzec (`users.syncRolesFromSheet`) działa już dokładnie tak jak potrzebujemy: Apps Script po commitcie do Firestore enqueueuje service_job, a task w Cloud Function odczytuje stan z Firestore, woła Workspace API i wysyła maile. Powielamy ten wzorzec dla setup → funkcyjne grupy.

```
Arkusz (zakładka setup)
   │  ręczny sync z menu Morzkulc → „sync setup"
   ▼
syncSetupToFirestore() commituje setup/vars_members
   │
   │  + enqueueServiceJob_("users.syncFunctionRolesFromSetup", {})   ← NOWE
   ▼
service_jobs/<jobId>  ──onServiceJobCreated──▶  jobProcessor
   ▼
usersSyncFunctionRolesFromSetupTask (NOWY)
   ├─ czyta setup/vars_members.vars.{sprzetowiec,szkoleniowiec}.value
   ├─ czyta members.list grupy sprzetowiec@ / szkoleniowiec@
   ├─ diff → toAdd / toRemove
   ├─ addMember / removeMember (idempotentnie)
   ├─ welcome mail dla toAdd, off-boarding mail dla toRemove
   └─ zapisuje stan w service_state/function_roles
```

`listaEnforcePostingPolicy` (już istnieje, `functions/src/service/tasks/listaEnforcePostingPolicy.ts`) zostanie wykorzystany bez zmian — wystarczy rozszerzyć defaultową listę `SVC_PRIV_POSTER_GROUPS` o dwie nowe grupy.

## Pliki do modyfikacji

### 1. `appscript/członkowie sympatycy SKK/setup_sync.gs` (modyfikacja)

W funkcji `syncSetupToFirestore()` po `firestoreCommitDocuments_([...])` (po linii 62) dodać:

```javascript
enqueueServiceJob_("users.syncFunctionRolesFromSetup", {});
```

Bezwarunkowo — task i tak jest no-op, jeśli nic się nie zmieniło. `enqueueServiceJob_` istnieje już w `common_helpers.gs:270`.

### 2. `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts` (NOWY)

Implementuje `ServiceTask` o id `users.syncFunctionRolesFromSetup`.

Pseudokod:

```
1. cfg = getServiceConfig()
2. setupVars = firestore.collection("setup").doc("vars_members").get().data().vars
3. statePrev = firestore.collection("service_state").doc("function_roles").get()
4. for each role in ["sprzetowiec", "szkoleniowiec"]:
     group = cfg.functionRoles[role]
     raw   = setupVars[role]?.value ?? ""
     targetSet = parseEmailList(raw)            // split na ',' + trim + toLowerCase + dedup + filter("@")
     currentMembers = workspace.listMembersOfGroup(group)
     currentSet = Set(currentMembers.map(m => m.email.toLowerCase()))
     toAdd    = [...targetSet].filter(e => !currentSet.has(e))
     toRemove = [...currentSet].filter(e => !targetSet.has(e))
     for email in toAdd:
        workspace.addMemberToGroup(group, email, "MANAGER")
        workspace.sendWelcomeEmail(welcomeFromEmail, email, welcomeReplyToEmail,
                                   "Funkcja " + roleLabel + " w SKK Morzkulc",
                                   welcomeBodyFor(role, group))
     for email in toRemove:
        workspace.removeMemberFromGroup(group, email)
        workspace.sendGenericEmail(email,
                                   "Funkcja " + roleLabel + " — cofnięcie",
                                   offboardingBodyFor(role, group))
     nextState[role] = { group, emails: [...targetSet], lastSyncAt: now }
5. firestore.doc("service_state/function_roles").set(nextState, {merge: true})
6. return {ok, message, details: {sprzetowiec: {added, removed}, szkoleniowiec: {...}}}
```

Treść welcome mail (płaski tekst, ten sam format co istniejące welcome):

```
Cześć!

Zostałeś dołączony do funkcji {sprzętowca|szkoleniowca} w SKK Morzkulc.

Oznacza to, że możesz wysyłać maile na listę dyskusyjną lista@morzkulc.pl
z adresu {sprzetowiec@morzkulc.pl|szkoleniowiec@morzkulc.pl}.

KROK 1 — odbieranie maili do grupy:
1. Wejdź na https://groups.google.com (zalogowany na to konto Google).
2. Znajdź grupę {group}.
3. „Moje ustawienia członkostwa" → „Subskrypcja" → „Każdy e-mail".

KROK 2 — wysyłanie maili jako {group}:
1. W Gmailu: koło zębate → Ustawienia → zakładka „Konta i import".
2. „Wyślij pocztę jako" → „Dodaj inny adres e-mail".
3. Wpisz: {group} → Dalej.
4. Gmail wyśle kod weryfikacyjny na {group} — odbierzesz go,
   bo dodaliśmy Cię właśnie do tej grupy.
5. Wpisz kod — gotowe.

Od tej chwili przy nowej wiadomości w Gmailu możesz wybrać „Od" → {group}.

SKK Morzkulc
```

Treść off-boarding mail (krótka):

```
Cześć!

Twoja funkcja {sprzętowca|szkoleniowca} w SKK Morzkulc została cofnięta.
Nie jesteś już członkiem grupy {group} — nie możesz wysyłać maili
z tego adresu na lista@morzkulc.pl.

Jeśli to pomyłka, odezwij się do zarządu.

SKK Morzkulc
```

Obsługa błędów: nieudany welcome/off-boarding mail jest **non-fatal** (log + kontynuacja), zgodnie z wzorcem z `usersSyncRolesFromSheet.ts:375`. Nieudane operacje na grupie są **fatal** (rzut wyjątku, jobProcessor retryuje z backoffem).

### 3. `functions/src/service/registry.ts` (modyfikacja)

Dodać import i wpis w tablicy `tasks`:

```typescript
import { usersSyncFunctionRolesFromSetupTask } from "./tasks/usersSyncFunctionRolesFromSetup";
// ...
const tasks: ServiceTask[] = [
  // ...
  usersSyncFunctionRolesFromSetupTask,
];
```

### 4. `functions/src/service/providers/googleWorkspaceProvider.ts` (modyfikacja)

Dodać nową metodę:

```typescript
async listMembersOfGroup(groupEmail: string): Promise<Array<{email: string; role: string}>> {
  const directory = await this.getDirectoryClient();
  const g = normalizeEmail(groupEmail);
  assertLooksLikeEmail("groupEmail", g);

  const out: Array<{email: string; role: string}> = [];
  let pageToken: string | undefined = undefined;
  do {
    const resp = await directory.members.list({
      groupKey: g,
      maxResults: 200,
      pageToken,
    });
    for (const m of resp.data.members || []) {
      if (m.email) out.push({email: m.email.toLowerCase(), role: m.role || "MEMBER"});
    }
    pageToken = resp.data.nextPageToken || undefined;
  } while (pageToken);
  return out;
}
```

Reużywa istniejącego `getDirectoryClient()` (te same scopes co `members.get` / `members.insert`).

### 5. `functions/src/service/service_config.ts` (modyfikacja)

Do interfejsu `ServiceConfig` dodać pole:

```typescript
functionRoles: {
  sprzetowiec: string;   // group email
  szkoleniowiec: string;
};
```

W `getServiceConfig()`:

```typescript
const sprzetowiecGroupEmail = process.env.SVC_SPRZETOWIEC_GROUP_EMAIL || "sprzetowiec@morzkulc.pl";
const szkoleniowiecGroupEmail = process.env.SVC_SZKOLENIOWIEC_GROUP_EMAIL || "szkoleniowiec@morzkulc.pl";
```

W zwracanym `cfg`:

```typescript
functionRoles: {
  sprzetowiec: sprzetowiecGroupEmail,
  szkoleniowiec: szkoleniowiecGroupEmail,
},
```

Walidacja (po blokach z linii 258–283):

```typescript
if (!cfg.functionRoles.sprzetowiec.includes("@")) throw new functions.https.HttpsError("failed-precondition", "Invalid sprzetowiec group email");
if (!cfg.functionRoles.szkoleniowiec.includes("@")) throw new functions.https.HttpsError("failed-precondition", "Invalid szkoleniowiec group email");
```

Rozszerzyć domyślną wartość `SVC_PRIV_POSTER_GROUPS` o dwie nowe grupy (`functions/src/service/service_config.ts:81-82`):

```typescript
const privilegedPosterGroupsRaw =
  process.env.SVC_PRIV_POSTER_GROUPS ||
  "zarzad_skk@morzkulc.pl,kr@morzkulc.pl,czlonkowie@morzkulc.pl,sprzetowiec@morzkulc.pl,szkoleniowiec@morzkulc.pl";
```

To zapewnia, że uruchomienie `lista.enforcePostingPolicy` doda obie grupy jako MANAGER w `lista@` — dzięki czemu maile z aliasów `sprzetowiec@` / `szkoleniowiec@` przejdą przez politykę `ALL_MANAGERS_CAN_POST`.

## Reużyte istniejące mechanizmy

- `enqueueServiceJob_` (`appscript/.../common_helpers.gs:270`) — kolejkowanie zadań
- `firestoreCommitDocuments_` — zapis setup
- `GoogleWorkspaceProvider.addMemberToGroup` / `.removeMemberFromGroup` / `.isMemberOfGroup` (`functions/src/service/providers/googleWorkspaceProvider.ts:43-125`) — idempotentne operacje
- `GoogleWorkspaceProvider.sendWelcomeEmail` / `.sendGenericEmail` (`...providers/googleWorkspaceProvider.ts:169-243`) — wysyłka maili
- `listaEnforcePostingPolicyTask` — bez zmian, samo rozszerzenie `privilegedPosterGroups` w defaulcie wystarczy
- jobProcessor backoff / retry — automatyczna obsługa transient errors

## Wdrożenie

1. Build + lint:
   ```
   npm --prefix functions run build
   npm --prefix functions run lint
   ```
2. Deploy:
   ```
   firebase use prod
   firebase deploy --only functions
   ```
3. **Weryfikacja env zgodnie z `feedback_env_deploy`**: jeśli ktoś nadpisze `SVC_PRIV_POSTER_GROUPS` lub `SVC_SPRZETOWIEC_GROUP_EMAIL` / `SVC_SZKOLENIOWIEC_GROUP_EMAIL` w `.env.morzkulc-e9df7`, po deployu sprawdzić przez `gcloud functions describe ...` że nowa wartość faktycznie dotarła do funkcji.
4. Wgrać zmodyfikowany `setup_sync.gs` do projektu Apps Script (ręcznie lub przez clasp).
5. Jednorazowo uruchomić task `lista.enforcePostingPolicy` (np. przez ręczne wstawienie dokumentu do `service_jobs`) — żeby `sprzetowiec@` i `szkoleniowiec@` zostały MANAGER-ami w `lista@`.

## Weryfikacja end-to-end

1. **Onboarding nowego sprzętowca.** W arkuszu (zakładka „setup") wpisać do `sprzetowiec` adres testowego usera → menu Morzkulc → „sync setup".
   - Firebase Functions logs: pojawia się job `users.syncFunctionRolesFromSetup`, log `addMember to sprzetowiec@...`.
   - Workspace Admin: user jest członkiem `sprzetowiec@morzkulc.pl` z rolą MANAGER.
   - Skrzynka testowego usera: welcome mail z instrukcją „Wyślij pocztę jako".

2. **Faktyczne wysłanie z aliasu.** Po skonfigurowaniu „Wyślij pocztę jako" w Gmail przez usera — wysłać próbny mail z `sprzetowiec@` na `lista@morzkulc.pl`. Mail dochodzi.

3. **Zmiana sprzętowca.** Zmienić w arkuszu wartość `sprzetowiec` na inny adres → sync.
   - Stary user: usunięty z grupy, dostał off-boarding mail.
   - Nowy user: dodany do grupy, dostał welcome mail.
   - `service_state/function_roles.sprzetowiec.emails` zaktualizowany.

4. **Wielu sprzętowców.** Wpisać `a@example.com, b@example.com` → sync. Obaj dodani do grupy z rolą MANAGER, obaj dostali welcome mail.

5. **Wyczyszczenie funkcji.** Skasować wartość zmiennej `sprzetowiec` → sync. Wszyscy usunięci z grupy, ostatni członek dostał off-boarding mail.

6. **Idempotencja.** Ponowny `sync setup` bez zmian wartości → log mówi „no changes" (lub `added=0, removed=0`), żadne maile nie wychodzą.

## Krytyczne pliki

- `appscript/członkowie sympatycy SKK/setup_sync.gs` (linia ~62 — dodać 1 linijkę enqueue)
- `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts` (NOWY)
- `functions/src/service/registry.ts` (import + wpis w tablicy)
- `functions/src/service/providers/googleWorkspaceProvider.ts` (nowa metoda `listMembersOfGroup`)
- `functions/src/service/service_config.ts` (pole `functionRoles` + walidacje + rozszerzenie defaultu `SVC_PRIV_POSTER_GROUPS`)
