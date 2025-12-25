"""Interface de repositório de membro de organização"""

from abc import abstractmethod
from typing import Optional, Sequence
from uuid import UUID

from auth_service.domain.interfaces.repositories.base import IBaseRepository
from auth_service.infrastructure.database.models.enums import MemberStatus
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
)


class IOrganizationMemberRepository(IBaseRepository):
    """Interface abstrata para repositório de Membro de Organização."""

    @abstractmethod
    async def get_by_id(self, membership_id: UUID) -> Optional[OrganizationMember]:
        """Obtém associação por ID."""
        ...

    @abstractmethod
    async def get_membership(
        self, org_id: UUID, user_id: UUID
    ) -> Optional[OrganizationMember]:
        """Obtém associação de um usuário em uma organização."""
        ...

    @abstractmethod
    async def get_membership_by_status(
        self, org_id: UUID, user_id: UUID, status: MemberStatus
    ) -> Optional[OrganizationMember]:
        """Obtém associação com status específico."""
        ...

    @abstractmethod
    async def get_membership_by_slug_and_status(
        self, org_slug: str, user_id: UUID, status: MemberStatus
    ) -> Optional[OrganizationMember]:
        """Obtém associação por slug da organização e status."""
        ...

    @abstractmethod
    async def get_members_by_org(
        self, org_id: UUID, status: Optional[MemberStatus] = None
    ) -> Sequence[OrganizationMember]:
        """Obtém todos os membros de uma organização com filtro de status opcional."""
        ...

    @abstractmethod
    async def get_pending_requests(self, org_id: UUID) -> Sequence[OrganizationMember]:
        """Obtém solicitações de entrada pendentes de uma organização."""
        ...

    @abstractmethod
    async def get_sent_invites(self, org_id: UUID) -> Sequence[OrganizationMember]:
        """Obtém convites enviados de uma organização."""
        ...

    @abstractmethod
    async def get_user_organizations_with_role(
        self, user_id: UUID, roles: set[str]
    ) -> Sequence[tuple[Organization, str]]:
        """Obtém organizações onde o usuário tem as funções especificadas."""
        ...

    @abstractmethod
    async def get_pending_membership_for_approval(
        self, membership_id: UUID, org_slug: str, approver_id: UUID
    ) -> Optional[OrganizationMember]:
        """Obtém associação pendente se o aprovador tiver permissão."""
        ...

    @abstractmethod
    async def exists_membership(
        self, org_id: UUID, user_id: UUID, statuses: list[MemberStatus]
    ) -> bool:
        """Verifica se associação existe com os status informados."""
        ...

    @abstractmethod
    async def create(self, membership: OrganizationMember) -> OrganizationMember:
        """Cria uma nova associação."""
        ...

    @abstractmethod
    async def update_status(
        self, membership: OrganizationMember, status: MemberStatus
    ) -> OrganizationMember:
        """Atualiza status da associação."""
        ...

    @abstractmethod
    async def delete(self, membership: OrganizationMember) -> bool:
        """Deleta uma associação."""
        ...
