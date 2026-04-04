"""Publicação de pedidos de criação de live (competitions → live-service)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from uuid import UUID

import aio_pika

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    EXCHANGE_LIVE,
    RK_LIVE_MATCH_REQUESTED,
)

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def close_live_match_publisher() -> None:
    global _connection, _channel, _exchange
    async with _lock:
        _exchange = None
        if _channel and not _channel.is_closed:
            await _channel.close()
        if _connection and not _connection.is_closed:
            await _connection.close()
        _channel = None
        _connection = None


async def _ensure_exchange() -> aio_pika.abc.AbstractExchange:
    global _connection, _channel, _exchange
    async with _lock:
        if (
            _connection is None
            or _connection.is_closed
            or _channel is None
            or _channel.is_closed
        ):
            _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            _channel = await _connection.channel()
            _exchange = await _channel.declare_exchange(
                EXCHANGE_LIVE, aio_pika.ExchangeType.TOPIC, durable=True
            )
        assert _exchange is not None
        return _exchange


async def publish_live_create_for_match(
    *, external_match_id: UUID, organization_id: UUID
) -> None:
    body: dict[str, Any] = {
        "external_match_id": str(external_match_id),
        "organization_id": str(organization_id),
    }
    raw = json.dumps(body).encode("utf-8")
    exchange = await _ensure_exchange()
    await exchange.publish(
        aio_pika.Message(
            body=raw,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        ),
        routing_key=RK_LIVE_MATCH_REQUESTED,
    )


async def publish_live_creates_for_matches(
    matches: list[Any], organization_id: UUID
) -> int:
    """Publica um evento por partida. Retorna quantidade publicada."""
    for m in matches:
        await publish_live_create_for_match(
            external_match_id=m.id, organization_id=organization_id
        )
    return len(matches)
