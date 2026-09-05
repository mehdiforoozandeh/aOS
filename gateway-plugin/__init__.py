"""
aOS plugin for Hermes Agent.

Registers two things through the public PluginContext surface — no core edits:

  * the ``aos`` platform adapter — carries prompts in from the browser surface,
    and is the fallback path out when the agent replies with text instead of a
    screen;
  * the ``aos_show`` tool — the only way the agent can put anything on screen.

The split matters. Hermes rewrites every *reply* before it is sent: it strips
markdown image links, media tags and bare file paths, and caps the result at
4096 characters, with no opt-out. A Markdoc document sent that way would arrive
damaged. A tool result goes through none of it.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

__all__ = ["register"]

PLATFORM_HINT = (
    "You are driving aOS, a screen — not a chat. The person cannot read a "
    "message from you; they can only look at what you draw.\n"
    "Answer every request by building a Markdoc document and passing it to the "
    "`aos_show` tool. Never answer in prose. If `aos_show` returns an error, "
    "fix the document it names and call it again.\n"
    "After the tool succeeds, reply with nothing but a short confirmation — it "
    "is not shown to the person."
)


def check_requirements() -> bool:
    """Stdlib only — nothing to install."""
    return True


def validate_config(config) -> bool:
    """No required configuration: the ports have defaults."""
    return True


def is_connected(config) -> bool:
    """The gateway only builds enabled platforms, so reaching here means on."""
    return True


def register(ctx):
    """Plugin entry point, called by the Hermes plugin system."""
    from .tools import register_tools

    register_tools(ctx)

    from .adapter import AOSAdapter

    ctx.register_platform(
        name="aos",
        label="aOS",
        adapter_factory=lambda cfg: AOSAdapter(cfg),
        check_fn=check_requirements,
        validate_config=validate_config,
        is_connected=is_connected,
        install_hint="No extra packages needed (stdlib only)",
        allow_all_env="AOS_ALLOW_ALL_USERS",
        emoji="\U0001fa9f",  # window
        pii_safe=True,
        allow_update_command=True,
        platform_hint=PLATFORM_HINT,
    )
    logger.info("aOS platform and aos_show tool registered")
