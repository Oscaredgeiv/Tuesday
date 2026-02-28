"""Tests for the AI interpreter module."""

import json
from unittest.mock import MagicMock, patch

from app.ai.interpreter import (
    ActionType,
    AIInterpreter,
    parse_action_plan,
)


def _make_response_json(**overrides) -> str:
    """Helper to build a valid AI response JSON string."""
    data = {
        "actions": [
            {
                "action_type": "open_app",
                "params": {"name": "notepad"},
                "description": "Open Notepad",
                "requires_confirmation": False,
            }
        ],
        "spoken_response": "Opening Notepad.",
        "confidence": 0.95,
        "reasoning": "User asked to open notepad",
    }
    data.update(overrides)
    return json.dumps(data)


class TestParseActionPlan:
    """Tests for parse_action_plan."""

    def test_parse_valid_json(self):
        raw = _make_response_json()
        plan = parse_action_plan(raw)

        assert len(plan.actions) == 1
        assert plan.actions[0].action_type == ActionType.open_app
        assert plan.actions[0].params == {"name": "notepad"}
        assert plan.confidence == 0.95
        assert plan.spoken_response == "Opening Notepad."

    def test_parse_markdown_wrapped_json(self):
        raw = "```json\n" + _make_response_json() + "\n```"
        plan = parse_action_plan(raw)

        assert len(plan.actions) == 1
        assert plan.actions[0].action_type == ActionType.open_app

    def test_parse_invalid_json_returns_empty_plan(self):
        plan = parse_action_plan("this is not json at all")

        assert len(plan.actions) == 0
        assert plan.confidence == 0.0
        assert "couldn't understand" in plan.spoken_response.lower()

    def test_skip_invalid_action_types(self):
        raw = json.dumps(
            {
                "actions": [
                    {"action_type": "open_app", "params": {"name": "calc"}},
                    {"action_type": "FAKE_ACTION", "params": {}},
                    {"action_type": "key_press", "params": {"key": "enter"}},
                ],
                "spoken_response": "ok",
                "confidence": 0.9,
                "reasoning": "",
            }
        )
        plan = parse_action_plan(raw)

        assert len(plan.actions) == 2
        assert plan.actions[0].action_type == ActionType.open_app
        assert plan.actions[1].action_type == ActionType.key_press

    def test_parse_all_action_types(self):
        actions = [{"action_type": t.value, "params": {}} for t in ActionType]
        raw = json.dumps(
            {
                "actions": actions,
                "spoken_response": "",
                "confidence": 1.0,
                "reasoning": "",
            }
        )
        plan = parse_action_plan(raw)
        assert len(plan.actions) == len(ActionType)

    def test_missing_fields_use_defaults(self):
        raw = json.dumps({"actions": [], "confidence": 0.5})
        plan = parse_action_plan(raw)

        assert plan.spoken_response == ""
        assert plan.reasoning == ""
        assert plan.confidence == 0.5


class TestAIInterpreter:
    """Tests for the AIInterpreter class."""

    def test_unavailable_without_api_key(self):
        with patch.dict("os.environ", {}, clear=True):
            interp = AIInterpreter()
            assert not interp.is_available

    def test_available_with_api_key(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            interp = AIInterpreter()
            assert interp.is_available

    def test_interpret_returns_plan_on_no_key(self):
        with patch.dict("os.environ", {}, clear=True):
            interp = AIInterpreter()
            plan = interp.interpret("open notepad")
            assert plan.confidence == 0.0
            assert "not available" in plan.spoken_response.lower()

    @patch("app.ai.interpreter.AIInterpreter._get_client")
    def test_interpret_calls_api(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=_make_response_json())]
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            interp = AIInterpreter()
            plan = interp.interpret("open notepad")

        assert len(plan.actions) == 1
        assert plan.actions[0].action_type == ActionType.open_app
        mock_client.messages.create.assert_called_once()
