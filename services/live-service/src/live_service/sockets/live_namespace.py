"""Socket.IO namespace /lives — chat, eventos e histórico (compatível com NestJS)."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import socketio

from live_service.infrastructure import redis_client as rc

logger = logging.getLogger(__name__)

CHAT_LIMIT = 5
CHAT_WINDOW_SEC = 10

_rate: dict[str, dict[str, float | int]] = {}
def _room(live_id: str) -> str:
    return f"live:{live_id}"


def _chat_rate_ok(user_id: str) -> bool:
    now = time.time()
    entry = _rate.get(user_id)
    if not entry or now > float(entry["reset_at"]):
        _rate[user_id] = {"count": 1, "reset_at": now + CHAT_WINDOW_SEC}
        return True
    if int(entry["count"]) >= CHAT_LIMIT:
        return False
    entry["count"] = int(entry["count"]) + 1
    return True


def _chat_retry_after(user_id: str) -> int:
    entry = _rate.get(user_id)
    if not entry:
        return 0
    now = time.time()
    return max(0, int(float(entry["reset_at"]) - now))


def register_live_namespace(sio: socketio.AsyncServer) -> None:
    @sio.on("connect", namespace="/lives")
    async def connect(sid, _environ):
        logger.info("Cliente Socket.IO conectado: %s", sid)

    @sio.on("disconnect", namespace="/lives")
    async def disconnect(sid):
        logger.info("Cliente Socket.IO desconectado: %s", sid)

    @sio.on("join-live", namespace="/lives")
    async def join_live(sid, data):
        live_id = (data or {}).get("liveId") or (data or {}).get("live_id")
        if not live_id:
            return {"event": "error", "data": {"message": "liveId obrigatório"}}
        room = _room(live_id)
        await sio.enter_room(sid, room, namespace="/lives")
        r = rc.redis_client.client()
        recent = await rc.get_recent_events_json(r, str(live_id), limit=50)
        await sio.emit(
            "events-history",
            recent,
            to=sid,
            namespace="/lives",
        )
        return {"event": "joined-live", "data": {"liveId": live_id, "message": "Conectado à live"}}

    @sio.on("leave-live", namespace="/lives")
    async def leave_live(sid, data):
        live_id = (data or {}).get("liveId") or (data or {}).get("live_id")
        if not live_id:
            return {"event": "error", "data": {"message": "liveId obrigatório"}}
        room = _room(live_id)
        await sio.leave_room(sid, room, namespace="/lives")
        return {"event": "left-live", "data": {"liveId": live_id, "message": "Desconectado da live"}}

    @sio.on("chat-message", namespace="/lives")
    async def chat_message(sid, data):
        payload = data or {}
        live_id = payload.get("liveId") or payload.get("live_id")
        user_id = payload.get("userId") or payload.get("user_id")
        user_name = payload.get("userName") or payload.get("user_name")
        message = payload.get("message")
        if not live_id or not user_id or not message:
            return {"event": "chat-message-error", "data": {"success": False, "error": "invalid_payload"}}
        if not _chat_rate_ok(str(user_id)):
            await sio.emit(
                "rate-limit-exceeded",
                {
                    "message": "Você está enviando mensagens muito rápido. Aguarde alguns segundos.",
                    "retryAfter": _chat_retry_after(str(user_id)),
                },
                to=sid,
                namespace="/lives",
            )
            return {"event": "chat-message-error", "data": {"success": False, "error": "rate_limit_exceeded"}}
        r = rc.redis_client.client()
        msg = {
            "userId": user_id,
            "userName": user_name or "",
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await rc.publish_chat_message(r, str(live_id), msg)
        await rc.push_chat_history(r, str(live_id), msg)
        return {"event": "chat-message-sent", "data": {"success": True}}


async def _redis_bridge_loop(sio: socketio.AsyncServer) -> None:
    """Propaga pub/sub Redis para salas Socket.IO (eventos publicados por outros workers)."""

    r = rc.redis_client.new_connection()
    pubsub = r.pubsub()
    await pubsub.psubscribe("livestream:events:*", "livestream:chat:*")
    try:
        async for msg in pubsub.listen():
            if msg["type"] not in ("pmessage", "message"):
                continue
            channel = msg.get("channel") or msg.get("pattern")
            if isinstance(channel, bytes):
                channel = channel.decode()
            raw = msg.get("data")
            if raw is None:
                continue
            if isinstance(raw, bytes):
                raw = raw.decode()
            try:
                payload: Any = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if channel and channel.startswith(rc.EVENT_CHANNEL_PREFIX):
                live_id = channel.replace(rc.EVENT_CHANNEL_PREFIX, "", 1)
                await sio.emit(
                    "match-event",
                    payload,
                    room=_room(live_id),
                    namespace="/lives",
                )
            elif channel and channel.startswith(rc.CHAT_CHANNEL_PREFIX):
                live_id = channel.replace(rc.CHAT_CHANNEL_PREFIX, "", 1)
                await sio.emit(
                    "chat-message",
                    payload,
                    room=_room(live_id),
                    namespace="/lives",
                )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception("Redis bridge encerrado: %s", exc)
    finally:
        await pubsub.punsubscribe()
        await r.aclose()


def start_redis_bridge(sio: socketio.AsyncServer) -> asyncio.Task:
    return asyncio.create_task(_redis_bridge_loop(sio))
