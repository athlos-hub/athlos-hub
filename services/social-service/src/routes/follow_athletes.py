from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_bearer_authorization,
    get_current_keycloak_id,
    get_optional_keycloak_id,
)
from src.routes.deps import get_session
from src.schemas import api_success, spring_page
from src.services.follows_service import (
    is_following,
    list_followers,
    list_following,
    toggle_follow,
)

router = APIRouter(tags=["social"])


@router.post("/follow/{target_keycloak_id}")
async def follow_toggle(
    target_keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
    authorization: str = Depends(get_bearer_authorization),
):
    following = await toggle_follow(session, kid, target_keycloak_id, authorization)
    return api_success({"following": following})


@router.get("/follow/check/{target_keycloak_id}")
async def follow_check(
    target_keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    kid: str | None = Depends(get_optional_keycloak_id),
):
    if not kid:
        return api_success({"following": False})
    ok = await is_following(session, kid, target_keycloak_id)
    return api_success({"following": ok})


@router.get("/follow/followers/{keycloak_id}")
async def follow_followers(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_followers(session, keycloak_id, page, size)
    return api_success(spring_page(rows, total_elements=total, page=page, size=size))


@router.get("/follow/following/{keycloak_id}")
async def follow_following(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
):
    rows, total = await list_following(session, keycloak_id, page, size)
    return api_success(spring_page(rows, total_elements=total, page=page, size=size))
