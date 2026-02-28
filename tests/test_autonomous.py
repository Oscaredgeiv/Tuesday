"""Tests for the autonomous runner."""

from app.autonomous.runner import AutonomousRunner, SessionReport, TaskResult


class TestAutonomousRunner:
    def test_disallowed_command(self):
        runner = AutonomousRunner(allowed_commands=["git status"])
        result = runner.run_task("rm -rf /")
        assert result.exit_code == -1
        assert "not allowed" in result.stderr

    def test_allowed_command_runs(self):
        runner = AutonomousRunner(allowed_commands=["git status"])
        result = runner.run_task("git status")
        # May or may not be in a git repo during tests, but should not be "not allowed"
        assert "not allowed" not in result.stderr

    def test_session_report_markdown(self):
        from datetime import datetime

        report = SessionReport(started_at=datetime.now())
        report.results.append(
            TaskResult(
                command="git status",
                exit_code=0,
                stdout="clean",
                stderr="",
                duration_seconds=0.1,
            )
        )
        report.ended_at = datetime.now()
        md = report.to_markdown()
        assert "git status" in md
        assert "PASS" in md

    def test_session_report_tracks_failures(self):
        from datetime import datetime

        report = SessionReport(started_at=datetime.now())
        report.results.append(
            TaskResult(command="fail", exit_code=1, stdout="", stderr="err", duration_seconds=0.1)
        )
        report.ended_at = datetime.now()
        assert not report.all_passed
