"""Three-tab settings dialog for Tuesday."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QDoubleSpinBox,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from app.settings_manager import SettingsManager
from app.ui.hotkey_edit import HotkeyEdit

# Model options
AI_MODELS = [
    ("Claude Sonnet", "claude-sonnet-4-20250514"),
    ("Claude Haiku", "claude-haiku-4-5-20251001"),
]

STT_MODELS = ["tiny.en", "base.en", "small.en", "medium.en"]


class SettingsDialog(QDialog):
    """Settings dialog with General, Hotkeys, and Personality tabs."""

    def __init__(self, settings_manager: SettingsManager, parent=None):
        super().__init__(parent)
        self._mgr = settings_manager
        self.setWindowTitle("Settings")
        self.setMinimumSize(550, 480)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Tabs
        self._tabs = QTabWidget()
        self._build_general_tab()
        self._build_hotkeys_tab()
        self._build_personality_tab()
        layout.addWidget(self._tabs, stretch=1)

        # Buttons
        btn_row = QHBoxLayout()
        btn_row.addStretch()

        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)
        btn_row.addWidget(cancel_btn)

        save_btn = QPushButton("Save")
        save_btn.setDefault(True)
        save_btn.clicked.connect(self._on_save)
        btn_row.addWidget(save_btn)

        layout.addLayout(btn_row)

        # Populate from current settings
        self._load_current()

    def _build_general_tab(self):
        tab = QWidget()
        form = QFormLayout(tab)
        form.setContentsMargins(12, 12, 12, 12)
        form.setSpacing(10)

        # API Key
        key_row = QHBoxLayout()
        self._api_key_edit = QLineEdit()
        self._api_key_edit.setEchoMode(QLineEdit.Password)
        self._api_key_edit.setPlaceholderText("sk-ant-...")
        key_row.addWidget(self._api_key_edit, stretch=1)

        self._show_key_btn = QPushButton("Show")
        self._show_key_btn.setFixedWidth(60)
        self._show_key_btn.clicked.connect(self._toggle_key_visibility)
        key_row.addWidget(self._show_key_btn)

        form.addRow("API Key:", key_row)

        # AI Model
        self._ai_model_combo = QComboBox()
        for label, _value in AI_MODELS:
            self._ai_model_combo.addItem(label)
        form.addRow("AI Model:", self._ai_model_combo)

        # Confidence threshold
        self._confidence_spin = QDoubleSpinBox()
        self._confidence_spin.setRange(0.0, 1.0)
        self._confidence_spin.setSingleStep(0.05)
        self._confidence_spin.setDecimals(2)
        form.addRow("AI Confidence Threshold:", self._confidence_spin)

        # STT Model
        self._stt_model_combo = QComboBox()
        for m in STT_MODELS:
            self._stt_model_combo.addItem(m)
        form.addRow("STT Model:", self._stt_model_combo)

        # Wake word
        wake_row = QHBoxLayout()
        self._wake_enabled = QCheckBox("Enable")
        wake_row.addWidget(self._wake_enabled)
        self._wake_phrase_edit = QLineEdit()
        self._wake_phrase_edit.setPlaceholderText("hey tuesday")
        wake_row.addWidget(self._wake_phrase_edit, stretch=1)
        form.addRow("Wake Word:", wake_row)

        self._tabs.addTab(tab, "General")

    def _build_hotkeys_tab(self):
        tab = QWidget()
        form = QFormLayout(tab)
        form.setContentsMargins(12, 12, 12, 12)
        form.setSpacing(10)

        info = QLabel("Click a field and press a key combo to set a hotkey. Press Esc to clear.")
        info.setStyleSheet("color: #888; font-size: 11px;")
        info.setWordWrap(True)
        form.addRow(info)

        # Mic Toggle
        mic_row = QHBoxLayout()
        self._mic_hotkey = HotkeyEdit()
        mic_row.addWidget(self._mic_hotkey, stretch=1)
        mic_clear = QPushButton("Clear")
        mic_clear.setFixedWidth(60)
        mic_clear.clicked.connect(self._mic_hotkey.clear_hotkey)
        mic_row.addWidget(mic_clear)
        form.addRow("Mic Toggle:", mic_row)

        # Dictation Toggle
        dict_row = QHBoxLayout()
        self._dictation_hotkey = HotkeyEdit()
        dict_row.addWidget(self._dictation_hotkey, stretch=1)
        dict_clear = QPushButton("Clear")
        dict_clear.setFixedWidth(60)
        dict_clear.clicked.connect(self._dictation_hotkey.clear_hotkey)
        dict_row.addWidget(dict_clear)
        form.addRow("Dictation Toggle:", dict_row)

        # Stop Speaking
        stop_row = QHBoxLayout()
        self._stop_hotkey = HotkeyEdit()
        stop_row.addWidget(self._stop_hotkey, stretch=1)
        stop_clear = QPushButton("Clear")
        stop_clear.setFixedWidth(60)
        stop_clear.clicked.connect(self._stop_hotkey.clear_hotkey)
        stop_row.addWidget(stop_clear)
        form.addRow("Stop Speaking:", stop_row)

        self._tabs.addTab(tab, "Hotkeys")

    def _build_personality_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Custom rules
        rules_label = QLabel("Custom Rules && Instructions")
        rules_label.setStyleSheet("color: #a78bfa; font-weight: bold;")
        layout.addWidget(rules_label)

        self._rules_edit = QPlainTextEdit()
        self._rules_edit.setPlaceholderText('E.g., "Always call me boss. Be concise and funny."')
        layout.addWidget(self._rules_edit, stretch=2)

        # Memory
        memory_label = QLabel("Memory (read-only — built via voice commands)")
        memory_label.setStyleSheet("color: #a78bfa; font-weight: bold;")
        layout.addWidget(memory_label)

        self._memory_display = QPlainTextEdit()
        self._memory_display.setReadOnly(True)
        self._memory_display.setPlaceholderText("No memories stored yet.")
        layout.addWidget(self._memory_display, stretch=2)

        clear_mem_btn = QPushButton("Clear All Memory")
        clear_mem_btn.clicked.connect(self._on_clear_memory)
        layout.addWidget(clear_mem_btn, alignment=Qt.AlignLeft)

        self._tabs.addTab(tab, "Personality")

    def _load_current(self):
        s = self._mgr.settings

        # General
        self._api_key_edit.setText(s.api_key)

        model_idx = next((i for i, (_, v) in enumerate(AI_MODELS) if v == s.ai.model), 0)
        self._ai_model_combo.setCurrentIndex(model_idx)

        self._confidence_spin.setValue(s.ai.confidence_threshold)

        stt_idx = STT_MODELS.index(s.stt.model) if s.stt.model in STT_MODELS else 1
        self._stt_model_combo.setCurrentIndex(stt_idx)

        self._wake_enabled.setChecked(s.wake_word.enabled)
        self._wake_phrase_edit.setText(s.wake_word.phrase)

        # Hotkeys
        self._mic_hotkey.hotkey = s.hotkeys.mic_toggle
        self._dictation_hotkey.hotkey = s.hotkeys.dictation_toggle
        self._stop_hotkey.hotkey = s.hotkeys.stop_speaking

        # Personality
        self._rules_edit.setPlainText(s.custom_rules)
        self._memory_display.setPlainText(self._mgr.get_memory_raw())

    def _on_save(self):
        s = self._mgr.settings

        s.api_key = self._api_key_edit.text().strip()
        s.ai.model = AI_MODELS[self._ai_model_combo.currentIndex()][1]
        s.ai.confidence_threshold = self._confidence_spin.value()
        s.stt.model = self._stt_model_combo.currentText()
        s.wake_word.enabled = self._wake_enabled.isChecked()
        s.wake_word.phrase = self._wake_phrase_edit.text().strip() or "hey tuesday"

        s.hotkeys.mic_toggle = self._mic_hotkey.hotkey
        s.hotkeys.dictation_toggle = self._dictation_hotkey.hotkey
        s.hotkeys.stop_speaking = self._stop_hotkey.hotkey

        s.custom_rules = self._rules_edit.toPlainText().strip()

        self._mgr.save()
        self.accept()

    def _on_clear_memory(self):
        reply = QMessageBox.question(
            self,
            "Clear Memory",
            "Are you sure you want to clear all of Tuesday's memory?\n\nThis cannot be undone.",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No,
        )
        if reply == QMessageBox.Yes:
            self._mgr.clear_memories()
            self._memory_display.setPlainText("")

    def _toggle_key_visibility(self):
        if self._api_key_edit.echoMode() == QLineEdit.Password:
            self._api_key_edit.setEchoMode(QLineEdit.Normal)
            self._show_key_btn.setText("Hide")
        else:
            self._api_key_edit.setEchoMode(QLineEdit.Password)
            self._show_key_btn.setText("Show")
