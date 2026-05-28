# Plan i TO-DO: Grupy Workspace + Konta funkcyjne SKK Morzkulc

Data utworzenia: 2026-05-27 (konsolidacja 4 wcześniejszych planów/audytów)
Status: **plan zatwierdzony, część kodu w workdir niezacommitowana, akcje admin console przed wdrożeniem**

---

## Spis treści

1. [Cel i kontekst](#1-cel-i-kontekst)
2. [Wynik pilota SMTP](#2-wynik-pilota-smtp)
3. [Decyzje architektoniczne](#3-decyzje-architektoniczne)
4. [Audyt grup Workspace](#4-audyt-grup-workspace)
5. [Konwencja etykiet grup](#5-konwencja-etykiet-grup)
6. [Mapa kont funkcyjnych i adresów](#6-mapa-kont-funkcyjnych-i-adresów)
7. [Mechanizm działania (flow)](#7-mechanizm-działania-flow)
8. [Stan kodu — co już zrobione, co zostało](#8-stan-kodu)
9. [Treści maili (szablony)](#9-treści-maili-szablony)
10. [TO-DO admin console](#10-to-do-admin-console)
11. [TO-DO kod i deploy](#11-to-do-kod-i-deploy)
12. [Weryfikacja end-to-end](#12-weryfikacja-end-to-end)
13. [Ryzyka i mitigacje](#13-ryzyka-i-mitigacje)
14. [Otwarte pytania](#14-otwarte-pytania)

---

## 1. Cel i kontekst

**Cel:** każda z 4 funkcji w zarządzie ma dedykowany alias z którego operator może wysyłać oficjalne maile ze swojego prywatnego Gmaila przez „Wyślij pocztę jako" + SMTP smtp.gmail.com + app password.

**Funkcje i adresy (docelowy stan):**

| Funkcja | Alias (konto USER) | Operator (prywatny @gmail) | Forward target dla reply |
|---|---|---|---|
| sprzętowiec | `sprzetowiec@morzkulc.pl` | `switek.k@gmail.com` | switek.k@gmail.com (1:1) |
| szkoleniowiec | `szkoleniowiec@morzkulc.pl` | `zwirowski@gmail.com` | zwirowski@gmail.com (1:1) |
| skarbnik | `skarbnik@morzkulc.pl` | (do uzupełnienia w setup) | osoba pełniąca funkcję (1:1) |
| prezes | `prezes@morzkulc.pl` | (do uzupełnienia w setup) | osoba pełniąca funkcję (1:1) |

**Reguły sztywne:**

1. 1 funkcja = 1 osoba (sprzętowiec, szkoleniowiec, skarbnik, prezes — każda jedna osoba)
2. Funkcje są rozłączne (ten sam mail nie w dwóch zmiennych)
3. Każdy operator MUSI mieć `role_key=rola_zarzad` w `users_active`
4. Członkowie zarządu bez teki (np. wiceprezes, członek bez funkcji): są w `zarzad_skk@`, czytają maile na `zarzad@`, ale nie mają własnego aliasu funkcyjnego

---

## 2. Wynik pilota SMTP

Pilot wykonany 2026-05-26 na konto testowe `pilot-funkcja@morzkulc.pl`:

| Wariant | Wynik |
|---|---|
| 2FA OFF + regular password SMTP | ❌ FAIL — `535-5.7.8 Username and Password not accepted` |
| 2FA ON + app password SMTP | ✅ PASS — Gmail akceptuje, mail dochodzi z `From: <konto funkcyjne>` |

**Wniosek:** automatyczna rotacja zwykłych haseł przez Admin SDK jest **niemożliwa** w naszym tenancie. Jedyna działająca ścieżka: konto USER z 2FA + manualnie wygenerowany app password przez admina.

Skala manualnej pracy: 1-2 zmiany rocznie × 4 funkcje × ~3 min = ~10-20 min rocznie. Akceptowalne.

---

## 3. Decyzje architektoniczne

| # | Decyzja | Uzasadnienie |
|---|---|---|
| D1 | App password manualnie tworzony przez admina (Wariant A z briefu) | Pilot pokazał że to jedyna działająca ścieżka SMTP |
| D2 | Konta funkcyjne to USER accounts (nie grupy) | Grupy nie mają SMTP login |
| D3 | `zarzad@morzkulc.pl` zostaje GRUPĄ, prezes używa osobnego `prezes@morzkulc.pl` | zarzad@ to istniejąca grupa umbrella (admin+KR+zarząd) — nie wolno zamieniać |
| D4 | Send-As prezesa: `From: "Zarząd SKK" <prezes@morzkulc.pl>` (opcja X) | Czyste, prosto, nazwa wizualna „Zarząd" przy adresie prezes@ |
| D5 | Reply do prezesa: 1:1 forward na prywatną skrzynkę obecnego prezesa | Spójne z modelem pozostałych funkcji; user wybrał (a) |
| D6 | Adres odbiorcy [Morzkulc][AKCJA] = `zarzad@morzkulc.pl` (umbrella) | Broad audience: admin + KR + zarzad_skk → ktokolwiek z kierownictwa może wykonać akcję |
| D7 | Naming app password = `{local-part-z-myślnikami}-smtp` | Np. `switek-k-smtp`, `zwirowski-smtp` — łatwa selektywna rewokacja |
| D8 | Disposition forwarding na koncie funkcyjnym = `archive` | Skrzynka funkcyjna pusta, tylko relay; brak budowania śmieci w inboxie |
| D9 | Walidacja krzyżowa w taska: rozłączność + role_key=rola_zarzad | Sztywna reguła z biznesu |
| D10 | Konsystencja `zarzad_skk@` ↔ `users_active.rola_zarzad` — bez sprawdzania | Ufamy istniejącemu flow `usersSyncRolesFromSheet` (user wprost zdecydował) |
| D11 | Etykiety grup ujednolicone wg konwencji Adresowa/Bezpieczeństwo | Patrz sekcja 5 |

---

## 4. Audyt grup Workspace

### 4.1 `sprzetowiec@morzkulc.pl` (do skasowania)

| Pole | Wartość |
|---|---|
| Etykieta | Adresowa |
| Liczba członków | 1 (switek.k jako Manager) |
| Drive permissions | brak realnych (1 członek = ten kto i tak ma dostęp jako osoba) |
| Decyzja | **USUNĄĆ** — utworzyć konto USER pod tym samym adresem |

### 4.2 `szkoleniowiec@morzkulc.pl` (do skasowania)

| Pole | Wartość |
|---|---|
| Etykieta | Adresowa |
| Liczba członków | 0 (pusta) |
| Drive permissions | brak realnych |
| Decyzja | **USUNĄĆ** — utworzyć konto USER pod tym samym adresem |

### 4.3 `zarzad@morzkulc.pl` (zostaje grupą)

| Pole | Wartość |
|---|---|
| Nazwa | Zarząd SKK Morzkulc |
| Opis | „Wewnętrzna grupa robocza zarządu klubu — komunikacja i dostępy do plików" (historyczny, po cleanupie nieaktualny w części Drive) |
| Etykieta | Adresowa (po cleanupie poprawna — pure mailing list) |
| Członkowie bezpośredni | admin@morzkulc.pl (Właściciel), kr@morzkulc.pl (grupa), zarzad_skk@morzkulc.pl (grupa) |
| Kto publikuje | właściciele, zarządzający, członkowie, cała organizacja, **osoby zewnętrzne** |
| Drive permissions | **ZERO** po cleanupie 2026-05-27 (user usunął redundantne uprawnienia z 3 folderów, gdzie Drive perms miał też zarzad_skk@) |
| Decyzja | **NIE RUSZAĆ** — jest aktywnym mailing channelem (Reply-To welcome, BOARD_GROUP_EMAIL w Apps Script, kontakt user-facing) |

**Funkcja w naszym planie:** odbiorca `SVC_ADMIN_ACTION_EMAIL` — mail [Morzkulc][AKCJA] od taska trafia tu, dociera do admin + KR + cały zarząd tranzytywnie.

### 4.4 `zarzad_skk@morzkulc.pl` (zostaje grupą)

| Pole | Wartość |
|---|---|
| Nazwa | Zarząd (grupa) |
| Opis | pusty |
| Etykieta obecna | Adresowa (do aktualizacji — patrz sekcja 5) |
| Członkowie bezpośredni | 4 użytkownicy (Członek grupy): gordziej.mateusz@gmail.com, katastrofalnydeszcz@gmail.com, switek.k@gmail.com, zwirowski@gmail.com |
| Właściciele / Zarządzający | brak (0/0) — administracja wyłącznie przez Workspace admin / DWD |
| Kto publikuje | tylko członkowie |
| Drive permissions | **TAK** — single source of truth dla Drive zarządu po cleanupie zarzad@ |
| Decyzja | **NIE RUSZAĆ** — kluczowa grupa dla Drive zarządu |

**Funkcja w naszym planie:** MANAGER w `lista@morzkulc.pl` (mogą postować) + Drive permissions dla zarządu. NIE jest używana jako forward target dla prezes@ (reply 1:1 do prywatnej skrzynki).

---

## 5. Konwencja etykiet grup

Google Workspace ma 2 standardowe etykiety; grupa może mieć obie.

| Etykieta | Znaczenie |
|---|---|
| **Adresowa** | grupa pełni funkcję listy mailingowej (dystrybucja wiadomości) |
| **Bezpieczeństwo** | grupa udziela uprawnień do zasobów (Drive, Calendar, Apps) |

### Etykiety per grupa SKK

| Grupa | Etykieta dziś | Etykieta docelowa | Akcja |
|---|---|---|---|
| `zarzad@` | Adresowa | **Adresowa** | bez zmian (poprawne po cleanupie) |
| `zarzad_skk@` | Adresowa | **Bezpieczeństwo + Adresowa** | dodać „Bezpieczeństwo" |
| `kr@` | (do sprawdzenia) | **Bezpieczeństwo + Adresowa** | sprawdzić obecny stan; zakładamy że analogicznie do zarzad_skk@ |
| `czlonkowie@` | (do sprawdzenia) | **Bezpieczeństwo + Adresowa** | sprawdzić; założenie: dostęp członkowski do dokumentów klubowych + mailing |
| `lista@` | (do sprawdzenia) | **Adresowa** | dyskusyjna lista klubu, brak Drive perms typowo |
| `kandydaci@` | (do sprawdzenia) | **Adresowa** | mailing tymczasowy |
| `sympatycy@` | (do sprawdzenia) | **Adresowa** | mailing |
| (po skasowaniu) `sprzetowiec@`, `szkoleniowiec@` | n/a | grupy przestaną istnieć |

**Reguła na przyszłość:**
- mailing only → **Adresowa**
- uprawnienia only → **Bezpieczeństwo**
- oba → **obie etykiety**

---

## 6. Mapa kont funkcyjnych i adresów

### Stan obecny (przed wdrożeniem)

```
Grupy email:
  sprzetowiec@morzkulc.pl       — grupa, 1 członek (switek.k)
  szkoleniowiec@morzkulc.pl     — grupa, 0 członków
  zarzad@morzkulc.pl            — grupa umbrella (admin + KR + zarzad_skk)
  zarzad_skk@morzkulc.pl        — grupa, 4 zarząd members
  kr@, czlonkowie@, lista@, kandydaci@, sympatycy@  — istniejące grupy (bez zmian)

Konta user:
  admin@morzkulc.pl             — admin Workspace
  (brak innych użytkowników @morzkulc.pl — wszyscy operatorzy są na prywatnych @gmail)
```

### Stan docelowy (po wdrożeniu)

```
Konta funkcyjne user (NOWE, w OU "Konta funkcyjne SKK", 2FA ON):
  sprzetowiec@morzkulc.pl       — konto user (po skasowaniu grupy)
  szkoleniowiec@morzkulc.pl     — konto user (po skasowaniu grupy)
  skarbnik@morzkulc.pl          — konto user (adres wolny, do potwierdzenia)
  prezes@morzkulc.pl            — konto user (adres wolny, do potwierdzenia)

Grupy bez zmian:
  zarzad@morzkulc.pl            — pozostaje umbrella mailing list
  zarzad_skk@morzkulc.pl        — pozostaje (Drive perms zarządu)
  kr@, czlonkowie@, lista@, kandydaci@, sympatycy@  — bez zmian

Konto admin:
  admin@morzkulc.pl             — bez zmian
```

### Zmienne setup (4 funkcyjne)

W arkuszu „członkowie sympatycy SKK" → zakładka `setup`:

| zmienna_nazwa | wartosc_zmiennej | grupa_zmiennych | opis | Status |
|---|---|---|---|---|
| `sprzetowiec` | switek.k@gmail.com | role | mail osoby pełniącej funkcję sprzętowca | istnieje |
| `szkoleniowiec` | zwirowski@gmail.com | role | mail osoby pełniącej funkcję szkoleniowca | istnieje |
| `skarbnik` | (do uzupełnienia) | role | mail osoby pełniącej funkcję skarbnika | **NOWE** |
| `prezes` | (do uzupełnienia) | role | mail osoby pełniącej funkcję prezesa zarządu | **NOWE** |

---

## 7. Mechanizm działania (flow)

### 7.1 Onboarding operatora (CASE onboard)

```
KROK 1 — Sync z arkusza
  User wpisuje email w setup (np. sprzetowiec = switek.k@gmail.com)
  → menu Morzkulc → "sync setup"
  → setup_sync.gs → readSetupVars_ → firestoreCommit
  → enqueueServiceJob_("users.syncFunctionRolesFromSetup", {})

KROK 2 — Trigger
  service_jobs/<jobId> (status: queued)
  → onServiceJobCreated → jobProcessor.processJobDoc()
  → runTaskById("users.syncFunctionRolesFromSetup")

KROK 3 — Walidacja krzyżowa (atomowa)
  Wczytuje 4 zmienne (sprzetowiec, szkoleniowiec, skarbnik, prezes)
  Sprawdza:
    - każda wartość: pojedynczy email (nie przecinek/średnik)
    - rozłączność: ten sam email nie w dwóch funkcjach
    - role_key=rola_zarzad: każdy email w users_active z tą rolą
  Jeśli FAIL: mail [Morzkulc][BŁĄD] do zarzad@, state niemod., ok:false → STOP

KROK 4 — Decyzja CASE per rola
  prev = service_state/function_roles[role].email
  target = setupVars[role].value
  case = decideCase(prev, target):
    "" → ""               = no-op
    "X" → "X"             = no-op
    "" → "X"              = onboard
    "X" → ""              = offboard
    "X" → "Y"             = switch

KROK 5 — Akcje dla CASE onboard (role != prezes)
  (a) workspace.addForwardingAddress(mailbox, target)
      → dodaje target jako dozwolony forward na skrzynce funkcyjnej
      → Google: zwykle akceptuje od razu w DWD; może wymagać kodu (status pending)
  (b) workspace.setAutoForwardRule(mailbox, target, "archive")
      → włącza auto-forwarding; każdy mail przychodzący → przekazany do target → archiwizowany
  (c) workspace.sendGenericEmail(zarzad@morzkulc.pl,
                                 "[Morzkulc][AKCJA] Nowy {label} — utwórz app password",
                                 buildAdminOnboardingBody(...))
  (d) workspace.sendGenericEmail(target,
                                 "Funkcja {label} SKK Morzkulc — przygotowujemy dostęp",
                                 buildOperatorWaitBody(...))

KROK 5'— Akcje dla CASE onboard (role == prezes)
  Tak samo jak wyżej, ALE:
  - forward target = osoba pełniąca funkcję prezesa (1:1, NOT zarzad_skk@)
  - (analogicznie do innych funkcji)

KROK 6 — Zapis stanu
  service_state/function_roles[role] = {mailbox, email: target, lastSyncAt}
  service_jobs status=done

KROK 7 — Manualna akcja admina (po dostaniu maila AKCJA)
  Admin (członek zarząd / KR / admin) otwiera mail "[Morzkulc][AKCJA]":
    - loguje się na konto funkcyjne (np. sprzetowiec@morzkulc.pl)
    - Awatar → Konto Google → Bezpieczeństwo → Hasła do aplikacji
    - Utwórz → nazwa "switek-k-smtp" → kopiuje hasło
    - Wkleja w gotowy szablon z maila AKCJA (podmiana <HASLO_TUTAJ>)
    - Wysyła operatorowi (switek.k@gmail.com)

KROK 8 — Operator konfiguruje Gmail Send-As
  W Gmailu (na koncie operatora):
    Ustawienia → Konta i import → "Wyślij pocztę jako" → "Dodaj inny adres"
    Nazwa: "Sprzętowiec SKK" (display)
    Adres: sprzetowiec@morzkulc.pl
    SMTP: smtp.gmail.com:587 TLS
    Login: sprzetowiec@morzkulc.pl
    Hasło: <z maila admina>
  Gmail wysyła kod weryfikacyjny na sprzetowiec@morzkulc.pl
  Auto-forwarding (z kroku 5b) przekazuje kod na switek.k@gmail.com
  Operator wpisuje kod → alias zweryfikowany

KROK 9 — Codzienne użycie
  Operator pisze nowy mail w Gmailu:
    Rozwija "Od" → wybiera sprzetowiec@morzkulc.pl
    Treść + wysyła
  Recipient widzi: From: "Sprzętowiec SKK" <sprzetowiec@morzkulc.pl>
  Reply → trafia na sprzetowiec@ → forward na switek.k@gmail.com (prywatna skrzynka)
```

### 7.2 Offboarding operatora (CASE offboard)

Analogicznie, ale w kolejności odwrotnej:
- Disable auto-forward + remove forwarding address
- Wyślij admin: „[AKCJA] Cofnięcie {label} — usuń app password {handle}-smtp"
- Wyślij operator: „Funkcja {label} — cofnięcie"
- State: email = ""

Po stronie admina: zaloguj się na konto funkcyjne → Hasła do aplikacji → znajdź `{handle}-smtp` → Usuń. Operator natychmiast dostanie 535 BadCredentials przy próbie wysyłki.

### 7.3 Zmiana operatora (CASE switch)

Kombinacja offboard + onboard w jednym sync — 4 maile (2 admin + 2 operator):
- Admin dostaje 2 maile AKCJA (usuń stary app password, utwórz nowy)
- Stary operator: off-boarding
- Nowy operator: czekaj na hasło

### 7.4 Brak zmian (CASE no-op)

Wartość w setup zgodna z prev state → details[role] = {noChange: true, email: prev}. Nic się nie dzieje.

Dla `prezes` dodatkowo: idempotentne ensureStaticForward (ale teraz to nieaktualne po decyzji D5 — forward 1:1, nie statyczny → kod do uproszczenia).

---

## 8. Stan kodu

### 8.1 Zmiany już wykonane (workdir, niezacommitowane)

| Plik | Zakres zmian |
|---|---|
| `functions/src/service/service_config.ts` | nowe pole `functionRoles` (4 funkcje z mailbox/label/forwardTarget); env vars (`SVC_SPRZETOWIEC_MAILBOX_EMAIL`, `SVC_SZKOLENIOWIEC_MAILBOX_EMAIL`, `SVC_SKARBNIK_MAILBOX_EMAIL`, `SVC_ZARZAD_MAILBOX_EMAIL`, `SVC_ZARZAD_FORWARD_TARGET`, `SVC_ADMIN_ACTION_EMAIL`); rozszerzony `SVC_PRIV_POSTER_GROUPS` o `skarbnik@`, `zarzad@`; walidacje |
| `functions/src/service/providers/googleWorkspaceProvider.ts` | nowe scopes `GMAIL_SETTINGS_BASIC` / `GMAIL_SETTINGS_SHARING`; helper `getGmailSettingsClient`; 5 metod: `addForwardingAddress`, `removeForwardingAddress`, `setAutoForwardRule`, `disableAutoForwardRule`, `getAutoForwarding` |
| `functions/src/service/tasks/usersSyncFunctionRolesFromSetup.ts` | PEŁNY PRZEPIS: 4 funkcje, CASE 1-4, walidacja krzyżowa, 5 typów maili |

### 8.2 Zmiany jeszcze do wykonania w kodzie

| # | Plik / Linia | Zmiana | Powód |
|---|---|---|---|
| K1 | `service_config.ts:133` `zarzadMailbox = ... \|\| "zarzad@morzkulc.pl"` | zamienić na `prezesMailbox = process.env.SVC_PREZES_MAILBOX_EMAIL \|\| "prezes@morzkulc.pl"` | `zarzad@` to grupa, nie konto user; prezes ma osobny adres `prezes@` |
| K2 | `service_config.ts:298` `mailbox: zarzadMailbox` (w functionRoles.prezes) | zamienić na `mailbox: prezesMailbox` | jw |
| K3 | `service_config.ts:100` `SVC_PRIV_POSTER_GROUPS` default | zamień `zarzad@morzkulc.pl` na `prezes@morzkulc.pl` w liście | zarzad@ to grupa, send-as z prezes@ |
| K4 | `service_config.ts:341-346` walidacje | poprawić nazwy zmiennych (prezes mailbox + prezes forwardTarget) | jw |
| K5 | `usersSyncFunctionRolesFromSetup.ts` — sekcja CASE dla prezes (linie ~321, 338-340, 389-401, 436-457, 541-560 helper `ensureStaticForward`) | UPROSZCZENIE: usuń specjalną obsługę „statyczny forward dla prezes" — teraz prezes ma forward 1:1 jak inne funkcje (decyzja D5) | upraszcza kod, usuwa helper `ensureStaticForward`, usuwa `isStaticForward` logic |
| K6 | `usersSyncRolesFromSheet.ts:338-351` | **USUNĄĆ** cały blok instruktażowy „Jako członek Zarządu/KR obsługujesz adres: zarzad@morzkulc.pl... Wyślij jako zarzad@..." | relikt — `zarzad@` to grupa, taka instrukcja nigdy nie zadziała; nowa funkcja prezesa idzie przez `usersSyncFunctionRolesFromSetup` |
| K7 | `service_config.ts:135` `adminActionEmail` default | jest już `zarzad_skk@morzkulc.pl` — **zmienić na** `zarzad@morzkulc.pl` | umbrella mailing list (decyzja D6) — szeroki audytorium |

### 8.3 Bez zmian (potwierdzone)

- `appscript/członkowie sympatycy SKK/setup_sync.gs` — enqueueServiceJob_ już dodane (linia 66)
- `appscript/*/env_config.gs` — `BOARD_GROUP_EMAIL = "zarzad@morzkulc.pl"` (zarzad@ zostaje grupą, ta konstanta zostaje)
- `public/core/render_shell.js`, `functions/src/api/registerUserHandler.ts` — user-facing kontakt „zarzad@morzkulc.pl" zostaje (grupa zostaje)
- `appscript/*/setup_sync.gs:ROLE_MAPPINGS` — nie zawiera `sprzetowiec@`/`szkoleniowiec@`, brak wpływu

---

## 9. Treści maili (szablony)

Subjects automatycznie z encoded-word RFC 2047 (polskie znaki działają poprawnie). Label per funkcja: `sprzętowca` / `szkoleniowca` / `skarbnika` / `prezesa`.

### MAIL 1 — ADMIN ONBOARDING (auto z taska)

Do: `zarzad@morzkulc.pl`

```
Temat: [Morzkulc][AKCJA] Nowy {label} — utwórz app password

Cześć,

W arkuszu setup dopisany został nowy {label}:
   {operator_email}

Twoja akcja (2-3 minuty):

1. Zaloguj się na konto {label.mailbox} (Gmail).
   • hasło konta + 2FA z Authenticatora
2. Awatar → Zarządzaj kontem Google → Bezpieczeństwo
3. "Weryfikacja dwuetapowa" → "Hasła do aplikacji"
4. "Utwórz" → nazwa: {operator_handle}-smtp → "Utwórz"
5. Skopiuj 16-znakowe hasło (bez spacji)
6. Wyślij operatorowi mail z szablonu poniżej — podmień <HASLO_TUTAJ>

—— SZABLON DO WYSŁANIA ——
(treść jak MAIL 2)
—— KONIEC SZABLONU ——

Auto-forwarding ze skrzynki {label.mailbox} został już ustawiony.

— Automat SKK
```

### MAIL 2 — OPERATOR WELCOME (admin wysyła ręcznie z szablonu)

```
Temat: Funkcja {label} SKK Morzkulc — konfiguracja skrzynki

Cześć!

Zostałeś dopisany do funkcji {label} w SKK Morzkulc.
Możesz wysyłać oficjalne maile z adresu {mailbox} ze swojego Gmaila.

Konfiguracja jednorazowa (5 min):

1. Gmail → koło zębate → "Zobacz wszystkie ustawienia"
2. Zakładka "Konta i import"
3. "Wyślij pocztę jako" → "Dodaj inny adres e-mail"
4. Wpisz:
   • Nazwa: {label.display}
   • Adres: {mailbox}
   • Zaznacz "Traktuj jako alias" → Dalej
5. SMTP: smtp.gmail.com, port 587, TLS
   Login: {mailbox}
   Hasło: <HASLO_TUTAJ>
   "Dodaj konto"
6. Gmail wyśle kod weryfikacyjny → dojdzie automatycznie
   przez forward na Twoją prywatną skrzynkę. Wpisz kod → "Zweryfikuj".

Gotowe. Przy nowej wiadomości rozwiń "Od" → wybierz {mailbox}.

Odpowiedzi na maile wysłane z tego adresu trafiają automatycznie
na Twoją prywatną skrzynkę.

W razie problemów: napisz na admin@morzkulc.pl.

SKK Morzkulc
```

### MAIL 3 — OPERATOR „CZEKAJ NA HASŁO" (auto z taska)

```
Temat: Funkcja {label} SKK Morzkulc — przygotowujemy dostęp

Cześć!

Zostałeś dopisany do funkcji {label} w SKK Morzkulc.
W ciągu najbliższych godzin admin przygotuje dla Ciebie hasło SMTP
do skrzynki funkcyjnej {mailbox} i wyśle Ci osobnego maila
z instrukcją konfiguracji w Gmailu.

W międzyczasie nic nie musisz robić — czekaj na maila od admin@morzkulc.pl.

SKK Morzkulc
```

### MAIL 4 — ADMIN OFFBOARDING (auto z taska)

```
Temat: [Morzkulc][AKCJA] Cofnięcie funkcji {label} — usuń app password

Cześć,

W arkuszu setup usunięty/zmieniony został {label}:
   {operator_email}  (poprzedni)

Twoja akcja (1 minuta):

1. Zaloguj się na konto {mailbox}
2. Zarządzaj kontem Google → Bezpieczeństwo → Hasła do aplikacji
3. Znajdź pozycję: {operator_handle}-smtp
4. Kliknij "Usuń"

Skutek: operator dostanie błąd 535 przy próbie wysyłki z aliasu.
{Auto-forwarding wyłączone | przepięte na nowego operatora}.

— Automat SKK
```

### MAIL 5 — OPERATOR OFFBOARDING (auto z taska)

```
Temat: Funkcja {label} SKK Morzkulc — cofnięcie

Cześć!

Twoja funkcja {label} w SKK Morzkulc została cofnięta.
Admin niedługo dezaktywuje Twoje hasło SMTP do skrzynki {mailbox}.

Możesz usunąć alias z ustawień Gmail:
   Ustawienia → Konta i import → przy {mailbox} → "usuń"

Jeśli to pomyłka, odezwij się do zarządu.

SKK Morzkulc
```

### MAIL 6 — ADMIN ALERT WALIDACJI (auto z taska)

```
Temat: [Morzkulc][BŁĄD] Konflikt w setup — funkcje nie są rozłączne

Cześć,

Próba sync setup wykryła niezgodność. Sync NIE został wykonany.

Wykryte problemy:
{lista konkretnych błędów, np.:}
- "switek.k@gmail.com" jest w 2 zmiennych: sprzetowiec, prezes
- "kowalski@gmail.com" w zmiennej skarbnik nie ma rola_zarzad
  w users_active

Popraw arkusz setup i ponów sync.

— Automat SKK
```

---

## 10. TO-DO admin console

Wykonać w admin.google.com (admin@morzkulc.pl):

### 10.1 Sprzątanie po pilocie

- [ ] Skasować konto testowe `pilot-funkcja@morzkulc.pl` (z OU „Konta funkcyjne SKK")

### 10.2 Aktualizacja etykiet grup (decyzja D11)

- [ ] `zarzad_skk@morzkulc.pl` → dodać etykietę **Bezpieczeństwo** (zachować Adresowa)
- [ ] (Opcjonalnie po audycie) `kr@`, `czlonkowie@` → dodać Bezpieczeństwo jeśli mają Drive perms
- [ ] (Opcjonalnie) `lista@`, `kandydaci@`, `sympatycy@` → upewnić się że mają tylko Adresowa

### 10.3 Skasowanie grup `sprzetowiec@` i `szkoleniowiec@`

**WAŻNE:** wykonać **bezpośrednio przed** utworzeniem kont USER pod tymi adresami (krok 10.4), żeby okno braku dostępu było minimalne.

- [ ] admin.google.com → Groups → skasuj `sprzetowiec@morzkulc.pl`
- [ ] admin.google.com → Groups → skasuj `szkoleniowiec@morzkulc.pl`

### 10.4 Utworzenie 4 kont funkcyjnych

W OU `Konta funkcyjne SKK` (powstałej w pilocie):

| Email | Imię | Nazwisko |
|---|---|---|
| `sprzetowiec@morzkulc.pl` | Sprzętowiec | SKK |
| `szkoleniowiec@morzkulc.pl` | Szkoleniowiec | SKK |
| `skarbnik@morzkulc.pl` | Skarbnik | SKK |
| `prezes@morzkulc.pl` | Prezes | SKK |

- [ ] Potwierdzono że `skarbnik@morzkulc.pl` jest wolny (nie istnieje jako grupa ani user)
- [ ] Potwierdzono że `prezes@morzkulc.pl` jest wolny
- [ ] Utworzono `sprzetowiec@morzkulc.pl`
- [ ] Utworzono `szkoleniowiec@morzkulc.pl`
- [ ] Utworzono `skarbnik@morzkulc.pl`
- [ ] Utworzono `prezes@morzkulc.pl`

### 10.5 Per konto: pierwsze logowanie + 2FA + backup codes

Dla każdego z 4 kont (przykład dla sprzetowiec@):

- [ ] Zaloguj się (admin → impersonate lub incognito)
- [ ] Powitalny ekran Workspace, akceptacja ToS
- [ ] Weryfikacja dwuetapowa ON z aplikacją Authenticator na **telefonie admina** (nie operatora!)
- [ ] Zapisz **backup codes** w sejfie zarządu / menedżerze haseł

Status per konto:
- [ ] sprzetowiec@ gotowe (ToS + 2FA + backup codes)
- [ ] szkoleniowiec@ gotowe
- [ ] skarbnik@ gotowe
- [ ] prezes@ gotowe

### 10.6 Domain-wide delegation — nowe scopes

W admin.google.com → Security → API controls → Domain-wide delegation:

- [ ] Znaleziono Service Account client ID naszej Cloud Functions
- [ ] Dodano do listy scopes (z przecinkami, bez kasowania istniejących):
  ```
  https://www.googleapis.com/auth/gmail.settings.basic,
  https://www.googleapis.com/auth/gmail.settings.sharing
  ```
- [ ] Authorize

### 10.7 Arkusz setup — dopisanie nowych zmiennych

Arkusz „członkowie sympatycy SKK" → zakładka `setup`:

- [ ] Dopisać wiersz `skarbnik` — wartość = mail osoby pełniącej funkcję skarbnika
- [ ] Dopisać wiersz `prezes` — wartość = mail osoby pełniącej funkcję prezesa
- [ ] Zweryfikować że osoby spełniają regułę: każda jest w `users_active` z `role_key=rola_zarzad`

---

## 11. TO-DO kod i deploy

### 11.1 Drobne korekty kodu (wg sekcji 8.2)

- [ ] K1 + K2: `service_config.ts` — zmiana `zarzadMailbox` → `prezesMailbox` (nowy env var, nowy default)
- [ ] K3: `service_config.ts:100` — zamień `zarzad@morzkulc.pl` na `prezes@morzkulc.pl` w `SVC_PRIV_POSTER_GROUPS`
- [ ] K4: poprawki walidacji + nazewnictwa zmiennych
- [ ] K5: `usersSyncFunctionRolesFromSetup.ts` — usuń specjalną obsługę „statyczny forward dla prezes" (helper `ensureStaticForward`, `isStaticForward`); prezes ma teraz forward 1:1 jak inne funkcje
- [ ] K6: `usersSyncRolesFromSheet.ts:338-351` — usuń blok instruktażowy „Wyślij jako zarzad@" (relikt)
- [ ] K7: `service_config.ts:135` — `adminActionEmail` default = `zarzad@morzkulc.pl` (umbrella)

### 11.2 Build + lint + commit

- [ ] `npm --prefix functions run build` — pass
- [ ] `npm --prefix functions run lint` — pass
- [ ] Commit utworzony (zalecane: 2 commity — (1) kod taska + provider + config, (2) konsolidacja dokumentów planu)

### 11.3 Deploy

- [ ] `firebase use prod`
- [ ] `firebase deploy --only functions --project morzkulc-e9df7` — pass
- [ ] Weryfikacja env zgodnie z `feedback_env_deploy.md` (gcloud functions describe)

### 11.4 Lista posting policy refresh

Po deploy: odpalić jednorazowo `lista.enforcePostingPolicy`, żeby nowe konta USER (`skarbnik@`, `prezes@`, oraz `sprzetowiec@`, `szkoleniowiec@` po re-utworzeniu) trafiły jako MANAGER w `lista@`.

- [ ] Firebase Console → Firestore → `service_jobs` → Add document:
  - Document ID: `manual-lista-policy-post-rolemailbox-1`
  - Pola: `taskId="lista.enforcePostingPolicy"`, `payload={}`, `status="queued"`, `attempts=0`, `createdAt=now`, `updatedAt=now`
- [ ] Poczekaj na `status=done`, `lastError=null`

---

## 12. Weryfikacja end-to-end

### 12.1 Dry-run sync (opcjonalny, ale polecam)

- [ ] Firebase Console → Firestore → `service_jobs` → Add document:
  - Document ID: `manual-syncfunctionroles-dryrun-1`
  - `taskId="users.syncFunctionRolesFromSetup"`, `payload={dry: true}`, `status="queued"`, `attempts=0`, `createdAt=now`, `updatedAt=now`
- [ ] Po `status=done` → w logach Cloud Functions zobacz `case decided`, `details` per rola

### 12.2 Realny sync

- [ ] W arkuszu menu Morzkulc → „sync setup"
- [ ] Po 5-15 sek: `service_jobs` ma nowy doc z `taskId=users.syncFunctionRolesFromSetup`, `status=done`
- [ ] `service_state/function_roles` ma 4 wpisy (sprzetowiec/szkoleniowiec/skarbnik/prezes) z `mailbox`, `email`, `lastSyncAt`

### 12.3 Skutki na Workspace

- [ ] W Gmailu `sprzetowiec@morzkulc.pl` → Ustawienia → Forwarding → forward na `switek.k@gmail.com` aktywny (disposition: archive)
- [ ] Analogicznie dla `szkoleniowiec@`, `skarbnik@`, `prezes@`

### 12.4 Maile

- [ ] `zarzad@morzkulc.pl` (umbrella) dostał 4 maile [Morzkulc][AKCJA]
- [ ] Każdy z 4 operatorów dostał mail „Funkcja {label} SKK Morzkulc — przygotowujemy dostęp"

### 12.5 Akcje admin (×4)

Per funkcja:
- [ ] Admin utworzył app password z nazwą `{handle}-smtp` na koncie funkcyjnym
- [ ] Admin wysłał operatorowi mail z hasłem (z gotowego szablonu)

### 12.6 Konfiguracja Gmail przez operatorów (×4)

- [ ] Każdy operator skonfigurował „Wyślij jako" z app passwordem
- [ ] Kod weryfikacyjny dotarł na prywatną skrzynkę (przez auto-forward)
- [ ] Alias zweryfikowany

### 12.7 Test wysyłki

- [ ] sprzętowiec wysłał z `From: sprzetowiec@morzkulc.pl` na `lista@morzkulc.pl` → mail przeszedł (polityka ALL_MANAGERS_CAN_POST)
- [ ] szkoleniowiec j.w.
- [ ] skarbnik j.w.
- [ ] prezes z `From: prezes@morzkulc.pl` (display „Zarząd SKK") na `lista@` j.w.

### 12.8 Test reply

- [ ] Ktoś odpisał na maila sprzętowca → reply trafia do `switek.k@gmail.com` przez forwarding
- [ ] Analogicznie dla pozostałych funkcji

---

## 13. Ryzyka i mitigacje

| Ryzyko | Skala | Mitigacja |
|---|---|---|
| Backup codes 2FA konta funkcyjnego utracone | Średnia | Zapisać w sejfie zarządu / menedżerze haseł, dostęp ≥2 osób |
| Admin niedostępny → onboarding opóźniony | Niska | Klub akceptuje opóźnienie 1-2 dni; więcej osób w zarząd@ może wykonać akcję |
| Admin zapomni usunąć app password przy offboardingu | Średnia | MAIL 4 z konkretną nazwą do usunięcia |
| Operator nie skonfiguruje „Wyślij jako" | Niska | MAIL 2 ma konkretne kroki |
| DWD nie pozwala dodać forwarding bez weryfikacji kodem | Średnia | Sprawdzić przy implementacji; fallback: admin manualnie potwierdza link tylko pierwszy raz |
| Konflikt w setup (walidacja) zostawi system w niespójnym stanie | Niska | Walidacja krzyżowa NA POCZĄTKU sync, atomowo; brak partial state |
| Workspace zablokuje SMTP z app password w przyszłości | Średnia (long-term) | Wariant fallback: Gmail API + DWD (Variant C z briefu) |
| Po skasowaniu grupy i utworzeniu konta USER pod tym samym adresem — Workspace może wymagać czasu na propagację | Niska | Wykonać w jednym oknie czasowym; sprawdzić logowanie po utworzeniu |
| Maile przychodzące do skasowanej grupy w oknie przejściowym (przed utworzeniem konta) | Niska | Grupy są puste/jednoosobowe; okno < 5 min; ryzyko praktycznie zerowe |

---

## 14. Otwarte pytania

Brak otwartych pytań — wszystkie decyzje zatwierdzone (D1-D11). Plan gotowy do realizacji.

Jeśli pojawi się coś nieoczekiwanego podczas wdrożenia (np. DWD wymaga ręcznej weryfikacji forwarding, lub jakaś grupa kryje uprawnienia Drive których nie przewidzieliśmy) — dokumentujemy tutaj.

---

## Historia dokumentu

Konsoliduje 4 wcześniejsze:
- `DECISION_FUNCTION_MAILBOXES_REVISED.md` (audyt grup, decyzje architektoniczne) — usunięty
- `role_TO_DO.md` (checklista wdrożeniowa) — usunięty
- `wspoldzielone_skrzynki_PLAN.MD` (plan techniczny z app password) — usunięty
- `sprzetowiec_szkoleniowiec_TO_DO_PLAN.MD` (oryginalny plan z 2026-05-14, model grup) — usunięty (już nieaktualny — kierunek się zmienił)