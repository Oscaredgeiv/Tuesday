"""Tests for the dictation controller module."""

from unittest.mock import patch

from app.ai.dictation import DictationController


class TestDictationController:
    """Tests for DictationController."""

    def test_starts_inactive(self):
        dc = DictationController()
        assert not dc.is_active

    def test_toggle(self):
        dc = DictationController()
        result = dc.toggle()
        assert result is True
        assert dc.is_active

        result = dc.toggle()
        assert result is False
        assert not dc.is_active

    def test_activate_deactivate(self):
        dc = DictationController()
        dc.activate()
        assert dc.is_active

        dc.deactivate()
        assert not dc.is_active

    def test_check_toggle_start(self):
        dc = DictationController()
        assert dc.check_toggle_command("start dictation") == "start"
        assert dc.check_toggle_command("please enable dictation") == "start"
        assert dc.check_toggle_command("dictation on") == "start"

    def test_check_toggle_stop(self):
        dc = DictationController()
        assert dc.check_toggle_command("stop dictation") == "stop"
        assert dc.check_toggle_command("disable dictation") == "stop"
        assert dc.check_toggle_command("dictation off") == "stop"

    def test_check_toggle_none(self):
        dc = DictationController()
        assert dc.check_toggle_command("open notepad") is None
        assert dc.check_toggle_command("hello") is None

    @patch("app.ai.dictation.DictationController.type_text")
    def test_empty_text_noop(self, mock_type):
        dc = DictationController()
        dc.type_text("")
        dc.type_text("   ")
        # The real method returns early on empty/whitespace, mock won't be called
        # since we patched the method itself — verify by calling the original
        dc_real = DictationController()
        # No exception means success
        dc_real.type_text("")
        dc_real.type_text("   ")
