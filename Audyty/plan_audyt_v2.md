# PLAN POPRAWY PO AUDYCIE V2

**Data planu:** 2026-04-10
**Źródło:** `Audyty/audyt_v2.md`

---

## 1. Cel planu

Plan obejmuje naprawę wyłącznie niezgodności potwierdzonych w `Audyty/audyt_v2.md`.

Naprawiamy:
- krytyczny problem bezpieczeństwa: wildcard CORS w `firebase.json`,
- brak Firestore Rules w repozytorium,
- brak 5 rewrite'ów dla funkcji HTTP zdefiniowanych w `index.ts`,
- routing strony startowej — `session.screen` obliczany, ale nigdy nieużywany,
- hardcoded etykiety ról/statusów w `render_shell.js` i `membersSyncToSheet.ts`,
- hardcoded `MEMBER_LEVEL_ROLES` w `onUserRegisteredWelcome.ts`,
- hardcoded `defaultScreenForRoleKey()` w `index.ts` (martwy kod),
- brak deduplicacji jobów `members.syncToSheet`,
- brak automatycznego schedulera dla `usersSyncRolesFromSheet`,
- brak mechanizmu syncu `setup` z Google Sheets do Firestore.

Plan nie obejmuje żadnej nowej funkcjonalności. Nie dotyczy obszarów, które audyt oznaczył jako OK.

---

## 2. Zasady pracy

- Nie zgadujemy — każda zmiana opiera się na konkretnym miejscu wskazanym w audycie.
- Przed każdą zmianą czytamy aktualny plik — kod mógł się zmienić od czasu audytu.
- Pracujemy małymi krokami — jeden etap, jeden commit.
- Po każdym etapie osobna weryfikacja przed przejściem do następnego.
- Nie wdrażamy kilku ryzykownych zmian naraz.
- Nie używamy katalogu `tests` jako źródła prawdy o działaniu systemu.
- Nie robimy refaktoru „przy okazji" — zakres zmiany jest ograniczony do problemu z audytu.
- Nie tworzymy nowych wymagań biznesowych — plan opisuje wyłącznie naprawę stanu obecnego.

---

## 3. Kolejność napraw

| Nr | Nazwa etapu | Priorytet | Uzasadnienie kolejności | Zależy od | Nie ruszać przed zakończeniem |
|----|-------------|-----------|------------------------|-----------|-------------------------------|
| 1 | Usunięcie wildcard CORS z `firebase.json` | **krytyczny** | Aktywny problem bezpieczeństwa — każda domena może wykonywać requesty do API. Niezależny od innych etapów | — | Etap 2 (dopiero potem dodajemy rewrites) |
| 2 | Dodanie brakujących 5 rewrite'ów do `firebase.json` | **krytyczny** | 5 endpointów jest faktycznie niedostępnych przez Hosting. Zmiana w tym samym pliku co etap 1 — łączymy w jeden commit po etapie 1 | Etap 1 | Etap 3 |
| 3 | Przywrócenie Firestore Rules do repo | **krytyczny** | Brak reguł w source control — stan prod nieznany. Musi być wykonany niezależnie od reszty planu | — | Etapy 4–9 |
| 4 | Naprawa routingu startowego — użycie `session.screen` | **wysoki** | Wymaganie biznesowe niedziałające od początku. Czysta zmiana frontendowa, niezależna od backendu | Etap 3 | Etap 5, 6 |
| 5 | Usunięcie hardcoded etykiet ról/statusów w `render_shell.js` | **wysoki** | Nowa rola/status dodana przez zarząd w setup wyświetla się jako surowy klucz. Zależy od dostępności `setup.roleMappings` i `setup.statusMappings` w ctx | Etap 4 | Etap 6 |
| 6 | Usunięcie hardcoded etykiet w `membersSyncToSheet.ts` | **wysoki** | Nowa rola zapisywana do arkusza jako surowy klucz `rola_X`. Zmiana backendowa, niezależna od frontendowych | Etap 3 | Etap 7 |
| 7 | Usunięcie hardcoded `MEMBER_LEVEL_ROLES` w `onUserRegisteredWelcome.ts` | **wysoki** | Dodanie nowej roli wymagającej dostępu do shared drive wymaga zmiany kodu. Zmiana backendowa | Etap 6 | Etap 8 |
| 8 | Deduplicacja jobów `members.syncToSheet` | **średni** | Wielokrotne joby dla tego samego uid nie powodują błędu (upsert jest idempotentny), ale generują zbędny ruch do Sheets API | Etap 6 | Etap 9 |
| 9 | Automatyczny scheduler dla `usersSyncRolesFromSheet` | **średni** | Sync ról wymaga ręcznego wywołania. Wymaga zadecydowania o harmonogramie | Etap 7 | Etap 10 |
| 10 | Mechanizm syncu `setup` z Google Sheets do Firestore | **średni** | Zarząd nie może zmieniać konfiguracji modułów przez arkusz. Nowy task — wymaga audytu struktury arkusza setup przed implementacją | Etap 9 | — |

