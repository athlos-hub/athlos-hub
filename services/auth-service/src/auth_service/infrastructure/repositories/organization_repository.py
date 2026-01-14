"""Implementação PostgreSQL do repositório de Organização."""

import logging
from typing import Any, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from auth_service.domain.interfaces.repositories import IOrganizationRepository
from auth_service.infrastructure.database.models.enums import OrganizationPrivacy, OrganizationStatus
from auth_service.infrastructure.database.models.organization_model import Organization

logger = logging.getLogger(__name__)


class OrganizationRepository(IOrganizationRepository):
    """Implementação PostgreSQL do repositório de Organização."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, org_id: UUID) -> Optional[Organization]:
        """Obtém organização por UUID."""
        return await self._session.get(Organization, org_id)

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        """Obtém organização por slug."""
        stmt = select(Organization).where(Organization.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug_with_owner(self, slug: str) -> Optional[Organization]:
        """Obtém organização por slug com relacionamento do proprietário carregado."""
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
        """Obtém todas as organizações ativas com filtros opcionais."""
        stmt = select(Organization)
        
        stmt = stmt.where(Organization.status == OrganizationStatus.ACTIVE)

        if privacy:
            stmt = stmt.where(Organization.privacy == privacy)

        stmt = stmt.order_by(Organization.name.asc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_all_admin(
        self,
        status_filter: Optional[OrganizationStatus] = None,
    ) -> Sequence[Organization]:
        """Obtém todas as organizações com filtro opcional de status (para admin)."""
        stmt = select(Organization)

        if status_filter:
            stmt = stmt.where(Organization.status == status_filter)

        stmt = stmt.order_by(Organization.created_at.desc())

        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def exists_by_slug(self, slug: str) -> bool:
        """Verifica se organização com slug existe."""
        stmt = select(Organization.id).where(Organization.slug == slug)
        result = await self._session.scalar(stmt)
        return result is not None

    async def create(self, organization: Organization) -> Organization:
        """Cria uma nova organização."""
        self._session.add(organization)
        await self._session.flush()
        await self._session.refresh(organization)
        return organization

    async def update(
        self, org_id: UUID, data: dict[str, Any]
    ) -> Optional[Organization]:
        """Atualiza organização por ID."""
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
        """Deleta organização por ID."""
        org = await self.get_by_id(org_id)
        if not org:
            return False

        await self._session.delete(org)
        await self._session.flush()
        return True

    async def save(self, organization: Organization) -> Organization:
        """Salva (adiciona ou atualiza) uma entidade de organização."""
        self._session.add(organization)
        await self._session.flush()
        await self._session.refresh(organization)
        return organization

    async def commit(self) -> None:
        """Confirma a transação atual."""
        await self._session.commit()

    async def rollback(self) -> None:
        """Reverte a transação atual."""
        await self._session.rollback()
