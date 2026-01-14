"""Interface do repositório de notificações."""

from abc import ABC, abstractmethod
from typing import Optional, Sequence
from uuid import UUID

from notifications_service.infrastructure.database.models import Notification


class INotificationRepository(ABC):
    """Interface para o repositório de notificações."""

    @abstractmethod
    async def create(self, notification: Notification) -> Notification:
        """Cria uma nova notificação."""
        pass

    @abstractmethod
    async def get_by_id(self, notification_id: UUID) -> Optional[Notification]:
        """Busca uma notificação por ID."""
        pass

    @abstractmethod
    async def get_by_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> tuple[Sequence[Notification], int]:
        """Busca notificações de um usuário com paginação."""
        pass

    @abstractmethod
    async def mark_as_read(self, notification_id: UUID) -> Optional[Notification]:
        """Marca uma notificação como lida."""
        pass

    @abstractmethod
    async def mark_all_as_read(self, user_id: UUID) -> int:
        """Marca todas as notificações de um usuário como lidas."""
        pass

    @abstractmethod
    async def count_unread(self, user_id: UUID) -> int:
        """Conta notificações não lidas de um usuário."""
        pass

    @abstractmethod
    async def delete(self, notification_id: UUID) -> bool:
        """Deleta uma notificação."""
        pass