---

## 4. Plan krok po kroku

---

### Etap 1 — Usunięcie wildcard CORS z `firebase.json`

- **Problem z audytu:** `firebase.json:89-94` ustawia `"Access-Control-Allow-Origin": "*"` dla `/api/**` na poziomie Hosting headers. Hosting wstawia ten nagłówek przed funkcją, co anuluje CORS allowlist zdefiniowaną w `index.ts`.
- **Cel naprawy:** Usunąć blok `headers` dla `source: "/api/**"` z sekcji `hosting.headers` w `firebase.json`. CORS ma być obsługiwany wyłącznie przez backend (`index.ts` — `ALLOWED_ORIGINS`, `setCorsHeaders`, `corsHandler`).
- **Pliki do sprawdzenia:** `firebase.json` — aktualny stan sekcji `hosting.headers`.
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `firebase.json`.
- **Zakres zmiany:** Tylko usunięcie obiektu `{ "source": "/api/**", "headers": [...] }` z tablicy `hosting.headers`. Żadnych innych zmian w tym pliku przy tym etapie.
- **Czego nie zmieniać:** Pozostałe nagłówki (sw.js, manifest.json, /core/**, /modules/**, itd.), sekcja `rewrites`, sekcja `functions`.
- **Ryzyka:** Po usunięciu wildcard — requesty z nieznanych domen dostaną odpowiedź bez `Access-Control-Allow-Origin`. To jest pożądane zachowanie (wymóg z audytu). Sprawdzić czy żaden wewnętrzny flow nie zależy od wildcard CORS (nie powinien — wszystkie znane domeny są w `ALLOWED_ORIGINS` w `index.ts`).
- **Warunek zakończenia etapu:** `firebase.json` nie zawiera bloku `headers` dla `/api/**`. Pozostałe nagłówki hosting niezmienione.
- **Jak zweryfikować po wdrożeniu:** Deploy. Z dozwolonej domeny (np. `morzkulc-e9df7.web.app`) — request do `/api/register` przechodzi. Z obcej domeny — response nie zawiera `Access-Control-Allow-Origin: *`.

---

### Etap 2 — Dodanie brakujących 5 rewrite'ów do `firebase.json`

- **Problem z audytu:** Funkcje `purchaseGodzinki`, `getBasenGodziny`, `basenAdminAddGodziny`, `basenAdminCorrectGodziny`, `basenAdminSearchUsers` są zdefiniowane w `index.ts` ale brak ich wpisów w `firebase.json` `hosting.rewrites`. Są niedostępne przez Hosting.
- **Cel naprawy:** Dodać 5 wpisów do tablicy `hosting.rewrites` w `firebase.json`, mapując ścieżki URL na odpowiednie `functionId`.
- **Pliki do sprawdzenia:** `firebase.json` — aktualna tablica `rewrites`; `functions/src/index.ts` — nazwy eksportowanych funkcji (`purchaseGodzinki`, `getBasenGodziny`, `basenAdminAddGodziny`, `basenAdminCorrectGodziny`, `basenAdminSearchUsers`) oraz ich docelowe ścieżki URL (`/api/godzinki/purchase`, `/api/basen/godziny`, `/api/basen/admin/godziny/add`, `/api/basen/admin/godziny/correct`, `/api/basen/admin/users`).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `firebase.json`.
- **Zakres zmiany:** Dodanie 5 obiektów do tablicy `hosting.rewrites`. Każdy obiekt ma `source` (ścieżka URL) i `function.functionId` (nazwa eksportu z `index.ts`) oraz `function.region: "us-central1"`. Format identyczny z istniejącymi wpisami.
- **Czego nie zmieniać:** Istniejące rewrites, sekcja `functions`, sekcja `hosting.headers`.
- **Ryzyka:** Jeśli nazwa eksportu w `index.ts` różni się od zakładanej — deploy zwróci błąd. Przed wpisaniem nazw zweryfikować dokładnie eksporty w `index.ts`.
- **Warunek zakończenia etapu:** `firebase.json` zawiera wpisy dla wszystkich 5 ścieżek. Nazwy `functionId` zgodne z eksportami w `index.ts`.
- **Jak zweryfikować po wdrożeniu:** Deploy. Request z autoryzacją do `/api/godzinki/purchase`, `/api/basen/godziny`, `/api/basen/admin/godziny/add`, `/api/basen/admin/godziny/correct`, `/api/basen/admin/users` — każdy zwraca odpowiedź z funkcji (nie 404 z Hosting).

---

### Etap 3 — Przywrócenie Firestore Rules do repo

- **Problem z audytu:** `firestore.rules` nie istnieje w repo. `firebase.json` nie ma pola `"rules"` w sekcji `firestore`. Stan reguł na produkcji jest nieznany z kodu.
- **Cel naprawy:** Odczytać aktualnie wdrożone reguły z konsoli Firebase lub przez `firebase firestore:rules:get` i umieścić je w pliku `firestore.rules` w root projektu. Dodać pole `"rules": "firestore.rules"` do sekcji `firestore` w `firebase.json`.
- **Pliki do sprawdzenia:** Aktualne reguły na projekcie produkcyjnym (`morzkulc-e9df7`) i deweloperskim (`sprzet-skk-morzkulc`) — przez konsolę Firebase lub CLI. `firebase.json` — sekcja `firestore`.
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `firebase.json` (dodanie `"rules": "firestore.rules"` do sekcji `firestore`); nowy plik `firestore.rules` (treść z aktualnie wdrożonych reguł).
- **Zakres zmiany:** Pobranie aktualnych reguł i zapisanie ich do `firestore.rules`. Nie zmieniamy samych reguł — tylko wprowadzamy je do source control w stanie istniejącym. Modyfikacja reguł jest osobnym zadaniem poza tym planem.
- **Czego nie zmieniać:** Treść reguł (nie modyfikujemy, tylko dokumentujemy stan). Reszta `firebase.json`.
- **Ryzyka:** Jeśli aktualne reguły na prod są domyślnie otwarte — ujawni to problem, ale nie pogorszy sytuacji (stan był już taki na prod). Jeśli reguły różnią się między projektami — oznaczyć to jako osobny problem do rozwiązania po tym etapie.
- **Warunek zakończenia etapu:** Plik `firestore.rules` istnieje w repo. `firebase.json` ma `"rules": "firestore.rules"`. `firebase deploy --only firestore:rules` nie zwraca błędu.
- **Jak zweryfikować po wdrożeniu:** `firebase deploy --only firestore:rules` na projekcie dev. Reguły w konsoli Firebase zgodne z plikiem.

---

### Etap 4 — Naprawa routingu startowego — użycie `session.screen`

- **Problem z audytu:** `index.ts:209-219` — backend oblicza i zwraca `session.screen` (np. `"screen_board"`, `"screen_member"`). `app_shell.js:158` — `location.hash = "#/home/home"` zawsze, bez odczytu `session.screen`. Wymaganie różnych stron startowych per rola nie działa.
- **Cel naprawy:** W `app_shell.js`, po otrzymaniu odpowiedzi z `/api/register`, zamiast bezwarunkowo ustawiać `location.hash = "#/home/home"`, sprawdzić wartość `session.screen` i przetłumaczyć ją na odpowiedni hash. Mapowanie `screen_*` → hash musi być zdefiniowane po stronie frontendu.
- **Pliki do sprawdzenia:** `public/core/app_shell.js:155-159` — aktualna linia ustawiająca hash; `functions/src/index.ts:209-219` — wartości zwracane przez `defaultScreenForRoleKey()` (`screen_board`, `screen_kr`, `screen_member`, `screen_candidate`, `screen_supporter`, `screen_trainee`); `public/core/modules_registry.js` — struktura modułów i ich id, żeby ustalić poprawne hashe docelowe.
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `public/core/app_shell.js`.
- **Zakres zmiany:** Tylko fragment ustawiający `location.hash` przy inicjalizacji (linia 158). Logika: jeśli `ctx.session.screen` jest obecne i mapuje się na znany moduł/trasę — ustaw odpowiedni hash; w przeciwnym wypadku fallback na `#/home/home`. Nie zmieniamy nic poza tym fragmentem.
- **Czego nie zmieniać:** `defaultScreenForRoleKey()` w `index.ts` (to osobna kwestia — patrz etap 5 sekcja zależności), pozostała logika `app_shell.js`, `render_shell.js`.
- **Ryzyka:** Jeśli moduł przypisany do roli nie jest widoczny dla usera (bo np. jego rola nie ma dostępu) — user może trafić na "Brak dostępu do modułu". Zabezpieczyć przez fallback do `#/home/home` gdy docelowy moduł nie jest w `ctx.modules`.
- **Warunek zakończenia etapu:** Po zalogowaniu: admin (`rola_zarzad`) trafia na inny hash niż `#/home/home`; sympatyk (`rola_sympatyk`) trafia na `#/home/home` lub inny hash zgodny z `session.screen`. Fallback działa gdy moduł niedostępny.
- **Jak zweryfikować po wdrożeniu:** Ręczne logowanie dwoma kontami o różnych rolach — hash po zalogowaniu różni się.

---

### Etap 5 — Usunięcie hardcoded etykiet ról/statusów w `render_shell.js`

- **Problem z audytu:** `render_shell.js:729-745` — funkcje `roleKeyToLabel()` i `statusKeyToLabel()` są hardcoded. Jeśli zarząd doda nową rolę/status w `setup`, frontend wyświetli surowy klucz techniczny zamiast PL etykiety.
- **Cel naprawy:** Zastąpić hardcoded mapowania odczytem etykiet z `ctx.setup.roleMappings` i `ctx.setup.statusMappings`. Fallback na surowy klucz jeśli mapowanie nie istnieje w setup.
- **Pliki do sprawdzenia:** `public/core/render_shell.js:729-745` — aktualne funkcje; `public/core/app_shell.js` — jak `ctx.setup` jest przekazywane; `functions/src/index.ts:241-293` — `filterSetupForUser()` — jakie pola `roleMappings` i `statusMappings` są zwracane przez `/api/setup` (sprawdzić czy nie są stripowane).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `public/core/render_shell.js`.
- **Zakres zmiany:** Tylko funkcje `roleKeyToLabel()` i `statusKeyToLabel()`. Zamiast if-chain — odczyt z `ctx.setup?.roleMappings?.[key]?.label` i `ctx.setup?.statusMappings?.[key]?.label`. Jeśli brak — zwróć surowy klucz. Brak innych zmian w pliku.
- **Czego nie zmieniać:** `filterSetupForUser()` w `index.ts` (musi zwracać `roleMappings` i `statusMappings` — sprawdzić przed zmianą czy aktualnie je zwraca), reszta `render_shell.js`, `access_control.js`.
- **Ryzyka:** Jeśli `filterSetupForUser()` stripuje `roleMappings`/`statusMappings` z odpowiedzi setup — etykiety nie będą dostępne w ctx. Przed implementacją zweryfikować co dokładnie zwraca `/api/setup`.
- **Warunek zakończenia etapu:** Dashboard wyświetla etykiety z `setup.roleMappings`/`statusMappings`. Jeśli setup brakuje lub klucz nieznany — wyświetla surowy klucz (nie crashuje).
- **Jak zweryfikować po wdrożeniu:** Zalogować się kontem z rolą zdefiniowaną w setup. Sprawdzić czy wyświetlana etykieta pochodzi z `setup.roleMappings[roleKey].label`.

---

### Etap 6 — Usunięcie hardcoded etykiet w `membersSyncToSheet.ts`

- **Problem z audytu:** `membersSyncToSheet.ts:14-33` — funkcje `roleLabel()` i `statusLabel()` są hardcoded. Nowa rola/status dodana w setup trafia do arkusza jako surowy klucz `rola_X`/`status_X`.
- **Cel naprawy:** W tasku `membersSyncToSheet`, przed budowaniem `patch` do arkusza, odczytać `setup/app` z Firestore i pobrać `roleMappings[roleKey].label` i `statusMappings[statusKey].label`. Fallback na surowy klucz jeśli mapowania brak.
- **Pliki do sprawdzenia:** `functions/src/service/tasks/membersSyncToSheet.ts:14-33` — aktualne funkcje `roleLabel()`, `statusLabel()`; `functions/src/service/tasks/usersSyncRolesFromSheet.ts` — jak ten task czyta `setup/app` (wzorzec do powielenia); `functions/src/service/types.ts` — interfejs `ServiceTaskContext` (czy `firestore` jest dostępne w ctx).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `functions/src/service/tasks/membersSyncToSheet.ts`.
- **Zakres zmiany:** Zastąpić `roleLabel()` i `statusLabel()` odczytem z `setup/app` w Firestore. Tylko ten fragment funkcji `run`. Nie zmieniać logiki upsert, `ensureMemberId`, struktury `patch` ani typów.
- **Czego nie zmieniać:** `registry.ts`, `runner.ts`, inne taski.
- **Ryzyka:** Dodatkowy odczyt Firestore na każde wywołanie tasku. Akceptowalne — task jest async, nie jest w krytycznej ścieżce.
- **Warunek zakończenia etapu:** Task `members.syncToSheet` zapisuje do arkusza etykiety z `setup.roleMappings`/`statusMappings`. Jeśli setup brakuje — zapisuje surowy klucz.
- **Jak zweryfikować po wdrożeniu:** Uruchomić task ręcznie przez `adminRunServiceTask` z `taskId: "members.syncToSheet"`. Sprawdzić wiersz w arkuszu — kolumny "Rola" i "Status" zawierają PL etykiety.

---

### Etap 7 — Usunięcie hardcoded `MEMBER_LEVEL_ROLES` w `onUserRegisteredWelcome.ts`

- **Problem z audytu:** `onUserRegisteredWelcome.ts:18-22` — `MEMBER_LEVEL_ROLES` to hardcoded Set z trzema rolami. Krok C tasku (dodanie do grupy members) nie czyta z `setup.roleMappings`. Task D już czyta z `setup.roleMappings` — krok C jest niespójny.
- **Cel naprawy:** W kroku C tasku welcome, zamiast `MEMBER_LEVEL_ROLES.has(roleKey)`, sprawdzić czy `roleKey` ma przypisaną `membersGroup` przez `setup.roleMappings[roleKey].groups`. Jeśli `roleMappings` jest obecny w setup — użyć go; jeśli brak setup — fallback na aktualny `MEMBER_LEVEL_ROLES` (żeby nie zepsuć istniejących użytkowników).
- **Pliki do sprawdzenia:** `functions/src/service/tasks/onUserRegisteredWelcome.ts:18-22` i `99-148` (krok C); `functions/src/service/service_config.ts` — `membersGroupEmail`; struktura `setup.roleMappings` w Firestore (zweryfikować przez aktualny dokument `setup/app`).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `functions/src/service/tasks/onUserRegisteredWelcome.ts`.
- **Zakres zmiany:** Tylko logika kroku C — odczyt `setup/app` i sprawdzenie `roleMappings[roleKey].groups`. Reszta tasku (krok A, B, D) bez zmian.
- **Czego nie zmieniać:** `service_config.ts`, `registry.ts`, krok D (już czyta z setup.roleMappings).
- **Ryzyka:** Setup może nie zawierać `roleMappings` — fallback na `MEMBER_LEVEL_ROLES` zapobiega regresji. Zmiana działa tylko dla nowych rejestracji (istniejące joby retry bez `roleGroupsMappingsSyncedAt` będą ponowione z nową logiką).
- **Warunek zakończenia etapu:** Task welcome dodaje do grupy members na podstawie `setup.roleMappings`, nie `MEMBER_LEVEL_ROLES`. Fallback na hardcoded Set gdy setup brakuje.
- **Jak zweryfikować po wdrożeniu:** Nowa rejestracja konta z rolą spoza dotychczasowego `MEMBER_LEVEL_ROLES` (jeśli taka istnieje w setup) — sprawdzić czy jest/nie jest dodana do groups zgodnie z `roleMappings`.

---

### Etap 8 — Deduplicacja jobów `members.syncToSheet`

- **Problem z audytu:** Każde wywołanie `enqueueMemberSheetSync(uid)` w `registerUserHandler.ts:492` tworzy job z auto-generowanym ID. Wielokrotne submity formularza profilu powodują wielokrotne joby dla tego samego uid. Upsert arkusza jest idempotentny na poziomie danych, ale generuje zbędne wywołania Sheets API.
- **Cel naprawy:** Zmienić `enqueueMemberSheetSync(uid)` w `index.ts` tak, żeby job miał deterministyczne ID (np. `sheet-sync:{uid}`) i był tworzony tylko jeśli nie istnieje lub ma status inny niż `queued`/`running`. Wzorzec identyczny z `jobIdForWelcome(uid)` w `onUsersActiveCreated.ts`.
- **Pliki do sprawdzenia:** `functions/src/index.ts:645-656` — aktualna implementacja `enqueueMemberSheetSync`; `functions/src/service/triggers/onUsersActiveCreated.ts` — wzorzec deterministycznego ID z transakcją; `functions/src/service/worker/jobProcessor.ts` — jak processor obsługuje duplikaty (czy ma własną ochronę).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `functions/src/index.ts` — funkcja `enqueueMemberSheetSync`.
- **Zakres zmiany:** Tylko funkcja `enqueueMemberSheetSync` w `index.ts`. Zmiana ID joba na deterministyczny + guard w transakcji (jeśli job już istnieje i jest `queued` — nie twórz nowego). Nie zmieniać `registerUserHandler.ts`, nie zmieniać logiką tasku.
- **Czego nie zmieniać:** Task `members.syncToSheet`, `registry.ts`, `runner.ts`, pozostałe `enqueue*` funkcje w `index.ts`.
- **Ryzyka:** Jeśli job z tym samym ID jest w stanie `dead` lub `failed` — nowy submit nie stworzy nowego joba (będzie zablokowany przez guard). Trzeba obsłużyć ten przypadek — np. pozwolić na re-enqueue gdy status to `dead`.
- **Warunek zakończenia etapu:** Wielokrotny submit formularza profilu tego samego usera tworzy tylko jeden aktywny job `members.syncToSheet`.
- **Jak zweryfikować po wdrożeniu:** Ręcznie wywołać kilka razy `POST /api/register` z kompletnym profilem dla tego samego uid. Sprawdzić kolekcję `service_jobs` — tylko jeden job w stanie `queued` dla danego uid.

---

### Etap 9 — Automatyczny scheduler dla `usersSyncRolesFromSheet`

- **Problem z audytu:** Task `users.syncRolesFromSheet` istnieje i działa poprawnie, ale jest uruchamiany wyłącznie ręcznie przez `adminRunServiceTask`. `serviceFallbackDaily` nie tworzy nowych jobów syncu — tylko retruje utknięte. Brak cyklicznego syncu ról z arkusza.
- **Cel naprawy:** Dodać scheduled function (Firebase Functions v2 `onSchedule`) uruchamiającą task `users.syncRolesFromSheet` automatycznie. Harmonogram do ustalenia z wymaganiami biznesowymi — audyt nie wskazuje konkretnej częstotliwości (np. raz dziennie rano).
- **Pliki do sprawdzenia:** `functions/src/index.ts` — aktualne scheduled functions (`gearPrivateStorageMonthly` jako wzorzec `onSchedule`); `functions/src/service/runner.ts` — `runTaskById`; `functions/src/service/tasks/usersSyncRolesFromSheet.ts` — jakie payload przyjmuje task (czy `dry` jest opcjonalne).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** `functions/src/index.ts` — dodanie nowej `export const` z `onSchedule`.
- **Zakres zmiany:** Dodanie jednej nowej eksportowanej scheduled function w `index.ts`, wzorowanej na `gearPrivateStorageMonthly`. Wywołuje `runTaskById("users.syncRolesFromSheet", {})`. Nie zmieniać tasku, `runner.ts`, `registry.ts`.
- **Czego nie zmieniać:** Istniejące scheduled functions, logika tasku, fallback daily worker.
- **Ryzyka:** Harmonogram musi być skoordynowany z częstotliwością zmian ról przez zarząd w arkuszu. Zbyt częsty sync generuje niepotrzebne wywołania Sheets API. Zbyt rzadki — opóźnienie w zastosowaniu zmian.
- **Warunek zakończenia etapu:** Nowa scheduled function jest widoczna w Firebase Console. Uruchamia się zgodnie z harmonogramem. Logi potwierdzają wykonanie tasku.
- **Jak zweryfikować po wdrożeniu:** Deploy. Firebase Console → Cloud Scheduler — nowy job widoczny. Ręczne trigger → sprawdzić logi `usersSyncRolesFromSheet`.

---

### Etap 10 — Mechanizm syncu `setup` z Google Sheets do Firestore

- **Problem z audytu:** Brak tasku `setup.syncFromSheet` w `registry.ts`. Jedyna droga zmiany `setup/app` to `POST /api/admin/setup` — ręcznie, tylko email `admin@morzkulc.pl`. Zarząd nie może zmieniać konfiguracji modułów przez Google Sheets.
- **Cel naprawy:** Opracować i wdrożyć nowy `ServiceTask` do odczytu konfiguracji z dedykowanej zakładki arkusza i zapisu do `setup/app` w Firestore. Task dodać do `registry.ts`.
- **Pliki do sprawdzenia:** `functions/src/service/registry.ts` — rejestracja tasków; `functions/src/service/types.ts` — interfejs `ServiceTask`; `functions/src/service/tasks/` — wzorce istniejących tasków; `functions/src/service/providers/googleSheetsProvider.ts` — dostępne metody odczytu arkusza; aktualny dokument `setup/app` w Firestore — struktura danych; arkusz Google Sheets — czy istnieje zakładka z konfiguracją setup (weryfikacja przed implementacją).
- **Pliki, które prawdopodobnie będą wymagały zmiany:** Nowy plik `functions/src/service/tasks/setupSyncFromSheet.ts`; `functions/src/service/registry.ts` — dodanie nowego tasku; `functions/src/service/service_config.ts` — ewentualnie dodanie ID arkusza setup jeśli nie istnieje.
- **Zakres zmiany:** Nowy task + rejestracja. Nie zmieniać istniejących tasków, `runner.ts`, `index.ts`.
- **Czego nie zmieniać:** Struktura `setup/app` w Firestore — zadaniem tasku jest zapis zgodny z istniejącym schematem `SetupApp` z `index.ts`.
- **Ryzyka:** Wymaga uprzedniego uzgodnienia struktury zakładki arkusza setup z zarządem. Jeśli zakładka nie istnieje — task nie ma skąd czytać. Ten etap musi być poprzedzony weryfikacją dostępności arkusza setup. Złe mapowanie kolumn arkusza → struktura `SetupApp` może nadpisać poprawną konfigurację prod.
- **Warunek zakończenia etapu:** Task `setup.syncFromSheet` jest w `registry.ts`. Można go wywołać przez `adminRunServiceTask`. Wykonanie odczytuje dane z arkusza i zapisuje do `setup/app`.
- **Jak zweryfikować po wdrożeniu:** Wywołanie przez `adminRunServiceTask` z `taskId: "setup.syncFromSheet"`. Sprawdzić `setup/app` w Firestore — dane zgodne z arkuszem.

---

## 5. Lista etapów obowiązkowych

W logicznej kolejności implementacji:

1. Usunięcie wildcard CORS z `firebase.json` — **krytyczny**
2. Dodanie brakujących 5 rewrite'ów do `firebase.json` — **krytyczny**
3. Przywrócenie Firestore Rules do repo — **krytyczny**
4. Naprawa routingu startowego — użycie `session.screen` — **wysoki**
5. Usunięcie hardcoded etykiet ról/statusów w `render_shell.js` — **wysoki**
6. Usunięcie hardcoded etykiet w `membersSyncToSheet.ts` — **wysoki**
7. Usunięcie hardcoded `MEMBER_LEVEL_ROLES` w `onUserRegisteredWelcome.ts` — **wysoki**
8. Deduplicacja jobów `members.syncToSheet` — **średni**
9. Automatyczny scheduler dla `usersSyncRolesFromSheet` — **średni**
10. Mechanizm syncu `setup` z Google Sheets do Firestore — **średni**

---

## 6. Macierz zależności

| Etap | Zależy od | Blokuje | Ryzyko jeśli zrobione za wcześnie |
|------|-----------|---------|-----------------------------------|
| 1 (CORS wildcard) | — | 2 | — (niezależny) |
| 2 (5 rewrite'ów) | 1 | — | Przed etapem 1: wildcard CORS nadal aktywny, ale endpointy działałyby |
| 3 (Firestore Rules) | — | — | — (niezależny, ale im później tym dłużej stan prod nieznany) |
| 4 (routing screen) | 3 | 5 | Bez 3: nie wiadomo czy reguły pozwalają na odczyt potrzebnych danych |
| 5 (etykiety frontend) | 4 | — | Przed 4: etykiety mogą nie być w ctx.setup jeśli filterSetupForUser je stripuje — weryfikacja konieczna |
| 6 (etykiety backend) | 3 | 7 | Bez 3: rules mogą blokować odczyt setup w tasku |
| 7 (MEMBER_LEVEL_ROLES) | 6 | — | Przed 6: etykiety w tasku welcome nadal hardcoded — niezależny problem |
| 8 (deduplicacja jobów) | 6 | — | Przed 6: można wdrożyć, ale test trudny bez działającego etap 6 |
| 9 (scheduler sync ról) | 7 | — | Przed 7: scheduler uruchamia task który używa hardcoded mapowań |
| 10 (sync setup z arkusza) | 9 | — | Przed weryfikacją arkusza: ryzyko nadpisania prod setup złymi danymi |

---

## 7. Minimalny plan wdrożeniowy

**Commit 1:** Etap 1 + Etap 2 razem — oba dotyczą `firebase.json`, deploy jest jedną operacją. Usunięcie wildcard CORS i dodanie 5 rewrite'ów.

**Commit 2:** Etap 3 — `firestore.rules` + pole `"rules"` w `firebase.json`. Osobny commit bo dotyczy bezpieczeństwa i wymaga weryfikacji aktualnych reguł z konsoli przed zapisem.

**Commit 3:** Etap 4 — tylko `app_shell.js`. Wyizolowana zmiana frontendowa, łatwa do rollbacku.

**Czego nie wolno łączyć w jednym commicie:**
- Etap 1 (CORS) z etapem 3 (Rules) — różne kategorie bezpieczeństwa, różne weryfikacje.
- Etap 4 (routing) z etapem 5 (etykiety) — etap 5 wymaga uprzedniego sprawdzenia co zwraca `/api/setup` po etapie 3.
- Etap 9 (scheduler) z etapem 10 (sync setup) — etap 10 wymaga weryfikacji arkusza setup przed implementacją.
- Żadnego backendowego etapu (6, 7, 8, 9, 10) nie wolno łączyć z `firebase.json` — deploy functions i deploy hosting to osobne operacje.

---

## 8. Zakres poza planem

**Ten plan NIE obejmuje:**
- Modyfikacji logiki reguł Firestore (etap 3 to tylko wprowadzenie do source control stanu istniejącego).
- Zmiany harmonogramu backoffu lub `maxAttempts` w worker.
- Real-time push zmian roli/statusu do aktywnych sesji — audyt potwierdza że zmiana działa po przeładowaniu, co jest akceptowalne.
- Zmiany struktury `setup/app` w Firestore.
- Obsługi nowych ról/statusów biznesowych.
- Zmiany sposobu weryfikacji domeny przy logowaniu.
- Refaktoru `service_config.ts` (`adminRoleKeys`, `memberRoleKeys`) — audyt oznacza to jako ryzyko, ale nie jako WRONG; zmiana wymaga osobnego audytu wpływu na wszystkie handlery.
- Zmiany struktury arkusza Google Sheets.
- Implementacji notyfikacji dla zarządu o zmianie statusu usera.

**Czego nie wolno robić bez nowego audytu lub bez sprawdzenia aktualnych plików:**
- Zmiany w `filterSetupForUser()` w `index.ts` bez weryfikacji jakie pola faktycznie trafiają do odpowiedzi `/api/setup`.
- Zmiany w `jobProcessor.ts` bez audytu efektu na istniejące joby w kolejce.
- Zmiany w `onUsersActiveCreated.ts` bez weryfikacji czy trigger Firestore działa poprawnie na prod.
- Wdrożenia etapu 10 bez uprzedniej weryfikacji struktury arkusza setup i konsultacji z zarządem.
- Żadnych zmian w `registerUserHandler.ts` — handler jest w zakresie OK/PARTIAL, nie WRONG; jakiekolwiek zmiany wymagają oddzielnego audytu.