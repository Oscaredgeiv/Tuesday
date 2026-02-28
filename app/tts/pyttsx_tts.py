"""pyttsx3 TTS provider (offline, cross-platform)."""

from __future__ import annotations

import logging
import threading

from app.tts.base import TTSProvider

logger = logging.getLogger(__name__)


class PyttsxTTS(TTSProvider):
    """Text-to-speech using pyttsx3 (works offline on all platforms)."""

    def __init__(self, rate: int = 175, volume: float = 0.9):
        self._rate = rate
        self._volume = volume
        self._engine = None
        self._load_error: str | None = None
        self._lock = threading.Lock()

    def _ensure_engine(self):
        if self._engine is not None:
            return
        if self._load_error:
            return

        try:
            import pyttsx3

            self._engine = pyttsx3.init()
            self._engine.setProperty("rate", self._rate)
            self._engine.setProperty("volume", self._volume)
            logger.info("pyttsx3 TTS engine initialized.")
        except ImportError:
            self._load_error = "pyttsx3 is not installed. Run: pip install pyttsx3"
            logger.error(self._load_error)
        except Exception as e:
            self._load_error = f"Failed to init TTS engine: {e}"
            logger.error(self._load_error)

    def speak(self, text: str) -> None:
        self._ensure_engine()

        if self._engine is None:
            logger.warning("TTS unavailable: %s", self._load_error)
            return

        def _speak():
            with self._lock:
                try:
                    self._engine.say(text)
                    self._engine.runAndWait()
                except Exception as e:
                    logger.error("TTS speak error: %s", e)

        # Run in a thread so we don't block the UI
        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()

    def is_available(self) -> bool:
        self._ensure_engine()
        return self._engine is not None

    @property
    def name(self) -> str:
        return "pyttsx3"
