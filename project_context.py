from __future__ import annotations

import ast
import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


# ============================================================
# CONFIG
# ============================================================

ROOT = Path(__file__).resolve().parent

OUTPUT_DIR_NAME = "_claude_context"
OUTPUT_MD_NAME = "PROJECT_CONTEXT_MAP.md"
OUTPUT_JSON_NAME = "project_context_map.json"

# Heavy / generated folders that should not be scanned.
# Add or remove names if your project needs it.
EXCLUDED_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".cache",
    "node_modules",
    "dist",
    "build",
    "htmlcov",
    "coverage",
    OUTPUT_DIR_NAME,

    # Usually huge / not useful for code context:
    "data",
    "datasets",
    "results",
    "checkpoints",
    "logs",
    "runs",
    "wandb",
    "mlruns",
}

EXCLUDED_FILE_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "credentials.json",
    "serviceAccountKey.json",
    "firebase-service-account.json",
    "secrets.json",
}

BINARY_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".zip", ".rar", ".7z", ".tar", ".gz",
    ".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav",
    ".pyc", ".pyo", ".so", ".dll", ".exe",
    ".db", ".sqlite", ".sqlite3",
    ".pt", ".pth", ".onnx", ".pkl", ".joblib",
}

TEXT_EXTENSIONS = {
    ".py",
    ".js", ".jsx", ".ts", ".tsx",
    ".html", ".css",
    ".json", ".yaml", ".yml", ".toml",
    ".md", ".txt",
    ".sh", ".bat", ".ps1",
    ".gs",
    ".ini", ".cfg",
}

PYTHON_SOURCE_ROOTS = {
    "src",
    "backend",
    "app",
    "apps",
    "functions",
}

MAX_READ_FILE_SIZE_BYTES = 1_500_000
MAX_TREE_LINES = 3000
MAX_MARKDOWN_FILES = 2000
MAX_SYMBOLS_PER_FILE_IN_MD = 200


# ============================================================
# DATA MODELS
# ============================================================

@dataclass
class FunctionInfo:
    name: str
    type: str
    line_start: int | None = None
    line_end: int | None = None
    signature: str | None = None
    decorators: list[str] = field(default_factory=list)
    returns: str | None = None
    doc: str | None = None


@dataclass
class ClassInfo:
    name: str
    line_start: int | None = None
    line_end: int | None = None
    bases: list[str] = field(default_factory=list)
    decorators: list[str] = field(default_factory=list)
    methods: list[FunctionInfo] = field(default_factory=list)
    doc: str | None = None


@dataclass
class ImportInfo:
    raw: str
    module: str | None = None
    names: list[str] = field(default_factory=list)
    level: int = 0
    type: str = "import"


@dataclass
class FileInfo:
    path: str
    extension: str
    size_bytes: int
    line_count: int | None = None
    sha1_short: str | None = None
    kind: str = "unknown"

    module_aliases: list[str] = field(default_factory=list)
    imports: list[ImportInfo] = field(default_factory=list)
    internal_dependencies: list[str] = field(default_factory=list)

    classes: list[ClassInfo] = field(default_factory=list)
    functions: list[FunctionInfo] = field(default_factory=list)
    top_level_symbols: list[str] = field(default_factory=list)

    headings: list[str] = field(default_factory=list)
    config_keys: list[str] = field(default_factory=list)

    notes: list[str] = field(default_factory=list)


# ============================================================
# BASIC HELPERS
# ============================================================

