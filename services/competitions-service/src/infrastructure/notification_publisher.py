"""Envio de notificações internas: RabbitMQ (preferencial) ou HTTP (fallback)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from uuid import UUID

import aio_pika
import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)

_EVENTS_EXCHANGE = "athlos.notifications"
_ROUTING_KEY = "notification.created"

_lock = asyncio.Lock()
_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def close_notification_publisher() -> None:
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
                _EVENTS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
            )
        assert _exchange is not None
        return _exchange


async def _publish_rabbit(payload: dict[str, Any]) -> None:
    body = json.dumps(payload, default=str).encode("utf-8")
    exchange = await _ensure_exchange()
    await exchange.publish(
        aio_pika.Message(
            body=body,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        ),
        routing_key=_ROUTING_KEY,
    )


async def _publish_http(payload: dict[str, Any]) -> None:
    if not settings.NOTIFICATIONS_INTERNAL_API_KEY:
        return
    url = f"{settings.NOTIFICATIONS_SERVICE_URL.rstrip('/')}/api/notifications/internal"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            json=payload,
            headers={
                "X-Internal-API-Key": settings.NOTIFICATIONS_INTERNAL_API_KEY,
                "Content-Type": "application/json",
            },
            timeout=5.0,
        )
        response.raise_for_status()


async def send_competition_notification(
    *,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    extra_data: dict[str, Any] | None = None,
    action_url: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "user_id": str(user_id),
        "type": notification_type,
        "title": title,
        "message": message,
        "extra_data": extra_data or {},
    }
    if action_url is not None:
        payload["action_url"] = action_url

    if settings.RABBITMQ_URL:
        try:
            await _publish_rabbit(payload)
            logger.debug("Notificação de competição enfileirada para %s", user_id)
            return
        except Exception as e:
            logger.warning("RabbitMQ indisponível, usando HTTP: %s", e)

    try:
        await _publish_http(payload)
    except Exception as e:
        logger.warning("Não foi possível enviar notificação de competição: %s", e)
