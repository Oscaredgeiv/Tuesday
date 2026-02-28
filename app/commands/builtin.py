"""Built-in commands for Tuesday."""

from __future__ import annotations

import re
import subprocess
from datetime import datetime

from app.commands.router import Command, CommandRouter
from app.config import config
from app.settings_manager import get_settings_manager


def _handle_time(text: str, match: re.Match | None) -> str:
    now = datetime.now()
    return f"It's {now.strftime('%I:%M %p')} on {now.strftime('%A, %B %d, %Y')}."


def _handle_create_note(text: str, match: re.Match | None) -> str:
    if not match:
        return "I couldn't understand the note content."

    note_text = match.group("content").strip()
    if not note_text:
        return "The note was empty. Please say what you'd like to note."

    config.ensure_dirs()
    notes_file = config.notes_dir / "notes.md"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"\n## {timestamp}\n\n{note_text}\n"

    if not notes_file.exists():
        notes_file.write_text(f"# Tuesday Notes\n{entry}", encoding="utf-8")
    else:
        with open(notes_file, "a", encoding="utf-8") as f:
            f.write(entry)

    return f'Note saved: "{note_text}"'


def _handle_show_commands(text: str, match: re.Match | None) -> str:
    # This gets replaced at registration time with access to the router
    return "Command list requested."


def _handle_run_tests(text: str, match: re.Match | None) -> str:
    try:
        result = subprocess.run(
            ["python", "-m", "pytest", "--tb=short", "-q"],
            capture_output=True,
            text=True,
            cwd=str(config.root_dir),
            timeout=60,
        )
        output = result.stdout + result.stderr
        return f"Test results:\n\n```\n{output.strip()}\n```"
    except subprocess.TimeoutExpired:
        return "Tests timed out after 60 seconds."
    except Exception as e:
        return f"Failed to run tests: {e}"


def _handle_hello(text: str, match: re.Match | None) -> str:
    return "Hey! I'm Tuesday, your voice assistant. How can I help?"


def _handle_help(text: str, match: re.Match | None) -> str:
    return (
        "Here's what I can do:\n\n"
        '- "What time is it?" — current date and time\n'
        '- "Create a note: ..." — save a note\n'
        '- "Show command list" — see all commands\n'
        '- "Run tests" — run the test suite\n'
        '- "Create a command: when I say X, do Y" — teach me something new\n'
        '- "Hello" / "Hey Tuesday" — say hi\n'
        '- "Help" — show this message\n'
    )


def _handle_store_memory(text: str, match: re.Match | None) -> str:
    if not match:
        return "I couldn't understand what to remember."

    content = match.group("content").strip()
    if not content:
        return "The memory was empty. Please say what you'd like me to remember."

    mgr = get_settings_manager()
    mgr.add_memory(content)
    return f'Stored to memory: "{content}"'


def register_builtin_commands(router: CommandRouter):
    """Register all built-in commands on the router."""

    router.register(
        Command(
            name="time",
            patterns=[
                r"what time is it",
                r"what's the time",
                r"current time",
                r"tell me the time",
                r"what day is it",
            ],
            handler=_handle_time,
            description="Tell the current date and time",
        )
    )

    # store_memory registered before create_note so "remember this: X" matches memory
    router.register(
        Command(
            name="store_memory",
            patterns=[
                r"store to memory[:\s]+(?P<content>.+)",
                r"remember this[:\s]+(?P<content>.+)",
                r"save to memory[:\s]+(?P<content>.+)",
                r"memorize this[:\s]+(?P<content>.+)",
            ],
            handler=_handle_store_memory,
            description="Store information to persistent memory",
        )
    )

    router.register(
        Command(
            name="create_note",
            patterns=[
                r"create a note[:\s]+(?P<content>.+)",
                r"note[:\s]+(?P<content>.+)",
                r"save a note[:\s]+(?P<content>.+)",
                r"write down[:\s]+(?P<content>.+)",
                r"remember[:\s]+(?P<content>.+)",
            ],
            handler=_handle_create_note,
            description="Save a note to notes/notes.md",
        )
    )

    # Create a closure so show_commands has access to the router
    def _show_commands_with_router(text: str, match: re.Match | None) -> str:
        cmds = router.get_command_list()
        if not cmds:
            return "No commands registered."
        lines = ["Here are my commands:\n"]
        for cmd in cmds:
            status = "enabled" if cmd["enabled"] else "disabled"
            source = " (user-created)" if cmd["user_generated"] else ""
            lines.append(f"- **{cmd['name']}**: {cmd['description']} [{status}]{source}")
        return "\n".join(lines)

    router.register(
        Command(
            name="show_commands",
            patterns=[
                r"show commands?",
                r"list commands?",
                r"command list",
                r"what can you do",
                r"what commands",
            ],
            handler=_show_commands_with_router,
            description="Show all available commands",
        )
    )

    router.register(
        Command(
            name="run_tests",
            patterns=[r"run tests?", r"run the tests?", r"test suite"],
            handler=_handle_run_tests,
            description="Run the pytest test suite",
        )
    )

    router.register(
        Command(
            name="hello",
            patterns=[r"^hello$", r"^hey$", r"^hi$", r"^hey tuesday$", r"^good morning$"],
            handler=_handle_hello,
            description="Greet Tuesday",
        )
    )

    router.register(
        Command(
            name="help",
            patterns=[r"^help$", r"^help me$", r"what can you do"],
            handler=_handle_help,
            description="Show help message",
        )
    )
