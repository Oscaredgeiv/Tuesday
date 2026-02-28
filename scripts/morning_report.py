"""Generate a morning report from the command line."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.autonomous.morning_report import generate_morning_report

if __name__ == "__main__":
    report = generate_morning_report()
    print(report)
