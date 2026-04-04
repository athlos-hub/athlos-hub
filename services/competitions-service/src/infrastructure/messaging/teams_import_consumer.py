"""Consumidor RPC: importação de time do auth (reply_to + correlation_id)."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aio_pika
from aio_pika import ExchangeType, IncomingMessage
from fastapi import HTTPException

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_COMPETITIONS_FAILED,
    EXCHANGE_COMPETITIONS,
    QUEUE_COMPETITIONS_FAILED,
    QUEUE_TEAMS_IMPORT,
    RK_TEAMS_IMPORT_REQUESTED,
)
from src.schemas.internal_teams import TeamFromAuthPayload
from src.infrastructure.messaging.social_team_profile_publisher import (
    publish_team_profile_ensure,
)
from src.services.internal_teams_import_service import import_team_from_auth
from shared.database.client import db

logger = logging.getLogger(__name__)


def _reply_body_from_http_exception(exc: HTTPException) -> dict[str, Any]:
    detail = exc.detail
    if isinstance(detail, dict):
        return {"ok": False, "status": exc.status_code, "detail": detail}
    return {"ok": False, "status": exc.status_code, "detail": str(detail)}


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    comp_ex = await channel.declare_exchange(
        EXCHANGE_COMPETITIONS, ExchangeType.TOPIC, durable=True
    )
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_COMPETITIONS_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_COMPETITIONS_FAILED)

    queue = await channel.declare_queue(
        QUEUE_TEAMS_IMPORT,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_COMPETITIONS_FAILED,
        },
    )
    await queue.bind(comp_ex, routing_key=RK_TEAMS_IMPORT_REQUESTED)
    return queue


async def _handle_message(channel: aio_pika.abc.AbstractChannel, message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        reply_to = message.reply_to
        correlation_id = message.correlation_id

        async def reply(payload: dict[str, Any]) -> None:
            if not reply_to:
                return
            body = json.dumps(payload, default=str).encode("utf-8")
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=body,
                    correlation_id=correlation_id,
                    content_type="application/json",
                ),
                routing_key=reply_to,
            )

        try:
            raw = json.loads(message.body.decode("utf-8"))
            payload = TeamFromAuthPayload.model_validate(raw)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Payload inválido em teams.import: %s", e)
            await reply({"ok": False, "detail": str(e)})
            return

        try:
            async with db.session() as session:
                result = await import_team_from_auth(session, payload)
            await publish_team_profile_ensure(
                team_id=str(result.id),
                organization_slug=payload.organization_slug,
                approved_for_social=True,
            )
            await reply(
                {
                    "ok": True,
                    "external_team_id": str(result.id),
                }
            )
        except HTTPException as e:
            await reply(_reply_body_from_http_exception(e))
        except Exception:
            logger.exception("Erro ao importar time via fila")
            await reply({"ok": False, "detail": "internal_error"})
            raise


async def teams_import_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL vazio: consumidor teams.import desligado.")
        return

    logger.info("Iniciando consumidor RPC teams.import (%s).", EXCHANGE_COMPETITIONS)
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (teams import): %s", e)
            try:
                await asyncio.wait_for(stop.wait(), timeout=5.0)
                break
            except TimeoutError:
                continue

        try:
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=5)
                queue = await _declare_topology(channel)
                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        if stop.is_set():
                            break
                        await _handle_message(channel, message)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            if stop.is_set():
                break
            logger.exception("Consumidor teams import reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor teams.import encerrado.")
