"""Tests for configuration."""

from app.config import TuesdayConfig


class TestConfig:
    def test_defaults(self):
        cfg = TuesdayConfig()
        assert cfg.stt_model == "base.en"
        assert cfg.tts_rate == 175
        assert cfg.wake_word_enabled is False
        assert cfg.wake_phrase == "hey tuesday"
        assert cfg.sample_rate == 16000

    def test_ensure_dirs(self, tmp_path):
        cfg = TuesdayConfig(
            notes_dir=tmp_path / "notes",
            reports_dir=tmp_path / "reports",
            user_commands_dir=tmp_path / "user_commands",
            user_generated_dir=tmp_path / "generated",
        )
        cfg.ensure_dirs()
        assert (tmp_path / "notes").is_dir()
        assert (tmp_path / "reports").is_dir()
        assert (tmp_path / "user_commands").is_dir()
        assert (tmp_path / "generated").is_dir()
