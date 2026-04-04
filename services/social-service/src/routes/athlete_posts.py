import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_keycloak_id
from src.routes.deps import get_session
from src.schemas import api_success, post_to_camel, spring_page
from src.services.posts_service import (
    create_athlete_post,
    delete_athlete_post,
    list_profile_posts,
    share_original_post,
)

router = APIRouter(tags=["social"])


@router.post("/athlete/posts", status_code=status.HTTP_201_CREATED)
async def athlete_post_create(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await create_athlete_post(
        session,
        kid,
        str(body.get("content") or ""),
        body.get("mediaUrls"),
        str(body.get("type") or "TEXT"),
        str(body.get("visibility") or "PUBLIC"),
        body.get("metadata"),
    )
    return api_success(post_to_camel(p))


@router.get("/athlete/posts/my-posts")
async def athlete_my_posts(
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_profile_posts(session, "ATHLETE", kid, page, size)
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/athlete/posts/{keycloak_id}")
async def athlete_posts_by_user(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_profile_posts(
        session, "ATHLETE", keycloak_id, page, size
    )
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.delete("/athlete/posts/{post_id}")
async def athlete_post_delete(
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    await delete_athlete_post(session, post_id, kid)
    return api_success(None)


@router.post("/athlete/posts/{post_id}/share")
async def athlete_post_share(
    post_id: uuid.UUID,
    body: dict[str, Any] | None,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    b = body or {}
    p = await share_original_post(
        session,
        post_id,
        kid,
        b.get("content"),
        b.get("metadata"),
    )
    return api_success(post_to_camel(p))
