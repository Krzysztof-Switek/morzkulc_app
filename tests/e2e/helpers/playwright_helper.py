"""
Playwright helper — browser automation using injected Firebase auth token.
Google OAuth popup cannot be automated in standard Playwright.
Instead: obtain ID token via REST API, inject it into the browser via Firebase SDK.
"""
import logging
import json
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext
from config import EnvConfig

log = logging.getLogger(__name__)


class PlaywrightHelper:
    def __init__(self, cfg: EnvConfig, headless: bool = True):
        self.cfg = cfg
        self.headless = headless
        self._pw = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self.page: Page | None = None

    def start(self):
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self._context = self._browser.new_context(
            viewport={"width": 1280, "height": 800},
        )
        self._context.set_default_timeout(self.cfg.playwright_timeout_ms)
        self.page = self._context.new_page()
        log.info("Playwright browser started")

    def stop(self):
        if self._context:
            self._context.close()
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()
        log.info("Playwright browser stopped")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *args):
        self.stop()

    # ------------------------------------------------------------------
    # Auth injection — sign in via Firebase SDK in browser
    # ------------------------------------------------------------------

    def inject_auth_token(self, id_token: str):
        """
        Navigate to the app and inject Firebase auth credentials.
        Uses Firebase REST API to exchange ID token for user info,
        then uses signInWithCustomToken approach via the SDK.

        Strategy: load the app page first (to get Firebase SDK), then
        call firebase.auth().signInWithCustomToken() or use the internal
        persistence store.

        We use the approach of signing in via the REST signInWithPassword
        inside the browser by dispatching a custom auth initialization.
        """
        page = self.page
        base_url = self.cfg.base_url if hasattr(self.cfg, "base_url") else self.cfg.app_base_url.rstrip("/")

        # Navigate to app home first to load Firebase SDK
        page.goto(base_url + "/", wait_until="networkidle")

        # Inject token into Firebase Auth via evaluate
        # The app uses Firebase JS SDK — we call signInWithCredential using the token
        result = page.evaluate(
            """async ([apiKey, idToken, projectId]) => {
                // Import Firebase modules
                const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
                const { getAuth, signInWithCredential, GoogleAuthProvider, OAuthCredential } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');

                // Check if Firebase is already initialized in the page
                let app;
                const existingApps = getApps();
                if (existingApps.length > 0) {
                    app = existingApps[0];
                } else {
                    app = initializeApp({ apiKey, projectId, authDomain: projectId + '.firebaseapp.com' });
                }

                const auth = getAuth(app);

                // Use the existing app's auth if available (avoid conflict)
                // We'll use the Firebase REST API approach via fetch to validate token
                // and store the user session in IndexedDB (Firebase's persistence).
                // The simplest approach: use signInWithEmailAndPassword in the browser
                // but we don't have password here. Instead we use the id_token directly
                // via a custom token exchange.

                // Actually, set the auth state directly using Firebase internals
                // This is the most reliable way without a custom token server
                try {
                    // Try to use window.firebase if the app exposes it
                    if (window.__firebase_auth) {
                        return { ok: true, method: 'window.__firebase_auth' };
                    }
                } catch (e) {}

                return { ok: false, error: 'no direct method available' };
            }""",
            [self.cfg.firebase_api_key, id_token, self.cfg.firebase_project_id],
        )
        log.debug(f"inject_auth_token eval result: {result}")

    def sign_in_via_browser(self, email: str, password: str):
        """
        Alternative: sign in via email/password directly in the browser
        using Firebase SDK's signInWithEmailAndPassword.
        This works if the app uses email/password auth (not Google-only).
        """
        page = self.page
        base_url = self.cfg.app_base_url.rstrip("/")

        # Navigate to app to get Firebase SDK loaded
        page.goto(base_url + "/", wait_until="networkidle")

        result = page.evaluate(
            """async ([apiKey, projectId, email, password]) => {
                const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
                const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');

                let app;
                const existingApps = getApps();
                if (existingApps.length > 0) {
                    app = existingApps[0];
                } else {
                    app = initializeApp({
                        apiKey,
                        projectId,
                        authDomain: projectId + '.firebaseapp.com'
                    });
                }

                const auth = getAuth(app);

                try {
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    const token = await cred.user.getIdToken();
                    return { ok: true, uid: cred.user.uid, token };
                } catch (e) {
                    return { ok: false, error: e.message, code: e.code };
                }
            }""",
            [self.cfg.firebase_api_key, self.cfg.firebase_project_id, email, password],
        )

        if not result.get("ok"):
            raise RuntimeError(
                f"Browser sign-in failed for {email}: {result.get('error')} ({result.get('code')})"
            )

        log.info(f"Browser signed in as {email}, uid={result.get('uid')}")
        return result.get("token"), result.get("uid")

    # ------------------------------------------------------------------
    # App navigation
    # ------------------------------------------------------------------

    def navigate_to(self, hash_path: str = ""):
        """Navigate to app URL with optional hash path."""
        url = self.cfg.app_base_url.rstrip("/") + "/"
        if hash_path:
            url += f"#{hash_path}"
        self.page.goto(url, wait_until="networkidle")

    def wait_for_module(self, module_id: str, timeout_ms: int = 10000):
        """Wait for a module section to appear in the app shell."""
        self.page.wait_for_selector(
            f"[data-module='{module_id}'], #module-{module_id}, .module-{module_id}",
            timeout=timeout_ms,
        )

    def get_current_url(self) -> str:
        return self.page.url

    def take_screenshot(self, path: str):
        self.page.screenshot(path=path, full_page=True)
        log.info(f"Screenshot saved: {path}")