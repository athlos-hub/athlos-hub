import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_optional_bearer_authorization, get_optional_keycloak_id
from src.routes.deps import get_session
from src.schemas import api_success, post_to_camel
from src.services.posts.achievements_service import process_achievement_notification
from src.services.posts.posts_service import get_post_for_interaction_or_404

router = APIRouter(tags=["social"])


@router.get("/posts/{post_id}")
async def get_post(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    viewer_kid: str | None = Depends(get_optional_keycloak_id),
    viewer_auth: str | None = Depends(get_optional_bearer_authorization),
):
    p = await get_post_for_interaction_or_404(session, post_id, viewer_kid, viewer_auth)
    return api_success(post_to_camel(p))


@router.post("/achievements/notify")
async def achievements_notify(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
):
    p = await process_achievement_notification(session, body)
    if p is None:
        return api_success(
            None, "Evento ignorado (perfil de time não disponível no social)"
        )
    return api_success(post_to_camel(p), "Conquista registrada com sucesso")
