"""
PROJECT SNAPSHOT TOOL — MORZKULC APP

CEL
- Ten plik służy do przekazywania aktualnego stanu projektu bez zgadywania.
- Ma ograniczać halucynacje, błędne założenia i pracę "na pamięć".
- Ma być uruchamiany przed analizą, refaktorem, deployem i debugowaniem.

ZASADY PRACY
1. NEVER GUESS CODE STRUCTURE
   - Nigdy nie zakładaj struktury projektu bez sprawdzenia aktualnych plików.
   - Jeśli czegoś nie ma w snapshotcie lub plikach, nie wolno tego zakładać.

2. ALWAYS RELY ON ACTUAL FILES
   - Wszystkie decyzje mają wynikać z aktualnych plików.
   - Jeśli potrzebny jest szczegół, trzeba go odczytać z kodu.

3. SMALL STEPS ONLY
   - Jedna logiczna zmiana na raz.
   - Zmiana -> test -> weryfikacja -> kolejny krok.

4. SOURCE OF TRUTH
   - master = produkcja (PROD)
   - branch dev / testowy = środowisko developerskie (DEV)
   - Nie wolno mieszać eksperymentów DEV z kodem źródłowym PROD bez weryfikacji.

5. TWO ENVIRONMENTS
   - Projekt posiada dwa środowiska:
     a) DEV  = sprzet-skk-morzkulc
     b) PROD = morzkulc-e9df7
   - Kod ma być wspólny, a środowisko ma być wybierane przez config / env / host.
   - Nie wolno ręcznie przepinać logiki biznesowej pomiędzy DEV i PROD.

6. NO HARDCODED ASSUMPTIONS
   - Nie zakładaj, że frontend, auth, hosting, functions albo firestore są ustawione poprawnie.
   - Zawsze sprawdzaj:
     - .firebaserc
     - firebase.json
     - frontend firebase config
     - functions env
     - allowlist hostów
     - rewrites /api/*

7. COMPILED CODE IS NOT SOURCE OF TRUTH
   - functions/src = źródło prawdy
   - functions/lib = build output, nie analizujemy go jako kodu źródłowego

8. BEFORE CHANGING SECURITY / ROUTING
   - Zawsze sprawdzaj:
     - requireAllowedHost
     - isAllowedHost
     - host/origin/referer
     - /api/register
     - /api/setup
     - rewrites hostingu

9. IF UNSURE -> ASK FOR FILE OR USE SNAPSHOT OUTPUT
   - Nie zgaduj.
   - Jeśli snapshot nie pokazuje wystarczająco dużo, rozbuduj snapshot albo odczytaj plik.

10. THIS FILE SHOULD BE COMMITTED
   - project_snapshot.py ma być częścią repo i być stale aktualny.
   - Dzięki temu każdy kolejny etap pracy zaczyna się od realnego stanu projektu.

ARCHITEKTURA PROJEKTU (DOCZELOWO)
- Firebase Hosting
- Firebase Auth
- Firebase Functions
- Firestore
- public/ = frontend runtime
- functions/src/ = backend source
- functions/lib/ = compiled output (ignore as source)
"""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


# =========================
# ⚙️ KONFIGURACJA
# =========================
PROJECT_ROOT = "."
INCLUDE_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React",
    ".ts": "TypeScript",
    ".tsx": "React TypeScript",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
}

EXCLUDE_DIRS = {
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".git",
    ".firebase",
    "dist",
    "build",
    "coverage",
    ".aider*",
    "lib",  # functions/lib = compiled output, nie analizujemy jako source
}

EXCLUDE_EXACT_FILES = {
    "PROJECT_MAP.txt",
}

