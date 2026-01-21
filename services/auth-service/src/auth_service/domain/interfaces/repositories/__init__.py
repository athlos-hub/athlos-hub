"""Package de interfaces de repositório para Clean Architecture."""

from auth_service.domain.interfaces.repositories.base import IBaseRepository
from auth_service.domain.interfaces.repositories.organization import (
    IOrganizationRepository,
)
from auth_service.domain.interfaces.repositories.organization_member import (
    IOrganizationMemberRepository,
)
from auth_service.domain.interfaces.repositories.organization_organizer import (
    IOrganizationOrganizerRepository,
)
from auth_service.domain.interfaces.repositories.user import IUserRepository

__all__ = [
    "IBaseRepository",
    "IUserRepository",
    "IOrganizationRepository",
    "IOrganizationMemberRepository",
    "IOrganizationOrganizerRepository",
]
