"""Tests for the wake word detector."""

import numpy as np

from app.wake.detector import WakeWordDetector


class TestWakeWordDetector:
    def test_disabled_by_default(self):
        d = WakeWordDetector()
        assert not d.enabled

    def test_check_transcript_when_disabled(self):
        d = WakeWordDetector()
        assert not d.check_transcript("hey tuesday what time is it")

    def test_check_transcript_when_enabled(self):
        d = WakeWordDetector()
        d.enabled = True
        assert d.check_transcript("hey tuesday what time is it")
        assert not d.check_transcript("what time is it")

    def test_strip_wake_phrase(self):
        d = WakeWordDetector()
        assert d.strip_wake_phrase("Hey Tuesday, what time is it") == "what time is it"
        assert d.strip_wake_phrase("Hey Tuesday what time") == "what time"

    def test_has_speech_silence(self):
        d = WakeWordDetector()
        silence = np.zeros(1600, dtype=np.float32)
        assert not d.has_speech(silence)

    def test_has_speech_noise(self):
        d = WakeWordDetector()
        noise = np.random.randn(1600).astype(np.float32) * 0.5
        assert d.has_speech(noise)

    def test_has_speech_empty(self):
        d = WakeWordDetector()
        assert not d.has_speech(np.array([], dtype=np.float32))
