"""Base interface for TTS providers."""

from __future__ import annotations

from abc import ABC, abstractmethod


class TTSProvider(ABC):
    """Abstract text-to-speech provider."""

    @abstractmethod
    def speak(self, text: str) -> None:
        """Speak the given text aloud."""

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is ready."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for display."""
