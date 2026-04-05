"""Consumidor RPC: remoção do espelho do time no competitions + enfileira limpeza no social."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from uuid import UUID

import aio_pika
from aio_pika import ExchangeType, IncomingMessage
from fastapi import HTTPException

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_COMPETITIONS_FAILED,
    EXCHANGE_COMPETITIONS,
    QUEUE_COMPETITIONS_FAILED,
    QUEUE_TEAMS_MIRROR_DELETE,
    RK_TEAMS_MIRROR_DELETE_REQUESTED,
)
from src.infrastructure.messaging.social_team_profile_publisher import (
    publish_team_profile_delete,
)
from src.services.internal_teams_import_service import (
    delete_team_by_auth_team_id,
    delete_team_by_competition_team_id,
)
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
        QUEUE_TEAMS_MIRROR_DELETE,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_COMPETITIONS_FAILED,
        },
    )
    await queue.bind(comp_ex, routing_key=RK_TEAMS_MIRROR_DELETE_REQUESTED)
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
        except json.JSONDecodeError as e:
            await reply({"ok": False, "detail": str(e)})
            return

        auth_raw = raw.get("auth_team_id") or raw.get("authTeamId")
        if not auth_raw:
            await reply({"ok": False, "detail": "auth_team_id é obrigatório"})
            return
        try:
            auth_team_id = UUID(str(auth_raw))
        except ValueError:
            await reply({"ok": False, "detail": "auth_team_id inválido"})
            return

        competition_raw = raw.get("competition_team_id") or raw.get("competitionTeamId")
        competition_team_id: UUID | None = None
        if competition_raw:
            try:
                competition_team_id = UUID(str(competition_raw))
            except ValueError:
                await reply({"ok": False, "detail": "competition_team_id inválido"})
                return

        removed: list[UUID] = []
        try:
            async with db.session() as session:
                removed = await delete_team_by_auth_team_id(session, auth_team_id)
        except HTTPException as e:
            if e.status_code == 404:
                removed = []
            else:
                await reply(_reply_body_from_http_exception(e))
                return

        if not removed and competition_team_id:
            try:
                async with db.session() as session:
                    removed = await delete_team_by_competition_team_id(
                        session, competition_team_id
                    )
            except HTTPException as e:
                if e.status_code == 404:
                    await reply({"ok": True})
                    return
                await reply(_reply_body_from_http_exception(e))
                return

        if not removed:
            await reply({"ok": True})
            return

        for tid in removed:
            await publish_team_profile_delete(team_id=str(tid))

        await reply({"ok": True})


async def teams_mirror_delete_consumer_loop(stop: asyncio.Event) -> None:
    if not (settings.RABBITMQ_URL or "").strip():
        logger.info("RABBITMQ_URL vazio: consumidor teams.mirror.delete desligado.")
        return

    logger.info(
        "Iniciando consumidor RPC teams.mirror.delete (%s).",
        RK_TEAMS_MIRROR_DELETE_REQUESTED,
    )
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (teams.mirror.delete): %s", e)
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
            logger.exception("Consumidor teams.mirror.delete reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor teams.mirror.delete encerrado.")
