"""Clientes HTTP para auth-service e competitions-service."""

import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx

from live_service.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OrganizationPermissionDetails:
    has_permission: bool
    role: str | None


class AuthServiceClient:
    """Cliente para permissão de organização via auth-service (POST interno)."""

    def __init__(self, base_url: str | None = None) -> None:
        self._base = (base_url or settings.AUTH_SERVICE_URL).rstrip("/")

    async def get_organization_permission_details(
        self,
        keycloak_sub: str,
        organization_id: str,
    ) -> OrganizationPermissionDetails:
        """
        Usa POST /api/internal/check-permission-by-org-id (mesma regra que o GET público),
        alinhado ao roteamento Kong das rotas /api/internal/*.
        """
        try:
            kid = UUID(str(keycloak_sub).strip())
            oid = UUID(str(organization_id).strip())
        except ValueError:
            logger.warning(
                "IDs inválidos para permissão: org=%s sub=%s",
                organization_id,
                keycloak_sub,
            )
            return OrganizationPermissionDetails(has_permission=False, role="NONE")

        url = f"{self._base}/api/internal/check-permission-by-org-id"
        body = {"keycloak_id": str(kid), "organization_id": str(oid)}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=body,
                    headers={"Content-Type": "application/json"},
                )
        except Exception as exc:
            logger.error("Falha ao contactar auth-service: %s", exc)
            return OrganizationPermissionDetails(has_permission=False, role="NONE")

        if not response.is_success:
            logger.error(
                "auth-service check-permission-by-org-id retornou %s: %s",
                response.status_code,
                response.text[:500],
            )
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
