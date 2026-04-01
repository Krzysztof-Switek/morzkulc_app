"""
Testy logiki biznesowej systemu godzinek SKK Morzkulc.

Testy uruchamiane lokalnie w PyCharm (pytest).
Wymagania: Python 3.9+, brak zewnętrznych zależności (pure Python).

Logika odwzorowuje godzinki_service.ts:
  positive_balance = suma earn.remaining (approved=True AND expiresAt > now)
  net_overdraft    = suma spend.overdraft - suma purchase.amount
  balance          = positive_balance - net_overdraft

Algorytm FIFO: przy odliczaniu godzinek zużywamy najpierw najstarsze pule.
Godzinki wygasają 4 lata od daty przyznania (grantedAt).
"""

import unittest
from datetime import datetime, timezone, timedelta
from copy import deepcopy
import json


# ──────────────────────────────────────────────────────────────────────────────
# DEBUG / LOGGING
# ──────────────────────────────────────────────────────────────────────────────

DEBUG_TEST_OUTPUT = True


def _to_debug_value(value):
    """Konwertuje obiekty do formatu czytelnego w konsoli."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_to_debug_value(v) for v in value]
    if isinstance(value, dict):
        return {k: _to_debug_value(v) for k, v in value.items()}
    return value


def _debug_dump(label, value):
    """Czytelny print JSON do konsoli."""
    if not DEBUG_TEST_OUTPUT:
        return
    print(f"{label}:")
    print(json.dumps(_to_debug_value(value), ensure_ascii=False, indent=2, sort_keys=True))


def _debug_line(text=""):
    if not DEBUG_TEST_OUTPUT:
        return
    try:
        print(text)
    except UnicodeEncodeError:
        import sys
        print(str(text).encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8"))


class VerboseBusinessTestCase(unittest.TestCase):
    """Bazowa klasa testowa — dodaje komentarz do każdego testu."""

    def setUp(self):
        if DEBUG_TEST_OUTPUT:
            _debug_line("\n" + "=" * 100)
            _debug_line(f"TEST: {self.id()}")
            doc = self.shortDescription()
            if doc:
                _debug_line("OPIS TESTU:")
                _debug_line(doc.strip())
            _debug_line("=" * 100)

    def tearDown(self):
        if DEBUG_TEST_OUTPUT:
            _debug_line(f"WYNIK TESTU: ZAKOŃCZONO {self.id()}")
            _debug_line("=" * 100 + "\n")


# ──────────────────────────────────────────────────────────────────────────────
# Implementacja logiki biznesowej w Pythonie (mirror TypeScript godzinki_service.ts)
# ──────────────────────────────────────────────────────────────────────────────

EXPIRY_YEARS = 4


def _dt(year, month=1, day=1, hour=0):
    """Tworzy świadomy datetime UTC."""
    return datetime(year, month, day, hour, tzinfo=timezone.utc)


def make_earn(amount, granted_at, approved=True, remaining=None, expiry_years=EXPIRY_YEARS):
    """
    Tworzy rekord typu 'earn'.

    Jeśli approved=True: remaining = amount (chyba że podano jawnie), expiresAt = granted_at + expiry_years lat.
    Jeśli approved=False: remaining = 0, expiresAt = None (nie liczy się do bilansu).
    """
    if approved:
        expires_at = granted_at.replace(year=granted_at.year + expiry_years)
        r = amount if remaining is None else remaining
    else:
        expires_at = None
        r = 0

    rec = {
        "type": "earn",
        "amount": amount,
        "remaining": r,
        "granted_at": granted_at,
        "expires_at": expires_at,
        "approved": approved,
    }

    _debug_line("TWORZENIE REKORDU EARN")
    _debug_dump("WEJŚCIE", {
        "amount": amount,
        "granted_at": granted_at,
        "approved": approved,
        "remaining": remaining,
        "expiry_years": expiry_years,
    })
    _debug_dump("WYJŚCIE", rec)
    return rec


def make_spend(amount, from_earn=None, overdraft=None, refunded=False):
    """
    Tworzy rekord typu 'spend'.
    Jeśli from_earn/overdraft nie podano, zakłada całość z earn (overdraft=0).
    refunded=True → rekord jest anulowany, nie wlicza się do bilansu (jak w TS: refunded !== true).
    """
    if from_earn is None and overdraft is None:
        from_earn = amount
        overdraft = 0
    elif overdraft is None:
        overdraft = amount - (from_earn or 0)
    elif from_earn is None:
        from_earn = amount - overdraft

    rec = {
        "type": "spend",
        "amount": amount,
        "from_earn": from_earn,
        "overdraft": overdraft,
        "refunded": refunded,
    }

    _debug_line("TWORZENIE REKORDU SPEND")
    _debug_dump("WEJŚCIE", {
        "amount": amount,
        "from_earn": from_earn,
        "overdraft": overdraft,
        "refunded": refunded,
    })
    _debug_dump("WYJŚCIE", rec)
    return rec


def make_purchase(amount, approved=True):
    """
    Tworzy rekord typu 'purchase' (wykup salda ujemnego).
    approved=True  → zatwierdzony, wlicza się do bilansu (redukuje overdraft).
    approved=False → oczekuje na zatwierdzenie admina, NIE wlicza się do bilansu.
    approved=None  → stary rekord bez pola (kompatybilność wsteczna — traktowany jak True).
    """
    rec = {"type": "purchase", "amount": amount}
    if approved is not None:
        rec["approved"] = approved

    _debug_line("TWORZENIE REKORDU PURCHASE")
    _debug_dump("WEJŚCIE", {
        "amount": amount,
        "approved": approved,
    })
    _debug_dump("WYJŚCIE", rec)
    return rec


def compute_balance(records, now=None):
    """
    Oblicza aktualne saldo godzinek.
    balance = positive_balance - net_overdraft

    Kompatybilność wsteczna (zgodna z TypeScript godzinki_service.ts:computeBalance):
      spend.refunded === undefined → liczymy (stare rekordy bez refund-flow)
      purchase.approved === undefined → liczymy (stare rekordy bez approval-flow)
    """
    if now is None:
        now = datetime.now(timezone.utc)

    _debug_line("SPRAWDZAM: compute_balance")
    _debug_dump("WEJŚCIE.records", records)
    _debug_dump("WEJŚCIE.now", now)

    positive = 0.0
    net_overdraft = 0.0

    for r in records:
        if r["type"] == "earn":
            if r.get("approved") is True:
                exp = r.get("expires_at")
                if exp and exp > now:
                    positive += r.get("remaining", 0)
        elif r["type"] == "spend":
            if r.get("refunded") is not True:
                net_overdraft += r.get("overdraft", 0)
        elif r["type"] == "purchase":
            if r.get("approved") is not False:
                net_overdraft -= r.get("amount", 0)

    result = positive - net_overdraft

    _debug_dump("WYJŚCIE", {
        "positive_balance": positive,
        "net_overdraft": net_overdraft,
        "balance": result,
    })
    return result


def compute_next_expiry(records, now=None):
    """Zwraca datę najbliższego wygaśnięcia godzinek (najstarsza pula z remaining > 0)."""
    if now is None:
        now = datetime.now(timezone.utc)

    _debug_line("SPRAWDZAM: compute_next_expiry")
    _debug_dump("WEJŚCIE.records", records)
    _debug_dump("WEJŚCIE.now", now)

    candidates = []
    for r in records:
        if r["type"] != "earn":
            continue
        if r.get("approved") is not True:
            continue
        if r.get("remaining", 0) <= 0:
            continue
        exp = r.get("expires_at")
        if exp and exp > now:
            candidates.append(exp)

    result = min(candidates) if candidates else None
    _debug_dump("WYJŚCIE", {
        "candidates": candidates,
        "next_expiry": result,
    })
    return result


def deduct_hours(records, amount, vars_config, now=None):
    """
    Odlicza godzinki metodą FIFO. Modyfikuje earn.remaining w rekordach.
    Zwraca: (ok, code, message, spend_record)

    Nie modyfikuje oryginalnej listy (deepcopy na początku).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    _debug_line("SPRAWDZAM: deduct_hours")
    _debug_dump("WEJŚCIE.records", records)
    _debug_dump("WEJŚCIE.amount", amount)
    _debug_dump("WEJŚCIE.vars_config", vars_config)
    _debug_dump("WEJŚCIE.now", now)

    records = deepcopy(records)

    negative_limit = vars_config.get("negativeBalanceLimit", 20)

    current_balance = compute_balance(records, now)
    new_balance = current_balance - amount

    _debug_dump("ETAP: wstępne saldo", {
        "current_balance": current_balance,
        "amount_to_deduct": amount,
        "new_balance": new_balance,
        "negative_limit": negative_limit,
    })

    if new_balance < -negative_limit:
        result = (
            False,
            "negative_limit_exceeded",
            f"Saldo zejdzie poniżej limitu -{negative_limit}. Aktualny balans: {current_balance:.1f}, próba odliczenia: {amount}",
            records,
            None,
        )
        _debug_dump("WYJŚCIE", {
            "ok": result[0],
            "code": result[1],
            "message": result[2],
            "updated_records": result[3],
            "spend_record": result[4],
        })
        return result

    earn_records = sorted(
        [r for r in records
         if r["type"] == "earn"
         and r.get("approved") is True
         and r.get("expires_at") is not None
         and r["expires_at"] > now
         and r.get("remaining", 0) > 0],
        key=lambda r: r["granted_at"],
    )

    _debug_dump("ETAP: pule FIFO po sortowaniu", earn_records)

    remaining_to_deduct = amount
    from_earn = 0

    for earn in earn_records:
        if remaining_to_deduct <= 0:
            break
        available = earn["remaining"]
        take = min(available, remaining_to_deduct)

        _debug_dump("ETAP: zużycie z puli", {
            "pool_before": earn,
            "available": available,
            "take": take,
            "remaining_to_deduct_before": remaining_to_deduct,
        })

        earn["remaining"] -= take
        from_earn += take
        remaining_to_deduct -= take

        _debug_dump("ETAP: pula po zużyciu", {
            "pool_after": earn,
            "from_earn_accumulated": from_earn,
            "remaining_to_deduct_after": remaining_to_deduct,
        })

    overdraft = remaining_to_deduct
    spend_record = make_spend(amount, from_earn=from_earn, overdraft=overdraft)
    records.append(spend_record)

    result = (True, None, None, records, spend_record)
    _debug_dump("WYJŚCIE", {
        "ok": result[0],
        "code": result[1],
        "message": result[2],
        "updated_records": result[3],
        "spend_record": result[4],
    })
    return result


