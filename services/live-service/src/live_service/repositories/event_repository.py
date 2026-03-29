"""Eventos de jogo: Redis (tempo real + histórico HTTP) + PostgreSQL (persistência)."""

from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from live_service.common.enums import MatchEventType
from live_service.infrastructure.database.models.live_event import LiveEvent as LiveEventRow
from live_service.infrastructure import redis_client as rc


class EventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def publish_event(
        self,
        *,
        event_id: str,
        live_id: str,
        event_type: MatchEventType,
        payload: dict[str, Any],
        created_at: datetime,
    ) -> None:
        r = rc.redis_client.client()
        created_iso = created_at.isoformat()
        bus_payload = {
            "id": event_id,
            "liveId": live_id,
            "type": event_type.value,
            "payload": payload,
            "timestamp": created_iso,
        }
        await rc.publish_event_message(r, live_id, bus_payload)
        await rc.push_event_history(r, live_id, bus_payload)

        row = LiveEventRow(
            id=event_id,
            live_id=live_id,
            type=event_type.value,
            payload=payload,
            created_at=created_at,
        )
        self._session.add(row)
        await self._session.flush()

    async def get_recent_events(self, live_id: str, limit: int = 50) -> list[dict[str, Any]]:
        r = rc.redis_client.client()
        return await rc.get_recent_events_json(r, live_id, limit=limit)
