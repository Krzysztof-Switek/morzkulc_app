"""
READ-ONLY: nagłówki wszystkich zakładek arkusza członków (inwentaryzacja
rozjazdów kod <-> arkusz). ENV=prod python read_sheet_headers.py
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

if __name__ == "__main__":
    sheets = SheetsHelper(cfg)
    for ws in sheets._sheet.worksheets():
        headers = ws.row_values(1)
        print(f"\n=== '{ws.title}' (wierszy: {ws.row_count}, z danymi wg API: ?) ===")
        print("nagłówki:", [repr(h) for h in headers])
