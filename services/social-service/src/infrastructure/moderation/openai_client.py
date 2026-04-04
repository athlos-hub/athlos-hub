import logging

import httpx
from fastapi import HTTPException, status

from src.config.settings import settings

logger = logging.getLogger(__name__)


async def assert_content_allowed(text: str) -> None:
    if not text or not text.strip():
        return
    if not settings.OPENAI_API_KEY.strip():
        return

    url = settings.OPENAI_BASE_URL.rstrip("/") + "/moderations"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
    }
    body = {"model": settings.OPENAI_MODERATION_MODEL, "input": text}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, json=body, headers=headers)
            r.raise_for_status()
            data = r.json()
        results = data.get("results") or []
        if results and results[0].get("flagged"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Conteúdo bloqueado pela moderação"
            )
    except Exception as e:
        logger.warning("Moderação OpenAI indisponível, permitindo conteúdo: %s", e)
