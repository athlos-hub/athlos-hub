from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success, organization_follow_to_camel, spring_page
from src.services.follows_service import (
    is_org_following,
    list_my_followed_org_entities,
    list_org_follow_entities,
    org_follower_count,
    toggle_org_follow,
)

router = APIRouter(tags=["social"])


@router.post("/organization-follow/{organization_slug}")
async def org_follow_toggle(
    organization_slug: str,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    following = await toggle_org_follow(
        session, kid, organization_slug, authorization
    )
    return api_success({"following": following})


@router.get("/organization-follow/check/{organization_slug}")
async def org_follow_check(
    organization_slug: str,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
):
    if not kid:
        return api_success({"following": False})
    ok = await is_org_following(session, kid, organization_slug)
    return api_success({"following": ok})


@router.get("/organization-follow/count/{organization_slug}")
async def org_follow_count(organization_slug: str, session: AsyncSession = Depends(get_session)):
    n = await org_follower_count(session, organization_slug)
    return api_success({"count": n})


@router.get("/organization-follow/followers/{organization_slug}")
async def org_follow_followers(
    organization_slug: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    rows, total = await list_org_follow_entities(
        session, organization_slug, page, size
    )
    content = [organization_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/organization-follow/my-organizations")
async def org_follow_mine(
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    rows, total = await list_my_followed_org_entities(session, kid, page, size)
    content = [organization_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/organization-follow/following/{keycloak_id}")
async def org_follow_by_user(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    rows, total = await list_my_followed_org_entities(
        session, keycloak_id, page, size
    )
    content = [organization_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))
