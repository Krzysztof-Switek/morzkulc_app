# TEST_MATRIX — Matryca testów audytowych

Data: 2026-04-20 | Środowisko: PROD morzkulc-e9df7

Legenda statusów: ✅ PASS | ❌ FAIL | ⚠️ PARTIAL | 🔲 TODO | ⏭️ SKIP

---

## A. AUTORYZACJA I DOSTĘP

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| A01 | Brak tokena → POST /create | — | HTTP | 401 Unauthorized | 🔲 |
| A02 | Nieprawidłowy token → POST /create | — | HTTP | 401 Unauthorized | 🔲 |
| A03 | Sympatyk próbuje zarezerwować kajak | rola_sympatyk | HTTP | 403 role not allowed | 🔲 |
| A04 | Kursant próbuje zarezerwować kajak | rola_kursant | HTTP | 403 role not allowed | 🔲 |
| A05 | Zawieszony użytkownik próbuje zarezerwować | status_zawieszony | HTTP | 403 Access blocked | 🔲 |
| A06 | Zawieszony nie może zgłosić godzinek | status_zawieszony | HTTP | 403 | 🔲 |
| A07 | GET /api/admin/pending przez zwykłego usera | rola_czlonek | HTTP | 403 | 🔲 |
| A08 | User anuluje rezerwację innego usera | rola_czlonek | HTTP | 403 Not yours | 🔲 |
| A09 | Niezalogowany nie widzi modułu sprzętu | — | Playwright | Przekierowanie/brak modułu | 🔲 |

---

## B. SETUP JAKO ŹRÓDŁO PRAWDY

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| B01 | Koszt rezerwacji = days × kajaki × godzinki_za_kajak z setup | rola_czlonek | HTTP | costHours zgodny z setup | 🔲 |
| B02 | boardDoesNotPay=true → zarząd ma koszt=0 | rola_zarzad | HTTP | costHours=0 | 🔲 |
| B03 | boardDoesNotPay=true → kr ma koszt=0 | rola_kr | HTTP | costHours=0 | 🔲 |
| B04 | endDate > maxEndIso dla członka → blokada | rola_czlonek | HTTP | 400 max_time_exceeded | 🔲 |
| B05 | endDate > maxEndIso dla zarządu → blokada | rola_zarzad | HTTP | 400 max_time_exceeded | 🔲 |
| B06 | max_items przekroczony dla kandydata (>1) | rola_kandydat | HTTP | 400 max_items_exceeded | 🔲 |
| B07 | max_items przekroczony dla członka (>3) | rola_czlonek | HTTP | 400 max_items_exceeded | 🔲 |
| B08 | Offset = 1: rezerwacja A kończy się 10.05, B próbuje 10.05 → blokada | rola_czlonek | HTTP | 400 conflict | 🔲 |
| B09 | Offset = 1: rezerwacja A kończy się 10.05, B próbuje 12.05 → OK | rola_czlonek | HTTP | 200 ok | 🔲 |
| B10 | Akcesoria (wiosło/kask/fartuch) w bundle mają koszt=0 (LUKA K1) | rola_czlonek | HTTP | costHours = tylko kajaki × dni | 🔲 |

---

