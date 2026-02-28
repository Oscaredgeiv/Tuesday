"""Tuesday Voice Assistant — main entry point."""

import sys

from PySide6.QtWidgets import QApplication

from app.ui.main_window import TuesdayMainWindow


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Tuesday")
    app.setOrganizationName("Tuesday AI")

    window = TuesdayMainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
