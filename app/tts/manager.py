"""TTS Manager — tries providers in priority order with automatic fallback."""

from __future__ import annotations

import logging

from app.tts.base import TTSProvider

logger = logging.getLogger(__name__)


class TTSManager(TTSProvider):
    """Manages multiple TTS providers with automatic fallback.

    Priority order:
    1. Edge TTS (best quality, needs internet)
    2. Piper TTS (great quality, fully offline)
    3. pyttsx3 (basic quality, always available)
    """

    def __init__(self, providers: list[TTSProvider] | None = None):
        if providers is not None:
            self._providers = providers
        else:
            self._providers = self._build_default_chain()

        self._active: TTSProvider | None = None

    def _build_default_chain(self) -> list[TTSProvider]:
        """Build the default provider chain."""
        providers = []

        try:
            from app.tts.edge_tts_provider import EdgeTTSProvider

            providers.append(EdgeTTSProvider())
        except Exception as e:
            logger.debug("Edge TTS not available: %s", e)

        try:
            from app.tts.piper_tts_provider import PiperTTSProvider

            providers.append(PiperTTSProvider())
        except Exception as e:
            logger.debug("Piper TTS not available: %s", e)

        try:
            from app.tts.pyttsx_tts import PyttsxTTS

            providers.append(PyttsxTTS())
        except Exception as e:
            logger.debug("pyttsx3 not available: %s", e)

        return providers

    def _get_active(self) -> TTSProvider | None:
        """Find the first available provider."""
        if self._active is not None:
            return self._active

        for provider in self._providers:
            try:
                if provider.is_available():
                    self._active = provider
                    logger.info("Using TTS provider: %s", provider.name)
                    return provider
            except Exception as e:
                logger.debug("Provider %s check failed: %s", provider.name, e)

        logger.warning("No TTS provider available!")
        return None

    def speak(self, text: str) -> None:
        provider = self._get_active()
        if provider is None:
            logger.warning("No TTS provider available, cannot speak.")
            return

        try:
            provider.speak(text)
        except Exception as e:
            logger.error("TTS provider %s failed: %s. Trying fallback.", provider.name, e)
            # Reset active and try next
            self._active = None
            self._providers = [p for p in self._providers if p is not provider]
            self.speak(text)

    def is_available(self) -> bool:
        return self._get_active() is not None

    @property
    def name(self) -> str:
        provider = self._get_active()
        if provider:
            return provider.name
        return "None"

    @property
    def active_provider(self) -> TTSProvider | None:
        return self._get_active()

    @property
    def provider_chain(self) -> list[str]:
        """List all providers in the chain."""
        return [p.name for p in self._providers]