def purchase_negative_balance(records, amount, now=None):
    """
    Wykup salda ujemnego. Można wykupić tylko tyle, żeby saldo nie przekroczyło 0.
    Zwraca: (ok, code, message, updated_records)
    """
    if now is None:
        now = datetime.now(timezone.utc)

    _debug_line("SPRAWDZAM: purchase_negative_balance")
    _debug_dump("WEJŚCIE.records", records)
    _debug_dump("WEJŚCIE.amount", amount)
    _debug_dump("WEJŚCIE.now", now)

    records = deepcopy(records)
    current_balance = compute_balance(records, now)

    _debug_dump("ETAP: saldo przed wykupem", {
        "current_balance": current_balance,
    })

    if current_balance >= 0:
        result = (False, "balance_not_negative", "Saldo nie jest ujemne — nie można wykupić.", records)
        _debug_dump("WYJŚCIE", {
            "ok": result[0],
            "code": result[1],
            "message": result[2],
            "updated_records": result[3],
        })
        return result

    max_purchase = abs(current_balance)
    if amount > max_purchase:
        result = (
            False,
            "purchase_exceeds_debt",
            f"Wykup przeniósłby saldo na plus. Maksymalna dozwolona kwota: {max_purchase:.1f}",
            records,
        )
        _debug_dump("WYJŚCIE", {
            "ok": result[0],
            "code": result[1],
            "message": result[2],
            "updated_records": result[3],
        })
        return result

    records.append(make_purchase(amount))
    result = (True, None, None, records)

    _debug_dump("WYJŚCIE", {
        "ok": result[0],
        "code": result[1],
        "message": result[2],
        "updated_records": result[3],
    })
    return result


# ──────────────────────────────────────────────────────────────────────────────
# TESTY
# ──────────────────────────────────────────────────────────────────────────────

NOW = _dt(2026, 3, 28)  # dziś w testach
VARS = {"negativeBalanceLimit": 20}


class TestBilansApproval(VerboseBusinessTestCase):
    """Testy zatwierdzania godzinek (approved)."""

    def test_niezatwierdzone_nie_licza_sie_do_bilansu(self):
        """
        OCZEKIWANE: Rekord earn z approved=False ma remaining=0 i nie wchodzi do bilansu.
        System NIE MOŻE liczyć niezatwierdzonych godzinek w saldzie użytkownika.
        """
        records = [make_earn(10, _dt(2026, 1, 1), approved=False)]
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_niezatwierdzone_nie_widoczne_nawet_po_dacie(self):
        """
        OCZEKIWANE: Stary rekord niezatwierdzony (z przeszłości) dalej nie liczy się do bilansu.
        """
        records = [make_earn(50, _dt(2020, 6, 1), approved=False)]
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_zatwierdzone_wchodzi_do_bilansu(self):
        """
        OCZEKIWANE: Po zatwierdzeniu (approved=True) rekord earn wchodzi do bilansu.
        Symulacja syncu z Google Sheets: processApproval ustawia approved=True i remaining=amount.
        """
        records = [make_earn(15, _dt(2026, 1, 1), approved=True)]
        self.assertEqual(compute_balance(records, NOW), 15)

    def test_mix_zatwierdzonych_i_niezatwierdzonych(self):
        """
        OCZEKIWANE: Bilans uwzględnia tylko zatwierdzone. Niezatwierdzone 20h są niewidoczne.
        """
        records = [
            make_earn(10, _dt(2025, 6, 1), approved=True),
            make_earn(20, _dt(2026, 1, 1), approved=False),  # czeka na zatwierdzenie
        ]
        self.assertEqual(compute_balance(records, NOW), 10)

    def test_zatwierdzenie_po_syncu_zmienia_bilans(self):
        """
        OCZEKIWANE: Symulacja syncu — ustawienie approved=True i remaining=amount
        powoduje wzrost bilansu.
        """
        records = [make_earn(10, _dt(2026, 1, 1), approved=False)]
        self.assertEqual(compute_balance(records, NOW), 0)

        # Symuluj sync (processApproval)
        records[0]["approved"] = True
        records[0]["remaining"] = records[0]["amount"]
        records[0]["expires_at"] = _dt(2030, 1, 1)  # +4 lata

        _debug_line("SYMULACJA SYNCHRONIZACJI / APPROVAL")
        _debug_dump("RECORD PO ZMIANIE", records[0])

        self.assertEqual(compute_balance(records, NOW), 10)


