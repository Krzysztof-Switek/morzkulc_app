from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
import json
import re
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]

OUTPUT_DIR = ROOT / ".claude_context"
README = OUTPUT_DIR / "README.md"

INCLUDE_EXT = {".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".py", ".json"}

EXCLUDE_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    ".venv",
    "venv",
    "__pycache__",
    "node_modules",
    "functions/lib",
    "dist",
    "build",
    ".firebase",
    "coverage",
    ".pytest_cache",
    ".mypy_cache",
    ".claude_context",
}

EXCLUDE_FILES = {
    "package-lock.json",
    "firebase-debug.log",
    "firestore-debug.log",
}

MAX_LINE_LEN = 140
MAX_ITEMS = 30
LARGE_FILE_LINES = 450


@dataclass
class FileInfo:
    path: str
    suffix: str
    lines: int
    kind: str
    size_bytes: int
    imports: list[str] = field(default_factory=list)
    local_imports: list[str] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    symbols: list[str] = field(default_factory=list)
    routes: list[str] = field(default_factory=list)
    firebase_functions: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def trim(value: str, max_len: int = MAX_LINE_LEN) -> str:
    value = " ".join(str(value).replace("\t", " ").split())
    if len(value) <= max_len:
        return value
    return value[: max_len - 3] + "..."


