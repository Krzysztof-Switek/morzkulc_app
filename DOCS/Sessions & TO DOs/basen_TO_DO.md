# Moduł Basen — pełny audyt stanu obecnego (punkt zero)

Data audytu: 2026-07-23
Cel dokumentu: kompletny, dokładny obraz tego, co jest już zaimplementowane w module Basen (kod, dane, konfiguracja), zanim zaplanujemy pełne wdrożenie. To jest punkt odniesienia — **nie plan wdrożenia**, tylko diagnoza „co jest".

---

## 0. Executive summary — najważniejsze ustalenia

- **Moduł jest WYŁĄCZONY na produkcji.** `setup/app.modules.modul_6` = `{label:"Basen", enabled:false, access.mode:"off"}`. Żaden użytkownik obecnie nie ma do niego dostępu w apce (nawigacja i dashboard go ukrywają).
- **Brak konfiguracji.** Dokument `setup/vars_basen` **nie istnieje** w Firestore. Wszystkie ceny/limity/domyślne godziny lecą z hardkodowanych wartości domyślnych w kodzie (`getBasenVars`), bo nie ma mechanizmu (arkusz/sync/panel), który by ten dokument tworzył czy aktualizował — w przeciwieństwie do `vars_gear`/`vars_members`, które są synchronizowane z arkusza.
- **Dwa w pełni zaimplementowane, ale całkowicie martwe (nieużywane przez frontend) fragmenty backendu:**
  - System „godzin basenowych" (`basen_godziny_ledger` + 3 endpointy) — zero odwołań z UI.
  - Wyszukiwarka użytkowników dla admina (`basen/admin/users`) — zero odwołań z UI (formularz nadawania karnetu wymaga ręcznego wklejenia Firebase UID).
- **Dane produkcyjne: praktycznie puste.** Jedna sesja testowa z 22.04.2026 (dziwne godziny 21:53–00:00), `enrolledCount:1` mimo że kolekcja `basen_enrollments` ma **0 dokumentów** — niespójność licznika, ślad po ręcznym teście/edycji w konsoli, nie po normalnym przepływie aplikacji.
- **Płatności to tylko etykiety, nie prawdziwe transakcje.** „Jednorazowe" nie ma żadnej integracji płatności — to czysto informacyjny wybór, weryfikacja opłacenia dzieje się poza aplikacją. Karnet może nadać WYŁĄCZNIE admin ręcznie — nie ma samoobsługowego zakupu.
- **Brak mechanizmu wygasania karnetów** — typ `KarnetStatus` deklaruje `"pending"` i `"expired"`, ale w kodzie nigdy nie są ustawiane (brak pola daty ważności, brak triggera/harmonogramu).
- **Brak jakiegokolwiek harmonogramu (cron)** dla basenu — jedyne zadanie serwisowe to e-mail przy anulowaniu sesji (wywoływane ręcznie z akcji admina), nic cyklicznego (przypomnienia, wygaszanie karnetów, itp.).

---

## 1. Gdzie leży kod

**Backend (`functions/src/`):**
| Plik | Rola |
|---|---|
| `modules/basen/basen_service.ts` | Rdzeń logiki: sesje, zapisy, karnety (CRUD + transakcje Firestore) |
| `modules/basen/basen_godziny_service.ts` | Osobny „ledger" godzin basenowych (martwy — patrz sekcja 5) |
| `api/getBasenSessionsHandler.ts` | `GET /api/basen/sessions` |
| `api/basenEnrollHandler.ts` | `POST /api/basen/enroll` |
| `api/basenCancelEnrollmentHandler.ts` | `POST /api/basen/cancel-enrollment` |
| `api/getBasenKarnetyHandler.ts` | `GET /api/basen/karnety` |
| `api/basenCreateSessionHandler.ts` | `POST /api/basen/sessions/create` (admin) |
| `api/basenCancelSessionHandler.ts` | `POST /api/basen/sessions/cancel` (admin) |
| `api/basenGrantKarnetHandler.ts` | `POST /api/basen/karnety/grant` (admin) |
| `api/getBasenGodzinyHandler.ts` | `GET /api/basen/godziny` — **nieużywane przez frontend** |
| `api/basenAdminAddGodzinyHandler.ts` | `POST /api/basen/admin/godziny/add` — **nieużywane przez frontend** |
| `api/basenAdminCorrectGodzinyHandler.ts` | `POST /api/basen/admin/godziny/correct` — **nieużywane przez frontend** |
| `api/basenAdminSearchUsersHandler.ts` | `GET /api/basen/admin/users` — **nieużywane przez frontend** |
| `service/tasks/basenNotifySessionCancelled.ts` | Task: e-mail do prowadzącego/uczestników/admina po anulowaniu sesji |