class TestWygasanie(VerboseBusinessTestCase):
    """Testy wygasania godzinek po 4 latach."""

    def test_wygasle_rekordy_nie_licza_sie(self):
        """
        OCZEKIWANE: Godzinki przyznane 5 lat temu (wygasłe 1 rok temu) mają wartość 0 w bilansie.
        """
        records = [make_earn(20, _dt(2020, 1, 1), approved=True)]
        self.assertLess(records[0]["expires_at"], NOW)
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_nevygasle_rekordy_licza_sie(self):
        """
        OCZEKIWANE: Godzinki przyznane rok temu (wygasają za 3 lata) są liczone normalnie.
        """
        records = [make_earn(20, _dt(2025, 1, 1), approved=True)]
        self.assertGreater(records[0]["expires_at"], NOW)
        self.assertEqual(compute_balance(records, NOW), 20)

    def test_wygasanie_dokladnie_dzisiaj_nie_liczy_sie(self):
        """
        OCZEKIWANE: Godzinki wygasające dziś (expiresAt == NOW) NIE są liczone — warunek strict >now.
        """
        records = [make_earn(10, _dt(2022, 3, 28), approved=True)]
        self.assertEqual(records[0]["expires_at"], NOW)
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_mix_wygasle_i_aktualne(self):
        """
        OCZEKIWANE: Bilans = tylko aktualne (niewygasłe). Wygasłe 10h + aktualne 15h = 15h salda.
        """
        records = [
            make_earn(10, _dt(2020, 1, 1), approved=True),  # wygasłe
            make_earn(15, _dt(2025, 1, 1), approved=True),  # aktualne
        ]
        self.assertEqual(compute_balance(records, NOW), 15)

    def test_nastepna_data_wygasniecia(self):
        """
        OCZEKIWANE: Funkcja compute_next_expiry zwraca datę wygaśnięcia najstarszej puli z remaining > 0.
        Wyświetlane na dashboardzie w formacie MM-RRRR.
        """
        pula_a = make_earn(10, _dt(2023, 6, 1), approved=True)  # wygasa 2027-06-01
        pula_b = make_earn(5,  _dt(2024, 3, 1), approved=True)  # wygasa 2028-03-01
        records = [pula_a, pula_b]

        next_expiry = compute_next_expiry(records, NOW)
        self.assertIsNotNone(next_expiry)
        self.assertEqual(next_expiry, _dt(2027, 6, 1))

    def test_brak_next_expiry_gdy_wszystko_wygasle(self):
        """
        OCZEKIWANE: Gdy wszystkie rekordy są wygasłe, next_expiry = None.
        """
        records = [make_earn(10, _dt(2020, 1, 1), approved=True)]
        self.assertIsNone(compute_next_expiry(records, NOW))

    def test_brak_next_expiry_gdy_wszystko_niezatwierdzone(self):
        """
        OCZEKIWANE: Gdy wszystkie rekordy są niezatwierdzone, next_expiry = None.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=False)]
        self.assertIsNone(compute_next_expiry(records, NOW))

    def test_brak_next_expiry_gdy_remaining_zero(self):
        """
        OCZEKIWANE: Jeśli wszystkie earn.remaining = 0 (zużyte), next_expiry = None.
        Godzinki zostały już wydane, nić do wygaśnięcia nie zostało.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True, remaining=0)]
        self.assertIsNone(compute_next_expiry(records, NOW))


class TestFIFO(VerboseBusinessTestCase):
    """Testy wydawania FIFO — najstarsze pule zużywane najpierw."""

    def test_fifo_jedna_pula_pelne_zuzycie(self):
        """
        OCZEKIWANE: Przy jednej puli 10h i wydaniu 10h — remaining=0, overdraft=0.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True)]
        ok, code, msg, updated, spend = deduct_hours(records, 10, VARS, NOW)

        self.assertTrue(ok)
        earn = [r for r in updated if r["type"] == "earn"][0]
        self.assertEqual(earn["remaining"], 0)
        self.assertEqual(spend["overdraft"], 0)
        self.assertEqual(spend["from_earn"], 10)

    def test_fifo_jedna_pula_czesciowe_zuzycie(self):
        """
        OCZEKIWANE: Przy jednej puli 10h i wydaniu 6h — remaining=4, overdraft=0.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True)]
        ok, _, _, updated, spend = deduct_hours(records, 6, VARS, NOW)

        self.assertTrue(ok)
        earn = [r for r in updated if r["type"] == "earn"][0]
        self.assertEqual(earn["remaining"], 4)
        self.assertEqual(spend["overdraft"], 0)

    def test_fifo_dwie_pule_zuzycie_z_obu(self):
        """
        OCZEKIWANE: Pula A (starsza, 10h) + Pula B (nowsza, 10h). Wydanie 15h:
        - FIFO: najpierw 10h z A, potem 5h z B
        - A.remaining=0, B.remaining=5
        - overdraft=0
        """
        pula_a = make_earn(10, _dt(2024, 1, 1), approved=True)  # starsza
        pula_b = make_earn(10, _dt(2025, 1, 1), approved=True)  # nowsza
        records = [pula_b, pula_a]

        ok, _, _, updated, spend = deduct_hours(records, 15, VARS, NOW)

        self.assertTrue(ok)
        earn_records = sorted(
            [r for r in updated if r["type"] == "earn"],
            key=lambda r: r["granted_at"]
        )
        a, b = earn_records[0], earn_records[1]

        self.assertEqual(a["remaining"], 0, "Starsza pula A powinna być w pełni wyczerpana")
        self.assertEqual(b["remaining"], 5, "Nowsza pula B powinna mieć remaining=5")
        self.assertEqual(spend["overdraft"], 0)
        self.assertEqual(spend["from_earn"], 15)

    def test_fifo_trzy_pule_czesciowe_zuzycie(self):
        """
        OCZEKIWANE: 3 pule (A=5h, B=8h, C=12h). Wydanie 10h:
        - FIFO: 5h z A (A=0), potem 5h z B (B=3), C nienaruszone (C=12)
        - Bilans = 0 + 3 + 12 = 15h
        """
        pula_a = make_earn(5,  _dt(2023, 1, 1), approved=True)
        pula_b = make_earn(8,  _dt(2024, 1, 1), approved=True)
        pula_c = make_earn(12, _dt(2025, 1, 1), approved=True)

        ok, _, _, updated, _ = deduct_hours([pula_a, pula_b, pula_c], 10, VARS, NOW)

        self.assertTrue(ok)
        earn = sorted(
            [r for r in updated if r["type"] == "earn"],
            key=lambda r: r["granted_at"]
        )
        self.assertEqual(earn[0]["remaining"], 0)
        self.assertEqual(earn[1]["remaining"], 3)
        self.assertEqual(earn[2]["remaining"], 12)
        self.assertEqual(compute_balance(updated, NOW), 15)

    def test_bilans_po_czesciowym_zuzyciu_wielu_pul(self):
        """
        OCZEKIWANE: Po kilku operacjach wydania z wielu pul bilans jest poprawnie sumowany.
        Pula A=10h (2024), Pula B=10h (2025). Wydanie 8h, potem kolejne 5h:
        - Po pierwszym wydaniu: A.remaining=2, B.remaining=10 → bilans=12
        - Po drugim wydaniu: A.remaining=0, B.remaining=7 → bilans=7
        """
        pula_a = make_earn(10, _dt(2024, 1, 1), approved=True)
        pula_b = make_earn(10, _dt(2025, 1, 1), approved=True)

        ok1, _, _, records1, _ = deduct_hours([pula_a, pula_b], 8, VARS, NOW)
        self.assertTrue(ok1)
        self.assertEqual(compute_balance(records1, NOW), 12)

        ok2, _, _, records2, _ = deduct_hours(records1, 5, VARS, NOW)
        self.assertTrue(ok2)
        self.assertEqual(compute_balance(records2, NOW), 7)

    def test_fifo_pomija_niezatwierdzone(self):
        """
        OCZEKIWANE: FIFO nie tknrze niezatwierdzonych rekordów earn. Wydanie ze swobodnych pul tylko.
        """
        niezatwierdzone = make_earn(100, _dt(2025, 1, 1), approved=False)
        zatwierdzone = make_earn(10, _dt(2025, 6, 1), approved=True)

        ok, _, _, updated, spend = deduct_hours([niezatwierdzone, zatwierdzone], 10, VARS, NOW)

        self.assertTrue(ok)
        nieztw = [r for r in updated if r["type"] == "earn" and not r.get("approved")][0]
        self.assertEqual(nieztw["remaining"], 0, "Niezatwierdzone remaining było i jest 0")
        self.assertEqual(spend["from_earn"], 10)

    def test_fifo_pomija_wygasle(self):
        """
        OCZEKIWANE: FIFO nie używa wygasłych rekordów earn.
        Wygasła pula 50h + aktualna 5h. Wydanie 5h → overdraft=0, zużyte z aktualnej.
        """
        wygasla = make_earn(50, _dt(2019, 1, 1), approved=True)
        aktualna = make_earn(5, _dt(2025, 1, 1), approved=True)

        ok, _, _, updated, spend = deduct_hours([wygasla, aktualna], 5, VARS, NOW)

        self.assertTrue(ok)
        self.assertEqual(spend["overdraft"], 0)
        self.assertEqual(spend["from_earn"], 5)