PATTERNS_TO_SEARCH = [
    "requireAllowedHost",
    "isAllowedHost",
    "req.headers.host",
    "req.headers.origin",
    "req.headers.referer",
    "registerUser",
    "getSetup",
    "adminPutSetup",
    "getGearKayaks",
    "/api/register",
    "/api/setup",
    "/api/gear/kayaks",
    "sprzet-skk-morzkulc.web.app",
    "sprzet-skk-morzkulc.firebaseapp.com",
    "morzkulc-e9df7.web.app",
    "morzkulc-e9df7.firebaseapp.com",
    "process.env.",
    "ENV_NAME",
    "initializeApp(",
    "projectId:",
    "authDomain:",
    "ALLOWED_HOSTS",
    "ALLOWED_ORIGINS",
]

ENV_NAME_PATTERN = re.compile(r"\bprocess\.env\.([A-Z0-9_]+)\b")
HOST_LITERAL_PATTERN = re.compile(
    r"""["'](
    [a-zA-Z0-9.-]+\.web\.app|
    [a-zA-Z0-9.-]+\.firebaseapp\.com|
    localhost|
    127\.0\.0\.1
    )["']""",
    re.VERBOSE,
)

ORIGIN_LITERAL_PATTERN = re.compile(
    r"""["'](
    https?://[a-zA-Z0-9.-]+\.web\.app|
    https?://[a-zA-Z0-9.-]+\.firebaseapp\.com|
    http://localhost:\d+|
    http://127\.0\.0\.1:\d+
    )["']""",
    re.VERBOSE,
)

FIRESTORE_COLLECTION_PATTERNS = [
    r'\.collection\(\s*["\']([^"\']+)["\']\s*\)',
    r'\bcollection\(\s*[^,]+,\s*["\']([^"\']+)["\']\s*\)',
    r'\bfirestoreGetCollection\(\s*["\']([^"\']+)["\']\s*\)',
]

FIRESTORE_DOC_PATTERNS = [
    r'\.collection\(\s*["\']([^"\']+)["\']\s*\)\.doc\(\s*["\']([^"\']+)["\']\s*\)',
    r'\bdoc\(\s*[^,]+,\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*\)',
    r'\bfirestoreGetDocument\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*\)',
    r'\bfirestoreSaveDocument\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*\)',
    r'\bfirestorePatchDocument\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*\)',
    r'\bfirestoreDeleteDocument\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']\s*\)',
]

HTTP_ROUTE_PATTERNS = [
    r'\b(source)\s*:\s*["\'](/api/[^"\']+)["\']',
    r'\bconst\s+\w+\s*=\s*["\'](/api/[^"\']+)["\']',
    r'\bfetch\(\s*["\'](/api/[^"\']+)["\']',
]


# =========================
# 🔒 REGUŁY PROJEKTU
# =========================
RULES = """
=== PROJECT RULES (WEB APP / MORZKULC) ===

GENERAL
- Never guess code structure
- Always rely on actual files
- If unsure -> ask for file or extend snapshot
- master = PROD source of truth
- DEV and PROD are separate Firebase projects
- Code should be shared; environment should be selected by config, env or host

ENVIRONMENTS
- DEV  = sprzet-skk-morzkulc
- PROD = morzkulc-e9df7

ARCHITECTURE
- Firebase Functions backend (Node.js / TypeScript)
- TypeScript source in functions/src/
- Compiled JS in functions/lib/ is NOT source of truth
- Frontend runtime in public/
- Hosting rewrites /api/* are critical
- Firebase client config must support both DEV and PROD safely

CHANGE DISCIPLINE
- One logical change at a time
- Check config before code changes
- Verify host allowlist before debugging auth/register
- Do not modify compiled JS in lib/
- Do not modify security / routing blindly

SAFETY
- Never guess host allowlist
- Never guess active Firebase project
- Check .firebaserc, firebase.json, env files, frontend firebase config
- Always inspect downstream dependencies

WORKFLOW
1. Read rules
2. Read git summary
3. Read project summary
4. Read env / firebase / security summaries
5. Read pattern matches
6. Identify affected files
7. Inspect code
8. Implement
9. Test
"""


