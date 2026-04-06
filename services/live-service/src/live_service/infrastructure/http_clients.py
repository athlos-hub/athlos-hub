"""Clientes HTTP para auth-service e competitions-service."""

import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse, urlunparse
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


class CompetitionsStartMatchError(RuntimeError):
    """Falha ao sincronizar início da partida com o competitions-service."""


class CompetitionsClient:
    """Cliente para POST /api/matches/{id}/start."""

    def __init__(self, base_url: str | None = None) -> None:
        self._base = (base_url or settings.COMPETITIONS_SERVICE_URL).rstrip("/")
        self._upstream = (settings.COMPETITIONS_SERVICE_UPSTREAM_URL or "").rstrip("/")

    @staticmethod
    def _derive_upstream_url(base: str) -> str:
        try:
            parsed = urlparse(base)
            if not parsed.scheme or not parsed.netloc:
                return ""
            host = parsed.hostname or ""
            port = parsed.port
            if port != 8100:
                return ""
            netloc = f"{host}:8001"
            if parsed.username and parsed.password:
                netloc = f"{parsed.username}:{parsed.password}@{netloc}"
            elif parsed.username:
                netloc = f"{parsed.username}@{netloc}"
            return urlunparse(
                (
                    parsed.scheme,
                    netloc,
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment,
                )
            ).rstrip("/")
        except Exception:
            return ""

    def _candidate_bases(self) -> list[str]:
        bases = [self._base]
        for candidate in (self._upstream, self._derive_upstream_url(self._base)):
            if candidate and candidate not in bases:
                bases.append(candidate)
        return bases

    async def start_match(self, match_id: str) -> None:
        last_error: str | None = None
        bases = self._candidate_bases()
        for idx, base in enumerate(bases):
            url = f"{base}/api/matches/{match_id}/start"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        url,
                        headers={"Content-Type": "application/json"},
                    )
                if response.is_success:
                    logger.info(
                        "Partida %s iniciada no competitions-service (%s).",
                        match_id,
                        base,
                    )
                    return

                text = response.text
                last_error = f"{response.status_code}: {text[:800]}"
                has_fallback = idx < (len(bases) - 1)
                if response.status_code in (401, 403) and has_fallback:
                    logger.warning(
                        "Start match %s negado em %s (%s). Tentando upstream interno.",
                        match_id,
                        base,
                        response.status_code,
                    )
                    continue

                logger.error(
                    "Falha ao iniciar partida %s em %s: %s %s",
                    match_id,
                    base,
                    response.status_code,
                    text,
                )
            except Exception as exc:
                last_error = str(exc)
                has_fallback = idx < (len(bases) - 1)
                if has_fallback:
                    logger.warning(
                        "Erro ao iniciar partida %s em %s: %s. Tentando fallback.",
                        match_id,
                        base,
                        exc,
                    )
                    continue
                logger.error("Erro ao iniciar partida %s: %s", match_id, exc)

            break

        raise CompetitionsStartMatchError(last_error or "Falha desconhecida no start_match")
