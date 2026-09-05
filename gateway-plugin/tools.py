"""The `aos_show` tool — the only door between the agent and the screen.

The document is validated before anything is drawn. A document that fails comes
back to the model as an error string listing what to fix, so the repair happens
inside the same turn: no second round trip, and the person never sees a broken
screen.
"""

from __future__ import annotations

import json
import logging

from .renderer_client import post

logger = logging.getLogger(__name__)

SCHEMA = {
    "name": "aos_show",
    "description": (
        "Draw the screen. Takes a Markdoc document written in the aOS screen "
        "language. This is the only way to show the person anything: they "
        "cannot read your text. There is exactly one screen, and every call "
        "replaces it, so send the whole screen each time, not a fragment. "
        "Returns an error listing what to fix if the document breaks the "
        "screen contract; fix it and call again."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "document": {
                "type": "string",
                "description": "The screen, as a Markdoc document.",
            },
        },
        "required": ["document"],
    },
}


def aos_show(args: dict, **_kwargs) -> str:
    document = (args or {}).get("document") or ""
    if not document.strip():
        return json.dumps({"error": "document was empty. Send the screen."})

    result = post("/show", {"document": document})

    if result.get("ok"):
        stats = result.get("stats", {})
        return json.dumps(
            {
                "success": True,
                "shown": {
                    "tags": stats.get("tags"),
                    "proseWords": stats.get("proseWords"),
                },
            }
        )

    errors = result.get("errors") or ["unknown validation failure"]
    logger.info("aos_show rejected a screen: %s", errors)
    return json.dumps(
        {
            "error": "That screen was not drawn. Fix these and call aos_show again:",
            "problems": errors,
        }
    )


def register_tools(ctx) -> None:
    ctx.register_tool(
        name="aos_show",
        toolset="aos",
        schema=SCHEMA,
        handler=aos_show,
        description=SCHEMA["description"],
        emoji="\U0001fa9f",
    )
