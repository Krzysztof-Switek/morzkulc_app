# AUDIT_PLAN — Plan audytu systemu godzinkowego i rezerwacji

Data: 2026-04-20  
Środowisko: PROD (`morzkulc-e9df7`)  
Autorzy: Zarząd SKK Morzkulc

---

## Zakres audytu

Pełny audyt systemu godzinkowego i rezerwacji sprzętu kajakowego przed oddaniem systemu użytkownikom.

### Obszary objęte audytem

| Obszar | Co weryfikujemy | Plik testów |
|--------|-----------------|-------------|
| Logika FIFO godzinek | Saldo, wygasanie, dedukcja, ujemne | `tests/test_godzinki.py` |
| Logika bundle rezerwacji | Konflikty, max_items, cennik | `tests/test_bundle_reservations.py` |
| API rezerwacji (HTTP) | Autoryzacja, limity, offset, anulowanie | `tests/e2e/test_gear_reservations_api.py` |
| API godzinek (HTTP) | Bilans, submit, walidacja | `tests/e2e/test_godzinki_api.py` |
| Bezpieczeństwo HTTP | Token, host allowlist | `tests/e2e/test_security_http.py` |
| Rejestracja (BO26) | Onboarding użytkownika | `tests/e2e/test_register_bo26.py` |
| E2E Playwright | Przeglądarka, UI flows | *(planowane)* |

### Obszary WYŁĄCZONE z audytu

- Moduł imprez (nie powiązany z godzinkami i rezerwacjami)
- Integracja Google Sheets (osobny proces CI)
- Synchronizacja wioseł/katalogu sprzętu ze Sheets
- Backend infrastructure (Cloud Run, Firebase Hosting, CI/CD)

---

## Kolejność wykonania

### Etap 0 — Analiza kodu (zakończony)

Pełna analiza kodu backendowego i frontendowego. Wyniki w `AUDIT_MAP.md`.

### Etap 1 — Dokumentacja (zakończony)

| Artefakt | Plik | Status |
|----------|------|--------|
| Mapa systemu | `Audyty/AUDIT_MAP.md` | ✅ |
| Plan audytu | `Audyty/AUDIT_PLAN.md` | ✅ |
| Matryca testów | `Audyty/TEST_MATRIX.md` | ✅ |
| Wymagania danych testowych | `Audyty/TEST_DATA_REQUIREMENTS.md` | ✅ |
| Instrukcja uruchamiania | `Audyty/RUN_TESTS.md` | ✅ |

### Etap 2 — Testy jednostkowe logiki (zakończony)

| Plik | Co pokrywa | Status |
|------|-----------|--------|
| `tests/test_godzinki.py` | FIFO, saldo, wygasanie, anulacja, BUG #1 | ✅ |
| `tests/test_bundle_reservations.py` | Bundle conflicts, max_items, cennik (K1) | ✅ + rozszerzone |

### Etap 3 — Testy integracyjne HTTP (zakończony)

| Plik | Co pokrywa | Status |
|------|-----------|--------|
| `tests/e2e/test_gear_reservations_api.py` | Autoryzacja, limity, offset, konflikty, bilans | ✅ |
| `tests/e2e/test_godzinki_api.py` | Autoryzacja, bilans, submit, walidacja | ✅ |
| `tests/e2e/test_security_http.py` | Token/host allowlist | ✅ (preexisting) |

### Etap 4 — Testy E2E Playwright (planowane)

Scenariusze przeglądarki wymagają kont testowych w PROD i konfiguracji Playwright.
Patrz `RUN_TESTS.md` w sekcji Playwright.

### Etap 5 — Raport końcowy

Plik `Audyty/AUDIT_REPORT.md` — wypełniany po zakończeniu testów E2E.

---

## Znalezione ryzyka — podsumowanie priorytetów

### KRYTYCZNE (muszą być naprawione przed oddaniem systemu użytkownikom)

| # | Opis | Rekomendacja |
|---|------|-------------|
| K1 | Brak cennika akcesoriów — wiosło/kask/fartuch/kamizelka/rzutka bezpłatne | Decyzja PO + implementacja |
| K2 | Nieatomowy zapis rezerwacji + dedukcja godzinek — zombie reservations możliwe | Refaktor do transakcji Firestore |
| K3 | Anulacja zablokowana trwale gdy pula FIFO wygasła | Fix w refundHoursForReservation() |
| K4 | Overdraft przy anulacji dostaje nową datę wygaśnięcia (nie oryginalną) | Decyzja PO + fix |
| K5 | Brak walidacji startDate >= today — rezerwacja w przeszłości | Dodać walidację w createReservation() |

### ŚREDNIE (ważne, ale nie blokują oddania)

| # | Opis | Rekomendacja |
|---|------|-------------|
| S1 | rola_kursant nie może rezerwować (0 w mapach limitów) | Decyzja PO |
| S2 | max_items liczy akcesoria łącznie z kajakami — kandydat nie może wziąć zestawu | Decyzja PO |
| S3 | Otwarcie balance expiry hardcoded 2029-12-31 | Przenieść do setup |
| S4 | Brak walidacji endDate >= startDate | Dodać walidację |
| S5 | Race condition: findConflicts → ref.set() bez transakcji | Refaktor lub idempotency key |

### NISKIE

| # | Opis | Rekomendacja |
|---|------|-------------|
| N1 | Anulacja blokuje się w dzień startu offsetu (strict <) | Udokumentować |
| N2 | listMyReservations limit 50 | Paginacja lub zwiększenie |

---

## Pytania otwarte dla zarządu (PO decisions)

Przed naprawami — nie przed audytem:

1. **K1**: Czy akcesoria mają być płatne? Jeśli tak — podaj stawki per kategoria.
2. **K4**: Czy zwrot godzinek z overdraft powinien mieć oryginalną datę, czy nową (+4 lata)?
3. **S1**: Czy `rola_kursant` może rezerwować sprzęt? Jeśli tak — jakie limity?
4. **S2**: Czy `max_items` powinien liczyć tylko kajaki, czy wszystkie przedmioty?
5. **S3**: Czy data wygaśnięcia salda otwarcia powinna być konfigurowalna przez setup?