def rel_path(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def is_excluded(path: Path) -> bool:
    rel = rel_path(path)

    if path.name in EXCLUDE_FILES:
        return True

    for excluded in EXCLUDE_DIRS:
        if rel == excluded or rel.startswith(excluded + "/"):
            return True

    if path.suffix not in INCLUDE_EXT:
        return True

    return False


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def unique_sorted(values: Iterable[str], limit: int | None = MAX_ITEMS) -> list[str]:
    result = sorted({trim(v) for v in values if v and trim(v)})
    if limit is None:
        return result
    return result[:limit]


def classify_file(path: Path) -> str:
    rel = rel_path(path).lower()
    name = path.name.lower()

    if "test" in rel or name.startswith("test_") or name.endswith(".test.ts"):
        return "test"

    if rel.startswith("functions/src/api/") or "handler" in name:
        return "api_handler"

    if rel.startswith("functions/src/modules/"):
        return "domain_module"

    if rel.startswith("functions/src/service/") or "/tasks/" in rel:
        return "service_task"

    if rel.startswith("functions/src/"):
        return "backend_other"

    if rel.startswith("public/modules/"):
        return "frontend_module"

    if rel.startswith("public/"):
        return "frontend_other"

    if name in {"firebase.json", "firestore.indexes.json", "firestore.rules", "storage.rules"}:
        return "firebase_config"

    if "config" in rel or name.endswith(".json"):
        return "config"

    if rel.startswith("tools/") or rel.startswith("scripts/"):
        return "tooling"

    return "other"


def extract_imports(text: str) -> list[str]:
    results: list[str] = []

    patterns = [
        r"^\s*import\s+.+?\s+from\s+['\"](.+?)['\"]",
        r"^\s*import\s+['\"](.+?)['\"]",
        r"^\s*const\s+.+?\s*=\s*require\(['\"](.+?)['\"]\)",
        r"^\s*from\s+([A-Za-z0-9_\.]+)\s+import\s+.+",
    ]

    for line in text.splitlines():
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                results.append(match.group(1))

    return unique_sorted(results)


def is_local_import(import_path: str) -> bool:
    return import_path.startswith(".") or import_path.startswith("@/")


def extract_exports(text: str) -> list[str]:
    patterns = [
        r"export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)",
        r"export\s+const\s+([A-Za-z0-9_]+)",
        r"export\s+class\s+([A-Za-z0-9_]+)",
        r"exports\.([A-Za-z0-9_]+)\s*=",
        r"module\.exports\.([A-Za-z0-9_]+)\s*=",
    ]

    results: list[str] = []
    for pattern in patterns:
        results.extend(re.findall(pattern, text))

    return unique_sorted(results)


def extract_symbols(text: str) -> list[str]:
    patterns = [
        r"function\s+([A-Za-z0-9_]+)\s*\(",
        r"async\s+function\s+([A-Za-z0-9_]+)\s*\(",
        r"const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(",
        r"class\s+([A-Za-z0-9_]+)",
        r"def\s+([A-Za-z0-9_]+)\s*\(",
    ]

    results: list[str] = []
    for pattern in patterns:
        results.extend(re.findall(pattern, text))

    return unique_sorted(results)


def extract_routes(text: str) -> list[str]:
    results: list[str] = []

    route_patterns = [
        r"\bapp\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
        r"\brouter\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
        r"\bfetch\s*\(\s*['\"]([^'\"]+)['\"]",
        r"\baxios\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
    ]

    for pattern in route_patterns:
        for match in re.findall(pattern, text):
            if isinstance(match, tuple):
                if len(match) == 2:
                    results.append(f"{match[0].upper()} {match[1]}")
            else:
                results.append(match)

    for pattern in [r"['\"](/api/[^'\"]+)['\"]", r"['\"](api/[^'\"]+)['\"]"]:
        results.extend(re.findall(pattern, text))

    return unique_sorted(results)


def extract_firebase_functions(text: str) -> list[str]:
    results: list[str] = []

    patterns = [
        r"export\s+const\s+([A-Za-z0-9_]+)\s*=\s*onRequest",
        r"export\s+const\s+([A-Za-z0-9_]+)\s*=\s*onCall",
        r"exports\.([A-Za-z0-9_]+)\s*=\s*functions",
    ]

    for pattern in patterns:
        results.extend(re.findall(pattern, text))

    if "onRequest(" in text or "onRequest<" in text:
        results.append("onRequest")

    return unique_sorted(results)


def extract_keywords(path: Path, text: str) -> list[str]:
    rel = rel_path(path).lower()
    blob = f"{rel}\n{text[:5000].lower()}"

    candidates = [
        "auth",
        "admin",
        "setup",
        "gear",
        "kayak",
        "reservation",
        "godzinki",
        "basen",
        "events",
        "calendar",
        "km",
        "ranking",
        "map",
        "firestore",
        "storage",
        "cors",
        "member",
        "role",
        "status",
        "sync",
        "job",
        "task",
        "index",
        "transaction",
        "batch",
        "email",
        "groups",
        "discord",
    ]

    return [kw for kw in candidates if kw in blob]


def parse_firebase_rewrites() -> list[str]:
    firebase_json = ROOT / "firebase.json"

    if not firebase_json.exists():
        return []

    try:
        data = json.loads(read_text(firebase_json))
    except Exception:
        return ["Could not parse firebase.json"]

    rewrites: list[str] = []
    hosting = data.get("hosting")

    if isinstance(hosting, list):
        hosting_entries = hosting
    elif isinstance(hosting, dict):
        hosting_entries = [hosting]
    else:
        hosting_entries = []

    for entry in hosting_entries:
        for rewrite in entry.get("rewrites", []):
            source = rewrite.get("source")
            function = rewrite.get("function")
            run = rewrite.get("run")

            if function:
                rewrites.append(f"{source} -> function:{function}")
            elif run:
                service_id = run.get("serviceId", "unknown")
                region = run.get("region", "unknown")
                rewrites.append(f"{source} -> run:{service_id} ({region})")
            else:
                rewrites.append(trim(str(rewrite)))

    return unique_sorted(rewrites, None)


def resolve_local_import(current_file: str, import_path: str, known_paths: set[str]) -> str | None:
    if not import_path.startswith("."):
        return None

    base = (ROOT / current_file).parent
    raw = (base / import_path).resolve()

    candidates: list[Path] = []

    for ext in [".ts", ".tsx", ".js", ".jsx", ".py", ".json"]:
        candidates.append(raw.with_suffix(ext))

    for ext in [".ts", ".tsx", ".js", ".jsx", ".py", ".json"]:
        candidates.append(raw / f"index{ext}")

    for candidate in candidates:
        try:
            rel = rel_path(candidate)
        except ValueError:
            continue

        if rel in known_paths:
            return rel

    return None


def analyze_file(path: Path) -> FileInfo:
    text = read_text(path)
    line_count = text.count("\n") + 1
    imports = extract_imports(text)
    local_imports = [imp for imp in imports if is_local_import(imp)]

    info = FileInfo(
        path=rel_path(path),
        suffix=path.suffix,
        lines=line_count,
        kind=classify_file(path),
        size_bytes=path.stat().st_size,
        imports=imports,
        local_imports=local_imports,
        exports=extract_exports(text),
        symbols=extract_symbols(text),
        routes=extract_routes(text),
        firebase_functions=extract_firebase_functions(text),
        keywords=extract_keywords(path, text),
    )

    if line_count >= LARGE_FILE_LINES:
        info.warnings.append(f"large file: {line_count} lines")

    return info


def build_dependency_edges(files: list[FileInfo]) -> list[dict[str, str]]:
    known_paths = {f.path for f in files}
    edges: list[dict[str, str]] = []

    for file in files:
        for import_path in file.local_imports:
            resolved = resolve_local_import(file.path, import_path, known_paths)
            if resolved:
                edges.append({"source": file.path, "target": resolved})

    return edges


def append_list(lines: list[str], values: list[str], indent: str = "- ") -> None:
    for value in values:
        lines.append(f"{indent}{trim(value)}")


def write_markdown(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def group_by_kind(files: list[FileInfo]) -> dict[str, list[FileInfo]]:
    groups: dict[str, list[FileInfo]] = {}

    for file in files:
        groups.setdefault(file.kind, []).append(file)

    for key in groups:
        groups[key] = sorted(groups[key], key=lambda f: f.path)

    return dict(sorted(groups.items()))


def write_readme(files: list[FileInfo]) -> None:
    total_lines = sum(f.lines for f in files)
    large_files = [f for f in files if f.lines >= LARGE_FILE_LINES]

    lines = [
        "# Claude Code Context",
        "",
        "Read this file first.",
        "",
        "## Mandatory operating rules",
        "",
        "1. Do not read the whole repository.",
        "2. Do not use broad glob searches such as `**/*`.",
        "3. Use these context files as the navigation map.",
        "4. Efficient context use is the goal, not blind minimalism.",
        "5. Reading a few extra relevant functions is acceptable.",
        "6. Reading half of the repo to answer one question is not acceptable.",
        "7. Before opening source files, state:",
        "   - which files you want to open,",
        "   - why each file is needed,",
        "   - what specific information you expect to find.",
        "8. Open at most 3 source files in the first step.",
        "9. Ask for the next specific file only if needed.",
        "10. Modify at most 1 file per implementation step.",
        "11. After each modification, show the diff and one concrete test command.",
        "",
        "## Context files",
        "",
        "- `context_routes.md` — endpoints, Firebase rewrites, functions and API strings.",
        "- `context_keywords.md` — feature keyword to file mapping.",
        "- `context_backend.md` — backend handlers, modules, services and tasks.",
        "- `context_frontend.md` — frontend modules and public files.",
        "- `context_tests.md` — tests grouped by file.",
        "- `context_config.md` — config, Firebase, tooling and other support files.",
        "- `context_dependencies.json` — resolved local import edges.",
        "- `context_files.json` — full machine-readable file index.",
        "",
        "## Recommended route",
        "",
        "If task mentions an endpoint or API:",
        "",
        "1. Read `context_routes.md`.",
        "2. Pick likely handler/service/test files.",
        "3. Open only 1-3 source files.",
        "",
        "If task mentions a feature but no endpoint:",
        "",
        "1. Read `context_keywords.md`.",
        "2. Then read the matching backend/frontend/test context file.",
        "3. Open only the most likely source files.",
        "",
        "If task is frontend-only:",
        "",
        "1. Read `context_frontend.md`.",
        "2. Open the target module and only nearby dependencies.",
        "",
        "If task is test-only:",
        "",
        "1. Read `context_tests.md`.",
        "2. Open the relevant test and the minimum source file it covers.",
        "",
        "## Project summary",
        "",
        f"- indexed files: {len(files)}",
        f"- indexed source lines: {total_lines}",
        f"- large files: {len(large_files)}",
        "",
    ]

    if large_files:
        lines.append("## Large files warning")
        lines.append("")
        for file in sorted(large_files, key=lambda f: f.lines, reverse=True):
            lines.append(f"- `{file.path}` — {file.lines} lines")
        lines.append("")

    write_markdown(README, lines)


def write_routes(files: list[FileInfo]) -> None:
    lines = [
        "# Routes and Firebase Functions",
        "",
        "Use this file first for endpoint/API/function tasks.",
        "",
        "## Firebase hosting rewrites",
        "",
    ]

    rewrites = parse_firebase_rewrites()
    if rewrites:
        append_list(lines, rewrites)
    else:
        lines.append("- No rewrites found or firebase.json not present.")

    lines.append("")
    lines.append("## Files with route/function hints")
    lines.append("")

    route_files = [f for f in files if f.routes or f.firebase_functions]

    if not route_files:
        lines.append("- No route/function hints found.")
    else:
        for file in sorted(route_files, key=lambda f: f.path):
            lines.append(f"### `{file.path}`")
            lines.append(f"- kind: `{file.kind}`")
            lines.append(f"- lines: {file.lines}")

            if file.routes:
                lines.append("- routes/api strings:")
                append_list(lines, file.routes, "  - ")

            if file.firebase_functions:
                lines.append("- firebase function hints:")
                append_list(lines, file.firebase_functions, "  - ")

            lines.append("")

    write_markdown(OUTPUT_DIR / "context_routes.md", lines)


def write_keywords(files: list[FileInfo]) -> None:
    keyword_map: dict[str, list[str]] = {}

    for file in files:
        for keyword in file.keywords:
            keyword_map.setdefault(keyword, []).append(file.path)

    lines = [
        "# Keyword Index",
        "",
        "Use this file when the task is described by feature name.",
        "",
    ]

    for keyword in sorted(keyword_map):
        lines.append(f"## {keyword}")
        for path in sorted(set(keyword_map[keyword])):
            lines.append(f"- `{path}`")
        lines.append("")

    write_markdown(OUTPUT_DIR / "context_keywords.md", lines)


def append_file_details(lines: list[str], file: FileInfo) -> None:
    lines.append(f"## `{file.path}`")
    lines.append("")
    lines.append(f"- kind: `{file.kind}`")
    lines.append(f"- lines: {file.lines}")
    lines.append(f"- size_bytes: {file.size_bytes}")

    if file.warnings:
        lines.append("- warnings:")
        append_list(lines, file.warnings, "  - ")

    if file.keywords:
        lines.append("- keywords:")
        append_list(lines, file.keywords, "  - ")

    if file.exports:
        lines.append("- exports:")
        append_list(lines, file.exports, "  - ")

    if file.symbols:
        lines.append("- symbols:")
        append_list(lines, file.symbols, "  - ")

    if file.routes:
        lines.append("- route/api hints:")
        append_list(lines, file.routes, "  - ")

    if file.firebase_functions:
        lines.append("- firebase function hints:")
        append_list(lines, file.firebase_functions, "  - ")

    if file.local_imports:
        lines.append("- local imports:")
        append_list(lines, file.local_imports, "  - ")

    lines.append("")


def write_group_file(filename: str, title: str, files: list[FileInfo], kinds: set[str]) -> None:
    selected = [f for f in files if f.kind in kinds]

    lines = [
        f"# {title}",
        "",
        f"Files indexed here: {len(selected)}",
        "",
    ]

    if not selected:
        lines.append("- No files in this group.")
    else:
        for file in sorted(selected, key=lambda f: f.path):
            append_file_details(lines, file)

    write_markdown(OUTPUT_DIR / filename, lines)


def write_json_files(files: list[FileInfo]) -> None:
    dependencies = build_dependency_edges(files)

    (OUTPUT_DIR / "context_files.json").write_text(
        json.dumps([asdict(f) for f in files], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (OUTPUT_DIR / "context_dependencies.json").write_text(
        json.dumps(dependencies, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    files: list[FileInfo] = []

    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if is_excluded(path):
            continue

        files.append(analyze_file(path))

    write_readme(files)
    write_routes(files)
    write_keywords(files)

    write_group_file(
        "context_backend.md",
        "Backend Context",
        files,
        {"api_handler", "domain_module", "service_task", "backend_other"},
    )

    write_group_file(
        "context_frontend.md",
        "Frontend Context",
        files,
        {"frontend_module", "frontend_other"},
    )

    write_group_file(
        "context_tests.md",
        "Tests Context",
        files,
        {"test"},
    )

    write_group_file(
        "context_config.md",
        "Config and Tooling Context",
        files,
        {"firebase_config", "config", "tooling", "other"},
    )

    write_json_files(files)

    print(f"Generated context directory: {OUTPUT_DIR}")
    print(f"Start file: {README}")
    print(f"Indexed files: {len(files)}")


if __name__ == "__main__":
    main()
