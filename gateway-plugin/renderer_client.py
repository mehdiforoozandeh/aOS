"""Talking to the aOS renderer service.

The renderer owns the tag registry, the validator and the agent's instructions.
Keeping all three in one place is the point: a tag the prompt describes is a tag
the validator accepts, because they are generated from the same file. This
module is the whole Python side of that — stdlib only.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

DEFAULT_URL = "http://127.0.0.1:9310"


def renderer_url() -> str:
    return os.environ.get("AOS_RENDERER_URL", DEFAULT_URL).rstrip("/")


def post(path: str, payload: dict, timeout: float = 10.0) -> dict:
    """POST JSON to the renderer. Never raises — connection trouble comes back
    as a normal error dict, because a tool handler must return, not throw."""
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{renderer_url()}{path}",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        try:
            return json.loads(exc.read().decode("utf-8") or "{}")
        except Exception:
            return {"ok": False, "errors": [f"renderer returned HTTP {exc.code}"]}
    except Exception as exc:
        return {
            "ok": False,
            "errors": [
                f"The aOS renderer is not reachable at {renderer_url()} ({exc}). "
                f"Start it with `npm run serve` in the aOS gateway directory."
            ],
        }
