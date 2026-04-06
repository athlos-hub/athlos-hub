from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx

from src.config.settings import settings

logger = logging.getLogger(__name__)


class AuthClientError(Exception):
    pass


async def _get_json(path: str, authorization: str) -> Any:
    base = settings.AUTH_SERVICE_URL.rstrip("/")
    url = f"{base}{path}"
    headers = {"Authorization": authorization}
    async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
        r = await client.get(url, headers=headers)
        if r.status_code == 404:
            raise AuthClientError("not_found")
        r.raise_for_status()
        return r.json()


async def get_user_by_keycloak_id(keycloak_id: str, authorization: str) -> dict[str, Any]:
    return await _get_json(f"/api/users/by-keycloak-id/{keycloak_id}", authorization)


async def get_user_by_username(username: str) -> dict[str, Any]:
    """Busca usuário por username (sem autenticação necessária)."""
    base = settings.AUTH_SERVICE_URL.rstrip("/")
    url = f"{base}/api/users/by-username/{username}"
    async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
        r = await client.get(url)
        if r.status_code == 404:
            raise AuthClientError("not_found")
        r.raise_for_status()
        return r.json()


async def get_organization_by_slug(slug: str, authorization: str) -> dict[str, Any]:
    return await _get_json(f"/api/organizations/{slug}", authorization)


async def get_my_organizations(authorization: str) -> list[dict[str, Any]]:
    base = settings.AUTH_SERVICE_URL.rstrip("/")
    async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
        r = await client.get(f"{base}/api/organizations/me", headers={"Authorization": authorization})
        r.raise_for_status()
        return r.json()


async def get_my_teams(authorization: str) -> list[dict[str, Any]]:
    """Times em que o utilizador é capitão ou jogador (auth-service)."""
    base = settings.AUTH_SERVICE_URL.rstrip("/")
    async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
        r = await client.get(f"{base}/api/teams/me", headers={"Authorization": authorization})
        r.raise_for_status()
        return r.json()


async def get_auth_team(team_id: uuid.UUID, authorization: str) -> dict[str, Any]:
    return await _get_json(f"/api/teams/{team_id}", authorization)


def org_is_admin(org: dict[str, Any]) -> bool:
    role = (org.get("role") or "").upper()
    return role in ("OWNER", "ORGANIZER")


def auth_team_is_member(team: dict[str, Any], user_id: uuid.UUID) -> bool:
    members = team.get("members") or []
    for m in members:
        uid = m.get("user_id")
        if uid is None and m.get("user") and isinstance(m["user"], dict):
            uid = m["user"].get("id")
        try:
            if uid and uuid.UUID(str(uid)) == user_id:
                return True
        except ValueError:
            continue
    return False


async def resolve_public_internal_user_id(keycloak_id: str) -> uuid.UUID | None:
    """Resolve id interno do usuário via endpoint público (sem JWT). Usado por jobs/consumidores."""
    base = settings.AUTH_SERVICE_URL.rstrip("/")
    url = f"{base}/api/users/by-keycloak-id/{keycloak_id}"
    try:
        async with httpx.AsyncClient(timeout=settings.AUTH_SERVICE_TIMEOUT) as client:
            r = await client.get(url)
        if r.status_code != 200:
            return None
        data = r.json()
        uid = data.get("id")
        if uid:
            return uuid.UUID(str(uid))
    except Exception as e:
        logger.warning("resolve_public_internal_user_id falhou: %s", e)
    return None


async def resolve_internal_user_id(keycloak_id: str, authorization: str) -> uuid.UUID | None:
    try:
        u = await get_user_by_keycloak_id(keycloak_id, authorization)
        uid = u.get("id")
        if uid:
            return uuid.UUID(str(uid))
    except Exception as e:
        logger.warning("resolve_internal_user_id falhou: %s", e)
    return None
