"""Dictation mode — types transcribed speech directly into the focused application."""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# Patterns that toggle dictation mode
START_PATTERNS = [
    re.compile(r"\bstart dictation\b", re.IGNORECASE),
    re.compile(r"\bdictation on\b", re.IGNORECASE),
    re.compile(r"\benable dictation\b", re.IGNORECASE),
]

STOP_PATTERNS = [
    re.compile(r"\bstop dictation\b", re.IGNORECASE),
    re.compile(r"\bdictation off\b", re.IGNORECASE),
    re.compile(r"\bdisable dictation\b", re.IGNORECASE),
]


class DictationController:
    """Controls dictation mode — when active, speech is typed into the focused field."""

    def __init__(self):
        self._active = False

    @property
    def is_active(self) -> bool:
        return self._active

    def activate(self):
        self._active = True
        logger.info("Dictation mode activated")

    def deactivate(self):
        self._active = False
        logger.info("Dictation mode deactivated")

    def toggle(self) -> bool:
        """Toggle dictation mode. Returns new state."""
        self._active = not self._active
        state = "activated" if self._active else "deactivated"
        logger.info("Dictation mode %s", state)
        return self._active

    def check_toggle_command(self, text: str) -> str | None:
        """Check if text is a dictation toggle command.

        Returns "start", "stop", or None.
        """
        for pattern in START_PATTERNS:
            if pattern.search(text):
                return "start"
        for pattern in STOP_PATTERNS:
            if pattern.search(text):
                return "stop"
        return None

    def type_text(self, text: str):
        """Type text into the currently focused field using pynput."""
        if not text.strip():
            return

        try:
            from pynput.keyboard import Controller

            kb = Controller()
            kb.type(text)
        except Exception as e:
            logger.error("Dictation type failed: %s", e)
