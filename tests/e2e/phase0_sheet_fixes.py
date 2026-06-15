"""
FAZA 0 (plan: Audyty/12.06_panel_zarzadu_problemy_i_plan_wdrozenia.md)
Porządki arkusza członków (prod), pkt 0.1/0.2/0.5/0.6:
  0.1 imprezy: nagłówki -> 'link do strony / zgłoszeń', 'ranking?', 'kursowa?', 'kontakt'
  0.2 godzinki: dodanie kolumny 'Data zatwierdzenia'
  0.5 godzinki: usunięcie wiersza duplikatu (ID MLvuBG81arXtaYS0BuTe)
  0.6 imprezy: usunięcie pustych wierszy zajętych artefaktami checkboxów (FALSE/FAŁSZ)

Domyślnie DRY-RUN. Wykonanie: ENV=prod python phase0_sheet_fixes.py --execute
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

EXECUTE = "--execute" in sys.argv

HEADER_RENAMES_IMPREZY = {
    "link do strony zgłoszeń": "link do strony / zgłoszeń",
    "Ranking?": "ranking?",
    "Kursowa?": "kursowa?",
    "kontakt ": "kontakt",
}
GODZINKI_NEW_COLUMN = "Data zatwierdzenia"
GODZINKI_DUPLICATE_ID = "MLvuBG81arXtaYS0BuTe"
CHECKBOX_TOKENS = {"", "false", "fałsz", "FALSE", "FAŁSZ"}


def fix_imprezy_headers(ws):
    headers = ws.row_values(1)
    for i, h in enumerate(headers, start=1):
        if h in HEADER_RENAMES_IMPREZY:
            new = HEADER_RENAMES_IMPREZY[h]
            print(f"0.1 imprezy: nagłówek kol.{i} {h!r} -> {new!r}")
            if EXECUTE:
                ws.update_cell(1, i, new)


def add_godzinki_column(ws):
    headers = ws.row_values(1)
    if GODZINKI_NEW_COLUMN in [h.strip() for h in headers]:
        print(f"0.2 godzinki: kolumna {GODZINKI_NEW_COLUMN!r} już istnieje — pomijam")
        return
    col = len(headers) + 1
    print(f"0.2 godzinki: dodaję nagłówek {GODZINKI_NEW_COLUMN!r} w kolumnie {col}")
    if EXECUTE:
        ws.update_cell(1, col, GODZINKI_NEW_COLUMN)


def delete_duplicate_godzinka(ws):
    cell = None
    try:
        cell = ws.find(GODZINKI_DUPLICATE_ID)
    except Exception:
        pass
    if not cell:
        print(f"0.5 godzinki: wiersz duplikatu {GODZINKI_DUPLICATE_ID} nie znaleziony — pomijam")
        return
    row_vals = ws.row_values(cell.row)
    safe = str(row_vals[:7]).encode("ascii", errors="replace").decode("ascii")
    print(f"0.5 godzinki: usuwam wiersz {cell.row} (duplikat): {safe}")
    if EXECUTE:
        ws.delete_rows(cell.row)


def clean_imprezy_artifact_rows(ws):
    values = ws.get_all_values()
    to_delete = []
    for idx in range(1, len(values)):  # od wiersza 2
        row = values[idx]
        if all(str(c).strip() in CHECKBOX_TOKENS for c in row):
            if any(str(c).strip() != "" for c in row):  # tylko artefakty, nie całkiem puste
                to_delete.append(idx + 1)
    print(f"0.6 imprezy: wierszy z samymi artefaktami checkboxów: {len(to_delete)} -> {to_delete[:10]}{'...' if len(to_delete) > 10 else ''}")
    if EXECUTE and to_delete:
        # od dołu, żeby numery nie przesuwały się w trakcie
        for r in sorted(to_delete, reverse=True):
            ws.delete_rows(r)
        print(f"0.6 imprezy: usunięto {len(to_delete)} wierszy")


if __name__ == "__main__":
    print("=== TRYB WYKONANIA ===" if EXECUTE else "=== DRY-RUN (dodaj --execute aby wykonać) ===")
    sheets = SheetsHelper(cfg)
    imprezy = sheets._get_worksheet("imprezy")
    godzinki = sheets._get_worksheet("godzinki")

    fix_imprezy_headers(imprezy)
    add_godzinki_column(godzinki)
    delete_duplicate_godzinka(godzinki)
    clean_imprezy_artifact_rows(imprezy)

    print("Gotowe." + ("" if EXECUTE else " (nic nie zapisano — dry-run)"))
