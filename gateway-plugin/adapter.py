"""The aOS platform adapter.

Two jobs, both small:

  * carry prompts in from the browser surface;
  * catch the case where the agent replies with text instead of calling
    `aos_show`, and turn that text into a screen anyway.

The screen itself does not travel this way — it goes through the `aos_show`
tool, because Hermes rewrites every reply before it is sent. See __init__.py.

Stdlib only, like the IRC adapter: a tiny asyncio HTTP listener rather than a
web framework, so the plugin adds no dependencies to a Hermes install.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, Dict, Optional

from gateway.config import Platform
from gateway.platforms.base import (
    BasePlatformAdapter,
    MessageEvent,
    MessageType,
    SendResult,
)

from .renderer_client import post

logger = logging.getLogger(__name__)

DEFAULT_BRIDGE_PORT = 9311

# One surface, one session. Keeping this constant is the whole mechanism that
# keeps the conversation alive across turns — the session key is built from it.
CHAT_ID = "main"


class AOSAdapter(BasePlatformAdapter):
    """Bridges the aOS browser surface to the Hermes gateway."""

    # The reply path is a fallback, not the main road, but a fallback that
    # silently truncates is worse than none. Both are needed: the streaming
    # consumer reads the attribute, not the registry entry.
    MAX_MESSAGE_LENGTH = 100_000
    splits_long_messages = True
    supports_async_delivery = True
    supports_code_blocks = True

    def __init__(self, config):
        super().__init__(config, Platform("aos"))
        self._server: Optional[asyncio.AbstractServer] = None
        self._port = int(os.environ.get("AOS_BRIDGE_PORT", DEFAULT_BRIDGE_PORT))

    # --- lifecycle ---------------------------------------------------------

    async def connect(self, *, is_reconnect: bool = False) -> bool:
        try:
            self._server = await asyncio.start_server(
                self._handle_client, "127.0.0.1", self._port
            )
        except OSError as exc:
            logger.error("aOS bridge could not bind port %s: %s", self._port, exc)
            return False
        logger.info("aOS bridge listening on 127.0.0.1:%s", self._port)
        return True

    async def disconnect(self) -> None:
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

    async def get_chat_info(self, chat_id: str) -> Dict[str, Any]:
        return {"id": chat_id, "name": "aOS surface", "type": "dm"}

    def toolsets_for_source(self, source) -> list:
        """Which tools the agent gets on this surface.

        Composed from granular toolsets rather than the ``hermes-cli``
        composite, for one reason: ``hermes-cli`` bakes in ``clarify``, and
        ``clarify`` is broken here.

        When the agent calls ``clarify``, the gateway intercepts the question
        before it reaches any adapter, holds the turn open, and routes the
        person's next message in as the answer. On a chat platform that reads
        fine. On a screen it is invisible: the question is never drawn, the
        person sees a surface that never changes, types a new request, and that
        request silently becomes an answer to a question they never saw. We
        watched a clarify sit open for 23 minutes and eat two prompts.

        So it is off until there is a ``{% choice %}`` tag that can draw the
        question. Then it goes back in the list.
        """
        return [
            "web", "search", "vision", "file", "terminal", "skills",
            "todo", "memory", "session_search", "code_execution",
            "aos",
        ]

    async def send_typing(self, chat_id: str) -> None:
        post("/thinking", {})

    # --- outbound: the fallback -------------------------------------------

    async def send(
        self,
        chat_id: str,
        content: str,
        reply_to: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SendResult:
        """The agent replied with text rather than drawing a screen.

        Never show nothing. The renderer wraps the text in a minimal valid
        document so the person sees *something* — and we count it, because a
        rising count here means the platform hint is not holding.
        """
        text = (content or "").strip()
        if not text:
            return SendResult(success=True)

        result = post("/fallback", {"text": text})
        return SendResult(success=bool(result.get("ok")), error=result.get("error"))

    # --- inbound: prompts from the browser --------------------------------

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        try:
            request = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), timeout=10)
        except (asyncio.IncompleteReadError, asyncio.TimeoutError, ConnectionError):
            writer.close()
            return

        head = request.decode("latin-1", "replace")
        length = 0
        for line in head.split("\r\n"):
            if line.lower().startswith("content-length:"):
                try:
                    length = int(line.split(":", 1)[1].strip())
                except ValueError:
                    length = 0

        body = b""
        if length:
            try:
                body = await asyncio.wait_for(reader.readexactly(length), timeout=10)
            except (asyncio.IncompleteReadError, asyncio.TimeoutError):
                body = b""

        status, payload = await self._route(head.split(" ", 2), body)
        raw = json.dumps(payload).encode("utf-8")
        writer.write(
            b"HTTP/1.1 " + status.encode() + b"\r\n"
            b"content-type: application/json\r\n"
            b"content-length: " + str(len(raw)).encode() + b"\r\n"
            b"connection: close\r\n\r\n" + raw
        )
        try:
            await writer.drain()
        except ConnectionError:
            pass
        writer.close()

    async def _route(self, request_line, body: bytes):
        method = request_line[0] if request_line else ""
        path = request_line[1].split("?")[0] if len(request_line) > 1 else ""

        if method == "GET" and path == "/health":
            return "200 OK", {"ok": True, "platform": "aos", "port": self._port}

        if method != "POST" or path != "/prompt":
            return "404 Not Found", {"ok": False, "error": "no such route"}

        try:
            data = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return "400 Bad Request", {"ok": False, "error": "body was not JSON"}

        text = (data.get("text") or "").strip()
        if not text:
            return "400 Bad Request", {"ok": False, "error": "text was empty"}

        source = self.build_source(
            chat_id=CHAT_ID,
            chat_name="aOS surface",
            chat_type="dm",
            user_id=data.get("user_id") or "owner",
            user_name=data.get("user_name") or "owner",
        )
        event = MessageEvent(
            text=text,
            message_type=MessageType.TEXT,
            source=source,
            user_id=source.user_id,
            user_name=source.user_name,
            message_id=str(int(time.time() * 1000)),
        )
        # Do not await the whole turn — the browser wants its acknowledgement
        # now, and the screen arrives later through aos_show.
        asyncio.create_task(self.handle_message(event))
        return "202 Accepted", {"ok": True}


def register(ctx):
    from . import register as _register

    return _register(ctx)
