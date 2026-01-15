"""Repositório de notificações."""

from datetime import datetime
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from notifications_service.domain.interfaces.repositories import INotificationRepository
from notifications_service.infrastructure.database.models import Notification


class NotificationRepository(INotificationRepository):
    """Implementação do repositório de notificações."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, notification: Notification) -> Notification:
        """Cria uma nova notificação."""
        self.session.add(notification)
        await self.session.commit()
        await self.session.refresh(notification)
        return notification

    async def get_by_id(self, notification_id: UUID) -> Optional[Notification]:
        """Busca uma notificação por ID."""
        result = await self.session.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> tuple[Sequence[Notification], int]:
        """Busca notificações de um usuário com paginação."""
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        
        query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        notifications = result.scalars().all()
        
        return notifications, total

    async def mark_as_read(self, notification_id: UUID) -> Optional[Notification]:
        """Marca uma notificação como lida."""
        notification = await self.get_by_id(notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(notification)
        return notification

    async def mark_all_as_read(self, user_id: UUID) -> int:
        """Marca todas as notificações de um usuário como lidas."""
        result = await self.session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await self.session.commit()
        return result.rowcount

    async def count_unread(self, user_id: UUID) -> int:
        """Conta notificações não lidas de um usuário."""
        result = await self.session.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
        )
        return result.scalar_one()

    async def delete(self, notification: Notification) -> None:
        """Deleta uma notificação."""
        await self.session.delete(notification)

    async def delete_all_by_user(self, user_id: UUID) -> int:
        """Deleta todas as notificações de um usuário."""
        result = await self.session.execute(
            select(Notification).where(Notification.user_id == user_id)
        )
        notifications = result.scalars().all()
        
        count = len(notifications)
        for notification in notifications:
            await self.session.delete(notification)
        
        return count
