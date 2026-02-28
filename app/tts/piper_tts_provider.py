"""Piper TTS provider — high-quality offline neural voices."""

from __future__ import annotations

import io
import logging
import threading
import wave
from pathlib import Path

import numpy as np

from app.tts.base import TTSProvider

logger = logging.getLogger(__name__)

# Default voice model — will be downloaded on first use
DEFAULT_MODEL = "en_US-lessac-medium"
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "piper"


class PiperTTSProvider(TTSProvider):
    """Text-to-speech using Piper (fully offline neural TTS).

    Downloads a voice model (~50MB) on first use, then works completely offline.
    """

    def __init__(self, model: str = DEFAULT_MODEL):
        self._model_name = model
        self._voice = None
        self._load_error: str | None = None
        self._lock = threading.Lock()

    def _ensure_voice(self):
        if self._voice is not None:
            return
        if self._load_error:
            return

        try:
            from piper import PiperVoice

            MODELS_DIR.mkdir(parents=True, exist_ok=True)
            model_path = MODELS_DIR / f"{self._model_name}.onnx"
            config_path = MODELS_DIR / f"{self._model_name}.onnx.json"

            if not model_path.exists():
                logger.info("Downloading Piper voice model '%s'...", self._model_name)
                self._download_model(model_path, config_path)

            logger.info("Loading Piper voice model...")
            self._voice = PiperVoice.load(str(model_path), config_path=str(config_path))
            logger.info("Piper voice loaded: %s", self._model_name)

        except ImportError:
            self._load_error = "piper-tts is not installed. Run: pip install piper-tts"
            logger.error(self._load_error)
        except Exception as e:
            self._load_error = f"Failed to load Piper voice: {e}"
            logger.error(self._load_error)

    def _download_model(self, model_path: Path, config_path: Path):
        """Download the Piper voice model from Hugging Face."""
        import urllib.request

        base_url = (
            "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/"
        )

        for filename, dest in [
            (f"{self._model_name}.onnx", model_path),
            (f"{self._model_name}.onnx.json", config_path),
        ]:
            url = base_url + filename
            logger.info("Downloading %s ...", url)
            urllib.request.urlretrieve(url, str(dest))

        logger.info("Model downloaded to %s", model_path.parent)

    def speak(self, text: str) -> None:
        if not text.strip():
            return

        self._ensure_voice()
        if self._voice is None:
            logger.warning("Piper TTS unavailable: %s", self._load_error)
            return

        def _speak():
            with self._lock:
                try:
                    # Synthesize to WAV in memory
                    wav_buffer = io.BytesIO()
                    with wave.open(wav_buffer, "wb") as wav_file:
                        self._voice.synthesize(text, wav_file)

                    # Play the audio
                    wav_buffer.seek(0)
                    self._play_wav(wav_buffer)
                except Exception as e:
                    logger.error("Piper TTS error: %s", e)

        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()

    def _play_wav(self, wav_buffer: io.BytesIO) -> None:
        """Play WAV audio using sounddevice."""
        try:
            import sounddevice as sd

            with wave.open(wav_buffer, "rb") as wf:
                sample_rate = wf.getframerate()
                channels = wf.getnchannels()
                frames = wf.readframes(wf.getnframes())

            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

            if channels > 1:
                audio = audio.reshape(-1, channels)

            sd.play(audio, samplerate=sample_rate)
            sd.wait()
        except Exception as e:
            logger.error("Failed to play Piper audio: %s", e)

    def is_available(self) -> bool:
        self._ensure_voice()
        return self._voice is not None

    @property
    def name(self) -> str:
        return f"Piper ({self._model_name})"
