# Tuesday — Voice Assistant

A local, offline-first AI voice assistant for smart home and developer workflows. Push-to-talk or wake word activation, extensible commands, and voice programming.

## Quick Start

```bash
# Clone
git clone https://github.com/Oscaredgeiv/Tuesday.git
cd Tuesday

# Create virtual environment
python -m venv .venv

# Activate (pick your OS)
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
```

## Features

- **Push-to-talk** — hold the mic button to speak
- **"Hey Tuesday" wake word** — experimental, enable in settings
- **Offline STT** — faster-whisper running locally
- **Offline TTS** — pyttsx3 (works on all platforms)
- **Built-in commands** — time, notes, help, test runner
- **Voice programming** — teach Tuesday new commands by voice
- **Command management** — enable/disable commands in the UI
- **Autonomous mode** — bounded dev task runner
- **Morning reports** — auto-generated project summaries

## Built-in Voice Commands

| Say this | Tuesday does this |
|----------|------------------|
| "What time is it?" | Tells the current date and time |
| "Create a note: buy milk" | Saves a note to `notes/notes.md` |
| "Show commands" | Lists all available commands |
| "Run tests" | Runs the pytest suite |
| "Help" | Shows the help message |
| "Hello" | Greets you |

## Teaching Tuesday New Commands

Say: **"Create a command: when I say 'lights on', respond with 'Turning on the lights'"**

This will:
1. Save the command spec to `user_commands/commands.yaml`
2. Generate a handler in `app/commands/user_generated/`
3. Register it immediately — try saying "lights on"!

To delete: **"Delete command: lights on"**

## How to Add Commands (Code)

1. Create a handler function in `app/commands/`:

```python
def _handle_my_command(text: str, match: re.Match | None) -> str:
    return "My response"
```

2. Register it in `app/commands/builtin.py`:

```python
router.register(Command(
    name="my_command",
    patterns=[r"my trigger phrase"],
    handler=_handle_my_command,
    description="What it does",
))
```

## Running Tests

```bash
python -m pytest -v
```

## Linting

```bash
python -m ruff check .
python -m ruff format .
```

## Troubleshooting Audio

### No microphone detected
- Check your system audio settings
- Make sure no other app is using the mic
- On Linux, install `portaudio19-dev`: `sudo apt install portaudio19-dev`

### STT not working
- The first run downloads the whisper model (~150MB for base.en)
- Check your internet connection for the first download
- After download, it works fully offline

### TTS not working
- On Linux, install espeak: `sudo apt install espeak`
- On macOS, pyttsx3 uses the built-in speech synthesizer
- On Windows, it uses SAPI5 (built-in)

### PySide6 not displaying
- Make sure you have a display server running
- On Linux, you may need: `sudo apt install libxcb-xinerama0`

## Architecture

```
Tuesday/
├── main.py                      # Entry point
├── app/
│   ├── config.py                # Central configuration
│   ├── audio.py                 # Mic recording
│   ├── commands/
│   │   ├── router.py            # Command matching engine
│   │   ├── builtin.py           # Built-in commands
│   │   ├── voice_programmer.py  # Voice command creation
│   │   └── user_generated/      # Auto-generated handlers
│   ├── stt/
│   │   ├── base.py              # STT interface
│   │   └── whisper_stt.py       # faster-whisper provider
│   ├── tts/
│   │   ├── base.py              # TTS interface
│   │   └── pyttsx_tts.py        # pyttsx3 provider
│   ├── wake/
│   │   └── detector.py          # Wake word detection
│   ├── autonomous/
│   │   ├── runner.py            # Bounded task runner
│   │   └── morning_report.py    # Report generator
│   └── ui/
│       ├── main_window.py       # Desktop UI
│       └── styles.py            # Dark theme
├── tests/                       # Test suite
├── user_commands/               # User command YAML specs
├── notes/                       # User notes
├── reports/                     # Generated reports
└── docs/                        # Documentation
```

## License

MIT
