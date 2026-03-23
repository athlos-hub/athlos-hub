"""Repositório de organizadores com contrato no próprio arquivo."""

from abc import abstractmethod
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from auth_service.infrastructure.database.models.organization_model import (
    Organization,
    OrganizationOrganizer,
)
from auth_service.repositories.base import BaseRepositoryContract


class OrganizationOrganizerRepositoryContract(BaseRepositoryContract):
    @abstractmethod
    async def get_organizer(
        self, org_id: UUID, user_id: UUID
    ) -> Optional[OrganizationOrganizer]:
        ...


class OrganizationOrganizerRepository(OrganizationOrganizerRepositoryContract):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_organizer(
        self, org_id: UUID, user_id: UUID
    ) -> Optional[OrganizationOrganizer]:
        stmt = select(OrganizationOrganizer).where(
            OrganizationOrganizer.organization_id == org_id,
            OrganizationOrganizer.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_organizers_by_org(self, org_id: UUID) -> Sequence[OrganizationOrganizer]:
        stmt = (
            select(OrganizationOrganizer)
            .options(joinedload(OrganizationOrganizer.user))
            .where(OrganizationOrganizer.organization_id == org_id)
            .order_by(OrganizationOrganizer.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def is_organizer(self, org_id: UUID, user_id: UUID) -> bool:
        stmt = select(
            exists().where(
                and_(
                    OrganizationOrganizer.organization_id == org_id,
                    OrganizationOrganizer.user_id == user_id,
                )
            )
        )
        result = await self._session.scalar(stmt)
        return bool(result)

    async def is_owner_or_organizer(self, org_slug: str, user_id: UUID) -> Optional[Organization]:
        stmt = select(Organization).where(
            Organization.slug == org_slug,
            or_(
                Organization.owner_id == user_id,
                exists().where(
                    and_(
                        OrganizationOrganizer.organization_id == Organization.id,
                        OrganizationOrganizer.user_id == user_id,
                    )
                ),
            ),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, organizer: OrganizationOrganizer) -> OrganizationOrganizer:
        self._session.add(organizer)
        await self._session.flush()
        await self._session.refresh(organizer)
        return organizer

    async def delete(self, organizer: OrganizationOrganizer) -> bool:
        await self._session.delete(organizer)
        await self._session.flush()
        return True

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

