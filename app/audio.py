"""Audio capture utilities using sounddevice."""

from __future__ import annotations

import logging
import queue

import numpy as np

logger = logging.getLogger(__name__)


class AudioRecorder:
    """Records audio from the microphone in a background thread."""

    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self._sample_rate = sample_rate
        self._channels = channels
        self._recording = False
        self._audio_queue: queue.Queue[np.ndarray] = queue.Queue()
        self._frames: list[np.ndarray] = []
        self._stream = None
        self._available = True
        self._error: str | None = None

        # Check if sounddevice works
        try:
            import sounddevice as sd  # noqa: F401
        except (ImportError, OSError) as e:
            self._available = False
            self._error = str(e)
            logger.error("Audio not available: %s", e)

    @property
    def is_available(self) -> bool:
        return self._available

    @property
    def error(self) -> str | None:
        return self._error

    @property
    def is_recording(self) -> bool:
        return self._recording

    def start(self):
        """Start recording audio."""
        if not self._available:
            logger.warning("Cannot start recording: %s", self._error)
            return

        if self._recording:
            return

        import sounddevice as sd

        self._frames = []
        self._recording = True

        def callback(indata, frames, time_info, status):
            if status:
                logger.warning("Audio status: %s", status)
            if self._recording:
                self._frames.append(indata.copy())

        try:
            self._stream = sd.InputStream(
                samplerate=self._sample_rate,
                channels=self._channels,
                dtype="float32",
                callback=callback,
                blocksize=1024,
            )
            self._stream.start()
            logger.info("Recording started.")
        except Exception as e:
            self._recording = False
            self._error = str(e)
            logger.error("Failed to start recording: %s", e)

    def stop(self) -> np.ndarray:
        """Stop recording and return the captured audio as a numpy array."""
        self._recording = False

        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception as e:
                logger.error("Error stopping stream: %s", e)
            self._stream = None

        if not self._frames:
            return np.array([], dtype=np.float32)

        audio = np.concatenate(self._frames, axis=0).flatten()
        self._frames = []
        logger.info("Recording stopped. Captured %.1f seconds.", len(audio) / self._sample_rate)
        return audio
