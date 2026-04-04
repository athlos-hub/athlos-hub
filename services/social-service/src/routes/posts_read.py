import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.routes.deps import get_session
from src.schemas import api_success, post_to_camel
from src.services.achievements_service import process_achievement_notification
from src.services.posts_service import get_post_or_404

router = APIRouter(tags=["social"])


@router.get("/posts/{post_id}")
async def get_post(post_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    p = await get_post_or_404(session, post_id)
    return api_success(post_to_camel(p))


@router.post("/achievements/notify")
async def achievements_notify(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
):
    p = await process_achievement_notification(session, body)
    return api_success(post_to_camel(p), "Conquista registrada com sucesso")
