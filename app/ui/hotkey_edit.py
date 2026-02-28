"""Custom widget for capturing keyboard shortcuts."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QLineEdit

# Map Qt key codes to friendly names
_QT_KEY_NAMES = {
    Qt.Key_Space: "Space",
    Qt.Key_Tab: "Tab",
    Qt.Key_Return: "Enter",
    Qt.Key_Enter: "Enter",
    Qt.Key_Escape: "Esc",
    Qt.Key_Backspace: "Backspace",
    Qt.Key_Delete: "Delete",
    Qt.Key_Home: "Home",
    Qt.Key_End: "End",
    Qt.Key_PageUp: "PageUp",
    Qt.Key_PageDown: "PageDown",
    Qt.Key_Up: "Up",
    Qt.Key_Down: "Down",
    Qt.Key_Left: "Left",
    Qt.Key_Right: "Right",
    Qt.Key_Insert: "Insert",
}

# F1–F24
for _i in range(1, 25):
    _QT_KEY_NAMES[getattr(Qt, f"Key_F{_i}")] = f"F{_i}"


class HotkeyEdit(QLineEdit):
    """A QLineEdit that captures key combinations when focused."""

    hotkey_changed = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._hotkey = ""
        self.setReadOnly(True)
        self.setPlaceholderText("Click and press a key...")
        self.setAlignment(Qt.AlignCenter)

    @property
    def hotkey(self) -> str:
        return self._hotkey

    @hotkey.setter
    def hotkey(self, value: str) -> None:
        self._hotkey = value
        self.setText(value)

    def clear_hotkey(self) -> None:
        self._hotkey = ""
        self.setText("")
        self.hotkey_changed.emit("")

    def keyPressEvent(self, event):  # noqa: N802
        key = event.key()

        # Ignore bare modifier keys
        if key in (Qt.Key_Control, Qt.Key_Shift, Qt.Key_Alt, Qt.Key_Meta):
            return

        # Escape clears
        if key == Qt.Key_Escape:
            self.clear_hotkey()
            return

        parts = []
        mods = event.modifiers()
        if mods & Qt.ControlModifier:
            parts.append("Ctrl")
        if mods & Qt.AltModifier:
            parts.append("Alt")
        if mods & Qt.ShiftModifier:
            parts.append("Shift")

        key_name = _QT_KEY_NAMES.get(key)
        if key_name is None:
            text = event.text()
            if text and text.isprintable():
                key_name = text.upper()
            else:
                return

        parts.append(key_name)
        combo = "+".join(parts)
        self._hotkey = combo
        self.setText(combo)
        self.hotkey_changed.emit(combo)
