"""
PROJECT AI OPTIMIZATION AUDIT — MORZKULC APP

KOMPLEKSOWY SKRYPT POD AI DEVELOPERA I OPTYMALIZACJĘ

CEL
- Ograniczyć halucynacje AI developera.
- Ograniczyć refaktor na ślepo.
- Wskazać realne bottlenecks i miejsca do optymalizacji.
- Nie zmieniać logiki biznesowej ani UX bez potrzeby.
- Przygotować raport tekstowy + JSON jako wejście dla AI developera.

OUTPUT
- console
- ai_audit_report.txt
- ai_audit_report.json
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


# =========================================================
# CONFIG
# =========================================================
PROJECT_ROOT = "."
TEXT_OUTPUT_PATH = "ai_audit_report.txt"
JSON_OUTPUT_PATH = "ai_audit_report.json"

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
    "lib",  # functions/lib = compiled output
}

EXCLUDE_EXACT_FILES = {
    "PROJECT_MAP.txt",
}

ANY_CODE_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx"}
FRONTEND_CODE_EXTS = {".js", ".jsx", ".ts", ".tsx"}

LONG_FILE_WARN_LINES = 450
VERY_LONG_FILE_WARN_LINES = 800
LONG_FUNCTION_WARN_LINES = 80
VERY_LONG_FUNCTION_WARN_LINES = 140

DUPLICATION_MIN_LINES = 6
DUPLICATION_WINDOW_MAX = 14

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
    "/api/gear/my-reservations",
    "/api/gear/reservations/create",
    "/api/gear/reservations/update",
    "/api/gear/reservations/cancel",
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
    "invoker",
    "run.googleapis.com/invoker-iam-disabled",
    "firestore.indexes.json",
    "collectionGroup",
    ".orderBy(",
    ".where(",
]

FETCH_PATTERNS = [
    r"\bfetch\(",
    r"\bapiGetJson\(",
    r"\bapiPostJson\(",
]

DOM_QUERY_PATTERNS = [
    r"\bdocument\.getElementById\(",
    r"\bdocument\.querySelector\(",
    r"\bdocument\.querySelectorAll\(",
    r"\bviewEl\.querySelector\(",
    r"\bviewEl\.querySelectorAll\(",
]

LISTENER_PATTERNS = [
    r"\.addEventListener\(",
]

HTML_REBUILD_PATTERNS = [
    r"\.innerHTML\s*=",
]

ARRAY_OP_PATTERNS = [
    r"\.map\(",
    r"\.filter\(",
    r"\.reduce\(",
    r"\.sort\(",
    r"\.find\(",
    r"\.some\(",
    r"\.every\(",
]

TIMER_PATTERNS = [
    r"\bsetTimeout\(",
    r"\bsetInterval\(",
    r"\brequestAnimationFrame\(",
]

CONSOLE_PATTERNS = [
    r"\bconsole\.log\(",
    r"\bconsole\.warn\(",
    r"\bconsole\.error\(",
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

FUNCTION_DEF_PATTERNS = [
    re.compile(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\("),
    re.compile(r"(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>"),
]


# =========================================================
# RULES
# =========================================================
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
"""


# =========================================================
# OUTPUT WRITER
# =========================================================
class ReportWriter:
    def __init__(self):
        self.lines: List[str] = []

    def add(self, text: str = ""):
        self.lines.append(text)

    def section(self, title: str):
        self.add("")
        self.add(title)
        self.add("")

    def dump_console(self):
        print("\n".join(self.lines))

    def write_text(self, path: str):
        Path(path).write_text("\n".join(self.lines), encoding="utf-8")


# =========================================================
# HELPERS
# =========================================================
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

    if path.name.startswith(".env") or path.name in [".firebaserc", "firebase.json", "firestore.indexes.json"]:
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
        return "BACKEND_SOURCE"
    if rel.startswith("functions/lib/"):
        return "COMPILED"
    if rel.startswith("public/"):
        return "FRONTEND"
    if rel.startswith("archiwed/"):
        return "ARCHIVED"
    return "PROJECT"


def line_count(content: str) -> int:
    return len(content.splitlines())


def short_hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def count_matches(content: str, patterns: List[str]) -> int:
    total = 0
    for pattern in patterns:
        total += len(re.findall(pattern, content))
    return total


def normalize_index_field_sequence(fields: List[str]) -> Tuple[str, ...]:
    return tuple(field for field in fields if field)


def normalize_dup_line(line: str) -> str:
    s = line.strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r'["\'][^"\']{0,80}["\']', '"STR"', s)
    s = re.sub(r"\b\d+\b", "NUM", s)
    return s


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


