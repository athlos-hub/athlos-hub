import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success
from src.services.interactions_service import is_liked, toggle_like

router = APIRouter(tags=["social"])


@router.post("/posts/{post_id}/like")
async def like_toggle(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    liked = await toggle_like(session, post_id, kid, authorization)
    return api_success({"liked": liked})


@router.get("/posts/{post_id}/like")
async def like_status(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
):
    if not kid:
        return api_success({"liked": False})
    liked = await is_liked(session, post_id, kid)
    return api_success({"liked": liked})
