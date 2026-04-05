"""RPC RabbitMQ: remoção do espelho do time no competitions-service (reply_to)."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Optional
from uuid import UUID

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from auth_service.core.config import settings
from auth_service.core.exceptions import CompetitionServiceError
from auth_service.infrastructure.messaging_constants import (
    EXCHANGE_COMPETITIONS,
    RK_TEAMS_MIRROR_DELETE_REQUESTED,
)

logger = logging.getLogger(__name__)


async def send_team_mirror_delete_rpc(
    auth_team_id: UUID,
    competition_team_id: Optional[UUID] = None,
    *,
    timeout: float = 30.0,
) -> None:
    """
    Solicita remoção do espelho no competitions e enfileiramento da limpeza no social.
    Resposta síncrona (igual teams.import) para o auth só apagar o time depois do espelho.
    """
    payload: dict = {"auth_team_id": str(auth_team_id)}
    if competition_team_id:
        payload["competition_team_id"] = str(competition_team_id)

    correlation_id = str(uuid.uuid4())
    body = json.dumps(payload, default=str).encode("utf-8")

    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    try:
        async with connection:
            channel = await connection.channel()
            reply_q = await channel.declare_queue(exclusive=True, auto_delete=True)
            exchange = await channel.declare_exchange(
                EXCHANGE_COMPETITIONS, aio_pika.ExchangeType.TOPIC, durable=True
            )

            loop = asyncio.get_running_loop()
            response_future: asyncio.Future[AbstractIncomingMessage] = loop.create_future()

            async def on_message(message: AbstractIncomingMessage) -> None:
                if not response_future.done():
                    response_future.set_result(message)

            consumer_tag = await reply_q.consume(on_message)
            try:
                await exchange.publish(
                    aio_pika.Message(
                        body=body,
                        reply_to=reply_q.name,
                        correlation_id=correlation_id,
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                        content_type="application/json",
                    ),
                    routing_key=RK_TEAMS_MIRROR_DELETE_REQUESTED,
                )
                message = await asyncio.wait_for(response_future, timeout=timeout)
            finally:
                try:
                    await reply_q.cancel(consumer_tag)
                except Exception as e:
                    logger.warning("cancel consumer reply teams.mirror.delete: %s", e)

            async with message.process():
                data = json.loads(message.body.decode("utf-8"))
            if data.get("ok"):
                return
            detail = data.get("detail", data)
            raise CompetitionServiceError(str(detail))
    except asyncio.TimeoutError as e:
        raise CompetitionServiceError(
            "Timeout ao aguardar resposta do competitions-service (teams.mirror.delete)."
        ) from e
