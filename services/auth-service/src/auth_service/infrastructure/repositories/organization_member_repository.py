"""Implementação PostgreSQL do repositório de Membro de Organização."""

import logging
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, case, exists, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from auth_service.domain.interfaces.repositories import IOrganizationMemberRepository
from auth_service.infrastructure.database.models.enums import MemberStatus, OrganizationStatus
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)

logger = logging.getLogger(__name__)


class OrgRole:
    """Constantes de função de organização."""

    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


class OrganizationMemberRepository(IOrganizationMemberRepository):
    """Implementação PostgreSQL do repositório de Membro de Organização."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, membership_id: UUID) -> Optional[OrganizationMember]:
        """Obtém associação por ID."""
        return await self._session.get(OrganizationMember, membership_id)

    async def get_membership(
        self, org_id: UUID, user_id: UUID
    ) -> Optional[OrganizationMember]:
        """Obtém associação de um usuário em uma organização."""
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_membership_by_status(
        self, org_id: UUID, user_id: UUID, status: MemberStatus
    ) -> Optional[OrganizationMember]:
        """Obtém associação com status específico."""
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == status,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_membership_by_slug_and_status(
        self, org_slug: str, user_id: UUID, status: MemberStatus
    ) -> Optional[OrganizationMember]:
        """Obtém associação por slug da organização e status."""
        stmt = (
            select(OrganizationMember)
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(
                Organization.slug == org_slug,
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == status,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_members_by_org(
        self, org_id: UUID, status: Optional[MemberStatus] = None
    ) -> Sequence[OrganizationMember]:
        """Obtém todos os membros de uma organização com filtro de status opcional."""
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .where(OrganizationMember.organization_id == org_id)
        )

        if status:
            stmt = stmt.where(OrganizationMember.status == status)

        stmt = stmt.order_by(OrganizationMember.created_at.asc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_pending_requests(self, org_id: UUID) -> Sequence[OrganizationMember]:
        """Obtém solicitações de adesão pendentes de uma organização."""
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == MemberStatus.PENDING,
            )
            .order_by(OrganizationMember.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_sent_invites(self, org_id: UUID) -> Sequence[OrganizationMember]:
        """Obtém convites enviados de uma organização."""
        stmt = (
            select(OrganizationMember)
            .options(joinedload(OrganizationMember.user))
            .where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == MemberStatus.INVITED,
            )
            .order_by(OrganizationMember.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_user_organizations_with_role(
        self, user_id: UUID, roles: set[str]
    ) -> Sequence[tuple[Organization, str]]:
        """Obtém organizações onde o usuário tem as funções especificadas."""
        is_owner = Organization.owner_id == user_id
        is_organizer = OrganizationOrganizer.id.is_not(None)
        is_member = OrganizationMember.id.is_not(None)

        role_case = case(
            (is_owner, literal(OrgRole.OWNER)),
            (is_organizer, literal(OrgRole.ORGANIZER)),
            (is_member, literal(OrgRole.MEMBER)),
            else_=literal(OrgRole.NONE),
        ).label("role")

        stmt = (
            select(Organization, role_case)
            .outerjoin(
                OrganizationOrganizer,
                and_(
                    OrganizationOrganizer.organization_id == Organization.id,
                    OrganizationOrganizer.user_id == user_id,
                ),
            )
            .outerjoin(
                OrganizationMember,
                and_(
                    OrganizationMember.organization_id == Organization.id,
                    OrganizationMember.user_id == user_id,
                    OrganizationMember.status == MemberStatus.ACTIVE,
                ),
            )
        )

        filters = []
        if OrgRole.OWNER in roles:
            filters.append(is_owner)
        if OrgRole.ORGANIZER in roles:
            filters.append(is_organizer)
        if OrgRole.MEMBER in roles:
            filters.append(is_member)

        if not filters:
            return []

        stmt = stmt.where(or_(*filters))
        
        stmt = stmt.where(
            or_(
                and_(
                    Organization.owner_id == user_id,
                    Organization.status.in_([OrganizationStatus.ACTIVE, OrganizationStatus.PENDING])
                ),
                and_(
                    Organization.owner_id != user_id,
                    Organization.status == OrganizationStatus.ACTIVE
                )
            )
        )
        stmt = stmt.order_by(Organization.created_at.desc())

        result = await self._session.execute(stmt)
        return result.all()  # type: ignore

    async def get_pending_membership_for_approval(
        self, membership_id: UUID, org_slug: str, approver_id: UUID
    ) -> Optional[OrganizationMember]:
        """Obtém associação pendente se o aprovador tiver permissão."""
        stmt = (
            select(OrganizationMember)
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(
                OrganizationMember.id == membership_id,
                Organization.slug == org_slug,
                OrganizationMember.status == MemberStatus.PENDING,
                or_(
                    Organization.owner_id == approver_id,
                    exists().where(
                        and_(
                            OrganizationOrganizer.organization_id == Organization.id,
                            OrganizationOrganizer.user_id == approver_id,
                        )
                    ),
                ),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def exists_membership(
        self, org_id: UUID, user_id: UUID, statuses: list[MemberStatus]
    ) -> bool:
        """Verifica se associação existe com os status informados."""
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status.in_(statuses),
        )
        result = await self._session.scalar(stmt)
        return result is not None

    async def create(self, membership: OrganizationMember) -> OrganizationMember:
        """Cria uma nova associação."""
        self._session.add(membership)
        await self._session.flush()
        await self._session.refresh(membership)
        return membership

    async def update_status(
        self, membership: OrganizationMember, status: MemberStatus
    ) -> OrganizationMember:
        """Atualiza status da associação."""
        membership.status = status
        await self._session.flush()
        await self._session.refresh(membership)
        return membership

    async def delete(self, membership: OrganizationMember) -> bool:
        """Deleta uma associação."""
        await self._session.delete(membership)
        await self._session.flush()
        return True

    async def commit(self) -> None:
        """Confirma a transação atual."""
        await self._session.commit()

    async def rollback(self) -> None:
        """Reverte a transação atual."""
        await self._session.rollback()
