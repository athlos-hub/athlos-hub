"""Repositório de usuário com contrato no próprio arquivo."""

from abc import abstractmethod
from typing import Any, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from auth_service.infrastructure.database.models.user_model import User
from auth_service.repositories.base import BaseRepositoryContract


class UserRepositoryContract(BaseRepositoryContract):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        ...

    @abstractmethod
    async def get_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        ...

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[User]:
        ...

    @abstractmethod
    async def get_all_enabled(self) -> Sequence[User]:
        ...

    @abstractmethod
    async def get_all(self) -> Sequence[User]:
        ...

    @abstractmethod
    async def create(self, user: User) -> User:
        ...

    @abstractmethod
    async def update(self, user_id: UUID, data: dict[str, Any]) -> Optional[User]:
        ...

    @abstractmethod
    async def suspend(self, user_id: UUID) -> User | None:
        ...


class UserRepository(UserRepositoryContract):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        stmt = select(User).where(User.keycloak_id == keycloak_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(User).where(User.username == username)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_enabled(self) -> Sequence[User]:
        stmt = select(User).where(User.enabled == True).order_by(User.created_at.desc())
        result = await self._session.scalars(stmt)
        return result.all()

    async def get_all(self) -> Sequence[User]:
        stmt = select(User).order_by(User.created_at.desc())
        result = await self._session.scalars(stmt)
        return result.all()

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(self, user_id: UUID, data: dict[str, Any]) -> Optional[User]:
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
        user = await self.get_by_id(user_id)
        if not user:
            return None
        if not user.enabled:
            return user
        user.enabled = False
        await self._session.flush()
        return user

    async def save(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