class TestSaldoUjemne(VerboseBusinessTestCase):
    """Testy salda ujemnego — limit, blokada, dopuszczalne schodzenie na minus."""

    def test_schodzenie_na_minus_dozwolone_do_limitu(self):
        """
        OCZEKIWANE: Przy pustym saldzie i limicie -20, wydanie 15h jest dozwolone.
        Bilans = -15.
        """
        records = []
        ok, code, _, updated, _ = deduct_hours(records, 15, {"negativeBalanceLimit": 20}, NOW)

        self.assertTrue(ok, f"Oczekiwano ok=True, code={code}")
        self.assertEqual(compute_balance(updated, NOW), -15)

    def test_schodzenie_na_minus_dokladnie_do_limitu(self):
        """
        OCZEKIWANE: Wydanie dokładnie do limitu (-20) jest dozwolone.
        Bilans = -20 (na granicy limitu).
        """
        records = []
        ok, code, _, updated, _ = deduct_hours(records, 20, {"negativeBalanceLimit": 20}, NOW)

        self.assertTrue(ok, f"Oczekiwano ok=True (dokładnie na granicy), code={code}")
        self.assertEqual(compute_balance(updated, NOW), -20)

    def test_przekroczenie_limitu_blokuje(self):
        """
        OCZEKIWANE: Próba wydania godzinek, które zejdą poniżej -20 (limitu), MUSI być zablokowana.
        System zwraca ok=False, code='negative_limit_exceeded'.
        """
        records = []
        ok, code, _, _, _ = deduct_hours(records, 21, {"negativeBalanceLimit": 20}, NOW)

        self.assertFalse(ok, "Oczekiwano ok=False — przekroczenie limitu musi być zablokowane")
        self.assertEqual(code, "negative_limit_exceeded")

    def test_przekroczenie_limitu_o_jeden(self):
        """
        OCZEKIWANE: Próba zejścia o 1 poniżej limitu (-20) jest zablokowana.
        Bilans = -19, próba wydania 2h → nowe saldo = -21 > limit(-20) → BLOKADA.
        """
        records = [make_earn(1, _dt(2025, 1, 1), approved=True)]
        ok1, _, _, records, _ = deduct_hours(records, 20, {"negativeBalanceLimit": 20}, NOW)
        self.assertTrue(ok1)
        self.assertEqual(compute_balance(records, NOW), -19)

        ok2, code, _, _, _ = deduct_hours(records, 2, {"negativeBalanceLimit": 20}, NOW)
        self.assertFalse(ok2)
        self.assertEqual(code, "negative_limit_exceeded")

    def test_rozne_limity_z_setup(self):
        """
        OCZEKIWANE: Limit ujemnego salda pochodzi z setup/vars_godzinki.
        Przy limicie -10 wydanie 11h jest blokowane, a 10h dozwolone.
        """
        vars_tight = {"negativeBalanceLimit": 10}
        ok_allowed, code1, _, _, _ = deduct_hours([], 10, vars_tight, NOW)
        ok_blocked, code2, _, _, _ = deduct_hours([], 11, vars_tight, NOW)

        self.assertTrue(ok_allowed, "10h powinno być dozwolone przy limicie -10")
        self.assertFalse(ok_blocked, "11h powinno być zablokowane przy limicie -10")
        self.assertEqual(code2, "negative_limit_exceeded")


