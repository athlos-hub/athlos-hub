"""Publica pedido de sincronização de placar/estatística (live → competitions via RabbitMQ)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aio_pika

from live_service.core.config import settings
from live_service.infrastructure.messaging.constants import (
    EXCHANGE_LIVE,
    EXCHANGE_TYPE,
    RK_MATCH_LIVE_FINISHED,
    RK_MATCH_STAT_REGISTER,
)

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def close_stat_sync_publisher() -> None:
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
            _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            _channel = await _connection.channel()
            _exchange = await _channel.declare_exchange(
                EXCHANGE_LIVE, EXCHANGE_TYPE, durable=True
            )
        assert _exchange is not None
        return _exchange


async def publish_match_stat_register(
    *,
    event_id: str,
    match_id: str,
    sync: dict[str, Any],
) -> None:
    if not settings.rabbitmq_url or not settings.rabbitmq_url.strip():
        logger.debug("RABBITMQ_URL vazio: stat sync não publicado.")
        return

    body: dict[str, Any] = {
        "event_id": event_id,
        "match_id": match_id,
        **sync,
    }
    raw = json.dumps(body).encode("utf-8")
    exchange = await _ensure_exchange()
    await exchange.publish(
        aio_pika.Message(
            body=raw,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        ),
        routing_key=RK_MATCH_STAT_REGISTER,
    )


async def publish_match_live_finished(
    *,
    match_id: str,
    live_id: str,
    source: str,
) -> None:
    """Aviso para o competitions-service finalizar a partida (consumidor RabbitMQ)."""
    if not settings.rabbitmq_url or not settings.rabbitmq_url.strip():
        logger.debug("RABBITMQ_URL vazio: match.live.finished não publicado.")
        return

    body: dict[str, Any] = {
        "match_id": match_id,
        "live_id": live_id,
        "source": source,
    }
    raw = json.dumps(body).encode("utf-8")
    exchange = await _ensure_exchange()
    await exchange.publish(
        aio_pika.Message(
            body=raw,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        ),
        routing_key=RK_MATCH_LIVE_FINISHED,
    )