# =========================================================
# PYTHON ANALYZER
# =========================================================
class PythonAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.imports: List[str] = []
        self.functions: List[Dict[str, Any]] = []
        self.classes: List[Dict[str, Any]] = []
        self.calls: List[str] = []

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append(alias.name)

    def visit_ImportFrom(self, node):
        module = node.module or ""
        for alias in node.names:
            self.imports.append(f"{module}.{alias.name}")

    def visit_FunctionDef(self, node):
        end_line = getattr(node, "end_lineno", node.lineno)
        self.functions.append({
            "name": node.name,
            "line": node.lineno,
            "end_line": end_line,
            "length": max(1, end_line - node.lineno + 1),
        })
        self.generic_visit(node)

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
        self.generic_visit(node)

    def visit_Call(self, node):
        try:
            if isinstance(node.func, ast.Name):
                self.calls.append(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                self.calls.append(node.func.attr)
        except Exception:
            pass
        self.generic_visit(node)


# =========================================================
# JS/TS ANALYZER
# =========================================================
def extract_js_ts_imports(content: str) -> List[str]:
    imports = []
    lines = content.splitlines()

    for line in lines:
        if match := re.search(r'import\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]', line):
            imports.append(match.group(1))
        elif match := re.search(r'import\s+[\'"]([^\'"]+)[\'"]', line):
            imports.append(match.group(1))
        elif match := re.search(r'(?:const|let|var)\s+.*\s*=\s*require\([\'"]([^\'"]+)[\'"]\)', line):
            imports.append(match.group(1))

    return list(dict.fromkeys(imports))


def extract_js_ts_functions(content: str) -> List[Dict[str, Any]]:
    lines = content.splitlines()
    out: List[Dict[str, Any]] = []

    i = 0
    while i < len(lines):
        line = lines[i]

        matched_name = None
        for pattern in FUNCTION_DEF_PATTERNS:
            m = pattern.search(line)
            if m:
                matched_name = m.group(1)
                break

        if matched_name:
            start = i + 1
            brace_balance = line.count("{") - line.count("}")
            j = i

            while j + 1 < len(lines):
                if brace_balance <= 0 and "{" not in line:
                    break
                j += 1
                brace_balance += lines[j].count("{") - lines[j].count("}")
                if brace_balance <= 0:
                    break

            end = max(start, j + 1)

            out.append({
                "name": matched_name,
                "line": start,
                "end_line": end,
                "length": max(1, end - start + 1),
            })

            i = j + 1
            continue

        i += 1

    return out


def extract_functions(path: Path, content: str) -> List[Dict[str, Any]]:
    ext = path.suffix.lower()

    if ext == ".py":
        try:
            tree = ast.parse(content)
            analyzer = PythonAnalyzer()
            analyzer.visit(tree)
            return analyzer.functions
        except Exception:
            return []

    if ext in {".js", ".jsx", ".ts", ".tsx"}:
        return extract_js_ts_functions(content)

    return []


# =========================================================
# RISK / CRITICALITY
# =========================================================
def is_runtime_critical(rel: str) -> bool:
    rel = rel.replace("\\", "/")

    critical_exact = {
        "firebase.json",
        ".firebaserc",
        "firestore.indexes.json",
        "functions/src/index.ts",
        "public/core/firebase_client.js",
        "public/core/app_shell.js",
        "public/core/render_shell.js",
    }

    if rel in critical_exact:
        return True

    if rel.startswith("functions/src/api/"):
        return True

    if rel.startswith("functions/src/modules/equipment/"):
        return True

    return False


def infer_critical_tags(rel: str, content: str) -> List[str]:
    tags = []
    rel_norm = rel.replace("\\", "/")

    if rel_norm == "firebase.json":
        tags.extend(["routing_critical", "hosting_critical"])

    if rel_norm == ".firebaserc":
        tags.append("environment_critical")

    if rel_norm == "firestore.indexes.json":
        tags.append("firestore_index_critical")

    if rel_norm.startswith("functions/src/"):
        tags.append("backend_runtime")

    if rel_norm.startswith("public/"):
        tags.append("frontend_runtime")

    if rel_norm.startswith("functions/src/api/"):
        tags.append("endpoint_critical")

    if "requireAllowedHost" in content or "ALLOWED_HOSTS" in content or "ALLOWED_ORIGINS" in content:
        tags.append("security_critical")

    if "/api/" in content or "onRequest(" in content:
        tags.append("browser_route_related")

    if ".collection(" in content or "collection(" in content:
        tags.append("firestore_related")

    if "initializeApp(" in content or "projectId:" in content or "authDomain:" in content:
        tags.append("env_auth_critical")

    if "invoker" in content:
        tags.append("invoker_related")

    return sorted(set(tags))


def compute_refactor_risk(rel: str, content: str, functions: List[Dict[str, Any]], imports_count: int) -> Tuple[str, int]:
    score = 0
    lc = line_count(content)

    if lc >= VERY_LONG_FILE_WARN_LINES:
        score += 5
    elif lc >= LONG_FILE_WARN_LINES:
        score += 3

    score += sum(1 for f in functions if f["length"] >= LONG_FUNCTION_WARN_LINES)

    if imports_count >= 12:
        score += 3
    elif imports_count >= 6:
        score += 2

    if is_runtime_critical(rel):
        score += 4

    rel_norm = rel.replace("\\", "/")

    if rel_norm.startswith("functions/src/api/"):
        score += 3

    if rel_norm.startswith("public/core/"):
        score += 2

    if rel_norm.startswith("functions/src/modules/equipment/"):
        score += 3

    if score >= 10:
        return "HIGH", score
    if score >= 5:
        return "MEDIUM", score
    return "LOW", score


# =========================================================
# COLLECTORS
# =========================================================
def collect_file_analysis() -> List[Dict[str, Any]]:
    rows = []

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        ext = path.suffix.lower()
        functions = extract_functions(path, content)

        imports_count = 0
        if ext == ".py":
            try:
                tree = ast.parse(content)
                analyzer = PythonAnalyzer()
                analyzer.visit(tree)
                imports_count = len(set(analyzer.imports))
            except Exception:
                imports_count = 0
        elif ext in {".js", ".jsx", ".ts", ".tsx"}:
            imports_count = len(extract_js_ts_imports(content))

        risk_level, risk_score = compute_refactor_risk(rel, content, functions, imports_count)

        row = {
            "file": rel,
            "scope": classify_file(rel),
            "lines": line_count(content),
            "imports_count": imports_count,
            "functions": functions,
            "functions_count": len(functions),
            "long_functions_count": sum(1 for f in functions if f["length"] >= LONG_FUNCTION_WARN_LINES),
            "critical_tags": infer_critical_tags(rel, content),
            "risk_level": risk_level,
            "risk_score": risk_score,
            "fetch_calls": count_matches(content, FETCH_PATTERNS),
            "dom_queries": count_matches(content, DOM_QUERY_PATTERNS),
            "listeners": count_matches(content, LISTENER_PATTERNS),
            "html_rebuilds": count_matches(content, HTML_REBUILD_PATTERNS),
            "array_ops": count_matches(content, ARRAY_OP_PATTERNS),
            "timers": count_matches(content, TIMER_PATTERNS),
            "console_logs": count_matches(content, CONSOLE_PATTERNS),
            "firestore_ops": count_matches(content, [
                r"\.collection\(",
                r"\.where\(",
                r"\.orderBy\(",
                r"\.limit\(",
                r"\.get\(",
                r"\.doc\(",
            ]),
        }

        rows.append(row)

    return rows


def build_dependency_maps() -> Dict[str, Any]:
    imports_by_file: Dict[str, List[str]] = {}
    imported_by: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        ext = path.suffix.lower()
        imports = []

        if ext == ".py":
            try:
                tree = ast.parse(content)
                analyzer = PythonAnalyzer()
                analyzer.visit(tree)
                imports = analyzer.imports
            except Exception:
                imports = []
        elif ext in {".js", ".jsx", ".ts", ".tsx"}:
            imports = extract_js_ts_imports(content)

        imports_by_file[rel] = imports

    for rel, imports in imports_by_file.items():
        for imp in imports:
            imported_by[imp].add(rel)

    return {
        "imports_by_file": imports_by_file,
        "imported_by": {k: sorted(v) for k, v in imported_by.items()},
    }


def detect_shared_contract_fields() -> Dict[str, List[str]]:
    interesting_fields = {
        "role_key",
        "status_key",
        "profileComplete",
        "setupMissing",
        "openingMatch",
        "kayakIds",
        "blockStartIso",
        "blockEndIso",
        "userUid",
        "createdAt",
        "isActive",
        "gearCategory",
        "gearCategoryDisplay",
        "images",
        "modules",
        "defaultRoute",
        "access",
        "memberId",
    }

    usage: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for field in interesting_fields:
            if field in content:
                usage[field].add(rel)

    return {k: sorted(v) for k, v in usage.items()}


def collect_duplication_blocks() -> List[Dict[str, Any]]:
    blocks: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for path in iter_project_files():
        if path.suffix.lower() not in ANY_CODE_EXTS:
            continue

        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        lines = content.splitlines()

        for window in range(DUPLICATION_MIN_LINES, DUPLICATION_WINDOW_MAX + 1):
            for i in range(0, max(0, len(lines) - window + 1)):
                chunk = lines[i:i + window]
                normalized = [normalize_dup_line(x) for x in chunk]

                if all(not x or x in {"{", "}", ");", ")", "];"} for x in normalized):
                    continue

                joined = "\n".join(normalized).strip()
                if len(joined) < 80:
                    continue

                key = short_hash(joined)
                blocks[key].append({
                    "file": rel,
                    "line_start": i + 1,
                    "line_end": i + window,
                    "window": window,
                    "preview": "\n".join(chunk[:3]).strip(),
                })

    repeated = []
    seen_sets = set()

    for hits in blocks.values():
        unique_places = {(h["file"], h["line_start"], h["line_end"]) for h in hits}
        if len(unique_places) < 2:
            continue

        normalized_places = tuple(sorted(unique_places))
        if normalized_places in seen_sets:
            continue
        seen_sets.add(normalized_places)

        repeated.append({
            "occurrences": len(hits),
            "window": hits[0]["window"],
            "hits": sorted(hits, key=lambda x: (x["file"], x["line_start"]))[:10],
            "preview": hits[0]["preview"][:220],
        })

    repeated.sort(key=lambda x: (-x["occurrences"], -x["window"]))
    return repeated[:30]


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
        rel = str(path).replace("\\", "/")
        if not rel.endswith((".ts", ".js", ".tsx", ".jsx")):
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


# =========================================================
# SUMMARIES
# =========================================================
def build_project_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_scope = defaultdict(int)
    for row in rows:
        by_scope[row["scope"]] += 1

    return {
        "by_scope": dict(sorted(by_scope.items())),
        "total_files": len(rows),
    }


def build_top_files(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ordered = sorted(rows, key=lambda x: -x["lines"])[:40]
    return [
        {"file": r["file"], "lines": r["lines"], "scope": r["scope"]}
        for r in ordered
    ]


def build_large_files(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for row in rows:
        if row["lines"] >= LONG_FILE_WARN_LINES:
            level = "WARN"
            if row["lines"] >= VERY_LONG_FILE_WARN_LINES:
                level = "HIGH"
            out.append({
                "level": level,
                "file": row["file"],
                "lines": row["lines"],
                "scope": row["scope"],
            })
    out.sort(key=lambda x: (-x["lines"], x["file"]))
    return out


def build_large_functions(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for row in rows:
        for fn in row["functions"]:
            if fn["length"] >= LONG_FUNCTION_WARN_LINES:
                level = "WARN"
                if fn["length"] >= VERY_LONG_FUNCTION_WARN_LINES:
                    level = "HIGH"
                out.append({
                    "level": level,
                    "file": row["file"],
                    "function": fn["name"],
                    "line_start": fn["line"],
                    "line_end": fn["end_line"],
                    "length": fn["length"],
                })

    out.sort(key=lambda x: (-x["length"], x["file"], x["function"]))
    return out[:80]


def build_frontend_hotspots(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []

    for row in rows:
        if row["scope"] != "FRONTEND":
            continue

        # nie analizujemy css jak JS
        if not row["file"].endswith((".js", ".jsx", ".ts", ".tsx")):
            continue

        score = (
            row["fetch_calls"] * 5
            + row["dom_queries"] * 2
            + row["listeners"] * 2
            + row["html_rebuilds"] * 4
            + row["array_ops"] * 1
            + row["timers"] * 2
        )

        out.append({
            "file": row["file"],
            "score": score,
            "fetch_calls": row["fetch_calls"],
            "dom_queries": row["dom_queries"],
            "listeners": row["listeners"],
            "html_rebuilds": row["html_rebuilds"],
            "array_ops": row["array_ops"],
            "timers": row["timers"],
        })

    out.sort(key=lambda x: (-x["score"], x["file"]))
    return [x for x in out if x["score"] > 0][:40]


def build_backend_hotspots(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []

    for row in rows:
        if row["scope"] != "BACKEND_SOURCE":
            continue

        score = row["firestore_ops"] * 4 + row["array_ops"] + row["console_logs"]

        out.append({
            "file": row["file"],
            "score": score,
            "firestore_ops": row["firestore_ops"],
            "array_ops": row["array_ops"],
            "console_logs": row["console_logs"],
        })

    out.sort(key=lambda x: (-x["score"], x["file"]))
    return [x for x in out if x["score"] > 0][:40]


def build_repeated_api_usage() -> Dict[str, List[str]]:
    route_usage: Dict[str, Set[str]] = defaultdict(set)
    route_regex = re.compile(r'["\'](/api/[^"\']+)["\']')

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for match in route_regex.finditer(content):
            route_usage[match.group(1)].add(rel)

    return {k: sorted(v) for k, v in sorted(route_usage.items(), key=lambda x: (-len(x[1]), x[0]))}


def build_render_risks(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for row in rows:
        if row["scope"] != "FRONTEND":
            continue
        if not row["file"].endswith((".js", ".jsx", ".ts", ".tsx")):
            continue

        if row["html_rebuilds"] >= 3 or row["dom_queries"] >= 12 or row["listeners"] >= 8:
            out.append({
                "file": row["file"],
                "innerHTML_assignments": row["html_rebuilds"],
                "dom_queries": row["dom_queries"],
                "listeners": row["listeners"],
            })

    out.sort(key=lambda x: (-x["innerHTML_assignments"], -x["dom_queries"], x["file"]))
    return out


def build_firestore_summary() -> Dict[str, Any]:
    collections: Dict[str, Set[str]] = defaultdict(set)
    docs: Dict[str, Set[str]] = defaultdict(set)

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
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
        "documents": {k: sorted(v) for k, v in sorted(docs.items())},
    }


def build_env_summary() -> Dict[str, Any]:
    env_files: Dict[str, List[str]] = {}
    env_usage: Dict[str, Set[str]] = defaultdict(set)

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
            env_usage[env_name].add(rel)

    return {
        "env_files": env_files,
        "env_usage": {k: sorted(v) for k, v in sorted(env_usage.items())},
    }


def build_host_security_summary() -> Dict[str, Any]:
    hosts_found: Dict[str, Set[str]] = defaultdict(set)
    origins_found: Dict[str, Set[str]] = defaultdict(set)
    api_refs: Set[str] = set()
    security_hits: Set[str] = set()

    for path in iter_project_files():
        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        for match in HOST_LITERAL_PATTERN.finditer(content):
            hosts_found[match.group(1)].add(rel)

        for match in ORIGIN_LITERAL_PATTERN.finditer(content):
            origins_found[match.group(1)].add(rel)

        for pattern in ["requireAllowedHost", "isAllowedHost", "/api/register", "/api/setup", "/api/gear/kayaks", "/api/gear/items"]:
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


def build_frontend_firebase_summary() -> Dict[str, Any]:
    path = Path(PROJECT_ROOT) / "public" / "core" / "firebase_client.js"
    if not path.exists():
        return {
            "exists": False,
            "project_ids": [],
            "auth_domains": [],
            "host_checks": [],
        }

    content = safe_read(path)
    if not content:
        return {
            "exists": True,
            "readable": False,
            "project_ids": [],
            "auth_domains": [],
            "host_checks": [],
        }

    return {
        "exists": True,
        "readable": True,
        "project_ids": sorted(set(re.findall(r'projectId:\s*["\']([^"\']+)["\']', content))),
        "auth_domains": sorted(set(re.findall(r'authDomain:\s*["\']([^"\']+)["\']', content))),
        "host_checks": sorted(set(re.findall(r'host\s*===\s*["\']([^"\']+)["\']', content))),
    }


def build_firebaserc_summary() -> Dict[str, Any]:
    path = Path(PROJECT_ROOT) / ".firebaserc"
    if not path.exists():
        return {"exists": False, "projects": {}}

    content = safe_read(path)
    if not content:
        return {"exists": True, "readable": False, "projects": {}}

    try:
        data = json.loads(content)
    except Exception as e:
        return {"exists": True, "readable": True, "error": str(e), "projects": {}}

    return {
        "exists": True,
        "readable": True,
        "projects": data.get("projects", {}),
    }


def build_firebase_json_summary() -> Dict[str, Any]:
    path = Path(PROJECT_ROOT) / "firebase.json"
    if not path.exists():
        return {"exists": False}

    content = safe_read(path)
    if not content:
        return {"exists": True, "readable": False}

    try:
        data = json.loads(content)
    except Exception as e:
        return {"exists": True, "readable": True, "error": str(e)}

    hosting = data.get("hosting", {})
    rewrites = hosting.get("rewrites", []) if isinstance(hosting, dict) else []
    headers = hosting.get("headers", []) if isinstance(hosting, dict) else []
    functions_cfg = data.get("functions")
    firestore_cfg = data.get("firestore")

    return {
        "exists": True,
        "readable": True,
        "rewrites": rewrites,
        "headers": headers,
        "functions_config": functions_cfg,
        "firestore_config": firestore_cfg,
    }


def build_cloud_run_yaml_summary() -> Dict[str, Any]:
    yaml_files = []

    for path in iter_project_files():
        if path.suffix.lower() in {".yml", ".yaml"} and ("getgear" in path.name.lower() or "cloudrun" in path.name.lower()):
            content = safe_read(path)
            if not content:
                yaml_files.append({
                    "file": str(path).replace("\\", "/"),
                    "readable": False,
                })
                continue

            invoker_disabled = (
                "run.googleapis.com/invoker-iam-disabled: 'true'" in content
                or 'run.googleapis.com/invoker-iam-disabled: "true"' in content
                or "run.googleapis.com/invoker-iam-disabled: true" in content
            )

            service_match = re.search(r"name:\s+([^\n]+)", content)
            yaml_files.append({
                "file": str(path).replace("\\", "/"),
                "readable": True,
                "invoker_iam_disabled": invoker_disabled,
                "first_name_field": service_match.group(1).strip() if service_match else None,
            })

    return {
        "files": yaml_files,
        "count": len(yaml_files),
    }


def build_refactor_risk_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    high = [r for r in rows if r["risk_level"] == "HIGH"]
    medium = [r for r in rows if r["risk_level"] == "MEDIUM"]
    low = [r for r in rows if r["risk_level"] == "LOW"]

    ordered = sorted(rows, key=lambda x: (-x["risk_score"], x["file"]))

    return {
        "counts": {
            "HIGH": len(high),
            "MEDIUM": len(medium),
            "LOW": len(low),
        },
        "highest_risk_files": [
            {
                "file": r["file"],
                "risk_level": r["risk_level"],
                "risk_score": r["risk_score"],
                "critical_tags": r["critical_tags"],
            }
            for r in ordered[:50]
        ],
    }


def build_safe_zones(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    safe = [
        r for r in rows
        if r["risk_level"] == "LOW"
        and r["scope"] in {"FRONTEND", "BACKEND_SOURCE"}
        and "security_critical" not in r["critical_tags"]
        and "routing_critical" not in r["critical_tags"]
        and "endpoint_critical" not in r["critical_tags"]
    ]

    medium = [r for r in rows if r["risk_level"] == "MEDIUM"]
    high = [r for r in rows if r["risk_level"] == "HIGH"]

    return {
        "safe_to_optimize_first": sorted(
            [{"file": r["file"], "scope": r["scope"]} for r in safe],
            key=lambda x: (x["scope"], x["file"])
        )[:60],
        "medium_risk": sorted(
            [{"file": r["file"], "risk_score": r["risk_score"]} for r in medium],
            key=lambda x: (-x["risk_score"], x["file"])
        )[:60],
        "high_risk_full_review_required": sorted(
            [{"file": r["file"], "risk_score": r["risk_score"], "critical_tags": r["critical_tags"]} for r in high],
            key=lambda x: (-x["risk_score"], x["file"])
        )[:80],
    }


def build_critical_files(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    critical = [r for r in rows if r["critical_tags"]]
    critical.sort(key=lambda x: (-len(x["critical_tags"]), -x["risk_score"], x["file"]))

    return [
        {
            "file": r["file"],
            "risk_level": r["risk_level"],
            "risk_score": r["risk_score"],
            "critical_tags": r["critical_tags"],
        }
        for r in critical[:100]
    ]


def build_browser_route_risk_summary(firebase_json_summary: Dict[str, Any]) -> Dict[str, Any]:
    rewrites = firebase_json_summary.get("rewrites", []) if isinstance(firebase_json_summary, dict) else []

    api_rewrites = []
    for rw in rewrites:
        if not isinstance(rw, dict):
            continue
        source = rw.get("source")
        fn = rw.get("function", {})
        if isinstance(source, str) and source.startswith("/api/") and isinstance(fn, dict):
            api_rewrites.append({
                "source": source,
                "functionId": fn.get("functionId"),
                "region": fn.get("region"),
            })

    return {
        "api_rewrites": api_rewrites,
        "rule": [
            "browser-facing routes should prefer stable module gateways",
            "do not add new standalone browser-facing functions without checking Cloud Run access model",
            "for each browser-facing endpoint compare: firebase.json rewrite, onRequest invoker, deployed Cloud Run config",
        ],
    }


def build_pattern_matches() -> List[Dict[str, Any]]:
    out = []

    for path in iter_project_files():
        content = safe_read(path)
        if not content:
            continue

        rel_path = str(path).replace("\\", "/")
        lines = content.splitlines()

        for i, line in enumerate(lines):
            for pattern in PATTERNS_TO_SEARCH:
                if pattern in line:
                    start = max(0, i - 2)
                    end = min(len(lines), i + 3)
                    context = []
                    for j in range(start, end):
                        context.append({
                            "line": j + 1,
                            "is_match_line": j == i,
                            "text": lines[j],
                        })

                    out.append({
                        "file": rel_path,
                        "line": i + 1,
                        "pattern": pattern,
                        "context": context,
                    })

    return out[:400]


def build_loop_await_risks() -> List[Dict[str, Any]]:
    suspicious = []

    for path in iter_project_files():
        if path.suffix.lower() not in {".js", ".ts", ".py"}:
            continue

        rel = str(path).replace("\\", "/")
        content = safe_read(path)
        if not content:
            continue

        lines = content.splitlines()

        for idx, line in enumerate(lines):
            if re.search(r"\bfor\b", line):
                window = "\n".join(lines[idx:min(len(lines), idx + 12)])
                if "await " in window:
                    suspicious.append({
                        "file": rel,
                        "line": idx + 1,
                        "preview": line.strip(),
                    })

    return suspicious[:100]


# =========================================================
# EXECUTIVE SUMMARY / PRIORITIES
# =========================================================
def build_priority_plan(
    frontend_hotspots: List[Dict[str, Any]],
    backend_hotspots: List[Dict[str, Any]],
    large_functions: List[Dict[str, Any]],
    render_risks: List[Dict[str, Any]],
    critical_files: List[Dict[str, Any]],
    firestore_index_check: Dict[str, Any],
) -> Dict[str, Any]:
    top_frontend = frontend_hotspots[:5]
    top_backend = backend_hotspots[:5]

    immediate_actions = []

    for item in top_frontend[:3]:
        immediate_actions.append({
            "priority": "P1",
            "type": "frontend_hotspot",
            "file": item["file"],
            "reason": {
                "score": item["score"],
                "dom_queries": item["dom_queries"],
                "listeners": item["listeners"],
                "innerHTML": item["html_rebuilds"],
            }
        })

    for item in top_backend[:2]:
        immediate_actions.append({
            "priority": "P1",
            "type": "backend_hotspot",
            "file": item["file"],
            "reason": {
                "score": item["score"],
                "firestore_ops": item["firestore_ops"],
            }
        })

    missing_indexes = []
    for (collection, fields), queries in firestore_index_check.get("missing", {}).items():
        missing_indexes.append({
            "collection": collection,
            "fields": list(fields),
            "queries": [
                {
                    "source": q["source"],
                    "line": q["line"],
                    "reason": q["reason"],
                    "snippet": q["snippet"],
                }
                for q in queries[:5]
            ]
        })

    summary = {
        "biggest_frontend_problem": top_frontend[0]["file"] if top_frontend else None,
        "biggest_backend_problem": top_backend[0]["file"] if top_backend else None,
        "largest_function": large_functions[0] if large_functions else None,
        "render_risk_top": render_risks[:5],
        "critical_files_top": critical_files[:10],
        "missing_indexes": missing_indexes,
        "immediate_actions": immediate_actions,
    }

    return summary


# =========================================================
# JSON ASSEMBLY
# =========================================================
def build_json_report() -> Dict[str, Any]:
    rows = collect_file_analysis()
    deps = build_dependency_maps()
    project_summary = build_project_summary(rows)
    top_files = build_top_files(rows)
    large_files = build_large_files(rows)
    large_functions = build_large_functions(rows)
    frontend_hotspots = build_frontend_hotspots(rows)
    backend_hotspots = build_backend_hotspots(rows)
    repeated_api_usage = build_repeated_api_usage()
    render_risks = build_render_risks(rows)
    firestore_summary = build_firestore_summary()
    firestore_index_check = collect_firestore_query_index_requirements()
    firebaserc_summary = build_firebaserc_summary()
    firebase_json_summary = build_firebase_json_summary()
    cloud_run_yaml_summary = build_cloud_run_yaml_summary()
    frontend_firebase_summary = build_frontend_firebase_summary()
    env_summary = build_env_summary()
    host_security_summary = build_host_security_summary()
    shared_contracts = detect_shared_contract_fields()
    critical_files = build_critical_files(rows)
    refactor_risk = build_refactor_risk_summary(rows)
    safe_zones = build_safe_zones(rows)
    browser_route_risk = build_browser_route_risk_summary(firebase_json_summary)
    duplication = collect_duplication_blocks()
    loop_await_risks = build_loop_await_risks()
    pattern_matches = build_pattern_matches()

    priority_plan = build_priority_plan(
        frontend_hotspots=frontend_hotspots,
        backend_hotspots=backend_hotspots,
        large_functions=large_functions,
        render_risks=render_risks,
        critical_files=critical_files,
        firestore_index_check=firestore_index_check,
    )

    git_branch_ok, git_branch = run_git(["branch", "--show-current"])
    git_head_ok, git_head = run_git(["rev-parse", "--short", "HEAD"])
    git_status_ok, git_status = run_git(["status", "--short"])
    git_log_ok, git_log = run_git(["log", "-1", "--oneline"])

    return {
        "meta": {
            "tool": "PROJECT AI OPTIMIZATION AUDIT",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "project_root": str(Path(PROJECT_ROOT).resolve()),
        },
        "rules": RULES.strip().splitlines(),
        "git": {
            "branch": git_branch if git_branch_ok else None,
            "head_short": git_head if git_head_ok else None,
            "last_commit": git_log if git_log_ok else None,
            "status": git_status.splitlines() if git_status_ok and git_status else [],
        },
        "project_summary": project_summary,
        "top_files": top_files,
        "large_files": large_files,
        "large_functions": large_functions,
        "frontend_hotspots": frontend_hotspots,
        "backend_hotspots": backend_hotspots,
        "repeated_api_usage": repeated_api_usage,
        "render_risks": render_risks,
        "firestore_summary": firestore_summary,
        "firestore_index_check": {
            "declared_path": firestore_index_check["declared"].get("path"),
            "declared_exists": firestore_index_check["declared"].get("exists"),
            "declared_error": firestore_index_check["declared"].get("error"),
            "declared_count": len(firestore_index_check["declared"].get("normalized", set())),
            "missing": [
                {
                    "collection": collection,
                    "fields": list(fields),
                    "queries": [
                        {
                            "source": q["source"],
                            "line": q["line"],
                            "reason": q["reason"],
                            "snippet": q["snippet"],
                        }
                        for q in queries
                    ],
                }
                for (collection, fields), queries in sorted(firestore_index_check["missing"].items())
            ],
            "covered": [
                {
                    "collection": collection,
                    "fields": list(fields),
                    "queries": [
                        {
                            "source": q["source"],
                            "line": q["line"],
                            "reason": q["reason"],
                        }
                        for q in queries
                    ],
                }
                for (collection, fields), queries in sorted(firestore_index_check["covered"].items())
            ],
        },
        "firebaserc_summary": firebaserc_summary,
        "firebase_json_summary": firebase_json_summary,
        "cloud_run_yaml_summary": cloud_run_yaml_summary,
        "frontend_firebase_summary": frontend_firebase_summary,
        "env_summary": env_summary,
        "host_security_summary": host_security_summary,
        "dependency_maps": deps,
        "shared_contracts": shared_contracts,
        "critical_files": critical_files,
        "refactor_risk": refactor_risk,
        "safe_zones": safe_zones,
        "browser_route_risk": browser_route_risk,
        "duplication": duplication,
        "loop_await_risks": loop_await_risks,
        "pattern_matches": pattern_matches,
        "priority_plan": priority_plan,
    }


# =========================================================
# TEXT REPORT
# =========================================================
def render_text_report(report: Dict[str, Any]) -> str:
    w = ReportWriter()

    w.add("🔍 Building AI developer optimization audit...")
    w.add("")
    w.add("=" * 80)
    for line in report["rules"]:
        w.add(line)
    w.add("=" * 80)

    w.section("=== EXECUTIVE SUMMARY ===")
    priority_plan = report["priority_plan"]
    w.add(f"- biggest_frontend_problem: {priority_plan.get('biggest_frontend_problem')}")
    w.add(f"- biggest_backend_problem: {priority_plan.get('biggest_backend_problem')}")
    largest_fn = priority_plan.get("largest_function")
    if largest_fn:
        w.add(
            f"- largest_function: {largest_fn['file']} :: {largest_fn['function']} :: len={largest_fn['length']}"
        )
    else:
        w.add("- largest_function: none")

    w.section("=== GIT SUMMARY ===")
    git = report["git"]
    w.add(f"- current branch: {git.get('branch')}")
    w.add(f"- HEAD short hash: {git.get('head_short')}")
    w.add(f"- last commit: {git.get('last_commit')}")
    w.add("- git status:")
    if git.get("status"):
        for line in git["status"]:
            w.add(f"  • {line}")
    else:
        w.add("  • working tree clean")

    w.section("=== PROJECT SUMMARY ===")
    ps = report["project_summary"]
    for scope, count in ps["by_scope"].items():
        w.add(f"- {scope}: {count} files")
    w.add(f"- total_files: {ps['total_files']}")

    w.section("=== TOP FILES BY LINE COUNT ===")
    for item in report["top_files"]:
        w.add(f"- {item['file']} :: {item['lines']} lines :: {item['scope']}")

    w.section("=== FILE SIZE / COMPLEXITY SUMMARY ===")
    for item in report["large_files"]:
        w.add(f"- [{item['level']}] {item['file']} :: {item['lines']} lines :: {item['scope']}")
    if not report["large_files"]:
        w.add("- no oversized files detected")

    w.section("=== LARGE FUNCTIONS SUMMARY ===")
    for item in report["large_functions"]:
        w.add(
            f"- [{item['level']}] {item['file']} :: {item['function']} :: "
            f"lines {item['line_start']}-{item['line_end']} :: length={item['length']}"
        )
    if not report["large_functions"]:
        w.add("- no oversized functions detected")

    w.section("=== FRONTEND HOTSPOTS SUMMARY ===")
    for item in report["frontend_hotspots"]:
        w.add(f"- {item['file']} :: score={item['score']}")
        w.add(f"  • fetch/api calls: {item['fetch_calls']}")
        w.add(f"  • DOM queries: {item['dom_queries']}")
        w.add(f"  • event listeners: {item['listeners']}")
        w.add(f"  • innerHTML rebuilds: {item['html_rebuilds']}")
        w.add(f"  • array ops: {item['array_ops']}")
        w.add(f"  • timers: {item['timers']}")
    if not report["frontend_hotspots"]:
        w.add("- none")

    w.section("=== BACKEND HOTSPOTS SUMMARY ===")
    for item in report["backend_hotspots"]:
        w.add(f"- {item['file']} :: score={item['score']}")
        w.add(f"  • Firestore chain ops: {item['firestore_ops']}")
        w.add(f"  • array ops: {item['array_ops']}")
        w.add(f"  • console logs: {item['console_logs']}")
    if not report["backend_hotspots"]:
        w.add("- none")

    w.section("=== REPEATED FETCH / API USAGE SUMMARY ===")
    for route, files in report["repeated_api_usage"].items():
        w.add(f"- {route}")
        for src in files[:12]:
            w.add(f"  • {src}")
    if not report["repeated_api_usage"]:
        w.add("- none")

    w.section("=== RENDER / DOM RISK SUMMARY ===")
    for item in report["render_risks"]:
        w.add(f"- {item['file']}")
        w.add(f"  • innerHTML assignments: {item['innerHTML_assignments']}")
        w.add(f"  • DOM queries: {item['dom_queries']}")
        w.add(f"  • addEventListener: {item['listeners']}")
    if not report["render_risks"]:
        w.add("- none")

    w.section("=== FIRESTORE SUMMARY ===")
    fs = report["firestore_summary"]
    w.add("- collections:")
    if fs["collections"]:
        for collection, files in fs["collections"].items():
            w.add(f"  • {collection}")
            for src in files[:10]:
                w.add(f"      - {src}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- documents:")
    if fs["documents"]:
        for doc_path, files in fs["documents"].items():
            w.add(f"  • {doc_path}")
            for src in files[:10]:
                w.add(f"      - {src}")
    else:
        w.add("  • none")

    w.section("=== FIRESTORE INDEX CHECK ===")
    fic = report["firestore_index_check"]
    w.add(f"- firestore.indexes.json present: {fic['declared_exists']}")
    w.add(f"- declared composite indexes: {fic['declared_count']}")
    if fic["declared_error"]:
        w.add(f"- declared error: {fic['declared_error']}")

    w.add("")
    w.add("- missing index declarations:")
    if fic["missing"]:
        for item in fic["missing"]:
            w.add(f"  • {item['collection']} :: {' + '.join(item['fields'])}")
            for q in item["queries"][:4]:
                w.add(f"      - missing for: {q['source']}:{q['line']} ({q['reason']})")
                w.add(f"        snippet: {q['snippet']}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- covered index declarations:")
    if fic["covered"]:
        for item in fic["covered"]:
            w.add(f"  • {item['collection']} :: {' + '.join(item['fields'])}")
            for q in item["queries"][:3]:
                w.add(f"      - covered query: {q['source']}:{q['line']}")
    else:
        w.add("  • none")

    w.section("=== FIREBASERC SUMMARY ===")
    fr = report["firebaserc_summary"]
    w.add(f"- exists: {fr.get('exists')}")
    if fr.get("projects"):
        for k, v in fr["projects"].items():
            w.add(f"  • {k} -> {v}")

    w.section("=== FIREBASE.JSON SUMMARY ===")
    fj = report["firebase_json_summary"]
    w.add(f"- exists: {fj.get('exists')}")
    rewrites = fj.get("rewrites", [])
    headers = fj.get("headers", [])
    w.add("- rewrites:")
    if rewrites:
        for rw in rewrites:
            w.add(f"  • {rw}")
    else:
        w.add("  • none")
    w.add("- headers:")
    if headers:
        for h in headers:
            w.add(f"  • {h}")
    else:
        w.add("  • none")

    functions_cfg = fj.get("functions_config")
    w.add(f"- functions config present: {functions_cfg is not None}")
    if isinstance(functions_cfg, list):
        for idx, item in enumerate(functions_cfg, 1):
            if isinstance(item, dict):
                w.add(f"  • functions[{idx}] source: {item.get('source')}")
                w.add(f"    - invoker: {item.get('invoker', '(missing)')}")

    firestore_cfg = fj.get("firestore_config")
    w.add(f"- firestore config present: {firestore_cfg is not None}")
    if isinstance(firestore_cfg, dict):
        w.add(f"  • firestore.indexes path: {firestore_cfg.get('indexes')}")

    w.section("=== CLOUD RUN YAML SUMMARY ===")
    cry = report["cloud_run_yaml_summary"]
    if cry["files"]:
        for item in cry["files"]:
            w.add(f"- {item['file']}")
            w.add(f"  • invoker_iam_disabled: {item.get('invoker_iam_disabled')}")
            w.add(f"  • first_name_field: {item.get('first_name_field')}")
    else:
        w.add("- no exported Cloud Run YAML files found")
        w.add("  • export manually when needed:")
        w.add("    gcloud run services describe SERVICE --region=us-central1 --format=export > service.yaml")

    w.section("=== FRONTEND FIREBASE SUMMARY ===")
    ffs = report["frontend_firebase_summary"]
    w.add(f"- exists: {ffs.get('exists')}")
    w.add("- projectIds:")
    for item in ffs.get("project_ids", []):
        w.add(f"  • {item}")
    w.add("- authDomains:")
    for item in ffs.get("auth_domains", []):
        w.add(f"  • {item}")
    w.add("- host checks:")
    for item in ffs.get("host_checks", []):
        w.add(f"  • {item}")

    w.section("=== ENV SUMMARY ===")
    env = report["env_summary"]
    w.add("- ENV files detected:")
    if env["env_files"]:
        for file_name, keys in env["env_files"].items():
            w.add(f"  • {file_name}")
            for key in keys[:30]:
                w.add(f"      - {key}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- process.env usage detected:")
    if env["env_usage"]:
        for key, files in env["env_usage"].items():
            w.add(f"  • {key}")
            for src in files[:15]:
                w.add(f"      - {src}")
    else:
        w.add("  • none")

    w.section("=== HOST / API / SECURITY SUMMARY ===")
    hs = report["host_security_summary"]
    w.add("- Host literals detected:")
    if hs["hosts_found"]:
        for host, files in hs["hosts_found"].items():
            w.add(f"  • {host}")
            for src in files[:10]:
                w.add(f"      - {src}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- Origin literals detected:")
    if hs["origins_found"]:
        for origin, files in hs["origins_found"].items():
            w.add(f"  • {origin}")
            for src in files[:10]:
                w.add(f"      - {src}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- API/security references:")
    if hs["api_refs"]:
        for item in hs["api_refs"][:120]:
            w.add(f"  • {item}")
    else:
        w.add("  • none")

    w.add("")
    w.add("- Header/host/origin checks:")
    if hs["security_hits"]:
        for item in hs["security_hits"][:120]:
            w.add(f"  • {item}")
    else:
        w.add("  • none")

    w.section("=== DEPENDENCY SUMMARY ===")
    deps = report["dependency_maps"]
    imports_by_file = deps["imports_by_file"]
    imported_by = deps["imported_by"]

    w.add("- files with many imports:")
    heavy_importers = sorted(
        ((file, len(imports)) for file, imports in imports_by_file.items()),
        key=lambda x: -x[1]
    )[:30]
    for file, count in heavy_importers:
        if count > 0:
            w.add(f"  • {file} :: imports={count}")

    w.add("")
    w.add("- shared imported modules / paths:")
    shared = sorted(
        ((imp, len(files)) for imp, files in imported_by.items()),
        key=lambda x: -x[1]
    )[:40]
    for imp, count in shared:
        if count > 1:
            w.add(f"  • {imp} :: used_by={count}")

    w.section("=== SHARED DATA CONTRACTS ===")
    sc = report["shared_contracts"]
    if sc:
        for field, files in sorted(sc.items(), key=lambda x: (-len(x[1]), x[0])):
            if len(files) >= 2:
                w.add(f"- {field}")
                for src in files[:12]:
                    w.add(f"  • {src}")
    else:
        w.add("- none")

    w.section("=== CRITICAL FILES / TAGS ===")
    for item in report["critical_files"][:100]:
        w.add(f"- {item['file']}")
        w.add(f"  • risk={item['risk_level']} ({item['risk_score']})")
        w.add(f"  • tags={', '.join(item['critical_tags'])}")

    w.section("=== REFACTOR RISK SUMMARY ===")
    rr = report["refactor_risk"]
    w.add(f"- HIGH: {rr['counts']['HIGH']}")
    w.add(f"- MEDIUM: {rr['counts']['MEDIUM']}")
    w.add(f"- LOW: {rr['counts']['LOW']}")
    w.add("")
    w.add("- highest risk files:")
    for item in rr["highest_risk_files"][:50]:
        w.add(f"  • {item['file']} :: {item['risk_level']} ({item['risk_score']})")

    w.section("=== SAFE / MEDIUM / HIGH RISK ZONES ===")
    sz = report["safe_zones"]

    w.add("- SAFE TO OPTIMIZE FIRST:")
    for item in sz["safe_to_optimize_first"][:40]:
        w.add(f"  • {item['file']}")

    w.add("")
    w.add("- MEDIUM RISK:")
    for item in sz["medium_risk"][:40]:
        w.add(f"  • {item['file']}")

    w.add("")
    w.add("- HIGH RISK / FULL FILE REVIEW REQUIRED:")
    for item in sz["high_risk_full_review_required"][:60]:
        w.add(f"  • {item['file']}")

    w.section("=== BROWSER ROUTE RISK SUMMARY ===")
    brr = report["browser_route_risk"]
    for item in brr["api_rewrites"]:
        w.add(f"  • {item['source']} -> {item['functionId']} ({item['region']})")
    w.add("")
    w.add("- rule:")
    for rule in brr["rule"]:
        w.add(f"  • {rule}")

    w.section("=== DUPLICATION SUMMARY ===")
    duplication = report["duplication"]
    if duplication:
        for item in duplication:
            w.add(f"- duplicate block candidate (occurrences: {item['occurrences']}, lines: {item['window']})")
            for hit in item["hits"][:6]:
                w.add(f"  • {hit['file']}:{hit['line_start']}-{hit['line_end']}")
            w.add(f"  • preview: {item['preview']}")
    else:
        w.add("- none")

    w.section("=== POSSIBLE LOOP + AWAIT RISK SUMMARY ===")
    if report["loop_await_risks"]:
        for item in report["loop_await_risks"][:80]:
            w.add(f"- {item['file']}:{item['line']} :: {item['preview']}")
    else:
        w.add("- none")

    w.section("=== PRIORITY PLAN FOR AI DEVELOPER ===")
    for item in priority_plan["immediate_actions"]:
        w.add(f"- {item['priority']} :: {item['type']} :: {item['file']}")
        w.add(f"  • reason: {item['reason']}")

    w.add("")
    w.add("=== MANUAL REVIEW TARGETS FOR AI DEVELOPER ===")
    w.add("")
    w.add("- Review first:")
    w.add("  • highest frontend hotspot")
    w.add("  • highest backend hotspot")
    w.add("  • largest functions")
    w.add("  • Firestore-heavy services")
    w.add("  • browser-facing endpoint chain: firebase.json -> function -> Cloud Run")
    w.add("  • shared contracts before any rename")
    w.add("")
    w.add("- Constraints:")
    w.add("  • do NOT change business logic by default")
    w.add("  • do NOT redesign UX by default")
    w.add("  • do NOT refactor high-risk files from partial snippets")
    w.add("  • optimize by reducing waste, not by changing intended behavior")

    w.add("")
    w.add("=" * 80)
    w.add("END OF AI OPTIMIZATION AUDIT")
    w.add("=" * 80)

    return "\n".join(w.lines)


# =========================================================
# MAIN
# =========================================================
def main():
    report = build_json_report()

    text_report = render_text_report(report)

    print(text_report)

    Path(TEXT_OUTPUT_PATH).write_text(text_report, encoding="utf-8")
    Path(JSON_OUTPUT_PATH).write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print("")
    print(f"[OK] TXT report written to: {TEXT_OUTPUT_PATH}")
    print(f"[OK] JSON report written to: {JSON_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
