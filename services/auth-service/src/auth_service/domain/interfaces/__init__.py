"""Módulo de interfaces de domínio."""

from auth_service.domain.interfaces.external_services import IKeycloakService
from auth_service.domain.interfaces.repositories import (
    IBaseRepository,
    IOrganizationMemberRepository,
    IOrganizationOrganizerRepository,
    IOrganizationRepository,
    IUserRepository,
)

__all__ = [
    # Repositories
    "IBaseRepository",
    "IUserRepository",
    "IOrganizationRepository",
    "IOrganizationMemberRepository",
    "IOrganizationOrganizerRepository",
    # External Services
    "IKeycloakService",
]
