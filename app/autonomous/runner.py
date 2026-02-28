"""Autonomous task runner — bounded execution of internal dev tasks.

This is a *developer tool* that runs pre-approved commands for a bounded duration.
It only operates inside the repo directory and only runs allowlisted commands.
"""

from __future__ import annotations

import logging
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime

from app.config import config

logger = logging.getLogger(__name__)


@dataclass
class TaskResult:
    """Result of a single autonomous task."""

    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def passed(self) -> bool:
        return self.exit_code == 0


@dataclass
class SessionReport:
    """Summary of an autonomous session."""

    started_at: datetime
    ended_at: datetime | None = None
    results: list[TaskResult] = field(default_factory=list)
    max_minutes: int = 30

    @property
    def duration_minutes(self) -> float:
        end = self.ended_at or datetime.now()
        return (end - self.started_at).total_seconds() / 60

    @property
    def all_passed(self) -> bool:
        return all(r.passed for r in self.results)

    def to_markdown(self) -> str:
        lines = [
            "# Autonomous Session Report",
            "",
            f"**Started:** {self.started_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Ended:** {(self.ended_at or datetime.now()).strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Duration:** {self.duration_minutes:.1f} minutes",
            f"**Tasks run:** {len(self.results)}",
            f"**All passed:** {'Yes' if self.all_passed else 'No'}",
            "",
            "## Task Results",
            "",
        ]

        for i, r in enumerate(self.results, 1):
            status = "PASS" if r.passed else "FAIL"
            lines.append(f"### {i}. `{r.command}` [{status}]")
            lines.append("")
            lines.append(f"- Exit code: {r.exit_code}")
            lines.append(f"- Duration: {r.duration_seconds:.1f}s")
            if r.stdout.strip():
                lines.append("- Output:")
                lines.append("```")
                lines.append(r.stdout.strip()[-2000:])  # Truncate long output
                lines.append("```")
            if r.stderr.strip():
                lines.append("- Errors:")
                lines.append("```")
                lines.append(r.stderr.strip()[-1000:])
                lines.append("```")
            lines.append("")

        return "\n".join(lines)


class AutonomousRunner:
    """Runs bounded autonomous dev tasks."""

    def __init__(
        self,
        max_minutes: int | None = None,
        allowed_commands: list[str] | None = None,
    ):
        self._max_minutes = max_minutes or config.autonomous_max_minutes
        self._allowed_commands = allowed_commands or config.autonomous_allowed_commands
        self._running = False
        self._report: SessionReport | None = None

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def allowed_commands(self) -> list[str]:
        return list(self._allowed_commands)

    def _is_allowed(self, command: str) -> bool:
        """Check if a command is in the allowlist."""
        return command.strip() in self._allowed_commands

    def run_task(self, command: str) -> TaskResult:
        """Run a single allowed command."""
        if not self._is_allowed(command):
            return TaskResult(
                command=command,
                exit_code=-1,
                stdout="",
                stderr=f"Command not allowed: {command}",
                duration_seconds=0,
            )

        start = time.time()
        try:
            result = subprocess.run(
                command.split(),
                capture_output=True,
                text=True,
                cwd=str(config.root_dir),
                timeout=120,
            )
            duration = time.time() - start
            return TaskResult(
                command=command,
                exit_code=result.returncode,
                stdout=result.stdout,
                stderr=result.stderr,
                duration_seconds=duration,
            )
        except subprocess.TimeoutExpired:
            duration = time.time() - start
            return TaskResult(
                command=command,
                exit_code=-1,
                stdout="",
                stderr="Timed out after 120 seconds",
                duration_seconds=duration,
            )
        except Exception as e:
            duration = time.time() - start
            return TaskResult(
                command=command,
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_seconds=duration,
            )

    def run_session(self, tasks: list[str] | None = None) -> SessionReport:
        """Run a bounded autonomous session."""
        if tasks is None:
            tasks = list(self._allowed_commands)

        self._running = True
        report = SessionReport(
            started_at=datetime.now(),
            max_minutes=self._max_minutes,
        )

        logger.info(
            "Starting autonomous session (max %d min, %d tasks)", self._max_minutes, len(tasks)
        )

        for command in tasks:
            # Check time budget
            if report.duration_minutes >= self._max_minutes:
                logger.info("Time budget exhausted (%.1f min), stopping.", report.duration_minutes)
                break

            if not self._running:
                logger.info("Session cancelled.")
                break

            logger.info("Running: %s", command)
            result = self.run_task(command)
            report.results.append(result)
            logger.info(
                "  %s (exit=%d, %.1fs)",
                "PASS" if result.passed else "FAIL",
                result.exit_code,
                result.duration_seconds,
            )

        report.ended_at = datetime.now()
        self._running = False
        self._report = report

        # Save report
        self._save_report(report)

        return report

    def stop(self):
        """Signal the session to stop."""
        self._running = False

    def _save_report(self, report: SessionReport):
        """Save report to the reports directory."""
        config.ensure_dirs()
        timestamp = report.started_at.strftime("%Y%m%d_%H%M%S")
        path = config.reports_dir / f"session_{timestamp}.md"
        path.write_text(report.to_markdown(), encoding="utf-8")
        logger.info("Report saved to: %s", path)
