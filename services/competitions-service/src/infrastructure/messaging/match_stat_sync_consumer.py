"""Consumidor: sincroniza placar/estatística publicada pela live (athlos.live / match.stat.register)."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_COMPETITIONS_FAILED,
    EXCHANGE_LIVE,
    EXCHANGE_TYPE,
    QUEUE_COMPETITIONS_FAILED,
    QUEUE_MATCH_STAT_SYNC,
    RK_MATCH_STAT_REGISTER,
)
from src.services.manege_matches_service import ManageMatchesService
from shared.database.client import db

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    live_ex = await channel.declare_exchange(EXCHANGE_LIVE, EXCHANGE_TYPE, durable=True)
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_COMPETITIONS_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_COMPETITIONS_FAILED)

    queue = await channel.declare_queue(
        QUEUE_MATCH_STAT_SYNC,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_COMPETITIONS_FAILED,
        },
    )
    await queue.bind(live_ex, routing_key=RK_MATCH_STAT_REGISTER)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            data: dict[str, Any] = json.loads(message.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning("Payload inválido match.stat.register: %s", e)
            return

        match_id_raw = data.get("match_id")
        if not match_id_raw:
            logger.warning("match_id ausente em match.stat.register")
            return

        try:
            match_uuid = uuid.UUID(str(match_id_raw))
        except ValueError:
            logger.warning("match_id inválido: %s", match_id_raw)
            return

        team_side = data.get("team_side")
        if team_side not in ("home", "away"):
            logger.warning("team_side inválido: %s", team_side)
            return

        increment = int(data.get("increment", 1))
        seg = data.get("segment_id")
        segment_id = uuid.UUID(str(seg)) if seg else None
        p = data.get("player_id")
        player_id = uuid.UUID(str(p)) if p else None
        stats_metric = data.get("stats_metric_abbreviation")

        async with db.session() as session:
            svc = ManageMatchesService(session)
            await svc.register_score(
                match_id=match_uuid,
                team_side=team_side,
                increment=increment,
                segment_id=segment_id,
                stats_metric_abbreviation=stats_metric,
                player_id=player_id,
            )


async def match_stat_sync_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL vazio: consumidor match.stat desligado.")
        return

    logger.info("Iniciando consumidor RabbitMQ (match.stat.register).")
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (match.stat): %s", e)
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
            logger.exception("Consumidor match.stat reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor match.stat encerrado.")
