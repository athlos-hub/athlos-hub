from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_keycloak_id, get_optional_keycloak_id
from src.routes.deps import get_session
from src.schemas import api_success, spring_page, team_follow_to_camel
from src.services.profiles.profiles_service import require_team_social_visible
from src.services.follows.follows_service import (
    is_team_following,
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
):
    following = await toggle_team_follow(session, kid, team_id)
    return api_success({"following": following})


@router.get("/team-follow/check/{team_id}")
async def team_follow_check(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
):
    if not kid:
        return api_success({"following": False})
    ok = await is_team_following(session, kid, team_id)
    return api_success({"following": ok})


@router.get("/team-follow/count/{team_id}")
async def team_follow_count_route(team_id: str, session: AsyncSession = Depends(get_session)):
    await require_team_social_visible(session, team_id)
    n = await team_follower_count(session, team_id)
    return api_success({"count": n})


@router.get("/team-follow/followers/{team_id}")
async def team_follow_followers(
    team_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    await require_team_social_visible(session, team_id)
    rows, total = await list_team_follow_entities(session, team_id, page, size)
    content = [team_follow_to_camel(x) for x in rows]
    return api_success(spring_page(content, total_elements=total, page=page, size=size))
