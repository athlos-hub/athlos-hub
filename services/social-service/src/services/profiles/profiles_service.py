from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete as sql_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.http.auth_client import AuthClientError, get_user_by_username
from src.models import (
    AthleteProfile,
    OrganizationProfile,
    Post,
    TeamFollow,
    TeamProfile,
)


async def get_or_create_athlete(session: AsyncSession, keycloak_id: str) -> AthleteProfile:
    p = await session.scalar(
        select(AthleteProfile).where(AthleteProfile.keycloak_id == keycloak_id)
    )
    if not p:
        p = AthleteProfile(keycloak_id=keycloak_id)
        session.add(p)
        await session.flush()
    return p


async def patch_athlete_profile(
    session: AsyncSession, keycloak_id: str, updates: dict[str, Any]
) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    if "bio" in updates and updates["bio"] is not None:
        p.bio = str(updates["bio"])
    if "specialization" in updates and updates["specialization"] is not None:
        p.specialization = str(updates["specialization"])
    if "city" in updates and updates["city"] is not None:
        p.city = str(updates["city"])
    if "state" in updates and updates["state"] is not None:
        p.state = str(updates["state"])
    if "country" in updates and updates["country"] is not None:
        p.country = str(updates["country"])
    if "isPublic" in updates and updates["isPublic"] is not None:
        p.is_public = bool(updates["isPublic"])
    if "achievements" in updates and updates["achievements"] is not None:
        p.achievements = updates["achievements"]  # type: ignore[assignment]
    if "statistics" in updates and updates["statistics"] is not None:
        p.statistics = updates["statistics"]  # type: ignore[assignment]
    if "socialLinks" in updates and updates["socialLinks"] is not None:
        p.social_links = updates["socialLinks"]  # type: ignore[assignment]
    return p


async def get_org_profile(session: AsyncSession, slug: str) -> OrganizationProfile:
    p = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == slug
        )
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organização não encontrada")
    return p


async def get_or_create_org(session: AsyncSession, slug: str) -> OrganizationProfile:
    p = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == slug
        )
    )
    if not p:
        p = OrganizationProfile(organization_slug=slug)
        session.add(p)
        await session.flush()
    return p


async def get_or_create_team(
    session: AsyncSession, team_id: str, organization_slug: str | None
) -> TeamProfile:
    p = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if not p:
        slug = organization_slug or "_unknown"
        p = TeamProfile(team_id=team_id, organization_slug=slug)
        session.add(p)
        await session.flush()
    elif organization_slug and p.organization_slug == "_unknown":
        p.organization_slug = organization_slug
    return p


async def get_team_profile(session: AsyncSession, team_id: str) -> TeamProfile:
    p = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Perfil de time não encontrado")
    return p


async def require_org_social_visible(
    session: AsyncSession, slug: str
) -> OrganizationProfile:
    p = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == slug
        )
    )
    if not p or not p.approved_for_social:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organização não encontrada")
    return p


async def require_team_social_visible(session: AsyncSession, team_id: str) -> TeamProfile:
    p = await session.scalar(select(TeamProfile).where(TeamProfile.team_id == team_id))
    if not p or not p.approved_for_social:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Perfil de time não encontrado")
    return p


async def update_team_profile(
    session: AsyncSession, team_id: str, updates: dict[str, Any]
) -> TeamProfile:
    p = await require_team_social_visible(session, team_id)
    if "description" in updates and updates["description"] is not None:
        p.description = str(updates["description"])
    if "socialLinks" in updates and updates["socialLinks"] is not None:
        p.social_links = updates["socialLinks"]  # type: ignore[assignment]
    if "isPrivate" in updates and updates["isPrivate"] is not None:
        p.is_private = bool(updates["isPrivate"])
    return p


async def delete_team_social_data(session: AsyncSession, team_id: str) -> None:
    """
    Remove dados sociais ligados ao time (ID do time no competitions-service):
    posts TEAM, seguidores e linha em team_profiles.
    """
    tid = team_id.strip()
    if not tid:
        return
    await session.execute(
        sql_delete(Post).where(
            Post.profile_type == "TEAM",
            Post.profile_id == tid,
        )
    )
    await session.execute(sql_delete(TeamFollow).where(TeamFollow.team_id == tid))
    await session.execute(sql_delete(TeamProfile).where(TeamProfile.team_id == tid))


async def update_bio(session: AsyncSession, keycloak_id: str, bio: str | None) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    if bio is not None:
        p.bio = bio
    return p


async def set_achievements(
    session: AsyncSession, keycloak_id: str, achievements: dict[str, Any]
) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    p.achievements = achievements
    return p


async def set_statistics(
    session: AsyncSession, keycloak_id: str, statistics: dict[str, Any]
) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    p.statistics = statistics
    return p


async def set_social_links(
    session: AsyncSession, keycloak_id: str, social_links: dict[str, Any]
) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    p.social_links = social_links
    return p


async def set_visibility(
    session: AsyncSession, keycloak_id: str, is_public: bool | None
) -> AthleteProfile:
    p = await get_or_create_athlete(session, keycloak_id)
    if is_public is not None:
        p.is_public = is_public
    return p


async def get_athlete_by_username(session: AsyncSession, username: str) -> AthleteProfile:
    """Busca o perfil do atleta via username.
    
    Fluxo:
    1. Busca usuário no auth-service pelo username
    2. Com o keycloak_id, obtém ou cria o perfil do atleta
    """
    try:
        auth_user = await get_user_by_username(username)
    except AuthClientError as e:
        if str(e) == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário '{username}' não encontrado"
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Erro ao conectar com serviço de autenticação"
        )
    
    keycloak_id = auth_user.get("keycloakId") or auth_user.get("keycloak_id")
    if not keycloak_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dados inválidos do usuário"
        )
    
    return await get_or_create_athlete(session, keycloak_id)
