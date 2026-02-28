"""Tests for the hotkey manager module."""

from app.hotkeys import HotkeyManager, to_pynput_format


class TestToPynputFormat:
    def test_single_key(self):
        assert to_pynput_format("F5") == "<f5>"

    def test_combo(self):
        assert to_pynput_format("Ctrl+Space") == "<ctrl>+<space>"

    def test_triple_combo(self):
        assert to_pynput_format("Ctrl+Shift+A") == "<ctrl>+<shift>+a"

    def test_empty_string(self):
        assert to_pynput_format("") == ""

    def test_single_letter(self):
        assert to_pynput_format("a") == "a"

    def test_case_insensitive(self):
        assert to_pynput_format("CTRL+SPACE") == "<ctrl>+<space>"


class TestHotkeyManager:
    def test_set_binding_and_stop(self):
        mgr = HotkeyManager()
        # Should not crash even without pynput available
        mgr.set_binding("mic_toggle", "F5")
        mgr.stop()

    def test_unbind_empty_string(self):
        mgr = HotkeyManager()
        mgr.set_binding("mic_toggle", "")
        mgr.stop()

    def test_stop_idempotent(self):
        mgr = HotkeyManager()
        mgr.stop()
        mgr.stop()  # Should not crash

    def test_set_multiple_bindings(self):
        mgr = HotkeyManager()
        mgr.set_binding("mic_toggle", "F5")
        mgr.set_binding("dictation_toggle", "F6")
        mgr.stop()

    def test_rebind_replaces_previous(self):
        mgr = HotkeyManager()
        mgr.set_binding("mic_toggle", "F5")
        mgr.set_binding("mic_toggle", "F6")
        assert mgr._bindings.get("mic_toggle") == "<f6>"
        mgr.stop()

    def test_unbind_removes_key(self):
        mgr = HotkeyManager()
        mgr.set_binding("mic_toggle", "F5")
        mgr.set_binding("mic_toggle", "")
        assert "mic_toggle" not in mgr._bindings
        mgr.stop()
