"""Publicação de tarefas de e-mail transacional (athlos.outbound.email)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aio_pika

from auth_service.core.config import settings
from auth_service.infrastructure.messaging_constants import (
    EXCHANGE_OUTBOUND_EMAIL,
    RK_MAIL_SEND,
)

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def close_email_publisher() -> None:
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
                EXCHANGE_OUTBOUND_EMAIL, aio_pika.ExchangeType.TOPIC, durable=True
            )
        assert _exchange is not None
        return _exchange


async def publish_mail_task(
    *,
    to: str,
    subject: str,
    template_name: str,
    context: dict[str, Any],
) -> None:
    payload = {
        "to": to,
        "subject": subject,
        "template_name": template_name,
        "context": context,
    }
    body = json.dumps(payload, default=str).encode("utf-8")
    exchange = await _ensure_exchange()
    await exchange.publish(
        aio_pika.Message(
            body=body,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json",
        ),
        routing_key=RK_MAIL_SEND,
    )
