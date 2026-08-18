# SKK Morzkulc — przewodnik dla Zarządu

> Bez doświadczenia programistycznego. Opisuje docelowy stan po konsolidacji ustawień
> (rozdz. 7-8). Jeśli coś nie zgadza się z aplikacją — sprawdź
> `Audyty/17.08_konsolidacja_setup_i_dysk_PLAN_TO_DO.md`, migracja może jeszcze trwać.

**Adres aplikacji:** https://morzkulc-e9df7.web.app (brak przyjaznej domeny — używać
tego adresu).

**Zasada nr 1:** aplikacja nie jest edytowana bezpośrednio. Dane zmienia się w
**arkuszach Google Sheets**, potem trzeba je **zsynchronizować** (menu arkusza →
„Morzkulc" → „sync X"). Bez sync zmiana w arkuszu jest niewidoczna w aplikacji.

---

## 1. Słowniczek

| Pojęcie | Znaczenie |
|---|---|
| Arkusz | Plik Google Sheets |
| Zakładka | Karta na dole arkusza |
| Sync | Menu „Morzkulc" w arkuszu → przenosi dane z arkusza do aplikacji |
| Firestore (baza danych) | Gdzie aplikacja trzyma dane po sync. Nigdy nie edytować bezpośrednio. |
| Rola | Poziom uprawnień osoby w klubie |
| Panel Zarządu | Ekran w aplikacji dla ról Zarząd/KR |
| Zmienna setup | Pojedyncza wartość konfiguracyjna w arkuszu App_SETUP |

## 2. Role i statusy

| Rola | Kto | Uprawnienia |
|---|---|---|
| Sympatyk | zainteresowany, nie na kursie | przegląd sprzęt/imprezy/ranking, zapis na basen |
| Kursant | na szkoleniówce | rezerwacja sprzętu jak Kandydat, tylko w oknie (flaga `kurs_wypożycza` ON → do dnia z `koniec_kursu`) |
| Kandydat | po kursie, staż | rezerwacja sprzętu, godzinki, opiekun stażu |
| Członek | pełnoprawny, płaci składki | pełny dostęp |
| KR | funkcja klubowa | jak Członek + Panel Zarządu |
| Zarząd | zarząd klubu | jak KR + administracja |

Statusy: **Aktywny** / **Zawieszony** (zablokowany, np. brak składek) / **Skreślony**.

