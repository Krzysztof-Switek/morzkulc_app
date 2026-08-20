# Analiza produktu i UX — SKK Morzkulc

> Status: analiza · bez zmian w kodzie

Podstawa: kod frontendu (`public/core/*`, `public/modules/*`, `public/styles/*`), `READ_ME.md`, `CLAUDE.md`, mapa kontekstu i katalog `Audyty/`. Wszystkie stwierdzenia poniżej mają wskazane źródło w plikach. Rekomendacji redesignu w tym dokumencie **nie ma** — to diagnoza.

---

## 01 — Czym jest produkt

PWA klubu kajakowego: rezerwacja sprzętu, „godzinki" jako wewnętrzna waluta pracy, kalendarz imprez, zapisy na basen, ranking km/wywrotek, skrypt kursu i panel zarządu. Frontend bez bundlera (czyste ES modules), backend Firebase Functions, a **źródłem prawdy dla danych są arkusze Google** — aplikacja pokazuje stan po ręcznym lub nocnym sync (`READ_ME.md` §5).

| | |
|---|---|
| **6** | rol (sympatyk, kursant, kandydat, członek, KR, zarząd) |
| **10** | modułów w rejestrze + auto-moduł „Moje rezerwacje" |
| **~34** | odrębne widoki/ekrany (z modalami i raportami) |

---

## 02 — Inwentarz ekranów

Routing hash-owy `#/{moduleId}/{routeId}`; identyfikatory modułów (`modul_1…`) pochodzą z Firestore `setup/app`, więc nazwa techniczna ekranu zależy od konfiguracji, nie od kodu.

### A. Wejście i konto
*4 ekrany · `index.html`, `render_shell.js`*

- **Logowanie** (`—`, appRoot ukryty) — nagłówek + „Zaloguj" (Google popup/redirect), przełącznik motywu. Cała aplikacja ukryta.
- **„Uzupełnij dane (jednorazowo)"** (`gate`) — imię, nazwisko, ksywa (+ ręczne „Sprawdź dostępność"), telefon, data urodzenia, zgoda RODO, zgoda statut, checkbox „Jestem kursantem". Blokuje dostęp do czegokolwiek.
- **„Potwierdź swój adres e-mail"** (`gate` → potwierdzenie) — gdy bilans otwarcia dopasował osobę po imieniu i nazwisku pod innym mailem.
- **Profil** (`home/profile`) — chipy (rola, status, składki/wpisowe, saldo godzinek), staż kandydacki z progresem 20 h, opiekunowie, 3 checkboxy powiadomień e-mail, box „Klub", „Moje rezerwacje" (3 pozycje), banner aktualizacji SW.

### B. Start (dashboard)
*4 warianty rolowe · `render_shell.js:renderHomeDashboard`*

- **członek/kandydat** — 3 statystyki inline (godziny na wodzie, km, pkt) + siatka kafelków: Sprzęt, Godzinki (saldo), Imprezy, Basen, Ranking, [Zarząd], [Klub] + sekcje „Najbliższe wydarzenia" i „Zajęcia basenowe".
- **sympatyk** — bez statystyk i godzinek; kafelki Sprzęt (podgląd), Imprezy, Basen, Ranking, „Gdzie pływamy" + sekcja „Twój dostęp" z komunikatem.
- **kursant** — statystyki wywrotolotka, kafelki Sprzęt (zależnie od flagi `kurs_wypożycza`), Godzinki kursowe, Basen, Wywrotolotek, Skrypt, „Gdzie pływamy" + „Wydarzenia kursowe". Po `koniec_kursu` → wariant „uprawnienia wygasły".
- **zarząd/KR** — jak członek + kafelek „Zarząd" z badge liczby oczekujących godzinek (cache 5 min w sessionStorage).

### C. Sprzęt + rezerwacje
*6 zakładek + 4 modale + 3 widoki rezerwacji*

