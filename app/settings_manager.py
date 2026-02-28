"""Central settings and memory persistence for Tuesday."""

from __future__ import annotations

import json
import logging
import os
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QObject, Signal

from app.config import config

logger = logging.getLogger(__name__)

SETTINGS_VERSION = 1


@dataclass
class HotkeySettings:
    mic_toggle: str = ""
    dictation_toggle: str = ""
    stop_speaking: str = ""


@dataclass
class AISettings:
    model: str = "claude-sonnet-4-20250514"
    enabled: bool = True
    confidence_threshold: float = 0.7


@dataclass
class STTSettings:
    model: str = "base.en"
    device: str = "cpu"


@dataclass
class TTSSettings:
    rate: int = 175
    volume: float = 0.9


@dataclass
class WakeWordSettings:
    enabled: bool = False
    phrase: str = "hey tuesday"


@dataclass
class AppSettings:
    version: int = SETTINGS_VERSION
    api_key: str = ""
    hotkeys: HotkeySettings = field(default_factory=HotkeySettings)
    custom_rules: str = ""
    ai: AISettings = field(default_factory=AISettings)
    stt: STTSettings = field(default_factory=STTSettings)
    tts: TTSSettings = field(default_factory=TTSSettings)
    wake_word: WakeWordSettings = field(default_factory=WakeWordSettings)


class SettingsManager(QObject):
    """Manages persisted settings and memory for Tuesday."""

    settings_changed = Signal()
    memory_changed = Signal(str)

    def __init__(self, data_dir: Path | None = None, parent: QObject | None = None):
        super().__init__(parent)
        self._data_dir = data_dir or config.data_dir
        self._settings_file = self._data_dir / "settings.json"
        self._memory_file = self._data_dir / "memory.md"
        self.settings = AppSettings()

    def load(self) -> AppSettings:
        """Load settings from disk. Falls back to defaults on error."""
        if not self._settings_file.exists():
            return self.settings

        try:
            raw = self._settings_file.read_text(encoding="utf-8")
            data = json.loads(raw)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Corrupt settings file, using defaults: %s", e)
            return self.settings

        self.settings = AppSettings(
            version=data.get("version", SETTINGS_VERSION),
            api_key=data.get("api_key", ""),
            hotkeys=HotkeySettings(**data.get("hotkeys", {})),
            custom_rules=data.get("custom_rules", ""),
            ai=AISettings(**data.get("ai", {})),
            stt=STTSettings(**data.get("stt", {})),
            tts=TTSSettings(**data.get("tts", {})),
            wake_word=WakeWordSettings(**data.get("wake_word", {})),
        )
        return self.settings

    def save(self) -> None:
        """Atomically save settings to disk."""
        self._data_dir.mkdir(parents=True, exist_ok=True)
        data = asdict(self.settings)

        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=str(self._data_dir), suffix=".tmp", prefix="settings_"
            )
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            tmp = Path(tmp_path)
            tmp.replace(self._settings_file)
        except OSError as e:
            logger.error("Failed to save settings: %s", e)
            raise

        self.settings_changed.emit()

    def load_memories(self) -> str:
        """Load memory file and return as prompt-ready string."""
        if not self._memory_file.exists():
            return ""

        try:
            content = self._memory_file.read_text(encoding="utf-8")
        except OSError as e:
            logger.warning("Failed to read memory file: %s", e)
            return ""

        # Strip the header and extract entries
        lines = content.strip().split("\n")
        entries = []
        current: list[str] = []
        for line in lines:
            if line.startswith("## "):
                if current:
                    entries.append("\n".join(current).strip())
                current = []
            elif line.startswith("# "):
                continue
            else:
                current.append(line)
        if current:
            entries.append("\n".join(current).strip())

        return "\n".join(e for e in entries if e)

    def add_memory(self, content: str) -> None:
        """Append a timestamped memory entry."""
        self._data_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"\n## {timestamp}\n\n{content}\n"

        if not self._memory_file.exists():
            self._memory_file.write_text(f"# Tuesday Memory\n{entry}", encoding="utf-8")
        else:
            with open(self._memory_file, "a", encoding="utf-8") as f:
                f.write(entry)

        self.memory_changed.emit(self.load_memories())

    def clear_memories(self) -> None:
        """Reset the memory file."""
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._memory_file.write_text("# Tuesday Memory\n", encoding="utf-8")
        self.memory_changed.emit("")

    def get_memory_raw(self) -> str:
        """Return raw contents of the memory file for display."""
        if not self._memory_file.exists():
            return ""
        try:
            return self._memory_file.read_text(encoding="utf-8")
        except OSError:
            return ""

    def apply_to_env(self) -> None:
        """Set the API key as an environment variable if configured."""
        if self.settings.api_key:
            os.environ["ANTHROPIC_API_KEY"] = self.settings.api_key


# Lazy singleton — must be created after QApplication exists
_instance: SettingsManager | None = None


def get_settings_manager() -> SettingsManager:
    """Get or create the global SettingsManager singleton."""
    global _instance
    if _instance is None:
        _instance = SettingsManager()
    return _instance