# =========================
# 🧠 PARSER DLA RÓŻNYCH JĘZYKÓW
# =========================
class WebProjectAnalyzer:
    def __init__(self, file_path: Path):
        self.path = file_path
        self.extension = file_path.suffix.lower()
        self.content = self._read_file()

    def _read_file(self) -> Optional[str]:
        try:
            return self.path.read_text(encoding="utf-8")
        except Exception:
            return None

    def analyze(self) -> Optional[Dict[str, Any]]:
        if not self.content:
            return None

        analyzers = {
            ".py": self._analyze_python,
            ".js": self._analyze_javascript,
            ".jsx": self._analyze_javascript,
            ".ts": self._analyze_typescript,
            ".tsx": self._analyze_typescript,
            ".json": self._analyze_json,
            ".html": self._analyze_html,
            ".css": self._analyze_css,
            ".scss": self._analyze_css,
            ".yml": self._analyze_yaml,
            ".yaml": self._analyze_yaml,
        }

        analyzer = analyzers.get(self.extension)
        if analyzer:
            return analyzer()
        return self._analyze_generic()

    def _analyze_python(self) -> Dict[str, Any]:
        try:
            tree = ast.parse(self.content)
            analyzer = PythonAnalyzer()
            analyzer.visit(tree)
            return {
                "type": "Python",
                "file": str(self.path),
                "imports": analyzer.imports[:20],
                "functions": analyzer.functions[:20],
                "classes": analyzer.classes[:12],
            }
        except Exception:
            return self._analyze_generic()

    def _analyze_javascript(self) -> Dict[str, Any]:
        imports = []
        exports = []
        functions = []

        lines = self.content.split("\n")
        for i, line in enumerate(lines, 1):
            if match := re.search(r'import\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]', line):
                imports.append(match.group(1))
            elif match := re.search(r'import\s+[\'"]([^\'"]+)[\'"]', line):
                imports.append(match.group(1))
            elif match := re.search(r'(?:const|let|var)\s+.*\s*=\s*require\([\'"]([^\'"]+)[\'"]\)', line):
                imports.append(match.group(1))

            if re.search(r"export\s+(default\s+)?(function|class|const|let|var)", line):
                exports.append(line.strip())

            if match := re.search(r"(?:async\s+)?function\s+(\w+)\s*\(", line):
                functions.append({
                    "name": match.group(1),
                    "line": i,
                    "type": "function",
                })
            elif match := re.search(r"const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>", line):
                functions.append({
                    "name": match.group(1),
                    "line": i,
                    "type": "arrow function",
                })
            elif match := re.search(r"(\w+)\s*:\s*(?:async\s+)?function\s*\(", line):
                functions.append({
                    "name": match.group(1),
                    "line": i,
                    "type": "method",
                })

        return {
            "type": "JavaScript",
            "file": str(self.path),
            "imports": list(set(imports))[:20],
            "exports": exports[:10],
            "functions": functions[:20],
        }

    def _analyze_typescript(self) -> Dict[str, Any]:
        result = self._analyze_javascript()
        result["type"] = "TypeScript"

        interfaces = []
        types = []

        lines = self.content.split("\n")
        for i, line in enumerate(lines, 1):
            if match := re.search(r"\binterface\s+(\w+)", line):
                interfaces.append({"name": match.group(1), "line": i})
            elif match := re.search(r"\btype\s+(\w+)\s*=", line):
                types.append({"name": match.group(1), "line": i})

        if interfaces:
            result["interfaces"] = interfaces[:15]
        if types:
            result["types"] = types[:15]

        return result

    def _analyze_json(self) -> Dict[str, Any]:
        try:
            data = json.loads(self.content)
            keys = list(data.keys()) if isinstance(data, dict) else []

            if self.path.name == "package.json":
                deps = {
                    "dependencies": list(data.get("dependencies", {}).keys()),
                    "devDependencies": list(data.get("devDependencies", {}).keys()),
                    "scripts": list(data.get("scripts", {}).keys()),
                }
                return {
                    "type": "Package.json",
                    "file": str(self.path),
                    "dependencies": deps,
                }

            if self.path.name == "firebase.json":
                return {
                    "type": "Firebase Config",
                    "file": str(self.path),
                    "keys": keys[:20],
                }

            return {
                "type": "JSON",
                "file": str(self.path),
                "keys": keys[:20],
            }
        except Exception:
            return self._analyze_generic()

    def _analyze_html(self) -> Dict[str, Any]:
        scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', self.content)
        styles = re.findall(r'<link[^>]*href=["\']([^"\']+)["\']', self.content)

        return {
            "type": "HTML",
            "file": str(self.path),
            "scripts": scripts[:10],
            "styles": styles[:10],
            "has_body": bool(re.search(r"<body[^>]*>", self.content)),
        }

    def _analyze_css(self) -> Dict[str, Any]:
        classes = re.findall(r"\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{", self.content)
        ids = re.findall(r"#([a-zA-Z][a-zA-Z0-9_-]*)\s*{", self.content)
        media_queries = len(re.findall(r"@media", self.content))

        return {
            "type": "CSS/SCSS",
            "file": str(self.path),
            "classes": list(set(classes))[:25],
            "ids": list(set(ids))[:15],
            "media_queries": media_queries,
        }

    def _analyze_yaml(self) -> Dict[str, Any]:
        keys = re.findall(r"^(\w+):", self.content, re.MULTILINE)
        return {
            "type": "YAML",
            "file": str(self.path),
            "top_level_keys": keys[:20],
        }

    def _analyze_generic(self) -> Dict[str, Any]:
        lines = len(self.content.split("\n")) if self.content else 0
        size = len(self.content) if self.content else 0

        return {
            "type": f"Generic ({self.extension})" if self.extension else "Generic",
            "file": str(self.path),
            "lines": lines,
            "size_bytes": size,
        }


class PythonAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.imports = []
        self.functions = []
        self.classes = []

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append(alias.name)

    def visit_ImportFrom(self, node):
        module = node.module or ""
        for alias in node.names:
            self.imports.append(f"{module}.{alias.name}")

    def visit_FunctionDef(self, node):
        self.functions.append({
            "name": node.name,
            "line": node.lineno,
        })

    def visit_ClassDef(self, node):
        methods = []
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                methods.append({
                    "name": item.name,
                    "line": item.lineno,
                })
        self.classes.append({
            "name": node.name,
            "line": node.lineno,
            "methods": methods[:12],
        })


# =========================
# 📁 SKANOWANIE PROJEKTU
# =========================
def should_include(path: Path) -> bool:
    if path.name in EXCLUDE_EXACT_FILES:
        return False

    for part in path.parts:
        if any(part.startswith(exclude) or part == exclude for exclude in EXCLUDE_DIRS if "*" not in exclude):
            return False
        if any(exclude.endswith("*") and part.startswith(exclude[:-1]) for exclude in EXCLUDE_DIRS if "*" in exclude):
            return False

    if path.suffix.lower() in INCLUDE_EXTENSIONS:
        return True

    if path.name.startswith(".env") or path.name in [".firebaserc", "firebase.json"]:
        return True

    return False


def iter_project_files():
    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [
            d for d in dirs
            if not any(
                d.startswith(exclude[:-1]) if "*" in exclude else d == exclude
                for exclude in EXCLUDE_DIRS
            )
        ]

        for file in sorted(files):
            path = Path(root) / file
            if should_include(path):
                yield path


