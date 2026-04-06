"""Consumidor: finaliza partida no competitions quando a live encerra (athlos.live / match.live.finished)."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

import aio_pika
from aio_pika import ExchangeType, IncomingMessage
from fastapi import HTTPException
from sqlalchemy import select

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_COMPETITIONS_FAILED,
    EXCHANGE_LIVE,
    EXCHANGE_TYPE,
    QUEUE_COMPETITIONS_FAILED,
    QUEUE_MATCH_LIVE_FINISHED,
    RK_MATCH_LIVE_FINISHED,
)
from src.models.matches import MatchModel, MatchStatus
from src.services.manege_matches_service import ManageMatchesService
from shared.database.client import db

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    live_ex = await channel.declare_exchange(EXCHANGE_LIVE, EXCHANGE_TYPE, durable=True)
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_COMPETITIONS_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_COMPETITIONS_FAILED)

    queue = await channel.declare_queue(
        QUEUE_MATCH_LIVE_FINISHED,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_COMPETITIONS_FAILED,
        },
    )
    await queue.bind(live_ex, routing_key=RK_MATCH_LIVE_FINISHED)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            data: dict[str, Any] = json.loads(message.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning("Payload inválido match.live.finished: %s", e)
            return

        match_id_raw = data.get("match_id")
        if not match_id_raw:
            logger.warning("match_id ausente em match.live.finished")
            return

        try:
            match_uuid = uuid.UUID(str(match_id_raw))
        except ValueError:
            logger.warning("match_id inválido: %s", match_id_raw)
            return

        live_id = data.get("live_id")
        source = data.get("source", "?")

        async with db.session() as session:
            res = await session.execute(select(MatchModel).where(MatchModel.id == match_uuid))
            row = res.scalar_one_or_none()
            if not row:
                logger.warning("match.live.finished: jogo %s não encontrado", match_uuid)
                return
            if row.status != MatchStatus.LIVE:
                logger.info(
                    "match.live.finished ignorado (jogo %s status=%s, live=%s, source=%s)",
                    match_uuid,
                    row.status,
                    live_id,
                    source,
                )
                return

            svc = ManageMatchesService(session)
            try:
                await svc.finalize_match(match_uuid)
                logger.info(
                    "Partida %s finalizada via match.live.finished (live=%s, source=%s)",
                    match_uuid,
                    live_id,
                    source,
                )
            except HTTPException as exc:
                logger.warning(
                    "match.live.finished: não foi possível finalizar %s (%s): %s",
                    match_uuid,
                    exc.status_code,
                    exc.detail,
                )
            except Exception:
                logger.exception(
                    "Falha inesperada ao finalizar partida %s após match.live.finished",
                    match_uuid,
                )
                raise


async def match_live_finished_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL vazio: consumidor match.live.finished desligado.")
        return

    logger.info("Iniciando consumidor RabbitMQ (match.live.finished).")
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (match.live.finished): %s", e)
            try:
                await asyncio.wait_for(stop.wait(), timeout=5.0)
                break
            except TimeoutError:
                continue

        try:
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)
                queue = await _declare_topology(channel)
                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        if stop.is_set():
                            break
                        await _handle_message(message)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            if stop.is_set():
                break
            logger.exception("Consumidor match.live.finished reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor match.live.finished encerrado.")
