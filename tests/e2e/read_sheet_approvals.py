"""
READ-ONLY: stan kolumn zatwierdzenia w zakładkach godzinki/imprezy.
Porównanie z pending w Firestore (diagnoza: powiadomienia panelu nie znikają).

Uruchamianie (z tests/e2e/): ENV=prod python read_sheet_approvals.py
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_HERE, ".env.test"))
except ImportError:
    pass

from config import ACTIVE as cfg
from helpers.sheets_helper import SheetsHelper

PENDING_GODZINKI_IDS = {
    "snuw8ea4wwQnBRqdPfFU", "RDZbiy0lOjJ0vcQ1RQic", "QZqUO5WSP2IKHAQyAtvZ",
    "MLvuBG81arXtaYS0BuTe", "tgHgief8f8lTBSvDiOhl",
}
PENDING_EVENT_IDS = {"sT6K5wwkbhzoLdIXmGkZ", "T9KqWeuaXux5uwBqzg70", "Pbq0PvERSTqA3K64kQUy"}


def dump_tab(sheets, tab, id_set, approval_cols):
    print(f"\n=== zakładka '{tab}' ===")
    rows = sheets.get_all_records(tab)
    print(f"wierszy z danymi: {len(rows)}")
    headers = list(rows[0].keys()) if rows else []
    print(f"nagłówki: {headers}")
    found = set()
    for i, row in enumerate(rows, start=2):
        rid = str(row.get("ID", "")).strip()
        if rid in id_set:
            found.add(rid)
            cols = {c: row.get(c) for c in approval_cols if c in row}
            print(f"  wiersz ~{i}: ID={rid[:12]}… {cols}")
    missing = id_set - found
    if missing:
        print(f"  BRAK W ARKUSZU (pending w Firestore bez wiersza!): {sorted(missing)}")


if __name__ == "__main__":
    sheets = SheetsHelper(cfg)
    dump_tab(sheets, "godzinki", PENDING_GODZINKI_IDS,
             ["Godzinki", "Zatwierdzone", "Zsynchronizowano", "Data zatwierdzenia"])
    dump_tab(sheets, "imprezy", PENDING_EVENT_IDS,
             ["nazwa imprezy", "Zatwierdzona", "zsynchronizowano", "Zsynchronizowano"])
