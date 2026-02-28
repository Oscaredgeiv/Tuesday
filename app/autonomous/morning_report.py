"""Morning report generator — summarizes project status."""

from __future__ import annotations

import logging
import subprocess
from datetime import datetime

from app.config import config

logger = logging.getLogger(__name__)


def generate_morning_report() -> str:
    """Generate a morning report summarizing changes, test status, and next steps."""
    sections = [
        "# Tuesday Morning Report",
        "",
        f"**Generated:** {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')}",
        "",
    ]

    # Git status
    sections.append("## Git Status")
    sections.append("")
    git_status = _run("git status --short")
    if git_status.strip():
        sections.append(f"```\n{git_status.strip()}\n```")
    else:
        sections.append("Working tree is clean.")
    sections.append("")

    # Recent commits
    sections.append("## Recent Commits")
    sections.append("")
    git_log = _run("git log --oneline -10")
    if git_log.strip():
        sections.append(f"```\n{git_log.strip()}\n```")
    else:
        sections.append("No commits yet.")
    sections.append("")

    # Test results
    sections.append("## Test Results")
    sections.append("")
    test_output = _run("python -m pytest --tb=short -q")
    if test_output.strip():
        sections.append(f"```\n{test_output.strip()}\n```")
    else:
        sections.append("Could not run tests.")
    sections.append("")

    # Lint results
    sections.append("## Lint Results")
    sections.append("")
    lint_output = _run("python -m ruff check . --statistics")
    if lint_output.strip():
        sections.append(f"```\n{lint_output.strip()}\n```")
    else:
        sections.append("All clean or ruff not available.")
    sections.append("")

    # User commands count
    sections.append("## User Commands")
    sections.append("")
    commands_file = config.user_commands_dir / "commands.yaml"
    if commands_file.exists():
        try:
            import yaml

            data = yaml.safe_load(commands_file.read_text(encoding="utf-8"))
            count = len(data.get("commands", [])) if data else 0
            sections.append(f"{count} user-defined commands configured.")
        except Exception:
            sections.append("Could not read commands file.")
    else:
        sections.append("No user commands configured yet.")
    sections.append("")

    # Notes count
    sections.append("## Notes")
    sections.append("")
    notes_file = config.notes_dir / "notes.md"
    if notes_file.exists():
        content = notes_file.read_text(encoding="utf-8")
        note_count = content.count("## 20")  # Matches timestamp headers
        sections.append(f"{note_count} notes saved.")
    else:
        sections.append("No notes yet.")
    sections.append("")

    # Next steps
    sections.append("## Suggested Next Steps")
    sections.append("")
    backlog = config.root_dir / "backlog.md"
    if backlog.exists():
        content = backlog.read_text(encoding="utf-8")
        # Find first unchecked item
        for line in content.splitlines():
            if line.strip().startswith("- [ ]"):
                sections.append(f"  {line.strip()}")
                break
    else:
        sections.append("- Check backlog.md for planned features")
    sections.append("")

    report = "\n".join(sections)

    # Save
    config.ensure_dirs()
    path = config.reports_dir / "morning_report.md"
    path.write_text(report, encoding="utf-8")
    logger.info("Morning report saved to: %s", path)

    return report


def _run(cmd: str) -> str:
    """Run a shell command and return combined output."""
    try:
        result = subprocess.run(
            cmd.split(),
            capture_output=True,
            text=True,
            cwd=str(config.root_dir),
            timeout=60,
        )
        return result.stdout + result.stderr
    except Exception as e:
        return f"Error: {e}"
