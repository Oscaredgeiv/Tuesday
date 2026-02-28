"""Desktop action executor — translates ActionPlans into real desktop automation."""

from __future__ import annotations

import logging
import subprocess
import time
from collections.abc import Callable

import pyautogui

from app.ai.interpreter import ActionPlan, ActionType, DesktopAction

logger = logging.getLogger(__name__)

# Safety: moving mouse to top-left corner aborts any pyautogui automation
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05

# Max wait to prevent accidental long sleeps
MAX_WAIT_SECONDS = 10.0


def get_desktop_context() -> str:
    """Return a string describing the current desktop state."""
    parts = []
    try:
        import win32gui

        hwnd = win32gui.GetForegroundWindow()
        title = win32gui.GetWindowText(hwnd)
        if title:
            parts.append(f"Active window: {title}")
    except Exception:
        pass

    screen = pyautogui.size()
    parts.append(f"Screen: {screen.width}x{screen.height}")

    mx, my = pyautogui.position()
    parts.append(f"Mouse: ({mx}, {my})")

    return " | ".join(parts)


class ActionExecutor:
    """Executes a plan of desktop actions."""

    def execute_plan(
        self,
        plan: ActionPlan,
        confirm_callback: Callable[[DesktopAction], bool] | None = None,
    ) -> list[str]:
        """Execute all actions in a plan. Returns a log of results.

        If confirm_callback is provided, it's called for actions with
        requires_confirmation=True. If it returns False, execution halts.
        """
        results: list[str] = []

        for action in plan.actions:
            if action.requires_confirmation and confirm_callback and not confirm_callback(action):
                results.append(f"SKIPPED (declined): {action.description}")
                return results  # Halt on declined confirmation

            try:
                result = self._execute_action(action)
                results.append(f"OK: {result}")
            except Exception as e:
                results.append(f"FAILED: {action.description} — {e}")
                logger.error("Action failed: %s — %s", action.action_type, e)
                return results  # Halt on first failure

        return results

    def _execute_action(self, action: DesktopAction) -> str:
        """Dispatch a single action to its handler."""
        handlers = {
            ActionType.open_app: self._open_app,
            ActionType.key_press: self._key_press,
            ActionType.key_combo: self._key_combo,
            ActionType.type_text: self._type_text,
            ActionType.mouse_click: self._mouse_click,
            ActionType.mouse_move: self._mouse_move,
            ActionType.scroll: self._scroll,
            ActionType.focus_window: self._focus_window,
            ActionType.wait: self._wait,
            ActionType.speak: self._speak,
            ActionType.clipboard: self._clipboard,
            ActionType.shell_command: self._shell_command,
        }
        handler = handlers.get(action.action_type)
        if not handler:
            raise ValueError(f"Unknown action type: {action.action_type}")
        return handler(action.params)

    def _open_app(self, params: dict) -> str:
        name = params.get("name", "")
        # Use Windows start command to launch by name
        subprocess.Popen(
            ["cmd", "/c", "start", "", name],
            shell=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return f"Opened {name}"

    def _key_press(self, params: dict) -> str:
        key = params.get("key", "")
        pyautogui.press(key)
        return f"Pressed {key}"

    def _key_combo(self, params: dict) -> str:
        keys = params.get("keys", [])
        pyautogui.hotkey(*keys)
        return f"Pressed {'+'.join(keys)}"

    def _type_text(self, params: dict) -> str:
        text = params.get("text", "")
        pyautogui.typewrite(text, interval=0.02)
        return f"Typed {len(text)} chars"

    def _mouse_click(self, params: dict) -> str:
        button = params.get("button", "left")
        x = params.get("x")
        y = params.get("y")
        if x is not None and y is not None:
            pyautogui.click(x=x, y=y, button=button)
            return f"Clicked {button} at ({x}, {y})"
        pyautogui.click(button=button)
        return f"Clicked {button} at current position"

    def _mouse_move(self, params: dict) -> str:
        x = params.get("x", 0)
        y = params.get("y", 0)
        pyautogui.moveTo(x, y)
        return f"Moved mouse to ({x}, {y})"

    def _scroll(self, params: dict) -> str:
        direction = params.get("direction", "down")
        amount = params.get("amount", 3)
        clicks = amount if direction in ("up", "left") else -amount
        if direction in ("left", "right"):
            pyautogui.hscroll(clicks)
        else:
            pyautogui.scroll(clicks)
        return f"Scrolled {direction} {amount}"

    def _focus_window(self, params: dict) -> str:
        title = params.get("title", "")
        try:
            import win32gui

            def _callback(hwnd, results):
                if win32gui.IsWindowVisible(hwnd):
                    wtext = win32gui.GetWindowText(hwnd)
                    if title.lower() in wtext.lower():
                        results.append(hwnd)

            results = []
            win32gui.EnumWindows(_callback, results)
            if results:
                import win32con

                win32gui.ShowWindow(results[0], win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(results[0])
                return f"Focused window: {win32gui.GetWindowText(results[0])}"
        except Exception as e:
            logger.warning("win32gui focus failed: %s", e)

        return f"Could not find window matching '{title}'"

    def _wait(self, params: dict) -> str:
        seconds = min(params.get("seconds", 1.0), MAX_WAIT_SECONDS)
        time.sleep(seconds)
        return f"Waited {seconds}s"

    def _speak(self, params: dict) -> str:
        # The caller (main_window) handles TTS — we just return the text
        text = params.get("text", "")
        return f"Speak: {text}"

    def _clipboard(self, params: dict) -> str:
        action = params.get("action", "copy")
        if action == "copy":
            pyautogui.hotkey("ctrl", "c")
            return "Copied to clipboard"
        elif action == "paste":
            pyautogui.hotkey("ctrl", "v")
            return "Pasted from clipboard"
        return f"Unknown clipboard action: {action}"

    def _shell_command(self, params: dict) -> str:
        command = params.get("command", "")
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return f"Shell: {command} (exit {result.returncode})"
