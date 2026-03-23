"""Repositório de membro de organização com contrato no próprio arquivo."""

from abc import abstractmethod
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, case, exists, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from auth_service.infrastructure.database.models.enums import MemberStatus, OrganizationStatus
from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationMember,
    OrganizationOrganizer,
)
from auth_service.repositories.base import BaseRepositoryContract


class OrgRole:
    OWNER = "OWNER"
    ORGANIZER = "ORGANIZER"
    MEMBER = "MEMBER"
    NONE = "NONE"


class OrganizationMemberRepositoryContract(BaseRepositoryContract):
    @abstractmethod
    async def get_by_id(self, membership_id: UUID) -> Optional[OrganizationMember]:
        ...


class OrganizationMemberRepository(OrganizationMemberRepositoryContract):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, membership_id: UUID) -> Optional[OrganizationMember]:
        return await self._session.get(OrganizationMember, membership_id)

    async def get_membership(self, org_id: UUID, user_id: UUID) -> Optional[OrganizationMember]:
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_membership_by_status(
        self, org_id: UUID, user_id: UUID, status: MemberStatus
    ) -> Optional[OrganizationMember]:
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
        stmt = stmt.where(or_(*filters)).where(
            or_(
                and_(
                    Organization.owner_id == user_id,
                    Organization.status.in_([OrganizationStatus.ACTIVE, OrganizationStatus.PENDING]),
                ),
                and_(
                    Organization.owner_id != user_id,
                    Organization.status == OrganizationStatus.ACTIVE,
                ),
            )
        )
        stmt = stmt.order_by(Organization.created_at.desc())
        result = await self._session.execute(stmt)
        return result.all()  # type: ignore

    async def get_pending_membership_for_approval(
        self, membership_id: UUID, org_slug: str, approver_id: UUID
    ) -> Optional[OrganizationMember]:
        check_stmt = select(OrganizationMember).where(OrganizationMember.id == membership_id)
        check_result = await self._session.execute(check_stmt)
        membership = check_result.scalar_one_or_none()
        if not membership:
            return None

        org_stmt = select(Organization).where(
            Organization.id == membership.organization_id,
            Organization.slug == org_slug,
        )
        org_result = await self._session.execute(org_stmt)
        org = org_result.scalar_one_or_none()
        if not org:
            return None
        if membership.status != MemberStatus.PENDING:
            return None
        if org.owner_id == approver_id:
            return membership

        organizer_stmt = select(OrganizationOrganizer).where(
            OrganizationOrganizer.organization_id == org.id,
            OrganizationOrganizer.user_id == approver_id,
        )
        organizer_result = await self._session.execute(organizer_stmt)
        organizer = organizer_result.scalar_one_or_none()
        return membership if organizer else None

    async def get_user_invites(self, user_id: UUID) -> Sequence[OrganizationMember]:
        stmt = (
            select(OrganizationMember)
            .options(
                joinedload(OrganizationMember.organization),
                joinedload(OrganizationMember.user),
            )
            .where(
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == MemberStatus.INVITED,
            )
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(Organization.status == OrganizationStatus.ACTIVE)
            .order_by(OrganizationMember.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_user_requests(self, user_id: UUID) -> Sequence[OrganizationMember]:
        stmt = (
            select(OrganizationMember)
            .options(
                joinedload(OrganizationMember.organization),
                joinedload(OrganizationMember.user),
            )
            .where(
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == MemberStatus.PENDING,
            )
            .join(Organization, OrganizationMember.organization_id == Organization.id)
            .where(Organization.status == OrganizationStatus.ACTIVE)
            .order_by(OrganizationMember.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def exists_membership(
        self, org_id: UUID, user_id: UUID, statuses: list[MemberStatus]
    ) -> bool:
        stmt = select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status.in_(statuses),
        )
        result = await self._session.scalar(stmt)
        return result is not None

    async def create(self, membership: OrganizationMember) -> OrganizationMember:
        self._session.add(membership)
        await self._session.flush()
        await self._session.refresh(membership)
        return membership

    async def update_status(
        self, membership: OrganizationMember, status: MemberStatus
    ) -> OrganizationMember:
        membership.status = status
        await self._session.flush()
        await self._session.refresh(membership)
        return membership

    async def delete(self, membership: OrganizationMember) -> bool:
        await self._session.delete(membership)
        await self._session.flush()
        return True

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