Wszystkie 11 endpointów jest wyeksportowanych w `index.ts` (`invoker:"private"` w kodzie — patrz [[reference_function_invoker_state]] w pamięci Claude co do faktycznego stanu public/private) i ma rewrite w `firebase.json`.

**Frontend (`public/`):**
| Plik | Rola |
|---|---|
| `modules/basen_module.js` | Cały UI: 3 zakładki (Sesje / Mój karnet / Zarządzanie) |
| `styles/basen.css` | Style modułu |
| `core/modules_registry.js` | `createBasenModule`, `defaultRoute` = `"sessions"` (gdy `home`) |
| `core/render_shell.js` | Kafelek „Basen" na dashboardzie (disabled gdy moduł wyłączony) + sekcja „Zajęcia basenowe" (podgląd 3 najbliższych sesji) |

**Firestore — kolekcje:**
| Kolekcja | Zawartość | Stan danych na prod |
|---|---|---|
| `basen_sessions` | Sesje (data, godziny, limit miejsc, prowadzący, status) | **1 dokument** (testowy) |
| `basen_enrollments` | Zapisy użytkowników na sesje | **0 dokumentów** |
| `basen_karnety` | Karnety (10 wejść domyślnie) | **0 dokumentów** |
| `basen_godziny_ledger` | Osobny ledger godzin basenowych | **0 dokumentów** (nigdy nieużyty) |
| `setup/vars_basen` | Konfiguracja (ceny, limity, domyślne godziny) | **NIE ISTNIEJE** |

---

## 2. Model danych — dokładne pola

### `BasenSession` (`basen_sessions/{id}`)
```
id, date (YYYY-MM-DD), timeStart (HH:MM), timeEnd (HH:MM), capacity (number),
enrolledCount (number, licznik utrzymywany transakcyjnie), instructorEmail, instructorName,
notes, status: "open" | "full" | "cancelled", createdBy (uid), createdAt, updatedAt
```
- `status` przechodzi automatycznie `open ↔ full` w zależności od `enrolledCount` vs `capacity` (przy zapisie/wypisie), oraz `→ cancelled` tylko ręcznie przez admina (`cancelSession`).
- **Brak pola `cancelledAt`** na sesji (jest tylko na enrollmencie).
- Sesje nie mają żadnego powiązania ze sprzętem (kajaki/wiosła) — to czysto harmonogram zajęć + limit miejsc, bez rezerwacji konkretnego sprzętu.

### `BasenEnrollment` (`basen_enrollments/{id}`)
```
id, sessionId, userUid, userEmail, userDisplayName, paymentType: "karnet" | "jednorazowe",
karnetId? (tylko gdy paymentType="karnet"), status: "active" | "cancelled", cancelledAt?,
createdAt, updatedAt
```
- Unikalność: jeden aktywny zapis na sesję na użytkownika (sprawdzane zapytaniem przed transakcją — **wyścig (race condition) teoretycznie możliwy** przy dwóch równoczesnych zapisach, bo sprawdzenie duplikatu jest POZA transakcją zapisującą; sama dedukcja miejsc/karnetu jest bezpieczna transakcyjnie, ale dwa równoczesne requesty tego samego usera mogłyby oba przejść check przed transakcją i wylądować jako dwa aktywne zapisy).

### `BasenKarnet` (`basen_karnety/{id}`)
```
id, userUid, userEmail, userDisplayName, totalEntries, usedEntries,
status: "pending" | "active" | "exhausted" | "expired", grantedBy (uid admina), createdAt, updatedAt
```
- **Zawsze tworzony ze statusem `"active"`** — `"pending"` nigdy nie jest używane.
- **Brak pola daty ważności** — `"expired"` nigdy nie jest ustawiane, nie ma mechanizmu wygasania.
- `usedEntries` rośnie przy zapisie (karnet), maleje przy anulowaniu zapisu (zwrot wejścia) — także gdy admin anuluje całą sesję (`cancelSession` zwraca wejścia wszystkim zapisanym z karnetu).
- Użytkownik może mieć wiele karnetów (historia), ale **tylko jeden może być `"active"` naraz w praktyce** — `getActiveKarnet` bierze pierwszy z brzegu (`limit(1)`, bez sortowania) — jeśli kiedyś powstanie więcej niż jeden aktywny karnet dla tej samej osoby (np. admin nada drugi zanim pierwszy się wyczerpie), wybór „aktywnego" jest niedeterministyczny.

