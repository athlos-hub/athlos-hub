from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from src.infrastructure.http import auth_client, competitions_client


async def can_post_as_organization(slug: str, keycloak_id: str, authorization: str) -> bool:
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
    return True


async def can_post_as_team(team_id: str, keycloak_id: str, authorization: str) -> bool:
    try:
        tid = uuid.UUID(team_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de equipe inválido") from e

    u = await auth_client.get_user_by_keycloak_id(keycloak_id, authorization)
    internal_id = uuid.UUID(str(u["id"]))

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
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Equipe não encontrada ou você não tem acesso",
        ) from None

    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Você não tem permissão para criar posts nesta equipe",
    )


async def list_user_org_slugs(authorization: str) -> list[str]:
    orgs = await auth_client.get_my_organizations(authorization)
    return [str(o.get("slug")) for o in orgs if o.get("slug")]
