"""Edge TTS provider — high-quality Microsoft neural voices (requires internet)."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import tempfile
import threading
from pathlib import Path

from app.tts.base import TTSProvider

logger = logging.getLogger(__name__)


class EdgeTTSProvider(TTSProvider):
    """Text-to-speech using Microsoft Edge neural voices.

    Produces natural-sounding speech. Requires internet connection.
    Falls back gracefully if offline.
    """

    def __init__(self, voice: str = "en-US-AvaNeural", rate: str = "+0%", volume: str = "+0%"):
        self._voice = voice
        self._rate = rate
        self._volume = volume
        self._available: bool | None = None

    def speak(self, text: str) -> None:
        if not text.strip():
            return

        def _speak():
            try:
                asyncio.run(self._speak_async(text))
            except Exception as e:
                logger.error("Edge TTS speak error: %s", e)

        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()

    async def _speak_async(self, text: str) -> None:
        import edge_tts

        communicate = edge_tts.Communicate(text, self._voice, rate=self._rate, volume=self._volume)

        # Write to a temp file, then play it
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            tmp_path = f.name

        await communicate.save(tmp_path)
        self._play_audio(tmp_path)

        # Clean up
        with contextlib.suppress(OSError):
            Path(tmp_path).unlink()

    def _play_audio(self, path: str) -> None:
        """Play an audio file using sounddevice + soundfile, or fallback to system player."""
        try:
            # Decode mp3 using av (already installed for faster-whisper)
            import av
            import numpy as np
            import sounddevice as sd

            container = av.open(path)
            audio_frames = []
            for frame in container.decode(audio=0):
                array = frame.to_ndarray()
                audio_frames.append(array)
            container.close()

            if not audio_frames:
                return

            audio = np.concatenate(audio_frames, axis=1)
            # av returns shape (channels, samples), sounddevice wants (samples, channels)
            audio = audio.T.astype(np.float32)
            # Normalize if needed
            if audio.max() > 1.0:
                audio = audio / 32768.0

            sample_rate = 24000  # Edge TTS outputs 24kHz audio
            sd.play(audio, samplerate=sample_rate)
            sd.wait()

        except Exception as e:
            logger.warning("Could not play with sounddevice: %s. Trying system player.", e)
            self._play_system(path)

    def _play_system(self, path: str) -> None:
        """Fallback: use system command to play audio."""
        import subprocess
        import sys

        try:
            if sys.platform == "win32":
                # Use PowerShell to play audio on Windows
                subprocess.run(
                    [
                        "powershell",
                        "-c",
                        f'(New-Object Media.SoundPlayer "{path}").PlaySync()',
                    ],
                    capture_output=True,
                    timeout=30,
                )
            elif sys.platform == "darwin":
                subprocess.run(["afplay", path], capture_output=True, timeout=30)
            else:
                subprocess.run(["aplay", path], capture_output=True, timeout=30)
        except Exception as e:
            logger.error("System audio playback failed: %s", e)

    def is_available(self) -> bool:
        if self._available is not None:
            return self._available

        try:
            import edge_tts  # noqa: F401

            # Quick connectivity check — try to list voices
            loop = asyncio.new_event_loop()
            try:
                voices = loop.run_until_complete(edge_tts.list_voices())
                self._available = len(voices) > 0
            finally:
                loop.close()
        except Exception:
            self._available = False

        return self._available

    @property
    def name(self) -> str:
        return f"Edge TTS ({self._voice})"
