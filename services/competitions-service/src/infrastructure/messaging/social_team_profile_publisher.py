"""Provisionamento de perfil de time no social-service (athlos.social)."""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    EXCHANGE_SOCIAL,
    RK_PROFILE_TEAM_DELETE,
    RK_PROFILE_TEAM_ENSURE,
)

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_exchange: aio_pika.abc.AbstractExchange | None = None


async def close_social_team_profile_publisher() -> None:
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
                EXCHANGE_SOCIAL, aio_pika.ExchangeType.TOPIC, durable=True
            )
        assert _exchange is not None
        return _exchange


async def publish_team_profile_ensure(
    *,
    team_id: str,
    organization_slug: str,
    approved_for_social: bool = True,
) -> None:
    rabbit = (settings.RABBITMQ_URL or "").strip()
    if rabbit:
        try:
            body = json.dumps(
                {
                    "team_id": team_id,
                    "organization_slug": organization_slug,
                    "approved_for_social": approved_for_social,
                },
                default=str,
            ).encode("utf-8")
            exchange = await _ensure_exchange()
            await exchange.publish(
                aio_pika.Message(
                    body=body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                ),
                routing_key=RK_PROFILE_TEAM_ENSURE,
            )
            return
        except Exception as e:
            logger.warning(
                "Fila social indisponível (team_id=%s), fallback HTTP: %s",
                team_id,
                e,
            )

    # Sem RabbitMQ (dev) ou fallback se publish falhar
    try:
        from src.services.social_client import SocialServiceClient

        client = SocialServiceClient(settings.SOCIAL_SERVICE_URL)
        ok = await client.create_team_profile(
            team_id,
            organization_slug,
            approved_for_social=approved_for_social,
        )
        if not ok:
            logger.error(
                "Falha HTTP ao garantir perfil social do time %s (slug=%s)",
                team_id,
                organization_slug,
            )
    except Exception as e:
        logger.error(
            "Erro HTTP ao garantir perfil social do time %s: %s",
            team_id,
            e,
            exc_info=True,
        )


async def publish_team_profile_delete(*, team_id: str) -> None:
    """Mensagem durável profile.team.delete → social-service (ou HTTP se sem RabbitMQ)."""
    rabbit = (settings.RABBITMQ_URL or "").strip()
    if rabbit:
        try:
            body = json.dumps({"team_id": team_id}, default=str).encode("utf-8")
            exchange = await _ensure_exchange()
            await exchange.publish(
                aio_pika.Message(
                    body=body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                ),
                routing_key=RK_PROFILE_TEAM_DELETE,
            )
            return
        except Exception as e:
            logger.warning(
                "Fila profile.team.delete indisponível (team_id=%s), fallback HTTP: %s",
                team_id,
                e,
            )

    try:
        from src.services.social_client import SocialServiceClient

        await SocialServiceClient(settings.SOCIAL_SERVICE_URL).delete_team_profile(team_id)
    except Exception as e:
        logger.warning(
            "Falha HTTP ao remover perfil social team_id=%s: %s",
            team_id,
            e,
        )
