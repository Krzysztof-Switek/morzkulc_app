"""
Test reporter — generates JSON and Markdown reports from phase results.
"""
import json
import logging
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class PhaseResult:
    phase_id: str
    name: str
    status: str  # "pass" | "fail" | "skip" | "error"
    duration_s: float = 0.0
    message: str = ""
    details: dict = field(default_factory=dict)
    error: Optional[str] = None


class TestReporter:
    def __init__(self, env_name: str, output_dir: str = "./reports"):
        self.env_name = env_name
        self.output_dir = output_dir
        self.phases: list[PhaseResult] = []
        self.start_time = time.time()
        os.makedirs(output_dir, exist_ok=True)

    def record(self, result: PhaseResult):
        self.phases.append(result)
        icon = {"pass": "✓", "fail": "✗", "skip": "~", "error": "!"}.get(result.status, "?")
        log.info(f"  [{icon}] {result.phase_id} {result.name}: {result.status.upper()} ({result.duration_s:.1f}s)")
        if result.message:
            log.info(f"      {result.message}")
        if result.error:
            log.error(f"      ERROR: {result.error}")

    def save(self):
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        base = f"e2e_{self.env_name}_{ts}"
        json_path = os.path.join(self.output_dir, f"{base}.json")
        md_path = os.path.join(self.output_dir, f"{base}.md")

        total = len(self.phases)
        passed = sum(1 for p in self.phases if p.status == "pass")
        failed = sum(1 for p in self.phases if p.status in ("fail", "error"))
        skipped = sum(1 for p in self.phases if p.status == "skip")
        duration = time.time() - self.start_time

        summary = {
            "env": self.env_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_s": round(duration, 1),
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "phases": [asdict(p) for p in self.phases],
        }

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(self._render_markdown(summary))

        log.info(f"Report saved: {json_path}")
        log.info(f"Report saved: {md_path}")
        return json_path, md_path

    def print_summary(self):
        total = len(self.phases)
        passed = sum(1 for p in self.phases if p.status == "pass")
        failed = sum(1 for p in self.phases if p.status in ("fail", "error"))
        skipped = sum(1 for p in self.phases if p.status == "skip")
        duration = time.time() - self.start_time

        print("\n" + "=" * 60)
        print(f"  E2E TEST RESULTS [{self.env_name.upper()}]")
        print("=" * 60)
        for p in self.phases:
            icon = {"pass": "✓", "fail": "✗", "skip": "~", "error": "!"}.get(p.status, "?")
            line = f"  {icon} [{p.phase_id}] {p.name} ({p.duration_s:.1f}s)"
            if p.message:
                line += f" — {p.message}"
            print(line)
            if p.error:
                print(f"      ERROR: {p.error}")
        print("-" * 60)
        print(f"  TOTAL: {total}  PASS: {passed}  FAIL: {failed}  SKIP: {skipped}")
        print(f"  Duration: {duration:.1f}s")
        print("=" * 60)

    @staticmethod
    def _render_markdown(summary: dict) -> str:
        lines = [
            f"# E2E Test Report — {summary['env'].upper()}",
            f"",
            f"**Date:** {summary['timestamp']}  ",
            f"**Duration:** {summary['duration_s']}s  ",
            f"**Result:** {summary['passed']}/{summary['total']} passed, "
            f"{summary['failed']} failed, {summary['skipped']} skipped",
            f"",
            f"## Phases",
            f"",
            f"| Phase | Name | Status | Duration | Message |",
            f"|-------|------|--------|----------|---------|",
        ]
        for p in summary["phases"]:
            icon = {"pass": "✓", "fail": "✗", "skip": "~", "error": "!"}.get(p["status"], "?")
            msg = p.get("message", "")
            if p.get("error"):
                msg = f"ERROR: {p['error']}"
            lines.append(
                f"| {p['phase_id']} | {p['name']} | {icon} {p['status'].upper()} "
                f"| {p['duration_s']:.1f}s | {msg} |"
            )
        return "\n".join(lines) + "\n"