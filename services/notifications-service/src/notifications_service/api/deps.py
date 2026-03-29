"""Dependências da API.

JWT validation is handled exclusively by Kong Gateway.
This service trusts X-Keycloak-Sub injected by Kong.
Do NOT add JWT validation here — it breaks the single-responsibility contract.
"""

from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from notifications_service.common.gateway_identity import resolve_gateway_sub
from notifications_service.infrastructure.database.dependencies import get_session
from notifications_service.core.config import settings
from notifications_service.repositories.notification_repository import NotificationRepository
from notifications_service.services.notification_service import NotificationService

async def get_notification_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> NotificationRepository:
    return NotificationRepository(session)


async def get_notification_service(
    repo: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> NotificationService:
    return NotificationService(repo)


async def get_current_user_id(
    x_keycloak_sub: Annotated[str | None, Header(alias="X-Keycloak-Sub")] = None,
    x_test_sub: Annotated[str | None, Header(alias="X-Test-Sub")] = None,
) -> UUID:
    """
    ID interno do usuário no auth-service.
    O Kong valida o JWT e envia X-Keycloak-Sub; resolvemos o id via endpoint público by-keycloak-id.
    """
    kid = resolve_gateway_sub(x_keycloak_sub, x_test_sub)
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado (X-Keycloak-Sub ausente).",
        )
    url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/users/by-keycloak-id/{kid}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=15.0)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service indisponível",
        )
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    data = response.json()
    try:
        return UUID(str(data["id"]))
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")


async def verify_internal_key(
    x_internal_api_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
) -> None:
    if not x_internal_api_key or x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chave interna inválida")


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]
CurrentUserIdDep = Annotated[UUID, Depends(get_current_user_id)]
