"""Consumidor: criação de live por partida (competitions → live via athlos.live)."""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from live_service.core.config import settings
from live_service.infrastructure.database.client import db
from live_service.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_FAILED_ROUTING_KEY,
    EXCHANGE_LIVE,
    EXCHANGE_TYPE,
    QUEUE_LIVE_FAILED,
    QUEUE_LIVE_MATCH_CREATE,
    RK_LIVE_MATCH_REQUESTED,
)
from live_service.schemas.live import CreateLiveBody
from live_service.services.live_service import LiveService

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    live_ex = await channel.declare_exchange(EXCHANGE_LIVE, EXCHANGE_TYPE, durable=True)
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_LIVE_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_FAILED_ROUTING_KEY)

    queue = await channel.declare_queue(
        QUEUE_LIVE_MATCH_CREATE,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_FAILED_ROUTING_KEY,
        },
    )
    await queue.bind(live_ex, routing_key=RK_LIVE_MATCH_REQUESTED)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            raw = json.loads(message.body.decode("utf-8"))
            body = CreateLiveBody.model_validate(raw)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Payload inválido para criação de live: %s", e)
            raise

        async with db.session() as session:
            svc = LiveService(session)
            await svc.create_live(body)


async def live_match_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.rabbitmq_url.strip():
        logger.info("RABBITMQ_URL vazio: consumidor de lives desligado.")
        return

    logger.info("Iniciando consumidor RabbitMQ (%s).", EXCHANGE_LIVE)
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (live): %s", e)
            try:
                await asyncio.wait_for(stop.wait(), timeout=5.0)
                break
            except TimeoutError:
                continue

        try:
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=20)
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
            logger.exception("Consumidor live reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor de lives encerrado.")
