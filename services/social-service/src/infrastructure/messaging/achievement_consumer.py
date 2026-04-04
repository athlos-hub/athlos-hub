"""Consumidor: conquistas (competitions → social via athlos.social)."""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from shared.database.client import db
from src.config.settings import settings
from src.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_RK_SOCIAL_FAILED,
    EXCHANGE_SOCIAL,
    EXCHANGE_TYPE,
    QUEUE_SOCIAL_ACHIEVEMENTS,
    QUEUE_SOCIAL_FAILED,
    RK_ACHIEVEMENT_NOTIFY,
)
from src.services.achievements_service import process_achievement_notification

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    soc_ex = await channel.declare_exchange(EXCHANGE_SOCIAL, EXCHANGE_TYPE, durable=True)
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_SOCIAL_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_SOCIAL_FAILED)

    queue = await channel.declare_queue(
        QUEUE_SOCIAL_ACHIEVEMENTS,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_SOCIAL_FAILED,
        },
    )
    await queue.bind(soc_ex, routing_key=RK_ACHIEVEMENT_NOTIFY)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        raw = json.loads(message.body.decode("utf-8"))
        async with db.session() as session:
            await process_achievement_notification(session, raw)


async def achievement_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL.strip():
        logger.info("RABBITMQ_URL vazio: consumidor de conquistas desligado.")
        return

    logger.info("Iniciando consumidor social.achievements.")
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (social): %s", e)
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
            logger.exception("Consumidor social reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor social.achievements encerrado.")
