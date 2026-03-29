"""
Testy PWA — SKK Morzkulc
========================
Zestaw testów automatycznych (sprawdzają pliki i strukturę projektu)
oraz ręczna checklista testowa do weryfikacji na urządzeniu.

Uruchamianie:
    python tests/test_pwa.py

Wynik: każdy test drukuje OK / FAIL + opis.
"""
import os
import json
import struct
import unittest

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC  = os.path.join(PROJECT, "public")


def read(rel: str) -> str:
    with open(os.path.join(PUBLIC, rel), encoding="utf-8") as f:
        return f.read()


def exists(rel: str) -> bool:
    return os.path.isfile(os.path.join(PUBLIC, rel))


def png_dimensions(rel: str) -> tuple[int, int]:
    with open(os.path.join(PUBLIC, rel), "rb") as f:
        f.read(8)           # PNG signature
        f.read(4)           # IHDR length
        f.read(4)           # "IHDR"
        w = struct.unpack(">I", f.read(4))[0]
        h = struct.unpack(">I", f.read(4))[0]
    return w, h


# ─────────────────────────────────────────────────────────────────────────────
#  Testy automatyczne
# ─────────────────────────────────────────────────────────────────────────────

class TestPWAFiles(unittest.TestCase):
    """Sprawdza obecność wymaganych plików PWA."""

    def test_manifest_exists(self):
        """manifest.json musi istnieć."""
        self.assertTrue(exists("manifest.json"), "Brak public/manifest.json")

    def test_sw_exists(self):
        """sw.js musi istnieć."""
        self.assertTrue(exists("sw.js"), "Brak public/sw.js")

    def test_icon_192_exists(self):
        """Ikona 192x192 musi istnieć."""
        self.assertTrue(exists("icons/icon-192.png"))

    def test_icon_512_exists(self):
        """Ikona 512x512 musi istnieć."""
        self.assertTrue(exists("icons/icon-512.png"))

    def test_icon_180_exists(self):
        """Ikona apple-touch-icon 180x180 musi istnieć."""
        self.assertTrue(exists("icons/icon-180.png"))


class TestPNGDimensions(unittest.TestCase):
    """Sprawdza rozmiary PNG icon."""

    def test_icon_192_size(self):
        self.assertEqual(png_dimensions("icons/icon-192.png"), (192, 192))

    def test_icon_512_size(self):
        self.assertEqual(png_dimensions("icons/icon-512.png"), (512, 512))

    def test_icon_180_size(self):
        self.assertEqual(png_dimensions("icons/icon-180.png"), (180, 180))


class TestManifest(unittest.TestCase):
    """Sprawdza zawartość manifest.json."""

    def setUp(self):
        self.manifest = json.loads(read("manifest.json"))

    def test_name(self):
        self.assertIn("name", self.manifest)
        self.assertIn("Morzkulc", self.manifest["name"])

    def test_short_name(self):
        self.assertIn("short_name", self.manifest)
        self.assertLessEqual(len(self.manifest["short_name"]), 12,
                             "short_name powinien miec max 12 znakow dla Android")

    def test_start_url(self):
        self.assertEqual(self.manifest.get("start_url"), "/")

    def test_display_standalone(self):
        self.assertEqual(self.manifest.get("display"), "standalone")

    def test_background_color(self):
        self.assertIn("background_color", self.manifest)

    def test_theme_color(self):
        self.assertIn("theme_color", self.manifest)

    def test_icons_count(self):
        icons = self.manifest.get("icons", [])
        self.assertGreaterEqual(len(icons), 2, "Manifest musi miec min. 2 ikony")

    def test_icons_have_192(self):
        icons = self.manifest.get("icons", [])
        sizes = [i.get("sizes", "") for i in icons]
        self.assertIn("192x192", sizes)

    def test_icons_have_512(self):
        icons = self.manifest.get("icons", [])
        sizes = [i.get("sizes", "") for i in icons]
        self.assertIn("512x512", sizes)


class TestIndexHtml(unittest.TestCase):
    """Sprawdza meta tagi PWA w index.html."""

    def setUp(self):
        self.html = read("index.html")

    def test_manifest_link(self):
        self.assertIn('rel="manifest"', self.html)
        self.assertIn('href="/manifest.json"', self.html)

    def test_theme_color(self):
        self.assertIn('name="theme-color"', self.html)

    def test_apple_touch_icon(self):
        self.assertIn('rel="apple-touch-icon"', self.html)

    def test_apple_mobile_web_app_capable(self):
        self.assertIn('apple-mobile-web-app-capable', self.html)

    def test_apple_mobile_web_app_title(self):
        self.assertIn('apple-mobile-web-app-title', self.html)

    def test_favicon_32(self):
        self.assertIn('icon-32.png', self.html)

    def test_viewport(self):
        self.assertIn('name="viewport"', self.html)


