"""Consumidor: sincronização de escudo (auth → competitions)."""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_COMPETITIONS_FAILED,
    EXCHANGE_COMPETITIONS,
    EXCHANGE_TYPE,
    QUEUE_COMPETITIONS_FAILED,
    QUEUE_LOGO_SYNC,
    RK_TEAMS_LOGO_SYNC,
)
from src.services.internal_teams_import_service import sync_team_logo_by_id
from shared.database.client import db

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    comp_ex = await channel.declare_exchange(EXCHANGE_COMPETITIONS, EXCHANGE_TYPE, durable=True)
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_COMPETITIONS_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_COMPETITIONS_FAILED)

    queue = await channel.declare_queue(
        QUEUE_LOGO_SYNC,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_COMPETITIONS_FAILED,
        },
    )
    await queue.bind(comp_ex, routing_key=RK_TEAMS_LOGO_SYNC)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        raw = json.loads(message.body.decode("utf-8"))
        team_id = UUID(str(raw["team_id"]))
        logo_url = raw.get("logo_url")
        async with db.session() as session:
            await sync_team_logo_by_id(session, team_id, logo_url)


async def logo_sync_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL vazio: consumidor teams.logo.sync desligado.")
        return

    logger.info("Iniciando consumidor teams.logo.sync.")
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (logo sync): %s", e)
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
            logger.exception("Consumidor logo sync reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor teams.logo.sync encerrado.")
