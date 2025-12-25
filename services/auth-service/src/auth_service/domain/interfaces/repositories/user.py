"""Interface de repositório de usuário"""

from abc import abstractmethod
from typing import Any, Optional, Sequence
from uuid import UUID

from auth_service.domain.interfaces.repositories.base import IBaseRepository
from auth_service.infrastructure.database.models.user_model import User


class IUserRepository(IBaseRepository):
    """Interface abstrata para repositório de Usuário."""

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Obtém usuário por UUID."""
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        """Obtém usuário por endereço de email."""
        ...

    @abstractmethod
    async def get_by_keycloak_id(self, keycloak_id: str) -> Optional[User]:
        """Obtém usuário por ID do Keycloak."""
        ...

    @abstractmethod
    async def get_all_enabled(self) -> Sequence[User]:
        """Obtém todos os usuários habilitados."""
        ...

    @abstractmethod
    async def get_all(self) -> Sequence[User]:
        """Obtém todos os usuários (admin)."""
        ...

    @abstractmethod
    async def create(self, user: User) -> User:
        """Cria um novo usuário."""
        ...

    @abstractmethod
    async def update(self, user_id: UUID, data: dict[str, Any]) -> Optional[User]:
        """Atualiza usuário por ID."""
        ...

    @abstractmethod
    async def delete(self, user_id: UUID) -> bool:
        """Deleta usuário por ID."""
        ...
