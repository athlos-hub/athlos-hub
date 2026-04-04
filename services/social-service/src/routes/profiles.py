from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_keycloak_id
from src.routes.deps import get_session
from src.schemas import (
    api_success,
    athlete_profile_to_camel,
    org_profile_to_camel,
    team_profile_to_camel,
)
from src.services.profiles_service import (
    get_or_create_athlete,
    get_or_create_team,
    get_org_profile,
    get_team_profile,
    patch_athlete_profile,
    set_achievements,
    set_social_links,
    set_statistics,
    set_visibility,
    update_bio,
    update_team_profile,
)

router = APIRouter(tags=["social"])


@router.get("/profile/me")
async def profile_me(
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await get_or_create_athlete(session, kid)
    return api_success(athlete_profile_to_camel(p))


@router.get("/profile/{keycloak_id}")
async def profile_by_id(
    keycloak_id: str,
    session: AsyncSession = Depends(get_session),
):
    p = await get_or_create_athlete(session, keycloak_id)
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me")
async def profile_update_me(
    updates: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await patch_athlete_profile(session, kid, updates)
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me/bio")
async def profile_bio(
    body: dict[str, str],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await update_bio(session, kid, body.get("bio"))
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me/achievements")
async def profile_achievements(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await set_achievements(session, kid, body)
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me/statistics")
async def profile_statistics(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await set_statistics(session, kid, body)
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me/social-links")
async def profile_social_links(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await set_social_links(session, kid, body)
    return api_success(athlete_profile_to_camel(p))


@router.put("/profile/me/visibility")
async def profile_visibility(
    body: dict[str, bool],
    session: AsyncSession = Depends(get_session),
    kid: str = Depends(get_current_keycloak_id),
):
    p = await set_visibility(session, kid, body.get("isPublic"))
    return api_success(athlete_profile_to_camel(p))


@router.get("/organization-profiles/{slug}")
async def org_profile_get(slug: str, session: AsyncSession = Depends(get_session)):
    p = await get_org_profile(session, slug)
    return api_success(org_profile_to_camel(p))


@router.post("/team-profiles", status_code=status.HTTP_200_OK)
async def team_profile_create(
    body: dict[str, str],
    session: AsyncSession = Depends(get_session),
):
    tid = (body.get("teamId") or "").strip()
    if not tid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "teamId é obrigatório")
    p = await get_or_create_team(
        session, tid, body.get("organizationSlug")
    )
    return api_success(team_profile_to_camel(p), "Perfil de time criado/obtido com sucesso")


@router.get("/team-profiles/{team_id}")
async def team_profile_get(team_id: str, session: AsyncSession = Depends(get_session)):
    p = await get_team_profile(session, team_id)
    return api_success(team_profile_to_camel(p))


@router.put("/team-profiles/{team_id}")
async def team_profile_put(
    team_id: str,
    updates: dict[str, Any],
    session: AsyncSession = Depends(get_session),
):
    p = await update_team_profile(session, team_id, updates)
    return api_success(team_profile_to_camel(p), "Perfil atualizado com sucesso")
