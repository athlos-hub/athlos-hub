from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_bearer_authorization,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success, spring_page, team_follow_to_camel
from src.services.profiles.profiles_service import (
    require_team_social_visible,
    resolve_team_profile_for_url,
)
from src.services.follows.follows_service import (
    is_team_following,
    list_my_followed_team_entities,
    list_team_follow_entities,
    team_follower_count,
    toggle_team_follow,
)

router = APIRouter(tags=["social"])


@router.post("/team-follow/{team_id}")
async def team_follow_toggle(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    p = await require_team_social_visible(session, team_id, authorization=authorization)
    following = await toggle_team_follow(session, kid, str(p.team_id))
    return api_success({"following": following})


@router.get("/team-follow/check/{team_id}")
async def team_follow_check(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
    authorization: str | None = Depends(get_optional_bearer_authorization),
):
    if not kid:
        return api_success({"following": False})
    p = await resolve_team_profile_for_url(session, team_id, authorization=authorization)
    if not p or not p.approved_for_social:
        return api_success({"following": False})
    ok = await is_team_following(session, kid, str(p.team_id))
    return api_success({"following": ok})


@router.get("/team-follow/count/{team_id}")
async def team_follow_count_route(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    authorization: str | None = Depends(get_optional_bearer_authorization),
):
    p = await require_team_social_visible(session, team_id, authorization=authorization)
    n = await team_follower_count(session, str(p.team_id))
    return api_success({"count": n})


@router.get("/team-follow/following/{keycloak_id}")
async def team_follow_by_user(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    rows, total = await list_my_followed_team_entities(
        session, keycloak_id, page, size
    )
    content = [team_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))


@router.get("/team-follow/followers/{team_id}")
async def team_follow_followers(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    authorization: str | None = Depends(get_optional_bearer_authorization),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    p = await require_team_social_visible(session, team_id, authorization=authorization)
    rows, total = await list_team_follow_entities(session, str(p.team_id), page, size)
    content = [team_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))