**Zmiana roli:** kolumna „Rola" w arkuszu członków → sync członkowie. Wyjątek: rolę
Kursant użytkownik może nadać sobie sam przy 1. logowaniu („jestem kursantem"), jeśli
e-mail jest na liście kursu z bieżącym rocznikiem.

## 3. Ścieżka użytkownika

**Sympatyk/Kursant → Kandydat → Członek**

1. 1. logowanie kontem Google → automatycznie Sympatyk (albo Kursant, jeśli zaznaczy
   i jest na liście).
2. Zarząd wpisuje do arkusza członków: rola „Kandydat" + opiekun stażu + rok
   szkoleniówki.
3. Po stażu → Zarząd zmienia rolę na „Członek".
4. Składki semestralne — brak wpłaty przez zbyt długi czas = auto-zawieszenie (próg:
   `zawieszenie_człoknostwa` w App_SETUP).

Każda zmiana roli po sync: aktualizuje uprawnienia + grupy Google + wysyła mail do
osoby.

## 4. Moduły

| Moduł | Funkcja |
|---|---|
| Sprzęt | rezerwacja kajaków/wioseł/kamizelek/kasków — limity i koszt wg roli (App_SETUP) |
| Godzinki | „waluta" pracy na rzecz klubu — zgłaszanie godzin, płatność za sprzęt, saldo do limitu |
| Imprezy | kalendarz wyjazdów, zgłoszenia wymagają zatwierdzenia w Panelu Zarządu |
| Basen | zapisy, karnety, odwołania |
| Kurs | ekran kursanta — info o szkoleniówce, ranking wywrotolotek kursu |
| Ranking / Wywrotolotek | ranking km/wywrotek — osobny arkusz kilometrówka |
| Klub | Zarząd/KR, konto klubowe, dokumenty |
| Zarząd | panel administracyjny (rozdz. 6) |
| Automat serwisowy | bez ekranu — sync, maile, terminy w tle |

Włączanie modułów i dostęp per rola: App_SETUP → zakładka `APP`.

## 5. Jak działa synchronizacja

```
Arkusz (Zarząd edytuje) → sync (klik w menu) → Firestore (niewidoczne) → Aplikacja (user widzi)
```

- Bez kliknięcia sync zmiana w arkuszu nie działa. Najczęstsza przyczyna „nie działa".
- Menu **Morzkulc** w każdym arkuszu = lista dostępnych synców dla tego arkusza.
- Część synców (role/status, godzinki, imprezy) odpala się też **automatycznie w
  nocy** — do 24h opóźnienia. Pilne zmiany (np. `kurs_wypożycza`) synchronizować
  ręcznie.
- Błąd danych (brak PESEL, zdublowana ksywa, brak opiekuna stażu) → sync **zatrzymuje
  się z komunikatem co poprawić**, nic się nie zapisuje częściowo.

## 6. Panel Zarządu (moduł „Zarząd" w aplikacji)

- **Zatwierdzenia** — imprezy i godzinki czekające na akceptację/odrzucenie.
- **Raporty** — wypożyczony sprzęt, ujemne salda godzinek nad limitem, kursanci po
  terminie, duplikaty numerów sprzętu.
- **Administracja** — ręczne odpalenie zadania serwisowego (zamiast czekać na nocny sync).

## 7. Mapa arkuszy

Wszystkie w folderze Dysku **„1_ZARZAD" → „APLIKACJA ARKUSZE"**.

| Arkusz | Do czego | Kto edytuje |
|---|---|---|
| App_SETUP | wszystkie ustawienia + treść maili (rozdz. 8) | Zarząd |
| członkowie sympatycy SKK | lista osób, role/statusy, godzinki, imprezy, info o kursie | Zarząd |
| Kajaki / Sprzęt | inwentarz sprzętu | Sprzętowiec/Zarząd |
| Godzinki 2026 i korekty | archiwum/korekty z migracji | Zarząd (rzadko) |
| kilometrówka | historia/ranking km | prowadzący ranking |

Arkusz „Szkoleniówka" — **nieużywany**, zawartość w „członkowie sympatycy SKK"
(zakładki Kurs, Co po kursie) i App_SETUP (`cena_kursu`, `koniec_kursu`).

## 8. App_SETUP — 6 zakładek

**Zapis zmiany:** zmień komórkę → menu Morzkulc → „sync setup" → aktywne od razu.

### 8.1 `APP` — moduły
Wiersz = moduł. `Aktywny` (TRUE/FALSE) włącza/wyłącza. `Dostep_X` (TRUE/FALSE) = widoczność per rola.

### 8.2 `VARS_CZLONKOWIE` — parametry klubu
Format: `Zmienna_nazwa | Wartość_zmiennej | Grupa zmiennych | Opis`.

| Zmienna | Ustawia |
|---|---|
| `składka` | wysokość składki (PLN/semestr) |
| `semestr_1/2_start/stop` | okresy rozliczeniowe składek |
| `zawieszenie_człoknostwa` | po ilu semestrach bez wpłaty = auto-zawieszenie |
| `kurs_wypożycza` | TRUE/FALSE — czy kursanci mogą rezerwować sprzęt |
| `koniec_kursu` | dzień września, do którego trwa darmowe okno kursanta/kandydata (1-30) |
| `cena_kursu` | cena szkoleniówki (PLN) |
| `sprzetowiec`/`szkoleniowiec`/`skarbnik`/`prezes` | e-mail osoby na danej funkcji |
| `konto_klubowe`/`bank_klubowy`/`stan_konta` | dane finansowe (moduł Klub) |
| `akademik_adres` | adres kluczy do siedziby |
| `powiadomienie_imprezy` | ile dni przed imprezą wysłać przypomnienie |

### 8.3 `VARS_SPRZET` — zasady rezerwacji
| Zmienna | Ustawia |
|---|---|
| `kandydat/członek/zarząd_max_time` | max tygodni jednej rezerwacji, wg roli |
| `kandydat/członek/zarząd_max_items` | max sztuk naraz, wg roli |
| `max_reservation_length` | absolutny limit dni rezerwacji |
| `offset_rezerwacji` | bufor dni przed/po (bez opłaty) |
| `godzinki_za_X` (kajak/wiosło/kamizelkę/...) | koszt godzinkowy za dzień, per kategoria |
| `godzinki_za_sprzęt_prywatny` | miesięczna opłata za prywatny kajak w klubie |
| `zarzad_nie_płaci_za_sprzet` | TRUE/FALSE |

Kursant = limity Kandydata (`kandydat_max_time`/`kandydat_max_items`), celowo wspólne.

### 8.4 `VARS_BASEN`
`basen_admin_mail`, `basen_cena_za_godzine`, `basen_cena_za_karnet`,
`basen_ile_wejsc_na_karnet`, `basen_limit_uczestników`, `basen_okno_anulowania_h`
(godziny na bezpłatną rezygnację).

### 8.5 `VARS_GODZINKI`
`limit_ujemnego_salda` (próg ostrzeżenia), `lata_waznosci` (po ilu latach godzinki
wygasają, FIFO).

### 8.6 `MESSAGES` — treść maili
`id | temat | treść | opis`. Fragmenty w `{klamrach}` podstawia aplikacja — nie
usuwać, wolno zmieniać tylko tekst dookoła.

Szablony: powitalny (3 warianty wg dostępu do listy), zmiana roli, nowa impreza,
zbliżająca się impreza, digest zaległości dla Zarządu, dostęp do akademika (nadanie/
cofnięcie), anulowanie rezerwacji sprzętu, odwołanie zajęć basenowych, przekroczony
limit ujemnego salda.

## 9. Zadania krok po kroku

**Dodanie członka / zmiana roli:** arkusz członków → kolumna Rola/Status → sync
członkowie. (ID nadaje się samo przy 1. logowaniu — nie wpisywać ręcznie.)

**Zmiana ceny/limitu:** App_SETUP, właściwa zakładka → zmień wartość → sync setup.

**Włączenie rezerwacji dla kursantów:** `VARS_CZLONKOWIE.kurs_wypożycza = TRUE` +
upewnić się, że każdy kursant ma „Rok szkoleniówki" w arkuszu członków → sync setup +
sync członkowie. Wyłączenie: `FALSE`.

**Zmiana osoby funkcyjnej** (sprzętowiec/szkoleniowiec/skarbnik/prezes):
`VARS_CZLONKOWIE` → e-mail w danym wierszu → sync setup.

**Zatwierdzenie imprezy/godzinek:** aplikacja → moduł Zarząd → Zatwierdzenia →
akceptuj/odrzuć (wraca też do arkusza).

**Wymuszone anulowanie rezerwacji sprzętu:** moduł Zarząd → rezerwacje sprzętu →
Anuluj + powód → godzinki wracają automatycznie, mail do usera i Zarządu.

**Sync pokazał błąd:** przeczytaj komunikat (wskazuje wiersz/kolumnę) → popraw →
odpal ponownie.

## 10. Konta funkcyjne

4 adresy stanowiskowe: `sprzetowiec@`, `szkoleniowiec@`, `skarbnik@`, `prezes@`
(`@morzkulc.pl`). Mail „w imieniu" funkcji, odpowiedź trafia na prywatną skrzynkę
osoby przypisanej w `VARS_CZLONKOWIE`. Zmiana osoby = zmiana e-maila w App_SETUP, nic
więcej.

`zarzad@morzkulc.pl` — osobna grupa mailowa całego Zarządu (nie stanowisko), tu trafiają
odpowiedzi z maili systemowych.

## 11. Diagnostyka

| Objaw | Sprawdź |
|---|---|
| Zmiana w arkuszu nie widoczna w apce | Czy kliknięto sync? |
| Sync: błąd, nic się nie zapisało | Treść komunikatu — wskazuje wiersz/kolumnę |
| User nie może się zalogować/coś zrobić | Jego rola/status w arkuszu członków |
| Kursant nie rezerwuje mimo flagi ON | Czy ma „Rok szkoleniówki"; czy nie minął `koniec_kursu` |
| Błąd wygląda na błąd aplikacji, nie danych | Potrzebna pomoc programisty |

## 12. Kontakt techniczny

Krzysztof Świtek, switek.k@gmail.com.
