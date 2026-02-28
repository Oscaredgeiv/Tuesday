"""Command router — matches transcript text to registered commands."""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class Command:
    """A registered voice command."""

    name: str
    patterns: list[str]  # regex patterns to match
    handler: Callable[[str, re.Match | None], str]
    description: str = ""
    enabled: bool = True
    user_generated: bool = False


class CommandRouter:
    """Routes transcript text to the best matching command."""

    def __init__(self):
        self._commands: list[Command] = []

    @property
    def commands(self) -> list[Command]:
        return list(self._commands)

    def register(self, command: Command):
        """Register a command."""
        self._commands.append(command)

    def unregister(self, name: str):
        """Remove a command by name."""
        self._commands = [c for c in self._commands if c.name != name]

    def set_enabled(self, name: str, enabled: bool):
        """Enable or disable a command by name."""
        for cmd in self._commands:
            if cmd.name == name:
                cmd.enabled = enabled
                return True
        return False

    def route(self, text: str) -> tuple[str, Command | None]:
        """Match text to a command and execute it.

        Returns (response_text, matched_command) or (fallback_text, None).
        """
        text_lower = text.strip().lower()

        for cmd in self._commands:
            if not cmd.enabled:
                continue
            for pattern in cmd.patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    try:
                        response = cmd.handler(text, match)
                        return response, cmd
                    except Exception as e:
                        return f"Error running command '{cmd.name}': {e}", cmd

        return self._fallback(text), None

    def _fallback(self, text: str) -> str:
        """Default response when no command matches."""
        return (
            f'I heard: "{text}"\n\n'
            "I don't have a command for that yet. "
            'You can teach me by saying "Create a command: when I say X, do Y"'
        )

    def get_command_list(self) -> list[dict]:
        """Return list of all commands with their status."""
        return [
            {
                "name": cmd.name,
                "description": cmd.description,
                "enabled": cmd.enabled,
                "user_generated": cmd.user_generated,
                "patterns": cmd.patterns,
            }
            for cmd in self._commands
        ]
