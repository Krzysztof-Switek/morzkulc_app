# Plan naprawy — SKK Morzkulc

> Status: DO WERYFIKACJI · kod nietknięty
> 13 grup tematycznych · 71 punktów · 13 × P0 · 34 × P1 · 24 × P2

Każdy punkt ma stały identyfikator (np. `B2`, `E4`) — odsyłaj się do nich w komentarzach: „usuń B2, E4 zostaw". Punkty oznaczone **[DO POTWIERDZENIA]** to te, o których najbardziej podejrzewam, że opisują zamierzoną logikę, a nie błąd. „Waga" pochodzi z audytu; „Koszt" to szacunek pracy: S / M / L.

---

## A — Zaufanie do danych i sync z arkuszami
*P0 · źródło: dwa źródła prawdy*

**A1 · Znacznik świeżości danych w każdym module opartym o arkusz** — P0 · Koszt: M
Jedna linia „Dane z 20.08, 05:15" pod nagłówkiem godzinek, imprez, rankingu, sprzętu. Czyta czas ostatniego udanego sync z tego samego źródła, z którego panel zarządu czyta joby.

**A2 · Widoczny stan „oczekuje na sync" na poziomie rekordu** — P0 · Koszt: M
Wpis zgłoszony lub zatwierdzony, ale jeszcze nie przeniesiony, dostaje znacznik „w drodze — pojawi się po nocnym sync (ok. 05:15)". Dziś użytkownik widzi tylko „oczekuje" i nie wie, czy czeka na zarząd, czy na maszynę.

**A3 · Sync jako operacja z informacją zwrotną, nie „strzał w ciemno"** — P0 · Koszt: M
Przycisk wymuszenia sync pokazuje postęp, wynik („zaktualizowano 14 rekordów") i błąd z powodem. Blokada dwuklikowania w trakcie.

**A4 · Baner awarii sync dla wszystkich** `[DO POTWIERDZENIA]` — P1 · Koszt: S
Gdy sync nie przeszedł od ponad 24 h — pasek „Dane mogą być nieaktualne" nad treścią, nie tylko w panelu zarządu. Do potwierdzenia, czy chcecie o tym informować szeregowych członków.

**A5 · Jeden słownik pojęć „skąd pochodzi ta liczba"** — P2 · Koszt: S
Krótka pomoc przy saldzie, składkach i stażu: co je zmienia, kto je zmienia, jak szybko. Zdejmuje z zarządu powtarzalne pytania.

---

## B — Rezerwacja sprzętu: koszt i pewność
*P0 · najczęstsza operacja w produkcie*

**B1 · Wycena w godzinkach na żywo w modalu rezerwacji** — P0 · Koszt: L
Po wybraniu daty od/do: „Koszt: 3 godzinki · saldo po rezerwacji: 12". Wymaga endpointu wyceny (dry-run) po stronie backendu — dziś liczy to dopiero zapis.

**B2 · Konflikt terminu widoczny przed zapisem** — P0 · Koszt: L
Zajęte dni oznaczone w wyborze daty albo komunikat pod polem od razu po zmianie zakresu, zamiast błędu po „Zapisz rezerwację".

**B3 · Limity roli komunikowane zawczasu** — P0 · Koszt: M
„Kandydat: maks. 2 dni z rzędu" widoczne w modalu, a nie jako odmowa po wysłaniu. Dotyczy też blokady przy ujemnym saldzie.

**B4 · Potwierdzenie rezerwacji z podsumowaniem skutku** — P1 · Koszt: S
Po sukcesie: co, kiedy, ile godzinek zeszło, do kiedy można anulować bezpłatnie, plus skrót do „Moich rezerwacji". Dziś modal po prostu się zamyka.

**B5 · Waga użytkownika zbierana poza flow rezerwacji** `[DO POTWIERDZENIA]` — P1 · Koszt: S
Pytanie o wagę w profilu (opcjonalne), a filtr „W mojej wadze" pokazuje delikatną zachętę zamiast modala przerywającego zadanie. Możliwe, że celowo pytacie dopiero w momencie użycia.

**B6 · Bundle: jedna wycena i jeden komunikat dla całego zestawu** — P1 · Koszt: M
Rezerwacja wielu pozycji pokazuje sumaryczny koszt i mówi, która pozycja blokuje zapis, zamiast ogólnej odmowy.

**B7 · Sensowne domyślne daty** — P2 · Koszt: S
„Od" na najbliższy dostępny dzień, „do" = „od", skróty „dziś" / „weekend". Mniej stukania w natywny date picker na telefonie.

---

## C — Wejście: logowanie, rejestracja, nadanie roli
*P0 · pierwsze 90 sekund*

**C1 · Podział formularza-bramy na to, co konieczne teraz, i resztę** `[DO POTWIERDZENIA]` — P0 · Koszt: M
Minimum do wejścia (imię, nazwisko, zgody), pozostałe pola (telefon, data urodzenia, ksywa) przy pierwszej akcji, która ich wymaga. Możliwe, że statut lub RODO wymaga kompletu z góry — wtedy punkt wypada.

**C2 · Automatyczne sprawdzanie ksywy** — P0 · Koszt: S
Walidacja po opuszczeniu pola z podpowiedzią wolnych wariantów; usunięcie osobnego przycisku „Sprawdź dostępność".

**C3 · Błędy walidacji przy polach, nie jako sklejony tekst** — P0 · Koszt: M
Komunikat pod konkretnym polem, treść po polsku, bez surowej odpowiedzi API. Zachowanie wpisanych danych po błędzie.

**C4 · Copy bez języka implementacji** — P1 · Koszt: S
Wycięcie zdań o Firestore i wczytywaniu modułów z ekranu bramy i z ekranu potwierdzenia e-maila.

**C5 · Przejście po zapisie bez pełnego przeładowania strony** — P1 · Koszt: M
Zamiast `location.reload()` — dociągnięcie sesji i wejście na dashboard. Na słabym LTE reload wygląda jak zawieszenie.

**C6 · Ekran „co dalej" dla świeżego sympatyka** — P1 · Koszt: S
Po rejestracji jasno: co możesz teraz, czego nie, co trzeba zrobić, by dostać więcej, i do kogo się zgłosić. Dziś jest tylko komunikat o ograniczonym dostępie.

**C7 · Ekran potwierdzenia e-maila wyjaśnia, dlaczego pyta** — P2 · Koszt: S
„Znaleźliśmy Cię na liście członków pod innym adresem" plus ścieżka odmowy („to nie ja").

