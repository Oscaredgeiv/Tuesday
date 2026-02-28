"""Tests for the voice programming system."""

import yaml

from app.commands.router import CommandRouter
from app.commands.voice_programmer import VoiceProgrammer


class TestVoiceProgrammer:
    def _setup(self, tmp_path, monkeypatch):
        import app.config as cfg

        monkeypatch.setattr(cfg.config, "user_commands_dir", tmp_path / "user_commands")
        monkeypatch.setattr(cfg.config, "user_generated_dir", tmp_path / "generated")

        import app.commands.voice_programmer as vp

        monkeypatch.setattr(vp, "COMMANDS_YAML", tmp_path / "user_commands" / "commands.yaml")

        router = CommandRouter()
        programmer = VoiceProgrammer(router)
        programmer.register_command(router)
        return router, programmer

    def test_create_command_via_voice(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        response, cmd = router.route(
            "create a command: when I say 'lights on', respond with 'Turning on the lights'"
        )
        assert cmd is not None
        assert cmd.name == "create_user_command"
        assert "Command created" in response

    def test_created_command_works(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        programmer.create_command("lights on", "Turning on the lights")
        response, cmd = router.route("lights on")
        assert cmd is not None
        assert response == "Turning on the lights"

    def test_create_saves_yaml(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        programmer.create_command("test trigger", "test response")

        yaml_file = tmp_path / "user_commands" / "commands.yaml"
        assert yaml_file.exists()
        data = yaml.safe_load(yaml_file.read_text())
        assert len(data["commands"]) == 1
        assert data["commands"][0]["trigger"] == "test trigger"

    def test_create_generates_handler_file(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        programmer.create_command("do stuff", "stuff done")
        handler = tmp_path / "generated" / "do_stuff.py"
        assert handler.exists()
        content = handler.read_text()
        assert "stuff done" in content

    def test_delete_command(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        programmer.create_command("test cmd", "test response")
        result = programmer.delete_command("test cmd")
        assert "deleted" in result.lower()

        # Should no longer match
        _, cmd = router.route("test cmd")
        assert cmd is None

    def test_duplicate_rejected(self, tmp_path, monkeypatch):
        router, programmer = self._setup(tmp_path, monkeypatch)

        programmer.create_command("my thing", "response 1")
        result = programmer.create_command("my thing", "response 2")
        assert "already exists" in result
