"""
PROJECT OPTIMIZATION SNAPSHOT TOOL — MORZKULC APP

Cel:
- przygotować możliwie praktyczny audit dla AI developera
- wskazać realne miejsca do optymalizacji
- NIE zmieniać logiki biznesowej
- NIE mieszać aktywnego runtime z archiwum i narzędziami diagnostycznymi

Najważniejsze zasady:
- analizujemy aktywny projekt, nie archiwum
- functions/src = backend source of truth
- public/ = frontend runtime source of truth
- functions/lib = compiled output, nie analizujemy jako source
- pliki snapshot / audit są raportowane osobno, ale nie mają psuć rankingu runtime
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


# =========================
# ⚙️ KONFIGURACJA
# =========================
PROJECT_ROOT = "."
OUTPUT_TXT = "ai_audit_report.txt"
OUTPUT_JSON = "ai_audit_report.json"

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
    "lib",          # functions/lib = compiled output
    "archiwed",     # << WAŻNE: całkowicie wyłączone z analizy
}

EXCLUDE_EXACT_FILES = {
    "PROJECT_MAP.txt",
}

AUDIT_TOOL_FILES = {
    "project_snapshot.py",
    "project_optimization_snapshot.py",
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
    "getGearItems",
    "/api/register",
    "/api/setup",
    "/api/gear/kayaks",
    "/api/gear/items",
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
    "firestore.indexes.json",
    "collectionGroup",
    ".orderBy(",
    ".where(",
    "invoker",
    "run.googleapis.com/invoker-iam-disabled",
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

IMPORT_FROM_PATTERN = re.compile(r'import\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]')
IMPORT_SIDE_PATTERN = re.compile(r'import\s+[\'"]([^\'"]+)[\'"]')
REQUIRE_PATTERN = re.compile(r'(?:const|let|var)\s+.*=\s*require\([\'"]([^\'"]+)[\'"]\)')

FUNCTION_DEF_JS_PATTERN = re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(")
FUNCTION_ARROW_PATTERN = re.compile(r"const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>")
FUNCTION_METHOD_PATTERN = re.compile(r"([A-Za-z0-9_]+)\s*:\s*(?:async\s+)?function\s*\(")

TS_INTERFACE_PATTERN = re.compile(r"\binterface\s+([A-Za-z0-9_]+)")
TS_TYPE_PATTERN = re.compile(r"\btype\s+([A-Za-z0-9_]+)\s*=")

HTTP_ROUTE_PATTERNS = [
    r'\b(source)\s*:\s*["\'](/api/[^"\']+)["\']',
    r'\bconst\s+\w+\s*=\s*["\'](/api/[^"\']+)["\']',
    r'\bfetch\(\s*["\'](/api/[^"\']+)["\']',
]

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

FIRESTORE_QUERY_START_PATTERN = re.compile(
    r'\.(collection|collectionGroup)\(\s*["\']([^"\']+)["\']\s*\)',
    re.MULTILINE,
)
FIRESTORE_WHERE_PATTERN = re.compile(
    r'\.where\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']',
    re.MULTILINE,
)
FIRESTORE_ORDERBY_PATTERN = re.compile(
    r'\.orderBy\(\s*["\']([^"\']+)["\'](?:\s*,\s*["\']([^"\']+)["\'])?',
    re.MULTILINE,
)
FIRESTORE_LIMIT_PATTERN = re.compile(r"\.limit\(\s*\d+\s*\)", re.MULTILINE)

INDEX_RANGE_OPERATORS = {"<", "<=", ">", ">=", "!=", "not-in", "array-contains-any"}
INDEX_EQUALITY_OPERATORS = {"==", "in", "array-contains"}

SHARED_CONTRACT_PATTERNS = [
    "modules",
    "access",
    "role_key",
    "status_key",
    "defaultRoute",
    "profileComplete",
    "setupMissing",
    "createdAt",
    "memberId",
    "openingMatch",
    "kayakIds",
    "blockStartIso",
    "blockEndIso",
    "userUid",
    "isActive",
    "images",
    "gearCategory",
    "gearCategoryDisplay",
]

RULES = """
=== PROJECT AI OPTIMIZATION AUDIT RULES ===

GENERAL
- Never guess code structure.
- Always rely on actual files.
- If unsure -> inspect full file, not fragments.
- functions/src = backend source of truth
- public/ = frontend runtime source of truth
- functions/lib = compiled output, never source of truth

OPTIMIZATION SCOPE
- Optimization only
- No default business logic changes
- No default UX redesign
- No default visual redesign
- No contract changes unless fully reviewed downstream

PRIMARY GOAL
- Find bottlenecks
- Find repeated work
- Find duplicated code
- Find heavy renders
- Find repeated Firestore/API usage
- Find safe optimization candidates
- Mark high-risk files that require full inspection

SAFETY
- High-risk files must not be modified from partial snippets
- Shared contracts must be identified before refactor
- Browser-facing endpoints require routing/security review
- Firestore-heavy services require index/query review

