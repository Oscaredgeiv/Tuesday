"""UI styles and theme for Tuesday."""

DARK_THEME = """
QMainWindow {
    background-color: #1a1a2e;
}

QWidget {
    color: #e0e0e0;
    font-family: "Segoe UI", "SF Pro Display", "Helvetica Neue", sans-serif;
    font-size: 13px;
}

QGroupBox {
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    margin-top: 12px;
    padding-top: 16px;
    background-color: #16213e;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 8px;
    color: #a78bfa;
    font-weight: bold;
    font-size: 13px;
}

QTextEdit, QPlainTextEdit {
    background-color: #0f0f23;
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    padding: 8px;
    color: #e0e0e0;
    font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 12px;
}

QPushButton {
    background-color: #2a2a4a;
    border: 1px solid #3a3a6a;
    border-radius: 6px;
    padding: 8px 16px;
    color: #e0e0e0;
    font-weight: bold;
}

QPushButton:hover {
    background-color: #3a3a6a;
    border-color: #a78bfa;
}

QPushButton:pressed {
    background-color: #a78bfa;
    color: #1a1a2e;
}

QPushButton#micButton {
    background-color: #1e3a5f;
    border: 2px solid #2a6aaa;
    border-radius: 32px;
    min-width: 64px;
    min-height: 64px;
    max-width: 64px;
    max-height: 64px;
    font-size: 24px;
}

QPushButton#micButton:pressed, QPushButton#micButton[recording="true"] {
    background-color: #dc2626;
    border-color: #ef4444;
}

QLabel#statusLabel {
    color: #a78bfa;
    font-size: 14px;
    font-weight: bold;
    padding: 4px;
}

QLabel#listeningLabel {
    color: #22c55e;
    font-size: 16px;
    font-weight: bold;
}

QListWidget {
    background-color: #0f0f23;
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    padding: 4px;
}

QListWidget::item {
    padding: 6px;
    border-radius: 4px;
}

QListWidget::item:selected {
    background-color: #2a2a4a;
}

QCheckBox {
    spacing: 8px;
}

QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid #3a3a6a;
    background-color: #0f0f23;
}

QCheckBox::indicator:checked {
    background-color: #a78bfa;
    border-color: #a78bfa;
}

QSplitter::handle {
    background-color: #2a2a4a;
    width: 2px;
}

QPushButton#dictationButton {
    background-color: #2a2a4a;
    border: 2px solid #3a3a6a;
    border-radius: 8px;
    padding: 6px 16px;
    font-weight: bold;
    font-size: 12px;
}

QPushButton#dictationButton[active="true"] {
    background-color: #166534;
    border-color: #22c55e;
    color: #22c55e;
}
"""
