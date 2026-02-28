"""Voice Programming — teach Tuesday new commands via voice.

Usage: "Create a command: when I say 'lights on', respond with 'Turning on the lights'"
"""

from __future__ import annotations

import logging
import re
import textwrap
from pathlib import Path

import yaml

from app.commands.router import Command, CommandRouter
from app.config import config

logger = logging.getLogger(__name__)

# Pattern to parse: "create a command: when I say X, do/respond with Y"
CREATE_PATTERNS = [
    r"create (?:a )?command[:\s]+when I say ['\"]?(?P<trigger>[^'\"]+?)['\"]?[,\s]+(?:do|respond with|say|reply with) ['\"]?(?P<action>[^'\"]+)['\"]?\s*$",
    r"teach (?:yourself|me)[:\s]+when I say ['\"]?(?P<trigger>[^'\"]+?)['\"]?[,\s]+(?:do|respond with|say|reply with) ['\"]?(?P<action>[^'\"]+)['\"]?\s*$",
    r"new command[:\s]+['\"]?(?P<trigger>[^'\"]+?)['\"]?[,\s]+(?:responds?|says?) ['\"]?(?P<action>[^'\"]+)['\"]?\s*$",
]

DELETE_PATTERNS = [
    r"delete command[:\s]+['\"]?(?P<name>[^'\"]+)['\"]?\s*$",
    r"remove command[:\s]+['\"]?(?P<name>[^'\"]+)['\"]?\s*$",
]

COMMANDS_YAML = config.user_commands_dir / "commands.yaml"


def _sanitize_name(trigger: str) -> str:
    """Convert trigger phrase to a safe command/file name."""
    name = re.sub(r"[^a-z0-9]+", "_", trigger.lower()).strip("_")
    return name[:50]


def _load_user_commands() -> list[dict]:
    """Load user commands from YAML."""
    if not COMMANDS_YAML.exists():
        return []
    try:
        data = yaml.safe_load(COMMANDS_YAML.read_text(encoding="utf-8"))
        return data.get("commands", []) if data else []
    except Exception as e:
        logger.error("Failed to load user commands: %s", e)
        return []


def _save_user_commands(commands: list[dict]):
    """Save user commands to YAML."""
    config.ensure_dirs()
    data = {"commands": commands}
    COMMANDS_YAML.write_text(yaml.dump(data, default_flow_style=False), encoding="utf-8")


def _generate_handler_file(name: str, trigger: str, action: str) -> Path:
    """Generate a Python handler stub for a user command."""
    config.ensure_dirs()
    file_path = config.user_generated_dir / f"{name}.py"

    code = textwrap.dedent(f'''\
        """Auto-generated command: {trigger}"""

        import re


        def handle(text: str, match: re.Match | None) -> str:
            """Handler for: {trigger}"""
            return """{action}"""
    ''')

    file_path.write_text(code, encoding="utf-8")
    logger.info("Generated handler: %s", file_path)
    return file_path


class VoiceProgrammer:
    """Handles creating/deleting user-defined voice commands."""

    def __init__(self, router: CommandRouter):
        self._router = router
        # Load existing user commands on startup
        self._load_existing()

    def _load_existing(self):
        """Load and register any previously saved user commands."""
        commands = _load_user_commands()
        for cmd_spec in commands:
            if not cmd_spec.get("enabled", True):
                continue
            self._register_user_command(cmd_spec["name"], cmd_spec["trigger"], cmd_spec["action"])
        if commands:
            logger.info("Loaded %d user commands from YAML.", len(commands))

    def _register_user_command(self, name: str, trigger: str, action: str):
        """Register a single user command on the router."""
        pattern = re.escape(trigger.lower())

        def handler(text: str, match: re.Match | None, _action=action) -> str:
            return _action

        self._router.register(
            Command(
                name=name,
                patterns=[pattern],
                handler=handler,
                description=f'User command: say "{trigger}" → "{action}"',
                enabled=True,
                user_generated=True,
            )
        )

    def create_command(self, trigger: str, action: str) -> str:
        """Create a new user command."""
        name = _sanitize_name(trigger)

        if not name:
            return "Could not create command: invalid trigger phrase."

        # Check for duplicate
        existing = _load_user_commands()
        for cmd in existing:
            if cmd["name"] == name:
                return f'Command "{name}" already exists. Delete it first to recreate.'

        # Save to YAML
        existing.append(
            {
                "name": name,
                "trigger": trigger.strip(),
                "action": action.strip(),
                "enabled": True,
            }
        )
        _save_user_commands(existing)

        # Generate handler file
        _generate_handler_file(name, trigger, action)

        # Register on router
        self._register_user_command(name, trigger, action)

        return (
            f'Command created! When you say "{trigger}", '
            f'I\'ll respond with: "{action}"\n\n'
            f"Handler saved to: app/commands/user_generated/{name}.py"
        )

    def delete_command(self, name: str) -> str:
        """Delete a user command by name."""
        name = _sanitize_name(name)
        existing = _load_user_commands()
        found = False

        new_list = []
        for cmd in existing:
            if cmd["name"] == name:
                found = True
            else:
                new_list.append(cmd)

        if not found:
            return f'No user command named "{name}" found.'

        _save_user_commands(new_list)
        self._router.unregister(name)

        # Remove handler file
        handler_file = config.user_generated_dir / f"{name}.py"
        if handler_file.exists():
            handler_file.unlink()

        return f'Command "{name}" deleted.'

    def register_command(self, router: CommandRouter):
        """Register the meta-commands for creating/deleting commands."""
        programmer = self

        def _handle_create(text: str, match: re.Match | None) -> str:
            if not match:
                return "I couldn't parse that. Try: Create a command: when I say X, respond with Y"
            trigger = match.group("trigger").strip()
            action = match.group("action").strip()
            return programmer.create_command(trigger, action)

        def _handle_delete(text: str, match: re.Match | None) -> str:
            if not match:
                return "I couldn't parse that. Try: Delete command: name"
            name = match.group("name").strip()
            return programmer.delete_command(name)

        router.register(
            Command(
                name="create_user_command",
                patterns=CREATE_PATTERNS,
                handler=_handle_create,
                description="Teach Tuesday a new command via voice",
            )
        )

        router.register(
            Command(
                name="delete_user_command",
                patterns=DELETE_PATTERNS,
                handler=_handle_delete,
                description="Delete a user-created command",
            )
        )
