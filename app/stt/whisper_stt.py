"""Faster-whisper STT provider (offline)."""

from __future__ import annotations

import logging

import numpy as np

from app.stt.base import STTProvider

logger = logging.getLogger(__name__)


class WhisperSTT(STTProvider):
    """Speech-to-text using faster-whisper (runs locally, no internet needed)."""

    def __init__(self, model_size: str = "base.en", device: str = "cpu"):
        self._model_size = model_size
        self._device = device
        self._model = None
        self._load_error: str | None = None

    def _ensure_model(self):
        if self._model is not None:
            return
        if self._load_error:
            return

        try:
            from faster_whisper import WhisperModel

            logger.info(
                "Loading faster-whisper model '%s' on %s...", self._model_size, self._device
            )
            self._model = WhisperModel(self._model_size, device=self._device, compute_type="int8")
            logger.info("Model loaded successfully.")
        except ImportError:
            self._load_error = "faster-whisper is not installed. Run: pip install faster-whisper"
            logger.error(self._load_error)
        except Exception as e:
            self._load_error = f"Failed to load whisper model: {e}"
            logger.error(self._load_error)

    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> str:
        self._ensure_model()

        if self._model is None:
            return f"[STT unavailable: {self._load_error}]"

        try:
            # faster-whisper expects float32 audio
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)

            segments, _info = self._model.transcribe(audio, beam_size=5, language="en")
            text = " ".join(seg.text.strip() for seg in segments)
            return text.strip()
        except Exception as e:
            logger.error("Transcription error: %s", e)
            return f"[Transcription error: {e}]"

    def is_available(self) -> bool:
        self._ensure_model()
        return self._model is not None

    @property
    def name(self) -> str:
        return f"faster-whisper ({self._model_size})"
