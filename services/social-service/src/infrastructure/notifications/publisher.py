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

EXCHANGE_NOTIFICATIONS = "athlos.notifications"
RK_NOTIFICATION_CREATED = "notification.created"

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
                EXCHANGE_NOTIFICATIONS, aio_pika.ExchangeType.TOPIC, durable=True
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
        routing_key=RK_NOTIFICATION_CREATED,
    )


async def _publish_http(payload: dict[str, Any]) -> None:
    endpoint = (
        f"{settings.NOTIFICATIONS_SERVICE_URL.rstrip('/')}/api/notifications/internal"
    )
    headers = {"Content-Type": "application/json"}
    if settings.NOTIFICATIONS_INTERNAL_API_KEY:
        headers["X-Internal-API-Key"] = settings.NOTIFICATIONS_INTERNAL_API_KEY
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(endpoint, headers=headers, json=payload)
        r.raise_for_status()


async def send_notification(
    *,
    recipient_internal_user_id: str,
    actor_keycloak_id: str,
    notification_type: str,
    title: str,
    message: str,
    extra_data: dict[str, Any] | None = None,
    entity_id: UUID | None = None,
    action_url: str | None = None,
) -> None:
    if not settings.NOTIFICATIONS_ENABLED:
        return

    ex = dict(extra_data or {})
    ex["actor_keycloak_id"] = actor_keycloak_id
    if entity_id:
        ex["entity_id"] = str(entity_id)

    payload: dict[str, Any] = {
        "user_id": recipient_internal_user_id,
        "type": notification_type.lower(),
        "title": title,
        "message": message,
        "extra_data": ex,
    }
    if action_url and action_url.strip():
        payload["action_url"] = action_url.strip()

    if settings.RABBITMQ_URL:
        try:
            await _publish_rabbit(payload)
            return
        except Exception as e:
            logger.warning("RabbitMQ notificações indisponível, HTTP: %s", e)

    try:
        await _publish_http(payload)
    except Exception as e:
        logger.error("Falha ao enviar notificação: %s", e)