class TestWykup(VerboseBusinessTestCase):
    """Testy wykupu salda ujemnego."""

    def test_wykup_przy_ujemnym_saldzie(self):
        """
        OCZEKIWANE: Przy saldzie -10h, wykup 5h podnosi saldo do -5h.
        """
        records = [make_spend(10, from_earn=0, overdraft=10)]
        self.assertEqual(compute_balance(records, NOW), -10)

        ok, code, _, updated = purchase_negative_balance(records, 5, NOW)
        self.assertTrue(ok, f"Wykup powinien się udać, code={code}")
        self.assertEqual(compute_balance(updated, NOW), -5)

    def test_wykup_do_zera(self):
        """
        OCZEKIWANE: Wykup dokładnie równy saldzie ujemnemu daje bilans = 0.
        """
        records = [make_spend(15, from_earn=0, overdraft=15)]
        ok, _, _, updated = purchase_negative_balance(records, 15, NOW)

        self.assertTrue(ok)
        self.assertEqual(compute_balance(updated, NOW), 0)

    def test_wykup_gdy_saldo_dodatnie_jest_zabroniony(self):
        """
        OCZEKIWANE: Nie można wykupić godzinek gdy saldo jest dodatnie lub równe 0.
        System zwraca ok=False, code='balance_not_negative'.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True)]
        self.assertEqual(compute_balance(records, NOW), 10)

        ok, code, _, _ = purchase_negative_balance(records, 5, NOW)
        self.assertFalse(ok, "Wykup przy dodatnim saldzie musi być zabroniony")
        self.assertEqual(code, "balance_not_negative")

    def test_wykup_gdy_saldo_zero_jest_zabroniony(self):
        """
        OCZEKIWANE: Nie można wykupić godzinek gdy saldo = 0.
        """
        ok, code, _, _ = purchase_negative_balance([], 1, NOW)
        self.assertFalse(ok)
        self.assertEqual(code, "balance_not_negative")

    def test_wykup_nie_moze_wyjsc_na_plus(self):
        """
        OCZEKIWANE: Wykup większy niż saldo ujemne MUSI być zablokowany.
        Saldo = -5h, próba wykupu 10h → nowe saldo = +5h → BLOKADA.
        System zwraca ok=False, code='purchase_exceeds_debt'.
        """
        records = [make_spend(5, from_earn=0, overdraft=5)]
        self.assertEqual(compute_balance(records, NOW), -5)

        ok, code, msg, _ = purchase_negative_balance(records, 10, NOW)
        self.assertFalse(ok, "Wykup wychodzący na plus musi być zablokowany")
        self.assertEqual(code, "purchase_exceeds_debt")

    def test_wykup_dokladnie_jeden_za_duzo(self):
        """
        OCZEKIWANE: Saldo = -5h. Wykup 6h (o 1 za dużo) MUSI być zablokowany.
        """
        records = [make_spend(5, from_earn=0, overdraft=5)]
        ok, code, _, _ = purchase_negative_balance(records, 6, NOW)

        self.assertFalse(ok)
        self.assertEqual(code, "purchase_exceeds_debt")

    def test_wykup_nie_dotyka_zatwierdzonych_earn(self):
        """
        OCZEKIWANE: Wykup działa niezależnie od puli earn.
        Saldo = earn(5h) + overdraft(-10h) = -5h.
        Wykup 3h → saldo = -2h.
        """
        records = [
            make_earn(5, _dt(2025, 1, 1), approved=True),
            make_spend(10, from_earn=5, overdraft=5),
        ]
        self.assertEqual(compute_balance(records, NOW), 0)

        records2 = [
            make_earn(5, _dt(2025, 1, 1), approved=True, remaining=0),
            make_spend(10, from_earn=5, overdraft=5),
        ]
        self.assertEqual(compute_balance(records2, NOW), -5)

        ok, _, _, updated = purchase_negative_balance(records2, 3, NOW)
        self.assertTrue(ok)
        self.assertEqual(compute_balance(updated, NOW), -2)


class TestWarunkiBrzegowe(VerboseBusinessTestCase):
    """Testy warunków brzegowych."""

    def test_brak_rekordow_bilans_zero(self):
        """
        OCZEKIWANE: Nowy użytkownik bez żadnych rekordów ma saldo = 0.
        """
        self.assertEqual(compute_balance([], NOW), 0)

    def test_brak_rekordow_brak_expiry(self):
        """
        OCZEKIWANE: Nowy użytkownik bez rekordów nie ma daty wygaśnięcia.
        """
        self.assertIsNone(compute_next_expiry([], NOW))

    def test_tylko_wygasle_rekordy_bilans_zero(self):
        """
        OCZEKIWANE: Gdy wszystkie earn są wygasłe, bilans = 0 niezależnie od ich kwot.
        """
        records = [
            make_earn(100, _dt(2018, 1, 1), approved=True),
            make_earn(50, _dt(2019, 6, 1), approved=True),
        ]
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_tylko_niezatwierdzone_bilans_zero(self):
        """
        OCZEKIWANE: Gdy wszystkie earn są niezatwierdzone, bilans = 0.
        """
        records = [
            make_earn(20, _dt(2025, 1, 1), approved=False),
            make_earn(30, _dt(2026, 1, 1), approved=False),
        ]
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_saldo_dokladnie_zero_po_wydaniu(self):
        """
        OCZEKIWANE: Dokładne wydanie całego salda daje bilans = 0, nie ujemny.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True)]
        ok, _, _, updated, _ = deduct_hours(records, 10, VARS, NOW)

        self.assertTrue(ok)
        self.assertEqual(compute_balance(updated, NOW), 0)

    def test_saldo_dokladnie_na_granicy_limitu_ujemnego(self):
        """
        OCZEKIWANE: Bilans = -20 (dokładnie na limicie). Stan jest poprawny — kolejne wydanie
        1h musi być ZABLOKOWANE, bo saldo byłoby -21.
        """
        records = []
        _, _, _, at_limit, _ = deduct_hours(records, 20, {"negativeBalanceLimit": 20}, NOW)
        self.assertEqual(compute_balance(at_limit, NOW), -20)

        ok, code, _, _, _ = deduct_hours(at_limit, 1, {"negativeBalanceLimit": 20}, NOW)
        self.assertFalse(ok)
        self.assertEqual(code, "negative_limit_exceeded")

    def test_fifo_wygasniecie_nie_niszczy_salda(self):
        """
        OCZEKIWANE (kluczowy test FIFO): Wydanie z dwóch pul FIFO, potem wygaśnięcie starszej.

        Scenariusz:
        - Pula A: 10h, grantedAt=2022-01-01, wygasa 2026-01-01 (za chwilę wygaśnie)
        - Pula B: 10h, grantedAt=2025-01-01, wygasa 2029-01-01

        Krok 1: Wydanie 12h ZANIM A wygaśnie (past_now = 2025-06-01, obie pule aktywne).
          FIFO: 10h z A (A.remaining=0), 2h z B (B.remaining=8). overdraft=0.

        Krok 2: Sprawdź bilans PO wygaśnięciu A (now = 2026-03-28 > expiresAt A = 2026-01-01).
          A jest wygasła i remaining=0 → nie liczy się.
          B.remaining=8 → bilans = 8.

        BEZ FIFO błąd: bilans = B.amount(10) - spend(12) = -2.
        Z FIFO poprawnie: bilans = B.remaining(8) = 8.
        """
        past_now = _dt(2025, 6, 1)
        pula_a = make_earn(10, _dt(2022, 1, 1), approved=True)
        pula_b = make_earn(10, _dt(2025, 1, 1), approved=True)

        ok, _, _, updated, spend = deduct_hours([pula_a, pula_b], 12, VARS, past_now)
        self.assertTrue(ok, "Wydanie 12h powinno się udać gdy obie pule są aktywne")
        self.assertEqual(spend["overdraft"], 0, "Całe 12h z earn — brak overdraftu")

        earn_sorted = sorted([r for r in updated if r["type"] == "earn"], key=lambda r: r["granted_at"])
        a, b = earn_sorted[0], earn_sorted[1]
        self.assertEqual(a["remaining"], 0, "Starsza pula A wyczerpana przez FIFO")
        self.assertEqual(b["remaining"], 8, "Nowsza pula B ma remaining=8 po zużyciu 2h")

        balance_after_expiry = compute_balance(updated, NOW)
        self.assertEqual(balance_after_expiry, 8, "Bilans po wygaśnięciu A = B.remaining = 8 (FIFO poprawne)")

    def test_pełna_ścieżka_submit_approve_spend_expiry(self):
        """
        OCZEKIWANE: Pełna ścieżka życia godzinek:
        1. Zgłoszenie (approved=False, remaining=0) — bilans=0
        2. Zatwierdzenie syncem — bilans=10
        3. Wydanie 7h FIFO — bilans=3
        4. Wygaśnięcie po 4 latach — bilans=0 (remaining=3 ale wygasłe)
        """
        records = [make_earn(10, _dt(2022, 1, 1), approved=False)]
        self.assertEqual(compute_balance(records, NOW), 0)

        records[0]["approved"] = True
        records[0]["remaining"] = 10
        records[0]["expires_at"] = _dt(2026, 1, 1)

        _debug_line("SYMULACJA ZATWIERDZENIA W PEŁNEJ ŚCIEŻCE")
        _debug_dump("RECORD PO APPROVAL", records[0])

        self.assertLess(records[0]["expires_at"], NOW)
        balance_approved = compute_balance(records, NOW)
        self.assertEqual(balance_approved, 0, "Już wygasłe po zatwierdzeniu — bilans=0")

        records2 = [make_earn(10, _dt(2024, 1, 1), approved=True)]
        self.assertEqual(compute_balance(records2, NOW), 10)

        ok, _, _, records3, _ = deduct_hours(records2, 7, VARS, NOW)
        self.assertTrue(ok)
        self.assertEqual(compute_balance(records3, NOW), 3)

        future_now = _dt(2029, 1, 2)
        self.assertEqual(compute_balance(records3, future_now), 0)