def relative_path(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def safe_read_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_READ_FILE_SIZE_BYTES:
            return None
    except OSError:
        return None

    for encoding in ("utf-8", "utf-8-sig", "cp1250", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
        except OSError:
            return None

    return None


def count_lines(text: str | None) -> int | None:
    if text is None:
        return None
    return text.count("\n") + 1 if text else 0


def short_sha1(path: Path) -> str | None:
    try:
        h = hashlib.sha1()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()[:10]
    except OSError:
        return None


def should_skip_file(path: Path) -> bool:
    name = path.name
    suffix = path.suffix.lower()

    if name in EXCLUDED_FILE_NAMES:
        return True

    if suffix in BINARY_EXTENSIONS:
        return True

    if suffix and suffix not in TEXT_EXTENSIONS:
        return True

    return False


def collect_project_files() -> list[Path]:
    files: list[Path] = []

    for dirpath, dirnames, filenames in os.walk(ROOT):
        current_dir = Path(dirpath)

        dirnames[:] = [
            d for d in dirnames
            if d not in EXCLUDED_DIRS
        ]

        for filename in filenames:
            path = current_dir / filename

            if should_skip_file(path):
                continue

            files.append(path)

    return sorted(files, key=lambda p: relative_path(p).lower())


# ============================================================
# PYTHON ANALYSIS
# ============================================================

def ast_unparse_safe(node: ast.AST | None) -> str | None:
    if node is None:
        return None

    try:
        return ast.unparse(node)
    except Exception:
        return None


def get_doc_first_line(node: ast.AST) -> str | None:
    doc = ast.get_docstring(node)
    if not doc:
        return None

    first = doc.strip().splitlines()[0].strip()
    return first[:300]


def format_function_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    parts: list[str] = []

    all_args = list(node.args.posonlyargs) + list(node.args.args)
    for arg in all_args:
        annotation = ast_unparse_safe(arg.annotation)
        if annotation:
            parts.append(f"{arg.arg}: {annotation}")
        else:
            parts.append(arg.arg)

    if node.args.vararg:
        parts.append(f"*{node.args.vararg.arg}")

    for arg in node.args.kwonlyargs:
        annotation = ast_unparse_safe(arg.annotation)
        if annotation:
            parts.append(f"{arg.arg}: {annotation}")
        else:
            parts.append(arg.arg)

    if node.args.kwarg:
        parts.append(f"**{node.args.kwarg.arg}")

    return f"{node.name}({', '.join(parts)})"


def parse_function(node: ast.FunctionDef | ast.AsyncFunctionDef) -> FunctionInfo:
    return FunctionInfo(
        name=node.name,
        type="async_function" if isinstance(node, ast.AsyncFunctionDef) else "function",
        line_start=getattr(node, "lineno", None),
        line_end=getattr(node, "end_lineno", None),
        signature=format_function_signature(node),
        decorators=[
            item for item in (ast_unparse_safe(d) for d in node.decorator_list)
            if item
        ],
        returns=ast_unparse_safe(node.returns),
        doc=get_doc_first_line(node),
    )


def parse_class(node: ast.ClassDef) -> ClassInfo:
    methods: list[FunctionInfo] = []

    for child in node.body:
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
            methods.append(parse_function(child))

    return ClassInfo(
        name=node.name,
        line_start=getattr(node, "lineno", None),
        line_end=getattr(node, "end_lineno", None),
        bases=[
            item for item in (ast_unparse_safe(base) for base in node.bases)
            if item
        ],
        decorators=[
            item for item in (ast_unparse_safe(d) for d in node.decorator_list)
            if item
        ],
        methods=methods,
        doc=get_doc_first_line(node),
    )


def parse_import(node: ast.AST) -> list[ImportInfo]:
    results: list[ImportInfo] = []

    if isinstance(node, ast.Import):
        for alias in node.names:
            raw = f"import {alias.name}"
            if alias.asname:
                raw += f" as {alias.asname}"

            results.append(
                ImportInfo(
                    raw=raw,
                    module=alias.name,
                    names=[],
                    level=0,
                    type="import",
                )
            )

    elif isinstance(node, ast.ImportFrom):
        module = node.module or ""
        names = [alias.name for alias in node.names]
        dots = "." * node.level
        raw = f"from {dots}{module} import {', '.join(names)}"

        results.append(
            ImportInfo(
                raw=raw,
                module=module,
                names=names,
                level=node.level,
                type="from",
            )
        )

    return results


def extract_assignment_names(node: ast.AST) -> list[str]:
    names: list[str] = []

    def from_target(target: ast.AST) -> None:
        if isinstance(target, ast.Name):
            names.append(target.id)
        elif isinstance(target, ast.Tuple):
            for element in target.elts:
                from_target(element)
        elif isinstance(target, ast.Attribute):
            value = ast_unparse_safe(target)
            if value:
                names.append(value)

    if isinstance(node, ast.Assign):
        for target in node.targets:
            from_target(target)

    elif isinstance(node, ast.AnnAssign):
        from_target(node.target)

    return names


def module_aliases_for_python_file(path: Path) -> list[str]:
    rel = path.relative_to(ROOT).with_suffix("")
    parts = list(rel.parts)

    if not parts:
        return []

    if parts[-1] == "__init__":
        parts = parts[:-1]

    if not parts:
        return []

    aliases: list[str] = []

    if parts[0] in PYTHON_SOURCE_ROOTS and len(parts) > 1:
        aliases.append(".".join(parts[1:]))

    aliases.append(".".join(parts))

    return list(dict.fromkeys(aliases))


def analyze_python_file(path: Path, text: str | None) -> FileInfo:
    info = base_file_info(path, text)
    info.kind = "python"
    info.module_aliases = module_aliases_for_python_file(path)

    if text is None:
        info.notes.append(
            f"File is larger than {MAX_READ_FILE_SIZE_BYTES} bytes or cannot be read."
        )
        return info

    try:
        tree = ast.parse(text, filename=str(path))
    except SyntaxError as exc:
        info.notes.append(f"Python SyntaxError: {exc}")
        return info
    except Exception as exc:
        info.notes.append(f"Python parse error: {exc}")
        return info

    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            info.imports.extend(parse_import(node))

        elif isinstance(node, ast.ClassDef):
            info.classes.append(parse_class(node))

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            info.functions.append(parse_function(node))

        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            info.top_level_symbols.extend(extract_assignment_names(node))

    info.top_level_symbols = sorted(set(info.top_level_symbols))

    return info


# ============================================================
# JS / TS / GOOGLE APPS SCRIPT SIMPLE ANALYSIS
# ============================================================

IMPORT_FROM_RE = re.compile(
    r"""(?:import\s+.*?\s+from\s+|export\s+.*?\s+from\s+)["']([^"']+)["']"""
)
REQUIRE_RE = re.compile(r"""require\(["']([^"']+)["']\)""")
JS_FUNCTION_RE = re.compile(
    r"""(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\("""
)
JS_CONST_FUNCTION_RE = re.compile(
    r"""(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"""
)
JS_CLASS_RE = re.compile(
    r"""(?:export\s+)?class\s+([A-Za-z_$][\w$]*)"""
)


def analyze_script_like_file(path: Path, text: str | None) -> FileInfo:
    info = base_file_info(path, text)
    info.kind = "script"

    if text is None:
        info.notes.append(
            f"File is larger than {MAX_READ_FILE_SIZE_BYTES} bytes or cannot be read."
        )
        return info

    imports = sorted(set(IMPORT_FROM_RE.findall(text) + REQUIRE_RE.findall(text)))
    info.imports = [
        ImportInfo(raw=f"import/require {item}", module=item, type="script_import")
        for item in imports
    ]

    function_names = sorted(
        set(JS_FUNCTION_RE.findall(text) + JS_CONST_FUNCTION_RE.findall(text))
    )

    class_names = sorted(set(JS_CLASS_RE.findall(text)))

    info.functions = [
        FunctionInfo(name=name, type="function")
        for name in function_names
    ]

    info.classes = [
        ClassInfo(name=name)
        for name in class_names
    ]

    return info


# ============================================================
# MARKDOWN / CONFIG ANALYSIS
# ============================================================

MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
YAML_TOP_KEY_RE = re.compile(r"^([A-Za-z0-9_.-]+):\s*", re.MULTILINE)
TOML_SECTION_RE = re.compile(r"^\[([A-Za-z0-9_.-]+)]\s*$", re.MULTILINE)


def analyze_markdown_file(path: Path, text: str | None) -> FileInfo:
    info = base_file_info(path, text)
    info.kind = "markdown"

    if text is None:
        info.notes.append(
            f"File is larger than {MAX_READ_FILE_SIZE_BYTES} bytes or cannot be read."
        )
        return info

    headings = []
    for level, title in MD_HEADING_RE.findall(text):
        headings.append(f"{level} {title.strip()}")

    info.headings = headings[:100]
    return info


def analyze_config_file(path: Path, text: str | None) -> FileInfo:
    info = base_file_info(path, text)
    info.kind = "config"

    if text is None:
        info.notes.append(
            f"File is larger than {MAX_READ_FILE_SIZE_BYTES} bytes or cannot be read."
        )
        return info

    suffix = path.suffix.lower()

    if suffix == ".json":
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                info.config_keys = sorted(str(k) for k in data.keys())
            elif isinstance(data, list):
                info.config_keys = [f"JSON list with {len(data)} items"]
        except Exception as exc:
            info.notes.append(f"JSON parse error: {exc}")

    elif suffix in {".yaml", ".yml"}:
        info.config_keys = sorted(set(YAML_TOP_KEY_RE.findall(text)))[:150]

    elif suffix == ".toml":
        info.config_keys = sorted(set(TOML_SECTION_RE.findall(text)))[:150]

    elif suffix in {".ini", ".cfg"}:
        info.config_keys = [
            line.strip()
            for line in text.splitlines()
            if line.strip().startswith("[") and line.strip().endswith("]")
        ][:150]

    return info


def analyze_generic_text_file(path: Path, text: str | None) -> FileInfo:
    info = base_file_info(path, text)
    info.kind = "text"

    if text is None:
        info.notes.append(
            f"File is larger than {MAX_READ_FILE_SIZE_BYTES} bytes or cannot be read."
        )

    return info


# ============================================================
# FILE INFO / DEPENDENCY RESOLUTION
# ============================================================

def base_file_info(path: Path, text: str | None) -> FileInfo:
    stat = path.stat()

    return FileInfo(
        path=relative_path(path),
        extension=path.suffix.lower(),
        size_bytes=stat.st_size,
        line_count=count_lines(text),
        sha1_short=short_sha1(path),
    )


def build_python_module_index(files: list[FileInfo]) -> dict[str, str]:
    index: dict[str, str] = {}

    for file_info in files:
        if file_info.kind != "python":
            continue

        for alias in file_info.module_aliases:
            index[alias] = file_info.path

    return index


def current_package_for_file(file_info: FileInfo) -> str:
    if not file_info.module_aliases:
        return ""

    module = file_info.module_aliases[0]
    path = Path(file_info.path)

    if path.name == "__init__.py":
        return module

    parts = module.split(".")
    return ".".join(parts[:-1])


def resolve_relative_python_import(file_info: FileInfo, import_info: ImportInfo) -> str:
    package = current_package_for_file(file_info)
    package_parts = package.split(".") if package else []

    if import_info.level <= 0:
        return import_info.module or ""

    # level=1 means current package, level=2 parent, etc.
    drop_count = import_info.level - 1

    if drop_count > 0:
        base_parts = package_parts[:-drop_count]
    else:
        base_parts = package_parts

    if import_info.module:
        base_parts += import_info.module.split(".")

    return ".".join(part for part in base_parts if part)


def find_module_match(module_name: str, module_index: dict[str, str]) -> str | None:
    if not module_name:
        return None

    parts = module_name.split(".")

    for i in range(len(parts), 0, -1):
        candidate = ".".join(parts[:i])
        if candidate in module_index:
            return module_index[candidate]

    return None


def resolve_python_dependencies(files: list[FileInfo]) -> None:
    module_index = build_python_module_index(files)

    for file_info in files:
        if file_info.kind != "python":
            continue

        deps: set[str] = set()

        for import_info in file_info.imports:
            candidates: list[str] = []

            if import_info.type == "import":
                if import_info.module:
                    candidates.append(import_info.module)

            elif import_info.type == "from":
                base_module = (
                    resolve_relative_python_import(file_info, import_info)
                    if import_info.level > 0
                    else import_info.module or ""
                )

                if base_module:
                    candidates.append(base_module)

                for name in import_info.names:
                    if base_module:
                        candidates.append(f"{base_module}.{name}")
                    else:
                        candidates.append(name)

            for candidate in candidates:
                match = find_module_match(candidate, module_index)
                if match and match != file_info.path:
                    deps.add(match)

        file_info.internal_dependencies = sorted(deps)


def resolve_relative_script_path(current_file: Path, import_value: str) -> str | None:
    if not import_value.startswith("."):
        return None

    base = current_file.parent / import_value
    candidates: list[Path] = []

    if base.suffix:
        candidates.append(base)
    else:
        for ext in [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".html", ".gs"]:
            candidates.append(base.with_suffix(ext))

        for ext in [".js", ".jsx", ".ts", ".tsx"]:
            candidates.append(base / f"index{ext}")

    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate.exists() and candidate.is_file() and ROOT in candidate.parents:
            return relative_path(candidate)

    return None


def resolve_script_dependencies(files: list[FileInfo]) -> None:
    file_by_path = {file_info.path: file_info for file_info in files}

    for file_info in files:
        if file_info.kind != "script":
            continue

        current_path = ROOT / file_info.path
        deps: set[str] = set()

        for import_info in file_info.imports:
            if not import_info.module:
                continue

            match = resolve_relative_script_path(current_path, import_info.module)
            if match and match in file_by_path and match != file_info.path:
                deps.add(match)

        file_info.internal_dependencies = sorted(deps)


# ============================================================
# OUTPUT RENDERING
# ============================================================

def render_tree(paths: list[str]) -> list[str]:
    tree: dict[str, Any] = {}

    for path in paths:
        parts = Path(path).parts
        node = tree

        for part in parts[:-1]:
            node = node.setdefault(part, {})

        node.setdefault("__files__", []).append(parts[-1])

    lines: list[str] = []

    def walk(node: dict[str, Any], indent: int = 0) -> None:
        if len(lines) >= MAX_TREE_LINES:
            return

        dirs = sorted(k for k in node.keys() if k != "__files__")
        files = sorted(node.get("__files__", []))

        for dirname in dirs:
            lines.append(f"{'  ' * indent}- {dirname}/")
            walk(node[dirname], indent + 1)

            if len(lines) >= MAX_TREE_LINES:
                return

        for filename in files:
            lines.append(f"{'  ' * indent}- {filename}")

            if len(lines) >= MAX_TREE_LINES:
                return

    walk(tree)

    if len(paths) > MAX_TREE_LINES:
        lines.append(f"... tree truncated after {MAX_TREE_LINES} lines")

    return lines


def render_function(item: FunctionInfo) -> str:
    location = ""
    if item.line_start:
        if item.line_end and item.line_end != item.line_start:
            location = f" lines {item.line_start}-{item.line_end}"
        else:
            location = f" line {item.line_start}"

    signature = item.signature or item.name
    result = f"- `{signature}` ({item.type}{location})"

    if item.returns:
        result += f" -> `{item.returns}`"

    if item.doc:
        result += f" — {item.doc}"

    return result


def render_class(item: ClassInfo) -> list[str]:
    location = ""
    if item.line_start:
        if item.line_end and item.line_end != item.line_start:
            location = f" lines {item.line_start}-{item.line_end}"
        else:
            location = f" line {item.line_start}"

    bases = f"({', '.join(item.bases)})" if item.bases else ""
    first = f"- class `{item.name}{bases}`{location}"

    if item.doc:
        first += f" — {item.doc}"

    lines = [first]

    if item.methods:
        lines.append("  - methods:")
        for method in item.methods[:MAX_SYMBOLS_PER_FILE_IN_MD]:
            lines.append("    " + render_function(method))

    return lines


def render_markdown_report(files: list[FileInfo]) -> str:
    generated_at = datetime.now().isoformat(timespec="seconds")

    py_files = [f for f in files if f.kind == "python"]
    script_files = [f for f in files if f.kind == "script"]
    config_files = [f for f in files if f.kind == "config"]
    markdown_files = [f for f in files if f.kind == "markdown"]

    dependency_edges = []
    for file_info in files:
        for dep in file_info.internal_dependencies:
            dependency_edges.append((file_info.path, dep))

    lines: list[str] = []

    lines.append("# Project Context Map")
    lines.append("")
    lines.append(f"Generated at: `{generated_at}`")
    lines.append(f"Project root: `{ROOT}`")
    lines.append("")
    lines.append("Purpose: this file is a compact project map for Claude Code. It shows which files exist, what functions/classes they contain, and which internal files depend on which other files.")
    lines.append("")
    lines.append("## Suggested Claude Code instruction")
    lines.append("")
    lines.append("```text")
    lines.append("First read _claude_context/PROJECT_CONTEXT_MAP.md.")
    lines.append("Use it as a navigation map. Do not read the whole repository blindly.")
    lines.append("Open only the files that are relevant to the task, based on functions, classes, dependencies and file descriptions from the map.")
    lines.append("When changing code, work in small steps and explain which files need to be opened and why.")
    lines.append("```")
    lines.append("")
    lines.append("## Scan settings")
    lines.append("")
    lines.append("Excluded directories:")
    lines.append("")
    for item in sorted(EXCLUDED_DIRS):
        lines.append(f"- `{item}`")
    lines.append("")
    lines.append("Excluded sensitive files:")
    lines.append("")
    for item in sorted(EXCLUDED_FILE_NAMES):
        lines.append(f"- `{item}`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Total scanned files: `{len(files)}`")
    lines.append(f"- Python files: `{len(py_files)}`")
    lines.append(f"- Script files JS/TS/GS/etc.: `{len(script_files)}`")
    lines.append(f"- Config files: `{len(config_files)}`")
    lines.append(f"- Markdown files: `{len(markdown_files)}`")
    lines.append(f"- Internal dependency edges: `{len(dependency_edges)}`")
    lines.append("")
    lines.append("## Project tree")
    lines.append("")
    lines.append("```text")
    lines.extend(render_tree([f.path for f in files]))
    lines.append("```")
    lines.append("")

    lines.append("## Internal dependency map")
    lines.append("")

    if dependency_edges:
        for source, target in sorted(dependency_edges):
            lines.append(f"- `{source}` -> `{target}`")
    else:
        lines.append("No internal dependencies detected.")
    lines.append("")

    lines.append("## Python files")
    lines.append("")

    for file_info in py_files[:MAX_MARKDOWN_FILES]:
        lines.append(f"### `{file_info.path}`")
        lines.append("")
        lines.append(f"- Lines: `{file_info.line_count}`")
        lines.append(f"- Size: `{file_info.size_bytes}` bytes")
        lines.append(f"- SHA1: `{file_info.sha1_short}`")

        if file_info.module_aliases:
            lines.append(f"- Module aliases: {', '.join(f'`{x}`' for x in file_info.module_aliases)}")

        if file_info.internal_dependencies:
            lines.append("- Internal dependencies:")
            for dep in file_info.internal_dependencies:
                lines.append(f"  - `{dep}`")

        if file_info.imports:
            lines.append("- Imports:")
            for imp in file_info.imports[:80]:
                lines.append(f"  - `{imp.raw}`")

        if file_info.top_level_symbols:
            lines.append("- Top-level symbols:")
            for symbol in file_info.top_level_symbols[:MAX_SYMBOLS_PER_FILE_IN_MD]:
                lines.append(f"  - `{symbol}`")

        if file_info.classes:
            lines.append("- Classes:")
            for cls in file_info.classes[:MAX_SYMBOLS_PER_FILE_IN_MD]:
                for cls_line in render_class(cls):
                    lines.append("  " + cls_line)

        if file_info.functions:
            lines.append("- Functions:")
            for fn in file_info.functions[:MAX_SYMBOLS_PER_FILE_IN_MD]:
                lines.append("  " + render_function(fn))

        if file_info.notes:
            lines.append("- Notes:")
            for note in file_info.notes:
                lines.append(f"  - {note}")

        lines.append("")

    lines.append("## Script files")
    lines.append("")

    for file_info in script_files[:MAX_MARKDOWN_FILES]:
        lines.append(f"### `{file_info.path}`")
        lines.append("")
        lines.append(f"- Lines: `{file_info.line_count}`")
        lines.append(f"- Size: `{file_info.size_bytes}` bytes")

        if file_info.internal_dependencies:
            lines.append("- Internal dependencies:")
            for dep in file_info.internal_dependencies:
                lines.append(f"  - `{dep}`")

        if file_info.imports:
            lines.append("- Imports:")
            for imp in file_info.imports[:80]:
                lines.append(f"  - `{imp.raw}`")

        if file_info.classes:
            lines.append("- Classes:")
            for cls in file_info.classes[:MAX_SYMBOLS_PER_FILE_IN_MD]:
                lines.append(f"  - `{cls.name}`")

        if file_info.functions:
            lines.append("- Functions:")
            for fn in file_info.functions[:MAX_SYMBOLS_PER_FILE_IN_MD]:
                lines.append(f"  - `{fn.name}`")

        if file_info.notes:
            lines.append("- Notes:")
            for note in file_info.notes:
                lines.append(f"  - {note}")

        lines.append("")

    lines.append("## Config files")
    lines.append("")

    for file_info in config_files[:MAX_MARKDOWN_FILES]:
        lines.append(f"### `{file_info.path}`")
        lines.append("")
        lines.append(f"- Lines: `{file_info.line_count}`")
        lines.append(f"- Size: `{file_info.size_bytes}` bytes")

        if file_info.config_keys:
            lines.append("- Detected top-level keys / sections:")
            for key in file_info.config_keys[:150]:
                lines.append(f"  - `{key}`")

        if file_info.notes:
            lines.append("- Notes:")
            for note in file_info.notes:
                lines.append(f"  - {note}")

        lines.append("")

    lines.append("## Markdown files")
    lines.append("")

    for file_info in markdown_files[:MAX_MARKDOWN_FILES]:
        lines.append(f"### `{file_info.path}`")
        lines.append("")
        lines.append(f"- Lines: `{file_info.line_count}`")
        lines.append(f"- Size: `{file_info.size_bytes}` bytes")

        if file_info.headings:
            lines.append("- Headings:")
            for heading in file_info.headings[:100]:
                lines.append(f"  - `{heading}`")

        if file_info.notes:
            lines.append("- Notes:")
            for note in file_info.notes:
                lines.append(f"  - {note}")

        lines.append("")

    lines.append("## Other text files")
    lines.append("")

    other_files = [
        f for f in files
        if f.kind not in {"python", "script", "config", "markdown"}
    ]

    if other_files:
        for file_info in other_files[:MAX_MARKDOWN_FILES]:
            lines.append(f"- `{file_info.path}` — {file_info.line_count} lines, {file_info.size_bytes} bytes")
    else:
        lines.append("No other text files detected.")

    lines.append("")

    return "\n".join(lines)


def save_outputs(files: list[FileInfo]) -> None:
    output_dir = ROOT / OUTPUT_DIR_NAME
    output_dir.mkdir(exist_ok=True)

    data = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "project_root": str(ROOT),
        "settings": {
            "excluded_dirs": sorted(EXCLUDED_DIRS),
            "excluded_file_names": sorted(EXCLUDED_FILE_NAMES),
            "max_read_file_size_bytes": MAX_READ_FILE_SIZE_BYTES,
        },
        "files": [asdict(file_info) for file_info in files],
    }

    json_path = output_dir / OUTPUT_JSON_NAME
    md_path = output_dir / OUTPUT_MD_NAME

    json_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    md_path.write_text(
        render_markdown_report(files),
        encoding="utf-8",
    )

    print()
    print("Done.")
    print(f"Markdown map: {md_path}")
    print(f"JSON map:     {json_path}")
    print()
    print("Give Claude Code this instruction:")
    print()
    print("First read _claude_context/PROJECT_CONTEXT_MAP.md and use it as a navigation map.")
    print("Do not read the whole repository blindly. Open only files relevant to the task.")


# ============================================================
# MAIN
# ============================================================

def analyze_file(path: Path) -> FileInfo:
    text = safe_read_text(path)
    suffix = path.suffix.lower()

    if suffix == ".py":
        return analyze_python_file(path, text)

    if suffix in {".js", ".jsx", ".ts", ".tsx", ".gs"}:
        return analyze_script_like_file(path, text)

    if suffix == ".md":
        return analyze_markdown_file(path, text)

    if suffix in {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg"}:
        return analyze_config_file(path, text)

    return analyze_generic_text_file(path, text)


def main() -> None:
    print("Scanning project...")
    print(f"Root: {ROOT}")
    print()

    paths = collect_project_files()
    print(f"Files selected for analysis: {len(paths)}")

    files: list[FileInfo] = []

    for index, path in enumerate(paths, start=1):
        rel = relative_path(path)

        if index % 100 == 0:
            print(f"Analyzed {index}/{len(paths)} files...")

        try:
            files.append(analyze_file(path))
        except Exception as exc:
            fallback = base_file_info(path, None)
            fallback.notes.append(f"Unhandled analysis error: {exc}")
            files.append(fallback)
            print(f"Warning: failed to analyze {rel}: {exc}")

    resolve_python_dependencies(files)
    resolve_script_dependencies(files)

    save_outputs(files)


if __name__ == "__main__":
    main()