class TestAppShell(unittest.TestCase):
    """Sprawdza kod app_shell.js — rejestracja SW i poprawka buga spinnera."""

    def setUp(self):
        self.js = read("core/app_shell.js")

    def test_sw_registration_present(self):
        """app_shell.js musi rejestrować service worker."""
        self.assertIn("serviceWorker.register", self.js)

    def test_sw_path_correct(self):
        """Ścieżka SW musi być /sw.js."""
        self.assertIn('"/sw.js"', self.js)

    def test_hang_bug_fixed(self):
        """Catch block musi czyścić spinner — viewEl.innerHTML w catch."""
        # Szukamy viewEl.innerHTML = ... wewnątrz bloku catch
        catch_idx = self.js.rfind("} catch (e) {")
        self.assertGreater(catch_idx, 0, "Brak bloku catch w app_shell.js")
        catch_block = self.js[catch_idx:]
        self.assertIn("viewEl.innerHTML", catch_block,
                      "Bug: spinner nie jest czyszczony w catch — aplikacja zawisnie")

    def test_retry_button_in_error(self):
        """Ekran błędu musi miec przycisk do odświeżenia strony."""
        self.assertIn("startupRetryBtn", self.js)


class TestServiceWorker(unittest.TestCase):
    """Sprawdza kluczowe właściwości sw.js."""

    def setUp(self):
        self.sw = read("sw.js")

    def test_cache_version_defined(self):
        self.assertIn("CACHE_VERSION", self.sw)

    def test_install_event(self):
        self.assertIn("install", self.sw)

    def test_activate_event(self):
        self.assertIn("activate", self.sw)

    def test_fetch_event(self):
        self.assertIn("fetch", self.sw)

    def test_api_never_cached(self):
        """/api/ musi byc wykluczone z cache."""
        self.assertIn('"/api/"', self.sw)

    def test_external_origins_bypass(self):
        """Zewnetrzne originy musza byc pomijane przez SW."""
        self.assertIn("self.location.origin", self.sw)

    def test_precache_index_html(self):
        self.assertIn('"/index.html"', self.sw)

    def test_skip_waiting(self):
        self.assertIn("skipWaiting", self.sw)

    def test_clients_claim(self):
        self.assertIn("clients.claim", self.sw)

    def test_old_cache_cleanup(self):
        """SW musi czyscic stare wersje cache w activate."""
        self.assertIn("caches.delete", self.sw)


class TestFirebaseJson(unittest.TestCase):
    """Sprawdza konfigurację Firebase Hosting dla PWA."""

    def setUp(self):
        with open(os.path.join(PROJECT, "firebase.json"), encoding="utf-8") as f:
            self.cfg = json.load(f)
        headers = self.cfg["hosting"]["headers"]
        self.headers_by_source = {h["source"]: h["headers"] for h in headers}

    def test_sw_no_cache(self):
        """sw.js musi miec Cache-Control: no-cache."""
        h = self.headers_by_source.get("/sw.js", [])
        cc = next((x["value"] for x in h if x["key"] == "Cache-Control"), "")
        self.assertIn("no-cache", cc, "sw.js nie ma no-cache — aktualizacje SW moga sie nie rozchodzic")

    def test_sw_allowed_header(self):
        """sw.js musi miec Service-Worker-Allowed: /."""
        h = self.headers_by_source.get("/sw.js", [])
        swa = next((x["value"] for x in h if x["key"] == "Service-Worker-Allowed"), None)
        self.assertEqual(swa, "/")

    def test_icons_long_cache(self):
        """Ikony moga byc cachowane dlugo."""
        h = self.headers_by_source.get("/icons/**", [])
        cc = next((x["value"] for x in h if x["key"] == "Cache-Control"), "")
        self.assertIn("max-age", cc, "Ikony powinny miec dlugi cache")

    def test_manifest_no_cache(self):
        """manifest.json musi byc serwowany bez cache (na wypadek zmiany ikon/nazwy)."""
        h = self.headers_by_source.get("/manifest.json", [])
        cc = next((x["value"] for x in h if x["key"] == "Cache-Control"), "")
        self.assertIn("no-cache", cc)


