"""Consumidor: envio SMTP a partir da fila auth.mail_send."""

from __future__ import annotations

import asyncio
import json
import logging

import aio_pika
from aio_pika import ExchangeType, IncomingMessage

from auth_service.core.config import settings
from auth_service.infrastructure.external.email_service import MailService
from auth_service.infrastructure.messaging_constants import (
    DLX_EXCHANGE,
    DLX_RK_EMAIL_FAILED,
    EXCHANGE_OUTBOUND_EMAIL,
    QUEUE_AUTH_MAIL,
    QUEUE_EMAIL_FAILED,
    RK_MAIL_SEND,
)

logger = logging.getLogger(__name__)


async def _declare_topology(channel: aio_pika.abc.AbstractChannel) -> aio_pika.abc.AbstractQueue:
    mail_ex = await channel.declare_exchange(
        EXCHANGE_OUTBOUND_EMAIL, ExchangeType.TOPIC, durable=True
    )
    dlx = await channel.declare_exchange(DLX_EXCHANGE, ExchangeType.DIRECT, durable=True)
    failed_q = await channel.declare_queue(QUEUE_EMAIL_FAILED, durable=True)
    await failed_q.bind(dlx, routing_key=DLX_RK_EMAIL_FAILED)

    queue = await channel.declare_queue(
        QUEUE_AUTH_MAIL,
        durable=True,
        arguments={
            "x-dead-letter-exchange": DLX_EXCHANGE,
            "x-dead-letter-routing-key": DLX_RK_EMAIL_FAILED,
        },
    )
    await queue.bind(mail_ex, routing_key=RK_MAIL_SEND)
    return queue


async def _handle_message(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        raw = json.loads(message.body.decode("utf-8"))
        to = raw["to"]
        subject = raw["subject"]
        template_name = raw["template_name"]
        context = raw.get("context") or {}
        ok = await asyncio.to_thread(
            MailService.send_email,
            to,
            subject,
            template_name,
            context,
        )
        if not ok:
            raise RuntimeError(f"Falha ao enviar e-mail para {to}")


async def email_consumer_loop(stop: asyncio.Event) -> None:
    if not settings.RABBITMQ_URL:
        logger.info("RABBITMQ_URL vazio: consumidor mail.send desligado.")
        return

    logger.info("Iniciando consumidor auth.mail_send.")
    while not stop.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning("Falha ao conectar ao RabbitMQ (e-mail): %s", e)
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
                        await _handle_message(message)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            if stop.is_set():
                break
            logger.exception("Consumidor e-mail reconectando: %s", e)
            await asyncio.sleep(3)

    logger.info("Consumidor auth.mail_send encerrado.")
