"""Global hotkey manager using pynput."""

from __future__ import annotations

import logging
import re
import threading

from PySide6.QtCore import QObject, Signal

logger = logging.getLogger(__name__)

# Map friendly key names → pynput format
_KEY_MAP = {
    "ctrl": "<ctrl>",
    "alt": "<alt>",
    "shift": "<shift>",
    "cmd": "<cmd>",
    "space": "<space>",
    "tab": "<tab>",
    "enter": "<enter>",
    "esc": "<esc>",
    "backspace": "<backspace>",
    "delete": "<delete>",
    "home": "<home>",
    "end": "<end>",
    "pageup": "<page_up>",
    "pagedown": "<page_down>",
    "up": "<up>",
    "down": "<down>",
    "left": "<left>",
    "right": "<right>",
    "insert": "<insert>",
}

# F1–F24
for _i in range(1, 25):
    _KEY_MAP[f"f{_i}"] = f"<f{_i}>"


def to_pynput_format(key_str: str) -> str:
    """Convert a friendly key string like 'Ctrl+Space' to pynput format '<ctrl>+<space>'.

    Returns empty string if input is empty.
    """
    if not key_str or not key_str.strip():
        return ""

    parts = re.split(r"[+]", key_str.strip())
    converted = []
    for part in parts:
        part = part.strip().lower()
        if not part:
            continue
        mapped = _KEY_MAP.get(part)
        if mapped:
            converted.append(mapped)
        elif len(part) == 1:
            converted.append(part)
        else:
            converted.append(f"<{part}>")

    return "+".join(converted)


class HotkeyManager(QObject):
    """Manages global hotkeys via pynput, emitting Qt signals on the main thread."""

    mic_toggled = Signal()
    dictation_toggled = Signal()
    stop_speaking_triggered = Signal()

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._listener = None
        self._lock = threading.Lock()
        self._bindings: dict[str, str] = {}  # action → pynput key string

    def set_binding(self, action: str, key_str: str) -> None:
        """Set a hotkey binding for an action ('mic_toggle', 'dictation_toggle', 'stop_speaking').

        Pass an empty string to unbind.
        """
        pynput_key = to_pynput_format(key_str)
        with self._lock:
            if pynput_key:
                self._bindings[action] = pynput_key
            else:
                self._bindings.pop(action, None)
        self._restart_listener()

    def stop(self) -> None:
        """Stop the hotkey listener."""
        with self._lock:
            if self._listener is not None:
                self._listener.stop()
                self._listener = None

    def _restart_listener(self) -> None:
        """Stop old listener and start a new one with current bindings."""
        self.stop()

        with self._lock:
            if not self._bindings:
                return

            hotkey_map = {}
            signal_map = {
                "mic_toggle": self.mic_toggled,
                "dictation_toggle": self.dictation_toggled,
                "stop_speaking": self.stop_speaking_triggered,
            }

            for action, pynput_key in self._bindings.items():
                signal = signal_map.get(action)
                if signal and pynput_key:
                    hotkey_map[pynput_key] = signal.emit

            if not hotkey_map:
                return

        try:
            from pynput.keyboard import GlobalHotKeys

            listener = GlobalHotKeys(hotkey_map)
            listener.daemon = True
            listener.start()
            with self._lock:
                self._listener = listener
            logger.info("Hotkey listener started with bindings: %s", list(hotkey_map.keys()))
        except Exception as e:
            logger.error("Failed to start hotkey listener: %s", e)
