import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_bearer_authorization,
    get_optional_keycloak_id,
)
from src.models import Post
from src.routes.deps import get_session
from src.schemas import api_success
from src.services.interactions.interactions_service import is_liked, toggle_like
from src.services.posts.posts_service import get_post_for_interaction_or_404

router = APIRouter(tags=["social"])


@router.post("/posts/{post_id}/like")
async def like_toggle(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    is_liked_now = await toggle_like(session, post_id, kid, authorization)
    post = await session.get(Post, post_id)
    likes_count = int(post.likes_count) if post else 0
    return api_success({"isLiked": is_liked_now, "likesCount": likes_count})


@router.get("/posts/{post_id}/like")
async def like_status(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
    authorization: str | None = Depends(get_optional_bearer_authorization),
):
    if not kid or not authorization:
        post = await get_post_for_interaction_or_404(session, post_id, None, None)
        return api_success({"isLiked": False, "likesCount": int(post.likes_count)})

    liked = await is_liked(session, post_id, kid, authorization)
    post = await session.get(Post, post_id)
    likes_count = int(post.likes_count) if post else 0
    return api_success({"isLiked": liked, "likesCount": likes_count})
