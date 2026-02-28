"""Tests for the command router."""

import re

from app.commands.router import Command, CommandRouter


def _make_handler(response: str):
    def handler(text: str, match: re.Match | None) -> str:
        return response

    return handler


class TestCommandRouter:
    def test_register_and_route(self):
        router = CommandRouter()
        router.register(
            Command(
                name="greet",
                patterns=[r"hello"],
                handler=_make_handler("Hi there!"),
                description="Greet",
            )
        )
        response, cmd = router.route("hello")
        assert response == "Hi there!"
        assert cmd is not None
        assert cmd.name == "greet"

    def test_no_match_returns_fallback(self):
        router = CommandRouter()
        response, cmd = router.route("something random")
        assert cmd is None
        assert "don't have a command" in response

    def test_disabled_command_skipped(self):
        router = CommandRouter()
        router.register(
            Command(
                name="greet",
                patterns=[r"hello"],
                handler=_make_handler("Hi!"),
                enabled=False,
            )
        )
        response, cmd = router.route("hello")
        assert cmd is None

    def test_set_enabled(self):
        router = CommandRouter()
        router.register(Command(name="greet", patterns=[r"hello"], handler=_make_handler("Hi!")))
        router.set_enabled("greet", False)
        _, cmd = router.route("hello")
        assert cmd is None

        router.set_enabled("greet", True)
        _, cmd = router.route("hello")
        assert cmd is not None

    def test_unregister(self):
        router = CommandRouter()
        router.register(Command(name="greet", patterns=[r"hello"], handler=_make_handler("Hi!")))
        router.unregister("greet")
        assert len(router.commands) == 0

    def test_get_command_list(self):
        router = CommandRouter()
        router.register(
            Command(
                name="greet",
                patterns=[r"hello"],
                handler=_make_handler("Hi!"),
                description="Greet user",
                user_generated=True,
            )
        )
        cmds = router.get_command_list()
        assert len(cmds) == 1
        assert cmds[0]["name"] == "greet"
        assert cmds[0]["description"] == "Greet user"
        assert cmds[0]["user_generated"] is True

    def test_handler_exception_returns_error(self):
        def bad_handler(text, match):
            raise ValueError("broken")

        router = CommandRouter()
        router.register(Command(name="broken", patterns=[r"break"], handler=bad_handler))
        response, cmd = router.route("break")
        assert "Error" in response
        assert cmd is not None

    def test_multiple_patterns(self):
        router = CommandRouter()
        router.register(
            Command(
                name="time",
                patterns=[r"what time", r"current time"],
                handler=_make_handler("It's now."),
            )
        )
        _, cmd1 = router.route("what time is it")
        _, cmd2 = router.route("current time please")
        assert cmd1 is not None
        assert cmd2 is not None
