"""Tests for the AI action executor module."""

from unittest.mock import MagicMock, patch

import pytest

from app.ai.executor import MAX_WAIT_SECONDS, ActionExecutor
from app.ai.interpreter import ActionPlan, ActionType, DesktopAction


@pytest.fixture
def executor():
    return ActionExecutor()


class TestActionExecutor:
    """Tests for ActionExecutor."""

    def test_empty_plan_returns_empty_results(self, executor):
        plan = ActionPlan(actions=[], spoken_response="Nothing to do.")
        results = executor.execute_plan(plan)
        assert results == []

    @patch("app.ai.executor.pyautogui")
    def test_key_press(self, mock_pyautogui, executor):
        plan = ActionPlan(
            actions=[DesktopAction(ActionType.key_press, {"key": "enter"}, "Press Enter")]
        )
        results = executor.execute_plan(plan)

        assert len(results) == 1
        assert "OK" in results[0]
        mock_pyautogui.press.assert_called_once_with("enter")

    @patch("app.ai.executor.pyautogui")
    def test_key_combo(self, mock_pyautogui, executor):
        plan = ActionPlan(
            actions=[DesktopAction(ActionType.key_combo, {"keys": ["ctrl", "s"]}, "Save")]
        )
        results = executor.execute_plan(plan)

        assert len(results) == 1
        assert "OK" in results[0]
        mock_pyautogui.hotkey.assert_called_once_with("ctrl", "s")

    def test_confirmation_declined_halts(self, executor):
        action = DesktopAction(
            ActionType.shell_command,
            {"command": "rm -rf /"},
            "Dangerous command",
            requires_confirmation=True,
        )
        plan = ActionPlan(actions=[action])
        callback = MagicMock(return_value=False)

        results = executor.execute_plan(plan, confirm_callback=callback)

        assert len(results) == 1
        assert "SKIPPED" in results[0]
        callback.assert_called_once_with(action)

    @patch("app.ai.executor.subprocess")
    def test_confirmation_accepted_executes(self, mock_subprocess, executor):
        mock_subprocess.run.return_value = MagicMock(returncode=0)
        action = DesktopAction(
            ActionType.shell_command,
            {"command": "echo hello"},
            "Echo hello",
            requires_confirmation=True,
        )
        plan = ActionPlan(actions=[action])
        callback = MagicMock(return_value=True)

        results = executor.execute_plan(plan, confirm_callback=callback)

        assert len(results) == 1
        assert "OK" in results[0]
        callback.assert_called_once()

    @patch("app.ai.executor.pyautogui")
    def test_halt_on_failure(self, mock_pyautogui, executor):
        mock_pyautogui.press.side_effect = Exception("pyautogui error")
        plan = ActionPlan(
            actions=[
                DesktopAction(ActionType.key_press, {"key": "a"}, "Press A"),
                DesktopAction(ActionType.key_press, {"key": "b"}, "Press B"),
            ]
        )
        results = executor.execute_plan(plan)

        assert len(results) == 1
        assert "FAILED" in results[0]

    @patch("app.ai.executor.time")
    def test_wait_capped_at_max(self, mock_time, executor):
        plan = ActionPlan(actions=[DesktopAction(ActionType.wait, {"seconds": 999}, "Long wait")])
        results = executor.execute_plan(plan)

        assert len(results) == 1
        assert "OK" in results[0]
        mock_time.sleep.assert_called_once_with(MAX_WAIT_SECONDS)