---

## D — Nawigacja i orientacja
*P0 · dotyczy każdego ekranu*

**D1 · Stan aktywny w pasku modułów** — P0 · Koszt: S
Bieżący moduł wyróżniony wizualnie i przez `aria-current`; przy wejściu na moduł pasek dowija aktywną pozycję do widoku. Najtańsza duża poprawa w całym planie.

**D2 · Rozróżnienie „Wróć" i „Start", albo usunięcie jednego** — P0 · Koszt: M
Dziś oba robią `setHash("home","home")`. Propozycja: „Wróć" = poziom wyżej w obrębie modułu (ze szczegółu do listy), „Start" zostaje jako jedyne wyjście do dashboardu.

**D3 · Dolny pasek mieści wszystko, co ma mieścić** — P0 · Koszt: M
Stały zestaw 4–5 pozycji + „Więcej" dla resztek, zamiast poziomego przewijania z ukrytym scrollbarem, w którym część modułów jest niewidoczna.

**D4 · „Klub" i „Gdzie pływamy" osiągalne inaczej niż tylko z kafelka** `[DO POTWIERDZENIA]` — P1 · Koszt: S
Dziś celowo wykluczone z paska. Jeśli to zamierzone (rzadkie użycie), punkt do wykreślenia — wtedy wystarczy D5.

**D5 · Jasny podział roli: pasek = skoki między modułami, kafelki = wejścia w zadania** — P1 · Koszt: M
Kafelki przestają dublować pasek jeden-do-jednego, a zaczynają prowadzić do konkretnej czynności („Zarezerwuj kajak", „Zgłoś godzinki") z liczbą do ogarnięcia.