IMPORTANT FILTERS
- Folder 'archiwed/' is excluded from analysis
- Audit/snapshot tools are excluded from runtime ranking
- Runtime usage is separated from diagnostic/reference usage
- Quick wins should focus on active runtime first
"""


# =========================
# 🧩 POMOCNICZE
# =========================
def normalize_rel(path: Path) -> str:
    return str(path).replace("\\", "/")


def is_audit_tool_file(rel_path: str) -> bool:
    return Path(rel_path).name in AUDIT_TOOL_FILES


def classify_file(rel_path: str) -> str:
    rel = rel_path.replace("\\", "/")
    if rel.startswith("functions/src/"):
        return "BACKEND_SOURCE"
    if rel.startswith("functions/lib/"):
        return "COMPILED"
    if rel.startswith("public/"):
        return "FRONTEND"
    return "PROJECT"


def is_runtime_file(rel_path: str) -> bool:
    scope = classify_file(rel_path)
    if is_audit_tool_file(rel_path):
        return False
    return scope in {"BACKEND_SOURCE", "FRONTEND"}


def is_backend_runtime_file(rel_path: str) -> bool:
    return classify_file(rel_path) == "BACKEND_SOURCE" and not is_audit_tool_file(rel_path)


def is_frontend_runtime_file(rel_path: str) -> bool:
    return classify_file(rel_path) == "FRONTEND" and not is_audit_tool_file(rel_path)


def should_include(path: Path) -> bool:
    if path.name in EXCLUDE_EXACT_FILES:
        return False

    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return False

    if path.suffix.lower() in INCLUDE_EXTENSIONS:
        return True

    if path.name in [".firebaserc", "firebase.json", "firestore.indexes.json"]:
        return True

    if path.name.startswith(".env"):
        return True

    return False


def iter_project_files():
    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in sorted(files):
            path = Path(root) / file
            if should_include(path):
                yield path


def safe_read(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return None
    except Exception:
        return None


def line_count(content: str) -> int:
    return len(content.splitlines())


def file_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except Exception:
        return 0


def count_occurrences(pattern: str, content: str) -> int:
    return len(re.findall(pattern, content, flags=re.MULTILINE))


def md5_short(text: str) -> str:
    return hashlib.md5(text.encode("utf-8", errors="ignore")).hexdigest()[:12]


# =========================
# 🧠 ANALIZA PLIKU
# =========================
class PythonAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.imports: List[str] = []
        self.functions: List[Dict[str, Any]] = []
        self.classes: List[Dict[str, Any]] = []

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
            "end_line": getattr(node, "end_lineno", node.lineno),
            "length": max(1, getattr(node, "end_lineno", node.lineno) - node.lineno + 1),
        })

    def visit_AsyncFunctionDef(self, node):
        self.functions.append({
            "name": node.name,
            "line": node.lineno,
            "end_line": getattr(node, "end_lineno", node.lineno),
            "length": max(1, getattr(node, "end_lineno", node.lineno) - node.lineno + 1),
        })

    def visit_ClassDef(self, node):
        methods = []
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                methods.append({
                    "name": item.name,
                    "line": item.lineno,
                })
        self.classes.append({
            "name": node.name,
            "line": node.lineno,
            "methods": methods[:20],
        })


class FileAnalyzer:
    def __init__(self, path: Path):
        self.path = path
        self.rel = normalize_rel(path)
        self.scope = classify_file(self.rel)
        self.content = safe_read(path) or ""
        self.lines = self.content.splitlines()
        self.extension = path.suffix.lower()

    def analyze(self) -> Dict[str, Any]:
        result = {
            "path": self.rel,
            "scope": self.scope,
            "type": INCLUDE_EXTENSIONS.get(self.extension, self.extension or "Generic"),
            "line_count": line_count(self.content),
            "size_bytes": file_size(self.path),
            "imports": [],
            "functions": [],
            "classes": [],
            "interfaces": [],
            "types": [],
        }

        if self.extension == ".py":
            return self._analyze_python(result)
        if self.extension in {".js", ".jsx", ".ts", ".tsx"}:
            return self._analyze_js_ts(result)
        if self.extension in {".json", ".html", ".css", ".scss", ".yml", ".yaml"}:
            return result
        return result

    def _analyze_python(self, result: Dict[str, Any]) -> Dict[str, Any]:
        try:
            tree = ast.parse(self.content)
            analyzer = PythonAnalyzer()
            analyzer.visit(tree)
            result["imports"] = sorted(set(analyzer.imports))
            result["functions"] = analyzer.functions
            result["classes"] = analyzer.classes
            return result
        except Exception:
            return result

    def _analyze_js_ts(self, result: Dict[str, Any]) -> Dict[str, Any]:
        imports = []
        functions = []
        interfaces = []
        types_ = []

        for i, line in enumerate(self.lines, 1):
            for patt in [IMPORT_FROM_PATTERN, IMPORT_SIDE_PATTERN, REQUIRE_PATTERN]:
                m = patt.search(line)
                if m:
                    imports.append(m.group(1))

            m = FUNCTION_DEF_JS_PATTERN.search(line)
            if m:
                functions.append({
                    "name": m.group(1),
                    "line": i,
                    "end_line": i,
                    "length": None,
                })

            m = FUNCTION_ARROW_PATTERN.search(line)
            if m:
                functions.append({
                    "name": m.group(1),
                    "line": i,
                    "end_line": i,
                    "length": None,
                })

            m = FUNCTION_METHOD_PATTERN.search(line)
            if m:
                functions.append({
                    "name": m.group(1),
                    "line": i,
                    "end_line": i,
                    "length": None,
                })

            if self.extension in {".ts", ".tsx"}:
                m = TS_INTERFACE_PATTERN.search(line)
                if m:
                    interfaces.append({"name": m.group(1), "line": i})
                m = TS_TYPE_PATTERN.search(line)
                if m:
                    types_.append({"name": m.group(1), "line": i})

        result["imports"] = sorted(set(imports))
        result["functions"] = self._estimate_js_function_lengths(functions)
        result["interfaces"] = interfaces
        result["types"] = types_
        return result

    def _estimate_js_function_lengths(self, funcs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not funcs:
            return funcs

        funcs = sorted(funcs, key=lambda x: x["line"])
        total = len(self.lines)

        for idx, fn in enumerate(funcs):
            start = fn["line"]
            next_start = funcs[idx + 1]["line"] if idx + 1 < len(funcs) else total + 1
            end = max(start, next_start - 1)
            fn["end_line"] = end
            fn["length"] = max(1, end - start + 1)

        return funcs


# =========================
# 🧪 GIT
# =========================
def run_git(args: List[str]) -> Tuple[bool, str]:
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            shell=False,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, (result.stderr or result.stdout).strip()
    except Exception as e:
        return False, str(e)


def get_git_summary() -> Dict[str, Any]:
    ok_branch, branch = run_git(["branch", "--show-current"])
    ok_status, status = run_git(["status", "--short"])
    ok_head, head = run_git(["rev-parse", "--short", "HEAD"])
    ok_log, last_commit = run_git(["log", "-1", "--oneline"])

    lines = []
    if ok_status and status:
        lines = status.splitlines()

    return {
        "current_branch": branch if ok_branch else "(unavailable)",
        "head_short_hash": head if ok_head else "(unavailable)",
        "last_commit": last_commit if ok_log else "(unavailable)",
        "status_lines": lines,
    }


# =========================
# 📦 ZEBRANIE DANYCH O PLIKACH
# =========================
def collect_file_data() -> List[Dict[str, Any]]:
    out = []
    for path in iter_project_files():
        rel = normalize_rel(path)
        analyzer = FileAnalyzer(path)
        out.append(analyzer.analyze())
    return out


# =========================
# 📏 METRYKI PLIKÓW
# =========================
def build_project_summary(files_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    counts = defaultdict(int)
    for f in files_data:
        counts[f["scope"]] += 1

    return {
        "counts_by_scope": dict(counts),
        "total_files": len(files_data),
    }


def top_files_by_lines(files_data: List[Dict[str, Any]], limit: int = 40) -> List[Dict[str, Any]]:
    return sorted(
        files_data,
        key=lambda x: x.get("line_count", 0),
        reverse=True
    )[:limit]


def complexity_bucket(lines: int) -> Optional[str]:
    if lines >= 1000:
        return "HIGH"
    if lines >= 500:
        return "WARN"
    return None


def file_size_complexity_summary(files_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for f in files_data:
        level = complexity_bucket(f.get("line_count", 0))
        if level:
            out.append({
                "level": level,
                "path": f["path"],
                "line_count": f["line_count"],
                "scope": f["scope"],
            })
    return sorted(out, key=lambda x: x["line_count"], reverse=True)


def large_functions_summary(files_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for f in files_data:
        for fn in f.get("functions", []):
            length = fn.get("length") or 0
            if length >= 80:
                level = "HIGH" if length >= 180 else "WARN"
                out.append({
                    "level": level,
                    "path": f["path"],
                    "function": fn["name"],
                    "start_line": fn.get("line"),
                    "end_line": fn.get("end_line"),
                    "length": length,
                    "scope": f["scope"],
                })
    return sorted(out, key=lambda x: x["length"], reverse=True)


# =========================
# 🔥 HOTSPOTY FRONTEND/BACKEND
# =========================
def analyze_frontend_hotspots(path: str, content: str) -> Optional[Dict[str, Any]]:
    if not is_frontend_runtime_file(path):
        return None

    fetch_calls = count_occurrences(r"\bfetch\(", content)
    api_calls = count_occurrences(r"\bapiGetJson\(", content) + count_occurrences(r"\bapiPostJson\(", content)
    dom_queries = count_occurrences(r"\.querySelector\(", content) + count_occurrences(r"\.querySelectorAll\(", content) + count_occurrences(r"document\.getElementById\(", content)
    listeners = count_occurrences(r"\.addEventListener\(", content)
    inner_html = count_occurrences(r"\.innerHTML\s*=", content)
    array_ops = sum(
        count_occurrences(p, content) for p in [
            r"\.map\(",
            r"\.filter\(",
            r"\.reduce\(",
            r"\.find\(",
            r"\.some\(",
            r"\.every\(",
            r"\.sort\(",
            r"\.forEach\(",
        ]
    )
    timers = count_occurrences(r"\bsetTimeout\(", content) + count_occurrences(r"\bsetInterval\(", content)

    score = (
        (fetch_calls + api_calls) * 10
        + dom_queries * 2
        + listeners * 3
        + inner_html * 6
        + array_ops * 2
        + timers * 3
    )

    return {
        "path": path,
        "score": score,
        "fetch_api_calls": fetch_calls + api_calls,
        "dom_queries": dom_queries,
        "listeners": listeners,
        "innerHTML": inner_html,
        "array_ops": array_ops,
        "timers": timers,
    }


def analyze_backend_hotspots(path: str, content: str) -> Optional[Dict[str, Any]]:
    if not is_backend_runtime_file(path):
        return None

    firestore_ops = (
        count_occurrences(r"\.collection\(", content)
        + count_occurrences(r"\.doc\(", content)
        + count_occurrences(r"\.where\(", content)
        + count_occurrences(r"\.orderBy\(", content)
        + count_occurrences(r"\.limit\(", content)
        + count_occurrences(r"\.get\(", content)
        + count_occurrences(r"\.set\(", content)
        + count_occurrences(r"\.update\(", content)
        + count_occurrences(r"\.add\(", content)
        + count_occurrences(r"\.runTransaction\(", content)
    )
    array_ops = sum(
        count_occurrences(p, content) for p in [
            r"\.map\(",
            r"\.filter\(",
            r"\.reduce\(",
            r"\.find\(",
            r"\.sort\(",
            r"\.forEach\(",
        ]
    )
    console_logs = count_occurrences(r"\bconsole\.", content)

    score = firestore_ops * 4 + array_ops * 2 + console_logs * 1

    return {
        "path": path,
        "score": score,
        "firestore_ops": firestore_ops,
        "array_ops": array_ops,
        "console_logs": console_logs,
    }


def collect_frontend_hotspots(files_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for f in files_data:
        if not is_frontend_runtime_file(f["path"]):
            continue
        content = safe_read(Path(PROJECT_ROOT) / f["path"]) or ""
        item = analyze_frontend_hotspots(f["path"], content)
        if item:
            out.append(item)
    return sorted(out, key=lambda x: x["score"], reverse=True)


def collect_backend_hotspots(files_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for f in files_data:
        if not is_backend_runtime_file(f["path"]):
            continue
        content = safe_read(Path(PROJECT_ROOT) / f["path"]) or ""
        item = analyze_backend_hotspots(f["path"], content)
        if item:
            out.append(item)
    return sorted(out, key=lambda x: x["score"], reverse=True)


# =========================
# 🌐 ROUTY / API
# =========================
def collect_http_routes() -> Dict[str, Set[str]]:
    routes: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = normalize_rel(path)
        content = safe_read(path)
        if not content:
            continue

        for pattern in HTTP_ROUTE_PATTERNS:
            for match in re.finditer(pattern, content):
                route = match.group(match.lastindex)
                routes[route].add(rel)

    return routes


def split_route_usage(routes: Dict[str, Set[str]]) -> Dict[str, Any]:
    runtime_usage = {}
    diagnostic_usage = {}

    for route, files in routes.items():
        runtime_files = sorted([f for f in files if is_runtime_file(f)])
        diagnostic_files = sorted([f for f in files if not is_runtime_file(f)])

        runtime_usage[route] = runtime_files
        if diagnostic_files:
            diagnostic_usage[route] = diagnostic_files

    return {
        "runtime_usage": runtime_usage,
        "diagnostic_usage": diagnostic_usage,
    }


# =========================
# 🔒 SECURITY / HOST / ROUTING
# =========================
def print_host_security_data() -> Dict[str, Any]:
    hosts_found: Dict[str, Set[str]] = defaultdict(set)
    origins_found: Dict[str, Set[str]] = defaultdict(set)
    api_refs: Set[str] = set()
    security_hits: Set[str] = set()

    for path in iter_project_files():
        rel = normalize_rel(path)
        content = safe_read(path)
        if not content:
            continue

        for match in HOST_LITERAL_PATTERN.finditer(content):
            hosts_found[match.group(1)].add(rel)

        for match in ORIGIN_LITERAL_PATTERN.finditer(content):
            origins_found[match.group(1)].add(rel)

        for pattern in [
            "requireAllowedHost",
            "isAllowedHost",
            "/api/register",
            "/api/setup",
            "/api/gear/kayaks",
            "/api/gear/items",
        ]:
            if pattern in content:
                api_refs.add(f"{rel} :: {pattern}")

        for pattern in [
            "req.headers.host",
            "req.headers.origin",
            "req.headers.referer",
            "Access-Control-Allow-Origin",
            "ALLOWED_HOSTS",
            "ALLOWED_ORIGINS",
            "invoker",
            "run.googleapis.com/invoker-iam-disabled",
        ]:
            if pattern in content:
                security_hits.add(f"{rel} :: {pattern}")

    return {
        "hosts_found": {k: sorted(v) for k, v in sorted(hosts_found.items())},
        "origins_found": {k: sorted(v) for k, v in sorted(origins_found.items())},
        "api_refs": sorted(api_refs),
        "security_hits": sorted(security_hits),
    }


# =========================
# 🔥 FIRESTORE
# =========================
def normalize_index_field_sequence(fields: List[str]) -> Tuple[str, ...]:
    return tuple(field for field in fields if field)


def extract_firestore_query_candidates(content: str) -> List[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []

    for match in FIRESTORE_QUERY_START_PATTERN.finditer(content):
        collection_kind = match.group(1)
        collection_name = match.group(2)

        start = match.start()
        end = min(len(content), start + 1200)
        snippet = content[start:end]

        terminators = []
        for token in [";\n", ";\r\n", "\n\n", "\r\n\r\n"]:
            idx = snippet.find(token)
            if idx != -1:
                terminators.append(idx)
        if terminators:
            snippet = snippet[:min(terminators) + 1]

        where_matches = FIRESTORE_WHERE_PATTERN.findall(snippet)
        order_matches = FIRESTORE_ORDERBY_PATTERN.findall(snippet)
        has_limit = bool(FIRESTORE_LIMIT_PATTERN.search(snippet))

        where_fields = [field for field, _op in where_matches]
        where_ops = [op for _field, op in where_matches]
        order_fields = [field for field, _direction in order_matches]

        has_range = any(op in INDEX_RANGE_OPERATORS for op in where_ops)

        requires_index = False
        reason_parts: List[str] = []

        if len(where_fields) >= 2:
            requires_index = True
            reason_parts.append("2+ where")
        if where_fields and order_fields:
            requires_index = True
            reason_parts.append("where + orderBy")
        if has_range and (len(where_fields) >= 2 or bool(order_fields)):
            requires_index = True
            reason_parts.append("range query")
        if collection_kind == "collectionGroup" and (len(where_fields) >= 2 or order_fields):
            requires_index = True
            reason_parts.append("collectionGroup composite")
        if has_limit and len(where_fields) >= 2:
            reason_parts.append("limit")

        fields_for_index: List[str] = []
        seen: Set[str] = set()
        for field in where_fields + order_fields:
            if field not in seen:
                fields_for_index.append(field)
                seen.add(field)

        line_no = content.count("\n", 0, start) + 1

        candidates.append({
            "collection_kind": collection_kind,
            "collection": collection_name,
            "line": line_no,
            "where_fields": where_fields,
            "where_ops": where_ops,
            "order_fields": order_fields,
            "has_limit": has_limit,
            "requires_index": requires_index,
            "reason": ", ".join(reason_parts) if reason_parts else "simple query",
            "fields_for_index": normalize_index_field_sequence(fields_for_index),
            "snippet": " ".join(snippet.split())[:280],
        })

    return candidates


def load_declared_firestore_indexes() -> Dict[str, Any]:
    path = Path(PROJECT_ROOT) / "firestore.indexes.json"
    result: Dict[str, Any] = {
        "exists": path.exists(),
        "path": str(path).replace("\\", "/"),
        "raw_indexes": [],
        "normalized": set(),
        "error": None,
    }

    if not path.exists():
        return result

    content = safe_read(path)
    if not content:
        result["error"] = "could not read file"
        return result

    try:
        data = json.loads(content)
    except Exception as e:
        result["error"] = f"invalid JSON: {e}"
        return result

    indexes = data.get("indexes", [])
    if not isinstance(indexes, list):
        result["error"] = "indexes is not a list"
        return result

    result["raw_indexes"] = indexes

    normalized: Set[Tuple[str, Tuple[str, ...]]] = set()

    for idx in indexes:
        if not isinstance(idx, dict):
            continue

        collection_group = idx.get("collectionGroup")
        fields = idx.get("fields", [])

        if not collection_group or not isinstance(fields, list):
            continue

        ordered_fields = []
        for field in fields:
            if not isinstance(field, dict):
                continue
            field_path = field.get("fieldPath")
            if isinstance(field_path, str) and field_path != "__name__":
                ordered_fields.append(field_path)

        normalized.add((collection_group, normalize_index_field_sequence(ordered_fields)))

    result["normalized"] = normalized
    return result


def collect_firestore_query_index_requirements() -> Dict[str, Any]:
    detected_queries: List[Dict[str, Any]] = []

    for path in iter_project_files():
        rel = normalize_rel(path)
        if not is_backend_runtime_file(rel):
            continue

        content = safe_read(path)
        if not content:
            continue

        queries = extract_firestore_query_candidates(content)
        for query in queries:
            query["source"] = rel
            detected_queries.append(query)

    likely_requirements: Dict[Tuple[str, Tuple[str, ...]], List[Dict[str, Any]]] = {}

    for query in detected_queries:
        fields_for_index = query.get("fields_for_index", ())
        if query.get("requires_index") and fields_for_index:
            key = (query["collection"], fields_for_index)
            likely_requirements.setdefault(key, []).append(query)

    declared = load_declared_firestore_indexes()
    declared_normalized: Set[Tuple[str, Tuple[str, ...]]] = declared.get("normalized", set())

    missing: Dict[Tuple[str, Tuple[str, ...]], List[Dict[str, Any]]] = {}
    covered: Dict[Tuple[str, Tuple[str, ...]], List[Dict[str, Any]]] = {}

    for key, queries in likely_requirements.items():
        if key in declared_normalized:
            covered[key] = queries
        else:
            missing[key] = queries

    return {
        "detected_queries": detected_queries,
        "likely_requirements": likely_requirements,
        "declared": declared,
        "missing": missing,
        "covered": covered,
    }


def collect_firestore_summary() -> Dict[str, Any]:
    collections: Dict[str, Set[str]] = defaultdict(set)
    docs: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = normalize_rel(path)
        content = safe_read(path)
        if not content:
            continue

        for pattern in FIRESTORE_COLLECTION_PATTERNS:
            for match in re.finditer(pattern, content):
                collection = match.group(1)
                collections[collection].add(rel)

        for pattern in FIRESTORE_DOC_PATTERNS:
            for match in re.finditer(pattern, content):
                if len(match.groups()) >= 2:
                    collection = match.group(1)
                    doc_id = match.group(2)
                    docs[f"{collection}/{doc_id}"].add(rel)

    return {
        "collections": {k: sorted(v) for k, v in sorted(collections.items())},
        "docs": {k: sorted(v) for k, v in sorted(docs.items())},
    }


# =========================
# 🔗 SHARED CONTRACTS / DEPENDENCIES
# =========================
def collect_dependency_summary(files_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    files_with_many_imports = []
    imported_by: Dict[str, Set[str]] = defaultdict(set)

    for f in files_data:
        imports = f.get("imports", [])
        if len(imports) >= 2:
            files_with_many_imports.append({
                "path": f["path"],
                "imports_count": len(imports),
            })

        for imp in imports:
            imported_by[imp].add(f["path"])

    shared_imports = []
    for imp, used_by in imported_by.items():
        if len(used_by) >= 2:
            shared_imports.append({
                "module": imp,
                "used_by_count": len(used_by),
                "used_by": sorted(used_by),
            })

    files_with_many_imports.sort(key=lambda x: x["imports_count"], reverse=True)
    shared_imports.sort(key=lambda x: x["used_by_count"], reverse=True)

    return {
        "files_with_many_imports": files_with_many_imports[:50],
        "shared_imports": shared_imports[:50],
    }


def collect_shared_contracts() -> Dict[str, List[str]]:
    out: Dict[str, List[str]] = {}

    for token in SHARED_CONTRACT_PATTERNS:
        hits = []
        for path in iter_project_files():
            rel = normalize_rel(path)
            content = safe_read(path)
            if content and token in content:
                hits.append(rel)
        if hits:
            out[token] = sorted(hits)

    return out


# =========================
# 🧱 DUPLIKACJA
# =========================
def iter_blocks(lines: List[str], min_len: int = 6, max_len: int = 14):
    for block_len in range(min_len, max_len + 1):
        for i in range(0, len(lines) - block_len + 1):
            block = "\n".join(lines[i:i + block_len]).strip()
            if not block:
                continue
            yield block_len, i + 1, i + block_len, block


def looks_meaningful_duplicate(block: str) -> bool:
    s = block.strip()
    if len(s) < 80:
        return False
    if s.count("\n") < 2:
        return False
    if s.startswith('"') or s.startswith("'"):
        return False
    return True


def collect_duplication_summary(limit: int = 30) -> List[Dict[str, Any]]:
    blocks_index: Dict[str, Dict[str, Any]] = {}

    for path in iter_project_files():
        rel = normalize_rel(path)
        if is_audit_tool_file(rel):
            continue

        content = safe_read(path)
        if not content:
            continue

        lines = content.splitlines()
        for block_len, start, end, block in iter_blocks(lines):
            if not looks_meaningful_duplicate(block):
                continue

            digest = md5_short(block)
            key = f"{block_len}:{digest}"

            item = blocks_index.setdefault(key, {
                "block_len": block_len,
                "block": block,
                "occurrences": [],
            })
            item["occurrences"].append({
                "path": rel,
                "start_line": start,
                "end_line": end,
            })

    out = []
    for item in blocks_index.values():
        unique_files = {o["path"] for o in item["occurrences"]}
        if len(item["occurrences"]) >= 3 and len(unique_files) >= 2:
            out.append({
                "occurrences": len(item["occurrences"]),
                "block_len": item["block_len"],
                "preview": "\n".join(item["block"].splitlines()[:3]),
                "occurrence_samples": item["occurrences"][:6],
            })

    out.sort(key=lambda x: (x["occurrences"], x["block_len"]), reverse=True)
    return out[:limit]


# =========================
# 🔁 LOOP + AWAIT RISK
# =========================
def collect_loop_await_risk(limit: int = 30) -> List[Dict[str, Any]]:
    out = []

    loop_pattern = re.compile(r"\bfor\s*\(")
    await_pattern = re.compile(r"\bawait\b")

    for path in iter_project_files():
        rel = normalize_rel(path)
        if not is_runtime_file(rel):
            continue

        content = safe_read(path)
        if not content:
            continue

        lines = content.splitlines()
        for idx, line in enumerate(lines, 1):
            if loop_pattern.search(line) or await_pattern.search(line):
                stripped = line.strip()
                if "for (" in stripped or "await " in stripped:
                    out.append({
                        "path": rel,
                        "line": idx,
                        "snippet": stripped[:220],
                    })

    return out[:limit]


# =========================
# ⚠️ RYZYKO REFAKTORU
# =========================
def build_critical_files(files_data: List[Dict[str, Any]],
                         frontend_hotspots: List[Dict[str, Any]],
                         backend_hotspots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    fh_map = {x["path"]: x for x in frontend_hotspots}
    bh_map = {x["path"]: x for x in backend_hotspots}

    critical = []

    for f in files_data:
        path = f["path"]
        tags = []
        risk = 0

        if path == "functions/src/index.ts":
            tags += ["backend_runtime", "browser_route_related", "env_auth_critical", "firestore_related", "invoker_related", "security_critical"]
            risk += 10

        if path == "public/core/render_shell.js":
            tags += ["frontend_runtime", "browser_route_related"]
            risk += 11

        if path == "public/modules/gear_module.js":
            tags += ["frontend_runtime", "browser_route_related"]
            risk += 8

        if path == "functions/src/api/registerUserHandler.ts":
            tags += ["backend_runtime", "endpoint_critical", "firestore_related", "security_critical"]
            risk += 8

        if path == "firebase.json":
            tags += ["hosting_critical", "browser_route_related", "routing_critical", "invoker_related"]
            risk += 4

        if path == "firestore.indexes.json":
            tags += ["firestore_index_critical"]
            risk += 4

        if path == "public/core/firebase_client.js":
            tags += ["frontend_runtime", "env_auth_critical"]
            risk += 6

        if path.startswith("functions/src/api/") and path.endswith(".ts"):
            tags += ["backend_runtime", "endpoint_critical", "security_critical"]
            risk += 7

        if path.startswith("functions/src/modules/equipment/"):
            tags += ["backend_runtime", "firestore_related"]
            risk += 7

        if is_audit_tool_file(path):
            tags += ["audit_tool"]
            risk += 0

        if path in fh_map and fh_map[path]["score"] >= 80:
            if "frontend_runtime" not in tags:
                tags.append("frontend_runtime")
            risk += 0

        if path in bh_map and bh_map[path]["score"] >= 60:
            if "backend_runtime" not in tags:
                tags.append("backend_runtime")
            risk += 0

        if tags:
            level = "HIGH" if risk >= 10 else "MEDIUM" if risk >= 6 else "LOW"
            critical.append({
                "path": path,
                "risk_score": risk,
                "risk_level": level,
                "tags": sorted(set(tags)),
            })

    critical.sort(key=lambda x: (-x["risk_score"], x["path"]))
    return critical


def build_refactor_risk_summary(critical_files: List[Dict[str, Any]]) -> Dict[str, Any]:
    buckets = {"HIGH": [], "MEDIUM": [], "LOW": []}
    for item in critical_files:
        buckets[item["risk_level"]].append(item)

    return {
        "counts": {k: len(v) for k, v in buckets.items()},
        "highest_risk_files": critical_files[:50],
        "safe_zone": sorted([
            x["path"] for x in critical_files
            if x["risk_level"] == "LOW" and "audit_tool" not in x["tags"]
        ]),
        "medium_zone": sorted([
            x["path"] for x in critical_files
            if x["risk_level"] == "MEDIUM" and "audit_tool" not in x["tags"]
        ]),
        "high_zone": sorted([
            x["path"] for x in critical_files
            if x["risk_level"] == "HIGH" and "audit_tool" not in x["tags"]
        ]),
    }


# =========================
# ⚡ QUICK WINS / PRIORYTETY
# =========================
def build_quick_wins(frontend_hotspots: List[Dict[str, Any]],
                     backend_hotspots: List[Dict[str, Any]],
                     large_functions: List[Dict[str, Any]],
                     duplication: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    wins = []

    for item in frontend_hotspots[:5]:
        wins.append({
            "priority": "P1",
            "kind": "frontend_hotspot",
            "path": item["path"],
            "reason": {
                "score": item["score"],
                "dom_queries": item["dom_queries"],
                "listeners": item["listeners"],
                "innerHTML": item["innerHTML"],
            },
        })

    for item in backend_hotspots[:5]:
        wins.append({
            "priority": "P1",
            "kind": "backend_hotspot",
            "path": item["path"],
            "reason": {
                "score": item["score"],
                "firestore_ops": item["firestore_ops"],
            },
        })

    for item in large_functions[:5]:
        if is_runtime_file(item["path"]):
            wins.append({
                "priority": "P2",
                "kind": "large_function",
                "path": item["path"],
                "reason": {
                    "function": item["function"],
                    "length": item["length"],
                },
            })

    for item in duplication[:5]:
        sample = item["occurrence_samples"][0]
        wins.append({
            "priority": "P3",
            "kind": "duplicate_block",
            "path": sample["path"],
            "reason": {
                "occurrences": item["occurrences"],
                "block_len": item["block_len"],
            },
        })

    return wins[:20]


# =========================
# ☁️ FIREBASE / CLOUD RUN / ENV
# =========================
def load_json_file(path_str: str) -> Optional[Dict[str, Any]]:
    path = Path(PROJECT_ROOT) / path_str
    if not path.exists():
        return None
    content = safe_read(path)
    if not content:
        return None
    try:
        return json.loads(content)
    except Exception:
        return None


def get_firebaserc_summary() -> Dict[str, Any]:
    data = load_json_file(".firebaserc")
    if not data:
        return {"exists": False, "projects": {}}

    return {
        "exists": True,
        "projects": data.get("projects", {}) if isinstance(data, dict) else {},
    }


def get_firebase_json_summary() -> Dict[str, Any]:
    data = load_json_file("firebase.json")
    if not data:
        return {"exists": False}

    hosting = data.get("hosting", {}) if isinstance(data, dict) else {}
    rewrites = hosting.get("rewrites", []) if isinstance(hosting, dict) else []
    headers = hosting.get("headers", []) if isinstance(hosting, dict) else []
    functions_cfg = data.get("functions")
    firestore_cfg = data.get("firestore")

    functions_summary = []
    if isinstance(functions_cfg, list):
        for item in functions_cfg:
            if isinstance(item, dict):
                functions_summary.append({
                    "source": item.get("source"),
                    "invoker": item.get("invoker"),
                })
    elif isinstance(functions_cfg, dict):
        functions_summary.append({
            "source": functions_cfg.get("source"),
            "invoker": functions_cfg.get("invoker"),
        })

    return {
        "exists": True,
        "rewrites": rewrites,
        "headers": headers,
        "functions_present": functions_cfg is not None,
        "functions_summary": functions_summary,
        "firestore_present": firestore_cfg is not None,
        "firestore_indexes_path": firestore_cfg.get("indexes") if isinstance(firestore_cfg, dict) else None,
    }


def get_frontend_firebase_summary() -> Dict[str, Any]:
    path = Path(PROJECT_ROOT) / "public" / "core" / "firebase_client.js"
    if not path.exists():
        return {"exists": False}

    content = safe_read(path) or ""
    project_ids = sorted(set(re.findall(r'projectId:\s*["\']([^"\']+)["\']', content)))
    auth_domains = sorted(set(re.findall(r'authDomain:\s*["\']([^"\']+)["\']', content)))
    host_checks = sorted(set(re.findall(r'host\s*===\s*["\']([^"\']+)["\']', content)))

    return {
        "exists": True,
        "projectIds": project_ids,
        "authDomains": auth_domains,
        "hostChecks": host_checks,
    }


def get_env_summary() -> Dict[str, Any]:
    env_files = {}
    env_usage: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = normalize_rel(path)

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
            env_usage[env_name].add(rel)

    return {
        "env_files": env_files,
        "env_usage": {k: sorted(v) for k, v in sorted(env_usage.items())},
    }


def get_cloud_run_yaml_summary() -> Dict[str, Any]:
    yaml_files = []
    for path in iter_project_files():
        rel = normalize_rel(path)
        if rel.endswith(".yaml") or rel.endswith(".yml"):
            if Path(rel).name.endswith(".yaml") and "getgear" in Path(rel).name.lower():
                yaml_files.append(rel)

    return {
        "yaml_files": sorted(yaml_files),
    }


# =========================
# 📝 RAPORT JSON
# =========================
def build_json_report() -> Dict[str, Any]:
    files_data = collect_file_data()

    git_summary = get_git_summary()
    project_summary = build_project_summary(files_data)
    top_files = top_files_by_lines(files_data)
    file_complexity = file_size_complexity_summary(files_data)
    large_functions = large_functions_summary(files_data)

    frontend_hotspots = collect_frontend_hotspots(files_data)
    backend_hotspots = collect_backend_hotspots(files_data)

    routes = collect_http_routes()
    route_split = split_route_usage(routes)

    firestore_summary = collect_firestore_summary()
    firestore_index_check = collect_firestore_query_index_requirements()

    firebaserc_summary = get_firebaserc_summary()
    firebase_json_summary = get_firebase_json_summary()
    frontend_firebase_summary = get_frontend_firebase_summary()
    env_summary = get_env_summary()
    cloud_run_yaml_summary = get_cloud_run_yaml_summary()

    host_security_summary = print_host_security_data()
    dependency_summary = collect_dependency_summary(files_data)
    shared_contracts = collect_shared_contracts()
    duplication_summary = collect_duplication_summary()
    loop_await_risk = collect_loop_await_risk()

    critical_files = build_critical_files(files_data, frontend_hotspots, backend_hotspots)
    refactor_risk = build_refactor_risk_summary(critical_files)
    quick_wins = build_quick_wins(frontend_hotspots, backend_hotspots, large_functions, duplication_summary)

    biggest_frontend_problem = frontend_hotspots[0]["path"] if frontend_hotspots else None
    biggest_backend_problem = backend_hotspots[0]["path"] if backend_hotspots else None
    largest_function = large_functions[0] if large_functions else None

    runtime_top_files = [
        f for f in top_files
        if is_runtime_file(f["path"])
    ][:25]

    runtime_large_functions = [
        f for f in large_functions
        if is_runtime_file(f["path"])
    ][:25]

    runtime_only_frontend_hotspots = frontend_hotspots[:15]
    runtime_only_backend_hotspots = backend_hotspots[:15]

    return {
        "rules": RULES.strip(),
        "executive_summary": {
            "biggest_frontend_problem": biggest_frontend_problem,
            "biggest_backend_problem": biggest_backend_problem,
            "largest_function": largest_function,
        },
        "git_summary": git_summary,
        "project_summary": project_summary,
        "top_files_by_line_count": top_files,
        "runtime_top_files_by_line_count": runtime_top_files,
        "file_size_complexity_summary": file_complexity,
        "large_functions_summary": large_functions,
        "runtime_large_functions_summary": runtime_large_functions,
        "frontend_hotspots_summary": frontend_hotspots,
        "backend_hotspots_summary": backend_hotspots,
        "runtime_route_usage_summary": route_split["runtime_usage"],
        "diagnostic_route_usage_summary": route_split["diagnostic_usage"],
        "render_dom_risk_summary": [
            {
                "path": x["path"],
                "innerHTML": x["innerHTML"],
                "dom_queries": x["dom_queries"],
                "listeners": x["listeners"],
            }
            for x in frontend_hotspots[:10]
        ],
        "firestore_summary": firestore_summary,
        "firestore_index_check": {
            "declared": {
                "exists": firestore_index_check["declared"]["exists"],
                "path": firestore_index_check["declared"]["path"],
                "count": len(firestore_index_check["declared"].get("normalized", set())),
            },
            "missing": [
                {
                    "collection": collection,
                    "fields": list(fields),
                    "queries": queries,
                }
                for (collection, fields), queries in sorted(firestore_index_check["missing"].items())
            ],
            "covered": [
                {
                    "collection": collection,
                    "fields": list(fields),
                    "queries": queries,
                }
                for (collection, fields), queries in sorted(firestore_index_check["covered"].items())
            ],
        },
        "firebaserc_summary": firebaserc_summary,
        "firebase_json_summary": firebase_json_summary,
        "cloud_run_yaml_summary": cloud_run_yaml_summary,
        "frontend_firebase_summary": frontend_firebase_summary,
        "env_summary": env_summary,
        "host_api_security_summary": host_security_summary,
        "dependency_summary": dependency_summary,
        "shared_data_contracts": shared_contracts,
        "critical_files": critical_files,
        "refactor_risk_summary": refactor_risk,
        "safe_medium_high_risk_zones": {
            "safe": refactor_risk["safe_zone"],
            "medium": refactor_risk["medium_zone"],
            "high": refactor_risk["high_zone"],
        },
        "browser_route_risk_summary": firebase_json_summary.get("rewrites", []),
        "duplication_summary": duplication_summary,
        "possible_loop_await_risk_summary": loop_await_risk,
        "priority_plan_for_ai_developer": quick_wins,
        "manual_review_targets": {
            "review_first": [
                "highest frontend hotspot",
                "highest backend hotspot",
                "largest runtime functions",
                "Firestore-heavy services",
                "browser-facing endpoint chain: firebase.json -> function -> Cloud Run",
                "shared contracts before any rename",
            ],
            "constraints": [
                "do NOT change business logic by default",
                "do NOT redesign UX by default",
                "do NOT refactor high-risk files from partial snippets",
                "optimize by reducing waste, not by changing intended behavior",
            ],
        },
    }


# =========================
# 🖨️ RAPORT TXT
# =========================
def render_text_report(report: Dict[str, Any]) -> str:
    out: List[str] = []

    def add(line: str = ""):
        out.append(line)

    add("🔍 Building AI developer optimization audit...")
    add("")
    add("=" * 80)
    add(report["rules"])
    add("=" * 80)
    add("")

    exec_sum = report["executive_summary"]
    add("=== EXECUTIVE SUMMARY ===")
    add("")
    add(f"- biggest_frontend_problem: {exec_sum.get('biggest_frontend_problem')}")
    add(f"- biggest_backend_problem: {exec_sum.get('biggest_backend_problem')}")
    lf = exec_sum.get("largest_function")
    if lf:
        add(f"- largest_function: {lf['path']} :: {lf['function']} :: len={lf['length']}")
    else:
        add("- largest_function: none")
    add("")

    git = report["git_summary"]
    add("=== GIT SUMMARY ===")
    add("")
    add(f"- current branch: {git['current_branch']}")
    add(f"- HEAD short hash: {git['head_short_hash']}")
    add(f"- last commit: {git['last_commit']}")
    add("- git status:")
    if git["status_lines"]:
        for line in git["status_lines"]:
            add(f"  • {line}")
    else:
        add("  • working tree clean")
    add("")

    proj = report["project_summary"]
    add("=== PROJECT SUMMARY ===")
    add("")
    for scope, count in sorted(proj["counts_by_scope"].items()):
        add(f"- {scope}: {count} files")
    add(f"- total_files: {proj['total_files']}")
    add("")

    add("=== TOP FILES BY LINE COUNT ===")
    add("")
    for item in report["top_files_by_line_count"][:40]:
        add(f"- {item['path']} :: {item['line_count']} lines :: {item['scope']}")
    add("")

    add("=== RUNTIME TOP FILES BY LINE COUNT ===")
    add("")
    for item in report["runtime_top_files_by_line_count"][:25]:
        add(f"- {item['path']} :: {item['line_count']} lines :: {item['scope']}")
    add("")

    add("=== FILE SIZE / COMPLEXITY SUMMARY ===")
    add("")
    for item in report["file_size_complexity_summary"][:30]:
        add(f"- [{item['level']}] {item['path']} :: {item['line_count']} lines :: {item['scope']}")
    add("")

    add("=== LARGE FUNCTIONS SUMMARY ===")
    add("")
    for item in report["large_functions_summary"][:25]:
        add(
            f"- [{item['level']}] {item['path']} :: {item['function']} :: "
            f"lines {item['start_line']}-{item['end_line']} :: length={item['length']}"
        )
    add("")

    add("=== RUNTIME LARGE FUNCTIONS SUMMARY ===")
    add("")
    for item in report["runtime_large_functions_summary"][:25]:
        add(
            f"- [{item['level']}] {item['path']} :: {item['function']} :: "
            f"lines {item['start_line']}-{item['end_line']} :: length={item['length']}"
        )
    add("")

    add("=== FRONTEND HOTSPOTS SUMMARY ===")
    add("")
    for item in report["frontend_hotspots_summary"][:15]:
        add(f"- {item['path']} :: score={item['score']}")
        add(f"  • fetch/api calls: {item['fetch_api_calls']}")
        add(f"  • DOM queries: {item['dom_queries']}")
        add(f"  • event listeners: {item['listeners']}")
        add(f"  • innerHTML rebuilds: {item['innerHTML']}")
        add(f"  • array ops: {item['array_ops']}")
        add(f"  • timers: {item['timers']}")
    add("")

    add("=== BACKEND HOTSPOTS SUMMARY ===")
    add("")
    for item in report["backend_hotspots_summary"][:15]:
        add(f"- {item['path']} :: score={item['score']}")
        add(f"  • Firestore chain ops: {item['firestore_ops']}")
        add(f"  • array ops: {item['array_ops']}")
        add(f"  • console logs: {item['console_logs']}")
    add("")

    add("=== RUNTIME ROUTE USAGE SUMMARY ===")
    add("")
    for route, files in sorted(report["runtime_route_usage_summary"].items()):
        add(f"- {route}")
        for src in files:
            add(f"  • {src}")
    add("")

    add("=== DIAGNOSTIC / NON-RUNTIME ROUTE USAGE SUMMARY ===")
    add("")
    diagnostic_usage = report["diagnostic_route_usage_summary"]
    if diagnostic_usage:
        for route, files in sorted(diagnostic_usage.items()):
            add(f"- {route}")
            for src in files:
                add(f"  • {src}")
    else:
        add("- none")
    add("")

    add("=== RENDER / DOM RISK SUMMARY ===")
    add("")
    for item in report["render_dom_risk_summary"][:10]:
        add(f"- {item['path']}")
        add(f"  • innerHTML assignments: {item['innerHTML']}")
        add(f"  • DOM queries: {item['dom_queries']}")
        add(f"  • addEventListener: {item['listeners']}")
    add("")

    add("=== FIRESTORE SUMMARY ===")
    add("")
    fs_sum = report["firestore_summary"]

    add("- collections:")
    for collection, files in fs_sum["collections"].items():
        add(f"  • {collection}")
        for src in files[:10]:
            add(f"      - {src}")

    add("")
    add("- documents:")
    for doc_path, files in fs_sum["docs"].items():
        add(f"  • {doc_path}")
        for src in files[:10]:
            add(f"      - {src}")
    add("")

    add("=== FIRESTORE INDEX CHECK ===")
    add("")
    fs_idx = report["firestore_index_check"]
    add(f"- firestore.indexes.json present: {fs_idx['declared']['exists']}")
    add(f"- declared composite indexes: {fs_idx['declared']['count']}")
    add("")
    add("- missing index declarations:")
    if fs_idx["missing"]:
        for item in fs_idx["missing"]:
            add(f"  • {item['collection']} :: {' + '.join(item['fields'])}")
            for q in item["queries"][:5]:
                add(f"      - missing for: {q['source']}:{q['line']} ({q['reason']})")
                add(f"        snippet: {q['snippet']}")
    else:
        add("  • none")
    add("")
    add("- covered index declarations:")
    if fs_idx["covered"]:
        for item in fs_idx["covered"]:
            add(f"  • {item['collection']} :: {' + '.join(item['fields'])}")
            for q in item["queries"][:5]:
                add(f"      - covered query: {q['source']}:{q['line']}")
    else:
        add("  • none")
    add("")

    add("=== FIREBASERC SUMMARY ===")
    add("")
    firebaserc = report["firebaserc_summary"]
    add(f"- exists: {firebaserc['exists']}")
    if firebaserc["exists"]:
        for k, v in firebaserc["projects"].items():
            add(f"  • {k} -> {v}")
    add("")

    add("=== FIREBASE.JSON SUMMARY ===")
    add("")
    fj = report["firebase_json_summary"]
    add(f"- exists: {fj['exists']}")
    if fj["exists"]:
        add("- rewrites:")
        for rw in fj["rewrites"]:
            add(f"  • {rw}")
        add("- headers:")
        for h in fj["headers"]:
            add(f"  • {h}")
        add(f"- functions config present: {fj['functions_present']}")
        for i, fn in enumerate(fj["functions_summary"], 1):
            add(f"  • functions[{i}] source: {fn.get('source')}")
            add(f"    - invoker: {fn.get('invoker')}")
        add(f"- firestore config present: {fj['firestore_present']}")
        add(f"  • firestore.indexes path: {fj['firestore_indexes_path']}")
    add("")

    add("=== CLOUD RUN YAML SUMMARY ===")
    add("")
    yaml_sum = report["cloud_run_yaml_summary"]
    if yaml_sum["yaml_files"]:
        for path in yaml_sum["yaml_files"]:
            add(f"- {path}")
    else:
        add("- no exported Cloud Run YAML files found")
        add("  • export manually when needed:")
        add("    gcloud run services describe SERVICE --region=us-central1 --format=export > service.yaml")
    add("")

    add("=== FRONTEND FIREBASE SUMMARY ===")
    add("")
    ff = report["frontend_firebase_summary"]
    add(f"- exists: {ff['exists']}")
    if ff["exists"]:
        add("- projectIds:")
        for x in ff["projectIds"]:
            add(f"  • {x}")
        add("- authDomains:")
        for x in ff["authDomains"]:
            add(f"  • {x}")
        add("- host checks:")
        for x in ff["hostChecks"]:
            add(f"  • {x}")
    add("")

    add("=== ENV SUMMARY ===")
    add("")
    env = report["env_summary"]
    add("- ENV files detected:")
    if env["env_files"]:
        for file_name, keys in env["env_files"].items():
            add(f"  • {file_name}")
            for key in keys:
                add(f"      - {key}")
    else:
        add("  • none")
    add("")
    add("- process.env usage detected:")
    for key, files in env["env_usage"].items():
        add(f"  • {key}")
        for src in files:
            add(f"      - {src}")
    add("")

    hs = report["host_api_security_summary"]
    add("=== HOST / API / SECURITY SUMMARY ===")
    add("")
    add("- Host literals detected:")
    for host, files in hs["hosts_found"].items():
        add(f"  • {host}")
        for src in files[:10]:
            add(f"      - {src}")
    add("")
    add("- Origin literals detected:")
    for origin, files in hs["origins_found"].items():
        add(f"  • {origin}")
        for src in files[:10]:
            add(f"      - {src}")
    add("")
    add("- API/security references:")
    for item in hs["api_refs"][:100]:
        add(f"  • {item}")
    add("")
    add("- Header/host/origin checks:")
    for item in hs["security_hits"][:100]:
        add(f"  • {item}")
    add("")

    dep = report["dependency_summary"]
    add("=== DEPENDENCY SUMMARY ===")
    add("")
    add("- files with many imports:")
    for item in dep["files_with_many_imports"][:50]:
        add(f"  • {item['path']} :: imports={item['imports_count']}")
    add("")
    add("- shared imported modules / paths:")
    for item in dep["shared_imports"][:50]:
        add(f"  • {item['module']} :: used_by={item['used_by_count']}")
    add("")

    add("=== SHARED DATA CONTRACTS ===")
    add("")
    for token, files in report["shared_data_contracts"].items():
        add(f"- {token}")
        for src in files[:12]:
            add(f"  • {src}")
    add("")

    add("=== CRITICAL FILES / TAGS ===")
    add("")
    for item in report["critical_files"][:50]:
        add(f"- {item['path']}")
        add(f"  • risk={item['risk_level']} ({item['risk_score']})")
        add(f"  • tags={','.join(item['tags'])}")
    add("")

    add("=== REFACTOR RISK SUMMARY ===")
    add("")
    rr = report["refactor_risk_summary"]
    add(f"- HIGH: {rr['counts']['HIGH']}")
    add(f"- MEDIUM: {rr['counts']['MEDIUM']}")
    add(f"- LOW: {rr['counts']['LOW']}")
    add("")
    add("- highest risk files:")
    for item in rr["highest_risk_files"][:50]:
        add(f"  • {item['path']} :: {item['risk_level']} ({item['risk_score']})")
    add("")

    zones = report["safe_medium_high_risk_zones"]
    add("=== SAFE / MEDIUM / HIGH RISK ZONES ===")
    add("")
    add("- SAFE TO OPTIMIZE FIRST:")
    for item in zones["safe"]:
        add(f"  • {item}")
    add("")
    add("- MEDIUM RISK:")
    for item in zones["medium"]:
        add(f"  • {item}")
    add("")
    add("- HIGH RISK / FULL FILE REVIEW REQUIRED:")
    for item in zones["high"]:
        add(f"  • {item}")
    add("")

    add("=== BROWSER ROUTE RISK SUMMARY ===")
    add("")
    for rw in report["browser_route_risk_summary"]:
        if isinstance(rw, dict):
            add(f"  • {rw.get('source')} -> {rw.get('function', {}).get('functionId')} ({rw.get('function', {}).get('region')})")
    add("")
    add("- rule:")
    add("  • browser-facing routes should prefer stable module gateways")
    add("  • do not add new standalone browser-facing functions without checking Cloud Run access model")
    add("  • for each browser-facing endpoint compare: firebase.json rewrite, onRequest invoker, deployed Cloud Run config")
    add("")

    add("=== DUPLICATION SUMMARY ===")
    add("")
    for item in report["duplication_summary"][:25]:
        add(f"- duplicate block candidate (occurrences: {item['occurrences']}, lines: {item['block_len']})")
        for occ in item["occurrence_samples"]:
            add(f"  • {occ['path']}:{occ['start_line']}-{occ['end_line']}")
        add(f"  • preview: {item['preview']}")
    add("")

    add("=== POSSIBLE LOOP + AWAIT RISK SUMMARY ===")
    add("")
    for item in report["possible_loop_await_risk_summary"][:30]:
        add(f"- {item['path']}:{item['line']} :: {item['snippet']}")
    add("")

    add("=== PRIORITY PLAN FOR AI DEVELOPER ===")
    add("")
    for item in report["priority_plan_for_ai_developer"]:
        add(f"- {item['priority']} :: {item['kind']} :: {item['path']}")
        add(f"  • reason: {item['reason']}")
    add("")

    m = report["manual_review_targets"]
    add("=== MANUAL REVIEW TARGETS FOR AI DEVELOPER ===")
    add("")
    add("- Review first:")
    for item in m["review_first"]:
        add(f"  • {item}")
    add("")
    add("- Constraints:")
    for item in m["constraints"]:
        add(f"  • {item}")
    add("")
    add("=" * 80)
    add("END OF AI OPTIMIZATION AUDIT")
    add("=" * 80)

    return "\n".join(out)


# =========================
# 💾 ZAPIS
# =========================
def write_outputs(report: Dict[str, Any], text_report: str):
    txt_path = Path(PROJECT_ROOT) / OUTPUT_TXT
    json_path = Path(PROJECT_ROOT) / OUTPUT_JSON

    txt_path.write_text(text_report, encoding="utf-8")
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[OK] TXT report written to: {OUTPUT_TXT}")
    print(f"[OK] JSON report written to: {OUTPUT_JSON}")


# =========================
# ▶ MAIN
# =========================
def print_audit():
    print("🔍 Building AI developer optimization audit...\n")
    report = build_json_report()
    text_report = render_text_report(report)
    print(text_report)
    print()
    write_outputs(report, text_report)


if __name__ == "__main__":
    print_audit()