# ─────────────────────────────────────────────────────────────────────────────
#  Ręczna checklista testowa
# ─────────────────────────────────────────────────────────────────────────────
MANUAL_CHECKLIST = """
=============================================================
  RĘCZNA CHECKLISTA PWA — SKK Morzkulc
  Uruchom po deployu na staging/prod.
=============================================================

[INSTALACJA PWA]
  [ ]1. Otwórz aplikację na Android Chrome.
        Oczekiwany wynik: pojawia się baner „Dodaj do ekranu głównego"
        lub ikona instalacji w pasku adresu.

  [ ]2. Zainstaluj aplikację przez „Dodaj do ekranu głównego".
        Oczekiwany wynik: ikona Morzkulc pojawia się na ekranie głównym.

  [ ]3. Uruchom zainstalowaną aplikację z ekranu głównego.
        Oczekiwany wynik: aplikacja otwiera się bez paska URL i zakładek
        przeglądarki (tryb standalone). Tytuł w pasku systemowym to „Morzkulc".

  [ ]4. Sprawdź kolor paska stanu (status bar) na Androidzie.
        Oczekiwany wynik: ciemny (#0b0f17) pasujący do motywu aplikacji.

[iOS Safari]
  [ ]5. Otwórz na iPhone (Safari), użyj „Dodaj do ekranu startowego".
        Oczekiwany wynik: ikona aplikacji pojawia się bez ramki przeglądarki.

  [ ]6. Uruchom z ekranu startowego na iOS.
        Oczekiwany wynik: tryb fullscreen/standalone, bez Safari UI.

[MANIFEST I IKONY]
  [ ]7. W Chrome DevTools (Application > Manifest) sprawdź manifest.
        Oczekiwany wynik: brak błędów, wszystkie pola wypełnione,
        ikony widoczne i ładują się poprawnie.

  [ ]8. Sprawdź ikonę w zainstalowanej aplikacji.
        Oczekiwany wynik: ikona „M" na ciemnym tle, wyraźna na ekranie głównym.

[SERVICE WORKER]
  [ ]9. W Chrome DevTools (Application > Service Workers) sprawdź SW.
        Oczekiwany wynik: „sw.js" zarejestrowany i aktywny (Status: activated).

  [ ]10. Załaduj aplikację drugi raz (po zamknięciu karty).
         Oczekiwany wynik: aplikacja ładuje się szybciej (zasoby z cache).

[FLOW UŻYTKOWNIKA — NOWY UŻYTKOWNIK]
  [ ]11. Otwórz aplikację jako nowy użytkownik, który nigdy się nie logował.
         Oczekiwany wynik: widać przycisk „Zaloguj", NIE ma spinnera
         „Morzkulc myśli".

  [ ]12. Kliknij „Zaloguj" i zaloguj się przez Google.
         Oczekiwany wynik: pojawia się formularz rejestracji (imię, nazwisko,
         telefon, data urodzenia, zgody). Brak zawieszenia na spinnerze.

  [ ]13. Wypełnij formularz i kliknij „Zapisz profil".
         Oczekiwany wynik: strona przeładowuje się, pojawia się dashboard
         aplikacji. Spinner znika.

[FLOW UŻYTKOWNIKA — DEEP LINK]
  [ ]14. Poproś znajomego (nowy użytkownik, nigdy nie logował się) o otwarcie
         bezpośredniego linka, np. https://[domena]/#/modul_2/kayaks.
         Oczekiwany wynik: widać „Zaloguj", NIE ma spinnera. Po zalogowaniu
         widać formularz rejestracji. Po rejestracji — ekran sprzętu.

  [ ]15. Zalogowany użytkownik otwiera deep link do sprzętu.
         Oczekiwany wynik: spinner pojawia się krótko, a następnie ładuje się
         poprawnie ekran sprzętu. Brak zawieszenia.

[OBSŁUGA BŁĘDÓW I OFFLINE]
  [ ]16. Wyłącz internet (tryb samolotowy), otwórz aplikację z ekranu głównego.
         Oczekiwany wynik: jeśli zasoby są w cache -> aplikacja się uruchamia,
         pojawia się błąd „Nie można załadować aplikacji" z przyciskiem
         „Odśwież stronę". Brak wiecznego spinnera.

  [ ]17. Wyłącz internet, będąc zalogowanym, odśwież stronę.
         Oczekiwany wynik: aplikacja wyświetla stronę z cache, następnie
         wyświetla błąd połączenia (nie wisi na spinnerze).

  [ ]18. Włącz internet ponownie, kliknij „Odśwież stronę".
         Oczekiwany wynik: aplikacja ładuje się poprawnie.

  [ ]19. Sprawdź, że przy braku internetu NIE wyświetlają się stare
         dane rezerwacji ani dane użytkownika z cache (np. stary stan konta).
         Oczekiwany wynik: po nieudanym załadowaniu z sieci -> komunikat
         o błędzie, nie stare dane.

[BEZPIECZEŃSTWO CACHE]
  [ ]20. W DevTools (Application > Cache Storage) sprawdź cache „morzkulc-static-v1".
         Oczekiwany wynik: cache zawiera TYLKO statyczne pliki (JS, CSS, ikony,
         HTML). Brak żadnych odpowiedzi z /api/*.

  [ ]21. Wyloguj się, zaloguj jako inny użytkownik.
         Oczekiwany wynik: dashboard pokazuje dane NOWEGO użytkownika.
         Brak danych poprzedniego użytkownika.

[ROUTING I NAWIGACJA]
  [ ]22. Wejdź na https://[domena]/ (bez hasha).
         Oczekiwany wynik: aplikacja ładuje się na stronie startowej.

  [ ]23. Wejdź na https://[domena]/#/modul_2/kayaks jako zalogowany użytkownik.
         Oczekiwany wynik: ładuje się ekran z kajakami.

  [ ]24. Odśwież stronę (F5/pull-to-refresh) na ekranie sprzętu.
         Oczekiwany wynik: aplikacja ponownie ładuje się na ekranie sprzętu
         (hash zachowany).

=============================================================
"""

if __name__ == "__main__":
    print("=== Testy automatyczne PWA ===\n")
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    for cls in [TestPWAFiles, TestPNGDimensions, TestManifest,
                TestIndexHtml, TestAppShell, TestServiceWorker, TestFirebaseJson]:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print(MANUAL_CHECKLIST)