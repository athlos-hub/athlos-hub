from uuid import UUID

from fastapi import HTTPException, status

from notifications_service.infrastructure.database.models import Notification
from notifications_service.repositories.notification_repository import NotificationRepository, total_pages
from notifications_service.schemas.notification import (
    NotificationCreateInternal,
    NotificationListResponse,
    NotificationResponse,
)


class NotificationService:
    def __init__(self, repo: NotificationRepository) -> None:
        self._repo = repo

    async def create_internal(self, data: NotificationCreateInternal) -> Notification:
        return await self._repo.create(
            user_id=data.user_id,
            type_=data.type,
            title=data.title,
            message=data.message,
            extra_data=data.extra_data,
            action_url=data.action_url,
        )

    async def list_notifications(
        self,
        user_id: UUID,
        page: int,
        page_size: int,
        unread_only: bool,
    ) -> NotificationListResponse:
        items, total = await self._repo.list_for_user(
            user_id,
            page=page,
            page_size=page_size,
            unread_only=unread_only,
        )
        pages = total_pages(total, page_size)
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=pages,
        )

    async def count_unread(self, user_id: UUID) -> int:
        return await self._repo.count_unread(user_id)

    async def get_notification(self, notification_id: UUID, user_id: UUID) -> NotificationResponse:
        n = await self._repo.get_for_user(notification_id, user_id)
        if not n:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")
        return NotificationResponse.model_validate(n)

    async def mark_as_read(
        self, notification_id: UUID, user_id: UUID, action_taken: str | None = None
    ) -> NotificationResponse:
        n = await self._repo.get_for_user(notification_id, user_id)
        if not n:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")
        updated = await self._repo.mark_read(n, action_taken)
        return NotificationResponse.model_validate(updated)

    async def mark_all_as_read(self, user_id: UUID) -> int:
        return await self._repo.mark_all_read(user_id)

    async def delete_notification(self, notification_id: UUID, user_id: UUID) -> None:
        n = await self._repo.get_for_user(notification_id, user_id)
        if not n:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")
        await self._repo.delete(n)

    async def clear_all(self, user_id: UUID) -> int:
        return await self._repo.clear_all(user_id)
