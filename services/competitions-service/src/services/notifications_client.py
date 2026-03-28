"""Cliente interno para o serviço de notificações."""

import logging
from typing import Any
from uuid import UUID

import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)


async def send_competition_notification(
    *,
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    extra_data: dict[str, Any] | None = None,
    action_url: str | None = None,
) -> None:
    if not settings.NOTIFICATIONS_INTERNAL_API_KEY:
        return
    url = f"{settings.NOTIFICATIONS_SERVICE_URL.rstrip('/')}/api/notifications/internal"
    payload = {
        "user_id": str(user_id),
        "type": notification_type,
        "title": title,
        "message": message,
        "extra_data": extra_data or {},
        "action_url": action_url,
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "X-Internal-API-Key": settings.NOTIFICATIONS_INTERNAL_API_KEY,
                    "Content-Type": "application/json",
                },
                timeout=5.0,
            )
            response.raise_for_status()
    except Exception as e:
        logger.warning("Não foi possível enviar notificação de competição: %s", e)