### `BasenGodzinyRecord` (`basen_godziny_ledger/{id}`) — **martwy kod, patrz sekcja 5**
```
id, uid, type: "admin_add" | "admin_correct_plus" | "admin_correct_minus" |
  "booking_block" | "booking_refund" | "booking_forfeit" | "instructor_earn",
amount (+/-), reason, sessionId?, enrollmentId?, performedBy, createdAt, updatedAt
```

---

## 3. Przepływ użytkownika (frontend `basen_module.js`)

Moduł ma 3 zakładki, routing przez hash `#{moduleId}/{tab}`:

1. **„Sesje"** (`sessions`, domyślna) — lista nadchodzących sesji (`date >= dziś`, status `open`/`full`, sortowane rosnąco po dacie+godzinie). Dla każdej: liczba wolnych miejsc, prowadzący, uwagi. Jeśli user ma aktywny karnet — banner z liczbą pozostałych wejść na górze listy.
   - **Zapis:** wybór metody płatności (select: „Karnet (X wejść)" jeśli ma aktywny karnet, zawsze też „Jednorazowe") + przycisk „Zapisz się". Po sukcesie — pełny refetch i re-render listy.
   - **Anulowanie:** przycisk „Anuluj" z `window.confirm`. Zablokowane przez okno czasowe (`basen_okno_anulowania_h`, domyślnie 24h) liczone względem `date`+`timeStart` sesji — **chyba że sesja jest już `cancelled`** (wtedy okno nie obowiązuje, co ma sens, bo to “sprzątanie” po anulowaniu przez admina, choć w praktyce admin i tak anuluje wszystkie zapisy automatycznie przez `cancelSession`).
   - Kto widzi przycisk zapisu: `canEnroll` = `allowed_actions` zawiera `"basen.enroll"` (patrz sekcja 4 — role).
2. **„Mój karnet"** (`karnet`) — lista karnetów usera: aktywne (pasek postępu wykorzystania) + historia (wyczerpane/wygasłe — w praktyce nigdy nie będzie „wygasłych", patrz sekcja 2). Górny box z cenami z configu (`cenaZaKarnet`, `ileWejsc`, `cenaZaGodzine`) — **nie renderuje się wcale, jeśli wszystkie trzy są 0** (a tak jest teraz, bo `vars_basen` nie istnieje → same zera).
   - Brak jakiegokolwiek przycisku/linku do zakupu — tylko tekst „Skontaktuj się z zarządem lub KR, aby zakupić karnet" gdy brak karnetów.
