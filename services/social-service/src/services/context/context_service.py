from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.http import auth_client, competitions_client
from src.models import OrganizationProfile, TeamProfile


async def resolve_team_membership(
    team_id: str, keycloak_id: str, authorization: str
) -> bool:
    """True se o utilizador é membro do time no auth ou no competitions (igual a can_post_as_team)."""
    try:
        tid = uuid.UUID(team_id)
    except ValueError:
        return False
    try:
        u = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
        internal_id = uuid.UUID(str(u["id"]))
    except auth_client.AuthClientError:
        return False
    try:
        team = await auth_client.get_auth_team(tid, authorization)
        if auth_client.auth_team_is_member(team, internal_id):
            return True
    except auth_client.AuthClientError:
        pass
    try:
        team = await competitions_client.get_team(tid, authorization)
        if competitions_client.competition_team_is_member(team, internal_id):
            return True
    except competitions_client.CompetitionsClientError:
        pass
    return False


async def can_post_as_organization(
    session: AsyncSession,
    slug: str,
    keycloak_id: str,
    authorization: str,
) -> bool:
    try:
        org = await auth_client.get_organization_by_slug(slug, authorization)
    except auth_client.AuthClientError as e:
        if str(e) == "not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Organização não encontrada") from e
        raise
    if not auth_client.org_is_admin(org):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Você não tem permissão para publicar como esta organização",
        )
    prof = await session.scalar(
        select(OrganizationProfile).where(
            OrganizationProfile.organization_slug == slug
        )
    )
    if not prof or not prof.approved_for_social:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Organização não disponível no social até ser aprovada",
        )
    return True


async def can_post_as_team(
    session: AsyncSession,
    team_id: str,
    keycloak_id: str,
    authorization: str,
) -> bool:
    try:
        tid = uuid.UUID(team_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de equipe inválido") from e

    u = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
    internal_id = uuid.UUID(str(u["id"]))

    member_ok = False
    try:
        team = await auth_client.get_auth_team(tid, authorization)
        if auth_client.auth_team_is_member(team, internal_id):
            member_ok = True
    except auth_client.AuthClientError:
        pass

    if not member_ok:
        try:
            team = await competitions_client.get_team(tid, authorization)
            if competitions_client.competition_team_is_member(team, internal_id):
                member_ok = True
        except competitions_client.CompetitionsClientError:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Equipe não encontrada ou você não tem acesso",
            ) from None

    if not member_ok:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Você não tem permissão para criar posts nesta equipe",
        )

    tprof = await session.scalar(
        select(TeamProfile).where(TeamProfile.team_id == team_id)
    )
    if not tprof or not tprof.approved_for_social:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Equipe não disponível no social até ser aprovada na competição",
        )
    return True


async def list_user_org_slugs(authorization: str) -> list[str]:
    orgs = await auth_client.get_my_organizations(authorization)
    return [str(o.get("slug")) for o in orgs if o.get("slug")]


async def list_user_postable_org_slugs(
    session: AsyncSession, authorization: str
) -> list[str]:
    slugs = await list_user_org_slugs(authorization)
    if not slugs:
        return []
    rows = (
        await session.scalars(
            select(OrganizationProfile.organization_slug).where(
                OrganizationProfile.organization_slug.in_(slugs),
                OrganizationProfile.approved_for_social.is_(True),
            )
        )
    ).all()
    return list(rows)