**D6 · Zakładki sprzętu w jednym rzędzie** — P1 · Koszt: S
Drugi rząd istnieje dla jednej pozycji („Rzutki") — scalenie albo przeniesienie do selecta kategorii.

**D7 · Zapamiętywanie zakładki i filtrów w adresie** — P2 · Koszt: M
Odświeżenie lub powrót z modala nie zrzuca do pierwszej zakładki; da się wysłać komuś link do konkretnego widoku.

---

## E — Ergonomia mobile
*P1 · telefon na pomoście, mokre ręce*

**E1 · Próg 44 px na wszystkich elementach dotykowych** — P1 · Koszt: S
Podniesienie: pigułki filtrów i statystyki startu (dziś `min-height:30px`), ikony edycji/anulowania rezerwacji (~24 px), serduszko „Interesuje mnie", checkboxy powiadomień.

**E2 · Dolna granica typografii 13 px** — P1 · Koszt: S
Likwidacja 10–11 px w kafelkach, chipach i metadanych sprzętu; podniesienie kontrastu tekstu pomocniczego z 0.65 alfa do minimum WCAG AA.

**E3 · Modale rezerwacji jako arkusz od dołu, z przyklejoną akcją** — P1 · Koszt: M
Główny przycisk zawsze w zasięgu kciuka; likwidacja podwójnego przewijania (body + karta).

**E4 · Formularze z klawiaturą pod typ danych** — P1 · Koszt: S
`inputmode="decimal"` dla km i godzin, `tel` dla telefonu, `autocomplete` na danych osobowych. Mniej przełączania klawiatury.

**E5 · Tabele godzinek i raportów czytelne bez poziomego przewijania** — P2 · Koszt: M
Na wąskim ekranie układ „wiersz jako karta"; wersja tabelaryczna zostaje na desktopie i w druku.

**E6 · Zdjęcia sprzętu lżejsze i z rozmiarem z góry** — P2 · Koszt: M
Miniatury zamiast pełnych plików ze Storage, `width`/`height` na obrazkach, `loading="lazy"` — koniec skakania listy przy ładowaniu.

**E7 · Galeria zdjęć z gestem przesunięcia** — P2 · Koszt: S
Dziś tylko prev/next; swipe + licznik „3 / 7".

---

## F — Komunikaty, błędy, stany ładowania
*P1 · widoczne w ośmiu modułach*

**F1 · „Brak tokenu sesji. Odśwież stronę." zastąpione automatycznym odświeżeniem tokenu** — P1 · Koszt: M
Ponowienie w tle; komunikat tylko gdy naprawdę trzeba się zalogować, i wtedy z przyciskiem „Zaloguj ponownie" zamiast prośby o odświeżenie.

**F2 · Jeden wzorzec błędu: co się stało, co zrobić, jak spróbować ponownie** — P1 · Koszt: M
Zamiast „Nie udało się…" i surowego stacku w `<pre>`. Szczegóły techniczne schowane pod „Pokaż szczegóły" dla zgłoszeń do zarządu.

**F3 · Koniec cichych `catch`** — P1 · Koszt: M
Miejsca, które dziś zostawiają „…" albo „—", mówią wprost „nie udało się pobrać" i dają ponowienie. Dotyczy statystyk startu, sekcji wydarzeń, salda w kafelkach.

**F4 · Jeden stan ładowania w całej aplikacji** — P2 · Koszt: S
Trzy różne spinnery („Morzkulc myśli…", „Ładowanie…", „Ładowanie wydarzeń…") → jeden wzorzec, najlepiej szkielet treści.

**F5 · „Nieznany moduł" i „Błąd modułu" po ludzku** — P2 · Koszt: S
Ekran zastępczy z powrotem na Start zamiast technicznego napisu z identyfikatorem modułu.

---

## G — Profil i godzinki
*P1 · centrum wszystkiego*

**G1 · Rozdzielenie profilu na „mój stan" i „ustawienia"** `[DO POTWIERDZENIA]` — P1 · Koszt: M
Saldo, składki, staż, rezerwacje = operacyjne (bliżej dashboardu); powiadomienia, dane osobowe, motyw = ustawienia. Jeśli świadomie chcecie jednego miejsca „wszystko o mnie", punkt wypada.

**G2 · Saldo godzinek zrozumiałe bez tłumaczenia** — P1 · Koszt: S
„Masz 12 godzinek, wygasają 31.12" + jedno zdanie, na co idą i skąd się biorą. Dziś jest sama liczba i data.

**G3 · Legenda i spójne oznaczenia w historii godzinek** — P1 · Koszt: S
Przekreślenia („zwolnienie", „zwrócono"), „oczekuje", przyznane i wydane — dziś czytelne tylko dla wtajemniczonych.

**G4 · „Wykup salda ujemnego" z jasną ścieżką** `[DO POTWIERDZENIA]` — P1 · Koszt: S
Ile do zapłaty, gdzie, jaki tytuł przelewu, kiedy zniknie blokada. Rozliczenie i tak idzie poza aplikacją — pytanie, ile z tego chcecie tu pokazywać.

**G5 · Staż kandydacki jako konkret** — P2 · Koszt: S
„14 z 20 h · zostało 6" plus co się dzieje po osiągnięciu progu i kto o tym decyduje.

**G6 · Preferencje powiadomień z natychmiastowym zapisem i potwierdzeniem** — P2 · Koszt: S
Plus opis, co dokładnie przychodzi na maila przy każdej z trzech opcji.

---

## H — Szukanie i filtrowanie sprzętu
*P1 · 7 filtrów + 2 selecty w jednym pasku*

**H1 · Licznik wyników i „wyczyść filtry"** — P1 · Koszt: S
„23 z 68 kajaków" nad listą plus reset. Dziś filtruje się na oślep.

**H2 · Rozwiązanie sprzeczności „Sprawny" vs „Uszkodzony"** `[DO POTWIERDZENIA]` — P1 · Koszt: S
Jedna grupa wykluczająca (stan: dowolny / sprawny / uszkodzony) zamiast dwóch niezależnych przełączników. Jeśli kombinacja ma sens w waszych danych (np. trzeci stan „w naprawie"), punkt do wykreślenia.

**H3 · Sensowny stan domyślny listy** — P1 · Koszt: M
Domyślnie „sprawny + dostępny w wybranym terminie", z widocznym oznaczeniem, że filtr działa. Reszta filtrów zostaje dla świadomego szukania.

**H4 · Zwinięcie rzadkich filtrów pod „Więcej filtrów"** — P2 · Koszt: S
Na widoku zostają 2–3 najczęstsze; resztę widać po rozwinięciu, z licznikiem aktywnych.

**H5 · Pusty wynik z wyjściem** — P2 · Koszt: S
„Nic nie pasuje — zdejmij filtr «W mojej wadze»" zamiast pustej listy.

---

## I — Akcje destrukcyjne i odwracalność
*P1 · anulowania, odwołania, odrzucenia*

**I1 · Zamiana `window.confirm` na potwierdzenie ze skutkiem** — P1 · Koszt: M
„Anulujesz rezerwację kajaka Pyranha, 22–24.08. Wróci 3 godzinki." — zamiast „Na pewno anulować tę rezerwację?". Dotyczy też odrzucenia godzinek i imprez w panelu.

**I2 · Odwołanie sesji basenowej pokazuje zasięg** — P1 · Koszt: M
„Wypiszesz 14 osób i zwrócisz 9 wejść z karnetów" + informacja, czy poszły maile. Dziś jedno systemowe OK.

**I3 · Potwierdzenie po operacji, nie tylko przed** — P1 · Koszt: M
Krótki komunikat „Anulowano · zwrócono 3 godzinki" z możliwością cofnięcia w kilkanaście sekund tam, gdzie backend na to pozwala.

**I4 · Okno bezpłatnego anulowania widoczne przy rezerwacji** — P2 · Koszt: S
Na liście „Moje rezerwacje": „bezpłatne anulowanie do 21.08, 18:00" — dziś reguła istnieje tylko w konfiguracji.

---

## J — Panel Zarządu i raporty
*P1 · praca dla wtajemniczonych*

**J1 · Jedna odpowiedź na pytanie „gdzie się zatwierdza"** `[DO POTWIERDZENIA]` — P0 · Koszt: M
Dziś panel ma przyciski akceptacji, a tooltip obok mówi, że zatwierdza się w arkuszu. Trzeba wybrać jedno miejsce i drugie opisać jako podgląd. To decyzja procesowa zarządu, nie projektowa.

**J2 · Rozdzielenie „kolejki do zrobienia" od „diagnostyki systemu"** — P1 · Koszt: M
Zatwierdzenia i zadania merytoryczne osobno, martwe joby i ostrzeżenia sync w zakładce technicznej. Dziś wszystko na jednej liście.

**J3 · Wybór osoby i sesji z listy, nie przez wpisywanie ID** — P1 · Koszt: M
Odwołanie sesji z listy sesji, karnet przez szukajkę po nazwisku/ksywie — koniec ręcznego „Firebase UID" i „ID sesji". Bez tego panel jest nieużywalny na telefonie.

**J4 · Kontekst przy każdej pozycji kolejki** — P1 · Koszt: M
Zgłoszenie godzinek pokazuje, kto, ile już ma, jaki jest jego staż i historia — żeby decydować bez skakania do arkusza.

**J5 · Powód przy odrzuceniu** — P2 · Koszt: S
Krótkie pole na uzasadnienie, widoczne potem dla zgłaszającego — dziś odrzucenie jest bez wyjaśnienia.

**J6 · Raporty: eksport i data wygenerowania** — P2 · Koszt: S
Nagłówek z zakresem danych i datą (ważne przy druku), plus CSV tam, gdzie dziś jest tylko wydruk.

---

## K — Stany puste, wyłączone i rolowe
*P1 · martwe ścieżki*

**K1 · Każdy wyłączony kafelek mówi, dlaczego jest wyłączony** — P1 · Koszt: S
„Basen — zapisy otwierają się we wrześniu" albo „dostępne dla członków". Dziś kafelek bywa `disabled` bez żadnego wyjaśnienia.

**K2 · Kursant po `koniec_kursu` dostaje termin i akcję** — P1 · Koszt: S
Zamiast „Zarząd wkrótce nada Ci rolę" — co konkretnie się dzieje, do kiedy, i co zrobić, jeśli nic się nie stanie.

**K3 · Status „zawieszony" wyjaśniony na wejściu** — P1 · Koszt: S
Dziś blokuje wszystkie moduły. Powinien mówić powód i drogę wyjścia, zamiast pustej aplikacji.

**K4 · Puste sekcje z następnym krokiem** — P2 · Koszt: S
„Brak najbliższych wydarzeń" → „Zgłoś imprezę"; „Brak rezerwacji" → „Zarezerwuj sprzęt".

**K5 · Podgląd modułów niedostępnych dla roli** `[DO POTWIERDZENIA]` — P2 · Koszt: M
Sympatyk widzi, co dostanie jako członek (bez możliwości akcji). Może być celowo ukryte — wtedy do wykreślenia.

---

## L — Język i spójność
*P2 · hałas w interfejsie*

**L1 · Jeden termin na jedno pojęcie** `[DO POTWIERDZENIA]` — P2 · Koszt: S
„impreza" vs „wydarzenie", „Ranking" vs „Wywrotolotek" vs „Kilometrówka". Część różnic może być świadomą różnicą rolową (kursant vs członek) — wtedy zostają.

**L2 · Etykiety pól zamiast instrukcji w placeholderach** — P2 · Koszt: S
Formularz kilometrówki mówi „wpisz 0" w placeholderze — powinno to być w etykiecie lub w opcjonalności pola. Placeholder znika po pierwszym znaku.

**L3 · Wymagalność pól zgodna z prawdą** — P2 · Koszt: S
Formularz km wymaga i kilometrów, i godzin; przegląd, gdzie „wymagane" jest naprawdę potrzebne (12 pól to dużo na jedno wejście na wodę).

**L4 · Spójny format daty i liczb** — P2 · Koszt: S
Jeden zapis daty w listach, tabelach i potwierdzeniach; jednostki zawsze przy liczbie („12 godzinek", „48 km").

---

## M — Sesja, PWA, aktualizacje
*P2 · nagłe resety*

**M1 · Wygaśnięcie sesji bez utraty pracy** `[DO POTWIERDZENIA]` — P1 · Koszt: M
Dziś twarde wylogowanie po 24 h. Propozycja: ciche odświeżenie albo ostrzeżenie i powrót do tego samego ekranu po zalogowaniu. Jeśli 24 h to wymóg bezpieczeństwa, zostaje samo ostrzeżenie.

**M2 · Baner nowej wersji widoczny poza profilem** — P2 · Koszt: S
Dziś siedzi tylko w profilu, choć logowanie po cichu robi hard reload. Powinien być tam, gdzie użytkownik jest.

**M3 · Zachowanie przy braku sieci** — P2 · Koszt: L
Nad wodą zasięgu nie ma. Minimum: jasny komunikat offline i ostatnio wczytana lista rezerwacji do wglądu.

---

## Do rozstrzygnięcia przez Was, zanim cokolwiek ruszy

1. **J1** — gdzie ostatecznie zatwierdza zarząd: w aplikacji czy w arkuszu. Odpowiedź przesądza o A1–A4 i całej grupie J.
2. **B1/B2** — czy backend może wycenić rezerwację bez jej zapisania. Bez tego cała grupa B zostaje tylko poprawą komunikatów błędu.
3. **C1** — czy komplet danych przy rejestracji wymusza statut/RODO, czy to nasza decyzja.
4. Pełna lista punktów `[DO POTWIERDZENIA]`: **A4, B5, C1, D4, G1, G4, H2, J1, K5, L1, M1**.
