"""Wake word detector — lightweight keyword spotter for 'Hey Tuesday'.

This uses a simple energy + keyword approach as the default.
Porcupine integration is available as an optional upgrade.
"""

from __future__ import annotations

import logging
import re

import numpy as np

logger = logging.getLogger(__name__)


class WakeWordDetector:
    """Lightweight wake word detector.

    Strategy: continuously run STT on short audio chunks and check for the wake phrase.
    This is the simple/reliable approach. For lower latency, swap in Porcupine.
    """

    def __init__(self, wake_phrase: str = "hey tuesday", energy_threshold: float = 0.01):
        self._wake_phrase = wake_phrase.lower().strip()
        self._energy_threshold = energy_threshold
        self._enabled = False

    @property
    def enabled(self) -> bool:
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value
        logger.info("Wake word detection %s", "enabled" if value else "disabled")

    def has_speech(self, audio: np.ndarray) -> bool:
        """Quick energy check — is there likely speech in this audio?"""
        if audio.size == 0:
            return False
        energy = np.sqrt(np.mean(audio.astype(np.float32) ** 2))
        return energy > self._energy_threshold

    def check_transcript(self, text: str) -> bool:
        """Check if transcribed text contains the wake phrase."""
        if not self._enabled:
            return False
        return bool(re.search(re.escape(self._wake_phrase), text.lower()))

    def strip_wake_phrase(self, text: str) -> str:
        """Remove the wake phrase from the beginning of a transcript."""
        cleaned = re.sub(
            r"^\s*" + re.escape(self._wake_phrase) + r"[,.\s]*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        return cleaned.strip()
