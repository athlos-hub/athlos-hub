"""RPC RabbitMQ: envio de time aprovado ao competitions-service (reply_to)."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from uuid import UUID

import aio_pika

from auth_service.core.config import settings
from auth_service.core.exceptions import CompetitionServiceError
from auth_service.infrastructure.messaging_constants import (
    EXCHANGE_COMPETITIONS,
    RK_TEAMS_IMPORT_REQUESTED,
)
from auth_service.schemas.team import TeamApprovalPayload

logger = logging.getLogger(__name__)


async def send_team_import_rpc(payload: TeamApprovalPayload, *, timeout: float = 45.0) -> UUID:
    correlation_id = str(uuid.uuid4())
    body = json.dumps(payload.model_dump(mode="json"), default=str).encode("utf-8")

    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    try:
        async with connection:
            channel = await connection.channel()
            reply_q = await channel.declare_queue(exclusive=True, auto_delete=True)
            exchange = await channel.declare_exchange(
                EXCHANGE_COMPETITIONS, aio_pika.ExchangeType.TOPIC, durable=True
            )
            await exchange.publish(
                aio_pika.Message(
                    body=body,
                    reply_to=reply_q.name,
                    correlation_id=correlation_id,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                ),
                routing_key=RK_TEAMS_IMPORT_REQUESTED,
            )

            message = await asyncio.wait_for(reply_q.get(fail=False), timeout=timeout)
            async with message.process():
                data = json.loads(message.body.decode("utf-8"))
            if data.get("ok"):
                return UUID(str(data["external_team_id"]))
            detail = data.get("detail", data)
            raise CompetitionServiceError(str(detail))
    except asyncio.TimeoutError as e:
        raise CompetitionServiceError(
            "Timeout ao aguardar resposta do competitions-service (teams.import)."
        ) from e