- `gear/kayaks · paddles · lifejackets · helmets · sprayskirts · throwbags` — lista sprzętu: szukajka, do 7 filtrów pill (Sprawny, W mojej wadze, Ulubione, Dostępny, Basen, Prywatny, Uszkodzony), select typu/rozmiaru, karty ze zdjęciem z Firebase Storage.
- **modale** — galeria zdjęć (prev/next), „Rezerwacja kajaka" (data od/do), „Rezerwacja sprzętu" (bundle: dodawanie pozycji z kategorii + „Sprawdź dostępność"), „Podaj swoją wagę".
- `my_reservations/list · /{id}` — lista własnych rezerwacji + osobny ekran edycji (kajak, data od/do) i wariant edycji rezerwacji dedykowanej.

### D. Godzinki, imprezy, basen, ranking, kurs, klub
*15 widoków*

- `godzinki/history · /submit` — pasek salda + data wygaśnięcia, tabela wpisów (przyznane / wydane / przekreślone „zwolnienie" i „zwrócono" / „oczekuje"), formularz zgłoszenia (ilość, data pracy, opis), sekcja „Wykup salda ujemnego" pojawiająca się warunkowo.
- `imprezy/list · /submit` — lista imprez z serduszkiem „Interesuje mnie", formularz zgłoszenia (nazwa, daty, miejsce, opis, kontakt, link).
- `basen/sessions · /karnet · /admin` — lista sesji z zapisem/wypisem, mój karnet, panel admina (utwórz sesję, odwołaj sesję po ID, przyznaj karnet po UID).
- `km/form · rankings · events · map · my-stats · my-logs · kursant-ranking` — 7 zakładek: formularz wpisu (12 pól, GPS), rankingi, statystyki imprez, mapa (osobna strona `map.html`), moje statystyki, moje wpisy, wyniki kursu.
- `kurs/skrypt · kurs_godzinki/info · klub/klucze` — czytnik skryptu (6 rozdziałów HTML + grafiki), ekran godzinek kursanta, ekran klubowy (zarząd, KR, konto, dokumenty, klucze).

### E. Panel Zarządu
*2 zakładki + 5 raportów · `admin_pending_module.js`, `modules/raporty/*`*

- **Administracja** — oczekujące godzinki i imprezy (akceptuj/odrzuć), odrzucone, problemy sprzętowe (duplikaty ID, prywatne kajaki bez maila/opłaty), martwe joby, ujemne salda, kursanci po terminie, przycisk wymuszenia sync, link do folderu arkuszy.
- **Raporty** — launcher kafelkowy z szukajką → Wypożyczenia sprzętu (z wymuszonym anulowaniem), Składki i uprawnieni do głosowania, Najbardziej aktywni, Najczęściej wypożyczane, Aktywność użytkownika. Druk/PDF przez `@media print`.
- **poza SPA** — `map.html` (mapa miejscówek), `404.html`.

---

## 03 — Rekonstrukcja nawigacji

### Trzy równoległe warstwy wejścia

1. **Header (sticky)** — tytuł, motyw, ikona profilu, Zaloguj/Wyloguj. Ikona profilu prowadzi do `#/home/profile`, który jest jednocześnie centrum salda, stażu, powiadomień i rezerwacji.
2. **Pasek modułów** — desktop: rząd „pigułek" pod headerem; mobile (≤720 px): *fixed bottom bar* z poziomym przewijaniem. Zawiera Start + moduły widoczne dla roli.
3. **Kafelki dashboardu** — druga, niezależna ścieżka do tych samych modułów, plus jedyna droga do „Klub" i „Gdzie pływamy" (Klub i `kurs_godzinki` są celowo wykluczone z paska).

**Wewnątrz modułu**: nagłówek z dwoma ikonami — „Wróć" i „Start". Oba wywołują `setHash("home","home")`, czyli robią to samo. Poziom niżej: zakładki (`gearTab` / `modTab` / zakładki km i basenu), w sprzęcie dodatkowo drugi rząd zakładek na jedną pozycję („Rzutki").

### Co decyduje o widoczności

- `setup/app` → `enabled` + `access.rolesAllowed` + tryby `prod/test/off` (`access_control.js`).
- `session.allowed_actions` (np. `gear.reserve`, `admin.pending`) → kafelki i akcje.
- Flagi kursowe: `kursWypozycza`, `kursExpired`, `kursPreviewMode`.
- Status „zawieszony" blokuje *wszystkie* moduły.

> Skutek: ten sam ekran startowy ma cztery istotnie różne warianty, a etykiety zmieniają się rolowo („Ranking" → „Wywrotolotek", „Kurs" → „Skrypt") — trudno mówić o jednym, stałym modelu nawigacji.

---

## 04 — Główne user flows

**F1 · Pierwsze logowanie → rola**
Google login → `POST /api/register` → jeśli profil niekompletny: formularz-brama → (opcjonalnie) potwierdzenie e-maila z bilansu otwarcia → `location.reload()` → `GET /api/setup` → budowa modułów → dashboard. Rola nadawana z bilansu otwarcia albo domyślnie sympatyk; zmiana roli tylko przez arkusz + sync.

**F2 · Rezerwacja sprzętu (najważniejszy flow produktu)**
Dashboard/pasek → zakładka kategorii → (filtr „W mojej wadze" wymusza modal z wagą) → karta sprzętu → modal rezerwacji → data od / data do → „Zapisz rezerwację" → backend liczy koszt godzinek, limity roli i konflikty → sukces lub błąd w modalu. Wariant bundle: dokładanie kolejnych kategorii + „Sprawdź dostępność". Podgląd i anulowanie: „Moje rezerwacje" lub sekcja w profilu (`window.confirm`), edycja na osobnym ekranie.

**F3 · Godzinki: zgłoszenie → zatwierdzenie → wydatek**
Użytkownik zgłasza pracę (ilość, data, opis) → wpis „oczekuje" → zarząd akceptuje w panelu (lub w arkuszu) → `adminApprovalWriteBack` / nocny sync → saldo rośnie. Wydatki powstają automatycznie przy rezerwacji; przy ujemnym saldzie pojawia się „Wykup salda ujemnego", którego rozliczenie odbywa się poza aplikacją.

**F4 · Impreza: zgłoszenie → akceptacja → kalendarz → powiadomienia**
Formularz zgłoszenia → status oczekujący → panel Zarządu → po akceptacji trigger `onEventApproved`, sync do Google Calendar i maile (nowa impreza / zbliżająca się / „interesuje mnie", wg preferencji z profilu).

**F5 · Basen · F6 · Kilometrówka · F7 · Ścieżka kursanta**
Basen: lista sesji → zapis (karnet lub opłata godzinkowa) → wypis w oknie `basen_okno_anulowania_h`; admin tworzy/odwołuje sesje i przydziela karnety. Kilometrówka: formularz wpisu (data, akwen, trudność, miejsce, km, godziny, wywrotki) → przebudowa rankingów i mapy jako zadania serwisowe. Kursant: samo-nadanie roli przy rejestracji → skrypt + wywrotolotek + godzinki kursowe → rezerwacje tylko przy fladze i przed `koniec_kursu` → po terminie utrata uprawnień i oczekiwanie na ręczną decyzję zarządu.

**F8 · Praca zarządu (przecina wszystkie flow)**
Panel pokazuje kolejkę i pozwala akceptować/odrzucać, ale *tooltip w tym samym panelu informuje, że „zatwierdzanie odbywa się w arkuszu Google"*, a zmiany wracają nocnym syncem (imprezy ~04:45, godzinki ~05:15, kalendarz 05:00). Zarząd pracuje więc równolegle w dwóch narzędziach, z opóźnieniem do 24 h.

---

## 05 — Ergonomia mobile

CSS jest mobile-first i ma sensowne fundamenty (dolny pasek z `env(safe-area-inset-bottom)`, rezerwacja `padding-bottom` pod paskiem, `min-height:44px` w nav i `.actions`, inputy 15 px, motyw dark/light). Problemy zaczynają się w warstwach niżej.

### Działa dobrze

- Dolny pasek nawigacji zamiast hamburgera, z safe-area i blur.
- Pola formularzy 44–48 px wysokości, natywne `input[type=date]`.
- PWA: manifest, ikony, SW z wykrywaniem nowej wersji.
- Kafelki startu 2 kolumny → 4 od 480 px; sekcje ładowane asynchronicznie, szkielet widoczny od razu.

### Boli w kciuku

- Pasek dolny: `flex-wrap:nowrap; overflow-x:auto` z ukrytym scrollbarem — przy 6–8 modułach część pozycji jest niewidoczna i nic tego nie sygnalizuje.
- **Brak stanu aktywnego** — `renderNav` nie oznacza bieżącego modułu; użytkownik nie wie, gdzie jest.
- Cele dotyku poniżej progu: statystyki startu i pigułki filtrów mają `min-height:30px`, ikony edycji/anulowania rezerwacji ~24 px (`padding:4px 6px`).
- Typografia 10–11 px w kafelkach, chipach i metadanych sprzętu — na słońcu i w rękawiczkach nieczytelna.
- Sprzęt: 7 checkboxów + 2 selecty w jednym pasku, bez licznika aktywnych filtrów i bez „wyczyść".
- Modale rezerwacji to długie formularze w kartach ze stopką przycisków — na małym ekranie akcja bywa poza kciukiem, a zdarza się podwójne przewijanie (body + karta).
- `window.confirm`/`alert` dla akcji destrukcyjnych (anulowanie rezerwacji, odwołanie sesji basenowej) — systemowy dialog bez kontekstu i bez informacji o zwrocie godzinek.
- Panel admina basenu wymaga ręcznego wpisania „ID sesji" i „Firebase UID" — nieużywalne na telefonie.

---

## 06 — Problemy UX i ich waga

Waga = wpływ na wykonanie zadania × liczba dotkniętych osób × częstotliwość. **P0** = blokuje lub systematycznie kosztuje zaufanie; **P1** = realne tarcie w codziennym użyciu; **P2** = szlif.

### P0

**Dwa źródła prawdy: aplikacja i arkusz**
Zmiana w arkuszu bez kliknięcia „sync" jest niewidoczna, a część synców chodzi nocą (do 24 h). Aplikacja nigdzie nie pokazuje, jak stare są dane ani czy sync się udał — użytkownik i zarząd widzą różne stany i tłumaczą to sobie „apka nie działa" (`READ_ME.md` §5, §11).
*Dotyczy wszystkich · objaw: utrata zaufania*

**Koszt rezerwacji nieznany przed zatwierdzeniem**
Modal mówi wprost: „Koszt godzinek i konflikty terminów sprawdza backend". Cena w godzinkach, limity roli i kolizja terminu ujawniają się dopiero po kliknięciu „Zapisz rezerwację" — w walucie, której saldo decyduje o dostępie do sprzętu. To najczęstsza operacja w produkcie.
*Dotyczy kandydatów i członków · objaw: błąd po fakcie*

**Rejestracja jako mur przed produktem**
Sześć pól + dwie zgody + ręczne „Sprawdź dostępność" ksywy, zanim ktokolwiek zobaczy choćby listę sprzętu. Po zapisie następuje `location.reload()`. Copy zdradza implementację („Zapisze dane w Firestore i dopiero wtedy wczyta moduły"), a błędy walidacji wracają jako sklejony tekst z JSON-a.
*Dotyczy każdego nowego · objaw: porzucenie*

**Nawigacja bez „gdzie jestem"**
Brak stanu aktywnego w pasku, „Wróć" i „Start" prowadzą w to samo miejsce, na mobile część modułów jest schowana w przewijaniu bez wskazówki, a te same moduły osiąga się dwiema równoległymi drogami (pasek i kafelki) — z wyjątkiem „Klub" i „Gdzie pływamy", dostępnych tylko z dashboardu.
*Dotyczy wszystkich, zwłaszcza mobile · objaw: gubienie się*

### P1

**Techniczne komunikaty w interfejsie**
„Brak tokenu sesji. Odśwież stronę." (w ośmiu modułach), „Nieznany moduł: X", „Błąd modułu: X" z surowym stackiem w `<pre>`, „Nie udało się…" bez podpowiedzi co dalej. Ciche `catch` zostawiają „…" i „—" bez wyjaśnienia.
*Dotyczy wszystkich · objaw: bezradność*

**Profil jako worek na wszystko**
Pod ikoną w headerze siedzą: saldo godzinek, termin składek, progres stażu, opiekunowie, preferencje powiadomień, dane klubowe, aktywne rezerwacje i banner aktualizacji aplikacji. Rzeczy operacyjne (rezerwacje, saldo) i konfiguracyjne (powiadomienia) mieszają się w jednej długiej karcie.
*Dotyczy członków i kandydatów · objaw: nieodnajdywalność*

**Filtrowanie sprzętu przeciążone, bez informacji zwrotnej**
Siedem niezależnych filtrów pill (część wzajemnie sprzeczna: „Sprawny" i „Uszkodzony"), dwa selecty, szukajka z przykładami w placeholderze, brak licznika wyników przy filtrach i resetu. Filtr „W mojej wadze" wywołuje modal z pytaniem o wagę w środku zadania.
*Dotyczy rezerwujących · objaw: praca na oślep*

**Akcje destrukcyjne na systemowym `confirm`**
„Na pewno anulować tę rezerwację?" nie mówi, ile godzinek wraca ani czy termin był w oknie bezpłatnym; odwołanie sesji basenowej wypisuje wszystkich i zwraca karnety — też za jednym systemowym OK. Brak undo, brak podsumowania skutku po operacji.
*Dotyczy wszystkich + admina · objaw: ryzyko pomyłki*

**Panel Zarządu operuje na identyfikatorach technicznych**
Odwołanie sesji po „ID sesji", karnet po „Firebase UID", diagnostyka martwych jobów obok zadań merytorycznych, mieszanka poziomów: kolejka zatwierdzeń, ostrzeżenia sync sprzętu i awarie infrastruktury w jednej liście.
*Dotyczy zarządu i KR · objaw: praca dla wtajemniczonych*

**Wyłączone i puste stany bez wyjaśnienia**
Kafelek „Basen" bywa `disabled` bez powodu i bez tooltipa; sekcje kończą się „Brak…" bez następnego kroku; kursant po `koniec_kursu` dostaje komunikat „Zarząd wkrótce nada Ci rolę" bez żadnej akcji ani terminu.
*Dotyczy sympatyków i kursantów · objaw: martwe ścieżki*

### P2

**Spójność języka i wzorców**
Trzy różne spinnery („Morzkulc myśli…", „Ładowanie…", „Ładowanie wydarzeń…"), zamiennie „impreza/wydarzenie", ta sama treść pod nazwą „Ranking / Wywrotolotek / Kilometrówka", zakładki sprzętu w dwóch rzędach dla jednej pozycji, formularz km wymaga km i godzin z instrukcją „wpisz 0" w placeholderze, kontrast tekstu pomocniczego 0.65–0.70 alfa.
*Dotyczy wszystkich · objaw: hałas*

**Sesja i aktualizacje**
Twarde wylogowanie po 24 h bez ostrzeżenia; banner nowej wersji widoczny tylko w profilu, choć „Zaloguj" po cichu wykonuje hard reload; brak zapisu stanu widoku (filtry, zakładka) przy odświeżeniu.
*Dotyczy PWA na telefonie · objaw: nagłe resety*

---

## 07 — Czego nie mogłem ocenić z kodu

- Realna zawartość `setup/app`: które moduły są włączone i dla których rol — cała nawigacja zależy od tych danych, nie od kodu.
- Rozkład ruchu: ilu użytkowników korzysta z PWA na telefonie vs desktop, które ekrany są używane codziennie, a które raz w roku.
- Faktyczne punkty porzuceń w rejestracji i rezerwacji (brak analityki w kodzie).
- Jak zarząd naprawdę dzieli pracę między aplikację i arkusze — to determinuje, czy P0 nr 1 jest problemem produktu czy procesu.