class TestRefundowaneIWykupApproval(VerboseBusinessTestCase):
    """
    Testy kompatybilności wstecznej i flag refunded/approved.
    Pokrywają logikę której brakowało w poprzedniej wersji testów.
    """

    def test_zrefundowany_spend_nie_liczy_sie_do_bilansu(self):
        """
        SPRAWDZAM: spend.refunded=True nie wchodzi do bilansu.
        CEL: Anulowana rezerwacja nie powinna dalej obciążać konta.
        WEJŚCIE: earn(10h approved) + spend(10h, refunded=True)
        OCZEKIWANE: bilans = 10 (spend zignorowany)
        """
        records = [
            make_earn(10, _dt(2025, 1, 1), approved=True),
            make_spend(10, from_earn=10, overdraft=0, refunded=True),
        ]
        self.assertEqual(compute_balance(records, NOW), 10, "Zrefundowany spend nie może obciążać bilansu")

    def test_niezrefundowany_spend_liczy_sie(self):
        """
        SPRAWDZAM: spend.refunded=False (aktywny) wchodzi do bilansu normalnie.
        WEJŚCIE: earn(10h) → deduct_hours(7h) → earn.remaining=3, spend(7h refunded=False)
        OCZEKIWANE: bilans = 3
        Uwaga: earn.remaining jest aktualizowane przez deduct_hours, nie przez ręczne tworzenie.
        """
        records = [make_earn(10, _dt(2025, 1, 1), approved=True)]
        ok, _, _, records, spend = deduct_hours(records, 7, VARS, NOW)
        self.assertTrue(ok)
        self.assertEqual(compute_balance(records, NOW), 3)

    def test_stary_spend_bez_pola_refunded_liczy_sie(self):
        """
        SPRAWDZAM: kompatybilność wsteczna — stary rekord bez pola 'refunded' (brak klucza)
        traktowany jak refunded=False (obciąża bilans).
        CEL: Nie możemy zepsuć istniejących danych w Firestore.
        """
        spend_legacy = {"type": "spend", "amount": 5, "overdraft": 5}
        self.assertEqual(compute_balance([spend_legacy], NOW), -5, "Stary rekord bez pola refunded musi obciążać bilans")

    def test_niezatwierdzony_purchase_nie_liczy_sie(self):
        """
        SPRAWDZAM: purchase.approved=False (pending) nie wchodzi do bilansu.
        CEL: Wykup zanim admin zatwierdzi w Sheets NIE może poprawiać salda.
        WEJŚCIE: spend(10h overdraft=10) + purchase(10h, approved=False)
        OCZEKIWANE: bilans = -10 (purchase ignorowany)
        """
        records = [
            make_spend(10, from_earn=0, overdraft=10),
            make_purchase(10, approved=False),
        ]
        self.assertEqual(compute_balance(records, NOW), -10, "Niezatwierdzony wykup nie może zmieniać bilansu")

    def test_zatwierdzony_purchase_redukuje_overdraft(self):
        """
        SPRAWDZAM: purchase.approved=True zmniejsza saldo ujemne.
        WEJŚCIE: spend(10h overdraft=10) + purchase(10h, approved=True)
        OCZEKIWANE: bilans = 0
        """
        records = [
            make_spend(10, from_earn=0, overdraft=10),
            make_purchase(10, approved=True),
        ]
        self.assertEqual(compute_balance(records, NOW), 0)

    def test_stary_purchase_bez_pola_approved_liczy_sie(self):
        """
        SPRAWDZAM: kompatybilność wsteczna — stary rekord purchase bez pola 'approved'
        traktowany jak approved=True (redukuje overdraft).
        """
        purchase_legacy = {"type": "purchase", "amount": 5}
        spend = make_spend(5, from_earn=0, overdraft=5)
        self.assertEqual(compute_balance([spend, purchase_legacy], NOW), 0, "Stary rekord purchase bez pola approved musi redukować overdraft")

    def test_mix_refunded_i_aktywnych_spend(self):
        """
        SPRAWDZAM: Mix anulowanych i aktywnych spend — tylko aktywne obciążają bilans.
        WEJŚCIE:
          earn(20h approved)
          spend(8h, refunded=True)   ← anulowana rezerwacja
          spend(5h, refunded=False)  ← aktywna rezerwacja
        OCZEKIWANE: bilans = 20 - 0 (pominięte) - 0 (overdraft=0 w obu) = 20
        Ale spend aktywny zużył earn.remaining → remaining=15
        Symulujemy przez earn.remaining=12 (20-8 zużyte aktywnym)
        """
        records = [
            make_earn(20, _dt(2025, 1, 1), approved=True, remaining=15),
            make_spend(5, from_earn=5, overdraft=0, refunded=False),
            make_spend(8, from_earn=8, overdraft=0, refunded=True),
        ]
        self.assertEqual(compute_balance(records, NOW), 15)

    def test_mix_approved_i_pending_purchase(self):
        """
        SPRAWDZAM: Mix zatwierdzonych i oczekujących purchase.
        WEJŚCIE: spend(20h overdraft=20) + purchase(10h approved) + purchase(10h pending)
        OCZEKIWANE: bilans = 0 - 20 + 10 (zatwierdzony) + 0 (pending) = -10
        """
        records = [
            make_spend(20, from_earn=0, overdraft=20),
            make_purchase(10, approved=True),
            make_purchase(10, approved=False),
        ]
        self.assertEqual(compute_balance(records, NOW), -10)


