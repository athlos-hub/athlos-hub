"""Cliente Redis async e prefixos compatíveis com o serviço NestJS."""

import json
from typing import Any

import redis.asyncio as redis

from live_service.core.config import settings

STREAM_KEY_PREFIX = "livestream:streamkey:"
ACTIVE_KEY_PREFIX = "livestream:active:"
EVENT_CHANNEL_PREFIX = "livestream:events:"
EVENT_HISTORY_PREFIX = "livestream:events:history:"
CHAT_CHANNEL_PREFIX = "livestream:chat:"
CHAT_HISTORY_PREFIX = "livestream:chat:history:"

DEFAULT_TTL = 24 * 60 * 60
MAX_HISTORY_EVENTS = 200
MAX_HISTORY_MESSAGES = 100
HISTORY_TTL = 24 * 60 * 60


def _redis_kwargs() -> dict[str, Any]:
    return {
        "host": settings.REDIS_HOST,
        "port": settings.REDIS_PORT,
        "password": settings.REDIS_PASSWORD or None,
        "decode_responses": True,
        "socket_connect_timeout": 5,
    }


class RedisClient:
    def __init__(self) -> None:
        self._client: redis.Redis | None = None

    async def connect(self) -> None:
        if self._client is not None:
            return
        self._client = redis.Redis(**_redis_kwargs())
        await self._client.ping()

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    def client(self) -> redis.Redis:
        if self._client is None:
            raise RuntimeError("Redis não inicializado")
        return self._client

    def new_connection(self) -> redis.Redis:
        """Nova conexão para subscrições pub/sub (evita bloquear o pool principal)."""

        return redis.Redis(**_redis_kwargs())


redis_client = RedisClient()


def stream_key_redis_key(stream_key: str) -> str:
    return f"{STREAM_KEY_PREFIX}{stream_key}"


def active_key_redis_key(stream_key: str) -> str:
    return f"{ACTIVE_KEY_PREFIX}{stream_key}"


def event_channel(live_id: str) -> str:
    return f"{EVENT_CHANNEL_PREFIX}{live_id}"


def event_history_key(live_id: str) -> str:
    return f"{EVENT_HISTORY_PREFIX}{live_id}"


def chat_channel(live_id: str) -> str:
    return f"{CHAT_CHANNEL_PREFIX}{live_id}"


def chat_history_key(live_id: str) -> str:
    return f"{CHAT_HISTORY_PREFIX}{live_id}"


async def save_stream_key_metadata(
    r: redis.Redis,
    stream_key: str,
    live_id: str,
    organization_id: str,
    ttl: int = DEFAULT_TTL,
) -> None:
    key = stream_key_redis_key(stream_key)
    payload = json.dumps({"liveId": live_id, "organizationId": organization_id})
    await r.setex(key, ttl, payload)


async def get_stream_metadata(
    r: redis.Redis, stream_key: str
) -> dict[str, str] | None:
    key = stream_key_redis_key(stream_key)
    data = await r.get(key)
    if not data:
        return None
    try:
        parsed = json.loads(data)
        if isinstance(parsed, dict):
            return {
                "liveId": str(parsed.get("liveId", "")),
                "organizationId": str(parsed.get("organizationId", "")),
            }
    except json.JSONDecodeError:
        return {"liveId": data, "organizationId": ""}
    return None


async def mark_stream_active(r: redis.Redis, stream_key: str) -> None:
    sk = stream_key_redis_key(stream_key)
    ak = active_key_redis_key(stream_key)
    ttl = await r.ttl(sk)
    if ttl and ttl > 0:
        await r.setex(ak, ttl, "1")
    else:
        await r.setex(ak, DEFAULT_TTL, "1")


async def is_stream_active(r: redis.Redis, stream_key: str) -> bool:
    v = await r.get(active_key_redis_key(stream_key))
    return v == "1"


async def mark_stream_inactive(r: redis.Redis, stream_key: str) -> None:
    await r.delete(active_key_redis_key(stream_key))


async def publish_event_message(
    r: redis.Redis, live_id: str, payload: dict[str, Any]
) -> None:
    await r.publish(event_channel(live_id), json.dumps(payload))


async def push_event_history(r: redis.Redis, live_id: str, payload: dict[str, Any]) -> None:
    key = event_history_key(live_id)
    await r.lpush(key, json.dumps(payload))
    await r.ltrim(key, 0, MAX_HISTORY_EVENTS - 1)
    await r.expire(key, HISTORY_TTL)


async def get_recent_events_json(
    r: redis.Redis, live_id: str, limit: int = 50
) -> list[dict[str, Any]]:
    key = event_history_key(live_id)
    raw = await r.lrange(key, 0, max(0, limit - 1))
    out: list[dict[str, Any]] = []
    for item in raw:
        try:
            out.append(json.loads(item))
        except json.JSONDecodeError:
            continue
    return out


async def publish_chat_message(
    r: redis.Redis, live_id: str, message: dict[str, Any]
) -> None:
    await r.publish(chat_channel(live_id), json.dumps(message, default=str))


async def push_chat_history(r: redis.Redis, live_id: str, message: dict[str, Any]) -> None:
    key = chat_history_key(live_id)
    await r.lpush(key, json.dumps(message, default=str))
    await r.ltrim(key, 0, MAX_HISTORY_MESSAGES - 1)
    await r.expire(key, HISTORY_TTL)


async def get_recent_chat_json(
    r: redis.Redis, live_id: str, limit: int = 50
) -> list[dict[str, Any]]:
    key = chat_history_key(live_id)
    raw = await r.lrange(key, 0, max(0, limit - 1))
    out: list[dict[str, Any]] = []
    for item in raw:
        try:
            out.append(json.loads(item))
        except json.JSONDecodeError:
            continue
    return out
