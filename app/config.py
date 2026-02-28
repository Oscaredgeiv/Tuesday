"""Central configuration for Tuesday."""

from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


@dataclass
class TuesdayConfig:
    """Runtime configuration."""

    # Paths
    root_dir: Path = field(default_factory=lambda: ROOT_DIR)
    notes_dir: Path = field(default_factory=lambda: ROOT_DIR / "notes")
    reports_dir: Path = field(default_factory=lambda: ROOT_DIR / "reports")
    user_commands_dir: Path = field(default_factory=lambda: ROOT_DIR / "user_commands")
    user_generated_dir: Path = field(
        default_factory=lambda: ROOT_DIR / "app" / "commands" / "user_generated"
    )

    # STT
    stt_model: str = "base.en"  # faster-whisper model size
    stt_device: str = "cpu"

    # TTS
    tts_rate: int = 175
    tts_volume: float = 0.9

    # Wake word
    wake_word_enabled: bool = False  # experimental — off by default
    wake_phrase: str = "hey tuesday"

    # Audio
    sample_rate: int = 16000
    channels: int = 1

    # Autonomous mode
    autonomous_max_minutes: int = 30
    autonomous_allowed_commands: list[str] = field(
        default_factory=lambda: ["python -m pytest", "python -m ruff check .", "git status"]
    )

    def ensure_dirs(self):
        """Create required directories if they don't exist."""
        for d in [
            self.notes_dir,
            self.reports_dir,
            self.user_commands_dir,
            self.user_generated_dir,
        ]:
            d.mkdir(parents=True, exist_ok=True)


# Singleton
config = TuesdayConfig()