class TestKorekcjaRezerwacji(VerboseBusinessTestCase):
    """
    Testy logiki korekty i anulowania rezerwacji.
    Pokrywają BUG #1: skrócenie rezerwacji + późniejsze anulowanie.
    """

    def _simulate_credit_adjustment(self, records, amount, granted_at, expiry_years=EXPIRY_YEARS):
        """
        Symuluje creditReservationAdjustment — tworzy earn z sourceType='adjustment'.
        Odpowiada funkcji creditReservationAdjustment w godzinki_service.ts.
        """
        records = list(records)
        expires_at = granted_at.replace(year=granted_at.year + expiry_years)
        adjustment = {
            "type": "earn",
            "amount": amount,
            "remaining": amount,
            "granted_at": granted_at,
            "expires_at": expires_at,
            "approved": True,
            "source_type": "adjustment",
        }
        records.append(adjustment)
        _debug_line("SYMULACJA CREDIT ADJUSTMENT")
        _debug_dump("DODANY RECORD", adjustment)
        return records

    def _simulate_refund_with_adjustment_revocation(self, records, reservation_earn_deductions, overdraft=0):
        """
        Symuluje refundHoursForReservation z poprawką BUG #1:
        - Przywraca earn.remaining dla FIFO pul
        - Zeruje earn records z source_type='adjustment' (korekty tej rezerwacji)
        - Tworzy nowy earn dla overdraft (jeśli był)
        """
        _debug_line("SYMULACJA REFUND Z REVOKE ADJUSTMENT")
        _debug_dump("WEJŚCIE.records", records)
        _debug_dump("WEJŚCIE.reservation_earn_deductions", reservation_earn_deductions)
        _debug_dump("WEJŚCIE.overdraft", overdraft)

        records = deepcopy(records)

        for earn_idx, restore_amount in reservation_earn_deductions:
            records[earn_idx]["remaining"] += restore_amount

        for r in records:
            if r.get("type") == "earn" and r.get("source_type") == "adjustment":
                r["remaining"] = 0

        if overdraft > 0:
            records.append(make_earn(overdraft, NOW, approved=True))

        _debug_dump("WYJŚCIE.records", records)
        return records

    def test_skrocenie_i_anulowanie_bilans_prawidlowy(self):
        """
        SPRAWDZAM: Scenariusz który był BUG #1 przed poprawką.

        SCENARIUSZ:
          B = bilans startowy = 20h
          1. create reservation (10h): spend(10h), bilans = 10h
          2. update shorter (delta=-5): credit adjustment earn(5h), bilans = 15h
          3. cancel: refund spend(10h) + zero adjustment earn(5h) → bilans = 20h

        BŁĄD PRZED POPRAWKĄ: anulowanie zwracało 10h bez zerowania adjustment 5h
          → bilans = 15h + 10h = 25h (zysk 5h z niczego!)

        OCZEKIWANE PO POPRAWCE: bilans = 20h (powrót do punktu startowego)
        """
        records = [make_earn(20, _dt(2024, 1, 1), approved=True)]
        self.assertEqual(compute_balance(records, NOW), 20)

        ok, _, _, records, spend = deduct_hours(records, 10, VARS, NOW)
        self.assertTrue(ok)
        self.assertEqual(compute_balance(records, NOW), 10, "Po rezerwacji: bilans = 20 - 10 = 10h")

        records = self._simulate_credit_adjustment(records, 5, NOW)
        self.assertEqual(compute_balance(records, NOW), 15, "Po skróceniu: bilans = 10 + 5 = 15h")

        earn_idx = next(i for i, r in enumerate(records) if r["type"] == "earn" and r.get("source_type") != "adjustment")
        records = self._simulate_refund_with_adjustment_revocation(
            records,
            reservation_earn_deductions=[(earn_idx, 10)],
            overdraft=0,
        )
        final_balance = compute_balance(records, NOW)
        self.assertEqual(final_balance, 20, f"Po anulowaniu z poprawką: bilans musi wrócić do 20h, jest {final_balance}h")

    def test_skrocenie_bez_anulowania_bilans_prawidlowy(self):
        """
        SPRAWDZAM: Skrócenie rezerwacji BEZ anulowania działa poprawnie.
        earn adjustment zmniejsza koszt rezerwacji o delta.

        WEJŚCIE: bilans=20h, rezerwacja 10h, skrócenie do 5h (delta=-5)
        OCZEKIWANE: bilans = 20 - 10 + 5 = 15h
        """
        records = [make_earn(20, _dt(2024, 1, 1), approved=True)]
        ok, _, _, records, _ = deduct_hours(records, 10, VARS, NOW)
        self.assertTrue(ok)
        records = self._simulate_credit_adjustment(records, 5, NOW)
        self.assertEqual(compute_balance(records, NOW), 15)

    def test_wydluzenie_i_anulowanie_bilans_prawidlowy(self):
        """
        SPRAWDZAM: Wydłużenie rezerwacji (delta>0) + anulowanie zwraca pełny koszt.

        SCENARIUSZ:
          bilans=20h → rezerwacja(10h) → bilans=10h
          → wydłużenie(delta=+5) → dodatkowy spend(5h) → bilans=5h
          → anulowanie → zwrot obu spend: +10h + +5h = bilans=20h

        Przy wydłużeniu tworzy się DRUGI spend record (reservationId=ten sam).
        Refund szuka wszystkich spend dla reservationId — czyli zwróci oba.
        """
        records = [make_earn(20, _dt(2024, 1, 1), approved=True)]
        ok, _, _, records, _ = deduct_hours(records, 10, VARS, NOW)
        self.assertTrue(ok)
        self.assertEqual(compute_balance(records, NOW), 10)

        ok2, _, _, records, _ = deduct_hours(records, 5, VARS, NOW)
        self.assertTrue(ok2)
        self.assertEqual(compute_balance(records, NOW), 5, "Po wydłużeniu: bilans = 10 - 5 = 5h")

        records_refunded = deepcopy(records)
        earn_rec = next(r for r in records_refunded if r["type"] == "earn")
        earn_rec["remaining"] = 20
        for r in records_refunded:
            if r["type"] == "spend":
                r["refunded"] = True

        _debug_line("SYMULACJA ANULOWANIA WYDŁUŻONEJ REZERWACJI")
        _debug_dump("RECORDS PO REFUND", records_refunded)

        self.assertEqual(compute_balance(records_refunded, NOW), 20, "Po anulowaniu wydłużonej rezerwacji bilans musi wrócić do 20h")

    def test_wielokrotne_skrocenia_i_anulowanie(self):
        """
        SPRAWDZAM: Dwa skrócenia + anulowanie — WSZYSTKIE adjustment earn zerowane.

        SCENARIUSZ:
          bilans=20h
          → rezerwacja(10h) → bilans=10h
          → skrócenie1(delta=-2) → adjustment earn(2h) → bilans=12h
          → skrócenie2(delta=-3) → adjustment earn(3h) → bilans=15h
          → anulowanie → zwrot spend(10h) + zero 2h + zero 3h → bilans=20h
        """
        records = [make_earn(20, _dt(2024, 1, 1), approved=True)]
        ok, _, _, records, _ = deduct_hours(records, 10, VARS, NOW)
        self.assertTrue(ok)

        records = self._simulate_credit_adjustment(records, 2, NOW)
        records = self._simulate_credit_adjustment(records, 3, NOW)
        self.assertEqual(compute_balance(records, NOW), 15, "Po dwóch skróceniach: bilans = 10 + 2 + 3 = 15h")

        earn_idx = next(i for i, r in enumerate(records) if r["type"] == "earn" and r.get("source_type") != "adjustment")
        records = self._simulate_refund_with_adjustment_revocation(
            records,
            reservation_earn_deductions=[(earn_idx, 10)],
            overdraft=0,
        )
        self.assertEqual(compute_balance(records, NOW), 20, "Po anulowaniu: bilans musi wrócić do 20h")


class TestWyswietlanieHistorii(VerboseBusinessTestCase):
    """Testy poprawności danych do wyświetlenia historii."""

    def test_historia_zawiera_wszystkie_typy_rekordow(self):
        """
        OCZEKIWANE: Historia użytkownika zawiera rekordy earn, spend i purchase.
        Każdy rekord jest widoczny (niezależnie od approved — historia pełna).
        """
        records = [
            make_earn(10, _dt(2025, 1, 1), approved=True),
            make_earn(5, _dt(2025, 6, 1), approved=False),
            make_spend(3, from_earn=3, overdraft=0),
            make_purchase(2),
        ]

        earn_count = sum(1 for r in records if r["type"] == "earn")
        spend_count = sum(1 for r in records if r["type"] == "spend")
        purchase_count = sum(1 for r in records if r["type"] == "purchase")

        self.assertEqual(earn_count, 2)
        self.assertEqual(spend_count, 1)
        self.assertEqual(purchase_count, 1)

    def test_nastepne_wygasniecie_format_mm_rrrr(self):
        """
        OCZEKIWANE: Funkcja compute_next_expiry zwraca datę, którą UI formatuje jako MM-RRRR.
        Np. 2028-06-01 → '06-2028'.
        """
        records = [make_earn(10, _dt(2024, 6, 1), approved=True)]
        next_exp = compute_next_expiry(records, NOW)

        self.assertIsNotNone(next_exp)
        formatted = f"{next_exp.month:02d}-{next_exp.year}"
        self.assertEqual(formatted, "06-2028")

    def test_bilans_i_ostatnie_rekordy_na_dashboard(self):
        """
        OCZEKIWANE: Dashboard pokazuje bieżące saldo + ostatnie godzinki.
        Niezatwierdzone NIE wchodzą do salda, ale są widoczne w historii (jako "oczekuje").
        """
        records = [
            make_earn(10, _dt(2025, 1, 1), approved=True),
            make_earn(20, _dt(2026, 1, 1), approved=False),
        ]

        balance = compute_balance(records, NOW)
        self.assertEqual(balance, 10, "Saldo = 10h (zatwierdzone), nie 30h (z niezatwierdzonym)")

        all_earn = [r for r in records if r["type"] == "earn"]
        self.assertEqual(len(all_earn), 2)

        pending = [r for r in all_earn if not r.get("approved")]
        self.assertEqual(len(pending), 1)


