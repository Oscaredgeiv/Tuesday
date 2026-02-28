"""Claude API integration for interpreting voice commands into desktop actions."""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ActionType(Enum):
    """Types of desktop actions the AI can request."""

    open_app = "open_app"
    key_press = "key_press"
    key_combo = "key_combo"
    type_text = "type_text"
    mouse_click = "mouse_click"
    mouse_move = "mouse_move"
    scroll = "scroll"
    focus_window = "focus_window"
    wait = "wait"
    speak = "speak"
    clipboard = "clipboard"
    shell_command = "shell_command"


@dataclass
class DesktopAction:
    """A single desktop action to execute."""

    action_type: ActionType
    params: dict = field(default_factory=dict)
    description: str = ""
    requires_confirmation: bool = False


@dataclass
class ActionPlan:
    """A plan of actions returned by the AI interpreter."""

    actions: list[DesktopAction] = field(default_factory=list)
    spoken_response: str = ""
    confidence: float = 0.0
    reasoning: str = ""


SYSTEM_PROMPT = """\
You are Tuesday, a desktop voice assistant on Windows. The user speaks a command and you \
must translate it into a structured JSON action plan that can be executed on their desktop.

Respond with ONLY valid JSON (no markdown fences, no explanation). Use this schema:

{
  "actions": [
    {
      "action_type": "<type>",
      "params": { ... },
      "description": "human-readable description",
      "requires_confirmation": false
    }
  ],
  "spoken_response": "Short confirmation to speak aloud",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of interpretation"
}

Action types and their params:

- open_app: {"name": "notepad"} — launch an application by name
- key_press: {"key": "enter"} — press a single key
- key_combo: {"keys": ["ctrl", "c"]} — press a key combination
- type_text: {"text": "hello world"} — type text into the focused field
- mouse_click: {"button": "left", "x": null, "y": null} — click (null = current position)
- mouse_move: {"x": 500, "y": 300} — move mouse to coordinates
- scroll: {"direction": "down", "amount": 3} — scroll up/down/left/right
- focus_window: {"title": "Notepad"} — bring a window to the foreground by partial title match
- wait: {"seconds": 1.0} — pause between actions (max 10)
- speak: {"text": "Done!"} — speak text aloud via TTS
- clipboard: {"action": "copy"} — action is "copy" or "paste"
- shell_command: {"command": "calc.exe"} — run a shell command (ALWAYS requires_confirmation=true)

Rules:
- Set requires_confirmation=true for shell_command and any destructive operation.
- If the command is unclear, set confidence below 0.5 and ask for clarification in spoken_response.
- Keep actions minimal — don't add unnecessary waits or extra steps.
- For opening apps, prefer open_app with common names (notepad, calculator, chrome, etc.).
- For keyboard shortcuts, use key_combo with lowercase key names.
"""


def _extract_json(text: str) -> str:
    """Extract JSON from a response that may be wrapped in markdown fences."""
    # Try to find JSON in markdown code blocks
    md_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if md_match:
        return md_match.group(1).strip()
    # Try raw JSON (find first { to last })
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1:
        return text[brace_start : brace_end + 1]
    return text.strip()


def _parse_action(raw: dict) -> DesktopAction | None:
    """Parse a single action dict into a DesktopAction, or None if invalid."""
    type_str = raw.get("action_type", "")
    try:
        action_type = ActionType(type_str)
    except ValueError:
        logger.warning("Skipping unknown action type: %s", type_str)
        return None

    return DesktopAction(
        action_type=action_type,
        params=raw.get("params", {}),
        description=raw.get("description", ""),
        requires_confirmation=raw.get("requires_confirmation", False),
    )


def parse_action_plan(text: str) -> ActionPlan:
    """Parse an AI response string into an ActionPlan."""
    json_str = _extract_json(text)
    try:
        data = json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        logger.error("Failed to parse AI response as JSON")
        return ActionPlan(
            spoken_response="I couldn't understand the AI response. Please try again.",
            confidence=0.0,
        )

    actions = []
    for raw_action in data.get("actions", []):
        action = _parse_action(raw_action)
        if action is not None:
            actions.append(action)

    return ActionPlan(
        actions=actions,
        spoken_response=data.get("spoken_response", ""),
        confidence=data.get("confidence", 0.0),
        reasoning=data.get("reasoning", ""),
    )


class AIInterpreter:
    """Sends user commands to Claude and gets back structured action plans."""

    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        self._model = model
        self._client = None

    @property
    def is_available(self) -> bool:
        """Check if the API key is set."""
        return bool(os.environ.get("ANTHROPIC_API_KEY"))

    def _get_client(self):
        """Lazy-init the Anthropic client."""
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic()
        return self._client

    def interpret(self, text: str, desktop_context: str = "") -> ActionPlan:
        """Interpret a voice command into an action plan via Claude API."""
        if not self.is_available:
            return ActionPlan(
                spoken_response="AI is not available — no API key configured.",
                confidence=0.0,
            )

        user_msg = text
        if desktop_context:
            user_msg = f"[Desktop context: {desktop_context}]\n\nUser command: {text}"

        try:
            client = self._get_client()
            response = client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = response.content[0].text
            return parse_action_plan(raw)
        except Exception as e:
            logger.error("AI interpreter error: %s", e)
            return ActionPlan(
                spoken_response=f"AI error: {e}",
                confidence=0.0,
            )
