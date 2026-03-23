"""Providers de DI da nova camada simplificada."""

from typing import Annotated

from database.dependencies import get_session
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.core.adapters.keycloak_admin_adapter import KeycloakAdminAdapter
from auth_service.core.ports.keycloak_service import IKeycloakService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_keycloak_service() -> IKeycloakService:
    return KeycloakAdminAdapter()

