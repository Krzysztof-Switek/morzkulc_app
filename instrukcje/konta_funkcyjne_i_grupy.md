# Konta funkcyjne i grupy zarządu SKK Morzkulc

Dokument dla zarządu — co to są adresy `@morzkulc.pl`, jak ich używać, jak nimi zarządzać.

---

## TL;DR

Klub ma kilka adresów `@morzkulc.pl`. Część to **konta** (można się zalogować, jest skrzynka Gmail), część to **grupy** (lista mailingowa — wiadomość na adres trafia do wielu osób).

- **4 konta funkcyjne**: `sprzetowiec@`, `szkoleniowiec@`, `skarbnik@`, `prezes@` — z nich wysyłamy oficjalne maile w roli funkcyjnej. Operator pisze ze swojego prywatnego Gmaila, ale odbiorca widzi adres `@morzkulc.pl`.
- **2 grupy zarządu**: `zarzad@` (kierownictwo klubu) i `zarzad_skk@` (Drive zarządu). Różne role — nie mylić.
- Kto pełni jaką funkcję — ustawiasz w arkuszu **„członkowie sympatycy SKK"** → zakładka `setup`.

---

## 1. Adresy `@morzkulc.pl` — szybka mapa

| Adres | Typ | Funkcja |
|---|---|---|
| `admin@morzkulc.pl` | konto | administrator Workspace, właściciel infrastruktury |
| `sprzetowiec@morzkulc.pl` | konto funkcyjne | wysyłka maili w sprawach sprzętu klubowego |
| `szkoleniowiec@morzkulc.pl` | konto funkcyjne | wysyłka maili w sprawach szkoleń |
| `skarbnik@morzkulc.pl` | konto funkcyjne | wysyłka maili w sprawach finansów |
| `prezes@morzkulc.pl` | konto funkcyjne | wysyłka maili z ramienia prezesa (display: „Zarząd SKK") |
| `zarzad@morzkulc.pl` | **grupa** | umbrella — admin + KR + cały zarząd; tu trafiają powiadomienia AKCJA z apki |
| `zarzad_skk@morzkulc.pl` | **grupa** | tylko aktualny zarząd (4 osoby); używana do uprawnień Drive |
| `kr@morzkulc.pl` | grupa | Komisja Rewizyjna |
| `czlonkowie@morzkulc.pl` | grupa | członkowie stowarzyszenia |
| `lista@morzkulc.pl` | grupa | lista dyskusyjna klubu |
| `kandydaci@`, `sympatycy@` | grupy | mailingi grup tymczasowych |

---

## 2. Konto vs grupa — różnica

**Konto** (np. `sprzetowiec@`)
- ma swoją skrzynkę Gmail i hasło
- da się na nie zalogować
- może wysyłać maile (pojawia się jako `From:`)
- ma 2FA — autoryzator na telefonie admina

**Grupa** (np. `zarzad@`)
- to lista mailingowa — nie ma skrzynki, nie da się zalogować
- mail wysłany **NA** adres grupy trafia do wszystkich członków grupy
- nie da się wysłać **Z** adresu grupy

---

## 3. `zarzad@` vs `zarzad_skk@` — najczęstsza pomyłka

Obydwa to **grupy** (nie konta), ale pełnią różne role.

### `zarzad@morzkulc.pl` — umbrella (kierownictwo klubu)
- członkowie: `admin@` + `kr@` + `zarzad_skk@`
- gdy ktoś z zewnątrz pisze „do zarządu" — pisze na `zarzad@` i dostają to wszyscy z kierownictwa (admin, KR, cały zarząd)
- używana również przez apkę do wysyłania powiadomień **`[Morzkulc][AKCJA]`** (np. „utwórz app password dla nowego sprzętowca")
- **NIE wolno usuwać, NIE wolno zamieniać na konto user**

### `zarzad_skk@morzkulc.pl` — tylko aktualny zarząd
- członkowie: 4 osoby aktywnego zarządu
- ta grupa daje **uprawnienia do plików Drive zarządu**
- aktualizowana automatycznie z arkusza setup (rola `rola_zarzad` w `users_active` → automat dopisuje do grupy)
- **NIE wolno usuwać, NIE wolno mylić z `zarzad@`**

**Krótko:** chcesz wysłać mail do kierownictwa — `zarzad@`. Chcesz dać dostęp do dokumentu zarządu — `zarzad_skk@`.

---

## 4. Konta funkcyjne — jak działają

Konta `sprzetowiec@`, `szkoleniowiec@`, `skarbnik@`, `prezes@` to **konta serwisowe** — używane do wysyłki oficjalnych maili.

### Model „Wyślij jako"

- Operator (np. obecny sprzętowiec) ma swoją prywatną skrzynkę Gmail.
- W tym Gmailu skonfigurowany jest alias `sprzetowiec@morzkulc.pl`.
- Gdy pisze nowy mail, w polu „Od" wybiera `sprzetowiec@morzkulc.pl`.
- Odbiorca widzi: `From: "Sprzętowiec SKK" <sprzetowiec@morzkulc.pl>`.

### Reply (odpowiedzi)

- Ktoś odpisuje na adres `sprzetowiec@morzkulc.pl`.
- Mail trafia do skrzynki funkcyjnej.
- Ze skrzynki funkcyjnej jest **auto-forward** na prywatny mail operatora.
- Operator widzi reply w swoim Gmailu i odpowiada (znów jako alias).

**Operator NIE loguje się na konto funkcyjne** — wszystko przelatuje na jego prywatny mail. Skrzynka funkcyjna jest pusta, służy tylko jako przekaźnik.

### Reguły sztywne

1. **1 funkcja = 1 osoba.** Każda z 4 funkcji to jedna osoba.
2. **Funkcje są rozłączne.** Ta sama osoba nie może pełnić dwóch funkcji jednocześnie.
3. Operator MUSI być w `users_active` z rolą `rola_zarzad`.

---

## 5. Setup w arkuszu — kto pełni jaką funkcję

**Arkusz:** „członkowie sympatycy SKK" → zakładka **`setup`**.

W kolumnie `zmienna_nazwa` są m.in. wiersze:

| zmienna | wartość | znaczenie |
|---|---|---|
| `sprzetowiec` | prywatny mail osoby pełniącej funkcję | np. `switek.k@gmail.com` |
| `szkoleniowiec` | prywatny mail | np. `zwirowski@gmail.com` |
| `skarbnik` | prywatny mail | osoba pełniąca funkcję skarbnika |
| `prezes` | prywatny mail | osoba pełniąca funkcję prezesa |

### Zmiana operatora

1. Edytujesz wartość w arkuszu (np. wpisujesz nowy mail przy `sprzetowiec`).
2. Z menu **„Morzkulc" → „sync setup"**.
3. Apka uruchamia walidację, przepina forward na nową osobę, wysyła maile.

### Walidacja (ZANIM cokolwiek się stanie)

Jeśli:
- ten sam mail jest w dwóch funkcjach,
- osoba nie ma `rola_zarzad` w `users_active`,
- wartość zawiera wiele adresów (przecinek/średnik),

→ apka wysyła mail **`[Morzkulc][BŁĄD]`** na `zarzad@`, a **sync NIE jest wykonany**. Popraw arkusz i ponów sync.

---

## 6. Workflow — co się dzieje po zmianie w setup

### A. Nowy operator (onboarding)

1. Edytujesz arkusz → „sync setup".
2. Apka **automatycznie**:
   - ustawia auto-forward na koncie funkcyjnym → prywatny mail nowego operatora,
   - wysyła **`[Morzkulc][AKCJA]`** na `zarzad@` — instrukcja dla admina,
   - wysyła nowemu operatorowi mail „przygotowujemy dostęp".
3. **Admin** (osoba z dostępem do konta funkcyjnego, np. obecny admin Workspace) wykonuje akcję z maila AKCJA (~5 min):
   - loguje się na konto funkcyjne (np. `sprzetowiec@`),
   - Zarządzaj kontem Google → Bezpieczeństwo → Hasła do aplikacji,
   - tworzy app password z nazwą `<handle-operatora>-smtp` (np. `switek-k-smtp`),
   - kopiuje 16-znakowe hasło,
   - wysyła operatorowi mail z hasłem (gotowy szablon jest w mailu AKCJA — kopiuj-wklej, podmień `<HASLO_TUTAJ>`).
4. **Operator** konfiguruje w swoim Gmailu „Wyślij pocztę jako":
   - Ustawienia → Konta i import → „Dodaj inny adres",
   - Adres: `sprzetowiec@morzkulc.pl`, „Traktuj jako alias",
   - SMTP: `smtp.gmail.com:587`, login = adres funkcyjny, hasło = z maila admina,
   - Gmail wysyła kod weryfikacyjny — dochodzi przez auto-forward,
   - Operator wpisuje kod → gotowe.

### B. Zmiana operatora (switch)

To samo co onboard + offboard w jednym sync. Apka wyśle:
- **2 maile** na `zarzad@`: „usuń stary app password" + „utwórz nowy app password",
- mail do **starego** operatora: cofnięcie,
- mail do **nowego** operatora: czekaj na hasło.

### C. Usunięcie operatora (offboarding)

Wyczyszczasz wartość w arkuszu → „sync setup". Apka:
- wyłącza forward na koncie funkcyjnym,
- wysyła AKCJA „usuń app password `<handle>-smtp`" na `zarzad@`,
- wysyła operatorowi mail o cofnięciu.

Admin musi usunąć app password ręcznie — od tej chwili stary operator dostaje błąd `535 BadCredentials` przy próbie wysyłki z aliasu.

---

## 7. Kto może co zrobić

| Akcja | Kto może |
|---|---|
| Edytować arkusz `setup` (zmienić operatora funkcji) | każdy z dostępem do edycji arkusza (zarząd) |
| Wykonać akcję z maila `[Morzkulc][AKCJA]` (utworzyć/usunąć app password) | każdy kto ma dostęp do konta funkcyjnego — zwykle admin Workspace |
| Wysyłać jako `sprzetowiec@` / `szkoleniowiec@` / `skarbnik@` / `prezes@` | tylko aktualny operator funkcji (1 osoba) |
| Wysłać mail **do** `zarzad@` | każdy (grupa otwarta) |
| Edytować dokumenty Drive zarządu | członkowie `zarzad_skk@` (aktualny zarząd) |

---

## 8. Ściąga — z jakiego adresu pisać

| Sytuacja | Skąd wysłać |
|---|---|
| Oficjalna sprawa sprzętowa | `sprzetowiec@` (alias w Gmailu operatora) |
| Oficjalna sprawa szkoleniowa | `szkoleniowiec@` |
| Sprawa finansowa, składki | `skarbnik@` |
| Komunikat w imieniu prezesa / zarządu | `prezes@` (display „Zarząd SKK") |
| Do zarządu (z zewnątrz lub jako członek klubu) | wyślij **na** `zarzad@` |
| Do listy dyskusyjnej klubu | wyślij **na** `lista@` |
| Do członków stowarzyszenia | wyślij **na** `czlonkowie@` |

---

## 9. Bezpieczeństwo

- **2FA na kontach funkcyjnych** — autoryzator na telefonie **admina** (nie operatora). Backup codes zapisane w sejfie zarządu / menedżerze haseł, dostęp ≥ 2 osób.
- **App passwordy** są jednorazowe, generowane przez admina przy onboardingu. Nazwa `<handle>-smtp` (np. `switek-k-smtp`) — łatwa identyfikacja przy rewokacji.
- **Przy zmianie operatora app password MUSI być usunięty** — admin dostaje mail AKCJA z dokładną nazwą do usunięcia. Bez tego stary operator dalej może wysyłać z aliasu.
- Hasła do kont funkcyjnych (do logowania w Gmail) — w sejfie zarządu.

---

## 10. Co zrobić, gdy coś nie działa

| Objaw | Co sprawdzić |
|---|---|
| Edytowałem arkusz, „sync setup" nie zrobił nic | Sprawdź skrzynkę `zarzad@` — czy przyszedł mail `[Morzkulc][BŁĄD]`. Walidacja nie przeszła. |
| Operator dostaje `535 BadCredentials` przy wysyłce | App password został usunięty / wygasł. Trzeba przejść onboarding od nowa (admin tworzy nowy app password). |
| Operator nie dostał kodu weryfikacyjnego od Gmaila | Sprawdź czy auto-forward na koncie funkcyjnym jest włączony (w Gmailu na koncie funkcyjnym → Ustawienia → Przekazywanie). |
| Reply do operatora nie dochodzi | j.w. — auto-forward wyłączony lub przepięty na innego operatora. |

W razie problemów: napisz na `admin@morzkulc.pl`.