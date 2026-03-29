"""Dependências de autenticação: identidade propagada pelo Kong (X-Keycloak-Sub).

JWT validation is handled exclusively by Kong Gateway.
This service trusts X-Keycloak-Sub injected by Kong.
Do NOT add JWT validation here — it breaks the single-responsibility contract.
"""

import logging
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status

from src.gateway_identity import resolve_gateway_sub
from src.config.settings import settings
from src.services.auth_client import (
    AuthClient,
    AuthClientError,
    AuthServiceUnavailable,
    PermissionDenied,
)

logger = logging.getLogger(__name__)


def _parse_keycloak_sub(raw: str | None) -> UUID | None:
    if not raw or not raw.strip():
        return None
    try:
        return UUID(raw.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Keycloak-Sub inválido",
        )


async def get_current_keycloak_id(
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> UUID:
    raw = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    kid = _parse_keycloak_sub(raw)
    if kid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado (X-Keycloak-Sub ausente).",
        )
    return kid


get_current_user_id = get_current_keycloak_id


async def get_optional_keycloak_id(
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> Optional[UUID]:
    raw = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    return _parse_keycloak_sub(raw)


class RequireOrgPermission:
    """
    Verifica permissão na organização via auth-service (rede interna).
    """

    def __init__(self, allowed_roles: List[str] = None):
        self.allowed_roles = allowed_roles or ["OWNER", "ORGANIZER"]

    async def __call__(
        self,
        organization_slug: str,
        keycloak_id: UUID = Depends(get_current_keycloak_id),
    ) -> UUID:
        auth_client = AuthClient(
            base_url=settings.AUTH_SERVICE_URL,
            timeout=settings.AUTH_SERVICE_TIMEOUT,
        )

        try:
            async with auth_client:
                await auth_client.check_user_permission(
                    keycloak_id=keycloak_id,
                    organization_slug=organization_slug,
                    allowed_roles=self.allowed_roles,
                )

            logger.info(
                "Permissão concedida: user %s pode acessar org %s",
                keycloak_id,
                organization_slug,
            )
            return keycloak_id

        except PermissionDenied as e:
            logger.warning(
                "Permissão negada: user %s tentou acessar org %s. Role atual: %s",
                keycloak_id,
                organization_slug,
                e.role,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "Você não tem permissão para realizar esta ação",
                    "required_roles": self.allowed_roles,
                    "your_role": e.role,
                },
            )
        except AuthServiceUnavailable as e:
            logger.error("Auth service indisponível: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de autenticação temporariamente indisponível",
            )
        except AuthClientError as e:
            logger.error("Erro no auth client: %s", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao verificar permissões",
            )


require_owner_or_organizer = RequireOrgPermission(["OWNER", "ORGANIZER"])
require_owner = RequireOrgPermission(["OWNER"])

CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
