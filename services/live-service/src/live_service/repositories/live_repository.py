"""Repositório de lives (PostgreSQL)."""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import LiveStatus
from live_service.infrastructure.database.models.live import Live


class LiveRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        external_match_id: str,
        organization_id: str,
        stream_key: str,
        status: LiveStatus,
        transmit_video: bool = True,
    ) -> Live:
        row = Live(
            external_match_id=external_match_id,
            organization_id=organization_id,
            stream_key=stream_key,
            status=status.value,
            transmit_video=transmit_video,
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return row

    async def find_by_id(self, live_id: str) -> Live | None:
        result = await self._session.execute(select(Live).where(Live.id == live_id))
        return result.scalar_one_or_none()

    async def find_many(
        self,
        *,
        status: LiveStatus | None = None,
        organization_id: str | None = None,
        external_match_id: str | None = None,
    ) -> list[Live]:
        q = select(Live)
        if status is not None:
            q = q.where(Live.status == status.value)
        if organization_id is not None:
            q = q.where(Live.organization_id == organization_id)
        if external_match_id is not None:
            q = q.where(Live.external_match_id == external_match_id)
        q = q.order_by(Live.created_at.desc())
        result = await self._session.execute(q)
        return list(result.scalars().all())

    async def save_entity(self, live: Live) -> Live:
        await self._session.flush()
        await self._session.refresh(live)
        return live

    async def update_status_fields(
        self,
        live_id: str,
        *,
        status: str,
        started_at: datetime | None = None,
        ended_at: datetime | None = None,
    ) -> None:
        await self._session.execute(
            update(Live)
            .where(Live.id == live_id)
            .values(
                status=status,
                started_at=started_at,
                ended_at=ended_at,
            )
        )
