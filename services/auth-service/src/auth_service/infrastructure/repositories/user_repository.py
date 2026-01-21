"""Implementação PostgreSQL do repositório de Usuário."""

import logging
from typing import Any, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.domain.interfaces.repositories import IUserRepository
from auth_service.infrastructure.database.models.user_model import User

logger = logging.getLogger(__name__)


class UserRepository(IUserRepository):
    """Implementação PostgreSQL do repositório de Usuário."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Obtém usuário por UUID."""
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Obtém usuário por endereço de email."""
        stmt = select(User).where(User.email == email)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        """Obtém usuário por ID do Keycloak."""
        stmt = select(User).where(User.keycloak_id == keycloak_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_enabled(self) -> Sequence[User]:
        """Obtém todos os usuários habilitados."""
        stmt = select(User).where(User.enabled == True).order_by(User.created_at.desc())
        result = await self._session.scalars(stmt)
        return result.all()

    async def get_all(self) -> Sequence[User]:
        """Obtém todos os usuários (admin)."""
        stmt = select(User).order_by(User.created_at.desc())
        result = await self._session.scalars(stmt)
        return result.all()

    async def create(self, user: User) -> User:
        """Cria um novo usuário."""
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user_id: UUID, data: dict[str, Any]) -> Optional[User]:
        """Atualiza usuário por ID."""
        if not data:
            return await self.get_by_id(user_id)

        stmt = sa_update(User).where(User.id == user_id).values(**data)
        await self._session.execute(stmt)
        await self._session.flush()

        user = await self.get_by_id(user_id)
        if user:
            await self._session.refresh(user)
        return user

    async def suspend(self, user_id: UUID) -> User | None:
        """Suspende usuário por ID."""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        if not user.enabled:
            return user

        user.enabled = False

        await self._session.flush()
        return user

    async def save(self, user: User) -> User:
        """Salva (adiciona ou atualiza) uma entidade de usuário."""
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def commit(self) -> None:
        """Confirma a transação atual."""
        await self._session.commit()

    async def rollback(self) -> None:
        """Reverte a transação atual."""
        await self._session.rollback()
