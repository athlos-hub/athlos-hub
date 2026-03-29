"""Clientes HTTP para auth-service e competitions-service."""

import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from live_service.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OrganizationPermissionDetails:
    has_permission: bool
    role: str | None


class AuthServiceClient:
    """Cliente para GET /api/organizations/by-id/{id}/permissions."""

    def __init__(self, base_url: str | None = None) -> None:
        self._base = (base_url or settings.AUTH_SERVICE_URL).rstrip("/")

    async def get_organization_permission_details(
        self,
        keycloak_sub: str,
        organization_id: str,
    ) -> OrganizationPermissionDetails:
        safe = quote(keycloak_sub, safe="")
        url = (
            f"{self._base}/api/organizations/by-id/{organization_id}/permissions"
            f"?keycloak_sub={safe}"
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers={"Content-Type": "application/json"},
                )
        except Exception as exc:
            logger.error("Falha ao contactar auth-service: %s", exc)
            return OrganizationPermissionDetails(has_permission=False, role="NONE")

        if response.status_code == 404:
            logger.warning(
                "Organização ou permissão 404: org=%s sub=%s",
                organization_id,
                keycloak_sub,
            )
            return OrganizationPermissionDetails(has_permission=False, role="NONE")

        if not response.is_success:
            logger.error("auth-service retornou %s", response.status_code)
            return OrganizationPermissionDetails(has_permission=False, role="NONE")

        data: dict[str, Any] = response.json()
        role = data.get("role")
        has_perm = bool(data.get("has_permission"))
        return OrganizationPermissionDetails(has_permission=has_perm, role=role)


class CompetitionsClient:
    """Cliente para POST /api/matches/{id}/start."""

    def __init__(self, base_url: str | None = None) -> None:
        self._base = (base_url or settings.COMPETITIONS_SERVICE_URL).rstrip("/")

    async def start_match(self, match_id: str) -> None:
        url = f"{self._base}/api/matches/{match_id}/start"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                )
            if not response.is_success:
                text = response.text
                logger.error(
                    "Falha ao iniciar partida %s: %s %s",
                    match_id,
                    response.status_code,
                    text,
                )
                return
            logger.info("Partida %s iniciada no competitions-service.", match_id)
        except Exception as exc:
            logger.error("Erro ao iniciar partida %s: %s", match_id, exc)
