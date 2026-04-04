import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_bearer_authorization, get_current_keycloak_id
from src.routes.deps import get_session
from src.schemas import api_success, post_to_camel, spring_page
from src.services.context_service import can_post_as_organization
from src.services.posts_service import (
    create_post_org_or_team,
    delete_post_generic,
    list_profile_posts,
)

router = APIRouter(tags=["social"])


@router.post("/organizations/{slug}/posts", status_code=status.HTTP_201_CREATED)
async def org_post_create(
    slug: str,
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    await can_post_as_organization(slug, kid, authorization)
    p = await create_post_org_or_team(
        session,
        profile_type="ORGANIZATION",
        profile_id=slug,
        keycloak_id=kid,
        content=str(body.get("content") or ""),
        media_urls=body.get("mediaUrls"),
        post_type=str(body.get("type") or "TEXT"),
        visibility=str(body.get("visibility") or "PUBLIC"),
        metadata=body.get("metadata"),
    )
    return api_success(post_to_camel(p))


@router.get("/organizations/{slug}/posts")
async def org_posts_list(
    slug: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_profile_posts(
        session, "ORGANIZATION", slug, page, size
    )
    content = [post_to_camel(p) for p in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.delete("/organizations/{slug}/posts/{post_id}")
async def org_post_delete(
    slug: str,
    post_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    await can_post_as_organization(slug, kid, authorization)
    await delete_post_generic(session, post_id, kid)
    return api_success(None, "Post deletado com sucesso")
