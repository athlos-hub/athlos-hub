"""Consumidor assíncrono de pedidos de criação de notificação (fila durável + DLQ)."""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from notifications_service.core.config import settings
from notifications_service.infrastructure.database.client import db
from notifications_service.infrastructure.messaging.constants import (
    DLX_EXCHANGE,
    DLX_FAILED_ROUTING_KEY,
    EXCHANGE_NOTIFICATIONS,
    EXCHANGE_TYPE,
    QUEUE_NOTIFICATIONS,
    QUEUE_NOTIFICATIONS_FAILED,
    RK_NOTIFICATION_CREATED,
)
from notifications_service.infrastructure.realtime import get_broadcaster
from notifications_service.repositories.notification_repository import NotificationRepository
from notifications_service.schemas.notification import NotificationCreateInternal
from notifications_service.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    notifications_ex = await channel.declare_exchange(
        EXCHANGE_NOTIFICATIONS, EXCHANGE_TYPE, durable=True
    )
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_NOTIFICATIONS_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_FAILED_ROUTING_KEY)

    queue = await channel.declare_queue(
        QUEUE_NOTIFICATIONS,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_FAILED_ROUTING_KEY,
        },
    )
    await queue.bind(notifications_ex, routing_key=RK_NOTIFICATION_CREATED)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            body = json.loads(message.body.decode("utf-8"))
            data = NotificationCreateInternal.model_validate(body)
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning("Mensagem inválida (vai para DLQ): %s", e)
            raise

        try:
            async with db.session() as session:
                repo = NotificationRepository(session)
                svc = NotificationService(repo)
                await svc.create_internal(data)
                count = await svc.count_unread(data.user_id)
            await get_broadcaster().publish(data.user_id, count)
        except Exception:
            logger.exception("Erro ao persistir notificação a partir da fila")
            raise


async def notification_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.rabbitmq_url:
        logger.info("RABBITMQ_URL vazio: consumidor de notificações desligado.")
        return

    logger.info("Iniciando consumidor RabbitMQ (exchange %s).", EXCHANGE_NOTIFICATIONS)
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ, nova tentativa em 5s: %s", e)
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
            logger.exception("Sessão do consumidor encerrada com erro, reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor de notificações encerrado.")