3. **„Zarządzanie"** (`admin`, widoczna tylko gdy `allowed_actions` zawiera `"basen.admin"`, czyli rola zarząd/KR) — trzy niezależne formularze:
   - **Utwórz sesję** — data/godziny/limit (opcjonalny, domyślny z configu)/prowadzący (imię+email, oba opcjonalne)/uwagi.
   - **Anuluj sesję** — **pole tekstowe na surowe ID sesji** (trzeba je znać/skądś skopiować — UI nie pokazuje ID przy karcie sesji w zakładce „Sesje", więc w praktyce admin musiałby zajrzeć do Firestore albo dostać ID skądinąd). Po anulowaniu: wszyscy zapisani wypisani, karnety zwrócone, e-mail wysłany (fire-and-forget, błąd wysyłki nie blokuje odpowiedzi).
   - **Nadaj karnet** — **pole tekstowe na surowy Firebase UID** (identyczny problem — nie ma wyszukiwarki/autouzupełniania, mimo że backend (`basenAdminSearchUsers`) to umożliwia; UI go po prostu nie używa).

Dashboard (`render_shell.js`): kafelek „Basen" zawsze widoczny, ale `disabled` gdy moduł nieaktywny w setupie; osobna sekcja „Zajęcia basenowe" na stronie głównej pokazuje do 3 najbliższych sesji (bez zapisu — czysty podgląd, klik „Zobacz wszystkie" prowadzi do modułu).

---

## 4. Model uprawnień

Z `index.ts::computeAllowedActions` i bramek w handlerach:

| Rola | `basen.enroll` (zapis na sesję) | `basen.admin` (zarządzanie) |
|---|---|---|
| `rola_czlonek`, `rola_kandydat`, `rola_zarzad`, `rola_kr` | ✅ (przez `memberRoleKeys`) | ✅ tylko zarząd/kr |
| `rola_sympatyk` | ✅ (specjalny wyjątek w kodzie — jedyny moduł, do którego sympatyk ma pełny dostęp) | ❌ |
| `rola_kursant` | ❌ (nie ma w `memberRoleKeys`, nie ma specjalnego wyjątku jak sympatyk) | ❌ |

Uwaga: `status_zawieszony` blokuje zapis na sesję (`isUserStatusBlocked`) niezależnie od roli — ale **nie ma analogicznej blokady w `basenCancelEnrollmentHandler`** (zawieszony użytkownik może anulować istniejący zapis, co jest ok, ale warto to świadomie potwierdzić jako zamierzone).

Wyszukiwanie użytkowników do nadania karnetu (`basenAdminSearchUsers`) i cała para godzin-basenowych endpointów sprawdzają `adminRoleKeys` (zarząd/kr) tak samo jak reszta panelu admina.

---

## 5. System „godzin basenowych" — w pełni zbudowany, zero integracji

To najważniejsze odkrycie tego audytu. Backend ma kompletny, osobny „ledger" (`basen_godziny_ledger`, analogiczny w kształcie do głównego `godzinki_ledger` klubu, ale **całkowicie odrębny — nie ten sam system, nie ta sama kolekcja, nie wpływa na saldo godzinek klubowych**):

- Typ operacji deklaruje 7 wariantów (`admin_add`, `admin_correct_plus/minus`, `booking_block`, `booking_refund`, `booking_forfeit`, `instructor_earn`), ale **kod tworzy rekordy tylko dla pierwszych trzech** (ręczne działania admina). Pozostałe cztery (blokada godzin przy zapisie, zwrot przy anulowaniu, przepadek przy no-show, zarobek instruktora za prowadzenie) **nie mają żadnej implementacji** — ani w `basen_service.ts` (zapis/anulowanie sesji nie odwołuje się do tego ledgera w ogóle), ani nigdzie indziej.
- Endpointy `GET /api/basen/godziny`, `POST /api/basen/admin/godziny/add`, `POST /api/basen/admin/godziny/correct` **istnieją, są wdrożone, przechodzą przez autoryzację poprawnie** — ale **żaden plik we `public/` się do nich nie odwołuje**. Zero przycisku, zero widoku salda, zero formularza admina do dopisania/korekty.
- Kolekcja `basen_godziny_ledger` ma dziś **0 dokumentów** na produkcji.

**Pytanie do rozstrzygnięcia przed pełnym wdrożeniem:** czy ten system w ogóle ma wejść w życie (np. instruktorzy zarabiają godzinki klubowe za prowadzenie zajęć, a uczestnicy tracą jakieś inne „godziny basenowe" za wejście)? Jeśli tak — potrzebna decyzja biznesowa co to znaczy `booking_block`/`booking_forfeit`/`instructor_earn` w praktyce (czy to w ogóle ma sens obok systemu karnetów PLN, czy to alternatywna/wcześniejsza koncepcja zarzucona na rzecz karnetów). Jeśli nie — do wyrzucenia jako martwy kod (4 endpointy + serwis + kolekcja), zgodnie z zasadą projektu „czyść martwy kod" ([[feedback_clean_dead_code]] w pamięci).

---

## 6. Płatności — co naprawdę się dzieje

**Nie ma żadnej integracji płatniczej (przelewy, BLIK, Stripe itp.) w całym module.** Dwie „metody płatności" to tylko etykiety na zapisie:
- **„Karnet"** — odejmuje jedno wejście z aktywnego karnetu usera (transakcyjnie, bezpiecznie). Karnet nie jest kupowany w aplikacji — **wyłącznie admin nadaje go ręcznie** (`POST /api/basen/karnety/grant`), bez żadnej weryfikacji czy zapłacono za niego poza aplikacją (to poza zakresem systemu — zaufanie do procesu offline).
- **„Jednorazowe"** — nie odejmuje niczego, nie tworzy żadnego zobowiązania płatniczego w systemie, to czysta etykieta informacyjna dla admina/instruktora „ta osoba płaci gotówką/przelewem na miejscu, poza aplikacją". Aplikacja nie śledzi, czy faktycznie zapłacono.

Konfiguracja cen (`basen_cena_za_godzine`, `basen_cena_za_karnet`) jest **wyłącznie wyświetlana informacyjnie** w zakładce „Mój karnet" — nigdzie nie jest egzekwowana ani rozliczana przez system.

---

## 7. Powiadomienia

Jedyne powiadomienie e-mail w całym module: **anulowanie sesji przez admina** (`basen.notifySessionCancelled`, kolejkowane fire-and-forget przez `service_jobs`). Odbiorcy: prowadzący (jeśli podano e-mail), `basen_admin_mail` z configu (pusty, bo `vars_basen` nie istnieje), oraz wszyscy, których zapis został właśnie anulowany.

**Czego nie ma:** przypomnienia przed sesją, potwierdzenia zapisu e-mailem, powiadomienia gdy zwolni się miejsce na pełnej sesji, powiadomienia dla admina o nowych zapisach, żadnego cyklicznego zadania (cron) związanego z basenem.

---

## 8. Znane luki i pytania otwarte do decyzji (surowa lista, do priorytetyzacji)

1. **Konfiguracja `vars_basen`** — skąd ma pochodzić? Nowa zakładka w arkuszu SETUP (jak `vars_gear`/`vars_members`) czy panel w apce? Bez tego moduł działa wyłącznie na twardo zakodowanych domyślnych wartościach.
2. **System godzin basenowych** — wdrożyć w pełni (zdefiniować `booking_block`/`booking_forfeit`/`instructor_earn` i dopiąć UI) czy usunąć jako martwy kod?
3. **Wyszukiwarka userów admina** (`basen/admin/users`) — dopiąć do formularza „Nadaj karnet" (i ew. „Anuluj sesję" po ID→nazwa) czy usunąć?
4. **UID w formularzach admina** — nawet bez wyszukiwarki, samo pokazywanie ID sesji przy karcie w zakładce „Sesje" ułatwiłoby anulowanie bez grzebania w konsoli.
5. **Wygasanie karnetów** — czy karnety mają w ogóle wygasać (np. po roku)? Jeśli tak: potrzebne pole daty + mechanizm (scheduler jak `gearPrivateStorageMonthly`).
6. **Samoobsługowy zakup karnetu** — zostaje ręczne nadawanie przez zarząd/KR, czy ma powstać jakiś przepływ zakupowy (nawet bez realnej bramki płatności, np. „zgłoś chęć zakupu")?
7. **Rola kursant** — świadomie wykluczona z zapisów na basen. Czy to zamierzone, czy przeoczenie (dla porównania: kursant MA dostęp do rezerwacji sprzętu na zasadach kandydata)?
8. **Race condition przy podwójnym zapisie** — sprawdzenie duplikatu zapisu jest poza transakcją; do rozważenia przeniesienie całego sprawdzenia do transakcji.
9. **Instruktor** — pole `instructorEmail`/`instructorName` jest czysto opisowe (do powiadomień), nie ma żadnego mechanizmu wynagradzania/rozliczania prowadzącego w systemie (poza nieużywanym `instructor_earn`).
10. **Sesje przechodzące przez północ** — jeden istniejący rekord testowy ma `timeEnd < timeStart` (21:53–00:00); `sessionDatetimeMs` liczy tylko `timeStart`, więc samo porównanie z „teraz" działa, ale nigdzie nie ma walidacji `timeEnd > timeStart` przy tworzeniu sesji — do sprawdzenia czy to w ogóle miało być wspierane.
11. **Niespójność danych testowych** — istniejący rekord sesji ma `enrolledCount:1` przy zerowej liczbie dokumentów w `basen_enrollments`. Do wyczyszczenia/zresetowania przed pełnym wdrożeniem (i do zrozumienia jak do tego doszło — ręczna edycja w konsoli najpewniej).

---

## 9. Co już działa poprawnie i solidnie (żeby nie zgubić w krytyce)

- Cała logika sesje/zapisy/karnety wewnątrz `basen_service.ts` konsekwentnie używa transakcji Firestore tam, gdzie trzeba (dedukcja miejsc + karnetu + utworzenie zapisu w jednej transakcji; analogicznie przy anulowaniu i przy anulowaniu całej sesji).
- Model ról jest spójny z resztą aplikacji (te same `adminRoleKeys`/`memberRoleKeys` co gear/godzinki/imprezy), sympatyk ma świadomie dodany wyjątek z komentarzem wyjaśniającym dlaczego.
- Okno anulowania (24h domyślnie, konfigurowalne) jest poprawnie liczone względem daty+godziny sesji, z sensownym wyjątkiem dla sesji już anulowanych przez admina.
- Powiadomienie o anulowaniu sesji zbiera odbiorców poprawnie (prowadzący + admin + wszyscy dotknięci), jest fire-and-forget więc nie blokuje odpowiedzi API.
- Frontend ma sensowny, spójny wzorzec zakładek (routing przez hash) identyczny jak w innych modułach z zakładkami (np. panel Zarząd).
