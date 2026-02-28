"""Base interface for STT providers."""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class STTProvider(ABC):
    """Abstract speech-to-text provider."""

    @abstractmethod
    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> str:
        """Transcribe audio array to text.

        Args:
            audio: numpy array of audio samples (float32, mono)
            sample_rate: sample rate in Hz

        Returns:
            Transcribed text string
        """

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is ready to use."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for display."""
