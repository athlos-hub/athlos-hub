from datetime import datetime, timezone
from math import ceil
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from notifications_service.infrastructure.database.models import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: UUID,
        type_: str,
        title: str,
        message: str,
        extra_data: dict | None,
        action_url: str | None,
    ) -> Notification:
        n = Notification(
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            extra_data=extra_data,
            action_url=action_url,
            is_read=False,
        )
        self._session.add(n)
        await self._session.commit()
        await self._session.refresh(n)
        return n

    async def get_for_user(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        result = await self._session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: UUID,
        *,
        page: int,
        page_size: int,
        unread_only: bool,
    ) -> tuple[list[Notification], int]:
        filters = [Notification.user_id == user_id]
        if unread_only:
            filters.append(Notification.is_read.is_(False))

        count_q = select(func.count()).select_from(Notification).where(*filters)
        total = int((await self._session.execute(count_q)).scalar_one())

        offset = (page - 1) * page_size
        list_q = (
            select(Notification)
            .where(*filters)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        rows = (await self._session.execute(list_q)).scalars().all()
        return list(rows), total

    async def count_unread(self, user_id: UUID) -> int:
        q = select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        return int((await self._session.execute(q)).scalar_one())

    async def mark_read(self, n: Notification, action_taken: str | None = None) -> Notification:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)
        if action_taken:
            n.action_taken = action_taken
        n.updated_at = datetime.now(timezone.utc)
        await self._session.commit()
        await self._session.refresh(n)
        return n

    async def mark_all_read(self, user_id: UUID) -> int:
        result = await self._session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(
                is_read=True,
                read_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        await self._session.commit()
        return int(result.rowcount or 0)

    async def delete(self, n: Notification) -> None:
        await self._session.delete(n)
        await self._session.commit()

    async def clear_all(self, user_id: UUID) -> int:
        q = select(func.count()).where(Notification.user_id == user_id)
        total = int((await self._session.execute(q)).scalar_one())
        await self._session.execute(delete(Notification).where(Notification.user_id == user_id))
        await self._session.commit()
        return total


def total_pages(total: int, page_size: int) -> int:
    if page_size <= 0:
        return 0
    return max(1, ceil(total / page_size)) if total else 1
