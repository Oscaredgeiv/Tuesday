"""Tests for the settings manager module."""

import json

from app.settings_manager import AppSettings, HotkeySettings, SettingsManager


class TestSettingsManagerDefaults:
    def test_default_settings(self):
        s = AppSettings()
        assert s.api_key == ""
        assert s.ai.model == "claude-sonnet-4-20250514"
        assert s.ai.confidence_threshold == 0.7
        assert s.stt.model == "base.en"
        assert s.hotkeys.mic_toggle == ""
        assert s.custom_rules == ""
        assert s.wake_word.enabled is False

    def test_load_returns_defaults_when_no_file(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        settings = mgr.load()
        assert settings.api_key == ""
        assert settings.ai.model == "claude-sonnet-4-20250514"


class TestSettingsManagerSaveLoad:
    def test_save_creates_file(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.settings.api_key = "sk-test-123"
        mgr.save()
        assert (tmp_path / "settings.json").exists()

    def test_roundtrip(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.settings.api_key = "sk-test-key"
        mgr.settings.hotkeys = HotkeySettings(mic_toggle="F5")
        mgr.settings.custom_rules = "Be concise."
        mgr.settings.ai.confidence_threshold = 0.8
        mgr.save()

        mgr2 = SettingsManager(data_dir=tmp_path)
        loaded = mgr2.load()
        assert loaded.api_key == "sk-test-key"
        assert loaded.hotkeys.mic_toggle == "F5"
        assert loaded.custom_rules == "Be concise."
        assert loaded.ai.confidence_threshold == 0.8

    def test_save_emits_signal(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        received = []
        mgr.settings_changed.connect(lambda: received.append(True))
        mgr.save()
        assert len(received) == 1

    def test_corrupt_json_falls_back_to_defaults(self, tmp_path):
        settings_file = tmp_path / "settings.json"
        settings_file.write_text("{broken json!!!", encoding="utf-8")

        mgr = SettingsManager(data_dir=tmp_path)
        settings = mgr.load()
        assert settings.api_key == ""
        assert settings.ai.model == "claude-sonnet-4-20250514"

    def test_save_creates_data_dir(self, tmp_path):
        data_dir = tmp_path / "subdir" / "data"
        mgr = SettingsManager(data_dir=data_dir)
        mgr.settings.api_key = "test"
        mgr.save()
        assert (data_dir / "settings.json").exists()

    def test_save_overwrites_previous(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.settings.api_key = "first"
        mgr.save()

        mgr.settings.api_key = "second"
        mgr.save()

        raw = json.loads((tmp_path / "settings.json").read_text(encoding="utf-8"))
        assert raw["api_key"] == "second"


class TestMemory:
    def test_add_memory_creates_file(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.add_memory("My name is Oz.")
        assert (tmp_path / "memory.md").exists()
        content = (tmp_path / "memory.md").read_text(encoding="utf-8")
        assert "My name is Oz." in content
        assert "# Tuesday Memory" in content

    def test_add_memory_appends(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.add_memory("First memory")
        mgr.add_memory("Second memory")
        content = (tmp_path / "memory.md").read_text(encoding="utf-8")
        assert "First memory" in content
        assert "Second memory" in content

    def test_load_memories_returns_entries(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.add_memory("I like pizza")
        mgr.add_memory("I use dark mode")
        memories = mgr.load_memories()
        assert "I like pizza" in memories
        assert "I use dark mode" in memories

    def test_load_memories_empty_when_no_file(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        assert mgr.load_memories() == ""

    def test_clear_memories(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.add_memory("Something")
        mgr.clear_memories()
        assert mgr.load_memories() == ""
        content = (tmp_path / "memory.md").read_text(encoding="utf-8")
        assert "# Tuesday Memory" in content

    def test_add_memory_emits_signal(self, tmp_path):
        mgr = SettingsManager(data_dir=tmp_path)
        received = []
        mgr.memory_changed.connect(lambda text: received.append(text))
        mgr.add_memory("Test entry")
        assert len(received) == 1
        assert "Test entry" in received[0]


class TestApplyToEnv:
    def test_apply_sets_env_var(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.settings.api_key = "sk-test-env"
        mgr.apply_to_env()
        import os

        assert os.environ["ANTHROPIC_API_KEY"] == "sk-test-env"

    def test_apply_skips_empty_key(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        mgr = SettingsManager(data_dir=tmp_path)
        mgr.settings.api_key = ""
        mgr.apply_to_env()
        import os

        assert "ANTHROPIC_API_KEY" not in os.environ
