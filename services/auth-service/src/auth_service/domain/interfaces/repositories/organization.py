"""Interface de repositório de organização"""

from abc import abstractmethod
from typing import Any, Optional, Sequence
from uuid import UUID

from auth_service.domain.interfaces.repositories.base import IBaseRepository
from auth_service.infrastructure.database.models.enums import OrganizationPrivacy
from auth_service.infrastructure.database.models.organization_model import Organization


class IOrganizationRepository(IBaseRepository):
    """Interface abstrata para repositório de Organização."""

    @abstractmethod
    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        """Obtém organização por UUID."""
        ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        """Obtém organização por slug."""
        ...

    @abstractmethod
    async def get_by_slug_with_owner(self, slug: str) -> Optional[Organization]:
        """Obtém organização por slug com relacionamento do proprietário carregado."""
        ...

    @abstractmethod
    async def get_all(
        self,
        privacy: Optional[OrganizationPrivacy] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Organization]:
        """Obtém todas as organizações com filtros opcionais."""
        ...

    @abstractmethod
    async def exists_by_slug(self, slug: str) -> bool:
        """Verifica se organização com slug existe."""
        ...

    @abstractmethod
    async def create(self, organization: Organization) -> Organization:
        """Cria uma nova organização."""
        ...

    @abstractmethod
    async def update(
        self, org_id: UUID, data: dict[str, Any]
    ) -> Optional[Organization]:
        """Atualiza organização por ID."""
        ...

    @abstractmethod
    async def delete(self, org_id: UUID) -> bool:
        """Deleta organização por ID."""
        ...
