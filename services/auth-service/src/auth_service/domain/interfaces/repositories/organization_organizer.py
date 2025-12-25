"""Interface de repositório de organizador"""

from abc import abstractmethod
from typing import Optional, Sequence
from uuid import UUID

from auth_service.domain.interfaces.repositories.base import IBaseRepository
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationOrganizer,
)


class IOrganizationOrganizerRepository(IBaseRepository):
    """Interface abstrata para repositório de Organizador."""

    @abstractmethod
    async def get_organizer(
        self, org_id: UUID, user_id: UUID
    ) -> Optional[OrganizationOrganizer]:
        """Obtém registro de organizador."""
        ...

    @abstractmethod
    async def get_organizers_by_org(
        self, org_id: UUID
    ) -> Sequence[OrganizationOrganizer]:
        """Obtém todos os organizadores de uma organização."""
        ...

    @abstractmethod
    async def is_organizer(self, org_id: UUID, user_id: UUID) -> bool:
        """Verifica se o usuário é um organizador da organização."""
        ...

    @abstractmethod
    async def is_owner_or_organizer(
        self, org_slug: str, user_id: UUID
    ) -> Optional[Organization]:
        """Verifica se o usuário é proprietário ou organizador, retorna org se verdadeiro."""
        ...

    @abstractmethod
    async def create(self, organizer: OrganizationOrganizer) -> OrganizationOrganizer:
        """Adiciona um novo organizador."""
        ...

    @abstractmethod
    async def delete(self, organizer: OrganizationOrganizer) -> bool:
        """Remove um organizador."""
        ...