def safe_read(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return None


def classify_file(rel_path: str) -> str:
    rel = rel_path.replace("\\", "/")
    if rel.startswith("functions/src/"):
        return "SOURCE"
    if rel.startswith("functions/lib/"):
        return "COMPILED"
    if rel.startswith("public/"):
        return "FRONTEND"
    if rel.startswith("archiwed/"):
        return "ARCHIVED"
    return "PROJECT"


# =========================
# 🧪 GIT SUMMARY
# =========================
def run_git(args: List[str]) -> Tuple[bool, str]:
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            shell=False,
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, (result.stderr or result.stdout).strip()
    except Exception as e:
        return False, str(e)


def print_git_summary():
    print("\n=== GIT SUMMARY ===\n")

    ok_branch, branch = run_git(["branch", "--show-current"])
    ok_status, status = run_git(["status", "--short"])
    ok_head, head = run_git(["rev-parse", "--short", "HEAD"])
    ok_log, last_commit = run_git(["log", "-1", "--oneline"])

    print(f"- current branch: {branch if ok_branch else '(unavailable)'}")
    print(f"- HEAD short hash: {head if ok_head else '(unavailable)'}")
    print(f"- last commit: {last_commit if ok_log else '(unavailable)'}")

    print("- git status:")
    if ok_status:
        if status:
            for line in status.splitlines():
                print(f"  • {line}")
        else:
            print("  • working tree clean")
    else:
        print(f"  • unavailable: {status}")


# =========================
# 📊 DODATKOWE SEKCJE
# =========================
def print_project_summary():
    print("\n=== PROJECT SUMMARY ===\n")

    found = {
        ".firebaserc": False,
        "firebase.json": False,
        "functions/src": False,
        "public/core": False,
        "functions env files": [],
        "archiwed": False,
    }

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")

        if path.name == ".firebaserc":
            found[".firebaserc"] = True
        if path.name == "firebase.json":
            found["firebase.json"] = True
        if rel.startswith("functions/src/"):
            found["functions/src"] = True
        if rel.startswith("public/core/"):
            found["public/core"] = True
        if rel.startswith("functions/.env"):
            found["functions env files"].append(rel)
        if rel.startswith("archiwed/"):
            found["archiwed"] = True

    print(f"- .firebaserc present: {found['.firebaserc']}")
    print(f"- firebase.json present: {found['firebase.json']}")
    print(f"- functions/src present: {found['functions/src']}")
    print(f"- public/core present: {found['public/core']}")
    print(f"- archiwed present: {found['archiwed']}")

    print("- functions env files:")
    env_files = found["functions env files"]
    if env_files:
        for env_file in sorted(env_files):
            print(f"  • {env_file}")
    else:
        print("  • none found")


def print_env_summary():
    print("\n=== ENV SUMMARY ===\n")

    env_files: Dict[str, List[str]] = {}
    env_usage: Dict[str, Set[str]] = {}

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")

        if path.name.startswith(".env"):
            content = safe_read(path) or ""
            keys = []
            for line in content.splitlines():
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                key = s.split("=", 1)[0].strip()
                if key:
                    keys.append(key)

            env_files[rel] = keys

        content = safe_read(path)
        if not content:
            continue

        for match in ENV_NAME_PATTERN.finditer(content):
            env_name = match.group(1)
            env_usage.setdefault(env_name, set()).add(rel)

    print("- ENV files detected:")
    if env_files:
        for file_name in sorted(env_files.keys()):
            print(f"  • {file_name}")
            keys = env_files[file_name]
            if keys:
                for key in keys[:30]:
                    print(f"      - {key}")
            else:
                print("      - (no keys detected)")
    else:
        print("  • none")

    print("\n- process.env usage detected:")
    if env_usage:
        for key in sorted(env_usage.keys()):
            print(f"  • {key}")
            for src in sorted(env_usage[key])[:15]:
                print(f"      - {src}")
    else:
        print("  • none")

    print("\n- DEV / PROD env quick check:")
    dev_env = "functions/.env.sprzet-skk-morzkulc" in env_files
    prod_env = "functions/.env.morzkulc-e9df7" in env_files
    print(f"  • DEV env exists: {dev_env}")
    print(f"  • PROD env exists: {prod_env}")


def print_firebaserc_summary():
    print("\n=== FIREBASERC SUMMARY ===\n")

    path = Path(PROJECT_ROOT) / ".firebaserc"
    if not path.exists():
        print("- .firebaserc not found")
        return

    content = safe_read(path)
    if not content:
        print("- .firebaserc could not be read")
        return

    try:
        data = json.loads(content)
    except Exception as e:
        print(f"- invalid .firebaserc JSON: {e}")
        return

    projects = data.get("projects", {})
    print("- projects:")
    if isinstance(projects, dict) and projects:
        for k, v in projects.items():
            print(f"  • {k} -> {v}")
    else:
        print("  • none")


def print_firebase_json_summary():
    print("\n=== FIREBASE.JSON SUMMARY ===\n")

    path = Path(PROJECT_ROOT) / "firebase.json"
    if not path.exists():
        print("- firebase.json not found")
        return

    content = safe_read(path)
    if not content:
        print("- firebase.json could not be read")
        return

    try:
        data = json.loads(content)
    except Exception as e:
        print(f"- invalid firebase.json JSON: {e}")
        return

    hosting = data.get("hosting", {})
    rewrites = []
    headers = []

    if isinstance(hosting, dict):
        rewrites = hosting.get("rewrites", []) or []
        headers = hosting.get("headers", []) or []

    print("- rewrites:")
    if rewrites:
        for rw in rewrites:
            print(f"  • {rw}")
    else:
        print("  • none")

    print("- headers:")
    if headers:
        for h in headers:
            print(f"  • {h}")
    else:
        print("  • none")

    functions_cfg = data.get("functions")
    print("- functions config present:", functions_cfg is not None)


def print_frontend_firebase_summary():
    print("\n=== FRONTEND FIREBASE SUMMARY ===\n")

    path = Path(PROJECT_ROOT) / "public" / "core" / "firebase_client.js"
    if not path.exists():
        print("- public/core/firebase_client.js not found")
        return

    content = safe_read(path)
    if not content:
        print("- public/core/firebase_client.js could not be read")
        return

    project_ids = sorted(set(re.findall(r'projectId:\s*["\']([^"\']+)["\']', content)))
    auth_domains = sorted(set(re.findall(r'authDomain:\s*["\']([^"\']+)["\']', content)))
    host_checks = sorted(set(re.findall(r'host\s*===\s*["\']([^"\']+)["\']', content)))

    print("- projectIds:")
    if project_ids:
        for item in project_ids:
            print(f"  • {item}")
    else:
        print("  • none")

    print("- authDomains:")
    if auth_domains:
        for item in auth_domains:
            print(f"  • {item}")
    else:
        print("  • none")

    print("- host checks:")
    if host_checks:
        for item in host_checks:
            print(f"  • {item}")
    else:
        print("  • none")


def print_host_security_summary():
    print("\n=== HOST / API / SECURITY SUMMARY ===\n")

    hosts_found: Dict[str, Set[str]] = {}
    origins_found: Dict[str, Set[str]] = {}
    api_refs: List[str] = []
    security_hits: List[str] = []

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for match in HOST_LITERAL_PATTERN.finditer(content):
            host = match.group(1)
            hosts_found.setdefault(host, set()).add(rel)

        for match in ORIGIN_LITERAL_PATTERN.finditer(content):
            origin = match.group(1)
            origins_found.setdefault(origin, set()).add(rel)

        for pattern in ["requireAllowedHost", "isAllowedHost", "/api/register", "/api/setup", "/api/gear/kayaks"]:
            if pattern in content:
                api_refs.append(f"{rel} :: {pattern}")

        for pattern in ["req.headers.host", "req.headers.origin", "req.headers.referer", "Access-Control-Allow-Origin", "ALLOWED_HOSTS", "ALLOWED_ORIGINS"]:
            if pattern in content:
                security_hits.append(f"{rel} :: {pattern}")

    print("- Host literals detected:")
    if hosts_found:
        for host in sorted(hosts_found.keys()):
            print(f"  • {host}")
            for src in sorted(hosts_found[host])[:10]:
                print(f"      - {src}")
    else:
        print("  • none")

    print("\n- Origin literals detected:")
    if origins_found:
        for origin in sorted(origins_found.keys()):
            print(f"  • {origin}")
            for src in sorted(origins_found[origin])[:10]:
                print(f"      - {src}")
    else:
        print("  • none")

    print("\n- API/security references:")
    if api_refs:
        for item in sorted(set(api_refs))[:100]:
            print(f"  • {item}")
    else:
        print("  • none")

    print("\n- Header/host/origin checks:")
    if security_hits:
        for item in sorted(set(security_hits))[:100]:
            print(f"  • {item}")
    else:
        print("  • none")


def print_firestore_summary():
    print("\n=== FIRESTORE SUMMARY ===\n")

    collections: Dict[str, Set[str]] = {}
    docs: Dict[str, Set[str]] = {}

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for pattern in FIRESTORE_COLLECTION_PATTERNS:
            for match in re.finditer(pattern, content):
                collection = match.group(1)
                collections.setdefault(collection, set()).add(rel)

        for pattern in FIRESTORE_DOC_PATTERNS:
            for match in re.finditer(pattern, content):
                if len(match.groups()) >= 2:
                    collection = match.group(1)
                    doc_id = match.group(2)
                    docs.setdefault(f"{collection}/{doc_id}", set()).add(rel)

    print("- collections:")
    if collections:
        for collection in sorted(collections.keys()):
            print(f"  • {collection}")
            for src in sorted(collections[collection])[:10]:
                print(f"      - {src}")
    else:
        print("  • none")

    print("\n- documents:")
    if docs:
        for doc_path in sorted(docs.keys()):
            print(f"  • {doc_path}")
            for src in sorted(docs[doc_path])[:10]:
                print(f"      - {src}")
    else:
        print("  • none detected")


def print_http_route_summary():
    print("\n=== HTTP ROUTE SUMMARY ===\n")

    routes: Dict[str, Set[str]] = {}

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for pattern in HTTP_ROUTE_PATTERNS:
            for match in re.finditer(pattern, content):
                route = match.group(match.lastindex)
                routes.setdefault(route, set()).add(rel)

    if routes:
        for route in sorted(routes.keys()):
            print(f"  • {route}")
            for src in sorted(routes[route])[:10]:
                print(f"      - {src}")
    else:
        print("  • none")


def print_pattern_matches(patterns: List[str]):
    print("\n=== PATTERN MATCHES ===\n")

    any_match = False

    for path in iter_project_files():
        content = safe_read(path)
        if not content:
            continue

        rel_path = path.relative_to(PROJECT_ROOT) if PROJECT_ROOT != "." else path
        lines = content.splitlines()

        for i, line in enumerate(lines):
            for pattern in patterns:
                if pattern in line:
                    any_match = True
                    print(f"\n📄 {rel_path} | line {i + 1} | pattern: {pattern}")
                    start = max(0, i - 2)
                    end = min(len(lines), i + 3)
                    for j in range(start, end):
                        prefix = ">>" if j == i else "  "
                        print(f"{prefix} {j + 1}: {lines[j]}")

    if not any_match:
        print("No matches found.")


# =========================
# 🖨️ DRUKOWANIE SNAPSHOTU
# =========================
def print_snapshot():
    print("\n" + "=" * 80)
    print(RULES)
    print("=" * 80)

    print_git_summary()
    print_project_summary()
    print_env_summary()
    print_firebaserc_summary()
    print_firebase_json_summary()
    print_frontend_firebase_summary()
    print_host_security_summary()
    print_firestore_summary()
    print_http_route_summary()
    print_pattern_matches(PATTERNS_TO_SEARCH)

    print("\n=== PROJECT MAP ===\n")

    files_by_dir: Dict[str, List[Path]] = {}

    for path in iter_project_files():
        rel_path = path.relative_to(PROJECT_ROOT) if PROJECT_ROOT != "." else path
        dir_name = str(rel_path.parent) if rel_path.parent != Path(".") else "."

        if dir_name not in files_by_dir:
            files_by_dir[dir_name] = []

        files_by_dir[dir_name].append(rel_path)

    for directory in sorted(files_by_dir.keys()):
        if directory == ".":
            print("\n📁 **ROOT**")
        else:
            print(f"\n📁 **{directory}**")

        for file_path in sorted(files_by_dir[directory]):
            analyzer = WebProjectAnalyzer(Path(PROJECT_ROOT) / file_path)
            data = analyzer.analyze()

            if not data:
                continue

            icon = {
                "Python": "🐍",
                "JavaScript": "📜",
                "TypeScript": "📘",
                "HTML": "🌐",
                "CSS/SCSS": "🎨",
                "JSON": "📦",
                "YAML": "⚙️",
                "Package.json": "📦",
                "Firebase Config": "🔥",
            }.get(data.get("type", ""), "📄")

            rel_str = str(file_path).replace("\\", "/")
            classification = classify_file(rel_str)

            print(f"\n  {icon} **{file_path.name}**")
            print(f"    Scope: {classification}")

            if data.get("type"):
                print(f"    Type: {data['type']}")

            if "imports" in data and data["imports"]:
                print("    Imports:")
                for imp in sorted(set(data["imports"]))[:12]:
                    print(f"      - {imp}")

            if "dependencies" in data:
                deps = data["dependencies"]
                if deps.get("dependencies"):
                    print(f"    Dependencies ({len(deps['dependencies'])}):")
                    for dep in sorted(deps["dependencies"])[:10]:
                        print(f"      - {dep}")
                    if len(deps["dependencies"]) > 10:
                        print(f"      ... i {len(deps['dependencies']) - 10} więcej")

                if deps.get("scripts"):
                    print("    Scripts:")
                    for script in sorted(deps["scripts"])[:12]:
                        print(f"      - {script}")

            if "functions" in data and data["functions"]:
                print("    Functions:")
                for f in data["functions"][:12]:
                    if isinstance(f, dict):
                        print(f"      - {f['name']} (line {f.get('line', '?')})")
                    else:
                        print(f"      - {f}")

            if "classes" in data and data["classes"]:
                print("    Classes:")
                for c in data["classes"][:10]:
                    if isinstance(c, dict):
                        print(f"      - {c['name']} (line {c.get('line', '?')})")
                        if c.get("methods"):
                            for m in c["methods"][:6]:
                                print(f"        • {m['name']} (line {m.get('line', '?')})")
                    else:
                        print(f"      - {c}")

            if "interfaces" in data and data["interfaces"]:
                print("    Interfaces:")
                for i in data["interfaces"][:10]:
                    if isinstance(i, dict):
                        print(f"      - {i['name']} (line {i.get('line', '?')})")
                    else:
                        print(f"      - {i}")

            if "types" in data and data["types"]:
                print("    Types:")
                for t in data["types"][:10]:
                    if isinstance(t, dict):
                        print(f"      - {t['name']}")
                    else:
                        print(f"      - {t}")

            if (
                "classes" in data
                and isinstance(data["classes"], list)
                and data["classes"]
                and all(isinstance(x, str) for x in data["classes"])
            ):
                print("    CSS Classes:")
                for cls in data["classes"][:20]:
                    print(f"      - .{cls}")

            if "ids" in data and data["ids"]:
                print("    CSS IDs:")
                for id_ in data["ids"][:12]:
                    print(f"      - #{id_}")

    print("\n" + "=" * 80)
    print("END OF SNAPSHOT")
    print("=" * 80)


# =========================
# ▶ MAIN
# =========================
if __name__ == "__main__":
    print("🔍 Building web project snapshot...\n")
    print_snapshot()