class TestStorageMiesieczna(VerboseBusinessTestCase):
    """
    Testy logiki naliczania miesięcznej opłaty za prywatne kajaki (gear.chargePrivateStorage).
    Pokrywają:
      - firstChargeableMonth / isChargeableThisMonth (mirrors gearPrivateStorage.ts)
      - Integrację z deduct_hours: naliczenie odlicza godzinki, niedobór schodzi na minus
    """

    def _first_chargeable_month(self, private_since_iso):
        """Mirrors firstChargeableMonth() — zwraca 'YYYY-MM' pierwszego naliczalnego miesiąca."""
        import re
        if not private_since_iso or not re.match(r"^\d{4}-\d{2}-\d{2}", private_since_iso):
            _debug_dump("first_chargeable_month.INVALID_INPUT", {"private_since_iso": private_since_iso, "result": None})
            return None
        try:
            d = datetime.strptime(private_since_iso[:10], "%Y-%m-%d")
        except ValueError:
            _debug_dump("first_chargeable_month.INVALID_DATE", {"private_since_iso": private_since_iso, "result": None})
            return None
        if d.month == 12:
            nxt = datetime(d.year + 1, 1, 1)
        else:
            nxt = datetime(d.year, d.month + 1, 1)
        result = f"{nxt.year}-{nxt.month:02d}"
        _debug_dump("first_chargeable_month.RESULT", {"private_since_iso": private_since_iso, "result": result})
        return result

    def _is_chargeable_this_month(self, private_since_iso, current_month):
        """Mirrors isChargeableThisMonth() — true jeśli current_month >= firstChargeableMonth."""
        first = self._first_chargeable_month(private_since_iso)
        result = bool(first and current_month >= first)
        _debug_dump("is_chargeable_this_month.RESULT", {
            "private_since_iso": private_since_iso,
            "current_month": current_month,
            "first_chargeable_month": first,
            "result": result,
        })
        return result

    def test_wejscie_drugiego_marca_pierwszy_miesiąc_kwiecień(self):
        """Kajak wszedł 02.03 → marzec niepełny → pierwszy naliczany = kwiecień."""
        self.assertEqual(self._first_chargeable_month("2025-03-02"), "2025-04")

    def test_wejscie_pierwszego_marca_pierwszy_miesiąc_kwiecień(self):
        """Kajak wszedł 01.03 → marzec też niepełny (wchodzi w miesiąc, nie go wyprzedza) → kwiecień."""
        self.assertEqual(self._first_chargeable_month("2025-03-01"), "2025-04")

    def test_wejscie_ostatniego_marca_pierwszy_miesiąc_kwiecień(self):
        """Kajak wszedł 31.03 → marzec niepełny → kwiecień."""
        self.assertEqual(self._first_chargeable_month("2025-03-31"), "2025-04")

    def test_wejscie_w_grudniu_pierwszy_miesiąc_styczeń_następnego_roku(self):
        """Grudzień → rollover roku → następny miesiąc = styczeń następnego roku."""
        self.assertEqual(self._first_chargeable_month("2025-12-15"), "2026-01")

    def test_brak_daty_brak_naliczenia(self):
        """Brak daty wejścia → firstChargeableMonth zwraca None → nie naliczamy."""
        self.assertIsNone(self._first_chargeable_month(""))
        self.assertIsNone(self._first_chargeable_month(None))
        self.assertIsNone(self._first_chargeable_month("nie-data"))

    def test_scheduler_01_04_dla_kajaka_z_02_03_nalicza(self):
        """Scheduler działa 01.04 — kajak wszedł 02.03 — naliczamy (2025-04 >= 2025-04)."""
        self.assertTrue(self._is_chargeable_this_month("2025-03-02", "2025-04"))

    def test_scheduler_01_03_dla_kajaka_z_02_03_nie_nalicza(self):
        """Scheduler działa 01.03 — kajak wszedł 02.03 tego samego miesiąca — nie naliczamy."""
        self.assertFalse(self._is_chargeable_this_month("2025-03-02", "2025-03"))

    def test_scheduler_przed_wejsciem_nie_nalicza(self):
        """Bieżący miesiąc jest PRZED miesiącem wejścia — nie naliczamy."""
        self.assertFalse(self._is_chargeable_this_month("2025-05-01", "2025-04"))

    def test_scheduler_wiele_miesiecy_po_wejsciu_nalicza(self):
        """Wiele miesięcy po wejściu — naliczamy (lata później)."""
        self.assertTrue(self._is_chargeable_this_month("2024-01-15", "2026-04"))

    def test_pierwszy_naliczany_miesiac_dokladnie(self):
        """Bieżący miesiąc == firstChargeableMonth → granica — naliczamy."""
        first = self._first_chargeable_month("2025-06-10")
        self.assertEqual(first, "2025-07")
        self.assertTrue(self._is_chargeable_this_month("2025-06-10", "2025-07"))

    def test_oplata_storage_odlicza_godzinki(self):
        """
        SPRAWDZAM: Naliczenie opłaty magazynowej odlicza godzinki z puli.
        WEJŚCIE: bilans=30h, koszt=5h/miesiąc
        OCZEKIWANE: bilans = 25h, overdraft=0
        """
        records = [make_earn(30, _dt(2025, 1, 1), approved=True)]
        cost = 5
        ok, _, _, records, spend = deduct_hours(records, cost, VARS, NOW)
        self.assertTrue(ok, "Dedukcja opłaty storage musi się udać")
        self.assertEqual(spend.get("overdraft", 0), 0, "Brak overdraft przy wystarczającym saldzie")
        self.assertEqual(compute_balance(records, NOW), 25, "Po naliczeniu: bilans = 30 - 5 = 25h")

    def test_oplata_storage_przy_niewystarczajacym_saldzie_schodzi_na_minus(self):
        """
        SPRAWDZAM: Gdy saldo < koszt, opłata nadal zostaje pobrana — tworzy overdraft.
        WEJŚCIE: bilans=2h, koszt=5h
        OCZEKIWANE: bilans = -3h (overdraft=3h)
        """
        records = [make_earn(2, _dt(2025, 1, 1), approved=True)]
        cost = 5
        ok, _, _, records, spend = deduct_hours(records, cost, VARS, NOW)
        self.assertTrue(ok, "Dedukcja w overdraft musi się udać (system nie blokuje przy storage)")
        self.assertEqual(spend.get("overdraft", 0), 3, "Overdraft = 5 - 2 = 3h")
        self.assertEqual(compute_balance(records, NOW), -3, "Bilans ujemny = -3h po naliczeniu ponad saldo")

    def test_oplata_storage_blokada_przy_przekroczeniu_limitu(self):
        """
        SPRAWDZAM: Gdy limit overdraft przekroczony (overdraft >= max_overdraft), dedukcja nie przechodzi.
        WEJŚCIE: bilans=-100h (overdraft=100), koszt=5h, VARS.max_overdraft=50
        OCZEKIWANE: deduct_hours zwraca ok=False
        """
        vars_low_limit = dict(VARS)
        vars_low_limit["max_overdraft"] = 50
        records = [make_spend(100, from_earn=0, overdraft=100)]
        cost = 5
        ok, code, _, _, _ = deduct_hours(records, cost, vars_low_limit, NOW)
        self.assertFalse(ok, "Przekroczenie limitu overdraft musi blokować naliczenie")
        self.assertEqual(code, "negative_limit_exceeded", "Kod błędu musi być negative_limit_exceeded przy przekroczeniu limitu")


if __name__ == "__main__":
    unittest.main(verbosity=2)