"""Repositório de organização com contrato no próprio arquivo."""

from abc import abstractmethod
from typing import Any, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from auth_service.infrastructure.database.models.enums import OrganizationPrivacy, OrganizationStatus
from auth_service.infrastructure.database.models.organization_model import Organization
from auth_service.repositories.base import BaseRepositoryContract


class OrganizationRepositoryContract(BaseRepositoryContract):
    @abstractmethod
    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        ...

    @abstractmethod
    async def refresh(self, organization: Organization) -> None:
        ...


class OrganizationRepository(OrganizationRepositoryContract):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        return await self._session.get(Organization, org_id)

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug_with_owner(self, slug: str) -> Optional[Organization]:
        stmt = (
            select(Organization)
            .options(joinedload(Organization.owner))
            .where(Organization.slug == slug)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        privacy: Optional[OrganizationPrivacy] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Organization]:
        stmt = select(Organization).where(Organization.status == OrganizationStatus.ACTIVE)
        if privacy:
            stmt = stmt.where(Organization.privacy == privacy)
        stmt = stmt.order_by(Organization.name.asc()).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_all_admin(
        self, status_filter: Optional[OrganizationStatus] = None
    ) -> Sequence[Organization]:
        stmt = select(Organization)
        if status_filter:
            stmt = stmt.where(Organization.status == status_filter)
        stmt = stmt.order_by(Organization.created_at.desc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def exists_by_slug(self, slug: str) -> bool:
        stmt = select(Organization.id).where(Organization.slug == slug)
        result = await self._session.scalar(stmt)
        return result is not None

    async def create(self, organization: Organization) -> Organization:
        self._session.add(organization)
        await self._session.flush()
        await self._session.refresh(organization)
        return organization

    async def update(self, org_id: UUID, data: dict[str, Any]) -> Optional[Organization]:
        if not data:
            return await self.get_by_id(org_id)
        stmt = sa_update(Organization).where(Organization.id == org_id).values(**data)
        await self._session.execute(stmt)
        await self._session.flush()
        org = await self.get_by_id(org_id)
        if org:
            await self._session.refresh(org)
        return org

    async def delete(self, org_id: UUID) -> bool:
        org = await self.get_by_id(org_id)
        if not org:
            return False
        await self._session.delete(org)
        await self._session.flush()
        return True

    async def save(self, organization: Organization) -> Organization:
        self._session.add(organization)
        await self._session.flush()
        await self._session.refresh(organization)
        return organization

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

    async def refresh(self, organization: Organization) -> None:
        await self._session.refresh(organization)