## C. GODZINKI — SALDO I FIFO

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| C01 | Niezatwierdzone godzinki nie liczą się do bilansu | rola_czlonek | Logika/HTTP | balance bez pending | ✅ (test_godzinki.py) |
| C02 | Wygasłe godzinki nie liczą się do bilansu | rola_czlonek | Logika | balance=0 przy wygasłych | ✅ |
| C03 | Zatwierdzone godzinki wchodzą do bilansu | rola_czlonek | Logika | balance = suma remaining | ✅ |
| C04 | FIFO: najstarsza pula zużywana pierwsza | rola_czlonek | Logika | earn[0].remaining=0 | ✅ |
| C05 | FIFO: wygasłe pule pomijane | rola_czlonek | Logika | brak dedukcji z wygasłych | ✅ |
| C06 | Saldo ujemne do limitu: dozwolone | rola_czlonek | Logika | ok=True | ✅ |
| C07 | Saldo ujemne powyżej limitu: zablokowane | rola_czlonek | Logika | negative_limit_exceeded | ✅ |
| C08 | Bilans API po rezerwacji = bilans Firestore | rola_czlonek | HTTP+Firestore | zgodność | 🔲 |
| C09 | Bilans API po anulacji = bilans przed rezerwacją | rola_czlonek | HTTP+Firestore | saldo wraca do oryginalnego | 🔲 |
| C10 | Skrócenie rezerwacji + anulowanie = saldo oryginalne (BUG #1) | rola_czlonek | Logika+HTTP | saldo niezmienione | ✅ (logika), 🔲 (HTTP) |
| C11 | Graniczne: saldo = dokładnie koszt rezerwacji | rola_czlonek | HTTP | ok=True, balance=0 po | 🔲 |
| C12 | Graniczne: saldo o 1 za mało → blokada | rola_czlonek | HTTP | 400 negative_limit | 🔲 |
| C13 | Zarząd z boardDoesNotPay=true: saldo nie zmienia się po rezerwacji | rola_zarzad | HTTP+Firestore | saldo bez zmian | 🔲 |
| C14 | Overdraft przy anulacji tworzy nową pulę (UWAGA K4) | rola_czlonek | Firestore | earn z nowym expiresAt | 🔲 |
| C15 | FIFO trace: earnDeductions wskazuje właściwe pool ID | rola_czlonek | Firestore | earnDeductions[].earnId poprawne | 🔲 |

---

## D. REZERWACJE — TWORZENIE

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| D01 | Poprawna rezerwacja 1 kajaka 1 dzień | rola_czlonek | HTTP | ok=True, costHours>0 | 🔲 |
| D02 | Poprawna rezerwacja bundle (kajak+wiosło+fartuch) | rola_czlonek | HTTP | ok=True, costHours=tylko kajak | 🔲 |
| D03 | Dwie rezerwacje nakładające się — blokada konfliktowa | rola_czlonek + rola_kandydat | HTTP | 400 conflict | 🔲 |
| D04 | Rezerwacja offsetowana: [09.05-11.05] blokuje kajak dla [10.05-12.05] | rola_czlonek | HTTP | 400 conflict (offset overlap) | 🔲 |
| D05 | Rezerwacja z datą w przeszłości — brak walidacji (LUKA K5) | rola_czlonek | HTTP | 200 (udokumentować) | 🔲 |
| D06 | Rezerwacja kajaka przypisanego do basenu → blokada | rola_czlonek | HTTP | 400 item_not_reservable | 🔲 |
| D07 | Rezerwacja nieaktywnego/złomowanego kajaka → blokada | rola_czlonek | HTTP | 400 item_not_found | 🔲 |
| D08 | Rezerwacja nieoperacyjnego kajaka w bundle → blokada | rola_czlonek | HTTP | 400 item_not_operational | 🔲 |
| D09 | endDate < startDate → zachowanie | rola_czlonek | HTTP | 400 lub 200 z costHours=0 (udokumentować) | 🔲 |
| D10 | Rezerwacja na minimalny okres (1 dzień) | rola_czlonek | HTTP | costHours = 1×kayaks×rate | 🔲 |
| D11 | Kandydat: 1 kajak na 1 tydzień — OK | rola_kandydat | HTTP | ok=True | 🔲 |
| D12 | Kandydat: 2 kajaki → blokada max_items | rola_kandydat | HTTP | 400 max_items_exceeded | 🔲 |
| D13 | Kandydat: endDate > +7 dni → blokada max_time | rola_kandydat | HTTP | 400 max_time_exceeded | 🔲 |
| D14 | Bundle: max_items=3 (member), zestaw: kajak+wiosło+fartuch = 3 → OK | rola_czlonek | HTTP | ok=True | 🔲 |
| D15 | Bundle: max_items=3 (member), zestaw: kajak+wiosło+fartuch+kask = 4 → blokada | rola_czlonek | HTTP | 400 max_items_exceeded | 🔲 |
| D16 | Gear-only bundle (bez kajaka) → reservationKind=gear_only, koszt=0 | rola_czlonek | HTTP | costHours=0, kind=gear_only | 🔲 |

---

## E. REZERWACJE — EDYCJA I ANULOWANIE

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| E01 | Anulacja aktywnej rezerwacji przed startem offsetu → OK | rola_czlonek | HTTP | ok=True, saldo zwrócone | 🔲 |
| E02 | Anulacja w dniu startu offsetu (blockStartIso=today) → blokada | rola_czlonek | HTTP | 400 cancel_blocked | 🔲 |
| E03 | Anulacja po starcie offsetu → blokada | rola_czlonek | HTTP | 400 cancel_blocked | 🔲 |
| E04 | Anulacja już anulowanej rezerwacji → blokada | rola_czlonek | HTTP | 400 invalid_state | 🔲 |
| E05 | Update dat: wydłużenie → dodatkowa dedukcja godzinek | rola_czlonek | HTTP+Firestore | delta > 0, bilans zmniejszony | 🔲 |
| E06 | Update dat: skrócenie → zwrot różnicy (creditReservationAdjustment) | rola_czlonek | HTTP+Firestore | delta < 0, earn adjustment | 🔲 |
| E07 | Update po starcie offsetu: tylko skrócenie do 1 dnia dozwolone | rola_czlonek | HTTP | 400 update_blocked na inne | 🔲 |
| E08 | Anulacja po skróceniu: saldo = oryginalne (nie +adjustment) | rola_czlonek | HTTP+Firestore | saldo = stan sprzed rezerwacji | 🔲 |
| E09 | Anulacja po wygaśnięciu puli FIFO → blokada (RYZKO K3) | rola_czlonek | HTTP | 400 pool_expired | 🔲 |
| E10 | Po anulacji kajak dostępny dla innego usera | rola_czlonek | HTTP | second reservation ok | 🔲 |

---

## F. TESTY GRANICZNE

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| F01 | Saldo = 0 godzinek → próba rezerwacji kajaka (koszt>0) | rola_czlonek | HTTP | 400 (zależy od limitu ujemnego) | 🔲 |
| F02 | Saldo = -negativeBalanceLimit → kolejna dedukcja blokada | rola_czlonek | HTTP | 400 negative_limit_exceeded | 🔲 |
| F03 | 3 pule FIFO + rezerwacja zużywająca z 2 | rola_czlonek | Logika | earnDeductions z 2 pul | ✅ |
| F04 | Pula przeterminowana + aktualna → zużywa tylko z aktualnej | rola_czlonek | Logika | spend.fromEarn = z aktualnej | ✅ |
| F05 | endDate = maxEndIso (dokładnie na granicy) → OK | rola_czlonek | HTTP | ok=True | 🔲 |
| F06 | endDate = maxEndIso + 1 dzień → blokada | rola_czlonek | HTTP | 400 max_time_exceeded | 🔲 |
| F07 | Szybkie podwójne kliknięcie create (idempotencja) | rola_czlonek | HTTP | tylko 1 rezerwacja w Firestore | 🔲 |
| F08 | Wyścig dwóch userów o ten sam kajak (S5) | 2x rola_czlonek | HTTP concurrent | jeden dostaje 409/400, drugi 200 | 🔲 |

---

## G. BEZPIECZEŃSTWO

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| G01 | Brak tokena → 401 | — | HTTP | 401 | ✅ (security_http.py) |
| G02 | Zły token → 401 | — | HTTP | 401 | ✅ |
| G03 | Zły host → 403 | — | HTTP | 403 (może być 401 przez Firebase) | ✅ |
| G04 | Admin endpoint (POST /api/admin/setup) przez nie-admin@morzkulc.pl | rola_zarzad | HTTP | 403 | 🔲 |
| G05 | Ręczna podmiana reservationId w cancel → 403 Not yours | rola_czlonek | HTTP | 403 | 🔲 |
| G06 | Sympatyk ręcznie tworzy payload kayakIds i wysyła | rola_sympatyk | HTTP | 403 role not allowed | 🔲 |

---

## H. REGRESJA

| # | Scenariusz | Rola | Typ testu | Oczekiwany wynik | Status |
|---|-----------|------|-----------|-----------------|--------|
| H01 | Rezerwacja pojawia się w my-reservations | rola_czlonek | HTTP+Playwright | widoczna w liście | 🔲 |
| H02 | Po anulacji znika z my-reservations (lub status cancelled) | rola_czlonek | HTTP+Playwright | status=cancelled | 🔲 |
| H03 | Kajak zarezerwowany przez A niewidoczny jako dostępny w terminach A | — | HTTP | isAvailableForRange=false | 🔲 |
| H04 | Kajak po anulacji przez A widoczny jako dostępny | — | HTTP | isAvailableForRange=true | 🔲 |
| H05 | GET /api/godzinki balance = obliczenie z godzinki_ledger | rola_czlonek | HTTP+Firestore | zgodność | 🔲 |
