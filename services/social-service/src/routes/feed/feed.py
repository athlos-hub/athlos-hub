from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_bearer_authorization,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success, post_to_camel, spring_page
from src.services.feed.feed_service import following_feed
from src.services.posts.posts_service import (
    list_for_you_feed,
    popular_posts,
    search_posts,
)

router = APIRouter(tags=["social"])


@router.get("/feed/public")
async def feed_public(
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    kid: str | None = Depends(get_optional_keycloak_id),
    authorization: str | None = Depends(get_optional_bearer_authorization),
):
    # Bearer basta para resolver membros via auth-service; Kong pode não enviar X-Keycloak-Sub
    # em chamadas server-to-server (ex.: Next server actions).
    auth = (
        authorization.strip()
        if authorization and authorization.strip()
        else None
    )
    rows, total = await list_for_you_feed(
        session,
        page,
        size,
        viewer_keycloak_id=kid,
        viewer_authorization=auth,
    )
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/feed/following")
async def feed_following(
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await following_feed(session, kid, page, size, authorization)
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/search/posts")
async def search_posts_route(
    session: AsyncSession = Depends(get_session),
    q: str = Query(..., min_length=1),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await search_posts(session, q, page, size)
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/search/popular")
async def search_popular(
    session: AsyncSession = Depends(get_session),
    days: int = Query(7, ge=1, le=365),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await popular_posts(session, days, page, size)
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/search/trending")
async def search_trending(
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await popular_posts(session, 7, page, size)
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))
