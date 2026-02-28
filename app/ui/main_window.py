"""Tuesday main window — desktop UI with push-to-talk, panels, and controls."""

from __future__ import annotations

import contextlib
import logging
from datetime import datetime

from PySide6.QtCore import Qt, QThread, QTimer, Signal
from PySide6.QtWidgets import (
    QCheckBox,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QSplitter,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from app.ai.dictation import DictationController
from app.ai.executor import ActionExecutor, get_desktop_context
from app.ai.interpreter import ActionPlan, AIInterpreter, DesktopAction
from app.audio import AudioRecorder
from app.commands.builtin import register_builtin_commands
from app.commands.router import CommandRouter
from app.commands.voice_programmer import VoiceProgrammer
from app.config import config
from app.hotkeys import HotkeyManager
from app.settings_manager import SettingsManager
from app.stt.whisper_stt import WhisperSTT
from app.tts.manager import TTSManager
from app.ui.settings_dialog import SettingsDialog
from app.ui.styles import DARK_THEME
from app.wake.detector import WakeWordDetector

logger = logging.getLogger(__name__)


class TranscribeWorker(QThread):
    """Background thread for STT transcription."""

    finished = Signal(str)
    error = Signal(str)

    def __init__(self, stt, audio, sample_rate):
        super().__init__()
        self._stt = stt
        self._audio = audio
        self._sample_rate = sample_rate

    def run(self):
        try:
            text = self._stt.transcribe(self._audio, self._sample_rate)
            self.finished.emit(text)
        except Exception as e:
            self.error.emit(str(e))


class AIWorker(QThread):
    """Background thread for AI command interpretation."""

    finished = Signal(object)  # ActionPlan
    error = Signal(str)

    def __init__(self, interpreter: AIInterpreter, text: str, desktop_context: str = ""):
        super().__init__()
        self._interpreter = interpreter
        self._text = text
        self._desktop_context = desktop_context

    def run(self):
        try:
            plan = self._interpreter.interpret(self._text, self._desktop_context)
            self.finished.emit(plan)
        except Exception as e:
            self.error.emit(str(e))


class TuesdayMainWindow(QMainWindow):
    """Main application window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Tuesday — Voice Assistant")
        self.setMinimumSize(1000, 700)
        self.setStyleSheet(DARK_THEME)

        # Settings
        self._settings_mgr = SettingsManager()
        self._settings_mgr.load()
        self._settings_mgr.apply_to_env()

        # Core components
        config.ensure_dirs()
        self._router = CommandRouter()
        register_builtin_commands(self._router)

        self._voice_programmer = VoiceProgrammer(self._router)
        self._voice_programmer.register_command(self._router)

        self._stt = WhisperSTT(model_size=config.stt_model, device=config.stt_device)
        self._tts = TTSManager()
        self._recorder = AudioRecorder(sample_rate=config.sample_rate, channels=config.channels)
        self._wake_detector = WakeWordDetector(wake_phrase=config.wake_phrase)
        self._wake_detector.enabled = config.wake_word_enabled

        self._is_recording = False
        self._worker: TranscribeWorker | None = None

        # AI components — inject custom rules and memories from settings
        s = self._settings_mgr.settings
        self._ai_interpreter = AIInterpreter(
            model=s.ai.model or config.ai_model,
            custom_rules=s.custom_rules,
            memories=self._settings_mgr.load_memories(),
        )
        self._ai_executor = ActionExecutor()
        self._ai_worker: AIWorker | None = None
        self._dictation = DictationController()

        # Global hotkeys
        self._hotkey_mgr = HotkeyManager(parent=self)
        self._hotkey_mgr.mic_toggled.connect(self._on_hotkey_mic_toggle)
        self._hotkey_mgr.dictation_toggled.connect(self._on_dictation_toggled)
        self._hotkey_mgr.stop_speaking_triggered.connect(self._on_hotkey_stop_speaking)
        self._apply_hotkey_bindings()

        # Connect settings changes to live reload
        self._settings_mgr.settings_changed.connect(self._on_settings_changed)
        self._settings_mgr.memory_changed.connect(self._ai_interpreter.set_memories)

        self._build_ui()
        self._refresh_command_list()

        # Listening animation timer
        self._dot_count = 0
        self._listening_timer = QTimer()
        self._listening_timer.timeout.connect(self._animate_listening)

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)

        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(12)

        # ── Header ──
        header = QHBoxLayout()
        title = QLabel("TUESDAY")
        title.setStyleSheet(
            "font-size: 24px; font-weight: bold; color: #a78bfa; letter-spacing: 4px;"
        )
        header.addWidget(title)

        self._status_label = QLabel("Ready")
        self._status_label.setObjectName("statusLabel")
        self._status_label.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
        header.addWidget(self._status_label)

        settings_btn = QPushButton("\u2699")
        settings_btn.setObjectName("settingsButton")
        settings_btn.setToolTip("Settings")
        settings_btn.clicked.connect(self._open_settings)
        header.addWidget(settings_btn)

        main_layout.addLayout(header)

        # ── Main splitter: left panels | right panels ──
        splitter = QSplitter(Qt.Horizontal)

        # Left side: Mic + Transcript + Response
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(8)

        # Mic area
        mic_area = QHBoxLayout()
        mic_area.addStretch()

        mic_col = QVBoxLayout()
        mic_col.setAlignment(Qt.AlignCenter)

        self._mic_btn = QPushButton("\U0001f3a4")
        self._mic_btn.setObjectName("micButton")
        self._mic_btn.setToolTip("Hold to talk (or press and release)")
        self._mic_btn.pressed.connect(self._on_mic_pressed)
        self._mic_btn.released.connect(self._on_mic_released)
        mic_col.addWidget(self._mic_btn, alignment=Qt.AlignCenter)

        self._listening_label = QLabel("")
        self._listening_label.setObjectName("listeningLabel")
        self._listening_label.setAlignment(Qt.AlignCenter)
        mic_col.addWidget(self._listening_label)

        mic_area.addLayout(mic_col)
        mic_area.addStretch()
        left_layout.addLayout(mic_area)

        # Wake word toggle + dictation button
        controls_row = QHBoxLayout()
        self._wake_checkbox = QCheckBox('Enable "Hey Tuesday" wake word (experimental)')
        self._wake_checkbox.setChecked(config.wake_word_enabled)
        self._wake_checkbox.toggled.connect(self._on_wake_toggled)
        controls_row.addWidget(self._wake_checkbox)

        controls_row.addStretch()

        self._dictation_btn = QPushButton("Dictation: OFF")
        self._dictation_btn.setObjectName("dictationButton")
        self._dictation_btn.setProperty("active", "false")
        self._dictation_btn.setToolTip("Toggle dictation mode — speech typed into focused app")
        self._dictation_btn.clicked.connect(self._on_dictation_toggled)
        controls_row.addWidget(self._dictation_btn)

        left_layout.addLayout(controls_row)

        # Transcript panel
        transcript_group = QGroupBox("Transcript")
        transcript_layout = QVBoxLayout(transcript_group)
        self._transcript = QTextEdit()
        self._transcript.setReadOnly(True)
        self._transcript.setPlaceholderText("Your speech will appear here...")
        transcript_layout.addWidget(self._transcript)
        left_layout.addWidget(transcript_group, stretch=1)

        # Response panel
        response_group = QGroupBox("Response")
        response_layout = QVBoxLayout(response_group)
        self._response = QTextEdit()
        self._response.setReadOnly(True)
        self._response.setPlaceholderText("Tuesday's response will appear here...")
        response_layout.addWidget(self._response)
        left_layout.addWidget(response_group, stretch=1)

        splitter.addWidget(left)

        # Right side: Command list + Planned Actions
        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(8)

        # Command list panel
        cmd_group = QGroupBox("Commands")
        cmd_layout = QVBoxLayout(cmd_group)
        self._cmd_list = QListWidget()
        self._cmd_list.itemChanged.connect(self._on_command_toggled)
        cmd_layout.addWidget(self._cmd_list)

        cmd_buttons = QHBoxLayout()
        refresh_btn = QPushButton("Refresh")
        refresh_btn.clicked.connect(self._refresh_command_list)
        cmd_buttons.addWidget(refresh_btn)
        cmd_buttons.addStretch()
        cmd_layout.addLayout(cmd_buttons)

        right_layout.addWidget(cmd_group, stretch=1)

        # Planned Actions panel
        actions_group = QGroupBox("Planned Actions")
        actions_layout = QVBoxLayout(actions_group)
        self._actions_log = QPlainTextEdit()
        self._actions_log.setReadOnly(True)
        self._actions_log.setPlaceholderText("Actions and events will be logged here...")
        actions_layout.addWidget(self._actions_log)
        right_layout.addWidget(actions_group, stretch=1)

        splitter.addWidget(right)
        splitter.setSizes([600, 400])

        main_layout.addWidget(splitter, stretch=1)

        # ── Footer ──
        footer = QHBoxLayout()
        self._stt_label = QLabel(f"STT: {self._stt.name}")
        self._stt_label.setStyleSheet("color: #666; font-size: 11px;")
        footer.addWidget(self._stt_label)

        self._tts_label = QLabel(f"TTS: {self._tts.name}")
        self._tts_label.setStyleSheet("color: #666; font-size: 11px;")
        footer.addWidget(self._tts_label)

        ai_status = "Connected" if self._ai_interpreter.is_available else "No API key"
        self._ai_label = QLabel(f"AI: {ai_status}")
        ai_color = "#22c55e" if self._ai_interpreter.is_available else "#666"
        self._ai_label.setStyleSheet(f"color: {ai_color}; font-size: 11px;")
        footer.addWidget(self._ai_label)

        footer.addStretch()

        audio_status = "OK" if self._recorder.is_available else f"No mic: {self._recorder.error}"
        self._audio_label = QLabel(f"Audio: {audio_status}")
        self._audio_label.setStyleSheet("color: #666; font-size: 11px;")
        footer.addWidget(self._audio_label)

        main_layout.addLayout(footer)

    # ── Mic handling ──

    def _on_mic_pressed(self):
        if self._is_recording:
            return
        self._start_recording()

    def _on_mic_released(self):
        if not self._is_recording:
            return
        self._stop_recording()

    def _start_recording(self):
        if not self._recorder.is_available:
            self._log_action("Cannot record: microphone not available")
            self._set_status("No microphone detected")
            return

        self._is_recording = True
        self._mic_btn.setProperty("recording", "true")
        self._mic_btn.style().unpolish(self._mic_btn)
        self._mic_btn.style().polish(self._mic_btn)

        self._recorder.start()
        self._set_status("Listening...")
        self._listening_label.setText("Listening...")
        self._dot_count = 0
        self._listening_timer.start(400)
        self._log_action("Recording started")

    def _stop_recording(self):
        self._is_recording = False
        self._listening_timer.stop()
        self._listening_label.setText("")
        self._mic_btn.setProperty("recording", "false")
        self._mic_btn.style().unpolish(self._mic_btn)
        self._mic_btn.style().polish(self._mic_btn)

        audio = self._recorder.stop()
        self._log_action(f"Recording stopped ({len(audio) / config.sample_rate:.1f}s)")

        if audio.size == 0:
            self._set_status("No audio captured")
            return

        self._set_status("Transcribing...")
        self._worker = TranscribeWorker(self._stt, audio, config.sample_rate)
        self._worker.finished.connect(self._on_transcription)
        self._worker.error.connect(self._on_transcription_error)
        self._worker.start()

    def _on_transcription(self, text: str):
        if not text.strip():
            self._set_status("No speech detected")
            self._log_action("Transcription returned empty")
            return

        timestamp = datetime.now().strftime("%H:%M:%S")
        self._transcript.append(f"[{timestamp}] {text}")
        self._log_action(f"Transcribed: {text}")

        # 1. Check for dictation toggle commands
        toggle = self._dictation.check_toggle_command(text)
        if toggle == "start":
            self._dictation.activate()
            self._update_dictation_button()
            self._set_status("Dictation ON")
            self._log_action("Dictation mode activated")
            self._speak("Dictation mode on. I'll type what you say.")
            return
        if toggle == "stop":
            self._dictation.deactivate()
            self._update_dictation_button()
            self._set_status("Dictation OFF")
            self._log_action("Dictation mode deactivated")
            self._speak("Dictation mode off.")
            return

        # 2. If dictation is active, type text into focused field
        if self._dictation.is_active:
            self._dictation.type_text(text)
            self._set_status("Dictated")
            self._log_action(f"Dictated: {text}")
            return

        # 3. Try regex command matching (fast path)
        self._set_status("Processing...")
        response, cmd = self._router.route(text)

        if cmd:
            self._response.setPlainText(response)
            self._log_action(f"Matched command: {cmd.name}")
            self._set_status(f"Ran: {cmd.name}")
            self._speak(response)
            self._refresh_command_list()
            return

        # 4. Fall back to AI interpretation
        if config.ai_enabled and self._ai_interpreter.is_available:
            self._set_status("AI thinking...")
            self._log_action("No regex match — sending to AI")
            context = ""
            with contextlib.suppress(Exception):
                context = get_desktop_context()
            self._ai_worker = AIWorker(self._ai_interpreter, text, context)
            self._ai_worker.finished.connect(self._on_ai_plan_ready)
            self._ai_worker.error.connect(self._on_ai_error)
            self._ai_worker.start()
            return

        # 5. No AI available — show fallback
        self._response.setPlainText(response)
        self._log_action("No command matched (AI unavailable)")
        self._set_status("Ready")
        self._speak(response)
        self._refresh_command_list()

    def _on_ai_plan_ready(self, plan: ActionPlan):
        """Handle the AI action plan once it's ready."""
        self._log_action(f"AI confidence: {plan.confidence:.0%} — {plan.reasoning}")

        if plan.confidence < config.ai_confidence_threshold:
            msg = plan.spoken_response or "I'm not sure what you mean. Could you rephrase?"
            self._response.setPlainText(msg)
            self._set_status("Low confidence")
            self._speak(msg)
            return

        # Log planned actions
        for action in plan.actions:
            self._log_action(f"  -> {action.action_type.value}: {action.description}")

        # Execute with confirmation callback for dangerous actions
        def _confirm(action: DesktopAction) -> bool:
            reply = QMessageBox.question(
                self,
                "Confirm Action",
                f"Allow this action?\n\n{action.description}\n\n"
                f"Type: {action.action_type.value}\nParams: {action.params}",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No,
            )
            return reply == QMessageBox.Yes

        results = self._ai_executor.execute_plan(plan, confirm_callback=_confirm)
        for r in results:
            self._log_action(f"  {r}")

        # Speak the AI's response
        if plan.spoken_response:
            self._response.setPlainText(plan.spoken_response)
            self._speak(plan.spoken_response)

        # Handle any speak actions in the plan
        for action in plan.actions:
            if action.action_type.value == "speak":
                speak_text = action.params.get("text", "")
                if speak_text:
                    self._speak(speak_text)

        self._set_status("Ready")

    def _on_ai_error(self, error: str):
        self._set_status("AI Error")
        self._log_action(f"AI error: {error}")
        self._response.setPlainText(f"AI error: {error}")

    def _on_transcription_error(self, error: str):
        self._set_status(f"STT Error: {error}")
        self._log_action(f"Transcription error: {error}")

    # ── UI helpers ──

    def _set_status(self, text: str):
        self._status_label.setText(text)

    def _log_action(self, text: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self._actions_log.appendPlainText(f"[{timestamp}] {text}")

    def _animate_listening(self):
        self._dot_count = (self._dot_count + 1) % 4
        dots = "." * self._dot_count
        self._listening_label.setText(f"Listening{dots}")

    def _speak(self, text: str):
        """Speak text via TTS after cleaning markdown."""
        if self._tts.is_available():
            clean = text.replace("**", "").replace("```", "").replace("#", "")
            self._tts.speak(clean)

    def _on_dictation_toggled(self):
        active = self._dictation.toggle()
        self._update_dictation_button()
        state = "activated" if active else "deactivated"
        self._log_action(f"Dictation mode {state}")
        self._speak(f"Dictation mode {'on' if active else 'off'}.")

    def _update_dictation_button(self):
        active = self._dictation.is_active
        self._dictation_btn.setText(f"Dictation: {'ON' if active else 'OFF'}")
        self._dictation_btn.setProperty("active", "true" if active else "false")
        self._dictation_btn.style().unpolish(self._dictation_btn)
        self._dictation_btn.style().polish(self._dictation_btn)

    def _on_wake_toggled(self, checked: bool):
        self._wake_detector.enabled = checked
        state = "enabled" if checked else "disabled"
        self._log_action(f"Wake word {state}")

    def _refresh_command_list(self):
        self._cmd_list.blockSignals(True)
        self._cmd_list.clear()

        for cmd_info in self._router.get_command_list():
            item = QListWidgetItem()
            item.setText(f"{cmd_info['name']}: {cmd_info['description']}")
            item.setFlags(item.flags() | Qt.ItemIsUserCheckable)
            item.setCheckState(Qt.Checked if cmd_info["enabled"] else Qt.Unchecked)
            item.setData(Qt.UserRole, cmd_info["name"])

            if cmd_info["user_generated"]:
                item.setToolTip("User-created command")

            self._cmd_list.addItem(item)

        self._cmd_list.blockSignals(False)

    def _on_command_toggled(self, item: QListWidgetItem):
        name = item.data(Qt.UserRole)
        enabled = item.checkState() == Qt.Checked
        self._router.set_enabled(name, enabled)
        state = "enabled" if enabled else "disabled"
        self._log_action(f"Command '{name}' {state}")

    # ── Settings + Hotkeys ──

    def _open_settings(self):
        dialog = SettingsDialog(self._settings_mgr, parent=self)
        dialog.exec()

    def _on_settings_changed(self):
        """Re-apply settings after the user saves from the dialog."""
        s = self._settings_mgr.settings
        self._settings_mgr.apply_to_env()

        # Update AI interpreter
        self._ai_interpreter.set_custom_rules(s.custom_rules)
        self._ai_interpreter.set_memories(self._settings_mgr.load_memories())
        self._ai_interpreter._model = s.ai.model or config.ai_model
        # Force re-creation of client on next call if key changed
        self._ai_interpreter._client = None

        # Refresh AI status in footer
        self._update_ai_status()

        # Re-apply hotkeys
        self._apply_hotkey_bindings()

        self._log_action("Settings updated")

    def _apply_hotkey_bindings(self):
        s = self._settings_mgr.settings
        self._hotkey_mgr.set_binding("mic_toggle", s.hotkeys.mic_toggle)
        self._hotkey_mgr.set_binding("dictation_toggle", s.hotkeys.dictation_toggle)
        self._hotkey_mgr.set_binding("stop_speaking", s.hotkeys.stop_speaking)

    def _update_ai_status(self):
        available = self._ai_interpreter.is_available
        status = "Connected" if available else "No API key"
        color = "#22c55e" if available else "#666"
        self._ai_label.setText(f"AI: {status}")
        self._ai_label.setStyleSheet(f"color: {color}; font-size: 11px;")

    def _on_hotkey_mic_toggle(self):
        if self._is_recording:
            self._stop_recording()
        else:
            self._start_recording()

    def _on_hotkey_stop_speaking(self):
        if self._tts.is_available() and hasattr(self._tts, "stop"):
            self._tts.stop()
        self._log_action("Stop speaking (hotkey)")
