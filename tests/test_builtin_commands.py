"""Tests for built-in commands."""

from datetime import datetime

from app.commands.builtin import register_builtin_commands
from app.commands.router import CommandRouter


class TestBuiltinCommands:
    def _make_router(self) -> CommandRouter:
        router = CommandRouter()
        register_builtin_commands(router)
        return router

    def test_time_command(self):
        router = self._make_router()
        response, cmd = router.route("what time is it")
        assert cmd is not None
        assert cmd.name == "time"
        # Should contain current year
        assert str(datetime.now().year) in response

    def test_hello_command(self):
        router = self._make_router()
        response, cmd = router.route("hello")
        assert cmd is not None
        assert cmd.name == "hello"
        assert "Tuesday" in response

    def test_help_command(self):
        router = self._make_router()
        response, cmd = router.route("help")
        assert cmd is not None
        assert cmd.name == "help"
        assert "time" in response.lower()

    def test_show_commands(self):
        router = self._make_router()
        response, cmd = router.route("show commands")
        assert cmd is not None
        assert cmd.name == "show_commands"
        assert "time" in response.lower()

    def test_create_note(self, tmp_path, monkeypatch):
        import app.config as cfg

        monkeypatch.setattr(cfg.config, "notes_dir", tmp_path)

        router = self._make_router()
        response, cmd = router.route("create a note: buy milk tomorrow")
        assert cmd is not None
        assert cmd.name == "create_note"
        assert "buy milk tomorrow" in response

        notes_file = tmp_path / "notes.md"
        assert notes_file.exists()
        content = notes_file.read_text()
        assert "buy milk tomorrow" in content
